import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/* =========================================================================
   TERMÔMETRO DE ARDÊNCIA 🌶️  — variações
   variante 1 = clássico (claro) | 2 = neon escuro | 3 = barra horizontal |
   4 = a própria pimenta enchendo.  1080x1920.
   ========================================================================= */
export const termometroSchema = z.object({
  fundo: z.string().optional(),
  variante: z.number().optional(),
});
export type TermometroProps = z.infer<typeof termometroSchema>;

const FONTE = "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif";

const CX = 540;
const TUBE_W = 92;
const TOP_Y = 560;
const BULB_CY = 1500;
const BULB_R = 122;
const FILL_BOTTOM = 1480;

type Tema = {
  bg: string;
  titleTop: string;
  title: string;
  tube: string;
  stroke: string;
  scale: string;
  stops: [string, string][];
  off: string;
  shu: string;
  shuSub: string;
  highlight: string;
  neon?: boolean;
};

const TEMAS: Record<number, Tema> = {
  1: {
    bg: "linear-gradient(180deg,#FFF5EA 0%,#FFE4D0 55%,#FFCFAE 100%)",
    titleTop: "#B4442A", title: "#C62411", tube: "#FFFFFF", stroke: "#2C2A2E", scale: "#2C2A2E",
    stops: [["0", "#F4C430"], ["0.4", "#F59324"], ["0.72", "#EC3B1A"], ["1", "#B40D12"]],
    off: "rgba(44,42,46,0.25)", shu: "#C62411", shuSub: "#B4442A", highlight: "rgba(255,255,255,0.5)",
  },
  2: {
    bg: "radial-gradient(circle at 50% 26%, #3A1410 0%, #170B0B 72%)",
    titleTop: "#FF9A6A", title: "#FFFFFF", tube: "#2A1E1F", stroke: "#FF6A2A", scale: "#FFB68A",
    stops: [["0", "#FFD23D"], ["0.4", "#FF8A1E"], ["0.72", "#FF3A1A"], ["1", "#FF0836"]],
    off: "rgba(255,220,200,0.18)", shu: "#FFB03A", shuSub: "#FF8A5A", highlight: "rgba(255,255,255,0.55)", neon: true,
  },
};

function useProgress() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 55, mass: 1.1 } });
  return { frame, fps, progress: Math.min(1, Math.max(0, sp)) };
}

const niveis = [
  { y: 1380, t: "suave", c: "#E0A52B" },
  { y: 1150, t: "médio", c: "#F08A1D" },
  { y: 920, t: "picante", c: "#EC5B1E" },
  { y: 700, t: "forte", c: "#E0321F" },
  { y: 585, t: "ARDIDO!", c: "#B40D12" },
];

export const Termometro: React.FC<TermometroProps> = ({ fundo, variante }) => {
  const v = variante ?? 1;
  if (v === 3) return <BarraHorizontal />;
  if (v === 4) return <PimentaEnche />;
  return <Classico fundo={fundo} variante={v} />;
};

