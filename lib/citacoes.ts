/**
 * Extração das citações literais do dossiê.
 *
 * Mora sozinho porque duas partes muito distantes dependem de concordar sobre o
 * que é uma citação: o validador do servidor, que exige pelo menos duas, e o
 * componente de tela, que pinta cada uma em dourado. Se as duas divergirem, o
 * validador aprova um texto cujas citações a tela não mostra.
 *
 * O modelo usa aspas simples com frequência, porque dentro do JSON do contrato
 * a aspa dupla precisa de escape e ele evita o incômodo. As citações são
 * corretas e literais, só vêm com o outro sinal. Reconhecer os dois é mais
 * barato que brigar com ele.
 */

const ASPAS_DUPLAS = /[“”„«»″]/g;
const ASPAS_SIMPLES = /[‘’‛′]/g;

export function normalizarAspas(s: string): string {
  return s.replace(ASPAS_DUPLAS, '"').replace(ASPAS_SIMPLES, "'");
}

export type Pedaco = { tipo: 'texto' | 'citacao' | 'forte'; valor: string };

/**
 * O único markdown que atravessa o contrato.
 *
 * O Prompt Mãe Seção 5 manda os rótulos "A armadilha:" e "O convite:" em negrito
 * e em linha própria, e o nome do Movimento em negrito, porque são o que o cara
 * guarda da leitura. Diluídos dentro do parágrafo, somem. Nada além disso é
 * aceito: o contrato proíbe cerquilha, lista e itálico.
 */
const RE_FORTE = /\*\*([^*\n]{1,120})\*\*/g;

/**
 * Aspa simples só conta quando o trecho tem mais de uma palavra e não está
 * colado em letra, senão apóstrofo de "d'água" viraria citação.
 */
const RE_CITACAO =
  /"([^"\n]{2,240})"|(?<![\p{L}\p{N}])'([^'\n]{2,240})'(?![\p{L}\p{N}])/gu;

function ehCitacaoValida(valor: string, comAspaSimples: boolean): boolean {
  if (!comAspaSimples) return true;
  return /\s/.test(valor.trim());
}

/** Só os textos citados, na ordem em que aparecem. */
export function trechosCitados(texto: string): string[] {
  const out: string[] = [];
  const re = new RegExp(RE_CITACAO.source, RE_CITACAO.flags);
  let m: RegExpExecArray | null;

  while ((m = re.exec(normalizarAspas(texto))) !== null) {
    const dupla = m[1];
    const simples = m[2];
    const valor = dupla ?? simples;
    if (valor && ehCitacaoValida(valor, dupla === undefined)) out.push(valor);
  }
  return out;
}

/**
 * Quebra o texto em pedaços, separando o que é citação do que é narração, pra a
 * tela envolver cada citação em `<q>`. Aspas que não fecham ficam como texto.
 *
 * O negrito é resolvido antes, numa passada própria, e cada trecho em negrito
 * sai inteiro. Rótulo em negrito não leva citação dentro, então não perde nada,
 * e uma passada só com as duas coisas no mesmo regex fica ilegível.
 */
export function partirCitacoes(texto: string): Pedaco[] {
  const saida: Pedaco[] = [];
  const re = new RegExp(RE_FORTE.source, RE_FORTE.flags);

  let ultimo = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) saida.push(...partirAspas(texto.slice(ultimo, m.index)));
    saida.push({ tipo: 'forte', valor: m[1] });
    ultimo = m.index + m[0].length;
  }

  if (ultimo < texto.length) saida.push(...partirAspas(texto.slice(ultimo)));

  return saida;
}

function partirAspas(texto: string): Pedaco[] {
  const normalizado = normalizarAspas(texto);
  const pedacos: Pedaco[] = [];
  const re = new RegExp(RE_CITACAO.source, RE_CITACAO.flags);

  let ultimo = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(normalizado)) !== null) {
    const dupla = m[1];
    const simples = m[2];
    const valor = dupla ?? simples;

    if (!valor || !ehCitacaoValida(valor, dupla === undefined)) continue;

    if (m.index > ultimo) {
      pedacos.push({ tipo: 'texto', valor: normalizado.slice(ultimo, m.index) });
    }
    pedacos.push({ tipo: 'citacao', valor });
    ultimo = m.index + m[0].length;
  }

  if (ultimo < normalizado.length) {
    pedacos.push({ tipo: 'texto', valor: normalizado.slice(ultimo) });
  }

  return pedacos.filter((p) => p.valor.length > 0);
}

/** Remove as aspas de um texto, mantendo o conteúdo. Usado em comparações. */
export function semAspas(texto: string): string {
  return normalizarAspas(texto).replace(/["']/g, '');
}

/** Tira os asteriscos do negrito, mantendo as palavras. Usado em contagem. */
export function semNegrito(texto: string): string {
  return texto.replace(RE_FORTE, '$1');
}
