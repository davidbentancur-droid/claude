'use client';

import Link from 'next/link';
import { Fragment, useEffect, useRef } from 'react';

import { DOWNSELL, RODAPE } from '@/lib/copy';
import {
  downsellCheckoutUrl,
  downsellVslEmbedUrl,
  temDownsellCheckout,
  temDownsellVsl,
} from '@/lib/public-env';
import { rastrear } from '@/lib/tracking';

import { Helice } from '../dossie/Helice';

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
        <h1 className="display titulo-downsell">
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
          className="subtitulo palavra-entra"
          style={{ margin: '0.75rem 0 2rem', animationDelay: '320ms' }}
        >
          {DOWNSELL.linha}
        </p>

        <p className="corpo" style={{ margin: '0 0 0.5rem', color: 'var(--ink-2)' }}>
          {DOWNSELL.apoio}
        </p>

        <p className="display" style={{ fontSize: 'clamp(1.5rem, 1.2rem + 1.2vw, 1.875rem)', color: 'var(--gold)', margin: '1.5rem 0 2rem' }}>
          {DOWNSELL.produto}
        </p>

        <div ref={ref}>
          {temDownsellVsl ? (
            <div style={{ aspectRatio: '16 / 9', border: '1px solid var(--line)' }}>
              <iframe
                src={downsellVslEmbedUrl}
                title="Vídeo da oferta"
                width="100%"
                height="100%"
                style={{ display: 'block', border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              style={{
                aspectRatio: '16 / 9',
                border: '1px solid var(--line)',
                background: 'var(--bg-2)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <span className="micro">{DOWNSELL.placeholder}</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: '2.25rem' }}>
          {temDownsellCheckout ? (
            <a
              className="botao botao-degrade"
              href={downsellCheckoutUrl}
              onClick={() => rastrear.downsellCheckout()}
            >
              {DOWNSELL.botao}
            </a>
          ) : (
            <button className="botao botao-degrade" disabled>
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
