-- Substitui a RPC anterior por uma enxuta: adiciona uma creator (que JÁ existe na base,
-- inserida pelo próprio cadastro) no fim da planilha de uma campanha como "Pendente".
drop function if exists campanha_creator_signup(uuid,uuid,text,text,text,text,text,text,text);

create or replace function campanha_add_creator_pendente(
  p_campanha_id uuid,
  p_marca_id uuid,
  p_email text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  c record;
  v_handle text;
  v_ig_link text;
  v_seg text;
  v_local text;
  v_ordem int;
  v_row_id uuid;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'erro', 'email_vazio');
  end if;
  if not exists (select 1 from campanhas where id = p_campanha_id) then
    return jsonb_build_object('ok', false, 'erro', 'campanha_invalida');
  end if;

  select id, nome, instagram, foto_perfil, seguidores, cidade, estado, portfolio, whatsapp
    into c
  from creators where lower(email) = v_email limit 1;

  if c.id is null then
    return jsonb_build_object('ok', false, 'erro', 'creator_nao_encontrado');
  end if;

  -- normaliza @
  v_handle := lower(regexp_replace(
      split_part(split_part(
        regexp_replace(coalesce(c.instagram,''), '^\s*(https?://)?(www\.)?(instagram\.com/)?@?\s*', '', 'i'),
      '/',1),'?',1),
    '\s','','g'));
  if v_handle !~ '^[a-z0-9._]+$' then v_handle := null; end if;
  v_ig_link := case when v_handle is not null then 'https://instagram.com/'||v_handle
                    else nullif(trim(coalesce(c.instagram,'')),'') end;

  -- faixa de seguidores -> rótulo legível
  v_seg := case c.seguidores
    when 'ate_1k' then 'Até 1k' when '1k_5k' then '1k a 5k' when '5k_10k' then '5k a 10k'
    when '10k_30k' then '10k a 30k' when '30k_mais' then '30k+'
    else nullif(c.seguidores,'') end;

  v_local := nullif(trim(coalesce(c.cidade,'') || case when nullif(c.estado,'') is not null then ', '||c.estado else '' end), '');

  -- dedup na mesma campanha (email ou @)
  if exists (
    select 1 from campanha_creators
    where campanha_id = p_campanha_id
      and (
        dados_extras->>'observacoes' ilike '%'||v_email||'%'
        or (v_ig_link is not null and lower(coalesce(dados_extras->>'instagram','')) = lower(v_ig_link))
      )
  ) then
    return jsonb_build_object('ok', true, 'duplicado', true, 'creator_id', c.id);
  end if;

  select coalesce(max(ordem), -1) + 1 into v_ordem
  from campanha_creators where campanha_id = p_campanha_id;

  insert into campanha_creators (campanha_id, marca_id, creator_id, ordem, dados_extras)
  values (
    p_campanha_id, p_marca_id, c.id, v_ordem,
    jsonb_strip_nulls(jsonb_build_object(
      'avatar', coalesce(c.foto_perfil, case when v_handle is not null then 'https://unavatar.io/instagram/'||v_handle end),
      'nome', c.nome,
      'aprovacao', 'Pendente',
      'instagram', v_ig_link,
      'seguidores', v_seg,
      'portfolio', nullif(c.portfolio,''),
      'telefone', nullif(c.whatsapp,''),
      'cidade', v_local,
      'observacoes', 'Inscrição via convite · '||v_email
    ))
  )
  returning id into v_row_id;

  return jsonb_build_object('ok', true, 'row_id', v_row_id, 'creator_id', c.id);
end;
$$;

grant execute on function campanha_add_creator_pendente(uuid,uuid,text) to anon, authenticated;
