-- Ranking de creators por métricas do Instagram (Business Discovery da Meta).
-- Tabela de snapshot + RPC pública com token (pra mostrar pro cliente da campanha).
-- Roda 1x via Management API. O token de cada campanha NÃO fica aqui (repo é público) -
-- é inserido à parte em link_tokens (mesmo padrão do sql-inscritas.sql).

-- 1) Snapshot das métricas (1 linha por candidatura, atualizado pela função campanha-metrics)
create table if not exists public.campanha_metrics (
  id                  uuid primary key default gen_random_uuid(),
  candidatura_id      uuid not null references public.campanha_candidaturas(id) on delete cascade,
  campanha            text not null,
  username            text,            -- @ normalizado usado no Business Discovery
  nome                text,
  followers           integer,         -- seguidores REAIS (via API)
  media_count         integer,
  avg_likes           integer,         -- média de curtidas dos posts recentes
  avg_comments        integer,         -- média de comentários dos posts recentes
  engagement_rate     numeric,         -- (avg_likes+avg_comments)/followers*100
  profile_picture_url text,
  biography           text,
  posts               jsonb,           -- amostra dos posts recentes
  status              text,            -- 'ok' | 'sem_dados' (conta pessoal / erro)
  erro                text,
  captured_at         timestamptz default now(),
  unique (candidatura_id)
);
create index if not exists campanha_metrics_campanha_idx on public.campanha_metrics (campanha);

alter table public.campanha_metrics enable row level security;
-- só admin lê direto; o cliente lê pela RPC (SECURITY DEFINER) com token.
drop policy if exists "campanha_metrics admin all" on public.campanha_metrics;
create policy "campanha_metrics admin all" on public.campanha_metrics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 2) RPC pública com token: devolve o ranking já ordenado por média de curtidas.
--    NÃO devolve whatsapp/email (contato fica escondido do cliente). Fail-closed no token.
create or replace function public.campanha_ranking(p_campanha text, p_token text)
returns table (
  nome                text,
  instagram           text,
  cidade              text,
  portfolio           text,
  seguidores_declarado text,
  followers           integer,
  media_count         integer,
  avg_likes           integer,
  avg_comments        integer,
  engagement_rate     numeric,
  foto                text,
  ja_afiliado         text,
  status              text,
  atualizado          timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_token is null or p_token = ''
     or not exists (select 1 from public.link_tokens
                    where campanha = p_campanha and token = p_token) then
    return;
  end if;
  return query
    select
      c.nome,
      c.instagram,
      c.cidade,
      c.respostas->>'portfolio',
      c.respostas->>'seguidores',
      m.followers,
      m.media_count,
      m.avg_likes,
      m.avg_comments,
      m.engagement_rate,
      coalesce(m.profile_picture_url, f.foto_perfil),
      c.respostas->>'ja_afiliado',
      coalesce(m.status, 'pendente'),
      m.captured_at
    from campanha_candidaturas c
    left join campanha_metrics m on m.candidatura_id = c.id
    left join lateral (
      select cr.foto_perfil from creators cr
      where cr.foto_perfil is not null and cr.foto_perfil <> ''
        and ( (nullif(trim(c.email),'') is not null and lower(trim(cr.email)) = lower(trim(c.email)))
           or (nullif(trim(c.instagram),'') is not null and lower(trim(cr.instagram)) = lower(trim(c.instagram))) )
      limit 1
    ) f on true
    where c.campanha = p_campanha
    order by coalesce(m.avg_likes, -1) desc, coalesce(m.followers, 0) desc, c.created_at desc;
end;
$$;

grant execute on function public.campanha_ranking(text, text) to anon, authenticated;
