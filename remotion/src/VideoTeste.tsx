import {
  AbsoluteFill,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

const Fundo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const cor1 = interpolateColors(
    frame,
    [0, durationInFrames],
    ["#6366f1", "#ec4899"],
  );
  const cor2 = interpolateColors(
    frame,
    [0, durationInFrames],
    ["#0f172a", "#7c3aed"],
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${cor1} 0%, ${cor2} 100%)`,
      }}
    />
  );
};

const Bolhas: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const bolhas = new Array(12).fill(0).map((_, i) => i);

  return (
    <AbsoluteFill>
      {bolhas.map((i) => {
        const seed = i * 137.5;
        const x = (Math.sin(seed) * 0.5 + 0.5) * width;
        const baseY = (Math.cos(seed) * 0.5 + 0.5) * height;
        const y = (baseY - frame * (1 + (i % 3)) * 0.8 + height * 4) % height;
        const size = 30 + (i % 4) * 40;
        const opacity = 0.06 + (i % 3) * 0.04;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              opacity,
              filter: "blur(2px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Titulo: React.FC<{ texto: string; delay: number; fontSize: number }> = ({
  texto,
  delay,
  fontSize,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  const y = interpolate(entrada, [0, 1], [60, 0]);
  const opacity = interpolate(entrada, [0, 1], [0, 1]);

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize,
        fontWeight: 800,
        color: "#ffffff",
        transform: `translateY(${y}px)`,
        opacity,
        textAlign: "center",
        textShadow: "0 10px 40px rgba(0,0,0,0.35)",
        lineHeight: 1.1,
      }}
    >
      {texto}
    </div>
  );
};

const Barra: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const largura = spring({
    frame: frame - 45,
    fps,
    config: { damping: 18 },
  });

  return (
    <div
      style={{
        marginTop: 40,
        height: 8,
        width: 320,
        borderRadius: 999,
        background: "rgba(255,255,255,0.25)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${largura * 100}%`,
          background: "#ffffff",
          borderRadius: 999,
        }}
      />
    </div>
  );
};

export const VideoTeste: React.FC<{ titulo: string; subtitulo: string }> = ({
  titulo,
  subtitulo,
}) => {
  return (
    <AbsoluteFill>
      <Fundo />
      <Bolhas />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 16,
          padding: 80,
        }}
      >
        <Titulo texto={titulo} delay={0} fontSize={130} />
        <Sequence from={20}>
          <Titulo texto={subtitulo} delay={0} fontSize={56} />
        </Sequence>
        <Barra />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
