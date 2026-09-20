import Link from 'next/link';

import {
  ABAS,
  JANELAS,
  abaValida,
  carregarPainel,
  janelaValida,
  type Aba,
} from '@/lib/painel/dados';

import { Funil } from './Funil';
import { Leads, Respostas } from './Listas';
import { Sair } from './Sair';

/**
 * Tela 0 do nosso lado. Não é do funil, é sobre o funil.
 *
 * Dinâmica sempre: é um painel operacional e cache aqui significa olhar pro
 * número de ontem achando que é o de agora.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function n(v: number): string {
  return v.toLocaleString('pt-BR');
}

function data(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function url(aba: Aba, dias: number): string {
  return `/painel?aba=${aba}&dias=${dias}`;
}

export default async function PaginaPainel({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string; aba?: string }>;
}) {
  const { dias: diasBruto, aba: abaBruta } = await searchParams;
  const dias = janelaValida(diasBruto);
  const aba = abaValida(abaBruta);

  let p: Awaited<ReturnType<typeof carregarPainel>>;
  try {
    // O texto das respostas só é buscado na aba que mostra ele.
    p = await carregarPainel(dias, { comRespostas: aba === 'respostas' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido';

    /*
     * Duas causas prováveis e bem diferentes, então a tela nomeia a certa em
     * vez de chutar as duas. Chutar manda quem lê procurar no lugar errado.
     */
    const pista = /variável de ambiente|SUPABASE_/i.test(msg)
      ? 'Falta env var no ambiente. Em produção elas ficam em Settings, Environment Variables, na Vercel.'
      : /funil_por_sessao|does not exist|relation/i.test(msg)
        ? 'A view funil_por_sessao não existe, quer dizer, a migração 0004 ainda não subiu neste banco.'
        : 'Não é falta de configuração nem de migração, é o banco recusando a consulta.';

    return (
      <main className="painel">
        <p className="painel__marca">Mitobiografia</p>
        <h1 className="painel__titulo">O painel</h1>
        <p className="aviso">
          Não consegui ler o banco: {msg}
          <br />
          {pista}
        </p>
      </main>
    );
  }

  const janela = JANELAS.find((j) => j.dias === dias)?.rotulo ?? '30 dias';

  const contagem: Record<Aba, number> = {
    dados: p.etapas.length,
    leads: p.leads.length,
    respostas: p.sessoesComResposta,
  };

  return (
    <main className="painel">
      <header className="painel__topo">
        <div>
          <p className="painel__marca">Mitobiografia</p>
          <h1 className="painel__titulo">O painel</h1>
          <p className="painel__sub">
            {janela} · {n(p.resumo.sessoes)} sessões · atualizado agora
          </p>
        </div>

        <div className="painel__direita">
          <Sair />
          <nav className="janelas">
            {JANELAS.map((j) => (
              <Link
                key={j.dias}
                href={url(aba, j.dias)}
                className={`janela${j.dias === dias ? ' janela--ativa' : ''}`}
                prefetch={false}
              >
                {j.rotulo}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/*
        As abas vivem na URL e não no estado do cliente. Assim o link é
        copiável, o botão de voltar do navegador funciona, e a aba Dados não
        paga o custo de buscar o texto das respostas que ela não mostra.
      */}
      <nav className="abas">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={url(a.chave, dias)}
            className={`aba${a.chave === aba ? ' aba--ativa' : ''}`}
            prefetch={false}
          >
            {a.rotulo}
            <span className="aba__n">{n(contagem[a.chave])}</span>
          </Link>
        ))}
      </nav>

      {aba === 'dados' && (
        <>
          <section className="ladrilhos">
            <Ladrilho rotulo="Abriram a página" valor={n(p.resumo.sessoes)} />
            <Ladrilho
              rotulo="Viraram lead"
              valor={n(p.resumo.leads)}
              nota={`${p.resumo.convGeral.toFixed(2)}% de quem abriu`}
            />
            <Ladrilho
              rotulo="Qualificados"
              valor={n(p.resumo.qualificados)}
              nota={`${p.resumo.convQualificado.toFixed(1)}% dos leads`}
            />
            <Ladrilho
              rotulo="Responderam"
              valor={n(p.sessoesComResposta)}
              nota="sessões com resposta"
            />
          </section>

          <div className="duas">
            <section className="placa">
              <h2 className="placa__titulo">Da página até a VSL</h2>
              <Funil etapas={p.etapas} />

              {p.eventosDesde === null ? (
                <p className="aviso">
                  As duas etapas de baixo ainda estão zeradas porque nenhum evento foi
                  gravado até agora. Elas passam a contar assim que alguém abrir um dossiê
                  depois desta versão. As de cima são retroativas e valem desde o primeiro
                  dia.
                </p>
              ) : (
                <p className="aviso">
                  Abrir o dossiê, chegar na VSL e a bifurcação ao lado só têm registro a
                  partir de {data(p.eventosDesde)}. Antes disso o evento existia no GTM e
                  no Pixel, que não voltam pra cá. As etapas de cima são retroativas.
                </p>
              )}
            </section>

            <div className="coluna-lado">
              <section className="placa">
                <h2 className="placa__titulo">Depois do vídeo</h2>
                <div className="bifurcacao">
                  <Ramo
                    nome="Foi pro WhatsApp"
                    valor={p.bifurcacao.whatsapp}
                    base={p.bifurcacao.base}
                    nota="Mentoria"
                  />
                  <Ramo
                    nome="Desceu pro downsell"
                    valor={p.bifurcacao.downsell}
                    base={p.bifurcacao.base}
                    nota="Parsifal"
                  />
                  <Ramo
                    nome="Foi pro checkout"
                    valor={p.bifurcacao.checkout}
                    base={p.bifurcacao.downsell}
                    nota="Lastlink"
                  />
                </div>
                <p className="aviso">
                  A venda acontece no Lastlink e não volta pra cá. O checkout é o último
                  passo que o painel enxerga.
                </p>
              </section>

              <section className="placa">
                <h2 className="placa__titulo">Como os leads se distribuem</h2>
                <div className="recortes">
                  <Recorte
                    titulo="Faixa de orçamento"
                    linhas={p.porFaixa.map((f) => ({ rotulo: f.faixa, n: f.n }))}
                  />
                  <Recorte
                    titulo="Ato"
                    linhas={p.porAto.map((a) => ({ rotulo: a.ato, n: a.n }))}
                  />
                  <Recorte
                    titulo="Movimento"
                    linhas={p.porMovimento.map((m) => ({ rotulo: m.movimento, n: m.n }))}
                  />
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      {aba === 'leads' && (
        <section className="placa">
          <h2 className="placa__titulo">
            Leads · {n(p.leads.length)} · {n(p.resumo.qualificados)} qualificados
          </h2>
          <Leads leads={p.leads} />
        </section>
      )}

      {aba === 'respostas' && (
        <section className="placa">
          <h2 className="placa__titulo">
            Respostas · {n(p.respostas.length)} sessões
          </h2>
          <Respostas respostas={p.respostas} />
        </section>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Ladrilho({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="ladrilho">
      <p className="ladrilho__rotulo">{rotulo}</p>
      <p className="ladrilho__valor">{valor}</p>
      {nota && <p className="ladrilho__nota">{nota}</p>}
    </div>
  );
}

function Ramo({
  nome,
  valor,
  base,
  nota,
}: {
  nome: string;
  valor: number;
  base: number;
  nota: string;
}) {
  const pct = base === 0 ? 0 : (valor / base) * 100;
  return (
    <div className="ramo">
      <p className="ramo__nome">{nome}</p>
      <p className="ramo__n">{n(valor)}</p>
      <p className="ramo__nota">
        {nota} · {pct.toFixed(0)}%
      </p>
    </div>
  );
}

function Recorte({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { rotulo: string; n: number }[];
}) {
  const maior = Math.max(...linhas.map((l) => l.n), 1);

  return (
    <div>
      <p className="campo__rotulo">{titulo}</p>
      {linhas.length === 0 ? (
        <p className="vazio">Sem dado ainda.</p>
      ) : (
        linhas.map((l) => (
          <div className="barra-linha" key={l.rotulo}>
            <span>{l.rotulo}</span>
            <span className="barra-linha__trilho">
              <span
                className="barra-linha__preenche"
                style={{ width: `${(l.n / maior) * 100}%` }}
              />
            </span>
            <span className="barra-linha__n">{l.n}</span>
          </div>
        ))
      )}
    </div>
  );
}
