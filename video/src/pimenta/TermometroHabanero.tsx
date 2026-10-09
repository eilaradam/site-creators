import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

const cores = {
  fundoTopo: "#2B0F06",
  fundoBase: "#0F0503",
  vidro: "#FFF6EE",
  amarelo: "#FFC83D",
  laranja: "#FF7A00",
  vermelho: "#E01E1E",
  verde: "#3E8E2E",
  verdeEscuro: "#2A6620",
};

// Geometria do termômetro (centro horizontal em 540).
const TUBO = { topo: 660, base: 1310, largura: 120, interno: 66 };
const BULBO = { y: 1380, raio: 105, interno: 78 };
const CHEIO = TUBO.base - TUBO.topo - 40;

const Habanero: React.FC<{ calor: number }> = ({ calor }) => (
  <svg width="300" height="340" viewBox="0 0 300 340">
    <defs>
      <radialGradient id="corpo" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#FFA43A" />
        <stop offset="55%" stopColor={cores.laranja} />
        <stop offset="100%" stopColor="#C93E00" />
      </radialGradient>
    </defs>
    {/* Corpo em formato de lanterna, largo e enrugado, com a ponta curta e torcida */}
    <path
      d="M150 90 C128 78 92 80 70 94 C46 108 36 138 42 166 C46 190 60 210 76 230 C92 250 112 266 124 286 C132 300 136 314 148 324 C156 330 166 326 168 316 C170 304 166 294 176 282 C192 262 216 246 232 224 C250 200 262 172 258 144 C254 116 236 98 214 90 C192 82 168 82 150 90 Z"
      fill="url(#corpo)"
    />
    {/* Gomos */}
    <path d="M98 96 C78 140 86 196 118 252 C128 270 136 290 146 312" stroke="#B83800" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.5" />
    <path d="M204 96 C226 140 214 196 186 248 C176 266 170 284 166 304" stroke="#B83800" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.5" />
    <path d="M152 104 C144 170 148 240 156 300" stroke="#B83800" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.35" />
    {/* Rugas perto da ponta */}
    <path d="M128 290 C140 284 150 292 160 284 C166 280 172 282 178 278" stroke="#B83800" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.55" />
    <path d="M140 308 C148 304 156 310 164 302" stroke="#B83800" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5" />
    <ellipse cx="78" cy="150" rx="15" ry="40" fill="#FFFFFF" opacity={0.35 + calor * 0.15} transform="rotate(14 78 150)" />
    {/* Cálice e cabinho */}
    <path d="M150 82 C150 56 158 36 180 18" stroke={cores.verdeEscuro} strokeWidth="16" fill="none" strokeLinecap="round" />
    <path
      d="M88 96 C104 68 128 64 150 76 C172 64 198 68 214 96 C192 86 172 90 150 100 C128 90 108 86 88 96 Z"
      fill={cores.verde}
    />
  </svg>
);