/* ---------------- Variante 1/2: termômetro vertical ---------------- */
const Classico: React.FC<{ fundo?: string; variante: number }> = ({ fundo, variante }) => {
  const { frame, fps, progress } = useProgress();
  const t = TEMAS[variante] ?? TEMAS[1];
  const bg = fundo && fundo !== "warm" ? fundo : t.bg;
  const quente = progress > 0.82;

  const wobble = Math.sin((frame / fps) * Math.PI * 2 * 3) * (1 - progress) * 6;
  const fillTopY = interpolate(progress, [0, 1], [FILL_BOTTOM, TOP_Y]) + wobble;
  const shuFmt = Math.round(interpolate(progress, [0, 1], [0, 350000])).toLocaleString("pt-BR");
  const shake = quente ? Math.sin((frame / fps) * Math.PI * 2 * 11) * 5 : 0;
  const pepPop = spring({ frame: frame - 2, fps, config: { damping: 11, stiffness: 160 } });
  const glow = quente ? interpolate(frame, [86, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const glowBase = t.neon ? 0.5 : 0;
  const gTot = Math.min(1, glow + glowBase);

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONTE }}>
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: t.titleTop }}>NÍVEL DE</div>
        <div style={{ fontSize: 92, fontWeight: 900, letterSpacing: -2, color: t.title, lineHeight: 1, textShadow: t.neon ? "0 0 24px rgba(255,90,26,.6)" : "none" }}>ARDÊNCIA</div>
      </div>

      {quente && <Fogo frame={frame} fps={fps} intensidade={gTot} />}

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id={`liq${variante}`} x1="0" y1="1" x2="0" y2="0">
            {t.stops.map((s, i) => <stop key={i} offset={s[0]} stopColor={s[1]} />)}
          </linearGradient>
          <clipPath id={`int${variante}`}><path d={tuboPath(14)} /></clipPath>
          <filter id="neonTube" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path d={tuboPath(0)} fill={t.tube} stroke={t.stroke} strokeWidth={10} filter={t.neon ? "url(#neonTube)" : undefined} />
        <g clipPath={`url(#int${variante})`}>
          <rect x={CX - 120} y={fillTopY} width={240} height={2000} fill={`url(#liq${variante})`} />
          <circle cx={CX} cy={BULB_CY} r={BULB_R} fill={`url(#liq${variante})`} />
        </g>
        {niveis.map((n, i) => (
          <line key={i} x1={CX + TUBE_W / 2} y1={n.y} x2={CX + TUBE_W / 2 + 34} y2={n.y} stroke={t.scale} strokeWidth={6} strokeLinecap="round" />
        ))}
        <rect x={CX - TUBE_W / 2 + 14} y={TOP_Y - 10} width={16} height={900} rx={8} fill={t.highlight} opacity={0.5} />
      </svg>

      {niveis.map((n, i) => {
        const on = interpolate(fillTopY, [n.y - 10, n.y + 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) > 0.5;
        return (
          <div key={i} style={{ position: "absolute", left: CX + TUBE_W / 2 + 54, top: n.y - 34, fontSize: n.t === "ARDIDO!" ? 58 : 46, fontWeight: 900, color: on ? n.c : t.off, display: "flex", alignItems: "center", gap: 12, textShadow: on && t.neon ? "0 0 16px rgba(255,100,40,.7)" : "none" }}>
            {n.t}{n.t === "ARDIDO!" && on && <span style={{ fontSize: 50 }}>🔥</span>}
          </div>
        );
      })}

      <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 80, fontWeight: 900, color: t.shu, letterSpacing: -2, textShadow: t.neon ? "0 0 20px rgba(255,160,60,.6)" : "none" }}>{shuFmt}</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: t.shuSub }}>SHU · HABANERO</div>
      </div>

      <div style={{ position: "absolute", top: 300, left: CX, transform: `translate(-50%,0) rotate(${shake}deg) scale(${interpolate(pepPop, [0, 1], [0, 1])})`, filter: gTot > 0 ? `drop-shadow(0 0 ${30 * gTot}px rgba(255,90,20,${0.95 * gTot}))` : "none" }}>
        <Habanero />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Variante 3: barra horizontal ---------------- */
