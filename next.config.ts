import type { NextConfig } from 'next';

/**
 * Host do embed da VSL, pra liberar no frame-src sem abrir o CSP inteiro.
 * Enquanto a env estiver vazia, nenhum host extra entra.
 */
function hostDaVsl(): string[] {
  const url = process.env.NEXT_PUBLIC_VSL_EMBED_URL;
  if (!url) return [];
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

const csp = [
  "default-src 'self'",
  // GTM e Pixel injetam script inline e o GTM avalia container em runtime.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.facebook.com https://www.googletagmanager.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net",
  "media-src 'self' blob:",
  // Wildcard em CSP só vale no rótulo mais à esquerda. `player-vz-*.tv...` faz o
  // navegador descartar a diretiva inteira, o que abriria o frame-src sem aviso.
  `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://*.tv.pandavideo.com.br ${hostDaVsl().join(' ')}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * O Prompt Mãe é lido de `docs/prompt-mae.md` em runtime. Sem esta entrada o
   * arquivo não sobe junto com a função e o engine quebra só em produção.
   */
  outputFileTracingIncludes: {
    '/api/read': ['./docs/prompt-mae.md'],
    '/api/check-answer': ['./docs/prompt-mae.md'],
    '/api/health': ['./docs/prompt-mae.md'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          /**
           * DENY global, sem exceção de rota. O planejamento pede exceção na rota
           * do dossiê por causa da VSL, mas este header governa quem enquadra a
           * nossa página, não o que a nossa página enquadra. O iframe da VSL é
           * assunto do `frame-src` acima.
           */
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
