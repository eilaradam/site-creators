// Recupera do Resend quem REALMENTE recebeu cada e-mail e grava em email_envios.
// Existe por causa do disparo de 01/09/2026: a cota diaria do Resend estourou no meio
// da campanha e nao havia como saber quem tinha recebido e quem nao.
// Auth: x-sched-key = SCHED_SECRET (uso pontual da Lara/admin).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sched-key",
};
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const segredo = Deno.env.get("SCHED_SECRET") || "";
    if (!segredo || (req.headers.get("x-sched-key") || "") !== segredo) {
      return new Response("forbidden", { status: 403, headers: cors });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const body = await req.json().catch(() => ({}));

    // Puxa a lista de e-mails do Resend e grava em email_envios.
    if (body?.action === "sync") {
      const limite = Math.min(Number(body.limite) || 500, 1000);
      const r = await fetch(`https://api.resend.com/emails?limit=${limite}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      const txt = await r.text();
      if (!r.ok) return json({ erro: "Resend nao aceitou a listagem", status: r.status, resposta: txt.slice(0, 400) }, 200);
      // deno-lint-ignore no-explicit-any
      let d: any = {};
      try { d = JSON.parse(txt); } catch { return json({ erro: "resposta nao e json", resposta: txt.slice(0, 300) }); }
      const itens = d.data || d.emails || [];
      // deno-lint-ignore no-explicit-any
      const linhas = (itens as any[]).map((e) => ({
        email: String((Array.isArray(e.to) ? e.to[0] : e.to) || "").toLowerCase().trim(),
        assunto: e.subject || null,
        status: (e.last_event === "bounced" || e.last_event === "failed") ? "erro" : "ok",
        resend_id: e.id || null,
        origem: "resend_sync",
        ts: e.created_at || new Date().toISOString(),
      })).filter((x) => x.email.includes("@"));
      if (linhas.length) {
        for (let i = 0; i < linhas.length; i += 400) {
          await admin.from("email_envios").insert(linhas.slice(i, i + 400));
        }
      }
      return json({ trazidos: linhas.length, amostra: linhas.slice(0, 3) });
    }

    return json({ erro: "action desconhecida (use sync)" }, 400);
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
