'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AUDIO } from '@/lib/copy';

/**
 * Entrada por áudio. Planejamento Seção 1.
 *
 * Grava, manda pra `/api/transcribe`, devolve o texto pro campo. O usuário
 * sempre vê e corrige antes de enviar: transcrição errada que entra direto na
 * leitura vira dossiê errado, e ele não teria como saber por quê.
 *
 * Se o navegador negar o microfone, o botão some e fica só texto.
 */

const LIMITE_SEGUNDOS = 180;

type Estado = 'ocioso' | 'gravando' | 'processando';

export function Microfone({
  onTexto,
  desabilitado,
}: {
  onTexto: (texto: string) => void;
  desabilitado?: boolean;
}) {
  const [estado, setEstado] = useState<Estado>('ocioso');
  const [segundos, setSegundos] = useState(0);
  const [disponivel, setDisponivel] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);
  const trilha = useRef<MediaStream | null>(null);
  const cronometro = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const temApi =
      typeof navigator !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined';
    if (!temApi) setDisponivel(false);
  }, []);

  const limpar = useCallback(() => {
    if (cronometro.current) {
      clearInterval(cronometro.current);
      cronometro.current = null;
    }
    trilha.current?.getTracks().forEach((t) => t.stop());
    trilha.current = null;
    recorder.current = null;
    pedacos.current = [];
    setSegundos(0);
  }, []);

  useEffect(() => () => limpar(), [limpar]);

  const enviar = useCallback(
    async (blob: Blob) => {
      setEstado('processando');
      try {
        const form = new FormData();
        form.append('audio', blob, 'resposta.webm');

        const r = await fetch('/api/transcribe', { method: 'POST', body: form });
        if (!r.ok) throw new Error(String(r.status));

        const dados = (await r.json()) as { texto?: string };
        if (dados.texto && dados.texto.length > 0) {
          onTexto(dados.texto);
          setErro(null);
        } else {
          setErro(AUDIO.erro);
        }
      } catch {
        setErro(AUDIO.erro);
      } finally {
        setEstado('ocioso');
      }
    },
    [onTexto],
  );

  const parar = useCallback(() => {
    const r = recorder.current;
    if (r && r.state !== 'inactive') r.stop();
  }, []);

  const comecar = useCallback(async () => {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      trilha.current = stream;

      const tipo = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const r = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      recorder.current = r;
      pedacos.current = [];

      r.ondataavailable = (e) => {
        if (e.data.size > 0) pedacos.current.push(e.data);
      };

      r.onstop = () => {
        const blob = new Blob(pedacos.current, { type: r.mimeType || 'audio/webm' });
        limpar();
        if (blob.size > 1024) void enviar(blob);
        else setEstado('ocioso');
      };

      r.start();
      setEstado('gravando');
      setSegundos(0);

      cronometro.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= LIMITE_SEGUNDOS) {
            parar();
            return LIMITE_SEGUNDOS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      // Permissão negada ou sem dispositivo. Some o botão e fica só texto.
      setDisponivel(false);
      limpar();
      setEstado('ocioso');
    }
  }, [enviar, limpar, parar]);

  if (!disponivel) return null;

  const mm = String(Math.floor(segundos / 60)).padStart(1, '0');
  const ss = String(segundos % 60).padStart(2, '0');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={estado === 'gravando' ? parar : comecar}
        disabled={desabilitado || estado === 'processando'}
        aria-label={estado === 'gravando' ? AUDIO.parar : AUDIO.gravar}
        className={estado === 'gravando' ? 'gravando' : undefined}
        style={{
          width: 44,
          height: 44,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          border: `1px solid ${estado === 'gravando' ? 'var(--gold)' : 'var(--gold-2)'}`,
          background: estado === 'gravando' ? 'var(--gold)' : 'transparent',
          cursor: estado === 'processando' ? 'progress' : 'pointer',
          padding: 0,
        }}
      >
        <svg width="16" height="22" viewBox="0 0 16 22" aria-hidden="true">
          <rect
            x="5"
            y="1"
            width="6"
            height="11"
            rx="3"
            fill={estado === 'gravando' ? 'var(--bg)' : 'var(--gold)'}
          />
          <path
            d="M1.5 9.5a6.5 6.5 0 0 0 13 0M8 16v5"
            fill="none"
            stroke={estado === 'gravando' ? 'var(--bg)' : 'var(--gold)'}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <span className="micro">
        {estado === 'gravando' && (
          <>
            {AUDIO.gravando} {mm}:{ss}
          </>
        )}
        {estado === 'processando' && AUDIO.processando}
        {estado === 'ocioso' && (erro ?? AUDIO.gravar)}
      </span>
    </div>
  );
}
