import { Fragment } from 'react';

import { partirCitacoes } from '@/lib/render';

/**
 * Texto do dossiê com as palavras dele em destaque.
 *
 * Dois destaques, e os dois carregam significado. As citações literais são as
 * palavras que ele escreveu, devolvidas sem correção, e vão em dourado. O
 * negrito marca os rótulos "A armadilha:" e "O convite:" e o nome do Movimento,
 * que o Prompt Mãe Seção 5 manda separar do parágrafo porque são o que ele
 * guarda da leitura.
 *
 * Toda quebra de linha abre bloco novo, não só a linha em branco. É o que faz o
 * rótulo cair em linha própria, que é a metade da regra.
 */
export function Texto({ valor }: { valor: string }) {
  const linhas = valor.split(/\n+/).filter((p) => p.trim().length > 0);

  return (
    <>
      {linhas.map((p, i) => (
        <p key={i} className="corpo" style={{ margin: i === 0 ? 0 : '1.1em 0 0' }}>
          {partirCitacoes(p).map((pedaco, j) => {
            if (pedaco.tipo === 'citacao') {
              return (
                <q key={j} className="dele">
                  {pedaco.valor}
                </q>
              );
            }
            if (pedaco.tipo === 'forte') {
              return <strong key={j}>{pedaco.valor}</strong>;
            }
            return <Fragment key={j}>{pedaco.valor}</Fragment>;
          })}
        </p>
      ))}
    </>
  );
}
