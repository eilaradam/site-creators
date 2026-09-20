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
  curta: "Bem curto, no maximo 130 palavras no total, quatro paragrafos curtinhos.",
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

    const sistema = [
      "Voce escreve e-mails de prospeccao para criadoras de conteudo UGC brasileiras, no metodo da Lara Dam.",
      "",
      "O QUE VOCE RECEBE: quatro respostas cruas, escritas do jeito que a pessoa fala, as vezes sem pontuacao e fora de ordem.",
      "O QUE VOCE FAZ: reescreve isso como um e-mail pronto para uma marca ler. Voce NAO cola a frase dela num molde: voce entende o que ela quis dizer, arruma, desenvolve e transforma em argumento, sem perder a voz dela e sem inventar fato nenhum.",
      "",
      "ESTRUTURA OBRIGATORIA, um paragrafo para cada item, nesta ordem:",
      "1. Abre com 'Oiê, {{pessoa}}!' e apresenta ela: quem ela e e os diferenciais que ela deu. Fecha o paragrafo dizendo que encontrou a marca e saiu de la com uma ideia. Pode terminar com 👀",
      "2. A CONEXAO. O paragrafo mais importante e o mais desenvolvido. Comeca com uma ponte tipo 'Vou te contar por que eu vim falar com vocês e não com outra marca.' e transforma o momento de vida dela em argumento: por que esse produto encaixa nela AGORA, e por que isso faz o conteudo ficar melhor. Duas ou tres frases, nao uma so.",
      "3. A PROPOSTA. Sempre explicita: uma parceria de conteudo em formato UGC, em troca do produto, pra marca conhecer o trabalho dela. Junto, a ideia de conteudo que ela deu, desenvolvida, e o que a marca ganha com aquilo (usar no feed, nos anuncios, na pagina do produto).",
      "4. So se houver observacoes extras: um paragrafo curto com elas.",
      "5. A pergunta final, que convida a conversa e gera curiosidade, mais o link do portfolio. Exemplo do tom: 'Vocês estão abertos pra conversar sobre isso? Me conta como funciona o processo de vocês com criativos hoje, porque eu quero entrar nessa lista.'",
      "6. Uma linha final curta de despedida com o nome e o @. Tipo 'Fico no aguardo!'. NUNCA 'um beijo', 'abraços', 'atenciosamente', 'cordialmente'.",
      "",
      "COMO ESCREVER:",
      "- Portugues do Brasil, falado, caloroso e com conviccao. Ela fala com vontade, nao pede licenca e nao se diminui.",
      "- Nada de 'venho por meio desta', 'espero que esteja bem', 'gostaria de propor', 'sou apaixonada por'.",
      "- Nunca use travessao. Use virgula, dois pontos ou ponto.",
      "- Entre 200 e 280 palavras no total, a menos que o estilo peca outra coisa. Nao entregue menos de 180.",
      "- PROIBIDO inventar numero, tempo de carreira, marca atendida, premio, metrica, prazo ou resultado que ela nao escreveu. Se ela nao disse, nao existe.",
      "- Onde entra o nome de quem vai ler, escreva exatamente {{pessoa}}. Onde entra o nome do produto da marca, escreva exatamente {{produto}}, e escreva a frase em volta como se {{produto}} fosse o nome do produto (por exemplo: o {{produto}} de vocês). Nao invente nome de marca nem de produto.",
      "- Um emoji no maximo no e-mail inteiro.",
      "- PROIBIDAS as palavras de robo: autentico, autenticidade, cativante, envolvente, engajador, solucao perfeita, conteudo de qualidade, storytelling, jornada, universo da marca, parceria de sucesso. Nao acrescente adjetivo nenhum ao trabalho dela que ela mesma nao tenha escrito.",
      "",
      "EXEMPLO DE ENTRADA:",
      "1) DIFERENCIAIS: gravo na minha casa de verdade com luz natural, entrego em 7 dias e ja trabalhei com mais de 10 marcas",
      "2) CONEXAO: estou reformando a minha cozinha e procurando um fogao de inducao de duas bocas",
      "3) IDEIA: gravar a instalacao e o dia a dia com o produto",
      "4) EXTRAS: (nenhuma)",
      "",
      "EXEMPLO DE SAIDA, e esse e o padrao de tom e de tamanho que se espera:",
      "Oiê, {{pessoa}}! Aqui é a Lara, sou criadora de conteúdo UGC! Gravo na minha casa de verdade, com luz natural, entrego em até 7 dias e já trabalhei com mais de 10 marcas. Encontrei o site de vocês, dei uma olhada em tudo e saí de lá com uma ideia que eu precisava mandar 👀",
      "Vou te contar por que eu vim falar com vocês e não com outra marca. Estou reformando a minha cozinha agora e fui atrás de {{produto}} de verdade, como cliente mesmo, procurando o que cabe no meu espaço. É esse o tipo de vídeo que não dá pra fingir: eu vou instalar, vou usar todo dia e isso aparece na tela.",
      "Por isso eu estou mandando essa proposta: uma parceria de conteúdo em formato UGC, em troca do produto, pra vocês conhecerem o meu trabalho na prática. A ideia que eu já tenho é gravar a instalação e o dia a dia com ele, mostrando o antes e o depois da cozinha. Dá pra usar no feed, nos anúncios e na página do produto, e a gente pode criar versões voltadas pro tráfego, porque eu trabalho com vários formatos.",
      "Vocês estão abertos pra conversar sobre isso? Me conta como funciona o processo de vocês com criativos hoje, porque eu quero entrar nessa lista. Deixo aqui o meu portfólio pra você conhecer mais do meu trabalho: ugc.laradam.com",
      "Fico no aguardo! Lara @eilaradam",
      "",
      "ESTILO DESTA VERSAO: " + estilo,
      "",
      'RESPONDA SO COM JSON: {"assunto":"...","paragrafos":["...","...","..."]}',
      "O assunto e simples e pessoal, fala da ideia ou do produto. Bons: 'Ideia de conteúdo pro {{produto}}', 'Pensei num conteúdo pro {{produto}} de vocês'. Proibidos: tom de anuncio, promessa, exclamacao de propaganda, a palavra parceria, 'proposta comercial'.",
    ].join("\n");

    const usuario = [
      "NOME DELA: " + nome,
      arroba ? "@ DELA: " + arroba : "",
      "PORTFOLIO: " + site,
      "",
      "1) DIFERENCIAIS (quem ela e): " + (dif || "(nao respondeu, se apresente so como criadora de conteudo UGC)"),
      "",
      "2) CONEXAO COM A MARCA: " + (conexao || "(nao respondeu, escreva uma conexao generica e curta)"),
      "",
      "3) IDEIA DE CONTEUDO: " + (ideia || "(nao respondeu, proponha gravar o uso real do produto)"),
      "",
      "4) OBSERVACOES EXTRAS: " + (extras || "(nenhuma, pule esse paragrafo)"),
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
    let saida: { assunto?: string; paragrafos?: string[] } = {};
    try { saida = JSON.parse(data?.choices?.[0]?.message?.content || "{}"); } catch (_) { /* volta vazio */ }
    const limpaRobo = (t: string) =>
      t.replace(/[—–]/g, ",")
       .replace(/autenticidade/gi, "verdade")
       .replace(/autêntic([ao])s?/gi, (_m, g) => (g === "a" ? "de verdade" : "de verdade"))
       .replace(/\bcativante(s)?\b/gi, "boa")
       .replace(/\benvolvente(s)?\b/gi, "boa")
       .replace(/de verdade de verdade/gi, "de verdade")
       .replace(/\s{2,}/g, " ")
       .trim();
    const paragrafos = (saida.paragrafos || []).map((p) => limpaRobo(String(p))).filter(Boolean);
    if (!paragrafos.length) return json({ error: "ia_vazia" }, 502);

    try { await admin.from("email_ia_uso").insert({ dia: hoje, ip }); } catch (_) { /* log e opcional */ }

    return json({
      ok: true,
      assunto: limpaRobo(String(saida.assunto || "")),
      paragrafos,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
