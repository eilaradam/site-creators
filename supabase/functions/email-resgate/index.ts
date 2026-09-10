// Resgata na API do Resend o status dos emails que já saíram (entregue, bounce, aberto, clicado)
// e grava em email_eventos. Serve pros envios feitos antes do webhook existir.
// Chamar com: POST { limite: 150 }  (roda em lotes por causa do limite de requisições do Resend)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CHAVE = Deno.env.get("RESEND_API_KEY")!;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const { limite = 100 } = await req.json().catch(() => ({}));
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // envios que ainda não têm nenhum evento salvo
  const { data: pendentes, error } = await sb.rpc("emails_sem_evento", { limite });
  if (error) return new Response(JSON.stringify({ ok: false, erro: error.message }), { status: 500 });

  let salvos = 0, falhas = 0; let primeiroErro: string | null = null;
  for (const linha of pendentes ?? []) {
    try {
      const r = await fetch(`https://api.resend.com/emails/${linha.resend_id}`, {
        headers: { Authorization: `Bearer ${CHAVE}` },
      });
      if (!r.ok) { falhas++; if (!primeiroErro) primeiroErro = `${r.status}: ${(await r.text()).slice(0,160)}`; await espera(600); continue; }
      const e = await r.json();
      const ultimo = e.last_event ? `email.${e.last_event}` : null;
      if (ultimo) {
        await sb.from("email_eventos").insert({
          resend_id: linha.resend_id,
          tipo: ultimo,
          email: Array.isArray(e.to) ? e.to[0] : e.to,
          assunto: e.subject ?? linha.assunto,
          ocorrido_em: e.created_at ?? null,
          payload: { origem: "resgate", ...e },
        });
        salvos++;
      }
    } catch (_e) { falhas++; }
    await espera(600); // respeita o limite de 2 por segundo do Resend
  }

  return new Response(JSON.stringify({ ok: true, verificados: pendentes?.length ?? 0, salvos, falhas, primeiroErro }), {
    headers: { "Content-Type": "application/json" },
  });
});
