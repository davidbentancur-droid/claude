'use client';

import { useSyncExternalStore } from 'react';

/** O mesmo corte de 760px que o CSS usa. Um número só, em um lugar só. */
const ESTREITO = '(max-width: 760px)';

/**
 * True em tela de celular.
 *
 * Existe pros casos em que CSS não alcança: o tamanho de um canvas, que é
 * fixado em pixel por JS e não encolhe por folha de estilo, e o atributo
 * `open` de um `<details>`, que é estado do DOM e não estilo.
 *
 * `useSyncExternalStore` e não `useState` com `useEffect`. A versão com estado
 * ficava presa: o valor só mudava quando o evento `change` da media query
 * disparava, e medindo com viewport emulado ele não dispara, então a tela
 * girava de celular pra desktop e o componente continuava achando que era
 * celular. Aqui o valor é lido de novo a cada render, e a inscrição existe só
 * pra avisar que algo mudou. Escuta `change` e `resize` porque um sozinho
 * deixa buraco: `change` não cobre o viewport emulado e `resize` não cobre
 * mudança de zoom ou de densidade sem redimensionar.
 */
function inscrever(avisar: () => void): () => void {
  const mq = window.matchMedia(ESTREITO);
  mq.addEventListener('change', avisar);
  window.addEventListener('resize', avisar);
  return () => {
    mq.removeEventListener('change', avisar);
    window.removeEventListener('resize', avisar);
  };
}

function ler(): boolean {
  return window.matchMedia(ESTREITO).matches;
}

/**
 * No servidor devolve `false`, quer dizer, a versão larga.
 *
 * É a escolha certa pro `<details>`: ele nasce aberto e fecha depois, no
 * celular. Quem está sem JS fica com o conteúdo à mostra, e não escondido
 * atrás de um resumo que não abriria.
 */
function lerNoServidor(): boolean {
  return false;
}

export function useEstreito(): boolean {
  return useSyncExternalStore(inscrever, ler, lerNoServidor);
}
