-- Ranking de creators por métricas do Instagram (Business Discovery da Meta).
-- Mostra pro cliente as inscritas de uma campanha + creators da base (faixa 10k_30k),
-- ordenadas por média de curtidas. A Lara favorita (coração) e as favoritas fixam no topo.
-- O token de leitura e o de edição NÃO ficam aqui (repo é público) - ficam em link_tokens.

-- 1) Snapshot de métricas + membership (inscritas E base convivem na mesma tabela)
create table if not exists public.campanha_metrics (
  id                  uuid primary key default gen_random_uuid(),
  campanha            text not null,
  username            text,            -- @ normalizado (chave de dedup por campanha)
  fonte               text default 'candidatura',   -- 'candidatura' (inscrita) | 'base'
  candidatura_id      uuid references public.campanha_candidaturas(id) on delete cascade,
  creator_id          uuid,            -- creators.id quando fonte='base'
  instagram_raw       text,            -- @ original digitado (pra exibir/linkar)
  nome                text,
  cidade              text,
  portfolio           text,
  seguidores_declarado text,           -- o que a creator declarou (faixa/numero)
  ja_afiliado         text,
  followers           integer,         -- seguidores REAIS (via API)
  media_count         integer,
  avg_likes           integer,         -- média de curtidas dos posts recentes (ordena o ranking)
  avg_comments        integer,
  engagement_rate     numeric,         -- (avg_likes+avg_comments)/followers*100
  profile_picture_url text,
  biography           text,
  posts               jsonb,
  status              text,            -- 'ok' | 'rate_limit' | 'sem_dados'
  erro                text,
  oculto              boolean default false,  -- removida do ranking na mao (o refresh nao traz de volta)
  captured_at         timestamptz default now()
);
create unique index if not exists campanha_metrics_camp_user_uidx on public.campanha_metrics (campanha, username);
create index if not exists campanha_metrics_campanha_idx on public.campanha_metrics (campanha);

alter table public.campanha_metrics enable row level security;
drop policy if exists "campanha_metrics admin all" on public.campanha_metrics;
create policy "campanha_metrics admin all" on public.campanha_metrics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) Favoritos da Lara (curadoria; fixam no topo do ranking)
create table if not exists public.campanha_favoritos (
  campanha  text not null,
  username  text not null,
  criado    timestamptz default now(),
  primary key (campanha, username)
);
alter table public.campanha_favoritos enable row level security;
drop policy if exists "campanha_favoritos admin all" on public.campanha_favoritos;
create policy "campanha_favoritos admin all" on public.campanha_favoritos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3) Token de edição por campanha (só quem tem favorita; o cliente só lê)
alter table public.link_tokens add column if not exists edit_token text;

-- 4) RPC pública (token de leitura): inscritas sempre + base só quando tem métrica; favoritas no topo.
drop function if exists public.campanha_ranking(text, text);
create or replace function public.campanha_ranking(p_campanha text, p_token text)
returns table (
  username text, nome text, instagram text, cidade text, portfolio text,
  seguidores_declarado text, followers int, media_count int,
  avg_likes int, avg_comments int, engagement_rate numeric,
  foto text, ja_afiliado text, status text, fonte text,
  favorito boolean, posicao int, atualizado timestamptz
)
language plpgsql security definer set search_path to 'public'
as $$
#variable_conflict use_column
begin
  if p_token is null or p_token = ''
     or not exists (select 1 from link_tokens lt where lt.campanha = p_campanha and lt.token = p_token) then
    return;
  end if;
  return query
  with base as (
    select m.*, coalesce(m.instagram_raw, m.username) as ig,
           (fav.username is not null) as fav
    from campanha_metrics m
    left join campanha_favoritos fav on fav.campanha = m.campanha and fav.username = m.username
    where m.campanha = p_campanha
      and (m.fonte = 'candidatura' or m.status = 'ok')   -- base entra só com métrica ao vivo
      and not coalesce(m.oculto, false)                  -- esconde as removidas na mão
  ),
  pos as (
    select b2.username as u, row_number() over (order by b2.avg_likes desc) as p
    from base b2 where b2.status = 'ok' and b2.avg_likes is not null
  )
  select
    b.username, b.nome, b.ig, b.cidade, b.portfolio, b.seguidores_declarado,
    b.followers, b.media_count, b.avg_likes, b.avg_comments, b.engagement_rate,
    coalesce(b.profile_picture_url, f.foto_perfil) as foto,
    b.ja_afiliado, b.status, b.fonte, b.fav, pos.p::int as posicao, b.captured_at
  from base b
  left join pos on pos.u = b.username
  left join lateral (
    select cr.foto_perfil from creators cr
    where cr.foto_perfil is not null and cr.foto_perfil <> ''
      and lower(regexp_replace(trim(cr.instagram), '^@+', '')) = b.username
    limit 1
  ) f on true
  order by b.fav desc,
           (b.status = 'ok' and b.avg_likes is not null) desc,
           b.avg_likes desc nulls last, b.nome;
end;
$$;
grant execute on function public.campanha_ranking(text, text) to anon, authenticated;

-- 5) RPC de favoritar (token de EDIÇÃO): só quem tem edit_token pode mexer.
create or replace function public.campanha_fav_toggle(p_campanha text, p_edit_token text, p_username text, p_fav boolean)
returns boolean
language plpgsql security definer set search_path to 'public'
as $$
begin
  if p_edit_token is null or p_edit_token = ''
     or not exists (select 1 from link_tokens where campanha = p_campanha and edit_token = p_edit_token) then
    return null;   -- não autorizado
  end if;
  if p_fav then
    insert into campanha_favoritos (campanha, username) values (p_campanha, lower(p_username))
      on conflict do nothing;
    return true;
  else
    delete from campanha_favoritos where campanha = p_campanha and username = lower(p_username);
    return false;
  end if;
end;
$$;
grant execute on function public.campanha_fav_toggle(text, text, text, boolean) to anon, authenticated;
