import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fontes empacotadas em public/fonts (SIL OFL, via Fontsource) para renderizar offline.
const carregar = (familia: string, arquivo: string, peso: string) =>
  loadFont({ family: familia, url: staticFile(`fonts/${arquivo}-latin-${peso}-normal.woff2`), weight: peso });

["600", "800"].forEach((peso) => carregar("Baloo 2", "baloo-2", peso));
["500", "600", "700", "800"].forEach((peso) => carregar("Montserrat", "montserrat", peso));

export const cores = {
  azul: "#2B2E83",
  azulEscuro: "#1E2062",
  laranja: "#F7941D",
  branco: "#FFFFFF",
  cinza: "#8A8CA8",
  cinzaClaro: "#ECEDF3",
  verde: "#2FA86B",
  vermelho: "#E5484D",
};

// Área livre da interface do Reels (legenda e perfil embaixo, botões à direita).
// Margem conservadora, não é um número oficial do Instagram.
export const areaSegura = { topo: 220, base: 1500, lateral: 110 };

export const fontes = {
  titulo: "'Baloo 2', sans-serif",
  texto: "Montserrat, sans-serif",
};
