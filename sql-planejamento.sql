-- ════════════════════════════════════════════════════════════════
-- ABA PLANEJAMENTO (admin.html) — rede de segurança
-- ════════════════════════════════════════════════════════════════
-- O admin salva os planos na tabela `configuracoes`, na linha id='planejamento'.
-- O código tenta criar essa linha sozinho (upsert) no primeiro "Salvar".
--
-- SÓ rode este SQL se, ao salvar um plano pela primeira vez, aparecer
-- "Erro ao salvar" na aba Planejamento. Rodar uma vez resolve.
-- (Supabase → SQL Editor → cole e execute.)
-- ════════════════════════════════════════════════════════════════

insert into configuracoes (id, conteudo, updated_at)
values ('planejamento', '{"plans":[],"activeId":null}', now())
on conflict (id) do nothing;
