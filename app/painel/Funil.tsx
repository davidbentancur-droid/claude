import type { Etapa } from '@/lib/painel/dados';

/**
 * O funil.
 *
 * A largura da barra sai da raiz quadrada da razão com a etapa do topo, não da
 * razão crua. Motivo: a razão crua colapsa. Numa passagem de 49 mil impressões
 * pra 600 cliques a barra de baixo teria um por cento da largura da de cima e
 * sumiria, e é justamente nas etapas de baixo que se olha. A raiz preserva a
 * ordem, quer dizer, barra menor continua significando número menor, e ainda
 * deixa a etapa final visível. O número exato está escrito na barra de
 * qualquer jeito, que é de onde se lê o dado.
 *
 * Encolheu em 20/09, a pedido do David. O que mudou: barra de 72 pra 40 px,
 * queda virou um número solto no vão em vez de uma etiqueta com moldura, e a
 * métrica da direita passou a ser uma linha só. O funil inteiro cabe na tela
 * agora, e era esse o ponto: funil que precisa de rolagem deixa de ser funil e
 * vira lista.
 */

const PISO = 0.26;

function largura(n: number, maior: number): number {
  if (maior <= 0) return PISO;
  return PISO + (1 - PISO) * Math.sqrt(Math.max(n, 0) / maior);
}

/** Do ouro claro pro escuro, pra etapa de baixo não competir com a de cima. */
function faixa(i: number, total: number): { a: string; b: string } {
  const t = total <= 1 ? 0 : i / (total - 1);
  const claro = 74 - t * 30;
  return { a: `hsl(41 48% ${claro}%)`, b: `hsl(41 44% ${claro - 7}%)` };
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
          <div className="funil__linha" key={e.chave}>
            <div className="funil__rotulo">
              <span className="funil__nome">{e.rotulo}</span>
              {e.desdeAgora && <span className="funil__novo">novo</span>}
            </div>

            <div className="funil__meio">
              {i > 0 && (
                <span className="funil__queda">
                  {e.drop === null ? '' : `${e.drop.toFixed(0)}%`}
                </span>
              )}
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
            </div>

            <div className="funil__metrica">
              <span className="funil__conv">
                {e.conv === null ? '100%' : `${e.conv.toFixed(1)}%`}
              </span>
              <span className="funil__nota">{e.nota}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
