import React from "react";
import styles from "../../pages/LoginPage/styles";
import { PawPrint } from "./DogSVG";
import Mascot from "../common/Mascot";

/**
 * Right-hand illustration of the Login / Register pages: the Pawject pup on
 * a little grass mound with a trail of paw prints. Hidden on narrow screens
 * by the shared .split-right rule.
 */
export default function DogHero() {
  return (
    <div style={styles.boatArea} className="split-right">
      <div style={{ position: "relative", width: 320, maxWidth: "100%", height: 300 }}>
        <svg viewBox="0 0 300 300" width="100%" height="100%" style={{ position: "absolute", inset: 0, maxWidth: "none" }} aria-hidden="true">
          <circle cx="150" cy="150" r="128" fill="#DCE9F8" stroke="var(--ink)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
          <ellipse cx="150" cy="262" rx="104" ry="22" fill="#DCEBDD" stroke="var(--ink)" strokeWidth="3" />
        </svg>
        <div style={{ position: "absolute", left: 4, bottom: 40 }}>
          <Mascot name="reader" width={108} anim="float" delay={0.4} />
        </div>
        <div style={{ position: "absolute", left: "50%", bottom: 36, marginLeft: -50 }}>
          <Mascot name="glasses" width={100} anim="wiggle" />
        </div>
        <div style={{ position: "absolute", right: 0, bottom: 38 }}>
          <Mascot name="artist" width={116} anim="sway" delay={0.8} />
        </div>
        <PawPrint size={22} color="var(--ink)" style={{ position: "absolute", left: 18, top: 40, opacity: 0.35, transform: "rotate(-24deg)" }} />
        <PawPrint size={22} color="var(--ink)" style={{ position: "absolute", left: 44, top: 78, opacity: 0.5, transform: "rotate(-8deg)" }} />
        <PawPrint size={22} color="var(--ink)" style={{ position: "absolute", right: 22, top: 56, opacity: 0.35, transform: "rotate(20deg)" }} />
      </div>
      <p style={styles.boatLabel}>
        ทีมเดียวกัน งานไม่หลุดมือ
        <br />
        ไปกับ Pawject 🐾
      </p>
    </div>
  );
}
