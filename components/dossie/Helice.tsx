'use client';

import { useEffect, useRef } from 'react';

/**
 * A espiral do método em profundidade.
 *
 * Não é o círculo do infográfico repetido como papel de parede. É a coisa que o
 * método descreve: o mesmo gesto voltando numa altura diferente. Voltas
 * empilhadas recuando pro alto, vistas de baixo e de lado, então cada volta é
 * uma elipse e não um círculo.
 *
 * O que faz isso não parecer contorno chapado é perspectiva atmosférica: o que
 * está mais longe é mais fino, mais apagado e mais junto. A volta de baixo é a
 * que ele está vivendo; as de cima somem no escuro, que é o argumento do último
 * parágrafo do dossiê desenhado sem palavra nenhuma.
 *
 * Canvas e não SVG por três razões: o traço fino com alfa variando por segmento
 * é caro em SVG, a rotação contínua e lenta fica suave, e assim ela não divide
 * técnica com o infográfico, que continua sendo a peça de traço.
 */

export type HeliceProps = {
  /** Largura em pixels. A altura sai da proporção. */
  largura?: number;
  /** Quantas voltas aparecem. Acima de 4 vira novelo. */
  voltas?: number;
  /** 0 a 1. Quanto a peça inteira aparece. */
  opacidade?: number;
  /** Radianos por segundo. Precisa ser quase imperceptível. */
  velocidade?: number;
  cor?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Inclinação da câmera. Mais alto, mais de cima; zero, tudo vira linha reta. */
const INCLINACAO = 0.42;
/** Distância da câmera. Menor, perspectiva mais dramática. */
const DISTANCIA = 2.6;
/** Pontos por volta. Abaixo de 90 a elipse fica poligonal. */
const PASSOS = 120;

export function Helice({
  largura = 320,
  voltas = 3.4,
  opacidade = 0.5,
  velocidade = 0.055,
  cor = '201, 168, 92',
  className,
  style,
}: HeliceProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const altura = largura * 1.15;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;
    ctx.scale(dpr, dpr);

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const raio = largura * 0.33;
    const passoVertical = altura * 0.2;
    const cx = largura / 2;
    // Empurra pra baixo: a volta de baixo é a que importa, as de cima somem.
    const cy = altura * 0.68;

    /**
     * Projeta um ponto da hélice na tela. `t` corre ao longo da curva, em voltas.
     * Devolve também a profundidade, que é o que gradua espessura e alfa.
     */
    function projetar(t: number, giro: number) {
      const ang = t * Math.PI * 2 + giro;
      const mundoX = Math.cos(ang) * raio;
      const mundoZ = Math.sin(ang) * raio;
      const mundoY = t * passoVertical;

      // Inclina a cena em torno do eixo horizontal, pra ver o empilhamento.
      const y = mundoY * Math.cos(INCLINACAO) - mundoZ * Math.sin(INCLINACAO);
      const z = mundoY * Math.sin(INCLINACAO) + mundoZ * Math.cos(INCLINACAO);

      const escala = DISTANCIA / (DISTANCIA + z / raio);

      return {
        x: cx + mundoX * escala,
        y: cy - y * escala,
        // 0 perto, 1 longe. Serve pra sumir o que está atrás.
        profundidade: Math.min(Math.max(z / raio / 2 + 0.5, 0), 1),
        // 0 embaixo, 1 no topo. Serve pra sumir as voltas seguintes.
        subida: t / voltas,
      };
    }

    let giro = 0;
    let anterior = performance.now();
    let quadro = 0;
    let visivel = true;

    function desenhar(agora: number) {
      const delta = Math.min((agora - anterior) / 1000, 0.05);
      anterior = agora;
      if (!reduzido && visivel) giro += velocidade * delta;

      ctx!.clearRect(0, 0, largura, altura);

      const total = Math.round(PASSOS * voltas);
      let p = projetar(0, giro);

      for (let i = 1; i <= total; i++) {
        const t = (i / total) * voltas;
        const q = projetar(t, giro);

        // Longe e alto somem juntos. O expoente faz o sumiço acelerar no fim,
        // que é o que dá a sensação de a espiral continuar fora da vista.
        const atras = 1 - p.profundidade * 0.72;
        const acima = Math.pow(1 - p.subida, 1.5);
        const alfa = atras * acima;

        if (alfa > 0.012) {
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(q.x, q.y);
          ctx!.strokeStyle = `rgba(${cor}, ${alfa * opacidade})`;
          ctx!.lineWidth = 0.6 + atras * 1.0;
          ctx!.lineCap = 'round';
          ctx!.stroke();
        }

        p = q;
      }

      if (!reduzido) quadro = requestAnimationFrame(desenhar);
    }

    quadro = requestAnimationFrame(desenhar);

    // Para de girar fora da tela e em aba escondida. Fundo decorativo não
    // justifica queimar bateria de ninguém.
    const obs = new IntersectionObserver((e) => {
      visivel = e[0]?.isIntersecting ?? true;
    });
    obs.observe(canvas);

    const aoTrocarAba = () => {
      visivel = !document.hidden;
    };
    document.addEventListener('visibilitychange', aoTrocarAba);

    return () => {
      cancelAnimationFrame(quadro);
      obs.disconnect();
      document.removeEventListener('visibilitychange', aoTrocarAba);
    };
  }, [largura, voltas, opacidade, velocidade, cor]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', pointerEvents: 'none', ...style }}
    />
  );
}
