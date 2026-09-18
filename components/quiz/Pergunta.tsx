'use client';

import { useEffect, useRef, useState } from 'react';

import { AUDIO, CONTADOR, EXEMPLOS_ROTULO, PERGUNTAS, REPESCAGEM } from '@/lib/copy';
import type { NumeroPergunta, Pergunta as DadosPergunta } from '@/lib/copy';

import { AreaTexto } from '../ui/Campo';
import { Botao } from '../ui/Botao';
import { Microfone } from '../ui/Microfone';

/**
 * Telas 2 a 4. Layout idêntico nas três. Planejamento Seção 1.
 *
 * A P3 tem três campos empilhados: a busca, o obstáculo e o preço de nada
 * mudar. Ela nunca tem repescagem, porque as três partes pedem frase e não
 * cena.
 *
 * O componente não decide onde cada campo é gravado. Ele devolve as partes na
 * ordem da tela, e quem as agrupa nas respostas do banco é `agruparCampos` em
 * `lib/copy.ts`, porque esse mapeamento é regra do Prompt Mãe e não de layout.
 */

export type Envio = { partes: string[]; via: 'texto' | 'audio' };

export function Pergunta({
  numero,
  valoresIniciais,
  onEnviar,
  ocupado,
}: {
  numero: NumeroPergunta;
  /** Um valor por campo da tela, na ordem. Telas de campo único recebem um só. */
  valoresIniciais: string[];
  onEnviar: (envio: Envio) => void;
  ocupado: boolean;
}) {
  const dados = PERGUNTAS.find((p) => p.numero === numero) as DadosPergunta;
  const quantos = dados.campos?.length ?? 1;

  const [partes, setPartes] = useState<string[]>(() =>
    Array.from({ length: quantos }, (_, i) => valoresIniciais[i] ?? ''),
  );
  const [usouAudio, setUsouAudio] = useState(false);

  const primeiro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    primeiro.current?.querySelector('textarea')?.focus();
  }, [numero]);

  // Toda parte é obrigatória: a tela de três campos só segue com os três.
  const podeEnviar = partes.every((p) => p.trim().length > 0);

  function escrever(i: number, valor: string) {
    setPartes((atual) => atual.map((p, j) => (j === i ? valor : p)));
  }

  function receberAudio(i: number, transcrito: string) {
    setUsouAudio(true);
    setPartes((atual) =>
      atual.map((p, j) =>
        j === i ? (p.trim().length > 0 ? `${p.trim()} ${transcrito}` : transcrito) : p,
      ),
    );
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
          {partes.map((valor, i) => (
            <div key={dados.campos?.[i].chave ?? 'unico'}>
              <AreaTexto
                rotulo={dados.campos?.[i].rotulo}
                value={valor}
                onChange={(e) => escrever(i, e.target.value)}
                linhasMinimas={dados.campos ? 2 : 5}
                disabled={ocupado}
              />
              <div style={{ marginTop: '0.75rem' }}>
                <Microfone onTexto={(t) => receberAudio(i, t)} desabilitado={ocupado} />
              </div>
            </div>
          ))}
        </div>

        {usouAudio && (
          <p className="micro" style={{ marginTop: '0.875rem' }}>
            {AUDIO.revisar}
          </p>
        )}

        <div style={{ marginTop: '2rem' }}>
          <Botao
            onClick={() => onEnviar({ partes, via: usouAudio ? 'audio' : 'texto' })}
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
 * Repescagem. Uma no fluxo inteiro, entre a resposta e a próxima pergunta.
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
