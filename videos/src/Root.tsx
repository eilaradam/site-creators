import { Composition } from "remotion";
import { CabecaFlutuante, cabecaSchema } from "./CabecaFlutuante";

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
    </>
  );
};
