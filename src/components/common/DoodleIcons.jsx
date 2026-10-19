import React from "react";

// Small hand-drawn icons (ink outline + flat tint) used instead of emoji.
const base = (size, style) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--ink)",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  style: { flexShrink: 0, verticalAlign: "-0.2em", ...style },
});

export function CrownIcon({ size = 16, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M3.6 8.2 7.6 12 12 5.2 16.4 12 20.4 8.2 18.8 18.2H5.2Z" fill="#F6D98F" />
      <path d="M5.6 20.4H18.4" />
      <circle cx="3.6" cy="7.6" r="1.1" fill="var(--bg-surface)" />
      <circle cx="12" cy="4.6" r="1.1" fill="var(--bg-surface)" />
      <circle cx="20.4" cy="7.6" r="1.1" fill="var(--bg-surface)" />
    </svg>
  );
}

export function PawPinIcon({ size = 16, style }) {
  return (
    <svg {...base(size, style)}>
      <ellipse cx="12" cy="15.6" rx="4.6" ry="3.8" fill="#F4B8B8" />
      <ellipse cx="5.8" cy="11" rx="1.8" ry="2.3" fill="#F4B8B8" transform="rotate(-20 5.8 11)" />
      <ellipse cx="9.4" cy="6.8" rx="1.8" ry="2.4" fill="#F4B8B8" transform="rotate(-8 9.4 6.8)" />
      <ellipse cx="14.8" cy="6.8" rx="1.8" ry="2.4" fill="#F4B8B8" transform="rotate(8 14.8 6.8)" />
      <ellipse cx="18.4" cy="11" rx="1.8" ry="2.3" fill="#F4B8B8" transform="rotate(20 18.4 11)" />
    </svg>
  );
}

export function CameraIcon({ size = 14, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M3.4 8.4c0-.9.7-1.6 1.6-1.6h2.2l1.4-2h6.8l1.4 2H19c.9 0 1.6.7 1.6 1.6v8.4c0 .9-.7 1.6-1.6 1.6H5c-.9 0-1.6-.7-1.6-1.6Z" fill="#A9C8F0" />
      <circle cx="12" cy="12.6" r="3.4" fill="var(--bg-surface)" />
      <circle cx="17.4" cy="9.4" r=".6" fill="var(--ink)" />
    </svg>
  );
}

export function ChatBubbleIcon({ size = 16, style }) {
  return (
    <svg {...base(size, style)}>
      <path d="M4.4 5.4h15.2c.9 0 1.6.7 1.6 1.6v8c0 .9-.7 1.6-1.6 1.6H11l-4.6 3.4v-3.4H4.4c-.9 0-1.6-.7-1.6-1.6V7c0-.9.7-1.6 1.6-1.6Z" fill="#CDBDE8" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" strokeWidth="2.6" />
    </svg>
  );
}
