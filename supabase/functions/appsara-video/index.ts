// App Sara (creators.laradam.com/appsara): gera vídeos de produto com o Gemini Omni Flash.
// A chave do Google fica só aqui. O app manda a senha (APPSARA_SENHA) no cabeçalho x-app-senha.
// Teto de gasto por dia em dólar: APPSARA_TETO_DIA (padrão 3). Registro em public.appsara_videos.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI = Deno.env.get("GEMINI_API_KEY") || "";
const SENHA = Deno.env.get("APPSARA_SENHA") || "";
const TETO = Number(Deno.env.get("APPSARA_TETO_DIA") || "3");
const MODELO = "gemini-omni-1.2-flash";
const API = "https://generativelanguage.googleapis.com/v1beta";
// Preço aproximado por segundo de vídeo (página de preços do Google, nov/2026).
const PRECO: Record<string, number> = { "360p": 0.023, "720p": 0.07, "1080p": 0.104 };

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-senha",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Procura o endereço do arquivo de vídeo em qualquer ponto da resposta.
function acharFileId(o: unknown): string | null {
  if (typeof o === "string") {
    const m = o.match(/files\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }
  if (o && typeof o === "object") {
    for (const v of Object.values(o as Record<string, unknown>)) {
      const r = acharFileId(v);
      if (r) return r;
    }
  }
  return null;
}

async function gastoHoje() {
  // "Hoje" no horário de Brasília.
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 3));
  const { data } = await sb.from("appsara_videos").select("custo_usd")
    .gte("criado_em", inicio.toISOString()).neq("status", "falhou");
  return (data || []).reduce((s: number, r: { custo_usd: number | null }) => s + Number(r.custo_usd || 0), 0);
}

async function criar(b: Record<string, unknown>) {
  const prompt = String(b.prompt || "").slice(0, 6000);
  if (!prompt) return json({ erro: "Faltou o prompt." }, 400);
  const segundos = Math.min(15, Math.max(3, parseInt(String(b.segundos || 8), 10) || 8));
  const resolucao = PRECO[String(b.resolucao)] ? String(b.resolucao) : "720p";
  const custo = Math.round(segundos * PRECO[resolucao] * 1000) / 1000;

  const gasto = await gastoHoje();
  if (gasto + custo > TETO) {
    return json({ erro: `O limite de hoje (US$ ${TETO.toFixed(2)}) já foi usado. Amanhã libera de novo.`, gasto, teto: TETO }, 429);
  }

  const imagens = (Array.isArray(b.imagens) ? b.imagens : []).slice(0, 6) as { data?: string; mime?: string }[];
  const input: unknown[] = imagens.filter((i) => i && i.data).map((i) => ({
    type: "image", data: String(i.data), mime_type: i.mime || "image/jpeg",
  }));
  input.push({ type: "text", text: prompt });

  const r = await fetch(`${API}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI },
    body: JSON.stringify({
      model: MODELO,
      input,
      response_format: { type: "video", aspect_ratio: "9:16", duration: `${segundos}s`, resolution: resolucao, delivery: "uri" },
    }),
  });
  const resp = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (resp as { error?: { message?: string } })?.error?.message || `Erro ${r.status} do Google.`;
    return json({ erro: "O Google recusou o pedido: " + msg }, 502);
  }
  const fileId = acharFileId(resp);
  if (!fileId) return json({ erro: "O Google respondeu sem o endereço do vídeo." }, 502);

  const { data, error } = await sb.from("appsara_videos").insert({
    perfil: String(b.perfil || "").slice(0, 120), produto: String(b.produto || "").slice(0, 200),
    formato: String(b.formato || "").slice(0, 40), segundos, resolucao, custo_usd: custo, file_id: fileId, status: "gerando",
  }).select("id").single();
  if (error) return json({ erro: "Não deu para registrar o vídeo: " + error.message }, 500);
  return json({ id: data.id, custo, gasto_hoje: gasto + custo, teto: TETO });
}

async function status(b: Record<string, unknown>) {
  const { data: v } = await sb.from("appsara_videos").select("id,file_id,status,erro").eq("id", String(b.id || "")).maybeSingle();
  if (!v) return json({ erro: "Vídeo não encontrado." }, 404);
  if (v.status !== "gerando") return json({ status: v.status, erro: v.erro });
  const r = await fetch(`${API}/files/${v.file_id}`, { headers: { "x-goog-api-key": GEMINI } });
  const f = await r.json().catch(() => ({}));
  const estado = String((f as { state?: string }).state || "");
  if (estado === "ACTIVE") {
    await sb.from("appsara_videos").update({ status: "pronto" }).eq("id", v.id);
    return json({ status: "pronto" });
  }
  if (estado === "FAILED" || (!r.ok && r.status !== 429 && r.status < 500)) {
    const erro = (f as { error?: { message?: string } })?.error?.message || "O Google não conseguiu gerar este vídeo.";
    await sb.from("appsara_videos").update({ status: "falhou", erro }).eq("id", v.id);
    return json({ status: "falhou", erro });
  }
  return json({ status: "gerando" });
}

async function baixar(b: Record<string, unknown>) {
  const { data: v } = await sb.from("appsara_videos").select("file_id,status").eq("id", String(b.id || "")).maybeSingle();
  if (!v || v.status !== "pronto") return json({ erro: "Vídeo ainda não está pronto." }, 404);
  const r = await fetch(`${API}/files/${v.file_id}:download?alt=media`, { headers: { "x-goog-api-key": GEMINI } });
  if (!r.ok || !r.body) return json({ erro: "O vídeo não está mais disponível no Google. Gere de novo." }, 410);
  return new Response(r.body, { headers: { ...cors, "Content-Type": "video/mp4" } });
}

async function lista() {
  const { data } = await sb.from("appsara_videos")
    .select("id,criado_em,perfil,produto,formato,segundos,custo_usd,status,erro")
    .order("criado_em", { ascending: false }).limit(30);
  return json({ videos: data || [], gasto_hoje: await gastoHoje(), teto: TETO });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  if (!GEMINI || !SENHA) return json({ erro: "O servidor ainda não foi configurado (faltam a chave do Google e a senha do app)." }, 503);
  if (!igual(req.headers.get("x-app-senha") || "", SENHA)) return json({ erro: "Senha incorreta." }, 401);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch (_) { return json({ erro: "Pedido inválido." }, 400); }
  try {
    switch (b.acao) {
      case "entrar": return json({ ok: true });
      case "criar": return await criar(b);
      case "status": return await status(b);
      case "baixar": return await baixar(b);
      case "lista": return await lista();
      default: return json({ erro: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    return json({ erro: "Erro no servidor: " + (e instanceof Error ? e.message : String(e)) }, 500);
  }
});
