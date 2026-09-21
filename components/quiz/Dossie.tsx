'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { RODAPE } from '@/lib/copy';
import type { DossiePublico } from '@/lib/render';
import { rastrear } from '@/lib/tracking';

import { CardMovimento } from '../dossie/CardMovimento';
import { FaixaDoAto } from '../dossie/FaixaDoAto';
import { Helice } from '../dossie/Helice';
import { EspiralArte } from '../dossie/EspiralArte';
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

        {/*
          A pintura do Ato abrindo o bloco, de ponta a ponta. É o gesto das
          duas referências que o Adriano aprovou: arte de época na largura
          inteira, com o nome assentado nela.
        */}
        <FaixaDoAto ato={dossie.infografico.ato} posicao={dossie.infografico.posicao} />

        <Bloco bloco={dossie.ato} />

        {/*
          A espiral na arte oficial, entre o Ato e o Movimento, que é onde a
          Seção 7 manda. Ela substituiu o SVG que a gente desenhava: o
          acabamento que a Seção cobra vem da mão de quem desenhou, não de
          `<path>`.
        */}
        <EspiralArte dados={dossie.infografico} />

        {/*
          O card do Movimento, logo abaixo da espiral. A Seção 7 pede ele "ao
          lado", e ficou embaixo: a espiral rompe a coluna e ocupa a largura da
          tela inteira, então dividir a linha com ela empurraria o card pra uma
          faixa estreita demais pra prancha de 3:2 se ler. Empilhado, os dois
          aparecem no tamanho que cada um precisa.
        */}
        <CardMovimento dados={dossie.infografico} />

        <Bloco bloco={dossie.movimento} />
        <Bloco bloco={dossie.arquetipo} />

        <section style={{ marginTop: '2.25rem' }}>
          <Texto valor={dossie.fechamento} />
        </section>

        {/*
          A espiral fechando. Não é enfeite: é o argumento do parágrafo acima
          desenhado. O fechamento diz que esta leitura é uma janela curta e que o
          gesto começou antes do que quatro perguntas alcançam. As voltas
          empilhadas sumindo no escuro dizem o mesmo sem palavra nenhuma, e
          emendam no vídeo.
        */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3.5rem' }}>
          <Helice largura={280} voltas={4} opacidade={0.5} />
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
