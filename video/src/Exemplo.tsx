import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const Exemplo: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontSize: 96, fontFamily: "sans-serif", opacity }}>Remotion</h1>
    </AbsoluteFill>
  );
};
