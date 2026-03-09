import { AbsoluteFill } from "remotion";
import { FadeSlide } from "../components/FadeSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { BrandText } from "../components/BrandText";
import { GradientLine } from "../components/GradientLine";

export const LightTrail: React.FC = () => {
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
        text="Draw Your Light Trail"
        startFrame={15}
        fontSize={48}
        gradient
      />

      <div style={{ position: "absolute", top: 160 }}>
        <FadeSlide startFrame={30} exitFrame={150} direction="right">
          <ScreenshotFrame src="screenshots/light-trail-1.png" startFrame={0} width={1000} height={563} />
        </FadeSlide>
      </div>

      <div style={{ position: "absolute", top: 160 }}>
        <FadeSlide startFrame={160} direction="right">
          <ScreenshotFrame src="screenshots/light-trail-2.png" startFrame={0} width={1000} height={563} />
        </FadeSlide>
      </div>

      <div style={{ position: "absolute", bottom: 60 }}>
        <BrandText
          text="Express yourself in 3D space"
          startFrame={60}
          fontSize={28}
          color="#94A3B8"
          fontWeight={400}
        />
      </div>
    </AbsoluteFill>
  );
};
