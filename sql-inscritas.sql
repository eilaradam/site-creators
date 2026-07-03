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

-- RPC: devolve as inscritas da campanha só se o token bater (SECURITY DEFINER)
create or replace function public.campanha_inscritas(p_campanha text, p_token text)
returns table (nome text, email text, whatsapp text, instagram text, cidade text,
  regiao text, seguidores text, orcamento text, portfolio text, criado timestamptz)
language plpgsql security definer set search_path to 'public' as $fn$
begin
  if p_token is null or p_token <> (select token from public.link_tokens where campanha = p_campanha) then
    return;  -- token inválido → vazio
  end if;
  return query
    select c.nome, c.email, c.whatsapp, c.instagram, c.cidade,
      c.respostas->>'regiao', c.respostas->>'seguidores', c.respostas->>'orcamento', c.respostas->>'portfolio', c.created_at
    from campanha_candidaturas c
    where c.campanha = p_campanha
    order by c.created_at desc;
end; $fn$;
grant execute on function public.campanha_inscritas(text, text) to anon, authenticated;
