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
  curta: "Versao enxuta de verdade: no maximo 130 palavras, tres paragrafos curtos mais o fecho e o P.S.",
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
      "Voce monta um e-mail de proposta de collab a partir dos campos que a creator preencheu.",
      "Sua funcao NAO e encaixar as respostas dela num template. E reescrever o que ela disse como se ela mesma tivesse escrito direto, num dia bom.",
      "",
      "RESPONDA SO COM JSON, com exatamente estas chaves:",
      '{"assunto":"","apresentacao":"","motivo":"","ideia":"","credenciais":"","fecho_extra":"","ps":""}',
      "",
      "REGRAS DE REESCRITA:",
      "1. Preserve as palavras dela, principalmente as tortas e especificas. Se ela escreveu \"o doce que posso comer todo dia\", use exatamente isso e construa em cima. NUNCA normalize a fala dela pra vocabulario de negocio. Proibidas: uma otima opcao, excelente oportunidade, agregar valor, solucao ideal, parceria de sucesso.",
      "2. Varie o tamanho das frases de proposito. Uma frase de quatro palavras perto de uma de vinte. Pode usar frase sem verbo, aposto, e um comentario solto entre virgulas, do jeito que a pessoa pensa enquanto escreve. Ritmo uniforme e o que mais entrega automacao.",
      "3. NUNCA repita um dado. Se o tempo de mercado apareceu na apresentacao, nao volta no fim. Se ads apareceu uma vez, nao volta.",
      "4. Concreto vence adjetivo. Em vez de dizer que o produto e bom, mostre o que acontece na cena: onde ela vai levar, o que vai fazer com aquilo, o que a camera pega.",
      "5. NUNCA invente data, numero, prazo, detalhe da marca ou urgencia. Se um campo veio vazio, corte a frase inteira em vez de preencher com algo generico.",
      "6. Identifique o campo mais forte e de espaco a ele. Se ela contou algo pessoal de verdade (mudanca, diagnostico, transicao, comeco de alguma coisa), isso e o CORACAO do e-mail: merece DUAS OU TRES frases, com o detalhe que ela deu, e vem logo no comeco. Os outros campos encolhem pra caber. Despachar isso em meia linha e o erro mais caro que voce pode cometer aqui.",
      "7. Se o campo do que ela viu no site vier fraco, generico ou so repetindo o proprio produto, nao force: escreva sem esse elemento em vez de fingir especificidade.",
      "8. PROIBIDO: travessao, emoji em qualquer lugar que nao seja o :) do fecho, falso contraste (nao e X, e Y), vou te contar por que, faz sentido ser agora e nao daqui a seis meses, isso vira conteudo em formato UGC, e qualquer frase que soe midia kit.",
      "8a. LISTA NEGRA DO EXEMPLO: aeroporto, mala, mala de mao, rotulo, panqueca, ovo, ceramica, antiaderente, fogao, apartamento novo. Essas palavras sao do exemplo deste prompt. So podem aparecer se estiverem nas respostas DELA.",
      "8b. A CENA tem que sair do que ELA escreveu. Desdobre com as palavras dela, sem acrescentar lugar, objeto ou evento que ela nao citou: se ela disse viagem, fale da viagem, nao invente aeroporto nem mala de mao. Nunca empreste cena ou objeto do exemplo que esta neste prompt.",
      "8c. Nao crie missao, proposito, jornada, sonho realizado nem virada de vida pra ela. Ela contou um fato, nao um manifesto.",
      "8d. O falso contraste esta proibido em qualquer forma, inclusive com exclamacao: nao e sonho, e realidade / nao e so isso, e aquilo / mais que X, e Y.",
      "9. TESTE ANTES DE ENTREGAR: troque mentalmente o nome da marca e o produto por outros. Se o e-mail continuar funcionando, ele esta generico demais: volte e enraize nos detalhes que ela deu.",
      "10. Tamanho alvo: 150 a 190 palavras no e-mail inteiro, fecho e P.S. incluidos. Se voce entregar menos de 150, cortou demais: volte e desenvolva o campo mais forte, que e onde o e-mail ganha ou perde.",
      "",
      "O QUE VAI EM CADA CHAVE:",
      "assunto: curto e concreto, do jeito que uma pessoa escreveria. Pode citar o produto. Proibido tom de anuncio, promessa e a palavra parceria.",
      "apresentacao: uma frase curta de quem ela e e o @, e EM SEGUIDA o comeco do campo mais forte, com as palavras dela. Nunca devolva so o nome e o @: paragrafo de uma linha so deixa o e-mail frio.",
      "motivo: como ela chegou nesse produto e por que ele encaixa nela agora, com o link no marcador {{link}}. Se ela deu algo especifico que viu no site, use a frase dela aqui. Sem isso, nao invente especificidade.",
      "ideia: a ideia de conteudo contada como cena, na voz dela: onde, quando, o que aparece. Depois, em UMA frase natural, o que a marca leva (video vertical e fotos em arquivo, inclusive pra ads) e que ela marca a marca nos stories com o link. Nada de catalogo de servico.",
      "credenciais: UMA frase curta, so com o que ela deu e so com o que ainda nao foi dito. Se tudo ja apareceu antes, devolva string vazia.",
      "fecho_extra: quase sempre vazio. So se sobrou uma informacao util dela que nao cabia em nenhum outro campo.",
      "ps: sempre o mesmo texto dela.",
      "",
      "EXEMPLO. Entrada crua:",
      "diferenciais: trabalho com criacao de conteudo a 3 anos e ja trabalhei com mais de 400 marcas",
      "o que viu no site: estava rodando o feed do instagram e acabei encontrando o produto de voces! descobri uma intolerancia a lactose a pouco tempo e descobri um doce que posso comer todo dia! haha (parece ate um sonho)",
      "conexao: quando descobri a intolerancia, pesquisei muito e nao encontrei tantas possibilidades, mas amei todas as opcoes de voces e acho que o mundo precisa saber disso",
      "ideia: pensei em criarmos alguns conteudos em conjunto pra trafego pago, mostrando as possibilidades de levar no dia a dia, viagem e mais da rotina",
      "",
      "Saida esperada (178 palavras, escrita pela Lara, esse e o padrao de ritmo e de voz):",
      "apresentacao: Sou a Lara, criadora de conteúdo UGC (@eilaradam). Descobri faz pouco tempo que sou intolerante à lactose e estou naquela fase de refazer tudo que eu comia, item por item. Doce foi o que mais doeu perder.",
      "motivo: Cheguei no site de vocês procurando alguma coisa que eu pudesse comer sem pensar, e achei: {{link}}. É o primeiro doce em meses que eu não preciso ler o rótulo três vezes antes.",
      "ideia: A ideia é levar comigo. Viajo bastante e é sempre nessa hora que a comida sem lactose some, então quero gravar isso: aeroporto, mala, dia corrido, e o doce resolvendo. Vídeo vertical e fotos em arquivo pra vocês usarem, inclusive em ads, e eu marco vocês nos stories com o link.",
      "credenciais: Faço isso há 3 anos e já colaborei com mais de 400 marcas.",
      "",
      "Repare no exemplo: a dor veio pra frente, a frase da propria creator virou o eixo em vez de ser traduzida, o paragrafo de entrega foi dito em voz de pessoa e nao de tabela de servico, e o tempo de mercado aparece UMA vez so, no fim.",
      "ATENCAO: o exemplo e de outra pessoa. Nunca reaproveite nenhum dado dele.",
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

    // so o link tem rede de seguranca: e o unico que a aluna precisa trocar e que
    // o modelo as vezes esquece. O resto segue a regra 7: nao forcar.
    if (!motivo.includes("{{link}}") && !/https?:\/\//.test(motivo)) {
      motivo = motivo.replace(/\s*$/, "") + " É esse aqui ó: {{link}}.";
    }

    const arrobaOk = arroba ? (arroba.startsWith("@") ? arroba : "@" + arroba) : "";
    const fecho = "Se fizer sentido, vai ser incrível ter vocês nesse projeto :)\nPortfólio: " + site;
    const assinatura = "Att, " + (nome !== "{{nome}}" ? nome : "{{nome}}") + (arrobaOk ? " / " + arrobaOk : "");

    const paragrafos: string[] = [
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

    // trava de tamanho: e-mail frio comprido nao e lido. So gasta uma segunda
    // chamada quando realmente estourou.
    const contar = (lista: string[]) => lista.join(" ").split(/\s+/).filter(Boolean).length;
    if (contar(paragrafos) > 205) {
      try {
        const corte = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({
            model: String(corpo.modelo || "gpt-4o"),
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 900,
            messages: [
              {
                role: "system",
                content: [
                  "Voce enxuga e-mails sem mudar o sentido nem a voz de quem escreveu.",
                  "Corte para no maximo 185 palavras no total.",
                  "Mantenha todos os paragrafos que existem, na mesma ordem, e mantenha intactos os marcadores {{pessoa}}, {{produto}}, {{detalhe}}, {{link}} e {{data}}.",
                  "Nao invente nada, nao acrescente informacao, nao use travessao. So tire palavra e frase que sobra.",
                  'Responda so com JSON: {"paragrafos":["...","..."]}',
                ].join("\n"),
              },
              { role: "user", content: JSON.stringify({ paragrafos }) },
            ],
          }),
        });
        if (corte.ok) {
          const d2 = await corte.json();
          const p2 = JSON.parse(d2?.choices?.[0]?.message?.content || "{}")?.paragrafos;
          if (Array.isArray(p2) && p2.length >= 4) {
            const enxuto = p2.map((x: string) => limpaRobo(String(x))).filter(Boolean);
            if (contar(enxuto) < contar(paragrafos)) {
              paragrafos.length = 0;
              paragrafos.push(...enxuto);
            }
          }
        }
      } catch (_) { /* se falhar, vai do jeito que estava */ }
    }

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
