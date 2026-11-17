// App Sara (creators.laradam.com/appsara): estúdio automático de vídeos de produto para o TikTok Shop.
//
// Fluxo de cada vídeo (tabela appsara_jobs, avançada pelo cron a cada minuto e pelo app aberto):
//   fila -> planejar (IA escreve os prompts e a legenda)
//   foto -> gerar a cena parada com a personagem e o produto (Nano Banana)
//   conf_foto -> IA compara a cena com as fotos da loja; se errou, refaz (até 3 vezes)
//   video -> anima a cena aprovada (Omni Flash)
//   conf_video -> IA compara o vídeo com as fotos da loja; se errou, refaz (até 2 vezes)
//   pronto | reprovado | erro
//
// Segredos: GEMINI_API_KEY, APPSARA_SENHA (app manda em x-app-senha), APPSARA_TETO_DIA (US$, padrão 3).
// A ação "tick" não exige senha: só avança vídeos que já estão na fila.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as b64dec, encode as b64encStd } from "https://deno.land/std@0.168.0/encoding/base64.ts";
const b64enc = (u: Uint8Array) => b64encStd(u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer);

const GEMINI = Deno.env.get("GEMINI_API_KEY") || "";
const SENHA = Deno.env.get("APPSARA_SENHA") || "";
const TETO = Number(Deno.env.get("APPSARA_TETO_DIA") || "3");

const API = "https://generativelanguage.googleapis.com/v1beta";
const REVISAO = "2026-05-20";
const M_TEXTO = ["gemini-4-hydrogen", "gemini-3.5-flash-lite"]; // tenta o primeiro; cai no segundo se não existir
const M_FOTO = "gemini-nano-banana-2.1";
const M_VIDEO = "gemini-omni-1.2-flash";

// Custos aproximados (página de preços do Google, nov/2026), em US$.
const C_TEXTO = 0.01;
const C_FOTO = 0.04;
const C_SEG: Record<string, number> = { "360p": 0.023, "720p": 0.07, "1080p": 0.104 };

const MAX_FOTO = 3;
const MAX_VIDEO = 2;
const BUCKET = "appsara";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-senha",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

class Falha extends Error {
  constructor(msg: string, public status = 400) { super(msg); }
}

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// ---------------------------------------------------------------- Google

type Parte = Record<string, unknown>;

function partesDe(o: unknown, tipo: string, acc: Record<string, unknown>[] = []) {
  if (Array.isArray(o)) for (const v of o) partesDe(v, tipo, acc);
  else if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if (r.type === tipo && (r.text !== undefined || r.data !== undefined || r.uri !== undefined)) acc.push(r);
    for (const [k, v] of Object.entries(r)) if (k !== "input") partesDe(v, tipo, acc);
  }
  return acc;
}

