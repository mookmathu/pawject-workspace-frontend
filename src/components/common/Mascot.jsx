import React, { useEffect, useRef, useState } from "react";

import earsLine from "../../assets/mascots/ears-line.png";
import earsFill from "../../assets/mascots/ears-fill.png";
import earsBody from "../../assets/mascots/ears-body.png";
import puppyLine from "../../assets/mascots/puppy-line.png";
import puppyFill from "../../assets/mascots/puppy-fill.png";
import puppyBody from "../../assets/mascots/puppy-body.png";
import readerLine from "../../assets/mascots/reader-line.png";
import readerFill from "../../assets/mascots/reader-fill.png";
import readerBody from "../../assets/mascots/reader-body.png";
import glassesLine from "../../assets/mascots/glasses-line.png";
import glassesFill from "../../assets/mascots/glasses-fill.png";
import glassesBody from "../../assets/mascots/glasses-body.png";
import artistLine from "../../assets/mascots/artist-line.png";
import artistFill from "../../assets/mascots/artist-fill.png";
import artistBody from "../../assets/mascots/artist-body.png";
import scarfLine from "../../assets/mascots/scarf-line.png";
import scarfFill from "../../assets/mascots/scarf-fill.png";
import scarfBody from "../../assets/mascots/scarf-body.png";

import doggo_bowl from "../../assets/doggo/bowl.png";
import doggo_dachshund from "../../assets/doggo/dachshund.png";
import doggo_huh from "../../assets/doggo/huh.png";
import doggo_ball from "../../assets/doggo/ball.png";
import doggo_bone from "../../assets/doggo/bone.png";
import doggo_frisbee from "../../assets/doggo/frisbee.png";
import doggo_house from "../../assets/doggo/house.png";
import doggo_nap from "../../assets/doggo/nap.png";
import doggo_barista from "../../assets/doggo/barista.png";
import doggo_clerk from "../../assets/doggo/clerk.png";
import doggo_music from "../../assets/doggo/music.png";
import doggo_spotty from "../../assets/doggo/spotty.png";
import doggo_scout from "../../assets/doggo/scout.png";
import doggo_cheer from "../../assets/doggo/cheer.png";
import doggo_pup from "../../assets/doggo/pup.png";
import doggo_bald from "../../assets/doggo/bald.png";

/**
 * The Pawject crew — six hand-drawn characters used across the site.
 *
 * Each drawing is stored as three alpha masks, tinted with CSS colours:
 *   fill  -> warm white, always (the characters are white all over, in light and dark mode)
 *   body  -> charcoal outline of the shapes that sit on the white fill
 *   line  -> loose strokes outside the white shapes (sparkles, whiskers) in var(--ink),
 *            so they stay visible on a dark background
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
  ears: { line: earsLine, body: earsBody, fill: earsFill, ratio: 332 / 480, label: "ลูกหมาหูกาง" },
  puppy: { line: puppyLine, body: puppyBody, fill: puppyFill, ratio: 383 / 480, label: "ลูกหมาแลบลิ้น" },
  reader: { line: readerLine, body: readerBody, fill: readerFill, ratio: 520 / 403, label: "หมาอ่านหนังสือ" },
  glasses: { line: glassesLine, body: glassesBody, fill: glassesFill, ratio: 520 / 311, label: "หมาใส่แว่น" },
  artist: { line: artistLine, body: artistBody, fill: artistFill, ratio: 455 / 520, label: "หมาศิลปิน" },
  scarf: { line: scarfLine, body: scarfBody, fill: scarfFill, ratio: 480 / 320, label: "หมาผ้าพันคอ" },
  // single-image doodles (transparent PNGs, drawn on their own)
  bowl: { single: doggo_bowl, ratio: 0.5214, label: "ชามอาหารหมา" },
  dachshund: { single: doggo_dachshund, ratio: 3.0435, label: "หมาตัวยาว" },
  huh: { single: doggo_huh, ratio: 1.02, label: "หมางง" },
  ball: { single: doggo_ball, ratio: 0.9973, label: "ลูกเทนนิส" },
  bone: { single: doggo_bone, ratio: 0.535, label: "กระดูก" },
  frisbee: { single: doggo_frisbee, ratio: 0.7089, label: "จานร่อน" },
  house: { single: doggo_house, ratio: 1.22, label: "บ้านหมา" },
  nap: { single: doggo_nap, ratio: 0.5929, label: "หมานอนพัก" },
  barista: { single: doggo_barista, ratio: 1.5217, label: "หมาริน" },
  clerk: { single: doggo_clerk, ratio: 1.5686, label: "หมาถือกระดาษ" },
  music: { single: doggo_music, ratio: 1.7073, label: "หมาฟังเพลง" },
  spotty: { single: doggo_spotty, ratio: 0.975, label: "หมาลายจุด" },
  scout: { single: doggo_scout, ratio: 1.3146, label: "หมาผ้าพันคอ" },
  cheer: { single: doggo_cheer, ratio: 0.6911, label: "หน้าหมา" },
  pup: { single: doggo_pup, ratio: 0.7982, label: "หน้าลูกหมา" },
  bald: { single: doggo_bald, ratio: 0.7607, label: "หมา Bald & Proud" },
};

export const MASCOT_NAMES = Object.keys(ART);

const CSS = `
.mascot{position:relative;display:inline-block;flex:none;line-height:0;user-select:none;-webkit-tap-highlight-color:transparent;transform-origin:50% 90%}
.mascot-fill,.mascot-body,.mascot-line{position:absolute;inset:0;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;-webkit-mask-size:100% 100%;mask-size:100% 100%}
.mascot-single{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
:root[data-theme="dark"] .mascot-single{filter:drop-shadow(0 0 1px rgba(255,255,255,.95)) drop-shadow(0 0 1px rgba(255,255,255,.6))}
.mascot-fill{background:#FFFEFC}
.mascot-body{background:#353B46}
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
        {art.single ? (
          <img className="mascot-single" src={art.single} alt="" draggable={false} />
        ) : (
          <>
            <span className="mascot-fill" style={maskFor(art.fill)} />
            <span className="mascot-body" style={maskFor(art.body)} />
            <span className="mascot-line" style={maskFor(art.line)} />
          </>
        )}
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
