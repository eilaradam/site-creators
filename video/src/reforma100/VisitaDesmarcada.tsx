import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Fundo } from "./Fundo";
import { cores, fontes } from "./tema";

const CANCELA = 40;

export const VisitaDesmarcada: React.FC<{ mostrarGuia?: boolean }> = ({ mostrarGuia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 13, stiffness: 170 } });
  const confirma = spring({ frame: frame - 14, fps, config: { damping: 9, stiffness: 220 } });
  const cancela = spring({ frame: frame - CANCELA, fps, config: { damping: 9, stiffness: 220 } });
  const cancelado = frame >= CANCELA;
  const tremor = interpolate(frame, [CANCELA, CANCELA + 14], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const risco = interpolate(frame, [CANCELA + 6, CANCELA + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const apagado = interpolate(frame, [CANCELA, CANCELA + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Selo gira de "confirmado" para "cancelado".
  const giro = cancelado ? cancela : confirma;

  return (
    <Fundo mostrarGuia={mostrarGuia}>
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 240,
          width: 600,
          height: 640,
          transform: `scale(${card}) translateX(${Math.sin(frame * 2.4) * 22 * tremor * (cancelado ? 1 : 0)}px)`,
          fontFamily: fontes.texto,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 60,
            overflow: "hidden",
            background: cores.branco,
            boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
            filter: `grayscale(${apagado * 0.8})`,
            opacity: 1 - apagado * 0.25,
          }}
        >
          <div
            style={{
              height: 170,
              background: cores.laranja,
              color: cores.branco,
              fontSize: 72,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              letterSpacing: 4,
            }}
          >
            SÁB
          </div>
          <div
            style={{
              fontFamily: fontes.titulo,
              fontWeight: 800,
              fontSize: 330,
              lineHeight: 1,
              color: cores.azul,
              textAlign: "center",
              marginTop: 50,
            }}
          >
            14
          </div>
        </div>

        {/* Risco diagonal sobre o dia */}
        <svg width="600" height="640" viewBox="0 0 600 640" style={{ position: "absolute", inset: 0 }}>
          <line
            x1="70"
            y1="570"
            x2={70 + 460 * risco}
            y2={570 - 500 * risco}
            stroke={cores.vermelho}
            strokeWidth="26"
            strokeLinecap="round"
            opacity={risco > 0 ? 1 : 0}
          />
        </svg>

        {/* Selo: check verde que vira X vermelho */}
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 170,
            height: 170,
            borderRadius: 85,
            background: cancelado ? cores.vermelho : cores.verde,
            border: `10px solid ${cores.branco}`,
            transform: `scale(${giro}) rotate(${(1 - giro) * -90}deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
          }}
        >
          <svg width="90" height="90" viewBox="0 0 90 90">
            {cancelado ? (
              <path d="M22 22 L68 68 M68 22 L22 68" stroke={cores.branco} strokeWidth="14" strokeLinecap="round" />
            ) : (
              <path d="M18 47 L37 66 L72 26" stroke={cores.branco} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            )}
          </svg>
        </div>
      </div>
    </Fundo>
  );
};
