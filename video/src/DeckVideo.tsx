import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Audio, staticFile } from "remotion";
import { TitleCard } from "./components/TitleCard";
import { SectionDivider } from "./components/SectionDivider";
import { Slide } from "./components/Slide";
import type { Deck, DeckSlide } from "./deck";

const render = (s: DeckSlide) => {
  if (s.kind === "title") return <TitleCard title={s.title} subtitle={s.subtitle} image={s.image} />;
  if (s.kind === "section") return <SectionDivider index={s.index} title={s.title} />;
  return <Slide title={s.title} bullets={s.bullets} image={s.image} />;
};

export const DeckVideo: React.FC<{ deck: Deck }> = ({ deck }) => {
  const slides = deck.slides as (DeckSlide & { durationInFrames: number })[];
  return (
    <TransitionSeries>
      {slides.map((s, i) => {
        const next = slides[i + 1];
        const big = s.kind === "section" || next?.kind === "section";
        return (
          <React.Fragment key={s.id}>
            <TransitionSeries.Sequence durationInFrames={s.durationInFrames}>
              {render(s)}
              <Audio src={staticFile(`audio/${s.audioUrl}`)} />
            </TransitionSeries.Sequence>
            {next && (
              <TransitionSeries.Transition
                timing={linearTiming({ durationInFrames: big ? 24 : 15 })}
                presentation={big ? slide() : fade()}
              />
            )}
          </React.Fragment>
        );
      })}
    </TransitionSeries>
  );
};