-- App Sara (creators.laradam.com/appsara): estúdio automático de vídeos de produto.
-- Só a função appsara-video (service role) lê e grava; RLS ligado e sem políticas públicas.
-- A tabela appsara_videos da primeira versão não é mais usada.

create table if not exists public.appsara_produtos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  status text not null default 'analisando',      -- analisando | aguardando_refs | pronto | erro
  nome text,
  ficha jsonb,
  resumo text,
  observacao text,                                 -- correção escrita pela vendedora
  imagens_info jsonb,                              -- o que a IA viu em cada print (tipo, caixa, qualidade)
  orig_paths text[],
  ref_paths text[],                                -- recortes só do produto, usados como referência
  erro text
);

create table if not exists public.appsara_personagens (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome text not null,
  publico text,
  descricao text,                                  -- aparência descrita pela IA a partir da foto
  img_path text,
  ativo boolean not null default true
);

create table if not exists public.appsara_jobs (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz,
  produto_id uuid references public.appsara_produtos(id),
  personagem_id uuid references public.appsara_personagens(id),
  formato text,                                    -- pov | desfile | misto
  roteiro text,
  segundos int not null default 8,
  resolucao text not null default '720p',
  variacao int not null default 0,
  etapa text not null default 'fila',              -- fila | foto | conf_foto | video | conf_video | pronto | reprovado | erro
  plano jsonb,
  legenda text,
  notas text,
  foto_path text,
  conferencia_foto jsonb,
  file_id text,
  file_uri text,
  conferencia_video jsonb,
  tentativas_foto int not null default 0,
  tentativas_video int not null default 0,
  falhas int not null default 0,
  erro text,
  aviso text,
  lock_ate timestamptz
);
create index if not exists appsara_jobs_etapa_idx on public.appsara_jobs (etapa, criado_em);

create table if not exists public.appsara_gastos (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  job_id uuid,
  motivo text,
  valor numeric(8,3) not null
);
create index if not exists appsara_gastos_dia_idx on public.appsara_gastos (criado_em);

alter table public.appsara_produtos enable row level security;
alter table public.appsara_personagens enable row level security;
alter table public.appsara_jobs enable row level security;
alter table public.appsara_gastos enable row level security;

-- Pasta privada para fotos de produto, personagens e cenas geradas.
insert into storage.buckets (id, name, public) values ('appsara', 'appsara', false)
on conflict (id) do nothing;

-- Cron: a cada minuto avança os vídeos na fila, mesmo com o app fechado.
-- A ação "tick" não gasta nada além do que já foi pedido no app, por isso usa a chave pública.
select cron.unschedule('appsara-tick') where exists (select 1 from cron.job where jobname = 'appsara-tick');
select cron.schedule('appsara-tick', '* * * * *', $cron$
  select net.http_post(
    url := 'https://mfrmnquvwwuxraqgemyh.supabase.co/functions/v1/appsara-video',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON>','apikey','<ANON>'),
    body := '{"acao":"tick"}'::jsonb,
    timeout_milliseconds := 5000);
$cron$);
