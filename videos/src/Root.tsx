import { Composition } from "remotion";
import { CabecaFlutuante, cabecaSchema } from "./CabecaFlutuante";
import { ConselhoDigitando, conselhoSchema } from "./ConselhoDigitando";

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
    </>
  );
};