const BarraHorizontal: React.FC = () => {
  const { frame, fps, progress } = useProgress();
  const quente = progress > 0.82;
  const BX = 110, BY = 980, BW = 860, BH = 90;
  const fillW = BW * progress;
  const shuFmt = Math.round(interpolate(progress, [0, 1], [0, 350000])).toLocaleString("pt-BR");
  const pepPop = spring({ frame: frame - 2, fps, config: { damping: 11, stiffness: 160 } });
  const shake = quente ? Math.sin((frame / fps) * Math.PI * 2 * 11) * 5 : 0;
  const glow = quente ? 1 : 0;
  const segs = ["suave", "médio", "picante", "forte", "ARDIDO!"];

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#FFF5EA 0%,#FFE0C6 100%)", fontFamily: FONTE }}>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 10, color: "#B4442A" }}>QUÃO ARDIDA?</div>
        <div style={{ fontSize: 100, fontWeight: 900, letterSpacing: -3, color: "#C62411", lineHeight: 1.05 }}>HABANERO</div>
      </div>

      {quente && <Fogo frame={frame} fps={fps} intensidade={glow} baseYover={560} />}
      <div style={{ position: "absolute", top: 560, left: CX, transform: `translate(-50%,0) rotate(${shake}deg) scale(${interpolate(pepPop, [0, 1], [0, 1]) * 1.4})`, filter: glow ? "drop-shadow(0 0 36px rgba(255,90,20,.9))" : "none" }}>
        <Habanero />
      </div>

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="barg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F4C430" /><stop offset="0.45" stopColor="#F59324" /><stop offset="0.78" stopColor="#EC3B1A" /><stop offset="1" stopColor="#B40D12" />
          </linearGradient>
          <clipPath id="barclip"><rect x={BX} y={BY} width={BW} height={BH} rx={BH / 2} /></clipPath>
        </defs>
        {/* trilho */}
        <rect x={BX} y={BY} width={BW} height={BH} rx={BH / 2} fill="#EBD9C6" stroke="#2C2A2E" strokeWidth={8} />
        {/* preenchimento */}
        <g clipPath="url(#barclip)"><rect x={BX} y={BY} width={fillW} height={BH} fill="url(#barg)" /></g>
        {/* divisórias dos 5 segmentos */}
        {[1, 2, 3, 4].map((i) => <line key={i} x1={BX + (BW / 5) * i} y1={BY} x2={BX + (BW / 5) * i} y2={BY + BH} stroke="#fff" strokeWidth={4} opacity={0.7} />)}
        {/* marcador no fim do preenchimento */}
        <circle cx={BX + fillW} cy={BY + BH / 2} r={26} fill="#fff" stroke="#2C2A2E" strokeWidth={7} />
      </svg>

      {/* rótulos dos segmentos */}
      {segs.map((s, i) => {
        const on = progress >= (i + 0.5) / 5;
        return (
          <div key={i} style={{ position: "absolute", top: BY + BH + 24, left: BX + (BW / 5) * i, width: BW / 5, textAlign: "center", fontSize: s === "ARDIDO!" ? 34 : 30, fontWeight: 900, color: on ? niveis[i].c : "rgba(44,42,46,0.28)" }}>{s}</div>
        );
      })}

      <div style={{ position: "absolute", top: 1300, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 120, fontWeight: 900, color: "#C62411", letterSpacing: -3 }}>{shuFmt}</div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: 8, color: "#B4442A" }}>SCOVILLE (SHU)</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Variante 4: a própria pimenta enche ---------------- */
