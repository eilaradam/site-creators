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
    const detalhe = limpar(corpo.detalhe);
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
      "Voce recebe respostas cruas, escritas do jeito que a pessoa fala, as vezes sem pontuacao, emendadas por virgula e fora de ordem.",
      "Seu trabalho e REESCREVER e REDISTRIBUIR: quebrar em frases, arrumar a ordem, tirar o que repete e transformar em argumento. NUNCA cole a frase dela inteira dentro de uma frase sua. Se a resposta dela vier emendada por virgula, separe em frases.",
      "",
      "RESPONDA SO COM JSON, com exatamente estas chaves:",
      '{"assunto":"","apresentacao":"","motivo":"","ideia":"","credenciais":"","fecho_extra":"","ps":""}',
      "",
      "O QUE VAI EM CADA CHAVE:",
      "assunto: especifico, com cara de pessoa escrevendo pra pessoa, e se possivel citando o produto e o contexto dela. Exemplo bom: proposta de conteudo, {{produto}} na minha cozinha nova. Proibido: tom de anuncio, promessa, a palavra parceria, proposta comercial, ponto de exclamacao de propaganda.",
      "apresentacao: uma frase com quem ela e, de onde ela e e o @ dela. Depois, como ela chegou na marca, usando O QUE ELA VIU NO SITE (item 5 das respostas). Forma: Cheguei em voces pesquisando {{produto}} e acabei ficando um tempao no site, principalmente <o que ela viu>. Se o item 5 vier vazio, escreva o marcador {{detalhe}} nesse lugar. NAO cite aqui tempo de estrada, numero de marcas nem prazo: isso vai em credenciais.",
      "motivo: o contexto real da vida dela, reescrito em frases curtas, mostrando por que esse produto encaixa agora. Inclui o link do produto com o marcador {{link}}. Fecha com a ideia de que isso esta acontecendo de verdade, nao e assunto inventado pra fazer conteudo.",
      "ideia: a ideia de conteudo dela em TRES MOMENTOS concretos, tirados do que ela escreveu, com o detalhe sensorial que ela deu. Depois, no que isso vira em arquivo pra marca (video vertical e fotos pra usar como UGC, inclusive em trafego pago) e que ela documenta o processo no perfil dela, marcando a marca, com link nos stories. Diga isso UMA vez so: nao repita trafego, ads ou UGC em frases seguidas.",
      "credenciais: uma frase curta so com o que ela deu (tempo de estrada, quantas marcas, como grava, prazo). Se houver observacoes extras sobre disponibilidade ou prazo, ELAS ENTRAM AQUI, no fim dessa mesma frase, nunca num paragrafo solto. Se ela nao deu nada disso, devolva string vazia.",
      "fecho_extra: normalmente vazio. So use se as observacoes extras dela forem sobre outra coisa que nao caiba nas credenciais, e mesmo assim em uma frase.",
      "ps: sempre este, com as palavras dela: independente dessa collab, me conta como funciona o processo de voces com criativos hoje? Se tiverem lista de creators, quero entrar nela.",
      "",
      "PROIBIDO ESCREVER, em nenhuma variacao, porque sai igual pra todas e nao prova nada:",
      "- Encontrei o site de voces e dei uma olhada em tudo",
      "- Vou te contar por que eu vim falar com voces e nao com outra marca",
      "- E por isso que faz sentido ser agora, e nao daqui a seis meses",
      "- Qualquer urgencia, prazo, data ou janela que ela NAO tenha escrito. Sem data dela, sem urgencia nenhuma.",
      "- Em troca do produto, pra voces conhecerem o meu trabalho na pratica. Ela nao pede aprovacao, ela oferece conteudo. Se for permuta, diga de forma direta e sem se diminuir.",
      "- Trabalho com varios formatos, conteudo voltado pro ads e pra venda no trafego, solto no fim do paragrafo.",
      "",
      "COMO ESCREVER:",
      "- Portugues do Brasil falado, caloroso, com conviccao. Ela fala com vontade, nao pede licenca e nao se diminui.",
      "- Nada de venho por meio desta, espero que esteja bem, gostaria de propor, sou apaixonada por.",
      "- Nunca use travessao. Use virgula, dois pontos ou ponto.",
      "- O e-mail inteiro entre 200 e 300 palavras.",
      "- PROIBIDO inventar numero, tempo de carreira, marca atendida, premio, metrica, prazo, data ou detalhe do site. Se ela nao disse, nao existe.",
      "- PROIBIDAS as palavras de robo: autentico, cativante, envolvente, engajador, solucao perfeita, conteudo de qualidade, storytelling, jornada, universo da marca, parceria de sucesso.",
      "- Um emoji no maximo no e-mail inteiro.",
      "- MARCADORES: so {{pessoa}}, {{produto}}, {{detalhe}} e {{link}}, e so quando a informacao nao vier das respostas dela. Fora esses, nunca deixe colchete nem lacuna.",
      "",
      "EXEMPLO DE SAIDA, escrito pela Lara, e esse e o padrao de tom, ritmo e tamanho:",
      "apresentacao: Aqui é a Ana, criadora de conteúdo UGC de Curitiba (@anacozinha). Cheguei em vocês pesquisando panela de cerâmica e acabei ficando um tempão no site, principalmente na linha que não solta revestimento.",
      "motivo: Acabei de me mudar pro meu primeiro apartamento e estou montando a cozinha do zero. Parei de usar antiaderente, então vinha pesquisando cerâmica faz um tempo, e o conjunto de vocês é o que cabe no meu fogão e no meu orçamento: {{link}}. As panelas são literalmente a última coisa que falta aqui.",
      "ideia: A ideia que eu já tenho na cabeça é gravar a chegada da caixa, a primeira vez cozinhando (quero fazer um ovo e uma panqueca pra mostrar o quanto desgruda de verdade) e depois a lavagem, sem corte mágico, tudo em tempo real. Isso vira vídeo vertical em arquivo pra vocês usarem como UGC, inclusive em tráfego pago, e eu documento a cozinha ficando pronta no meu perfil, marcando vocês e com link.",
      "credenciais: Gravo tudo em casa com luz natural, entrego em até 5 dias e já fiz conteúdo pra mais de 20 marcas de casa e cozinha. Tenho disponibilidade nas próximas duas semanas.",
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
      "",
      "5) O QUE ELA VIU NO SITE DESSA MARCA: " + (detalhe || "(nao respondeu, use o marcador {{detalhe}} literalmente)"),
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
    const pExtra = limpaRobo(o.fecho_extra);
    // o P.S. e sempre o texto dela, com acento e tudo: a IA vive devolvendo "voces"
    const ps = "P.S.: independente dessa collab, me conta como funciona o processo de vocês com criativos hoje? Se tiverem lista de creators, quero entrar nela.";

    if (!apresentacao && !motivo && !pIdeia) return json({ error: "ia_vazia" }, 502);

    // rede de seguranca, sem duplicar o que a IA ja escreveu
    const temChegada = /cheguei em voc|fiquei um tempão|ficando um tempão|conheci voc/i.test(apresentacao);
    if (!temChegada) {
      apresentacao += detalhe
        ? " Cheguei em vocês pesquisando {{produto}} e acabei ficando um tempão no site, principalmente " + detalhe.replace(/^[,.]\s*/, "") + "."
        : " Cheguei em vocês pesquisando {{produto}} e acabei ficando um tempão no site, principalmente em {{detalhe}}.";
    } else if (!detalhe && !apresentacao.includes("{{detalhe}}")) {
      apresentacao = apresentacao.replace(/\.$/, "") + ", principalmente em {{detalhe}}.";
    }
    if (!motivo.includes("{{link}}") && !/https?:\/\//.test(motivo)) {
      motivo = motivo.replace(/\s*$/, "") + " É esse aqui ó: {{link}}.";
    }

    const arrobaOk = arroba ? (arroba.startsWith("@") ? arroba : "@" + arroba) : "";
    const fecho = "Se fizer sentido, vai ser incrível ter vocês nesse projeto :)\nPortfólio: " + site;
    const assinatura = "Att, " + (nome !== "{{nome}}" ? nome : "{{nome}}") + (arrobaOk ? "\n" + arrobaOk : "");

    const paragrafos = [
      "Oieee {{pessoa}}, tudo bem?",
      apresentacao,
      motivo,
      pIdeia,
      pCred,
      pExtra,
      fecho,
      assinatura,
      ps,
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
