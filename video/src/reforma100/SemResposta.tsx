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

const Separador: React.FC<{ texto: string; entrada: number }> = ({ texto, entrada }) => {
  const s = useEntrada(entrada);
  return (
    <div style={{ alignSelf: "center", opacity: s * 0.75, fontSize: 32, fontWeight: 700, color: cores.branco, letterSpacing: 2 }}>
      {texto}
    </div>
  );
};

const Visto: React.FC<{ entrada: number }> = ({ entrada }) => {
  const frame = useCurrentFrame();
  const opacidade = interpolate(frame, [entrada, entrada + 5], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ alignSelf: "flex-end", opacity: opacidade, fontSize: 30, fontWeight: 600, color: cores.branco, marginTop: -10 }}>
      Visto
    </div>
  );
};

// Três dias chamando, todas visualizadas e nenhuma resposta.
const MENSAGENS = [
  { dia: "SEGUNDA", texto: "Oi! Faz orçamento?", entrada: 2 },
  { dia: "QUARTA", texto: "Conseguiu ver?", entrada: 26 },
  { dia: "SEXTA", texto: "Oi??", entrada: 50 },
];

export const SemResposta: React.FC<{ mostrarGuia?: boolean }> = ({ mostrarGuia }) => (
  <Fundo mostrarGuia={mostrarGuia}>
    <div
      style={{
        position: "absolute",
        top: 620,
        left: areaSegura.lateral,
        right: areaSegura.lateral,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        fontFamily: fontes.texto,
      }}
    >
      {MENSAGENS.map((m) => (
        <div key={m.dia} style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 20 }}>
          <Separador texto={m.dia} entrada={m.entrada} />
          <Bolha texto={m.texto} entrada={m.entrada + 3} />
          <Visto entrada={m.entrada + 14} />
        </div>
      ))}
    </div>
  </Fundo>
);
