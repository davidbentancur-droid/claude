'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { RODAPE } from '@/lib/copy';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

import { Infografico } from '../dossie/Infografico';
import { Texto } from '../dossie/Texto';
import { VslEmbed } from '../dossie/VslEmbed';

/**
 * Tela 9. Planejamento Seção 1.
 *
 * Ordem fixa: título, devolutiva, Ato, infográfico, Movimento, arquétipo,
 * fechamento, vídeo. O infográfico entra entre o Ato e o Movimento porque é o
 * que o Prompt Mãe Seção 7 manda.
 *
 * Sem botão de compra, sem compartilhar, sem refazer. O vídeo faz a oferta.
 */
export function Dossie({ dossie }: { dossie: DossiePublico }) {
  useEffect(() => {
    rastrear.dossie();
  }, []);

  return (
    <main className="palco tela">
      <article className="coluna" style={{ paddingBlock: 'clamp(2rem, 6vw, 4rem)' }}>
        <h1 className="display titulo-dossie" style={{ marginBottom: '2rem' }}>
          {dossie.titulo}
        </h1>

        <section style={{ marginBottom: '2.25rem' }}>
          <Texto valor={dossie.devolutiva} />
        </section>

        <Bloco bloco={dossie.ato} />

        <Infografico dados={dossie.infografico} />

        <Bloco bloco={dossie.movimento} />
        <Bloco bloco={dossie.arquetipo} />

        <section style={{ marginTop: '2.25rem' }}>
          <Texto valor={dossie.fechamento} />
        </section>

        <VslEmbed />

        <footer
          style={{
            marginTop: '4rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span className="micro">{RODAPE.marca}</span>
          <Link href="/privacidade" className="micro" style={{ color: 'var(--ink-2)' }}>
            {RODAPE.privacidade}
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Bloco({ bloco }: { bloco: DossiePublico['ato'] }) {
  return (
    <section style={{ marginTop: '2.25rem' }}>
      {bloco.subtitulo && (
        <h2 className="subtitulo" style={{ marginBottom: '0.875rem' }}>
          {bloco.subtitulo}
        </h2>
      )}
      <Texto valor={bloco.texto} />
    </section>
  );
}
