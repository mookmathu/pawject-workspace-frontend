import React from "react";

// Hand-drawn nav icons (ink outline + a flat accent fill) used on the
// Welcome launcher instead of emoji.
const ink = "var(--ink)";
const line = { fill: "none", stroke: ink, strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" };
const fillOf = (c) => ({ fill: c, stroke: ink, strokeWidth: 2.6, strokeLinejoin: "round" });

const ICONS = {
  home: (
    <>
      <path {...fillOf("#E5B94A")} d="M9 23.5L24 9.5l15 14V39c0 .8-.6 1.4-1.4 1.4H10.4C9.6 40.4 9 39.8 9 39z" />
      <path {...fillOf("#E8956B")} d="M5.5 25.5L24 7.5l18.5 18" fill="none" />
      <path {...fillOf("#fff")} d="M20 40.4V30c0-.8.6-1.4 1.4-1.4h5.2c.8 0 1.4.6 1.4 1.4v10.4" />
    </>
  ),
  dashboard: (
    <>
      <path {...fillOf("#fff")} d="M7 8.5c10-.8 24-.6 34 0 .6 10 .6 21 0 31-10 .8-24 .6-34 0-.6-10-.6-21 0-31z" />
      <path {...fillOf("#8DB6EA")} d="M13 36V26h6v10zM22 36V16h6v20z" />
      <path {...fillOf("#E5B94A")} d="M31 36V22h6v14z" />
    </>
  ),
  task: (
    <>
      <path {...fillOf("#fff")} d="M8 9c10-.7 22-.7 32 0 .6 10 .6 20 0 30-10 .7-22 .7-32 0-.6-10-.6-20 0-30z" />
      <path {...line} d="M24 9v30" />
      <path {...fillOf("#7FBF8E")} d="M12 15h8v7h-8zM12 26h8v6h-8z" />
      <path {...fillOf("#E5B94A")} d="M28 15h8v9h-8z" />
    </>
  ),
  chat: (
    <>
      <path {...fillOf("#8DB6EA")} d="M8 12c10-.9 22-.9 32 0 .8 6.4.8 12.6 0 19-5.4.5-9.4.6-13 .5L17 39.5V31.8c-3.2-.1-6.4-.3-9-.8-.8-6.4-.8-12.6 0-19z" />
      <path {...line} strokeWidth={2.4} d="M15 19h18M15 25h11" />
    </>
  ),
  calendar: (
    <>
      <path {...fillOf("#fff")} d="M7 12c10-.8 24-.8 34 0 .7 9.4.7 19.6 0 28-10 .8-24 .8-34 0-.7-8.4-.7-18.6 0-28z" />
      <path {...fillOf("#E8956B")} d="M7 12c10-.8 24-.8 34 0l.3 7.5H6.7z" />
      <path {...line} d="M15 6.5v8M33 6.5v8" />
      <path {...fillOf("#E5B94A")} d="M13 25h6v5h-6zM22 25h6v5h-6z" />
      <path {...line} strokeWidth={2.2} d="M13 34h6M22 34h6M31 25h4" />
    </>
  ),
  profile: (
    <>
      <circle cx="24" cy="17" r="8" {...fillOf("#E5B94A")} />
      <path {...fillOf("#8DB6EA")} d="M8 41c1-9 7-14 16-14s15 5 16 14z" />
    </>
  ),
};

export default function DoodleIcon({ name, size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: "block" }}>
      {ICONS[name]}
    </svg>
  );
}
