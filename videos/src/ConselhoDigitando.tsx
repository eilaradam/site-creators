import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/* =========================================================================
   CONSELHO DIGITADO  —  texto "sendo escrito" com som de teclado.
   Paleta da marca EITA Mentora Virtual (verde-menta + azul claro + navy).
   Ajuste o texto e as cores nas defaultProps em Root.tsx.
   ========================================================================= */
export const conselhoSchema = z.object({
  texto: z.string(),
  destaque: z.string(), // trecho destacado em verde-menta dentro do texto
  corFundoA: z.string(), // topo do gradiente do fundo
  corFundoB: z.string(), // base do gradiente do fundo
  corVerde: z.string(), // verde-menta da marca (destaque / logo)
  corLaranja: z.string(), // laranja/coral da marca (detalhes)
  corTexto: z.string(), // navy do texto
});

export type ConselhoProps = z.infer<typeof conselhoSchema>;

export const ConselhoDigitando: React.FC<ConselhoProps> = ({
  texto,
  destaque,
  corFundoA,
  corFundoB,
  corVerde,
  corLaranja,
  corTexto,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  /* ---------- Janela da digitação ---------- */
  const INICIO = 14; // frame em que começa a digitar
  const FIM = durationInFrames - 20; // termina deixando um respiro no final
  const totalChars = texto.length;
  const perChar = (FIM - INICIO) / totalChars; // frames por caractere

  // quantos caracteres já estão visíveis neste frame
  const visiveis = Math.max(
    0,
    Math.min(totalChars, Math.floor((frame - INICIO) / perChar))
  );
  const textoVisivel = texto.slice(0, visiveis);
  const terminou = visiveis >= totalChars;

  /* ---------- Cursor piscando ---------- */
  // pisca a cada ~0,5s; enquanto digita fica sólido
  const piscaOn = Math.floor((frame / fps) * 2) % 2 === 0;
  const mostrarCursor = !terminou || piscaOn;

  /* ---------- Entrada do card ---------- */
  const entradaCard = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.8 },
  });
  const cardScale = interpolate(entradaCard, [0, 1], [0.92, 1]);
  const cardOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  /* ---------- Pequena batida de conclusão ---------- */
  const concluiuFrame = INICIO + perChar * totalChars;
  const pulso = interpolate(
    frame,
    [concluiuFrame, concluiuFrame + 6, concluiuFrame + 14],
    [1, 1.018, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  /* ---------- Sons de teclado: 1 clique por caractere (sem espaços) ---------- */
  const cliques = [];
  for (let i = 0; i < totalChars; i++) {
    if (texto[i] === " ") continue; // não "tecla" nos espaços
    const f = Math.round(INICIO + perChar * i);
    // leve variação de volume p/ soar natural
    const vol = 0.5 + ((i * 7) % 5) * 0.05;
    cliques.push(
      <Sequence key={i} from={f} durationInFrames={6}>
        <Audio src={staticFile("teclado.wav")} volume={vol} />
      </Sequence>
    );
  }

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${corFundoA} 0%, ${corFundoB} 100%)`,
      }}
    >
      {/* textura: pontinhos suaves de fundo (verde + laranja) */}
      <PontosDeFundo corA={corVerde} corB={corLaranja} />

      {cliques}

      {/* ---------- CARD CENTRAL ---------- */}
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", padding: 90 }}
      >
        <div
          style={{
            width: 900,
            background: "#FBFEFD",
            borderRadius: 56,
            padding: "84px 76px",
            boxShadow:
              "0 40px 80px rgba(20,49,74,0.18), 0 8px 20px rgba(20,49,74,0.10)",
            transform: `scale(${cardScale * pulso})`,
            opacity: cardOpacity,
            border: `2px solid rgba(43,212,155,0.25)`,
            position: "relative",
          }}
        >
          {/* aba/etiqueta verde no topo do card */}
          <div
            style={{
              position: "absolute",
              top: -28,
              left: 76,
              background: corVerde,
              color: "#0C3A2C",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: 3,
              padding: "12px 26px",
              borderRadius: 999,
              textTransform: "uppercase",
              boxShadow: "0 10px 22px rgba(43,212,155,0.35)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Lampada cor="#0C3A2C" />
            Conselho da EITA
          </div>

          {/* aspas decorativas (laranja) */}
          <div
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: 150,
              lineHeight: 0.5,
              color: corLaranja,
              height: 70,
              marginTop: 26,
              marginBottom: 6,
            }}
          >
            &ldquo;
          </div>

          {/* texto sendo digitado */}
          <div
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 800,
              fontSize: 70,
              lineHeight: 1.18,
              letterSpacing: -1,
              color: corTexto,
              minHeight: 520,
            }}
          >
            <TextoDigitado
              visivel={textoVisivel}
              completo={texto}
              destaque={destaque}
              corVerde={corVerde}
            />
            {/* cursor (laranja) */}
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 64,
                marginLeft: 6,
                transform: "translateY(10px)",
                background: corLaranja,
                borderRadius: 3,
                opacity: mostrarCursor ? 1 : 0,
              }}
            />
          </div>
        </div>

        {/* assinatura da marca abaixo do card */}
        <div
          style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: cardOpacity,
          }}
        >
          <Lampada cor={corVerde} grande />
          <span
            style={{
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 800,
              fontSize: 38,
              color: "#0C3A2C",
              letterSpacing: 1,
            }}
          >
            mentora{" "}
            <span style={{ fontWeight: 500 }}>virtual</span>
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Renderiza o texto já visível, pintando o trecho de destaque em verde.
   O destaque só aparece conforme as letras vão sendo "digitadas". */
const TextoDigitado: React.FC<{
  visivel: string;
  completo: string;
  destaque: string;
  corVerde: string;
}> = ({ visivel, completo, destaque, corVerde }) => {
  const ini = completo.indexOf(destaque);
  if (ini < 0) return <>{visivel}</>;
  const fim = ini + destaque.length;

  const antes = visivel.slice(0, Math.min(visivel.length, ini));
  const meio = visivel.slice(
    Math.min(visivel.length, ini),
    Math.min(visivel.length, fim)
  );
  const depois = visivel.length > fim ? visivel.slice(fim) : "";

  return (
    <>
      {antes}
      <span style={{ color: corVerde }}>{meio}</span>
      {depois}
    </>
  );
};

/* Marca: lâmpada simples em SVG (evoca o logo "mentora virtual") */
const Lampada: React.FC<{ cor: string; grande?: boolean }> = ({
  cor,
  grande,
}) => {
  const s = grande ? 40 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.55 1.2 1.3 1.4 2.1l.2.8h4.8l.2-.8c.2-.8.7-1.55 1.4-2.1A6.5 6.5 0 0 0 12 2.5Z"
        fill={cor}
      />
      <rect x="9" y="18.2" width="6" height="2.2" rx="1.1" fill={cor} />
      <rect x="9.8" y="21" width="4.4" height="1.8" rx="0.9" fill={cor} />
    </svg>
  );
};

/* Pontinhos suaves espalhados no fundo (textura leve da marca: verde + laranja) */
const PontosDeFundo: React.FC<{ corA: string; corB: string }> = ({
  corA,
  corB,
}) => {
  const pontos = [];
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 46; i++) {
    const cx = rnd() * 1080;
    const cy = rnd() * 1920;
    const r = 3 + rnd() * 7;
    // ~1 a cada 3 pontinhos em laranja, o resto em verde
    const cor = i % 3 === 0 ? corB : corA;
    pontos.push(
      <circle key={i} cx={cx} cy={cy} r={r} fill={cor} opacity={0.13} />
    );
  }
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {pontos}
      </svg>
    </AbsoluteFill>
  );
};
