import { useEffect, useState } from "react";
import BlinkDog from "./BlinkDog";

// Plays once per browser session when the site is opened: the blinking dog in
// the centre, ripples spreading out like a water drop, then a circular reveal.
const KEY = "pawject_intro_seen";
const REVEAL_AT = 2000; // ms — start the circular reveal
const END_AT = 2900; // ms — unmount

function shouldPlay() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (window.sessionStorage.getItem(KEY)) return false;
  } catch (e) {
    /* storage blocked — just play it */
  }
  return true;
}

export default function SplashIntro() {
  const [show] = useState(shouldPlay);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!show) return undefined;
    try {
      window.sessionStorage.setItem(KEY, "1");
    } catch (e) {
      /* ignore */
    }
    const t1 = setTimeout(() => setLeaving(true), REVEAL_AT);
    const t2 = setTimeout(() => setDone(true), END_AT);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [show]);

  if (!show || done) return null;

  const size = Math.round(Math.min(window.innerWidth * 0.46, 220));

  const skip = () => {
    setLeaving(true);
    setTimeout(() => setDone(true), 900);
  };

  return (
    <div
      className={`splash ${leaving ? "splash-leave" : ""}`}
      onClick={skip}
      role="presentation"
      aria-hidden="true"
    >
      <style>{`
        @property --splash-r { syntax: "<length>"; inherits: false; initial-value: 0px; }
        .splash {
          position: fixed; inset: 0; z-index: 10000; cursor: pointer;
          background: var(--bg-page, #fffdf8);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
        }
        .splash-leave {
          animation: splashReveal .85s cubic-bezier(.65,0,.35,1) forwards;
          -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent var(--splash-r), #000 calc(var(--splash-r) + 1px));
                  mask-image: radial-gradient(circle at 50% 50%, transparent var(--splash-r), #000 calc(var(--splash-r) + 1px));
        }
        @keyframes splashReveal {
          0%   { --splash-r: 0px; opacity: 1; }
          80%  { opacity: 1; }
          100% { --splash-r: 80vmax; opacity: 0; }
        }
        .splash-stage { position: relative; width: var(--sd); }
        .splash-ring {
          position: absolute; left: 50%; top: 50%;
          width: var(--sd); aspect-ratio: 1; border-radius: 50%;
          border: 2px solid var(--accent-color, #f08a5d);
          background: color-mix(in srgb, var(--accent-color, #f08a5d) 12%, transparent);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          animation: splashRipple 1.7s cubic-bezier(.2,.6,.3,1) infinite;
        }
        .splash-ring.r2 { animation-delay: .45s; background: transparent; }
        .splash-ring.r3 { animation-delay: .9s; background: transparent; border-width: 1.5px; }
        @keyframes splashRipple {
          0%   { transform: translate(-50%, -50%) scale(.15); opacity: .95; }
          70%  { opacity: .35; }
          100% { transform: translate(-50%, -50%) scale(4.2); opacity: 0; }
        }
        .splash-dog { position: relative; animation: splashPop .55s cubic-bezier(.3,1.5,.5,1) both; }
        @keyframes splashPop { 0% { transform: scale(.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .splash-leave .splash-dog { animation: splashDogOut .5s ease-in forwards; }
        @keyframes splashDogOut { to { transform: scale(.85); opacity: 0; } }
        .splash-leave .splash-ring { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .splash { display: none; } }
      `}</style>
      <div className="splash-stage" style={{ "--sd": `${size}px` }}>
        <span className="splash-ring r1" />
        <span className="splash-ring r2" />
        <span className="splash-ring r3" />
        <div className="splash-dog">
          <BlinkDog width={size} />
        </div>
      </div>
    </div>
  );
}
