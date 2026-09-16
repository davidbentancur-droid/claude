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

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { config } from 'dotenv';

// `dotenv/config` carrega só `.env`. Quem guarda as chaves aqui é `.env.local`,
// que é o arquivo que o Next também lê e o que está no gitignore.
config({ path: '.env.local' });
config();

import { DesvioError, escreverDossie, gerarAnalise } from '../lib/engine/read';
import { checarRiscoConjunto } from '../lib/engine/risk';
import { validarAnalise, validarDossie } from '../lib/engine/validate';

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
      // As duas chamadas, cronometradas separadas, que é o que interessa medir
      // agora: em produção a 2 roda enquanto o cara preenche o formulário, então
      // só a 1 é latência que ele sente.
      const t1 = Date.now();
      const a = await gerarAnalise(fixture.respostas);
      const msAnalise = Date.now() - t1;

      if (a.analise.sinalizacao.risco) {
        console.log(`\n  rodada ${i}: RISCO sinalizado pelo modelo. Sem dossiê.`);
        continue;
      }
      if (a.analise.sinalizacao.piada) {
        console.log(`\n  rodada ${i}: PIADA. "${a.analise.spoiler.slice(0, 90)}"`);
        continue;
      }

      const t2 = Date.now();
      const d = await escreverDossie(fixture.respostas, a.analise);
      const msDossie = Date.now() - t2;

      const l = { ...a.analise, dossie: d.dossie };
      const r = {
        model: a.model,
        tentativas: a.tentativas + d.tentativas,
      };

      // Guarda a saída inteira pra inspeção. É o que permite entender por que o
      // validador reprovou sem ter que adivinhar pelo nome da regra.
      const saida = join(process.cwd(), 'tmp', 'leituras');
      mkdirSync(saida, { recursive: true });
      writeFileSync(
        join(saida, `${fixture.nome}-${i}.json`),
        JSON.stringify(l, null, 2),
        'utf8',
      );

      const va = validarAnalise(a.analise, fixture.respostas);
      const vd = validarDossie(d.dossie, a.analise, fixture.respostas);
      const v = {
        ok: va.ok && vd.ok,
        duras: [...va.duras, ...vd.duras],
        suaves: [...va.suaves, ...vd.suaves],
      };
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
          `\n  rodada ${i}  ${((Date.now() - t) / 1000).toFixed(1)}s no total  ${r.tentativas} tentativa(s)`,
          `    Chamada 1    ${(msAnalise / 1000).toFixed(1)}s, ${a.tentativas} tentativa(s)  ← a única que o cara espera`,
          `    Chamada 2    ${(msDossie / 1000).toFixed(1)}s, ${d.tentativas} tentativa(s)  ← roda durante o formulário`,
          `    Ato          ${l.ato.nome} (${l.ato.posicao})`,
          `    Movimento    ${l.movimento.numero} ${l.movimento.nome}${l.movimento.aposta ? ' [aposta]' : ''}${l.movimento.recorrencia_detectada ? ' [recorrência]' : ''}`,
          `    Arquétipos   ${arq}  fortalecer: ${l.fortalecer_primeiro}`,
          `    Ecos         ${l.ecos.map((e) => `${e.historia} (${e.tradicao})`).join(' | ')}`,
          `    Gancho       ${l.gancho_usado}`,
          `    Palavras     dossiê ${nDossie}, spoiler ${palavras(l.spoiler)}${l.material_fino ? ' [material fino]' : ''}`,
          `    Esforço      ${process.env.ENGINE_EFFORT ?? "medium"}`,
          `    Validação    ${v.ok ? 'passou' : `REPROVOU: ${v.duras.map((f) => f.regra).join(', ')}`}${v.suaves.length ? ` (suaves: ${v.suaves.map((f) => f.regra).join(', ')})` : ''}`,
          `    Título       ${l.dossie.titulo}`,
        ].join('\n'),
      );

      if (!v.ok) {
        for (const f of v.duras) console.log(`      ! ${f.mensagem}`);
      }
    } catch (e) {
      // Risco e piada chegam como DesvioError e são o comportamento correto: o
      // Prompt Mãe manda parar o fluxo. Reportar como falha escondia isso.
      if (e instanceof DesvioError) {
        console.log(
          `\n  rodada ${i}  ${((Date.now() - t) / 1000).toFixed(1)}s` +
            `\n    DESVIO ${e.tipo.toUpperCase()}, fluxo interrompido como manda a Seção 8` +
            `\n    Texto        ${e.texto.slice(0, 160)}`,
        );
        continue;
      }
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
