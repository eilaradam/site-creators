-- ============================================================
-- Analytics do "Direct no Automático" (direct.laradam.com)
-- Rodar 1x no SQL Editor do projeto "Cadastro de Creators"
-- (mfrmnquvwwuxraqgemyh). Seguro re-rodar (idempotente).
--
-- O que a página grava:
--   visita  -> alguém abriu a página
--   chat    -> clicou numa resposta do chat  (passo = bloco, escolha = texto)
--   secao   -> chegou numa seção da página   (passo = como|curso|duvidas)
--   clique  -> clicou num botão de compra    (cta = preco|final|barra)
-- ============================================================

create table if not exists public.direct_events (
  id          bigint generated always as identity primary key,
  event_type  text not null check (event_type in ('visita','chat','secao','clique')),
  passo       text,                            -- bloco do chat ou id da seção
  escolha     text,                            -- texto do botão de resposta
  cta         text,                            -- qual botão de compra
  to_checkout boolean not null default false,
  session_id  text,                            -- visitante (localStorage)
  page_path   text,
  referrer    text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists direct_events_created_idx on public.direct_events(created_at);
create index if not exists direct_events_type_idx    on public.direct_events(event_type);
create index if not exists direct_events_sess_idx    on public.direct_events(session_id);

alter table public.direct_events enable row level security;

drop policy if exists "direct insert publico" on public.direct_events;
create policy "direct insert publico" on public.direct_events
  for insert to anon, authenticated with check (true);

drop policy if exists "direct select logado" on public.direct_events;
create policy "direct select logado" on public.direct_events
  for select to authenticated using (true);

-- ------------------------------------------------------------
-- Estatísticas agregadas (evita o cap de 1000 linhas do PostgREST)
-- ------------------------------------------------------------
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

    -- funil do chat
    'sessoes_responderam', (select count(distinct session_id) from base where event_type='chat'),
    'respostas_total',     (select count(*) from base where event_type='chat'),
    'sessoes_fim_chat',    (select count(distinct session_id) from base where event_type='chat' and passo='solucao'),

    -- o que responderam, por pergunta
    'escolhas', (
      select coalesce(json_agg(json_build_object('passo',passo,'escolha',escolha,'sessoes',s) order by passo, s desc), '[]'::json)
      from (
        select coalesce(passo,'?') as passo, coalesce(escolha,'?') as escolha,
               count(distinct session_id) as s
        from base where event_type='chat'
        group by 1,2
      ) t
    ),

    -- até onde rolaram
    'secoes', (
      select coalesce(json_object_agg(passo, s), '{}'::json)
      from (
        select coalesce(passo,'?') as passo, count(distinct session_id) as s
        from base where event_type='secao'
        group by 1
      ) t
    ),

    -- cliques em comprar
    'cliques_total',    (select count(*) from base where event_type='clique'),
    'cliques_checkout', (select count(*) from base where event_type='clique' and to_checkout),
    'sessoes_clicaram', (select count(distinct session_id) from base where event_type='clique'),
    'cliques_hoje',     (select count(*) from base where event_type='clique' and created_at >= (select ts from sp_today)),
    'por_cta', (
      select coalesce(json_object_agg(cta, c), '{}'::json)
      from (
        select coalesce(cta,'?') as cta, count(*) as c
        from base where event_type='clique'
        group by 1 order by 2 desc
      ) t
    ),

    -- últimos 7 dias, dia a dia
    'serie_7d', (
      select coalesce(json_agg(json_build_object('dia', d, 'visitas', v, 'cliques', c) order by d), '[]'::json)
      from (
        select (created_at at time zone 'America/Sao_Paulo')::date as d,
               count(*) filter (where event_type='visita') as v,
               count(*) filter (where event_type='clique') as c
        from base
        where created_at >= now() - interval '7 days'
        group by 1
      ) t
    )
  );
$$;

revoke all on function public.direct_stats() from public, anon;
grant execute on function public.direct_stats() to authenticated;