async function gemini(model: string, input: Parte[], extra: Record<string, unknown> = {}) {
  const r = await fetch(`${API}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI, "Api-Revision": REVISAO },
    body: JSON.stringify({ model, input, ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j as { error?: { message?: string } })?.error?.message || `erro ${r.status}`;
    if (r.status === 402) throw new Falha("O crédito do Google acabou. Recarregue em aistudio.google.com/billing.", 402);
    throw new Falha(`Google (${model}): ${msg}`, r.status === 429 ? 429 : 502);
  }
  return j as Record<string, unknown>;
}

function textoDe(resp: unknown): string {
  return partesDe(resp, "text").map((p) => String(p.text || "")).join("\n").trim();
}

function lerJson(t: string): Record<string, unknown> {
  const limpo = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(limpo); } catch { /* tenta achar o objeto */ }
  const a = limpo.indexOf("{"), b = limpo.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(limpo.slice(a, b + 1)); } catch { /* cai abaixo */ }
  }
  throw new Falha("A IA respondeu num formato inesperado. Tente de novo.", 502);
}

// Pergunta à IA de texto e devolve JSON. Tenta o modelo principal e cai no reserva se ele não existir.
async function perguntarJson(input: Parte[]): Promise<Record<string, unknown>> {
  let ultimo: unknown = null;
  for (const m of M_TEXTO) {
    try {
      const resp = await gemini(m, input, {
        response_format: { type: "text", mime_type: "application/json" },
        store: false,
      });
      return lerJson(textoDe(resp));
    } catch (e) {
      ultimo = e;
      const msg = e instanceof Error ? e.message : "";
      if (!/not found|not supported|404|unknown model|invalid model/i.test(msg)) throw e;
    }
  }
  throw ultimo;
}

const img = (bytes: Uint8Array, mime = "image/jpeg"): Parte => ({ type: "image", data: b64enc(bytes), mime_type: mime });
const txt = (t: string): Parte => ({ type: "text", text: t });

// ---------------------------------------------------------------- Armazenamento

async function salvar(path: string, bytes: Uint8Array, mime = "image/jpeg") {
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: true });
  if (error) throw new Falha("Não deu para guardar a imagem: " + error.message, 500);
}
async function ler(path: string): Promise<Uint8Array> {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) throw new Falha("Imagem guardada não encontrada: " + path, 500);
  return new Uint8Array(await data.arrayBuffer());
}
async function links(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const ps = paths.filter((p): p is string => !!p);
  if (!ps.length) return {};
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(ps, 3600);
  const out: Record<string, string> = {};
  for (const d of data || []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
function decodificar(d: unknown): Uint8Array {
  const s = String(d || "").replace(/^data:[^,]+,/, "");
  if (!s) throw new Falha("Imagem vazia.");
  const b = b64dec(s);
  if (b.length > 6_000_000) throw new Falha("Imagem grande demais.");
  return b;
}

// ---------------------------------------------------------------- Gasto

function inicioDoDia() {
  const agora = new Date(Date.now() - 3 * 3600 * 1000); // Brasília
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), 3)).toISOString();
}
async function gastoHoje(): Promise<number> {
  const { data } = await sb.from("appsara_gastos").select("valor").gte("criado_em", inicioDoDia());
  return (data || []).reduce((s: number, r: { valor: number }) => s + Number(r.valor || 0), 0);
}
async function gastar(valor: number, motivo: string, job_id: string | null = null) {
  await sb.from("appsara_gastos").insert({ valor, motivo, job_id });
}

// ---------------------------------------------------------------- Produto

const PEDIDO_ANALISE = `Você é a equipe de catálogo de uma loja de moda do TikTok Shop. As imagens são prints ou fotos do anúncio de UM produto.
Objetivo: descrever o produto com tanta precisão que uma IA de vídeo consiga reproduzi-lo sem nenhuma diferença. O TikTok remove vídeos por diferenças pequenas (costura, laço, renda, tamanho, número de peças), então seja minucioso e não invente nada.

Para cada imagem, na ordem em que vieram (índice começando em 0), diga:
- tipo: "foto_produto" (foto mostrando a peça), "detalhes_texto" (print com texto de características, material, descrição), "tabela_medidas", ou "outro"
- caixa: [ymin, xmin, ymax, xmax] de 0 a 1000 com a região onde está SÓ o produto (sem botões, textos ou bordas do aplicativo). Para imagens que não são foto do produto, use [0,0,1000,1000].
- qualidade: 1 a 5 (quão bem a imagem mostra o produto inteiro e nítido)
- vista: "frente", "costas", "lado", "detalhe", "vestida", "kit" ou "outra"

Depois preencha a ficha, juntando o que as fotos mostram com o que os textos dizem. Quando não der para saber, escreva "não aparece".

Responda só com JSON neste formato:
{
 "imagens": [{"indice":0,"tipo":"","caixa":[0,0,1000,1000],"qualidade":0,"vista":""}],
 "ficha": {
  "nome_curto": "nome simples em português, até 6 palavras",
  "categoria": "roupa | roupa_intima | calcado | acessorio | bolsa | beleza | casa | outro",
  "tipo_peca": "",
  "pecas_no_pedido": 1,
  "cores": [""],
  "material": "",
  "textura_brilho": "",
  "transparencia": "",
  "caimento": "",
  "gola_decote": "",
  "alcas_mangas": "",
  "comprimento": "onde termina no corpo",
  "cintura": "",
  "fechamento": "",
  "bolsos": "",
  "detalhes": ["cada detalhe com posição e tamanho aproximado: laços, rendas, recortes, pregas, botões, ilhoses, franjas"],
  "costuras": "onde ficam as costuras e recortes visíveis",
  "estampa": "",
  "etiquetas_logos": "",
  "medidas": "medidas ou tamanhos encontrados nos textos e tabelas",
  "o_que_nao_tem": ["coisas que a IA costuma inventar e que este produto NÃO tem, ex.: sem bolsos, sem botões, sem estampa"],
  "duvidas": ["o que não deu para confirmar pelas imagens"]
 },
 "resumo": "2 ou 3 frases simples em português explicando o produto para a vendedora conferir"
}`;

async function analisar(b: Record<string, unknown>) {
  const fotos = (Array.isArray(b.fotos) ? b.fotos : []).slice(0, 8);
  if (!fotos.length) throw new Falha("Envie pelo menos uma foto ou print do anúncio.");
  const bytes = fotos.map((f) => decodificar(f));

  const gasto = await gastoHoje();
  if (gasto + C_TEXTO > TETO) throw new Falha(`O limite de hoje (US$ ${TETO.toFixed(2)}) já foi usado. Amanhã libera de novo.`, 429);

  const { data: prod, error } = await sb.from("appsara_produtos").insert({ status: "analisando" }).select("id").single();
  if (error) throw new Falha("Não deu para criar o produto: " + error.message, 500);
  const orig: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const p = `produtos/${prod.id}/orig-${i}.jpg`;
    await salvar(p, bytes[i]);
    orig.push(p);
  }

  const obs = String(b.observacao || "").slice(0, 800);
  const input: Parte[] = [...bytes.map((x) => img(x)), txt(PEDIDO_ANALISE + (obs ? `\n\nA vendedora avisou: "${obs}". Leve isso em conta.` : ""))];
  let r: Record<string, unknown>;
  try {
    r = await perguntarJson(input);
  } catch (e) {
    await sb.from("appsara_produtos").update({ status: "erro", erro: e instanceof Error ? e.message : String(e), orig_paths: orig }).eq("id", prod.id);
    throw e;
  }
  await gastar(C_TEXTO, "analise");
  const ficha = (r.ficha || {}) as Record<string, unknown>;
  const imagens = Array.isArray(r.imagens) ? r.imagens : [];
  await sb.from("appsara_produtos").update({
    status: "aguardando_refs",
    nome: String(ficha.nome_curto || "Produto").slice(0, 80),
    ficha,
    resumo: String(r.resumo || "").slice(0, 1200),
    imagens_info: imagens,
    orig_paths: orig,
    observacao: obs || null,
  }).eq("id", prod.id);
  return json({ id: prod.id, nome: ficha.nome_curto, ficha, resumo: r.resumo, imagens });
}

// O app recorta cada foto na caixa que a IA indicou e manda os recortes; eles viram as referências.
async function refs(b: Record<string, unknown>) {
  const id = String(b.id || "");
  const { data: p } = await sb.from("appsara_produtos").select("id,orig_paths").eq("id", id).maybeSingle();
  if (!p) throw new Falha("Produto não encontrado.", 404);
  const lista = (Array.isArray(b.refs) ? b.refs : []).slice(0, 6);
  const paths: string[] = [];
  for (let i = 0; i < lista.length; i++) {
    const path = `produtos/${id}/ref-${i}.jpg`;
    await salvar(path, decodificar(lista[i]));
    paths.push(path);
  }
  const ref_paths = paths.length ? paths : (p.orig_paths || []).slice(0, 4);
  await sb.from("appsara_produtos").update({ ref_paths, status: "pronto" }).eq("id", id);
  return json({ ok: true, refs: ref_paths.length });
}

async function corrigir(b: Record<string, unknown>) {
  const id = String(b.id || "");
  const upd: Record<string, unknown> = {};
  if (typeof b.observacao === "string") upd.observacao = b.observacao.slice(0, 800);
  if (typeof b.nome === "string" && b.nome.trim()) upd.nome = b.nome.trim().slice(0, 80);
  await sb.from("appsara_produtos").update(upd).eq("id", id);
  return json({ ok: true });
}

async function produtos() {
  const { data } = await sb.from("appsara_produtos").select("id,criado_em,nome,resumo,ficha,ref_paths,observacao,status")
    .eq("status", "pronto").order("criado_em", { ascending: false }).limit(20);
  const urls = await links((data || []).map((p) => (p.ref_paths || [])[0]));
  return json({ produtos: (data || []).map((p) => ({ ...p, capa: urls[(p.ref_paths || [])[0]] || null })) });
}

// ---------------------------------------------------------------- Personagens

async function personagemSalvar(b: Record<string, unknown>) {
  const nome = String(b.nome || "").trim().slice(0, 60);
  const publico = String(b.publico || "").trim().slice(0, 600);
  if (!nome) throw new Falha("Dê um nome para a personagem.");
  let id = String(b.id || "");
  const upd: Record<string, unknown> = { nome, publico };
  if (typeof b.descricao === "string" && b.descricao.trim()) upd.descricao = b.descricao.trim().slice(0, 1500);
  if (!id) {
    if (!b.foto) throw new Falha("Envie a foto da personagem.");
    const { data, error } = await sb.from("appsara_personagens").insert(upd).select("id").single();
    if (error) throw new Falha("Não deu para salvar: " + error.message, 500);
    id = data.id;
  } else {
    await sb.from("appsara_personagens").update(upd).eq("id", id);
  }
  if (b.foto) {
    const bytes = decodificar(b.foto);
    const path = `personagens/${id}.jpg`;
    await salvar(path, bytes);
    let descricao = String(upd.descricao || "");
    try {
      const r = await perguntarJson([img(bytes), txt(
        `Describe this person for an AI video generator that must keep her identical in every video. ` +
        `Cover apparent age range, skin tone, face shape, hair (color, length, texture, style), eye color if visible, body type and height impression, makeup, and overall vibe. ` +
        `Do not describe the clothes. Do not guess identity or name. Reply only with JSON: {"descricao":"one dense English paragraph","resumo_pt":"uma frase em português"}`,
      )]);
      descricao = String(r.descricao || descricao);
      await gastar(C_TEXTO, "personagem");
    } catch (_) { /* a descrição é um extra; a foto já basta */ }
    await sb.from("appsara_personagens").update({ img_path: path, descricao: descricao || null }).eq("id", id);
  }
  return json({ id });
}

async function personagens() {
  const { data } = await sb.from("appsara_personagens").select("id,nome,publico,descricao,img_path")
    .eq("ativo", true).order("criado_em");
  const urls = await links((data || []).map((p) => p.img_path));
  return json({ personagens: (data || []).map((p) => ({ ...p, foto: urls[p.img_path] || null })) });
}

async function personagemExcluir(b: Record<string, unknown>) {
  await sb.from("appsara_personagens").update({ ativo: false }).eq("id", String(b.id || ""));
  return json({ ok: true });
}

// ---------------------------------------------------------------- Gerar

const FORMATOS = ["pov", "desfile", "misto"];

async function gerar(b: Record<string, unknown>) {
  const produto_id = String(b.produto_id || ""), personagem_id = String(b.personagem_id || "");
  const { data: p } = await sb.from("appsara_produtos").select("id,ficha,status").eq("id", produto_id).maybeSingle();
  if (!p || p.status !== "pronto") throw new Falha("Escolha um produto já analisado.");
  const { data: pe } = await sb.from("appsara_personagens").select("id").eq("id", personagem_id).eq("ativo", true).maybeSingle();
  if (!pe) throw new Falha("Escolha a personagem.");
  const qtd = Math.min(3, Math.max(1, parseInt(String(b.quantidade || 1), 10) || 1));
  const intima = String((p.ficha as Record<string, unknown>)?.categoria || "") === "roupa_intima";
  const pedido = String(b.formato || "auto");
  const segundos = Math.min(10, Math.max(5, parseInt(String(b.segundos || 8), 10) || 8));
  const resolucao = C_SEG[String(b.resolucao)] ? String(b.resolucao) : "720p";
  const roteiro = String(b.roteiro || "").trim().slice(0, 600) || null;

  const estimado = qtd * (C_TEXTO * 3 + C_FOTO * 1.5 + segundos * C_SEG[resolucao]);
  const gasto = await gastoHoje();
  if (gasto + estimado > TETO) {
    throw new Falha(`Esses vídeos custam cerca de US$ ${estimado.toFixed(2)} e hoje já foram US$ ${gasto.toFixed(2)} de US$ ${TETO.toFixed(2)}. Gere menos vídeos ou aumente o limite.`, 429);
  }

  const linhas = [];
  for (let i = 0; i < qtd; i++) {
    let formato = pedido === "auto" ? FORMATOS[i % 3] : (FORMATOS.includes(pedido) ? pedido : "pov");
    if (intima) formato = "pov";
    linhas.push({ produto_id, personagem_id, formato, roteiro, segundos, resolucao, variacao: i, etapa: "fila" });
  }
  const { data, error } = await sb.from("appsara_jobs").insert(linhas).select("id");
  if (error) throw new Falha("Não deu para criar os vídeos: " + error.message, 500);
  return json({ ids: (data || []).map((d) => d.id), estimado });
}

async function refazer(b: Record<string, unknown>) {
  const { data: j } = await sb.from("appsara_jobs").select("produto_id,personagem_id,formato,roteiro,segundos,resolucao,variacao")
    .eq("id", String(b.id || "")).maybeSingle();
  if (!j) throw new Falha("Vídeo não encontrado.", 404);
  const { data } = await sb.from("appsara_jobs").insert({ ...j, variacao: (j.variacao || 0) + 3, etapa: "fila" }).select("id").single();
  return json({ id: data?.id });
}

// ---------------------------------------------------------------- Etapas do vídeo

type Job = Record<string, any>;

const COMO_FORMATO: Record<string, string> = {
  pov: "First-person POV. The character's hand holds the product toward the camera at chest height; her face may appear softly in the background. For underwear or intimate items: product only in the hand, on a hanger or laid flat on the bed, never worn.",
  desfile: "Full-body shot, head to feet in frame. The character wears the product, walks a few slow steps toward the camera, stops, makes a soft quarter turn (max 45 degrees) and returns to front.",
  misto: "Starts close on the product's main detail, then the camera slowly pulls back to show the character wearing the whole piece, waist-up to full body.",
};

async function planejar(job: Job) {
  const { data: p } = await sb.from("appsara_produtos").select("nome,ficha,observacao").eq("id", job.produto_id).single();
  const { data: pe } = await sb.from("appsara_personagens").select("nome,descricao,publico").eq("id", job.personagem_id).single();
  const r = await perguntarJson([txt(
`You write production prompts for AI-generated TikTok Shop product videos (simple, realistic smartphone look, vertical 9:16).
The product must be reproduced EXACTLY as in the store photos: TikTok removes videos when the product differs (seams, bows, lace, size, number of pieces).

PRODUCT SHEET (from the store listing, Portuguese):
${JSON.stringify(p?.ficha || {})}
${p?.observacao ? `Seller's note: ${p.observacao}` : ""}

CHARACTER: ${pe?.descricao || "a friendly Brazilian woman"}
TARGET AUDIENCE (Portuguese): ${pe?.publico || "mulheres que compram roupa pelo TikTok Shop"}
FORMAT: ${job.formato}: ${COMO_FORMATO[job.formato] || COMO_FORMATO.pov}
DURATION: ${job.segundos} seconds. Variation number ${job.variacao}: pick a different everyday setting and camera idea for each variation.
${job.roteiro ? `SELLER'S SCRIPT OR IDEA (Portuguese, follow it): ${job.roteiro}` : "No script: no speech, soft ambient sound only."}
${job.notas ? `PREVIOUS ATTEMPT WAS REJECTED FOR THESE DIFFERENCES, fix them explicitly: ${job.notas}` : ""}

Write:
1. foto_prompt: an English prompt for an image model that receives the store photos and the character photo as references. It must create the opening frame: the character with the product in the chosen format and setting. Describe the product precisely from the sheet: color, material, every detail with position, seams, length, number of pieces, real-life scale, and list what it does NOT have. Say: copy the product exactly from the reference photos; no text, logos or watermarks.
2. video_prompt: an English prompt for a video model that receives the approved opening frame. Describe only simple, slow movement that keeps the product readable the whole time (no full spins, no fast motion, no cuts), repeat the product's key details and say they must not change size, shape, position or count in any frame. ${job.roteiro ? "If the script has a spoken line, the character says it in Brazilian Portuguese." : "No speech."}
3. legenda: a TikTok caption in Brazilian Portuguese, max 300 characters: a short hook with 1 or 2 emojis, a blank line, then 2 sentences about the product using only facts from the sheet (no promises, no invented fabric, size or price), then 3 relevant hashtags.

Reply only with JSON: {"foto_prompt":"","video_prompt":"","legenda":""}`,
  )]);
  await gastar(C_TEXTO, "planejar", job.id);
  return { plano: { foto_prompt: String(r.foto_prompt || ""), video_prompt: String(r.video_prompt || "") }, legenda: String(r.legenda || "") };
}

async function refsDoProduto(produto_id: string, max = 4) {
  const { data: p } = await sb.from("appsara_produtos").select("ref_paths").eq("id", produto_id).single();
  const out: Uint8Array[] = [];
  for (const path of (p?.ref_paths || []).slice(0, max)) out.push(await ler(path));
  return out;
}

async function gerarFoto(job: Job) {
  const prod = await refsDoProduto(job.produto_id, 4);
  const { data: pe } = await sb.from("appsara_personagens").select("img_path").eq("id", job.personagem_id).single();
  const rosto = pe?.img_path ? await ler(pe.img_path) : null;
  const intro = `The first ${prod.length} image(s) are the REAL product from the store: the only source of truth for the product.` +
    (rosto ? " The last image is the character: keep her face, hair and body identical." : "");
  const input: Parte[] = [...prod.map((x) => img(x)), ...(rosto ? [img(rosto)] : []), txt(intro + "\n\n" + (job.plano?.foto_prompt || ""))];
  let resp: Record<string, unknown>;
  try {
    resp = await gemini(M_FOTO, input, { response_format: { type: "image", aspect_ratio: "9:16", image_size: "1K" }, store: false });
  } catch (e) {
    // se a proporção 9:16 não for aceita, tenta sem ela
    if (e instanceof Falha && e.status === 502 && /aspect|ratio|invalid/i.test(e.message)) {
      resp = await gemini(M_FOTO, input, { response_format: { type: "image", image_size: "1K" }, store: false });
    } else throw e;
  }
  const out = partesDe(resp, "image").find((p) => p.data);
  if (!out) throw new Falha("O Google não devolveu a imagem da cena.", 502);
  const bytes = b64dec(String(out.data));
  const path = `jobs/${job.id}/cena-${job.tentativas_foto || 0}.jpg`;
  await salvar(path, bytes, String(out.mime_type || "image/png"));
  await gastar(C_FOTO, "foto", job.id);
  return path;
}

const PEDIDO_CONFERIR = (o: string, ficha: unknown) =>
`Você é a conferência de qualidade de uma loja do TikTok Shop. As primeiras imagens são as fotos REAIS do produto na loja. ${o}
Compare SÓ o produto (ignore cenário, pose e pessoa, exceto se a peça estiver sendo usada de um jeito que esconda ou mude o produto).
Seja rigoroso: o TikTok remove vídeos por diferenças pequenas. Confira cor, material, gola/decote, alças/mangas, comprimento, laços, rendas, recortes, costuras, estampa, botões, bolsos, proporção e tamanho em relação ao corpo, e número de peças.
Ficha do produto: ${JSON.stringify(ficha)}
Responda só com JSON: {"aprovado": true|false, "diferencas": ["cada diferença real, curta, em português"], "nota": 0-10}
Aprove só se não houver nenhuma diferença visível no produto.`;

async function conferirFoto(job: Job) {
  const prod = await refsDoProduto(job.produto_id, 4);
  const cena = await ler(job.foto_path);
  const { data: p } = await sb.from("appsara_produtos").select("ficha").eq("id", job.produto_id).single();
  const r = await perguntarJson([...prod.map((x) => img(x)), img(cena),
    txt(PEDIDO_CONFERIR(`A última imagem é a cena gerada por IA que deveria mostrar exatamente o mesmo produto.`, p?.ficha))]);
  await gastar(C_TEXTO, "conferir_foto", job.id);
  return { aprovado: r.aprovado === true, diferencas: (Array.isArray(r.diferencas) ? r.diferencas : []).map(String), nota: Number(r.nota || 0) };
}

async function criarVideo(job: Job) {
  const cena = await ler(job.foto_path);
  const prod = await refsDoProduto(job.produto_id, 2);
  const input: Parte[] = [img(cena), ...prod.map((x) => img(x)),
    txt(`The first image is the approved opening frame: start the video exactly on it. The next image(s) are the real product photos, use them only to keep the product identical.\n\n${job.plano?.video_prompt || ""}`)];
  const r = await fetch(`${API}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI, "Api-Revision": REVISAO },
    body: JSON.stringify({
      model: M_VIDEO, input,
      response_format: { type: "video", aspect_ratio: "9:16", duration: `${job.segundos}s`, resolution: job.resolucao, delivery: "uri" },
    }),
  });
  const resp = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 402) throw new Falha("O crédito do Google acabou. Recarregue em aistudio.google.com/billing.", 402);
    throw new Falha("Google recusou o vídeo: " + ((resp as any)?.error?.message || r.status), 502);
  }
  const s = JSON.stringify(resp);
  const m = s.match(/files\/([A-Za-z0-9_-]+)/);
  if (!m) throw new Falha("O Google respondeu sem o endereço do vídeo.", 502);
  await gastar(job.segundos * C_SEG[job.resolucao], "video", job.id);
  return m[1];
}

