/**
 * Banco dos 20 Movimentos. Prompt Mãe Seção 3, Passo 3.
 *
 * A tabela do Prompt Mãe agrupa por centro de gravidade, não por regra: qualquer
 * Movimento pode aparecer em qualquer Ato. O campo `ato` aqui é só o centro de
 * gravidade, serve pra conferência e nunca pra decidir a leitura.
 *
 * `frase_card` e `tem_card` ficam nulos e falsos até a arte oficial chegar
 * (pendência 8 do Prompt Mãe). Enquanto não chegar, o infográfico mostra só o
 * nome do Movimento em tipografia, que é o que o Prompt Mãe manda fazer:
 * "nunca gerar arte nova de card dentro do quiz".
 */

export type Ato = 'Partida' | 'Iniciação' | 'Retorno';

export type Movimento = {
  numero: number;
  nome: string;
  slug: string;
  ato: Ato;
  /** Frase da arte oficial. Null enquanto o card não existir. */
  frase_card: string | null;
  /** True só quando `public/cards/{slug}.webp` existir de verdade. */
  tem_card: boolean;
};

export const MOVIMENTOS: readonly Movimento[] = [
  { numero: 1, nome: 'Chamado', slug: 'chamado', ato: 'Partida', frase_card: null, tem_card: false },
  { numero: 2, nome: 'Recusa', slug: 'recusa', ato: 'Partida', frase_card: null, tem_card: false },
  { numero: 3, nome: 'Rebelião', slug: 'rebeliao', ato: 'Partida', frase_card: null, tem_card: false },
  { numero: 4, nome: 'Súplica', slug: 'suplica', ato: 'Partida', frase_card: null, tem_card: false },
  { numero: 5, nome: 'Rapto', slug: 'rapto', ato: 'Partida', frase_card: null, tem_card: false },
  { numero: 6, nome: 'Ambição', slug: 'ambicao', ato: 'Partida', frase_card: null, tem_card: false },
  { numero: 7, nome: 'Descida', slug: 'descida', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 8, nome: 'Naufrágio', slug: 'naufragio', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 9, nome: 'Prova', slug: 'prova', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 10, nome: 'Tentação', slug: 'tentacao', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 11, nome: 'Cegueira', slug: 'cegueira', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 12, nome: 'Perda', slug: 'perda', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 13, nome: 'Traição', slug: 'traicao', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 14, nome: 'Confronto Maior', slug: 'confronto-maior', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 15, nome: 'Encontro com a Deusa', slug: 'encontro-com-a-deusa', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 16, nome: 'Sacrifício', slug: 'sacrificio', ato: 'Iniciação', frase_card: null, tem_card: false },
  { numero: 17, nome: 'Perseguição', slug: 'perseguicao', ato: 'Retorno', frase_card: null, tem_card: false },
  { numero: 18, nome: 'Resgate', slug: 'resgate', ato: 'Retorno', frase_card: null, tem_card: false },
  { numero: 19, nome: 'Acerto de Contas', slug: 'acerto-de-contas', ato: 'Retorno', frase_card: null, tem_card: false },
  { numero: 20, nome: 'Casamento', slug: 'casamento', ato: 'Retorno', frase_card: null, tem_card: false },
] as const;

export const ATOS: readonly Ato[] = ['Partida', 'Iniciação', 'Retorno'] as const;

const porNumero = new Map(MOVIMENTOS.map((m) => [m.numero, m]));

/** Normaliza acento e caixa pra comparar nome vindo do modelo com o banco. */
function chave(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const porNome = new Map(MOVIMENTOS.map((m) => [chave(m.nome), m]));

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
  if (k === 'partida') return 'Partida';
  if (k === 'iniciacao') return 'Iniciação';
  if (k === 'retorno') return 'Retorno';
  return undefined;
}
