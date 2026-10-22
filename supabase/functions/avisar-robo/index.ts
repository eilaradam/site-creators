// Aviso por e-mail do robo de inscricoes (Seu Influencer). Manda SO para a Lara.
// Chamada pelo robo no Mac (sem JWT), protegida por um token compartilhado (ROBO_AVISO_TOKEN).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TOKEN = Deno.env.get("ROBO_AVISO_TOKEN")!;
const FROM = "Robô da Lara <contato@ugcmanager.com.br>";
const PARA = "laradam.ugc@gmail.com";

serve(async (req) => {
  if (req.method !== "POST") return new Response("método não permitido", { status: 405 });
  if (!TOKEN || req.headers.get("x-robo-token") !== TOKEN) return new Response("não autorizado", { status: 401 });
  const { assunto, texto } = await req.json().catch(() => ({}));
  if (!assunto || !texto) return new Response("faltou assunto/texto", { status: 400 });
  const html = `<div style="font-family:sans-serif;font-size:16px;line-height:1.5;white-space:pre-line">${String(texto).slice(0, 4000).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [PARA], subject: String(assunto).slice(0, 200), html }),
  });
  return new Response(await r.text(), { status: r.ok ? 200 : 502 });
});
