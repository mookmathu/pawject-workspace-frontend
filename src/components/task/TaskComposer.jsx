import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarPickerField, dateToFields, fieldsToDate } from "../calendar/DateTimeFields";

/**
 * Collapsed: a plain dashed "+ Add a Task" button in the column.
 * Clicking it (or the column's "+" button) slides a panel in from the right
 * with the whole form — title, description, due date, category, assignee —
 * instead of squeezing a tiny form into the column itself.
 */
export default function TaskComposer({ onSubmit, categories = [], members = [], openRequest = 0, columnName = "" }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDateFields, setDueDateFields] = useState(() => dateToFields(new Date()));
  const [showDue, setShowDue] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const titleRef = useRef(null);

  // The board's column "+" buttons and the header's "เพิ่มงานใหม่" button
  // can't reach into this component's own `open` state, so they bump a
  // counter instead — each increase opens the panel.
  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => titleRef.current?.focus(), 250); // after the slide-in
    const onKey = (e) => e.key === "Escape" && reset();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    setOpen(false);
    setTitle("");
    setDescription("");
    setDueDateFields(dateToFields(new Date()));
    setShowDue(false);
    setCategoryId("");
    setAssigneeId("");
  }

  function handleSubmit() {
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      note: description.trim() || undefined,
      // due by end of that day, since there's no time-of-day for tasks
      dueDate: showDue ? fieldsToDate(dueDateFields, { hour: 23, minute: 59 }).toISOString() : undefined,
      categoryId: categoryId || undefined,
      assigneeId: assigneeId || undefined,
    });
    reset();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={styles.collapsedBtn}>
        + Add a Task
      </button>

      {open &&
        createPortal(
          <div className="tc-backdrop" style={styles.backdrop} onClick={reset}>
            <style>{CSS}</style>
            <aside className="tc-panel" style={styles.panel} role="dialog" aria-modal="true" aria-label="เพิ่มงานใหม่" onClick={(e) => e.stopPropagation()}>
              <div style={styles.head}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={styles.headTitle}>เพิ่มงานใหม่</h3>
                  {columnName && <span style={styles.statusChip}>สถานะ: {columnName}</span>}
                </div>
                <button type="button" className="tc-x" style={styles.closeBtn} onClick={reset} aria-label="ปิด" title="ปิด">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                </button>
              </div>

              <div style={styles.body}>
                <label style={styles.field}>
                  <span style={styles.label}>ชื่องาน <b style={{ color: "#E0473E" }}>*</b></span>
                  <input
                    ref={titleRef}
                    type="text"
                    placeholder="พิมพ์ชื่องาน..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={styles.input}
                  />
                </label>

                <label style={styles.field}>
                  <span style={styles.label}>คำอธิบาย</span>
                  <textarea
                    placeholder="รายละเอียดของงาน (ไม่บังคับ)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ ...styles.input, minHeight: 110, resize: "vertical" }}
                  />
                </label>

                <div style={styles.field}>
                  <span style={styles.label}>วันครบกำหนด</span>
                  <div style={styles.dueRow}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showDue}
                      onClick={() => setShowDue((v) => !v)}
                      style={{ ...styles.toggle, ...(showDue ? styles.toggleOn : {}) }}
                      title={showDue ? "ไม่กำหนดวัน" : "กำหนดวัน"}
                    >
                      <span style={{ ...styles.knob, ...(showDue ? styles.knobOn : {}) }} />
                    </button>
                    {showDue ? <CalendarPickerField value={dueDateFields} onChange={setDueDateFields} /> : <span style={styles.hint}>ไม่กำหนดวัน</span>}
                  </div>
                </div>

                <label style={styles.field}>
                  <span style={styles.label}>หมวดหมู่</span>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={styles.input}>
                    <option value="">ไม่ระบุหมวดหมู่</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                {members.length > 0 && (
                  <label style={styles.field}>
                    <span style={styles.label}>ผู้รับผิดชอบ</span>
                    <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={styles.input}>
                      <option value="">ไม่ระบุผู้รับผิดชอบ</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name ? `${m.name} (@${m.username})` : `@${m.username}`}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div style={styles.footer}>
                <button type="button" onClick={reset} style={styles.cancelBtn}>
                  ยกเลิก
                </button>
                <button type="button" onClick={handleSubmit} disabled={!title.trim()} style={{ ...styles.addBtn, ...(!title.trim() ? styles.addBtnOff : {}) }}>
                  เพิ่มงาน
                </button>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}

const CSS = `
@keyframes tcFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes tcSlide { from { transform: translateX(100%) } to { transform: translateX(0) } }
.tc-backdrop { animation: tcFade 180ms ease both; }
.tc-panel { animation: tcSlide 260ms cubic-bezier(.2,.8,.25,1) both; }
.tc-x { transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease; }
.tc-x:hover { transform: translate(-1px,-1px) rotate(90deg); box-shadow: 3px 3px 0 0 var(--ink); background: color-mix(in srgb, #F4B8B8 55%, var(--bg-surface)); }
@media (prefers-reduced-motion: reduce) { .tc-backdrop, .tc-panel { animation: none; } }
`;

const styles = {
  collapsedBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-soft)",
    background: "color-mix(in srgb, var(--bg-surface) 55%, transparent)",
    border: "2px dashed var(--ink-faint)",
    borderRadius: "10px 16px 10px 16px / 14px 10px 14px 10px",
    padding: "9px 10px",
    width: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
    textAlign: "center",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(20,20,30,0.42)",
    display: "flex",
    justifyContent: "flex-end",
  },
  panel: {
    width: "100%",
    maxWidth: 440,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    background: "var(--bg-surface)",
    color: "var(--ink)",
    fontFamily: "'Itim', cursive",
    borderLeft: "2.5px solid var(--ink)",
    boxShadow: "-6px 0 0 0 color-mix(in srgb, var(--ink) 25%, transparent)",
  },
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    background: "color-mix(in srgb, var(--accent-color) 16%, var(--bg-surface))",
    borderBottom: "2.5px solid var(--ink)",
  },
  headTitle: { margin: 0, fontSize: 22, fontWeight: 700 },
  statusChip: {
    display: "inline-block",
    marginTop: 4,
    fontSize: 12.5,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "1.5px solid var(--ink)",
    borderRadius: 999,
    padding: "1px 10px",
  },
  closeBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "2.5px solid var(--ink)",
    borderRadius: "50%",
    boxShadow: "2px 2px 0 0 var(--ink)",
    cursor: "pointer",
  },
  body: { flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 14.5, fontWeight: 700 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: 15,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "2px solid color-mix(in srgb, var(--ink) 35%, transparent)",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
  },
  dueRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  hint: { fontSize: 14, color: "var(--ink-faint)" },
  toggle: {
    position: "relative",
    width: 46,
    height: 26,
    padding: 0,
    flexShrink: 0,
    cursor: "pointer",
    background: "color-mix(in srgb, var(--ink) 12%, var(--bg-surface))",
    border: "2px solid var(--ink)",
    borderRadius: 999,
  },
  toggleOn: { background: "var(--accent-color)" },
  knob: { position: "absolute", top: 2, left: 2, width: 18, height: 18, borderRadius: "50%", background: "var(--bg-surface)", border: "2px solid var(--ink)", boxSizing: "border-box", transition: "transform 150ms ease" },
  knobOn: { transform: "translateX(20px)" },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderTop: "2.5px solid var(--ink)",
    background: "color-mix(in srgb, var(--ink) 4%, var(--bg-surface))",
  },
  addBtn: {
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    border: "2.5px solid var(--ink)",
    borderRadius: 999,
    boxShadow: "0 3px 0 0 var(--ink)",
    padding: "8px 26px",
    cursor: "pointer",
  },
  addBtnOff: { opacity: 0.5, cursor: "not-allowed", boxShadow: "0 2px 0 0 color-mix(in srgb, var(--ink) 40%, transparent)" },
  cancelBtn: {
    fontFamily: "inherit",
    fontSize: 15,
    color: "var(--ink-soft)",
    background: "transparent",
    border: "none",
    padding: "8px 12px",
    cursor: "pointer",
    textDecoration: "underline",
  },
};
