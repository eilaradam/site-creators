import { AbsoluteFill } from "remotion";
import { z } from "zod";

/* =========================================================================
   CARROSSEL "OS 4 TIPOS DE CREATOR" — feed 1080x1350 (4:5)
   Mesmo estilo da composição ConselhoDigitando (paleta EITA Mentora Virtual:
   verde-menta principal + detalhes laranja/coral + navy).
   Cada card é renderizado como uma imagem (still). Troque o card pela prop
   `indice` (0 = capa ... 5 = CTA).
   ========================================================================= */
export const carrosselSchema = z.object({
  indice: z.number(),
});

export type CarrosselProps = z.infer<typeof carrosselSchema>;

/* ---------- Paleta da marca ---------- */
const VERDE = "#2BD49B";
const VERDE_ESCURO = "#0C3A2C";
const LARANJA = "#E8623D";
const NAVY = "#16314A";
const FUNDO_A = "#CDEBF6";
const FUNDO_B = "#9FCBE6";

/* ---------- Conteúdo dos cards ---------- */
type Marca = { t: string; cor: string };

const CARDS: Array<{
  tipo: "capa" | "tipo" | "cta";
  n?: string;
  etiqueta: string;
  titulo: string;
  subtitulo?: string;
  corpo?: string;
  realces?: Marca[];
}> = [
  {
    tipo: "capa",
    etiqueta: "EITA • CREATORS",
    titulo: "Os 4 tipos de creator que as marcas mais pagam em 2026",
    subtitulo: "Descobre qual é o seu e entra pra minha próxima campanha",
    realces: [
      { t: "4 tipos de creator", cor: VERDE },
      { t: "2026", cor: LARANJA },
    ],
  },
  {
    tipo: "tipo",
    n: "01",
    etiqueta: "TIPO 01",
    titulo: "UGC Creator",
    corpo:
      "Você grava, a marca usa. Conteúdo feito pra site, ecommerce e anúncio, sem precisar postar nas suas redes. Recebe o produto, grava com a sua cara, entrega. Esse é o que mais cresce e o que as marcas mais procuram hoje.",
    realces: [
      { t: "Você grava, a marca usa.", cor: VERDE },
      { t: "o que mais cresce", cor: LARANJA },
    ],
  },
  {
    tipo: "tipo",
    n: "02",
    etiqueta: "TIPO 02",
    titulo: "Live Shop Creator",
    corpo:
      "Você vende ao vivo. Apresenta produto, segura a audiência e transforma live em venda. Marca ama porque converte na hora, e quem tem carisma pra câmera se dá muito bem aqui.",
    realces: [
      { t: "Você vende ao vivo.", cor: VERDE },
      { t: "converte na hora", cor: LARANJA },
    ],
  },
  {
    tipo: "tipo",
    n: "03",
    etiqueta: "TIPO 03",
    titulo: "Creator de Criativo pra Ads",
    corpo:
      "Você faz o vídeo que vira anúncio. Aquele criativo de ecommerce que roda na Amazon, no Mercado Livre, no Meta. É técnico, é venda, e é um dos perfis mais bem pagos justamente por isso.",
    realces: [
      { t: "o vídeo que vira anúncio", cor: VERDE },
      { t: "mais bem pagos", cor: LARANJA },
    ],
  },
  {
    tipo: "tipo",
    n: "04",
    etiqueta: "TIPO 04",
    titulo: "Tech Creator",
    corpo:
      "Você traduz tecnologia, aplicativos e produtos digitais pra quem não entende. Review de gadget, app, ferramenta, explicando de um jeito simples. Marca de tech paga bem por quem sabe mostrar o produto funcionando de verdade.",
    realces: [
      { t: "traduz tecnologia", cor: VERDE },
      { t: "paga bem", cor: LARANJA },
    ],
  },
  {
    tipo: "cta",
    etiqueta: "SUA VEZ",
    titulo: "Se encaixou em algum desses, a próxima campanha pode ser sua.",
    corpo:
      "Comenta EU SOU aqui embaixo que eu te mando o formulário pra entrar pro meu time de creators.",
    realces: [{ t: "EU SOU", cor: LARANJA }],
  },
];

