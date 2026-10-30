import React, { useState } from "react";
import { CalendarPickerField, dateToFields, fieldsToDate } from "../calendar/DateTimeFields";
import { addComment, deleteComment } from "../../lib/api";
import DoodleIcon from "../common/DoodleIcon";

const PRIORITY_OPTIONS = ["ต่ำ", "ปานกลาง", "สูง"];

function getStoredUserId() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw).id : null;
  } catch {
    return null;
  }
}

/**
 * Full-page-style detail view for one task, shown as an overlay.
 * `columns` is the board's status columns, `categories` is the board's
 * managed category list, `members` is the workspace's member list — all
 * used to populate their dropdowns here.
 * `onUpdate(patch)` is called with a partial Task object whenever a field
 * is edited; `onRefresh` re-fetches the whole board (used after a comment
 * is added/removed, since that's not a scalar field on the task itself).
 */
export default function TaskDetailModal({
  task,
  columns,
  categories = [],
  members = [],
  canEdit = true,
  onClose,
  onUpdate,
  onDelete,
  onRefresh,
}) {
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note || "");
  const [priority, setPriority] = useState(task.priority || "");
  const [dueDateFields, setDueDateFields] = useState(
    dateToFields(task.dueDate ? new Date(task.dueDate) : new Date())
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const myUserId = getStoredUserId();

  function commit(field, value) {
    onUpdate({ [field]: value === "" ? null : value });
  }

  function commitDueDate(next) {
    setDueDateFields(next);
    commit("dueDate", fieldsToDate(next, { hour: 23, minute: 59 }).toISOString());
  }

  async function handleAddComment() {
    const content = commentDraft.trim();
    if (!content) return;
    try {
      await addComment(task.id, content);
      setCommentDraft("");
      setCommentError("");
      onRefresh?.();
    } catch (err) {
      setCommentError(err.message);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(commentId);
      onRefresh?.();
    } catch (err) {
      setCommentError(err.message);
    }
  }

  return (
    <div role="presentation" style={styles.overlay} onClick={onClose}>
      <style>{`
        @media (max-width: 480px) {
          .task-detail-sheet { padding: 24px 18px 20px !important; }
          .task-detail-proprow { flex-direction: column !important; align-items: flex-start !important; gap: 4px !important; }
          .task-detail-proplabel { width: auto !important; }
        }
      `}</style>
      <div role="presentation" className="task-detail-sheet" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={styles.closeBtn} title="ปิด">
          ×
        </button>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => commit("title", title.trim())}
          disabled={!canEdit}
          style={styles.titleInput}
        />

        {!canEdit && (
          <p style={styles.lockedBanner}>
            🔒 งานนี้ถูกมอบหมายแล้ว ขอสงวนสิทธิ์แก้ไขให้เฉพาะผู้รับผิดชอบกับ Head กลุ่มนะคะ — ใครจะคอมเมนต์ก็ตามสบายเลย
          </p>
        )}

        <div className="task-detail-proprow" style={styles.propRow}>
          <span className="task-detail-proplabel" style={styles.propLabel}>⊙ หมวดหมู่</span>
          <select
            value={task.categoryId || ""}
            onChange={(e) => commit("categoryId", e.target.value)}
            disabled={!canEdit}
            style={styles.propSelect}
          >
            <option value="">ไม่ระบุ</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="task-detail-proprow" style={styles.propRow}>
          <span className="task-detail-proplabel" style={styles.propLabel}><DoodleIcon name="person" size={16} /> ผู้รับผิดชอบ</span>
          <select
            value={task.assigneeId || ""}
            onChange={(e) => commit("assigneeId", e.target.value)}
            disabled={!canEdit}
            style={styles.propSelect}
          >
            <option value="">ไม่ระบุ</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                @{m.username}
              </option>
            ))}
          </select>
        </div>

        <div className="task-detail-proprow" style={styles.propRow}>
          <span className="task-detail-proplabel" style={styles.propLabel}>≡ คำอธิบาย</span>
          <input
            placeholder="ว่างเปล่า"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => commit("note", note.trim())}
            disabled={!canEdit}
            style={styles.propInput}
          />
        </div>

        <div className="task-detail-proprow" style={styles.propRow}>
          <span className="task-detail-proplabel" style={styles.propLabel}>⊙ ลำดับความสำคัญ</span>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              commit("priority", e.target.value);
            }}
            disabled={!canEdit}
            style={styles.propSelect}
          >
            <option value="">ว่างเปล่า</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="task-detail-proprow" style={styles.propRow}>
          <span className="task-detail-proplabel" style={styles.propLabel}>วันครบกำหนด</span>
          <CalendarPickerField value={dueDateFields} onChange={commitDueDate} disabled={!canEdit} />
        </div>

        <div className="task-detail-proprow" style={styles.propRow}>
          <span className="task-detail-proplabel" style={styles.propLabel}>✳ สถานะ</span>
          <select
            value={task.statusId}
            onChange={(e) => commit("statusId", e.target.value)}
            disabled={!canEdit}
            style={styles.propSelect}
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <hr style={styles.divider} />

        <h3 style={styles.commentsTitle}>💬 คอมเมนต์</h3>
        {commentError && <p style={styles.commentError}>{commentError}</p>}
        {(task.comments || []).length === 0 ? (
          <p style={styles.noComments}>ยังไม่มีคอมเมนต์</p>
        ) : (
          <div style={styles.commentList}>
            {task.comments.map((c) => (
              <div key={c.id} style={styles.commentRow}>
                <div style={styles.commentBubble}>
                  <p style={styles.commentAuthor}>@{c.author.username}</p>
                  <p style={styles.commentContent}>{c.content}</p>
                </div>
                {c.authorId === myUserId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    style={styles.commentDeleteBtn}
                    title="ลบคอมเมนต์"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={styles.commentAddRow}>
          <input
            type="text"
            placeholder="พิมพ์คอมเมนต์..."
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            style={styles.commentInput}
          />
          <button type="button" onClick={handleAddComment} style={styles.commentSendBtn}>
            ส่ง
          </button>
        </div>

        {canEdit && (
          <>
            <hr style={styles.divider} />
            <button type="button" onClick={onDelete} style={styles.deleteBtn}>
              ลบงานนี้
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(53,59,70,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  sheet: {
    position: "relative",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 20,
    boxShadow: "6px 6px 0 0 var(--ink)",
    width: "100%",
    maxWidth: 520,
    maxHeight: "85vh",
    overflowY: "auto",
    padding: "36px 32px 28px",
    boxSizing: "border-box",
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 18,
    background: "transparent",
    border: "none",
    fontSize: 24,
    color: "var(--ink-faint)",
    cursor: "pointer",
    lineHeight: 1,
  },
  titleInput: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 26,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    width: "100%",
    marginBottom: 12,
    background: "transparent",
  },
  lockedBanner: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#8A5A1B",
    background: "#FCE8C2",
    border: "1.5px solid #E8C27A",
    borderRadius: 10,
    padding: "8px 12px",
    margin: "0 0 18px",
    lineHeight: 1.5,
  },
  propRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "10px 0",
    borderBottom: "1.5px solid #EFEAE0",
  },
  propLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink-faint)",
    width: 150,
    flexShrink: 0,
  },
  propInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    background: "transparent",
    flex: 1,
  },
  propSelect: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    background: "transparent",
    flex: 1,
  },
  divider: {
    border: "none",
    borderTop: "1.5px solid #EFEAE0",
    margin: "20px 0 16px",
  },
  commentsTitle: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 16,
    color: "var(--ink)",
    margin: "0 0 10px",
  },
  commentError: {
    color: "#E0473E",
    fontSize: 12.5,
    fontWeight: 600,
    marginBottom: 8,
  },
  noComments: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-faint)",
    margin: "0 0 10px",
  },
  commentList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 10,
  },
  commentRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
  },
  commentBubble: {
    background: "#F6F3EC",
    borderRadius: 12,
    padding: "8px 12px",
    flex: 1,
  },
  commentAuthor: {
    fontFamily: "'Itim', cursive",
    fontSize: 11.5,
    fontWeight: 700,
    color: "#2C5F8A",
    margin: "0 0 2px",
  },
  commentContent: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "#353B46",
    margin: 0,
    wordBreak: "break-word",
  },
  commentDeleteBtn: {
    background: "transparent",
    border: "none",
    color: "#C9C0AE",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    padding: 4,
    flexShrink: 0,
  },
  commentAddRow: {
    display: "flex",
    gap: 8,
  },
  commentInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "var(--ink)",
    border: "1.5px solid #E7E2D6",
    borderRadius: 10,
    padding: "8px 12px",
    flex: 1,
    outline: "none",
  },
  commentSendBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    border: "none",
    borderRadius: 10,
    padding: "8px 16px",
    cursor: "pointer",
  },
  deleteBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "#E0473E",
    background: "transparent",
    border: "2px solid #E0473E",
    borderRadius: 10,
    padding: "8px 16px",
    cursor: "pointer",
  },
};
