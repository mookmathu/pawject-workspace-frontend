import React from "react";
import sprite from "../../assets/images/blink-dog.png";

/**
 * The profile pup that blinks and glances sideways. The 18 animation frames
 * (from the Blink.mp4 drawing) are packed side by side in one transparent PNG
 * and played with a CSS steps() animation: one ~1.5s blink, then a pause.
 */
const FRAMES = 18;
const RATIO = 358 / 340; // frame height / width

const CSS = `
.blink-dog { display: inline-block; background-repeat: no-repeat; background-position: 0 0;
  animation: blink-dog-play 5s steps(17) infinite; }
@keyframes blink-dog-play {
  0% { background-position: 0% 0; }
  30% { background-position: 100% 0; }
  30.01%, 100% { background-position: 0% 0; }
}
:root[data-theme="dark"] .blink-dog { filter: drop-shadow(0 0 1px rgba(255,255,255,.9)); }
@media (prefers-reduced-motion: reduce) { .blink-dog { animation: none; } }
`;

export default function BlinkDog({ width = 260, style }) {
  return (
    <>
      <style>{CSS}</style>
      <span
        className="blink-dog"
        role="img"
        aria-label="น้องหมา Pawject กำลังกะพริบตา"
        style={{
          width,
          height: Math.round(width * RATIO),
          backgroundImage: `url(${sprite})`,
          backgroundSize: `${FRAMES * 100}% 100%`,
          ...style,
        }}
      />
    </>
  );
}
