// Recebe os eventos do Resend (entregue, aberto, clicado, bounce, spam) e salva em email_eventos.
// Configurar no Resend > Webhooks apontando pra URL desta função.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SEGREDO = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

function base64ParaBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesParaBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

// Assinatura no padrão Svix, que é o que o Resend usa
async function assinaturaConfere(req: Request, corpo: string): Promise<boolean> {
  if (!SEGREDO) return true; // sem segredo configurado, aceita (útil pra testar)
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const assinaturas = req.headers.get("svix-signature");
  if (!id || !ts || !assinaturas) return false;

  // recusa evento velho demais (proteção contra reenvio malicioso)
  const idade = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(idade) || idade > 60 * 5) return false;

  const chave = await crypto.subtle.importKey(
    "raw",
    base64ParaBytes(SEGREDO.replace(/^whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const esperada = bytesParaBase64(
    await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(`${id}.${ts}.${corpo}`)),
  );
  return assinaturas.split(" ").some((parte) => parte.split(",")[1] === esperada);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const corpo = await req.text();
  if (!(await assinaturaConfere(req, corpo))) {
    return new Response("assinatura invalida", { status: 401 });
  }

  let evento: any;
  try { evento = JSON.parse(corpo); } catch { return new Response("json invalido", { status: 400 }); }

  const d = evento?.data ?? {};
  const clique = d.click ?? {};
  const destinatario = Array.isArray(d.to) ? d.to[0] : d.to;

  const linha = {
    resend_id: d.email_id ?? d.id ?? null,
    tipo: evento?.type ?? "desconhecido",
    email: destinatario ?? null,
    assunto: d.subject ?? null,
    url: clique.link ?? null,
    ip: clique.ipAddress ?? null,
    user_agent: clique.userAgent ?? null,
    ocorrido_em: evento?.created_at ?? clique.timestamp ?? null,
    payload: evento,
  };

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await sb.from("email_eventos").insert(linha);

  // duplicata (o Resend reenvia) não é erro
  if (error && !String(error.message).includes("duplicate key")) {
    console.error("falha ao salvar evento:", error.message);
    return new Response(JSON.stringify({ ok: false, erro: error.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
