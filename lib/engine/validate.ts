import { normalizarAspas, trechosCitados } from '../citacoes';
import { paresBatem } from '../movimentos';
import type { Analise, DossieLeitura, Leitura } from './schema';

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
  /**
   * Prompt Mãe Seção 9, proibido 9, acrescentado em 18/09.
   *
   * A palavra oficial da casa é Movimento. O gesto é a ação concreta dentro
   * dele, e trocar um pelo outro no dossiê apaga o nome que o método vende. O
   * regex pega a construção em posição de nome, não a palavra "gesto" solta,
   * que é português normal e aparece no dossiê canônico do Anexo 11.5.
   */
  {
    termo: 'gesto do momento (a palavra é Movimento)',
    re: /\bo\s+gesto\s+d(?:o\s+teu|o|esse|este)\s+momento\b/i,
  },
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

/**
 * Prompt Mãe Seção 5, batidas 3 e 4 do bloco do Ato, e item 14 do checklist.
 *
 * A armadilha e o convite são o que ele guarda da leitura, e por isso vão em
 * linha própria com rótulo em negrito. Diluídos dentro do parágrafo corrido,
 * apagam os dois. O regex aceita o negrito por fora dos dois pontos e por
 * dentro, porque a diferença não muda nada na tela.
 */
const ROTULOS_ATO: { rotulo: string; re: RegExp }[] = [
  { rotulo: 'A armadilha:', re: /^\s*\*\*\s*A\s+armadilha\s*:?\s*\*\*\s*:?/im },
  { rotulo: 'O convite:', re: /^\s*\*\*\s*O\s+convite\s*:?\s*\*\*\s*:?/im },
];

/**
 * Proporção do Prompt Mãe Seção 5: o Ato e o Movimento juntos ocupam cerca de
 * dois terços do dossiê, e o que sobra cede espaço, nunca eles.
 *
 * Suave, e o piso é generoso, porque "cerca de" não é número. O que isto pega é
 * a falha registrada no Teste 1, Ato raso com o arquétipo comendo o dossiê, e
 * não a variação de dez palavras. Dura, ela brigaria com a régua de tamanho: as
 * duas mandando cortar em direções opostas viram laço de retry.
 */
const PISO_ATO_MOVIMENTO = 0.55;

/**
 * Teto por bloco, a mesma tabela do contrato em `contract.ts`.
 *
 * Só roda quando o total já estourou, porque bloco grande com total dentro da
 * faixa é o "cerca de" da Seção 5 trabalhando, e reprovar isso seria briga com
 * o próprio documento.
 *
 * Existe porque "o dossiê está com 497 palavras, corta" não diz onde cortar, e
 * o modelo corta do lugar errado. Medido contra a fixture do Marcelo: o Ato e o
 * Movimento saíram nos 137 e 140 que a Seção 5 pede, e o estouro inteiro estava
 * na devolutiva com 81 e no fechamento com 78, onde o documento pede 50 e 60.
 * Nomear o bloco é a diferença entre um retry que conserta e um que reescreve.
 */
const TETOS: { campo: keyof Leitura['dossie']; rotulo: string; teto: number }[] = [
  { campo: 'titulo', rotulo: 'o título', teto: 8 },
  { campo: 'devolutiva', rotulo: 'a devolutiva', teto: 55 },
  { campo: 'ato_texto', rotulo: 'o bloco do Ato', teto: 138 },
  { campo: 'movimento_texto', rotulo: 'o bloco do Movimento', teto: 265 },
  { campo: 'arquetipo_texto', rotulo: 'o bloco do arquétipo', teto: 55 },
  { campo: 'fechamento', rotulo: 'o fechamento', teto: 65 },
];

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

