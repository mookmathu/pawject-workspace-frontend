import React, { useEffect, useMemo, useRef, useState } from "react";
import { MOODS } from "../../lib/mood";
import { saveMood, deleteMood } from "../../lib/api";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";

const MAX_NOTE = 280;

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
export default function MoodEditor({ day, entry, onSaved, onDeleted, compact = false, submitLabel = "บันทึก", children }) {
  const [mood, setMood] = useState(entry?.mood || null);
  const [note, setNote] = useState(entry?.note || "");
  const [file, setFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [open, setOpen] = useState(!!(entry?.note || entry?.hasImage));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const fileRef = useRef(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    setMood(entry?.mood || null);
    setNote(entry?.note || "");
    setFile(null);
    setRemoveImage(false);
    setOpen(!!(entry?.note || entry?.hasImage));
    setError("");
  }, [day, entry?.mood, entry?.note, entry?.hasImage]);

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

  return (
    <div>
      <div style={{ ...s.row, gridTemplateColumns: compact ? "repeat(8, 1fr)" : s.row.gridTemplateColumns }}>
        {MOODS.map((m) => (
          <button
            key={m.key}
            type="button"
            disabled={busy}
            onClick={() => pick(m.key)}
            aria-pressed={mood === m.key}
            title={m.label}
            style={{ ...s.moodBtn, ...(mood === m.key ? s.moodBtnOn : {}), ...(compact ? { padding: "6px 2px" } : {}) }}
          >
            <MoodIcon mood={m.key} size={compact ? 30 : 38} />
            {!compact && <span>{m.label}</span>}
          </button>
        ))}
      </div>

      {!open && (
        <button type="button" style={s.more} onClick={() => setOpen(true)}>
          + เพิ่มโน้ตหรือมีม
        </button>
      )}

      {open && (
        <>
          <textarea
            style={s.textarea}
            placeholder="วันนี้เป็นยังไงบ้าง? (ไม่บังคับ)"
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
          />
          <p style={s.count}>
            {note.length}/{MAX_NOTE}
          </p>
          <div style={s.memeBox}>
            {preview && <img src={preview} alt="" style={s.thumb} />}
            {showExisting && <MoodImage day={day} version={version} style={s.thumb} />}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pickFile} />
            <button type="button" style={s.ghostBtn} onClick={() => fileRef.current && fileRef.current.click()}>
              🖼️ {preview || showExisting ? "เปลี่ยนมีม" : "แนบมีม"}
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
        </>
      )}

      {error && <p style={s.err}>{error}</p>}

      {open && (
        <div style={s.actions}>
          <button type="button" className="doodle-btn" disabled={!mood || busy} onClick={() => persist(mood)}>
            {busy ? "กำลังบันทึก..." : submitLabel}
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
