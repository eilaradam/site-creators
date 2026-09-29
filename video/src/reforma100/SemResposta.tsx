import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Carimbo } from "./Carimbo";
import { Fundo } from "./Fundo";
import { Titulo } from "./Titulo";
import { areaSegura, cores, fontes } from "./tema";

const useEntrada = (entrada: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - entrada, fps, config: { damping: 14, stiffness: 170 } });
};

const Separador: React.FC<{ texto: string; entrada: number }> = ({ texto, entrada }) => {
  const s = useEntrada(entrada);
  return (
    <div style={{ alignSelf: "center", opacity: s, fontSize: 24, fontWeight: 600, color: cores.cinza, margin: "4px 0 0" }}>
      {texto}
    </div>
  );
};

const Bolha: React.FC<{ texto: string; entrada: number }> = ({ texto, entrada }) => {
  const s = useEntrada(entrada);
  return (
    <div
      style={{
        alignSelf: "flex-end",
        maxWidth: 560,
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + 0.15 * s})`,
        transformOrigin: "right bottom",
        background: cores.azul,
        color: cores.branco,
        fontSize: 30,
        fontWeight: 600,
        lineHeight: 1.3,
        padding: "16px 26px",
        borderRadius: "34px 34px 10px 34px",
      }}
    >
      {texto}
    </div>
  );
};

// Indicador de "digitando..." que aparece e some sem resposta nenhuma.
const Digitando: React.FC<{ de: number; ate: number }> = ({ de, ate }) => {
  const frame = useCurrentFrame();
  const opacidade = interpolate(frame, [de, de + 6, ate - 6, ate], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        alignSelf: "flex-start",
        opacity: opacidade,
        background: cores.cinzaClaro,
        borderRadius: "34px 34px 34px 10px",
        padding: "24px 30px",
        display: "flex",
        gap: 10,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: cores.cinza,
            transform: `translateY(${Math.sin((frame - i * 4) / 3) * 6}px)`,
          }}
        />
      ))}
    </div>
  );
};

export const SemResposta: React.FC<{ mostrarGuia?: boolean }> = ({ mostrarGuia }) => {
  const frame = useCurrentFrame();
  const card = useEntrada(8);
  const visto = interpolate(frame, [100, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Fundo mostrarGuia={mostrarGuia}>
      <Titulo tamanho={74} linhas={[[{ texto: "Mensagem no Instagram" }], [{ texto: "sem resposta", destaque: true }]]} />
      <div
        style={{
          position: "absolute",
          top: 450,
          left: areaSegura.lateral,
          right: areaSegura.lateral,
          height: 860,
          background: cores.branco,
          borderRadius: 48,
          overflow: "hidden",
          fontFamily: fontes.texto,
          opacity: card,
          transform: `translateY(${(1 - card) * 80}px)`,
          boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "24px 32px", borderBottom: `2px solid ${cores.cinzaClaro}` }}>
          <div style={{ width: 76, height: 76, borderRadius: 38, background: cores.cinzaClaro }} />
          <div>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#1A1A2E" }}>Empreiteiro</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: cores.cinza }}>Online há 3 dias</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 28px" }}>
          <Separador texto="Segunda, 09:12" entrada={14} />
          <Bolha texto="Oi! Vocês fazem reforma de apartamento?" entrada={18} />
          <Bolha texto="Queria um orçamento pra cozinha" entrada={34} />
          <Separador texto="Quarta, 18:40" entrada={56} />
          <Bolha texto="Conseguiram ver minha mensagem?" entrada={60} />
          <Separador texto="Sexta, 11:05" entrada={80} />
          <Bolha texto="Oi??" entrada={84} />
          <div style={{ alignSelf: "flex-end", opacity: visto, fontSize: 24, fontWeight: 600, color: cores.cinza, marginTop: -4 }}>
            Visto
          </div>
          <Digitando de={112} ate={146} />
        </div>
      </div>
      <Carimbo texto="SEM RESPOSTA" entrada={152} top={1330} />
    </Fundo>
  );
};
