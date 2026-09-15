'use client';

import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'vazado';
};

/** Sem ícone, sem seta, sem caixa alta. Planejamento Seção 5. */
export function Botao({ variante = 'primario', className = '', ...props }: Props) {
  const classe = ['botao', variante === 'vazado' ? 'botao-vazado' : '', className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={classe} {...props} />;
}
