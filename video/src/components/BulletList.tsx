import React from "react";
import { theme } from "../theme";
import { useEnter } from "../useEnter";

const STAGGER = 8; // frames between bullets (~0.27s @ 30fps)

const Bullet: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const e = useEnter(delay);
  return (
    <li style={{ ...e, display: "flex", gap: 18, alignItems: "baseline" }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: theme.accent,
          flexShrink: 0,
          transform: "translateY(2px)",
        }}
      />
      <span
        style={{
          color: theme.fg,
          fontFamily: theme.font,
          fontWeight: 400,
          fontSize: theme.bodyPx,
          lineHeight: 1.35,
        }}
      >
        {children}
      </span>
    </li>
  );
};

export const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 26 }}>
    {items.map((text, i) => (
      <Bullet key={i} delay={i * STAGGER}>
        {text}
      </Bullet>
    ))}
  </ul>
);