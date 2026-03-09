import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from "remotion";
import { BrandText } from "../components/BrandText";
import { GradientLine } from "../components/GradientLine";

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();

  const logoOpacity = interpolate(frame, [15, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoScale = interpolate(frame, [15, 45], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowIntensity = interpolate(
    Math.sin(frame * 0.15),
    [-1, 1],
    [0.3, 0.8],
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <GradientLine startFrame={0} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
        }}
      >
        <Img
          src={staticFile("proof_existence_logo.png")}
          style={{
            width: 160,
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        />

        <BrandText
          text="Start Drawing"
          startFrame={50}
          fontSize={52}
          gradient
          fontWeight={700}
        />

        <div
          style={{
            opacity: interpolate(frame, [70, 90], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              padding: "16px 48px",
              borderRadius: 999,
              background: `linear-gradient(90deg, rgba(12,201,242,${glowIntensity}), rgba(72,119,218,${glowIntensity}), rgba(126,68,219,${glowIntensity}))`,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <span
              style={{
                color: "#FFFFFF",
                fontSize: 28,
                fontWeight: 500,
                fontFamily: "Geist, sans-serif",
                letterSpacing: 2,
              }}
            >
              proofexistence.com
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
