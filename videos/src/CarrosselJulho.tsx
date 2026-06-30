import { AbsoluteFill } from "remotion";
import { z } from "zod";

/* =========================================================================
   CARROSSEL JULHO — "As 7 oportunidades de UGC de julho"
   Template "Lara Dam | UGC Manager": fundo creme, tarja laranja no título,
   corpo escuro, faixa azul de "Dica de abordagem", 3 fotos e rodapé.
   Feed 1080x1350 (4:5). Cada lâmina é renderizada como still pela prop
   `indice` (0 = capa, 1..7 = datas, 8 = CTA).
   As fotos são SLOTS marcados (troque pelas suas imagens no Canva).
   ========================================================================= */
export const julhoSchema = z.object({ indice: z.number() });
export type JulhoProps = z.infer<typeof julhoSchema>;

/* ---------- Paleta do template ---------- */
const CREME = "#EFEAE1";
const LARANJA = "#F4541E";
const AZUL = "#1E45E6";
const TEXTO = "#1E2230";

const FONTE = "Helvetica, Arial, sans-serif";

/* ---------- Conteúdo ---------- */
type Card = {
  titulo: string;
  paras: string[]; // use **negrito** para destacar
  ugc: string; // linha "O UGC é..." (sempre em negrito)
  dica: string; // texto após "Dica de abordagem:"
  fotos: [string, string, string]; // legendas dos slots de foto
};

const CARDS: Card[] = [
  {
    titulo: "Copa do Mundo, a final (19/07)",
    paras: [
      "Julho é o ápice da Copa: as quartas, semis e **a grande final no dia 19**. O Brasil inteiro em modo futebol, e as marcas precisam de conteúdo no ritmo do jogo. Bares, cervejarias, apps de delivery, eletrônicos (TV e som), moda esportiva, petiscos.",
    ],
    ugc: "O UGC é a reação: torcida, mesa de bar, grito de gol, galera reunida.",
    dica: "marcas de cerveja, snack e delivery precisam de conteúdo em VOLUME nessa fase. Ofereça um pacote reativo, vídeos rápidos a cada jogo decisivo, proposta que quase ninguém faz.",
    fotos: ["torcida na arquibancada", "mesa de bar com a galera", "petisco verde-amarelo"],
  },
  {
    titulo: "Harry Styles em São Paulo (17, 18, 21 e 24/07)",
    paras: [
      "Quatro shows lotados no MorumBIS trazem **milhares de pessoas pra São Paulo**. Isso move moda, beleza, hotel, transporte, restaurante e a cidade toda. É um evento com público apaixonado e ávido por registrar tudo.",
    ],
    ugc: "O UGC aqui é a experiência: GRWM pro show, look do dia, vlog de São Paulo, a viagem pra ver o Harry.",
    dica: "marcas de moda, beleza e hotéis em SP querem pegar carona em eventos assim, mas quase ninguém oferece UGC de “indo pro show”. Chega com um pacote de experiência antes mesmo de te pedirem.",
    fotos: ["GRWM pro show", "look do dia", "vlog em São Paulo"],
  },
  {
    titulo: "As estreias de cinema do mês",
    paras: [
      "Julho é mês de blockbuster: **Minions & Monstros (02/07)**, **Moana live-action (09/07)**, **A Odisseia do Nolan (16/07)** e **Homem-Aranha: Um Novo Dia (30/07)**, que teve o trailer mais visto da história. Cinema, pipoca e snacks, moda temática, papelaria, brinquedo e colecionável.",
    ],
    ugc: "O UGC é o ritual: “vem ao cinema comigo”, look inspirado no filme, reação na estreia, unboxing de produto licenciado.",
    dica: "marcas de snack, moda e papelaria podem surfar cada estreia. Monte um calendário de conteúdo amarrando produto a cada lançamento, em vez de um vídeo solto.",
    fotos: ["vem ao cinema comigo", "look temático do filme", "unboxing licenciado"],
  },
  {
    titulo: "Dia do Amigo e da Amizade (20/07)",
    paras: [
      "Data de celebrar quem a gente ama, e isso vira presente, rolê e experiência. Marcas de presente, restaurante, moda, app e experiências entram forte.",
    ],
    ugc: "O UGC é o afeto real: marcar a melhor amiga, o presente pra quem você ama, o rolê da turma.",
    dica: "marcas de presente e restaurantes raramente recebem proposta de UGC pra essa data. Ofereça um conteúdo de “presenteie quem você ama” com a cara da marca.",
    fotos: ["a melhor amiga", "presente afetivo", "rolê da turma"],
  },
  {
    titulo: "Dia dos Avós (26/07)",
    paras: [
      "Uma das datas **mais emocionais do ano**, e das mais subaproveitadas. Presentes afetivos, moda confortável, alimentos, saúde e registro de momento. Conteúdo que emociona converte muito.",
    ],
    ugc: "O UGC aqui é a conexão de verdade: neto e avó, a homenagem, o presente que faz chorar.",
    dica: "marcas de presente, alimento e moda confortável quase nunca pensam nessa data. Chega com um roteiro afetivo pronto, é o tipo de conteúdo que viraliza por emoção.",
    fotos: ["neto e avó", "a homenagem", "presente que emociona"],
  },
  {
    titulo: "Férias escolares e inverno (mês inteiro)",
    paras: [
      "Julho é férias e frio, então o conteúdo é **lifestyle e família**. Turismo, parques, moda de inverno, cobertor e pijama, cafeteria, chocolate quente, fondue.",
    ],
    ugc: "O UGC é o aconchego e o passeio: gente real com frio real, viagem em família, dia gostoso em casa.",
    dica: "marcas de conforto (pijama, cobertor) e turismo vendem muito nessa época e precisam de conteúdo que não pareça catálogo. UGC resolve exatamente isso.",
    fotos: ["viagem em família", "enrolada no cobertor", "chocolate quente"],
  },
  {
    titulo: "Julho Amarelo e Julho Verde (mês inteiro)",
    paras: [
      "Dois meses de conscientização: **Julho Amarelo** (prevenção das hepatites virais) e **Julho Verde** (prevenção do câncer de cabeça e pescoço). Marcas de saúde, farmácia, clínicas e ONGs comunicam a causa.",
    ],
    ugc: "O UGC aqui é informação com verdade, conteúdo que conscientiza sem soar comercial.",
    dica: "é terreno sensível, então chega com cuidado. Marcas de saúde precisam de conteúdo humano sobre a causa, mas que respeite o tema. Sensibilidade aqui é o seu diferencial.",
    fotos: ["conteúdo de saúde", "registro humano", "causa com verdade"],
  },
];

