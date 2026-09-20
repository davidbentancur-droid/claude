'use client';

import { useMemo, useState } from 'react';

import { ROTULO_FAIXA, type Lead, type Resposta } from '@/lib/painel/dados';

/**
 * As duas listas do painel, com busca e filtro no cliente.
 *
 * No cliente e não no servidor de propósito: a janela de dias já cortou o
 * volume, o que sobra cabe na memória, e filtrar aqui responde na tecla em vez
 * de numa ida ao banco. Se um dia passar de uns milhares de linhas, a busca
 * sobe pro servidor e vira parâmetro de URL.
 */

function quando(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function telefoneLegivel(e164: string): string {
  const d = e164.replace(/\D/g, '');
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length < 10) return e164;
  const ddd = local.slice(0, 2);
  const resto = local.slice(2);
  const meio = resto.length === 9 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, meio)}-${resto.slice(meio)}`;
}

/**
 * O link do WhatsApp, com uma abertura curta e neutra.
 *
 * Só o cumprimento com o nome. A dor literal dele aparece no card logo abaixo
 * do botão pra quem vai escrever ler antes de mandar, e não entra no texto
 * pronto: o Prompt Mãe Seção 4.3 diz que é ela que abre a conversa, mas
 * escrever a frase de abertura é trabalho do Adriano, não de um template. O
 * WhatsApp abre com o texto editável, então o que sai daqui é rascunho.
 */
function linkZap(l: Lead): string {
  const primeiro = l.nome.trim().split(/\s+/)[0] ?? '';
  const texto = `Oi ${primeiro}, aqui é o Adriano.`;
  return `https://wa.me/${l.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
}

/* ------------------------------------------------------------------ */

export function Leads({ leads }: { leads: Lead[] }) {
  const [busca, setBusca] = useState('');
  const [soQualificados, setSoQualificados] = useState(false);

  const filtrados = useMemo(() => {
    const b = normalizar(busca.trim());
    return leads.filter((l) => {
      if (soQualificados && !l.qualificado) return false;
      if (b.length === 0) return true;
      return normalizar(
        [l.nome, l.profissao, l.orcamentoRaw, l.dor ?? '', l.ato ?? '', l.movimento ?? '', l.whatsapp].join(' '),
      ).includes(b);
    });
  }, [leads, busca, soQualificados]);

  return (
    <>
      <div className="controles">
        <input
          className="busca"
          placeholder="Buscar por nome, profissão, dor, Ato, Movimento, telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          type="button"
          className="alternar"
          aria-pressed={soQualificados}
          onClick={() => setSoQualificados((v) => !v)}
        >
          Só qualificados
        </button>
        <span className="funil__conv">
          {filtrados.length} de {leads.length}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <p className="vazio">Nenhum lead com esse filtro.</p>
      ) : (
        filtrados.map((l) => <CardLead key={l.sessionId} l={l} />)
      )}
    </>
  );
}

