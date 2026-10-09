import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/* =========================================================================
   TERMÔMETRO DE ARDÊNCIA 🌶️ — enchimento sobe (amarelo→vermelho),
   rótulos de nível, contador de SHU e pimenta habanero no topo que treme
   e solta fogo no máximo. 1080x1920, ~5s.
   fundo: "warm" (padrão) ou cor (ex.: "#00E100" chroma).
   ========================================================================= */
export const termometroSchema = z.object({ fundo: z.string().optional() });
export type TermometroProps = z.infer<typeof termometroSchema>;

const FONTE = "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif";

/* Geometria */
const CX = 540;
const TUBE_W = 92;
const TOP_Y = 560; // topo do enchimento no máximo
const BULB_CY = 1500;
const BULB_R = 122;
const FILL_BOTTOM = 1480;

export const Termometro: React.FC<TermometroProps> = ({ fundo }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const bg =
    fundo && fundo !== "warm"
      ? fundo
      : "linear-gradient(180deg,#FFF5EA 0%,#FFE4D0 55%,#FFCFAE 100%)";

  // progresso do enchimento (0→1)
  const sp = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 55, mass: 1.1 } });
  const progress = Math.min(1, Math.max(0, sp));
  const quente = progress > 0.82;

  // topo do líquido (com leve wobble ao chegar)
  const wobble = Math.sin(frame / fps * Math.PI * 2 * 3) * (1 - progress) * 6;
  const fillTopY = interpolate(progress, [0, 1], [FILL_BOTTOM, TOP_Y]) + wobble;

  // contador SHU
  const shu = Math.round(interpolate(progress, [0, 1], [0, 350000]));
  const shuFmt = shu.toLocaleString("pt-BR");

  // habanero: treme e brilha no quente
  const shake = quente ? Math.sin(frame / fps * Math.PI * 2 * 11) * 5 : 0;
  const pepPop = spring({ frame: frame - 2, fps, config: { damping: 11, stiffness: 160 } });
  const glow = quente ? interpolate(frame, [Math.round(0.82 * 0 + 86), 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  /* rótulos de nível (y, texto, cor) */
  const niveis = [
    { y: 1380, t: "suave", c: "#E0A52B" },
    { y: 1150, t: "médio", c: "#F08A1D" },
    { y: 920, t: "picante", c: "#EC5B1E" },
    { y: 700, t: "forte", c: "#E0321F" },
    { y: 585, t: "ARDIDO!", c: "#B40D12" },
  ];

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONTE }}>
      {/* título */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: "#B4442A" }}>NÍVEL DE</div>
        <div style={{ fontSize: 92, fontWeight: 900, letterSpacing: -2, color: "#C62411", lineHeight: 1 }}>ARDÊNCIA</div>
      </div>

      {/* ondas de calor / fogo saindo no quente */}
      {quente && <Fogo frame={frame} fps={fps} intensidade={glow} />}

      {/* SVG do termômetro */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="liquido" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#F4C430" />
            <stop offset="0.4" stopColor="#F59324" />
            <stop offset="0.72" stopColor="#EC3B1A" />
            <stop offset="1" stopColor="#B40D12" />
          </linearGradient>
          <clipPath id="interior">
            {/* interior do tubo + bulbo */}
            <path d={tuboPath(14)} />
          </clipPath>
        </defs>

        {/* corpo branco do termômetro */}
        <path d={tuboPath(0)} fill="#FFFFFF" stroke="#2C2A2E" strokeWidth={10} />

        {/* líquido (clipado ao interior), desenhado do topo atual até embaixo */}
        <g clipPath="url(#interior)">
          <rect x={CX - 120} y={fillTopY} width={240} height={2000} fill="url(#liquido)" />
          <circle cx={CX} cy={BULB_CY} r={BULB_R} fill="url(#liquido)" />
        </g>

        {/* marcas de escala */}
        {niveis.map((n, i) => (
          <line key={i} x1={CX + TUBE_W / 2} y1={n.y} x2={CX + TUBE_W / 2 + 34} y2={n.y} stroke="#2C2A2E" strokeWidth={6} strokeLinecap="round" />
        ))}
        {/* brilho no tubo */}
        <rect x={CX - TUBE_W / 2 + 14} y={TOP_Y - 10} width={16} height={900} rx={8} fill="#fff" opacity={0.5} />
      </svg>

      {/* rótulos de nível (texto) — acendem conforme o nível passa */}
      {niveis.map((n, i) => {
        const nivelProg = interpolate(fillTopY, [n.y - 10, n.y + 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const on = nivelProg > 0.5;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: CX + TUBE_W / 2 + 54,
              top: n.y - 34,
              fontSize: n.t === "ARDIDO!" ? 58 : 46,
              fontWeight: 900,
              color: on ? n.c : "rgba(44,42,46,0.25)",
              transform: `scale(${on ? 1 : 0.9})`,
              transformOrigin: "left center",
              transition: "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {n.t}
            {n.t === "ARDIDO!" && on && <span style={{ fontSize: 50 }}>🔥</span>}
          </div>
        );
      })}

      {/* contador de SHU */}
      <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: "#C62411", letterSpacing: -2 }}>{shuFmt}</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: "#B4442A" }}>SHU · HABANERO</div>
      </div>

      {/* pimenta habanero no topo */}
      <div
        style={{
          position: "absolute",
          top: 300,
          left: CX,
          transform: `translate(-50%,0) rotate(${shake}deg) scale(${interpolate(pepPop, [0, 1], [0, 1])})`,
          filter: glow > 0 ? `drop-shadow(0 0 ${28 * glow}px rgba(255,90,20,${0.9 * glow}))` : "none",
        }}
      >
        <Habanero />
      </div>
    </AbsoluteFill>
  );
};

