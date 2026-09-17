import { supabaseOpcional } from './supabase';

/**
 * Registro de erro no banco, pra poder diagnosticar depois.
 *
 * Existe porque o plano Hobby da Vercel guarda runtime log por uma hora. Um
 * erro reportado no dia seguinte não tem log nenhum pra ler, e o diagnóstico
 * vira dedução em cima do código. Aqui fica guardado enquanto o projeto existir.
 *
 * Duas regras que não se negociam sobre o que entra em `detalhe`:
 *
 * Nada de resposta do usuário. As quatro respostas são material íntimo e já
 * estão em `quiz_answers`, ligadas pela sessão. Copiar pedaço delas pra dentro
 * de uma tabela de log espalha o dado sem motivo.
 *
 * Nada de chave de API. Erro de provedor costuma trazer o prefixo mascarado da
 * chave dentro da mensagem, e mascarado ainda é mais do que precisa estar aqui.
 * Por isso a mensagem passa por `limpar` antes de gravar.
 */

const PADROES_DE_SEGREDO: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{4,}/g,
  /\bsk-ant-[A-Za-z0-9_-]{4,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}/g, // JWT, que é o formato das chaves do Supabase
  /\bvcp_[A-Za-z0-9]{4,}/g,
  /\bBearer\s+\S+/gi,
];

function limpar(texto: string): string {
  let saida = texto;
  for (const re of PADROES_DE_SEGREDO) saida = saida.replace(re, '[removido]');
  return saida.slice(0, 2000);
}

export type Erro = {
  rota: string;
  /** Código curto e estável, pra agrupar. Ex: 'leitura_falhou'. */
  codigo: string;
  sessionId?: string | null;
  detalhe?: unknown;
  req?: Request;
};

/**
 * Nunca lança e nunca é esperado com `await` no caminho crítico.
 *
 * Registrar um erro não pode ser a causa do próximo. Se o banco estiver fora,
 * ou a tabela não existir ainda, isto some em silêncio e o `console.error` da
 * rota continua sendo a segunda via.
 */
export function registrarErro(erro: Erro): void {
  const db = supabaseOpcional();
  if (!db) return;

  const detalhe =
    erro.detalhe instanceof Error
      ? `${erro.detalhe.name}: ${erro.detalhe.message}`
      : erro.detalhe === undefined
        ? null
        : String(erro.detalhe);

  void db
    .from('quiz_erros')
    .insert({
      session_id: erro.sessionId ?? null,
      rota: erro.rota,
      codigo: erro.codigo,
      detalhe: detalhe === null ? null : limpar(detalhe),
      user_agent: erro.req?.headers.get('user-agent')?.slice(0, 400) ?? null,
    })
    .then(({ error }) => {
      if (error) console.error('[erros] não gravou o registro', error.message);
    });
}
