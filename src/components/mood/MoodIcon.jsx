import React from "react";
import { MOOD_BY_KEY } from "../../lib/mood";
import love from "../../assets/moods/love.png";
import good from "../../assets/moods/good.png";
import ok from "../../assets/moods/ok.png";
import stressed from "../../assets/moods/stressed.png";
import sad from "../../assets/moods/sad.png";

// Hand-drawn scribble faces (thick black outline, pastel fill).
const IMAGES = { love, good, ok, stressed, sad };

export default function MoodIcon({ mood, size = 32, style }) {
  const m = MOOD_BY_KEY[mood];
  if (!m) return null;
  return (
    <img
      src={IMAGES[m.key]}
      alt={m.label}
      draggable={false}
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0, ...style }}
    />
  );
}
