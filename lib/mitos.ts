import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O Banco de Mitos Compacto, lido de `docs/banco-de-mitos.md`.
 *
 * Entrou em 19/09 e é a mudança de arquitetura da versão: antes o modelo
 * escolhia o mito de memória, com a régua de rastreabilidade do Passo 5 como
 * única guarda. Régua em prosa não impede citação errada, e a IA citando
 * "Simba" é literalmente o erro que o Anexo 11.6 usa como exemplo do que nunca
 * fazer. Agora a lista é fechada e o validador confere contra ela.
 *
 * O documento é markdown e não JSON porque quem edita é o Adriano, e porque o
 * texto inteiro vai pro system prompt do jeito que está. Duas cópias da mesma
 * lista, uma pro prompt e outra pro código, iam divergir na primeira edição.
 * Então é uma só, e este arquivo parseia as tabelas dela.
 */

export type Popularidade = 'Alto' | 'Médio' | 'Baixo';

export type MitoDoBanco = {
  /** O nome como está escrito no banco, com parênteses e tudo. */
  mito: string;
  tradicao: string;
  popularidade: Popularidade;
  angulo: string;
  /** O Movimento da linha, ou null quando vem do banco de reserva. */
  movimento: number | null;
};

const CAMINHO = join(process.cwd(), 'docs', 'banco-de-mitos.md');

/* ------------------------------------------------------------------ */
/* Leitura e parse                                                     */
/* ------------------------------------------------------------------ */

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function popularidadeDe(bruto: string): Popularidade | null {
  const k = normalizar(bruto);
  if (k.startsWith('alto') || k.startsWith('alta')) return 'Alto';
  if (k.startsWith('medio') || k.startsWith('media')) return 'Médio';
  if (k.startsWith('baixo') || k.startsWith('baixa')) return 'Baixo';
  return null;
}

/**
 * Parser de tabela de pipe, o suficiente pro formato do documento.
 *
 * Não trata pipe escapado dentro de célula, e não precisa: o banco não tem
 * nenhum, e se um dia tiver, a linha some do banco e o validador reclama do
 * mito ausente, que é falha barulhenta. Falha silenciosa aqui seria aceitar
 * mito fora da lista, que é justamente o que este arquivo existe pra impedir.
 */
function linhasDaTabela(bloco: string): string[][] {
  return bloco
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'))
    .map((l) =>
      l
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((cs) => cs.length >= 4)
    .filter((cs) => !/^-{2,}$/.test(cs[0]))
    .filter((cs) => popularidadeDe(cs[2]) !== null);
}

function parsear(texto: string): MitoDoBanco[] {
  const fora: MitoDoBanco[] = [];

  /*
   * Quebra por cabeçalho de nível 2. O `## N · Nome` dá o Movimento, e o
   * `## Banco de reserva` dá as histórias sem Movimento fixo. Qualquer outro
   * cabeçalho (a intro, o "Como ler", as pendências) não tem tabela de mito e
   * cai fora sozinho, porque `linhasDaTabela` exige a coluna de popularidade.
   */
  const secoes = texto.split(/^## /m).slice(1);

  for (const secao of secoes) {
    const fim = secao.indexOf('\n');
    const titulo = fim === -1 ? secao : secao.slice(0, fim);
    const corpo = fim === -1 ? '' : secao.slice(fim);

    const m = /^(\d+)\s*[·.\-]/.exec(titulo.trim());
    const movimento = m ? Number(m[1]) : null;

    for (const [mito, tradicao, pop, angulo] of linhasDaTabela(corpo)) {
      const popularidade = popularidadeDe(pop);
      if (popularidade === null) continue;
      fora.push({ mito, tradicao, popularidade, angulo: angulo ?? '', movimento });
    }
  }

  return fora;
}

let cache: MitoDoBanco[] | null = null;
let cacheTexto: string | null = null;

/** O documento cru, pro system prompt. */
export function textoDoBanco(): string {
  if (cacheTexto === null) {
    cacheTexto = readFileSync(CAMINHO, 'utf8');
    if (cacheTexto.trim().length < 2000) {
      throw new Error(
        'docs/banco-de-mitos.md veio vazio ou truncado. Sem o banco o engine escolhe mito de memória, que é o que a versão de 19/09 fechou.',
      );
    }
  }
  return cacheTexto;
}

export function bancoDeMitos(): MitoDoBanco[] {
  if (cache === null) {
    cache = parsear(textoDoBanco());
    if (cache.length < 40) {
      throw new Error(
        `O parse de docs/banco-de-mitos.md achou só ${cache.length} mitos. A tabela mudou de formato ou o arquivo está truncado.`,
      );
    }
  }
  return cache;
}

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

/** Tira o parêntese final, que é a referência e não o nome. */
function semReferencia(nome: string): string {
  return normalizar(nome.replace(/\([^)]*\)\s*$/, ''));
}

const VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na',
  'nos', 'nas', 'por', 'pra', 'para', 'com', 'que', 'um', 'uma', 'ao', 'aos',
  'se', 'sem', 'sob', 'the', 'of',
]);

