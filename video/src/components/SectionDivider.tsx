import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { useEnter } from "../useEnter";

export const SectionDivider: React.FC<{ index: number; title: string }> = ({ index, title }) => {
  const num = useEnter(0);
  const ttl = useEnter(8);
  const bar = useEnter(14);

  return (
    <AbsoluteFill style={{ background: theme.accent, padding: theme.pad, justifyContent: "center" }}>
      <div style={{ ...num, color: theme.bg, fontFamily: theme.serif, fontWeight: 700, fontSize: theme.sectionPx, opacity: 0.28, lineHeight: 1 }}>
        {String(index).padStart(2, "0")}
      </div>
      <h2 style={{ ...ttl, color: theme.bg, fontFamily: theme.serif, fontWeight: 600, fontSize: 76, margin: "8px 0 0", letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <div style={{ ...bar, width: 96, height: 8, background: theme.bg, marginTop: 36, borderRadius: 4, opacity: 0.7 }} />
    </AbsoluteFill>
  );
};