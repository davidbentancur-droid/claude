import { NextResponse } from 'next/server';

import { temRateLimit, temSupabase } from '@/lib/env';
import { temVsl } from '@/lib/public-env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnóstico pro QA e pro deploy. Diz quais dependências estão ligadas, sem
 * jamais devolver valor de chave nenhuma.
 */
export async function GET() {
  let promptMae: 'ok' | 'ausente' = 'ausente';
  try {
    const { promptMae: ler } = await import('@/lib/engine/system-prompt');
    promptMae = ler().length > 2000 ? 'ok' : 'ausente';
  } catch {
    promptMae = 'ausente';
  }

  return NextResponse.json({
    ok: true,
    prompt_mae: promptMae,
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    anthropic_model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
    openai: Boolean(process.env.OPENAI_API_KEY),
    supabase: temSupabase(),
    rate_limit: temRateLimit(),
    vsl: temVsl,
  });
}
