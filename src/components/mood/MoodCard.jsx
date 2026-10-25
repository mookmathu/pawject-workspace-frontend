import React, { useState } from "react";
import { MOOD_BY_KEY, todayKey } from "../../lib/mood";
import MoodEditor, { Paw } from "./MoodEditor";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";
import EditIcon from "../common/EditIcon";

export const MOOD_CSS = `
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
.mood-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.mood-tile{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 8px 16px;font-family:inherit;color:var(--ink);cursor:pointer;
  background:color-mix(in srgb,var(--tint) 34%,var(--bg-surface));
  border:2.5px solid var(--ink);border-radius:20px;box-shadow:3px 3px 0 0 var(--ink);transition:transform 130ms ease,box-shadow 130ms ease,background-color 130ms ease}
.mood-tile img{width:68px;height:68px;padding:0;box-sizing:border-box;background:none;border:none;box-shadow:none;transition:transform 160ms cubic-bezier(.3,1.7,.5,1)}
.mood-tile span{white-space:nowrap;padding:3px 12px;font-size:15px;font-weight:700;background:var(--bg-surface);border:2px solid var(--ink);border-radius:999px}
.mood-tile:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:5px 5px 0 0 var(--ink)}
.mood-tile:hover img{transform:scale(1.08)}
.mood-tile.is-on{background:color-mix(in srgb,var(--tint) 75%,var(--bg-surface));transform:translate(1px,1px);box-shadow:1px 1px 0 0 var(--ink)}
.mood-tile.is-on span{background:var(--ink);color:var(--bg-surface)}
.mood-tile:disabled{opacity:.6;cursor:default}
.mood-deco{display:none}
.mood-check{position:absolute;top:-9px;right:-7px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--accent-color);border:2.5px solid var(--ink)}

/* note + actions */
.mood-note{position:relative;margin-top:18px}
.mood-note-input{display:block;width:100%;box-sizing:border-box;min-height:92px;padding:14px 48px 28px 46px;resize:vertical;font-family:inherit;font-size:15px;color:var(--ink);background:color-mix(in srgb,var(--bg-surface) 86%,transparent);border:1.8px solid color-mix(in srgb,var(--ink) 22%,transparent);border-radius:18px;outline:none}
.mood-note-input:focus{border-color:var(--accent-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-color) 22%,transparent)}
.mood-note-paw{position:absolute;right:16px;top:14px;color:var(--ink-faint);opacity:.55}
.mood-note-count{position:absolute;right:16px;bottom:8px;margin:0;font-size:12px;color:var(--ink-faint)}
.mood-attach{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 16px;font-family:inherit;font-size:14px;font-weight:700;color:var(--accent-color);cursor:pointer;background:color-mix(in srgb,var(--bg-surface) 88%,transparent);border:1.8px solid color-mix(in srgb,var(--accent-color) 35%,transparent);border-radius:999px;transition:transform 140ms ease,background-color 140ms ease}
.mood-attach:hover{transform:translateY(-2px);background:var(--bg-surface)}
.mood-save{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:0;height:44px;padding:0 24px;font-family:inherit;font-size:16px;font-weight:700;color:#FFFDF8;cursor:pointer;white-space:pre;
  background:var(--accent-color);border:2.5px solid var(--ink);border-radius:999px;box-shadow:0 3px 0 0 var(--ink);transition:transform 140ms cubic-bezier(.3,1.6,.5,1),box-shadow 140ms ease}
.mood-save:hover:not(:disabled){transform:translateY(-2px) rotate(-1deg);box-shadow:0 5px 0 0 var(--ink)}
.mood-save svg,.mood-attach svg{width:18px;height:18px}
.mood-save:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 0 var(--ink)}
.mood-save:disabled{opacity:.5;cursor:not-allowed;box-shadow:0 3px 0 0 color-mix(in srgb,var(--ink) 40%,transparent)}
.mood-done{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
@media (max-width:760px){.mood-tiles{gap:6px}.mood-tile{padding:16px 0 12px;gap:8px;min-width:0}.mood-tile img{width:48px;height:48px}.mood-tile span{font-size:11.5px;padding:3px 7px}.mood-deco{display:none}}
@media (max-width:430px){.mood-tile span{font-size:10.5px;padding:2px 4px;border-width:1.5px}}
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
      <style>{MOOD_CSS}</style>
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
