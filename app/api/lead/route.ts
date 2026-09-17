import { NextResponse } from 'next/server';

import {
  esperarDossie,
  lerLeitura,
  marcarFalha,
  reivindicarDossie,
  salvarDossie,
} from '@/lib/engine/persistencia';
import { escreverDossie } from '@/lib/engine/read';
import { registrarErro } from '@/lib/erros';
import type { Analise, DossieLeitura } from '@/lib/engine/schema';
import { classificarOrcamento, normalizarTelefone } from '@/lib/phone';
import { montarDossie, resumoParaContato } from '@/lib/render';
import { respostasDaSessao } from '@/lib/respostas';
import { atualizarStatus, buscarSessao, lerCookieSessao } from '@/lib/session';
import { supabaseOpcional } from '@/lib/supabase';
import { FORMULARIO } from '@/lib/copy';

export const runtime = 'nodejs';

/**
 * Sessenta e não trinta, por causa do plano B.
 *
 * No caminho normal esta rota responde em menos de um segundo: o dossiê já está
 * escrito e é só ler. Mas quando o cara preenche o formulário em oito segundos,
 * ou quando o disparo do cliente não saiu, é aqui que o texto tem que ser
 * escrito, e escrever leva o tempo de uma chamada inteira.
 */
export const maxDuration = 60;

/**
 * Quanto esperar pelo dossiê que a `/api/dossie` está escrevendo.
 *
 * Fica abaixo do teto da função pra sobrar tempo de gravar o lead e responder.
 * Se estourar, o plano B assume e escreve na hora, o que é lento mas entrega.
 */
const ESPERA_MS = 40_000;

/**
 * O portão. Planejamento Seção 2.
 *
 * Só abre o dossiê se a sessão existe, tem análise salva e está em
 * `spoiler_shown`. Essa é a única rota que devolve o texto do dossiê, e ela só
 * devolve depois de gravar o lead.
 *
 * Com a leitura partida em duas chamadas, ela ganhou um segundo trabalho: achar
 * o dossiê. Três caminhos, nesta ordem. Pronto no banco, que é o normal, porque
 * a chamada 2 rodou enquanto ele digitava. Em voo, e aí espera. Nem começou ou
 * morreu no meio, e aí escreve aqui mesmo.
 */

type CorpoLead = {
  nome?: string;
  whatsapp?: string;
  profissao?: string;
  orcamento?: string;
  /** Honeypot. Campo escondido, humano nunca preenche. */
  empresa?: string;
};

