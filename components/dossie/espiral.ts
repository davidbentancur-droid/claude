import type { Ato } from '@/lib/movimentos';

/**
 * Geometria do círculo do método. Prompt Mãe Seção 7.
 *
 * Uma linha horizontal corta o círculo ao meio. A metade de baixo é bloco único
 * e mais denso, a Iniciação. A metade de cima se divide em dois quartos por uma
 * linha vertical: superior esquerdo é Partida, superior direito é Retorno. Uma
 * seta sai do quarto do Retorno, rompe a borda e sobe pra um círculo seguinte.
 *
 * Sem a seta vira roda que repete, e o método não é isso. É espiral: o mesmo
 * gesto voltando mais fundo, numa altura diferente.
 *
 * Coordenadas em ângulo de matemática (anti-horário, y pra cima) e convertidas
 * pra tela na hora de escrever o ponto. O sentido da travessia é
 * Partida (12h para 9h), Iniciação (9h por baixo até 3h), Retorno (3h para 12h).
 */

export type Geometria = ReturnType<typeof montarGeometria>;

const GRAU = Math.PI / 180;

function ponto(cx: number, cy: number, r: number, grau: number): [number, number] {
  return [cx + r * Math.cos(grau * GRAU), cy - r * Math.sin(grau * GRAU)];
}

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

function setor(
  cx: number,
  cy: number,
  r: number,
  de: number,
  ate: number,
): string {
  const [x1, y1] = ponto(cx, cy, r, de);
  const [x2, y2] = ponto(cx, cy, r, ate);
  const grande = Math.abs(ate - de) > 180 ? 1 : 0;
  // sweep 0: anti-horário na tela, que é o sentido da travessia.
  return `M ${fmt(cx)},${fmt(cy)} L ${fmt(x1)},${fmt(y1)} A ${fmt(r)},${fmt(r)} 0 ${grande} 0 ${fmt(x2)},${fmt(y2)} Z`;
}

/** Fração de percurso dentro do setor, por posição declarada. */
const FRACAO = { começo: 0.22, meio: 0.5, fim: 0.78 } as const;

export type Posicao = keyof typeof FRACAO;

/** Faixa angular de cada Ato, no sentido da travessia. */
const FAIXA: Record<Ato, [number, number]> = {
  Partida: [90, 180],
  Iniciação: [180, 360],
  Retorno: [360, 450],
};

export function montarGeometria(cx: number, cy: number, r: number) {
  const [xe, ye] = ponto(cx, cy, r, 180);
  const [xd, yd] = ponto(cx, cy, r, 0);
  const [xt, yt] = ponto(cx, cy, r, 90);

  // O círculo seguinte, acima e à direita, na altura de cima da espiral.
  const proximoR = r * 0.36;
  const proximoCx = cx + r * 0.95;
  const proximoCy = cy - r * 1.58;

  // A seta sai do quarto do Retorno, rompe a borda e entra pela base do círculo
  // seguinte. Saída e chegada são pontos reais das duas circunferências, e a
  // ponta é calculada pela direção de chegada. Curva simples, sem S.
  const [sx, sy] = ponto(cx, cy, r, 55);
  const [ex, ey] = ponto(proximoCx, proximoCy, proximoR, 250);

  const dx = ex - sx;
  const dy = ey - sy;
  const comprimento = Math.hypot(dx, dy);

  // Controles entre os dois pontos, empurrados um pouco pra fora, o que dá a
  // curvatura de quem está saindo de uma volta e entrando na seguinte.
  const c1x = sx + dx * 0.42 + comprimento * 0.16;
  const c1y = sy + dy * 0.34;
  const c2x = sx + dx * 0.72 + comprimento * 0.1;
  const c2y = sy + dy * 0.76;

  const dirX = (ex - c2x) / Math.hypot(ex - c2x, ey - c2y);
  const dirY = (ey - c2y) / Math.hypot(ex - c2x, ey - c2y);
  const perpX = -dirY;
  const perpY = dirX;

  const base = r * 0.1;
  const meia = r * 0.048;
  const bx = ex - dirX * base;
  const by = ey - dirY * base;

  return {
    cx,
    cy,
    r,
    circunferencia: 2 * Math.PI * r,

    /** Borda do círculo, desenhada como traço. */
    borda: `M ${fmt(xd)},${fmt(yd)} A ${fmt(r)},${fmt(r)} 0 1 0 ${fmt(xe)},${fmt(ye)} A ${fmt(r)},${fmt(r)} 0 1 0 ${fmt(xd)},${fmt(yd)}`,

    /** Corta o círculo ao meio. */
    horizontal: { x1: xe, y1: ye, x2: xd, y2: yd, comprimento: r * 2 },

    /** Divide só a metade de cima. */
    vertical: { x1: cx, y1: cy, x2: xt, y2: yt, comprimento: r },

    setores: {
      Partida: setor(cx, cy, r, 90, 180),
      Retorno: setor(cx, cy, r, 0, 90),
      Iniciação: setor(cx, cy, r, 180, 360),
    } satisfies Record<Ato, string>,

    /** Onde o nome do Ato aceso é escrito, dentro do setor. */
    rotulos: {
      Partida: ponto(cx, cy, r * 0.54, 135),
      Retorno: ponto(cx, cy, r * 0.54, 45),
      Iniciação: ponto(cx, cy, r * 0.5, 270),
    } satisfies Record<Ato, [number, number]>,

    seta: {
      caminho: `M ${fmt(sx)},${fmt(sy)} C ${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(ex)},${fmt(ey)}`,
      ponta: `M ${fmt(ex)},${fmt(ey)} L ${fmt(bx + perpX * meia)},${fmt(by + perpY * meia)} L ${fmt(bx - perpX * meia)},${fmt(by - perpY * meia)} Z`,
      // Folga na dasharray, senão a ponta aparece antes do traço chegar nela.
      comprimento: comprimento * 1.35,
    },

    proximo: { cx: proximoCx, cy: proximoCy, r: proximoR, circunferencia: 2 * Math.PI * proximoR },
  };
}

/**
 * Ponto de posição dentro do Ato: começo, meio ou fim do arco daquele setor.
 *
 * Fica sobre a borda, não no meio do setor. Duas razões: na borda ele lê como
 * posição ao longo da travessia, que é o que a marca significa, e no meio ele
 * colidia com o nome do Ato, que também é escrito no eixo central do setor.
 */
export function marcaDePosicao(
  g: Geometria,
  ato: Ato,
  posicao: Posicao,
): [number, number] {
  const [de, ate] = FAIXA[ato];
  const grau = de + (ate - de) * FRACAO[posicao];
  return ponto(g.cx, g.cy, g.r, grau);
}

/**
 * Dualtone oficial por Ato. Prompt Mãe Seção 7, valores literais.
 *
 * Em hexadecimal e não em `var(--token)` de propósito: a placa é exportada em
 * PNG por canvas, e variável de CSS não resolve dentro de SVG serializado. Estas
 * cores são do método, não do tema da página, então fixar aqui é honesto.
 */
export const DUALTONE: Record<Ato, [string, string]> = {
  Partida: ['#A8836B', '#7E9BB8'],
  Iniciação: ['#A899C4', '#BFC08C'],
  Retorno: ['#D8C27A', '#97B392'],
};

export const PAPEL = '#F2E8D5';
export const TINTA = '#1E1B18';
