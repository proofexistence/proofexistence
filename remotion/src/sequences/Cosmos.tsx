import { AbsoluteFill } from "remotion";
import { FadeSlide } from "../components/FadeSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { BrandText } from "../components/BrandText";
import { GradientLine } from "../components/GradientLine";

export const Cosmos: React.FC = () => {
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
        text="Explore the Cosmos"
        startFrame={15}
        fontSize={48}
        gradient
      />

      <div style={{ position: "absolute", top: 160 }}>
        <FadeSlide startFrame={30} exitFrame={150} direction="right">
          <ScreenshotFrame src="screenshots/cosmos-1.png" startFrame={0} width={1100} height={619} />
        </FadeSlide>
      </div>

      <div style={{ position: "absolute", top: 160 }}>
        <FadeSlide startFrame={160} direction="right">
          <ScreenshotFrame src="screenshots/cosmos-2.png" startFrame={0} width={1100} height={619} />
        </FadeSlide>
      </div>

      <div style={{ position: "absolute", bottom: 60 }}>
        <BrandText
          text="Every trail becomes a star in an infinite universe"
          startFrame={60}
          fontSize={28}
          color="#94A3B8"
          fontWeight={400}
        />
      </div>
    </AbsoluteFill>
  );
};
