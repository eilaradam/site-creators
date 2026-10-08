import React from "react";
import { AbsoluteFill, Easing, interpolate, interpolateColors, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { c, label, mono, sans } from "./theme";

// Ajuste aqui
export const pimenta = {
  nome: "Pimenta Ebameiro",
  nivel: 5, // 1 a 5: onde o termômetro para
  niveis: ["Suave", "Leve", "Média", "Ardida", "Fogo"],
};

const TOP = 270; // topo do tubo
const BOT = 930; // base do tubo (início do bulbo)
const TUBE_W = 120;
const CX = 430;
const BULB_R = 112;
export const hot = ["#FFC93C", "#FF9A1F", "#F0601E", "#C8441A", "#8E1B0B"];
const colorAt = (p: number) => interpolateColors(p, [0, 0.25, 0.5, 0.75, 1], hot);
const levelY = (i: number) => BOT - ((i + 1) / 5) * (BOT - TOP); // i = 0..4

export const Chili: React.FC<{ size: number; color: string; style?: React.CSSProperties }> = ({ size, color, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={style}>
    <path d="M44 10c-4 0-6 3-6 6" fill="none" stroke="#3E7C2A" strokeWidth={5} strokeLinecap="round" />
    <path d="M30 18c6-4 18-2 20 6 2 10-8 26-26 34-6 3-12 2-10-4 2-5 8-8 12-16 3-7-2-15 4-20z" fill={color} />
    <path d="M41 25c1 6-1 11-5 16" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={4} strokeLinecap="round" />
  </svg>
);

const Header: React.FC<{ f: number }> = ({ f }) => {
  const o = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", opacity: o, transform: `translateY(${(1 - o) * 20}px)` }}>
      <div style={{ fontFamily: label, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: c.accent }}>NÍVEL DE ARDÊNCIA</div>
      <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 84, color: c.grafite, letterSpacing: -2, lineHeight: 1.1 }}>{pimenta.nome}</div>
    </div>
  );
};

// Tubo + bulbo. fill = 0..1 (altura do líquido no tubo)
const Thermo: React.FC<{ fill: number; segments?: number; lit?: number; glow?: number }> = ({ fill, segments, lit = 0, glow = 0 }) => {
  const yTop = BOT - fill * (BOT - TOP);
  const bulbColor = colorAt(Math.min(1, segments ? lit / segments : fill));
  return (
    <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="liq" x1="0" y1={BOT} x2="0" y2={TOP} gradientUnits="userSpaceOnUse">
          {hot.map((h, i) => (
            <stop key={i} offset={i / 4} stopColor={h} />
          ))}
        </linearGradient>
        <clipPath id="tube">
          <rect x={CX - TUBE_W / 2 + 16} y={TOP + 16} width={TUBE_W - 32} height={BOT - TOP + 40} rx={(TUBE_W - 32) / 2} />
        </clipPath>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={18} />
        </filter>
      </defs>
      {glow > 0 ? <circle cx={CX} cy={BOT + BULB_R - 10} r={BULB_R + 40} fill={bulbColor} opacity={0.45 * glow} filter="url(#glow)" /> : null}
      {/* vidro */}
      <rect x={CX - TUBE_W / 2} y={TOP} width={TUBE_W} height={BOT - TOP + 60} rx={TUBE_W / 2} fill="#FFFFFF" stroke={c.grafite} strokeWidth={10} />
      <circle cx={CX} cy={BOT + BULB_R - 10} r={BULB_R} fill="#FFFFFF" stroke={c.grafite} strokeWidth={10} />
      <rect x={CX - TUBE_W / 2 + 5} y={BOT - 20} width={TUBE_W - 10} height={60} fill="#FFFFFF" />
      {/* líquido */}
      <circle cx={CX} cy={BOT + BULB_R - 10} r={BULB_R - 22} fill={bulbColor} />
      {segments ? (
        Array.from({ length: segments }).map((_, i) => {
          const h = (BOT - TOP - 20) / segments;
          const y = BOT - (i + 1) * h;
          const on = i < lit;
          return <rect key={i} x={CX - TUBE_W / 2 + 18} y={y + 6} width={TUBE_W - 36} height={h - 12} rx={12} fill={on ? colorAt((i + 1) / segments) : "#EFE6DF"} />;
        })
      ) : (
        <g clipPath="url(#tube)">
          <rect x={CX - TUBE_W / 2} y={yTop} width={TUBE_W} height={BOT - yTop + 60} fill={bulbColor} />
        </g>
      )}
      {/* brilho do vidro */}
      <rect x={CX - TUBE_W / 2 + 22} y={TOP + 30} width={12} height={BOT - TOP - 60} rx={6} fill="#FFFFFF" opacity={0.55} />
    </svg>
  );
};

