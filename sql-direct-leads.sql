-- ============================================================
-- Lista de interessadas do "Direct no Automático"
-- (quem entrou na página e não comprou agora)
-- Rodar 1x no SQL Editor do projeto "Cadastro de Creators"
-- (mfrmnquvwwuxraqgemyh). Seguro re-rodar.
-- ============================================================

create table if not exists public.direct_leads (
  id         bigint generated always as identity primary key,
  nome       text,
  email      text not null,
  session_id text,
  referrer   text,
  created_at timestamptz not null default now()
);

-- um e-mail só entra uma vez
create unique index if not exists direct_leads_email_idx on public.direct_leads (lower(email));
create index if not exists direct_leads_created_idx on public.direct_leads (created_at);

alter table public.direct_leads enable row level security;

-- a página (chave anon) só pode INSERIR. Ninguém de fora consegue ler a lista.
drop policy if exists "direct leads insert publico" on public.direct_leads;
create policy "direct leads insert publico" on public.direct_leads
  for insert to anon, authenticated with check (true);

drop policy if exists "direct leads select logado" on public.direct_leads;
create policy "direct leads select logado" on public.direct_leads
  for select to authenticated using (true);

-- o evento 'lead' passa a valer no rastreamento
alter table public.direct_events drop constraint if exists direct_events_event_type_check;
alter table public.direct_events add constraint direct_events_event_type_check
  check (event_type in ('visita','chat','secao','clique','lead'));

-- estatísticas: soma os e-mails capturados
create or replace function public.direct_stats()
returns json
language sql
security definer
set search_path = public
as $$
  with sp_today as (
    select (date_trunc('day', now() at time zone 'America/Sao_Paulo')
            at time zone 'America/Sao_Paulo') as ts
  ),
  base as (select * from public.direct_events)
  select json_build_object(
    'visitas_total',     (select count(*) from base where event_type='visita'),
    'visitantes_unicos', (select count(distinct session_id) from base where event_type='visita'),
    'visitas_hoje',      (select count(*) from base where event_type='visita' and created_at >= (select ts from sp_today)),
    'visitas_7d',        (select count(*) from base where event_type='visita' and created_at >= now() - interval '7 days'),
    'sessoes_responderam', (select count(distinct session_id) from base where event_type='chat'),
    'respostas_total',     (select count(*) from base where event_type='chat'),
    'sessoes_fim_chat',    (select count(distinct session_id) from base where event_type='chat' and passo='solucao'),
    'escolhas', (
      select coalesce(json_agg(json_build_object('passo',passo,'escolha',escolha,'sessoes',s) order by passo, s desc), '[]'::json)
      from (
        select coalesce(passo,'?') as passo, coalesce(escolha,'?') as escolha, count(distinct session_id) as s
        from base where event_type='chat' group by 1,2
      ) t
    ),
    'secoes', (
      select coalesce(json_object_agg(passo, s), '{}'::json)
      from (
        select coalesce(passo,'?') as passo, count(distinct session_id) as s
        from base where event_type='secao' group by 1
      ) t
    ),
    'cliques_total',    (select count(*) from base where event_type='clique'),
    'cliques_checkout', (select count(*) from base where event_type='clique' and to_checkout),
    'sessoes_clicaram', (select count(distinct session_id) from base where event_type='clique'),
    'cliques_hoje',     (select count(*) from base where event_type='clique' and created_at >= (select ts from sp_today)),
    'por_cta', (
      select coalesce(json_object_agg(cta, c), '{}'::json)
      from (
        select coalesce(cta,'?') as cta, count(*) as c from base where event_type='clique' group by 1 order by 2 desc
      ) t
    ),
    'leads_total', (select count(*) from public.direct_leads),
    'leads_hoje',  (select count(*) from public.direct_leads where created_at >= (select ts from sp_today)),
    'serie_7d', (
      select coalesce(json_agg(json_build_object('dia', d, 'visitas', v, 'cliques', c) order by d), '[]'::json)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as d,
               count(*) filter (where event_type='visita') as v,
               count(*) filter (where event_type='clique') as c
        from base where created_at >= now() - interval '7 days' group by 1
      ) t
    )
  );
$$;

revoke all on function public.direct_stats() from public, anon;
grant execute on function public.direct_stats() to authenticated;
