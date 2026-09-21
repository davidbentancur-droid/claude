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
  /**
   * True quando um classificador de segurança recusou a requisição.
   *
   * Não é erro de rede nem JSON malformado: a resposta vem 200 com o conteúdo
   * vazio. Sem este campo o engine trataria como parse quebrado e gastaria as
   * três tentativas repetindo a mesma recusa.
   */
  recusou?: boolean;
};

export interface Provedor {
  readonly nome: string;
  readonly modelo: string;
  chamar(c: Chamada): Promise<Resposta>;
}

/* ------------------------------------------------------------------ */
/* Anthropic                                                           */
/* ------------------------------------------------------------------ */

/**
 * Pra onde a chamada vai quando o modelo principal recusa.
 *
 * Opus 5 e não outro Fable: o fallback existe justamente pra sair do
 * classificador que recusou, então repetir a mesma família não ajuda.
 */
const RESERVA = process.env.ANTHROPIC_MODELO_RESERVA ?? 'claude-opus-5';

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
     * O `cache_control` no system é o ganho grande. O Prompt Mãe e o banco de
     * mitos são mais de vinte mil tokens idênticos em toda leitura, e em cache
     * essa parte da entrada custa uma fração. O retry reaproveita o prefixo.
     */
    // `minimal` é degrau da OpenAI e não existe aqui. Sem este piso, trocar o
    // provedor de volta com a mesma env mandaria um valor inválido pra API.
    const esforco = (c.esforco as string) === 'minimal' ? 'low' : c.esforco;

    /**
     * No Fable e no Mythos o raciocínio é sempre ligado, e **qualquer**
     * configuração explícita de `thinking` que não seja `adaptive` volta 400.
     * Inclusive `disabled`. Então lá o parâmetro é omitido em vez de desligado,
     * e `ENGINE_THINKING=disabled` vira sem efeito em vez de virar erro.
     */
    const semDesligar = /fable|mythos/i.test(this.modelo);
    const thinking: Anthropic.ThinkingConfigParam | undefined = c.pensar
      ? { type: 'adaptive' }
      : semDesligar
        ? undefined
        : { type: 'disabled' };

    /**
     * Fallback de recusa, e aqui ele não é enfeite.
     *
     * Este quiz recebe gente escrevendo sobre morte, doença, ruptura e
     * violência sofrida, que é matéria-prima do método e também exatamente o
     * assunto que faz um classificador de segurança hesitar. Recusa chega 200
     * com conteúdo vazio, quer dizer, o engine não veria erro nenhum: veria
     * JSON faltando e queimaria as tentativas. Com o fallback a própria API
     * refaz a chamada no modelo de reserva e a leitura continua.
     *
     * O pré-filtro de risco em `lib/engine/risk.ts` continua sendo a primeira
     * porta e não muda: quem escreve ideação suicida para o fluxo antes de
     * chegar aqui e recebe o CVV, não um dossiê.
     */
    const msg = await this.sdk()
      .beta.messages.stream({
        model: this.modelo,
        max_tokens: c.maxTokens,
        output_config: { effort: esforco },
        ...(thinking ? { thinking } : {}),
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: RESERVA }],
        system: [{ type: 'text', text: c.system, cache_control: { type: 'ephemeral' } }],
        messages: c.mensagens,
      })
      .finalMessage();

    return {
      texto: msg.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(''),
      truncou: msg.stop_reason === 'max_tokens',
      recusou: msg.stop_reason === 'refusal',
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
