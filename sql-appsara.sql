-- App Sara: registro dos vídeos gerados e base do teto de gasto diário.
-- Só a função appsara-video (service role) lê e grava; sem políticas públicas.
create table if not exists public.appsara_videos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  perfil text,
  produto text,
  formato text,
  segundos int,
  resolucao text,
  custo_usd numeric(8,3),
  file_id text,
  status text not null default 'gerando',
  erro text
);
alter table public.appsara_videos enable row level security;
create index if not exists appsara_videos_criado_em_idx on public.appsara_videos (criado_em desc);
