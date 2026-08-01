// Gera HTML editável do carrossel de AGOSTO p/ importar no Canva.
// Saída: public/agosto/carrossel-agosto.html
const fs = require("fs");
const RAW =
  "https://raw.githubusercontent.com/eilaradam/site-creators/refs/heads/claude/remotion-video-setup-gn5dhb/videos/public/agosto/";

const CREME = "#EFE9DF", INK = "#2B2622", ORANGE = "#1641EC", AZUL = "#1641EC", MUT = "#928777", SOFT = "#E7ECFD";

const CARDS = [
  {
    data: "09/08", nome: "DIA DOS PAIS",
    para: "**A maior data comercial do segundo semestre.** Moda, beleza, perfumaria, tecnologia, alimentação, bebidas, experiências e turismo entram todos na conta.",
    ugc: "O UGC é a emoção por trás do presente: unboxing, guia de presente por perfil de pai, storytelling de quem cuida.",
    dica: "e-commerce e varejo precisam de conteúdo de curadoria e urgência de última hora entre 05/08 e 09/08. Ofereça um pacote de vídeos pra essa reta final, proposta que quase ninguém faz.",
    imgs: ["pais1.webp", "pais2.webp", "pais3.webp"], focos: ["center 30%", "center 48%", "center 22%"],
  },
  {
    data: "01 a 07/08", nome: "AGOSTO DOURADO",
    para: "A **Semana Mundial da Amamentação** abre o mês, parte de uma campanha oficial por lei federal desde 2017. Data de marca de maternidade, saúde, farmácia, plano de saúde e produto infantil.",
    ugc: "O UGC é o acolhimento: rotina com bebê, produto que ajuda no dia a dia da amamentação, depoimento real de mãe.",
    dica: "evite tom prescritivo. Marca de maternidade paga bem por conteúdo que acolhe em vez de ensinar.",
    imgs: ["dourado1.png", "dourado2.webp", "dourado3.jpg"], focos: ["center 35%", "center", "center 40%"],
  },
  {
    data: "11 e 12/08", nome: "ESTUDANTE E VOLTA À ROTINA",
    para: "**Dia do Estudante** e **Dia Internacional da Juventude** caem em sequência, junto com a volta à rotina pós-férias. Data de edtech, curso, papelaria, plataforma de produtividade e marca que fala com gente jovem.",
    ugc: "O UGC é a organização: rotina de estudo, mesa organizada, review de curso ou ferramenta.",
    dica: "educação sempre quer creator universitário mostrando o produto dentro da rotina real de estudo, não numa aula genérica.",
    imgs: ["estudante1.jpg", "estudante2.jpg", "estudante3.jpg"], focos: ["center", "center 30%", "center 30%"],
  },
  {
    data: "07/08", nome: "DIA INTERNACIONAL DA CERVEJA",
    para: "**Cai numa sexta-feira**, ótimo pra ativação de fim de semana. Bar, cervejaria, delivery, empório e petisco entram todos na conta.",
    ugc: "O UGC é o encontro: harmonização, combo de happy hour, resenha de rótulo, roteiro de bar.",
    dica: "sempre reforça consumo responsável na peça, e usa esse ângulo também de forma metafórica pra marca fora do setor, tipo fim de expediente ou cultura de equipe.",
    imgs: ["cerveja1.jpg", "cerveja2.jpg", "cerveja3.jpg"], focos: ["center", "center 45%", "center"],
  },
];

const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
const tamData = (d) => (d.length <= 6 ? 54 : d.length <= 12 ? 42 : 34);
const PAGE = `width:1080px;height:1350px;position:relative;background:${CREME};font-family:Helvetica,Arial,sans-serif;color:${INK};overflow:hidden;box-sizing:border-box;`;
const handles = () => `<div style="display:flex;justify-content:space-between;padding:56px 70px 0;">${[0,1,2].map(()=>`<span style="font-size:24px;font-style:italic;color:${MUT};opacity:.6;">@eilaradam</span>`).join("")}</div>`;
const footer = () => `<div style="font-size:26px;font-weight:700;">Lara Dam <span style="color:${ORANGE};">· @eilaradam</span></div>`;
const fotos = (imgs, focos, fits) => `<div style="display:flex;gap:16px;width:100%;">${imgs.map((f,i)=>(fits&&fits[i]==="contain")
  ? `<div style="flex:1;height:224px;border-radius:16px;overflow:hidden;position:relative;background:#DCD8D1;"><img src="${RAW}${f}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(16px);transform:scale(1.15);opacity:.65;"/><img src="${RAW}${f}" style="position:relative;width:100%;height:100%;object-fit:contain;display:block;"/></div>`
  : `<div style="flex:1;height:224px;border-radius:16px;overflow:hidden;"><img src="${RAW}${f}" style="width:100%;height:100%;object-fit:cover;object-position:${focos[i]||"center"};display:block;"/></div>`).join("")}</div>`;

