import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from "remotion";
import { BrandText } from "../components/BrandText";
import { GradientLine } from "../components/GradientLine";

const techItems = [
  { label: "Polygon", logo: null },
  { label: "Arweave", logo: "arweave.png" },
  { label: "Merkle Proofs", logo: null },
];

export const TechStack: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <GradientLine startFrame={0} />

      <BrandText
        text="Powered By"
        startFrame={15}
        fontSize={36}
        color="#94A3B8"
        fontWeight={400}
      />

      <div
        style={{
          display: "flex",
          gap: 80,
          alignItems: "center",
          marginTop: 40,
        }}
      >
        {techItems.map((item, i) => {
          const itemStart = 45 + i * 20;
          const opacity = interpolate(frame, [itemStart, itemStart + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = interpolate(frame, [itemStart, itemStart + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={item.label}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {item.logo && (
                <Img
                  src={staticFile(item.logo)}
                  style={{ width: 64, height: 64, objectFit: "contain" }}
                />
              )}
              <span
                style={{
                  color: "#FFFFFF",
                  fontSize: 32,
                  fontWeight: 600,
                  fontFamily: "Geist Mono, monospace",
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: 120 }}>
        <BrandText
          text="On-chain proof of your creative existence"
          startFrame={120}
          fontSize={28}
          color="#94A3B8"
          fontWeight={400}
        />
      </div>
    </AbsoluteFill>
  );
};
