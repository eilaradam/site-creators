import { Composition } from "remotion";
import { Intro, introSchema } from "./Intro";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vídeo de abertura — formato vertical 1080x1920 (Reels / Stories / TikTok) */}
      <Composition
        id="Intro"
        component={Intro}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        schema={introSchema}
        defaultProps={{
          titulo: "Lara Adam",
          subtitulo: "Creators",
        }}
      />
    </>
  );
};
