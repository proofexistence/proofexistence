import { AbsoluteFill, Sequence } from "remotion";
import { Opening } from "./sequences/Opening";
import { LightTrail } from "./sequences/LightTrail";
import { ProofOptions } from "./sequences/ProofOptions";
import { Cosmos } from "./sequences/Cosmos";
import { Community } from "./sequences/Community";
import { TechStack } from "./sequences/TechStack";
import { CTA } from "./sequences/CTA";

export const PromoVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={150} name="Opening">
        <Opening />
      </Sequence>
      <Sequence from={150} durationInFrames={300} name="LightTrail">
        <LightTrail />
      </Sequence>
      <Sequence from={450} durationInFrames={300} name="ProofOptions">
        <ProofOptions />
      </Sequence>
      <Sequence from={750} durationInFrames={300} name="Cosmos">
        <Cosmos />
      </Sequence>
      <Sequence from={1050} durationInFrames={300} name="Community">
        <Community />
      </Sequence>
      <Sequence from={1350} durationInFrames={300} name="TechStack">
        <TechStack />
      </Sequence>
      <Sequence from={1650} durationInFrames={150} name="CTA">
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
