-- Mini Dossiê Mítico · registro de erros
--
-- O plano Hobby da Vercel guarda runtime log por uma hora. O Adriano levou um
-- erro às 18:58 de 16/09 e às 12:43 do dia seguinte não havia mais nada pra
-- ler: o diagnóstico foi feito por dedução em cima do código, o que funcionou
-- mas não dá pra repetir toda vez.
--
-- Aqui o erro fica guardado enquanto o projeto existir, e é consultável pelo
-- painel do Supabase e por conector, sem depender do plano da Vercel.

create table if not exists quiz_erros (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  -- Nulo quando o erro acontece antes de existir sessão.
  session_id uuid references quiz_sessions(id) on delete set null,
  rota text not null,
  -- Código curto e estável, pra agrupar. Ex: 'leitura_falhou', 'nao_gravou'.
  codigo text not null,
  -- Mensagem técnica. Nunca leva resposta do usuário nem chave de API.
  detalhe text,
  user_agent text
);

create index if not exists quiz_erros_created_idx on quiz_erros (created_at desc);
create index if not exists quiz_erros_codigo_idx on quiz_erros (codigo, created_at desc);

alter table quiz_erros enable row level security;

-- Nenhuma policy, como no resto do esquema: só o service role escreve e lê.

/*
 * A visão que responde "o que quebrou hoje", que é a pergunta que realmente se
 * faz quando alguém avisa que deu erro.
 */
create or replace view erros_recentes as
select
  e.created_at,
  e.rota,
  e.codigo,
  e.detalhe,
  s.status as status_da_sessao,
  (select count(*) from quiz_answers a where a.session_id = e.session_id) as respostas_dadas,
  e.user_agent,
  e.session_id
from quiz_erros e
left join quiz_sessions s on s.id = e.session_id
order by e.created_at desc;

alter view erros_recentes set (security_invoker = on);
