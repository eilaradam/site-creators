import React from "react";
import { AbsoluteFill, Still } from "remotion";
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
  </>
);
