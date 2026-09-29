import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { cores, fontes } from "./tema";

// Carimbo que "bate" sobre a cena para fechar cada situação.
export const Carimbo: React.FC<{ texto: string; entrada: number; top?: number }> = ({ texto, entrada, top = 1180 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - entrada, fps, config: { damping: 11, stiffness: 220 } });
  const escala = interpolate(s, [0, 1], [2.4, 1]);

  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
          transform: `rotate(-7deg) scale(${escala})`,
          background: cores.branco,
          border: `10px solid ${cores.laranja}`,
          borderRadius: 28,
          padding: "14px 44px 8px",
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 104,
          lineHeight: 1,
          color: cores.laranja,
          letterSpacing: 2,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          whiteSpace: "nowrap",
        }}
      >
        {texto}
      </div>
    </div>
  );
};
