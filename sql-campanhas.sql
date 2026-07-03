-- Candidaturas das campanhas de marcas (formulário público em /campanhas/?c=<slug>)
-- Rodar 1x no SQL Editor do Supabase (projeto Cadastro de Creators / mfrmnquvwwuxraqgemyh).
-- Já foi aplicado em 2026-07-03 via Management API; este arquivo é o registro.
-- RLS: qualquer um insere (form público), só logado (admin) lê/apaga.

create table if not exists public.campanha_candidaturas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  campanha text not null,                 -- slug: flores | pais | decoracao
  nome text,
  email text,
  whatsapp text,
  instagram text,
  cidade text,
  respostas jsonb not null default '{}'::jsonb  -- orcamento, portfolio, seguidores, ja_afiliado...
);

alter table public.campanha_candidaturas enable row level security;

drop policy if exists campanha_cand_insert_publico on public.campanha_candidaturas;
create policy campanha_cand_insert_publico on public.campanha_candidaturas
  for insert to public with check (true);

drop policy if exists campanha_cand_select_auth on public.campanha_candidaturas;
create policy campanha_cand_select_auth on public.campanha_candidaturas
  for select to authenticated using (true);

drop policy if exists campanha_cand_delete_auth on public.campanha_candidaturas;
create policy campanha_cand_delete_auth on public.campanha_candidaturas
  for delete to authenticated using (true);

create index if not exists idx_campanha_cand_campanha
  on public.campanha_candidaturas(campanha, created_at desc);

-- Lookup pra porteira do formulário único (/campanhas): pelo email, devolve
-- se a creator já é da base + dados pra pré-preencher. SECURITY DEFINER porque
-- o anon não lê `creators` direto. NÃO devolve whatsapp/portfolio (privacidade).
create or replace function public.campanha_creator_lookup(p_email text)
returns json language plpgsql security definer set search_path to 'public' as $fn$
declare v record;
begin
  select nome, instagram, cidade, estado, seguidores into v
  from creators where lower(trim(email)) = lower(trim(p_email))
  order by created_at desc limit 1;
  if not found then return json_build_object('encontrado', false); end if;
  return json_build_object('encontrado', true, 'nome', v.nome, 'instagram', v.instagram,
    'cidade', v.cidade, 'estado', v.estado, 'seguidores', v.seguidores);
end; $fn$;
grant execute on function public.campanha_creator_lookup(text) to anon, authenticated;
