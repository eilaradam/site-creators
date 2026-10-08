import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { c, label, mono, sans, shadow } from "./theme";
import { textos } from "./config";

const isPlaceholder = (s: string) => s.trim().startsWith("[");

// Fundo creme + card em gradiente (estrutura da referência, paleta da marca)
export const Frame: React.FC<{ n: number; children: React.ReactNode; swipe?: boolean }> = ({ n, children, swipe = true }) => (
  <AbsoluteFill style={{ background: c.page, fontFamily: sans }}>
    <div
      style={{
        position: "absolute",
        inset: 56,
        borderRadius: 44,
        background: `linear-gradient(160deg, ${c.cardTop} 0%, ${c.cardBottom} 100%)`,
        boxShadow: "0 30px 80px rgba(158, 52, 16, 0.25)",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 48, left: 56, right: 56, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 5 }}>
        <div
          style={{
            fontFamily: label,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 2.5,
            color: c.textOnLight,
            background: c.bubbleLight,
            padding: "14px 26px",
            borderRadius: 100,
          }}
        >
          {textos.tag}
        </div>
        <div style={{ fontFamily: mono, fontSize: 26, color: c.bubbleLight, opacity: 0.85 }}>
          {String(n).padStart(2, "0")}/10
        </div>
      </div>
      <div style={{ position: "absolute", top: 150, bottom: swipe ? 120 : 64, left: 56, right: 56, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
        {children}
      </div>
      {swipe ? (
        <div style={{ position: "absolute", bottom: 48, right: 56, display: "flex", alignItems: "center", gap: 14, fontFamily: label, fontWeight: 600, fontSize: 22, letterSpacing: 2, color: c.bubbleLight, opacity: 0.85 }}>
          ARRASTA <Arrow dir="right" size={30} color={c.bubbleLight} />
        </div>
      ) : null}
    </div>
  </AbsoluteFill>
);

export const Arrow: React.FC<{ dir: "up" | "right"; size: number; color: string }> = ({ dir, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: dir === "right" ? "rotate(90deg)" : undefined }}>
    <path d="M12 20V4M5 11l7-7 7 7" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Photo: React.FC<{ src: string | null; label: string; style?: React.CSSProperties; dark?: boolean }> = ({ src, label: l, style, dark }) =>
  src ? (
    <Img src={staticFile(src)} style={{ objectFit: "cover", width: "100%", height: "100%", ...style }} />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 32,
        boxSizing: "border-box",
        border: `3px dashed ${dark ? c.bubbleLight : c.textOnLight}`,
        color: dark ? c.bubbleLight : c.textOnLight,
        background: dark ? "rgba(255,230,218,0.08)" : "rgba(90,28,8,0.06)",
        fontFamily: label,
        fontWeight: 600,
        fontSize: 26,
        letterSpacing: 1.5,
        opacity: 0.8,
        ...style,
      }}
    >
      {l}
    </div>
  );

export const Avatar: React.FC<{ who: "lara" | "camila"; size?: number; src: string | null }> = ({ who, size = 104, src }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: `5px solid ${c.creme}`,
      boxShadow: shadow,
      overflow: "hidden",
      flexShrink: 0,
      background: who === "lara" ? c.bubbleLight : c.bubbleDark,
      color: who === "lara" ? c.textOnLight : c.textOnDark,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: size * 0.42,
    }}
  >
    {src ? <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (who === "lara" ? textos.lara : textos.camila)[0]}
  </div>
);

export const Duo: React.FC<{ size?: number; lara: string | null; camila: string | null }> = ({ size = 96, lara, camila }) => (
  <div style={{ display: "flex" }}>
    <Avatar who="lara" size={size} src={lara} />
    <div style={{ marginLeft: -size * 0.32 }}>
      <Avatar who="camila" size={size} src={camila} />
    </div>
  </div>
);

type Side = "left" | "right";

// Balão: esquerda = claro (Lara), direita = escuro (Camila). Cauda no canto do avatar.
export const Bubble: React.FC<{ side: Side; tone?: "light" | "dark"; children: React.ReactNode; tail?: boolean; style?: React.CSSProperties }> = ({
  side,
  tone,
  children,
  tail = true,
  style,
}) => {
  const t = tone ?? (side === "left" ? "light" : "dark");
  const r = 64;
  return (
    <div
      style={{
        alignSelf: side === "left" ? "flex-start" : "flex-end",
        background: t === "light" ? c.bubbleLight : c.bubbleDark,
        color: t === "light" ? c.textOnLight : c.textOnDark,
        borderRadius: tail ? (side === "left" ? `${r}px ${r}px ${r}px 14px` : `${r}px ${r}px 14px ${r}px`) : r,
        padding: "36px 48px",
        boxShadow: shadow,
        fontSize: 40,
        lineHeight: 1.32,
        maxWidth: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Row: React.FC<{ side: Side; avatar: React.ReactNode; children: React.ReactNode }> = ({ side, avatar, children }) => (
  <div style={{ display: "flex", flexDirection: side === "left" ? "row" : "row-reverse", alignItems: "flex-end", gap: 20 }}>
    {avatar}
    <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1, alignItems: side === "left" ? "flex-start" : "flex-end" }}>{children}</div>
  </div>
);

export const Name: React.FC<{ children: React.ReactNode; side: Side }> = ({ children, side }) => (
  <div style={{ fontFamily: label, fontWeight: 700, fontSize: 24, letterSpacing: 2.5, color: c.bubbleLight, opacity: 0.9, textTransform: "uppercase", alignSelf: side === "left" ? "flex-start" : "flex-end", padding: "0 12px" }}>
    {children}
  </div>
);

export const Big: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 64 }) => (
  <div style={{ fontWeight: 700, fontSize: size, lineHeight: 1.08, letterSpacing: -1 }}>{children}</div>
);

export const Hl: React.FC<{ children: React.ReactNode; on: "light" | "dark" }> = ({ children, on }) => (
  <span style={{ color: on === "light" ? c.accent : "#FF8A5C" }}>{children}</span>
);

export const Fill: React.FC<{ text: string; on: "light" | "dark" }> = ({ text, on }) =>
  isPlaceholder(text) ? (
    <span style={{ display: "inline-block", marginTop: 6, border: `2px dashed ${on === "light" ? c.textOnLight : c.textOnDark}`, borderRadius: 14, padding: "2px 12px", opacity: 0.75 }}>{text}</span>
  ) : (
    <>{text}</>
  );

export const Input: React.FC<{ text: string; typed?: boolean }> = ({ text, typed }) => (
  <div
    style={{
      background: c.bubbleLight,
      borderRadius: 100,
      height: 150,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 18px 0 56px",
      boxShadow: shadow,
    }}
  >
    <div style={{ fontSize: typed ? 64 : 40, fontWeight: typed ? 700 : 400, color: typed ? c.textOnLight : c.accent, letterSpacing: typed ? 2 : 0, display: "flex", alignItems: "center" }}>
      {text}
      {typed ? <span style={{ width: 5, height: 64, background: c.accent, marginLeft: 8, borderRadius: 3 }} /> : null}
    </div>
    <div style={{ width: 114, height: 114, borderRadius: "50%", background: c.bubbleDark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Arrow dir="up" size={52} color={c.creme} />
    </div>
  </div>
);

export const System: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ alignSelf: "center", background: "rgba(74,22,6,0.35)", color: c.creme, fontSize: 26, fontWeight: 500, padding: "14px 30px", borderRadius: 100 }}>{children}</div>
);
