import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ---------------------------------------------------------------------------
// Plumbob — o diamante verde do The Sims, flutuando e girando suavemente
// ---------------------------------------------------------------------------
const Plumbob: React.FC<{ x: string; y: string }> = ({ x, y }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const bob = Math.sin(frame / 18) * 14;
  const squish = 1 + Math.sin(frame / 9) * 0.06; // ilusão de giro
  const glow = 0.6 + Math.sin(frame / 12) * 0.25;
  const escala = interpolate(entrada, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateY(${bob}px) scale(${escala})`,
      }}
    >
      {/* brilho radial atrás */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 260,
          height: 260,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,252,0,0.55) 0%, rgba(76,175,80,0) 70%)",
          opacity: glow,
          filter: "blur(4px)",
        }}
      />
      <svg
        width={140}
        height={200}
        viewBox="0 0 100 140"
        style={{
          transform: `scaleX(${squish})`,
          filter: "drop-shadow(0 0 16px rgba(124,252,0,0.85))",
        }}
      >
        <defs>
          <linearGradient id="facetEsq" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d7ff8a" />
            <stop offset="55%" stopColor="#7ed957" />
            <stop offset="100%" stopColor="#3a9d2f" />
          </linearGradient>
          <linearGradient id="facetDir" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4caf50" />
            <stop offset="60%" stopColor="#2e8b27" />
            <stop offset="100%" stopColor="#1c5e18" />
          </linearGradient>
          <linearGradient id="topo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0ffd6" />
            <stop offset="100%" stopColor="#9ee86a" />
          </linearGradient>
        </defs>
        {/* faceta esquerda */}
        <polygon points="50,4 10,50 50,136" fill="url(#facetEsq)" />
        {/* faceta direita */}
        <polygon points="50,4 90,50 50,136" fill="url(#facetDir)" />
        {/* faceta superior (brilho) */}
        <polygon points="50,4 30,38 50,50 70,38" fill="url(#topo)" opacity={0.9} />
        {/* linha central */}
        <line x1="50" y1="4" x2="50" y2="136" stroke="#1c5e18" strokeWidth="0.8" opacity="0.4" />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pílula flutuante estilo UI do The Sims
// ---------------------------------------------------------------------------
const Pilula: React.FC<{
  emoji: string;
  texto: string;
  cor: string;
  x: string;
  y: string;
  delay: number;
  fase: number;
}> = ({ emoji, texto, cor, x, y, delay, fase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({
    frame: frame - delay,
    fps,
    config: { damping: 13, mass: 0.7 },
  });
  const float = Math.sin((frame + fase) / 20) * 8;
  const opacity = interpolate(entrada, [0, 1], [0, 1]);
  const escala = interpolate(entrada, [0, 1], [0.6, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateY(${float}px) scale(${escala})`,
        opacity,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px 26px",
        background: "rgba(255,255,255,0.96)",
        borderRadius: 999,
        boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: 700,
        fontSize: 34,
        color: cor,
        whiteSpace: "nowrap",
        backdropFilter: "blur(4px)",
      }}
    >
      <span style={{ fontSize: 36 }}>{emoji}</span>
      {texto}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Cena principal
// ---------------------------------------------------------------------------
export const Sims: React.FC<{ handle: string }> = ({ handle }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* foto de fundo */}
      <Img
        src={staticFile("foto-lara.jpeg")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: fadeIn,
        }}
      />

      {/* leve escurecida nas bordas pra destacar as pílulas */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 80% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      <Plumbob x="59%" y="15%" />

      <Pilula emoji="📁" texto="Portfólio" cor="#2563eb" x="25%" y="30%" delay={14} fase={0} />
      <Pilula emoji="🎬" texto="Creators" cor="#db2777" x="76%" y="33%" delay={22} fase={40} />
      <Pilula emoji="💡" texto="Abordagem" cor="#d97706" x="22%" y="46%" delay={30} fase={80} />
      <Pilula emoji="✉️" texto="Responder Cliente" cor="#16a34a" x="70%" y="52%" delay={38} fase={120} />

      {/* handle no rodapé */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          width: "100%",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          fontSize: 30,
          fontWeight: 600,
          color: "rgba(255,255,255,0.92)",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          opacity: fadeIn,
        }}
      >
        {handle}
      </div>
    </AbsoluteFill>
  );
};
