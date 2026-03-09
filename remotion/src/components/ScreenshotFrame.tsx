import { Img, interpolate, useCurrentFrame, staticFile } from "remotion";

interface ScreenshotFrameProps {
  src: string;
  startFrame: number;
  width?: number;
  height?: number;
}

export const ScreenshotFrame: React.FC<ScreenshotFrameProps> = ({
  src,
  startFrame,
  width = 1200,
  height = 675,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [startFrame, startFrame + 15], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(12, 201, 242, 0.3), 0 0 80px rgba(126, 68, 219, 0.15)",
      }}
    >
      <Img src={staticFile(src)} style={{ width, height, objectFit: "cover" }} />
    </div>
  );
};
