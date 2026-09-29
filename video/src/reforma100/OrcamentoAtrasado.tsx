import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Carimbo } from "./Carimbo";
import { Fundo } from "./Fundo";
import { Titulo } from "./Titulo";
import { cores, fontes } from "./tema";

const DIAS = [
  { sigla: "SEX", numero: 12 },
  { sigla: "SÁB", numero: 13 },
  { sigla: "DOM", numero: 14 },
  { sigla: "SEG", numero: 15 },
  { sigla: "TER", numero: 16 },
  { sigla: "QUA", numero: 17 },
];
const LARGURA = 150;
const ESPACO = 12;
const INICIO_PASSOS = 62;
const INTERVALO = 20;
const CHEGADA = INICIO_PASSOS + INTERVALO * 5;

const Xis: React.FC<{ opacidade: number }> = ({ opacidade }) => (
  <svg width="70" height="70" viewBox="0 0 70 70" style={{ opacity: opacidade }}>
    <path d="M14 14 L56 56 M56 14 L14 56" stroke={cores.vermelho} strokeWidth="9" strokeLinecap="round" />
  </svg>
);

export const OrcamentoAtrasado: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const prometido = spring({ frame: frame - 40, fps, config: { damping: 10, stiffness: 200 } });
  const chegou = spring({ frame: frame - CHEGADA, fps, config: { damping: 10, stiffness: 180 } });

  // Posição do cursor: soma de um spring por dia avançado.
  const posicao = [1, 2, 3, 4, 5].reduce(
    (soma, i) => soma + spring({ frame: frame - INICIO_PASSOS - (i - 1) * INTERVALO, fps, config: { damping: 16, stiffness: 180 } }),
    0,
  );
  const diasPassados = Math.round(posicao);
  const cursorAtivo = interpolate(frame, [INICIO_PASSOS - 10, INICIO_PASSOS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Fundo>
      <Titulo
        tamanho={88}
        linhas={[
          [{ texto: "Orçamento prometido pra " }, { texto: "Sexta", destaque: true }],
          [{ texto: "que só chega na outra " }, { texto: "Quarta", destaque: true }],
        ]}
      />

      <div
        style={{
          position: "absolute",
          top: 820,
          left: (1080 - (LARGURA * 6 + ESPACO * 5)) / 2,
          display: "flex",
          gap: ESPACO,
          fontFamily: fontes.texto,
          opacity: entrada,
          transform: `translateY(${(1 - entrada) * 80}px)`,
        }}
      >
        {/* Etiqueta "Prometido" sobre a sexta */}
        <div
          style={{
            position: "absolute",
            top: -90,
            left: LARGURA / 2,
            transform: `translateX(-50%) scale(${prometido})`,
            background: cores.branco,
            color: cores.azul,
            fontSize: 28,
            fontWeight: 800,
            padding: "12px 24px",
            borderRadius: 30,
            whiteSpace: "nowrap",
          }}
        >
          Prometido
        </div>

        {/* Cursor que percorre os dias */}
        <div
          style={{
            position: "absolute",
            top: -12,
            left: -12 + posicao * (LARGURA + ESPACO),
            width: LARGURA + 24,
            height: 264,
            border: `8px solid ${cores.laranja}`,
            borderRadius: 36,
            opacity: cursorAtivo * (1 - chegou),
          }}
        />

        {DIAS.map((dia, i) => {
          const passou = i < 5 && posicao > i + 0.6;
          const opacidadeXis = interpolate(posicao, [i + 0.6, i + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const final = i === 5;
          const destaque = final ? chegou : 0;
          return (
            <div
              key={dia.sigla}
              style={{
                width: LARGURA,
                height: 240,
                borderRadius: 28,
                background: final && destaque > 0.01 ? cores.laranja : cores.branco,
                color: final && destaque > 0.01 ? cores.branco : cores.azul,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                position: "relative",
                opacity: passou ? 0.55 + 0.45 * (1 - opacidadeXis) : 1,
                transform: final ? `scale(${1 + 0.12 * destaque})` : undefined,
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 700 }}>{dia.sigla}</div>
              <div style={{ fontFamily: fontes.titulo, fontSize: 96, fontWeight: 800, lineHeight: 1 }}>{dia.numero}</div>
              {i < 5 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Xis opacidade={opacidadeXis} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contador de atraso */}
      <div
        style={{
          position: "absolute",
          top: 1150,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: fontes.texto,
          color: cores.branco,
          opacity: cursorAtivo * (1 - chegou),
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 600, opacity: 0.8 }}>esperando o orçamento...</div>
        <div style={{ fontFamily: fontes.titulo, fontSize: 150, fontWeight: 800, lineHeight: 1.1, color: cores.laranja }}>
          +{diasPassados} {diasPassados === 1 ? "dia" : "dias"}
        </div>
      </div>

      <Carimbo texto="5 DIAS DEPOIS" entrada={CHEGADA + 8} top={1210} />
    </Fundo>
  );
};
