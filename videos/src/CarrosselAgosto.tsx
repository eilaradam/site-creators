import { AbsoluteFill, Img, staticFile } from "remotion";
import { z } from "zod";

/* =========================================================================
   CARROSSEL AGOSTO — "5 propostas para enviar em AGOSTO"
   Mesmo estilo V4 (Cream/@eilaradam): creme + textura, tarja laranja, azul no
   CTA. Feed 1080x1350. indice 0=capa, 1..5=datas, 6=CTA.
   Slots de foto mostram as "ideias de conteúdo" (troque por fotos reais).
   ========================================================================= */
export const agostoSchema = z.object({ indice: z.number() });
export type AgostoProps = z.infer<typeof agostoSchema>;

const CREME = "#EFE9DF";
const INK = "#2B2622";
const ORANGE = "#1641EC"; // (antes laranja) agora azul
const AZUL = "#1641EC";
const MUT = "#928777";
const SOFT = "#E7ECFD";
const FONTE = "Helvetica, Arial, sans-serif";
const SERIF = '"Georgia", "Times New Roman", serif';

type Card = {
  data: string;
  nome: string;
  para: string; // **negrito**
  ugc: string;
  dica: string;
  ideias: [string, string, string];
  imagens?: [string?, string?, string?];
  focos?: (string | undefined)[];
  fits?: (string | undefined)[]; // "contain" p/ mostrar a foto inteira (2 pessoas)
};

const CARDS: Card[] = [
  {
    data: "09/08",
    nome: "DIA DOS PAIS",
    para:
      "**A maior data comercial do segundo semestre.** Moda, beleza, perfumaria, tecnologia, alimentação, bebidas, experiências e turismo entram todos na conta.",
    ugc:
      "O UGC é a emoção por trás do presente: unboxing, guia de presente por perfil de pai, storytelling de quem cuida.",
    dica:
      "e-commerce e varejo precisam de conteúdo de curadoria e urgência de última hora entre 05/08 e 09/08. Ofereça um pacote de vídeos pra essa reta final, proposta que quase ninguém faz.",
    ideias: ["unboxing de presente", "pai e filho", "churrasco em família"],
    imagens: ["agosto/pais1.webp", "agosto/pais2.webp", "agosto/pais3.webp"],
    focos: ["center 30%", "center 48%", "center 22%"],
  },
  {
    data: "01 a 07/08",
    nome: "AGOSTO DOURADO",
    para:
      "A **Semana Mundial da Amamentação** abre o mês, parte de uma campanha oficial por lei federal desde 2017. Data de marca de maternidade, saúde, farmácia, plano de saúde e produto infantil.",
    ugc:
      "O UGC é o acolhimento: rotina com bebê, produto que ajuda no dia a dia da amamentação, depoimento real de mãe.",
    dica:
      "evite tom prescritivo. Marca de maternidade paga bem por conteúdo que acolhe em vez de ensinar.",
    ideias: ["mãe com bebê", "produto de maternidade", "ambiente aconchegante"],
    imagens: ["agosto/dourado1.png", "agosto/dourado2.webp", "agosto/dourado3.jpg"],
    focos: ["center 35%", "center", "center 40%"],
  },
  {
    data: "11 e 12/08",
    nome: "ESTUDANTE E VOLTA À ROTINA",
    para:
      "**Dia do Estudante** e **Dia Internacional da Juventude** caem em sequência, junto com a volta à rotina pós-férias. Data de edtech, curso, papelaria, plataforma de produtividade e marca que fala com gente jovem.",
    ugc:
      "O UGC é a organização: rotina de estudo, mesa organizada, review de curso ou ferramenta.",
    dica:
      "educação sempre quer creator universitário mostrando o produto dentro da rotina real de estudo, não numa aula genérica.",
    ideias: ["mesa de estudo", "planner aberto", "pessoa estudando"],
    imagens: ["agosto/estudante1.jpg", "agosto/estudante2.jpg", "agosto/estudante3.jpg"],
    focos: ["center", "center 30%", "center 30%"],
  },
  {
    data: "07/08",
    nome: "DIA INTERNACIONAL DA CERVEJA",
    para:
      "**Cai numa sexta-feira**, ótimo pra ativação de fim de semana. Bar, cervejaria, delivery, empório e petisco entram todos na conta.",
    ugc:
      "O UGC é o encontro: harmonização, combo de happy hour, resenha de rótulo, roteiro de bar.",
    dica:
      "sempre reforça consumo responsável na peça, e usa esse ângulo também de forma metafórica pra marca fora do setor, tipo fim de expediente ou cultura de equipe.",
    ideias: ["mesa de bar com petisco", "brinde entre amigos", "rótulo em destaque"],
    imagens: ["agosto/cerveja1.jpg", "agosto/cerveja2.jpg", "agosto/cerveja3.jpg"],
    focos: ["center", "center 45%", "center"],
  },
];

