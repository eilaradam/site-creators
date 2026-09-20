// Escreve o e-mail de prospeccao da aluna a partir das 4 respostas dela.
//
// A pagina eilaradam.github.io/admin-imersao/email manda o que a aluna escreveu
// cru, do jeito que ela falaria, e aqui a IA REESCREVE dentro da estrutura da
// aula: 1 quem ela e + diferenciais, 2 a conexao, 3 a ideia/proposta, 4 a
// pergunta + portfolio. Nao e colar o texto dela num molde: e adaptar.
//
// Publica de proposito (aluna nao tem login), entao a protecao e: palavra da
// aula no corpo + teto de uso por IP e por dia, gravado em email_ia_uso.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const PALAVRAS = ["imersao", "imersao2", "turma2"];
const LIMITE_IP = 40;      // por IP por dia
const LIMITE_DIA = 700;    // total por dia, pra chave nao virar torneira aberta
const MAX_CAMPO = 1200;    // caracteres por resposta

const ESTILOS: Record<string, string> = {
  direta: "Direto ao ponto: apresentacao, conexao, proposta, pergunta. O mais parecido com o modelo da aula.",
  ideia: "Comeca pela ideia de conteudo, que e o gancho, e so depois se apresenta.",
  resultado: "Fala a lingua de quem compra midia: conteudo que parece feito por cliente, teste de criativo, uso em anuncio. Sem inventar numero.",
  curta: "Versao enxuta: mantem a estrutura mas corta o paragrafo da janela e encurta tudo, no maximo 170 palavras, ainda com o P.S. no fim.",
};