function CardLead({ l }: { l: Lead }) {
  const selo =
    l.faixa === 'indefinido'
      ? { classe: 'selo--ler', texto: 'Ler o texto' }
      : l.qualificado
        ? { classe: 'selo--sim', texto: 'Qualificado' }
        : { classe: 'selo--nao', texto: 'Fora da faixa' };

  return (
    <article className="lead">
      <div className="lead__topo">
        <div className="lead__id">
          <h3 className="lead__nome">{l.nome}</h3>
          <span className="lead__quando">{quando(l.quando)}</span>
          <span className={`selo ${selo.classe}`}>{selo.texto}</span>
          <span className="selo">{ROTULO_FAIXA[l.faixa]}</span>
        </div>

        <div className="lead__acoes">
          <span className="lead__quando">{telefoneLegivel(l.whatsapp)}</span>
          <a className="zap" href={linkZap(l)} target="_blank" rel="noopener noreferrer">
            Mandar mensagem
          </a>
        </div>
      </div>

      <div className="lead__corpo">
        <Campo rotulo="Profissão" valor={l.profissao} />
        <Campo rotulo="Orçamento, na palavra dele" valor={l.orcamentoRaw} />
        <Campo rotulo="Ato" valor={l.ato} />
        <Campo rotulo="Movimento" valor={l.movimento} />
        <Campo rotulo="Arquétipo" valor={l.arquetipo} />
        <Campo rotulo="A dor que ele declarou" valor={l.dor} />
      </div>

      <div className="lead__trilha">
        <Passo feito={l.viuDossie} rotulo="Abriu o dossiê" />
        <Passo feito={l.foiWhatsapp} rotulo="Foi pro WhatsApp" />
        <Passo feito={l.viuDownsell} rotulo="Viu o downsell" />
        <Passo feito={l.foiCheckout} rotulo="Foi pro checkout" />
      </div>
    </article>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (valor === null || valor.trim().length === 0) return null;
  return (
    <div>
      <p className="campo__rotulo">{rotulo}</p>
      <p className="campo__valor">{valor}</p>
    </div>
  );
}

function Passo({ feito, rotulo }: { feito: boolean; rotulo: string }) {
  return (
    <span className={`selo ${feito ? 'selo--sim' : 'selo--nao'}`}>
      {feito ? '✓' : '·'} {rotulo}
    </span>
  );
}

/* ------------------------------------------------------------------ */

export function Respostas({ respostas }: { respostas: Resposta[] }) {
  const [busca, setBusca] = useState('');
  const [soLeads, setSoLeads] = useState(false);

  const filtradas = useMemo(() => {
    const b = normalizar(busca.trim());
    return respostas.filter((r) => {
      if (soLeads && !r.virouLead) return false;
      if (b.length === 0) return true;
      return normalizar(
        [r.nome ?? '', r.p1 ?? '', r.p2 ?? '', r.p3 ?? '', r.p4 ?? ''].join(' '),
      ).includes(b);
    });
  }, [respostas, busca, soLeads]);

  return (
    <>
      <div className="controles">
        <input
          className="busca"
          placeholder="Buscar dentro das respostas"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button
          type="button"
          className="alternar"
          aria-pressed={soLeads}
          onClick={() => setSoLeads((v) => !v)}
        >
          Só quem virou lead
        </button>
        <span className="funil__conv">
          {filtradas.length} de {respostas.length}
        </span>
      </div>

      {filtradas.length === 0 ? (
        <p className="vazio">Nenhuma resposta com esse filtro.</p>
      ) : (
        filtradas.map((r) => (
          <details className="resposta" key={r.sessionId}>
            <summary>
              <strong>{r.nome ?? 'Sem nome, não chegou no formulário'}</strong>
              <span className="lead__quando">{quando(r.quando)}</span>
              <span className={`selo ${r.virouLead ? 'selo--sim' : 'selo--nao'}`}>
                {r.virouLead ? 'virou lead' : r.status}
              </span>
              {r.vias.includes('audio') && <span className="selo">falou</span>}
            </summary>

            <div className="resposta__corpo">
              <Pergunta
                rotulo="P1 · os sete anos"
                texto={r.p1}
                repescagem={r.p1Repescagem}
              />
              <Pergunta rotulo="P2 · o agora" texto={r.p2} repescagem={r.p2Repescagem} />
              <Pergunta rotulo="P3 · a busca e o obstáculo" texto={r.p3} />
              <Pergunta rotulo="P4 · o preço de nada mudar" texto={r.p4} />
            </div>
          </details>
        ))
      )}
    </>
  );
}

function Pergunta({
  rotulo,
  texto,
  repescagem,
}: {
  rotulo: string;
  texto: string | null;
  repescagem?: string | null;
}) {
  if (texto === null) return null;
  return (
    <div className="pergunta">
      <p className="pergunta__rotulo">{rotulo}</p>
      <p className="pergunta__texto">{texto}</p>
      {repescagem && <p className="pergunta__repescagem">Repescagem: {repescagem}</p>}
    </div>
  );
}
