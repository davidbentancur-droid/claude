import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CONTRATO_ANALISE, CONTRATO_DOSSIE } from './contract';

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

/**
 * As duas chamadas levam o Prompt Mãe integral e trocam só o contrato.
 *
 * Mandar o documento inteiro nas duas parece desperdício e não é: o prefixo é
 * idêntico e os dois provedores fazem cache de prefixo, então a segunda chamada
 * paga quase nada por ele. E a chamada 2 precisa das Seções 5, 9 e 10 na
 * íntegra, que são justamente as que governam a escrita.
 */
export function systemAnalise(): string {
  return promptMae() + CONTRATO_ANALISE;
}

export function systemDossie(): string {
  return promptMae() + CONTRATO_DOSSIE;
}

/*
 * O prompt curto da checagem de cena morava aqui e saiu junto com a chamada que
 * o usava. O portão de repescagem do Prompt Mãe Seção 2 virou contável, e quem
 * decide agora é `precisaRepescagem` em `lib/engine/read.ts`, sem modelo no
 * caminho entre uma pergunta e a outra.
 */
