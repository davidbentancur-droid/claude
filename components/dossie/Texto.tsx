import { Fragment } from 'react';

import { partirCitacoes } from '@/lib/render';

/**
 * Texto do dossiê com as palavras dele em destaque.
 *
 * As citações literais são o único destaque tipográfico da página, e elas
 * carregam significado: são as palavras que ele escreveu, devolvidas sem
 * correção. Planejamento Seção 5.
 */
export function Texto({ valor }: { valor: string }) {
  const paragrafos = valor.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <>
      {paragrafos.map((p, i) => (
        <p key={i} className="corpo" style={{ margin: i === 0 ? 0 : '1.1em 0 0' }}>
          {partirCitacoes(p).map((pedaco, j) =>
            pedaco.tipo === 'citacao' ? (
              <q key={j} className="dele">
                {pedaco.valor}
              </q>
            ) : (
              <Fragment key={j}>{pedaco.valor}</Fragment>
            ),
          )}
        </p>
      ))}
    </>
  );
}
