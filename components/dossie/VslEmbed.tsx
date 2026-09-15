'use client';

import { useEffect, useRef } from 'react';

import { VSL } from '@/lib/copy';
import { temVsl, vslEmbedUrl } from '@/lib/public-env';
import { rastrear } from '@/lib/tracking';

/**
 * A VSL. Planejamento Seção 7.
 *
 * Sem `NEXT_PUBLIC_VSL_EMBED_URL`, em produção o bloco inteiro some, porque uma
 * moldura vazia no fim do dossiê lê como página quebrada. Em desenvolvimento
 * aparece um retângulo marcado, pra ninguém esquecer que falta ligar.
 *
 * Quando o vídeo chegar: setar a env no Vercel e redeploy. Nada no código muda.
 */
export function VslEmbed() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !temVsl) return;

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          rastrear.vslVisivel();
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!temVsl) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div style={{ marginTop: '3rem' }}>
        <p className="micro" style={{ marginBottom: '0.75rem' }}>
          {VSL.linha}
        </p>
        <div
          style={{
            aspectRatio: '16 / 9',
            border: '1px solid var(--line)',
            background: 'var(--bg-2)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <span className="micro">{VSL.placeholder}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ marginTop: '3rem' }}>
      <p className="micro" style={{ marginBottom: '0.75rem' }}>
        {VSL.linha}
      </p>
      <div style={{ aspectRatio: '16 / 9', border: '1px solid var(--line)' }}>
        <iframe
          src={vslEmbedUrl}
          title="Vídeo"
          width="100%"
          height="100%"
          style={{ display: 'block', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
