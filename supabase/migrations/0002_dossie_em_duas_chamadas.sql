-- Mini Dossiê Mítico · a leitura em duas chamadas
--
-- A chamada 1 grava a análise e o spoiler em `output`, como sempre fez. A
-- chamada 2 roda depois, enquanto o cara preenche o formulário, e grava o texto
-- do dossiê aqui nas colunas novas.
--
-- Motivo do corte: a função serverless tem 60 s no plano Hobby, e numa passada
-- só o modelo gastava o orçamento inteiro decidindo, sobrando uma tentativa mal
-- aparada pro texto. Medido em três rodadas contra a fixture do Marcelo, o
-- dossiê saía em 492 palavras contra um teto de 420.

alter table quiz_readings
  add column if not exists dossie jsonb,
  add column if not exists dossie_status text not null default 'pendente',
  add column if not exists dossie_model text,
  add column if not exists dossie_validation jsonb,
  add column if not exists dossie_latency_ms int,
  add column if not exists dossie_claimed_at timestamptz,
  add column if not exists dossie_erro text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quiz_readings_dossie_status_check'
  ) then
    alter table quiz_readings
      add constraint quiz_readings_dossie_status_check
      check (dossie_status in ('pendente','gerando','pronto','falhou'));
  end if;
end $$;

-- Linhas antigas guardam a leitura inteira em `output`, dossiê junto. Elas
-- continuam válidas: o dossiê sai de lá e o status já nasce pronto.
update quiz_readings
set dossie = output -> 'dossie',
    dossie_status = 'pronto'
where dossie is null
  and output ? 'dossie';

-- Índice pra rota do lead achar rápido o que ainda está em voo.
create index if not exists quiz_readings_dossie_status_idx
  on quiz_readings (dossie_status)
  where dossie_status in ('pendente','gerando');

/*
 * A trava da chamada 2.
 *
 * Dois caminhos podem disparar a escrita: o cliente, assim que o spoiler
 * aparece, e a rota do lead, como plano B quando o cliente não disparou. Sem
 * trava os dois geram o mesmo dossiê em paralelo, gastando duas chamadas e
 * gravando por cima um do outro.
 *
 * `update ... where` num comando só é atômico no Postgres, então quem conseguir
 * mudar a linha ganha o trabalho e todo mundo mais recebe false e vai esperar.
 *
 * A janela de 90 segundos recupera o caso da função ter morrido no meio: o
 * teto de execução é 60 s, então passado esse tempo mais folga, a reivindicação
 * anterior não existe mais e alguém pode pegar de novo.
 */
create or replace function claim_dossie(p_session uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linhas int;
begin
  update quiz_readings
  set dossie_status = 'gerando',
      dossie_claimed_at = now()
  where session_id = p_session
    and (
      dossie_status in ('pendente', 'falhou')
      or (
        dossie_status = 'gerando'
        and dossie_claimed_at < now() - interval '90 seconds'
      )
    );

  get diagnostics v_linhas = row_count;
  return v_linhas > 0;
end $$;

revoke all on function claim_dossie(uuid) from public, anon, authenticated;
