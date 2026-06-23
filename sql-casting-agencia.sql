-- ════════════════════════════════════════════════════════════════
-- CASTING → AGENCIA (planilha filtrada) — rodar 1x no SQL Editor
-- ════════════════════════════════════════════════════════════════
-- O agencia.laradam.com lê o banco como "anon" (login próprio, não
-- Supabase Auth). A tabela casting_candidaturas tem dados sensíveis
-- (e-mail, perfil físico) e fica trancada só pra logado.
--
-- Esta função expõe SÓ os campos seguros (nome + perfil profissional
-- LiveShop/Inglês + localização), pro agencia montar a planilha SEM
-- vazar e-mail nem perfil físico. O resto continua protegido.
--
-- COMO RODAR (uma vez só):
--   Supabase → projeto "Cadastro de Creators" → SQL Editor → New query
--   → cole tudo isto → Run. Rodar de novo só atualiza a função.
-- ════════════════════════════════════════════════════════════════

create or replace function public.casting_agencia(p_casting text default 'internacional')
returns table (
    id                   uuid,
    nome                 text,
    ja_cadastrada        boolean,
    created_at           timestamptz,
    fala_ingles          boolean,
    faz_liveshop         boolean,
    -- LiveShop
    lives_media          text,
    tempo_liveshop       text,
    produtos_vendidos    jsonb,
    -- Inglês
    ingles_nivel         text,
    cria_conteudo_ingles text,
    video_ingles         text,
    tempo_ingles         text,
    ingles_ugc           text,
    ingles_live          text,
    ingles_sotaque       text,
    ingles_origem        text,
    -- Localização (relevante p/ campanha internacional)
    mora_exterior        text,
    local_exterior       text
)
language sql
security definer
set search_path = public
as $$
    select
        c.id,
        c.nome,
        c.ja_cadastrada,
        c.created_at,
        (c.respostas->>'fala_ingles' = 'sim' or (c.respostas->>'ingles_nivel') is not null) as fala_ingles,
        (c.respostas->>'tiktokshop' = 'sim') as faz_liveshop,
        c.respostas->>'lives_media',
        c.respostas->>'tempo_tiktokshop',
        c.respostas->'produtos_vendidos',
        c.respostas->>'ingles_nivel',
        c.respostas->>'cria_conteudo_ingles',
        c.respostas->>'video_ingles',
        c.respostas->>'tempo_ingles',
        c.respostas->>'ingles_ugc',
        c.respostas->>'ingles_live',
        c.respostas->>'ingles_sotaque',
        c.respostas->>'ingles_origem',
        c.respostas->>'mora_exterior',
        c.respostas->>'local_exterior'
    from casting_candidaturas c
    where c.casting = p_casting
    order by c.created_at desc;
$$;

grant execute on function public.casting_agencia(text) to anon, authenticated;
