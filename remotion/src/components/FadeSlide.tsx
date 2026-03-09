import { interpolate, useCurrentFrame } from "remotion";
import type { ReactNode } from "react";

type Direction = "left" | "right" | "up" | "down";

interface FadeSlideProps {
  children: ReactNode;
  startFrame: number;
  durationFrames?: number;
  direction?: Direction;
  distance?: number;
  exitFrame?: number;
  exitDurationFrames?: number;
}

const directionOffset = (dir: Direction, distance: number) => {
  switch (dir) {
    case "right": return { x: distance, y: 0 };
    case "left": return { x: -distance, y: 0 };
    case "up": return { x: 0, y: -distance };
    case "down": return { x: 0, y: distance };
  }
};

export const FadeSlide: React.FC<FadeSlideProps> = ({
  children,
  startFrame,
  durationFrames = 15,
  direction = "right",
  distance = 80,
  exitFrame,
  exitDurationFrames = 9,
}) => {
  const frame = useCurrentFrame();
  const offset = directionOffset(direction, distance);

  const enterOpacity = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterX = interpolate(frame, [startFrame, startFrame + durationFrames], [offset.x, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterY = interpolate(frame, [startFrame, startFrame + durationFrames], [offset.y, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let exitOpacity = 1;
  let exitX = 0;
  let exitY = 0;
  if (exitFrame !== undefined) {
    exitOpacity = interpolate(frame, [exitFrame, exitFrame + exitDurationFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    exitX = interpolate(frame, [exitFrame, exitFrame + exitDurationFrames], [0, -offset.x], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    exitY = interpolate(frame, [exitFrame, exitFrame + exitDurationFrames], [0, -offset.y], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  const opacity = enterOpacity * exitOpacity;
  const x = enterX + exitX;
  const y = enterY + exitY;

  if (frame < startFrame) return null;
  if (exitFrame !== undefined && frame > exitFrame + exitDurationFrames) return null;

  return (
    <div style={{ opacity, transform: `translate(${x}px, ${y}px)` }}>
      {children}
    </div>
  );
};
