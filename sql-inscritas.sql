-- Link compartilhável das inscritas por campanha (parceiro vê sem login, atualiza sozinho).
-- Já aplicado 2026-07-03. ⚠️ Repo público: o TOKEN real NÃO fica aqui (está em link_tokens no banco).
-- Página: inscritas/index.html  →  creators.laradam.com/inscritas?c=<campanha>&k=<token>

-- tabela de tokens (privada, sem policy p/ anon → ninguém lê direto)
create table if not exists public.link_tokens (
  campanha text primary key,
  token text not null,
  criado timestamptz default now()
);
alter table public.link_tokens enable row level security;

-- gerar/rotacionar o token de uma campanha (troque o valor; não versionar o real):
--   insert into public.link_tokens (campanha, token) values ('flores', '<TOKEN_ALEATORIO>')
--     on conflict (campanha) do update set token = excluded.token, criado = now();

-- RPC: devolve as inscritas da campanha só se o token bater (SECURITY DEFINER).
-- Cruza com creators (por email, senão @) pra trazer a foto de perfil.
drop function if exists public.campanha_inscritas(text, text);
create function public.campanha_inscritas(p_campanha text, p_token text)
returns table (nome text, email text, whatsapp text, instagram text, cidade text,
  regiao text, seguidores text, orcamento text, portfolio text, foto text, respostas jsonb, criado timestamptz)
language plpgsql security definer set search_path to 'public' as $fn$
begin
  -- FALHA FECHADA: só libera se existir um token cadastrado pra essa campanha
  -- E ele bater exatamente. Se a campanha não tem token em link_tokens, a versão
  -- antiga comparava com NULL (p_token <> NULL = NULL, tratado como falso) e
  -- ACABAVA RETORNANDO TUDO. Agora, sem token cadastrado → não vaza nada.
  if p_token is null or p_token = ''
     or not exists (select 1 from public.link_tokens
                    where campanha = p_campanha and token = p_token) then
    return;  -- token ausente/inválido → vazio
  end if;
  return query
    select c.nome, c.email, c.whatsapp, c.instagram, c.cidade,
      c.respostas->>'regiao', c.respostas->>'seguidores', c.respostas->>'orcamento', c.respostas->>'portfolio',
      f.foto_perfil, c.respostas, c.created_at
    from campanha_candidaturas c
    left join lateral (
      select cr.foto_perfil from creators cr
      where cr.foto_perfil is not null and cr.foto_perfil <> ''
        and ( (nullif(trim(c.email),'') is not null and lower(trim(cr.email)) = lower(trim(c.email)))
           or (nullif(trim(c.instagram),'') is not null and lower(trim(cr.instagram)) = lower(trim(c.instagram))) )
      order by case when lower(trim(cr.email)) = lower(trim(coalesce(c.email,'-'))) then 0 else 1 end
      limit 1
    ) f on true
    where c.campanha = p_campanha
    order by c.created_at desc;
end; $fn$;
grant execute on function public.campanha_inscritas(text, text) to anon, authenticated;
