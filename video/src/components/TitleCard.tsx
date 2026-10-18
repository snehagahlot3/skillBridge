import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { theme } from "../theme";
import { useEnter } from "../useEnter";

export const TitleCard: React.FC<{ title: string; subtitle?: string; image?: string }> = ({
  title,
  subtitle,
  image,
}) => {
  const t = useEnter(0);
  const s = useEnter(10);
  const bar = useEnter(16);
  const img = useEnter(6, 16);

  return (
    <AbsoluteFill style={{ background: theme.bg, padding: theme.pad, display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: `${theme.maxWidthPct}%`, width: "100%", display: "flex", gap: 80, alignItems: "center" }}>
        <div style={{ flex: "1 1 46%" }}>
          <h1
            style={{
              ...t,
              color: theme.fg,
              fontFamily: theme.serif,
              fontWeight: 600,
              fontSize: 92,
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                ...s,
                color: theme.dim,
                fontFamily: theme.font,
                fontWeight: 400,
                fontSize: 32,
                marginTop: 28,
                lineHeight: 1.4,
                maxWidth: 720,
              }}
            >
              {subtitle}
            </p>
          )}
          <div style={{ ...bar, width: 120, height: 8, background: theme.accent, marginTop: 44, borderRadius: 4 }} />
        </div>
        {image && (
          <div style={{ ...img, flex: "1 1 48%" }}>
            <Img
              src={staticFile(`shots/${image}`)}
              style={{
                width: "100%",
                borderRadius: 20,
                border: `1px solid ${theme.line}33`,
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              }}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};