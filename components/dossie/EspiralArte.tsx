'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { ATOS_DESCRICAO, INFOGRAFICO } from '@/lib/copy';
import { ATOS, type Ato } from '@/lib/movimentos';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

import arte from '@/public/espiral/espiral-base.webp';

/**
 * A espiral do método na arte oficial.
 *
 * Substituiu o SVG que a gente desenhava. O acabamento que o Prompt Mãe Seção 7
 * cobra (traço de pena, textura desgastada, versalete, filete duplo) não sai de
 * `<path>`, sai da mão de quem desenhou.
 *
 * A arte é um slide de 1280 por 712, e isso manda em tudo aqui. No desktop ela
 * cabe inteira e o texto desenhado dentro dela se lê. No celular ela é reduzida
 * a menos de um terço, e aí o mesmo texto fica com quatro pixels e meio, que
 * foi medido e é ilegível. Por isso são duas montagens, e não uma encolhida.
 *
 * **No desktop:** a arte inteira, de ponta a ponta, com as nuvens andando.
 *
 * **No celular:** a arte é cortada no círculo, que passa a ocupar a largura
 * toda, e a câmera entra devagar no quarto que é dele. As três descrições de
 * Ato voltam como texto de verdade abaixo, com a dele acesa e as outras duas
 * apagadas, que é o que a Seção 7 pede e a imagem sozinha não entrega, porque
 * ela vem com os três Atos acesos iguais.
 *
 * As nuvens andam nas duas montagens. Elas estão achatadas no mesmo raster do
 * círculo, então mover só elas exigiria a arte em camadas. O jeito que funciona
 * com um arquivo só: uma segunda cópia por cima, recortada só onde há nuvem,
 * andando devagar. Onde a máscara é transparente só a camada parada aparece, e
 * é por isso que o círculo não desliza junto.
 */

/**
 * O círculo dentro da arte, em fração da imagem. Medido no arquivo de 1280x712.
 *
 * Dois raios porque a imagem não é quadrada: a mesma distância em pixels vale
 * uma fração diferente na horizontal e na vertical.
 */
const CIRCULO = { cx: 0.5, cy: 0.5, rx: 0.18, ry: 0.323 };

/**
 * Faixa angular de cada Ato, a mesma do desenho antigo: horária, com o ângulo
 * decrescendo. 12h é 90, 3h é 0, 6h é -90, 9h é -180.
 */
const FAIXA: Record<Ato, [number, number]> = {
  Partida: [90, 0],
  Iniciação: [0, -180],
  Retorno: [-180, -270],
};

const FRACAO = { começo: 0.22, meio: 0.5, fim: 0.78 } as const;

type Posicao = keyof typeof FRACAO;

/**
 * Pra onde a câmera do celular vai, em fração da caixa cortada.
 *
 * O corte deixa o círculo ocupando a caixa inteira, então o centro de cada
 * quarto cai num ponto previsível dela.
 */
const CAMERA: Record<Ato, { x: number; y: number }> = {
  Partida: { x: 0.68, y: 0.33 },
  Retorno: { x: 0.32, y: 0.33 },
  Iniciação: { x: 0.5, y: 0.72 },
};

/**
 * A marca fica na borda do círculo, não no meio do quarto.
 *
 * Na borda ela lê como posição ao longo da travessia, que é o que a Seção 7
 * quer dizer com "uma marca pequena indica a posição dentro do Ato". No meio do
 * quarto ela vira um ponto solto em cima do numeral romano da arte.
 */
function marcaNaBorda(ato: Ato, posicao: Posicao) {
  const [de, ate] = FAIXA[ato];
  const grau = ((de + (ate - de) * FRACAO[posicao]) * Math.PI) / 180;
  return {
    x: CIRCULO.cx + CIRCULO.rx * Math.cos(grau),
    y: CIRCULO.cy - CIRCULO.ry * Math.sin(grau),
  };
}

