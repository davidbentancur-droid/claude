import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { COOKIE_PAINEL } from '@/lib/painel/sessao';

export const runtime = 'nodejs';

/**
 * Sai do painel.
 *
 * Existe porque o Basic Auth não tinha como sair sem fechar o navegador, e num
 * computador compartilhado isso importa: a página lista telefone e resposta de
 * gente de verdade.
 */
export async function POST() {
  const jar = await cookies();
  jar.set(COOKIE_PAINEL, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
