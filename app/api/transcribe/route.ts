import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { AUDIO } from '@/lib/copy';
import { env } from '@/lib/env';
import { limitarTranscricao } from '@/lib/ratelimit';
import { ipDaRequisicao, lerCookieSessao } from '@/lib/session';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Áudio para texto. Planejamento Seção 2.
 *
 * O áudio não é persistido em lugar nenhum, só o texto. O texto volta pro campo
 * e o usuário edita antes de enviar, então erro de transcrição é corrigível por
 * ele e não vira material de leitura errado.
 */

const TIPOS = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'video/webm', // MediaRecorder do Chrome rotula opus assim de vez em quando
]);

const MAX_BYTES = 10 * 1024 * 1024;

let cliente: OpenAI | null = null;

function openai(): OpenAI {
  if (cliente === null) cliente = new OpenAI({ apiKey: env.openaiKey });
  return cliente;
}

export async function POST(req: Request) {
  const sessionId = await lerCookieSessao();
  if (!sessionId) {
    return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  }

  const ip = ipDaRequisicao(req) ?? sessionId;
  const limite = await limitarTranscricao(ip);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'limite', mensagem: AUDIO.erro }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  const arquivo = form.get('audio');
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: 'sem_audio' }, { status: 400 });
  }

  const tipo = arquivo.type.split(';')[0].trim();
  if (!TIPOS.has(tipo)) {
    return NextResponse.json({ erro: 'tipo_nao_aceito', tipo }, { status: 415 });
  }

  if (arquivo.size > MAX_BYTES) {
    return NextResponse.json({ erro: 'grande_demais' }, { status: 413 });
  }

  if (arquivo.size < 1024) {
    return NextResponse.json({ erro: 'audio_vazio' }, { status: 400 });
  }

  try {
    const r = await openai().audio.transcriptions.create({
      file: arquivo,
      model: env.transcriptionModel,
      language: 'pt',
      response_format: 'text',
    });

    const texto = typeof r === 'string' ? r : ((r as { text?: string }).text ?? '');

    return NextResponse.json({ texto: texto.trim() });
  } catch (e) {
    console.error('[transcribe] falhou', e);
    return NextResponse.json({ erro: 'transcricao_falhou' }, { status: 502 });
  }
}
