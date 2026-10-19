import React, { useEffect, useMemo, useRef, useState } from "react";
import { MOODS } from "../../lib/mood";
import { saveMood, deleteMood } from "../../lib/api";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";
import EditIcon from "../common/EditIcon";

const MAX_NOTE = 280;

// tiny doodles that sit around each face on the Home check-in tiles
const D = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
const Heart = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...D}><path d="M12 20s-7-4.4-8.5-9A4.6 4.6 0 0 1 12 7.2 4.6 4.6 0 0 1 20.5 11C19 15.6 12 20 12 20z" /></svg>
);
const Spark = ({ s = 16 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...D}><path d="M12 3c.8 4.6 2.4 6.2 7 7-4.6.8-6.2 2.4-7 7-.8-4.6-2.4-6.2-7-7 4.6-.8 6.2-2.4 7-7z" /></svg>
);
const Cloud = ({ s = 22 }) => (
  <svg width={s} height={s * 0.62} viewBox="0 0 32 20" {...D}><path d="M8 17a5 5 0 0 1-.6-9.9A7 7 0 0 1 21 6.5 5.2 5.2 0 0 1 24 17z" /></svg>
);
const Scribble = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...D}><path d="M12 4c5 0 8 3 8 7s-3 7-8 7-7-2.6-7-6 3-5.5 7-5.5 5.5 2 5.5 4.5-2 4-5 4-4-1.4-4-3" /></svg>
);
const Rays = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" {...D}><path d="M3 9l5 2M4 17l5-3M20 6l-4 3" /></svg>
);
const DECO = {
  love: [["tl", <Heart key="a" />], ["br", <Heart key="b" s={13} />]],
  good: [["tl", <Spark key="a" />], ["tr", <Spark key="b" s={13} />]],
  ok: [["tl", <Cloud key="a" />], ["tr", <Cloud key="b" s={18} />]],
  stressed: [["tr", <Scribble key="a" />]],
  sad: [["tr", <Rays key="a" />]],
};
const Paw = ({ s = 22 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <ellipse cx="6" cy="10" rx="2.1" ry="2.8" /><ellipse cx="10.2" cy="6" rx="2.1" ry="2.8" /><ellipse cx="15.2" cy="6" rx="2.1" ry="2.8" /><ellipse cx="19" cy="10.4" rx="2" ry="2.7" />
    <path d="M12.3 11.5c3 0 6 3.2 5.6 6-.3 2-2.2 2.4-3.6 2-.9-.3-1.4-.5-2-.5s-1.1.2-2 .5c-1.400.4-3.300 0-3.600-2-.4-2.800 2.600-6 5.600-6z" />
  </svg>
);
export { Paw };
const Clip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...D} strokeWidth={2}><path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.700 4.700L9.800 17.300a1.700 1.700 0 0 1-2.400-2.400L15 7.300" /></svg>
);

const s = {
  row: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  moodBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "8px 4px",
    fontFamily: "inherit",
    fontSize: 12.5,
    color: "var(--ink)",
    cursor: "pointer",
    background: "var(--bg-surface)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--ink) 35%, transparent)",
    borderRadius: "14px 6px 12px 8px / 8px 12px 6px 14px",
  },
  moodBtnOn: { borderColor: "var(--ink)", boxShadow: "3px 3px 0 0 var(--ink)", transform: "translate(-1px,-1px)" },
  more: {
    marginTop: 12,
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--accent-color)",
    cursor: "pointer",
    textDecoration: "underline",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 10,
    padding: "8px 10px",
    minHeight: 64,
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: 15,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: 10,
  },
  count: { fontSize: 12, color: "var(--ink-faint)", textAlign: "right", margin: "2px 0 0" },
  memeBox: { marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  thumb: {
    width: 96,
    height: 96,
    objectFit: "cover",
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
  },
  ghostBtn: {
    padding: "6px 12px",
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--ink)",
    cursor: "pointer",
    background: "var(--bg-surface)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: 255,
  },
  actions: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" },
  err: { color: "#E0473E", fontSize: 14, margin: "8px 0 0" },
};

/**
 * Shared mood form: used by the Home popup, the Home quick card and the
 * Profile calendar. `entry` is the existing entry for `day` (or null).
 * Tapping an emoji with the extras closed saves immediately (1-click).
 */
