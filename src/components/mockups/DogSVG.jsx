import React from "react";

/**
 * Pawject's mascot: a hand-drawn sitting puppy (front view) with a wagging
 * tail, floppy ears and a blinking pair of eyes. Pure SVG + CSS; motion is
 * switched off under prefers-reduced-motion. Colors come from the app
 * palette (Peach Biscuit body, Vanilla Cream muzzle, Soft Charcoal ink).
 */
const CSS = `
.pw-tail{transform-origin:108px 136px;animation:pw-wag .55s ease-in-out infinite alternate}
@keyframes pw-wag{from{transform:rotate(-14deg)}to{transform:rotate(12deg)}}
.pw-ear-l{transform-origin:52px 60px;animation:pw-ear 3.6s ease-in-out infinite}
.pw-ear-r{transform-origin:108px 60px;animation:pw-ear 3.6s ease-in-out .4s infinite reverse}
@keyframes pw-ear{0%,88%,100%{transform:rotate(0)}93%{transform:rotate(-6deg)}}
.pw-eye{transform-box:fill-box;transform-origin:center;animation:pw-blink 4.5s infinite}
@keyframes pw-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.pw-head{transform-origin:80px 100px;animation:pw-tilt 6s ease-in-out infinite}
@keyframes pw-tilt{0%,70%,100%{transform:rotate(0)}78%,90%{transform:rotate(-5deg)}}
@media (prefers-reduced-motion: reduce){.pw-tail,.pw-ear-l,.pw-ear-r,.pw-eye,.pw-head{animation:none!important}}
`;

const INK = "var(--ink)";
const BODY = "#F7D9C7"; // Peach Biscuit
const EAR = "#D9A98A";
const CREAM = "#FFF9F2"; // Vanilla Cream
const sw = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" };

export default function Dog({ size = 180, style, wag = true }) {
  return (
    <svg width={size} height={size * 1.06} viewBox="0 0 160 170" style={{ display: "block", overflow: "visible", ...style }} role="img" aria-label="น้องหมา Pawject">
      <style>{CSS}</style>
      {/* tail (behind the body) */}
      <g className={wag ? "pw-tail" : undefined}>
        <path d="M106 142 Q146 138 140 98 Q133 92 128 102 Q129 126 104 130 Z" fill={EAR} {...sw} />
      </g>
      {/* body */}
      <path d="M48 168 Q42 118 80 106 Q118 118 112 168 Z" fill={BODY} {...sw} />
      <ellipse cx="80" cy="144" rx="15" ry="23" fill={CREAM} stroke="none" />
      {/* front paws */}
      <path d="M58 168 Q58 152 66 152 Q74 152 74 168 Z" fill={BODY} {...sw} />
      <path d="M86 168 Q86 152 94 152 Q102 152 102 168 Z" fill={BODY} {...sw} />
      {/* collar + tag */}
      <path d="M58 108 Q80 124 102 108" fill="none" stroke="#4F83CC" strokeWidth="7" strokeLinecap="round" />
      <path d="M58 108 Q80 124 102 108" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      <circle cx="80" cy="122" r="6" fill="#F6E7A9" {...sw} strokeWidth={2.4} />
      {/* head */}
      <g className="pw-head">
        <g className="pw-ear-l">
          <path d="M52 54 Q30 58 32 94 Q52 100 60 76 Z" fill={EAR} {...sw} />
        </g>
        <g className="pw-ear-r">
          <path d="M108 54 Q130 58 128 94 Q108 100 100 76 Z" fill={EAR} {...sw} />
        </g>
        <ellipse cx="80" cy="76" rx="36" ry="31" fill={BODY} {...sw} />
        <ellipse cx="65" cy="70" rx="10" ry="9" fill={EAR} opacity=".55" />
        <ellipse cx="80" cy="90" rx="17" ry="12.5" fill={CREAM} {...sw} strokeWidth={2.4} />
        <circle cx="66" cy="72" r="3.3" className="pw-eye" fill={INK} />
        <circle cx="94" cy="72" r="3.3" className="pw-eye" fill={INK} />
        <circle cx="67.2" cy="70.8" r="1" fill="#fff" />
        <circle cx="95.2" cy="70.8" r="1" fill="#fff" />
        <ellipse cx="80" cy="84" rx="6.5" ry="4.6" fill={INK} />
        <path d="M80 88.5 V93 M73 94 Q80 101 87 94" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M77 97 Q80 107 83.5 97 Z" fill="#F2A0B5" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="55" cy="86" r="5" fill="#F2A0B5" opacity=".45" />
        <circle cx="105" cy="86" r="5" fill="#F2A0B5" opacity=".45" />
      </g>
    </svg>
  );
}

/** A single paw print (pad + four toes). */
export function PawPrint({ size = 22, color = "var(--ink)", style, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} style={style} aria-hidden="true">
      <ellipse cx="16" cy="21.5" rx="7" ry="6" fill={color} />
      <ellipse cx="6.5" cy="14" rx="3" ry="4" fill={color} transform="rotate(-18 6.5 14)" />
      <ellipse cx="12.5" cy="8.5" rx="3" ry="4.2" fill={color} transform="rotate(-6 12.5 8.5)" />
      <ellipse cx="19.5" cy="8.5" rx="3" ry="4.2" fill={color} transform="rotate(6 19.5 8.5)" />
      <ellipse cx="25.5" cy="14" rx="3" ry="4" fill={color} transform="rotate(18 25.5 14)" />
    </svg>
  );
}
