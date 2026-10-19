import React from "react";
import { Link } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import Mascot from "../../components/common/Mascot";

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        color: "var(--ink)",
        fontFamily: "'Itim', cursive",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 24,
        textAlign: "center",
      }}
    >
      <GlobalStyles />
      <Mascot name="huh" width={190} anim="wiggle" shadow decorative={false} title="ไม่พบหน้านี้" />
      <h1 style={{ margin: "14px 0 0", fontSize: 42 }}>404</h1>
      <p style={{ margin: 0, fontSize: 20, color: "var(--ink-soft)" }}>หน้านี้หายไปแล้วหรือไม่เคยมีอยู่เลย…</p>
      <Link to="/" className="doodle-btn" style={{ marginTop: 14, padding: "10px 22px", textDecoration: "none", color: "var(--ink)" }}>
        กลับหน้าแรก
      </Link>
    </div>
  );
}
