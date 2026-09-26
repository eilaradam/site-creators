// Fala com o Resend pra recuperar o que aconteceu com os e-mails ja enviados.
//
// action "sync"    : puxa a lista de e-mails do Resend e grava em email_envios
//                    (nasceu no disparo de 01/09/2026, quando a cota estourou no meio).
// action "eventos" : le o `last_event` de cada e-mail no Resend e grava em email_eventos
//                    (entregue / aberto / clicado / bounce / spam) pro painel
//                    "Resultado dos disparos" ter historico. O webhook resend-webhook
//                    cuida dos e-mails NOVOS; esta acao cuida dos que ja foram.
//
// Auth: x-sched-key = SCHED_SECRET (curl da Lara) OU sessao de admin do painel
//       (Authorization: Bearer <jwt> + usuarios.role = 'admin').
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sched-key",
};
// A chave normal do projeto e SO DE ENVIO e nao deixa listar. Pra ler o historico,
// a Lara cria no painel do Resend uma chave com permissao "Full access" e ela
// entra aqui como RESEND_READ_KEY.
const RESEND_API_KEY = Deno.env.get("RESEND_READ_KEY") || Deno.env.get("RESEND_API_KEY") || "";

// last_event do Resend -> eventos que o painel entende (um aberto implica entregue etc.)
const CADEIA: Record<string, string[]> = {
  delivered: ["email.delivered"],
  opened: ["email.delivered", "email.opened"],
  clicked: ["email.delivered", "email.opened", "email.clicked"],
  bounced: ["email.bounced"],
  complained: ["email.delivered", "email.complained"],
};

