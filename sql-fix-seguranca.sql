-- ══════════════════════════════════════════════════════════════
-- FIX DE SEGURANCA: Linter warnings do Supabase
-- Execute no Supabase SQL Editor (supabase.com/dashboard → SQL)
-- ══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- 1. VIEWS: Remover SECURITY DEFINER
-- ─────────────────────────────────────────────
ALTER VIEW public.v_campanha_resumo SET (security_invoker = on);
ALTER VIEW public.v_creators_popularidade SET (security_invoker = on);


-- ─────────────────────────────────────────────
-- 2. FUNCOES: Fixar search_path = public
-- Previne ataques de schema hijacking
-- ─────────────────────────────────────────────
ALTER FUNCTION public.update_campanha_interesse SET search_path = public;
ALTER FUNCTION public.admin_dashboard_stats SET search_path = public;
ALTER FUNCTION public.get_my_role SET search_path = public;
ALTER FUNCTION public.admin_load_alunas SET search_path = public;
ALTER FUNCTION public.track_login SET search_path = public;
ALTER FUNCTION public.admin_insert_aluna SET search_path = public;
ALTER FUNCTION public.admin_renovar_aluna SET search_path = public;
ALTER FUNCTION public.admin_toggle_aluna SET search_path = public;
ALTER FUNCTION public.admin_delete_creator SET search_path = public;
ALTER FUNCTION public.verificar_e_participar SET search_path = public;


-- ─────────────────────────────────────────────
-- 3. RLS: Restringir policies permissivas
--
-- Problema: "ALL" com USING(true) para authenticated
-- significa que qualquer aluna logada pode UPDATE/DELETE
-- em creators, campanhas, etc. Vamos restringir:
--   - SELECT: todos autenticados (alunas precisam ver creators)
--   - INSERT/UPDATE/DELETE: somente admin
-- ─────────────────────────────────────────────

-- ── CREATORS ──
-- Remover policy permissiva atual
DROP POLICY IF EXISTS "Acesso total para autenticados - creators" ON public.creators;
DROP POLICY IF EXISTS "Admin total creators" ON public.creators;

-- SELECT: qualquer autenticado (alunas navegam creators)
CREATE POLICY "Select para autenticados - creators"
    ON public.creators FOR SELECT
    TO authenticated
    USING (true);

-- UPDATE/DELETE: somente admin
CREATE POLICY "Admin update creators"
    ON public.creators FOR UPDATE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin delete creators"
    ON public.creators FOR DELETE
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'));

-- INSERT autenticado (admin pode inserir via painel)
CREATE POLICY "Admin insert creators"
    ON public.creators FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'));


-- ── CAMPANHAS ──
DROP POLICY IF EXISTS "Acesso total para autenticados - campanhas" ON public.campanhas;
DROP POLICY IF EXISTS "Admin total campanhas" ON public.campanhas;

CREATE POLICY "Admin total campanhas"
    ON public.campanhas FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'));


-- ── CAMPANHA_CREATORS ──
DROP POLICY IF EXISTS "Acesso total para autenticados - campanha_creators" ON public.campanha_creators;
DROP POLICY IF EXISTS "Admin total campanha_creators" ON public.campanha_creators;

CREATE POLICY "Admin total campanha_creators"
    ON public.campanha_creators FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'));


-- ── LEADS ──
DROP POLICY IF EXISTS "Acesso total para autenticados - leads" ON public.leads;
DROP POLICY IF EXISTS "Admin total leads" ON public.leads;

CREATE POLICY "Admin total leads"
    ON public.leads FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'admin'));


-- ─────────────────────────────────────────────
-- 4. NOTA: Leaked Password Protection
-- Ativar no painel do Supabase:
-- Authentication → Settings → Password Protection
-- Marcar "Enable leaked password protection"
-- ─────────────────────────────────────────────