/**
 * A largura da área visível, sem a barra de rolagem.
 *
 * `clientWidth` do documento é esse número, e é o que `100vw` não é: `100vw`
 * inclui a barra, e usar ela pra romper a coluna abre uns 8 px de rolagem
 * horizontal na página inteira. Foi medido, e nem `overflow-x: clip` no body
 * nem no html continham.
 *
 * Devolve `null` no servidor e na primeira pintura, e aí a figura fica do
 * tamanho da coluna, que nunca transborda.
 */
function useLarguraDaTela(): number | null {
  const [largura, setLargura] = useState<number | null>(null);

  useEffect(() => {
    const medir = () => setLargura(document.documentElement.clientWidth);
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  return largura;
}

/**
 * Dispara a entrada da câmera quando a figura aparece na tela.
 *
 * Só uma vez. A câmera entrando de novo a cada rolagem viraria enjoo, e o
 * movimento aqui tem um trabalho: apontar o quarto dele. Trabalho feito, ela
 * fica parada.
 */
function useEntrouNaTela<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [entrou, setEntrou] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          setEntrou(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, entrou };
}

export function EspiralArte({ dados }: { dados: DossiePublico['infografico'] }) {
  const alvo = marcaNaBorda(dados.ato, dados.posicao);
  const camera = CAMERA[dados.ato];
  const largura = useLarguraDaTela();
  const { ref, entrou } = useEntrouNaTela<HTMLElement>();

  useEffect(() => {
    rastrear.infograficoPronto();
  }, []);

  return (
    <figure
      ref={ref}
      className={`espiral-arte${entrou ? ' espiral-arte--entrou' : ''}`}
      aria-label={`Círculo do método, com o Ato ${dados.ato} marcado na posição ${dados.posicao}.`}
      style={
        largura === null
          ? undefined
          : { width: largura, marginInline: `calc(50% - ${largura / 2}px)` }
      }
    >
      <div
        className="espiral-arte__palco"
        /*
         * Pra onde a câmera do celular empurra. No desktop a regra que usa
         * estas variáveis não existe, então elas ficam sem efeito.
         */
        style={
          {
            '--camera-x': `${camera.x * 100}%`,
            '--camera-y': `${camera.y * 100}%`,
          } as React.CSSProperties
        }
      >
        <div className="espiral-arte__camera">
          <Image
            src={arte}
            alt=""
            className="espiral-arte__base"
            sizes="(max-width: 760px) 280vw, 1280px"
            priority={false}
          />

          {/*
            A camada das nuvens. Mesma imagem, recortada só onde há nuvem e
            andando. `aria-hidden` porque é a mesma coisa que a de baixo: pra
            quem lê por leitor de tela, anunciar duas vezes é ruído.
          */}
          <Image
            src={arte}
            alt=""
            aria-hidden="true"
            className="espiral-arte__nuvens"
            sizes="(max-width: 760px) 280vw, 1280px"
            priority={false}
          />

          <span
            className="espiral-arte__marca"
            style={{ left: `${alvo.x * 100}%`, top: `${alvo.y * 100}%` }}
          />
        </div>
      </div>

      {/*
        Os três Atos como texto, só no celular. É onde a Seção 7 finalmente é
        cumprida: o dele aceso, os outros dois em opacidade baixa. Na imagem os
        três vêm acesos iguais e escurecer por cima apagaria as descrições, que
        são conteúdo.
      */}
      <div className="espiral-arte__legenda">
        {ATOS.map((a) => (
          <p
            key={a}
            className={`espiral-arte__ato${a === dados.ato ? ' espiral-arte__ato--dele' : ''}`}
          >
            <b>{INFOGRAFICO.atos[a]}</b> {ATOS_DESCRICAO[a]}
          </p>
        ))}
      </div>

      {dados.aposta && (
        <figcaption className="micro espiral-arte__aposta">{INFOGRAFICO.aposta}</figcaption>
      )}
    </figure>
  );
}