function camposDossie(d: DossieLeitura): string[] {
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
function palavrasDossie(d: DossieLeitura): number {
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
  let saida = normalizarAspas(texto);
  for (const trecho of trechosCitados(saida)) {
    if (todas.includes(normalizar(trecho))) {
      saida = saida.split(trecho).join(' ');
    }
  }
  return saida;
}

/** Fábrica dos coletores, compartilhada pelos dois validadores. */
function coletor() {
  const duras: Falha[] = [];
  const suaves: Falha[] = [];
  return {
    duras,
    suaves,
    dura: (regra: string, mensagem: string) =>
      duras.push({ regra, severidade: 'dura' as const, mensagem }),
    suave: (regra: string, mensagem: string) =>
      suaves.push({ regra, severidade: 'suave' as const, mensagem }),
    fechar: (): Resultado => ({ ok: duras.length === 0, duras, suaves }),
  };
}

/* ------------------------------------------------------------------ */
/* Chamada 1 · a análise e o spoiler                                   */
/* ------------------------------------------------------------------ */

/**
 * O que a chamada 1 pode errar, e só isso.
 *
 * Separar importa por causa do retry: mandar de volta pra chamada 1 um erro de
 * contagem de palavras do dossiê faria ela refazer a análise inteira por causa
 * de um problema que não é dela. Cada metade só recebe o que consegue consertar.
 */
export function validarAnalise(analise: Analise, respostas: Respostas): Resultado {
  const { dura, suave, fechar } = coletor();

  const todasRespostas = [respostas.p1, respostas.p2, respostas.p3, respostas.p4].join(
    ' \n ',
  );
  const spoilerLimpo = semCitacoesDele(analise.spoiler, respostas);

  /* --- tamanho do spoiler ------------------------------------------ */

  const ns = contarPalavras(analise.spoiler);
  if (ns < 90 || ns > 130) {
    dura(
      'tamanho_spoiler',
      `O spoiler está com ${ns} palavras e precisa ficar entre 90 e 130. Conta os pontos finais: o teto é seis frases.`,
    );
  }

  /* --- estilo do spoiler -------------------------------------------- */

  if (/[—–]/.test(spoilerLimpo)) {
    dura(
      'travessao',
      'Tem travessão no spoiler. Troca cada um por vírgula, ponto, dois pontos ou quebra de linha.',
    );
  }

  if (!DUPLA_NEGACAO.test(spoilerLimpo) && FORMULA_NAO_E.some((re) => re.test(spoilerLimpo))) {
    dura(
      'formula_nao_e',
      'Tem a fórmula "não é X, é Y" no spoiler. Fala a coisa direto, sem a negação que prepara a afirmação.',
    );
  }

  for (const { termo, re } of JARGAO) {
    if (re.test(spoilerLimpo)) {
      dura(
        'jargao',
        `A palavra "${termo}" não pode aparecer no spoiler. O conceito entra, a palavra fica fora.`,
      );
    }
  }

  for (const { termo, re } of [...BANIDAS, ...META_PRODUTO]) {
    if (re.test(spoilerLimpo)) dura('banida', `Tira "${termo}" do spoiler.`);
  }

  const vocabularioDele = normalizar(todasRespostas);
  for (const { termo, re } of DIAGNOSTICO) {
    if (!re.test(spoilerLimpo)) continue;
    if (re.test(vocabularioDele)) continue;
    dura(
      'diagnostico',
      `"${termo}" é categoria clínica e não entra no spoiler. Descreve o que ele contou, com os fatos dele.`,
    );
  }

  /* --- ecos --------------------------------------------------------- */

  if (analise.ecos.length !== 2) {
    dura('ecos_quantidade', 'São exatamente duas histórias, nunca mais, nunca menos.');
  } else if (analise.ecos[0].tradicao === analise.ecos[1].tradicao) {
    dura(
      'ecos_tradicao',
      `As duas histórias vieram da mesma tradição (${analise.ecos[0].tradicao}). Elas têm que vir de tradições que não se conheceram.`,
    );
  }

  /**
   * O eco precisa contar o que acontece, não só nomear a história.
   *
   * Virou regra dura quando a leitura foi partida em duas: a chamada 2 não tem
   * outra fonte pra desenvolver o eco, e "Odisseu na jangada" em três palavras
   * força ela a inventar o resto, que é exatamente o que a régua de
   * rastreabilidade do Passo 5 proíbe.
   */
  for (const eco of analise.ecos) {
    if (contarPalavras(eco.historia) >= 25) continue;
    dura(
      'eco_raso',
      `O eco "${eco.historia}" está curto demais. Conta a história: quem é o personagem, em que situação ele estava, o que aconteceu com ele e o que ele sentiu. Três ou quatro frases. A chamada 2 desenvolve isto em cinco a sete linhas e não tem outra fonte, então o que faltar aqui ela inventa.`,
    );
  }

  /* --- movimento ----------------------------------------------------- */

  if (!paresBatem(analise.movimento.numero, analise.movimento.nome)) {
    dura(
      'movimento_par',
      `O par ${analise.movimento.numero} e "${analise.movimento.nome}" não existe no banco dos 20. Confere o número e o nome.`,
    );
  }

  if (analise.material_fino && !analise.movimento.aposta) {
    suave(
      'aposta',
      'Material fino pede o Movimento como aposta declarada, com "aposta" em true.',
    );
  }

  /* --- vazamento no spoiler ------------------------------------------ */

  const vazou: string[] = [];
  const spoiler = normalizarAspas(analise.spoiler);

  // Nome do Movimento. Checa a forma capitalizada, porque "a prova já começou"
  // é português e "o Movimento é a Prova" é vazamento.
  const nomeMov = analise.movimento.nome;
  const reMov = new RegExp(`\\b${nomeMov.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  if (reMov.test(spoiler)) vazou.push(`o nome do Movimento (${nomeMov})`);

  for (const a of ['Rei', 'Guerreiro', 'Mago', 'Amante']) {
    if (new RegExp(`\\b${a}\\b`).test(spoiler)) vazou.push(`o arquétipo ${a}`);
  }

  if (/\bv[íi]deo\b/i.test(spoiler)) vazou.push('a menção ao vídeo');

  if (analise.pratica.length > 20 && maiorTrechoComum(spoiler, analise.pratica) >= 5) {
    vazou.push('a prática');
  }

  if (vazou.length > 0) {
    dura(
      'spoiler_vaza',
      `O spoiler entregou ${vazou.join(', ')}. Ele esconde o Movimento, o arquétipo, a prática, a armadilha, o convite e o desfecho das histórias.`,
    );
  }

  if (/\{\{(?:NOME|PROFISSAO)\}\}/.test(analise.spoiler)) {
    dura('spoiler_placeholder', 'O spoiler não leva {{NOME}} nem {{PROFISSAO}}.');
  }

  /* --- suaves -------------------------------------------------------- */

  if (contarPalavras(analise.pratica) > 45)
    suave('pratica', 'A prática tem que caber em uma frase.');
  if (analise.arquetipos.some((a) => a.estado.trim().length === 0))
    suave('estado', 'Cada arquétipo leva o nome do estado entre parênteses.');

  return fechar();
}

/* ------------------------------------------------------------------ */
/* Chamada 2 · o dossiê                                                */
/* ------------------------------------------------------------------ */

export function validarDossie(
  dossie: DossieLeitura,
  analise: Pick<Analise, 'material_fino' | 'movimento'>,
  respostas: Respostas,
): Resultado {
  const { dura, suave, fechar } = coletor();

  const todasRespostas = [respostas.p1, respostas.p2, respostas.p3, respostas.p4].join(
    ' \n ',
  );
  const textoDossie = camposDossie(dossie).join('\n\n');
  const limpo = semCitacoesDele(textoDossie, respostas);

  /* --- contagem ------------------------------------------------- */

  const n = palavrasDossie(dossie);
  const [min, max] = analise.material_fino ? [250, 320] : [420, 550];
  if (n < min || n > max) {
    dura(
      'tamanho_dossie',
      `O dossiê está com ${n} palavras e precisa ficar entre ${min} e ${max}${
        analise.material_fino ? ' (material fino)' : ''
      }. Conta o título mais os cinco blocos.`,
    );
  }

  if (n > max) {
    for (const { campo, rotulo, teto } of TETOS) {
      const nb = contarPalavras(dossie[campo]);
      if (nb <= teto) continue;
      dura(
        'teto_bloco',
        `Dentro dele, ${rotulo} está com ${nb} palavras e o teto é ${teto}. Tira ${nb - teto} palavras daí.`,
      );
    }
  }

  /* --- estilo ---------------------------------------------------- */

  const comTravessao = camposDossie(dossie).filter((c) =>
    /[—–]/.test(semCitacoesDele(c, respostas)),
  );
  if (comTravessao.length > 0) {
    dura(
      'travessao',
      'Tem travessão no texto. Troca cada um por vírgula, ponto, dois pontos ou quebra de linha.',
    );
  }

  if (!DUPLA_NEGACAO.test(limpo) && FORMULA_NAO_E.some((re) => re.test(limpo))) {
    dura(
      'formula_nao_e',
      'Tem a fórmula "não é X, é Y" no texto. Fala a coisa direto, sem a negação que prepara a afirmação.',
    );
  }

  for (const { termo, re } of JARGAO) {
    if (re.test(limpo)) {
      dura(
        'jargao',
        `A palavra "${termo}" não pode aparecer. O conceito entra, a palavra fica fora.`,
      );
    }
  }

  for (const { termo, re } of [...BANIDAS, ...META_PRODUTO]) {
    if (re.test(limpo)) dura('banida', `Tira "${termo}" do texto.`);
  }

  /**
   * Termo clínico que ele mesmo escreveu não é diagnóstico do agente.
   *
   * A fixture `so-outra-pessoa` expôs isto: o cara conta que a mulher teve
   * "depressão pós parto em 2020". Devolver esse fato é repetir o material
   * dele, e o que o Prompt Mãe Seção 1 proíbe é o agente *aplicar* categoria
   * clínica a alguém. Só entra na régua o termo que ele nunca usou.
   */
  const vocabularioDele = normalizar(todasRespostas);

  for (const { termo, re } of DIAGNOSTICO) {
    if (!re.test(limpo)) continue;
    if (re.test(vocabularioDele)) continue;

    dura(
      'diagnostico',
      `"${termo}" é categoria clínica e não entra na leitura. Descreve o que ele contou, com os fatos dele.`,
    );
  }

  /* --- citações literais ------------------------------------------ */

  /**
   * DESVIO 3. O planejamento pede que "cada trecho" entre aspas apareça literal
   * nas respostas. O dossiê canônico fecha a prática com a frase que comece com
   * "eu decidi", que é instrução, não citação dele. Exigir que toda aspas seja
   * dele reprova o exemplo de referência. A regra do Prompt Mãe Seção 9 é
   * "pelo menos duas citações literais", e é essa que roda aqui.
   */
  const citacoes = trechosCitados(textoDossie);
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
  const ancora = maiorTrechoComum(dossie.fechamento, respostas.p4);
  if (ancora < 4) {
    dura(
      'fechamento_p4',
      'O fechamento não retoma a resposta da Pergunta 4 com as palavras dele. Cita um trecho dela, entre aspas, e escreve o parágrafo a partir dali.',
    );
  }

  /* --- o nome dele -------------------------------------------------- */

  /**
   * Prompt Mãe Seção 9, entre os obrigatórios: "Nome dele, se ele tiver dado".
   * A Seção 4.3 completa dizendo que o dossiê liberado usa o nome que ele acabou
   * de dar, e o checklist cobra no item 18.
   *
   * Vira regra dura porque o dossiê é escrito antes do formulário, com o
   * marcador {{NOME}} no lugar. Sem marcador não há onde trocar, e o texto chega
   * sem o nome do cara sem que nada quebre. O smoke de produção pegou isto uma
   * vez, depois que a leitura foi partida em duas chamadas: a instrução do
   * marcador ficou no fim de um contrato cheio e o modelo simplesmente não usou.
   */
  if (!/\{\{\s*NOME\s*\}\}/.test(textoDossie)) {
    dura(
      'sem_marcador_nome',
      'O dossiê não tem o marcador {{NOME}} em lugar nenhum, então ele vai chegar sem o nome do cara. Abre a devolutiva em vocativo, assim: "{{NOME}}, em sete anos tu deu...".',
    );
  }

  /* --- forma do Ato e do Movimento --------------------------------- */

  for (const { rotulo, re } of ROTULOS_ATO) {
    if (re.test(dossie.ato_texto)) continue;
    dura(
      'rotulo_ato',
      `O bloco do Ato não tem o rótulo "${rotulo}" em linha própria e em negrito. Escreve a linha começando com **${rotulo}** e o resto da frase depois, escrita com a cena dele.`,
    );
  }

  /**
   * O nome do Movimento em negrito. Prompt Mãe Seção 5: "Sempre um Movimento
   * nomeado, nunca só descrito".
   *
   * A frase oficial do card, que a Seção 5 pede junto, não é conferida aqui e
   * não é pedida no contrato: ela vem do kit de arte, que ainda não existe, e a
   * própria Seção 7 prevê o caso mostrando só o nome quando não há card.
   * Inventar frase de card é pior que não ter.
   */
  const nomeEmNegrito = new RegExp(
    `\\*\\*\\s*${analise.movimento.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*\\*`,
    'i',
  );
  if (!nomeEmNegrito.test(dossie.movimento_texto)) {
    dura(
      'movimento_negrito',
      `O bloco do Movimento não abre com **${analise.movimento.nome}** em negrito, na primeira linha, sozinho. Escreve o nome assim e quebra a linha antes do resto do bloco.`,
    );
  }

  /* --- suaves ------------------------------------------------------- */

  const subtitulos = [
    dossie.ato_subtitulo,
    dossie.movimento_subtitulo,
    dossie.arquetipo_subtitulo,
  ].filter((s) => s.trim().length > 0);

  const peso = contarPalavras(dossie.ato_texto) + contarPalavras(dossie.movimento_texto);
  if (n > 0 && peso / n < PISO_ATO_MOVIMENTO) {
    suave(
      'peso_ato_movimento',
      `O Ato e o Movimento juntos são ${Math.round((peso / n) * 100)}% do dossiê e precisam ficar perto de dois terços. Aprofunda os dois e corta do arquétipo e da devolutiva.`,
    );
  }

  if (subtitulos.length > 3) suave('subtitulos', 'No máximo três subtítulos.');
  if (/:/.test(dossie.titulo)) suave('titulo', 'Título sem dois pontos explicativos.');

  return fechar();
}

/* ------------------------------------------------------------------ */
/* Leitura inteira                                                     */
/* ------------------------------------------------------------------ */

/**
 * As duas metades juntas. Usada pelo script de fixture e por qualquer checagem
 * de uma leitura já montada. Em produção quem roda são as duas separadas, cada
 * uma dentro da chamada dela.
 */
export function validar(leitura: Leitura, respostas: Respostas): Resultado {
  const a = validarAnalise(leitura, respostas);
  const d = validarDossie(leitura.dossie, leitura, respostas);

  const duras = [...a.duras, ...d.duras];
  const suaves = [...a.suaves, ...d.suaves];
  return { ok: duras.length === 0, duras, suaves };
}

/** Só as mensagens duras, pro retry. */
export function mensagensDeErro(r: Resultado): string[] {
  return r.duras.map((f) => f.mensagem);
}
