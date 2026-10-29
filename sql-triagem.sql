-- ============================================================
-- Triagem de creators (aba "Triagem" do admin)
-- ============================================================
-- A equipe passa creator por creator e marca Boa ou Não boa.
-- Não boa já usa nao_qualificada (sql-nao-qualificada.sql).
-- Boa grava qualificada_em, pra ela não voltar pra fila.
-- Fila = nao_qualificada nula e qualificada_em nula.
--
-- Rodar 1x no SQL Editor do Supabase (projeto mfrmnquvwwuxraqgemyh).
-- ============================================================

alter table public.creators
    add column if not exists qualificada_em timestamptz;