const PimentaEnche: React.FC = () => {
  const { frame, fps, progress } = useProgress();
  const quente = progress > 0.82;
  const shuFmt = Math.round(interpolate(progress, [0, 1], [0, 350000])).toLocaleString("pt-BR");
  const glow = quente ? 1 : 0;
  // pimenta grande centralizada, viewBox 0..120; corpo entre y=28 e y=104
  const pepTop = 560, pepH = 760; // área da pimenta no canvas
  // nível de preenchimento (0 embaixo -> 1 topo) dentro do viewBox do corpo
  const bodyTop = 28, bodyBot = 104;
  const fillYvb = bodyBot - (bodyBot - bodyTop) * progress;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#141018 0%,#2A0E12 100%)", fontFamily: FONTE }}>
      <div style={{ position: "absolute", top: 130, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 10, color: "#FF9A6A" }}>MEDIDOR DE</div>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -2, color: "#fff", textShadow: "0 0 26px rgba(255,90,26,.6)" }}>ARDÊNCIA</div>
      </div>

      {quente && <Fogo frame={frame} fps={fps} intensidade={glow} baseYover={pepTop - 10} />}

      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pf" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFD23D" /><stop offset="0.45" stopColor="#FF8A1E" /><stop offset="0.78" stopColor="#FF3A1A" /><stop offset="1" stopColor="#FF0836" />
          </linearGradient>
          {/* clip = corpo da pimenta, posicionado/escalado no canvas */}
          <clipPath id="pbody" clipPathUnits="userSpaceOnUse">
            <path transform={`translate(${CX - (pepH * 0.42)}, ${pepTop}) scale(${pepH / 120})`} d="M60 28 C 86 30, 100 50, 96 72 C 93 92, 78 104, 60 104 C 42 104, 27 92, 24 72 C 20 50, 34 30, 60 28 Z" />
          </clipPath>
        </defs>

        {/* contorno da pimenta (vazia) */}
        <g transform={`translate(${CX - (pepH * 0.42)}, ${pepTop}) scale(${pepH / 120})`}>
          <path d="M60 10 C 58 22, 66 26, 70 30" stroke="#53A14B" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M52 16 C 60 18, 66 20, 72 18 C 70 26, 62 28, 55 26 Z" fill="#53A14B" />
          <path d="M60 28 C 86 30, 100 50, 96 72 C 93 92, 78 104, 60 104 C 42 104, 27 92, 24 72 C 20 50, 34 30, 60 28 Z" fill="#2A1E22" stroke="#FF6A2A" strokeWidth="2.5" />
        </g>
        {/* preenchimento clipado ao corpo */}
        <g clipPath="url(#pbody)">
          <rect x={CX - pepH} y={pepTop + (pepH / 120) * fillYvb} width={pepH * 2} height={pepH} fill="url(#pf)" />
        </g>
        {/* contorno por cima de novo (brilho) */}
        <g transform={`translate(${CX - (pepH * 0.42)}, ${pepTop}) scale(${pepH / 120})`} style={{ filter: glow ? "drop-shadow(0 0 3px rgba(255,120,40,.9))" : "none" }}>
          <path d="M60 28 C 86 30, 100 50, 96 72 C 93 92, 78 104, 60 104 C 42 104, 27 92, 24 72 C 20 50, 34 30, 60 28 Z" fill="none" stroke="#FF6A2A" strokeWidth="3" />
          <path d="M60 30 C 55 55, 52 85, 58 104" stroke="#B4280A" strokeWidth="3" opacity="0.35" fill="none" />
          <path d="M74 34 C 74 60, 72 88, 66 104" stroke="#B4280A" strokeWidth="3" opacity="0.3" fill="none" />
        </g>
      </svg>

      {/* escala lateral */}
      {niveis.map((n, i) => {
        const yy = pepTop + pepH - (pepH * 0.64) * ((i) / (niveis.length - 1)) - pepH * 0.08;
        const on = progress >= i / (niveis.length);
        return (
          <div key={i} style={{ position: "absolute", left: CX + pepH * 0.47, top: yy, fontSize: n.t === "ARDIDO!" ? 42 : 36, fontWeight: 900, color: on ? "#FF8A4A" : "rgba(255,220,200,0.2)", textShadow: on ? "0 0 14px rgba(255,100,40,.6)" : "none" }}>{n.t}</div>
        );
      })}

      <div style={{ position: "absolute", bottom: 90, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 96, fontWeight: 900, color: "#FFB03A", letterSpacing: -2, textShadow: "0 0 22px rgba(255,160,60,.6)" }}>{shuFmt}</div>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6, color: "#FF8A5A" }}>SHU · HABANERO</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- peças ---------------- */
