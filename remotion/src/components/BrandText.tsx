import { interpolate, useCurrentFrame } from "remotion";

interface BrandTextProps {
  text: string;
  startFrame: number;
  fontSize?: number;
  gradient?: boolean;
  fontWeight?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
}

export const BrandText: React.FC<BrandTextProps> = ({
  text,
  startFrame,
  fontSize = 64,
  gradient = false,
  fontWeight = 700,
  fontFamily = "Geist, sans-serif",
  color = "#FFFFFF",
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [startFrame, startFrame + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(frame, [startFrame, startFrame + 18], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  const style: React.CSSProperties = {
    fontSize,
    fontWeight,
    fontFamily,
    textAlign,
    opacity,
    transform: `translateY(${y}px)`,
    ...(gradient
      ? {
          background: "linear-gradient(90deg, #0CC9F2, #4877DA, #7E44DB)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }
      : { color }),
  };

  return <div style={style}>{text}</div>;
};
