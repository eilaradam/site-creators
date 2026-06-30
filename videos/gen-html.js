// Gera um HTML editável do carrossel de julho (1 página por lâmina) para
// importar no Canva via import-design-from-url. Saída: public/julho/carrossel-julho.html
const fs = require("fs");

const RAW =
  "https://raw.githubusercontent.com/eilaradam/site-creators/refs/heads/claude/remotion-video-setup-gn5dhb/videos/public/julho/";

const CREME = "#EFE9DF";
const INK = "#2B2622";
const ORANGE = "#F4541E";
const AZUL = "#0C40ED";
const MUT = "#928777";
const SOFT = "#F8E7DD";

const CARDS = [
  {
    titulo: "Copa do Mundo, a final (19/07)",
    para:
      "Julho é o ápice da Copa: as quartas, semis e **a grande final no dia 19**. O Brasil inteiro em modo futebol, e as marcas precisam de conteúdo no ritmo do jogo. Bares, cervejarias, apps de delivery, eletrônicos (TV e som), moda esportiva, petiscos.",
    ugc: "O UGC é a reação: torcida, mesa de bar, grito de gol, galera reunida.",
    dica:
      "marcas de cerveja, snack e delivery precisam de conteúdo em VOLUME nessa fase. Ofereça um pacote reativo, vídeos rápidos a cada jogo decisivo, proposta que quase ninguém faz.",
    imagens: ["copa1.png", "copa2.png", "copa3.png"],
    focos: ["center", "center", "center"],
  },
  {
    titulo: "Harry Styles em São Paulo (17, 18, 21 e 24/07)",
    para:
      "Quatro shows lotados no MorumBIS trazem **milhares de pessoas pra São Paulo**. Isso move moda, beleza, hotel, transporte, restaurante e a cidade toda. É um evento com público apaixonado e ávido por registrar tudo.",
    ugc:
      "O UGC aqui é a experiência: GRWM pro show, look do dia, vlog de São Paulo, a viagem pra ver o Harry.",
    dica:
      "marcas de moda, beleza e hotéis em SP querem pegar carona em eventos assim, mas quase ninguém oferece UGC de “indo pro show”. Chega com um pacote de experiência antes mesmo de te pedirem.",
    imagens: ["harry1.jpg", "harry2.jpg", "harry3.jpg"],
    focos: ["center", "center 15%", "center"],
  },
  {
    titulo: "As estreias de cinema do mês",
    para:
      "Julho é mês de blockbuster: **Minions & Monstros (02/07)**, **Moana live-action (09/07)**, **A Odisseia do Nolan (16/07)** e **Homem-Aranha: Um Novo Dia (30/07)**, que teve o trailer mais visto da história. Cinema, pipoca e snacks, moda temática, papelaria, brinquedo e colecionável.",
    ugc:
      "O UGC é o ritual: “vem ao cinema comigo”, look inspirado no filme, reação na estreia, unboxing de produto licenciado.",
    dica:
      "marcas de snack, moda e papelaria podem surfar cada estreia. Monte um calendário de conteúdo amarrando produto a cada lançamento, em vez de um vídeo solto.",
    imagens: ["filmes1.jpg", "filmes2.jpg", "filmes3.jpg"],
    focos: ["center", "center 18%", "center"],
  },
  {
    titulo: "Dia do Amigo e da Amizade (20/07)",
    para:
      "Data de celebrar quem a gente ama, e isso vira presente, rolê e experiência. Marcas de presente, restaurante, moda, app e experiências entram forte.",
    ugc:
      "O UGC é o afeto real: marcar a melhor amiga, o presente pra quem você ama, o rolê da turma.",
    dica:
      "marcas de presente e restaurantes raramente recebem proposta de UGC pra essa data. Ofereça um conteúdo de “presenteie quem você ama” com a cara da marca.",
    imagens: ["amigos1.png", "amigos2.png", "amigos3.png"],
    focos: ["center", "center", "center"],
  },
  {
    titulo: "Dia dos Avós (26/07)",
    para:
      "Uma das datas **mais emocionais do ano**, e das mais subaproveitadas. Presentes afetivos, moda confortável, alimentos, saúde e registro de momento. Conteúdo que emociona converte muito.",
    ugc:
      "O UGC aqui é a conexão de verdade: neto e avó, a homenagem, o presente que faz chorar.",
    dica:
      "marcas de presente, alimento e moda confortável quase nunca pensam nessa data. Chega com um roteiro afetivo pronto, é o tipo de conteúdo que viraliza por emoção.",
    imagens: ["avos.png", "avos1.png", "avos3.png"],
    focos: ["center", "center", "center"],
  },
  {
    titulo: "Férias escolares e inverno (mês inteiro)",
    para:
      "Julho é férias e frio, então o conteúdo é **lifestyle e família**. Turismo, parques, moda de inverno, cobertor e pijama, cafeteria, chocolate quente, fondue.",
    ugc:
      "O UGC é o aconchego e o passeio: gente real com frio real, viagem em família, dia gostoso em casa.",
    dica:
      "marcas de conforto (pijama, cobertor) e turismo vendem muito nessa época e precisam de conteúdo que não pareça catálogo. UGC resolve exatamente isso.",
    imagens: ["inverno1.jpg", "inverno2.png", "inverno3.png"],
    focos: ["center", "center", "center"],
  },
];

