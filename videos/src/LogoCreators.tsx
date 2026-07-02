import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/* =========================================================================
   LOGO ANIMADO — "PROGRAMA Creators da Shô"
   variante 1 = Pop & Beat | 2 = Shine sweep | 3 = Wipe reveal
   1080x1080, 30fps. Fonte aproximada (rounded bold do sistema).
   ========================================================================= */
export const logoSchema = z.object({ variante: z.number() });
export type LogoProps = z.infer<typeof logoSchema>;

const FONTE = "'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif";
const GRAD =
  "linear-gradient(95deg, #7C5CE6 0%, #E24F9A 30%, #F0C24E 56%, #B15AE6 80%, #7C5CE6 100%)";
const ESCURO = "#2C2A2E";

/* Coração roxo */
const Coracao: React.FC<{ tamanho: number }> = ({ tamanho }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9B3CF0" />
        <stop offset="1" stopColor="#C24AE0" />
      </linearGradient>
    </defs>
    <path
      d="M12 21.2l-1.6-1.45C5 14.9 2.2 12.3 2.2 8.9 2.2 6.2 4.3 4.1 7 4.1c1.7 0 3.4.8 4.4 2.2C12.6 4.9 14.3 4.1 16 4.1c2.7 0 4.8 2.1 4.8 4.8 0 3.4-2.8 6-8.2 10.85L12 21.2z"
      fill="url(#hg)"
    />
  </svg>
);

export const LogoCreators: React.FC<LogoProps> = ({ variante }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* fundo branco levemente aquecido */
  const bg = "#FFFFFF";

  /* gradiente fluindo (todas as variantes) */
  const gx = (frame * 3.2) % 200;

  /* ---------- entradas por variante ---------- */
  // PROGRAMA
  const progOp = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const progY = interpolate(frame, [0, 12], [-26, 0], { extrapolateRight: "clamp" });

  // Creators — spring de entrada
  const creSpring = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 150, mass: 0.9 } });
  const creScaleV1 = interpolate(creSpring, [0, 1], [0.6, 1]);
  const creOp = interpolate(frame, [6, 16], [0, 1], { extrapolateRight: "clamp" });

  // da Shô — entra da direita
  const shoT = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 140 } });
  const shoX = interpolate(shoT, [0, 1], [70, 0]);
  const shoOp = interpolate(frame, [18, 30], [0, 1], { extrapolateRight: "clamp" });

  // coração — pop + batida contínua
  const heartPop = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 200, mass: 0.7 } });
  const beat = 1 + Math.sin((frame / fps) * Math.PI * 2 * 1.4) * 0.06;
  const heartScale = interpolate(heartPop, [0, 1], [0, 1]) * beat;

  // wipe (variante 3) — revela Creators da esquerda p/ direita
  const wipe = interpolate(frame, [8, 34], [0, 100], { extrapolateRight: "clamp" });

  // shine (variante 2)
  const shineX = interpolate(frame, [22, 52], [-120, 220], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const creScale = variante === 1 ? creScaleV1 : 1;
  const clip =
    variante === 3
      ? `inset(0 ${100 - wipe}% 0 0)`
      : "none";

  const textoGrad: React.CSSProperties = {
    fontFamily: FONTE,
    fontWeight: 900,
    fontSize: 210,
    lineHeight: 0.9,
    letterSpacing: -8,
    backgroundImage: GRAD,
    backgroundSize: "200% 100%",
    backgroundPosition: `${gx}% 0`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };

  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* PROGRAMA */}
        <div
          style={{
            fontFamily: FONTE,
            fontWeight: 800,
            fontSize: 60,
            letterSpacing: 18,
            color: ESCURO,
            opacity: progOp,
            transform: `translateY(${progY}px)`,
            marginBottom: 14,
          }}
        >
          PROGRAMA
        </div>

        {/* Creators + da Shô */}
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div
            style={{
              position: "relative",
              opacity: creOp,
              transform: `scale(${creScale})`,
              clipPath: clip,
            }}
          >
            <div style={textoGrad}>Creators</div>
            {/* brilho (variante 2) */}
            {variante === 2 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  fontFamily: FONTE,
                  fontWeight: 900,
                  fontSize: 210,
                  lineHeight: 0.9,
                  letterSpacing: -8,
                  backgroundImage:
                    "linear-gradient(100deg, rgba(255,255,255,0) 44%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 56%)",
                  backgroundSize: "200% 100%",
                  backgroundPosition: `${shineX}% 0`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Creators
              </div>
            )}
          </div>

          <div
            style={{
              fontFamily: FONTE,
              fontWeight: 800,
              fontSize: 108,
              letterSpacing: -2,
              color: ESCURO,
              marginTop: -26,
              marginRight: 8,
              opacity: shoOp,
              transform: `translateX(${shoX}px)`,
            }}
          >
            da Shô
          </div>
        </div>

        {/* coração */}
        <div style={{ marginTop: 26, transform: `scale(${heartScale})` }}>
          <Coracao tamanho={150} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
