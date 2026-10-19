import React from "react";
import Dog, { PawPrint } from "./DogSVG";
import Mascot from "../common/Mascot";

/**
 * Animated park backdrop for the Welcome launcher: drifting clouds, rolling
 * hills, a trail of paw prints and the Pawject pup wagging its tail.
 * Day/night follows :root[data-theme]. Motion stops under
 * prefers-reduced-motion.
 */
const CSS = `
.dg-sky{position:absolute;inset:0;background:linear-gradient(180deg,#CFE1F6 0%,#DCE9F8 32%,#FDEFE0 72%,#FFF9F2 100%)}
:root[data-theme="dark"] .dg-sky{background:linear-gradient(180deg,#171B26 0%,#232B3D 38%,#2E3A4A 70%,#27303A 100%)}
.dg-sun{position:absolute;top:9%;right:11%;width:76px;height:76px;border-radius:50%;background:#F6E7A9;box-shadow:0 0 0 14px rgba(246,231,169,.4),0 0 60px 22px rgba(246,214,110,.35)}
:root[data-theme="dark"] .dg-sun{background:#F3F0DC;box-shadow:inset -14px -6px 0 0 #cfcaa8,0 0 50px 12px rgba(243,240,220,.22)}
.dg-stars{position:absolute;inset:0 0 50% 0;opacity:0;transition:opacity .4s;background-image:radial-gradient(2px 2px at 12% 20%,#fff,transparent),radial-gradient(1.5px 1.5px at 28% 52%,#fff,transparent),radial-gradient(2px 2px at 44% 14%,#fff,transparent),radial-gradient(1.5px 1.5px at 63% 40%,#fff,transparent),radial-gradient(2px 2px at 78% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 90% 56%,#fff,transparent)}
:root[data-theme="dark"] .dg-stars{opacity:.9}
.dg-cloud{position:absolute;height:32px;border-radius:40px;background:rgba(255,255,255,.9);animation:dg-drift linear infinite}
.dg-cloud::before,.dg-cloud::after{content:"";position:absolute;background:inherit;border-radius:50%}
.dg-cloud::before{width:42px;height:42px;left:16%;top:-19px}
.dg-cloud::after{width:56px;height:56px;left:44%;top:-27px}
:root[data-theme="dark"] .dg-cloud{background:rgba(160,180,220,.2)}
@keyframes dg-drift{from{transform:translateX(-30vw)}to{transform:translateX(130vw)}}
.dg-bird{position:absolute;animation:dg-flap 1.2s ease-in-out infinite}
@keyframes dg-flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.45)}}
.dg-hills{position:absolute;left:0;right:0;bottom:0;height:34%}
.dg-hill{position:absolute;left:-2%;width:104%;bottom:0;height:100%}
.dg-hill path{transition:fill .3s}
.dg-h1 path{fill:#CFE3D2}.dg-h2 path{fill:#BBD8C0}.dg-h3 path{fill:#A6CBAE}
:root[data-theme="dark"] .dg-h1 path{fill:#2F4A47}:root[data-theme="dark"] .dg-h2 path{fill:#28403E}:root[data-theme="dark"] .dg-h3 path{fill:#21352F}
.dg-h1{animation:dg-sway 14s ease-in-out infinite alternate}
.dg-h2{animation:dg-sway 11s ease-in-out infinite alternate-reverse}
@keyframes dg-sway{from{transform:translateX(-10px)}to{transform:translateX(10px)}}
.dg-paw{position:absolute;opacity:0;animation:dg-step 6s ease-in-out infinite}
@keyframes dg-step{0%{opacity:0}12%{opacity:.55}60%{opacity:.55}80%,100%{opacity:0}}
.dg-dog{position:absolute;left:50%;bottom:5%;margin-left:-90px}
.dg-ball{position:absolute;bottom:6%;left:calc(50% + 120px);width:26px;height:26px;border-radius:50%;background:#F6E7A9;border:2.5px solid var(--ink);animation:dg-bounce 1.3s cubic-bezier(.3,.7,.4,1) infinite}
.dg-ball::after{content:"";position:absolute;left:3px;top:10px;width:16px;height:2.5px;background:var(--ink);opacity:.5;border-radius:2px}
@keyframes dg-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-46px)}}
.dg-bone{position:absolute;bottom:5%;left:calc(50% - 170px);transform:rotate(-14deg)}
.dg-crew{position:absolute;bottom:4%}
@media (max-width:820px){.dg-crew{display:none}}
@media (prefers-reduced-motion: reduce){.dg-cloud,.dg-bird,.dg-h1,.dg-h2,.dg-paw,.dg-ball{animation:none!important}.dg-cloud{transform:translateX(20vw)}.dg-paw{opacity:.45}}
`;