async function estadoVideo(file_id: string) {
  const r = await fetch(`${API}/files/${file_id}`, { headers: { "x-goog-api-key": GEMINI } });
  const f = await r.json().catch(() => ({})) as Record<string, any>;
  return { estado: String(f.state || (r.ok ? "" : "ERRO")), uri: String(f.uri || ""), mime: String(f.mimeType || "video/mp4"), erro: f?.error?.message };
}

async function conferirVideo(job: Job) {
  const prod = await refsDoProduto(job.produto_id, 3);
  const { data: p } = await sb.from("appsara_produtos").select("ficha").eq("id", job.produto_id).single();
  const pedido = txt(PEDIDO_CONFERIR(`Depois delas vem o VÍDEO gerado por IA. Confira o produto em todos os momentos do vídeo: ele não pode mudar de forma, tamanho, cor ou detalhe em nenhum quadro.`, p?.ficha));
  let r: Record<string, unknown>;
  try {
    r = await perguntarJson([...prod.map((x) => img(x)), { type: "video", uri: job.file_uri, mime_type: "video/mp4" }, pedido]);
  } catch (_) {
    // se o endereço do arquivo não for aceito, baixa o vídeo e manda junto
    const v = await fetch(`${API}/files/${job.file_id}:download?alt=media`, { headers: { "x-goog-api-key": GEMINI } });
    if (!v.ok) throw new Falha("Não deu para abrir o vídeo para conferir.", 502);
    const bytes = new Uint8Array(await v.arrayBuffer());
    r = await perguntarJson([...prod.map((x) => img(x)), { type: "video", data: b64enc(bytes), mime_type: "video/mp4" }, pedido]);
  }
  await gastar(C_TEXTO, "conferir_video", job.id);
  return { aprovado: r.aprovado === true, diferencas: (Array.isArray(r.diferencas) ? r.diferencas : []).map(String), nota: Number(r.nota || 0) };
}

