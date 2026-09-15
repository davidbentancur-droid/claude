/**
 * Roda o engine contra uma fixture e imprime o que saiu.
 *
 * Uso:
 *   pnpm engine:fixture marcelo
 *   pnpm engine:fixture marcelo 3       (três rodadas, pra ver a variância)
 *   pnpm engine:fixture --todas
 *
 * O relatório de variância é o insumo da pendência 1 do Prompt Mãe: comparar o
 * Ato e o Movimento que o quiz crava com os da leitura completa em casos reais.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import 'dotenv/config';

import { gerarLeitura } from '../lib/engine/read';
import { checarRiscoConjunto } from '../lib/engine/risk';
import { validar } from '../lib/engine/validate';

type Fixture = {
  nome: string;
  descricao: string;
  esperado: Record<string, unknown>;
  respostas: { p1: string; p2: string; p3: string; p4: string };
};

const DIR = join(process.cwd(), 'tests', 'fixtures');

function carregar(nome: string): Fixture {
  return JSON.parse(readFileSync(join(DIR, `${nome}.json`), 'utf8')) as Fixture;
}

function palavras(s: string): number {
  return s.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}

async function rodar(fixture: Fixture, rodadas: number) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${fixture.nome}  ${fixture.descricao}`);
  console.log(`esperado: ${JSON.stringify(fixture.esperado)}`);
  console.log('='.repeat(70));

  const pre = checarRiscoConjunto(Object.values(fixture.respostas));
  if (pre.risco) {
    console.log(`\n  PRÉ-FILTRO DE RISCO acionou: ${pre.categoria} ("${pre.termo}")`);
    console.log('  O fluxo para aqui. Nenhuma chamada ao engine, nenhum dossiê.');
    return;
  }

  for (let i = 1; i <= rodadas; i++) {
    const t = Date.now();
    try {
      const r = await gerarLeitura(fixture.respostas);
      const l = r.leitura;

      if (l.sinalizacao.risco) {
        console.log(`\n  rodada ${i}: RISCO sinalizado pelo modelo. Sem dossiê.`);
        continue;
      }
      if (l.sinalizacao.piada) {
        console.log(`\n  rodada ${i}: PIADA. "${l.spoiler.slice(0, 90)}"`);
        continue;
      }

      const v = validar(l, fixture.respostas);
      const nDossie =
        palavras(l.dossie.titulo) +
        palavras(l.dossie.devolutiva) +
        palavras(l.dossie.ato_texto) +
        palavras(l.dossie.movimento_texto) +
        palavras(l.dossie.arquetipo_texto) +
        palavras(l.dossie.fechamento);

      const arq = l.arquetipos.map((a) => `${a.nome} ${a.direcao}`).join(', ');

      console.log(
        [
          `\n  rodada ${i}  ${((Date.now() - t) / 1000).toFixed(1)}s  ${r.tentativas} tentativa(s)`,
          `    Ato          ${l.ato.nome} (${l.ato.posicao})`,
          `    Movimento    ${l.movimento.numero} ${l.movimento.nome}${l.movimento.aposta ? ' [aposta]' : ''}${l.movimento.recorrencia_detectada ? ' [recorrência]' : ''}`,
          `    Arquétipos   ${arq}  fortalecer: ${l.fortalecer_primeiro}`,
          `    Ecos         ${l.ecos.map((e) => `${e.historia} (${e.tradicao})`).join(' | ')}`,
          `    Gancho       ${l.gancho_usado}`,
          `    Palavras     dossiê ${nDossie}, spoiler ${palavras(l.spoiler)}${l.material_fino ? ' [material fino]' : ''}`,
          `    Validação    ${v.ok ? 'passou' : `REPROVOU: ${v.duras.map((f) => f.regra).join(', ')}`}${v.suaves.length ? ` (suaves: ${v.suaves.map((f) => f.regra).join(', ')})` : ''}`,
          `    Título       ${l.dossie.titulo}`,
        ].join('\n'),
      );

      if (!v.ok) {
        for (const f of v.duras) console.log(`      ! ${f.mensagem}`);
      }
    } catch (e) {
      console.log(`\n  rodada ${i}: FALHOU  ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const todas = args.includes('--todas');
  const rodadas = Number(args.find((a) => /^\d+$/.test(a)) ?? 1);

  const nomes = todas
    ? readdirSync(DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
    : [args.find((a) => !a.startsWith('-') && !/^\d+$/.test(a)) ?? 'marcelo'];

  for (const nome of nomes) {
    await rodar(carregar(nome), rodadas);
  }
  console.log('');
}

void main();
