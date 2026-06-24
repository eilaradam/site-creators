-- ============================================================
-- casting_agencia_full — planilha COMPLETA do casting (uso interno da Lara no agencia.laradam)
-- ============================================================
-- Junta casting_candidaturas + creators pra trazer FOTO, Instagram, seguidores,
-- cidade/estado e nicho, além dos dados profissionais do casting.
--
-- ⚠️ Privacidade: NÃO retorna e-mail nem WhatsApp (contato fica protegido).
-- O agencia.laradam opera como anon → grant pra anon. Foto já é pública (bucket
-- fotos-perfil) e Instagram é público, então a exposição é de dado já semi-público.
-- Rodar 1x no SQL Editor do Supabase (projeto mfrmnquvwwuxraqgemyh).
-- ============================================================

create or replace function public.casting_agencia_full(p_casting text default 'internacional')
returns table (
    id                   uuid,
    nome                 text,
    ja_cadastrada        boolean,
    created_at           timestamptz,
    -- perfil (da tabela creators)
    foto_perfil          text,
    instagram            text,
    seguidores           text,
    cidade               text,
    estado               text,
    nicho                text,
    -- casting: inglês
    fala_ingles          boolean,
    ingles_nivel         text,
    cria_conteudo_ingles text,
    ingles_live          text,
    ingles_sotaque       text,
    ingles_origem        text,
    -- casting: LiveShop
    faz_liveshop         boolean,
    lives_media          text,
    tempo_liveshop       text,
    produtos_vendidos    jsonb,
    -- localização
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
        cr.foto_perfil,
        cr.instagram,
        cr.seguidores,
        cr.cidade,
        cr.estado,
        cr.nicho,
        (c.respostas->>'fala_ingles' = 'sim' or (c.respostas->>'ingles_nivel') is not null) as fala_ingles,
        c.respostas->>'ingles_nivel',
        c.respostas->>'cria_conteudo_ingles',
        c.respostas->>'ingles_live',
        c.respostas->>'ingles_sotaque',
        c.respostas->>'ingles_origem',
        (c.respostas->>'tiktokshop' = 'sim') as faz_liveshop,
        c.respostas->>'lives_media',
        c.respostas->>'tempo_tiktokshop',
        c.respostas->'produtos_vendidos',
        c.respostas->>'mora_exterior',
        c.respostas->>'local_exterior'
    from casting_candidaturas c
    left join creators cr on lower(cr.email) = lower(c.email)
    where c.casting = p_casting
    order by c.created_at desc;
$$;

grant execute on function public.casting_agencia_full(text) to anon, authenticated;

-- pronto: o agencia chama supabase.rpc('casting_agencia_full', { p_casting: 'internacional' })
