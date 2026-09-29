import { Composition } from "remotion";
import { OrcamentoAtrasado } from "./reforma100/OrcamentoAtrasado";
import { SemResposta } from "./reforma100/SemResposta";
import { VisitaDesmarcada } from "./reforma100/VisitaDesmarcada";

const formato = { fps: 30, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="SemResposta" component={SemResposta} durationInFrames={195} {...formato} />
      <Composition id="VisitaDesmarcada" component={VisitaDesmarcada} durationInFrames={180} {...formato} />
      <Composition id="OrcamentoAtrasado" component={OrcamentoAtrasado} durationInFrames={225} {...formato} />
    </>
  );
};