export default function MoodEditor({ day, entry, onSaved, onDeleted, compact = false, tiles = false, forceOpen = false, submitLabel = "บันทึก", children }) {
  const [mood, setMood] = useState(entry?.mood || null);
  const [note, setNote] = useState(entry?.note || "");
  const [file, setFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [open, setOpen] = useState(tiles || !!(entry?.note || entry?.hasImage));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    if (forceOpen || tiles) setOpen(true);
  }, [forceOpen, tiles]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    setMood(entry?.mood || null);
    setNote(entry?.note || "");
    setFile(null);
    setRemoveImage(false);
    setOpen(tiles || !!(entry?.note || entry?.hasImage));
    setError("");
  }, [day, entry?.mood, entry?.note, entry?.hasImage, tiles]);

  async function persist(nextMood) {
    setBusy(true);
    setError("");
    try {
      const { entry: saved } = await saveMood(day, { mood: nextMood, note, image: file, removeImage });
      setVersion((v) => v + 1);
      setFile(null);
      setRemoveImage(false);
      onSaved && onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function pick(key) {
    setMood(key);
    if (!open) persist(key); // 1-click save when no extras are open
  }

  function pickFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setError("รูปใหญ่เกิน 5MB");
    setError("");
    setFile(f);
    setRemoveImage(false);
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteMood(day);
      onDeleted && onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showExisting = entry?.hasImage && !file && !removeImage;

  const memeBox = (
    <div style={tiles ? { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } : s.memeBox}>
              {preview && <img src={preview} alt="" style={s.thumb} />}
              {showExisting && <MoodImage day={day} version={version} style={s.thumb} />}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pickFile} />
              <button type="button" className={tiles ? "mood-attach" : undefined} style={tiles ? undefined : s.ghostBtn} onClick={() => fileRef.current && fileRef.current.click()}>
                {tiles ? <Clip /> : "🖼️"} {preview || showExisting ? "เปลี่ยนมีม" : "แนบมีม"}
              </button>
              {(preview || showExisting) && (
                <button
                  type="button"
                  style={s.ghostBtn}
                  onClick={() => {
                    setFile(null);
                    setRemoveImage(true);
                  }}
                >
                  ลบรูป
                </button>
              )}
            </div>
  );

  return (
    <div>
      <div
        className={tiles ? "mood-tiles" : undefined}
        style={tiles ? undefined : { ...s.row, gridTemplateColumns: compact ? "repeat(8, 1fr)" : s.row.gridTemplateColumns }}
      >
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            disabled={busy}
            onClick={() => pick(m.key)}
            aria-pressed={mood === m.key}
            title={m.label}
            className={tiles ? `mood-tile${mood === m.key ? " is-on" : ""}` : undefined}
            style={
              tiles
                ? { "--tint": m.tint }
                : { ...s.moodBtn, ...(mood === m.key ? s.moodBtnOn : {}), ...(compact ? { padding: "6px 2px" } : {}) }
            }
          >
            {tiles && (DECO[m.key] || []).map(([pos, node]) => (
              <i key={pos} className={`mood-deco mood-deco-${pos}`}>{node}</i>
            ))}
            {tiles && mood === m.key && (
              <i className="mood-check" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.500" /></svg>
              </i>
            )}
            <MoodIcon mood={m.key} size={tiles ? 64 : compact ? 30 : 38} />
            {(tiles || !compact) && <span>{m.label}</span>}
          </button>
        ))}
      </div>

      {!open && !tiles && (
        <button type="button" style={s.more} onClick={() => setOpen(true)}>
          + เพิ่มโน้ตหรือมีม
        </button>
      )}

      {open && (
        <>
          <div className={tiles ? "mood-note" : undefined} style={tiles ? undefined : { display: "contents" }}>
          {tiles && <EditIcon size={20} style={{ position: "absolute", left: 16, top: 16, margin: 0, opacity: 0.8 }} />}
          <textarea
            className={tiles ? "mood-note-input" : undefined}
            style={tiles ? undefined : s.textarea}
            placeholder="วันนี้เป็นยังไงบ้าง? (ไม่บังคับ)"
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
          />
          {tiles && <span className="mood-note-paw"><Paw s={22} /></span>}
          <p className={tiles ? "mood-note-count" : undefined} style={tiles ? undefined : s.count}>
            {note.length}/{MAX_NOTE}
          </p>
          </div>
          {!tiles && memeBox}
        </>
      )}

      {error && <p style={s.err}>{error}</p>}

      {open && (
        <div style={tiles ? { ...s.actions, marginTop: 18, gap: 14 } : s.actions}>
          {tiles && memeBox}
          <button type="button" className={tiles ? "mood-save" : "doodle-btn"} disabled={!mood || busy} onClick={() => persist(mood)}>
            {tiles && !busy && <Paw s={24} />}
            {busy ? "กำลังบันทึก..." : tiles ? "บันทึกความรู้สึก  →" : submitLabel}
          </button>
          {entry && onDeleted && (
            <button type="button" style={s.ghostBtn} disabled={busy} onClick={handleDelete}>
              ลบบันทึกวันนี้
            </button>
          )}
          {children}
        </div>
      )}
      {!open && children && <div style={s.actions}>{children}</div>}
    </div>
  );
}
