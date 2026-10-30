import React, { useEffect, useMemo, useRef, useState } from "react";
import { updateBoardNote } from "../../lib/api";
import { MascotNote } from "../common/Mascot";
import { stripTags } from "../../lib/html";
import DoodleIcon from "../common/DoodleIcon";

function genId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const TEXT_COLORS = ["var(--ink)", "#E0473E", "var(--accent-color)", "#2E8B4F", "#8A5A1B"];

// Card tints a note can be given. Each is mixed into the theme surface at
// render time so it stays readable in both light and dark mode.
const NOTE_TINTS = [
  { id: "", label: "ไม่มีสี", hex: null },
  { id: "yellow", label: "เหลือง", hex: "#E5B94A" },
  { id: "blue", label: "ฟ้า", hex: "#5B8FD6" },
  { id: "green", label: "เขียว", hex: "#6FB083" },
  { id: "pink", label: "ชมพู", hex: "#E8829B" },
  { id: "purple", label: "ม่วง", hex: "#B58BC4" },
];

const FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "text", label: "ข้อความ" },
  { id: "todo", label: "To-do" },
  { id: "open", label: "ค้างอยู่" },
];

const COLLAPSE_KEY = "crew_notes_collapsed";

function tintOf(id) {
  return NOTE_TINTS.find((t) => t.id === id)?.hex || null;
}

function getStoredUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("crew_user") || "null");
    return u?.name || u?.username || "";
  } catch {
    return "";
  }
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function stripHtml(html) {
  return stripTags(html).replace(/&nbsp;/g, " ");
}

// Runs a rich-text command (bold/italic/foreColor/...) against whatever the
// browser's current text selection is. Callers must preventDefault on
// mousedown for the button that triggers this, or the selection is lost
// before the click fires.
function exec(command, value) {
  document.execCommand(command, false, value);
}

// Uncontrolled contentEditable block — we set its HTML once on mount and
// let the browser own it after that (re-setting innerHTML on every
// keystroke would fight the cursor position).
function EditableBlock({ html, onInput, placeholder, style, className }) {
  const ref = useRef(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (!didInit.current && ref.current) {
      ref.current.innerHTML = html || "";
      didInit.current = true;
    }
  }, [html]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onInput(e.currentTarget.innerHTML)}
      data-placeholder={placeholder}
      className={`note-editable ${className || ""}`}
      style={style}
    />
  );
}

