import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { areaSegura, cores, fontes } from "./tema";

export type Parte = { texto: string; destaque?: boolean };

// Título que entra palavra por palavra. Cada item de `linhas` é uma linha forçada.
export const Titulo: React.FC<{ linhas: Parte[][]; inicio?: number; tamanho?: number }> = ({
  linhas,
  inicio = 0,
  tamanho = 96,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let indice = 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        left: areaSegura.lateral,
        right: areaSegura.lateral,
        textAlign: "center",
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: tamanho,
        lineHeight: 1.02,
        color: cores.branco,
      }}
    >
      {linhas.map((linha, l) => (
        <div key={l} style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: tamanho * 0.25 }}>
          {linha.flatMap((parte, p) =>
            parte.texto.split(" ").filter(Boolean).map((palavra, w) => {
              const s = spring({ frame: frame - inicio - indice++ * 3, fps, config: { damping: 13, stiffness: 160 } });
              return (
                <span
                  key={`${p}-${w}`}
                  style={{
                    display: "inline-block",
                    color: parte.destaque ? cores.laranja : cores.branco,
                    opacity: s,
                    transform: `translateY(${(1 - s) * 50}px)`,
                  }}
                >
                  {palavra}
                </span>
              );
            }),
          )}
        </div>
      ))}
    </div>
  );
};
