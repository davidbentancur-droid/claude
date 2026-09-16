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
 * Três coisas fazem isso ler como volume e não como arame chapado:
 *
 * 1. Ordem de pintura do mais longe pro mais perto. Desenhando na ordem da
 *    curva, a parte de trás de uma volta cobria a parte da frente da seguinte,
 *    que é o erro que mais denuncia desenho sem profundidade.
 * 2. Oclusão. A curva é quebrada em arcos contínuos, e cada arco é traçado
 *    primeiro largo na cor do fundo e depois fino na cor da linha. O traço
 *    largo apaga o que está atrás, então a linha da frente corta a de trás como
 *    um corpo opaco faria. Por arco e não por segmento: por segmento, a faca
 *    apagava o vizinho da própria linha e a curva saía pontilhada.
 * 3. Perspectiva atmosférica. O que está longe é mais fino e mais apagado.
 *
 * Canvas e não SVG por três razões: alfa e espessura por segmento são caros em
 * SVG, a rotação contínua fica suave, e assim ela não divide técnica com o
 * infográfico, que continua sendo a peça de traço.
 */

export type HeliceProps = {
  /** Largura em pixels. A altura sai da proporção. */
  largura?: number;
  /** Quantas voltas aparecem. */
  voltas?: number;
  /** 0 a 1. Quanto a peça inteira aparece. */
  opacidade?: number;
  /** Radianos por segundo. Na abertura precisa ser quase imperceptível. */
  velocidade?: number;
  /** Cor da linha, em componentes rgb. */
  cor?: string;
  /** Cor do fundo atrás dela. É com ela que a oclusão é feita. */
  fundo?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Inclinação da câmera. Mais baixo, mais de lado e mais achatada a elipse. */
const INCLINACAO = 0.38;
/** Distância da câmera em raios. Menor, perspectiva mais forte. */
const DISTANCIA = 2.1;
/** Pontos por volta. Abaixo de 90 a elipse fica poligonal. */
const PASSOS = 150;

type Ponto = { x: number; y: number; profundidade: number; subida: number };

export function Helice({
  largura = 320,
  voltas = 3.4,
  opacidade = 0.5,
  velocidade = 0.055,
  cor = '201, 168, 92',
  fundo = '#0E0C0A',
  className,
  style,
}: HeliceProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const altura = largura * 1.25;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = largura * dpr;
    canvas.height = altura * dpr;
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;
    ctx.scale(dpr, dpr);

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const raio = largura * 0.34;
    const passoVertical = altura * 0.19;
    const cx = largura / 2;
    const cy = altura * 0.72;

    function projetar(t: number, giro: number): Ponto {
      const ang = t * Math.PI * 2 + giro;
      const mundoX = Math.cos(ang) * raio;
      const mundoZ = Math.sin(ang) * raio;
      const mundoY = t * passoVertical;

      const y = mundoY * Math.cos(INCLINACAO) - mundoZ * Math.sin(INCLINACAO);
      const z = mundoY * Math.sin(INCLINACAO) + mundoZ * Math.cos(INCLINACAO);

      const escala = DISTANCIA / (DISTANCIA + z / raio);

      return {
        x: cx + mundoX * escala,
        y: cy - y * escala,
        profundidade: Math.min(Math.max(z / raio / 2 + 0.5, 0), 1),
        subida: t / voltas,
      };
    }

    let giro = 0;
    let anterior = performance.now();
    let quadro = 0;
    let visivel = true;

    const total = Math.round(PASSOS * voltas);

    function desenhar(agora: number) {
      const delta = Math.min((agora - anterior) / 1000, 0.05);
      anterior = agora;
      if (!reduzido && visivel) giro += velocidade * delta;

      ctx!.clearRect(0, 0, largura, altura);

      const pontos: Ponto[] = new Array(total + 1);
      for (let i = 0; i <= total; i++) pontos[i] = projetar((i / total) * voltas, giro);

      /**
       * Quebra a curva em arcos contínuos, cortando onde ela cruza o meio da
       * profundidade. Numa hélice vista de lado isso dá a metade de trás e a
       * metade da frente de cada volta, alternadas.
       *
       * Fatiar assim é o que permite a faca de oclusão funcionar: ela é aplicada
       * no arco inteiro de uma vez, antes das linhas dele, então nunca apaga o
       * vizinho da própria linha. Aplicada segmento a segmento, apagava, e a
       * curva saía pontilhada.
       */
      const arcos: Ponto[][] = [];
      let atual: Ponto[] = [pontos[0]];

      for (let i = 1; i <= total; i++) {
        atual.push(pontos[i]);
        const cruzou =
          (pontos[i - 1].profundidade - 0.5) * (pontos[i].profundidade - 0.5) < 0;
        if (cruzou) {
          arcos.push(atual);
          atual = [pontos[i]];
        }
      }
      if (atual.length > 1) arcos.push(atual);

      const medias = arcos.map((arco) => {
        let d = 0;
        for (const pt of arco) d += pt.profundidade;
        return { arco, profundidade: d / arco.length };
      });

      // Do fundo pra frente, pra o que está na frente cortar o que está atrás.
      medias.sort((m, n) => n.profundidade - m.profundidade);

      for (const { arco, profundidade } of medias) {
        const perto = 1 - profundidade;
        const espessura = 0.55 + perto * 1.45;

        // A faca: o arco inteiro traçado largo na cor do fundo, antes das linhas
        // dele. Só perto, porque no fundo da cena não há nada atrás pra cortar.
        if (perto > 0.4) {
          ctx!.beginPath();
          ctx!.moveTo(arco[0].x, arco[0].y);
          for (let i = 1; i < arco.length; i++) ctx!.lineTo(arco[i].x, arco[i].y);
          ctx!.strokeStyle = fundo;
          ctx!.lineWidth = espessura + 3.4;
          ctx!.lineCap = 'round';
          ctx!.lineJoin = 'round';
          ctx!.stroke();
        }

        // As linhas, segmento a segmento, pra a opacidade variar ao longo do
        // arco em vez de ficar chapada nele inteiro.
        for (let i = 1; i < arco.length; i++) {
          const a = arco[i - 1];
          const b = arco[i];
          const pertoLocal = 1 - (a.profundidade + b.profundidade) / 2;
          // As voltas de cima somem. O expoente acelera o sumiço no fim, o que
          // dá a sensação de a espiral continuar fora da vista.
          const acima = Math.pow(1 - (a.subida + b.subida) / 2, 1.45);
          const alfa = (0.2 + pertoLocal * 0.8) * acima * opacidade;

          if (alfa <= 0.008) continue;

          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.strokeStyle = `rgba(${cor}, ${alfa})`;
          ctx!.lineWidth = 0.55 + pertoLocal * 1.45;
          ctx!.lineCap = 'round';
          ctx!.stroke();
        }
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
  }, [largura, voltas, opacidade, velocidade, cor, fundo]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', pointerEvents: 'none', ...style }}
    />
  );
}
