import React from "react";
import styles from "./styles";

/**
 * Temporary placeholder for the right-hand illustration.
 * Shows a rough hand-drawn boat sketch inside a dashed "mockup" frame
 * so the layout/proportions are visible before a real image is ready.
 *
 * Swap this out later, e.g.:
 *   <img src="/boat.png" alt="" style={{ width: "100%", height: "auto" }} />
 */
export default function BoatMockup() {
  return (
    <div style={styles.boatArea}>
      <span style={styles.boatBadge}>MOCKUP</span>
      <BoatSketch />
      <p style={styles.boatLabel}>
        ใส่รูปเรือของคุณตรงนี้
        <br />
        (แนะนำสัดส่วนประมาณ 1:1 หรือ 4:5)
      </p>
    </div>
  );
}

function BoatSketch() {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none">
      {/* water */}
      <path
        d="M10 140 Q30 132 50 140 T90 140 T130 140 T170 140 T210 140"
        stroke="#221D17"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M10 152 Q30 144 50 152 T90 152 T130 152 T170 152 T210 152"
        stroke="#221D17"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* hull */}
      <path
        d="M40 132 L180 132 L164 154 Q110 164 56 154 Z"
        fill="#3E6BE0"
        stroke="#221D17"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* mast */}
      <line x1="108" y1="132" x2="108" y2="30" stroke="#221D17" strokeWidth="3" strokeLinecap="round" />

      {/* main sail */}
      <path
        d="M112 36 L112 128 L166 128 Z"
        fill="#FFFDF8"
        stroke="#221D17"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* jib sail */}
      <path
        d="M104 52 L104 128 L58 128 Z"
        fill="#F4B740"
        stroke="#221D17"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* flag */}
      <path d="M108 30 L128 36 L108 42 Z" fill="#FF6F91" stroke="#221D17" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}