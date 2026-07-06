-- ============================================================
-- casting_vitrine — versão PÚBLICA e MASCARADA do casting
-- ============================================================
-- Usada SÓ pela página pública /apresentacao (marketing p/ marcas).
--
-- Diferença pra casting_agencia_full (que o CRM agencia.laradam usa):
-- esta NÃO expõe nome completo, @instagram, cidade, estado, e-mail,
-- WhatsApp nem data de nascimento crua. O nome já sai MASCARADO
-- (1º nome + inicial do último) e a idade já sai CALCULADA, tudo no
-- servidor. Assim nem o payload da página carrega PII identificável.
--
-- Segurança: a máscara feita no cliente (maskName) era só cosmética
-- (o dado cru vinha no JSON). Agora a máscara é no servidor.
--
-- Rodar 1x no SQL Editor do Supabase (projeto mfrmnquvwwuxraqgemyh).
-- CREATE OR REPLACE: rodar de novo só atualiza a função.
-- ============================================================

drop function if exists public.casting_vitrine(text);

create or replace function public.casting_vitrine(p_casting text default 'internacional')
returns table (
    id                uuid,
    nome              text,   -- JÁ MASCARADO no servidor (ex.: "Roberta C.")
    ja_cadastrada     boolean,
    created_at        timestamptz,
    foto_perfil       text,
    seguidores        text,
    nicho             text,
    idade             int,    -- JÁ CALCULADA (sem expor data de nascimento)
    fala_ingles       boolean,
    ingles_nivel      text,
    ingles_sotaque    text,
    faz_liveshop      boolean,
    lives_media       text,
    tempo_liveshop    text,
    produtos_vendidos jsonb,
    mora_exterior     text
)
language sql
security definer
set search_path = public
as $$
    select
        c.id,
        -- máscara no servidor: 1º nome (capitalizado) + inicial do último nome
        case
            when c.nome is null or btrim(c.nome) = '' then 'Creator'
            when array_length(regexp_split_to_array(btrim(c.nome), '\s+'), 1) < 2
                then initcap((regexp_split_to_array(btrim(c.nome), '\s+'))[1])
            else initcap((regexp_split_to_array(btrim(c.nome), '\s+'))[1]) || ' ' ||
                 upper(left((regexp_split_to_array(btrim(c.nome), '\s+'))[array_length(regexp_split_to_array(btrim(c.nome), '\s+'), 1)], 1)) || '.'
        end as nome,
        c.ja_cadastrada,
        c.created_at,
        cr.foto_perfil,
        cr.seguidores,
        cr.nicho,
        case
            when cr.data_nascimento is not null
                 and extract(year from age(cr.data_nascimento)) between 5 and 100
            then extract(year from age(cr.data_nascimento))::int
            else null
        end as idade,
        (c.respostas->>'fala_ingles' = 'sim' or (c.respostas->>'ingles_nivel') is not null) as fala_ingles,
        c.respostas->>'ingles_nivel',
        c.respostas->>'ingles_sotaque',
        (c.respostas->>'tiktokshop' = 'sim') as faz_liveshop,
        c.respostas->>'lives_media',
        c.respostas->>'tempo_tiktokshop',
        c.respostas->'produtos_vendidos',
        c.respostas->>'mora_exterior'
    from casting_candidaturas c
    left join creators cr on lower(cr.email) = lower(c.email)
    where c.casting = p_casting
    order by c.created_at desc;
$$;

revoke all on function public.casting_vitrine(text) from public;
grant execute on function public.casting_vitrine(text) to anon, authenticated;
