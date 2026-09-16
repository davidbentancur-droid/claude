'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { RODAPE } from '@/lib/copy';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

import { EspiralTraco } from '../dossie/EspiralTraco';
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

        {/*
          A espiral fechando, com a seta rompendo a borda e subindo pro círculo
          seguinte. Não é enfeite: é o argumento do parágrafo acima desenhado.
          O fechamento diz que esta leitura é uma janela curta e que o gesto
          começou antes do que quatro perguntas alcançam. A seta diz o mesmo
          sem palavra nenhuma, e emenda no vídeo.
        */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3.5rem' }}>
          <EspiralTraco
            tamanho={120}
            modo="desenhar"
            comSeta
            opacidade={0.5}
            aoEntrarNaTela
            cor="var(--gold-2)"
          />
        </div>

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