function limpar(t: unknown): string {
  return String(t ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_CAMPO);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    if (!OPENAI_KEY) return json({ error: "sem_chave" }, 503);
    const corpo = await req.json().catch(() => ({}));

    const palavra = String(corpo.palavra || "").toLowerCase().replace(/\s+/g, "");
    if (!PALAVRAS.includes(palavra)) return json({ error: "sem_palavra" }, 401);

    const dif = limpar(corpo.dif);
    const conexao = limpar(corpo.conexao);
    const ideia = limpar(corpo.ideia);
    const extras = limpar(corpo.extras);
    if (!dif && !conexao && !ideia) return json({ error: "vazio" }, 400);

    const nome = limpar(corpo.nome) || "{{nome}}";
    const arroba = limpar(corpo.arroba);
    const site = limpar(corpo.site) || "{{site}}";
    const cidade = limpar(corpo.cidade);
    const estilo = ESTILOS[String(corpo.estilo || "direta")] || ESTILOS.direta;

    // teto de uso
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
    const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // dia em Sao Paulo
    try {
      const { count: doDia } = await admin.from("email_ia_uso").select("id", { count: "exact", head: true }).eq("dia", hoje);
      if ((doDia || 0) >= LIMITE_DIA) return json({ error: "limite_dia" }, 429);
      const { count: doIp } = await admin.from("email_ia_uso").select("id", { count: "exact", head: true }).eq("dia", hoje).eq("ip", ip);
      if ((doIp || 0) >= LIMITE_IP) return json({ error: "limite_ip" }, 429);
    } catch (_) { /* se a tabela nao existir, segue */ }

    // A estrutura e garantida por codigo: a IA escreve UMA parte por campo, e a
    // gente monta na ordem. Pedindo "paragrafos" soltos ela achatava o modelo e
    // comia o {{detalhe}} e o {{link}}, que sao justamente o que a aluna troca
    // a cada marca.
    const sistema = [
      "Voce escreve e-mails de prospeccao para criadoras de conteudo UGC brasileiras, no metodo da Lara Dam.",
      "",
      "Voce recebe respostas cruas, escritas do jeito que a pessoa fala, as vezes sem pontuacao e fora de ordem.",
      "Voce reescreve isso como e-mail pronto pra marca ler: entende o que ela quis dizer, arruma, desenvolve e transforma em argumento, sem perder a voz dela e sem inventar fato nenhum.",
      "",
      "RESPONDA SO COM JSON, com exatamente estas chaves:",
      '{"assunto":"","apresentacao":"","motivo":"","ideia":"","credenciais":"","janela":"","ps":""}',
      "",
      "O QUE VAI EM CADA CHAVE:",
      "assunto: simples e pessoal, fala da ideia ou do produto. Bom: Ideia de conteúdo pro {{produto}} de vocês. Proibido: tom de anuncio, promessa, a palavra parceria, proposta comercial.",
      "apresentacao: quem ela e, de onde ela e e o @ dela, em uma frase. NAO cite aqui tempo de estrada, quantidade de marcas nem prazo: isso vai no campo credenciais, e repetir fica feio. Depois, OBRIGATORIAMENTE, como ela chegou na marca, nesta forma: Cheguei em vocês procurando {{produto}} e acabei ficando um tempão no site, principalmente em {{detalhe}}. Pode variar as palavras, mas {{produto}} e {{detalhe}} tem que aparecer.",
      "motivo: por que ela esta mandando AGORA. O contexto real da vida dela que explica o desejo por esse produto neste momento, e o produto especifico com o link, OBRIGATORIAMENTE com o marcador {{link}} escrito (exemplo: é esse aqui ó: {{link}}). Fecha lembrando que isso nao e assunto inventado pra fazer conteudo, e o que esta acontecendo na vida dela agora.",
      "ideia: a ideia de conteudo em TRES MOMENTOS concretos, tirados do que ela escreveu (por exemplo a chegada, o uso real, o resultado ou o antes e depois). Diz no que isso vira em arquivo pra marca: video vertical e fotos pra usar como UGC e em trafego pago. Termina dizendo que ela documenta o processo no perfil dela, marcando a marca e com link nos stories.",
      "credenciais: uma frase curta so com o que ela deu: tempo de estrada, quantas marcas, como grava, prazo de entrega. Se ela nao deu nada disso, devolva string vazia.",
      "janela: SO se ela citou data, evento ou prazo. Um trecho curto e transparente sobre a janela ser curta, ate quando precisaria da confirmacao pro produto dar tempo de chegar, e que se nao rolar e so avisar que se pensa em outra coisa. Se ela nao citou data nenhuma, devolva string vazia.",
      "ps: sempre este, com as palavras dela: independente dessa collab, me conta como funciona o processo de vocês com criativos hoje? Se tiverem uma lista de creators, quero entrar nela.",
      "",
      "COMO ESCREVER:",
      "- Portugues do Brasil falado, caloroso, com conviccao. Ela fala com vontade, nao pede licenca e nao se diminui.",
      "- Nada de 'venho por meio desta', 'espero que esteja bem', 'gostaria de propor', 'sou apaixonada por'.",
      "- Nunca use travessao. Use virgula, dois pontos ou ponto.",
      "- Cada campo tem de uma a quatro frases. O e-mail inteiro fica entre 230 e 330 palavras.",
      "- PROIBIDO inventar numero, tempo de carreira, marca atendida, premio, metrica, prazo, data ou resultado que ela nao escreveu. Se ela nao disse, escreva a frase sem aquilo.",
      "- PROIBIDAS as palavras de robo: autentico, cativante, envolvente, engajador, solucao perfeita, conteudo de qualidade, storytelling, jornada, universo da marca, parceria de sucesso.",
      "- Um emoji no maximo no e-mail inteiro.",
      "- MARCADORES: use so {{pessoa}}, {{produto}}, {{detalhe}}, {{link}} e {{data}}. {{detalhe}} e {{link}} nunca vem nas respostas dela, entao vao sempre escritos assim mesmo, porque e o que ela troca a cada marca. Fora esses cinco, nunca deixe colchete nem lacuna.",
      "",
      "ESTILO DESTA VERSAO: " + estilo,
    ].join("\n");

    const usuario = [
      "NOME DELA: " + nome,
      arroba ? "@ DELA: " + arroba : "",
      "PORTFOLIO: " + site,
      cidade ? "CIDADE DELA: " + cidade : "CIDADE: (nao informou, nao cite cidade nenhuma)",
      "",
      "1) DIFERENCIAIS (quem ela e): " + (dif || "(nao respondeu, se apresente so como criadora de conteudo UGC)"),
      "",
      "2) CONEXAO COM A MARCA: " + (conexao || "(nao respondeu, escreva um motivo curto e honesto)"),
      "",
      "3) IDEIA DE CONTEUDO: " + (ideia || "(nao respondeu, proponha gravar o uso real do produto em tres momentos)"),
      "",
      "4) OBSERVACOES EXTRAS: " + (extras || "(nenhuma)"),
    ].filter(Boolean).join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: String(corpo.modelo || "gpt-4o"),
        response_format: { type: "json_object" },
        temperature: 0.85,
        max_tokens: 900,
        messages: [
          { role: "system", content: sistema },
          { role: "user", content: usuario },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("openai", res.status, t.slice(0, 400));
      return json({ error: "ia_falhou", status: res.status }, 502);
    }
    const data = await res.json();
    let o: Record<string, string> = {};
    try { o = JSON.parse(data?.choices?.[0]?.message?.content || "{}"); } catch (_) { /* vazio */ }

    const limpaRobo = (t: string) =>
      String(t || "")
        .replace(/[—–]/g, ",")
        .replace(/autenticidade/gi, "verdade")
        .replace(/autêntic([ao])s?/gi, "de verdade")
        .replace(/\bcativante(s)?\b/gi, "boa")
        .replace(/\benvolvente(s)?\b/gi, "boa")
        .replace(/solu[çc][ãa]o perfeita/gi, "o que resolve")
        .replace(/\bengajador(a|es|as)?\b/gi, "que funciona")
        .replace(/de verdade de verdade/gi, "de verdade")
        .replace(/\s{2,}/g, " ")
        .trim();

    let apresentacao = limpaRobo(o.apresentacao);
    let motivo = limpaRobo(o.motivo);
    const pIdeia = limpaRobo(o.ideia);
    const pCred = limpaRobo(o.credenciais);
    const pJanela = limpaRobo(o.janela);
    const ps = limpaRobo(o.ps) ||
      "P.S.: independente dessa collab, me conta como funciona o processo de vocês com criativos hoje? Se tiverem uma lista de creators, quero entrar nela.";

    if (!apresentacao && !motivo && !pIdeia) return json({ error: "ia_vazia" }, 502);

    // o esqueleto e garantido aqui, nao no humor do modelo
    if (!apresentacao.includes("{{detalhe}}")) {
      apresentacao += " Cheguei em vocês procurando {{produto}} e acabei ficando um tempão no site, principalmente em {{detalhe}}.";
    }
    if (!motivo.includes("{{link}}")) {
      motivo += " É esse aqui ó: {{link}}.";
    }
    const assinatura = "Fico no aguardo! " + (nome !== "{{nome}}" ? nome : "{{nome}}") + (arroba ? " " + arroba : "");
    const fecho = "Se fizer sentido, vai ser incrível ter vocês nesse projeto :) Portfólio: " + site;

    const paragrafos = [
      "Oieee {{pessoa}}, tudo bem?",
      apresentacao,
      motivo,
      pIdeia,
      pCred,
      pJanela,
      fecho,
      assinatura,
      ps.startsWith("P.S") ? ps : "P.S.: " + ps,
    ].filter(Boolean);

    try { await admin.from("email_ia_uso").insert({ dia: hoje, ip }); } catch (_) { /* log e opcional */ }

    return json({
      ok: true,
      assunto: limpaRobo(o.assunto) || "Ideia de conteúdo pro {{produto}} de vocês",
      paragrafos,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
