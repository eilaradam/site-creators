// Disparo de e-mail em massa (creators) — modelado no send-bulk-email do MeuManager.
// Auth: precisa de usuário logado E admin (tabela usuarios, role='admin').
// Envia via Resend (RESEND_API_KEY já configurado no projeto). Personaliza {{nome}}.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "Lara Dam <contato@ugcmanager.com.br>";
const REPLY_TO = "contato@ugcmanager.com.br";
const MAX_PER_CALL = 250;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Só admin pode disparar
    const { data: isAdmin } = await admin
      .from("usuarios")
      .select("id")
      .eq("id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { recipients, subject, html } = await req.json();
    if (!Array.isArray(recipients) || !recipients.length || !subject || !html) {
      return json({ error: "recipients[], subject e html são obrigatórios" }, 400);
    }
    if (recipients.length > MAX_PER_CALL) {
      return json({ error: `Máximo ${MAX_PER_CALL} por lote (envie em batches)` }, 400);
    }

    // Lista de descadastro (se a tabela existir)
    let optout = new Set<string>();
    try {
      const { data: outs } = await admin.from("email_optout").select("email");
      if (outs) optout = new Set(outs.map((o: { email: string }) => String(o.email).toLowerCase()));
    } catch (_) { /* tabela pode não existir ainda — segue */ }

    let sent = 0, failed = 0, skipped = 0;
    let cotaAcabou = false;                       // cota diaria do Resend estourou
    // Um registro por destinatario. Sem isso, quando um disparo morre no meio (foi o
    // que a cota diaria fez em 01/09/2026) nao da pra saber quem recebeu e quem nao.
    const registro: { email: string; assunto: string; status: string; erro: string | null; resend_id: string | null }[] = [];
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i] || {};
      const email = String(r.email || "").trim().toLowerCase();
      if (!email || !email.includes("@")) { failed++; continue; }
      if (optout.has(email)) { skipped++; continue; }
      const nome = (String(r.nome || "").trim().split(/\s+/)[0]) || "creator";
      const personalHtml = String(html).replace(/\{\{nome\}\}/g, nome);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM,
            reply_to: REPLY_TO,
            to: [email],
            subject,
            html: personalHtml,
            headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=SAIR>` },
          }),
        });
        if (res.ok) {
          sent++;
          let rid: string | null = null;
          try { rid = (await res.json())?.id ?? null; } catch { /* sem id */ }
          registro.push({ email, assunto: String(subject), status: "ok", erro: null, resend_id: rid });
        } else {
          failed++;
          const corpo = await res.text();
          console.error("Resend err", res.status, corpo);
          registro.push({ email, assunto: String(subject), status: "erro", erro: corpo.slice(0, 300), resend_id: null });
          // Cota diaria batida: PARA na hora. Antes ele seguia martelando a API e
          // devolvia 100+ "falhas" sem dizer o motivo de verdade.
          if (corpo.includes("daily_quota_exceeded")) { cotaAcabou = true; break; }
        }
      } catch (e) {
        failed++;
        console.error("send err", e);
        registro.push({ email, assunto: String(subject), status: "erro", erro: String(e).slice(0, 300), resend_id: null });
      }
      // ~5/seg (seguro pro Resend)
      if (i < recipients.length - 1) await new Promise((rs) => setTimeout(rs, 200));
    }

    // grava o registro (best-effort: se falhar, o disparo em si nao se perde)
    try {
      for (let i = 0; i < registro.length; i += 400) {
        await admin.from("email_envios").insert(registro.slice(i, i + 400));
      }
    } catch (e) { console.error("[log] email_envios falhou:", e); }

    const naoTentados = cotaAcabou ? recipients.length - sent - failed - skipped : 0;
    return json({ sent, failed, skipped, total: recipients.length, cotaAcabou, naoTentados });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
