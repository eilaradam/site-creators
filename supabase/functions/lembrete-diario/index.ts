// Lembrete diario da aba "Meu dia" do admin (creators.laradam.com/admin.html).
// Le a linha 'lara' de agenda_notas (JSON com desafios, rotina e config do lembrete),
// monta o e-mail do dia (tarefa de cada desafio ativo + rotina) e envia via Resend.
//
// Chamado de dois jeitos:
//  1. pg_cron, a cada 15 min, com header x-sched-key == LEMBRETE_KEY. So envia se
//     ja passou da hora configurada e se ainda nao enviou hoje.
//  2. pelo proprio admin logado (JWT de admin) com body {teste:true}, pra ver o e-mail
//     na hora sem mexer no controle de "ja enviei hoje".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sched-key",
};
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const LEMBRETE_KEY = Deno.env.get("LEMBRETE_KEY")!;
const FROM = "Lara Dam <contato@ugcmanager.com.br>";
const ADMIN_URL = "https://creators.laradam.com/admin.html";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const pad = (n: number) => String(n).padStart(2, "0");
/* Brasil nao tem mais horario de verao, entao UTC-3 fixo resolve */
function agoraBRT() {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return {
    data: d.toISOString().slice(0, 10),
    hm: d.toISOString().slice(11, 16),
    diaSemana: d.getUTCDay(),
  };
}
function somaDias(ds: string, n: number) {
  const d = new Date(ds + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function difDias(a: string, b: string) {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}
function esc(s: unknown) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

type Desafio = {
  id: string; icone?: string; nome: string; objetivo?: string; tarefa?: string;
  minutos?: number; dias?: number; inicio: string; premio?: string;
  extras?: Record<string, string>; feitos?: Record<string, unknown>; status?: string;
};

function montarDia(estado: any, hoje: string) {
  const desafios: Desafio[] = Array.isArray(estado.desafios) ? estado.desafios : [];
  const ativos = desafios.filter((d) => {
    if (!d.inicio || d.status === "arquivado") return false;
    const fim = somaDias(d.inicio, (Number(d.dias) || 1) - 1);
    return hoje >= d.inicio && hoje <= fim;
  });
  const tarefas = ativos.map((d) => {
    const n = difDias(d.inicio, hoje) + 1;
    const extra = (d.extras || {})[String(n)] || null;
    return {
      icone: d.icone || "*",
      texto: d.tarefa || "Fazer o combinado",
      nome: d.nome,
      minutos: Number(d.minutos) || 15,
      dia: n,
      total: Number(d.dias) || 1,
      extra,
      feito: !!(d.feitos || {})[hoje],
    };
  });
  const rotina = (Array.isArray(estado.rotina) ? estado.rotina : [])
    .slice()
    .sort((a: any, b: any) => String(a.hora).localeCompare(String(b.hora)));
  /* sequencia: maior streak entre os desafios */
  let melhorStreak = 0;
  for (const d of desafios) {
    let cursor = (d.feitos || {})[hoje] ? hoje : somaDias(hoje, -1);
    let n = 0;
    while (cursor >= d.inicio && (d.feitos || {})[cursor]) { n++; cursor = somaDias(cursor, -1); }
    if (n > melhorStreak) melhorStreak = n;
  }
  /* ontem ficou em branco em algum desafio que ja tinha comecado? */
  const ontem = somaDias(hoje, -1);
  const furouOntem = desafios.filter((d) => {
    const fim = somaDias(d.inicio, (Number(d.dias) || 1) - 1);
    return ontem >= d.inicio && ontem <= fim && !(d.feitos || {})[ontem];
  }).length;
  return { tarefas, rotina, melhorStreak, furouOntem };
}

function montarHtml(hoje: string, dia: ReturnType<typeof montarDia>) {
  const d = new Date(hoje + "T12:00:00Z");
  const dataTxt = SEMANA[d.getUTCDay()] + ", " + d.getUTCDate() + " de " + MESES[d.getUTCMonth()];
  const minutos = dia.tarefas.filter((t) => !t.feito).reduce((a, t) => a + t.minutos, 0);

  const linhas = dia.tarefas.map((t) =>
    `<tr><td style="padding:11px 14px;border:1px solid #ECE6DF;border-radius:10px;background:#FFFFFF;">
      <div style="font:700 15px/1.4 Helvetica,Arial,sans-serif;color:#211D1A;">${esc(t.icone)} ${esc(t.texto)}</div>
      <div style="font:600 12px/1.5 Helvetica,Arial,sans-serif;color:#A69D93;margin-top:5px;">
        ${t.minutos} min &middot; ${esc(t.nome)} &middot; dia ${t.dia} de ${t.total}${t.extra ? " &middot; hoje tem extra: " + esc(t.extra) : ""}
      </div>
    </td></tr><tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>`
  ).join("");

  const rot = dia.rotina.map((r: any) =>
    `<tr>
      <td style="font:700 13px/1.6 Helvetica,Arial,sans-serif;color:#C8441A;width:56px;vertical-align:top;">${esc(r.hora)}</td>
      <td style="font:500 13px/1.6 Helvetica,Arial,sans-serif;color:#4A433D;">${esc(r.titulo)}</td>
    </tr>`
  ).join("");

  let abertura;
  if (!dia.tarefas.length) abertura = "Hoje não tem desafio rodando. Que tal começar um?";
  else if (dia.melhorStreak >= 3) abertura = `Você está em ${dia.melhorStreak} dias seguidos. Hoje são ${minutos} minutos pra manter isso de pé.`;
  else if (dia.furouOntem > 0) abertura = `Ontem ficou em branco, e tudo bem. Hoje são ${minutos} minutos pra retomar.`;
  else abertura = `Hoje são ${minutos} minutos no total. Dá pra fazer antes do almoço.`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seu dia</title></head><body style="margin:0;padding:0;background:#FBF8F4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F4;padding:26px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td style="font:800 19px/1 Helvetica,Arial,sans-serif;color:#211D1A;padding-bottom:20px;">lara<span style="color:#C8441A;">.</span>dam</td></tr>
  <tr><td style="background:#2A2320;border-radius:16px;padding:22px;">
    <div style="font:700 11px/1 Helvetica,Arial,sans-serif;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.8px;">${esc(dataTxt)}</div>
    <div style="font:800 23px/1.25 Helvetica,Arial,sans-serif;color:#FFFFFF;margin-top:8px;">Bom dia, Lara</div>
    <div style="font:500 14px/1.55 Helvetica,Arial,sans-serif;color:rgba(255,255,255,.72);margin-top:8px;">${esc(abertura)}</div>
  </td></tr>
  <tr><td style="height:22px;line-height:22px;">&nbsp;</td></tr>
  ${dia.tarefas.length ? `<tr><td style="font:700 11px/1 Helvetica,Arial,sans-serif;color:#A69D93;text-transform:uppercase;letter-spacing:.8px;padding-bottom:12px;">O que precisa acontecer hoje</td></tr>
  <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table></td></tr>` : ""}
  ${dia.rotina.length ? `<tr><td style="height:12px;line-height:12px;">&nbsp;</td></tr>
  <tr><td style="font:700 11px/1 Helvetica,Arial,sans-serif;color:#A69D93;text-transform:uppercase;letter-spacing:.8px;padding-bottom:10px;">Sua rotina</td></tr>
  <tr><td style="background:#FFFFFF;border:1px solid #ECE6DF;border-radius:12px;padding:14px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rot}</table>
  </td></tr>` : ""}
  <tr><td style="height:22px;line-height:22px;">&nbsp;</td></tr>
  <tr><td align="center">
    <a href="${ADMIN_URL}" style="display:inline-block;background:#C8441A;color:#FFFFFF;font:700 15px/1 Helvetica,Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:12px;">Abrir meu dia</a>
  </td></tr>
  <tr><td style="height:20px;line-height:20px;">&nbsp;</td></tr>
  <tr><td style="font:500 12px/1.6 Helvetica,Arial,sans-serif;color:#A69D93;text-align:center;">
    Você recebe isso porque ligou o lembrete diário no seu painel.<br>Pra desligar, é só desmarcar lá na aba Meu dia.
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const teste = !!body.teste;
    const viaCron = (req.headers.get("x-sched-key") || "") === LEMBRETE_KEY && !!LEMBRETE_KEY;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    /* quem nao vem do cron precisa ser a admin logada */
    if (!viaCron) {
      const auth = req.headers.get("Authorization") || "";
      if (!auth) return json({ error: "unauthorized" }, 401);
      const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: u } = await user.auth.getUser();
      if (!u || !u.user) return json({ error: "unauthorized" }, 401);
      const { data: perfil } = await admin.from("usuarios").select("role").eq("id", u.user.id).maybeSingle();
      if (!perfil || perfil.role !== "admin") return json({ error: "forbidden" }, 403);
    }

    const { data: row, error } = await admin.from("agenda_notas").select("conteudo").eq("id", "lara").maybeSingle();
    if (error) throw error;
    let estado: any = {};
    try { estado = typeof row?.conteudo === "string" ? JSON.parse(row.conteudo) : (row?.conteudo || {}); } catch { estado = {}; }

    const lem = estado.lembrete || {};
    const { data: hoje, hm } = agoraBRT();
    const destino = String(lem.email || "").trim();

    /* o controle de "ja enviei hoje" mora numa linha SEPARADA de propriedade da
       function: o painel salva o agendaState inteiro em cima da linha 'lara' de
       tempos em tempos e sobrescreveria esse campo, gerando e-mail repetido. */
    const { data: ctlRow } = await admin.from("agenda_notas").select("conteudo").eq("id", "lembrete_ctl").maybeSingle();
    let ctl: any = {};
    try { ctl = typeof ctlRow?.conteudo === "string" ? JSON.parse(ctlRow.conteudo) : (ctlRow?.conteudo || {}); } catch { ctl = {}; }

    if (!teste) {
      if (!lem.ativo) return json({ ok: true, enviado: false, motivo: "lembrete desligado" });
      if (!destino.includes("@")) return json({ ok: true, enviado: false, motivo: "sem e-mail configurado" });
      if (hm < String(lem.hora || "06:30")) return json({ ok: true, enviado: false, motivo: "ainda nao deu a hora", hm });
      if (String(ctl.ultimoEnvio || "").slice(0, 10) === hoje) return json({ ok: true, enviado: false, motivo: "ja enviei hoje" });
    }
    /* no teste o e-mail vem do proprio painel: o autosave dele tem debounce, entao o
       banco ainda pode estar com o endereco antigo quando ela clica em "enviar teste" */
    const doBody = String(body.email || "").trim();
    const para = (teste && doBody.includes("@")) ? doBody
      : (destino.includes("@") ? destino : "laradam.ugc@gmail.com");

    const dia = montarDia(estado, hoje);
    const pendentes = dia.tarefas.filter((t) => !t.feito).length;
    const assunto = pendentes
      ? `Seu dia: ${pendentes} ${pendentes === 1 ? "coisa" : "coisas"}, ${dia.tarefas.filter((t) => !t.feito).reduce((a, t) => a + t.minutos, 0)} minutos`
      : "Seu dia começa agora";

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [para], subject: assunto, html: montarHtml(hoje, dia) }),
    });
    const resultado = await resp.json().catch(() => ({}));
    if (!resp.ok) return json({ ok: false, erro: resultado }, 502);

    if (!teste) {
      await admin.from("agenda_notas").upsert({
        id: "lembrete_ctl",
        conteudo: JSON.stringify(Object.assign({}, ctl, { ultimoEnvio: hoje, para })),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }
    return json({ ok: true, enviado: true, para, assunto, tarefas: dia.tarefas.length, teste });
  } catch (e) {
    return json({ ok: false, erro: String((e as Error)?.message || e) }, 500);
  }
});
