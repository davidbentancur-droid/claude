-- Eventos do funil depois do dossiê.
--
-- O `lib/tracking.ts` sempre empurrou evento pro dataLayer do GTM e pro Pixel, e
-- nada disso volta pra cá. Quer dizer: da abertura da página até o lead salvo o
-- banco sabe tudo, porque cada etapa deixa linha própria em quiz_sessions,
-- quiz_answers, quiz_readings e quiz_leads. Depois do dossiê o banco é cego.
-- Quem viu a VSL, quem clicou no WhatsApp, quem desceu pro downsell e quem foi
-- pro checkout existia só no GTM, que não dá pra cruzar com o lead.
--
-- Esta tabela fecha esse buraco. Ela não recupera histórico, porque o dado nunca
-- foi gravado, então o funil no painel mostra as etapas de baixo a partir da
-- data em que esta migração subiu.

create table if not exists quiz_eventos (
  id bigserial primary key,
  session_id uuid references quiz_sessions(id) on delete cascade,
  evento text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quiz_eventos_evento_data
  on quiz_eventos (evento, created_at desc);

create index if not exists quiz_eventos_sessao
  on quiz_eventos (session_id);

-- Um evento por sessão, e é de propósito.
--
-- O funil conta gente, não clique. Um cara que abre o WhatsApp, volta e abre de
-- novo é uma pessoa que foi pro WhatsApp, não duas. Sem esta trava a etapa de
-- baixo passaria da de cima e o funil viraria ampulheta. A rota grava com
-- `on conflict do nothing`.
create unique index if not exists quiz_eventos_um_por_sessao
  on quiz_eventos (session_id, evento)
  where session_id is not null;

-- Mesma postura das outras tabelas: RLS ligado e zero policy, então só a service
-- role escreve e lê. O painel roda no servidor e usa essa chave.
alter table quiz_eventos enable row level security;

-- A linha do tempo de uma sessão, do jeito que o painel precisa ler.
--
-- Junta o que o status da sessão já conta com o que a tabela de eventos passou a
-- contar, numa linha só por sessão. Sem isto o painel faria seis consultas e
-- cruzaria na memória.
create or replace view funil_por_sessao as
select
  s.id as session_id,
  s.created_at,
  s.status,
  s.utm,
  (select count(*) from quiz_answers a where a.session_id = s.id) as respostas_dadas,
  (select count(*) > 0 from quiz_readings r where r.session_id = s.id) as teve_leitura,
  l.id is not null as virou_lead,
  l.nome,
  l.whatsapp,
  l.profissao,
  l.orcamento_raw,
  l.orcamento_faixa,
  l.ato,
  l.movimento,
  l.arquetipo,
  l.dor_literal,
  exists (select 1 from quiz_eventos e where e.session_id = s.id and e.evento = 'dossie_visto') as viu_dossie,
  exists (select 1 from quiz_eventos e where e.session_id = s.id and e.evento = 'vsl_visivel') as viu_vsl,
  exists (select 1 from quiz_eventos e where e.session_id = s.id and e.evento = 'whatsapp') as foi_whatsapp,
  exists (select 1 from quiz_eventos e where e.session_id = s.id and e.evento = 'downsell_visto') as viu_downsell,
  exists (select 1 from quiz_eventos e where e.session_id = s.id and e.evento = 'downsell_checkout') as foi_checkout
from quiz_sessions s
left join quiz_leads l on l.session_id = s.id;

alter view funil_por_sessao set (security_invoker = on);
