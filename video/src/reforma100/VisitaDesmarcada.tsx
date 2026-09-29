import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Carimbo } from "./Carimbo";
import { Fundo } from "./Fundo";
import { Titulo } from "./Titulo";
import { areaSegura, cores, fontes } from "./tema";

const CANCELA = 104;

export const VisitaDesmarcada: React.FC<{ mostrarGuia?: boolean }> = ({ mostrarGuia }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const confirma = spring({ frame: frame - 30, fps, config: { damping: 10, stiffness: 200 } });
  const aviso = spring({ frame: frame - 66, fps, config: { damping: 14, stiffness: 150 } });
  const cancelado = frame >= CANCELA;
  const risco = interpolate(frame, [CANCELA, CANCELA + 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const apagado = interpolate(frame, [CANCELA, CANCELA + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tremor = interpolate(frame, [CANCELA, CANCELA + 14], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const trocaStatus = spring({ frame: frame - CANCELA, fps, config: { damping: 10, stiffness: 220 } });
  const status = cancelado
    ? { texto: "Desmarcada", cor: cores.vermelho, escala: 0.7 + 0.3 * trocaStatus }
    : { texto: "Confirmada", cor: cores.verde, escala: 0.7 + 0.3 * confirma };

  return (
    <Fundo mostrarGuia={mostrarGuia}>
      <Titulo linhas={[[{ texto: "Visita marcada" }], [{ texto: "e desmarcada", destaque: true }]]} />

      {/* Notificação do empreiteiro */}
      <div
        style={{
          position: "absolute",
          top: 560,
          left: areaSegura.lateral,
          right: areaSegura.lateral,
          opacity: aviso,
          transform: `translateY(${(1 - aviso) * -60}px)`,
          background: "rgba(255,255,255,0.96)",
          borderRadius: 36,
          padding: "26px 32px",
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          fontFamily: fontes.texto,
          boxShadow: "0 30px 70px rgba(0,0,0,0.3)",
          zIndex: 2,
        }}
      >
        <div style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 18, background: cores.cinzaClaro }} />
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 700, color: "#1A1A2E" }}>
            <span>Empreiteiro</span>
            <span style={{ color: cores.cinza, fontWeight: 500 }}>agora</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "#33344A", lineHeight: 1.3, marginTop: 6 }}>
            Oi, surgiu um imprevisto aqui. Podemos remarcar pra semana que vem?
          </div>
        </div>
      </div>

      {/* Evento da agenda */}
      <div
        style={{
          position: "absolute",
          top: 830,
          left: areaSegura.lateral,
          right: areaSegura.lateral,
          opacity: card,
          transform: `translateY(${(1 - card) * 80}px) translateX(${Math.sin(frame * 2.2) * 18 * tremor * (cancelado ? 1 : 0)}px)`,
          background: cores.branco,
          borderRadius: 48,
          padding: 36,
          display: "flex",
          gap: 32,
          fontFamily: fontes.texto,
          boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: 176,
            flexShrink: 0,
            borderRadius: 32,
            background: cores.laranja,
            color: cores.branco,
            filter: `grayscale(${apagado * 0.7})`,
            opacity: 1 - apagado * 0.3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 0",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700 }}>SÁB</div>
          <div style={{ fontFamily: fontes.titulo, fontSize: 120, fontWeight: 800, lineHeight: 1 }}>14</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10}}>
          <div style={{ fontSize: 46, fontWeight: 800, color: cores.azul }}>Visita técnica</div>
          <div style={{ position: "relative", alignSelf: "flex-start", fontSize: 34, fontWeight: 600, color: "#33344A", opacity: 1 - apagado * 0.4 }}>
            09:00 às 10:00
            <div style={{ position: "absolute", left: 0, top: "52%", height: 5, width: `${risco}%`, background: cores.vermelho, borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, color: cores.cinza, opacity: 1 - apagado * 0.4 }}>Cozinha e área de serviço</div>
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: 10,
              transform: `scale(${status.escala})`,
              transformOrigin: "left center",
              background: status.cor,
              color: cores.branco,
              fontSize: 28,
              fontWeight: 700,
              padding: "10px 26px",
              borderRadius: 40,
            }}
          >
            {status.texto}
          </div>
        </div>
      </div>

      <Carimbo texto="DESMARCADA" entrada={132} top={1250} />
    </Fundo>
  );
};
