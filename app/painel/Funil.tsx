import type { Etapa } from '@/lib/painel/dados';

/**
 * O funil em trapézio, na forma da referência que o David mandou.
 *
 * A largura da barra sai da raiz quadrada da razão com a etapa do topo, não da
 * razão crua. Motivo: a razão crua colapsa. Numa passagem de 49 mil impressões
 * pra 600 cliques a barra de baixo teria um por cento da largura da de cima e
 * sumiria, e é justamente nas etapas de baixo que se olha. A raiz preserva a
 * ordem, quer dizer, barra menor continua significando número menor, e ainda
 * deixa a etapa final visível. O número exato está escrito dentro da barra de
 * qualquer jeito, que é de onde se lê o dado.
 */

const PISO = 0.22;

function largura(n: number, maior: number): number {
  if (maior <= 0) return PISO;
  return PISO + (1 - PISO) * Math.sqrt(Math.max(n, 0) / maior);
}

/** Do ouro claro pro escuro, pra etapa de baixo não competir com a de cima. */
function faixa(i: number, total: number): { a: string; b: string } {
  const t = total <= 1 ? 0 : i / (total - 1);
  const claro = 78 - t * 26;
  return {
    a: `hsl(41 45% ${claro}%)`,
    b: `hsl(41 42% ${claro - 9}%)`,
  };
}

function numero(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function Funil({ etapas }: { etapas: Etapa[] }) {
  const maior = Math.max(...etapas.map((e) => e.n), 1);

  return (
    <div className="funil">
      {etapas.map((e, i) => {
        const wBase = largura(e.n, maior);
        const wTopo = i === 0 ? 1 : largura(etapas[i - 1].n, maior);
        const cor = faixa(i, etapas.length);

        return (
          <div key={e.chave}>
            {i > 0 && (
              <div className="funil__queda">
                <span className="queda">
                  ↓ {e.drop === null ? '' : e.drop.toFixed(1)}% de queda
                </span>
              </div>
            )}

            <div className="funil__etapa">
              <div className="funil__rotulo">
                <p className="funil__nome">{e.rotulo}</p>
                {e.conv !== null && (
                  <p className="funil__conv">conv. {e.conv.toFixed(2)}%</p>
                )}
              </div>

              <div
                className="funil__barra"
                style={
                  {
                    '--corte-topo': `${((1 - wTopo) / 2) * 100}%`,
                    '--corte-base': `${((1 - wBase) / 2) * 100}%`,
                    '--faixa-a': cor.a,
                    '--faixa-b': cor.b,
                  } as React.CSSProperties
                }
              >
                <span className="funil__n">{numero(e.n)}</span>
              </div>

              <div className="funil__metrica">
                {e.nota}
                <b>
                  {e.conv === null ? 'topo do funil' : `${e.conv.toFixed(1)}% da etapa acima`}
                </b>
                {e.desdeAgora && <span>medido desde 20/09</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
