'use client';

import { temPixel } from './public-env';

/**
 * Eventos do planejamento Seção 8.
 *
 * Empurra pro dataLayer do GTM e, quando é evento de conversão, pro Pixel. Com
 * as envs vazias nada quebra: `dataLayer` é criado do lado do cliente de
 * qualquer jeito e `fbq` só é chamado se existir.
 */

type Props = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

export function evento(nome: string, props: Props = {}): void {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: nome, ...props });
}

/** Eventos padrão do Pixel, separados porque têm nome próprio lá. */
export function eventoPixel(nome: string, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  if (!temPixel || typeof window.fbq !== 'function') return;
  window.fbq('track', nome, props);
}

export const rastrear = {
  inicio: () => evento('quiz_start'),
  perguntaEnviada: (n: number, via: 'texto' | 'audio') =>
    evento(`quiz_q${n}_sent`, { via }),
  repescagem: (n: number) => evento('quiz_followup_shown', { pergunta: n }),
  leituraComecou: () => evento('quiz_reading_start'),
  leituraTerminou: (latency_ms: number) => evento('quiz_reading_done', { latency_ms }),
  spoiler: () => evento('quiz_spoiler_view'),
  formulario: () => evento('quiz_form_view'),
  campo: (campo: string) => evento(`quiz_form_field_${campo}`),
  lead: () => {
    evento('quiz_lead');
    eventoPixel('Lead');
  },
  dossie: () => evento('quiz_dossie_view'),
  infograficoPronto: () => evento('quiz_infografico_done'),
  vslVisivel: () => evento('vsl_view'),
  vslPlay: () => evento('vsl_play'),

  /**
   * A bifurcação depois da VSL. Os dois lados são medidos porque a razão entre
   * eles é o que diz se o downsell está pegando quem a mentoria não pegou.
   */
  vslSim: () => {
    evento('vsl_cta_mentoria');
    eventoPixel('Contact');
  },
  vslNao: () => evento('vsl_cta_downsell'),

  downsell: () => evento('downsell_view'),
  downsellVideo: () => evento('downsell_video_view'),
  downsellCheckout: () => {
    evento('downsell_checkout');
    eventoPixel('InitiateCheckout');
  },

  risco: () => evento('quiz_risk'),
  piada: () => evento('quiz_joke'),
  erro: (motivo: string) => evento('quiz_error', { motivo }),
} as const;
