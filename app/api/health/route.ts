import { NextResponse } from 'next/server';

import { temRateLimit, temSupabase } from '@/lib/env';
import { provedor } from '@/lib/engine/provedor';
import { temVsl } from '@/lib/public-env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Diagnóstico pro QA e pro deploy. Diz quais dependências estão ligadas, sem
 * jamais devolver valor de chave nenhuma.
 *
 * Com `?probe=1` faz uma chamada mínima de verdade ao provedor configurado e
 * classifica o resultado. Existe porque "a env está preenchida" e "a env está
 * correta" são coisas diferentes, e a diferença entre elas só aparece quando o
 * usuário já está esperando a leitura na tela.
 */

/**
 * Classifica o erro sem repetir a mensagem do fornecedor. Mensagem de erro de
 * API costuma ecoar um prefixo da chave, e isso não pode sair por uma rota
 * pública.
 */
function classificar(e: unknown): string {
  const status = (e as { status?: number })?.status;

  if (status === 401 || status === 403) return 'chave_recusada';
  if (status === 404) return 'modelo_nao_encontrado';
  if (status === 429) return 'sem_saldo_ou_limite';
  if (typeof status === 'number' && status >= 500) return 'fornecedor_fora';
  if (status === 400) return 'requisicao_invalida';

  return 'erro_desconhecido';
}

export async function GET(req: Request) {
  let promptMae: 'ok' | 'ausente' = 'ausente';
  try {
    const { promptMae: ler } = await import('@/lib/engine/system-prompt');
    promptMae = ler().length > 2000 ? 'ok' : 'ausente';
  } catch {
    promptMae = 'ausente';
  }

  const base = {
    ok: true,
    prompt_mae: promptMae,
    engine_provider: process.env.ENGINE_PROVIDER ?? 'anthropic',
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    anthropic_model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
    openai: Boolean(process.env.OPENAI_API_KEY),
    openai_engine_model: process.env.OPENAI_ENGINE_MODEL ?? 'gpt-5',
    engine_effort: process.env.ENGINE_EFFORT ?? 'medium',
    supabase: temSupabase(),
    rate_limit: temRateLimit(),
    vsl: temVsl,
  };

  if (new URL(req.url).searchParams.get('probe') !== '1') {
    return NextResponse.json(base);
  }

  const motor = provedor();
  const comeco = Date.now();

  try {
    const r = await motor.chamar({
      system: 'Responde só com a palavra pronto.',
      mensagens: [{ role: 'user', content: 'diz pronto' }],
      // Folgado de propósito: nos modelos de raciocínio os tokens de
      // pensamento contam aqui dentro, e um teto apertado devolve 400 mesmo
      // com a chave certa, que foi como esta sonda mentiu na primeira versão.
      maxTokens: 2000,
      esforco: 'low',
      pensar: false,
      json: false,
    });

    return NextResponse.json({
      ...base,
      probe: {
        provedor: motor.nome,
        modelo: motor.modelo,
        ok: r.texto.length > 0,
        ms: Date.now() - comeco,
      },
    });
  } catch (e) {
    return NextResponse.json({
      ...base,
      probe: {
        provedor: motor.nome,
        modelo: motor.modelo,
        ok: false,
        motivo: classificar(e),
        ms: Date.now() - comeco,
      },
    });
  }
}
