import { AbsoluteFill } from "remotion";
import { areaSegura, cores } from "./tema";

export const Fundo: React.FC<{ children: React.ReactNode; mostrarGuia?: boolean }> = ({ children, mostrarGuia }) => (
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
    {mostrarGuia && (
      <div
        style={{
          position: "absolute",
          top: areaSegura.topo,
          left: areaSegura.lateral,
          right: areaSegura.lateral,
          height: areaSegura.base - areaSegura.topo,
          border: "4px dashed #00E5FF",
        }}
      />
    )}
  </AbsoluteFill>
);
