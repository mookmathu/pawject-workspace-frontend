import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyWorkspaces,
  getWorkspaceBoard,
  createTask,
  updateTask,
  deleteTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  createColumn,
  updateColumn,
  deleteColumn,
  createCategory,
  deleteCategory,
} from "../../lib/api";
import TaskComposer from "./TaskComposer";
import TaskDetailModal from "./TaskDetailModal";
import BoardNotes from "./BoardNotes";
import { categoryColor } from "./categoryColor";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

const SWATCH_COLORS = ["#F6D3D0", "#D7E8FB", "#E3DEF6", "#DCEFD9", "#FCE8C2", "#F6C9C4", "#E7E2D6"];

// Picks readable ink or cream text over a manually-chosen background color.
function getContrastText(hex) {
  if (!hex) return "#221D17";
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#221D17" : "#FFFDF8";
}

// "overdue" | "soon" | null — null for tasks with no due date, or ones
// already sitting in a column marked as "done".
function getDueUrgency(task, columns) {
  if (!task.dueDate) return null;
  const column = columns.find((c) => c.id === task.statusId);
  if (column?.isDoneColumn) return null;

  const diffMs = new Date(task.dueDate).getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 24 * 60 * 60 * 1000) return "soon";
  return null;
}

const PRIORITY_BADGE = {
  "สูง": { bg: "#F6D3D0", text: "#B5453C" },
  "ปานกลาง": { bg: "#FCE8C2", text: "#8A5A1B" },
  "ต่ำ": { bg: "#DCEFD9", text: "#2E8B4F" },
};

function getStoredUserId() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw).id : null;
  } catch {
    return null;
  }
}

