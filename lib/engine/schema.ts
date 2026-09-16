import { z } from 'zod';

/**
 * Schema do output do engine. Planejamento Seção 3.1.
 *
 * Os enums normalizam acento e caixa antes de validar, porque o modelo escreve
 * "Iniciacao" ou "comeco" de vez em quando e isso não é erro de leitura, é erro
 * de teclado. Rejeitar por acento gera retry caro e inútil.
 */

function chave(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function enumTolerante<T extends string>(
  valores: readonly T[],
  aliases: Record<string, T> = {},
) {
  return z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    const k = chave(v);
    if (k in aliases) return aliases[k];
    return valores.find((x) => chave(x) === k) ?? v;
  }, z.enum(valores as unknown as [T, ...T[]]));
}

const nota = z.coerce.number().int().min(0).max(3);

export const TriagemItem = z.object({
  pergunta: z.coerce.number().int().min(1).max(4),
  densidade: nota,
  recorrencia: nota,
  carga: nota,
  agencia: nota,
  temporalidade: nota,
  nome: nota,
  veredito: z.string().default(''),
});

export const Ato = enumTolerante(['Partida', 'Iniciação', 'Retorno'] as const);

export const Posicao = enumTolerante(['começo', 'meio', 'fim'] as const, {
  inicio: 'começo',
  comeco: 'começo',
  final: 'fim',
});

export const NomeArquetipo = enumTolerante([
  'Rei',
  'Guerreiro',
  'Mago',
  'Amante',
] as const);

export const Direcao = enumTolerante(['↑', '↓', 'maduro'] as const, {
  alto: '↑',
  excesso: '↑',
  cima: '↑',
  up: '↑',
  baixo: '↓',
  carencia: '↓',
  down: '↓',
  'em funcao': 'maduro',
  funcao: 'maduro',
  pleno: 'maduro',
});

export const Tradicao = enumTolerante([
  'bíblica',
  'grega',
  'nórdica',
  'egípcia',
  'védica',
  'mesopotâmica',
  'conto popular',
  'matéria da Bretanha',
] as const);

export const Eco = z.object({
  historia: z.string().min(1),
  fonte: z.string().min(1),
  tradicao: Tradicao,
});

export const Arquetipo = z.object({
  nome: NomeArquetipo,
  direcao: Direcao,
  estado: z.string().default(''),
  fala_dele: z.string().default(''),
});

export const Dossie = z.object({
  titulo: z.string().min(1),
  devolutiva: z.string().min(1),
  ato_subtitulo: z.string().default(''),
  ato_texto: z.string().min(1),
  movimento_subtitulo: z.string().default(''),
  movimento_texto: z.string().min(1),
  arquetipo_subtitulo: z.string().default(''),
  arquetipo_texto: z.string().min(1),
  fechamento: z.string().min(1),
});

export const Sinalizacao = z.object({
  risco: z.coerce.boolean().default(false),
  risco_motivo: z.string().default(''),
  piada: z.coerce.boolean().default(false),
});

/**
 * A saída da chamada 1: tudo que é decisão, mais o spoiler, e nenhum dossiê.
 *
 * O corte entre este schema e o de baixo é o corte entre as duas chamadas. A
 * chamada 1 decide (Ato, Movimento, arquétipos, ecos, prática) e escreve o
 * spoiler. A chamada 2 recebe isto fechado e só redige.
 *
 * A regra de honestidade do Prompt Mãe Seção 4.1, "o spoiler só pode afirmar o
 * que o dossiê confirma", continua valendo por construção: antes valia porque
 * os dois saíam da mesma passada, agora vale porque os dois saem da mesma
 * análise, e a chamada 2 não tem permissão de reabrir nenhuma decisão.
 */
export const AnaliseSchema = z.object({
  triagem: z.array(TriagemItem).min(1).max(4),
  inventario: z.object({
    fatos: z.array(z.string()).default([]),
    expressoes_literais: z.array(z.string()).default([]),
  }),
  material_fino: z.coerce.boolean().default(false),
  ato: z.object({
    nome: Ato,
    posicao: Posicao,
    fato_sustenta: z.string().default(''),
  }),
  movimento: z.object({
    numero: z.coerce.number().int().min(1).max(20),
    nome: z.string().min(1),
    aposta: z.coerce.boolean().default(false),
    recorrencia_detectada: z.coerce.boolean().default(false),
    descartados: z.array(z.string()).default([]),
  }),
  arquetipos: z.array(Arquetipo).min(1).max(2),
  fortalecer_primeiro: NomeArquetipo,
  ecos: z.array(Eco).length(2),
  pratica: z.string().default(''),
  dor_literal: z.string().default(''),
  spoiler: z.string().min(1),
  gancho_usado: enumTolerante(['eco', 'arquetipo'] as const, {
    arquétipo: 'arquetipo',
  }),
  sinalizacao: Sinalizacao,
  contagem_spoiler: z.coerce.number().int().min(0).default(0),
});

/**
 * A saída da chamada 2. Só o texto, mais a contagem declarada.
 *
 * A contagem não é fonte de verdade, quem conta de verdade é o validador. Ela
 * existe porque obrigar o modelo a escrever o número o obriga a contar.
 */
export const SaidaDossieSchema = z.object({
  dossie: Dossie,
  contagem: z.coerce.number().int().min(0).default(0),
});

/**
 * A leitura inteira, análise mais dossiê. É o que o banco guarda montado e o
 * que `montarDossie` e o validador completo recebem.
 */
export const LeituraSchema = AnaliseSchema.extend({
  dossie: Dossie,
  contagem: z
    .object({
      dossie: z.coerce.number().int().min(0).default(0),
      spoiler: z.coerce.number().int().min(0).default(0),
    })
    .optional(),
});

export type Analise = z.infer<typeof AnaliseSchema>;
export type SaidaDossie = z.infer<typeof SaidaDossieSchema>;
export type Leitura = z.infer<typeof LeituraSchema>;
export type DossieLeitura = z.infer<typeof Dossie>;

/**
 * Schema frouxo pro caso de risco e de piada. Quando `sinalizacao.risco` ou
 * `sinalizacao.piada` são true, o Prompt Mãe manda parar o fluxo, então exigir
 * dossiê completo é exigir trabalho que vai ser jogado fora.
 */
export const LeituraMinimaSchema = z.object({
  spoiler: z.string().default(''),
  sinalizacao: Sinalizacao,
});

export type LeituraMinima = z.infer<typeof LeituraMinimaSchema>;