export const CarrosselCreators: React.FC<CarrosselProps> = ({ indice }) => {
  const card = CARDS[indice] ?? CARDS[0];
  const total = CARDS.length;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${FUNDO_A} 0%, ${FUNDO_B} 100%)`,
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      <PontosDeFundo />

      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", padding: 72 }}
      >
        <div
          style={{
            position: "relative",
            width: 936,
            minHeight: 1080,
            background: "#FBFEFD",
            borderRadius: 56,
            padding: "76px 70px",
            boxShadow:
              "0 40px 80px rgba(20,49,74,0.18), 0 8px 20px rgba(20,49,74,0.10)",
            border: "2px solid rgba(43,212,155,0.25)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* número-marca d'água (cards de tipo) */}
          {card.tipo === "tipo" && (
            <div
              style={{
                position: "absolute",
                top: 40,
                right: 56,
                fontSize: 200,
                fontWeight: 900,
                lineHeight: 1,
                color: LARANJA,
                opacity: 0.12,
              }}
            >
              {card.n}
            </div>
          )}

          {/* etiqueta verde no topo */}
          <div
            style={{
              alignSelf: "flex-start",
              background: VERDE,
              color: VERDE_ESCURO,
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: 3,
              padding: "12px 26px",
              borderRadius: 999,
              textTransform: "uppercase",
              boxShadow: "0 10px 22px rgba(43,212,155,0.35)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Lampada cor={VERDE_ESCURO} />
            {card.etiqueta}
          </div>

          {/* ---------- CORPO POR TIPO DE CARD ---------- */}
          {card.tipo === "capa" && (
            <div style={{ marginTop: 56, flex: 1 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 92,
                  lineHeight: 1.05,
                  letterSpacing: -2,
                  color: NAVY,
                }}
              >
                <Realce texto={card.titulo} marcas={card.realces ?? []} />
              </div>
              <div
                style={{
                  marginTop: 40,
                  fontSize: 44,
                  lineHeight: 1.3,
                  fontWeight: 600,
                  color: "rgba(22,49,74,0.78)",
                }}
              >
                {card.subtitulo}
              </div>
            </div>
          )}

          {card.tipo === "tipo" && (
            <div style={{ marginTop: 44, flex: 1 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 84,
                  lineHeight: 1.02,
                  letterSpacing: -2,
                  color: NAVY,
                }}
              >
                {card.titulo}
              </div>
              <div
                style={{
                  marginTop: 6,
                  width: 120,
                  height: 10,
                  borderRadius: 999,
                  background: VERDE,
                }}
              />
              <div
                style={{
                  marginTop: 40,
                  fontSize: 46,
                  lineHeight: 1.32,
                  fontWeight: 600,
                  color: NAVY,
                }}
              >
                <Realce texto={card.corpo ?? ""} marcas={card.realces ?? []} />
              </div>
            </div>
          )}

          {card.tipo === "cta" && (
            <div style={{ marginTop: 52, flex: 1 }}>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 76,
                  lineHeight: 1.1,
                  letterSpacing: -1,
                  color: NAVY,
                }}
              >
                {card.titulo}
              </div>
              <div
                style={{
                  marginTop: 44,
                  fontSize: 48,
                  lineHeight: 1.32,
                  fontWeight: 600,
                  color: NAVY,
                }}
              >
                <Realce texto={card.corpo ?? ""} marcas={card.realces ?? []} />
              </div>
              {/* botão "comenta" */}
              <div
                style={{
                  marginTop: 48,
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 16,
                  background: LARANJA,
                  color: "#FFF",
                  fontWeight: 900,
                  fontSize: 44,
                  letterSpacing: 1,
                  padding: "22px 40px",
                  borderRadius: 999,
                  boxShadow: "0 16px 30px rgba(232,98,61,0.35)",
                }}
              >
                💬 EU SOU
              </div>
            </div>
          )}

          {/* rodapé: assinatura + indicador de páginas */}
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Lampada cor={VERDE} grande />
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 34,
                  color: VERDE_ESCURO,
                  letterSpacing: 1,
                }}
              >
                mentora <span style={{ fontWeight: 500 }}>virtual</span>
              </span>
            </div>
            <Paginas total={total} ativo={indice} />
          </div>

          {/* dica de arrastar (capa) */}
          {card.tipo === "capa" && (
            <div
              style={{
                position: "absolute",
                bottom: 150,
                right: 70,
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: LARANJA,
                fontWeight: 800,
                fontSize: 36,
              }}
            >
              arrasta
              <span style={{ fontSize: 48, lineHeight: 1 }}>→</span>
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Pinta trechos do texto com cores (realces). Mantém o resto em navy. */
const Realce: React.FC<{ texto: string; marcas: Marca[] }> = ({
  texto,
  marcas,
}) => {
  let nodes: Array<string | React.ReactNode> = [texto];
  marcas.forEach((m, mi) => {
    const next: Array<string | React.ReactNode> = [];
    nodes.forEach((node, ni) => {
      if (typeof node !== "string") {
        next.push(node);
        return;
      }
      const partes = node.split(m.t);
      partes.forEach((p, pi) => {
        if (p) next.push(p);
        if (pi < partes.length - 1) {
          next.push(
            <span key={`${mi}-${ni}-${pi}`} style={{ color: m.cor }}>
              {m.t}
            </span>
          );
        }
      });
    });
    nodes = next;
  });
  return <>{nodes}</>;
};

/* Indicador de páginas (bolinhas) */
const Paginas: React.FC<{ total: number; ativo: number }> = ({
  total,
  ativo,
}) => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === ativo ? 30 : 12,
          height: 12,
          borderRadius: 999,
          background: i === ativo ? VERDE : "rgba(22,49,74,0.20)",
        }}
      />
    ))}
  </div>
);

/* Marca: lâmpada simples em SVG (evoca o logo "mentora virtual") */
const Lampada: React.FC<{ cor: string; grande?: boolean }> = ({
  cor,
  grande,
}) => {
  const s = grande ? 36 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.55 1.2 1.3 1.4 2.1l.2.8h4.8l.2-.8c.2-.8.7-1.55 1.4-2.1A6.5 6.5 0 0 0 12 2.5Z"
        fill={cor}
      />
      <rect x="9" y="18.2" width="6" height="2.2" rx="1.1" fill={cor} />
      <rect x="9.8" y="21" width="4.4" height="1.8" rx="0.9" fill={cor} />
    </svg>
  );
};

/* Pontinhos suaves de fundo (verde + laranja) */
const PontosDeFundo: React.FC = () => {
  const pontos = [];
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 40; i++) {
    const cx = rnd() * 1080;
    const cy = rnd() * 1350;
    const r = 3 + rnd() * 7;
    const cor = i % 3 === 0 ? LARANJA : VERDE;
    pontos.push(
      <circle key={i} cx={cx} cy={cy} r={r} fill={cor} opacity={0.13} />
    );
  }
  return (
    <AbsoluteFill>
      <svg width={1080} height={1350} viewBox="0 0 1080 1350">
        {pontos}
      </svg>
    </AbsoluteFill>
  );
};