/* caminho do tubo + bulbo. `inset` encolhe pra criar o interior do clip. */
function tuboPath(inset: number): string {
  const w = TUBE_W / 2 - inset;
  const topY = TOP_Y + inset;
  const r = w; // topo arredondado
  const bulbR = BULB_R - inset * 1.1;
  // tubo: retângulo arredondado no topo, descendo até o bulbo
  return `
    M ${CX - w} ${BULB_CY}
    L ${CX - w} ${topY + r}
    A ${r} ${r} 0 0 1 ${CX + w} ${topY + r}
    L ${CX + w} ${BULB_CY}
    A ${bulbR} ${bulbR} 0 1 1 ${CX - w} ${BULB_CY}
    Z
  `;
}

/* Pimenta habanero (corpo laranja bulboso + cabinho verde) */
const Habanero: React.FC = () => (
  <svg width={210} height={210} viewBox="0 0 120 120" fill="none" style={{ display: "block" }}>
    {/* cabinho */}
    <path d="M60 10 C 58 22, 66 26, 70 30" stroke="#3E8E3A" strokeWidth="7" strokeLinecap="round" fill="none" />
    <path d="M52 16 C 60 18, 66 20, 72 18 C 70 26, 62 28, 55 26 Z" fill="#53A14B" />
    {/* corpo bulboso (lanterna) */}
    <path d="M60 28
      C 86 30, 100 50, 96 72
      C 93 92, 78 104, 60 104
      C 42 104, 27 92, 24 72
      C 20 50, 34 30, 60 28 Z" fill="#F5841F" />
    {/* lóbulos (sombras) */}
    <path d="M60 30 C 55 55, 52 85, 58 104" stroke="#D9630F" strokeWidth="4" opacity="0.5" fill="none" />
    <path d="M74 34 C 74 60, 72 88, 66 104" stroke="#D9630F" strokeWidth="4" opacity="0.4" fill="none" />
    <path d="M44 36 C 44 62, 46 88, 52 103" stroke="#D9630F" strokeWidth="4" opacity="0.4" fill="none" />
    {/* brilho */}
    <ellipse cx="46" cy="52" rx="10" ry="18" fill="#FFF" opacity="0.35" />
  </svg>
);

/* Fogo/ondas de calor saindo do topo */
const Fogo: React.FC<{ frame: number; fps: number; intensidade: number }> = ({ frame, fps, intensidade }) => {
  const chamas = [-70, -30, 10, 50, -10];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {chamas.map((dx, i) => {
        const t = frame / fps + i * 0.3;
        const h = 90 + Math.sin(t * 7) * 40;
        const x = CX + dx + Math.sin(t * 4) * 8;
        const baseY = 300;
        const op = (0.5 + 0.5 * Math.sin(t * 9)) * intensidade;
        return (
          <path
            key={i}
            d={`M ${x} ${baseY} C ${x - 26} ${baseY - h * 0.5}, ${x - 10} ${baseY - h * 0.8}, ${x} ${baseY - h}
                C ${x + 10} ${baseY - h * 0.8}, ${x + 26} ${baseY - h * 0.5}, ${x} ${baseY} Z`}
            fill={i % 2 ? "#FF7A1A" : "#FFC23D"}
            opacity={op * 0.85}
          />
        );
      })}
    </svg>
  );
};
