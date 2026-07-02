import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/* =========================================================================
   FRASE ANIMADA — "conectar o seu nome a uma das maiores marcas do país"
   Vertical 1080x1920, fundo verde chroma (troque com chroma key).
   variante 1 = Conexão | 2 = Tipografia cinética | 3 = Rede | 4 = 1+2
   ========================================================================= */
export const fraseSchema = z.object({
  variante: z.number(),
  fundo: z.string().optional(),
  transparente: z.boolean().optional(),
});
export type FraseProps = z.infer<typeof fraseSchema>;

const FONTE = "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif";
const GRAD =
  "linear-gradient(95deg, #7C5CE6 0%, #E24F9A 30%, #F0C24E 56%, #B15AE6 80%, #7C5CE6 100%)";
const ESCURO = "#2C2A2E";
const LARANJA = "#F4541E";
const ROXO = "#9B3CF0";

const gradTexto = (frame: number, size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONTE,
  fontWeight: 900,
  fontSize: size,
  lineHeight: 0.95,
  letterSpacing: -2,
  backgroundImage: GRAD,
  backgroundSize: "200% 100%",
  backgroundPosition: `${(frame * 3) % 200}% 0`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  ...extra,
});

const Estrela: React.FC<{ t: number; cor: string }> = ({ t, cor }) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none">
    <path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.8 5.9 20.9 7.2 14.2l-5-4.6 6.8-.8L12 2z" fill={cor} />
  </svg>
);
const Coracao: React.FC<{ t: number }> = ({ t }) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="hc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9B3CF0" />
        <stop offset="1" stopColor="#C24AE0" />
      </linearGradient>
    </defs>
    <path d="M12 21.2l-1.6-1.45C5 14.9 2.2 12.3 2.2 8.9 2.2 6.2 4.3 4.1 7 4.1c1.7 0 3.4.8 4.4 2.2C12.6 4.9 14.3 4.1 16 4.1c2.7 0 4.8 2.1 4.8 4.8 0 3.4-2.8 6-8.2 10.85L12 21.2z" fill="url(#hc)" />
  </svg>
);

