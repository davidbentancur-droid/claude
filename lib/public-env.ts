/**
 * Variáveis públicas. Tudo aqui vai pro bundle do cliente por desenho.
 *
 * Next inlina `process.env.NEXT_PUBLIC_*` em tempo de build, então a referência
 * precisa ser literal. Nada de acesso dinâmico por nome aqui.
 */

export const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
export const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? '';
export const vslEmbedUrl = process.env.NEXT_PUBLIC_VSL_EMBED_URL ?? '';

export const temPixel = metaPixelId.length > 0;
export const temGtm = gtmId.length > 0;
export const temVsl = vslEmbedUrl.length > 0;
