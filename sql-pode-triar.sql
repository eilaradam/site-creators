-- ============================================================
-- Triagem como permissão extra (pode_triar), sem trocar o acesso
-- ============================================================
-- Quem é aluna e ajuda na triagem continua aluna (vê o painel) e
-- ganha pode_triar = true: aparece o botão "Triagem" no painel.
-- triagem_marcar passa a aceitar admin, equipe ou pode_triar.
--
-- Rodar 1x no SQL Editor do Supabase (projeto mfrmnquvwwuxraqgemyh).
-- ============================================================

alter table public.usuarios
    add column if not exists pode_triar boolean not null default false;

create or replace function public.pode_triar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from usuarios
         where id = auth.uid() and coalesce(ativo, true)
           and (role in ('admin', 'equipe') or pode_triar)
    );
$$;

revoke all on function public.pode_triar() from public, anon;
grant execute on function public.pode_triar() to authenticated;

create or replace function public.triagem_marcar(p_id uuid, p_status text, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not pode_triar() then
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

-- Isabella volta a ser aluna (painel) e ganha a triagem
update public.usuarios set role = 'aluna', pode_triar = true, ativo = true
 where lower(email) = 'nataliisabella19@gmail.com';

select email, role, ativo, pode_triar, expira_em
  from public.usuarios
 where lower(email) = 'nataliisabella19@gmail.com';
