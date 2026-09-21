import Image from 'next/image';

import { ATOS_DESCRICAO } from '@/lib/copy';
import type { Ato } from '@/lib/movimentos';

import iniciacao from '@/public/atos/ato_iniciacao.webp';
import partida from '@/public/atos/ato_partida.webp';
import retorno from '@/public/atos/ato_retorno.webp';

/**
 * A pintura do Ato, de ponta a ponta da tela, com o nome dele por cima.
 *
 * Entrou em 21/09 contra as duas referências que o Adriano aprovou, e é o
 * gesto central das duas: uma pintura de época ocupando a largura inteira,
 * texto claro assentado direto nela, sem caixa e sem moldura. É o que faz a
 * página ler como peça de museu em vez de landing page.
 *
 * O escurecimento é CSS e nunca vai no arquivo. Duas razões: a mesma pintura
 * precisa servir de fundo aqui e de imagem inteira em outro lugar, e escurecer
 * no arquivo obrigaria a manter duas cópias que divergem na primeira troca de
 * arte.
 *
 * Cada Ato tem a pintura que o kit mandou, e são de escolas diferentes de
 * propósito: mosaico tardo-antigo na Partida, óleo romântico na Iniciação,
 * ilustração de conto no Retorno. A veladura por cima é a cor do Ato na paleta
 * da Seção 7, que é o que costura três séculos diferentes na mesma página.
 */

const ARTE = {
  Partida: { src: partida, veladura: 'var(--partida-a)' },
  Iniciação: { src: iniciacao, veladura: 'var(--iniciacao-a)' },
  Retorno: { src: retorno, veladura: 'var(--retorno-a)' },
} as const;

export function FaixaDoAto({ ato, posicao }: { ato: Ato; posicao: string }) {
  const { src, veladura } = ARTE[ato];

  return (
    <figure
      className="faixa-ato"
      style={{ '--veladura': veladura } as React.CSSProperties}
    >
      <Image
        src={src}
        alt=""
        className="faixa-ato__arte"
        sizes="100vw"
        priority={false}
      />

      <figcaption className="faixa-ato__texto">
        <p className="faixa-ato__rotulo">O teu Ato</p>
        <p className="faixa-ato__nome">{ato}</p>
        <p className="faixa-ato__posicao">no {posicao}</p>
        <p className="faixa-ato__descricao">{ATOS_DESCRICAO[ato]}</p>
      </figcaption>
    </figure>
  );
}
