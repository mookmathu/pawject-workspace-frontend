import React, { useState } from "react";
import { MOOD_BY_KEY, todayKey } from "../../lib/mood";
import MoodEditor, { Paw } from "./MoodEditor";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";
import EditIcon from "../common/EditIcon";

const CSS = `
.mood-card{position:relative;overflow:hidden;padding:24px 28px 24px;margin-bottom:20px;color:var(--ink);
  background:var(--bg-surface);
  border:2px solid var(--ink);border-radius:26px;box-shadow:4px 4px 0 0 var(--ink)}
.mood-card>*{position:relative;z-index:1}
.mood-card-head{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.mood-card-paw{flex:none;display:flex;align-items:center;justify-content:center;width:48px;height:48px;color:var(--accent-color);background:color-mix(in srgb,var(--accent-color) 14%,var(--bg-surface));border-radius:50%}
.mood-card-title{display:flex;align-items:flex-start;gap:6px;margin:0;font-size:22px;font-weight:700;line-height:1.25}
.mood-card-title svg{flex:none;margin-top:-2px;color:#F4B740}
.mood-card-sub{margin:2px 0 0;font-size:14px;color:var(--ink-soft)}

/* mood tiles */
.mood-tiles{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.mood-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 8px 16px;font-family:inherit;color:var(--ink);cursor:pointer;
  background:linear-gradient(160deg,color-mix(in srgb,var(--tint) 34%,var(--bg-surface)) 0%,color-mix(in srgb,var(--tint) 12%,var(--bg-surface)) 100%);
  border:2px solid color-mix(in srgb,var(--tint) 75%,transparent);border-radius:22px;transition:transform 150ms cubic-bezier(.3,1.6,.5,1),box-shadow 150ms ease,border-color 150ms ease}
.mood-tile img{width:78px;height:78px;padding:10px;box-sizing:border-box;border-radius:50%;
  background:radial-gradient(circle at 32% 28%,color-mix(in srgb,var(--tint) 24%,#fff) 0%,color-mix(in srgb,var(--tint) 62%,var(--bg-surface)) 100%);
  border:4px solid color-mix(in srgb,#fff 82%,transparent);box-shadow:0 8px 16px -8px color-mix(in srgb,var(--tint) 100%,#000);transition:transform 180ms cubic-bezier(.3,1.7,.5,1)}
.mood-tile span{white-space:nowrap;padding:4px 16px;font-size:15px;font-weight:700;background:color-mix(in srgb,var(--tint) 52%,var(--bg-surface));border-radius:14px 18px 12px 20px / 12px 16px 18px 12px;transition:background-color 150ms ease}
.mood-tile:hover{transform:translateY(-4px);box-shadow:0 12px 18px -12px color-mix(in srgb,var(--ink) 70%,transparent)}
.mood-tile:hover img{transform:scale(1.08) rotate(-4deg)}
.mood-tile.is-on{border-color:color-mix(in srgb,var(--tint) 40%,var(--ink));box-shadow:0 0 0 3px color-mix(in srgb,var(--tint) 55%,transparent),0 12px 20px -12px color-mix(in srgb,var(--ink) 70%,transparent);transform:translateY(-4px)}
.mood-tile.is-on img{transform:scale(1.1)}
.mood-tile.is-on span{background:var(--ink);color:var(--bg-surface)}
.mood-tile:disabled{opacity:.6;cursor:default}
.mood-deco{position:absolute;font-style:normal;line-height:0;color:color-mix(in srgb,var(--tint) 60%,var(--ink) 40%);opacity:.85;pointer-events:none}
.mood-deco-tl{top:20px;left:14px}.mood-deco-tr{top:22px;right:14px}.mood-deco-br{top:74px;right:12px}
.mood-check{position:absolute;top:-9px;right:-7px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--accent-color);border:2.5px solid var(--bg-surface);box-shadow:0 3px 6px -2px rgba(0,0,0,.35)}

/* note + actions */
.mood-note{position:relative;margin-top:18px}
.mood-note-input{display:block;width:100%;box-sizing:border-box;min-height:92px;padding:14px 48px 28px 46px;resize:vertical;font-family:inherit;font-size:15px;color:var(--ink);background:color-mix(in srgb,var(--bg-surface) 86%,transparent);border:1.8px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:18px;outline:none}
.mood-note-input:focus{border-color:var(--accent-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-color) 22%,transparent)}
.mood-note-paw{position:absolute;right:16px;top:14px;color:var(--ink-faint);opacity:.55}
.mood-note-count{position:absolute;right:16px;bottom:8px;margin:0;font-size:12px;color:var(--ink-faint)}
.mood-attach{display:inline-flex;align-items:center;gap:8px;height:52px;padding:0 22px;font-family:inherit;font-size:16px;font-weight:700;color:var(--accent-color);cursor:pointer;background:color-mix(in srgb,var(--bg-surface) 88%,transparent);border:1.8px solid color-mix(in srgb,var(--accent-color) 35%,transparent);border-radius:999px;transition:transform 140ms ease,background-color 140ms ease}
.mood-attach:hover{transform:translateY(-2px);background:var(--bg-surface)}
.mood-save{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-width:280px;height:60px;padding:0 36px;font-family:inherit;font-size:19px;font-weight:700;color:#FFFDF8;cursor:pointer;white-space:pre;
  background:linear-gradient(135deg,color-mix(in srgb,var(--accent-color) 80%,#fff) 0%,var(--accent-color) 100%);border:2.5px solid var(--ink);border-radius:999px;box-shadow:0 5px 0 0 var(--ink);transition:transform 140ms cubic-bezier(.3,1.6,.5,1),box-shadow 140ms ease}
.mood-save:hover:not(:disabled){transform:translateY(-3px) rotate(-1deg);box-shadow:0 8px 0 0 var(--ink)}
.mood-save:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 0 var(--ink)}
.mood-save:disabled{opacity:.5;cursor:not-allowed;box-shadow:0 3px 0 0 color-mix(in srgb,var(--ink) 40%,transparent)}
.mood-done{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
@media (max-width:760px){.mood-tiles{gap:6px}.mood-tile{padding:16px 0 12px;gap:8px;min-width:0}.mood-tile img{width:52px;height:52px;padding:7px}.mood-tile span{font-size:11.5px;padding:3px 7px}.mood-deco{display:none}}
@media (max-width:560px){.mood-card{padding:18px 14px}.mood-save{width:100%;min-width:0}.mood-attach{width:100%;justify-content:center}.mood-card-title{font-size:19px}}
`;

