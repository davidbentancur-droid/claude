import { NextResponse } from 'next/server';

import { LeituraSchema } from '@/lib/engine/schema';
import { classificarOrcamento, normalizarTelefone } from '@/lib/phone';
import { montarDossie, resumoParaContato } from '@/lib/render';
import { atualizarStatus, buscarSessao, lerCookieSessao } from '@/lib/session';
import { supabaseOpcional } from '@/lib/supabase';
import { FORMULARIO } from '@/lib/copy';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * O portão. Planejamento Seção 2.
 *
 * Só abre o dossiê se a sessão existe, tem leitura salva e está em
 * `spoiler_shown`. Essa é a única rota que devolve o texto do dossiê, e ela só
 * devolve depois de gravar o lead.
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

  const { data: linha, error: erroLeitura } = await db
    .from('quiz_readings')
    .select('output')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (erroLeitura || !linha) {
    return NextResponse.json({ erro: 'sem_leitura' }, { status: 409 });
  }

  const parsed = LeituraSchema.safeParse(linha.output);
  if (!parsed.success) {
    console.error('[lead] leitura salva não bate com o schema', parsed.error.issues);
    return NextResponse.json({ erro: 'leitura_corrompida' }, { status: 500 });
  }

  const leitura = parsed.data;
  const resumo = resumoParaContato(leitura);

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
    return NextResponse.json({ erro: 'nao_gravou' }, { status: 500 });
  }

  await atualizarStatus(sessionId, 'released');

  return NextResponse.json({
    dossie: montarDossie(leitura, { nome, profissao }),
  });
}
