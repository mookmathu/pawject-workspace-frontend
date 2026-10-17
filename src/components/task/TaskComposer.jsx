import React, { useState, useRef, useEffect } from "react";
import { CalendarPickerField, dateToFields, fieldsToDate } from "../calendar/DateTimeFields";

/**
 * Collapsed: a plain dashed "+ Add a Task" button.
 * Expanded (after clicking): a compose card with a title input on top,
 * and three "+ เพิ่ม ..." rows underneath that each turn into a real
 * field once clicked — description, due date, category.
 */
export default function TaskComposer({ onSubmit, categories = [], members = [], openRequest = 0 }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDateFields, setDueDateFields] = useState(() => dateToFields(new Date()));
  const [categoryId, setCategoryId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [showDue, setShowDue] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showAssignee, setShowAssignee] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // The board's column "+" buttons and the header's "เพิ่มงานใหม่" button
  // can't reach into this component's own `open` state, so they bump a
  // counter instead — each increase opens the composer (focusing its title
  // input, which also scrolls it into view in a long column).
  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  function reset() {
    setOpen(false);
    setTitle("");
    setDescription("");
    setDueDateFields(dateToFields(new Date()));
    setCategoryId("");
    setAssigneeId("");
    setShowDesc(false);
    setShowDue(false);
    setShowCategory(false);
    setShowAssignee(false);
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

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={styles.collapsedBtn}>
        + Add a Task
      </button>
    );
  }

  return (
    <div style={styles.composer}>
      <input
        ref={titleRef}
        type="text"
        placeholder="พิมพ์ชื่อ..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        style={styles.titleInput}
      />

      {showDesc && (
        <div style={styles.fieldRow}>
          <span style={styles.fieldIcon}>≡</span>
          <input
            type="text"
            placeholder="คำอธิบาย"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.fieldInput}
          />
        </div>
      )}
      {showDue && (
        <div style={styles.fieldRow}>
          <CalendarPickerField value={dueDateFields} onChange={setDueDateFields} />
        </div>
      )}
      {showCategory && (
        <div style={styles.fieldRow}>
          <span style={styles.fieldIcon}>⊙</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={styles.fieldSelect}
          >
            <option value="">ไม่ระบุหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {showAssignee && (
        <div style={styles.fieldRow}>
          <span style={styles.fieldIcon}>👤</span>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            style={styles.fieldSelect}
          >
            <option value="">ไม่ระบุผู้รับผิดชอบ</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                @{m.username}
              </option>
            ))}
          </select>
        </div>
      )}

      {(!showDesc || !showDue || !showCategory || !showAssignee) && (
        <div style={styles.toggleRow}>
          {!showDesc && (
            <button type="button" onClick={() => setShowDesc(true)} style={styles.toggleBtn}>
              ≡ เพิ่ม คำอธิบาย
            </button>
          )}
          {!showDue && (
            <button type="button" onClick={() => setShowDue(true)} style={styles.toggleBtn}>
              📅 เพิ่ม วันครบกำหนด
            </button>
          )}
          {!showCategory && (
            <button type="button" onClick={() => setShowCategory(true)} style={styles.toggleBtn}>
              ⊙ เพิ่ม หมวดหมู่
            </button>
          )}
          {!showAssignee && members.length > 0 && (
            <button type="button" onClick={() => setShowAssignee(true)} style={styles.toggleBtn}>
              👤 มอบหมายให้...
            </button>
          )}
        </div>
      )}

      <div style={styles.actionsRow}>
        <button type="button" onClick={handleSubmit} style={styles.addBtn}>
          เพิ่มงาน
        </button>
        <button type="button" onClick={reset} style={styles.cancelBtn}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

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
  composer: {
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: "10px 16px 10px 16px / 14px 10px 14px 10px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  titleInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    padding: "2px 0",
    background: "transparent",
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  fieldIcon: {
    fontSize: 13,
    color: "var(--ink-faint)",
    width: 16,
    textAlign: "center",
    flexShrink: 0,
  },
  fieldInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-soft)",
    border: "none",
    borderBottom: "1.5px solid #E7E2D6",
    outline: "none",
    padding: "3px 0",
    flex: 1,
    background: "transparent",
  },
  fieldSelect: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-soft)",
    border: "none",
    borderBottom: "1.5px solid #E7E2D6",
    outline: "none",
    padding: "3px 0",
    flex: 1,
    background: "transparent",
  },
  toggleRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  toggleBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-faint)",
    background: "transparent",
    border: "none",
    padding: "3px 0",
    textAlign: "left",
    cursor: "pointer",
  },
  actionsRow: {
    display: "flex",
    gap: 8,
    marginTop: 4,
  },
  addBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    border: "none",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
  },
  cancelBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-faint)",
    background: "transparent",
    border: "none",
    padding: "6px 8px",
    cursor: "pointer",
  },
};
