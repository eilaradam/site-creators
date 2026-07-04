-- Apostila da Imersão (Dia 12) + envio do portfólio das alunas.
-- Página: aula/index.html  →  creators.laradam.com/aula  (noindex, material das alunas).
-- Cada aluna manda nome + link do portfólio no ar → cai em aula_alunas.
-- Já aplicado 2026-07-03.

create table if not exists public.aula_alunas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text,
  email text,
  instagram text,
  portfolio text
);
alter table public.aula_alunas enable row level security;
drop policy if exists aula_alunas_insert_publico on public.aula_alunas;
create policy aula_alunas_insert_publico on public.aula_alunas for insert to public with check (true);
drop policy if exists aula_alunas_select_auth on public.aula_alunas;
create policy aula_alunas_select_auth on public.aula_alunas for select to authenticated using (true);
create index if not exists idx_aula_alunas_created on public.aula_alunas(created_at desc);

-- Pendente: painel de acompanhamento ao vivo pra Lara (mesma pegada de campanha_inscritas:
-- RPC gated por token + página inscritas-style, OU aba no admin).
