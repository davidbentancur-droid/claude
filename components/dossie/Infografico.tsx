'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';

import { INFOGRAFICO } from '@/lib/copy';
import { ATOS } from '@/lib/movimentos';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

import {
  DUALTONE,
  marcaDePosicao,
  montarGeometria,
  PAPEL,
  TINTA,
  type Posicao,
} from './espiral';

/**
 * A placa. Planejamento Seção 6.
 *
 * É a única coisa memorável da página, e por isso tudo o mais fica quieto.
 * Dispara uma vez, quando entra 60% no viewport, e depois nada mais se move.
 * Nenhum loop, nenhum brilho.
 */

type Dados = DossiePublico['infografico'];

type Layout = {
  w: number;
  h: number;
  cx: number;
  cy: number;
  r: number;
  painel: { x: number; y: number; w: number };
  /** Sem arte de card, o nome centrado embaixo do círculo fecha a composição. */
  centrado?: boolean;
};

/**
 * Quatro layouts, e não dois, porque a placa muda de proporção conforme exista
 * ou não a arte oficial do card. Sem arte, a versão larga deixaria metade da
 * placa vazia com uma palavra solta no meio, que lê como imagem quebrada.
 * Quando os cards chegarem, `tem_card` vira true e a placa larga volta.
 */
const LAYOUTS = {
  largoComCard: { w: 720, h: 420, cx: 186, cy: 258, r: 114, painel: { x: 392, y: 76, w: 300 } },
  largoSemCard: { w: 620, h: 400, cx: 180, cy: 244, r: 108, painel: { x: 352, y: 232, w: 244 } },
  estreitoComCard: { w: 360, h: 600, cx: 180, cy: 220, r: 98, painel: { x: 30, y: 362, w: 300 } },
  estreitoSemCard: {
    w: 360,
    h: 440,
    cx: 180,
    cy: 228,
    r: 100,
    painel: { x: 180, y: 380, w: 300 },
    centrado: true,
  },
} satisfies Record<string, Layout>;

/**
 * Quebra de linha em SVG não existe, então vai na mão. A largura média de
 * caractere é estimativa por fonte: serve pra decidir onde cortar, e o texto
 * renderizado continua sendo medido pelo navegador.
 */
function quebrar(texto: string, larguraMax: number, tamanho: number, fator = 0.46): string[] {
  const porLinha = Math.max(1, Math.floor(larguraMax / (tamanho * fator)));
  const linhas: string[] = [];
  let atual = '';

  for (const palavra of texto.split(' ')) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > porLinha && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export function Infografico({ dados }: { dados: Dados }) {
  const [movel, setMovel] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const aplicar = () => setMovel(mq.matches);
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, []);

  return (
    <figure style={{ margin: '2.5rem 0' }}>
      <Placa dados={dados} movel={movel} key={movel ? 'movel' : 'largo'} />
    </figure>
  );
}

