import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { theme } from "../theme";
import { useEnter } from "../useEnter";
import { BulletList } from "./BulletList";

// A content slide: claim on the left, a real app screenshot on the right.
// Narration is mounted by the sequencer inside the same Sequence as this
// component, so voice and visuals cannot drift.
export const Slide: React.FC<{
  title: string;
  bullets: string[];
  image: string;
}> = ({ title, bullets, image }) => {
  const head = useEnter(0);
  const img = useEnter(4, 16);

  return (
    <AbsoluteFill style={{ background: theme.bg, padding: theme.pad, display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: `${theme.maxWidthPct}%`, width: "100%", display: "flex", gap: 72, alignItems: "center" }}>
        <div style={{ flex: "1 1 44%", minWidth: 0 }}>
          <h2
            style={{
              ...head,
              color: theme.fg,
              fontFamily: theme.serif,
              fontWeight: 600,
              fontSize: theme.titlePx,
              margin: "0 0 44px",
              lineHeight: 1.12,
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </h2>
          <BulletList items={bullets} />
        </div>
        <div style={{ ...img, flex: "1 1 50%", minWidth: 0 }}>
          <Img
            src={staticFile(`shots/${image}`)}
            style={{
              width: "100%",
              borderRadius: 18,
              border: `1px solid ${theme.line}33`,
              boxShadow: "0 20px 70px rgba(0,0,0,0.42)",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};