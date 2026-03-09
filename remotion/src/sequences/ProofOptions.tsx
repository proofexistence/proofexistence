import { AbsoluteFill } from "remotion";
import { FadeSlide } from "../components/FadeSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { BrandText } from "../components/BrandText";
import { GradientLine } from "../components/GradientLine";

export const ProofOptions: React.FC = () => {
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
        text="Choose Your Proof"
        startFrame={15}
        fontSize={48}
        gradient
      />

      <div
        style={{
          position: "absolute",
          top: 180,
          display: "flex",
          gap: 40,
          justifyContent: "center",
          width: "100%",
        }}
      >
        <FadeSlide startFrame={40} direction="up" distance={40}>
          <ScreenshotFrame src="screenshots/proof-standard.png" startFrame={0} width={400} height={500} />
        </FadeSlide>

        <FadeSlide startFrame={60} direction="up" distance={40}>
          <ScreenshotFrame src="screenshots/proof-pol.png" startFrame={0} width={400} height={500} />
        </FadeSlide>

        <FadeSlide startFrame={80} direction="up" distance={40}>
          <ScreenshotFrame src="screenshots/proof-time26.png" startFrame={0} width={400} height={500} />
        </FadeSlide>
      </div>

      <div style={{ position: "absolute", bottom: 60, display: "flex", gap: 120 }}>
        <BrandText text="Free" startFrame={50} fontSize={24} color="#22C55E" fontWeight={600} />
        <BrandText text="Instant · POL" startFrame={70} fontSize={24} color="#22D3EE" fontWeight={600} />
        <BrandText text="Instant · TIME26" startFrame={90} fontSize={24} color="#A855F7" fontWeight={600} />
      </div>
    </AbsoluteFill>
  );
};
