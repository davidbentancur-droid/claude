import { NextResponse } from 'next/server';

import { precisaRepescagem } from '@/lib/engine/read';
import { checarRisco } from '@/lib/engine/risk';
import { atualizarStatus, lerCookieSessao } from '@/lib/session';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Regra de resposta pobre, Prompt Mãe Seção 2.
 *
 * Heurística barata primeiro, modelo só quando ela não decide. Roda também o
 * pré-filtro de risco, que é o que permite interromper na P1 em vez de esperar
 * as quatro respostas.
 *
 * P3 nunca chega aqui: a pergunta é curta por desenho e o cliente não chama.
 */
export async function POST(req: Request) {
  const sessionId = await lerCookieSessao();
  if (!sessionId) {
    return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  }

  let corpo: { texto?: string; pergunta?: number };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  const texto = (corpo.texto ?? '').toString().slice(0, 8000).trim();
  if (texto.length === 0) {
    return NextResponse.json({ erro: 'texto_vazio' }, { status: 400 });
  }

  const risco = checarRisco(texto);
  if (risco.risco) {
    await atualizarStatus(sessionId, 'risk');
    return NextResponse.json({ needs_followup: false, risco: true });
  }

  try {
    const precisa = await precisaRepescagem(texto);
    return NextResponse.json({ needs_followup: precisa, risco: false });
  } catch (e) {
    console.error('[check-answer] falhou', e);
    // Erro aqui não pode travar o fluxo. Sem repescagem, segue.
    return NextResponse.json({ needs_followup: false, risco: false });
  }
}
