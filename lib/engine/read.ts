import Anthropic from '@anthropic-ai/sdk';

import { env } from '../env';
import { instrucaoCorrecao, montarRespostas } from './contract';
import { LeituraMinimaSchema, LeituraSchema, type Leitura } from './schema';
import {
  PERGUNTA_CHECAGEM_CENA,
  SYSTEM_CHECAGEM_CENA,
  systemPrompt,
} from './system-prompt';
import { mensagensDeErro, validar, type Respostas, type Resultado } from './validate';

/**
 * Orquestra a chamada, a validação e o retry. Planejamento Seção 3.
 *
 * Uma chamada só gera análise, spoiler e dossiê juntos. Isso não é economia, é a
 * regra de honestidade do Prompt Mãe Seção 4.1: o spoiler só pode afirmar o que
 * o dossiê confirma. Gerando os dois na mesma passada, isso vale por construção.
 */

/**
 * O planejamento fixa 6000. Subi pra 8000 porque corte por limite de token vira
 * JSON truncado, que falha no parse e queima um retry inteiro sem sinal claro.
 * A diferença só é cobrada se for usada.
 */
const MAX_TOKENS = 8000;
const TEMPERATURA = 0.7;
const MAX_TENTATIVAS = 3; // 1 mais 2 retries

/**
 * Orçamento de tempo do conjunto de tentativas.
 *
 * A função tem `maxDuration = 60` no plano Hobby da Vercel. Três chamadas de 20
 * segundos estouram isso, e o pior jeito de estourar é no último retry: a
 * leitura estava pronta e válida o bastante desde a primeira passada, e o
 * usuário recebe erro. Antes de cada retry a gente checa se dá tempo, e se não
 * der, entrega o que tem e loga. Dossiê com um deslize de estilo é melhor que
 * tela de erro.
 *
 * Em plano Pro, subir `maxDuration` e esta env juntos.
 */
const ORCAMENTO_MS = Number(process.env.ENGINE_BUDGET_MS ?? 48_000);

export type ResultadoLeitura = {
  leitura: Leitura;
  model: string;
  latency_ms: number;
  tentativas: number;
  validacao: {
    ok: boolean;
    duras: string[];
    suaves: string[];
    /** True quando esgotou os retries e a gente entregou assim mesmo. */
    entregue_com_falha: boolean;
  };
};

export class DesvioError extends Error {
  constructor(
    readonly tipo: 'risco' | 'piada',
    readonly texto: string,
  ) {
    super(`desvio:${tipo}`);
    this.name = 'DesvioError';
  }
}

let cliente: Anthropic | null = null;

function anthropic(): Anthropic {
  if (cliente === null) cliente = new Anthropic({ apiKey: env.anthropicKey });
  return cliente;
}

/* ------------------------------------------------------------------ */
/* Parse                                                               */
/* ------------------------------------------------------------------ */

/**
 * Extrai o primeiro objeto JSON balanceado do texto. O modelo às vezes embrulha
 * em cerca de markdown ou escreve uma linha antes, mesmo com o contrato pedindo
 * pra não fazer isso. Regex de cerca não cobre todos os casos, contagem de
 * chaves com consciência de string cobre.
 */
export function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf('{');
  if (inicio === -1) throw new Error('A resposta do modelo não trouxe JSON.');

  let profundidade = 0;
  let dentroDeString = false;
  let escapado = false;

  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];

    if (escapado) {
      escapado = false;
      continue;
    }
    if (c === '\\') {
      escapado = true;
      continue;
    }
    if (c === '"') {
      dentroDeString = !dentroDeString;
      continue;
    }
    if (dentroDeString) continue;

    if (c === '{') profundidade++;
    else if (c === '}') {
      profundidade--;
      if (profundidade === 0) {
        return JSON.parse(texto.slice(inicio, i + 1));
      }
    }
  }

  throw new Error('O JSON da resposta veio truncado.');
}

