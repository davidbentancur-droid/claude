'use client';

import { useEffect, useState } from 'react';

import { ABERTURA, ENQUADRAMENTO, ERRO, LENDO, PIADA, RISCO, SPOILER } from '@/lib/copy';

import { Helice } from '../dossie/Helice';
import { Botao } from '../ui/Botao';

/* ------------------------------------------------------------------ *
 * Tela 0 · Abertura
 * ------------------------------------------------------------------ */

export function Abertura({ onComecar }: { onComecar: () => void }) {
  return (
    <main className="palco palco-relativo tela">
      {/*
        A espiral em profundidade, girando devagar demais pra alguém reparar que
        gira. O círculo de traço fica reservado pro infográfico, que é onde ele
        precisa impressionar.
      */}
      <Helice className="espiral-fundo" largura={560} voltas={4} opacidade={0.62} />

      <div className="centro acima-do-fundo abertura-texto">
        <h1 className="display pergunta" style={{ marginBottom: '1.25rem' }}>
          {ABERTURA.titulo}
        </h1>
        <p className="corpo" style={{ color: 'var(--ink-2)', margin: '0 0 2.5rem' }}>
          {ABERTURA.apoio}
        </p>
        <div>
          <Botao onClick={onComecar}>{ABERTURA.botao}</Botao>
        </div>
        <p className="micro" style={{ marginTop: '1.25rem' }}>
          {ABERTURA.rodape}
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Tela 1 · Enquadramento
 *
 * Texto literal do Prompt Mãe. A única liberdade tomada aqui é dar ênfase à
 * palavra "cena", que é o que a frase inteira existe pra ensinar.
 * ------------------------------------------------------------------ */

export function Enquadramento({ onSeguir }: { onSeguir: () => void }) {
  // Só a primeira ocorrência. "cena" aparece quatro vezes no texto, e um split
  // ingênuo descartaria tudo depois da segunda, cortando justamente o exemplo
  // que ensina o que é cena.
  const corte = ENQUADRAMENTO.texto.indexOf(ENQUADRAMENTO.enfase);
  const antes = ENQUADRAMENTO.texto.slice(0, corte);
  const depois = ENQUADRAMENTO.texto.slice(corte + ENQUADRAMENTO.enfase.length);

  return (
    <main className="palco tela">
      <div className="centro">
        <p
          className="corpo"
          style={{ fontSize: 'clamp(1.125rem, 1rem + 0.6vw, 1.25rem)', margin: '0 0 2.5rem' }}
        >
          {antes}
          <em style={{ fontStyle: 'normal', color: 'var(--gold)' }}>{ENQUADRAMENTO.enfase}</em>
          {depois}
        </p>
        <div>
          <Botao onClick={onSeguir}>{ENQUADRAMENTO.botao}</Botao>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Tela 6 · Lendo
 *
 * Primeira aparição da espiral, em dourado sobre o escuro, sem nomear nada.
 * As frases trocam a cada 6 segundos e nenhuma menciona processamento ou IA.
 * ------------------------------------------------------------------ */

export function Lendo() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LENDO.frases.length), LENDO.intervaloMs);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="palco tela">
      <div className="centro" style={{ alignItems: 'center', textAlign: 'center' }}>
        {/*
          Aqui ela gira bem mais rápido que na abertura, porque é estado de
          espera: precisa de movimento visível pra dizer que a coisa não travou.
        */}
        <Helice largura={300} voltas={3.4} opacidade={0.8} velocidade={0.34} />

        <p className="micro" aria-live="polite" style={{ marginTop: '2rem', minHeight: '1.5em' }}>
          {LENDO.frases[i]}
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Tela 7 · Spoiler
 * ------------------------------------------------------------------ */

export function Spoiler({ texto, onLiberar }: { texto: string; onLiberar: () => void }) {
  const paragrafos = texto.split(/\n{1,}/).filter((p) => p.trim().length > 0);

  return (
    <main className="palco tela">
      <div className="centro" style={{ paddingBlock: '2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          {paragrafos.map((p, i) => (
            <p
              key={i}
              className="corpo"
              style={{
                fontFamily: 'var(--fonte-voice), Georgia, serif',
                fontSize: 'clamp(1.1875rem, 1.05rem + 0.7vw, 1.375rem)',
                lineHeight: 1.5,
                margin: i === 0 ? 0 : '1em 0 0',
              }}
            >
              {p}
            </p>
          ))}
        </div>
        <div>
          <Botao onClick={onLiberar}>{SPOILER.botao}</Botao>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Desvio R · Risco
 *
 * Sem dossiê, sem formulário, sem vídeo. Prompt Mãe Seção 8.
 * ------------------------------------------------------------------ */

export function Risco({ texto }: { texto: string }) {
  return (
    <main className="palco tela">
      <div className="centro">
        <p
          className="corpo"
          style={{ fontSize: 'clamp(1.125rem, 1rem + 0.6vw, 1.25rem)', margin: '0 0 1.75rem' }}
        >
          {texto || RISCO.fallback}
        </p>

        <p className="corpo" style={{ margin: '0 0 1.75rem' }}>
          {RISCO.cvvChamada.split(RISCO.cvvNumero)[0]}
          <a
            href={RISCO.cvvHref}
            style={{ color: 'var(--gold)', textUnderlineOffset: '4px' }}
          >
            {RISCO.cvvNumero}
          </a>
          {RISCO.cvvChamada.split(RISCO.cvvNumero)[1]}
        </p>

        <p className="micro" style={{ margin: 0 }}>
          {RISCO.fechamento}
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Desvio J · Piada
 * ------------------------------------------------------------------ */

export function Piada({ texto, onRefazer }: { texto: string; onRefazer: () => void }) {
  return (
    <main className="palco tela">
      <div className="centro">
        <p
          className="corpo"
          style={{ fontSize: 'clamp(1.125rem, 1rem + 0.6vw, 1.25rem)', margin: '0 0 2.5rem' }}
        >
          {texto || PIADA.fallback}
        </p>
        <div>
          <Botao onClick={onRefazer}>{PIADA.botao}</Botao>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Desvio E · Erro
 * ------------------------------------------------------------------ */

export function Erro({ onTentar, ocupado }: { onTentar: () => void; ocupado: boolean }) {
  return (
    <main className="palco tela">
      <div className="centro">
        <p className="corpo" style={{ margin: '0 0 2.5rem' }}>
          {ERRO.texto}
        </p>
        <div>
          <Botao onClick={onTentar} disabled={ocupado}>
            {ERRO.botao}
          </Botao>
        </div>
      </div>
    </main>
  );
}
