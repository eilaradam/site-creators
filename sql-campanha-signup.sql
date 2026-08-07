-- RPC: inscrição por convite → entra na base creators + no fim da planilha (campanha_creators) como "Pendente"
-- Genérica: recebe campanha_id + marca_id (a página de convite embute os ids da campanha alvo).
create or replace function campanha_creator_signup(
  p_campanha_id uuid,
  p_marca_id uuid,
  p_nome text,
  p_email text,
  p_whatsapp text,
  p_instagram text,
  p_cidade text,
  p_seguidores text,
  p_portfolio text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email,'')));
  v_nome  text := trim(coalesce(p_nome,''));
  v_wpp   text := nullif(trim(coalesce(p_whatsapp,'')),'');
  v_cid   text := nullif(trim(coalesce(p_cidade,'')),'');
  v_seg   text := nullif(trim(coalesce(p_seguidores,'')),'');
  v_port  text := nullif(trim(coalesce(p_portfolio,'')),'');
  v_handle text;
  v_ig_link text;
  v_ig_store text;
  v_creator_id uuid;
  v_foto text;
  v_ordem int;
  v_row_id uuid;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'erro', 'email_invalido');
  end if;
  if v_nome = '' then
    return jsonb_build_object('ok', false, 'erro', 'nome_obrigatorio');
  end if;
  if not exists (select 1 from campanhas where id = p_campanha_id) then
    return jsonb_build_object('ok', false, 'erro', 'campanha_invalida');
  end if;

  -- normaliza @ (tira protocolo/www/instagram.com/@, corta em / ou ?, valida)
  v_handle := lower(regexp_replace(
      split_part(split_part(
        regexp_replace(coalesce(p_instagram,''), '^\s*(https?://)?(www\.)?(instagram\.com/)?@?\s*', '', 'i'),
      '/',1),'?',1),
    '\s','','g'));
  if v_handle !~ '^[a-z0-9._]+$' then v_handle := null; end if;
  v_ig_link  := case when v_handle is not null then 'https://instagram.com/'||v_handle
                     else nullif(trim(coalesce(p_instagram,'')),'') end;
  v_ig_store := case when v_handle is not null then '@'||v_handle
                     else nullif(trim(coalesce(p_instagram,'')),'') end;

  -- upsert na base creators (por email)
  select id, foto_perfil into v_creator_id, v_foto
  from creators where lower(email) = v_email limit 1;

  if v_creator_id is null then
    insert into creators (nome, email, whatsapp, instagram, cidade, seguidores, portfolio, origem, status)
    values (v_nome, v_email, coalesce(v_wpp,''), coalesce(v_ig_store,''), v_cid, v_seg, v_port, 'convite', 'novo')
    returning id, foto_perfil into v_creator_id, v_foto;
  end if;

  -- posição no fim da planilha
  select coalesce(max(ordem), -1) + 1 into v_ordem
  from campanha_creators where campanha_id = p_campanha_id;

  -- evita duplicar na mesma campanha (mesmo email OU mesmo @)
  if exists (
    select 1 from campanha_creators
    where campanha_id = p_campanha_id
      and (
        dados_extras->>'observacoes' ilike '%'||v_email||'%'
        or (v_ig_link is not null and lower(coalesce(dados_extras->>'instagram','')) = lower(v_ig_link))
      )
  ) then
    return jsonb_build_object('ok', true, 'duplicado', true, 'creator_id', v_creator_id);
  end if;

  insert into campanha_creators (campanha_id, marca_id, creator_id, ordem, dados_extras)
  values (
    p_campanha_id, p_marca_id, v_creator_id, v_ordem,
    jsonb_strip_nulls(jsonb_build_object(
      'avatar', coalesce(v_foto, case when v_handle is not null then 'https://unavatar.io/instagram/'||v_handle end),
      'nome', v_nome,
      'aprovacao', 'Pendente',
      'instagram', v_ig_link,
      'seguidores', v_seg,
      'portfolio', v_port,
      'telefone', v_wpp,
      'cidade', v_cid,
      'observacoes', 'Inscrição via convite · '||v_email
    ))
  )
  returning id into v_row_id;

  return jsonb_build_object('ok', true, 'row_id', v_row_id, 'creator_id', v_creator_id);
end;
$$;

grant execute on function campanha_creator_signup(uuid,uuid,text,text,text,text,text,text,text) to anon, authenticated;