export async function POST(req: Request) {
  const sessionId = await lerCookieSessao();
  if (!sessionId) {
    return NextResponse.json({ erro: 'sem_sessao' }, { status: 401 });
  }

  let corpo: CorpoLead;
  try {
    corpo = (await req.json()) as CorpoLead;
  } catch {
    return NextResponse.json({ erro: 'corpo_invalido' }, { status: 400 });
  }

  // Honeypot preenchido: responde 200 e descarta, sem dossiê e sem gravar.
  // Devolver erro ensinaria o bot a tentar de novo sem o campo.
  if ((corpo.empresa ?? '').trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const nome = (corpo.nome ?? '').trim().slice(0, 120);
  const profissao = (corpo.profissao ?? '').trim().slice(0, 200);
  const orcamentoRaw = (corpo.orcamento ?? '').trim().slice(0, 2000);
  const whatsappRaw = (corpo.whatsapp ?? '').trim().slice(0, 40);

  const campos: Record<string, string> = {};
  if (nome.length === 0) campos.nome = FORMULARIO.erros.nome;
  if (profissao.length === 0) campos.profissao = FORMULARIO.erros.profissao;
  if (orcamentoRaw.length === 0) campos.orcamento = FORMULARIO.erros.orcamento;

  const telefone = normalizarTelefone(whatsappRaw);
  if (!telefone.ok) campos.whatsapp = FORMULARIO.erros.whatsapp;

  if (Object.keys(campos).length > 0) {
    return NextResponse.json({ erro: 'campos', campos }, { status: 400 });
  }

  const sessao = await buscarSessao(sessionId);
  if (!sessao) {
    return NextResponse.json({ erro: 'sessao_invalida' }, { status: 401 });
  }

  if (sessao.status === 'released') {
    return NextResponse.json({ erro: 'lead_ja_existe' }, { status: 409 });
  }

  if (sessao.status !== 'spoiler_shown') {
    return NextResponse.json({ erro: 'fora_de_ordem' }, { status: 409 });
  }

  const db = supabaseOpcional();
  if (!db) {
    return NextResponse.json({ erro: 'sem_leitura' }, { status: 409 });
  }

  const linha = await lerLeitura(sessionId);
  if (!linha) {
    return NextResponse.json({ erro: 'sem_leitura' }, { status: 409 });
  }

  const analise = linha.analise;
  const resumo = resumoParaContato(analise);

  const { error: erroLead } = await db.from('quiz_leads').insert({
    session_id: sessionId,
    nome,
    whatsapp: telefone.ok ? telefone.e164 : whatsappRaw,
    whatsapp_raw: whatsappRaw,
    profissao,
    orcamento_raw: orcamentoRaw,
    orcamento_faixa: classificarOrcamento(orcamentoRaw),
    ato: resumo.ato,
    movimento: resumo.movimento,
    arquetipo: resumo.arquetipo,
    dor_literal: resumo.dor_literal,
  });

  if (erroLead) {
    console.error('[lead] não gravou', erroLead);
    registrarErro({ rota: '/api/lead', codigo: 'lead_nao_gravou', sessionId, detalhe: erroLead.message, req });
    return NextResponse.json({ erro: 'nao_gravou' }, { status: 500 });
  }

  /*
   * O lead está salvo. Daqui pra baixo o cara já é nosso, então nenhum caminho
   * pode terminar em erro: se o dossiê não vier, ele fica com uma tela quebrada
   * e a gente fica com o telefone dele. Por isso o plano B é gerar na hora, e
   * por isso `maxDuration` é 60.
   */
  let dossie: DossieLeitura | null = linha.dossie;

  if (!dossie && linha.estado === 'gerando') {
    dossie = await esperarDossie(sessionId, ESPERA_MS);
  }

  if (!dossie) {
    console.warn('[lead] dossiê não estava pronto, escrevendo na hora', {
      session_id: sessionId,
      estado: linha.estado,
    });
    dossie = await escreverAgora(sessionId, analise);
  }

  if (!dossie) {
    registrarErro({ rota: '/api/lead', codigo: 'dossie_indisponivel', sessionId, detalhe: `estado ${linha.estado}`, req });
    await atualizarStatus(sessionId, 'error');
    return NextResponse.json({ erro: 'dossie_indisponivel' }, { status: 500 });
  }

  await atualizarStatus(sessionId, 'released');

  return NextResponse.json({
    dossie: montarDossie({ ...analise, dossie }, { nome, profissao }),
  });
}

/**
 * Plano B: escreve o dossiê dentro desta requisição.
 *
 * Entra quando a chamada 2 nunca rodou (o disparo do cliente não saiu, ou o cara
 * recarregou a página), quando ela falhou, ou quando a espera estourou. Passa
 * pela mesma trava, pra não competir com uma invocação que ainda esteja viva.
 */
async function escreverAgora(
  sessionId: string,
  analise: Analise,
): Promise<DossieLeitura | null> {
  if (!(await reivindicarDossie(sessionId))) {
    // Alguém pegou entre a nossa espera e agora. Dá mais uma janela curta.
    return esperarDossie(sessionId, 15_000);
  }

  const respostas = await respostasDaSessao(sessionId);
  if (!respostas) {
    await marcarFalha(sessionId, 'respostas_incompletas');
    return null;
  }

  try {
    const r = await escreverDossie(respostas, analise);
    await salvarDossie(sessionId, r.dossie, {
      model: r.model,
      latency_ms: r.latency_ms,
      validacao: { ...r.validacao, tentativas: r.tentativas, plano_b: true },
    });
    return r.dossie;
  } catch (e) {
    console.error('[lead] o plano B também falhou', e);
    await marcarFalha(sessionId, e instanceof Error ? e.message : String(e));
    return null;
  }
}