const capa = `
<div data-document-role="page" data-label="Capa" style="${PAGE}">
  ${handles()}
  <div style="position:absolute;left:0;right:0;top:120px;bottom:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 76px;box-sizing:border-box;">
    <div style="background:${ORANGE};color:#fff;font-weight:800;font-size:26px;letter-spacing:4px;padding:10px 24px;text-transform:uppercase;transform:rotate(-2deg);">☀ Guia de Agosto</div>
    <div style="margin-top:46px;font-size:96px;font-weight:900;line-height:1.04;letter-spacing:-2px;"><span style="color:${ORANGE};">4</span> propostas para enviar em <span style="color:${ORANGE};border-bottom:10px solid ${ORANGE};">AGOSTO</span></div>
    <div style="margin-top:42px;display:inline-block;background:${AZUL};color:#fff;font-size:40px;font-weight:800;line-height:1.25;padding:20px 30px;transform:rotate(-1.5deg);">e começar o mês já<br/>fechando Publi e UGC</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:60px;text-align:center;">${footer()}</div>
</div>`;

const cards = CARDS.map((c) => `
<div data-document-role="page" data-label="${c.nome}" style="${PAGE}">
  ${handles()}
  <div style="position:absolute;left:0;right:0;top:120px;bottom:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 70px;box-sizing:border-box;">
    <div style="font-size:${tamData(c.data)}px;font-weight:900;letter-spacing:1px;">${c.data}</div>
    <div style="display:inline-block;margin-top:6px;background:${ORANGE};transform:rotate(-2deg);padding:16px 40px;"><div style="color:#fff;font-size:44px;font-weight:900;line-height:1.08;letter-spacing:1px;text-transform:uppercase;">${c.nome}</div></div>
    <div style="margin-top:30px;font-size:31px;line-height:1.32;font-weight:500;max-width:870px;">${bold(c.para)}</div>
    <div style="margin-top:14px;font-size:30px;line-height:1.28;color:${ORANGE};font-weight:800;max-width:870px;">${c.ugc}</div>
    <div style="margin-top:14px;background:${SOFT};border-radius:18px;padding:16px 26px;max-width:870px;"><span style="color:${ORANGE};font-weight:900;font-size:25px;">Dica: </span><span style="font-size:25px;line-height:1.26;font-weight:500;">${c.dica}</span></div>
    <div style="margin-top:30px;width:100%;"><div style="font-size:23px;letter-spacing:2px;color:${MUT};font-weight:700;margin-bottom:14px;">ideias de conteúdo:</div>${fotos(c.imgs, c.focos, c.fits)}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:60px;text-align:center;">${footer()}</div>
</div>`).join("");

const cta = `
<div data-document-role="page" data-label="CTA" style="${PAGE}">
  ${handles()}
  <div style="position:absolute;left:0;right:0;top:120px;bottom:120px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 60px;box-sizing:border-box;">
    <div style="font-family:Georgia,serif;font-size:92px;line-height:.98;">Bora fechar <span style="font-style:italic;color:${ORANGE};">Publi &amp; UGC?</span></div>
    <div style="position:relative;margin-top:44px;transform:rotate(-2deg);max-width:860px;">
      <div style="background:${AZUL};color:#fff;padding:30px 46px;font-size:32px;line-height:1.32;font-weight:600;">Comenta <strong>AGOSTO</strong> aqui que eu te mando as oportunidades mais quentes no seu <strong>privado</strong>.</div>
    </div>
    <div style="margin-top:36px;font-size:32px;font-weight:600;color:${MUT};max-width:740px;">E <strong style="color:${INK};">salva</strong> esse carrossel pra usar o mês todo como guia.</div>
    <div style="margin-top:34px;display:inline-block;background:${ORANGE};color:#fff;font-weight:900;font-size:42px;padding:20px 46px;border-radius:999px;transform:rotate(-1.5deg);">💬 AGOSTO</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:60px;text-align:center;">${footer()}</div>
</div>`;

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Carrossel Agosto — @eilaradam</title></head><body style="margin:0;">${capa}${cards}${cta}</body></html>`;
fs.writeFileSync("public/agosto/carrossel-agosto.html", html);
console.log("OK carrossel-agosto.html", html.length, "bytes");
