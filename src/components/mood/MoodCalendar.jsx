import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MOODS, MOOD_BY_KEY, canonicalMood, todayKey } from "../../lib/mood";
import { getMoodMonth } from "../../lib/api";
import MoodEditor from "./MoodEditor";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";
import EditIcon from "../common/EditIcon";

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

const pad = (n) => String(n).padStart(2, "0");

const s = {
  wrap: {
    padding: "16px 18px 18px",
    marginBottom: 20,
    background: "var(--bg-surface)",
    color: "var(--ink)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: "16px 6px 14px 8px / 8px 14px 6px 16px",
    boxShadow: "3px 3px 0 0 var(--ink)",
  },
  head: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, flex: 1, minWidth: 160 },
  nav: {
    width: 32,
    height: 32,
    fontFamily: "inherit",
    fontSize: 16,
    cursor: "pointer",
    color: "var(--ink)",
    background: "var(--bg-surface)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: "50%",
  },
  monthLabel: { minWidth: 110, textAlign: "center", fontSize: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 },
  dow: { textAlign: "center", fontSize: 12.5, color: "var(--ink-faint)" },
  cell: {
    position: "relative",
    aspectRatio: "5 / 4",
    minHeight: 40,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    color: "var(--ink)",
    padding: 0,
    minWidth: 0,
    width: "100%",
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--ink) 18%, transparent)",
    background: "transparent",
    cursor: "pointer",
  },
  cellToday: { borderColor: "var(--ink)", borderStyle: "dashed" },
  cellDisabled: { opacity: 0.35, cursor: "default" },
  num: { position: "absolute", top: 2, left: 5, fontSize: 10.5, color: "var(--ink-soft)" },
  dot: { position: "absolute", bottom: 3, right: 4, fontSize: 10 },
  stats: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 10px",
    fontSize: 13.5,
    borderRadius: 255,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--ink) 40%, transparent)",
  },
  summary: { margin: "12px 0 0", fontSize: 14, color: "var(--ink-soft)" },
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
  modal: {
    width: "100%",
    maxWidth: 440,
    boxSizing: "border-box",
    padding: "20px 22px",
    maxHeight: "92vh",
    overflowY: "auto",
    fontFamily: "'Itim', cursive",
    color: "var(--ink)",
    background: "var(--bg-surface)",
    borderWidth: 2.5,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: "20px 8px 18px 10px / 10px 18px 8px 20px",
    boxShadow: "6px 6px 0 0 var(--ink)",
  },
  modalTitle: { margin: "0 0 4px", fontSize: 22 },
  noteRead: { margin: "8px 0 12px", fontSize: 15, lineHeight: 1.45 },
  bigImg: { width: "100%", maxHeight: 260, objectFit: "contain", borderRadius: 10, marginBottom: 10 },
  close: {
    display: "block",
    marginTop: 14,
    background: "none",
    border: "none",
    padding: 0,
    fontFamily: "inherit",
    fontSize: 14,
    color: "var(--ink-soft)",
    textDecoration: "underline",
    cursor: "pointer",
  },
};

function longDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y + 543}`;
}

/** Monthly mood diary for the Profile page. */
export default function MoodCalendar() {
  const today = todayKey();
  const [ty, tm] = today.split("-").map(Number);
  const [cursor, setCursor] = useState({ y: ty, m: tm });
  const [entries, setEntries] = useState({}); // day -> entry
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // "YYYY-MM-DD"

  const monthKey = `${cursor.y}-${pad(cursor.m)}`;

  const load = useCallback(() => {
    setLoading(true);
    return getMoodMonth(monthKey)
      .then(({ entries: list }) => setEntries(Object.fromEntries(list.map((e) => [e.day, e]))))
      .catch(() => setEntries({}))
      .finally(() => setLoading(false));
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  const { cells, daysInMonth } = useMemo(() => {
    const first = new Date(Date.UTC(cursor.y, cursor.m - 1, 1)).getUTCDay();
    const count = new Date(Date.UTC(cursor.y, cursor.m, 0)).getUTCDate();
    return { cells: [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)], daysInMonth: count };
  }, [cursor]);

  const counts = useMemo(() => {
    const c = {};
    Object.values(entries).forEach((e) => {
      const k = canonicalMood(e.mood);
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [entries]);
  const logged = Object.keys(entries).length;
  const top = MOODS.filter((m) => counts[m.key]).sort((a, b) => counts[b.key] - counts[a.key])[0];

  const isCurrent = cursor.y === ty && cursor.m === tm;
  function shift(delta) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m - 1 + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });
  }

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const sel = selected ? entries[selected] || null : null;
  const selMood = sel && MOOD_BY_KEY[sel.mood];
  const [editing, setEditing] = useState(false);
  useEffect(() => setEditing(false), [selected]);

  return (
    <section style={s.wrap} aria-label="ไดอารี่อารมณ์">
      <style>{`.mood-cell svg { max-width: 72%; height: auto; } @media (max-width: 480px) { .mood-cell { min-height: 38px !important; aspect-ratio: 1 / 1 !important; } }`}</style>
      <div style={s.head}>
        <h2 style={s.title}>ไดอารี่อารมณ์</h2>
        <button type="button" style={s.nav} onClick={() => shift(-1)} aria-label="เดือนก่อนหน้า">
          ‹
        </button>
        <span style={s.monthLabel}>
          {MONTHS[cursor.m - 1]} {cursor.y + 543}
        </span>
        <button type="button" style={{ ...s.nav, ...(isCurrent ? { opacity: 0.35, cursor: "default" } : {}) }} disabled={isCurrent} onClick={() => shift(1)} aria-label="เดือนถัดไป">
          ›
        </button>
      </div>

      <div style={s.grid}>
        {DOW.map((d) => (
          <span key={d} style={s.dow}>
            {d}
          </span>
        ))}
        {cells.map((n, i) => {
          if (n === null) return <span key={`b${i}`} />;
          const day = `${monthKey}-${pad(n)}`;
          const e = entries[day];
          const m = e && MOOD_BY_KEY[e.mood];
          const future = day > today;
          return (
            <button
              key={day}
              type="button"
              className="mood-cell"
              disabled={future}
              onClick={() => setSelected(day)}
              aria-label={`${longDay(day)}${m ? ` ${m.label}` : ""}`}
              style={{
                ...s.cell,
                ...(day === today ? s.cellToday : {}),
                ...(future ? s.cellDisabled : {}),
                ...(m ? { background: `color-mix(in srgb, ${m.tint} 22%, var(--bg-surface))`, borderColor: `color-mix(in srgb, ${m.tint} 70%, var(--ink))` } : {}),
              }}
            >
              <span style={s.num}>{n}</span>
              {m && <MoodIcon mood={m.key} size={28} />}
              {e && e.hasImage && <span style={s.dot}>🖼️</span>}
            </button>
          );
        })}
      </div>

      <div style={s.stats}>
        {MOODS.filter((m) => counts[m.key]).map((m) => (
          <span key={m.key} style={s.chip}>
            <MoodIcon mood={m.key} size={20} /> {m.label} <b>{counts[m.key]}</b>
          </span>
        ))}
      </div>
      <p style={s.summary}>
        {loading
          ? "กำลังโหลด..."
          : logged === 0
            ? "เดือนนี้ยังไม่มีบันทึก — กดที่วันไหนก็ได้เพื่อเริ่มบันทึก"
            : `บันทึกแล้ว ${logged}/${isCurrent ? Number(today.slice(8)) : daysInMonth} วัน${top ? ` · อารมณ์ที่เจอบ่อยสุดคือ "${top.label}"` : ""}`}
      </p>

      {selected && (
        <div style={s.backdrop} onClick={() => setSelected(null)}>
          <div style={s.modal} role="dialog" aria-modal="true" aria-label={longDay(selected)} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ ...s.modalTitle, display: "flex", alignItems: "center", gap: 10 }}>
              {selMood && <MoodIcon mood={selMood.key} size={34} />}
              {longDay(selected)}
            </h3>
            {sel && !editing ? (
              <>
                {sel.hasImage && <MoodImage day={selected} version={sel.updatedAt} style={s.bigImg} />}
                <p style={s.noteRead}>{sel.note || `รู้สึก${selMood ? selMood.label : ""}`}</p>
                <button type="button" className="doodle-btn" onClick={() => setEditing(true)}>
                  <EditIcon /> แก้ไข
                </button>
              </>
            ) : (
              <MoodEditor
                day={selected}
                entry={sel}
                onSaved={(saved) => {
                  setEntries((prev) => ({ ...prev, [saved.day]: saved }));
                  setEditing(false);
                  if (!sel) setSelected(null);
                }}
                onDeleted={() => {
                  setEntries((prev) => {
                    const next = { ...prev };
                    delete next[selected];
                    return next;
                  });
                  setSelected(null);
                }}
                submitLabel="บันทึก"
              />
            )}
            <button type="button" style={s.close} onClick={() => setSelected(null)}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
