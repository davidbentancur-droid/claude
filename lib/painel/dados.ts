import { supabase } from '../supabase';

/**
 * Tudo que o painel mostra, numa consulta só por seção.
 *
 * A fonte é a view `funil_por_sessao` da migração 0004, que junta numa linha
 * por sessão o que estava espalhado em cinco tabelas. Sem ela o painel faria
 * seis consultas e cruzaria na memória, e o cruzamento em JS seria a primeira
 * coisa a quebrar quando o volume subisse.
 */

/** As abas do painel. A URL manda, pra o link ser copiável. */
export const ABAS = [
  { chave: 'dados', rotulo: 'Dados' },
  { chave: 'leads', rotulo: 'Leads' },
  { chave: 'respostas', rotulo: 'Respostas' },
] as const;

export type Aba = (typeof ABAS)[number]['chave'];

export function abaValida(v: string | undefined): Aba {
  return ABAS.some((a) => a.chave === v) ? (v as Aba) : 'dados';
}

/** Janela em dias. Zero é "desde o começo". */
export const JANELAS = [
  { dias: 1, rotulo: 'Hoje' },
  { dias: 7, rotulo: '7 dias' },
  { dias: 14, rotulo: '14 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
  { dias: 0, rotulo: 'Tudo' },
] as const;

export function janelaValida(v: string | undefined): number {
  const n = Number(v);
  return JANELAS.some((j) => j.dias === n) ? n : 30;
}

function corteDe(dias: number): string | null {
  if (dias === 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Sessao = {
  session_id: string;
  created_at: string;
  status: string;
  utm: Record<string, string> | null;
  respostas_dadas: number;
  teve_leitura: boolean;
  virou_lead: boolean;
  nome: string | null;
  whatsapp: string | null;
  profissao: string | null;
  orcamento_raw: string | null;
  orcamento_faixa: string | null;
  ato: string | null;
  movimento: string | null;
  arquetipo: string | null;
  dor_literal: string | null;
  viu_dossie: boolean;
  viu_vsl: boolean;
  foi_whatsapp: boolean;
  viu_downsell: boolean;
  foi_checkout: boolean;
};

export type Etapa = {
  chave: string;
  rotulo: string;
  n: number;
  /** Conversão a partir da etapa anterior. Null na primeira. */
  conv: number | null;
  /** Queda a partir da etapa anterior, em pontos. Null na primeira. */
  drop: number | null;
  /** Direita do funil, do jeito que a referência mostra. */
  nota: string;
  /** True quando a etapa só existe a partir da migração 0004. */
  desdeAgora?: boolean;
};

export type Lead = {
  sessionId: string;
  quando: string;
  nome: string;
  whatsapp: string;
  profissao: string;
  orcamentoRaw: string;
  faixa: Faixa;
  qualificado: boolean;
  ato: string | null;
  movimento: string | null;
  arquetipo: string | null;
  dor: string | null;
  viuDossie: boolean;
  foiWhatsapp: boolean;
  viuDownsell: boolean;
  foiCheckout: boolean;
};

export type Faixa = 'dezenas' | 'centenas' | 'milhares' | 'indefinido';

export type Resposta = {
  sessionId: string;
  quando: string;
  nome: string | null;
  status: string;
  virouLead: boolean;
  p1: string | null;
  p1Repescagem: string | null;
  p2: string | null;
  p2Repescagem: string | null;
  p3: string | null;
  p4: string | null;
  vias: string[];
};

export type Painel = {
  dias: number;
  desde: string | null;
  /** Quantas sessões têm resposta, mesmo quando o texto não foi buscado. */
  sessoesComResposta: number;
  etapas: Etapa[];
  bifurcacao: {
    whatsapp: number;
    downsell: number;
    checkout: number;
    base: number;
  };
  resumo: {
    sessoes: number;
    leads: number;
    qualificados: number;
    convGeral: number;
    convQualificado: number;
  };
  porFaixa: { faixa: Faixa; n: number }[];
  porAto: { ato: string; n: number }[];
  porMovimento: { movimento: string; n: number }[];
  leads: Lead[];
  respostas: Resposta[];
  /** Data do primeiro evento gravado, pra avisar de onde o funil de baixo vale. */
  eventosDesde: string | null;
};

/* ------------------------------------------------------------------ */
/* Regras                                                              */
/* ------------------------------------------------------------------ */

/**
 * Quem é qualificado.
 *
 * A régua é a faixa de orçamento que o `classificarOrcamento` já grava, e a
 * linha fica entre dezenas e centenas. O Prompt Mãe Seção 4.2 manda classificar
 * em três e avisa que "o verbo importa mais que a cifra", então isto é filtro
 * de triagem, não veredito: o texto cru aparece inteiro na tabela e quem lê é
 * gente. `indefinido` não conta como qualificado nem como desqualificado, conta
 * como "tem que ler".
 */
export function ehQualificado(faixa: string | null): boolean {
  return faixa === 'centenas' || faixa === 'milhares';
}

export const ROTULO_FAIXA: Record<Faixa, string> = {
  milhares: 'Milhares',
  centenas: 'Centenas',
  dezenas: 'Dezenas',
  indefinido: 'Sem faixa',
};

function faixaDe(v: string | null): Faixa {
  if (v === 'milhares' || v === 'centenas' || v === 'dezenas') return v;
  return 'indefinido';
}

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : (parte / total) * 100;
}

function contar<T extends string>(valores: (T | null)[]): { chave: T; n: number }[] {
  const m = new Map<T, number>();
  for (const v of valores) {
    if (v === null || v.trim().length === 0) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([chave, n]) => ({ chave, n }))
    .sort((a, b) => b.n - a.n);
}

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */

/** Teto por consulta. Acima disso o painel mostraria mais do que se lê. */
const TETO = 2000;

/**
 * `comRespostas` existe por custo, não por organização.
 *
 * A consulta das respostas é a cara: ela busca em lotes de 500 e traz o texto
 * inteiro de cada pergunta. Na aba Dados esse texto não aparece em lugar
 * nenhum, então buscar ele seria trazer alguns megabytes pra jogar fora. As
 * contagens do funil não dependem dele: saem de `respostas_dadas`, que a view
 * já devolve pronto.
 */
export async function carregarPainel(
  dias: number,
  { comRespostas = true }: { comRespostas?: boolean } = {},
): Promise<Painel> {
  const db = supabase();
  const corte = corteDe(dias);

  let q = db
    .from('funil_por_sessao')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(TETO);
  if (corte !== null) q = q.gte('created_at', corte);

  const { data, error } = await q;
  if (error) throw new Error(`painel: ${error.message}`);

  const sessoes = (data ?? []) as Sessao[];

  /*
   * A data do evento mais antigo. O funil abaixo do dossiê só começou a ser
   * gravado na migração 0004, e mostrar zero sem dizer isso faria parecer que
   * ninguém clicou, quando na verdade ninguém mediu.
   */
  const { data: primeiro } = await db
    .from('quiz_eventos')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);
  const eventosDesde = primeiro?.[0]?.created_at ?? null;

  /* --- funil ------------------------------------------------------- */

  const n = {
    pagina: sessoes.length,
    comecou: sessoes.filter((s) => s.respostas_dadas >= 1).length,
    respondeuTudo: sessoes.filter((s) => s.respostas_dadas >= 4).length,
    leitura: sessoes.filter((s) => s.teve_leitura).length,
    lead: sessoes.filter((s) => s.virou_lead).length,
    dossie: sessoes.filter((s) => s.viu_dossie).length,
    vsl: sessoes.filter((s) => s.viu_vsl).length,
    whatsapp: sessoes.filter((s) => s.foi_whatsapp).length,
    downsell: sessoes.filter((s) => s.viu_downsell).length,
    checkout: sessoes.filter((s) => s.foi_checkout).length,
  };

  const bruto: { chave: string; rotulo: string; n: number; nota: string; desdeAgora?: boolean }[] = [
    {
      chave: 'pagina',
      rotulo: 'Visualização da página',
      n: n.pagina,
      nota: 'Sessão aberta',
    },
    {
      chave: 'comecou',
      rotulo: 'Começou a responder',
      n: n.comecou,
      nota: 'Mandou a P1',
    },
    {
      chave: 'respondeuTudo',
      rotulo: 'Respondeu as três telas',
      n: n.respondeuTudo,
      nota: 'Quatro respostas gravadas',
    },
    {
      chave: 'leitura',
      rotulo: 'Leitura pronta',
      n: n.leitura,
      nota: 'Spoiler na tela',
    },
    {
      chave: 'lead',
      rotulo: 'Virou lead',
      n: n.lead,
      nota: 'Formulário enviado',
    },
    {
      chave: 'dossie',
      rotulo: 'Abriu o dossiê',
      n: n.dossie,
      nota: 'Dossiê renderizado',
      desdeAgora: true,
    },
    {
      chave: 'vsl',
      rotulo: 'Chegou na VSL',
      n: n.vsl,
      nota: 'Vídeo entrou na tela',
      desdeAgora: true,
    },
  ];

  const etapas: Etapa[] = bruto.map((e, i) => {
    if (i === 0) return { ...e, conv: null, drop: null };
    const anterior = bruto[i - 1].n;
    return {
      ...e,
      conv: pct(e.n, anterior),
      drop: -(100 - pct(e.n, anterior)),
    };
  });

  /* --- leads -------------------------------------------------------- */

  const leads: Lead[] = sessoes
    .filter((s) => s.virou_lead)
    .map((s) => {
      const faixa = faixaDe(s.orcamento_faixa);
      return {
        sessionId: s.session_id,
        quando: s.created_at,
        nome: s.nome ?? '',
        whatsapp: s.whatsapp ?? '',
        profissao: s.profissao ?? '',
        orcamentoRaw: s.orcamento_raw ?? '',
        faixa,
        qualificado: ehQualificado(s.orcamento_faixa),
        ato: s.ato,
        movimento: s.movimento,
        arquetipo: s.arquetipo,
        dor: s.dor_literal,
        viuDossie: s.viu_dossie,
        foiWhatsapp: s.foi_whatsapp,
        viuDownsell: s.viu_downsell,
        foiCheckout: s.foi_checkout,
      };
    });

  const qualificados = leads.filter((l) => l.qualificado).length;

  /* --- respostas ----------------------------------------------------- */

  const comResposta = sessoes.filter((s) => s.respostas_dadas >= 1);
  const ids = comResposta.map((s) => s.session_id);

  type LinhaResposta = {
    session_id: string;
    pergunta: number;
    texto: string;
    repescagem: string | null;
    via: string;
  };

  let linhas: LinhaResposta[] = [];
  if (comRespostas && ids.length > 0) {
    /*
     * Em lotes porque `in` com lista gigante estoura o tamanho da URL do
     * PostgREST. Quinhentos ids cabem com folga e o painel raramente passa de
     * um lote.
     */
    for (let i = 0; i < ids.length; i += 500) {
      const { data: parte, error: erroResp } = await db
        .from('quiz_answers')
        .select('session_id, pergunta, texto, repescagem, via')
        .in('session_id', ids.slice(i, i + 500))
        .limit(TETO * 4);
      if (erroResp) throw new Error(`painel respostas: ${erroResp.message}`);
      linhas = linhas.concat((parte ?? []) as LinhaResposta[]);
    }
  }

  const porSessao = new Map<string, LinhaResposta[]>();
  for (const l of linhas) {
    const atual = porSessao.get(l.session_id) ?? [];
    atual.push(l);
    porSessao.set(l.session_id, atual);
  }

  const respostas: Resposta[] = (comRespostas ? comResposta : []).map((s) => {
    const rs = porSessao.get(s.session_id) ?? [];
    const achar = (p: number) => rs.find((r) => r.pergunta === p) ?? null;
    const a1 = achar(1);
    const a2 = achar(2);

    return {
      sessionId: s.session_id,
      quando: s.created_at,
      nome: s.nome,
      status: s.status,
      virouLead: s.virou_lead,
      p1: a1?.texto ?? null,
      p1Repescagem: a1?.repescagem ?? null,
      p2: a2?.texto ?? null,
      p2Repescagem: a2?.repescagem ?? null,
      p3: achar(3)?.texto ?? null,
      p4: achar(4)?.texto ?? null,
      vias: [...new Set(rs.map((r) => r.via))],
    };
  });

  /* --- recortes ------------------------------------------------------ */

  const porFaixa = (['milhares', 'centenas', 'dezenas', 'indefinido'] as Faixa[]).map(
    (faixa) => ({ faixa, n: leads.filter((l) => l.faixa === faixa).length }),
  );

  return {
    dias,
    desde: corte,
    sessoesComResposta: comResposta.length,
    etapas,
    bifurcacao: {
      whatsapp: n.whatsapp,
      downsell: n.downsell,
      checkout: n.checkout,
      base: n.vsl,
    },
    resumo: {
      sessoes: n.pagina,
      leads: n.lead,
      qualificados,
      convGeral: pct(n.lead, n.pagina),
      convQualificado: pct(qualificados, n.lead),
    },
    porFaixa,
    porAto: contar(leads.map((l) => l.ato)).map(({ chave, n }) => ({ ato: chave, n })),
    porMovimento: contar(leads.map((l) => l.movimento)).map(({ chave, n }) => ({
      movimento: chave,
      n,
    })),
    leads,
    respostas,
    eventosDesde,
  };
}
