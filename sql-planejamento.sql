-- ════════════════════════════════════════════════════════════════
-- ABA PLANEJAMENTO (admin.html) — rede de segurança
-- ════════════════════════════════════════════════════════════════
-- O admin salva os planos na tabela `configuracoes`, na linha id='planejamento'.
-- A regra de segurança (RLS) da tabela bloqueia CRIAR linhas novas pelo site,
-- mas permite ALTERAR linhas existentes. Por isso a linha precisa ser criada
-- uma única vez aqui no SQL Editor (que não passa pela RLS).
--
-- COMO RODAR (uma vez só):
--   Supabase → projeto "Cadastro de Creators" → SQL Editor → New query
--   → cole tudo isto → Run. Depois é só usar a aba Planejamento normalmente.
-- Rodar de novo não causa problema (não apaga nada).
-- ════════════════════════════════════════════════════════════════

insert into configuracoes (id, conteudo, updated_at)
values ('planejamento', '{"plans":[],"activeId":null}', now())
on conflict (id) do nothing;
