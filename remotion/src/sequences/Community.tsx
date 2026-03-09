import { AbsoluteFill } from "remotion";
import { FadeSlide } from "../components/FadeSlide";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { BrandText } from "../components/BrandText";
import { GradientLine } from "../components/GradientLine";

export const Community: React.FC = () => {
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
        text="Join the Community"
        startFrame={15}
        fontSize={48}
        gradient
      />

      <div
        style={{
          position: "absolute",
          top: 170,
          display: "flex",
          gap: 30,
          justifyContent: "center",
          width: "100%",
        }}
      >
        <FadeSlide startFrame={40} direction="up" distance={30}>
          <ScreenshotFrame src="screenshots/profile.png" startFrame={0} width={520} height={380} />
        </FadeSlide>
        <FadeSlide startFrame={60} direction="up" distance={30}>
          <ScreenshotFrame src="screenshots/badges.png" startFrame={0} width={520} height={380} />
        </FadeSlide>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 100,
          display: "flex",
          gap: 30,
          justifyContent: "center",
          width: "100%",
        }}
      >
        <FadeSlide startFrame={80} direction="up" distance={30}>
          <ScreenshotFrame src="screenshots/leaderboard.png" startFrame={0} width={520} height={380} />
        </FadeSlide>
        <FadeSlide startFrame={100} direction="up" distance={30}>
          <ScreenshotFrame src="screenshots/daisy.png" startFrame={0} width={520} height={380} />
        </FadeSlide>
      </div>
    </AbsoluteFill>
  );
};
