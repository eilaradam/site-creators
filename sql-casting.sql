-- ════════════════════════════════════════════════════════════════
-- CASTING / RECRUTAMENTO ESPECÍFICO — setup (rodar 1x no SQL Editor)
-- ════════════════════════════════════════════════════════════════
-- Cria a tabela onde as candidaturas de cada casting ficam salvas +
-- uma função que checa (sem expor a base) se um e-mail já está na
-- tabela creators, pra creators existentes irem direto às perguntas.
--
-- COMO RODAR (uma vez só):
--   Supabase → projeto "Cadastro de Creators" → SQL Editor → New query
--   → cole tudo isto → Run. Rodar de novo não apaga nada.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.casting_candidaturas (
    id             uuid primary key default gen_random_uuid(),
    casting        text not null,            -- identificador do casting (ex.: 'internacional')
    nome           text,
    email          text not null,
    ja_cadastrada  boolean not null default false,
    respostas      jsonb not null default '{}'::jsonb,
    created_at     timestamptz not null default now()
);

create index if not exists idx_casting_cand_casting on public.casting_candidaturas(casting);
create index if not exists idx_casting_cand_email   on public.casting_candidaturas(email);

alter table public.casting_candidaturas enable row level security;

-- Inserção pública (o formulário do casting é aberto sem login)
drop policy if exists "casting insert publico" on public.casting_candidaturas;
create policy "casting insert publico" on public.casting_candidaturas
    for insert with check (true);

-- Leitura/gestão só pra quem está logado (admin no painel)
drop policy if exists "casting leitura logada" on public.casting_candidaturas;
create policy "casting leitura logada" on public.casting_candidaturas
    for select to authenticated using (true);

drop policy if exists "casting gestao logada" on public.casting_candidaturas;
create policy "casting gestao logada" on public.casting_candidaturas
    for all to authenticated using (true) with check (true);

-- Função: checa se um e-mail já existe na base de creators (sem expor dados).
-- SECURITY DEFINER pra ignorar o RLS de creators (anon não lê a tabela direto).
create or replace function public.creator_lookup_by_email(p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_nome text;
begin
    select nome into v_nome
    from creators
    where lower(trim(email)) = lower(trim(p_email))
    limit 1;

    if v_nome is null then
        return json_build_object('encontrado', false);
    end if;
    return json_build_object('encontrado', true, 'nome', v_nome);
end;
$$;

grant execute on function public.creator_lookup_by_email(text) to anon, authenticated;
