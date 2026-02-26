/* ── Auth Module · Site Creators ── */
(function() {
    'use strict';

    const SUPABASE_URL = 'https://mfrmnquvwwuxraqgemyh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcm1ucXV2d3d1eHJhcWdlbXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDI1NDIsImV4cCI6MjA4NzYxODU0Mn0.zmsi08dV5L1IlXJSr34vOii71w0g0OsD5_5DKio5g-o';

    let sb = null;
    try {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        console.error('Erro ao conectar Supabase:', err);
    }

    /** Verifica sessão ativa. Retorna { session, user } ou redireciona para login. */
    async function checkAuth() {
        if (!sb) { window.location.href = 'login.html'; return null; }
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) { window.location.href = 'login.html'; return null; }
            return { session, user: session.user };
        } catch (err) {
            window.location.href = 'login.html';
            return null;
        }
    }

    /** Busca role e info do usuário via função SECURITY DEFINER (bypassa RLS). */
    async function getUserInfo() {
        if (!sb) return null;
        const { data, error } = await sb.rpc('get_my_role');
        if (error || !data) return null;
        return data;
    }

    /** Retorna só o role do usuário. */
    async function getRole() {
        const info = await getUserInfo();
        if (!info || !info.ativo) return null;
        return info.role;
    }

    /** Redireciona para o painel correto baseado no role. */
    function redirectByRole(role) {
        if (role === 'admin') window.location.href = 'admin.html';
        else if (role === 'aluna') window.location.href = 'painel.html';
        else window.location.href = 'login.html';
    }

    /** Faz logout e redireciona. */
    async function logout() {
        if (sb) await sb.auth.signOut();
        window.location.href = 'login.html';
    }

    /** Login com email e senha. Retorna { user, role } ou throw Error. */
    async function login(email, password) {
        if (!sb) throw new Error('Conexão indisponível.');
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message === 'Invalid login credentials') throw new Error('E-mail ou senha incorretos.');
            throw error;
        }
        const role = await getRole();
        if (!role) {
            await sb.auth.signOut();
            throw new Error('Acesso não autorizado. Entre em contato com a administradora.');
        }
        try { await sb.rpc('track_login'); } catch(e) { console.error('track_login erro:', e); }
        return { user: data.user, role };
    }

    /** Cria um novo Supabase client (para signUp sem perder sessão do admin). */
    function createSignupClient() {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                storageKey: 'sb-signup-token',
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    }

    window.Auth = {
        sb,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        checkAuth,
        getUserInfo,
        getRole,
        redirectByRole,
        logout,
        login,
        createSignupClient
    };
})();
