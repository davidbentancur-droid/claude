import type { Metadata } from 'next';

import './painel.css';

/**
 * O painel fica fora do índice, e em dois lugares.
 *
 * Aqui a meta tag, no middleware o header `x-robots-tag`. Redundância de
 * propósito: a meta depende de o buscador executar a página, e a página pede
 * senha antes disso. O header vale no 401 também.
 */
export const metadata: Metadata = {
  title: 'Painel · Mini Dossiê Mítico',
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <div className="painel">{children}</div>;
}
