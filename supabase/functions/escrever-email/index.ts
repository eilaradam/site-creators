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
const LIMITE_IP = 80;      // por IP por dia
const LIMITE_DIA = 900;    // total por dia, pra chave nao virar torneira aberta
const MAX_CAMPO = 1200;    // caracteres por resposta

const ESTILOS_DM: Record<string, string> = {
  direta: "A EDUCADA. So o essencial: quem ela e, que tem uma proposta, e o pedido do canal. Nao cite produto, nao cite post, nao diga que e cliente.",
  ideia: "COM ELOGIO AO PERFIL. Comeca citando o que ela viu no perfil deles, em meia frase, e so depois diz que tem proposta e pede o canal. Nao diga que e cliente.",
  resultado: "DUAS LINHAS. Corte ao osso: sem o tudo bem, sem agradecimento longo. Uma frase dizendo o que ela faz e pedindo o canal, e um obrigada curto. NO MAXIMO 30 PALAVRAS no total, conte antes de responder. Nada de post, nada de cliente.",
  curta: "DE CLIENTE PRA MARCA. Abre dizendo que ja e cliente ou fa, com as palavras dela, e por isso quer falar. Nao cite post do perfil.",
};
const ESTILOS_PLATAFORMA: Record<string, string> = {
  direta: "Versao NUMEROS: a linha 1 e o numero mais forte dela ou o nicho. Mantenha as quatro partes na ordem.",
  ideia: "Versao ENTUSIASMO: a linha 1 e o que ela sente pela marca ou pelo produto, com as palavras dela, e os numeros entram so de leve na apresentacao, ou nem entram. Mantenha as quatro partes na ordem.",
};
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
    const oferta = limpar(corpo.oferta);
    const quando = limpar(corpo.quando);
    const pedido = limpar(corpo.pedido);
    const destaque = limpar(corpo.destaque);
    if (!dif && !conexao && !ideia) return json({ error: "vazio" }, 400);

    const nome = limpar(corpo.nome) || "{{nome}}";
    const arroba = limpar(corpo.arroba);
    const site = limpar(corpo.site) || "{{site}}";
    const cidade = limpar(corpo.cidade);
    const estiloBruto = String(corpo.estilo || "direta");
    const ehPlataforma = String(corpo.formato) === "plataforma";
    const ehDm = String(corpo.formato) === "dm";
    const estilo = ehPlataforma
      ? (ESTILOS_PLATAFORMA[estiloBruto] || ESTILOS_PLATAFORMA.direta)
      : ehDm
      ? (ESTILOS_DM[estiloBruto] || ESTILOS_DM.direta)
      : (ESTILOS[estiloBruto] || ESTILOS.direta);
    const formato = ["email", "dm", "followup", "plataforma"].includes(String(corpo.formato)) ? String(corpo.formato) : "email";

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
      "",
      formato === "dm"
        ? [
            "FORMATO: MENSAGEM DE DIRECT NO INSTAGRAM, e o objetivo dela NAO e vender nada.",
            "O objetivo e UM SO: conseguir um canal de contato pra mandar a proposta depois, normalmente um e-mail.",
            "Entao nao descreva a ideia de conteudo, nao fale de entrega, de formato, de trafego, de portfolio nem de numeros. Isso tudo vai no e-mail, depois.",
            "Devolva: assunto vazio, ps vazio, credenciais vazio, fecho_extra vazio.",
            "TAMANHO: entre 35 e 60 palavras no total. Passou disso, esta errado.",
            "Tom educado e simples, sem gritaria e sem emoji. Aqui ela esta batendo na porta de um perfil comercial.",
            "",
            "ESTRUTURA, uma parte em cada chave:",
            "apresentacao: a saudacao com o nome da marca e um tudo bem. Use {{pessoa}} no lugar do nome da marca. Exemplo: Oi, equipe {{pessoa}}! Tudo bem?",
            "motivo: uma frase dizendo o que ela faz e que tem uma proposta pra mandar. Se ela contou o que viu no perfil, pode entrar aqui em meia frase, sem exagero. Termina PEDINDO o canal de contato que ela escolheu.",
            "ideia: uma linha curta de agradecimento e despedida, tipo: Agradeco desde ja e fico no aguardo. Obrigada!",
            "",
            "EXEMPLO QUE FUNCIONA, escrito pela Lara:",
            "Oi, equipe {{pessoa}}! Tudo bem?",
            "Trabalho com criação de conteúdo para marcas e tenho uma proposta que gostaria de enviar para vocês. Poderiam me informar um e-mail específico para esse tipo de contato?",
            "Agradeço desde já e fico no aguardo. Obrigada!",
            "",
            "O CANAL QUE ELA QUER PEDIR: " + (pedido || "um e-mail especifico para esse tipo de contato"),
          ].join("\n")
        : formato === "followup"
        ? [
            "FORMATO: SEGUNDO E-MAIL, mandado alguns dias depois do primeiro, que nao teve resposta.",
            "No maximo 70 palavras no total. Tres frases curtas, no maximo quatro.",
            "assunto: curtinho, retomando o assunto anterior, tipo: sobre a ideia que eu mandei.",
            "apresentacao: uma linha retomando o contato, citando o assunto do primeiro e-mail (item 3) e, se ela disse quando mandou (item 7), a referencia de tempo. Sem cobranca e sem soar chateada. Nada de nao obtive retorno. NAO comece com Oi nem Oiee nem tudo bem: a saudacao ja vem pronta na linha de cima.",
            "motivo: a OFERTA NOVA que ela escreveu no item 6, reescrita em uma frase que facilite o sim. Se ela nao deu, ofereca gravar um teste curto antes de qualquer acordo.",
            "ideia: string vazia, credenciais vazia, fecho_extra vazia.",
            "ps: string vazia.",
            "Nao repita a apresentacao dela nem as credenciais: ela ja se apresentou no primeiro e-mail.",
          ].join("\n")
        : formato === "plataforma"
        ? [
            "FORMATO: CANDIDATURA EM PLATAFORMA DE CAMPANHA (tipo Seu Influencer). A marca publicou uma campanha e le uma pilha de candidaturas seguidas.",
            "Nao e e-mail: e curto, animado e direto, e quem decide e a primeira linha.",
            "TAMANHO: NO MAXIMO 80 PALAVRAS no total, contando tudo. Conte antes de responder.",
            "Devolva: assunto vazio, ps vazio, fecho_extra vazio.",
            "NAO use {{pessoa}}, {{produto}}, {{link}} nem {{detalhe}}: aqui nao se sabe quem le e nao existe pagina de produto.",
            "Emoji e bem-vindo, no maximo dois no texto todo (🎬 ✨ 🫶🏼 sao os que ela usa).",
            "Se usar o @ dela, ponha entre parenteses depois do nome. Nunca solte o @ no fim de uma frase.",
            "NAO cite portfolio nem link: o sistema poe a ultima linha sozinho.",
            "",
            "A ESTRUTURA E SEMPRE ESSA, nesta ordem, e cada parte vai numa chave:",
            "1. DIFERENCIAL, em apresentacao, como PRIMEIRA LINHA solta: a frase de destaque dela, o que a faz valer a pena entre cem candidaturas. Costuma ser um numero forte ou o nicho. Exemplos reais: + de 500 conteúdos criados só no último ano! ✨ / Sou especialista no nicho TECH e conteúdo de IA!",
            "2. APRESENTACAO, ainda em apresentacao, na linha de baixo: a saudacao curta e animada e quem ela e, com os numeros dela. Exemplo real: Oie, equipe! Cheguei 🎬 Sou criadora de conteúdo há mais de 2 anos e, nesse tempo, já trabalhei com mais de 300 marcas e produzi mais de 500 vídeos.",
            "3. CONEXAO, em motivo: por que ELA pra ESSA campanha, com as palavras dela. Pode ser o nicho dela, ser cliente ou fa da marca, ou ja ter ideias.",
            "   A frase da conexao tem que se sustentar SOZINHA, como afirmacao sobre ela. Bom: Sou especialista no nicho TECH e conteúdo de IA. Bom: Sou cliente de vocês há anos e uso os produtos em casa. RUIM: Sou especialista em tech, o que conecta perfeitamente com. RUIM: acho que posso trazer um olhar interessante pra.",
            "   Se ela nao deu nada, devolva string vazia.",
            "4. CTA, em ideia: uma frase de desejo de trabalhar junto, tipo Adoraria fazer parte desse trabalho e construir algo incrível juntos! ou To super animada pra colaborarmos juntos nessa! O portfolio vem depois, posto pelo sistema.",
            "credenciais: so se sobrou uma informacao forte que nao coube em cima, tipo Emito Nota Fiscal. Senao, vazio.",
            "",
            "TRES CANDIDATURAS REAIS DELA QUE FORAM APROVADAS:",
            "1) + de 500 conteúdos criados só no último ano! ✨\\nOie, sou criadora de conteúdo há mais de 2 anos e, nesse tempo, já trabalhei com mais de 300 marcas e produzi mais de 500 vídeos!\\nEspecialista no nicho TECH. Emito Nota Fiscal.",
            "2) Oie, equipe! Cheguei 🎬\\nSou criadora de conteúdo há mais de 2 anos e, nesse tempo, já trabalhei com mais de 300 marcas e produzi mais de 500 vídeos.\\nAdoraria fazer parte desse trabalho e construir algo incrível juntos!",
            "3) Olá equipe!\\nVocês acabaram de encontrar a UGC mais apaixonada por bubbles dessa plataforma 😂🫶🏼\\nRealmente sou muito fã e sempre compro com sucos, mas não sabia que existia a possibilidade de comprar o produto individual, incrível!\\nJá tive algumas ideias de como usar o produto e to super animada pra colaborarmos juntos nessa!",
            "A barra invertida n acima e quebra de linha: escreva em linhas curtas, sem barra nenhuma no texto.",
            "Repare que a 3 nao tem numero: quando a creator nao tem numeros, o entusiasmo especifico dela e que vira o diferencial da linha 1.",
            "ATENCAO: os numeros dos exemplos sao DELA. Nunca use numero que nao esteja nas respostas que voce recebeu.",
            "",
            "CONFERIDAS FINAIS, e reescreva se falhar em alguma:",
            "a) Nenhuma frase truncada ou sem sentido. Leia frase por frase antes de responder.",
            "a2) Quando precisar falar da marca, escreva voces ou essa campanha. Voce NAO sabe o nome da marca, entao nunca deixe a frase pendurada esperando um nome, tipo: conecta perfeitamente com. Frase que termina em com, pra, de, em ou para esta errada.",
            "b) Nada de enfeite que ela nao escreveu, tipo sonho antigo, sempre quis, realizando um sonho.",
            "c) A parte 2, a apresentacao, existe SEMPRE, com o que ela deu, mesmo na versao do entusiasmo.",
            "d) No maximo 80 palavras.",
            "",
            "O DESTAQUE QUE ELA ESCOLHEU PRA PRIMEIRA LINHA: " + (destaque || "(nao respondeu: use o que for mais forte nas respostas dela, ou comece pela saudacao animada)"),
          ].join("\n")
        : "FORMATO: E-MAIL de primeiro contato, como descrito acima.",
    ].join("\n");

    // na candidatura, cada versao usa um material: a dos numeros nao recebe a
    // conexao nem a ideia, e a do entusiasmo nao recebe os numeros. Sem isso a IA
    // junta tudo e estoura o tamanho.
    const dmSemDetalhe = ehDm && estiloBruto !== "ideia";
    const dmSemConexao = ehDm && estiloBruto !== "curta";
    const soNumeros = false;
    const soEntusiasmo = ehPlataforma && estiloBruto === "ideia";
    const difU = soEntusiasmo ? "" : dif;
    const conexaoU = (soNumeros || dmSemConexao) ? "" : conexao;
    const ideiaU = soNumeros ? "" : ideia;

    const usuario = [
      "NOME DELA: " + nome,
      arroba ? "@ DELA: " + arroba : "",
      "PORTFOLIO: " + site,
      cidade ? "CIDADE DELA: " + cidade : "CIDADE: (nao informou, nao cite cidade nenhuma)",
      "",
      "1) DIFERENCIAIS (quem ela e): " + (difU || "(nao respondeu, se apresente so como criadora de conteudo UGC)"),
      "",
      "2) CONEXAO COM A MARCA: " + (conexaoU || "(nao respondeu, nao invente conexao: escreva sem isso)"),
      "",
      "3) IDEIA DE CONTEUDO: " + (ideiaU || (ehPlataforma ? "(nao respondeu, so diga que adoraria fazer parte)" : "(nao respondeu, proponha gravar o uso real do produto em tres momentos)")),
      "",
      "4) OBSERVACOES EXTRAS: " + (extras || "(nenhuma)"),
      "",
      "5) O QUE ELA VIU NO SITE DESSA MARCA: " + ((dmSemDetalhe ? "" : detalhe) || (ehDm ? "(nao usar nesta versao)" : "(nao respondeu, use o marcador {{detalhe}} literalmente)")),
      formato === "followup" ? "6) A OFERTA NOVA DO SEGUNDO E-MAIL: " + (oferta || "(nao respondeu: ofereca gravar um teste curto antes de qualquer acordo)") : "",
      formato === "followup" && quando ? "7) QUANDO ELA MANDOU O PRIMEIRO: " + quando : "",
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
       .replace(/\bjornada\b/gi, "história")
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
    if (formato === "email" && !motivo.includes("{{link}}") && !/https?:\/\//.test(motivo)) {
      motivo = motivo.replace(/\s*$/, "") + " É esse aqui ó: {{link}}.";
    }

    const arrobaOk = arroba ? (arroba.startsWith("@") ? arroba : "@" + arroba) : "";
    const assinaturaCurta = "Att, " + (nome !== "{{nome}}" ? nome : "{{nome}}") + (arrobaOk ? " / " + arrobaOk : "");

    let paragrafos: string[] = [];
    if (formato === "dm") {
      paragrafos = [apresentacao, motivo, pIdeia].filter(Boolean);
    } else if (formato === "plataforma") {
      // aqui nao existe marcador pra trocar, entao o que sobrar de {{...}} sai fora
      const semChave = (t: string) => t.replace(/\{\{[^}]*\}\}/g, "").replace(/\s{2,}/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
      // frase pendurada ("...conecta perfeitamente com.") sai inteira
      const semTronco = (t: string) =>
        t.split(/(?<=[.!?])\s+/)
          .filter((f) => !/\b(com|pra|para|de|em|ao|à|no|na|do|da)\s*[.!?]+$/i.test(f.trim()))
          .join(" ")
          .trim();
      apresentacao = semTronco(semChave(apresentacao));
      motivo = semTronco(semChave(motivo));
      paragrafos = [apresentacao, motivo, semTronco(semChave(pIdeia)), semTronco(semChave(pCred)), "Deixo aqui meu portfólio com alguns dos meus vídeos favoritos:\n" + site].filter(Boolean);
    } else if (formato === "followup") {
      paragrafos = [
        "Oieee {{pessoa}}, tudo bem?",
        apresentacao,
        motivo,
        assinaturaCurta,
      ].filter(Boolean);
    } else {
      paragrafos = [
        "Oieee {{pessoa}}, tudo bem?",
        apresentacao,
        motivo,
        pIdeia,
        pCred,
        pExtra,
        "Se fizer sentido, vai ser incrível ter vocês nesse projeto :)\nPortfólio: " + site,
        assinaturaCurta,
        ps,
      ].filter(Boolean);
    }

    // trava de tamanho: e-mail frio comprido nao e lido. So gasta uma segunda
    // chamada quando realmente estourou.
    const contar = (lista: string[]) => lista.join(" ").split(/\s+/).filter(Boolean).length;
    if (formato === "email" && contar(paragrafos) > 205) {
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
      assunto: (formato === "dm" || formato === "plataforma") ? "" : (limpaRobo(o.assunto) || "Ideia de conteúdo pro {{produto}} de vocês"),
      paragrafos,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
