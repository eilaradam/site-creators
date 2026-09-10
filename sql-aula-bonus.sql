-- Formulário do bônus da aula ao vivo (Resumo + Checklist do Filtro de 1 Minuto)
-- Quem responde libera o material. As respostas aparecem no admin, aba Aulas > Aula ao vivo.
create table if not exists public.aula_bonus (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  aula text not null default 'portfolio-30min',
  nome text not null,
  email text not null,
  telefone text not null,
  achou text,
  proximo_tema text,
  referrer text,
  user_agent text
);

create index if not exists aula_bonus_created_idx on public.aula_bonus (created_at desc);

alter table public.aula_bonus enable row level security;

drop policy if exists "aula_bonus insert publico" on public.aula_bonus;
create policy "aula_bonus insert publico" on public.aula_bonus
  for insert to anon, authenticated with check (true);

drop policy if exists "aula_bonus leitura logada" on public.aula_bonus;
create policy "aula_bonus leitura logada" on public.aula_bonus
  for select to authenticated using (true);

drop policy if exists "aula_bonus gestao logada" on public.aula_bonus;
create policy "aula_bonus gestao logada" on public.aula_bonus
  for delete to authenticated using (true);

-- ── Opinião anônima (10/09) ──────────────────────────────────────────────
-- Quando a aluna marca "anônimo", o texto NÃO fica na linha dela: vai pra uma
-- tabela separada, sem nome, sem e-mail e sem hora exata (só o dia), pra
-- ninguém conseguir ligar o feedback à pessoa. A linha do cadastro só guarda
-- a marca de que ela respondeu em anônimo.
alter table public.aula_bonus add column if not exists achou_anonimo boolean not null default false;

create table if not exists public.aula_feedback_anonimo (
  id uuid primary key default gen_random_uuid(),
  dia date not null default current_date,
  aula text not null default 'portfolio-30min',
  achou text not null
);

alter table public.aula_feedback_anonimo enable row level security;

drop policy if exists "feedback anonimo insert publico" on public.aula_feedback_anonimo;
create policy "feedback anonimo insert publico" on public.aula_feedback_anonimo
  for insert to anon, authenticated with check (true);

drop policy if exists "feedback anonimo leitura logada" on public.aula_feedback_anonimo;
create policy "feedback anonimo leitura logada" on public.aula_feedback_anonimo
  for select to authenticated using (true);
