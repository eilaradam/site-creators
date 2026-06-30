-- ============================================================
-- Analytics da Imersão (imersao.laradam.com)
-- Rodar 1x no SQL Editor do projeto "Cadastro de Creators"
-- (mfrmnquvwwuxraqgemyh). Seguro re-rodar (idempotente).
-- ============================================================

create table if not exists public.imersao_events (
  id          bigint generated always as identity primary key,
  event_type  text not null check (event_type in ('visita','clique')),
  cta         text,                       -- qual botão: hero/banner/preco/final/sticky/suporte
  to_checkout boolean not null default false, -- clique levou pro checkout (Kiwify)?
  session_id  text,                       -- id do visitante (localStorage) p/ únicos
  page_path   text,
  referrer    text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists imersao_events_created_idx on public.imersao_events(created_at);
create index if not exists imersao_events_type_idx    on public.imersao_events(event_type);

alter table public.imersao_events enable row level security;

-- Escrita pública: o site estático (chave anon) registra visita/clique.
drop policy if exists "imersao insert publico" on public.imersao_events;
create policy "imersao insert publico" on public.imersao_events
  for insert to anon, authenticated with check (true);

-- Leitura só pra admin logado.
drop policy if exists "imersao select logado" on public.imersao_events;
create policy "imersao select logado" on public.imersao_events
  for select to authenticated using (true);

-- ------------------------------------------------------------
-- Função de estatísticas agregadas (evita o cap de 1000 linhas
-- do PostgREST). Só admin logado pode chamar.
-- ------------------------------------------------------------
create or replace function public.imersao_stats()
returns json
language sql
security definer
set search_path = public
as $$
  with sp_today as (
    select (date_trunc('day', now() at time zone 'America/Sao_Paulo')
            at time zone 'America/Sao_Paulo') as ts
  )
  select json_build_object(
    'visitas_total',       count(*) filter (where event_type='visita'),
    'visitantes_unicos',   count(distinct session_id) filter (where event_type='visita'),
    'cliques_total',       count(*) filter (where event_type='clique'),
    'cliques_checkout',    count(*) filter (where event_type='clique' and to_checkout),
    'visitas_hoje',        count(*) filter (where event_type='visita' and created_at >= (select ts from sp_today)),
    'cliques_checkout_hoje', count(*) filter (where event_type='clique' and to_checkout and created_at >= (select ts from sp_today)),
    'visitas_7d',          count(*) filter (where event_type='visita' and created_at >= now() - interval '7 days'),
    'cliques_checkout_7d', count(*) filter (where event_type='clique' and to_checkout and created_at >= now() - interval '7 days'),
    'por_cta', (
      select coalesce(json_object_agg(cta, c), '{}'::json)
      from (
        select coalesce(cta,'?') as cta, count(*) as c
        from public.imersao_events
        where event_type='clique'
        group by 1
        order by 2 desc
      ) t
    )
  )
  from public.imersao_events;
$$;

revoke all on function public.imersao_stats() from public, anon;
grant execute on function public.imersao_stats() to authenticated;
