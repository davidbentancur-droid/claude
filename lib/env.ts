/**
 * Leitura de variáveis de ambiente do servidor.
 *
 * Nada aqui pode ser importado por componente de cliente. As `NEXT_PUBLIC_*`
 * ficam em `lib/public-env.ts`, separadas de propósito, pra não haver caminho de
 * import que arraste uma chave pro bundle.
 */

function obrigatoria(nome: string): string {
  const v = process.env[nome];
  if (!v || v.trim().length === 0) {
    throw new Error(`Falta a variável de ambiente ${nome}.`);
  }
  return v;
}

function opcional(nome: string, padrao = ''): string {
  return process.env[nome]?.trim() || padrao;
}

export const env = {
  get anthropicKey() {
    return obrigatoria('ANTHROPIC_API_KEY');
  },
  /**
   * Família Claude 5. O planejamento fixa `claude-sonnet-4-6`, que é geração
   * anterior. Se a Rodada 1 sair rasa, trocar por `claude-opus-5` aqui na env,
   * sem tocar em código.
   */
  get anthropicModel() {
    return opcional('ANTHROPIC_MODEL', 'claude-sonnet-5');
  },
  get openaiKey() {
    return obrigatoria('OPENAI_API_KEY');
  },
  get transcriptionModel() {
    return opcional('OPENAI_TRANSCRIPTION_MODEL', 'gpt-4o-transcribe');
  },
  get supabaseUrl() {
    return obrigatoria('SUPABASE_URL');
  },
  get supabaseServiceKey() {
    return obrigatoria('SUPABASE_SERVICE_ROLE_KEY');
  },
  /** Pendência do Prompt Mãe Seção 12: forçar o gancho em blocos pra comparar conversão. */
  get spoilerGancho() {
    const v = opcional('SPOILER_GANCHO', 'auto');
    return v === 'eco' || v === 'arquetipo' ? v : 'auto';
  },
  get upstashUrl() {
    return opcional('UPSTASH_REDIS_REST_URL');
  },
  get upstashToken() {
    return opcional('UPSTASH_REDIS_REST_TOKEN');
  },
  /** Sal do hash de IP. Sem ele, não guarda IP nenhum. */
  get ipSalt() {
    return opcional('IP_HASH_SALT');
  },
} as const;

export function temSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function temRateLimit(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}
