import { Composition } from "remotion";
import { OrcamentoAtrasado } from "./reforma100/OrcamentoAtrasado";
import { SemResposta } from "./reforma100/SemResposta";
import { VisitaDesmarcada } from "./reforma100/VisitaDesmarcada";

// Reels: 9:16, 1080x1920, 30fps. Ative mostrarGuia no Studio para ver a área segura.
const formato = { fps: 30, width: 1080, height: 1920, defaultProps: { mostrarGuia: false } } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="SemResposta" component={SemResposta} durationInFrames={90} {...formato} />
      <Composition id="VisitaDesmarcada" component={VisitaDesmarcada} durationInFrames={90} {...formato} />
      <Composition id="OrcamentoAtrasado" component={OrcamentoAtrasado} durationInFrames={90} {...formato} />
    </>
  );
};
