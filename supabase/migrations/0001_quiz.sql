-- Mini Dossiê Mítico · esquema do quiz
-- Planejamento Seção 4.
--
-- RLS ligado em tudo e nenhuma policy pública. A única porta de escrita é o
-- service role, usado só nos route handlers. Cliente nenhum fala com o banco.

create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'started'
    check (status in ('started','answering','reading','spoiler_shown','released','risk','joke','error')),
  utm jsonb,
  user_agent text,
  ip_hash text
);

create table if not exists quiz_answers (
  id bigserial primary key,
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  pergunta smallint not null check (pergunta between 1 and 4),
  texto text not null,
  repescagem text,
  via text not null default 'texto' check (via in ('texto','audio')),
  created_at timestamptz not null default now(),
  unique (session_id, pergunta)
);

create table if not exists quiz_readings (
  session_id uuid primary key references quiz_sessions(id) on delete cascade,
  model text,
  output jsonb not null,
  validation jsonb,
  latency_ms int,
  created_at timestamptz not null default now()
);

create table if not exists quiz_leads (
  id bigserial primary key,
  session_id uuid unique references quiz_sessions(id) on delete cascade,
  nome text not null,
  whatsapp text not null,
  whatsapp_raw text not null,
  profissao text not null,
  orcamento_raw text not null,
  orcamento_faixa text check (orcamento_faixa in ('dezenas','centenas','milhares','indefinido')),
  ato text,
  movimento text,
  arquetipo text,
  dor_literal text,
  created_at timestamptz not null default now()
);

create index if not exists quiz_answers_session_idx on quiz_answers (session_id);
create index if not exists quiz_sessions_created_idx on quiz_sessions (created_at desc);
create index if not exists quiz_leads_created_idx on quiz_leads (created_at desc);

alter table quiz_sessions enable row level security;
alter table quiz_answers  enable row level security;
alter table quiz_readings enable row level security;
alter table quiz_leads    enable row level security;

-- Nenhuma policy. Sem policy e com RLS ligado, anon e authenticated não leem
-- nem escrevem nada. O service role passa por cima de RLS por desenho.

-- A view que o Prompt Mãe Seção 4.3 descreve: o que fica registrado junto do
-- lead pro momento do contato no WhatsApp. A dor literal abre a conversa.
create or replace view leads_para_contato as
select
  l.created_at,
  l.nome,
  l.whatsapp,
  l.profissao,
  l.orcamento_raw,
  l.orcamento_faixa,
  l.ato,
  l.movimento,
  l.arquetipo,
  l.dor_literal,
  a1.texto as p1_sete_anos,
  a1.repescagem as p1_repescagem,
  a2.texto as p2_agora,
  a2.repescagem as p2_repescagem,
  a3.texto as p3_busca_obstaculo,
  a4.texto as p4_preco,
  a4.repescagem as p4_repescagem,
  s.utm,
  l.session_id
from quiz_leads l
join quiz_sessions s on s.id = l.session_id
left join quiz_answers a1 on a1.session_id = l.session_id and a1.pergunta = 1
left join quiz_answers a2 on a2.session_id = l.session_id and a2.pergunta = 2
left join quiz_answers a3 on a3.session_id = l.session_id and a3.pergunta = 3
left join quiz_answers a4 on a4.session_id = l.session_id and a4.pergunta = 4
order by l.created_at desc;

-- A view herda a checagem de permissão de quem consulta, então ela não é uma
-- porta lateral: pelo painel do Supabase (service role) lê, pela chave anon não.
alter view leads_para_contato set (security_invoker = on);
