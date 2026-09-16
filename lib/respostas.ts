import type { Respostas } from './engine/validate';
import { supabaseOpcional } from './supabase';

/**
 * As quatro respostas da sessão, montadas do banco.
 *
 * Mora sozinho porque três rotas precisam delas agora: a `/api/read`, que faz a
 * análise, a `/api/dossie`, que escreve o texto numa invocação separada, e a
 * `/api/lead`, que pode ter que escrever o dossiê na hora como plano B.
 *
 * A repescagem entra colada na resposta, com linha em branco no meio, porque
 * pro engine as duas são uma coisa só: o cara respondeu, foi cutucado uma vez e
 * completou.
 */
export async function respostasDaSessao(sessionId: string): Promise<Respostas | null> {
  const db = supabaseOpcional();
  if (!db) return null;

  const { data, error } = await db
    .from('quiz_answers')
    .select('pergunta, texto, repescagem')
    .eq('session_id', sessionId);

  if (error || !data || data.length < 4) return null;

  const mapa = new Map<number, string>();
  for (const linha of data) {
    const texto = linha.texto as string;
    const rep = linha.repescagem as string | null;
    mapa.set(linha.pergunta as number, rep ? `${texto}\n\n${rep}` : texto);
  }

  if (![1, 2, 3, 4].every((n) => (mapa.get(n) ?? '').trim().length > 0)) return null;

  return {
    p1: mapa.get(1)!,
    p2: mapa.get(2)!,
    p3: mapa.get(3)!,
    p4: mapa.get(4)!,
  };
}