const DATAS_CAPA = ["02", "16", "17", "19", "20", "24", "26", "30"];

/* ========================================================================= */
export const CarrosselJulho: React.FC<JulhoProps> = ({ indice }) => {
  const TOTAL = CARDS.length + 2; // capa + datas + cta

  if (indice === 0) return <Capa total={TOTAL} />;
  if (indice >= 1 && indice <= CARDS.length)
    return <CardData card={CARDS[indice - 1]} indice={indice} total={TOTAL} />;
  return <CTA indice={TOTAL - 1} total={TOTAL} />;
};

/* ---------- CAPA ---------- */
const Capa: React.FC<{ total: number }> = ({ total }) => (
  <AbsoluteFill style={{ background: CREME, fontFamily: FONTE }}>
    {/* números de datas flutuando ao fundo */}
    {DATAS_CAPA.map((d, i) => {
      const xs = [70, 880, 120, 820, 60, 900, 150, 840];
      const ys = [150, 120, 1120, 1180, 640, 560, 360, 980];
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: xs[i],
            top: ys[i],
            fontSize: 120,
            fontWeight: 900,
            color: TEXTO,
            opacity: 0.06,
            letterSpacing: -4,
          }}
        >
          {d}
        </div>
      );
    })}

    <AbsoluteFill
      style={{ justifyContent: "center", alignItems: "center", padding: 80 }}
    >
      <div
        style={{
          width: 920,
          background: "#FFFFFF",
          borderRadius: 48,
          padding: "92px 84px",
          boxShadow: "0 40px 90px rgba(30,34,48,0.18)",
          position: "relative",
        }}
      >
        <LogoM />

        <div style={{ marginTop: 64 }}>
          <div
            style={{
              fontSize: 110,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -3,
              color: LARANJA,
            }}
          >
            As 7 oportunidades de UGC de{" "}
            <span
              style={{
                borderBottom: `10px solid ${LARANJA}`,
                paddingBottom: 4,
              }}
            >
              julho
            </span>
          </div>

          {/* faixa azul de subtítulo */}
          <div
            style={{
              marginTop: 48,
              display: "inline-block",
              background: AZUL,
              color: "#FFFFFF",
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: -0.5,
              padding: "20px 30px",
              transform: "rotate(-1.5deg)",
            }}
          >
            pra você começar o mês já
            <br />
            fechando Publi e UGC
          </div>
        </div>

        <Rodape posicao="dentro" />
      </div>
    </AbsoluteFill>

    <Paginas total={total} ativo={0} />
  </AbsoluteFill>
);

