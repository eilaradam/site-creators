import { Composition } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { VideoTeste } from "./VideoTeste";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titulo: "Site Creators",
        }}
      />
      <Composition
        id="VideoTeste"
        component={VideoTeste}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titulo: "Olá, Lara! 👋",
          subtitulo: "Remotion rodando aqui ✨",
        }}
      />
    </>
  );
};
