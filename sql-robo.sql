-- ============================================================
--  Aba "Robô de inscrições" do admin (creators.laradam.com/admin.html)
--  Cada campanha em que o robô (Mac da Lara) se inscreveu no Seu Influencer.
--  Quem grava e a edge function robo-registrar (service role, com token).
--  Pode rodar de novo sem duplicar (camp_id e a chave).
-- ============================================================
create table if not exists public.robo_inscricoes (
  camp_id text primary key,
  titulo text not null,
  inscrita_em timestamptz not null default now(),
  origem text not null default 'nova' check (origem in ('nova','antiga','manual')),
  criada_em timestamptz,
  reacao_seg numeric(8,1),
  inscritos_ao_entrar integer,
  vagas integer,
  aprovados_ao_entrar integer,
  posicao integer,
  chance_pct integer,
  valor numeric(12,2),
  valor_total numeric(12,2),
  data_fim timestamptz,
  precisa_nf boolean,
  status text not null default 'aguardando' check (status in ('aguardando','aprovada','nao_aprovada')),
  etapa text,
  status_em timestamptz,
  inscritos_agora integer,
  aprovados_agora integer,
  atualizado_em timestamptz,
  link text
);
create index if not exists robo_inscricoes_quando_idx on public.robo_inscricoes (inscrita_em desc);

alter table public.robo_inscricoes enable row level security;
drop policy if exists "robo_inscricoes logado le" on public.robo_inscricoes;
create policy "robo_inscricoes logado le" on public.robo_inscricoes for select to authenticated using (true);
