import React, { useEffect, useRef, useState } from "react";

import earsLine from "../../assets/mascots/ears-line.png";
import earsFill from "../../assets/mascots/ears-fill.png";
import puppyLine from "../../assets/mascots/puppy-line.png";
import puppyFill from "../../assets/mascots/puppy-fill.png";
import readerLine from "../../assets/mascots/reader-line.png";
import readerFill from "../../assets/mascots/reader-fill.png";
import glassesLine from "../../assets/mascots/glasses-line.png";
import glassesFill from "../../assets/mascots/glasses-fill.png";
import artistLine from "../../assets/mascots/artist-line.png";
import artistFill from "../../assets/mascots/artist-fill.png";
import scarfLine from "../../assets/mascots/scarf-line.png";
import scarfFill from "../../assets/mascots/scarf-fill.png";

/**
 * The Pawject crew — six hand-drawn characters used across the site.
 *
 * Each drawing is stored as two alpha masks (outline + body fill) and tinted
 * with CSS variables, so the same artwork follows light/dark mode:
 *   outline -> var(--ink)        body -> var(--bg-surface)
 *
 *   ears     ลูกหมาหูกาง   (happy, big ears)
 *   puppy    ลูกหมาแลบลิ้น  (loading, small joys)
 *   reader   หมาอ่านหนังสือ (notes, docs, quiet pages)
 *   glasses  หมาแว่น+เนคไท  (work, checking, tasks)
 *   artist   หมาเบเร่ต์     (creative stuff, calendar, profile)
 *   scarf    หมาผ้าพันคอ    (suspicious / "huh?" moments, errors)
 *
 * Animations (prop `anim`): float | wiggle | sway | bounce | pop | none
 * Hover/tap gives every mascot a little jiggle; motion is disabled under
 * prefers-reduced-motion.
 */
const ART = {
  ears: { line: earsLine, fill: earsFill, ratio: 332 / 480, label: "ลูกหมาหูกาง" },
  puppy: { line: puppyLine, fill: puppyFill, ratio: 383 / 480, label: "ลูกหมาแลบลิ้น" },
  reader: { line: readerLine, fill: readerFill, ratio: 520 / 403, label: "หมาอ่านหนังสือ" },
  glasses: { line: glassesLine, fill: glassesFill, ratio: 520 / 311, label: "หมาใส่แว่น" },
  artist: { line: artistLine, fill: artistFill, ratio: 455 / 520, label: "หมาศิลปิน" },
  scarf: { line: scarfLine, fill: scarfFill, ratio: 480 / 320, label: "หมาผ้าพันคอ" },
};

export const MASCOT_NAMES = Object.keys(ART);

const CSS = `
.mascot{position:relative;display:inline-block;flex:none;line-height:0;user-select:none;-webkit-tap-highlight-color:transparent;transform-origin:50% 90%}
.mascot-fill,.mascot-line{position:absolute;inset:0;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:100% 100%;mask-size:100% 100%}
.mascot-fill{background:var(--bg-surface)}
.mascot-line{background:var(--ink)}
.mascot.is-flip{transform:scaleX(-1)}
.mascot-inner{position:absolute;inset:0;transform-origin:50% 92%}

.mascot-float .mascot-inner{animation:mascot-float 3.4s ease-in-out infinite}
.mascot-wiggle .mascot-inner{animation:mascot-wiggle 2.8s ease-in-out infinite}
.mascot-sway .mascot-inner{animation:mascot-sway 4.2s ease-in-out infinite}
.mascot-bounce .mascot-inner{animation:mascot-bounce 2.2s cubic-bezier(.3,.7,.4,1) infinite}
.mascot-pop .mascot-inner{animation:mascot-pop .6s cubic-bezier(.2,1.4,.4,1) both}
.mascot-peek .mascot-inner{animation:mascot-peek .7s cubic-bezier(.2,1.2,.4,1) both}
.mascot-hover:hover .mascot-inner,.mascot.is-boop .mascot-inner{animation:mascot-boop .55s ease-in-out}

@keyframes mascot-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes mascot-wiggle{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes mascot-sway{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(3deg) translateY(-4px)}}
@keyframes mascot-bounce{0%,55%,100%{transform:translateY(0) scale(1,1)}62%{transform:translateY(0) scale(1.06,.92)}78%{transform:translateY(-16px) scale(.97,1.04)}90%{transform:translateY(0) scale(1.05,.94)}}
@keyframes mascot-pop{0%{transform:scale(.3) rotate(-12deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes mascot-peek{0%{transform:translateY(70%);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes mascot-boop{0%{transform:scale(1)}25%{transform:scale(1.12,.88) rotate(-5deg)}55%{transform:scale(.94,1.08) rotate(5deg)}80%{transform:scale(1.03,.98) rotate(-2deg)}100%{transform:scale(1)}}

.mascot-shadow{position:absolute;left:12%;right:12%;bottom:-5%;height:7%;border-radius:50%;background:var(--ink);opacity:.12;filter:blur(1px)}

@media (prefers-reduced-motion: reduce){
  .mascot-inner{animation:none!important}
}
`;