export default function BoardNotes({ boardId, initialBlocks }) {
  const [blocks, setBlocks] = useState(initialBlocks || []);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [quickText, setQuickText] = useState("");
  const [quickType, setQuickType] = useState("text");
  const [colorMenuId, setColorMenuId] = useState(null);
  const saveTimeoutRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const me = getStoredUserName();

  // Reset local content whenever the underlying board changes (e.g. the
  // workspace switcher picked a different group).
  useEffect(() => {
    setBlocks(initialBlocks || []);
    setColorMenuId(null);
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleSave(next) {
    if (!boardId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateBoardNote(boardId, next).catch(() => {
        // best-effort autosave — a failed save just gets retried on the next edit
      });
    }, 700);
  }

  function persist(next) {
    setBlocks(next);
    scheduleSave(next);
  }

  // Stamp who touched a block last, so each note can show "แก้ไขล่าสุด … โดย …".
  function touch(b) {
    return { ...b, updatedAt: new Date().toISOString(), updatedBy: me || b.updatedBy };
  }

  function patchBlock(id, patch, { stamp = true } = {}) {
    persist(blocksRef.current.map((b) => (b.id === id ? (stamp ? touch({ ...b, ...patch }) : { ...b, ...patch }) : b)));
  }

  function addBlock(type, html = "") {
    persist([
      touch({ id: genId(), type, html, done: false, pinned: false, color: "", title: "" }),
      ...blocksRef.current,
    ]);
  }

  function handleQuickAdd() {
    const text = quickText.trim();
    if (!text) return;
    const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    addBlock(quickType, safe);
    setQuickText("");
  }

  function deleteBlock(id) {
    persist(blocksRef.current.filter((b) => b.id !== id));
  }

  function clearDone() {
    persist(blocksRef.current.filter((b) => !(b.type === "todo" && b.done)));
  }

  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      } catch {
        /* not remembered — fine */
      }
      return !v;
    });
  }

  // Prevents the contentEditable from losing its text selection when a
  // toolbar button is pressed — this is what makes "select text, then
  // click Bold" actually work.
  function keepSelection(e) {
    e.preventDefault();
  }

  const todos = blocks.filter((b) => b.type === "todo");
  const doneCount = todos.filter((b) => b.done).length;
  const pct = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = blocks.filter((b) => {
      if (filter === "text" && b.type !== "text") return false;
      if (filter === "todo" && b.type !== "todo") return false;
      if (filter === "open" && !(b.type === "todo" && !b.done)) return false;
      if (q && !`${b.title || ""} ${stripHtml(b.html)}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // pinned first; otherwise keep the user's own order
    return [...list.filter((b) => b.pinned), ...list.filter((b) => !b.pinned)];
  }, [blocks, filter, query]);

  const textBlocks = shown.filter((b) => b.type === "text");
  const todoBlocks = shown.filter((b) => b.type === "todo");

  function renderMeta(b) {
    if (!b.updatedAt) return null;
    return (
      <span style={styles.meta}>
        อัปเดตล่าสุด {timeAgo(b.updatedAt)}
        {b.updatedBy ? ` โดย ${b.updatedBy}` : ""}
      </span>
    );
  }

  function renderColorMenu(b) {
    return (
      <div style={styles.colorMenu}>
        {NOTE_TINTS.map((t) => (
          <button
            key={t.id || "none"}
            type="button"
            title={t.label}
            onClick={() => {
              patchBlock(b.id, { color: t.id }, { stamp: false });
              setColorMenuId(null);
            }}
            style={{
              ...styles.colorDot,
              background: t.hex || "var(--bg-surface)",
              outline: (b.color || "") === t.id ? "2px solid var(--ink)" : "none",
            }}
          >
            {!t.hex && "∅"}
          </button>
        ))}
      </div>
    );
  }

  function renderTools(b) {
    return (
      <div className="note-card-tools" style={styles.cardTools}>
        <button
          type="button"
          title={b.pinned ? "เลิกปักหมุด" : "ปักหมุด"}
          onClick={() => patchBlock(b.id, { pinned: !b.pinned }, { stamp: false })}
          style={{ ...styles.iconBtn, ...(b.pinned ? styles.iconBtnOn : {}) }}
        >
          📌
        </button>
        <button
          type="button"
          title="เลือกสีการ์ด"
          onClick={() => setColorMenuId(colorMenuId === b.id ? null : b.id)}
          style={styles.iconBtn}
        >
          <DoodleIcon name="palette" size={16} style={{ verticalAlign: "middle" }} />
        </button>
        <button type="button" title="ลบ" onClick={() => deleteBlock(b.id)} style={styles.iconBtn}>
          ×
        </button>
        {colorMenuId === b.id && renderColorMenu(b)}
      </div>
    );
  }

  function cardStyle(b, extra = {}) {
    const tint = tintOf(b.color);
    return {
      ...styles.card,
      background: tint ? `color-mix(in srgb, ${tint} 16%, var(--bg-surface))` : "var(--bg-surface)",
      borderColor: tint ? `color-mix(in srgb, ${tint} 55%, var(--bg-surface))` : LINE,
      ...extra,
    };
  }

  const isEmpty = blocks.length === 0;

  return (
    <div className="card-clean note-panel" style={styles.wrap}>
      <style>{`
        .note-editable { outline: none; }
        .note-editable:empty:before { content: attr(data-placeholder); color: var(--ink-faint); }
        .note-editable b, .note-editable strong { font-weight: 700; }
        .note-editable i, .note-editable em { font-style: italic; }

        .note-card .note-card-tools { opacity: 0; transition: opacity 120ms ease; }
        .note-card:hover .note-card-tools,
        .note-card:focus-within .note-card-tools { opacity: 1; }
        .note-card { transition: transform 120ms ease, box-shadow 120ms ease; }
        .note-card:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 0 var(--ink); }
        .note-quick { display: grid !important; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; }
        .note-quick input { min-width: 0 !important; }
        @media (max-width: 560px) {
          .note-quick { grid-template-columns: minmax(0, 1fr) !important; border-radius: 20px !important; padding: 10px !important; gap: 10px !important; }
          .note-quick > div:first-child { display: grid !important; grid-template-columns: 1fr 1fr; }
          .note-quick > div:first-child button { text-align: center; padding: 7px 10px !important; }
          .note-quick input { width: 100%; box-sizing: border-box; border: 1.5px solid var(--ink-faint) !important; border-radius: 12px !important; padding: 10px 12px !important; }
          .note-quick .doodle-btn { width: 100%; padding: 10px 18px !important; }
        }
        .note-quick:focus-within { border-color: var(--ink) !important; box-shadow: 2px 2px 0 0 var(--ink); }
        @media (hover: none) { .note-card .note-card-tools { opacity: 1; } }

        .note-tools-zone {
          display: inline-flex;
          align-items: center;
          border: 1.5px dashed var(--ink-faint);
          border-radius: 999px;
          padding: 6px 14px;
          color: var(--ink-faint);
          font-family: 'Itim', cursive;
          font-size: 12.5px;
          font-weight: 700;
          cursor: default;
          user-select: none;
          overflow: hidden;
          transition: border-color 150ms ease, border-style 150ms ease, background-color 150ms ease,
            box-shadow 150ms ease, color 150ms ease;
        }
        .note-tools-zone:hover,
        .note-tools-zone:focus-within {
          border: 2px solid var(--ink);
          background: var(--bg-surface);
          box-shadow: 3px 3px 0 0 var(--ink);
          color: var(--ink);
        }
        .note-tools-inline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 0;
          opacity: 0;
          margin-left: 0;
          overflow: hidden;
          white-space: nowrap;
          transition: max-width 220ms ease, opacity 150ms ease 40ms, margin-left 220ms ease;
        }
        .note-tools-zone:hover .note-tools-inline,
        .note-tools-zone:focus-within .note-tools-inline {
          max-width: 220px;
          opacity: 1;
          margin-left: 10px;
        }
        .note-tool-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          border: 1.5px solid var(--ink-faint);
          background: var(--bg-page);
          color: var(--ink);
          font-family: 'Itim', cursive;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .note-tool-divider { width: 1px; height: 18px; background: var(--ink-faint); flex-shrink: 0; }
        .note-tool-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--bg-surface);
          box-shadow: 0 0 0 1.5px var(--ink-faint);
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .note-head { flex-direction: column; align-items: flex-start !important; }
          .note-head-actions { flex-wrap: wrap; }
        }
      `}</style>

      <div className="note-head" style={styles.headerRow}>
        <div style={styles.headLeft}>
          <span style={styles.headIcon}><DoodleIcon name="note" size={24} /></span>
          <div>
            <div style={styles.titleLine}>
              <h3 style={styles.title}>Note &amp; Quick Scratchpad</h3>
              <span style={styles.titlePill}>สมุดโน้ตประจำวัน 🐾</span>
            </div>
            <p style={styles.subtitle}>บันทึกไอเดียด่วนของกลุ่ม ข้อความสั้น และ To-do ประจำกล่องเรือ</p>
          </div>
        </div>

        <div className="note-head-actions" style={styles.headActions}>
          {!collapsed && (
            <>
              {/* Collapsed pill that expands in place to reveal the formatting tools on hover.
                  No tabIndex here — the span itself isn't interactive, and its
                  <button> children are already focusable/tabbable on their own. */}
              <span className="note-tools-zone">
                <span><DoodleIcon name="palette" size={16} /> Tools</span>
                <span className="note-tools-inline">
                  <button type="button" className="note-tool-btn" onMouseDown={keepSelection} onClick={() => exec("bold")} title="ตัวหนา">
                    <b>B</b>
                  </button>
                  <button type="button" className="note-tool-btn" onMouseDown={keepSelection} onClick={() => exec("italic")} title="ตัวเอียง">
                    <i>I</i>
                  </button>
                  <span className="note-tool-divider" />
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="note-tool-dot"
                      style={{ background: c }}
                      onMouseDown={keepSelection}
                      onClick={() => exec("foreColor", c)}
                      title="เปลี่ยนสีข้อความที่เลือก"
                    />
                  ))}
                </span>
              </span>
              <button type="button" onClick={() => addBlock("text")} style={styles.toolBtn} title="เพิ่มข้อความ">
                + ข้อความ
              </button>
              <button type="button" onClick={() => addBlock("todo")} style={{ ...styles.toolBtn, ...styles.toolBtnAccent }} title="เพิ่ม to-do">
                + To-do
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            style={styles.collapseBtn}
            title={collapsed ? "ขยายโน้ต" : "ย่อโน้ต"}
            aria-expanded={!collapsed}
          >
            {collapsed ? "⌄" : "×"}
          </button>
        </div>
      </div>

      {collapsed ? (
        <p style={styles.collapsedHint}>
          {blocks.length === 0
            ? "ยังไม่มีโน้ต"
            : `${blocks.length} โน้ต${todos.length ? ` · To-do เสร็จ ${doneCount}/${todos.length}` : ""}`}
        </p>
      ) : (
        <div style={styles.body}>
          {/* Filter chips, search and to-do progress */}
          {!isEmpty && (
            <div style={styles.filterRow}>
              <div style={styles.chips}>
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    style={{ ...styles.chip, ...(filter === f.id ? styles.chipActive : {}) }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", display: "flex", flex: "0 1 220px", minWidth: 150 }}>
                <DoodleIcon name="search" size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  type="text"
                  placeholder="ค้นหาโน้ต..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ ...styles.search, width: "100%", minWidth: 0, paddingLeft: 32 }}
                />
              </div>
              {todos.length > 0 && (
                <div style={styles.progressWrap} title={`To-do เสร็จ ${doneCount}/${todos.length}`}>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                  </div>
                  <span style={styles.progressText}>
                    {doneCount}/{todos.length}
                  </span>
                  {doneCount > 0 && (
                    <button type="button" onClick={clearDone} style={styles.clearBtn} title="ลบ To-do ที่เสร็จแล้วทั้งหมด">
                      ล้างที่เสร็จแล้ว
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isEmpty ? (
            <MascotNote
              name="reader"
              width={92}
              text="ยังไม่มีโน้ต"
              sub="พิมพ์ในช่องด้านล่างแล้วกด “เพิ่มโน้ต” หรือใช้ปุ่ม “+ ข้อความ” / “+ To-do” เพื่อเริ่มจดได้เลย"
            />
          ) : shown.length === 0 ? (
            <p style={styles.emptyText}>ไม่พบโน้ตที่ตรงกับตัวกรอง</p>
          ) : (
            <>
              {textBlocks.length > 0 && (
                <div style={styles.textList}>
                  {textBlocks.map((b) => (
                    <div key={b.id} className="note-card" style={cardStyle(b, b.pinned ? styles.cardPinned : {})}>
                      {renderTools(b)}
                      <div style={styles.cardHead}>
                        {b.pinned && <span style={styles.pinTag}>📌 ปักหมุด</span>}
                        <input
                          type="text"
                          value={b.title || ""}
                          placeholder="หัวข้อ (ไม่บังคับ)"
                          onChange={(e) => patchBlock(b.id, { title: e.target.value })}
                          style={styles.titleInput}
                        />
                        {renderMeta(b)}
                      </div>
                      <EditableBlock
                        html={b.html}
                        onInput={(html) => patchBlock(b.id, { html })}
                        placeholder="พิมพ์โน้ต..."
                        style={styles.textInput}
                      />
                    </div>
                  ))}
                </div>
              )}

              {todoBlocks.length > 0 && (
                <div style={styles.todoGrid}>
                  {todoBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="note-card"
                      style={cardStyle(b, {
                        ...styles.todoCard,
                        ...(b.done ? { opacity: 0.7 } : {}),
                        ...(b.pinned ? styles.cardPinned : {}),
                      })}
                    >
                      {renderTools(b)}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={!!b.done}
                        onClick={() => patchBlock(b.id, { done: !b.done })}
                        style={{ ...styles.check, ...(b.done ? styles.checkOn : {}) }}
                        title={b.done ? "ทำเครื่องหมายว่ายังไม่เสร็จ" : "ทำเครื่องหมายว่าเสร็จแล้ว"}
                      >
                        {b.done ? "✓" : ""}
                      </button>
                      <div style={styles.todoMain}>
                        <EditableBlock
                          html={b.html}
                          onInput={(html) => patchBlock(b.id, { html })}
                          placeholder="รายการที่ต้องทำ..."
                          style={{
                            ...styles.todoInput,
                            textDecoration: b.done ? "line-through" : "none",
                          }}
                        />
                        <div style={styles.todoFoot}>
                          <input
                            type="date"
                            value={b.due || ""}
                            onChange={(e) => patchBlock(b.id, { due: e.target.value })}
                            style={styles.dueInput}
                            title="วันที่ต้องทำ"
                          />
                          {b.updatedBy && <span style={styles.metaSmall}>โดย {b.updatedBy}</span>}
                        </div>
                      </div>
                      <span style={{ ...styles.statusTag, ...(b.done ? styles.statusDone : isOverdue(b) ? styles.statusLate : styles.statusOpen) }}>
                        {b.done ? "เสร็จแล้ว" : isOverdue(b) ? "เลยกำหนด" : "กำลังดู"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Quick add: one line, Enter to save */}
          <div className="note-quick" style={styles.quickRow}>
            <div style={styles.quickType}>
              {[
                { id: "text", label: "ข้อความ" },
                { id: "todo", label: "To-do" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQuickType(t.id)}
                  style={{ ...styles.quickTypeBtn, ...(quickType === t.id ? styles.quickTypeBtnOn : {}) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={quickText}
              placeholder="พิมพ์โน้ตด่วน บันทึกไอเดีย หรือสิ่งที่ต้องทำ..."
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              style={styles.quickInput}
            />
            <button type="button" onClick={handleQuickAdd} className="doodle-btn" style={styles.quickBtn} disabled={!quickText.trim()}>
              + เพิ่มโน้ต
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function isOverdue(b) {
  if (!b.due || b.done) return false;
  const end = new Date(`${b.due}T23:59:59`);
  return end.getTime() < Date.now();
}

const LINE = "color-mix(in srgb, var(--ink) 22%, var(--bg-surface))";
const SOFT = "color-mix(in srgb, var(--ink) 7%, var(--bg-surface))";

const styles = {
  wrap: {
    border: "2px solid var(--ink)",
    padding: "20px 22px 22px",
    boxSizing: "border-box",
    marginTop: 20,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    paddingBottom: 14,
    marginBottom: 16,
    borderBottom: `1.5px dashed ${LINE}`,
  },
  headLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  headIcon: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "color-mix(in srgb, #F4B740 30%, var(--bg-surface))",
    border: "2px solid var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  titleLine: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontFamily: "'Itim', cursive", fontWeight: 700, fontSize: 18, color: "var(--ink)", margin: 0 },
  titlePill: {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--ink)",
    background: "color-mix(in srgb, #F4B740 35%, var(--bg-surface))",
    border: "1.5px solid var(--ink)",
    borderRadius: 999,
    padding: "2px 10px",
  },
  subtitle: { fontFamily: "'Itim', cursive", fontSize: 12.5, color: "var(--ink-soft)", margin: "2px 0 0" },
  headActions: { display: "flex", alignItems: "center", gap: 8 },
  toolBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: `1.5px solid var(--ink)`,
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  toolBtnAccent: {
    background: "color-mix(in srgb, var(--accent-color) 18%, var(--bg-surface))",
    color: "var(--accent-color)",
  },
  collapseBtn: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "1.5px solid var(--ink)",
    background: SOFT,
    color: "var(--ink)",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
  },
  collapsedHint: { fontFamily: "'Itim', cursive", fontSize: 13.5, color: "var(--ink-soft)", margin: 0 },
  body: { display: "flex", flexDirection: "column", gap: 14 },

  filterRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    background: "transparent",
    border: `1.5px solid ${LINE}`,
    borderRadius: 999,
    padding: "4px 12px",
    cursor: "pointer",
  },
  chipActive: {
    color: "var(--ink)",
    fontWeight: 700,
    borderColor: "var(--ink)",
    background: "color-mix(in srgb, var(--accent-color) 16%, var(--bg-surface))",
  },
  search: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: `1.5px solid ${LINE}`,
    borderRadius: 999,
    padding: "5px 12px",
    outline: "none",
    minWidth: 150,
    flex: "0 1 220px",
  },
  progressWrap: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" },
  progressTrack: { width: 110, height: 10, borderRadius: 999, border: "1.5px solid var(--ink)", background: SOFT, overflow: "hidden" },
  progressFill: { height: "100%", background: "#4CAF7A", transition: "width 250ms ease" },
  progressText: { fontFamily: "'Itim', cursive", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" },
  clearBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    color: "var(--ink-soft)",
    background: "transparent",
    border: "none",
    textDecoration: "underline",
    cursor: "pointer",
    padding: 0,
  },

  emptyText: { fontFamily: "'Itim', cursive", fontSize: 13.5, color: "var(--ink-faint)", margin: 0 },

  card: {
    position: "relative",
    borderWidth: 1.5, borderStyle: "solid",
    borderRadius: 14,
    padding: "12px 14px",
    boxSizing: "border-box",
  },
  cardPinned: { borderWidth: 2, borderColor: "var(--ink)" },
  cardTools: {
    position: "absolute",
    top: 6,
    right: 8,
    display: "flex",
    gap: 4,
    alignItems: "center",
    background: "var(--bg-surface)",
    border: `1.5px solid ${LINE}`,
    borderRadius: 999,
    padding: "1px 4px",
    zIndex: 2,
  },
  iconBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
    padding: "3px 4px",
    color: "var(--ink-soft)",
    borderRadius: 6,
    filter: "grayscale(0.5)",
  },
  iconBtnOn: { filter: "none", background: SOFT },
  colorMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    display: "flex",
    gap: 6,
    padding: 8,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 var(--ink)",
    zIndex: 5,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    border: "1.5px solid var(--ink)",
    cursor: "pointer",
    padding: 0,
    fontSize: 11,
    color: "var(--ink-soft)",
    outlineOffset: 2,
  },

  textList: { display: "flex", flexDirection: "column", gap: 10 },
  cardHead: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6, paddingRight: 90 },
  pinTag: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--ink)",
    background: "color-mix(in srgb, #4CAF7A 28%, var(--bg-surface))",
    border: "1.5px solid #4CAF7A",
    borderRadius: 999,
    padding: "1px 9px",
  },
  titleInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    fontWeight: 700,
    color: "var(--ink)",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "2px 0",
    minWidth: 120,
    flex: "0 1 220px",
  },
  meta: { fontFamily: "'Itim', cursive", fontSize: 11.5, color: "var(--ink-faint)" },
  metaSmall: { fontFamily: "'Itim', cursive", fontSize: 11, color: "var(--ink-faint)" },
  textInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14.5,
    lineHeight: 1.55,
    color: "var(--ink)",
    minHeight: 24,
  },

  todoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 },
  todoCard: { display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px", paddingTop: 12 },
  check: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    borderWidth: 2, borderStyle: "solid", borderColor: "var(--accent-color)",
    background: "transparent",
    color: "#FFFDF8",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    marginTop: 1,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { background: "#4CAF7A", borderColor: "#4CAF7A" },
  todoMain: { flex: 1, minWidth: 0 },
  todoInput: { fontFamily: "'Itim', cursive", fontSize: 14, color: "var(--ink)", minHeight: 20, wordBreak: "break-word" },
  todoFoot: { display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" },
  dueInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 11.5,
    color: "var(--ink-soft)",
    background: "transparent",
    border: `1px dashed ${LINE}`,
    borderRadius: 6,
    padding: "1px 4px",
    colorScheme: "light dark",
  },
  statusTag: {
    fontFamily: "'Itim', cursive",
    fontSize: 11.5,
    fontWeight: 700,
    borderRadius: 999,
    padding: "2px 9px",
    flexShrink: 0,
    whiteSpace: "nowrap",
    marginTop: 1,
  },
  statusDone: { background: "color-mix(in srgb, #4CAF7A 25%, var(--bg-surface))", color: "#2E8B4F" },
  statusOpen: { background: "color-mix(in srgb, #5B9BD5 22%, var(--bg-surface))", color: "#3B77AE" },
  statusLate: { background: "color-mix(in srgb, #E0473E 22%, var(--bg-surface))", color: "#C23B33" },

  quickRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    border: `1.5px solid ${LINE}`,
    borderRadius: 999,
    padding: "5px 6px 5px 6px",
    background: "var(--bg-surface)",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
  },
  quickType: { display: "flex", gap: 2, background: SOFT, borderRadius: 999, padding: 2 },
  quickTypeBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    color: "var(--ink-soft)",
    background: "transparent",
    border: "none",
    borderRadius: 999,
    padding: "4px 10px",
    cursor: "pointer",
  },
  quickTypeBtnOn: { background: "var(--bg-surface)", color: "var(--ink)", fontWeight: 700, boxShadow: `0 0 0 1.5px var(--ink)` },
  quickInput: {
    flex: 1,
    minWidth: 160,
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink)",
    background: "transparent",
    border: "none",
    outline: "none",
    padding: "6px 4px",
  },
  quickBtn: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    padding: "7px 18px",
    whiteSpace: "nowrap",
  },
};
