import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, IBM_Plex_Serif, IM_Fell_English } from 'next/font/google';
import Script from 'next/script';

import { gtmId, metaPixelId, temGtm, temPixel } from '@/lib/public-env';

import './globals.css';

/**
 * As três fontes do sistema Mitobiografia. `next/font/google` baixa em tempo de
 * build e serve da nossa origem, o que mantém `font-src 'self'` no CSP e evita
 * o flash de fonte trocando.
 *
 * Trocadas em 21/09 contra as referências que o Adriano aprovou. Duas
 * mudanças, e a segunda é a que vira a página:
 *
 * **IM Fell English** no lugar da Cormorant nos títulos. É um tipo de prensa
 * do século XVII, com a irregularidade da tinta no papel, e é ele que casa com
 * os cards iluminados do kit. A Cormorant é uma serifa de revista: bonita e do
 * século errado.
 *
 * **IBM Plex Serif** no lugar da Archivo no corpo. Era sans, e sans é o que
 * fazia a página parecer produto de software em vez de peça impressa. Nas duas
 * referências não existe sans em lugar nenhum do conteúdo.
 *
 * A Cormorant fica, em itálico, pra legenda de card e fala citada: ela tem um
 * itálico que a IM Fell não tem.
 */
const display = IM_Fell_English({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--fonte-display',
  display: 'swap',
});

const voice = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--fonte-voice',
  display: 'swap',
});

const body = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--fonte-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Uma leitura da tua vida, com as tuas palavras',
  description:
    'Quatro perguntas, escrevendo ou falando. A leitura sai na hora, com as tuas palavras dentro.',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    title: 'Uma leitura da tua vida, com as tuas palavras',
    description: 'Quatro perguntas. A leitura sai na hora.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0E0C0A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${voice.variable} ${body.variable}`}>
      <body>
        {temGtm && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}

        {temPixel && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
        )}

        {temGtm && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="gtm"
            />
          </noscript>
        )}

        {children}
      </body>
    </html>
  );
}
