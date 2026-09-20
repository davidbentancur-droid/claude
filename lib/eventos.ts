/**
 * Eventos do funil que o banco precisa saber.
 *
 * O `lib/tracking.ts` manda pro GTM e pro Pixel, e isso continua. Aqui é outra
 * coisa: o GTM conta quantos, o banco conta **quem**. Sem a segunda metade não
 * dá pra olhar um lead e saber se ele chegou a abrir o WhatsApp, que é a
 * pergunta que o painel existe pra responder.
 *
 * Este arquivo não importa nada de propósito. Ele é lido pelos dois lados, pelo
 * componente de cliente que dispara e pela rota que grava, e qualquer import de
 * servidor aqui arrastaria o cliente do Supabase pro bundle do navegador.
 */

export const EVENTOS_DO_FUNIL = [
  'dossie_visto',
  'vsl_visivel',
  'vsl_play',
  'whatsapp',
  'downsell_visto',
  'downsell_video',
  'downsell_checkout',
] as const;

export type EventoDoFunil = (typeof EVENTOS_DO_FUNIL)[number];

/**
 * Lista fechada, conferida no servidor. A rota é pública, porque o evento nasce
 * no cliente, e sem allowlist qualquer um enche a tabela com o que quiser.
 */
export function eventoValido(v: unknown): v is EventoDoFunil {
  return typeof v === 'string' && (EVENTOS_DO_FUNIL as readonly string[]).includes(v);
}

/**
 * Dispara do cliente, sem esperar e sem atrapalhar nada.
 *
 * `sendBeacon` em vez de `fetch` porque metade destes eventos acontece no
 * instante em que a aba está sendo abandonada: o clique no WhatsApp e o clique
 * no checkout navegam pra fora. `fetch` normal morre na navegação e o evento se
 * perde, que é justamente a etapa mais importante do funil. O beacon é
 * entregue pelo navegador depois.
 */
export function enviarEvento(evento: EventoDoFunil): void {
  if (typeof window === 'undefined') return;

  const corpo = JSON.stringify({ evento });

  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/evento', new Blob([corpo], { type: 'application/json' }));
      return;
    }
    void fetch('/api/evento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: corpo,
      keepalive: true,
    });
  } catch {
    // Telemetria nunca derruba a tela.
  }
}
