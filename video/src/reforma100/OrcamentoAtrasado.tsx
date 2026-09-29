import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Fundo } from "./Fundo";
import { cores, fontes } from "./tema";

const DIAS = ["SEX", "SÁB", "DOM", "SEG", "TER", "QUA"];
const LARGURA = 132;
const ESPACO = 10;
const TOTAL = LARGURA * 6 + ESPACO * 5;
const INICIO_PASSOS = 18;
const INTERVALO = 9;
const CHEGADA = INICIO_PASSOS + INTERVALO * 5 + 4;

const Documento: React.FC<{ tracejado?: boolean }> = ({ tracejado }) => (
  <svg width="110" height="136" viewBox="0 0 110 136">
    <rect
      x="6"
      y="6"
      width="98"
      height="124"
      rx="16"
      fill={tracejado ? "none" : cores.branco}
      stroke={tracejado ? cores.branco : "none"}
      strokeWidth="6"
      strokeDasharray={tracejado ? "14 10" : undefined}
    />
    {!tracejado &&
      [38, 60, 82, 104].map((y, i) => (
        <rect key={y} x="24" y={y - 6} width={i === 3 ? 38 : 62} height="10" rx="5" fill={i === 0 ? cores.laranja : cores.cinzaClaro} />
      ))}
  </svg>
);

export const OrcamentoAtrasado: React.FC<{ mostrarGuia?: boolean }> = ({ mostrarGuia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
  const chegou = spring({ frame: frame - CHEGADA, fps, config: { damping: 10, stiffness: 200 } });

  // Posição do cursor: soma de um spring por dia avançado.
  const posicao = [0, 1, 2, 3, 4].reduce(
    (soma, i) => soma + spring({ frame: frame - INICIO_PASSOS - i * INTERVALO, fps, config: { damping: 18, stiffness: 260 } }),
    0,
  );
  // Documento "prometido" pra sexta: contorno tracejado que some quando a sexta passa.
  const promessa = interpolate(frame, [4, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) *
    interpolate(posicao, [0.3, 0.8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Fundo mostrarGuia={mostrarGuia}>
      <div
        style={{
          position: "absolute",
          top: 880,
          left: (1080 - TOTAL) / 2,
          width: TOTAL,
          display: "flex",
          gap: ESPACO,
          fontFamily: fontes.titulo,
          opacity: entrada,
          transform: `translateY(${(1 - entrada) * 60}px)`,
        }}
      >
        <div style={{ position: "absolute", top: -170, left: (LARGURA - 110) / 2, opacity: promessa }}>
          <Documento tracejado />
        </div>
        <div
          style={{
            position: "absolute",
            top: -170,
            left: 5 * (LARGURA + ESPACO) + (LARGURA - 110) / 2,
            opacity: chegou,
            transform: `translateY(${(1 - chegou) * -260}px)`,
          }}
        >
          <Documento />
        </div>

        {/* Cursor que percorre os dias */}
        <div
          style={{
            position: "absolute",
            top: -12,
            left: -12 + posicao * (LARGURA + ESPACO),
            width: LARGURA + 24,
            height: 234,
            border: `8px solid ${cores.laranja}`,
            borderRadius: 36,
            opacity: 1 - chegou,
          }}
        />

        {DIAS.map((dia, i) => {
          const xis = i < 5 ? interpolate(posicao, [i + 0.5, i + 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
          const final = i === 5 && chegou > 0.01;
          return (
            <div
              key={dia}
              style={{
                width: LARGURA,
                height: 210,
                borderRadius: 28,
                background: final ? cores.laranja : cores.branco,
                color: final ? cores.branco : cores.azul,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: 34,
                gap: 14,
                position: "relative",
                fontSize: 50,
                fontWeight: 800,
                opacity: 1 - xis * 0.45,
                transform: i === 5 ? `scale(${1 + 0.14 * chegou})` : undefined,
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              }}
            >
              {dia}
              {i < 5 && (
                <svg width="70" height="70" viewBox="0 0 80 80" style={{ opacity: xis }}>
                  <path d="M16 16 L64 64 M64 16 L16 64" stroke={cores.vermelho} strokeWidth="10" strokeLinecap="round" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </Fundo>
  );
};
