-- ════════════════════════════════════════════════════════════════
-- CASTING: checar se um e-mail já respondeu (evita duplicata)
-- Rodar 1x no SQL Editor do Supabase (projeto "Cadastro de Creators").
-- ════════════════════════════════════════════════════════════════
-- O formulário do casting é aberto sem login (anon), e o anon não lê a
-- tabela casting_candidaturas direto. Esta função (SECURITY DEFINER)
-- responde só "true/false" se aquele e-mail já tem candidatura naquele
-- casting — sem expor nenhum dado.

create or replace function public.casting_ja_respondeu(p_casting text, p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists(
        select 1 from casting_candidaturas
        where casting = p_casting
          and lower(trim(email)) = lower(trim(p_email))
    );
$$;

grant execute on function public.casting_ja_respondeu(text, text) to anon, authenticated;
