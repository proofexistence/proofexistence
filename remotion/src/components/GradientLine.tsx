import { interpolate, useCurrentFrame } from "remotion";

interface GradientLineProps {
  startFrame: number;
  durationFrames?: number;
  width?: number;
  height?: number;
}

export const GradientLine: React.FC<GradientLineProps> = ({
  startFrame,
  durationFrames = 12,
  width = 1920,
  height = 3,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [startFrame, startFrame + durationFrames + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: width * progress,
        height,
        opacity,
        background: "linear-gradient(90deg, #0CC9F2, #4877DA, #7E44DB)",
        position: "absolute",
        bottom: 0,
        left: 0,
      }}
    />
  );
};
