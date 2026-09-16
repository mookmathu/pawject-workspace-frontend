import React, { useEffect, useRef, useState } from "react";
import { updateBoardNote } from "../../lib/api";

function genId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const COLORS = ["#221D17", "#E0473E", "#3E6BE0", "#2E8B4F", "#8A5A1B"];

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
  const saveTimeoutRef = useRef(null);

  // Reset local content whenever the underlying board changes (e.g. the
  // workspace switcher picked a different group).
  useEffect(() => {
    setBlocks(initialBlocks || []);
  }, [boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  function persist(nextBlocks) {
    setBlocks(nextBlocks);
    if (!boardId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateBoardNote(boardId, nextBlocks).catch(() => {
        // best-effort autosave — a failed save just gets retried on the next edit
      });
    }, 700);
  }

  function addBlock(type) {
    persist([...blocks, { id: genId(), type, html: "", done: false }]);
  }

  function updateBlockHtml(id, html) {
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, html } : b));
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateBoardNote(boardId, next).catch(() => {});
      }, 700);
      return next;
    });
  }

  function toggleTodoDone(id, done) {
    persist(blocks.map((b) => (b.id === id ? { ...b, done } : b)));
  }

  function deleteBlock(id) {
    persist(blocks.filter((b) => b.id !== id));
  }

  // Prevents the contentEditable from losing its text selection when a
  // toolbar button is pressed — this is what makes "select text, then
  // click Bold" actually work.
  function keepSelection(e) {
    e.preventDefault();
  }

  return (
    <div className="card-clean" style={styles.wrap}>
      <style>{`
        .note-editable { outline: none; }
        .note-editable:empty:before { content: attr(data-placeholder); color: #C9C0AE; }
        .note-editable b, .note-editable strong { font-weight: 700; }
        .note-editable i, .note-editable em { font-style: italic; }

        .note-tools-zone {
          display: inline-flex;
          align-items: center;
          border: 1.5px dashed #D8CFBF;
          border-radius: 999px;
          padding: 6px 14px;
          color: #8A8071;
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
          border: 2px solid #221D17;
          background: #FFFDF8;
          box-shadow: 3px 3px 0 0 #221D17;
          color: #221D17;
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
          border: 1.5px solid #E7E2D6;
          background: #F6F3EC;
          color: #221D17;
          font-family: 'Itim', cursive;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .note-tool-divider { width: 1px; height: 18px; background: #E7E2D6; flex-shrink: 0; }
        .note-tool-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #FFFDF8;
          box-shadow: 0 0 0 1.5px #E7E2D6;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
        }
      `}</style>

      <div style={styles.headerRow}>
        <h3 style={styles.title}>📝 Note</h3>

        {/* Collapsed pill that expands in place to reveal the formatting tools on hover */}
        <span className="note-tools-zone" tabIndex={0}>
          <span>🎨 Tools</span>
          <span className="note-tools-inline">
            <button
              type="button"
              className="note-tool-btn"
              onMouseDown={keepSelection}
              onClick={() => exec("bold")}
              title="ตัวหนา"
            >
              <b>B</b>
            </button>
            <button
              type="button"
              className="note-tool-btn"
              onMouseDown={keepSelection}
              onClick={() => exec("italic")}
              title="ตัวเอียง"
            >
              <i>I</i>
            </button>
            <span className="note-tool-divider" />
            {COLORS.map((c) => (
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

        <div style={styles.addButtons}>
          <button type="button" onClick={() => addBlock("text")} style={styles.toolBtn} title="เพิ่มข้อความ">
            + ข้อความ
          </button>
          <button type="button" onClick={() => addBlock("todo")} style={styles.toolBtn} title="เพิ่ม to-do">
            + To-do
          </button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p style={styles.emptyText}>ยังไม่มีโน้ต — กด "+ ข้อความ" หรือ "+ To-do" เพื่อเริ่มจดได้เลย</p>
      ) : (
        <div style={styles.blockList}>
          {blocks.map((b) => (
            <div key={b.id} style={styles.blockRow}>
              {b.type === "todo" && (
                <input
                  type="checkbox"
                  checked={!!b.done}
                  onChange={(e) => toggleTodoDone(b.id, e.target.checked)}
                  style={styles.checkbox}
                />
              )}
              <EditableBlock
                html={b.html}
                onInput={(html) => updateBlockHtml(b.id, html)}
                placeholder={b.type === "todo" ? "รายการที่ต้องทำ..." : "พิมพ์โน้ต..."}
                style={{
                  ...styles.blockInput,
                  textDecoration: b.type === "todo" && b.done ? "line-through" : "none",
                  opacity: b.type === "todo" && b.done ? 0.55 : 1,
                }}
              />
              <button type="button" onClick={() => deleteBlock(b.id)} style={styles.deleteBtn} title="ลบ">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    border: "2px solid #221D17",
    padding: "20px 22px",
    boxSizing: "border-box",
    marginTop: 20,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "minmax(60px, 1fr) auto minmax(140px, 1fr)",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 18,
    color: "#221D17",
    margin: 0,
  },
  addButtons: {
    display: "flex",
    justifySelf: "end",
    gap: 6,
  },
  toolBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#5C5346",
    background: "#F6F3EC",
    border: "1.5px solid #E7E2D6",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  emptyText: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "#8A8071",
    margin: 0,
  },
  blockList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  blockRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    flexShrink: 0,
  },
  blockInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "#221D17",
    border: "none",
    borderBottom: "1.5px solid #F0EDE3",
    padding: "4px 2px",
    flex: 1,
    minHeight: 22,
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "#C9C0AE",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    padding: 2,
    flexShrink: 0,
  },
};