const bold = (s) =>
  s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const parseTit = (t) => {
  const m = t.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { nome: m[1], data: m[2] } : { nome: t, data: "" };
};
const dataSize = (d) =>
  !d ? 52 : d.length <= 6 ? 54 : d.length <= 12 ? 42 : 32;

const PAGE =
  'width:1080px;height:1350px;position:relative;background:' +
  CREME +
  ';font-family:Helvetica,Arial,sans-serif;color:' +
  INK +
  ';overflow:hidden;box-sizing:border-box;';

const handles = () =>
  `<div style="display:flex;justify-content:space-between;padding:56px 70px 0;">
    ${[0, 1, 2]
      .map(
        () =>
          `<span style="font-size:24px;font-style:italic;color:${MUT};opacity:.6;">@eilaradam</span>`
      )
      .join("")}
  </div>`;

const footer = () =>
  `<div style="font-size:26px;font-weight:700;">Lara Dam <span style="color:${ORANGE};">· @eilaradam</span></div>`;

function fotos(imgs, focos) {
  return `<div style="display:flex;gap:16px;width:100%;">${imgs
    .map(
      (f, i) =>
        `<div style="flex:1;height:224px;border-radius:16px;overflow:hidden;"><img src="${RAW}${f}" style="width:100%;height:100%;object-fit:cover;object-position:${
          focos[i] || "center"
        };display:block;"/></div>`
    )
    .join("")}</div>`;
}

// ---- CAPA ----
const capa = `
<div data-document-role="page" data-label="Capa" style="${PAGE}">
  <img src="${RAW}capa.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"/>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,16,12,.46) 0%,rgba(20,16,12,.06) 30%,rgba(20,16,12,.30) 58%,rgba(20,16,12,.86) 100%);"></div>
  <div style="position:absolute;inset:0;padding:58px 70px 80px;color:#fff;display:flex;flex-direction:column;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;">${[0, 1, 2]
      .map(
        () =>
          `<span style="font-size:24px;font-style:italic;color:#fff;opacity:.85;">@eilaradam</span>`
      )
      .join("")}</div>
    <div style="margin-top:auto;">
      <div style="display:inline-block;background:${ORANGE};color:#fff;font-weight:800;font-size:26px;letter-spacing:4px;padding:10px 24px;text-transform:uppercase;transform:rotate(-2deg);">☀ Guia de Julho</div>
      <div style="margin-top:26px;font-size:100px;font-weight:900;line-height:1.02;letter-spacing:-2px;">As <span style="color:${ORANGE};">6</span> oportunidades de UGC de <span style="color:${ORANGE};font-style:italic;font-family:Georgia,serif;">julho</span></div>
      <div style="margin-top:26px;font-size:40px;font-weight:700;max-width:760px;">pra você começar o mês já fechando Publi e UGC</div>
      <div style="margin-top:40px;font-size:30px;font-weight:700;">Lara Dam <span style="color:${ORANGE};">· @eilaradam</span></div>
    </div>
  </div>
