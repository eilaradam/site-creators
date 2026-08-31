// Processa a fila de emails agendados (tabela emails_agendados).
// Chamado por pg_cron (a cada minuto) com header x-sched-key == AGENDADOS_KEY.
// Respeita os filtros de estado (uf) e cidade gravados na linha do agendamento.
// Pega 1 email vencido (agendado_para <= agora, status='pendente'), envia pra
// base de creators via Resend (endpoint em lote /emails/batch, 100 por chamada),
// personaliza {{nome}}, respeita email_optout, e grava o resultado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sched-key",
};
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const AGENDADOS_KEY = Deno.env.get("AGENDADOS_KEY")!;
const FROM = "Lara Dam <contato@ugcmanager.com.br>";
const REPLY_TO = "contato@ugcmanager.com.br";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    if ((req.headers.get("x-sched-key") || "") !== AGENDADOS_KEY) return json({ error: "unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1 email vencido pendente
    const { data: dueList } = await admin.from("emails_agendados")
      .select("*").eq("status", "pendente").lte("agendado_para", new Date().toISOString())
      .order("agendado_para", { ascending: true }).limit(1);
    const job = dueList && dueList[0];
    if (!job) return json({ ok: true, processados: 0 });

    // reivindica (evita processamento duplo entre ticks)
    const { data: claimed } = await admin.from("emails_agendados")
      .update({ status: "enviando" }).eq("id", job.id).eq("status", "pendente").select("id");
    if (!claimed || !claimed.length) return json({ ok: true, processados: 0, nota: "ja em processamento" });

    try {
      // destinatarios (dedup por email; pagina o cap de 1000 do PostgREST)
      const recs: { nome: string; email: string }[] = [];
      if (job.destinatario === "teste") {
        recs.push({ nome: "Lara", email: "laradam.ugc@gmail.com" });
      } else if (job.destinatario === "imersao") {
        // Lista da Imersao: tabela propria, nao e a base de creators.
        const { data, error } = await admin.from("imersao_alunas").select("nome,email").eq("ativo", true);
        if (error) throw error;
        const seen = new Set<string>();
        for (const a of (data || [])) {
          const email = String(a.email || "").trim().toLowerCase();
          if (email && email.includes("@") && !seen.has(email)) { seen.add(email); recs.push({ nome: a.nome || "", email }); }
        }
      } else if (String(job.destinatario || "").startsWith("marcas")) {
        // Base de marcas (CRM). O filtro de estado nao vale aqui, e quem esta
        // marcado como "nao mandar e-mail" fica de fora.
        const st = String(job.destinatario).split("_")[1];
        let qm = admin.from("marcas").select("nome,email").eq("descadastrada", false).not("email", "is", null);
        if (st) qm = qm.eq("status", st);
        const { data, error } = await qm.limit(5000);
        if (error) throw error;
        const seen = new Set<string>();
        for (const m of (data || [])) {
          const email = String(m.email || "").trim().toLowerCase();
          if (email && email.includes("@") && !seen.has(email)) { seen.add(email); recs.push({ nome: m.nome || "", email }); }
        }
      } else {
        const seen = new Set<string>();
        const PAGE = 1000;
        for (let from = 0; from < 200000; from += PAGE) {
          let q = admin.from("creators").select("nome,email").range(from, from + PAGE - 1);
          if (job.destinatario && job.destinatario !== "todos") q = q.eq("status", job.destinatario);
          // filtros de segmentacao geografica (gravados junto com o agendamento)
          if (job.uf) q = q.eq("estado", job.uf);
          if (job.uf && job.cidade) q = q.eq("cidade", job.cidade);
          const { data, error } = await q;
          if (error) throw error;
          if (!data || !data.length) break;
          for (const c of data) {
            const email = String(c.email || "").trim().toLowerCase();
            if (email && email.includes("@") && !seen.has(email)) { seen.add(email); recs.push({ nome: c.nome || "", email }); }
          }
          if (data.length < PAGE) break;
        }
      }

      // descadastros
      let optout = new Set<string>();
      try {
        const { data: outs } = await admin.from("email_optout").select("email");
        if (outs) optout = new Set(outs.map((o: { email: string }) => String(o.email).toLowerCase()));
      } catch (_) { /* tabela pode não existir */ }

      const targets = recs.filter((r) => !optout.has(r.email));
      const pulados = recs.length - targets.length;

      let sent = 0, falhas = 0;
      const CH = 100; // limite do endpoint em lote da Resend
      for (let i = 0; i < targets.length; i += CH) {
        const chunk = targets.slice(i, i + CH);
        const payload = chunk.map((r) => ({
          from: FROM,
          reply_to: REPLY_TO,
          to: [r.email],
          subject: job.assunto,
          html: String(job.html).replace(/\{\{nome\}\}/g, (String(r.nome).trim().split(/\s+/)[0] || "creator")),
          headers: { "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=SAIR>` },
        }));
        try {
          const res = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify(payload),
          });
          if (res.ok) sent += chunk.length;
          else { falhas += chunk.length; console.error("resend batch err", res.status, await res.text()); }
        } catch (e) { falhas += chunk.length; console.error("batch exc", e); }
        await new Promise((rs) => setTimeout(rs, 120));
      }

      await admin.from("emails_agendados").update({
        status: "enviado", enviados: sent, falhas, pulados, total: recs.length,
        sent_at: new Date().toISOString(), erro: null,
      }).eq("id", job.id);

      return json({ ok: true, processados: 1, id: job.id, enviados: sent, falhas, pulados, total: recs.length });
    } catch (e) {
      await admin.from("emails_agendados").update({ status: "erro", erro: String((e as Error)?.message || e) }).eq("id", job.id);
      return json({ ok: false, id: job.id, erro: String((e as Error)?.message || e) }, 500);
    }
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
