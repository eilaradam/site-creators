import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Fundo } from "./Fundo";
import { areaSegura, cores, fontes } from "./tema";

const useEntrada = (entrada: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - entrada, fps, config: { damping: 12, stiffness: 190 } });
};

const Bolha: React.FC<{ texto: string; entrada: number }> = ({ texto, entrada }) => {
  const s = useEntrada(entrada);
  return (
    <div
      style={{
        alignSelf: "flex-end",
        opacity: Math.min(1, s * 2),
        transform: `scale(${s})`,
        transformOrigin: "right bottom",
        background: cores.laranja,
        color: cores.branco,
        fontSize: 56,
        fontWeight: 700,
        padding: "26px 40px",
        borderRadius: "56px 56px 14px 56px",
      }}
    >
      {texto}
    </div>
  );
};

// "Digitando..." que aparece e some sem resposta nenhuma.
const Digitando: React.FC<{ de: number; ate: number }> = ({ de, ate }) => {
  const frame = useCurrentFrame();
  const s = useEntrada(de);
  const saida = interpolate(frame, [ate - 5, ate], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        alignSelf: "flex-start",
        opacity: Math.min(1, s * 2) * saida,
        transform: `scale(${s * saida})`,
        transformOrigin: "left bottom",
        background: cores.branco,
        borderRadius: "56px 56px 56px 14px",
        padding: "34px 40px",
        display: "flex",
        gap: 14,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: cores.cinza,
            transform: `translateY(${Math.sin((frame - i * 4) / 2.5) * 8}px)`,
          }}
        />
      ))}
    </div>
  );
};

export const SemResposta: React.FC<{ mostrarGuia?: boolean }> = ({ mostrarGuia }) => {
  const frame = useCurrentFrame();
  const visto = interpolate(frame, [18, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Fundo mostrarGuia={mostrarGuia}>
      <div
        style={{
          position: "absolute",
          top: 760,
          left: areaSegura.lateral,
          right: areaSegura.lateral,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          fontFamily: fontes.texto,
        }}
      >
        <Bolha texto="Oi! Faz orçamento?" entrada={2} />
        <div style={{ alignSelf: "flex-end", opacity: visto * 0.7, fontSize: 34, fontWeight: 600, color: cores.branco, marginTop: -8 }}>
          Visto
        </div>
        <Digitando de={28} ate={58} />
        <Bolha texto="Oi??" entrada={64} />
      </div>
    </Fundo>
  );
};
