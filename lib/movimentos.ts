/**
 * Banco dos 20 Movimentos. Prompt Mãe Seção 3, Passo 3.
 *
 * A tabela do Prompt Mãe agrupa por centro de gravidade, não por regra: qualquer
 * Movimento pode aparecer em qualquer Ato. O campo `ato` aqui é só o centro de
 * gravidade, serve pra conferência e nunca pra decidir a leitura.
 *
 * O kit de arte chegou em 21/09, parcial: nove dos vinte Movimentos têm card
 * ilustrado. `frase_card` é a frase que está **escrita dentro da arte**, copiada
 * dela, e por isso ela existe nos nove e é null no resto. Ela nunca é escrita
 * pelo modelo: o componente desenha a partir daqui, o que garante que o texto na
 * tela e o texto na imagem sejam o mesmo.
 *
 * Pra ligar um Movimento novo quando a arte chegar: põe o arquivo em
 * `public/cards/` com o nome que `arquivoDoCard` devolve, cola a frase da arte
 * em `frase_card` e vira `tem_card` pra true. O teste `cards` do e2e reprova se
 * as três coisas saírem de sincronia.
 */

export type Ato = "Partida" | "Iniciação" | "Retorno";

export type Movimento = {
  numero: number;
  nome: string;
  slug: string;
  ato: Ato;
  /** A frase escrita dentro da arte, copiada dela. Null sem arte. */
  frase_card: string | null;
  /** True só quando o arquivo de `arquivoDoCard` existir de verdade. */
  tem_card: boolean;
};

export const MOVIMENTOS: readonly Movimento[] = [
  {
    numero: 1,
    nome: "Chamado",
    slug: "chamado",
    ato: "Partida",
    frase_card:
      "O chamado não te entrega um destino novo. Ele te avisa que o teu lugar já não te serve.",
    tem_card: true,
  },
  {
    numero: 2,
    nome: "Recusa",
    slug: "recusa",
    ato: "Partida",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 3,
    nome: "Rebelião",
    slug: "rebeliao",
    ato: "Partida",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 4,
    nome: "Súplica",
    slug: "suplica",
    ato: "Partida",
    frase_card:
      "Baixar a cabeça não é entregar o comando. É parar de fingir que ele era teu.",
    tem_card: true,
  },
  {
    numero: 5,
    nome: "Rapto",
    slug: "rapto",
    ato: "Partida",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 6,
    nome: "Ambição",
    slug: "ambicao",
    ato: "Partida",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 7,
    nome: "Descida",
    slug: "descida",
    ato: "Iniciação",
    frase_card: "Há coisas que só se acham indo aonde ninguém quer ir",
    tem_card: true,
  },
  {
    numero: 8,
    nome: "Naufrágio",
    slug: "naufragio",
    ato: "Iniciação",
    frase_card:
      "Basta um instante e nada do que te sustentava te sustenta mais.",
    tem_card: true,
  },
  {
    numero: 9,
    nome: "Prova",
    slug: "prova",
    ato: "Iniciação",
    frase_card: "O teste não diz se tu venceu. Diz do que tu é feito.",
    tem_card: true,
  },
  {
    numero: 10,
    nome: "Tentação",
    slug: "tentacao",
    ato: "Iniciação",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 11,
    nome: "Cegueira",
    slug: "cegueira",
    ato: "Iniciação",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 12,
    nome: "Perda",
    slug: "perda",
    ato: "Iniciação",
    frase_card:
      "Há perdas que deixam uma dor sem medida, um vazio sem esperança e forçam tudo o que resta a se rearranjar.",
    tem_card: true,
  },
  {
    numero: 13,
    nome: "Traição",
    slug: "traicao",
    ato: "Iniciação",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 14,
    nome: "Confronto Maior",
    slug: "confronto-maior",
    ato: "Iniciação",
    frase_card: null,
    tem_card: false,
  },
  {
    numero: 15,
    nome: "Encontro com a Deusa",
    slug: "encontro-com-a-deusa",
    ato: "Iniciação",
    frase_card:
      "Não se pega à força, e nem por isso é de graça. Tem que aguentar o que ela revela.",
    tem_card: true,
  },
  {
    numero: 16,
    nome: "Sacrifício",
    slug: "sacrificio",
    ato: "Iniciação",
    frase_card:
      "Sacrificar é reconhecer o que vale mais, pagar o preço inteiro e não exigir que o mundo devolva.",
    tem_card: true,
  },
  {
    numero: 17,
    nome: "Perseguição",
    slug: "perseguicao",
    ato: "Retorno",
    frase_card: "Nada te faz correr assim, a não ser o que tu não pode perder.",
    tem_card: true,
  },
  {
    numero: 18,
    nome: "Resgate",
    slug: "resgate",
    ato: "Retorno",
    frase_card: "O aprisionamento que só pode ser liberado com ajuda de fora.",
    tem_card: true,
  },
  {
    numero: 19,
    nome: "Acerto de Contas",
    slug: "acerto-de-contas",
    ato: "Retorno",
    frase_card:
      "O acerto devolve a cada um o que é seu e tira do passado o poder de continuar cobrando.",
    tem_card: true,
  },
  {
    numero: 20,
    nome: "Casamento",
    slug: "casamento",
    ato: "Retorno",
    frase_card:
      "A morte do ‘eu’ para o nascimento do ‘nós’, a integração completa do masculino e feminino",
    tem_card: true,
  },
] as const;

export const ATOS: readonly Ato[] = [
  "Partida",
  "Iniciação",
  "Retorno",
] as const;

const porNumero = new Map(MOVIMENTOS.map((m) => [m.numero, m]));

/** Normaliza acento e caixa pra comparar nome vindo do modelo com o banco. */
function chave(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const porNome = new Map(MOVIMENTOS.map((m) => [chave(m.nome), m]));

/**
 * O nome do arquivo da arte, na convenção do documento de assets de 21/09:
 * `mov_NN_slug`, com o número em duas casas e o slug com underscore.
 *
 * Derivado em vez de guardado à mão porque o par número/slug já existe na
 * tabela, e duas fontes pro mesmo nome divergem na primeira arte nova.
 */
export function arquivoDoCard(m: Movimento): string {
  const nn = String(m.numero).padStart(2, "0");
  return `mov_${nn}_${m.slug.replace(/-/g, "_")}.webp`;
}

export function caminhoDoCard(m: Movimento): string {
  return `/cards/${arquivoDoCard(m)}`;
}

export function movimentoPorNumero(numero: number): Movimento | undefined {
  return porNumero.get(numero);
}

export function movimentoPorNome(nome: string): Movimento | undefined {
  return porNome.get(chave(nome));
}

/**
 * Confere se o par numero/nome que o modelo devolveu existe e bate.
 * Regra dura do validador (planejamento Seção 3.2).
 */
export function paresBatem(numero: number, nome: string): boolean {
  const m = porNumero.get(numero);
  return m !== undefined && chave(m.nome) === chave(nome);
}

export function normalizarAto(valor: string): Ato | undefined {
  const k = chave(valor);
  if (k === "partida") return "Partida";
  if (k === "iniciacao") return "Iniciação";
  if (k === "retorno") return "Retorno";
  return undefined;
}