async function passo(job: Job) {
  const upd: Record<string, unknown> = { atualizado_em: new Date().toISOString(), erro: null };
  const pago = job.etapa === "foto" || (job.etapa === "video" && !job.file_id);
  if (pago) {
    const custo = job.etapa === "foto" ? C_FOTO : job.segundos * C_SEG[job.resolucao];
    if ((await gastoHoje()) + custo > TETO) {
      upd.aviso = `Esperando: o limite de hoje (US$ ${TETO.toFixed(2)}) acabou. Continua amanhã.`;
      return upd;
    }
  }
  upd.aviso = null;
  switch (job.etapa) {
    case "fila": {
      const { plano, legenda } = await planejar(job);
      Object.assign(upd, { plano, legenda, etapa: "foto" });
      break;
    }
    case "foto": {
      upd.foto_path = await gerarFoto(job);
      upd.etapa = "conf_foto";
      break;
    }
    case "conf_foto": {
      const c = await conferirFoto(job);
      upd.conferencia_foto = c;
      if (c.aprovado) upd.etapa = "video";
      else {
        const t = (job.tentativas_foto || 0) + 1;
        upd.tentativas_foto = t;
        if (t >= MAX_FOTO) { upd.etapa = "reprovado"; upd.erro = "A cena não ficou igual ao produto depois de " + t + " tentativas."; }
        else { upd.notas = c.diferencas.join("; "); upd.etapa = "fila"; } // replaneja com as correções
      }
      break;
    }
    case "video": {
      if (!job.file_id) {
        upd.file_id = await criarVideo(job);
      } else {
        const e = await estadoVideo(job.file_id);
        if (e.estado === "ACTIVE") { upd.file_uri = e.uri; upd.etapa = "conf_video"; }
        else if (e.estado === "FAILED" || e.estado === "ERRO") {
          const t = (job.tentativas_video || 0) + 1;
          upd.tentativas_video = t; upd.file_id = null;
          if (t >= MAX_VIDEO) { upd.etapa = "erro"; upd.erro = e.erro || "O Google não conseguiu gerar o vídeo."; }
        }
      }
      break;
    }
    case "conf_video": {
      const c = await conferirVideo(job);
      upd.conferencia_video = c;
      if (c.aprovado) upd.etapa = "pronto";
      else {
        const t = (job.tentativas_video || 0) + 1;
        upd.tentativas_video = t;
        if (t >= MAX_VIDEO) { upd.etapa = "reprovado"; upd.erro = "O vídeo mudou o produto: " + c.diferencas.join("; "); }
        else { upd.file_id = null; upd.file_uri = null; upd.etapa = "video";
          upd.plano = { ...job.plano, video_prompt: (job.plano?.video_prompt || "") + "\n\nIMPORTANT, the previous video changed the product: " + c.diferencas.join("; ") + ". Keep the product exactly as in the opening frame." }; }
      }
      break;
    }
  }
  return upd;
}