const Scale: React.FC<{ fill: number; pop?: boolean }> = ({ fill, pop }) => (
  <>
    {pimenta.niveis.map((n, i) => {
      const y = levelY(i);
      const reached = fill >= (i + 1) / 5 - 0.01;
      const s = pop && reached ? 1.08 : 1;
      return (
        <div key={i} style={{ position: "absolute", left: CX + TUBE_W / 2 + 30, top: y - 40, height: 80, display: "flex", alignItems: "center", gap: 18, transform: `scale(${s})`, transformOrigin: "left center" }}>
          <div style={{ width: 44, height: 8, borderRadius: 4, background: reached ? colorAt((i + 1) / 5) : "#D9CFC7" }} />
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({ length: i + 1 }).map((_, k) => (
              <Chili key={k} size={40} color={reached ? colorAt((i + 1) / 5) : "#E3D8CF"} />
            ))}
          </div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 40, color: reached ? c.grafite : "#BDB2A9" }}>{n}</div>
        </div>
      );
    })}
  </>
);

const Badge: React.FC<{ f: number; at: number; text: string }> = ({ f, at, text }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 9, stiffness: 160 } });
  if (f < at) return null;
  return (
    <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${s}) rotate(-3deg)`, background: c.accent, color: c.creme, fontFamily: label, fontWeight: 700, fontSize: 40, letterSpacing: 3, padding: "20px 40px", borderRadius: 100, boxShadow: "0 18px 40px rgba(158,52,16,0.35)" }}>
        {text}
      </div>
    </div>
  );
};

const target = () => pimenta.nivel / 5;

// Opção 1 · Sobe suave, níveis acendem, bulbo pulsa
export const TermoSobe: React.FC = () => {
  const f = useCurrentFrame();
  const fill = interpolate(f, [15, 95], [0, target()], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const glow = f > 95 ? 0.6 + 0.4 * Math.sin((f - 95) / 4) : 0;
  return (
    <AbsoluteFill style={{ background: c.creme }}>
      <Header f={f} />
      <Thermo fill={fill} glow={glow} />
      <Scale fill={fill} />
      <Badge f={f} at={100} text={pimenta.niveis[pimenta.nivel - 1].toUpperCase()} />
    </AbsoluteFill>
  );
};

// Opção 2 · Ferve: sobe rápido, passa do limite, treme e solta chamas
const Flames: React.FC<{ f: number; start: number }> = ({ f, start }) => {
  if (f < start) return null;
  return (
    <>
      {Array.from({ length: 14 }).map((_, i) => {
        const born = start + i * 4;
        const t = (f - born) / 34;
        if (t < 0 || t > 1) return null;
        const side = i % 2 === 0 ? -1 : 1;
        const x = CX + side * (90 + random(`x${i}`) * 140);
        const y = TOP + 60 - t * 150;
        const sz = 40 + random(`s${i}`) * 50;
        return <Chili key={i} size={sz} color={colorAt(0.5 + random(`c${i}`) * 0.5)} style={{ position: "absolute", left: x - sz / 2, top: y, opacity: 1 - t, transform: `rotate(${(random(`r${i}`) - 0.5) * 80 + t * 90}deg)` }} />;
      })}
    </>
  );
};
export const TermoFerve: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: f - 12, fps, config: { damping: 7, stiffness: 70, mass: 1.1 } });
  const fill = Math.max(0, target() * sp);
  const heat = interpolate(f, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (pimenta.nivel / 5);
  const sx = Math.sin(f * 2.3) * 7 * heat;
  const sr = Math.sin(f * 1.7) * 1.2 * heat;
  return (
    <AbsoluteFill style={{ background: c.creme }}>
      <Header f={f} />
      <AbsoluteFill style={{ transform: `translateX(${sx}px) rotate(${sr}deg)`, transformOrigin: `${CX}px ${BOT}px` }}>
        <Thermo fill={Math.min(1.04, fill)} glow={heat} />
        <Flames f={f} start={pimenta.nivel >= 4 ? 55 : 9999} />
      </AbsoluteFill>
      <Scale fill={fill} pop={heat > 0.5} />
      <Badge f={f} at={80} text={pimenta.nivel === 5 ? "ARDÊNCIA MÁXIMA" : pimenta.niveis[pimenta.nivel - 1].toUpperCase()} />
    </AbsoluteFill>
  );
};

// Opção 3 · Digital: blocos acendem um a um, como medidor de bateria
export const TermoBlocos: React.FC = () => {
  const f = useCurrentFrame();
  const segs = 10;
  const total = Math.round(segs * target());
  const lit = Math.min(total, Math.max(0, Math.floor((f - 15) / 7) + 1));
  const done = f > 15 + total * 7 + 6;
  const blink = done && Math.floor((f - (15 + total * 7)) / 6) % 2 === 0;
  const shown = done && blink ? total - 1 : lit;
  return (
    <AbsoluteFill style={{ background: c.creme }}>
      <Header f={f} />
      <Thermo fill={0} segments={segs} lit={shown} glow={done ? 0.8 : 0} />
      <Scale fill={lit / segs} pop />
      <div style={{ position: "absolute", left: CX - 200, top: BOT + BULB_R - 60, width: 400, textAlign: "center", fontFamily: mono, fontSize: 64, color: lit / segs < 0.5 ? c.grafite : c.creme, pointerEvents: "none" }}>
        {Math.round((lit / segs) * 100)}%
      </div>
      <Badge f={f} at={15 + total * 7 + 6} text={pimenta.niveis[pimenta.nivel - 1].toUpperCase()} />
    </AbsoluteFill>
  );
};
