import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// One motion language: fade + rise, critically damped so it arrives and never bounces.
export const useEnter = (delayFrames = 0, durationInFrames = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - delayFrames,
    fps,
    durationInFrames,
    config: { damping: 200 },
  });
  return {
    opacity: p,
    transform: `translateY(${interpolate(p, [0, 1], [18, 0])}px)`,
  };
};