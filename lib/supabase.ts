import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env, temSupabase } from './env';

/**
 * Cliente de service role. Só servidor.
 *
 * RLS está ligado em todas as tabelas e não existe policy pública, então esta é a
 * única porta de escrita. Nunca importar este arquivo de componente de cliente.
 */

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cliente === null) {
    cliente = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

/**
 * Sem Supabase configurado a aplicação roda inteira, só não persiste. Serve pra
 * desenvolvimento local e pra preview antes das envs entrarem. A cada gravação
 * ignorada sai um aviso, pra ninguém achar que gravou.
 */
export function supabaseOpcional(): SupabaseClient | null {
  if (!temSupabase()) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[supabase] sem SUPABASE_URL ou SERVICE_ROLE_KEY, gravação ignorada');
    }
    return null;
  }
  return supabase();
}

export type StatusSessao =
  | 'started'
  | 'answering'
  | 'reading'
  | 'spoiler_shown'
  | 'released'
  | 'risk'
  | 'joke'
  | 'error';
