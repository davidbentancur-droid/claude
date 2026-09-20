'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Helice } from '@/components/dossie/Helice';

/**
 * A porta do painel.
 *
 * A espiral atrás é a mesma do fechamento do dossiê, com opacidade baixa. Não é
 * enfeite trocado por outro qualquer: é a única figura que este produto tem, e
 * ela amarra a ferramenta interna ao que ela mede.
 */
export function Formulario({ de }: { de: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (entrando || senha.length === 0) return;

    setEntrando(true);
    setErro(null);

    try {
      const r = await fetch('/api/painel/entrar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ senha }),
      });

      if (r.ok) {
        router.replace(de);
        router.refresh();
        return;
      }

      setErro(
        r.status === 503
          ? 'O painel está desligado: falta configurar a senha na Vercel.'
          : 'Senha errada.',
      );
      setSenha('');
    } catch {
      setErro('Não deu pra falar com o servidor. Tenta de novo.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <main className="entrada">
      <div className="entrada__fundo" aria-hidden="true">
        <Helice largura={640} voltas={5} opacidade={0.3} velocidade={0.03} fundo="#0A0806" />
      </div>

      <div className="entrada__caixa">
        <p className="entrada__marca">Mitobiografia</p>
        <h1 className="entrada__titulo">O painel</h1>
        <p className="entrada__linha">
          O funil, os leads e as respostas. Só pra quem toca o funil por dentro.
        </p>

        <form className="entrada__form" onSubmit={enviar}>
          <label className="entrada__rotulo" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            className="entrada__campo"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            autoFocus
            disabled={entrando}
          />

          {erro && (
            <p className="entrada__erro" role="alert">
              {erro}
            </p>
          )}

          <button className="entrada__botao" type="submit" disabled={entrando}>
            {entrando ? 'Abrindo' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}
