import { createHash, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

import { env } from './env';
import { supabaseOpcional, type StatusSessao } from './supabase';

/**
 * Sessão do quiz.
 *
 * O `session_id` nasce no servidor, vive em cookie httpOnly e é espelhado no
 * localStorage só pra recuperar respostas depois de um refresh. O cookie é a
 * autoridade: `/api/lead` confere a sessão por ele, então um id forjado no
 * localStorage não abre o dossiê de ninguém.
 */

export const COOKIE = 'mdm_sid';
const MAX_IDADE = 60 * 60 * 24 * 7; // 7 dias

export function novoId(): string {
  return randomUUID();
}

export async function lerCookieSessao(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function gravarCookieSessao(id: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_IDADE,
  });
}

/**
 * Hash de IP com sal. Sem `IP_HASH_SALT` configurado, não guarda nada: IP cru em
 * banco é dado pessoal sem motivo, e o uso aqui é só contagem grosseira.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const sal = env.ipSalt;
  if (!sal) return null;
  return createHash('sha256').update(sal).update(ip).digest('hex').slice(0, 32);
}

export function ipDaRequisicao(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

export type Utm = Record<string, string>;

export async function criarSessao(dados: {
  utm: Utm | null;
  userAgent: string | null;
  ipHash: string | null;
}): Promise<string> {
  const id = novoId();
  const db = supabaseOpcional();

  if (db) {
    const { error } = await db.from('quiz_sessions').insert({
      id,
      status: 'started',
      utm: dados.utm,
      user_agent: dados.userAgent,
      ip_hash: dados.ipHash,
    });
    if (error) throw new Error(`Não gravou a sessão: ${error.message}`);
  }

  return id;
}

export async function atualizarStatus(id: string, status: StatusSessao): Promise<void> {
  const db = supabaseOpcional();
  if (!db) return;
  await db.from('quiz_sessions').update({ status }).eq('id', id);
}

export type Sessao = { id: string; status: StatusSessao };

export async function buscarSessao(id: string): Promise<Sessao | null> {
  const db = supabaseOpcional();
  // Sem banco, o portão não tem como conferir. Em desenvolvimento isso libera o
  // fluxo; em produção `temSupabase()` é sempre true e o portão vale.
  if (!db) return { id, status: 'spoiler_shown' };

  const { data, error } = await db
    .from('quiz_sessions')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id as string, status: data.status as StatusSessao };
}
