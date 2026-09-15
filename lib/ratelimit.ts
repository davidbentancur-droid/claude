import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

import { env, temRateLimit } from './env';

/**
 * Rate limit por IP. Planejamento Seção 2: 5 leituras por hora, 20 transcrições.
 *
 * Sem Upstash configurado, libera tudo e avisa no log. Isso é proposital: em
 * desenvolvimento e em preview a proteção não faz falta, e derrubar a aplicação
 * por causa de env faltando é pior que rodar sem limite num ambiente fechado.
 */

let redis: Redis | null = null;

function conexao(): Redis | null {
  if (!temRateLimit()) return null;
  if (redis === null) {
    redis = new Redis({ url: env.upstashUrl, token: env.upstashToken });
  }
  return redis;
}

function criar(prefixo: string, tokens: number): Ratelimit | null {
  const r = conexao();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(tokens, '1 h'),
    prefix: `mdm:${prefixo}`,
    analytics: false,
  });
}

let leitura: Ratelimit | null | undefined;
let transcricao: Ratelimit | null | undefined;

export type Veredito = { permitido: boolean; restantes: number };

const LIBERADO: Veredito = { permitido: true, restantes: -1 };

export async function limitarLeitura(chave: string): Promise<Veredito> {
  if (leitura === undefined) leitura = criar('read', 5);
  if (!leitura) return LIBERADO;
  const r = await leitura.limit(chave);
  return { permitido: r.success, restantes: r.remaining };
}

export async function limitarTranscricao(chave: string): Promise<Veredito> {
  if (transcricao === undefined) transcricao = criar('transcribe', 20);
  if (!transcricao) return LIBERADO;
  const r = await transcricao.limit(chave);
  return { permitido: r.success, restantes: r.remaining };
}

/** Mensagem em português, pedida pelo item L do brief de QA. */
export const MENSAGEM_LIMITE =
  'Tu já fez leituras demais em pouco tempo. Espera um pouco e tenta de novo.';