/* Linha animada (desenha + pulso de luz que viaja) */
const Linha: React.FC<{ x1: number; y1: number; x2: number; y2: number; ini: number; frame: number; cor: string }> = ({
  x1,
  y1,
  x2,
  y2,
  ini,
  frame,
  cor,
}) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const draw = interpolate(frame, [ini, ini + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pp = interpolate(frame, [ini + 16, ini + 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const px = x1 + (x2 - x1) * pp;
  const py = y1 + (y2 - y1) * pp;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={cor} strokeWidth={9} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
      {pp > 0.02 && pp < 0.98 && <circle cx={px} cy={py} r={16} fill="#fff" opacity={0.95} />}
    </>
  );
};

/* Crachá "SEU NOME" (borda gradiente) */
const CrachaNome: React.FC<{ escala: number; brilho: number }> = ({ escala, brilho }) => (
  <div style={{ transform: `scale(${escala})`, background: GRAD, padding: 7, borderRadius: 34, boxShadow: `0 0 ${40 * brilho}px rgba(155,60,240,${0.6 * brilho})` }}>
    <div style={{ background: "#fff", borderRadius: 28, padding: "30px 52px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: "#A99", textTransform: "uppercase" }}>Seu nome</div>
      <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 72, letterSpacing: -1, backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>@voce.creator</div>
    </div>
  </div>
);

/* Selo "GRANDE MARCA" */
const SeloMarca: React.FC<{ escala: number; brilho: number }> = ({ escala, brilho }) => (
  <div style={{ transform: `scale(${escala})`, background: ESCURO, borderRadius: 34, padding: "34px 54px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, boxShadow: `0 0 ${46 * brilho}px rgba(244,84,30,${0.55 * brilho})` }}>
    <Estrela t={70} cor="#F0C24E" />
    <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 46, letterSpacing: 1, color: "#fff", textTransform: "uppercase" }}>Grande Marca</div>
    <div style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: "#F0C24E", textTransform: "uppercase" }}>do país</div>
  </div>
);

/* Palavra que aparece com pop (kinetic) */
const Palavra: React.FC<{ ini: number; frame: number; fps: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  ini,
  frame,
  fps,
  children,
  style,
}) => {
  const s = spring({ frame: frame - ini, fps, config: { damping: 13, stiffness: 170, mass: 0.8 } });
  const op = interpolate(frame, [ini, ini + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(s, [0, 1], [26, 0]);
  const sc = interpolate(s, [0, 1], [0.7, 1]);
  return (
    <span style={{ display: "inline-block", opacity: op, transform: `translateY(${y}px) scale(${sc})`, ...style }}>{children}</span>
  );
};

export const FraseConexao: React.FC<FraseProps> = ({ variante, fundo, transparente }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg = transparente ? "transparent" : fundo ?? "#00E100";

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONTE }}>
      {(variante === 1 || variante === 4) && <Conexao frame={frame} fps={fps} comTexto={variante === 4} />}
      {variante === 2 && <Kinetic frame={frame} fps={fps} />}
      {variante === 3 && <Rede frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

/* ---------------- Variante 1 / 4: CONEXÃO ---------------- */
const Conexao: React.FC<{ frame: number; fps: number; comTexto: boolean }> = ({ frame, fps, comTexto }) => {
  const nomePop = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 160 } });
  const marcaPop = spring({ frame: frame - 30, fps, config: { damping: 12, stiffness: 160 } });
  const conectou = frame > 128;
  const brilho = conectou ? interpolate(frame, [128, 140], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const bump = conectou ? 1 + Math.sin((frame - 128) / fps * Math.PI * 3) * 0.04 * Math.max(0, 1 - (frame - 128) / 20) : 1;

  const yNome = 620;
  const yMarca = 1360;

  // faísca no ponto de conexão
  const sparkR = conectou ? interpolate(frame, [128, 150], [0, 120], { extrapolateRight: "clamp" }) : 0;
  const sparkOp = conectou ? interpolate(frame, [128, 150], [0.9, 0], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill>
      {comTexto && (
        <div style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", padding: "0 70px" }}>
          <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 60, color: "#fff", lineHeight: 1.1, textShadow: "0 4px 18px rgba(0,0,0,.25)" }}>
            <Palavra ini={0} frame={frame} fps={fps}>É a sua&nbsp;</Palavra>
            <Palavra ini={8} frame={frame} fps={fps} style={{ color: "#F0C24E" }}>chance</Palavra>
            <Palavra ini={16} frame={frame} fps={fps}>&nbsp;de conectar</Palavra>
          </div>
        </div>
      )}

      {/* SVG linha + faísca */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Linha x1={540} y1={yNome + 130} x2={540} y2={yMarca - 150} ini={46} frame={frame} cor={LARANJA} />
        {conectou && <circle cx={540} cy={yMarca - 150} r={sparkR} fill="none" stroke="#fff" strokeWidth={6} opacity={sparkOp} />}
      </svg>

      {/* Crachá nome */}
      <div style={{ position: "absolute", top: yNome, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ opacity: interpolate(frame, [6, 16], [0, 1], { extrapolateRight: "clamp" }) }}>
          <CrachaNome escala={interpolate(nomePop, [0, 1], [0.6, 1]) * bump} brilho={brilho} />
        </div>
      </div>

      {/* Selo marca */}
      <div style={{ position: "absolute", top: yMarca, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ opacity: interpolate(frame, [30, 40], [0, 1], { extrapolateRight: "clamp" }) }}>
          <SeloMarca escala={interpolate(marcaPop, [0, 1], [0.6, 1]) * bump} brilho={brilho} />
        </div>
      </div>

      {/* legenda conectado */}
      <div style={{ position: "absolute", bottom: 210, left: 0, right: 0, textAlign: "center", opacity: brilho }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "#fff", borderRadius: 999, padding: "18px 38px", fontFamily: FONTE, fontWeight: 900, fontSize: 42, color: ESCURO, boxShadow: "0 12px 30px rgba(0,0,0,.18)" }}>
          <Coracao t={44} /> conectado
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Variante 2: TIPOGRAFIA CINÉTICA ---------------- */
const Kinetic: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const subUnder = interpolate(frame, [66, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shineX = interpolate(frame, [120, 150], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const chancePulse = 1 + Math.sin((frame - 20) / fps * Math.PI * 2 * 2) * 0.05 * Math.max(0, 1 - Math.abs(frame - 34) / 22);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 90px", textAlign: "center" }}>
      <div style={{ color: "#fff", fontWeight: 900, fontSize: 74, lineHeight: 1.18, textShadow: "0 5px 22px rgba(0,0,0,.22)" }}>
        <div>
          <Palavra ini={0} frame={frame} fps={fps}>É a sua&nbsp;</Palavra>
          <Palavra ini={10} frame={frame} fps={fps} style={{ ...gradTexto(frame, 90), transform: `scale(${chancePulse})` }}>chance</Palavra>
        </div>
        <div style={{ marginTop: 14 }}>
          <Palavra ini={26} frame={frame} fps={fps}>de conectar</Palavra>
        </div>
        {/* o seu nome + sublinhado desenhado */}
        <div style={{ marginTop: 14, display: "inline-block", position: "relative" }}>
          <Palavra ini={44} frame={frame} fps={fps} style={{ color: "#F0C24E" }}>o seu nome</Palavra>
          <div style={{ position: "absolute", left: 0, bottom: -10, height: 10, width: `${subUnder * 100}%`, background: LARANJA, borderRadius: 999 }} />
        </div>
        <div style={{ marginTop: 30 }}>
          <Palavra ini={86} frame={frame} fps={fps}>a uma das</Palavra>
        </div>
        {/* MAIORES MARCAS (gradiente + leve glow) */}
        <div style={{ marginTop: 8 }}>
          <Palavra
            ini={100}
            frame={frame}
            fps={fps}
            style={gradTexto(frame, 118, { letterSpacing: -3, filter: `drop-shadow(0 0 ${18 * interpolate(frame, [108, 128], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px rgba(240,194,78,.6))` })}
          >
            MAIORES MARCAS
          </Palavra>
        </div>
        <div style={{ marginTop: 18 }}>
          <Palavra ini={128} frame={frame} fps={fps} style={{ fontSize: 64 }}>do país&nbsp;</Palavra>
          <Palavra ini={140} frame={frame} fps={fps}><span style={{ display: "inline-block", transform: "translateY(10px)" }}><Coracao t={64} /></span></Palavra>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- Variante 3: REDE DE MARCAS ---------------- */
const NOS = [
  { x: 240, y: 560 },
  { x: 840, y: 640 },
  { x: 180, y: 1180 },
  { x: 900, y: 1240 },
  { x: 560, y: 1560 },
];
const Rede: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const cx = 540;
  const cy = 980;
  const centroPop = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 160 } });

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 52, color: "#fff", letterSpacing: 1, textShadow: "0 4px 16px rgba(0,0,0,.25)" }}>VOCÊ ENTRA NA REDE</span>
      </div>

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {NOS.map((n, i) => (
          <Linha key={i} x1={cx} y1={cy} x2={n.x} y2={n.y} ini={40 + i * 14} frame={frame} cor={ROXO} />
        ))}
      </svg>

      {/* nós de marca */}
      {NOS.map((n, i) => {
        const ini = 40 + i * 14 + 20;
        const pop = spring({ frame: frame - ini, fps, config: { damping: 11, stiffness: 190 } });
        const op = interpolate(frame, [ini, ini + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: n.x, top: n.y, transform: `translate(-50%,-50%) scale(${interpolate(pop, [0, 1], [0, 1])})`, opacity: op }}>
            <div style={{ background: "#fff", borderRadius: 26, padding: "22px 26px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: "0 10px 26px rgba(0,0,0,.2)" }}>
              <Estrela t={46} cor="#F0C24E" />
              <span style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 24, color: ESCURO, letterSpacing: 2, textTransform: "uppercase" }}>marca</span>
            </div>
          </div>
        );
      })}

      {/* nó central: SEU NOME */}
      <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%,-50%) scale(${interpolate(centroPop, [0, 1], [0.5, 1])})` }}>
        <div style={{ background: GRAD, padding: 7, borderRadius: 30, boxShadow: "0 0 60px rgba(155,60,240,.55)" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: "26px 40px", textAlign: "center" }}>
            <div style={{ fontFamily: FONTE, fontWeight: 800, fontSize: 24, letterSpacing: 5, color: "#A99", textTransform: "uppercase" }}>Seu nome</div>
            <div style={{ fontFamily: FONTE, fontWeight: 900, fontSize: 56, backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>@voce</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
