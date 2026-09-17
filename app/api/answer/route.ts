import { NextResponse } from 'next/server';

import { checarRisco } from '@/lib/engine/risk';
import { registrarErro } from '@/lib/erros';
import { atualizarStatus, lerCookieSessao } from '@/lib/session';
import { supabaseOpcional } from '@/lib/supabase';

export const runtime = 'nodejs';

const LIMITE_TEXTO = 8000;

export async function POST(req: Request) {
  const sessionId = await lerCookieSessao();
  if (!sessionId) {
    return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  }

  let corpo: {
    pergunta?: number;
    texto?: string;
    repescagem?: string | null;
    via?: string;
  };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  const pergunta = Number(corpo.pergunta);
  const texto = (corpo.texto ?? '').toString().slice(0, LIMITE_TEXTO).trim();
  const repescagem = corpo.repescagem
    ? corpo.repescagem.toString().slice(0, LIMITE_TEXTO).trim()
    : null;
  const via = corpo.via === 'audio' ? 'audio' : 'texto';

  if (!Number.isInteger(pergunta) || pergunta < 1 || pergunta > 4) {
    return NextResponse.json({ erro: 'pergunta_invalida' }, { status: 400 });
  }
  if (texto.length === 0) {
    return NextResponse.json({ erro: 'texto_vazio' }, { status: 400 });
  }

  // Pré-filtro de risco a cada resposta, pra interromper cedo sem esperar as
  // quatro e sem gastar a chamada grande. Prompt Mãe Seção 8.
  const risco = checarRisco([texto, repescagem ?? ''].join(' '));
  if (risco.risco) {
    await atualizarStatus(sessionId, 'risk');
  }

  const db = supabaseOpcional();
  if (db) {
    const { error } = await db.from('quiz_answers').upsert(
      {
        session_id: sessionId,
        pergunta,
        texto,
        repescagem,
        via,
      },
      { onConflict: 'session_id,pergunta' },
    );

    if (error) {
      console.error('[answer] falhou', error);
      registrarErro({
        rota: '/api/answer',
        codigo: 'resposta_nao_gravou',
        sessionId,
        detalhe: `pergunta ${pergunta}: ${error.message}`,
        req,
      });
      return NextResponse.json({ erro: 'nao_gravou' }, { status: 500 });
    }

    if (!risco.risco) await atualizarStatus(sessionId, 'answering');
  }

  return NextResponse.json({
    ok: true,
    risco: risco.risco,
    // A categoria fica no log, não na resposta. O que a tela mostra é
    // acolhimento, e nomear a categoria pro usuário não ajuda ninguém.
  });
}
