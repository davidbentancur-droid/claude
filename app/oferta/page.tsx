import type { Metadata } from 'next';

import { Downsell } from '@/components/downsell/Downsell';

/**
 * O downsell, pedido pelo David em 18/09.
 *
 * Chega por um caminho só: o "Não, obrigado" abaixo da VSL, no fim do dossiê.
 * Quem recusou a mentoria é exatamente quem esta segunda oferta procura, então
 * o botão de recusa não é uma saída, é uma bifurcação.
 *
 * A rota é `/oferta` e não o nome do produto. O David pediu em 18/09 pra o nome
 * não aparecer na página, e a barra de endereço é parte da página. Neutra, ela
 * também sobrevive a uma troca de produto sem virar mentira: já aconteceu uma
 * vez, quando o downsell deixou de ser "Estoicismo nos Mitos" e virou Parsifal.
 *
 * Fora do índice de propósito. A oferta é desta página, e página de oferta
 * indexada aparece no Google solta, sem o dossiê antes, que é o que dá sentido
 * a ela.
 */
export const metadata: Metadata = {
  title: 'Espere aqui',
  robots: { index: false, follow: false },
};

export default function Pagina() {
  return <Downsell />;
}
