import { AbsoluteFill } from "remotion";
import { cores } from "./tema";

export const Fundo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 50% 20%, #3A3EA3 0%, ${cores.azul} 45%, ${cores.azulEscuro} 100%)`,
    }}
  >
    <div
      style={{
        position: "absolute",
        width: 900,
        height: 900,
        right: -450,
        bottom: -350,
        borderRadius: "50%",
        background: cores.laranja,
        opacity: 0.12,
      }}
    />
    {children}
  </AbsoluteFill>
);