const Rico: React.FC<{ texto: string }> = ({ texto }) => (
  <>
    {texto.split("**").map((p, i) =>
      i % 2 === 1 ? (
        <strong key={i} style={{ fontWeight: 900 }}>
          {p}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      )
    )}
  </>
);

const Textura: React.FC = () => (
  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.05, mixBlendMode: "multiply" }}>
    <filter id="grao-ag">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grao-ag)" />
  </svg>
);

const Handles: React.FC = () => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "0 6px" }}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{ fontSize: 24, fontStyle: "italic", color: MUT, opacity: 0.6 }}>@eilaradam</span>
    ))}
  </div>
);

const Rodape: React.FC = () => (
  <div style={{ fontSize: 26, fontWeight: 700 }}>
    Lara Dam <span style={{ color: ORANGE }}>· @eilaradam</span>
  </div>
);

const tamData = (d: string) => (d.length <= 6 ? 54 : d.length <= 12 ? 42 : 34);

const Tarja: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ display: "inline-block", background: ORANGE, transform: "rotate(-2deg)", padding: "16px 40px", boxShadow: "0 14px 30px rgba(22,65,236,.28)" }}>
    <div style={{ color: "#fff", fontFamily: FONTE, fontSize: 44, fontWeight: 900, lineHeight: 1.08, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" }}>{texto}</div>
  </div>
);

const Slot: React.FC<{ label: string; src?: string; foco?: string; fit?: string }> = ({ label, src, foco, fit }) => {
  if (src && fit === "contain")
    return (
      <div style={{ flex: 1, height: 224, borderRadius: 16, overflow: "hidden", position: "relative", background: "#DCD8D1" }}>
        {/* fundo desfocado preenchendo as laterais */}
        <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(16px)", transform: "scale(1.15)", opacity: 0.65 }} />
        {/* foto inteira (mostra as 2 pessoas) */}
        <Img src={staticFile(src)} style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      </div>
    );
  if (src)
    return (
      <div style={{ flex: 1, height: 224, borderRadius: 16, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: foco ?? "center", display: "block" }} />
      </div>
    );
  return (
    <div style={{ flex: 1, height: 224, borderRadius: 16, background: "#E7E0D2", border: "3px dashed rgba(22,65,236,.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 14, textAlign: "center" }}>
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke={ORANGE} strokeWidth="1.8" />
        <circle cx="8.5" cy="10" r="2" fill={ORANGE} />
        <path d="M4 18l5-5 3.5 3.5L16 12l4 4.5" stroke={ORANGE} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      </svg>
      <div style={{ fontFamily: FONTE, fontSize: 22, fontWeight: 700, color: "#8A7B63", lineHeight: 1.15 }}>{label}</div>
      <div style={{ fontFamily: FONTE, fontSize: 17, fontWeight: 600, color: "#AC9C82" }}>sua foto aqui</div>
    </div>
  );
};

export const CarrosselAgosto: React.FC<AgostoProps> = ({ indice }) => {
  const total = CARDS.length + 2;
  const kind = indice === 0 ? "capa" : indice <= CARDS.length ? "card" : "cta";
  const card = kind === "card" ? CARDS[indice - 1] : null;

  return (
    <AbsoluteFill style={{ background: CREME, fontFamily: FONTE, color: INK }}>
      <Textura />

      {kind === "capa" && (
        <div style={{ padding: "60px 76px 78px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ alignSelf: "stretch" }}><Handles /></div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ background: ORANGE, color: "#fff", fontWeight: 800, fontSize: 26, letterSpacing: 4, padding: "10px 24px", transform: "rotate(-2deg)", textTransform: "uppercase", boxShadow: "0 12px 24px rgba(22,65,236,.26)" }}>☀ Guia de Agosto</div>
            <div style={{ marginTop: 46, fontSize: 96, fontWeight: 900, lineHeight: 1.04, letterSpacing: -2 }}>
              <span style={{ color: ORANGE }}>4</span> propostas para enviar em{" "}
              <span style={{ color: ORANGE, position: "relative" }}>AGOSTO<span style={{ position: "absolute", left: 0, right: 0, bottom: -8, height: 10, borderRadius: 999, background: ORANGE }} /></span>
            </div>
            <div style={{ marginTop: 42, display: "inline-block", background: AZUL, color: "#fff", fontSize: 40, fontWeight: 800, lineHeight: 1.25, padding: "20px 30px", transform: "rotate(-1.5deg)" }}>
              e começar o mês já<br />fechando Publi e UGC
            </div>
          </div>
          <Rodape />
        </div>
      )}

      {kind === "card" && card && (
        <div style={{ padding: "56px 70px 60px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ alignSelf: "stretch" }}><Handles /></div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%" }}>
            <div style={{ fontSize: tamData(card.data), fontWeight: 900, letterSpacing: 1 }}>{card.data}</div>
            <div style={{ marginTop: 6 }}><Tarja texto={card.nome} /></div>
            <div style={{ marginTop: 30, fontSize: 31, lineHeight: 1.32, fontWeight: 500, maxWidth: 870 }}><Rico texto={card.para} /></div>
            <div style={{ marginTop: 14, fontSize: 30, lineHeight: 1.28, color: ORANGE, fontWeight: 800, maxWidth: 870 }}>{card.ugc}</div>
            <div style={{ marginTop: 14, background: SOFT, borderRadius: 18, padding: "16px 26px", maxWidth: 870 }}>
              <span style={{ color: ORANGE, fontWeight: 900, fontSize: 25 }}>Dica: </span>
              <span style={{ fontSize: 25, lineHeight: 1.26, fontWeight: 500 }}>{card.dica}</span>
            </div>
            <div style={{ marginTop: 30, width: "100%" }}>
              <div style={{ fontSize: 23, letterSpacing: 2, color: MUT, fontWeight: 700, marginBottom: 14 }}>ideias de conteúdo:</div>
              <div style={{ display: "flex", gap: 16 }}>
                {card.ideias.map((l, i) => (
                  <Slot key={i} label={l} src={card.imagens?.[i]} foco={card.focos?.[i]} fit={card.fits?.[i]} />
                ))}
              </div>
            </div>
          </div>
          <Rodape />
        </div>
      )}

      {kind === "cta" && (
        <div style={{ padding: "56px 60px 60px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ alignSelf: "stretch" }}><Handles /></div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 0.98 }}>
              Bora fechar <span style={{ fontStyle: "italic", color: ORANGE }}>Publi &amp; UGC?</span>
            </div>
            <div style={{ position: "relative", marginTop: 44, transform: "rotate(-2deg)", maxWidth: 860 }}>
              {[{ top: -9, left: -9 }, { top: -9, right: -9 }, { bottom: -9, left: -9 }, { bottom: -9, right: -9 }].map((p, i) => (
                <div key={i} style={{ position: "absolute", width: 18, height: 18, background: AZUL, ...p }} />
              ))}
              <div style={{ background: AZUL, color: "#fff", padding: "30px 46px", fontSize: 32, lineHeight: 1.32, fontWeight: 600 }}>
                Comenta <b style={{ fontWeight: 900 }}>AGOSTO</b> aqui que eu te mando as oportunidades mais quentes no seu <b style={{ fontWeight: 900 }}>privado</b>.
              </div>
            </div>
            <div style={{ marginTop: 36, fontSize: 32, fontWeight: 600, color: MUT, maxWidth: 740 }}>
              E <b style={{ color: INK, fontWeight: 900 }}>salva</b> esse carrossel pra usar o mês todo como guia.
            </div>
            <div style={{ marginTop: 34, display: "inline-flex", alignItems: "center", gap: 14, background: ORANGE, color: "#fff", fontWeight: 900, fontSize: 42, padding: "20px 46px", borderRadius: 999, transform: "rotate(-1.5deg)", boxShadow: "0 16px 32px rgba(22,65,236,.32)" }}>
              <svg width={34} height={34} viewBox="0 0 24 24" fill="none"><path d="M4 4h16v12H8l-4 4V4z" fill="#fff" /><circle cx="9" cy="10" r="1.3" fill={ORANGE} /><circle cx="12.5" cy="10" r="1.3" fill={ORANGE} /><circle cx="16" cy="10" r="1.3" fill={ORANGE} /></svg>
              AGOSTO
            </div>
          </div>
          <Rodape />
        </div>
      )}

      <div style={{ position: "absolute", bottom: 26, left: 0, right: 0, display: "flex", gap: 9, justifyContent: "center" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: i === indice ? 26 : 10, height: 10, borderRadius: 999, background: i === indice ? ORANGE : "rgba(43,38,34,.2)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