/* ---------- CARD DE DATA ---------- */
const CardData: React.FC<{ card: Card; indice: number; total: number }> = ({
  card,
  indice,
  total,
}) => (
  <AbsoluteFill
    style={{
      background: CREME,
      fontFamily: FONTE,
      padding: "70px 72px 56px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Cabecalho />

    {/* tarja laranja do título */}
    <div
      style={{
        marginTop: 26,
        marginLeft: -90,
        marginRight: -40,
        background: LARANJA,
        transform: "rotate(-1.8deg)",
        padding: "16px 90px",
        alignSelf: "flex-start",
        boxShadow: "0 14px 30px rgba(244,84,30,0.28)",
      }}
    >
      <div
        style={{
          color: "#FFFFFF",
          fontSize: 48,
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: -1,
        }}
      >
        {card.titulo}
      </div>
    </div>

    {/* corpo */}
    <div style={{ marginTop: 32 }}>
      {card.paras.map((p, i) => (
        <p
          key={i}
          style={{
            margin: 0,
            fontSize: 34,
            lineHeight: 1.3,
            color: TEXTO,
            fontWeight: 500,
          }}
        >
          <Rico texto={p} />
        </p>
      ))}
      <p
        style={{
          marginTop: 22,
          marginBottom: 0,
          fontSize: 35,
          lineHeight: 1.28,
          color: TEXTO,
          fontWeight: 800,
        }}
      >
        <Rico texto={realceUGC(card.ugc)} />
      </p>
    </div>

    {/* 3 fotos (slots) */}
    <div
      style={{
        marginTop: "auto",
        display: "flex",
        gap: 22,
        justifyContent: "center",
      }}
    >
      {card.fotos.map((legenda, i) => (
        <SlotFoto key={i} legenda={legenda} />
      ))}
    </div>

    {/* faixa azul "Dica de abordagem" */}
    <div
      style={{
        marginTop: 28,
        marginLeft: -100,
        marginRight: -90,
        background: AZUL,
        transform: "rotate(-2deg)",
        padding: "22px 100px",
        boxShadow: "0 16px 34px rgba(30,69,230,0.28)",
      }}
    >
      <div
        style={{
          color: "#FFFFFF",
          fontSize: 30,
          lineHeight: 1.28,
          fontWeight: 500,
        }}
      >
        <span style={{ fontWeight: 900 }}>Dica de abordagem:</span> {card.dica}
      </div>
    </div>

    <div style={{ marginTop: 22, marginBottom: 18 }}>
      <Rodape posicao="fora" />
    </div>

    <Paginas total={total} ativo={indice} />
  </AbsoluteFill>
);

/* ---------- CTA ---------- */
const CTA: React.FC<{ indice: number; total: number }> = ({
  indice,
  total,
}) => (
  <AbsoluteFill
    style={{
      background: CREME,
      fontFamily: FONTE,
      padding: "80px 80px 56px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Cabecalho />

    <div style={{ marginTop: 70 }}>
      <div
        style={{
          fontSize: 78,
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: -2,
          color: LARANJA,
        }}
      >
        Julho tá cheio de oportunidade pra fechar{" "}
        <span style={{ color: TEXTO }}>Publi e UGC.</span>
      </div>

      <div
        style={{
          marginTop: 46,
          marginLeft: -100,
          marginRight: -60,
          background: AZUL,
          transform: "rotate(-1.6deg)",
          padding: "24px 100px",
          boxShadow: "0 16px 34px rgba(30,69,230,0.28)",
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: 40,
            lineHeight: 1.28,
            fontWeight: 700,
          }}
        >
          Salva esse carrossel pra não perder nenhuma data e usar o mês todo
          como guia.
        </div>
      </div>

      <p
        style={{
          marginTop: 50,
          fontSize: 40,
          lineHeight: 1.34,
          color: TEXTO,
          fontWeight: 500,
        }}
      >
        E pra ficar por dentro das novidades de julho em primeira mão, comenta{" "}
        <span style={{ fontWeight: 900, color: LARANJA }}>NOVIDADES</span> aqui
        embaixo que eu te mando no privado, com as oportunidades mais quentes pra
        você se antecipar e chegar antes nas marcas.
      </p>

      <div
        style={{
          marginTop: 50,
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          background: LARANJA,
          color: "#FFFFFF",
          fontWeight: 900,
          fontSize: 46,
          letterSpacing: 1,
          padding: "24px 44px",
          borderRadius: 999,
          boxShadow: "0 18px 34px rgba(244,84,30,0.34)",
        }}
      >
        💬 NOVIDADES
      </div>
    </div>

    <div style={{ marginTop: "auto" }}>
      <Rodape posicao="fora" />
    </div>

    <Paginas total={total} ativo={indice} />
  </AbsoluteFill>
);

/* ===================== PEÇAS REUTILIZÁVEIS ===================== */

/* Cabeçalho "LARA DAM | UGC MANAGER" */
const Cabecalho: React.FC = () => (
  <div
    style={{
      textAlign: "center",
      fontSize: 30,
      letterSpacing: 3,
      color: TEXTO,
      fontWeight: 500,
    }}
  >
    LARA DAM <span style={{ opacity: 0.5 }}>|</span>{" "}
    <span style={{ fontWeight: 900 }}>UGC MANAGER</span>
  </div>
);

/* Rodapé "Lara Dam | @meumanager" */
const Rodape: React.FC<{ posicao: "dentro" | "fora" }> = ({ posicao }) => (
  <div
    style={{
      marginTop: posicao === "dentro" ? 70 : 0,
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontSize: 30,
      color: TEXTO,
      fontWeight: 600,
    }}
  >
    <span style={{ fontWeight: 900 }}>Lara Dam</span>
    <span style={{ opacity: 0.4 }}>|</span>
    <span style={{ color: LARANJA, fontWeight: 800 }}>@meumanager</span>
  </div>
);

/* Slot de foto (placeholder pra trocar pela imagem real) */
const SlotFoto: React.FC<{ legenda: string }> = ({ legenda }) => (
  <div
    style={{
      width: 280,
      height: 250,
      borderRadius: 18,
      background: "#E4DECF",
      border: "3px dashed rgba(244,84,30,0.55)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      padding: 16,
      textAlign: "center",
    }}
  >
    <svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <rect
        x="2.5"
        y="4.5"
        width="19"
        height="15"
        rx="2.5"
        stroke={LARANJA}
        strokeWidth="1.8"
      />
      <circle cx="8.5" cy="10" r="2" fill={LARANJA} />
      <path
        d="M4 18l5-5 3.5 3.5L16 12l4 4.5"
        stroke={LARANJA}
        strokeWidth="1.8"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
    <div style={{ fontSize: 25, fontWeight: 700, color: "#7A6B53", lineHeight: 1.15 }}>
      {legenda}
    </div>
    <div style={{ fontSize: 19, fontWeight: 600, color: "#A99A80" }}>
      sua foto aqui
    </div>
  </div>
);

/* Logo "M" do @meumanager (quadrado gradiente) */
const LogoM: React.FC = () => (
  <div
    style={{
      width: 104,
      height: 104,
      borderRadius: 26,
      background: "linear-gradient(135deg, #7A3CF0 0%, #2B5BF0 45%, #F4541E 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 14px 30px rgba(43,91,240,0.30)",
    }}
  >
    <span
      style={{
        color: "#FFFFFF",
        fontSize: 70,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: -2,
      }}
    >
      M
    </span>
  </div>
);

/* Indicador de páginas (bolinhas) no rodapé do canvas */
const Paginas: React.FC<{ total: number; ativo: number }> = ({
  total,
  ativo,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 26,
      left: 0,
      right: 0,
      display: "flex",
      gap: 9,
      justifyContent: "center",
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === ativo ? 26 : 10,
          height: 10,
          borderRadius: 999,
          background: i === ativo ? LARANJA : "rgba(30,34,48,0.22)",
        }}
      />
    ))}
  </div>
);

/* Texto com **negrito** */
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

/* a linha "O UGC..." inteira em negrito: garante que não tenha ** solto */
function realceUGC(s: string): string {
  return s.replace(/\*\*/g, "");
}
