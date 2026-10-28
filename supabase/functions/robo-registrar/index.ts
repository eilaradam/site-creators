// Recebe do robo (Mac da Lara) as inscricoes feitas no Seu Influencer e o placar das campanhas.
// Sem JWT, protegida por token compartilhado (ROBO_AVISO_TOKEN). So grava na tabela robo_inscricoes.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN = Deno.env.get("ROBO_AVISO_TOKEN")!;
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// "ultima" do site vem como "17:52" (hoje) ou "11:02 - 21/10". Na etapa "1 - Aprovado" a ultima atividade e a aprovacao.
function dataDaUltima(ultima: string | null): string | null {
  const hojeSP = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  if (!ultima) return null;
  const m = ultima.match(/(\d{2})\/(\d{2})/);
  if (!m) return /^\d{1,2}:\d{2}$/.test(ultima.trim()) ? hojeSP : null;
  let ano = +hojeSP.slice(0, 4);
  const d = `${ano}-${m[2]}-${m[1]}`;
  if (d > hojeSP) ano--; // 30/12 visto em janeiro e do ano passado
  return `${ano}-${m[2]}-${m[1]}`;
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("método não permitido", { status: 405 });
  if (!TOKEN || req.headers.get("x-robo-token") !== TOKEN) return new Response("não autorizado", { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "inscricao" && body.linha?.camp_id) {
    const l = body.linha;
    // nao sobrescreve status/etapa que ja foram descobertos
    const { data: ja } = await sb.from("robo_inscricoes").select("camp_id").eq("camp_id", l.camp_id).maybeSingle();
    const { error } = ja
      ? await sb.from("robo_inscricoes").update({ titulo: l.titulo, link: l.link }).eq("camp_id", l.camp_id)
      : await sb.from("robo_inscricoes").insert(l);
    return new Response(JSON.stringify({ ok: !error, error: error?.message }), { status: error ? 500 : 200 });
  }

  if (body.action === "sync" && Array.isArray(body.itens)) {
    // itens: [{camp_id, inscritos, aprovados, status, etapa}] -> atualiza placar e status
    let n = 0;
    for (const i of body.itens) {
      const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
      if (i.inscritos != null) patch.inscritos_agora = i.inscritos;
      if (i.aprovados != null) patch.aprovados_agora = i.aprovados;
      if (i.status) { patch.status = i.status; patch.status_em = new Date().toISOString(); }
      if (i.etapa !== undefined) patch.etapa = i.etapa;
      if (i.foto) patch.foto = i.foto;
      const { error } = await sb.from("robo_inscricoes").update(patch).eq("camp_id", i.camp_id);
      if (!error) n++;
    }
    return new Response(JSON.stringify({ ok: true, atualizadas: n }));
  }
  if (body.action === "aprovadas" && Array.isArray(body.itens)) {
    // itens: [{chave, titulo, etapa, ultima, ordem}] da lista "Inscricoes" (so aprovadas) do site. Mantem valor/obs da Lara.
    const { data: todas } = await sb.from("robo_aprovadas").select("chave");
    const chaves = (todas || []).map((r: { chave: string }) => r.chave);
    await sb.from("robo_aprovadas").update({ ordem: null }).not("ordem", "is", null);
    let n = 0;
    for (const i of body.itens) {
      const ja = chaves.find((c: string) => c.startsWith(i.chave) || i.chave.startsWith(c));
      const { error } = ja
        ? await sb.from("robo_aprovadas").update({ etapa: i.etapa, ultima: i.ultima, ordem: i.ordem, ...(i.foto ? { foto: i.foto } : {}), atualizado_em: new Date().toISOString() }).eq("chave", ja)
        : await sb.from("robo_aprovadas").insert({ chave: i.chave, titulo: i.titulo, marca: i.titulo.includes(" - ") ? i.titulo.split(" - ").pop() : null, etapa: i.etapa, ultima: i.ultima, ordem: i.ordem, foto: i.foto ?? null });
      // so grava a data de aprovacao uma vez, e so quando da pra saber (etapa 1); a Lara corrige no painel se precisar
      if (!error && /^1\b/.test(i.etapa || "")) {
        const data = dataDaUltima(i.ultima);
        if (data) await sb.from("robo_aprovadas").update({ aprovada_em: data }).eq("chave", ja || i.chave).is("aprovada_em", null);
      }
      if (!error) n++;
    }
    return new Response(JSON.stringify({ ok: true, atualizadas: n }));
  }
  return new Response("ação inválida", { status: 400 });
});
