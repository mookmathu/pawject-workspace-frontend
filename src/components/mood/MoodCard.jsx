import React, { useState } from "react";
import { MOOD_BY_KEY, todayKey } from "../../lib/mood";
import MoodEditor from "./MoodEditor";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";

const s = {
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 16px",
    marginBottom: 20,
    background: "var(--bg-surface)",
    color: "var(--ink)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: "16px 6px 14px 8px / 8px 14px 6px 16px",
    boxShadow: "3px 3px 0 0 var(--ink)",
  },
  head: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 17, fontWeight: 700 },
  sub: { margin: 0, fontSize: 13.5, color: "var(--ink-soft)" },
  grow: { flex: 1, minWidth: 140 },
  thumb: { width: 48, height: 48, objectFit: "cover", borderRadius: 8, borderWidth: 2, borderStyle: "solid", borderColor: "var(--ink)" },
  link: {
    background: "none",
    border: "none",
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--accent-color)",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
};

// Persistent "how are you today" card on Home — for when the popup was
// dismissed or turned off. `entry`: undefined = loading, null = none yet.
export default function MoodCard({ entry, onChange }) {
  const [editing, setEditing] = useState(false);
  const day = todayKey();
  if (entry === undefined) return null;

  const m = entry && MOOD_BY_KEY[entry.mood];
  const showEditor = !entry || editing;

  return (
    <div style={s.card}>
      <div style={s.head}>
        {m && !editing && <MoodIcon mood={m.key} size={44} />}
        <div style={s.grow}>
          <p style={s.title}>{entry ? `วันนี้คุณรู้สึก${m ? m.label : ""}` : "วันนี้รู้สึกยังไงบ้าง?"}</p>
          <p style={s.sub}>{entry ? entry.note || "บันทึกไว้แล้ว — เห็นเฉพาะคุณคนเดียว" : "แตะอิโมจิเพื่อบันทึก (เห็นเฉพาะคุณ)"}</p>
        </div>
        {entry && entry.hasImage && !editing && <MoodImage day={day} version={entry.updatedAt} style={s.thumb} />}
        {entry && (
          <button type="button" style={s.link} onClick={() => setEditing((v) => !v)}>
            {editing ? "ปิด" : "แก้ไข"}
          </button>
        )}
      </div>
      {showEditor && (
        <MoodEditor
          day={day}
          entry={entry}
          compact
          onSaved={(saved) => {
            setEditing(false);
            onChange(saved);
          }}
          onDeleted={() => {
            setEditing(false);
            onChange(null);
          }}
        />
      )}
    </div>
  );
}
