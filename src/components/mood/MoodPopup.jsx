import React, { useEffect } from "react";
import { todayKey, dismissToday } from "../../lib/mood";
import MoodEditor from "./MoodEditor";
import { MOOD_CSS } from "./MoodCard";
import Mascot from "../common/Mascot";

const CSS = `
.mood-pop{width:100%;max-width:660px;box-sizing:border-box;max-height:92vh;overflow-y:auto;overflow-x:hidden;position:relative;font-family:'Itim',cursive;color:var(--ink);
  background:var(--bg-surface);border:2.5px solid var(--ink);border-radius:26px 10px 24px 12px / 12px 24px 10px 26px;box-shadow:7px 7px 0 0 var(--ink)}
.mood-pop-head{display:flex;align-items:center;gap:16px;padding:16px 56px 14px 22px;background:color-mix(in srgb,var(--accent-color) 16%,var(--bg-surface));border-bottom:2.5px solid var(--ink)}
.mood-pop-title{margin:0;font-size:25px;font-weight:700;line-height:1.2}
.mood-pop-sub{margin:3px 0 0;font-size:14px;color:var(--ink-soft)}
.mood-pop-body{padding:20px 22px 20px}
.mood-pop-x{position:absolute;top:12px;right:14px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-family:inherit;font-size:22px;line-height:1;color:var(--ink);cursor:pointer;background:var(--bg-surface);border:2px solid var(--ink);border-radius:50%;transition:transform 140ms ease}
.mood-pop-x:hover{transform:rotate(90deg)}
.mood-pop-later{background:none;border:none;padding:6px 4px;font-family:inherit;font-size:15px;color:var(--ink-soft);cursor:pointer;text-decoration:underline}
.mood-pop-later{font-size:14px}
@media (max-width:560px){.mood-pop-head{padding:12px 50px 12px 14px;gap:10px}.mood-pop-title{font-size:20px}.mood-pop-body{padding:16px 12px}}
`;

const backdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(20,20,30,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
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
    <div role="presentation" style={backdrop} onClick={later}>
      <style>{MOOD_CSS}</style>
      <style>{CSS}</style>
      <div className="mood-pop" role="dialog" aria-modal="true" aria-label="วันนี้รู้สึกยังไง" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mood-pop-x" onClick={later} aria-label="ปิด">
          ×
        </button>
        <div className="mood-pop-head">
          <Mascot name="cheer" width={64} anim="float" />
          <div style={{ minWidth: 0 }}>
            <h2 className="mood-pop-title">วันนี้รู้สึกยังไงบ้าง?</h2>
            <p className="mood-pop-sub">เช็กอินอารมณ์วันนี้ เห็นเฉพาะคุณคนเดียว ♡</p>
          </div>
        </div>
        <div className="mood-pop-body">
          <MoodEditor
            day={day}
            entry={null}
            tiles
            onSaved={(saved) => {
              dismissToday();
              onSaved && onSaved(saved);
              onClose();
            }}
          >
            <button type="button" className="mood-pop-later" onClick={later}>
              ไว้ทีหลัง
            </button>
          </MoodEditor>
        </div>
      </div>
    </div>
  );
}
