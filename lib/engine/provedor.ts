import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

import { env } from '../env';

/**
 * A camada que fala com o modelo.
 *
 * Existe porque o resto do engine não tem nada de específico de fornecedor: o
 * contrato JSON, o schema, o validador e as fixtures funcionam contra qualquer
 * modelo que devolva o JSON pedido. Isolando a chamada aqui, trocar de
 * fornecedor é uma variável de ambiente, e comparar os dois é rodar a mesma
 * fixture duas vezes.
 *
 * O default é Anthropic porque foi contra ele que a Rodada 1 rodou. Qualquer
 * outro precisa da própria rodada de validação antes de ir pro ar: os números
 * de latência, de contagem de palavras e de acerto de Ato não transferem.
 */

export type Esforco = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type Chamada = {
  system: string;
  mensagens: { role: 'user' | 'assistant'; content: string }[];
  maxTokens: number;
  esforco: Esforco;
  /** Raciocínio antes de responder. Nem todo modelo aceita desligar. */
  pensar: boolean;
  /** Pede JSON estrito quando o fornecedor suporta. */
  json: boolean;
};

export type Resposta = {
  texto: string;
  /** True quando o modelo bateu no teto de tokens antes de fechar. */
  truncou: boolean;
};

export interface Provedor {
  readonly nome: string;
  readonly modelo: string;
  chamar(c: Chamada): Promise<Resposta>;
}

/* ------------------------------------------------------------------ */
/* Anthropic                                                           */
/* ------------------------------------------------------------------ */

class ProvedorAnthropic implements Provedor {
  readonly nome = 'anthropic';
  private cliente: Anthropic | null = null;

  constructor(readonly modelo: string) {}

  private sdk(): Anthropic {
    if (this.cliente === null) this.cliente = new Anthropic({ apiKey: env.anthropicKey });
    return this.cliente;
  }

  async chamar(c: Chamada): Promise<Resposta> {
    /**
     * Streaming em vez de `create()`: a conexão fica viva durante a geração, o
     * que evita timeout de HTTP numa chamada de dezenas de segundos.
     *
     * O `cache_control` no system é o ganho grande. O Prompt Mãe são mais de dez
     * mil tokens idênticos em toda leitura, e em cache essa parte da entrada
     * custa uma fração. O retry reaproveita o mesmo prefixo.
     */
    const msg = await this.sdk()
      .messages.stream({
        model: this.modelo,
        max_tokens: c.maxTokens,
        output_config: { effort: c.esforco },
        thinking: c.pensar ? { type: 'adaptive' } : { type: 'disabled' },
        system: [{ type: 'text', text: c.system, cache_control: { type: 'ephemeral' } }],
        messages: c.mensagens,
      })
      .finalMessage();

    return {
      texto: msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(''),
      truncou: msg.stop_reason === 'max_tokens',
    };
  }
}

/* ------------------------------------------------------------------ */
/* OpenAI                                                              */
/* ------------------------------------------------------------------ */

type EsforcoOpenAI = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Nos modelos de raciocínio da OpenAI `temperature` é rejeitado e o controle é
 * `reasoning_effort`, que vai de `minimal` a `high`. O mapa achata `xhigh` e
 * `max` no topo, e `ENGINE_EFFORT=minimal` alcança o degrau mais baixo, que não
 * tem equivalente do lado da Anthropic.
 */
const ESFORCO_OPENAI: Record<Esforco, EsforcoOpenAI> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'high',
  max: 'high',
};

function esforcoOpenAI(e: Esforco): EsforcoOpenAI {
  const bruto = process.env.ENGINE_EFFORT;
  if (bruto === 'minimal') return 'minimal';
  return ESFORCO_OPENAI[e];
}

class ProvedorOpenAI implements Provedor {
  readonly nome = 'openai';
  private cliente: OpenAI | null = null;

  constructor(readonly modelo: string) {}

  private sdk(): OpenAI {
    if (this.cliente === null) this.cliente = new OpenAI({ apiKey: env.openaiKey });
    return this.cliente;
  }

  async chamar(c: Chamada): Promise<Resposta> {
    // Sem `cache_control`: o cache de prefixo da OpenAI é automático, não se
    // declara. O mesmo system prompt repetido já é aproveitado por ela.
    const r = await this.sdk().chat.completions.create({
      model: this.modelo,
      max_completion_tokens: c.maxTokens,
      reasoning_effort: esforcoOpenAI(c.esforco),
      response_format: c.json ? { type: 'json_object' } : { type: 'text' },
      messages: [
        { role: 'system', content: c.system },
        ...c.mensagens.map((m) => ({ role: m.role, content: m.content }) as const),
      ],
    });

    const escolha = r.choices[0];

    return {
      texto: escolha?.message?.content ?? '',
      truncou: escolha?.finish_reason === 'length',
    };
  }
}

/* ------------------------------------------------------------------ */

let atual: Provedor | null = null;

export function provedor(): Provedor {
  if (atual !== null) return atual;

  atual =
    env.engineProvider === 'openai'
      ? new ProvedorOpenAI(env.openaiEngineModel)
      : new ProvedorAnthropic(env.anthropicModel);

  return atual;
}

/** Só pros testes de fixture, que trocam de provedor entre execuções. */
export function esquecerProvedor(): void {
  atual = null;
}
