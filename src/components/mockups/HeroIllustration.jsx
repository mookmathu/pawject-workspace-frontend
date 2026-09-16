import React from "react";

/**
 * Hand-drawn hero illustration: sailboat + birds + layered waves,
 * all drawn as ink-stroke SVG paths so they match the doodle border
 * style used everywhere else (2-2.5px #221D17 strokes, no fill or
 * flat fill only).
 */
export default function HeroIllustration({ style }) {
  return (
    <svg
      viewBox="0 0 900 340"
      style={style}
      preserveAspectRatio="xMidYMax meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* birds */}
      <path d="M120 60 Q132 48 144 60 Q156 48 168 60" stroke="#221D17" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M660 40 Q672 28 684 40 Q696 28 708 40" stroke="#221D17" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M520 90 Q530 80 540 90 Q550 80 560 90" stroke="#221D17" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85" />

      {/* far wave line */}
      <path
        d="M0 210 Q45 198 90 210 T180 210 T270 210 T360 210 T450 210 T540 210 T630 210 T720 210 T810 210 T900 210"
        stroke="#FFFDF8" strokeOpacity="0.5" strokeWidth="2.5" fill="none"
      />

      {/* sailboat */}
      <g transform="translate(360, 120)">
        {/* mast */}
        <line x1="90" y1="10" x2="90" y2="130" stroke="#221D17" strokeWidth="3" strokeLinecap="round" />
        {/* mainsail */}
        <path d="M92 16 L92 122 L168 122 Z" fill="#FFFDF8" stroke="#221D17" strokeWidth="3" strokeLinejoin="round" />
        {/* jib */}
        <path d="M88 40 L88 122 L28 122 Z" fill="#FFFDF8" stroke="#221D17" strokeWidth="3" strokeLinejoin="round" />
        {/* hull */}
        <path
          d="M10 130 L170 130 L150 172 Q90 190 30 172 Z"
          fill="#F4B740" stroke="#221D17" strokeWidth="3" strokeLinejoin="round"
        />
        {/* flag */}
        <path d="M90 10 L112 16 L90 22 Z" fill="#E0473E" stroke="#221D17" strokeWidth="2" strokeLinejoin="round" />
      </g>

      {/* near wave crests (foreground, closer together) */}
      <path
        d="M0 232 Q30 220 60 232 T120 232 T180 232 T240 232 T300 232 T360 232 T420 232 T480 232 T540 232 T600 232 T660 232 T720 232 T780 232 T840 232 T900 232"
        stroke="#FFFDF8" strokeOpacity="0.75" strokeWidth="3" fill="none"
      />
      <path
        d="M0 256 Q22 246 44 256 T88 256 T132 256 T176 256 T220 256 T264 256 T308 256 T352 256 T396 256 T440 256 T484 256 T528 256 T572 256 T616 256 T660 256 T704 256 T748 256 T792 256 T836 256 T880 256"
        stroke="#FFFDF8" strokeOpacity="0.9" strokeWidth="2.5" fill="none"
      />
    </svg>
  );
}
