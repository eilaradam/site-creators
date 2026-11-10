-- ============================================================
-- Creators "não qualificadas"
-- ============================================================
-- Quando a equipe acha problema no portfólio (sem portfólio,
-- qualidade baixa, link inválido...), marca a creator como não
-- qualificada no painel. Ela sai da pesquisa principal e vai pro
-- bloco "Não qualificadas". Coluna nula = qualificada.
--
-- Só admin consegue gravar (policy "Admin update creators" já existe).
-- Rodar 1x no SQL Editor do Supabase (projeto mfrmnquvwwuxraqgemyh).
-- ============================================================

alter table public.creators
    add column if not exists nao_qualificada    text,          -- motivo (ex.: "Sem portfólio")
    add column if not exists nao_qualificada_em timestamptz;

create index if not exists idx_creators_nao_qualificada
    on public.creators (nao_qualificada) where nao_qualificada is not null;