function Placa({ dados, movel }: { dados: Dados; movel: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pronto, setPronto] = useState(false);

  const temCard = dados.movimento.tem_card;
  const L: Layout = movel
    ? temCard
      ? LAYOUTS.estreitoComCard
      : LAYOUTS.estreitoSemCard
    : temCard
      ? LAYOUTS.largoComCard
      : LAYOUTS.largoSemCard;

  const g = montarGeometria(L.cx, L.cy, L.r);
  const [corA, corB] = DUALTONE[dados.ato];
  const [mx, my] = marcaDePosicao(g, dados.ato, dados.posicao as Posicao);
  const [rx, ry] = g.rotulos[dados.ato];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const q = gsap.utils.selector(svg);
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const estadoFinal = () => {
      gsap.set(q('.traco'), { strokeDashoffset: 0 });
      gsap.set(q('.setor-apagado'), { opacity: 0.25 });
      gsap.set(q('.setor-aceso'), { opacity: 1 });
      gsap.set(q('.rotulo-ato'), { opacity: 1 });
      gsap.set(q('.marca'), { opacity: 1, scale: 1 });
      gsap.set(q('.seta'), { opacity: 1, strokeDashoffset: 0 });
      gsap.set(q('.ponta'), { opacity: 1 });
      gsap.set(q('.proximo'), { opacity: 0.5, strokeDashoffset: 0 });
      gsap.set(q('.card'), { opacity: 1, y: 0 });
      setPronto(true);
    };

    if (reduzido) {
      estadoFinal();
      rastrear.infograficoPronto();
      return;
    }

    gsap.set(q('.traco'), { strokeDashoffset: (i, alvo) => Number(alvo.dataset.len) });
    gsap.set(q('.setor-apagado, .setor-aceso'), { opacity: 0 });
    gsap.set(q('.rotulo-ato, .marca, .seta, .ponta, .proximo'), { opacity: 0 });
    gsap.set(q('.marca'), { scale: 0, transformOrigin: '50% 50%' });
    gsap.set(q('.card'), { opacity: 0, y: 8 });

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        setPronto(true);
        rastrear.infograficoPronto();
      },
    });

    tl.to(q('.borda'), { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
      .to(q('.linha-h'), { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 1.0)
      .to(q('.linha-v'), { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 1.2)
      .to(q('.setor-apagado'), { opacity: 0.25, duration: 0.6, ease: 'none' }, 1.6)
      .to(q('.setor-aceso'), { opacity: 1, duration: 0.7, ease: 'power3.out' }, 2.2)
      .to(q('.rotulo-ato'), { opacity: 1, duration: 0.5, ease: 'power2.out' }, 2.4)
      .to(q('.marca'), { opacity: 1, scale: 1.3, duration: 0.25, ease: 'back.out(3)' }, 2.9)
      .to(q('.marca'), { scale: 1, duration: 0.15, ease: 'power2.out' }, 3.15)
      .to(q('.seta'), { opacity: 1, strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 3.3)
      .to(q('.ponta'), { opacity: 1, duration: 0.2 }, 3.75)
      .to(q('.proximo'), { opacity: 0.5, strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 3.4)
      .to(q('.card'), { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 3.8);

    // 60% é o que o planejamento pede, mas numa placa mais alta que a janela
    // esse limiar nunca é alcançado e a animação não roda nunca. O teto desce
    // pro que cabe na tela quando for o caso.
    const altura = svg.getBoundingClientRect().height || 1;
    const limite = Math.min(0.6, (window.innerHeight * 0.85) / altura);

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          tl.play();
          obs.disconnect();
        }
      },
      { threshold: limite },
    );
    obs.observe(svg);

    return () => {
      obs.disconnect();
      tl.kill();
    };
  }, [movel, dados.ato, dados.posicao]);

  const gradId = `dual-${dados.ato}-${movel ? 'm' : 'd'}`;
  const apagados = ATOS.filter((a) => a !== dados.ato);

  return (
    <>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${L.w} ${L.h}`}
        width="100%"
        role="img"
        aria-label={`Círculo do método com o Ato ${dados.ato} aceso, posição ${dados.posicao}, e o Movimento ${dados.movimento.nome}.`}
        style={{ display: 'block', background: PAPEL, maxWidth: '100%' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={corA} />
            <stop offset="100%" stopColor={corB} />
          </linearGradient>
        </defs>

        {/* Setores apagados. Opacidade baixa, sem nome. */}
        {apagados.map((a) => (
          <path key={a} className="setor-apagado" d={g.setores[a]} fill={TINTA} opacity={0} />
        ))}

        {/* O Ato dele, aceso, com o dualtone oficial. */}
        <path
          className="setor-aceso"
          d={g.setores[dados.ato]}
          fill={`url(#${gradId})`}
          opacity={0}
        />

        <path
          className="traco borda"
          data-len={g.circunferencia}
          d={g.borda}
          fill="none"
          stroke={TINTA}
          strokeWidth={1.5}
          strokeDasharray={g.circunferencia}
        />

        <line
          className="traco linha-h"
          data-len={g.horizontal.comprimento}
          x1={g.horizontal.x1}
          y1={g.horizontal.y1}
          x2={g.horizontal.x2}
          y2={g.horizontal.y2}
          stroke={TINTA}
          strokeWidth={1.5}
          strokeDasharray={g.horizontal.comprimento}
        />

        <line
          className="traco linha-v"
          data-len={g.vertical.comprimento}
          x1={g.vertical.x1}
          y1={g.vertical.y1}
          x2={g.vertical.x2}
          y2={g.vertical.y2}
          stroke={TINTA}
          strokeWidth={1.5}
          strokeDasharray={g.vertical.comprimento}
        />

        <text
          className="rotulo-ato"
          x={rx}
          y={ry}
          textAnchor="middle"
          fontFamily="var(--fonte-display), Georgia, serif"
          fontSize={movel ? 19 : 21}
          fill={TINTA}
          opacity={0}
        >
          {dados.ato}
        </text>

        {/* Sobre a borda. O anel em creme faz ela sobreviver tanto ao setor
            aceso quanto ao papel, sem precisar de sombra. */}
        <circle
          className="marca"
          cx={mx}
          cy={my}
          r={5.5}
          fill={TINTA}
          stroke={PAPEL}
          strokeWidth={2}
          opacity={0}
        />

        <path
          className="traco seta"
          data-len={g.seta.comprimento}
          d={g.seta.caminho}
          fill="none"
          stroke={TINTA}
          strokeWidth={1.5}
          strokeDasharray={g.seta.comprimento}
          opacity={0}
        />
        <path className="ponta" d={g.seta.ponta} fill={TINTA} opacity={0} />

        <circle
          className="traco proximo"
          data-len={g.proximo.circunferencia}
          cx={g.proximo.cx}
          cy={g.proximo.cy}
          r={g.proximo.r}
          fill="none"
          stroke={TINTA}
          strokeWidth={1.5}
          strokeDasharray={g.proximo.circunferencia}
          opacity={0}
        />

        <CardMovimento
          dados={dados}
          caixa={L.painel}
          movel={movel}
          centrado={L.centrado ?? false}
        />
      </svg>

      {pronto && <BotaoExportar svgRef={svgRef} dados={dados} largura={L.w} altura={L.h} />}
    </>
  );
}

type Caixa = { x: number; y: number; w: number };

/**
 * Card do Movimento. Prompt Mãe Seção 7: usar a arte oficial, e quando ela não
 * existir, mostrar só o nome em tipografia. Nunca gerar arte nova aqui.
 */
function CardMovimento({
  dados,
  caixa,
  movel,
  centrado,
}: {
  dados: Dados;
  caixa: Caixa;
  movel: boolean;
  centrado: boolean;
}) {
  const { movimento, aposta } = dados;
  const alturaArte = caixa.w * 0.5625; // paisagem 16:9
  const ancora = centrado ? 'middle' : 'start';

  const tamanhoNome = movel ? 30 : 34;
  const linhasNome = quebrar(movimento.nome, caixa.w, tamanhoNome);
  const alturaLinha = tamanhoNome * 1.06;

  // Base do texto: abaixo da arte quando ela existe, senão a partir do topo da
  // caixa, que nesse caso já está alinhada com o meio do círculo.
  let y = caixa.y + (movimento.tem_card ? alturaArte + tamanhoNome + 8 : tamanhoNome * 0.8);

  const linhas: React.ReactNode[] = [];

  linhasNome.forEach((linha, i) => {
    linhas.push(
      <text
        key={`n${i}`}
        x={caixa.x}
        y={y + i * alturaLinha}
        textAnchor={ancora}
        fontFamily="var(--fonte-display), Georgia, serif"
        fontSize={tamanhoNome}
        fill={TINTA}
      >
        {linha}
      </text>,
    );
  });

  y += (linhasNome.length - 1) * alturaLinha;

  if (movimento.frase_card) {
    for (const [i, linha] of quebrar(movimento.frase_card, caixa.w, 14, 0.52).entries()) {
      linhas.push(
        <text
          key={`f${i}`}
          x={caixa.x}
          y={y + 26 + i * 19}
          textAnchor={ancora}
          fontFamily="var(--fonte-body), system-ui, sans-serif"
          fontSize={14}
          fill={TINTA}
          opacity={0.75}
        >
          {linha}
        </text>,
      );
      y = Math.max(y, y + (i === 0 ? 0 : 19));
    }
    y += 26;
  }

  if (aposta) {
    for (const [i, linha] of quebrar(INFOGRAFICO.aposta, caixa.w, 13, 0.52).entries()) {
      linhas.push(
        <text
          key={`a${i}`}
          x={caixa.x}
          y={y + 26 + i * 18}
          textAnchor={ancora}
          fontFamily="var(--fonte-body), system-ui, sans-serif"
          fontSize={13}
          fill={TINTA}
          opacity={0.6}
        >
          {linha}
        </text>,
      );
    }
  }

  return (
    <g className="card" opacity={0}>
      {movimento.tem_card && (
        <image
          href={`/cards/${movimento.slug}.webp`}
          x={caixa.x}
          y={caixa.y}
          width={caixa.w}
          height={alturaArte}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      {linhas}
    </g>
  );
}

/**
 * Exporta a placa em PNG 2x. Único elemento de compartilhamento da página, e
 * existe porque o cara manda no WhatsApp.
 *
 * Redesenha em Canvas2D em vez de serializar o SVG: `Path2D` aceita o mesmo
 * path do SVG, e `fillText` usa as fontes já carregadas no documento, o que um
 * SVG serializado dentro de <img> não consegue.
 */
function BotaoExportar({
  svgRef,
  dados,
  largura,
  altura,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  dados: Dados;
  largura: number;
  altura: number;
}) {
  const [ocupado, setOcupado] = useState(false);

  async function exportar() {
    const svg = svgRef.current;
    if (!svg) return;
    setOcupado(true);

    try {
      await document.fonts.ready;

      const escala = 2;
      const canvas = document.createElement('canvas');
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(escala, escala);
      ctx.fillStyle = PAPEL;
      ctx.fillRect(0, 0, largura, altura);

      const estilo = getComputedStyle(document.documentElement);
      const display = estilo.getPropertyValue('--fonte-display').trim() || 'Georgia';
      const corpo = estilo.getPropertyValue('--fonte-body').trim() || 'sans-serif';

      for (const el of Array.from(svg.querySelectorAll<SVGElement>('path, line, circle, text'))) {
        const opacidade = Number(el.getAttribute('opacity') ?? '1');
        const computado = Number(getComputedStyle(el).opacity);
        ctx.globalAlpha = Number.isFinite(computado) ? computado : opacidade;

        if (el.tagName === 'text') {
          const tamanho = el.getAttribute('font-size') ?? '16';
          const familia = el.getAttribute('font-family')?.includes('display')
            ? `${display}, Georgia, serif`
            : `${corpo}, system-ui, sans-serif`;
          ctx.font = `${tamanho}px ${familia}`;
          ctx.fillStyle = el.getAttribute('fill') ?? TINTA;
          ctx.textAlign = (el.getAttribute('text-anchor') === 'middle' ? 'center' : 'start') as CanvasTextAlign;
          ctx.fillText(
            el.textContent ?? '',
            Number(el.getAttribute('x') ?? 0),
            Number(el.getAttribute('y') ?? 0),
          );
          continue;
        }

        const preenchimento = el.getAttribute('fill');
        const traco = el.getAttribute('stroke');

        let caminho: Path2D;
        if (el.tagName === 'path') {
          caminho = new Path2D(el.getAttribute('d') ?? '');
        } else if (el.tagName === 'line') {
          caminho = new Path2D();
          caminho.moveTo(Number(el.getAttribute('x1')), Number(el.getAttribute('y1')));
          caminho.lineTo(Number(el.getAttribute('x2')), Number(el.getAttribute('y2')));
        } else {
          caminho = new Path2D();
          caminho.arc(
            Number(el.getAttribute('cx')),
            Number(el.getAttribute('cy')),
            Number(el.getAttribute('r')),
            0,
            Math.PI * 2,
          );
        }

        if (preenchimento && preenchimento !== 'none') {
          // O gradiente do setor aceso é o único fill que não é cor sólida.
          if (preenchimento.startsWith('url(')) {
            const [a, b] = DUALTONE[dados.ato];
            const grad = ctx.createLinearGradient(0, altura, largura, 0);
            grad.addColorStop(0, a);
            grad.addColorStop(1, b);
            ctx.fillStyle = grad;
          } else {
            ctx.fillStyle = preenchimento;
          }
          ctx.fill(caminho);
        }

        if (traco && traco !== 'none') {
          ctx.strokeStyle = traco;
          ctx.lineWidth = Number(el.getAttribute('stroke-width') ?? 1);
          ctx.stroke(caminho);
        }
      }

      ctx.globalAlpha = 1;

      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dados.movimento.slug || 'leitura'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <figcaption style={{ marginTop: '0.75rem' }}>
      <button
        type="button"
        onClick={exportar}
        disabled={ocupado}
        className="micro"
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
          color: 'var(--ink-2)',
        }}
      >
        {INFOGRAFICO.exportar}
      </button>
    </figcaption>
  );
}
