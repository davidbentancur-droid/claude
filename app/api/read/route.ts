import { NextResponse } from 'next/server';

import { DesvioError, gerarAnalise } from '@/lib/engine/read';
import { AnaliseSchema } from '@/lib/engine/schema';
import { checarRiscoConjunto } from '@/lib/engine/risk';
import type { Respostas } from '@/lib/engine/validate';
import { limitarLeitura, MENSAGEM_LIMITE } from '@/lib/ratelimit';
import { atualizarStatus, ipDaRequisicao, lerCookieSessao } from '@/lib/session';
import { respostasDaSessao } from '@/lib/respostas';
import { supabaseOpcional } from '@/lib/supabase';
import { RISCO } from '@/lib/copy';

export const runtime = 'nodejs';

/**
 * Esta rota é a chamada 1: análise e spoiler, sem dossiê. Sem esta linha a
 * função serverless corta antes de responder e o usuário vê a tela de erro com
 * a leitura pronta e paga do outro lado.
 *
 * 60 é o teto do plano Hobby da Vercel, que é o plano da conta hoje. O dossiê
 * tem os 60 s dele em `/api/dossie`, que é a razão de existir do corte.
 */
export const maxDuration = 60;

type CorpoRead = { respostas?: Partial<Respostas> };

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

  /**
   * Uma leitura por sessão, e quando ela já existe esta rota devolve o spoiler
   * salvo em vez de recusar.
   *
   * Antes aqui respondia 409 `leitura_ja_existe`, e isso prendia o cara num beco
   * sem saída. O caso real, num iPhone: a chamada 1 leva uns 35 segundos, ele
   * troca de app ou a tela apaga, o Safari suspende a página e o fetch morre.
   * Do lado de cá a leitura terminou e foi salva. Ele volta, vê a tela de erro,
   * aperta "Tentar de novo", e toda tentativa a partir dali batia no 409 e caía
   * na mesma tela. A leitura estava pronta e ele nunca ia chegar nela.
   *
   * Devolver o spoiler de novo não abre nada: ele já foi entregue a esta sessão,
   * e o portão do Prompt Mãe é o dossiê, que só a `/api/lead` devolve. O status
   * volta pra `spoiler_shown` porque é onde o fluxo dele realmente está.
   */
  if (db) {
    const { data } = await db
      .from('quiz_readings')
      .select('output')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (data) {
      const salva = AnaliseSchema.safeParse(data.output);
      if (salva.success) {
        await atualizarStatus(sessionId, 'spoiler_shown');
        return NextResponse.json({
          tipo: 'spoiler',
          spoiler: salva.data.spoiler,
          recuperada: true,
        });
      }
      // Linha corrompida. Melhor recomeçar que servir lixo.
      console.error('[read] leitura salva ilegível, apagando', { session_id: sessionId });
      await db.from('quiz_readings').delete().eq('session_id', sessionId);
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
  const respostas = (await respostasDaSessao(sessionId)) ?? respostasDoCorpo(corpo);

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
    const r = await gerarAnalise(respostas);

    if (r.analise.sinalizacao.risco) {
      await atualizarStatus(sessionId, 'risk');
      return NextResponse.json({
        tipo: 'risco',
        texto: r.analise.sinalizacao.risco_motivo || RISCO.fallback,
      });
    }

    if (r.analise.sinalizacao.piada) {
      await atualizarStatus(sessionId, 'joke');
      return NextResponse.json({ tipo: 'piada', texto: r.analise.spoiler });
    }

    // `dossie_status` nasce em 'pendente'. Quem escreve o texto é `/api/dossie`,
    // disparada pelo cliente assim que esta resposta chega na tela.
    if (db) {
      const { error } = await db.from('quiz_readings').insert({
        session_id: sessionId,
        model: r.model,
        output: r.analise,
        validation: { ...r.validacao, tentativas: r.tentativas },
        latency_ms: r.latency_ms,
        dossie_status: 'pendente',
      });
      /**
       * Conflito de chave é empate, não erro.
       *
       * Duas análises podem estar no ar ao mesmo tempo quando o cara aperta
       * "Tentar de novo" antes da primeira terminar, e aí a segunda a chegar
       * bate na chave primária. A que perdeu joga fora o próprio trabalho e
       * serve o spoiler da que ganhou: as duas leram o mesmo material, e o cara
       * receber uma tela de erro com duas leituras prontas no banco seria o pior
       * dos dois mundos.
       */
      if (error?.code === '23505') {
        const { data: existente } = await db
          .from('quiz_readings')
          .select('output')
          .eq('session_id', sessionId)
          .maybeSingle();

        const salva = AnaliseSchema.safeParse(existente?.output);
        if (salva.success) {
          await atualizarStatus(sessionId, 'spoiler_shown');
          return NextResponse.json({
            tipo: 'spoiler',
            spoiler: salva.data.spoiler,
            recuperada: true,
          });
        }
      }

      if (error) {
        console.error('[read] não gravou a análise', error);
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

    // Só o spoiler atravessa a rede. O dossiê nem escrito está ainda.
    return NextResponse.json({
      tipo: 'spoiler',
      spoiler: r.analise.spoiler,
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
