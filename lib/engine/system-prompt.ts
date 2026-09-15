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

/**
 * Prompt curto da repescagem. Planejamento Seção 3.3, usado só quando a
 * heurística barata não decide sozinha.
 */
export const SYSTEM_CHECAGEM_CENA =
  'Tu avalia respostas de um questionário em português brasileiro. Cena é uma coisa que aconteceu num dia, com lugar e gente dentro. Responde só SIM ou NAO, sem pontuação e sem explicação.';

export const PERGUNTA_CHECAGEM_CENA =
  'Esta resposta tem pelo menos uma cena com dia ou ano, lugar e pessoa? Responde só SIM ou NAO.';