function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...props}>
      <path
        d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...props}>
      <path
        d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" {...props}>
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TaskBoard() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSubtaskDrafts, setNewSubtaskDrafts] = useState({});
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Column rename-or-delete popover: which column's menu is open.
  const [menuColumnId, setMenuColumnId] = useState(null);
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [columnNameDraft, setColumnNameDraft] = useState("");

  // "+ add status" composer state.
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  // Category manager popover (list + add + delete).
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Drag-and-drop state.
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Search / filter bar.
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterAssigneeId, setFilterAssigneeId] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const myUserId = getStoredUserId();

  // Loads the board for whichever workspace is active. On the very first
  // call (no workspace picked yet) it also fetches the workspace list and
  // defaults to the personal one.
  async function loadBoard(workspaceIdOverride) {
    try {
      let targetId = workspaceIdOverride || activeWorkspaceId;

      if (!targetId) {
        const { workspaces: list } = await getMyWorkspaces();
        setWorkspaces(list);
        const personal = list.find((w) => w.isPersonal) || list[0];
        if (!personal) {
          setError("ไม่พบพื้นที่ทำงาน");
          setLoading(false);
          return;
        }
        targetId = personal.id;
        setActiveWorkspaceId(targetId);
      }

      const { board } = await getWorkspaceBoard(targetId);
      setBoard(board);
      setError("");
    } catch (err) {
      if (err.status === 401) {
        navigate("/");
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSwitchWorkspace(workspaceId) {
    setWorkspaceMenuOpen(false);
    if (!workspaceId || workspaceId === activeWorkspaceId) return;
    setLoading(true);
    setActiveWorkspaceId(workspaceId);
    loadBoard(workspaceId);
  }

  useEffect(() => {
    loadBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddTask(statusId, draft) {
    if (!board) return;
    try {
      await createTask(board.id, { ...draft, statusId });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateTask(taskId, patch) {
    try {
      await updateTask(taskId, patch);
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await deleteTask(taskId);
      setExpandedTaskId(null);
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleArchiveTask(taskId) {
    try {
      await updateTask(taskId, { archivedAt: new Date().toISOString() });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUnarchiveTask(taskId) {
    try {
      await updateTask(taskId, { archivedAt: null });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddSubtask(taskId) {
    const title = (newSubtaskDrafts[taskId] || "").trim();
    if (!title) return;
    try {
      await addSubtask(taskId, title);
      setNewSubtaskDrafts((prev) => ({ ...prev, [taskId]: "" }));
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleSubtask(subtaskId, done) {
    try {
      await updateSubtask(subtaskId, { done });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteSubtask(subtaskId) {
    try {
      await deleteSubtask(subtaskId);
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- column rename ---
  function startEditColumn(column) {
    setMenuColumnId(null);
    setEditingColumnId(column.id);
    setColumnNameDraft(column.name);
  }

  async function commitColumnRename() {
    const name = columnNameDraft.trim();
    const columnId = editingColumnId;
    setEditingColumnId(null);
    if (!name || !columnId) return;

    try {
      await updateColumn(columnId, { name });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- column delete ---
  async function handleDeleteColumn(columnId) {
    setMenuColumnId(null);
    try {
      await deleteColumn(columnId);
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- add new column ---
  async function handleAddColumn() {
    const name = newColumnName.trim();
    if (!name || !board) return;
    try {
      await createColumn(board.id, name);
      setNewColumnName("");
      setAddingColumn(false);
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- column color + done-marker ---
  async function handleSetColumnColor(columnId, color) {
    try {
      await updateColumn(columnId, { color });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleDoneColumn(columnId, isDoneColumn) {
    try {
      await updateColumn(columnId, { isDoneColumn });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- category manager ---
  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name || !board) return;
    const color = SWATCH_COLORS[(board.categories?.length || 0) % SWATCH_COLORS.length];
    try {
      await createCategory(board.id, { name, color });
      setNewCategoryName("");
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteCategory(categoryId) {
    try {
      await deleteCategory(categoryId);
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- drag-and-drop handlers ---
  function handleDragStart(e, taskId) {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId); // some browsers require data to be set
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
  }

  function handleColumnDragOver(e, columnId) {
    e.preventDefault(); // required to allow dropping
    if (dragOverColumnId !== columnId) setDragOverColumnId(columnId);
  }

  function handleColumnDragLeave(columnId) {
    setDragOverColumnId((prev) => (prev === columnId ? null : prev));
  }

  function handleColumnDrop(e, columnId) {
    e.preventDefault();
    const taskId = draggedTaskId || e.dataTransfer.getData("text/plain");
    setDraggedTaskId(null);
    setDragOverColumnId(null);

    if (!taskId) return;
    const task = (board?.tasks || []).find((t) => t.id === taskId);
    if (!task || task.statusId === columnId) return; // no-op if dropped back in the same column

    handleUpdateTask(taskId, { statusId: columnId });
  }

  if (loading && !board) {
    return (
      <div className="card-clean task-board" style={styles.board}>
        <p style={styles.loadingText}>กำลังโหลดบอร์ด...</p>
      </div>
    );
  }

  const columns = board?.columns || [];
  const categories = board?.categories || [];
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const members = (activeWorkspace?.members || []).map((m) => m.user);
  const expandedTask = (board?.tasks || []).find((t) => t.id === expandedTaskId) || null;
  const allTasks = board?.tasks || [];
  const urgentCount = allTasks.filter((t) => !t.archivedAt && getDueUrgency(t, columns)).length;
  const archivedCount = allTasks.filter((t) => t.archivedAt).length;

  const visibleTasks = allTasks.filter((t) => {
    if (t.archivedAt && !showArchived) return false;
    if (!t.archivedAt && showArchived) return false; // when the toggle is on, show ONLY archived ones
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    if (filterCategoryId && t.categoryId !== filterCategoryId) return false;
    if (filterAssigneeId && t.assigneeId !== filterAssigneeId) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (onlyMine && t.assigneeId !== myUserId) return false;
    return true;
  });

  const displayTitle = activeWorkspace
    ? activeWorkspace.isPersonal
      ? "My Board"
      : activeWorkspace.name
    : board?.name || "My Board";

  return (
    <>
    <div className="card-clean task-board" style={styles.board}>
      <style>{`
        .task-card-actions { opacity: 0; transition: opacity 120ms ease; }
        .task-card:hover .task-card-actions { opacity: 1; }

        .task-title-btn { transition: background-color 120ms ease; }
        .task-title-btn:hover:not(:disabled) { background-color: #F6F3EC; }
        .task-title-btn:disabled { cursor: default; }

        @media (max-width: 640px) {
          .task-board { padding: 16px !important; }
          .task-board-header { flex-direction: column; align-items: flex-start !important; }
          .task-columns-grid { grid-template-columns: 1fr !important; }
          .task-card-actions { opacity: 1; } /* no hover on touch devices — always visible */
        }
      `}</style>
      <div className="task-board-header" style={styles.boardHeader}>
        <div>
          <div style={styles.titleRow}>
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((v) => !v)}
              className="task-title-btn"
              style={styles.titleButton}
              disabled={workspaces.length <= 1}
            >
              <h2 style={styles.boardTitle}>{displayTitle}</h2>
              {workspaces.length > 1 && (
                <span
                  style={{
                    ...styles.chevron,
                    ...(workspaceMenuOpen ? styles.chevronOpen : {}),
                  }}
                >
                  <ChevronDownIcon />
                </span>
              )}
            </button>

            {workspaceMenuOpen && (
              <div style={styles.workspaceMenu}>
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleSwitchWorkspace(w.id)}
                    style={{
                      ...styles.workspaceMenuItem,
                      ...(w.id === activeWorkspaceId ? styles.workspaceMenuItemActive : {}),
                    }}
                  >
                    {w.isPersonal ? "My Board (ของฉัน)" : w.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p style={styles.boardSubtitle}>บอร์ดของคุณ — ลากการ์ดเพื่อย้ายสถานะ หรือคลิกชื่อสถานะเพื่อแก้ไข/ลบ</p>
          {urgentCount > 0 && (
            <p style={styles.urgentBanner}>🔔 มี {urgentCount} งานใกล้/เกินกำหนดที่ยังไม่เสร็จ</p>
          )}
          {error && <p style={styles.errorText}>{error}</p>}
        </div>

        {/* "+ add status" and category manager sit bottom-right, aligned with the subtitle line */}
        <div style={styles.headerActions}>
          <div style={styles.headerActionWrap}>
            <button
              type="button"
              onClick={() => setCategoryMenuOpen((v) => !v)}
              style={styles.addColumnSmallBtn}
            >
              🏷️ หมวดหมู่
            </button>
            {categoryMenuOpen && (
              <div style={styles.categoryMenu}>
                {categories.length === 0 && (
                  <p style={styles.categoryMenuEmpty}>ยังไม่มีหมวดหมู่</p>
                )}
                {categories.map((c) => (
                  <div key={c.id} style={styles.categoryMenuRow}>
                    <span
                      style={{
                        ...styles.categoryMenuTag,
                        background: c.color,
                        color: getContrastText(c.color),
                      }}
                    >
                      {c.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(c.id)}
                      style={styles.categoryMenuDelete}
                      title="ลบหมวดหมู่นี้"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div style={styles.categoryAddRow}>
                  <input
                    type="text"
                    placeholder="หมวดหมู่ใหม่..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    style={styles.categoryAddInput}
                  />
                  <button type="button" onClick={handleAddCategory} style={styles.addBtn}>
                    เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>

          {addingColumn ? (
            <div style={styles.newColumnInline}>
              <input
                autoFocus
                placeholder="ชื่อสถานะใหม่"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                style={styles.newColumnInput}
              />
              <button type="button" onClick={handleAddColumn} style={styles.addBtn}>
                เพิ่ม
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingColumn(true)} style={styles.addColumnSmallBtn}>
              + เพิ่มสถานะ
            </button>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 ค้นหางาน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {members.length > 0 && (
          <select
            value={filterAssigneeId}
            onChange={(e) => setFilterAssigneeId(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="">ทุกคน</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                @{m.username}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">ทุกความสำคัญ</option>
          {Object.keys(PRIORITY_BADGE).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {myUserId && (
          <button
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            style={{ ...styles.filterToggleBtn, ...(onlyMine ? styles.filterToggleBtnActive : {}) }}
          >
            👤 งานของฉัน
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          style={{ ...styles.filterToggleBtn, ...(showArchived ? styles.filterToggleBtnActive : {}) }}
        >
          🗄️ งานที่เก็บไว้ ({archivedCount})
        </button>
      </div>

      {/* Close any open popover / add-column form when clicking elsewhere */}
      {(menuColumnId || addingColumn || workspaceMenuOpen || categoryMenuOpen) && (
        <div
          style={styles.clickCatcher}
          onClick={() => {
            setMenuColumnId(null);
            setAddingColumn(false);
            setWorkspaceMenuOpen(false);
            setCategoryMenuOpen(false);
          }}
        />
      )}

      {/* Each status is one self-contained framed group: label + its tasks + add-task, together */}
      {loading ? (
        <p style={styles.loadingText}>กำลังสลับกลุ่ม...</p>
      ) : (
        <div className="task-columns-grid" style={styles.columns}>
        {columns.map((col) => {
          const colColor = col.color
            ? { bg: col.color, text: getContrastText(col.color) }
            : categoryColor(col.name);
          const isEditing = editingColumnId === col.id;
          const isMenuOpen = menuColumnId === col.id;
          const tasks = visibleTasks.filter((t) => t.statusId === col.id);
          const isDragOver = dragOverColumnId === col.id;

          return (
            <div
              key={col.id}
              style={styles.column}
              onDragOver={(e) => handleColumnDragOver(e, col.id)}
              onDragLeave={() => handleColumnDragLeave(col.id)}
              onDrop={(e) => handleColumnDrop(e, col.id)}
            >
              <div style={styles.columnLabelWrap}>
                {isEditing ? (
                  <input
                    autoFocus
                    value={columnNameDraft}
                    onChange={(e) => setColumnNameDraft(e.target.value)}
                    onBlur={commitColumnRename}
                    onKeyDown={(e) => e.key === "Enter" && commitColumnRename()}
                    style={{ ...styles.columnLabelInput, background: colColor.bg, color: colColor.text }}
                  />
                ) : (
                  <span
                    style={{ ...styles.columnLabel, background: colColor.bg, color: colColor.text }}
                    onClick={() => setMenuColumnId(isMenuOpen ? null : col.id)}
                  >
                    {col.name}
                    {col.isDoneColumn && <span title="สถานะเสร็จสิ้น"> ✓</span>}
                  </span>
                )}

                {isMenuOpen && (
                  <div style={styles.menuPopover}>
                    <button type="button" onClick={() => startEditColumn(col)} style={styles.menuItem}>
                      <PencilIcon /> เปลี่ยนชื่อ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteColumn(col.id)}
                      style={{ ...styles.menuItem, color: "#E0473E" }}
                    >
                      <TrashIcon /> ลบสถานะ
                    </button>
                    <div style={styles.menuColorRow}>
                      {SWATCH_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSetColumnColor(col.id, c)}
                          style={{ ...styles.menuColorDot, background: c }}
                          title="เปลี่ยนสีสถานะนี้"
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDoneColumn(col.id, !col.isDoneColumn)}
                      style={styles.menuItem}
                    >
                      {col.isDoneColumn ? "✓ " : "○ "} ทำเครื่องหมายว่าเสร็จสิ้น
                    </button>
                  </div>
                )}
              </div>
              {tasks.map((task) => {
                const cat = task.categoryRef
                  ? { bg: task.categoryRef.color, text: getContrastText(task.categoryRef.color) }
                  : null;
                const urgency = getDueUrgency(task, columns);
                const isDragging = draggedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="task-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    style={{ ...styles.card, ...(isDragging ? styles.cardDragging : {}) }}
                  >
                    <div style={styles.cardTopRow}>
                      {task.assignee && (
                        <span style={styles.assigneeAvatar} title={`@${task.assignee.username}`}>
                          {task.assignee.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
                      <p style={styles.cardTitle}>{task.title}</p>
                      <div className="task-card-actions" style={styles.cardTopBtns}>
                        {task.archivedAt ? (
                          <button
                            type="button"
                            onClick={() => handleUnarchiveTask(task.id)}
                            style={styles.expandBtn}
                            title="กู้คืนงานนี้"
                          >
                            ↩
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpandedTaskId(task.id)}
                              style={styles.expandBtn}
                              title="ดูรายละเอียด"
                            >
                              ⤢
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveTask(task.id)}
                              style={styles.expandBtn}
                              title="เก็บเข้าคลัง"
                            >
                              🗄️
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          style={styles.deleteBtn}
                          title="ลบงาน"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {task.note && <p style={styles.cardNote}>{task.note}</p>}
                    {task.dueDate && (
                      <p style={{ ...styles.cardDate, ...(urgency ? styles.cardDateUrgent : {}) }}>
                        {formatDueDate(task.dueDate)}
                      </p>
                    )}
                    {urgency && (
                      <span
                        style={{
                          ...styles.urgencyBadge,
                          ...(urgency === "overdue" ? styles.urgencyBadgeOverdue : styles.urgencyBadgeSoon),
                        }}
                      >
                        {urgency === "overdue" ? "❗ เกินกำหนดแล้ว" : "⏰ ใกล้ครบกำหนด"}
                      </span>
                    )}
                    {task.priority && PRIORITY_BADGE[task.priority] && (
                      <span
                        style={{
                          ...styles.urgencyBadge,
                          background: PRIORITY_BADGE[task.priority].bg,
                          color: PRIORITY_BADGE[task.priority].text,
                        }}
                      >
                        {task.priority}
                      </span>
                    )}
                    {cat && (
                      <span style={{ ...styles.cardCategoryTag, background: cat.bg, color: cat.text }}>
                        {task.categoryRef.name}
                      </span>
                    )}

                    {task.subtasks.length > 0 && (
                      <ul style={styles.subtaskList}>
                        {task.subtasks.map((s) => (
                          <li key={s.id} style={styles.subtaskItem}>
                            <label style={styles.subtaskLabel}>
                              <input
                                type="checkbox"
                                checked={s.done}
                                onChange={(e) => handleToggleSubtask(s.id, e.target.checked)}
                              />
                              <span style={s.done ? styles.subtaskDone : undefined}>{s.title}</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubtask(s.id)}
                              style={styles.subtaskDeleteBtn}
                              title="ลบ subtask"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div style={styles.subtaskAddRow}>
                      <input
                        type="text"
                        placeholder="+ subtask"
                        value={newSubtaskDrafts[task.id] || ""}
                        onChange={(e) =>
                          setNewSubtaskDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubtask(task.id)}
                        style={styles.subtaskInput}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Drop-indicator line instead of a full column highlight */}
              {isDragOver && <div style={styles.dropIndicator} />}

              {!showArchived && (
                <TaskComposer
                  onSubmit={(draft) => handleAddTask(col.id, draft)}
                  categories={categories}
                  members={members}
                />
              )}
            </div>
          );
        })}
        </div>
      )}

      {expandedTask && (
        <TaskDetailModal
          task={expandedTask}
          columns={columns}
          categories={categories}
          members={members}
          onClose={() => setExpandedTaskId(null)}
          onUpdate={(patch) => handleUpdateTask(expandedTask.id, patch)}
          onDelete={() => handleDeleteTask(expandedTask.id)}
          onRefresh={loadBoard}
        />
      )}
    </div>

    {board && <BoardNotes boardId={board.id} initialBlocks={board.noteContent || []} />}
    </>
  );
}

const styles = {
  loadingText: {
    fontFamily: "'Itim', cursive",
    color: "#8A8071",
    fontSize: 16,
    textAlign: "center",
    padding: "40px 0",
  },
  board: {
    border: "2px solid #221D17",
    padding: "28px 28px 24px",
    boxSizing: "border-box",
    position: "relative",
  },
  boardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  titleRow: {
    position: "relative",
    display: "inline-block",
    marginBottom: 6,
  },
  titleButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    borderRadius: 10,
    padding: "4px 8px 4px 6px",
    margin: "-4px 0 0 -6px",
    cursor: "pointer",
    textAlign: "left",
  },
  chevron: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8A8071",
    transition: "transform 150ms ease",
    flexShrink: 0,
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  workspaceMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 #221D17",
    padding: 4,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    zIndex: 20,
    minWidth: 180,
  },
  workspaceMenuItem: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "#221D17",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    padding: "8px 10px",
    cursor: "pointer",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  workspaceMenuItemActive: {
    background: "#EAF0FF",
    color: "#2C5F8A",
    fontWeight: 700,
  },
  boardTitle: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 24,
    color: "#221D17",
    margin: 0,
  },
  boardSubtitle: {
    fontSize: 14,
    color: "#8A8071",
    margin: 0,
  },
  errorText: {
    color: "#E0473E",
    fontSize: 13,
    fontWeight: 600,
    marginTop: 8,
  },
  clickCatcher: {
    position: "fixed",
    inset: 0,
    zIndex: 5,
  },

  columnLabel: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 999,
    cursor: "pointer",
  },
  columnLabelInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 999,
    border: "2px solid #221D17",
    outline: "none",
  },
  menuPopover: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 #221D17",
    padding: 4,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    zIndex: 20,
    minWidth: 140,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "#221D17",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    padding: "7px 10px",
    cursor: "pointer",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  menuColorRow: {
    display: "flex",
    gap: 6,
    padding: "6px 10px 2px",
  },
  menuColorDot: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid #FFFDF8",
    boxShadow: "0 0 0 1.5px #E7E2D6",
    cursor: "pointer",
    padding: 0,
  },
  addColumnSmallBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "#5C5346",
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
    flexShrink: 0,
  },
  headerActions: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    margin: "16px 0 20px",
  },
  searchInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "#221D17",
    background: "#FFFDF8",
    border: "1.5px solid #E7E2D6",
    borderRadius: 999,
    padding: "7px 14px",
    outline: "none",
    minWidth: 160,
    flex: 1,
  },
  filterSelect: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#5C5346",
    background: "#FFFDF8",
    border: "1.5px solid #E7E2D6",
    borderRadius: 8,
    padding: "6px 8px",
    outline: "none",
    cursor: "pointer",
  },
  filterToggleBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#5C5346",
    background: "#F6F3EC",
    border: "1.5px solid #E7E2D6",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterToggleBtnActive: {
    background: "#3E6BE0",
    color: "#FFFDF8",
    borderColor: "#3E6BE0",
  },
  assigneeAvatar: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#F4B740",
    border: "1.5px solid #221D17",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#221D17",
    flexShrink: 0,
  },
  headerActionWrap: {
    position: "relative",
  },
  urgentBanner: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "#B5453C",
    margin: "6px 0 0",
  },
  categoryMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 #221D17",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    zIndex: 20,
    minWidth: 200,
  },
  categoryMenuEmpty: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#8A8071",
    margin: "0 0 4px",
  },
  categoryMenuRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryMenuTag: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
  },
  categoryMenuDelete: {
    background: "transparent",
    border: "none",
    color: "#8A8071",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    padding: 2,
    flexShrink: 0,
  },
  categoryAddRow: {
    display: "flex",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTop: "1.5px solid #EFEAE0",
  },
  categoryAddInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    border: "1.5px solid #E7E2D6",
    borderRadius: 8,
    padding: "6px 8px",
    flex: 1,
    outline: "none",
    minWidth: 0,
  },
  newColumnInline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 8,
    padding: "6px 8px 6px 12px",
    flexShrink: 0,
  },
  newColumnInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    border: "none",
    outline: "none",
    width: 110,
  },

  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#F4F1E9",
    border: "1px solid #ECE6D8",
    borderRadius: 16,
    padding: "14px 12px",
    boxSizing: "border-box",
  },
  columnLabelWrap: {
    position: "relative",
  },
  card: {
    background: "#FFFDF8",
    border: "1px solid #ECE6D8",
    borderRadius: 14,
    padding: "16px",
    cursor: "grab",
    boxShadow: "0 1px 3px rgba(34,29,23,0.07)",
  },
  cardDragging: {
    opacity: 0.4,
  },
  cardTopRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
  },
  cardTopBtns: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    marginLeft: "auto",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#221D17",
    margin: 0,
    flex: 1,
  },
  expandBtn: {
    background: "transparent",
    border: "none",
    color: "#8A8071",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
    padding: 2,
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "#8A8071",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },
  cardDate: {
    fontSize: 13,
    color: "#8A8071",
    margin: "8px 0 0",
  },
  cardDateUrgent: {
    color: "#B5453C",
    fontWeight: 700,
  },
  urgencyBadge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 9px",
    borderRadius: 999,
    marginTop: 6,
    marginRight: 6,
  },
  urgencyBadgeOverdue: {
    background: "#F6D3D0",
    color: "#B5453C",
  },
  urgencyBadgeSoon: {
    background: "#FCE8C2",
    color: "#8A5A1B",
  },
  cardCategoryTag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    marginTop: 10,
  },
  cardTag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color: "#7A3B34",
    background: "#F6C9C4",
    padding: "2px 9px",
    borderRadius: 999,
    marginBottom: 6,
  },
  cardNote: {
    fontSize: 12.5,
    color: "#8A8071",
    margin: "6px 0 0",
  },
  subtaskList: {
    listStyle: "none",
    margin: "10px 0 0",
    padding: 0,
    fontSize: 12.5,
    color: "#5C5346",
  },
  subtaskItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    padding: "2px 0",
  },
  subtaskLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  subtaskDone: {
    textDecoration: "line-through",
    color: "#A79E8E",
  },
  subtaskDeleteBtn: {
    background: "transparent",
    border: "none",
    color: "#C9C0AE",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  },
  subtaskAddRow: {
    marginTop: 10,
  },
  subtaskInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    border: "1.5px dashed #C9C0AE",
    borderRadius: 8,
    padding: "5px 8px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
  dropIndicator: {
    height: 3,
    borderRadius: 2,
    background: "#3E6BE0",
    margin: "-4px 2px 2px",
  },
  addBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "#3E6BE0",
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },
};
