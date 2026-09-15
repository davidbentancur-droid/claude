'use client';

import { useEffect, useRef, useState } from 'react';

import { AUDIO, CONTADOR, EXEMPLOS_ROTULO, PERGUNTAS, REPESCAGEM } from '@/lib/copy';
import type { Pergunta as DadosPergunta } from '@/lib/copy';

import { AreaTexto } from '../ui/Campo';
import { Botao } from '../ui/Botao';
import { Microfone } from '../ui/Microfone';

/**
 * Telas 2 a 5. Layout idêntico nas quatro. Planejamento Seção 1.
 *
 * A P3 tem dois campos empilhados e é salva como uma resposta só, concatenada
 * com quebra de linha. Ela também nunca tem repescagem, porque a pergunta é
 * curta por desenho.
 */

export type Envio = { texto: string; via: 'texto' | 'audio' };

export function Pergunta({
  numero,
  valorInicial,
  onEnviar,
  ocupado,
}: {
  numero: 1 | 2 | 3 | 4;
  valorInicial: string;
  onEnviar: (envio: Envio) => void;
  ocupado: boolean;
}) {
  const dados = PERGUNTAS.find((p) => p.numero === numero) as DadosPergunta;

  // A P3 guarda dois campos e junta na hora de enviar.
  const partes = valorInicial.split('\n');
  const [texto, setTexto] = useState(dados.campos ? partes[0] ?? '' : valorInicial);
  const [texto2, setTexto2] = useState(dados.campos ? partes.slice(1).join('\n') : '');
  const [usouAudio, setUsouAudio] = useState(false);

  const primeiro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    primeiro.current?.querySelector('textarea')?.focus();
  }, [numero]);

  const valor = dados.campos
    ? [texto.trim(), texto2.trim()].filter(Boolean).join('\n')
    : texto.trim();

  const podeEnviar = dados.campos
    ? texto.trim().length > 0 && texto2.trim().length > 0
    : texto.trim().length > 0;

  function receberAudio(qual: 1 | 2, transcrito: string) {
    setUsouAudio(true);
    const juntar = (anterior: string) =>
      anterior.trim().length > 0 ? `${anterior.trim()} ${transcrito}` : transcrito;
    if (qual === 1) setTexto(juntar);
    else setTexto2(juntar);
  }

  return (
    <main className="palco tela">
      <p className="conta" style={{ margin: 0 }}>
        {CONTADOR(numero, PERGUNTAS.length)}
      </p>

      <div className="centro" style={{ paddingBlock: '2rem' }}>
        <h1 className="display pergunta" style={{ marginBottom: '1rem' }}>
          {dados.pergunta}
        </h1>

        <p className="micro" style={{ margin: '0 0 1.5rem' }}>
          {dados.apoio}
        </p>

        {dados.exemplos && (
          <details className="exemplos" open style={{ marginBottom: '1.5rem' }}>
            <summary>{EXEMPLOS_ROTULO.nao} / {EXEMPLOS_ROTULO.sim}</summary>
            <div style={{ marginTop: '0.875rem', display: 'grid', gap: '0.75rem' }}>
              <p className="micro" style={{ margin: 0 }}>
                <span style={{ color: 'var(--ink-2)', opacity: 0.7 }}>
                  {EXEMPLOS_ROTULO.nao}.{' '}
                </span>
                {dados.exemplos.nao}
              </p>
              <p className="micro" style={{ margin: 0, color: 'var(--ink)' }}>
                <span style={{ color: 'var(--gold-2)' }}>{EXEMPLOS_ROTULO.sim}. </span>
                {dados.exemplos.sim}
              </p>
            </div>
          </details>
        )}

        <div style={{ display: 'grid', gap: '1.25rem' }} ref={primeiro}>
          <div>
            <AreaTexto
              rotulo={dados.campos?.[0].rotulo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              linhasMinimas={dados.campos ? 2 : 5}
              disabled={ocupado}
            />
            <div style={{ marginTop: '0.75rem' }}>
              <Microfone onTexto={(t) => receberAudio(1, t)} desabilitado={ocupado} />
            </div>
          </div>

          {dados.campos && (
            <div>
              <AreaTexto
                rotulo={dados.campos[1].rotulo}
                value={texto2}
                onChange={(e) => setTexto2(e.target.value)}
                linhasMinimas={2}
                disabled={ocupado}
              />
              <div style={{ marginTop: '0.75rem' }}>
                <Microfone onTexto={(t) => receberAudio(2, t)} desabilitado={ocupado} />
              </div>
            </div>
          )}
        </div>

        {usouAudio && (
          <p className="micro" style={{ marginTop: '0.875rem' }}>
            {AUDIO.revisar}
          </p>
        )}

        <div style={{ marginTop: '2rem' }}>
          <Botao
            onClick={() => onEnviar({ texto: valor, via: usouAudio ? 'audio' : 'texto' })}
            disabled={!podeEnviar || ocupado}
          >
            {REPESCAGEM.botao}
          </Botao>
        </div>
      </div>
    </main>
  );
}

/**
 * Repescagem. Uma vez só por pergunta, entre a resposta e a próxima.
 * Prompt Mãe Seção 2, regra de resposta pobre.
 */
export function Repescagem({
  onEnviar,
  ocupado,
}: {
  onEnviar: (texto: string) => void;
  ocupado: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [usouAudio, setUsouAudio] = useState(false);

  return (
    <main className="palco tela">
      <div className="centro">
        <p
          className="corpo"
          style={{ fontSize: 'clamp(1.125rem, 1rem + 0.6vw, 1.25rem)', margin: '0 0 1.5rem' }}
        >
          {REPESCAGEM.texto}
        </p>

        <AreaTexto
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          linhasMinimas={4}
          disabled={ocupado}
        />

        <div style={{ marginTop: '0.75rem' }}>
          <Microfone
            onTexto={(t) => {
              setUsouAudio(true);
              setTexto((a) => (a.trim() ? `${a.trim()} ${t}` : t));
            }}
            desabilitado={ocupado}
          />
        </div>

        {usouAudio && (
          <p className="micro" style={{ marginTop: '0.875rem' }}>
            {AUDIO.revisar}
          </p>
        )}

        <div style={{ marginTop: '2rem' }}>
          <Botao onClick={() => onEnviar(texto.trim())} disabled={texto.trim().length === 0 || ocupado}>
            {REPESCAGEM.botao}
          </Botao>
        </div>
      </div>
    </main>
  );
}
