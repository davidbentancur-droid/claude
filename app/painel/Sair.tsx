'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Sair do painel.
 *
 * Existe porque o Basic Auth de 20/09 não tinha como sair sem fechar o
 * navegador, e num computador compartilhado isso importa: a tela lista
 * telefone e resposta de gente de verdade.
 */
export function Sair() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    try {
      await fetch('/api/painel/sair', { method: 'POST' });
    } catch {
      // Cookie expirado ou rede caída dá no mesmo: o middleware barra na volta.
    }
    router.replace('/painel/login');
    router.refresh();
  }

  return (
    <button type="button" className="sair" onClick={sair} disabled={saindo}>
      {saindo ? 'Saindo' : 'Sair'}
    </button>
  );
}
