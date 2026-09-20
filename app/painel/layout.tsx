import type { Metadata } from 'next';

import './painel.css';

/**
 * O layout só carrega o estilo e tira a página do índice.
 *
 * Sem `<div>` de fora de propósito: a tela de login e o painel são duas peças
 * com moldura diferente, uma centrada em tela cheia e a outra em coluna larga.
 * Uma casca comum aqui obrigaria a segunda a desfazer o que a primeira faz.
 *
 * O `noindex` mora em dois lugares, aqui e no header do middleware.
 * Redundância de propósito: a meta depende de o buscador executar a página, e
 * a página pede senha antes disso. O header vale no redirecionamento também.
 */
export const metadata: Metadata = {
  title: 'Painel · Mini Dossiê Mítico',
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return children;
}
