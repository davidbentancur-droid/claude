import { NextResponse } from 'next/server';

import { eventoValido } from '@/lib/eventos';
import { lerCookieSessao } from '@/lib/session';
import { supabaseOpcional } from '@/lib/supabase';

/**
 * Recebe o evento de funil do cliente e grava.
 *
 * A sessão vem do cookie httpOnly, nunca do corpo. O cliente diz o que
 * aconteceu; quem aconteceu é o servidor que sabe. Sem isso, um corpo forjado
 * escreveria evento na sessão de outro e o funil do painel viraria ficção.
 *
 * Responde 204 sempre, inclusive quando descarta. A chamada sai por
 * `sendBeacon` e ninguém do outro lado lê a resposta, então corpo de erro aqui
 * é trabalho jogado fora, e código de erro só encheria o console do usuário.
 */
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const corpo = (await req.json()) as { evento?: unknown };
    if (!eventoValido(corpo.evento)) return new NextResponse(null, { status: 204 });

    const sessionId = await lerCookieSessao();
    const db = supabaseOpcional();
    if (db === null) return new NextResponse(null, { status: 204 });

    /*
     * `ignoreDuplicates` casa com o índice único da migração 0004: um evento
     * por sessão, porque o funil conta gente e não clique. Quem abre o
     * WhatsApp, volta e abre de novo é uma pessoa, não duas, e sem isso a
     * etapa de baixo passaria a de cima.
     */
    await db
      .from('quiz_eventos')
      .upsert(
        { session_id: sessionId, evento: corpo.evento },
        { onConflict: 'session_id,evento', ignoreDuplicates: true },
      );
  } catch {
    // Telemetria não derruba nada. Mesma regra do `lib/erros.ts`.
  }

  return new NextResponse(null, { status: 204 });
}
