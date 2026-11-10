-- ============================================================
-- Acesso "equipe": entra e vê só a triagem (triagem.html)
-- ============================================================
-- 1. usuarios.role passa a aceitar 'equipe'
-- 2. triagem_marcar: única forma da equipe gravar em creators, e só
--    nas colunas da triagem (o UPDATE direto continua só pra admin)
-- 3. Isabella Natali vira equipe
--
-- Rodar 1x no SQL Editor do Supabase (projeto mfrmnquvwwuxraqgemyh).
-- ============================================================

-- 1. Libera o valor 'equipe' em usuarios.role, mantendo os que já existem
do $$
declare r record; tipo text; valores text;
begin
    select data_type into tipo from information_schema.columns
     where table_schema = 'public' and table_name = 'usuarios' and column_name = 'role';
    if tipo not in ('text', 'character varying') then
        raise exception 'usuarios.role é do tipo %, me mande essa mensagem', tipo;
    end if;
    for r in select conname from pg_constraint
              where conrelid = 'public.usuarios'::regclass and contype = 'c'
                and pg_get_constraintdef(oid) ilike '%role%' loop
        execute format('alter table public.usuarios drop constraint %I', r.conname);
    end loop;
    select string_agg(quote_literal(v), ', ') into valores from (
        select distinct role as v from public.usuarios where role is not null
        union select unnest(array['admin', 'aluna', 'equipe'])
    ) x;
    execute format('alter table public.usuarios add constraint usuarios_role_check check (role in (%s))', valores);
end $$;

-- 2. Marcar Boa / Não boa / desfazer
create or replace function public.triagem_marcar(p_id uuid, p_status text, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not exists (select 1 from usuarios where id = auth.uid() and role in ('admin', 'equipe') and coalesce(ativo, true)) then
        raise exception 'Sem permissão pra triagem';
    end if;
    if p_status = 'boa' then
        update creators set qualificada_em = now(), nao_qualificada = null, nao_qualificada_em = null where id = p_id;
    elsif p_status = 'nao' then
        if coalesce(trim(p_motivo), '') = '' then raise exception 'Falta o motivo'; end if;
        update creators set nao_qualificada = left(trim(p_motivo), 200), nao_qualificada_em = now(), qualificada_em = null where id = p_id;
    elsif p_status = 'limpar' then
        update creators set qualificada_em = null, nao_qualificada = null, nao_qualificada_em = null where id = p_id;
    else
        raise exception 'Status inválido: %', p_status;
    end if;
end $$;

revoke all on function public.triagem_marcar(uuid, text, text) from public, anon;
grant execute on function public.triagem_marcar(uuid, text, text) to authenticated;

-- 3. Isabella como equipe (se ela já tem login; senão cria a linha a partir do auth)
update public.usuarios set role = 'equipe', ativo = true, expira_em = null
 where lower(email) = 'nataliisabella19@gmail.com';

insert into public.usuarios (id, email, nome, role, ativo)
select u.id, u.email, 'Isabella Natali', 'equipe', true
  from auth.users u
 where lower(u.email) = 'nataliisabella19@gmail.com'
   and not exists (select 1 from public.usuarios x where x.id = u.id);

-- Resultado: se vier vazio, ela ainda não tem login criado
select u.email, u.role, u.ativo,
       (select count(*) from auth.users a where lower(a.email) = 'nataliisabella19@gmail.com') as tem_login
  from public.usuarios u
 where lower(u.email) = 'nataliisabella19@gmail.com';
