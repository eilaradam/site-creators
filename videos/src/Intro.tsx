import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

export const introSchema = z.object({
  titulo: z.string(),
  subtitulo: z.string(),
});

export const Intro: React.FC<z.infer<typeof introSchema>> = ({
  titulo,
  subtitulo,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animação de entrada do título com efeito de mola
  const entrada = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const escala = interpolate(entrada, [0, 1], [0.7, 1]);
  const opacidade = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Subtítulo entra um pouco depois
  const subOpacidade = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subDeslize = interpolate(frame, [25, 45], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          transform: `scale(${escala})`,
          opacity: opacidade,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 130,
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: -2,
          }}
        >
          {titulo}
        </h1>
      </div>

      <div
        style={{
          opacity: subOpacidade,
          transform: `translateY(${subDeslize}px)`,
          marginTop: 20,
        }}
      >
        <p
          style={{
            fontSize: 56,
            fontWeight: 300,
            color: "#e94560",
            margin: 0,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          {subtitulo}
        </p>
      </div>
    </AbsoluteFill>
  );
};
