-- Teto de uso da funcao escrever-email (a que escreve o e-mail da aluna com IA).
-- Sem isso, a chave da OpenAI vira torneira aberta: a funcao e publica de
-- proposito, porque aluna nao tem login.
create table if not exists public.email_ia_uso (
  id bigserial primary key,
  dia date not null,
  ip text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_email_ia_uso_dia on public.email_ia_uso(dia);
create index if not exists idx_email_ia_uso_dia_ip on public.email_ia_uso(dia, ip);
alter table public.email_ia_uso enable row level security;
-- nenhuma policy: so a service role (a propria funcao) enxerga