let cssInjected = false;
function useMascotCss() {
  useEffect(() => {
    if (cssInjected || typeof document === "undefined") return;
    cssInjected = true;
    const el = document.createElement("style");
    el.setAttribute("data-mascot-css", "");
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

export default function Mascot({
  name = "puppy",
  width = 120,
  anim = "float",
  delay = 0,
  flip = false,
  shadow = false,
  decorative = true,
  title,
  className = "",
  style,
  onClick,
}) {
  useMascotCss();
  const art = ART[name] || ART.puppy;
  const [boop, setBoop] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick(e) {
    setBoop(false);
    // restart the animation even on rapid taps
    requestAnimationFrame(() => {
      setBoop(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setBoop(false), 600);
    });
    if (onClick) onClick(e);
  }

  const cls = ["mascot", `mascot-${anim}`, "mascot-hover", flip ? "is-flip" : "", boop ? "is-boop" : "", className]
    .filter(Boolean)
    .join(" ");
  const inner = { animationDelay: `${delay}s` };
  const maskFor = (src) => ({ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` });

  return (
    <span
      className={cls}
      style={{ width, height: Math.round(width * art.ratio), ...style }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title || art.label}
      aria-hidden={decorative ? "true" : undefined}
      onClick={handleClick}
    >
      {shadow && <span className="mascot-shadow" />}
      <span className="mascot-inner" style={inner}>
        <span className="mascot-fill" style={maskFor(art.fill)} />
        <span className="mascot-line" style={maskFor(art.line)} />
      </span>
    </span>
  );
}

/**
 * Friendly empty / loading / error block: a mascot with a short message under it.
 *   <MascotNote name="reader" text="ยังไม่มีโน้ต" sub="พิมพ์ข้อความแล้วกด Enter" />
 */
export function MascotNote({ name = "puppy", anim = "float", width = 96, text, sub, style, children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "18px 12px",
        textAlign: "center",
        color: "var(--ink-soft)",
        ...style,
      }}
    >
      <Mascot name={name} width={width} anim={anim} shadow />
      {text && <p style={{ margin: "6px 0 0", fontWeight: 700, color: "var(--ink)" }}>{text}</p>}
      {sub && <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>{sub}</p>}
      {children}
    </div>
  );
}

/**
 * A small mascot tucked into the top-right corner of an auth card.
 * The parent card needs `position: relative` (add className "has-mascot").
 */
export function CardMascot({ name = "puppy", width = 64, anim = "wiggle", ...rest }) {
  return (
    <span className="card-mascot" style={{ position: "absolute", top: 16, right: 18, zIndex: 1 }}>
      <Mascot name={name} width={width} anim={anim} {...rest} />
    </span>
  );
}
