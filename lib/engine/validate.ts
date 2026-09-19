import { normalizarAspas, trechosCitados } from '../citacoes';
import { acharMito, bancoDeMitos, familiaDeTradicao, nomesDoBanco } from '../mitos';
import { movimentoPorNome, paresBatem } from '../movimentos';
import { marcasDeTempo } from './repescagem';
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
/*
 * O artigo definido sozinho saiu da lista em 19/09. "O teste" reprovava dossiê
 * do Movimento Prova, onde "o teste" é o nome do que ele está vivendo e não
 * uma referência ao quiz. Sobraram os demonstrativos e os possessivos, que são
 * os que apontam pro produto de verdade: "este teste", "o teu teste".
 */
const META_PRODUTO: { termo: string; re: RegExp }[] = [
  { termo: 'referência ao quiz como teste', re: /\b(?:este|esse|teu|seu)\s+teste\b/i },
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
/**
 * A mesma tabela do contrato em `contract.ts`, e ela precisa continuar igual.
 *
 * `porFrase` é o alvo de palavras dentro de uma frase, e é ele que o retry
 * manda mirar. Não sai de `teto / frases` porque teto é guarda e alvo é alvo:
 * dividir o teto faria o retry pedir exatamente o número que já reprova.
 */
const TETOS: {
  campo: keyof Leitura['dossie'];
  rotulo: string;
  teto: number;
  frases: number;
  porFrase: number;
  /** Não encolhe no material fino. Cinco palavras de título são cinco. */
  fixo?: boolean;
  /** Piso de frases, pros blocos em que a contagem é estrutural. */
  minFrases?: number;
}[] = [
  { campo: 'titulo', rotulo: 'o título', teto: 8, frases: 1, porFrase: 5, fixo: true },
  { campo: 'devolutiva', rotulo: 'a devolutiva', teto: 60, frases: 3, porFrase: 15 },
  { campo: 'ato_texto', rotulo: 'o bloco do Ato', teto: 145, frases: 7, porFrase: 18 },
  { campo: 'movimento_texto', rotulo: 'o bloco do Movimento', teto: 262, frases: 15, porFrase: 15 },
  { campo: 'arquetipo_texto', rotulo: 'o bloco do arquétipo', teto: 60, frases: 3, porFrase: 15 },
  /*
   * O fechamento guarda quatro frases mesmo no material fino. A Seção 6 dá
   * quatro batidas e manda uma frase por batida; encolher a contagem faria o
   * dossiê perder uma delas, e a última é o convite pro vídeo. No fino o que
   * encolhe é o tamanho da frase, não o número.
   */
  { campo: 'fechamento', rotulo: 'o fechamento', teto: 70, frases: 4, porFrase: 14, minFrases: 4 },
];

/**
 * Conta frases. Existe porque contar palavras não conserta nada.
 *
 * Medido nove rodadas seguidas: o modelo recebe "tira 16 palavras da
 * devolutiva", gasta os três retries e devolve o mesmo tamanho. A causa está
 * documentada no próprio contrato: ele declara 369 palavras num bloco de 496,
 * então a conta dele não bate e "tira 16" vira um alvo que ele acha que já
 * atingiu. Frase ele conta certo, porque é só achar o ponto final.
 *
 * Então o retry passou a falar em frases. "Apaga duas frases inteiras" é uma
 * ordem executável; "tira 16 palavras" é uma estimativa que ele erra.
 *
 * O `\d\.\d` sai antes da conta por causa de "R$ 1.200" e "Gênesis 32.5", que
 * não são fim de frase. Reticências viram um ponto só pelo mesmo motivo.
 */
function contarFrases(s: string): number {
  const limpo = s
    .replace(/(\d)[.,](\d)/g, '$1$2')
    .replace(/\.{2,}/g, '.')
    .trim();
  if (limpo.length === 0) return 0;
  const fim = limpo.match(/[.!?](?=\s|$)/g);
  const n = fim ? fim.length : 0;
  // Bloco que termina sem pontuação ainda tem a última frase.
  return /[.!?]$/.test(limpo) ? n : n + 1;
}

/**
 * O rótulo técnico do Passo 3.5 é uso interno e não entra no dossiê.
 *
 * Os regexes são estreitos de propósito. "Consequência" e "contraste" são
 * português corrente e aparecem em leitura honesta o tempo todo; o que o Passo
 * 3.5 proíbe é a palavra em posição de rótulo, nomeando a própria estrutura da
 * análise pro cara. "Progressão de Ato" não tem uso inocente e vai inteira.
 */
const ROTULO_DE_ARCO: { termo: string; re: RegExp }[] = [
  { termo: 'progressão de Ato', re: /\bprogress[ãa]o\s+de\s+ato\b/i },
  {
    termo: 'o rótulo da relação em posição de nome',
    re: /\b(?:isso|isto|aqui|o que (?:tu|voc[êe]) viv[eu])\s+(?:é|temos|tem)\s+(?:uma?\s+)?(?:repeti[çc][ãa]o|consequ[êe]ncia|contraste)\b/i,
  },
  { termo: 'a relação nomeada como classificação', re: /\b(?:classific|categoriz)a\w*\s+como\b/i },
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
  }

  /**
   * O mito tem que estar no Banco de Mitos. Prompt Mãe Passo 5, desde 19/09.
   *
   * Esta é a regra que fecha a porta que a régua de rastreabilidade só encostava.
   * Régua em prosa ("só narrativa com registro anterior a 1876") não impede o
   * modelo de citar Simba, que é o exemplo de erro do próprio Anexo 11.6. Lista
   * fechada impede.
   *
   * A busca é tolerante com a grafia e intolerante com a escolha: nome parecido
   * acha a linha, nome de fora não acha nada. `acharMito` explica o critério.
   */
  const linhas = analise.ecos.map((e) => acharMito(e.mito));

  analise.ecos.forEach((eco, i) => {
    const linha = linhas[i];

    if (linha === undefined) {
      dura(
        'eco_fora_do_banco',
        `"${eco.mito}" não está no Banco de Mitos, ou o nome veio diferente demais pra reconhecer. Copia o nome exato de uma linha do banco. Opções na linha do Movimento ${analise.movimento.numero}: ${nomesDoBanco(analise.movimento.numero).join(' · ')}. E lembra que a busca pode rodar no banco inteiro, não só nessa linha.`,
      );
      return;
    }

    if (eco.popularidade !== linha.popularidade) {
      suave(
        'eco_popularidade',
        `Tu declarou "${eco.mito}" como ${eco.popularidade} e no banco ele é ${linha.popularidade}. Copia a coluna, não estima.`,
      );
    }

    if (contarPalavras(eco.angulo) < 5) {
      suave(
        'eco_angulo',
        `O eco "${linha.mito}" veio sem o ângulo não-óbvio. É ele que o dossiê usa no lugar do resumo padrão do mito. No banco: "${linha.angulo}".`,
      );
    }

    if (contarPalavras(eco.ligacao) < 8) {
      suave(
        'eco_ligacao',
        `O eco "${linha.mito}" veio sem a ligação com a vida dele. Uma ou duas frases dizendo por que esse mito ecoa o caso dele, com um fato dele dentro.`,
      );
    }
  });

  /**
   * Pareamento por popularidade, obrigatório desde 19/09.
   *
   * Confere contra o banco, não contra o que o modelo declarou, porque o banco
   * é a fonte. Um Alto pra ele reconhecer de cara, um Médio ou Baixo pra dar
   * profundidade: dois Altos viram duas histórias de escola dominical, dois
   * Baixos travam o cara em dois nomes que ele nunca ouviu.
   */
  if (linhas.length === 2 && linhas[0] && linhas[1]) {
    const [a, b] = linhas;
    const altos = [a, b].filter((m) => m.popularidade === 'Alto').length;

    if (altos !== 1) {
      const opcoes = bancoDeMitos()
        .filter((m) => (altos === 2 ? m.popularidade !== 'Alto' : m.popularidade === 'Alto'))
        .filter((m) => m.movimento === analise.movimento.numero || m.movimento === null)
        .slice(0, 6)
        .map((m) => `${m.mito} [${m.popularidade}]`);

      dura(
        'ecos_popularidade',
        `Os dois ecos são ${altos === 2 ? 'de popularidade Alto' : `de popularidade ${a.popularidade} e ${b.popularidade}`}. O pareamento é obrigatório: um Alto e o outro Médio ou Baixo. Troca um dos dois por ${altos === 2 ? 'um Médio ou Baixo' : 'um Alto'}${opcoes.length > 0 ? `, por exemplo ${opcoes.join(' · ')}` : ''}. A busca roda no banco inteiro, não só na linha do Movimento.`,
      );
    }

    const fa = familiaDeTradicao(a.tradicao);
    const fb = familiaDeTradicao(b.tradicao);
    if (fa === fb) {
      dura(
        'ecos_tradicao',
        `"${a.mito}" e "${b.mito}" vêm da mesma tradição (${fa}). Elas têm que vir de tradições que não se conheceram, que é o que prova a tese do método. Parábola de Jesus conta como bíblica.`,
      );
    }
  }

  /**
   * O eco precisa contar o que acontece, não só nomear a história.
   *
   * Virou regra dura quando a leitura foi partida em duas: a chamada 2 não tem
   * outra fonte pra desenvolver o eco, e "Odisseu na jangada" em três palavras
   * força ela a inventar o resto, que é exatamente o que a régua de
   * rastreabilidade do Passo 5 proíbe. O piso subiu de 25 pra 30 em 19/09,
   * quando o eco do dossiê passou a ser de cinco a sete linhas.
   */
  for (const eco of analise.ecos) {
    if (contarPalavras(eco.historia) >= 30) continue;
    dura(
      'eco_raso',
      `O eco "${eco.mito}" está curto demais. Conta a história: quem é o personagem, em que situação ele estava, o que aconteceu com ele e o que ele sentiu. Três ou quatro frases. A chamada 2 desenvolve isto em cinco a sete linhas e não tem outra fonte, então o que faltar aqui ela inventa.`,
    );
  }

  /* --- leitura de arco (Passo 3.5) ----------------------------------- */

  const arco = analise.arco;

  if (arco.relacao !== 'ausente') {
    if (contarPalavras(arco.frase) < 12) {
      dura(
        'arco_raso',
        `A leitura de arco veio como "${arco.frase}", curta demais pra ser leitura. Escreve em uma frase concreta, ancorada nas cenas que ele deu, ligando o Movimento de sete anos atrás ao de agora.`,
      );
    }

    if (arco.movimento_sete_anos.trim().length === 0) {
      suave(
        'arco_sem_movimento',
        'A relação de arco foi nomeada mas o Movimento dos sete anos ficou vazio. Diz qual Movimento a Pergunta 1 rende.',
      );
    } else if (movimentoPorNome(arco.movimento_sete_anos) === undefined) {
      suave(
        'arco_movimento_invalido',
        `"${arco.movimento_sete_anos}" não é um dos 20 Movimentos. O Movimento dos sete anos sai do mesmo banco que o de agora.`,
      );
    }

    /*
     * Repetição e os outros três se definem pela mesma pergunta, então os dois
     * lados dela precisam bater. Mesmo Movimento nas duas janelas é repetição,
     * por definição do Passo 3.5, e Movimentos diferentes nunca são.
     */
    const antigo = movimentoPorNome(arco.movimento_sete_anos);
    const mesmoMovimento = antigo?.numero === analise.movimento.numero;

    if (arco.movimento_sete_anos.trim().length > 0 && antigo !== undefined) {
      if (arco.relacao === 'repetição' && !mesmoMovimento) {
        suave(
          'arco_repeticao',
          `A relação é repetição mas os Movimentos são diferentes (${arco.movimento_sete_anos} e ${analise.movimento.nome}). Repetição é o mesmo Movimento nas duas janelas. Se são diferentes, a relação é consequência, contraste ou progressão de Ato.`,
        );
      }
      if (arco.relacao !== 'repetição' && mesmoMovimento) {
        suave(
          'arco_repeticao',
          `A relação veio como ${arco.relacao} mas os dois Movimentos são o mesmo (${analise.movimento.nome}). Mesmo Movimento nas duas janelas é repetição, e é o achado mais forte do dossiê. Contraste, consequência e progressão de Ato são pra quando os Movimentos são diferentes.`,
        );
      }
    }
  }

  if (analise.movimento.recorrencia_detectada && arco.relacao !== 'repetição') {
    suave(
      'arco_x_recorrencia',
      `"recorrencia_detectada" é true mas a relação de arco veio como ${arco.relacao}. Recorrência do mesmo gesto nas duas janelas é a relação repetição.`,
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
  analise: Pick<Analise, 'material_fino' | 'movimento' | 'arco'>,
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

  /**
   * Quando o total estoura, nomeia o bloco e manda apagar frase inteira.
   *
   * A ordem das duas medidas não é estética. A frase vem primeiro porque é a
   * única que ele consegue executar: "apaga duas frases" é contável, "tira 16
   * palavras" é uma estimativa que ele erra pra menos e por isso não corta
   * nada. A palavra fica como contexto, pra ele saber o tamanho do buraco.
   *
   * Só roda quando o total já estourou, porque bloco grande com total dentro
   * da faixa é o "cerca de" da Seção 5 trabalhando, e reprovar isso seria
   * briga com o próprio documento.
   */
  if (n > max) {
    const sobra = n - max;

    /*
     * No material fino o dossiê inteiro cabe em 320, então a tabela de tetos,
     * que foi feita pros 550, não vale. Ela encolhe na mesma proporção.
     *
     * Sem isto o retry dava conselho errado e caro: mandava não tirar uma
     * palavra do Ato e do Movimento num dossiê de 444 palavras que precisava
     * chegar a 320. Não tem como cortar 124 palavras só dos três blocos
     * curtos, que juntos têm menos que isso. Medido na fixture `fino`.
     */
    const escala = max / 550;
    const fino = escala < 0.95;

    for (const { campo, rotulo, teto, frases, porFrase, fixo, minFrases } of TETOS) {
      const encolhe = fino && fixo !== true;
      const tetoAqui = encolhe ? Math.round(teto * escala) : teto;
      const frasesAqui = encolhe
        ? Math.max(minFrases ?? 1, Math.round(frases * escala))
        : frases;
      /*
       * O alvo por frase nunca pode pedir mais do que o teto do bloco dividido
       * pelas frases dele, senão a mensagem manda escrever algo que ela mesma
       * reprova. Foi o que aconteceu com o título no material fino.
       */
      const alvoPorFrase = Math.max(
        8,
        Math.min(porFrase, Math.floor(tetoAqui / Math.max(frasesAqui, 1))),
      );

      const nb = contarPalavras(dossie[campo]);
      const nf = contarFrases(dossie[campo]);
      const passouPalavra = nb > tetoAqui;
      const passouFrase = nf > frasesAqui;
      if (!passouPalavra && !passouFrase) continue;

      const media = Math.round(nb / Math.max(nf, 1));

      const ordem = passouFrase
        ? `Tem ${nf} frases e o teto é ${frasesAqui}: apaga ${nf - frasesAqui} frase${nf - frasesAqui > 1 ? 's' : ''} inteira${nf - frasesAqui > 1 ? 's' : ''}, as que menos carregam fato dele.`
        : `Tem ${nf} frases de ${media} palavras em média, e o teto de frases tu respeitou. O que estourou foi o comprimento delas. O formato que cabe aqui é ${frasesAqui} frases de ${alvoPorFrase} palavras. Passa frase por frase: a que tiver mais de ${alvoPorFrase + 4} palavras tem duas orações coladas por vírgula, e uma é enfeite. Corta a de enfeite.`;

      dura(
        'teto_bloco',
        `Dentro dele, ${rotulo} está com ${nb} palavras contra um teto de ${tetoAqui}${fino ? ' (material fino)' : ''}. ${ordem}`,
      );
    }

    dura(
      'tamanho_onde_cortar',
      fino
        ? `Sobram ${sobra} palavras pra tirar. Material fino é um dossiê menor por inteiro, não um dossiê cheio com os blocos curtos amputados: todos encolhem na mesma proporção, inclusive o Ato, o Movimento e os ecos. A Seção 8 manda entregar Ato e arquétipo nomeados, o Movimento como aposta declarada e os dois ecos contados, tudo em 250 a 320 palavras. O que ela proíbe é encher com poesia genérica pra fechar a conta.`
        : `Sobram ${sobra} palavras pra tirar do dossiê inteiro. Tira todas da devolutiva, do bloco do arquétipo e do fechamento, nessa ordem de preferência. O Ato, o Movimento e os dois ecos não perdem uma palavra: a Seção 5 é explícita nisso e foi essa a falha do Teste 1.`,
    );
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

  /* --- leitura de arco no bloco do Movimento (Passo 3.5) ------------- */

  for (const { termo, re } of ROTULO_DE_ARCO) {
    if (!re.test(limpo)) continue;
    dura(
      'arco_rotulo',
      `"${termo}" é vocabulário interno da análise e não aparece no dossiê. Escreve a leitura: o que ele fez em tal ano, o que ele faz agora, e o fio entre os dois.`,
    );
  }

  /**
   * O arco tem que estar no bloco do Movimento, ancorado numa cena dele.
   *
   * O checklist item 6b pede a leitura de arco "presente e ancorada em cena
   * concreta". Provar presença de uma leitura em prosa é difícil; provar a
   * âncora é fácil e é a mesma coisa na prática, porque um arco ancorado
   * necessariamente cita a janela dos sete anos, e a janela dos sete anos é a
   * Pergunta 1. Então: uma marca de tempo da P1 dentro de "movimento_texto".
   *
   * Só roda quando a P1 tem marca de tempo. Sem data na resposta dele não há o
   * que conferir, e inventar exigência em cima de material que não existe é
   * fabricar retry.
   */
  if (analise.arco.relacao !== 'ausente') {
    const marcasP1 = marcasDeTempo(respostas.p1);
    const bloco = normalizar(dossie.movimento_texto);
    const ancorado = marcasP1.some((m) => bloco.includes(normalizar(m)));

    if (marcasP1.length > 0 && !ancorado) {
      dura(
        'arco_sem_ancora',
        `O bloco do Movimento não cita nenhuma cena dos sete anos, e a leitura de arco é obrigatória lá. A análise ligou o passado ao agora assim: "${analise.arco.frase}". Escreve isso com os fatos dele, nomeando a altura antiga (${marcasP1.slice(0, 3).join(', ')}) e a de agora.`,
      );
    }
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
