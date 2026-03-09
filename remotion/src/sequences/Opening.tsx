import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from "remotion";
import { BrandText } from "../components/BrandText";

export const Opening: React.FC = () => {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [30, 60], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <Img
          src={staticFile("proof_existence_logo.png")}
          style={{
            width: 200,
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        />
        <BrandText
          text="Prove You Exist"
          startFrame={75}
          fontSize={56}
          gradient
        />
      </div>
    </AbsoluteFill>
  );
};
