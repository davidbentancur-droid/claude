import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CONTRATO_JSON } from './contract';

/**
 * System prompt = Prompt Mãe integral + contrato de saída.
 *
 * O Prompt Mãe vive em `docs/prompt-mae.md` e é lido de lá, não copiado pra
 * dentro de um .ts. Motivo: ele é a fonte de verdade e o Adriano edita o
 * markdown. Duplicar o texto em código garante que uma das cópias fica velha.
 *
 * `next.config.ts` inclui o arquivo no bundle da função via
 * `outputFileTracingIncludes`, senão ele não sobe pro Vercel.
 */

const CAMINHO = join(process.cwd(), 'docs', 'prompt-mae.md');

let cache: string | null = null;

export function promptMae(): string {
  if (cache === null) {
    cache = readFileSync(CAMINHO, 'utf8');
    if (cache.trim().length < 2000) {
      throw new Error(
        'docs/prompt-mae.md veio vazio ou truncado. O engine não roda sem o Prompt Mãe integral.',
      );
    }
  }
  return cache;
}

export function systemPrompt(): string {
  return promptMae() + CONTRATO_JSON;
}

/*
 * O prompt curto da checagem de cena morava aqui e saiu junto com a chamada que
 * o usava. O portão de repescagem do Prompt Mãe Seção 2 virou contável, e quem
 * decide agora é `precisaRepescagem` em `lib/engine/read.ts`, sem modelo no
 * caminho entre uma pergunta e a outra.
 */