function tuboPath(inset: number): string {
  const w = TUBE_W / 2 - inset;
  const topY = TOP_Y + inset;
  const r = w;
  const bulbR = BULB_R - inset * 1.1;
  return `M ${CX - w} ${BULB_CY} L ${CX - w} ${topY + r} A ${r} ${r} 0 0 1 ${CX + w} ${topY + r} L ${CX + w} ${BULB_CY} A ${bulbR} ${bulbR} 0 1 1 ${CX - w} ${BULB_CY} Z`;
}

const Habanero: React.FC = () => (
  <svg width={240} height={290} viewBox="0 0 140 170" fill="none" style={{ display: "block" }}>
    <defs>
      <linearGradient id="hbody" x1="0.2" y1="0.05" x2="0.78" y2="1">
        <stop offset="0" stopColor="#FFC24E" />
        <stop offset="0.45" stopColor="#F4841C" />
        <stop offset="1" stopColor="#CC4E0C" />
      </linearGradient>
    </defs>

    {/* cabinho curvo */}
    <path d="M68 52 C 61 36, 59 19, 73 10 C 85 14, 83 28, 78 42" fill="none" stroke="#5C7A30" strokeWidth="9" strokeLinecap="round" />
    <path d="M73 10 C 78 8, 83 9, 86 13" fill="none" stroke="#6E9138" strokeWidth="7" strokeLinecap="round" />

    {/* calyx (cap verde com pontas) */}
    <path d="M70 50 C 60 46, 50 47, 44 51 C 50 58, 60 60, 70 57 C 80 60, 90 58, 96 51 C 90 47, 80 46, 70 50 Z" fill="#6E9138" />

    {/* corpo: lanterna/coração (ombros largos, ponta embaixo) */}
    <path d="M70 52
      C 57 44, 40 46, 32 59
      C 23 72, 23 91, 30 110
      C 37 131, 51 150, 70 160
      C 89 150, 103 131, 110 110
      C 117 91, 117 72, 108 59
      C 100 46, 83 44, 70 52 Z" fill="url(#hbody)" />

    {/* sombras dos lóbulos */}
    <path d="M70 56 C 64 92, 64 128, 70 158" stroke="#B8440C" strokeWidth="4.5" opacity="0.4" fill="none" />
    <path d="M93 60 C 99 92, 95 128, 84 152" stroke="#B8440C" strokeWidth="4.5" opacity="0.34" fill="none" />
    <path d="M47 60 C 41 92, 45 128, 56 152" stroke="#B8440C" strokeWidth="4.5" opacity="0.34" fill="none" />

    {/* brilhos */}
    <path d="M42 66 C 35 82, 35 104, 42 122" stroke="#FFFFFF" strokeWidth="9" opacity="0.3" strokeLinecap="round" fill="none" />
    <ellipse cx="55" cy="70" rx="7" ry="16" fill="#FFFFFF" opacity="0.28" transform="rotate(-10 55 70)" />
  </svg>
);

const Fogo: React.FC<{ frame: number; fps: number; intensidade: number; baseYover?: number }> = ({ frame, fps, intensidade, baseYover = 300 }) => {
  const chamas = [-70, -30, 10, 50, -10];
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {chamas.map((dx, i) => {
        const tt = frame / fps + i * 0.3;
        const h = 90 + Math.sin(tt * 7) * 40;
        const x = CX + dx + Math.sin(tt * 4) * 8;
        const baseY = baseYover;
        const op = (0.5 + 0.5 * Math.sin(tt * 9)) * intensidade;
        return (
          <path key={i} d={`M ${x} ${baseY} C ${x - 26} ${baseY - h * 0.5}, ${x - 10} ${baseY - h * 0.8}, ${x} ${baseY - h} C ${x + 10} ${baseY - h * 0.8}, ${x + 26} ${baseY - h * 0.5}, ${x} ${baseY} Z`} fill={i % 2 ? "#FF7A1A" : "#FFC23D"} opacity={op * 0.85} />
        );
      })}
    </svg>
  );
};
