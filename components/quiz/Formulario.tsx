'use client';

import { useEffect, useState } from 'react';

import { FORMULARIO } from '@/lib/copy';
import { mascararTelefone } from '@/lib/phone';
import { rastrear } from '@/lib/tracking';

import { AreaTexto, Campo } from '../ui/Campo';

/**
 * Tela 8. Prompt Mãe Seção 4.2.
 *
 * Quatro campos, todos obrigatórios, todos texto aberto. Faixa fechada no
 * orçamento faria o cara procurar a caixinha mais segura e marcar a de baixo;
 * campo aberto traz o contexto, que vale mais que a cifra na hora do contato.
 *
 * O foco de cada campo dispara evento próprio, que é como se mede o abandono
 * campo a campo (pendência 3 do Prompt Mãe).
 */

export type DadosFormulario = {
  nome: string;
  whatsapp: string;
  profissao: string;
  orcamento: string;
  empresa: string;
};

const VAZIO: DadosFormulario = {
  nome: '',
  whatsapp: '',
  profissao: '',
  orcamento: '',
  empresa: '',
};

export function Formulario({
  onEnviar,
  ocupado,
  erros,
}: {
  onEnviar: (dados: DadosFormulario) => void;
  ocupado: boolean;
  erros: Record<string, string> | null;
}) {
  const [dados, setDados] = useState<DadosFormulario>(VAZIO);
  const [vistos, setVistos] = useState<Set<string>>(new Set());

  useEffect(() => {
    rastrear.formulario();
  }, []);

  function marcar(campo: string) {
    if (vistos.has(campo)) return;
    setVistos((v) => new Set(v).add(campo));
    rastrear.campo(campo);
  }

  const c = FORMULARIO.campos;

  return (
    <main className="palco tela">
      <div className="centro" style={{ paddingBlock: '2rem' }}>
        <h1 className="display" style={{ fontSize: 'clamp(1.75rem, 1.3rem + 1.8vw, 2.25rem)', marginBottom: '2rem' }}>
          {FORMULARIO.titulo}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onEnviar(dados);
          }}
          style={{ display: 'grid', gap: '1.75rem' }}
          noValidate
        >
          <Campo
            rotulo={c.nome.rotulo}
            micro={c.nome.micro}
            value={dados.nome}
            onChange={(e) => setDados({ ...dados, nome: e.target.value })}
            onFocus={() => marcar('nome')}
            autoComplete="given-name"
            disabled={ocupado}
            erro={erros?.nome}
          />

          <Campo
            rotulo={c.whatsapp.rotulo}
            micro={c.whatsapp.micro}
            value={dados.whatsapp}
            onChange={(e) => setDados({ ...dados, whatsapp: mascararTelefone(e.target.value) })}
            onFocus={() => marcar('whatsapp')}
            type="tel"
            inputMode="tel"
            placeholder="(51) 99999-9999"
            autoComplete="tel-national"
            disabled={ocupado}
            erro={erros?.whatsapp}
          />

          <Campo
            rotulo={c.profissao.rotulo}
            micro={c.profissao.micro}
            value={dados.profissao}
            onChange={(e) => setDados({ ...dados, profissao: e.target.value })}
            onFocus={() => marcar('profissao')}
            autoComplete="organization-title"
            disabled={ocupado}
            erro={erros?.profissao}
          />

          <AreaTexto
            rotulo={c.orcamento.rotulo}
            micro={c.orcamento.micro}
            value={dados.orcamento}
            onChange={(e) => setDados({ ...dados, orcamento: e.target.value })}
            onFocus={() => marcar('orcamento')}
            linhasMinimas={2}
            disabled={ocupado}
            erro={erros?.orcamento}
          />

          {/* Honeypot. Fora da ordem de tabulação e fora do leitor de tela. */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
            <label htmlFor="empresa">Empresa</label>
            <input
              id="empresa"
              name="empresa"
              tabIndex={-1}
              autoComplete="off"
              value={dados.empresa}
              onChange={(e) => setDados({ ...dados, empresa: e.target.value })}
            />
          </div>

          {erros?.geral && (
            <p className="micro" role="alert" style={{ color: '#d08063', margin: 0 }}>
              {erros.geral}
            </p>
          )}

          <div>
            <button type="submit" className="botao" disabled={ocupado}>
              {ocupado ? FORMULARIO.enviando : FORMULARIO.botao}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