function significativas(nome: string): Set<string> {
  return new Set(
    normalizar(nome)
      .split(' ')
      .filter((t) => t.length >= 3 && !VAZIAS.has(t)),
  );
}

/**
 * Acha a linha do banco que o modelo quis citar.
 *
 * Tolerante de propósito. O contrato manda copiar o nome exato, e mesmo assim
 * o modelo escreve "Jacó no Jaboque" onde o banco tem "Jacó lutando com o
 * homem/anjo no Jaboque (Gênesis 32)". Reprovar isso gastaria um retry pra
 * consertar grafia, não leitura.
 *
 * O que ela não faz é adivinhar: sem sobreposição forte devolve `undefined`, e
 * aí o validador manda de volta com a lista. Aceitar um mito que não está no
 * banco é pior que um retry, porque é exatamente a porta que a versão de 19/09
 * fechou.
 */
export function acharMito(nome: string): MitoDoBanco | undefined {
  const banco = bancoDeMitos();
  const alvo = normalizar(nome);
  if (alvo.length === 0) return undefined;

  const exato = banco.find((m) => normalizar(m.mito) === alvo);
  if (exato) return exato;

  const alvoSemRef = semReferencia(nome);
  const semRef = banco.find((m) => semReferencia(m.mito) === alvoSemRef);
  if (semRef) return semRef;

  const contido = banco.filter((m) => {
    const b = semReferencia(m.mito);
    if (b.length < 6 || alvoSemRef.length < 6) return false;
    return b.includes(alvoSemRef) || alvoSemRef.includes(b);
  });
  if (contido.length === 1) return contido[0];

  /*
   * Último recurso: sobreposição de palavras significativas. Exige metade das
   * palavras do nome mais curto e um vencedor único, senão devolve nada. Sem o
   * empate desfeito, "José vendido pelos irmãos" e "Os irmãos de José mentindo
   * pro pai" se confundem, e são linhas diferentes com ângulos diferentes.
   */
  const tokensAlvo = significativas(nome);
  if (tokensAlvo.size === 0) return undefined;

  let melhor: MitoDoBanco | undefined;
  let melhorNota = 0;
  let empatado = false;

  for (const m of banco) {
    const tokens = significativas(m.mito);
    let comuns = 0;
    for (const t of tokensAlvo) if (tokens.has(t)) comuns += 1;
    const nota = comuns / Math.min(tokensAlvo.size, tokens.size);
    if (comuns < 2 || nota < 0.5) continue;
    if (nota > melhorNota) {
      melhor = m;
      melhorNota = nota;
      empatado = false;
    } else if (nota === melhorNota) {
      empatado = true;
    }
  }

  return empatado ? undefined : melhor;
}

/* ------------------------------------------------------------------ */
/* Tradição                                                            */
/* ------------------------------------------------------------------ */

/**
 * Família de tradição, pra regra das "tradições que não se conheceram".
 *
 * Comparar a string crua do banco não serve: "Bíblico", "Bíblico/Novo
 * Testamento" e "Parábola de Jesus" são três rótulos e uma tradição só, e o
 * par formado por dois deles não prova nada, que é o ponto da regra no Passo 5.
 *
 * Fábula de Esopo fica separada de Grego de propósito. Esopo é grego de origem,
 * mas o corpus circula como tradição própria há dois milênios, e o próprio
 * banco trata os dois como linhas distintas.
 */
export function familiaDeTradicao(tradicao: string): string {
  const k = normalizar(tradicao);
  if (k.includes('parabola') || k.includes('biblic')) return 'bíblica';
  if (k.startsWith('fabula')) return 'fábula';
  if (k.startsWith('conto')) return 'conto de fada';
  if (k.includes('grego') || k.includes('grega')) return 'grega';
  if (k.includes('japon')) return 'japonesa';
  if (k.includes('chin')) return 'chinesa';
  if (k.includes('eslavo') || k.includes('russo')) return 'eslava';
  if (k.includes('indigena')) return 'indígena';
  if (k.includes('africa') || k.includes('caribe')) return 'africana';
  if (k.includes('ingles')) return 'inglesa';
  if (k.includes('mesopotam')) return 'mesopotâmica';
  if (k.includes('vedic') || k.includes('indiano')) return 'védica';
  if (k.includes('nordic')) return 'nórdica';
  if (k.includes('egipc')) return 'egípcia';
  return k || 'desconhecida';
}

/** Os nomes exatos do banco, pra mensagem de erro do validador. */
export function nomesDoBanco(movimento?: number): string[] {
  const banco = bancoDeMitos();
  const linha = movimento === undefined ? [] : banco.filter((m) => m.movimento === movimento);
  return (linha.length > 0 ? linha : banco).map((m) => m.mito);
}