function textoDaResposta(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

function tentarExtrair(bruto: string): unknown {
  try {
    return extrairJson(bruto);
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

function instrucaoGancho(): string {
  const g = env.spoilerGancho;
  if (g === 'auto') return '';
  return `\n\nNesta leitura, o gancho do spoiler é ${
    g === 'eco' ? 'o eco' : 'o arquétipo'
  }. Marca "gancho_usado" como "${g}".`;
}

export async function gerarLeitura(respostas: Respostas): Promise<ResultadoLeitura> {
  const comeco = Date.now();
  const model = env.anthropicModel;
  const system = systemPrompt();

  const mensagens: Anthropic.MessageParam[] = [
    { role: 'user', content: montarRespostas(respostas) + instrucaoGancho() },
  ];

  let ultima: Leitura | null = null;
  let ultimoResultado: Resultado | null = null;
  let tentativas = 0;
  let duracaoMedia = 0;

  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const decorrido = Date.now() - comeco;

    // Da segunda tentativa em diante, só segue se couber no orçamento. A
    // estimativa é a média das chamadas anteriores, com 20% de folga.
    if (i > 0 && decorrido + duracaoMedia * 1.2 > ORCAMENTO_MS) {
      console.warn('[engine] orçamento de tempo esgotado, entregando o que tem', {
        decorrido,
        tentativas: i,
      });
      break;
    }

    tentativas = i + 1;
    const antes = Date.now();

    const msg = await anthropic().messages.create({
      model,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURA,
      system,
      messages: mensagens,
    });

    const duracao = Date.now() - antes;
    duracaoMedia = duracaoMedia === 0 ? duracao : (duracaoMedia + duracao) / 2;

    if (msg.stop_reason === 'max_tokens') {
      throw new Error('A leitura estourou o limite de tokens antes de fechar o JSON.');
    }

    const bruto = textoDaResposta(msg);
    const cru = tentarExtrair(bruto);

    // Risco e piada saem antes da validação de estilo: o Prompt Mãe manda parar
    // o fluxo, então cobrar dossiê de 300 palavras aqui é cobrar texto que vai
    // pro lixo.
    const minima = LeituraMinimaSchema.safeParse(cru);

    if (minima.success && (minima.data.sinalizacao.risco || minima.data.sinalizacao.piada)) {
      const parcial = LeituraSchema.safeParse(cru);
      if (parcial.success) {
        return {
          leitura: parcial.data,
          model,
          latency_ms: Date.now() - comeco,
          tentativas,
          validacao: { ok: true, duras: [], suaves: [], entregue_com_falha: false },
        };
      }

      throw new DesvioError(
        minima.data.sinalizacao.risco ? 'risco' : 'piada',
        minima.data.sinalizacao.risco
          ? minima.data.sinalizacao.risco_motivo
          : minima.data.spoiler,
      );
    }

    const parsed = LeituraSchema.safeParse(cru);

    if (!parsed.success) {
      const erros = parsed.error.issues
        .slice(0, 8)
        .map((e) => `${e.path.join('.')}: ${e.message}`);

      if (i === MAX_TENTATIVAS - 1) {
        throw new Error(`O JSON não bateu com o contrato: ${erros.join('; ')}`);
      }

      mensagens.push({ role: 'assistant', content: bruto });
      mensagens.push({ role: 'user', content: instrucaoCorrecao(erros) });
      continue;
    }

    ultima = parsed.data;
    ultimoResultado = validar(parsed.data, respostas);

    if (ultimoResultado.ok) {
      return {
        leitura: parsed.data,
        model,
        latency_ms: Date.now() - comeco,
        tentativas,
        validacao: {
          ok: true,
          duras: [],
          suaves: ultimoResultado.suaves.map((f) => f.regra),
          entregue_com_falha: false,
        },
      };
    }

    if (i < MAX_TENTATIVAS - 1) {
      mensagens.push({ role: 'assistant', content: bruto });
      mensagens.push({
        role: 'user',
        content: instrucaoCorrecao(mensagensDeErro(ultimoResultado)),
      });
    }
  }

  // Esgotou os retries. Planejamento Seção 3.2: entrega a última versão e loga.
  if (ultima === null || ultimoResultado === null) {
    throw new Error('A leitura não fechou em nenhuma das tentativas.');
  }

  return {
    leitura: ultima,
    model,
    latency_ms: Date.now() - comeco,
    tentativas,
    validacao: {
      ok: false,
      duras: ultimoResultado.duras.map((f) => f.regra),
      suaves: ultimoResultado.suaves.map((f) => f.regra),
      entregue_com_falha: true,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Repescagem                                                          */
/* ------------------------------------------------------------------ */

/**
 * Heurística barata, antes de gastar chamada. Planejamento Seção 3.3.
 * Devolve `null` quando não sabe decidir, e aí o modelo decide.
 */
export function heuristicaCena(texto: string): boolean | null {
  const limpo = texto.trim();
  const n = limpo.split(/\s+/).filter(Boolean).length;

  if (n < 15) return false;

  // Lista de tópicos: várias vírgulas e nenhum verbo conjugado reconhecível.
  const temVerbo =
    /\b(?:fui|foi|era|eram|estava|tinha|fiz|fez|saí|saiu|falei|falou|disse|contei|contou|nasceu|morreu|comecei|começou|parei|parou|decidi|decidiu|pedi|pediu|mudei|mudou|voltei|voltou|perdi|perdeu|casei|casou|larguei|largou|briguei|brigou|recusei|recusou|aceitei|aceitou|dormia|trabalhava|morava)\b/i.test(
      limpo,
    );

  const virgulas = (limpo.match(/,/g) ?? []).length;
  if (virgulas >= 2 && !temVerbo) return false;

  // Ano ou mês nomeado, mais um verbo de ação: cena quase certa.
  const temTempo =
    /\b(?:19|20)\d{2}\b|\b\d{1,2}\s+anos\b|\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i.test(
      limpo,
    );

  if (temTempo && temVerbo && n >= 25) return true;

  return null;
}

/** Chamada curta quando a heurística não decide. */
export async function checarCenaComModelo(texto: string): Promise<boolean> {
  const msg = await anthropic().messages.create({
    model: env.anthropicModel,
    max_tokens: 20,
    temperature: 0,
    system: SYSTEM_CHECAGEM_CENA,
    messages: [{ role: 'user', content: `${PERGUNTA_CHECAGEM_CENA}\n\n${texto}` }],
  });
  return /\bsim\b/i.test(textoDaResposta(msg));
}

export async function precisaRepescagem(texto: string): Promise<boolean> {
  const rapido = heuristicaCena(texto);
  if (rapido !== null) return !rapido;

  try {
    return !(await checarCenaComModelo(texto));
  } catch {
    // Se a checagem falhar, segue sem repescagem. Travar o cara por causa de um
    // erro de rede é pior que perder uma repescagem.
    return false;
  }
}
