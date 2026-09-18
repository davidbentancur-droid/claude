'use client';

import Image from 'next/image';

import { useEffect, useState } from 'react';

import { INFOGRAFICO } from '@/lib/copy';
import type { Ato } from '@/lib/movimentos';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

import arte from '@/public/espiral/espiral-base.webp';

/**
 * A espiral do método na arte oficial.
 *
 * Substitui o SVG que a gente desenhava. O acabamento que o Prompt Mãe Seção 7
 * cobra (traço de pena, textura desgastada, versalete, filete duplo) não sai de
 * `<path>`, sai da mão de quem desenhou, e agora existe.
 *
 * Duas coisas a arte trouxe junto, e as duas estão tratadas aqui.
 *
 * As nuvens se movem, que foi o pedido. Elas estão achatadas no mesmo raster do
 * círculo, então mover só elas exigiria a arte em camadas. O jeito que funciona
 * com um arquivo só: uma segunda cópia da imagem por cima, mascarada nas duas
 * bordas, que é exatamente onde as nuvens estão, andando devagar em sentido
 * contrário. No meio, onde está o círculo, a máscara é transparente e só a
 * camada parada aparece, então o círculo nunca sai do lugar.
 *
 * E os três Atos vêm acesos iguais, o que contraria a Seção 7: o Ato dele fica
 * aceso e nomeado, os outros dois em opacidade baixa. Sem a arte em três
 * estados, o que dá pra fazer com honestidade é marcar o quarto dele por cima,
 * e é o que a marca de posição faz. Escurecer os outros dois por cima apagaria
 * junto as descrições que estão escritas ali, que são conteúdo e não enfeite.
 */

/**
 * O círculo dentro da arte, em fração da imagem. Medido no arquivo de 1280x712.
 *
 * Dois raios porque a imagem não é quadrada: a mesma distância em pixels vale
 * uma fração diferente na horizontal e na vertical.
 */
const CIRCULO = { cx: 0.5, cy: 0.5, rx: 0.18, ry: 0.323 };

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
 * Faixa angular de cada Ato, a mesma do desenho antigo: horária, com o ângulo
 * decrescendo. 12h é 90, 3h é 0, 6h é -90, 9h é -180.
 */
const FAIXA: Record<Ato, [number, number]> = {
  Partida: [90, 0],
  Iniciação: [0, -180],
  Retorno: [-180, -270],
};

const FRACAO = { começo: 0.22, meio: 0.5, fim: 0.78 } as const;

/**
 * A marca fica na borda do círculo, não no meio do quarto.
 *
 * Na borda ela lê como posição ao longo da travessia, que é o que a Seção 7
 * quer dizer com "uma marca pequena indica a posição dentro do Ato". No meio
 * do quarto ela vira um ponto solto em cima do numeral romano da arte.
 */
function marcaNaBorda(ato: Ato, posicao: keyof typeof FRACAO) {
  const [de, ate] = FAIXA[ato];
  const grau = ((de + (ate - de) * FRACAO[posicao]) * Math.PI) / 180;
  return {
    x: CIRCULO.cx + CIRCULO.rx * Math.cos(grau),
    y: CIRCULO.cy - CIRCULO.ry * Math.sin(grau),
  };
}

export function EspiralArte({ dados }: { dados: DossiePublico['infografico'] }) {
  const alvo = marcaNaBorda(dados.ato, dados.posicao);
  const largura = useLarguraDaTela();

  useEffect(() => {
    rastrear.infograficoPronto();
  }, []);

  return (
    <figure
      className="espiral-arte"
      aria-label={`Círculo do método, com o Ato ${dados.ato} marcado na posição ${dados.posicao}.`}
      style={
        largura === null
          ? undefined
          : { width: largura, marginInline: `calc(50% - ${largura / 2}px)` }
      }
    >
      <div className="espiral-arte__palco">
        <Image
          src={arte}
          alt=""
          className="espiral-arte__base"
          sizes="(max-width: 1280px) 100vw, 1280px"
          priority={false}
        />

        {/*
          A camada das nuvens. Mesma imagem, mascarada nas bordas e andando.
          `aria-hidden` porque ela é a mesma coisa que a de baixo: pra quem lê
          por leitor de tela, anunciar duas vezes é ruído.
        */}
        <Image
          src={arte}
          alt=""
          aria-hidden="true"
          className="espiral-arte__nuvens"
          sizes="(max-width: 1280px) 100vw, 1280px"
          priority={false}
        />

        <span
          className="espiral-arte__marca"
          style={{ left: `${alvo.x * 100}%`, top: `${alvo.y * 100}%` }}
        />
      </div>

      {dados.aposta && (
        <figcaption className="micro espiral-arte__aposta">{INFOGRAFICO.aposta}</figcaption>
      )}
    </figure>
  );
}
