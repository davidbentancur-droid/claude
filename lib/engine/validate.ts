import { paresBatem } from '../movimentos';
import type { Leitura } from './schema';

/**
 * Validação pós geração. Planejamento Seção 3.2, checklist do Prompt Mãe Seção 10.
 *
 * O modelo erra estilo mesmo com o Prompt Mãe inteiro no system. Aqui a gente
 * confere em código, nomeia o erro e manda de volta. Até 2 retries.
 *
 * Quatro regras do planejamento foram ajustadas porque, do jeito escrito, elas
 * reprovam o caso canônico do Anexo 11.5 do próprio Prompt Mãe. Cada ajuste está
 * marcado com DESVIO e explicado na linha. Um validador que reprova o exemplo de
 * referência não valida nada, só gera retry até acabar a paciência.
 */

export type Severidade = 'dura' | 'suave';

export type Falha = {
  regra: string;
  severidade: Severidade;
  /** Texto que vai pro modelo no retry. Tem que ser acionável. */
  mensagem: string;
};

export type Respostas = { p1: string; p2: string; p3: string; p4: string };

export type Resultado = {
  ok: boolean;
  duras: Falha[];
  suaves: Falha[];
};

/* ------------------------------------------------------------------ */
/* Normalização                                                        */
/* ------------------------------------------------------------------ */

const ASPAS = /[“”„«»″]/g;

function normalizarAspas(s: string): string {
  return s.replace(ASPAS, '"');
}

/**
 * Comparação frouxa: sem acento, sem caixa, espaço colapsado. Serve pra conferir
 * se as palavras são dele. Tolerar acento aqui evita retry quando o modelo
 * "conserta" um acento que ele não pôs, o que não é o vício que a regra combate.
 */
function normalizar(s: string): string {
  return normalizarAspas(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function palavras(s: string): string[] {
  return normalizar(s).split(' ').filter(Boolean);
}

function contarPalavras(s: string): number {
  return palavras(s).length;
}

/** Trechos entre aspas duplas, já normalizadas. */
function trechosEntreAspas(s: string): string[] {
  const out: string[] = [];
  const re = /"([^"]{2,240})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalizarAspas(s))) !== null) out.push(m[1]);
  return out;
}

/** Maior sequência de palavras consecutivas presente nos dois textos. */
function maiorTrechoComum(a: string, b: string): number {
  const pa = palavras(a);
  const pb = palavras(b);
  if (pa.length === 0 || pb.length === 0) return 0;

  let melhor = 0;
  let anterior = new Array<number>(pb.length + 1).fill(0);

  for (let i = 1; i <= pa.length; i++) {
    const atual = new Array<number>(pb.length + 1).fill(0);
    for (let j = 1; j <= pb.length; j++) {
      if (pa[i - 1] === pb[j - 1]) {
        atual[j] = anterior[j - 1] + 1;
        if (atual[j] > melhor) melhor = atual[j];
      }
    }
    anterior = atual;
  }
  return melhor;
}

/* ------------------------------------------------------------------ */
/* Listas                                                              */
/* ------------------------------------------------------------------ */

/** Prompt Mãe Seção 9, proibido 6. O conceito entra, a palavra não. */
const JARGAO: { termo: string; re: RegExp }[] = [
  { termo: 'individuação', re: /\bindividua[çc][ãa]o\b/i },
  { termo: 'Self', re: /\bself\b/i },
  { termo: 'coniunctio', re: /\bconiunctio\b/i },
  { termo: 'katábasis', re: /\bkat[áa]basis\b/i },
  { termo: 'anagnórise', re: /\banagn[óo]ri(?:se|sis)\b/i },
  { termo: 'inconsciente coletivo', re: /\binconsciente\s+coletivo\b/i },
  { termo: 'arquétipo junguiano', re: /\bjunguian\w*/i },
  // "sombra" só como termo técnico. "na sombra do prédio" é português normal.
  { termo: 'sombra (como termo)', re: /\b(?:a|tua|sua|essa)\s+[Ss]ombra\b(?!\s+d[aoe]\s)/ },
];

/**
 * Prompt Mãe Seção 6. Urgência falsa, promessa e destino como explicação.
 */
