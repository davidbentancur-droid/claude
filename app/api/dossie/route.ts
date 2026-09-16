import { NextResponse } from 'next/server';

import {
  lerLeitura,
  marcarFalha,
  reivindicarDossie,
  salvarDossie,
} from '@/lib/engine/persistencia';
import { escreverDossie } from '@/lib/engine/read';
import { respostasDaSessao } from '@/lib/respostas';
import { lerCookieSessao } from '@/lib/session';

export const runtime = 'nodejs';

/**
 * A chamada 2: escreve o dossiê.
 *
 * Quem dispara é o cliente, sem esperar resposta, no instante em que o spoiler
 * aparece na tela. O cara então gasta de trinta a noventa segundos preenchendo
 * nome, WhatsApp, profissão e orçamento, e é dentro desse tempo que esta rota
 * roda. O custo de latência dela é zero pra ele.
 *
 * 60 s próprios, que é a razão de existir do corte em duas chamadas: sem dividir
 * a leitura, o orçamento inteiro ia pra análise e sobrava uma tentativa mal
 * aparada pro texto.
 */
export const maxDuration = 60;

/**
 * A resposta não leva nada da leitura, nem pedaço.
 *
 * O portão do Prompt Mãe é o formulário, e esta rota roda antes dele. Devolver
 * o texto aqui abriria por uma porta lateral exatamente o que `/api/lead`
 * existe pra guardar. Quem chama só precisa saber se pode parar de se preocupar.
 */
export async function POST() {
  const sessionId = await lerCookieSessao();
  if (!sessionId) {
    return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  }

  const linha = await lerLeitura(sessionId);
  if (!linha) {
    return NextResponse.json({ erro: 'sem_analise' }, { status: 409 });
  }

  if (linha.dossie && linha.estado === 'pronto') {
    return NextResponse.json({ estado: 'pronto' });
  }

  // Risco e piada param o fluxo antes do dossiê, Prompt Mãe Seção 8.
  if (linha.analise.sinalizacao.risco || linha.analise.sinalizacao.piada) {
    return NextResponse.json({ estado: 'dispensado' });
  }

  // Outra invocação já está escrevendo. Duas chamadas pro mesmo texto gastam
  // duas vezes e uma sobrescreve a outra.
  if (!(await reivindicarDossie(sessionId))) {
    return NextResponse.json({ estado: 'gerando' });
  }

  const respostas = await respostasDaSessao(sessionId);
  if (!respostas) {
    await marcarFalha(sessionId, 'respostas_incompletas');
    return NextResponse.json({ erro: 'respostas_incompletas' }, { status: 400 });
  }

  try {
    const r = await escreverDossie(respostas, linha.analise);

    await salvarDossie(sessionId, r.dossie, {
      model: r.model,
      latency_ms: r.latency_ms,
      validacao: {
        ...r.validacao,
        tentativas: r.tentativas,
        contagem_declarada: r.contagem_declarada,
      },
    });

    if (!r.validacao.ok) {
      console.warn('[dossie] validation_failed', {
        session_id: sessionId,
        duras: r.validacao.duras,
        tentativas: r.tentativas,
      });
    }

    return NextResponse.json({ estado: 'pronto' });
  } catch (e) {
    console.error('[dossie] falhou', e);
    // Solta a trava. Sem isto a rota do lead esperaria por um dossiê que já
    // morreu, e o plano B dela nunca entraria.
    await marcarFalha(sessionId, e instanceof Error ? e.message : String(e));
    return NextResponse.json({ erro: 'dossie_falhou' }, { status: 500 });
  }
}
