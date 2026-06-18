import {
  AbsoluteFill,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/* =========================================================================
   AJUSTE AQUI OS TEXTOS  ↓↓↓  (veja README.md para instruções completas)
   ========================================================================= */
export const cabecaSchema = z.object({
  textoTopo: z.string(),
  textoBaixo: z.string(),
  palavraDestaque: z.string(), // palavra do texto de baixo em itálico serifado
  corDestaque: z.string(),
  corTexto: z.string(),
});

export type CabecaProps = z.infer<typeof cabecaSchema>;

// Quanto tempo cada rosto fica na tela (em frames). 27 frames @30fps = 0,9s
const CICLO = 27;

// Lista de cabeças usadas (todas as que estão em public/cabecas/)
const CABECAS = [
  "cabecas/rosto1.png",
  "cabecas/rosto2.png",
  "cabecas/rosto3.png",
  "cabecas/rosto4.png",
];

// Altura da cabeça na tela (px). Mantém os rostos com tamanho parecido.
const ALTURA_CABECA = 780;

export const CabecaFlutuante: React.FC<CabecaProps> = ({
  textoTopo,
  textoBaixo,
  palavraDestaque,
  corDestaque,
  corTexto,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  /* ---------- Efeito CARIMBO: cresce (overshoot) → segura → encolhe → some ---------- */
  const t = frame % CICLO; // posição dentro do ciclo atual
  const idx = Math.floor(frame / CICLO) % CABECAS.length; // qual rosto

  // crescimento com leve overshoot (mola)
  const grow = spring({
    frame: t,
    fps,
    config: { damping: 11, stiffness: 190, mass: 0.7 },
  });

  // encolhe no fim do ciclo -> garante invisível na troca (nunca corte seco)
  const shrink = interpolate(t, [CICLO - 8, CICLO - 3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeIn = interpolate(t, [0, 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const escala = grow * shrink;
  const opacidade = fadeIn * shrink;

  /* ---------- Flutuação suave (independente do ciclo, contínua) ---------- */
  const seg = frame / fps;
  const flutuaY = Math.sin(seg * Math.PI * 2 * 0.5) * 18; // sobe/desce ±18px
  const giro = Math.sin(seg * Math.PI * 2 * 0.4) * 2.6; // giro mínimo ±2,6°

  /* ---------- Entrada dos textos ---------- */
  const apareceTextos = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const subiu = interpolate(frame, [0, 14], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* ---------- FUNDO ---------- */}
      <Fundo />

      {/* ---------- CABEÇA CENTRAL ---------- */}
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div
          style={{
            transform: `translateY(${flutuaY}px) rotate(${giro}deg) scale(${escala})`,
            opacity: opacidade,
            position: "relative",
            display: "inline-flex",
          }}
        >
          {/* Contorno branco "sticker" (silhueta ampliada) + sombra suave.
              Leve para o renderizador: 1 cópia branca por trás, sem sombras
              empilhadas. */}
          <Img
            src={staticFile(CABECAS[idx])}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transform: "scale(1.05)",
              transformOrigin: "center center",
              filter:
                "brightness(0) invert(1) drop-shadow(0 24px 26px rgba(20,20,45,0.32))",
            }}
          />
          {/* Rosto real por cima (precisa ser posicionado p/ pintar acima
              da silhueta branca absoluta) */}
          <Img
            src={staticFile(CABECAS[idx])}
            style={{
              position: "relative",
              zIndex: 1,
              height: ALTURA_CABECA,
              width: "auto",
              display: "block",
            }}
          />
        </div>
      </AbsoluteFill>

      {/* ---------- TEXTO DE CIMA ---------- */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 200,
        }}
      >
        <div
          style={{
            opacity: apareceTextos,
            transform: `translateY(${-subiu}px)`,
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: 800,
            fontSize: 64,
            letterSpacing: 14,
            color: corTexto,
            textTransform: "uppercase",
            background: "rgba(255,255,255,0.55)",
            padding: "10px 34px",
            borderRadius: 999,
          }}
        >
          {textoTopo}
        </div>
      </AbsoluteFill>

      {/* ---------- TEXTO DE BAIXO ---------- */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 230,
        }}
      >
        <div
          style={{
            opacity: apareceTextos,
            transform: `translateY(${subiu}px)`,
            maxWidth: 840,
            textAlign: "center",
            fontFamily: "Helvetica, Arial, sans-serif",
            fontWeight: 800,
            fontSize: 82,
            lineHeight: 1.05,
            letterSpacing: -1,
            color: corTexto,
          }}
        >
          <TextoComDestaque
            texto={textoBaixo}
            destaque={palavraDestaque}
            corDestaque={corDestaque}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* Renderiza o texto destacando uma palavra em itálico serifado colorido */
const TextoComDestaque: React.FC<{
  texto: string;
  destaque: string;
  corDestaque: string;
}> = ({ texto, destaque, corDestaque }) => {
  const partes = texto.split(new RegExp(`(${destaque})`, "i"));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === destaque.toLowerCase() ? (
          <span
            key={i}
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontStyle: "italic",
              fontWeight: 700,
              color: corDestaque,
            }}
          >
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
};

/* Fundo: usa public/fundo.jpg cobrindo a tela. Se não carregar, cai no
   fundo creme com linhas verticais azuis desenhadas em SVG. */
const Fundo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#F1E9D2" }}>
      {/* linhas azuis de fallback (ficam atrás da imagem) */}
      <LinhasAzuis />
      <Img
        src={staticFile("fundo.jpg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
};

const LinhasAzuis: React.FC = () => {
  const linhas = [];
  const n = 9;
  for (let i = 1; i <= n; i++) {
    const x = (1080 / (n + 1)) * i;
    linhas.push(
      <line
        key={i}
        x1={x}
        y1={0}
        x2={x}
        y2={1920}
        stroke="#5B8DEF"
        strokeWidth={6}
        strokeLinecap="round"
      />
    );
  }
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        {linhas}
      </svg>
    </AbsoluteFill>
  );
};