const s = {
  thumb: { width: 56, height: 56, objectFit: "cover", borderRadius: 12, border: "2px solid var(--ink)" },
  ghost: { padding: "8px 16px", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 999, cursor: "pointer" },
};

// "How are you today" check-in on Home. `entry`: undefined = loading, null = none yet.
export default function MoodCard({ entry, onChange }) {
  const [editing, setEditing] = useState(false);
  const day = todayKey();
  if (entry === undefined) return null;

  const m = entry && MOOD_BY_KEY[entry.mood];
  const showEditor = !entry || editing;

  return (
    <div className="mood-card">
      <style>{CSS}</style>
      <div className="mood-card-head">
        {m && !editing ? (
          <MoodIcon mood={m.key} size={52} />
        ) : (
          <span className="mood-card-paw"><Paw s={26} /></span>
        )}
        <div style={{ minWidth: 0 }}>
          <p className="mood-card-title">
            {entry ? `วันนี้คุณรู้สึก${m ? m.label : ""}` : "วันนี้รู้สึกยังไงบ้าง?"}
            {!entry && (
              <svg width="22" height="24" viewBox="0 0 22 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 5l4 2M3 12h6M5 19l4-2" /></svg>
            )}
          </p>
          <p className="mood-card-sub">{entry ? entry.note || "บันทึกไว้แล้ว — เห็นเฉพาะคุณคนเดียว" : "เช็กอินอารมณ์วันนี้ เห็นเฉพาะคุณคนเดียว ♡"}</p>
        </div>
      </div>

      {showEditor ? (
        <>
          <MoodEditor
            day={day}
            entry={entry}
            tiles
            onSaved={(saved) => {
              setEditing(false);
              onChange(saved);
            }}
            onDeleted={() => {
              setEditing(false);
              onChange(null);
            }}
          />
          {entry && (
            <button type="button" style={{ ...s.ghost, marginTop: 12 }} onClick={() => setEditing(false)}>
              ปิด
            </button>
          )}
        </>
      ) : (
        <div className="mood-done">
          {entry.hasImage && <MoodImage day={day} version={entry.updatedAt} style={s.thumb} />}
          <button type="button" style={s.ghost} onClick={() => setEditing(true)}>
            <EditIcon size={16} /> แก้ไขอารมณ์วันนี้
          </button>
        </div>
      )}
    </div>
  );
}