const HILL1 = "M0 40 Q120 4 260 28 T520 24 T800 32 T1100 12 T1400 30 V120 H0 Z";
const HILL2 = "M0 64 Q160 28 340 56 T700 50 T1040 62 T1400 40 V120 H0 Z";
const HILL3 = "M0 92 Q200 66 420 88 T860 82 T1400 90 V120 H0 Z";

function Bone() {
  return (
    <svg className="dg-bone" width="54" height="24" viewBox="0 0 54 24" aria-hidden="true">
      <path d="M10 6 a5 5 0 1 0 -1 9 a5 5 0 1 0 8 4 H37 a5 5 0 1 0 8 -4 a5 5 0 1 0 -1 -9 a5 5 0 1 0 -7 -3 H17 a5 5 0 1 0 -7 3 Z" fill="#FFF9F2" stroke="var(--ink)" strokeWidth="2.4" strokeLinejoin="round" transform="translate(0 1)" />
    </svg>
  );
}

export default function DogScene() {
  const paws = [
    { l: "14%", b: "16%", r: -20, d: 0 },
    { l: "21%", b: "13%", r: 12, d: 0.5 },
    { l: "28%", b: "17%", r: -14, d: 1 },
    { l: "35%", b: "13%", r: 14, d: 1.5 },
    { l: "72%", b: "14%", r: 8, d: 0.8 },
    { l: "79%", b: "18%", r: -12, d: 1.3 },
    { l: "86%", b: "14%", r: 14, d: 1.8 },
  ];
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <style>{CSS}</style>
      <div className="dg-sky" />
      <div className="dg-stars" />
      <div className="dg-sun" />
      <div className="dg-cloud" style={{ top: "14%", width: 120, animationDuration: "90s", animationDelay: "-30s" }} />
      <div className="dg-cloud" style={{ top: "28%", width: 90, animationDuration: "120s", animationDelay: "-80s", opacity: 0.85 }} />
      <div className="dg-cloud" style={{ top: "7%", width: 70, animationDuration: "150s", animationDelay: "-10s", opacity: 0.75 }} />
      {[["18%", "22%"], ["24%", "30%"], ["68%", "18%"]].map(([l, t], i) => (
        <svg key={i} className="dg-bird" style={{ left: l, top: t, animationDelay: `${i * 0.3}s` }} width="26" height="12" viewBox="0 0 26 12">
          <path d="M1 10 Q7 0 13 8 Q19 0 25 10" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ))}

      <div className="dg-hills">
        {[["dg-h1", HILL1], ["dg-h2", HILL2], ["dg-h3", HILL3]].map(([c, d]) => (
          <svg key={c} className={`dg-hill ${c}`} viewBox="0 0 1400 120" preserveAspectRatio="none" style={{ maxWidth: "none" }}>
            <path d={d} />
          </svg>
        ))}
      </div>

      {paws.map((p, i) => (
        <PawPrint key={i} className="dg-paw" size={20} color="var(--ink)" style={{ left: p.l, bottom: p.b, transform: `rotate(${p.r}deg)`, animationDelay: `${p.d}s` }} />
      ))}
      <Bone />
      <div className="dg-ball" />
      <div className="dg-crew" style={{ left: "7%" }}>
        <Mascot name="reader" width={92} anim="float" />
      </div>
      <div className="dg-crew" style={{ right: "7%" }}>
        <Mascot name="artist" width={104} anim="sway" delay={0.6} />
      </div>
      <div className="dg-crew" style={{ right: "22%", bottom: "6%" }}>
        <Mascot name="puppy" width={58} anim="bounce" delay={0.3} />
      </div>
      <div className="dg-dog">
        <Dog size={180} />
      </div>
    </div>
  );
}
