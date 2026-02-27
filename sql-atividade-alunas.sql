-- ══════════════════════════════════════════════════════════════
-- ATIVIDADE ALUNAS: Tracking de uso real da plataforma
-- Execute no Supabase SQL Editor (supabase.com/dashboard → SQL)
-- ══════════════════════════════════════════════════════════════


-- 1. Tabela de atividade
CREATE TABLE IF NOT EXISTS atividade_alunas (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo        TEXT NOT NULL CHECK (tipo IN ('heartbeat', 'pesquisa', 'ver_perfil', 'salvar_creator', 'calculadora', 'ver_salvos')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_atividade_usuario ON atividade_alunas(usuario_id);
CREATE INDEX idx_atividade_created ON atividade_alunas(created_at);
CREATE INDEX idx_atividade_usuario_created ON atividade_alunas(usuario_id, created_at);

ALTER TABLE atividade_alunas ENABLE ROW LEVEL SECURITY;


-- 2. RPC: Registrar atividade (chamada pelo painel da aluna)
CREATE OR REPLACE FUNCTION track_atividade(p_tipo TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_tipo NOT IN ('heartbeat', 'pesquisa', 'ver_perfil', 'salvar_creator', 'calculadora', 'ver_salvos') THEN
        RAISE EXCEPTION 'Invalid tipo';
    END IF;

    -- Heartbeats: deduplicar (ignorar se ultimo < 90s)
    IF p_tipo = 'heartbeat' THEN
        IF EXISTS (
            SELECT 1 FROM atividade_alunas
            WHERE usuario_id = auth.uid()
              AND tipo = 'heartbeat'
              AND created_at > NOW() - INTERVAL '90 seconds'
        ) THEN
            RETURN;
        END IF;
    END IF;

    INSERT INTO atividade_alunas (usuario_id, tipo)
    VALUES (auth.uid(), p_tipo);
END;
$$;

GRANT EXECUTE ON FUNCTION track_atividade(TEXT) TO authenticated;


-- 3. RPC: Consultar atividade agregada (chamada pelo admin)
CREATE OR REPLACE FUNCTION admin_get_atividade(p_dias INTEGER DEFAULT 30)
RETURNS TABLE (
    usuario_id    UUID,
    nome          TEXT,
    email         TEXT,
    minutos_ativo INTEGER,
    total_acoes   INTEGER,
    pesquisas     INTEGER,
    perfis_vistos INTEGER,
    salvos        INTEGER,
    calculadora   INTEGER,
    ultima_atividade TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN QUERY
    SELECT
        u.id AS usuario_id,
        u.nome,
        u.email,
        COALESCE(COUNT(*) FILTER (WHERE a.tipo = 'heartbeat') * 2, 0)::INTEGER AS minutos_ativo,
        COALESCE(COUNT(*) FILTER (WHERE a.tipo <> 'heartbeat'), 0)::INTEGER AS total_acoes,
        COALESCE(COUNT(*) FILTER (WHERE a.tipo = 'pesquisa'), 0)::INTEGER AS pesquisas,
        COALESCE(COUNT(*) FILTER (WHERE a.tipo = 'ver_perfil'), 0)::INTEGER AS perfis_vistos,
        COALESCE(COUNT(*) FILTER (WHERE a.tipo = 'salvar_creator'), 0)::INTEGER AS salvos,
        COALESCE(COUNT(*) FILTER (WHERE a.tipo = 'calculadora'), 0)::INTEGER AS calculadora,
        MAX(a.created_at) AS ultima_atividade
    FROM public.usuarios u
    LEFT JOIN atividade_alunas a
        ON a.usuario_id = u.id
        AND a.created_at >= NOW() - (p_dias || ' days')::INTERVAL
    WHERE u.role = 'aluna'
    GROUP BY u.id, u.nome, u.email
    ORDER BY ultima_atividade DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_atividade(INTEGER) TO authenticated;
