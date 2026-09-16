'use client';

import { useEffect, useRef, useState } from 'react';

import { montarGeometria } from './espiral';

/**
 * A espiral do método em traço, sobre o fundo escuro.
 *
 * É o mesmo círculo do infográfico, sem as cores do dualtone: só a linha. Usada
 * na abertura, na tela de espera e no fim do dossiê, ela amarra o percurso
 * inteiro no mesmo símbolo em vez de encher tela com enfeite.
 *
 * No fim do dossiê ela carrega argumento, não decoração: a seta que rompe a
 * borda e sobe pro círculo seguinte é o que o último parágrafo diz em palavras,
 * que esta leitura é uma janela curta e a jornada inteira é outra coisa.
 */

export type ModoEspiral =
  /** Traço correndo em volta, sem fim. Tela de espera. */
  | 'loop'
  /** Desenha uma vez e para. Abertura e fim do dossiê. */
  | 'desenhar'
  /** Já pronta, sem animação. */
  | 'estatica';

export function EspiralTraco({
  tamanho = 180,
  modo = 'estatica',
  comSeta = false,
  opacidade = 1,
  atraso = 0,
  cor = 'var(--gold)',
  aoEntrarNaTela = false,
  className,
  style,
}: {
  tamanho?: number;
  modo?: ModoEspiral;
  comSeta?: boolean;
  opacidade?: number;
  /** Segundos antes de começar a desenhar. */
  atraso?: number;
  cor?: string;
  /**
   * Segura o desenho até a peça entrar na tela. No fim do dossiê ela está muito
   * abaixo da dobra: sem isso ela animaria sozinha enquanto o leitor ainda está
   * no primeiro parágrafo, e ele chegaria numa figura já parada.
   */
  aoEntrarNaTela?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [liberado, setLiberado] = useState(!aoEntrarNaTela);

  useEffect(() => {
    if (!aoEntrarNaTela || liberado) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setLiberado(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [aoEntrarNaTela, liberado]);

  const modoEfetivo: ModoEspiral = liberado ? modo : 'estatica';
  const escondido = aoEntrarNaTela && !liberado;
  // A seta e o círculo seguinte sobem acima do círculo principal, então o
  // viewBox precisa de espaço em cima quando eles aparecem.
  const alturaRelativa = comSeta ? 1.62 : 1;
  const lado = 200;
  const alto = lado * alturaRelativa;
  const centroY = comSeta ? alto - lado / 2 : lado / 2;

  const g = montarGeometria(lado / 2, centroY, lado / 2 - 10);

  const traco = (comprimento: number, ordem: number) =>
    modoEfetivo === 'desenhar'
      ? {
          strokeDasharray: comprimento,
          strokeDashoffset: comprimento,
          animation: `desenhar-traco 1.4s ease-out ${atraso + ordem * 0.35}s forwards`,
        }
      : undefined;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${lado} ${alto}`}
      width={tamanho}
      height={tamanho * alturaRelativa}
      aria-hidden="true"
      className={className}
      style={{
        opacity: escondido ? 0 : opacidade,
        overflow: 'visible',
        transition: 'opacity 200ms linear',
        ...style,
      }}
    >
      {modoEfetivo === 'loop' ? (
        <path
          className="traco-lento"
          d={g.borda}
          fill="none"
          stroke={cor}
          strokeWidth={1.25}
          pathLength={1}
          strokeDasharray="0.62 0.38"
        />
      ) : (
        <path
          d={g.borda}
          fill="none"
          stroke={cor}
          strokeWidth={1.25}
          style={traco(g.circunferencia, 0)}
        />
      )}

      <line
        x1={g.horizontal.x1}
        y1={g.horizontal.y1}
        x2={g.horizontal.x2}
        y2={g.horizontal.y2}
        stroke={cor}
        strokeWidth={1}
        opacity={0.75}
        style={traco(g.horizontal.comprimento, 1)}
      />

      <line
        x1={g.vertical.x1}
        y1={g.vertical.y1}
        x2={g.vertical.x2}
        y2={g.vertical.y2}
        stroke={cor}
        strokeWidth={1}
        opacity={0.75}
        style={traco(g.vertical.comprimento, 1.4)}
      />

      {comSeta && (
        <>
          <path
            d={g.seta.caminho}
            fill="none"
            stroke={cor}
            strokeWidth={1.25}
            style={traco(g.seta.comprimento, 2)}
          />
          <path
            d={g.seta.ponta}
            fill={cor}
            style={
              modoEfetivo === 'desenhar'
                ? { opacity: 0, animation: `aparecer 0.4s ease-out ${atraso + 2.9}s forwards` }
                : undefined
            }
          />
          <circle
            cx={g.proximo.cx}
            cy={g.proximo.cy}
            r={g.proximo.r}
            fill="none"
            stroke={cor}
            strokeWidth={1.25}
            opacity={0.5}
            style={traco(g.proximo.circunferencia, 2.4)}
          />
        </>
      )}
    </svg>
  );
}
