import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { DeckVideo } from "./DeckVideo";
import { deck } from "./deck";

const HANDLE = 0.4; // seconds of breathing room after each voice line

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SkillBridgeDemo"
    component={DeckVideo}
    fps={deck.fps}
    width={deck.width}
    height={deck.height}
    defaultProps={{ deck }}
    calculateMetadata={async ({ props }) => {
      const { fps, slides } = props.deck;
      // Narration owns the clock: measure every clip, convert to frames.
      const durations = await Promise.all(
        slides.map((s) => getAudioDurationInSeconds(staticFile(`audio/${s.audioUrl}`)))
      );
      const timed = slides.map((s, i) => {
        const prevSection = slides[i - 1]?.kind === "section";
        const nextSection = slides[i + 1]?.kind === "section";
        // A transition overlaps its neighbors; give each slide its budget back.
        const trans = prevSection || nextSection ? 24 : 15;
        return {
          ...s,
          durationInFrames: Math.ceil((durations[i] + HANDLE) * fps) + trans,
        };
      });
      const total = timed.reduce((n, s) => n + s.durationInFrames, 0);
      return {
        durationInFrames: total,
        props: { deck: { ...props.deck, slides: timed } },
      };
    }}
  />
);