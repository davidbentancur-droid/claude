import { NextResponse } from 'next/server';

import {
  criarSessao,
  gravarCookieSessao,
  hashIp,
  ipDaRequisicao,
  lerCookieSessao,
  type Utm,
} from '@/lib/session';

export const runtime = 'nodejs';

const CHAVES_UTM = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
];

function limparUtm(entrada: unknown): Utm | null {
  if (typeof entrada !== 'object' || entrada === null) return null;
  const bruto = entrada as Record<string, unknown>;
  const saida: Utm = {};
  for (const k of CHAVES_UTM) {
    const v = bruto[k];
    if (typeof v === 'string' && v.length > 0) saida[k] = v.slice(0, 200);
  }
  return Object.keys(saida).length > 0 ? saida : null;
}

export async function POST(req: Request) {
  // Sessão já aberta neste navegador continua valendo. Recarregar a página não
  // pode criar sessão nova, senão as respostas gravadas ficam órfãs.
  const existente = await lerCookieSessao();
  if (existente) {
    return NextResponse.json({ session_id: existente, nova: false });
  }

  let corpo: unknown = {};
  try {
    corpo = await req.json();
  } catch {
    corpo = {};
  }

  const { utm } = corpo as { utm?: unknown };

  try {
    const id = await criarSessao({
      utm: limparUtm(utm),
      userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      ipHash: hashIp(ipDaRequisicao(req)),
    });

    await gravarCookieSessao(id);
    return NextResponse.json({ session_id: id, nova: true });
  } catch (e) {
    console.error('[session] falhou', e);
    return NextResponse.json({ erro: 'sessao_nao_criada' }, { status: 500 });
  }
}