const BANIDAS: { termo: string; re: RegExp }[] = [
  { termo: 'quiz', re: /\bquiz\b/i },
  { termo: 'clica aqui', re: /\bclic(?:a|ar|que)\s+(?:aqui|no\s+bot)/i },
  { termo: 'garanta sua vaga', re: /\bgarant(?:a|e|ir)\s+(?:a\s+)?(?:sua|tua)\s+vaga\b/i },
  { termo: 'não perca', re: /\bn[ãa]o\s+perc(?:a|as)\b/i },
  { termo: 'destino', re: /\b(?:teu|seu|o)\s+destino\b/i },
  { termo: 'universo', re: /\bo\s+universo\s+(?:te|conspira|quis|trouxe)/i },
  { termo: 'de uma vez por todas', re: /\bde\s+uma\s+vez\s+por\s+todas\b/i },
];

/**
 * DESVIO 1. O planejamento bane "teste" e "resultado" como palavras. O dossiê
 * canônico do Anexo 11.5 escreve "ser testado num lugar onde ninguém assiste o
 * resultado", então o banimento literal reprova o exemplo de referência.
 * O que o Prompt Mãe Seção 1 quer barrar é a menção ao produto ("o teu
 * resultado", "este teste"), não a palavra em uso corrente. É isso que roda aqui.
 */
const META_PRODUTO: { termo: string; re: RegExp }[] = [
  { termo: 'referência ao quiz como teste', re: /\b(?:este|esse|o|teu|seu)\s+teste\b/i },
  { termo: 'referência ao resultado do quiz', re: /\b(?:teu|seu)\s+resultado\b/i },
  { termo: 'referência ao resultado do quiz', re: /\bo\s+resultado\s+d(?:o|esse|este)\s+(?:teste|quiz|question)/i },
];

/** Prompt Mãe Seção 1. Nenhuma categoria de saúde mental. */
const DIAGNOSTICO: { termo: string; re: RegExp }[] = [
  { termo: 'depressão', re: /\bdepress(?:[ãa]o|ivo|iva)\b/i },
  { termo: 'ansiedade', re: /\bansiedade\b/i },
  { termo: 'TDAH', re: /\btdah\b/i },
  { termo: 'burnout', re: /\bburn\s?out\b/i },
  { termo: 'trauma', re: /\btrauma(?:s|tizado)?\b/i },
  { termo: 'transtorno', re: /\btranstorno\b/i },
  { termo: 'terapia como prescrição', re: /\b(?:procur(?:a|e)|busc(?:a|e)|precisa\s+de)\s+(?:um\s+)?(?:terapeuta|psic[óo]logo|psiquiatra|terapia)\b/i },
];

/**
 * DESVIO 2. O regex do planejamento pega "Não é o começo e não é o fim", que é o
 * spoiler canônico do Anexo 11.4. Dupla negação não é a fórmula de substituição
 * que o Prompt Mãe bane. Aqui a substituição precisa estar marcada por vírgula
 * seguida de afirmação, ou por "e sim" / "mas sim".
 */
const FORMULA_NAO_E: RegExp[] = [
  /\bn[ãa]o\s+(?:é|era|foi|está|estava|se\s+trata\s+de)\s+[^.!?;]{2,80},\s*(?:é|era|foi|está|estava|mas\s+sim|e\s+sim|mas\s+é)\b/i,
  /\bn[ãa]o\s+(?:é|era|foi|está|estava)\s+[^.!?;]{2,80}\s+(?:e\s+sim|mas\s+sim)\b/i,
  /\bn[ãa]o\s+(?:\p{L}+\s+)?(?:apenas|só|somente)\s+[^.!?;]{2,80},\s*(?:mas|tu|voc[êe]|ele|é|está)\b/iu,
  /\bn[ãa]o\s+como\s+[^.!?;]{2,80},\s*mas\s+como\b/i,
  /\bn[ãa]o\s+é\s+sobre\s+[^.!?;]{2,80},\s*é\s+sobre\b/i,
];

/** Guarda contra dupla negação, que não é a fórmula. */
const DUPLA_NEGACAO = /\bn[ãa]o\s+(?:é|era|foi)\b[^.!?;]{0,80}\be\s+n[ãa]o\s+(?:é|era|foi)\b/i;

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

function camposDossie(l: Leitura): string[] {
  const d = l.dossie;
  return [
    d.titulo,
    d.devolutiva,
    d.ato_subtitulo,
    d.ato_texto,
    d.movimento_subtitulo,
    d.movimento_texto,
    d.arquetipo_subtitulo,
    d.arquetipo_texto,
    d.fechamento,
  ];
}

/** Planejamento Seção 3.2: contagem dos 5 blocos mais o título. */
function palavrasDossie(l: Leitura): number {
  const d = l.dossie;
  return [
    d.titulo,
    d.devolutiva,
    d.ato_texto,
    d.movimento_texto,
    d.arquetipo_texto,
    d.fechamento,
  ].reduce((n, campo) => n + contarPalavras(campo), 0);
}

