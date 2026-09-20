import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  COOKIE_PAINEL,
  DURACAO_SEGUNDOS,
  criarToken,
  iguais,
  senhaDoPainel,
} from '@/lib/painel/sessao';

export const runtime = 'nodejs';

/**
 * Entra no painel.
 *
 * Duas defesas contra força bruta, e as duas são baratas. A comparação é de
 * tempo constante, então tentativa errada não vaza o prefixo certo. E toda
 * resposta, certa ou errada, espera o mesmo tanto: sem isso o "errado"
 * responderia na hora e o "certo" só depois do HMAC, e a diferença de tempo
 * seria um oráculo.
 *
 * Não tem contador de tentativa de propósito. Contador precisa de estado
 * compartilhado, e a senha é longa o bastante pra que força bruta pela rede não
 * seja o caminho mais fácil aqui.
 */
const ESPERA_MS = 400;

export async function POST(req: Request) {
  const comecou = Date.now();

  const igualar = async (res: NextResponse) => {
    const falta = ESPERA_MS - (Date.now() - comecou);
    if (falta > 0) await new Promise((r) => setTimeout(r, falta));
    return res;
  };

  const senha = senhaDoPainel();
  if (senha === null) {
    return igualar(
      NextResponse.json({ erro: 'painel_desligado' }, { status: 503 }),
    );
  }

  let informada = '';
  try {
    const corpo = (await req.json()) as { senha?: unknown };
    informada = typeof corpo.senha === 'string' ? corpo.senha : '';
  } catch {
    informada = '';
  }

  if (!iguais(informada, senha)) {
    return igualar(NextResponse.json({ erro: 'senha_errada' }, { status: 401 }));
  }

  const jar = await cookies();
  jar.set(COOKIE_PAINEL, await criarToken(senha), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACAO_SEGUNDOS,
  });

  return igualar(NextResponse.json({ ok: true }));
}
