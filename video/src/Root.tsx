import { Composition } from "remotion";
import { Exemplo } from "./Exemplo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Exemplo"
      component={Exemplo}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
