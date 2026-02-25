-- ══════════════════════════════════════════════════════════════
-- SCHEMA COMPLETO — Lara Dam · Gestão UGC
-- Execute no Supabase SQL Editor (supabase.com/dashboard → SQL)
-- ══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- 1. CREATORS (cadastros do site)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS creators (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    whatsapp      TEXT NOT NULL,
    instagram     TEXT UNIQUE NOT NULL,
    seguidores    TEXT,
    nicho         TEXT,
    experiencia   TEXT,
    cidade        TEXT,
    status        TEXT DEFAULT 'novo'
                    CHECK (status IN ('novo', 'aprovado', 'ativo')),
    origem        TEXT DEFAULT 'site_recrutamento'
                    CHECK (origem IN ('site_recrutamento', 'instagram', 'indicacao')),
    avaliacao     INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creators_status ON creators(status);
CREATE INDEX IF NOT EXISTS idx_creators_nicho ON creators(nicho);
CREATE INDEX IF NOT EXISTS idx_creators_cidade ON creators(cidade);
CREATE INDEX IF NOT EXISTS idx_creators_origem ON creators(origem);


-- ─────────────────────────────────────────────
-- 2. LEADS (futuros usuários do app)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    whatsapp      TEXT,
    instagram     TEXT,
    tipo          TEXT NOT NULL
                    CHECK (tipo IN ('creator', 'marca', 'gestor')),
    origem        TEXT DEFAULT 'site_recrutamento'
                    CHECK (origem IN ('site_recrutamento', 'instagram', 'manager_club')),
    status        TEXT DEFAULT 'capturado'
                    CHECK (status IN ('capturado', 'engajado', 'convertido')),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_tipo ON leads(tipo);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_origem ON leads(origem);


-- ─────────────────────────────────────────────
-- 3. CAMPANHAS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhas (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome              TEXT NOT NULL,
    marca             TEXT NOT NULL,
    descricao         TEXT,
    data_inicio       DATE,
    data_fim          DATE,
    tipo_conteudo     TEXT,
    entregaveis       TEXT,
    verba_total       DECIMAL(10,2),
    valor_por_creator DECIMAL(10,2),
    status            TEXT DEFAULT 'planejamento'
                        CHECK (status IN ('planejamento', 'recrutando', 'em_andamento', 'finalizada')),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_marca ON campanhas(marca);


-- ─────────────────────────────────────────────
-- 4. CAMPANHA_CREATORS (quem participa)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanha_creators (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campanha_id       UUID NOT NULL REFERENCES campanhas(id) ON DELETE CASCADE,
    creator_id        UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    status            TEXT DEFAULT 'convidado'
                        CHECK (status IN ('convidado', 'aceito', 'em_producao', 'entregue', 'aprovado', 'pago')),
    valor             DECIMAL(10,2),
    pago              BOOLEAN DEFAULT FALSE,
    data_pagamento    DATE,
    nota_desempenho   INTEGER CHECK (nota_desempenho >= 1 AND nota_desempenho <= 5),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campanha_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_cc_campanha ON campanha_creators(campanha_id);
CREATE INDEX IF NOT EXISTS idx_cc_creator ON campanha_creators(creator_id);
CREATE INDEX IF NOT EXISTS idx_cc_status ON campanha_creators(status);
CREATE INDEX IF NOT EXISTS idx_cc_pago ON campanha_creators(pago);


-- ─────────────────────────────────────────────
-- 5. TRIGGER: updated_at automático
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_creators_updated
    BEFORE UPDATE ON creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_campanhas_updated
    BEFORE UPDATE ON campanhas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cc_updated
    BEFORE UPDATE ON campanha_creators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────
-- 6. RLS (Row Level Security)
-- ─────────────────────────────────────────────
-- Habilita RLS em todas as tabelas
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanha_creators ENABLE ROW LEVEL SECURITY;

-- Permite INSERT público (anon) para creators e leads (formulário do site)
CREATE POLICY "Permitir insert público creators"
    ON creators FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Permitir insert público leads"
    ON leads FOR INSERT
    TO anon
    WITH CHECK (true);

-- Permite tudo para usuários autenticados (admin/dashboard)
CREATE POLICY "Admin total creators"
    ON creators FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admin total leads"
    ON leads FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admin total campanhas"
    ON campanhas FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admin total campanha_creators"
    ON campanha_creators FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────
-- 7. VIEWS ÚTEIS
-- ─────────────────────────────────────────────

-- Resumo financeiro por campanha
CREATE OR REPLACE VIEW v_campanha_resumo AS
SELECT
    c.id,
    c.nome,
    c.marca,
    c.status,
    c.verba_total,
    COUNT(cc.id)                                     AS total_creators,
    COUNT(cc.id) FILTER (WHERE cc.status = 'pago')   AS creators_pagos,
    COALESCE(SUM(cc.valor), 0)                       AS valor_alocado,
    COALESCE(SUM(cc.valor) FILTER (WHERE cc.pago), 0) AS valor_pago,
    ROUND(AVG(cc.nota_desempenho), 1)                AS nota_media
FROM campanhas c
LEFT JOIN campanha_creators cc ON cc.campanha_id = c.id
GROUP BY c.id, c.nome, c.marca, c.status, c.verba_total;

-- Histórico do creator
CREATE OR REPLACE VIEW v_creator_historico AS
SELECT
    cr.id,
    cr.nome,
    cr.instagram,
    cr.status AS creator_status,
    cr.avaliacao,
    COUNT(cc.id)                                      AS campanhas_total,
    COUNT(cc.id) FILTER (WHERE cc.status = 'pago')    AS campanhas_pagas,
    COALESCE(SUM(cc.valor) FILTER (WHERE cc.pago), 0) AS total_recebido,
    ROUND(AVG(cc.nota_desempenho), 1)                 AS nota_media
FROM creators cr
LEFT JOIN campanha_creators cc ON cc.creator_id = cr.id
GROUP BY cr.id, cr.nome, cr.instagram, cr.status, cr.avaliacao;
