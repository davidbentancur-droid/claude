import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { textoDoBanco } from '../mitos';

import { CONTRATO_ANALISE, CONTRATO_DOSSIE } from './contract';

/**
 * System prompt = Prompt Mãe integral + Banco de Mitos integral + contrato.
 *
 * Os dois documentos vivem em `docs/` e são lidos de lá, não copiados pra
 * dentro de um .ts. Motivo: eles são a fonte de verdade e o Adriano edita o
 * markdown. Duplicar o texto em código garante que uma das cópias fica velha.
 *
 * `next.config.ts` inclui os arquivos no bundle da função via
 * `outputFileTracingIncludes`, senão eles não sobem pro Vercel.
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
 * Os dois documentos, na ordem em que o Prompt Mãe manda.
 *
 * O anexo obrigatório de contexto, no topo do Prompt Mãe de 19/09, diz que ele
 * "precisa rodar sempre junto com o Banco de Mitos anexado como segundo
 * documento de contexto". A separação por cabeçalho existe pra isso ficar
 * explícito pro modelo: são dois documentos, não um texto emendado.
 */
function contexto(): string {
  return `${promptMae()}

---

# Segundo documento de contexto

O que vem abaixo é o Banco de Mitos Compacto, o anexo obrigatório citado no topo do Prompt Mãe. É de lá que saem os dois ecos, a popularidade de cada um e o ângulo não-óbvio. Mito fora desta lista não entra, por melhor que pareça encaixar.

${textoDoBanco()}`;
}

/**
 * As duas chamadas levam os dois documentos integrais e trocam só o contrato.
 *
 * Mandar tudo nas duas parece desperdício e não é: o prefixo é idêntico e os
 * dois provedores fazem cache de prefixo, então a segunda chamada paga quase
 * nada por ele. E a chamada 2 precisa das Seções 5, 9 e 10 na íntegra, que são
 * justamente as que governam a escrita.
 *
 * O banco vai nas duas pelo mesmo motivo com nome diferente. A chamada 1
 * escolhe os dois ecos, então precisa da lista pra escolher. A chamada 2
 * escreve eles em cinco a sete linhas cada usando o ângulo não-óbvio, e o
 * ângulo está no banco, não na análise: sem a lista ela cai no resumo padrão do
 * mito, que é exatamente o que o Passo 5 manda não fazer.
 */
export function systemAnalise(): string {
  return contexto() + CONTRATO_ANALISE;
}

export function systemDossie(): string {
  return contexto() + CONTRATO_DOSSIE;
}

/*
 * O prompt curto da checagem de cena morava aqui e saiu junto com a chamada que
 * o usava. O portão de repescagem do Prompt Mãe Seção 2 virou contável, e quem
 * decide agora é `precisaRepescagem` em `lib/engine/read.ts`, sem modelo no
 * caminho entre uma pergunta e a outra.
 */
