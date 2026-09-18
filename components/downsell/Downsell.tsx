'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef } from 'react';

import { DOWNSELL, RODAPE } from '@/lib/copy';
import {
  downsellAspecto,
  downsellCheckoutUrl,
  downsellVslEmbedUrl,
  temDownsellCheckout,
  temDownsellVsl,
} from '@/lib/public-env';
import { rastrear } from '@/lib/tracking';

import { Helice } from '../dossie/Helice';
import { Player, PlayerVazio } from '../video/Player';

/**
 * A segunda oferta.
 *
 * Mesma linguagem da página do dossiê: fundo escuro, cantos retos, serifada no
 * display. O que muda é que aqui existe botão de compra, e ele é o ponto mais
 * quente da tela. No dossiê isso continua proibido.
 *
 * O título entra animado, palavra por palavra, e é o único movimento da página.
 * Quem chega aqui acabou de clicar em "Não, obrigado": o texto tem que pegar a
 * atenção de volta em menos de um segundo, e é o que a entrada faz. Com
 * `prefers-reduced-motion` ele aparece inteiro, sem etapa nenhuma.
 */
export function Downsell() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rastrear.downsell();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !temDownsellVsl) return;

    const obs = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting) {
          rastrear.downsellVideo();
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <main className="palco palco-relativo tela">
      <Helice className="espiral-fundo" largura={520} voltas={4} opacidade={0.4} />

      <article className="coluna acima-do-fundo" style={{ paddingBlock: 'clamp(2rem, 6vw, 3.5rem)' }}>
        <h1 className="display titulo-downsell atencao">
          {/*
            O espaço fica fora do span de propósito. Dentro de um inline-block
            ele é colapsado, e o título saía grudado: "Espereaqui!".
          */}
          {DOWNSELL.titulo.split(' ').map((palavra, i) => (
            <Fragment key={i}>
              <span className="palavra-entra" style={{ animationDelay: `${i * 110}ms` }}>
                {palavra}
              </span>{' '}
            </Fragment>
          ))}
        </h1>

        <p
          /* Só `palavra-entra` aqui. As duas classes animam a mesma
             propriedade, e a segunda apagaria a entrada da primeira. A
             respiração fica no h1, que é o que o olho procura. */
          className="subtitulo palavra-entra"
          style={{ margin: '0.75rem 0 2rem', animationDelay: '320ms' }}
        >
          {DOWNSELL.linha}
        </p>

        <p className="corpo" style={{ margin: '0 0 2rem', color: 'var(--ink-2)' }}>
          {DOWNSELL.apoio}
        </p>

        <div ref={ref}>
          {temDownsellVsl ? (
            <Player
              src={downsellVslEmbedUrl}
              aspecto={downsellAspecto}
              titulo="Vídeo da oferta"
            />
          ) : (
            <PlayerVazio aspecto={downsellAspecto} texto={DOWNSELL.placeholder} />
          )}
        </div>

        <div style={{ marginTop: '2.25rem' }}>
          {temDownsellCheckout ? (
            <a
              className="botao botao-degrade botao-pulso"
              href={downsellCheckoutUrl}
              onClick={() => rastrear.downsellCheckout()}
            >
              {DOWNSELL.botao}
            </a>
          ) : (
            <button className="botao botao-degrade botao-pulso" disabled>
              {DOWNSELL.botao}
            </button>
          )}
        </div>

        <footer
          style={{
            marginTop: '3.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" className="micro" style={{ color: 'var(--ink-2)' }}>
            {DOWNSELL.voltar}
          </Link>
          <Link href="/privacidade" className="micro" style={{ color: 'var(--ink-2)' }}>
            {RODAPE.privacidade}
          </Link>
        </footer>
      </article>
    </main>
  );
}
