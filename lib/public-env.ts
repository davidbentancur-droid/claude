/**
 * Variáveis públicas. Tudo aqui vai pro bundle do cliente por desenho.
 *
 * Next inlina `process.env.NEXT_PUBLIC_*` em tempo de build, então a referência
 * precisa ser literal. Nada de acesso dinâmico por nome aqui.
 */

import { urlDeEmbed } from './embed';

export const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
export const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? '';

/**
 * As envs de vídeo aceitam o link que a pessoa tem na mão, não só o de embed.
 * `urlDeEmbed` converte, e o porquê está lá: link de `watch?v=` dentro de
 * iframe dá retângulo preto sem erro nenhum.
 */
export const vslEmbedUrl = urlDeEmbed(process.env.NEXT_PUBLIC_VSL_EMBED_URL ?? '');

/**
 * A forma do vídeo, como em CSS. A VSL do Adriano é vertical, então o default
 * da casa não serve pra ela e a env existe pra isso.
 */
export const vslAspecto = process.env.NEXT_PUBLIC_VSL_ASPECTO ?? '16 / 9';
export const downsellAspecto = process.env.NEXT_PUBLIC_DOWNSELL_VSL_ASPECTO ?? '16 / 9';

/** WhatsApp do Adriano. É pra onde vai o botão preenchido, abaixo da VSL. */
export const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL ?? '';

/** Vídeo da página de downsell. */
export const downsellVslEmbedUrl = urlDeEmbed(
  process.env.NEXT_PUBLIC_DOWNSELL_VSL_EMBED_URL ?? '',
);

/** Checkout direto do downsell. O botão da oferta aponta pra cá. */
export const downsellCheckoutUrl = process.env.NEXT_PUBLIC_DOWNSELL_CHECKOUT_URL ?? '';

export const temPixel = metaPixelId.length > 0;
export const temGtm = gtmId.length > 0;
export const temVsl = vslEmbedUrl.length > 0;
export const temWhatsapp = whatsappUrl.length > 0;
export const temDownsellVsl = downsellVslEmbedUrl.length > 0;
export const temDownsellCheckout = downsellCheckoutUrl.length > 0;
