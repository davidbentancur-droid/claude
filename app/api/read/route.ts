import { NextResponse } from 'next/server';

import { DesvioError, gerarLeitura } from '@/lib/engine/read';
import { checarRiscoConjunto } from '@/lib/engine/risk';
import type { Respostas } from '@/lib/engine/validate';
import { limitarLeitura, MENSAGEM_LIMITE } from '@/lib/ratelimit';
import { atualizarStatus, ipDaRequisicao, lerCookieSessao } from '@/lib/session';
import { supabaseOpcional } from '@/lib/supabase';
import { RISCO } from '@/lib/copy';

export const runtime = 'nodejs';

/**
 * A leitura leva de 12 a 25 segundos. Sem esta linha a função serverless corta
 * antes de responder e o usuário vê a tela de erro com a leitura pronta e paga
 * do outro lado. O planejamento não previu isto e é o item que mais quebraria em
 * produção.
 */
export const maxDuration = 120;

type CorpoRead = { respostas?: Partial<Respostas> };

async function respostasDoBanco(sessionId: string): Promise<Respostas | null> {
  const db = supabaseOpcional();
  if (!db) return null;

  const { data, error } = await db
    .from('quiz_answers')
    .select('pergunta, texto, repescagem')
    .eq('session_id', sessionId);

  if (error || !data || data.length < 4) return null;

  const mapa = new Map<number, string>();
  for (const linha of data) {
    const texto = linha.texto as string;
    const rep = linha.repescagem as string | null;
    mapa.set(linha.pergunta as number, rep ? `${texto}\n\n${rep}` : texto);
  }

  if (![1, 2, 3, 4].every((n) => (mapa.get(n) ?? '').trim().length > 0)) return null;

  return {
    p1: mapa.get(1)!,
    p2: mapa.get(2)!,
    p3: mapa.get(3)!,
    p4: mapa.get(4)!,
  };
}

function respostasDoCorpo(corpo: CorpoRead): Respostas | null {
  const r = corpo.respostas;
  if (!r) return null;
  const campos = [r.p1, r.p2, r.p3, r.p4];
  if (!campos.every((c) => typeof c === 'string' && c.trim().length > 0)) return null;
  return {
    p1: r.p1!.slice(0, 8000),
    p2: r.p2!.slice(0, 8000),
    p3: r.p3!.slice(0, 8000),
    p4: r.p4!.slice(0, 8000),
  };
}

export async function POST(req: Request) {
  const sessionId = await lerCookieSessao();
  if (!sessionId) {
    return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  }

  const ip = ipDaRequisicao(req) ?? sessionId;
  const limite = await limitarLeitura(ip);
  if (!limite.permitido) {
    return NextResponse.json({ erro: 'limite', mensagem: MENSAGEM_LIMITE }, { status: 429 });
  }

  const db = supabaseOpcional();

  // Uma leitura por sessão. Rodar de novo gasta a chamada e pode devolver um
  // Ato diferente pro mesmo material, que é pior que o erro que isso evita.
  if (db) {
    const { data } = await db
      .from('quiz_readings')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (data) {
      return NextResponse.json({ erro: 'leitura_ja_existe' }, { status: 409 });
    }
  }

  let corpo: CorpoRead = {};
  try {
    corpo = (await req.json()) as CorpoRead;
  } catch {
    corpo = {};
  }

  // O banco manda quando existe. O corpo é o caminho de desenvolvimento local,
  // antes das envs do Supabase entrarem.
  const respostas = (await respostasDoBanco(sessionId)) ?? respostasDoCorpo(corpo);

  if (!respostas) {
    return NextResponse.json({ erro: 'respostas_incompletas' }, { status: 400 });
  }

  const risco = checarRiscoConjunto([respostas.p1, respostas.p2, respostas.p3, respostas.p4]);
  if (risco.risco) {
    await atualizarStatus(sessionId, 'risk');
    return NextResponse.json({ tipo: 'risco', texto: RISCO.fallback });
  }

  await atualizarStatus(sessionId, 'reading');

  try {
    const r = await gerarLeitura(respostas);

    if (r.leitura.sinalizacao.risco) {
      await atualizarStatus(sessionId, 'risk');
      return NextResponse.json({
        tipo: 'risco',
        texto: r.leitura.sinalizacao.risco_motivo || RISCO.fallback,
      });
    }

    if (r.leitura.sinalizacao.piada) {
      await atualizarStatus(sessionId, 'joke');
      return NextResponse.json({ tipo: 'piada', texto: r.leitura.spoiler });
    }

    if (db) {
      const { error } = await db.from('quiz_readings').insert({
        session_id: sessionId,
        model: r.model,
        output: r.leitura,
        validation: { ...r.validacao, tentativas: r.tentativas },
        latency_ms: r.latency_ms,
      });
      if (error) {
        console.error('[read] não gravou a leitura', error);
        return NextResponse.json({ erro: 'nao_gravou' }, { status: 500 });
      }
    }

    if (!r.validacao.ok) {
      console.warn('[read] validation_failed', {
        session_id: sessionId,
        duras: r.validacao.duras,
        tentativas: r.tentativas,
      });
    }

    await atualizarStatus(sessionId, 'spoiler_shown');

    // Só o spoiler atravessa a rede. O dossiê fica no banco até o lead entrar.
    return NextResponse.json({
      tipo: 'spoiler',
      spoiler: r.leitura.spoiler,
      latency_ms: r.latency_ms,
    });
  } catch (e) {
    if (e instanceof DesvioError) {
      await atualizarStatus(sessionId, e.tipo === 'risco' ? 'risk' : 'joke');
      return NextResponse.json({ tipo: e.tipo, texto: e.texto });
    }

    console.error('[read] falhou', e);
    await atualizarStatus(sessionId, 'error');
    return NextResponse.json({ erro: 'leitura_falhou' }, { status: 500 });
  }
}
