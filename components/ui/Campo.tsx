'use client';

import {
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  micro?: string;
  erro?: string | null;
};

export function Campo({ rotulo, micro, erro, id, ...props }: CampoProps) {
  const auto = useRef(`campo-${Math.random().toString(36).slice(2, 9)}`);
  const idCampo = id ?? auto.current;
  const idMicro = `${idCampo}-micro`;

  return (
    <div>
      <label htmlFor={idCampo} className="conta" style={{ display: 'block', marginBottom: '0.5rem' }}>
        {rotulo}
      </label>
      {micro && (
        <p id={idMicro} className="micro" style={{ margin: '0 0 0.625rem' }}>
          {micro}
        </p>
      )}
      <input
        id={idCampo}
        className="campo"
        aria-describedby={micro ? idMicro : undefined}
        aria-invalid={erro ? 'true' : undefined}
        {...props}
      />
      {erro && (
        <p className="micro" role="alert" style={{ color: '#d08063', marginTop: '0.5rem' }}>
          {erro}
        </p>
      )}
    </div>
  );
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rotulo?: string;
  micro?: string;
  erro?: string | null;
  linhasMinimas?: number;
};

/**
 * Textarea que cresce sozinha. O cara escreve cena, e cena não cabe em quatro
 * linhas fixas com barra de rolagem interna.
 */
export function AreaTexto({
  rotulo,
  micro,
  erro,
  linhasMinimas = 4,
  id,
  value,
  ...props
}: AreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const auto = useRef(`area-${Math.random().toString(36).slice(2, 9)}`);
  const idCampo = id ?? auto.current;
  const idMicro = `${idCampo}-micro`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div>
      {rotulo && (
        <label
          htmlFor={idCampo}
          className="conta"
          style={{ display: 'block', marginBottom: '0.5rem' }}
        >
          {rotulo}
        </label>
      )}
      {micro && (
        <p id={idMicro} className="micro" style={{ margin: '0 0 0.625rem' }}>
          {micro}
        </p>
      )}
      <textarea
        id={idCampo}
        ref={ref}
        rows={linhasMinimas}
        className="area"
        value={value}
        aria-describedby={micro ? idMicro : undefined}
        aria-invalid={erro ? 'true' : undefined}
        {...props}
      />
      {erro && (
        <p className="micro" role="alert" style={{ color: '#d08063', marginTop: '0.5rem' }}>
          {erro}
        </p>
      )}
    </div>
  );
}