/**
 * Tira do texto as citações que são palavras dele, pra não punir o modelo por
 * devolver o que o cara escreveu. Se ele falou em "ansiedade", citar isso é
 * obrigação, não diagnóstico.
 */
function semCitacoesDele(texto: string, respostas: Respostas): string {
  const todas = normalizar(
    [respostas.p1, respostas.p2, respostas.p3, respostas.p4].join(' \n '),
  );
  return normalizarAspas(texto).replace(/"([^"]{2,240})"/g, (inteiro, dentro: string) =>
    todas.includes(normalizar(dentro)) ? ' ' : inteiro,
  );
}

export function validar(leitura: Leitura, respostas: Respostas): Resultado {
  const duras: Falha[] = [];
  const suaves: Falha[] = [];

  const dura = (regra: string, mensagem: string) =>
    duras.push({ regra, severidade: 'dura', mensagem });
  const suave = (regra: string, mensagem: string) =>
    suaves.push({ regra, severidade: 'suave', mensagem });

  const todasRespostas = [respostas.p1, respostas.p2, respostas.p3, respostas.p4].join(
    ' \n ',
  );
  const textoDossie = camposDossie(leitura).join('\n\n');
  const limpo = semCitacoesDele(textoDossie, respostas);
  const spoilerLimpo = semCitacoesDele(leitura.spoiler, respostas);

  /* --- contagem ------------------------------------------------- */

  const n = palavrasDossie(leitura);
  const [min, max] = leitura.material_fino ? [250, 320] : [300, 400];
  if (n < min || n > max) {
    dura(
      'tamanho_dossie',
      `O dossiê está com ${n} palavras e precisa ficar entre ${min} e ${max}${
        leitura.material_fino ? ' (material fino)' : ''
      }. Conta o título mais os cinco blocos.`,
    );
  }

  const ns = contarPalavras(leitura.spoiler);
  if (ns < 90 || ns > 130) {
    dura(
      'tamanho_spoiler',
      `O spoiler está com ${ns} palavras e precisa ficar entre 90 e 130.`,
    );
  }

  /* --- estilo ---------------------------------------------------- */

  const comTravessao = [...camposDossie(leitura), leitura.spoiler].filter((c) =>
    /[—–]/.test(semCitacoesDele(c, respostas)),
  );
  if (comTravessao.length > 0) {
    dura(
      'travessao',
      'Tem travessão no texto. Troca cada um por vírgula, ponto, dois pontos ou quebra de linha.',
    );
  }

  for (const alvo of [limpo, spoilerLimpo]) {
    if (DUPLA_NEGACAO.test(alvo)) continue;
    const bateu = FORMULA_NAO_E.find((re) => re.test(alvo));
    if (bateu) {
      dura(
        'formula_nao_e',
        'Tem a fórmula "não é X, é Y" no texto. Fala a coisa direto, sem a negação que prepara a afirmação.',
      );
      break;
    }
  }

  for (const { termo, re } of JARGAO) {
    if (re.test(limpo) || re.test(spoilerLimpo)) {
      dura('jargao', `A palavra "${termo}" não pode aparecer. O conceito entra, a palavra fica fora.`);
    }
  }

  for (const { termo, re } of [...BANIDAS, ...META_PRODUTO]) {
    if (re.test(limpo) || re.test(spoilerLimpo)) {
      dura('banida', `Tira "${termo}" do texto.`);
    }
  }

  for (const { termo, re } of DIAGNOSTICO) {
    if (re.test(limpo) || re.test(spoilerLimpo)) {
      dura(
        'diagnostico',
        `"${termo}" é categoria clínica e não entra na leitura. Descreve o que ele contou, com os fatos dele.`,
      );
    }
  }

  /* --- citações literais ------------------------------------------ */

  /**
   * DESVIO 3. O planejamento pede que "cada trecho" entre aspas apareça literal
   * nas respostas. O dossiê canônico fecha a prática com a frase que comece com
   * "eu decidi", que é instrução, não citação dele. Exigir que toda aspas seja
   * dele reprova o exemplo de referência. A regra do Prompt Mãe Seção 9 é
   * "pelo menos duas citações literais", e é essa que roda aqui.
   */
  const citacoes = trechosEntreAspas(textoDossie);
  const normalizadas = normalizar(todasRespostas);
  const dele = citacoes.filter((c) => normalizadas.includes(normalizar(c)));

  if (dele.length < 2) {
    dura(
      'citacoes',
      `Só ${dele.length} citação literal das palavras dele apareceu no dossiê, e o mínimo é 2. Copia trechos exatos das respostas dele, entre aspas, sem corrigir a gramática.`,
    );
  }

  /* --- fechamento ancorado na P4 ---------------------------------- */

  /**
   * DESVIO 4. O planejamento pede a `dor_literal` inteira dentro do fechamento.
   * O fechamento canônico cita "meus filhos me vendo assim e achando que é
   * normal" e a P4 original é "Meus filhos me vendo assim, cansado, sempre no
   * telefone, e achando que é normal". Elidir o meio é citação honesta. Aqui a
   * régua é uma sequência de pelo menos 4 palavras consecutivas da P4.
   */
  const ancora = maiorTrechoComum(leitura.dossie.fechamento, respostas.p4);
  if (ancora < 4) {
    dura(
      'fechamento_p4',
      'O fechamento não retoma a resposta da Pergunta 4 com as palavras dele. Cita um trecho dela, entre aspas, e escreve o parágrafo a partir dali.',
    );
  }

  /* --- ecos -------------------------------------------------------- */

  if (leitura.ecos.length !== 2) {
    dura('ecos_quantidade', 'São exatamente duas histórias, nunca mais, nunca menos.');
  } else if (leitura.ecos[0].tradicao === leitura.ecos[1].tradicao) {
    dura(
      'ecos_tradicao',
      `As duas histórias vieram da mesma tradição (${leitura.ecos[0].tradicao}). Elas têm que vir de tradições que não se conheceram.`,
    );
  }

  /* --- movimento --------------------------------------------------- */

  if (!paresBatem(leitura.movimento.numero, leitura.movimento.nome)) {
    dura(
      'movimento_par',
      `O par ${leitura.movimento.numero} e "${leitura.movimento.nome}" não existe no banco dos 20. Confere o número e o nome.`,
    );
  }

  if (leitura.material_fino && !leitura.movimento.aposta) {
    suave(
      'aposta',
      'Material fino pede o Movimento como aposta declarada, com "aposta" em true.',
    );
  }

  /* --- vazamento no spoiler ---------------------------------------- */

  const vazou: string[] = [];
  const spoiler = normalizarAspas(leitura.spoiler);

  // Nome do Movimento. Checa a forma capitalizada, porque "a prova já começou"
  // é português e "o Movimento é a Prova" é vazamento.
  const nomeMov = leitura.movimento.nome;
  const reMov = new RegExp(`\\b${nomeMov.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  if (reMov.test(spoiler)) vazou.push(`o nome do Movimento (${nomeMov})`);

  for (const a of ['Rei', 'Guerreiro', 'Mago', 'Amante']) {
    if (new RegExp(`\\b${a}\\b`).test(spoiler)) vazou.push(`o arquétipo ${a}`);
  }

  if (/\bv[íi]deo\b/i.test(spoiler)) vazou.push('a menção ao vídeo');

  if (leitura.pratica.length > 20 && maiorTrechoComum(spoiler, leitura.pratica) >= 5) {
    vazou.push('a prática');
  }

  if (vazou.length > 0) {
    dura(
      'spoiler_vaza',
      `O spoiler entregou ${vazou.join(', ')}. Ele esconde o Movimento, o arquétipo, a prática, a armadilha, o convite e o desfecho das histórias.`,
    );
  }

  if (/\{\{(?:NOME|PROFISSAO)\}\}/.test(leitura.spoiler)) {
    dura('spoiler_placeholder', 'O spoiler não leva {{NOME}} nem {{PROFISSAO}}.');
  }

  /* --- suaves ------------------------------------------------------- */

  const subtitulos = [
    leitura.dossie.ato_subtitulo,
    leitura.dossie.movimento_subtitulo,
    leitura.dossie.arquetipo_subtitulo,
  ].filter((s) => s.trim().length > 0);

  if (subtitulos.length > 3) suave('subtitulos', 'No máximo três subtítulos.');
  if (/:/.test(leitura.dossie.titulo)) suave('titulo', 'Título sem dois pontos explicativos.');
  if (contarPalavras(leitura.pratica) > 45)
    suave('pratica', 'A prática tem que caber em uma frase.');
  if (leitura.arquetipos.some((a) => a.estado.trim().length === 0))
    suave('estado', 'Cada arquétipo leva o nome do estado entre parênteses.');

  return { ok: duras.length === 0, duras, suaves };
}

/** Só as mensagens duras, pro retry. */
export function mensagensDeErro(r: Resultado): string[] {
  return r.duras.map((f) => f.mensagem);
}
