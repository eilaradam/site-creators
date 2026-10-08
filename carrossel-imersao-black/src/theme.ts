import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fontes locais em public/fonts (render funciona offline)
const fonts: [string, string, string][] = [
  ["DM Sans", "400", "DMSans-400.woff2"],
  ["DM Sans", "500", "DMSans-500.woff2"],
  ["DM Sans", "700", "DMSans-700.woff2"],
  ["Montserrat", "600", "Montserrat-600.woff2"],
  ["Montserrat", "700", "Montserrat-700.woff2"],
  ["DM Mono", "500", "DMMono-500.woff2"],
];
for (const [family, weight, file] of fonts) {
  loadFont({ family, weight, url: staticFile(`fonts/${file}`), format: "woff2" });
}

export const sans = "'DM Sans', sans-serif";
export const label = "Montserrat, sans-serif";
export const mono = "'DM Mono', monospace";

export const W = 1080;
export const H = 1350;

export const c = {
  page: "#FFF4EE",
  cardTop: "#D4542A",
  cardBottom: "#9E3410",
  bubbleLight: "#FFE6DA",
  textOnLight: "#5A1C08",
  bubbleDark: "#4A1606",
  textOnDark: "#FFF8F2",
  accent: "#C8441A",
  grafite: "#1B1B1B",
  creme: "#FFF8F2",
};

export const shadow = "0 18px 40px rgba(74, 22, 6, 0.28)";
