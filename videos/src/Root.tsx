import { Composition } from "remotion";
import { CabecaFlutuante, cabecaSchema } from "./CabecaFlutuante";
import { ConselhoDigitando, conselhoSchema } from "./ConselhoDigitando";
import { CarrosselCreators, carrosselSchema } from "./CarrosselCreators";
import { CarrosselJulho, julhoSchema } from "./CarrosselJulho";
import { CarrosselJulhoEstilos, julhoEstilosSchema } from "./CarrosselJulhoEstilos";
import { LogoCreators, logoSchema } from "./LogoCreators";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vídeo vertical 1080x1920, 30fps, 5 segundos (150 frames) */}
      <Composition
        id="CabecaFlutuante"
        component={CabecaFlutuante}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={cabecaSchema}
        defaultProps={{
          textoTopo: "TUTORIAL",
          textoBaixo: "Como Criar esse efeito no Claude",
          palavraDestaque: "Claude",
          corDestaque: "#E8623D",
          corTexto: "#17223B",
        }}
      />

      {/* Conselho "sendo digitado" com som de teclado — 5s (150 frames) */}
      <Composition
        id="ConselhoDigitando"
        component={ConselhoDigitando}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={conselhoSchema}
        defaultProps={{
          texto:
            "A vida não é justa, e tudo bem! Você não precisa que ela seja justa para seguir.",
          destaque: "e tudo bem!",
          corFundoA: "#CDEBF6",
          corFundoB: "#9FCBE6",
          corVerde: "#2BD49B",
          corLaranja: "#E8623D",
          corTexto: "#16314A",
        }}
      />

      {/* Carrossel de feed 1080x1350 (4:5). Renderize cada card como still
          mudando a prop `indice` (0=capa ... 5=CTA). */}
      <Composition
        id="CarrosselCreators"
        component={CarrosselCreators}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
        schema={carrosselSchema}
        defaultProps={{ indice: 0 }}
      />

      {/* Carrossel de JULHO (template Lara Dam | UGC Manager) — 1080x1350.
          9 lâminas: capa (0), datas (1..7) e CTA (8). */}
      <Composition
        id="CarrosselJulho"
        component={CarrosselJulho}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
        schema={julhoSchema}
        defaultProps={{ indice: 0 }}
      />

      {/* 3 novas direções visuais do carrossel de julho (pra escolher).
          versao: 1=Editorial, 2=Bold Dark, 3=Soft Pastel. indice 0..7. */}
      <Composition
        id="CarrosselJulhoEstilos"
        component={CarrosselJulhoEstilos}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1350}
        schema={julhoEstilosSchema}
        defaultProps={{ versao: 1, indice: 0 }}
      />

      {/* Logo animado "Creators da Shô" — 1080x1080, 3s. variante 1/2/3 */}
      <Composition
        id="LogoCreators"
        component={LogoCreators}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1080}
        schema={logoSchema}
        defaultProps={{ variante: 1 }}
      />
    </>
  );
};