</div>`;

// ---- CARDS ----
const cards = CARDS.map((c) => {
  const { nome, data } = parseTit(c.titulo);
  return `
<div data-document-role="page" data-label="${nome}" style="${PAGE}">
  ${handles()}
  <div style="position:absolute;left:0;right:0;top:120px;bottom:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 70px;box-sizing:border-box;">
    <div style="font-size:${dataSize(data)}px;font-weight:900;letter-spacing:1px;">${
      data || "JULHO"
    }</div>
    <div style="display:inline-block;margin-top:6px;background:${ORANGE};transform:rotate(-2deg);padding:16px 40px;"><div style="color:#fff;font-size:44px;font-weight:900;line-height:1.08;letter-spacing:1px;text-transform:uppercase;">${nome}</div></div>
    <div style="margin-top:30px;font-size:31px;line-height:1.32;font-weight:500;max-width:870px;">${bold(
      c.para
    )}</div>
    <div style="margin-top:14px;font-size:30px;line-height:1.28;color:${ORANGE};font-weight:800;max-width:870px;">${
      c.ugc
    }</div>
    <div style="margin-top:14px;background:${SOFT};border-radius:18px;padding:16px 26px;max-width:870px;"><span style="color:${ORANGE};font-weight:900;font-size:25px;">Dica: </span><span style="font-size:25px;line-height:1.26;font-weight:500;">${
      c.dica
    }</span></div>
    <div style="margin-top:30px;width:100%;">
      <div style="font-size:23px;letter-spacing:2px;color:${MUT};font-weight:700;margin-bottom:14px;">ideias de conteúdo:</div>
      ${fotos(c.imagens, c.focos)}
    </div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:60px;text-align:center;">${footer()}</div>
</div>`;
}).join("");

// ---- CTA ----
const cta = `
<div data-document-role="page" data-label="CTA" style="${PAGE}">
  ${handles()}
  <div style="position:absolute;left:0;right:0;top:120px;bottom:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 60px;box-sizing:border-box;">
    <div style="font-family:Georgia,serif;font-size:92px;line-height:.98;">Bora fechar <span style="font-style:italic;color:${ORANGE};">Publi &amp; UGC?</span></div>
    <div style="position:relative;margin-top:44px;transform:rotate(-2deg);max-width:860px;">
      <div style="background:${AZUL};color:#fff;padding:30px 46px;font-size:32px;line-height:1.32;font-weight:600;">Comenta <strong>NOVIDADES</strong> aqui embaixo que eu te mando as oportunidades mais quentes no seu <strong>privado</strong>.</div>
    </div>
    <div style="margin-top:36px;font-size:32px;font-weight:600;color:${MUT};max-width:740px;">E <strong style="color:${INK};">salva</strong> esse carrossel pra usar o mês todo como guia.</div>
    <div style="margin-top:34px;display:inline-block;background:${ORANGE};color:#fff;font-weight:900;font-size:42px;padding:20px 46px;border-radius:999px;transform:rotate(-1.5deg);">💬 NOVIDADES</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:60px;text-align:center;">${footer()}</div>
</div>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Carrossel Julho — @eilaradam</title></head><body style="margin:0;">${capa}${cards}${cta}</body></html>`;

fs.writeFileSync("public/julho/carrossel-julho.html", html);
console.log("OK: public/julho/carrossel-julho.html", html.length, "bytes");
