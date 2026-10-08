import React from "react";
import { AbsoluteFill, Composition, Still } from "remotion";
import { Chili, TermoBlocos, TermoFerve, TermoSobe, hot } from "./termometro";
import { ChatCamila, ChatLara, slides } from "./slides";
import { H, W, sans } from "./theme";

// Só o chat, fundo transparente (para usar em outra arte)
const Solo: React.FC<{ C: React.FC<{ foto?: boolean }> }> = ({ C }) => (
  <AbsoluteFill style={{ fontFamily: sans, padding: 80, justifyContent: "center" }}>
    <C foto={false} />
  </AbsoluteFill>
);

export const Root: React.FC = () => (
  <>
    {slides.map((S, i) => (
      <Still key={i} id={`slide-${String(i + 1).padStart(2, "0")}`} component={S} width={W} height={H} />
    ))}
    <Still id="chat-lara" component={() => <Solo C={ChatLara} />} width={1016} height={H} />
    <Still id="chat-camila" component={() => <Solo C={ChatCamila} />} width={1016} height={H} />
    <Composition id="termometro-1-sobe" component={TermoSobe} width={W} height={H} fps={30} durationInFrames={150} />
    <Composition id="termometro-2-ferve" component={TermoFerve} width={W} height={H} fps={30} durationInFrames={150} />
    <Composition id="termometro-3-blocos" component={TermoBlocos} width={W} height={H} fps={30} durationInFrames={150} />
    {[...hot, "#E3D8CF"].map((cor, i) => (
      <Still key={cor} id={`pimenta-${i < 5 ? i + 1 : "apagada"}`} component={() => <Chili size={1024} color={cor} />} width={1024} height={1024} />
    ))}
  </>
);