// deno-lint-ignore no-explicit-any
async function listarResend(paginas: number): Promise<{ itens: any[]; erro?: string }> {
  // deno-lint-ignore no-explicit-any
  const itens: any[] = [];
  let after: string | null = null;
  for (let p = 0; p < paginas; p++) {
    const url = `https://api.resend.com/emails?limit=100` + (after ? `&after=${encodeURIComponent(after)}` : "");
    const r = await fetch(url, { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
    const txt = await r.text();
    if (!r.ok) {
      const dica = r.status === 401 || r.status === 403 || /restricted|invalid/i.test(txt)
        ? " Crie no painel do Resend (API Keys) uma chave com permissao Full access e salve como RESEND_READ_KEY nos segredos das Edge Functions."
        : "";
      return { itens, erro: `Resend nao aceitou a listagem (${r.status}): ${txt.slice(0, 200)}.${dica}` };
    }
    // deno-lint-ignore no-explicit-any
    let d: any = {};
    try { d = JSON.parse(txt); } catch { return { itens, erro: "resposta do Resend nao e json: " + txt.slice(0, 200) }; }
    // deno-lint-ignore no-explicit-any
    const lote: any[] = d.data || d.emails || [];
    itens.push(...lote);
    if (lote.length < 100) break;
    after = lote[lote.length - 1]?.id || null;
    if (!after) break;
    // o Resend limita a 2 chamadas por segundo
    await new Promise((rs) => setTimeout(rs, 550));
  }
  return { itens };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ---- quem esta chamando? ----
    const segredo = Deno.env.get("SCHED_SECRET") || "";
    let autorizado = !!segredo && (req.headers.get("x-sched-key") || "") === segredo;
    if (!autorizado) {
      const auth = req.headers.get("authorization") || "";
      const jwt = auth.replace(/^Bearer\s+/i, "").trim();
      if (jwt && jwt !== (Deno.env.get("SUPABASE_ANON_KEY") || "")) {
        const { data: u } = await admin.auth.getUser(jwt);
        if (u?.user?.id) {
          const { data: perfil } = await admin.from("usuarios").select("role").eq("id", u.user.id).maybeSingle();
          autorizado = perfil?.role === "admin";
        }
      }
    }
    if (!autorizado) return new Response("forbidden", { status: 403, headers: cors });

    const body = await req.json().catch(() => ({}));

    // ---- sync: lista do Resend -> email_envios ----
    if (body?.action === "sync") {
      const { itens, erro } = await listarResend(Math.min(Number(body.paginas) || 6, 20));
      if (erro) return json({ erro }, 200);
      // deno-lint-ignore no-explicit-any
      const linhas = (itens as any[]).map((e) => ({
        email: String((Array.isArray(e.to) ? e.to[0] : e.to) || "").toLowerCase().trim(),
        assunto: e.subject || null,
        status: (e.last_event === "bounced" || e.last_event === "failed") ? "erro" : "ok",
        resend_id: e.id || null,
        origem: "resend_sync",
        ts: e.created_at || new Date().toISOString(),
      })).filter((x) => x.email.includes("@"));
      for (let i = 0; i < linhas.length; i += 400) {
        await admin.from("email_envios").insert(linhas.slice(i, i + 400));
      }
      return json({ trazidos: linhas.length, amostra: linhas.slice(0, 3) });
    }

    // ---- eventos: last_event do Resend -> email_eventos (historico do painel) ----
    if (body?.action === "eventos") {
      const { itens, erro } = await listarResend(Math.min(Number(body.paginas) || 45, 60));
      if (erro) return json({ erro }, 200);

      // deno-lint-ignore no-explicit-any
      const validos = (itens as any[]).filter((e) => e?.id);
      const ids = validos.map((e) => String(e.id));

      // 1. quais desses envios a gente conhece? (o painel so conta o que casa com email_envios)
      const conhecidos = new Set<string>();
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await admin.from("email_envios").select("resend_id").in("resend_id", ids.slice(i, i + 500));
        for (const r of data || []) if (r.resend_id) conhecidos.add(r.resend_id);
      }

      // 2. envio gravado sem id (lotes agendados antigos): completa pelo par e-mail + assunto
      let completados = 0;
      for (const e of validos) {
        if (conhecidos.has(e.id)) continue;
        const email = String((Array.isArray(e.to) ? e.to[0] : e.to) || "").toLowerCase().trim();
        if (!email || !e.subject) continue;
        const { data } = await admin.from("email_envios")
          .select("id").ilike("email", email).eq("assunto", e.subject).is("resend_id", null).limit(1);
        const alvo = data?.[0]?.id;
        if (!alvo) continue;
        const { error } = await admin.from("email_envios").update({ resend_id: e.id }).eq("id", alvo);
        if (!error) { completados++; conhecidos.add(e.id); }
      }

      // 3. eventos que ja existem (pra nao duplicar ao rodar de novo)
      const existentes = new Set<string>();
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await admin.from("email_eventos").select("resend_id, tipo").in("resend_id", ids.slice(i, i + 500));
        for (const r of data || []) existentes.add(`${r.resend_id}|${r.tipo}`);
      }

      // 4. grava a cadeia implicada pelo last_event
      // deno-lint-ignore no-explicit-any
      const novos: any[] = [];
      const porTipo: Record<string, number> = {};
      let semStatus = 0;
      for (const e of validos) {
        const cadeia = CADEIA[String(e.last_event || "")];
        if (!cadeia) { semStatus++; continue; }
        const email = String((Array.isArray(e.to) ? e.to[0] : e.to) || "").toLowerCase().trim() || null;
        for (const tipo of cadeia) {
          if (existentes.has(`${e.id}|${tipo}`)) continue;
          existentes.add(`${e.id}|${tipo}`);
          novos.push({
            resend_id: e.id, tipo, email, assunto: e.subject || null, url: null,
            ocorrido_em: e.created_at || null,
            payload: { backfill: true, last_event: e.last_event, fonte: "email-log/eventos" },
          });
          porTipo[tipo] = (porTipo[tipo] || 0) + 1;
        }
      }
      let gravados = 0;
      for (let i = 0; i < novos.length; i += 400) {
        const { error } = await admin.from("email_eventos").insert(novos.slice(i, i + 400));
        if (error) console.error("[eventos] insert falhou:", error.message);
        else gravados += Math.min(400, novos.length - i);
      }

      return json({
        lidos_no_resend: validos.length,
        conhecidos: conhecidos.size,
        envios_completados_com_id: completados,
        eventos_gravados: gravados,
        por_tipo: porTipo,
        sem_status_ainda: semStatus,
      });
    }

    return json({ erro: "action desconhecida (use sync ou eventos)" }, 400);
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
