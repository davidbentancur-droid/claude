"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { VSL } from "@/lib/copy";
import {
  temVsl,
  temWhatsapp,
  vslAspecto,
  vslEmbedUrl,
  whatsappUrl,
} from "@/lib/public-env";
import { rastrear } from "@/lib/tracking";

import { Player, PlayerVazio } from "../video/Player";

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

  /**
   * O vídeo e os botões são independentes de propósito.
   *
   * Eles chegam em momentos diferentes: o link do WhatsApp o Adriano já tem, o
   * vídeo ainda está sendo gravado. Amarrados, o dossiê ficaria sem saída
   * nenhuma até o vídeo ficar pronto, e a saída vale mais que o vídeo.
   */
  const semNada = !temVsl && !temWhatsapp;
  if (semNada && process.env.NODE_ENV === "production") return null;

  return (
    <div ref={ref} className="rampa">
      {/*
        O loop de fundo da virada pra oferta, pedido em 21/09.

        `playsInline` é o que impede o iPhone de abrir o vídeo em tela cheia
        por conta própria, e sem ele um fundo decorativo sequestraria a tela do
        cara no meio da leitura. Mudo, em loop e sem controles: é cenário, não
        peça pra assistir. O escurecimento é a camada de CSS por cima, nunca o
        arquivo.

        `aria-hidden` porque não carrega informação: quem lê por leitor de tela
        não perde nada, e anunciar um vídeo sem conteúdo seria ruído.
      */}
      <video
        className="rampa__fundo"
        src="/video/video_loop_fundo.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="rampa__veu" aria-hidden="true" />

      <div className="rampa__conteudo">
        <p className="micro" style={{ marginBottom: "0.75rem" }}>
          {VSL.linha}
        </p>

        {temVsl ? (
          <Player src={vslEmbedUrl} aspecto={vslAspecto} titulo="Vídeo" />
        ) : (
          process.env.NODE_ENV !== "production" && (
            <PlayerVazio aspecto={vslAspecto} texto={VSL.placeholder} />
          )
        )}

        <SaidasDaVsl />
      </div>
    </div>
  );
}

/**
 * Os dois caminhos depois do vídeo.
 *
 * O preenchido leva pro WhatsApp do Adriano e é o caminho principal. O vazado
 * leva pro downsell, e por isso ele é um link de verdade e não um botão de
 * fechar: quem diz não pra mentoria é justamente quem a segunda oferta procura.
 *
 * Sem `NEXT_PUBLIC_WHATSAPP_URL`, o par inteiro some em produção. Botão que não
 * leva a lugar nenhum é pior que botão nenhum, e o "Não, obrigado" sozinho
 * viraria a única saída do dossiê.
 */
function SaidasDaVsl() {
  if (!temWhatsapp) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <p className="micro" style={{ marginTop: "1.5rem" }}>
        Falta `NEXT_PUBLIC_WHATSAPP_URL`. Os dois botões aparecem quando ela
        entrar.
      </p>
    );
  }

  return (
    <div className="saidas">
      <a
        className="botao botao-degrade"
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => rastrear.vslSim()}
      >
        {VSL.botaoSim}
      </a>

      <Link
        className="botao botao-vazado"
        href="/oferta"
        onClick={() => rastrear.vslNao()}
      >
        {VSL.botaoNao}
      </Link>
    </div>
  );
}
