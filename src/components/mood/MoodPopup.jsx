import React, { useEffect } from "react";
import { todayKey, dismissToday } from "../../lib/mood";
import MoodEditor from "./MoodEditor";

const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(20,20,30,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    boxSizing: "border-box",
    padding: "22px 22px 18px",
    fontFamily: "'Itim', cursive",
    color: "var(--ink)",
    background: "var(--bg-surface)",
    borderWidth: 2.5,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: "20px 8px 18px 10px / 10px 18px 8px 20px",
    boxShadow: "6px 6px 0 0 var(--ink)",
    maxHeight: "92vh",
    overflowY: "auto",
  },
  title: { margin: 0, fontSize: 24 },
  sub: { margin: "4px 0 14px", fontSize: 14, color: "var(--ink-soft)" },
  later: {
    background: "none",
    border: "none",
    padding: "6px 4px",
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--ink-soft)",
    cursor: "pointer",
    textDecoration: "underline",
  },
};

export default function MoodPopup({ onClose, onSaved }) {
  const day = todayKey();

  function later() {
    dismissToday();
    onClose();
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        dismissToday();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={s.backdrop} onClick={later}>
      <div style={s.card} role="dialog" aria-modal="true" aria-label="วันนี้รู้สึกยังไง" onClick={(e) => e.stopPropagation()}>
        <h2 style={s.title}>วันนี้รู้สึกยังไงบ้าง?</h2>
        <p style={s.sub}>แตะอิโมจิเพื่อบันทึก — เห็นได้เฉพาะคุณคนเดียว</p>
        <MoodEditor
          day={day}
          entry={null}
          onSaved={(saved) => {
            dismissToday();
            onSaved && onSaved(saved);
            onClose();
          }}
        >
          <button type="button" style={s.later} onClick={later}>
            ไว้ทีหลัง
          </button>
        </MoodEditor>
      </div>
    </div>
  );
}
