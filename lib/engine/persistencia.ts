import { AnaliseSchema, Dossie, type Analise, type DossieLeitura } from './schema';
import { supabaseOpcional } from '../supabase';

/**
 * O estado da leitura no banco, entre a chamada 1 e a chamada 2.
 *
 * Existe porque as duas chamadas rodam em invocações serverless diferentes e
 * não compartilham memória. O banco é o único lugar onde uma pode contar pra
 * outra o que já foi feito.
 */

export type EstadoDossie = 'pendente' | 'gerando' | 'pronto' | 'falhou';

export type LinhaLeitura = {
  analise: Analise;
  dossie: DossieLeitura | null;
  estado: EstadoDossie;
};

/**
 * Lê a análise e o que já existe de dossiê.
 *
 * `output` guarda a análise. Em linhas antigas, gravadas antes do corte em duas
 * chamadas, ele guarda a leitura inteira com o dossiê dentro, e o schema da
 * análise ignora o campo a mais, então elas continuam lendo certo.
 */
export async function lerLeitura(sessionId: string): Promise<LinhaLeitura | null> {
  const db = supabaseOpcional();
  if (!db) return null;

  const { data, error } = await db
    .from('quiz_readings')
    .select('output, dossie, dossie_status')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error || !data) return null;

  const analise = AnaliseSchema.safeParse(data.output);
  if (!analise.success) {
    console.error('[persistencia] a análise salva não bate com o schema', {
      session_id: sessionId,
      issues: analise.error.issues.slice(0, 5).map((i) => i.path.map(String).join('.')),
    });
    return null;
  }

  const bruto = data.dossie;
  const dossie = bruto ? Dossie.safeParse(bruto) : null;

  return {
    analise: analise.data,
    dossie: dossie?.success ? dossie.data : null,
    estado: (data.dossie_status as EstadoDossie) ?? 'pendente',
  };
}

/**
 * Tenta ficar com o trabalho de escrever o dossiê.
 *
 * True significa que esta invocação é a dona e deve gerar. False significa que
 * outra já pegou, e aí o certo é esperar pelo resultado dela em vez de gastar
 * uma segunda chamada gerando o mesmo texto.
 *
 * A atomicidade é do Postgres, num `update ... where` só, dentro da função
 * `claim_dossie` da migração 0002.
 */
export async function reivindicarDossie(sessionId: string): Promise<boolean> {
  const db = supabaseOpcional();
  if (!db) return true;

  const { data, error } = await db.rpc('claim_dossie', { p_session: sessionId });

  if (error) {
    console.error('[persistencia] claim_dossie falhou', error);
    return false;
  }
  return data === true;
}

export async function salvarDossie(
  sessionId: string,
  dossie: DossieLeitura,
  meta: { model: string; latency_ms: number; validacao: unknown },
): Promise<void> {
  const db = supabaseOpcional();
  if (!db) return;

  const { error } = await db
    .from('quiz_readings')
    .update({
      dossie,
      dossie_status: 'pronto',
      dossie_model: meta.model,
      dossie_latency_ms: meta.latency_ms,
      dossie_validation: meta.validacao,
      dossie_erro: null,
    })
    .eq('session_id', sessionId);

  if (error) throw new Error(`não gravou o dossiê: ${error.message}`);
}

/**
 * Solta a trava depois de um erro, pra outra invocação poder tentar.
 *
 * Sem isto, uma falha de rede na chamada 2 deixaria a linha travada em `gerando`
 * por 90 segundos, e a rota do lead ficaria esperando um dossiê que não vem.
 */
export async function marcarFalha(sessionId: string, motivo: string): Promise<void> {
  const db = supabaseOpcional();
  if (!db) return;

  await db
    .from('quiz_readings')
    .update({ dossie_status: 'falhou', dossie_erro: motivo.slice(0, 500) })
    .eq('session_id', sessionId);
}

/**
 * Espera o dossiê que outra invocação está escrevendo.
 *
 * Poll simples no banco. Não é elegante e é o que funciona sem infraestrutura a
 * mais: não existe canal entre duas funções serverless, e pôr fila ou realtime
 * aqui seria trocar uma consulta barata a cada segundo por um sistema inteiro
 * pra manter.
 *
 * Devolve null quando o tempo acabou ou quando a outra invocação desistiu, e aí
 * quem chamou gera na hora.
 */
export async function esperarDossie(
  sessionId: string,
  tetoMs: number,
): Promise<DossieLeitura | null> {
  const ate = Date.now() + tetoMs;

  while (Date.now() < ate) {
    const linha = await lerLeitura(sessionId);
    if (!linha) return null;
    if (linha.dossie && linha.estado === 'pronto') return linha.dossie;
    if (linha.estado === 'falhou' || linha.estado === 'pendente') return null;

    await new Promise((r) => setTimeout(r, 1000));
  }

  return null;
}
