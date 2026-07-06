-- ============================================================
-- casting_stats — contagens EXATAS do casting (sem o corte de 1000)
-- ============================================================
-- Usada pela /apresentacao pra mostrar os números certos. A API do
-- Supabase (PostgREST) corta qualquer SELECT em 1000 linhas, então
-- contar no cliente (data.length) subcontava (ex.: mostrava 1000 tendo
-- 1015). Aqui a contagem é feita NO SERVIDOR (count(*)), sem corte.
--
-- Só devolve NÚMEROS agregados (nenhuma PII) => seguro pra anon.
-- CREATE OR REPLACE: rodar de novo só atualiza.
-- ============================================================

create or replace function public.casting_stats(p_casting text default 'internacional')
returns jsonb
language sql
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'total',        count(*),
        'fala_ingles',  count(*) filter (where (respostas->>'fala_ingles' = 'sim' or (respostas->>'ingles_nivel') is not null)),
        'faz_liveshop', count(*) filter (where respostas->>'tiktokshop' = 'sim'),
        'nivel', jsonb_build_object(
            'basico',        count(*) filter (where respostas->>'ingles_nivel' = 'basico'),
            'intermediario', count(*) filter (where respostas->>'ingles_nivel' = 'intermediario'),
            'avancado',      count(*) filter (where respostas->>'ingles_nivel' = 'avancado'),
            'fluente',       count(*) filter (where respostas->>'ingles_nivel' = 'fluente'),
            'nativo',        count(*) filter (where respostas->>'ingles_nivel' = 'nativo')
        ),
        'lives', jsonb_build_object(
            'irregular', count(*) filter (where respostas->>'lives_media' = 'irregular'),
            '1a2sem',    count(*) filter (where respostas->>'lives_media' = '1a2sem'),
            '3a5sem',    count(*) filter (where respostas->>'lives_media' = '3a5sem'),
            '6sem',      count(*) filter (where respostas->>'lives_media' = '6sem')
        )
    )
    from casting_candidaturas
    where casting = p_casting;
$$;

revoke all on function public.casting_stats(text) from public;
grant execute on function public.casting_stats(text) to anon, authenticated;
