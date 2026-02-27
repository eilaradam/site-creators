-- ══════════════════════════════════════════════════════════════
-- FUNCOES RPC: Edicao de cadastro pelo proprio creator
-- Execute no Supabase SQL Editor (supabase.com/dashboard → SQL)
-- ══════════════════════════════════════════════════════════════


-- 1. Verificar identidade (email + whatsapp)
CREATE OR REPLACE FUNCTION creator_verify_identity(p_email TEXT, p_whatsapp TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_creator RECORD;
    v_whatsapp_clean TEXT;
    v_db_whatsapp_clean TEXT;
BEGIN
    v_whatsapp_clean := regexp_replace(p_whatsapp, '\D', '', 'g');

    SELECT *
    INTO v_creator
    FROM creators
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));

    IF NOT FOUND THEN
        RETURN json_build_object('encontrado', false, 'erro', 'Nenhum cadastro encontrado com esse e-mail.');
    END IF;

    v_db_whatsapp_clean := regexp_replace(v_creator.whatsapp, '\D', '', 'g');

    IF v_whatsapp_clean <> v_db_whatsapp_clean THEN
        RETURN json_build_object('encontrado', false, 'erro', 'O WhatsApp nao confere com o cadastro desse e-mail.');
    END IF;

    RETURN json_build_object(
        'encontrado', true,
        'dados', json_build_object(
            'nome', v_creator.nome,
            'whatsapp', v_creator.whatsapp,
            'email', v_creator.email,
            'instagram', v_creator.instagram,
            'tiktok', v_creator.tiktok,
            'data_nascimento', v_creator.data_nascimento,
            'genero', v_creator.genero,
            'seguidores', v_creator.seguidores,
            'estado', v_creator.estado,
            'cidade', v_creator.cidade,
            'nicho', v_creator.nicho,
            'tipo_creator', v_creator.tipo_creator,
            'sobre', v_creator.sobre,
            'experiencia', v_creator.experiencia,
            'portfolio', v_creator.portfolio,
            'melhor_conteudo', v_creator.melhor_conteudo,
            'foto_perfil', v_creator.foto_perfil
        )
    );
END;
$$;


-- 2. Atualizar cadastro (re-verifica identidade antes)
CREATE OR REPLACE FUNCTION creator_update_self(
    p_email TEXT,
    p_whatsapp TEXT,
    p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_creator_id UUID;
    v_whatsapp_clean TEXT;
    v_db_whatsapp_clean TEXT;
    v_allowed_keys TEXT[] := ARRAY[
        'nome', 'whatsapp', 'instagram', 'tiktok',
        'data_nascimento', 'genero', 'seguidores',
        'estado', 'cidade', 'nicho', 'tipo_creator',
        'sobre', 'experiencia', 'portfolio',
        'melhor_conteudo', 'foto_perfil'
    ];
    v_key TEXT;
    v_set_parts TEXT[] := '{}';
BEGIN
    v_whatsapp_clean := regexp_replace(p_whatsapp, '\D', '', 'g');

    SELECT id, regexp_replace(whatsapp, '\D', '', 'g')
    INTO v_creator_id, v_db_whatsapp_clean
    FROM creators
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email));

    IF NOT FOUND THEN
        RETURN json_build_object('sucesso', false, 'erro', 'Cadastro nao encontrado.');
    END IF;

    IF v_whatsapp_clean <> v_db_whatsapp_clean THEN
        RETURN json_build_object('sucesso', false, 'erro', 'WhatsApp nao confere.');
    END IF;

    FOR v_key IN SELECT unnest(v_allowed_keys)
    LOOP
        IF p_data ? v_key THEN
            v_set_parts := array_append(
                v_set_parts,
                format('%I = %L', v_key, p_data ->> v_key)
            );
        END IF;
    END LOOP;

    IF array_length(v_set_parts, 1) IS NULL OR array_length(v_set_parts, 1) = 0 THEN
        RETURN json_build_object('sucesso', false, 'erro', 'Nenhum campo para atualizar.');
    END IF;

    v_set_parts := array_append(v_set_parts, format('updated_at = %L', NOW()));

    EXECUTE format(
        'UPDATE creators SET %s WHERE id = %L',
        array_to_string(v_set_parts, ', '),
        v_creator_id
    );

    RETURN json_build_object('sucesso', true);
END;
$$;


-- 3. Permissoes para usuarios anonimos
GRANT EXECUTE ON FUNCTION creator_verify_identity(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION creator_update_self(TEXT, TEXT, JSONB) TO anon;
