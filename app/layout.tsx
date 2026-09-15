import type { Metadata, Viewport } from 'next';
import { Archivo, Cormorant_Garamond, Instrument_Serif } from 'next/font/google';
import Script from 'next/script';

import { gtmId, metaPixelId, temGtm, temPixel } from '@/lib/public-env';

import './globals.css';

/**
 * As três fontes do sistema Mitobiografia. `next/font/google` baixa em tempo de
 * build e serve da nossa origem, o que mantém `font-src 'self'` no CSP e evita
 * o flash de fonte trocando.
 */
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--fonte-display',
  display: 'swap',
});

const voice = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--fonte-voice',
  display: 'swap',
});

const body = Archivo({
  subsets: ['latin'],
  weight: ['400', '500'],
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