const ATIVAS = ["fila", "foto", "conf_foto", "video", "conf_video"];

async function tick() {
  const inicio = Date.now();
  const agora = new Date().toISOString();
  const { data: jobs } = await sb.from("appsara_jobs").select("*").in("etapa", ATIVAS)
    .or(`lock_ate.is.null,lock_ate.lt.${agora}`).order("criado_em").limit(6);
  let feitos = 0;
  for (const job of jobs || []) {
    if (Date.now() - inicio > 100_000) break;
    const trava = new Date(Date.now() + 3 * 60_000).toISOString();
    const { data: meu } = await sb.from("appsara_jobs").update({ lock_ate: trava }).eq("id", job.id)
      .or(`lock_ate.is.null,lock_ate.lt.${new Date().toISOString()}`).select("id");
    if (!meu?.length) continue;
    try {
      const upd = await passo(job);
      upd.lock_ate = null;
      await sb.from("appsara_jobs").update(upd).eq("id", job.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const falhas = (job.falhas || 0) + 1;
      const fatal = (e instanceof Falha && e.status === 402) || falhas >= 4;
      await sb.from("appsara_jobs").update({
        falhas, erro: msg, lock_ate: null, atualizado_em: new Date().toISOString(),
        ...(fatal ? { etapa: "erro" } : {}),
      }).eq("id", job.id);
    }
    feitos++;
  }
  return feitos;
}

// ---------------------------------------------------------------- Lista e download

async function lista() {
  const { data } = await sb.from("appsara_jobs")
    .select("id,criado_em,etapa,formato,legenda,foto_path,file_id,conferencia_foto,conferencia_video,tentativas_foto,tentativas_video,erro,aviso,produto_id,personagem_id")
    .order("criado_em", { ascending: false }).limit(40);
  const jobs = data || [];
  const ids = (k: string) => [...new Set(jobs.map((j) => (j as Record<string, unknown>)[k]).filter(Boolean))];
  const { data: prods } = await sb.from("appsara_produtos").select("id,nome").in("id", ids("produto_id"));
  const { data: pers } = await sb.from("appsara_personagens").select("id,nome").in("id", ids("personagem_id"));
  const nomeP = Object.fromEntries((prods || []).map((p) => [p.id, p.nome]));
  const nomePe = Object.fromEntries((pers || []).map((p) => [p.id, p.nome]));
  const urls = await links(jobs.map((j) => j.foto_path));
  const { data: gastos } = await sb.from("appsara_gastos").select("job_id,valor").in("job_id", jobs.map((j) => j.id));
  const custo: Record<string, number> = {};
  for (const g of gastos || []) custo[g.job_id] = (custo[g.job_id] || 0) + Number(g.valor);
  return json({
    videos: jobs.map((j) => ({
      id: j.id, criado_em: j.criado_em, etapa: j.etapa, formato: j.formato, legenda: j.legenda,
      produto: nomeP[j.produto_id] || "", personagem: nomePe[j.personagem_id] || "",
      cena: urls[j.foto_path] || null, tem_video: !!j.file_id && (j.etapa === "pronto" || j.etapa === "reprovado" || j.etapa === "conf_video"),
      conferencia: j.conferencia_video || j.conferencia_foto || null,
      tentativas: (j.tentativas_foto || 0) + (j.tentativas_video || 0),
      erro: j.erro, aviso: j.aviso, custo: Math.round((custo[j.id] || 0) * 100) / 100,
    })),
    gasto_hoje: await gastoHoje(), teto: TETO,
  });
}

async function baixar(b: Record<string, unknown>) {
  const { data: j } = await sb.from("appsara_jobs").select("file_id").eq("id", String(b.id || "")).maybeSingle();
  if (!j?.file_id) throw new Falha("Vídeo ainda não está pronto.", 404);
  const r = await fetch(`${API}/files/${j.file_id}:download?alt=media`, { headers: { "x-goog-api-key": GEMINI } });
  if (!r.ok || !r.body) throw new Falha("O vídeo não está mais disponível no Google. Toque em Refazer.", 410);
  return new Response(r.body, { headers: { ...cors, "Content-Type": "video/mp4" } });
}

// ---------------------------------------------------------------- Entrada

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  if (!GEMINI || !SENHA) return json({ erro: "O servidor ainda não foi configurado (faltam a chave do Google e a senha do app)." }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch (_) { return json({ erro: "Pedido inválido." }, 400); }

  if (b.acao === "tick") {
    const trabalho = tick().catch((e) => console.error("tick", e));
    const er = (globalThis as any).EdgeRuntime;
    if (er?.waitUntil) { er.waitUntil(trabalho); return json({ ok: true }, 202); }
    return json({ feitos: await trabalho });
  }

  if (!igual(req.headers.get("x-app-senha") || "", SENHA)) return json({ erro: "Senha incorreta." }, 401);
  try {
    switch (b.acao) {
      case "entrar": return json({ ok: true, teto: TETO });
      case "analisar": return await analisar(b);
      case "refs": return await refs(b);
      case "corrigir": return await corrigir(b);
      case "produtos": return await produtos();
      case "personagens": return await personagens();
      case "personagem_salvar": return await personagemSalvar(b);
      case "personagem_excluir": return await personagemExcluir(b);
      case "gerar": return await gerar(b);
      case "refazer": return await refazer(b);
      case "lista": return await lista();
      case "baixar": return await baixar(b);
      default: return json({ erro: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    if (e instanceof Falha) return json({ erro: e.message }, e.status);
    return json({ erro: "Erro no servidor: " + (e instanceof Error ? e.message : String(e)) }, 500);
  }
});