export const TermometroHabanero: React.FC = () => {
  const frame = useCurrentFrame();

  // Subida do líquido: acelera, chega ao topo e treme um pouco.
  const subida = interpolate(frame, [6, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.55, 0, 0.35, 1),
  });
  const tremorNivel = frame > 62 ? Math.sin(frame * 1.3) * 6 * Math.exp(-(frame - 62) / 10) : 0;
  const nivel = subida * CHEIO + tremorNivel;

  // "Calor" começa a aparecer quando o líquido passa de 70%.
  const calor = interpolate(subida, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const entrada = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tremePimenta = calor * (Math.sin(frame * 2.1) * 7);
  const escalaPimenta = 1 + calor * 0.12 + (frame > 62 ? Math.sin(frame * 0.6) * 0.02 : 0);
  const pulsoBulbo = 1 + calor * 0.05 * Math.sin(frame * 0.7);

  const topoLiquido = TUBO.base - nivel;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${cores.fundoTopo} 0%, ${cores.fundoBase} 100%)` }}>
      {/* Brilho quente que cresce atrás da pimenta */}
      <div
        style={{
          position: "absolute",
          left: 540 - 500,
          top: 480 - 500,
          width: 1000,
          height: 1000,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,90,0,${0.15 + calor * 0.5}) 0%, rgba(255,40,0,0) 60%)`,
        }}
      />

      {/* Ondas de calor subindo da pimenta */}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: calor }}>
        {[-90, 0, 90].map((dx, i) => {
          const fase = frame * 0.35 + i * 2;
          const pontos = Array.from({ length: 7 }, (_, k) => {
            const y = 320 - k * 14 - ((frame * 3 + i * 20) % 30);
            const x = 540 + dx + Math.sin(fase + k * 0.9) * 14;
            return `${x},${y}`;
          }).join(" ");
          return <polyline key={i} points={pontos} fill="none" stroke="#FFB15C" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />;
        })}
      </svg>

      {/* Fagulhas */}
      {Array.from({ length: 10 }, (_, i) => {
        const inicio = 50 + (i % 5) * 4;
        const t = Math.max(0, frame - inicio);
        const x = 540 + Math.sin(i * 2.4) * 190 + Math.sin(t * 0.2 + i) * 12;
        const y = 600 - t * (5 + (i % 3) * 2);
        const vida = interpolate(t, [0, 4, 30], [0, 1, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 12 + (i % 3) * 4,
              height: 12 + (i % 3) * 4,
              borderRadius: "50%",
              background: i % 2 ? cores.amarelo : cores.laranja,
              opacity: vida,
              boxShadow: `0 0 18px ${cores.laranja}`,
            }}
          />
        );
      })}

      <div style={{ position: "absolute", inset: 0, opacity: entrada, transform: `translateY(${(1 - entrada) * 60}px)` }}>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <linearGradient id="liquido" x1="0" y1={TUBO.base} x2="0" y2={TUBO.topo} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={cores.amarelo} />
              <stop offset="50%" stopColor={cores.laranja} />
              <stop offset="100%" stopColor={cores.vermelho} />
            </linearGradient>
            <clipPath id="interior">
              <rect x={540 - TUBO.interno / 2} y={TUBO.topo + 20} width={TUBO.interno} height={TUBO.base - TUBO.topo} rx={TUBO.interno / 2} />
            </clipPath>
          </defs>

          {/* Vidro */}
          <rect
            x={540 - TUBO.largura / 2}
            y={TUBO.topo}
            width={TUBO.largura}
            height={BULBO.y - TUBO.topo}
            rx={TUBO.largura / 2}
            fill={cores.vidro}
          />
          <circle cx="540" cy={BULBO.y} r={BULBO.raio * pulsoBulbo} fill={cores.vidro} />

          {/* Marcações da escala */}
          {Array.from({ length: 9 }, (_, i) => {
            const y = TUBO.base - 30 - i * ((CHEIO - 40) / 8);
            const maior = i % 2 === 0;
            return (
              <line
                key={i}
                x1={540 + TUBO.largura / 2 + 16}
                x2={540 + TUBO.largura / 2 + (maior ? 70 : 46)}
                y1={y}
                y2={y}
                stroke={cores.vidro}
                strokeWidth={maior ? 10 : 7}
                strokeLinecap="round"
                opacity={0.85}
              />
            );
          })}

          {/* Líquido */}
          <rect x={540 - TUBO.interno / 2} y={TUBO.topo + 20} width={TUBO.interno} height={TUBO.base - TUBO.topo} fill="#F1DED0" rx={TUBO.interno / 2} />
          <g clipPath="url(#interior)">
            <rect x={540 - TUBO.interno / 2} y={topoLiquido} width={TUBO.interno} height={TUBO.base - topoLiquido + 60} fill="url(#liquido)" />
          </g>
          <circle cx="540" cy={BULBO.y} r={BULBO.interno * pulsoBulbo} fill={cores.amarelo} />
          <rect x={540 - TUBO.interno / 2} y={BULBO.y - BULBO.interno - 10} width={TUBO.interno} height={40} fill={cores.amarelo} />

          {/* Reflexo do vidro */}
          <rect x={540 - TUBO.largura / 2 + 16} y={TUBO.topo + 40} width={12} height={TUBO.base - TUBO.topo - 80} rx={6} fill="#FFFFFF" opacity={0.6} />
        </svg>

        {/* Pimenta habanero no topo do termômetro */}
        <div
          style={{
            position: "absolute",
            left: 540 - 150,
            top: 330,
            transformOrigin: "50% 100%",
            transform: `translateX(${tremePimenta}px) rotate(${tremePimenta * 0.6}deg) scale(${escalaPimenta})`,
            filter: `drop-shadow(0 0 ${10 + calor * 50}px rgba(255,90,0,${0.4 + calor * 0.5}))`,
          }}
        >
          <Habanero calor={calor} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
