import React from "react";
import { Still } from "remotion";
import { slides } from "./slides";
import { H, W } from "./theme";

export const Root: React.FC = () => (
  <>
    {slides.map((S, i) => (
      <Still key={i} id={`slide-${String(i + 1).padStart(2, "0")}`} component={S} width={W} height={H} />
    ))}
  </>
);
