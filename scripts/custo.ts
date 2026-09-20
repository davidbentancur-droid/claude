/**
 * Mede o custo real de uma leitura, em tokens, contra a fixture do Marcelo.
 *
 * Uso: pnpm custo
 *
 * Existe porque o `usage` das respostas é descartado pelo provedor (o engine só
 * quer o texto), e sem ele a pergunta "quanto custa por lead" só tem resposta
 * por estimativa. Aqui as quatro chamadas são reais e os números vêm da API.
 *
 * Mede quatro coisas, e as duas de retry importam tanto quanto as outras: o
 * conserto de tamanho roda três ou quatro vezes na chamada 2, e é ali que a
 * conta é feita. A entrada do retry é quase toda cache; a saída, não.
 *
 * Uma leitura de verdade também pode ter transcrição de áudio
 * (`gpt-4o-transcribe`, cobrada por minuto), que este script não mede porque
 * depende de o cara falar em vez de escrever.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

import { systemAnalise, systemDossie } from '../lib/engine/system-prompt';
import { montarRespostas, montarAnaliseParaEscrita } from '../lib/engine/contract';

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'tests', 'fixtures', 'marcelo.json'), 'utf8'),
) as { respostas: { p1: string; p2: string; p3: string; p4: string } };

const sdk = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const modelo = 'gpt-5';

type Uso = {
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
};

function mostrar(rotulo: string, u: Uso | undefined) {
  if (u === undefined) throw new Error(`${rotulo}: a API não devolveu usage.`);
  const inp = u.prompt_tokens ?? 0;
  const cache = u.prompt_tokens_details?.cached_tokens ?? 0;
  const out = u.completion_tokens ?? 0;
  const rac = u.completion_tokens_details?.reasoning_tokens ?? 0;
  console.log(
    `${rotulo.padEnd(22)} entrada ${String(inp).padStart(6)}  (cache ${String(cache).padStart(6)})   saída ${String(out).padStart(5)}  (raciocínio ${String(rac).padStart(5)})`,
  );
  return { inp, cache, out };
}

async function main() {
  console.log(`system da chamada 1: ${systemAnalise().length} chars`);
  console.log(`system da chamada 2: ${systemDossie().length} chars`);
  console.log('');

  const r1 = await sdk.chat.completions.create({
    model: modelo,
    max_completion_tokens: 32000,
    reasoning_effort: 'minimal',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemAnalise() },
      { role: 'user', content: montarRespostas(fixture.respostas) },
    ],
  });
  const a = mostrar('chamada 1 (análise)', r1.usage);
  const analise = JSON.parse(r1.choices[0]?.message?.content ?? '{}');

  // Segunda tentativa da chamada 1, pra medir quanto o retry aproveita de cache.
  const r1b = await sdk.chat.completions.create({
    model: modelo,
    max_completion_tokens: 32000,
    reasoning_effort: 'minimal',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemAnalise() },
      { role: 'user', content: montarRespostas(fixture.respostas) },
      { role: 'assistant', content: r1.choices[0]?.message?.content ?? '' },
      { role: 'user', content: 'A tua resposta anterior quebrou estas regras:\n\n- O spoiler está com 140 palavras e precisa ficar entre 90 e 130.\n\nDevolve o JSON inteiro, e só o JSON.' },
    ],
  });
  const a2 = mostrar('chamada 1, retry', r1b.usage);

  const r2 = await sdk.chat.completions.create({
    model: modelo,
    max_completion_tokens: 32000,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemDossie() },
      { role: 'user', content: montarAnaliseParaEscrita(fixture.respostas, analise) },
    ],
  });
  const d = mostrar('chamada 2 (dossiê)', r2.usage);

  const r2b = await sdk.chat.completions.create({
    model: modelo,
    max_completion_tokens: 32000,
    reasoning_effort: 'medium',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemDossie() },
      { role: 'user', content: montarAnaliseParaEscrita(fixture.respostas, analise) },
      { role: 'assistant', content: r2.choices[0]?.message?.content ?? '' },
      { role: 'user', content: 'A tua resposta anterior quebrou estas regras:\n\n- O dossiê está com 580 palavras e precisa ficar entre 420 e 550.\n\nDevolve o JSON inteiro, e só o JSON.' },
    ],
  });
  const d2 = mostrar('chamada 2, retry', r2b.usage);

  console.log('');
  console.log('--- soma de uma passada sem retry ---');
  console.log(`entrada ${a.inp + d.inp}, sendo ${a.cache + d.cache} em cache; saída ${a.out + d.out}`);
  console.log('');
  console.log('--- custo de um retry ---');
  console.log(`chamada 1: entrada ${a2.inp} (cache ${a2.cache}), saída ${a2.out}`);
  console.log(`chamada 2: entrada ${d2.inp} (cache ${d2.cache}), saída ${d2.out}`);
}

void main();
