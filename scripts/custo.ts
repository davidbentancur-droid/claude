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
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

import { systemAnalise, systemDossie } from '../lib/engine/system-prompt';
import { montarRespostas, montarAnaliseParaEscrita } from '../lib/engine/contract';

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'tests', 'fixtures', 'marcelo.json'), 'utf8'),
) as { respostas: { p1: string; p2: string; p3: string; p4: string } };

/**
 * Mede o provedor que estiver configurado, não um fixo.
 *
 * `ENGINE_PROVIDER=anthropic pnpm custo` responde quanto custa a leitura no
 * Fable, que é a pergunta que vem junto com a troca: ele é 8x a entrada e 5x a
 * saída do gpt-5, e a diferença só se sabe medindo, porque o Fable pensa
 * sempre e o gpt-5 não.
 */
const PROVEDOR = process.env.ENGINE_PROVIDER ?? 'openai';
const ANTHROPIC = PROVEDOR === 'anthropic';

const modelo = ANTHROPIC
  ? (process.env.ANTHROPIC_MODEL ?? 'claude-fable-5-1')
  : (process.env.OPENAI_ENGINE_MODEL ?? 'gpt-5');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Preço por milhão de tokens. Tabela de 2026-06-24. */
const PRECO: Record<string, { entrada: number; cache: number; saida: number }> = {
  'gpt-5': { entrada: 1.25, cache: 0.125, saida: 10 },
  'claude-fable-5-1': { entrada: 10, cache: 0.25, saida: 50 },
  'claude-fable-5': { entrada: 10, cache: 1, saida: 50 },
  'claude-opus-5': { entrada: 5, cache: 0.5, saida: 25 },
  'claude-sonnet-5': { entrada: 2, cache: 0.2, saida: 10 },
};

type Uso = { inp: number; cache: number; out: number };

/**
 * Uma chamada, no provedor configurado, devolvendo o uso normalizado.
 *
 * Os dois contam entrada de jeito diferente e isso muda a conta: na OpenAI
 * `prompt_tokens` já inclui o que veio do cache, na Anthropic os dois campos
 * são separados e somam. Normalizar aqui é o que deixa a comparação honesta.
 */
async function medir(
  system: string,
  mensagens: { role: 'user' | 'assistant'; content: string }[],
  esforco: 'low' | 'medium',
): Promise<{ uso: Uso; texto: string }> {
  if (ANTHROPIC) {
    const m = await anthropic.beta.messages
      .stream({
        model: modelo,
        max_tokens: 32000,
        output_config: { effort: esforco },
        betas: ['server-side-fallback-2026-06-01'],
        fallbacks: [{ model: 'claude-opus-5' }],
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: mensagens,
      })
      .finalMessage();

    const u = m.usage;
    const cache = (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
    return {
      uso: { inp: u.input_tokens + cache, cache, out: u.output_tokens },
      texto: m.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join(''),
    };
  }

  const r = await openai.chat.completions.create({
    model: modelo,
    max_completion_tokens: 32000,
    reasoning_effort: esforco === 'low' ? 'minimal' : 'medium',
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: system }, ...mensagens],
  });

  const u = r.usage;
  return {
    uso: {
      inp: u?.prompt_tokens ?? 0,
      cache: u?.prompt_tokens_details?.cached_tokens ?? 0,
      out: u?.completion_tokens ?? 0,
    },
    texto: r.choices[0]?.message?.content ?? '',
  };
}

function dinheiro(u: Uso): number {
  const p = PRECO[modelo] ?? PRECO['gpt-5'];
  const nova = Math.max(u.inp - u.cache, 0);
  return (nova * p.entrada + u.cache * p.cache + u.out * p.saida) / 1e6;
}

async function main() {
  console.log(`provedor: ${PROVEDOR}  modelo: ${modelo}`);
  console.log(`system da chamada 1: ${systemAnalise().length} chars`);
  console.log(`system da chamada 2: ${systemDossie().length} chars`);
  console.log('');

  const respostas = montarRespostas(fixture.respostas);
  const total: Uso = { inp: 0, cache: 0, out: 0 };

  const somar = (rotulo: string, u: Uso) => {
    total.inp += u.inp;
    total.cache += u.cache;
    total.out += u.out;
    console.log(
      `${rotulo.padEnd(22)} entrada ${String(u.inp).padStart(6)} (cache ${String(u.cache).padStart(6)})   saída ${String(u.out).padStart(6)}   US$ ${dinheiro(u).toFixed(4)}`,
    );
  };

  const a = await medir(systemAnalise(), [{ role: 'user', content: respostas }], 'low');
  somar('chamada 1 (análise)', a.uso);
  const analise = JSON.parse(a.texto || '{}');

  const aRetry = await medir(
    systemAnalise(),
    [
      { role: 'user', content: respostas },
      { role: 'assistant', content: a.texto },
      {
        role: 'user',
        content:
          `A tua resposta anterior quebrou estas regras:

- O spoiler está com 140 palavras e precisa ficar entre 90 e 130.

Devolve o JSON inteiro, e só o JSON.`,
      },
    ],
    'low',
  );
  somar('chamada 1, retry', aRetry.uso);

  const escrita = montarAnaliseParaEscrita(fixture.respostas, analise);
  const d = await medir(systemDossie(), [{ role: 'user', content: escrita }], 'medium');
  somar('chamada 2 (dossiê)', d.uso);

  const dRetry = await medir(
    systemDossie(),
    [
      { role: 'user', content: escrita },
      { role: 'assistant', content: d.texto },
      {
        role: 'user',
        content:
          `A tua resposta anterior quebrou estas regras:

- O dossiê está com 580 palavras e precisa ficar entre 420 e 550.

Devolve o JSON inteiro, e só o JSON.`,
      },
    ],
    'medium',
  );
  somar('chamada 2, retry', dRetry.uso);

  /*
   * A conta de um lead de verdade, não a das quatro chamadas acima.
   *
   * Medido em produção: a chamada 1 roda 2 vezes e a 2 roda 4. Então o total
   * é uma passada de cada mais um retry de cada, com o retry da 2 contando
   * três vezes.
   */
  const lead: Uso = {
    inp: a.uso.inp + aRetry.uso.inp + d.uso.inp + dRetry.uso.inp * 3,
    cache: a.uso.cache + aRetry.uso.cache + d.uso.cache + dRetry.uso.cache * 3,
    out: a.uso.out + aRetry.uso.out + d.uso.out + dRetry.uso.out * 3,
  };

  console.log('');
  console.log('--- um lead completo (chamada 1 x2, chamada 2 x4) ---');
  console.log(`entrada ${lead.inp}, sendo ${lead.cache} em cache`);
  console.log(`saída   ${lead.out}`);
  console.log(`custo   US$ ${dinheiro(lead).toFixed(3)} por lead`);
  console.log(`         US$ ${(dinheiro(lead) * 1000).toFixed(0)} por mil leads`);
}

void main();
