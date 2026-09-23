-- 23/09/2026: creator atualiza o próprio cadastro pelo link pessoal (/atualizar/?c=CODIGO)
-- O código de indicação (6 letras, único) funciona como a chave. Nada de RLS aberto: só estas duas funções.
create or replace function public.creator_por_codigo(p_codigo text)
returns table (nome text, email text, whatsapp text, instagram text, tiktok text, cidade text, estado text, seguidores text, nicho text, experiencia text, data_nascimento date, genero text, portfolio text, melhor_conteudo text, foto_perfil text, tipo_creator text, sobre text, codigo_indicacao text)
language sql security definer stable set search_path = public as $$
  select nome, email, whatsapp, instagram, tiktok, cidade, estado, seguidores, nicho, experiencia, data_nascimento, genero, portfolio, melhor_conteudo, foto_perfil, tipo_creator, sobre::text, codigo_indicacao::text
  from public.creators where upper(codigo_indicacao) = upper(trim(p_codigo)) limit 1
$$;
revoke all on function public.creator_por_codigo(text) from public;
grant execute on function public.creator_por_codigo(text) to anon, authenticated;

create or replace function public.atualizar_creator_por_codigo(p_codigo text, p_dados jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.creators where upper(codigo_indicacao) = upper(trim(p_codigo)) limit 1;
  if v_id is null then return false; end if;
  update public.creators set
    nome            = coalesce(nullif(trim(p_dados->>'nome'),''), nome),
    whatsapp        = coalesce(nullif(trim(p_dados->>'whatsapp'),''), whatsapp),
    instagram       = coalesce(nullif(trim(p_dados->>'instagram'),''), instagram),
    tiktok          = coalesce(nullif(trim(p_dados->>'tiktok'),''), tiktok),
    cidade          = coalesce(nullif(trim(p_dados->>'cidade'),''), cidade),
    estado          = coalesce(nullif(trim(p_dados->>'estado'),''), estado),
    seguidores      = coalesce(nullif(trim(p_dados->>'seguidores'),''), seguidores),
    nicho           = coalesce(nullif(trim(p_dados->>'nicho'),''), nicho),
    experiencia     = coalesce(nullif(trim(p_dados->>'experiencia'),''), experiencia),
    data_nascimento = coalesce(nullif(trim(p_dados->>'data_nascimento'),'')::date, data_nascimento),
    genero          = coalesce(nullif(trim(p_dados->>'genero'),''), genero),
    portfolio       = coalesce(nullif(trim(p_dados->>'portfolio'),''), portfolio),
    melhor_conteudo = coalesce(nullif(trim(p_dados->>'melhor_conteudo'),''), melhor_conteudo),
    foto_perfil     = coalesce(nullif(trim(p_dados->>'foto_perfil'),''), foto_perfil),
    tipo_creator    = coalesce(nullif(trim(p_dados->>'tipo_creator'),''), tipo_creator),
    sobre           = coalesce(nullif(trim(p_dados->>'sobre'),''), sobre)
  where id = v_id;
  return true;
end $$;
revoke all on function public.atualizar_creator_por_codigo(text, jsonb) from public;
grant execute on function public.atualizar_creator_por_codigo(text, jsonb) to anon, authenticated;
