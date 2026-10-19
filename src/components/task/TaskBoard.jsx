import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import {
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
import { consumeTaskJump } from "../../lib/navJump";
import Mascot, { MascotNote } from "../common/Mascot";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatShortDate(iso) {
  const d = new Date(iso);
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
}

// Compact due-date text for a card's footer chip — "อีก 3 วัน" reads faster
// at a glance than a full date, and only falls back to a date once it's
// more than a week out. Counted in calendar days (not 24h blocks) so
// "พรุ่งนี้" really means tomorrow's date.
function formatDueLabel(iso) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfDue = new Date(iso);
  startOfDue.setHours(0, 0, 0, 0);
  const days = Math.round((startOfDue - startOfToday) / (24 * 60 * 60 * 1000));
  if (days < 0) return `เลยมา ${-days} วัน`;
  if (days === 0) return "วันนี้";
  if (days === 1) return "พรุ่งนี้";
  if (days <= 7) return `อีก ${days} วัน`;
  return formatShortDate(iso);
}

// Pastel column color mixed into the page surface — keeps each column
// tinted in light mode and still readable (not neon) in dark mode, since
// --bg-surface flips with the theme.
function columnTint(hex) {
  return `color-mix(in srgb, ${hex} 38%, var(--bg-surface))`;
}

const SWATCH_COLORS = ["#F6D3D0", "#D7E8FB", "#E3DEF6", "#DCEFD9", "#FCE8C2", "#F6C9C4", "#E7E2D6"];

// Picks readable ink or cream text over a manually-chosen background color.
function getContrastText(hex) {
  if (!hex) return "var(--ink)";
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#353B46" : "#FFFDF8";
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

const VIEW_KEY = "crew_task_view";

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

// Remembers which workspace's board the user last looked at, so leaving
// Task and coming back (or just re-rendering after a route change) lands
// on the same board instead of resetting to the personal one every time.
// Cleared only implicitly — by the user picking a different workspace —
// never automatically.
const ACTIVE_WORKSPACE_KEY = "crew_task_active_workspace";

function getStoredActiveWorkspaceId() {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY) || null;
  } catch {
    return null;
  }
}

function storeActiveWorkspaceId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch {
    // best-effort — worst case the board just falls back to the default next time
  }
}

const svgProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const VIEWS = [
  {
    id: "board",
    label: "Board",
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M9 4v16M15 4v10" />
      </svg>
    ),
  },
  {
    id: "list",
    label: "List",
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M3 10h18M3 15h18M10 4v16" />
      </svg>
    ),
  },
  {
    id: "summary",
    label: "Summary",
    icon: (
      <svg {...svgProps}>
        <path d="M3 17l6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </svg>
    ),
  },
];

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
  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  // The last board fetched per workspace, kept only for this component's
  // lifetime — lets switching back to a group already seen this session
  // show its board instantly instead of a blank "กำลังสลับกลุ่ม..." spinner
  // while the fresh copy loads quietly behind it.
  const boardCacheRef = useRef({});
  const [board, setBoard] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  // "board" (Kanban) | "list" (table) | "summary" (charts) — remembered per browser
  const [view, setView] = useState(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return v === "list" || v === "summary" ? v : "board";
    } catch {
      return "board";
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSubtaskDrafts, setNewSubtaskDrafts] = useState({});
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  // Which cards currently have their subtask checklist unfolded — collapsed
  // by default so the board reads as a clean overview (a progress bar shows
  // how far along each task is without taking the space of every checkbox).
  const [openSubtaskIds, setOpenSubtaskIds] = useState(() => new Set());
  // Per-column counters bumped by a column's "+" (or the header's "เพิ่มงานใหม่")
  // to ask that column's TaskComposer to open — see TaskComposer's openRequest.
  const [composerRequests, setComposerRequests] = useState({});

  // Horizontal scroll of the column strip: which sides still have more to
  // reveal, so the fade + arrow on that side can show up (and go away at the
  // ends). Kept in sync on scroll, on resize and whenever the board changes.
  const scrollRef = useRef(null);
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false });

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

  // Head = the workspace owner. Once a task has an assignee, only that
  // assignee or the Head may edit/delete it or its subtasks — everyone
  // else can still view it and comment. An unassigned task has no such
  // restriction. Mirrors canEditTask() in the backend's lib/permissions.js
  // — this copy is only for the UI (hiding controls that would 403 anyway);
  // the server is what actually enforces it.
  function canEditTask(task) {
    if (!task.assigneeId) return true;
    if (isHead) return true;
    return task.assigneeId === myUserId;
  }

  // Loads the board for whichever workspace is active. On the very first
  // call (no workspace picked yet) it defaults to the personal one — the
  // workspace list itself now comes from WorkspacesContext (shared/cached
  // across pages) instead of being fetched here every time.
  async function loadBoard(workspaceIdOverride) {
    try {
      let targetId = workspaceIdOverride || activeWorkspaceId;

      if (!targetId) {
        const personal = workspaces.find((w) => w.isPersonal) || workspaces[0];
        if (!personal) {
          setError("ไม่พบพื้นที่ทำงาน");
          setLoading(false);
          return;
        }
        targetId = personal.id;
        setActiveWorkspaceId(targetId);
        storeActiveWorkspaceId(targetId);
      }

      const { board } = await getWorkspaceBoard(targetId);
      boardCacheRef.current[targetId] = board;
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
    setActiveWorkspaceId(workspaceId);
    storeActiveWorkspaceId(workspaceId);

    const cached = boardCacheRef.current[workspaceId];
    if (cached) {
      // Already have this group's board from earlier this session — show
      // it right away instead of a spinner, then quietly refetch below to
      // pick up anything that changed while we were away.
      setBoard(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    loadBoard(workspaceId);
  }

  useEffect(() => {
    if (workspacesLoading) return; // wait for the shared workspace list to resolve

    // Deep-link from elsewhere (notification bell, Home dashboard, Calendar
    // task chip) — jump straight to the right workspace's board and pop
    // the task open, instead of landing on whatever board loads by default.
    // This also counts as the user "picking" that workspace, so it's the
    // one remembered next time too.
    const jump = consumeTaskJump();
    if (jump?.workspaceId) {
      setActiveWorkspaceId(jump.workspaceId);
      storeActiveWorkspaceId(jump.workspaceId);
      loadBoard(jump.workspaceId).then(() => {
        if (jump.taskId) setExpandedTaskId(jump.taskId);
      });
      return;
    }

    // No explicit deep-link — fall back to whichever workspace was last
    // selected (as long as it's still one the user belongs to), instead of
    // always resetting to the personal board.
    const stored = getStoredActiveWorkspaceId();
    const storedStillValid = stored && workspaces.some((w) => w.id === stored);
    if (storedStillValid) {
      setActiveWorkspaceId(stored);
      loadBoard(stored);
    } else {
      loadBoard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacesLoading]);

  async function handleAddTask(statusId, draft) {
    if (!board) return;
    try {
      await createTask(board.id, { ...draft, statusId });
      loadBoard();
    } catch (err) {
      setError(err.message);
    }
  }

  // Patches one task's plain fields in the local board immediately, before
  // the request even lands — dragging a card between columns or flipping a
  // priority/due-date shouldn't sit waiting on a round trip to show up.
  // Only safe for fields the card renders directly from (statusId,
  // priority, dueDate, note, title, archivedAt); a change to assigneeId or
  // categoryId still needs the full related object (avatar, category tag
  // color) that only a real refetch has, so those skip this and reload
  // instead — see handleUpdateTask below.
  function patchTaskLocally(taskId, patch) {
    setBoard((prev) =>
      prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) } : prev
    );
  }

  async function handleUpdateTask(taskId, patch) {
    const isRelational = Object.keys(patch).some((k) => k === "assigneeId" || k === "categoryId");
    if (!isRelational) patchTaskLocally(taskId, patch);

    try {
      await updateTask(taskId, patch);
      if (isRelational) loadBoard();
    } catch (err) {
      setError(err.message);
      loadBoard(); // resync — the optimistic patch above may now be wrong
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
    const archivedAt = new Date().toISOString();
    patchTaskLocally(taskId, { archivedAt });
    try {
      await updateTask(taskId, { archivedAt });
    } catch (err) {
      setError(err.message);
      loadBoard();
    }
  }

  async function handleUnarchiveTask(taskId) {
    patchTaskLocally(taskId, { archivedAt: null });
    try {
      await updateTask(taskId, { archivedAt: null });
    } catch (err) {
      setError(err.message);
      loadBoard();
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
    // Ticking a checkbox is the single most frequent click on this whole
    // board — it should react instantly, not after a full board refetch.
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.map((t) => ({
              ...t,
              subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done } : s)),
            })),
          }
        : prev
    );
    try {
      await updateSubtask(subtaskId, { done });
    } catch (err) {
      setError(err.message);
      loadBoard();
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
    if (!canEditTask(task)) return; // server would 403 this anyway — see canEditTask's comment

    handleUpdateTask(taskId, { statusId: columnId });
  }

  // While a card is being dragged, scroll the board sideways when the
  // pointer nears its left/right edge, so a column that is off-screen can be
  // reached without dropping the card first.
  useEffect(() => {
    if (!draggedTaskId) return undefined;
    const EDGE = 110; // px from the edge where scrolling kicks in
    const MAX_SPEED = 22; // px per frame at the very edge
    let pointerX = null;
    let raf = 0;

    function onDragOver(e) {
      pointerX = e.clientX;
    }
    function tick() {
      const el = scrollRef.current;
      if (el && pointerX !== null) {
        const rect = el.getBoundingClientRect();
        let dx = 0;
        if (pointerX < rect.left + EDGE) dx = -Math.min(1, (rect.left + EDGE - pointerX) / EDGE);
        else if (pointerX > rect.right - EDGE) dx = Math.min(1, (pointerX - (rect.right - EDGE)) / EDGE);
        if (dx !== 0) el.scrollLeft += dx * MAX_SPEED;
      }
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener("dragover", onDragOver);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      cancelAnimationFrame(raf);
    };
  }, [draggedTaskId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    function update() {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setScrollEdges((prev) => {
        const next = { left: el.scrollLeft > 4, right: el.scrollLeft < maxScroll - 4 };
        return prev.left === next.left && prev.right === next.right ? prev : next;
      });
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [loading, board]);

  function scrollColumns(direction) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  }

  function toggleSubtasksOpen(taskId) {
    setOpenSubtaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function changeView(next) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* private mode etc. — the view just won't be remembered */
    }
  }

  function requestComposer(columnId) {
    if (!columnId) return;
    setShowArchived(false); // the composer isn't offered while viewing the archive
    setComposerRequests((prev) => ({ ...prev, [columnId]: (prev[columnId] || 0) + 1 }));
  }

  if (loading && !board) {
    return (
      <div className="task-board" style={styles.board}>
        <MascotNote name="glasses" anim="bounce" width={64} text="กำลังโหลดบอร์ด..." />
      </div>
    );
  }

  const columns = board?.columns || [];
  const categories = board?.categories || [];
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const isHead = !!(activeWorkspace && myUserId && activeWorkspace.ownerId === myUserId);
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
  const boardBadgeText = activeWorkspace && !activeWorkspace.isPersonal ? displayTitle.trim().charAt(0).toUpperCase() : "📋";

  function renderListView() {
    const rows = [...visibleTasks].sort((a, b) => {
      const ca = columns.findIndex((c) => c.id === a.statusId);
      const cb = columns.findIndex((c) => c.id === b.statusId);
      if (ca !== cb) return ca - cb;
      return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
    });
    if (rows.length === 0) return <p style={styles.loadingText}>ไม่มีงานที่ตรงกับตัวกรอง</p>;
    return (
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {["ชื่องาน", "สถานะ", "หมวดหมู่", "ผู้รับผิดชอบ", "กำหนดส่ง", "ความสำคัญ", "Subtask"].map((h) => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const col = columns.find((c) => c.id === t.statusId);
              const colColor = col ? (col.color ? { bg: col.color, text: getContrastText(col.color) } : categoryColor(col.name)) : null;
              const cat = categories.find((c) => c.id === t.categoryId);
              const urgency = getDueUrgency(t, columns);
              const total = t.subtasks.length;
              const done = t.subtasks.filter((x) => x.done).length;
              return (
                <tr key={t.id} className="task-row" style={styles.tr} onClick={() => setExpandedTaskId(t.id)}>
                  <td style={{ ...styles.td, fontWeight: 700, ...(col?.isDoneColumn ? { textDecoration: "line-through", color: "var(--ink-soft)" } : {}) }}>{t.title}</td>
                  <td style={styles.td}>
                    {col && <span style={{ ...styles.columnLabel, background: colColor.bg, color: colColor.text, cursor: "inherit" }}>{col.name}</span>}
                  </td>
                  <td style={styles.td}>
                    {cat ? (
                      <span style={{ ...styles.categoryMenuTag, background: cat.color, color: getContrastText(cat.color) }}>{cat.name}</span>
                    ) : "—"}
                  </td>
                  <td style={styles.td}>
                    {t.assignee ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={styles.assigneeAvatar}>{t.assignee.name?.charAt(0).toUpperCase() || "?"}</span>
                        @{t.assignee.username}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ ...styles.td, color: urgency === "overdue" ? "#E0473E" : "inherit", fontWeight: urgency ? 700 : 400 }}>
                    {t.dueDate ? formatDueLabel(t.dueDate) : "—"}
                  </td>
                  <td style={styles.td}>
                    {t.priority && PRIORITY_BADGE[t.priority] ? (
                      <span style={{ ...styles.categoryMenuTag, background: PRIORITY_BADGE[t.priority].bg, color: PRIORITY_BADGE[t.priority].text }}>⚑ {t.priority}</span>
                    ) : "—"}
                  </td>
                  <td style={styles.td}>{total ? `${done}/${total}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSummaryView() {
    const active = allTasks.filter((t) => !t.archivedAt);
    const doneIds = new Set(columns.filter((c) => c.isDoneColumn).map((c) => c.id));
    const doneCount = active.filter((t) => doneIds.has(t.statusId)).length;
    const pct = active.length ? Math.round((doneCount / active.length) * 100) : 0;
    const mineCount = active.filter((t) => t.assigneeId === myUserId && !doneIds.has(t.statusId)).length;
    const maxCol = Math.max(1, ...columns.map((c) => active.filter((t) => t.statusId === c.id).length));
    const prios = ["สูง", "ปานกลาง", "ต่ำ"].map((p) => ({ p, n: active.filter((t) => t.priority === p).length }));
    const maxPrio = Math.max(1, ...prios.map((x) => x.n));
    const tiles = [
      { label: "งานทั้งหมด", value: active.length },
      { label: "เสร็จแล้ว", value: `${pct}%`, sub: `${doneCount}/${active.length}` },
      { label: "ใกล้/เกินกำหนด", value: urgentCount },
      { label: "งานของฉันที่ค้างอยู่", value: mineCount },
    ];
    return (
      <div style={styles.summaryWrap}>
        <div style={styles.tileRow}>
          {tiles.map((t) => (
            <div key={t.label} style={styles.tile}>
              <span style={styles.tileValue}>{t.value}</span>
              <span style={styles.tileLabel}>{t.label}{t.sub ? ` · ${t.sub}` : ""}</span>
            </div>
          ))}
        </div>
        <div style={styles.chartRow}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>งานในแต่ละสถานะ</h3>
            {columns.map((c) => {
              const n = active.filter((t) => t.statusId === c.id).length;
              const color = c.color || categoryColor(c.name).bg;
              return (
                <div key={c.id} style={styles.barRow}>
                  <span style={styles.barLabel}>{c.name}</span>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: `${(n / maxCol) * 100}%`, background: color }} />
                  </div>
                  <span style={styles.barCount}>{n}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>ตามความสำคัญ</h3>
            {prios.map(({ p, n }) => (
              <div key={p} style={styles.barRow}>
                <span style={styles.barLabel}>⚑ {p}</span>
                <div style={styles.barTrack}>
                  <div style={{ ...styles.barFill, width: `${(n / maxPrio) * 100}%`, background: PRIORITY_BADGE[p].text }} />
                </div>
                <span style={styles.barCount}>{n}</span>
              </div>
            ))}
            <h3 style={{ ...styles.chartTitle, marginTop: 20 }}>ความคืบหน้ารวม</h3>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${pct}%`, background: "var(--accent-color)" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="task-board" style={styles.board}>
      <style>{`
        .task-card {
          box-shadow: 3px 3px 0 0 var(--ink);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        .task-card:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 0 var(--ink);
        }
        .task-card-actions { opacity: 0; transition: opacity 120ms ease; }
        .task-card:hover .task-card-actions,
        .task-card:focus-within .task-card-actions { opacity: 1; }

        .task-row:hover { background: color-mix(in srgb, var(--accent-color) 8%, transparent); }
        .task-title-btn { transition: background-color 120ms ease; }
        .task-title-btn:hover:not(:disabled) { background-color: color-mix(in srgb, var(--ink) 8%, transparent); }
        .task-title-btn:disabled { cursor: default; }

        /* Side-scroll bar drawn like a pencil ruler: an inked track with tick
           marks and a chunky accent-colored thumb. (WebKit/Blink only — the
           standard scrollbar-color/-width properties are applied just for
           browsers without ::-webkit-scrollbar, since Chrome would otherwise
           ignore the custom pieces below as soon as those are set.) */
        .task-columns-grid::-webkit-scrollbar { height: 18px; }
        .task-columns-grid::-webkit-scrollbar-track {
          margin: 0 10px;
          border: 2px solid var(--ink);
          border-radius: 999px;
          background:
            repeating-linear-gradient(90deg, color-mix(in srgb, var(--ink) 40%, transparent) 0 2px, transparent 2px 12px) bottom / 100% 5px no-repeat,
            var(--bg-surface);
        }
        .task-columns-grid::-webkit-scrollbar-thumb {
          background: var(--accent-color);
          border: 2px solid var(--ink);
          border-radius: 999px;
        }
        .task-columns-grid::-webkit-scrollbar-thumb:hover { filter: brightness(1.12); }
        @supports not selector(::-webkit-scrollbar) {
          .task-columns-grid { scrollbar-width: auto; scrollbar-color: var(--accent-color) var(--bg-surface); }
        }

        .task-scroll-arrow:hover { transform: translate(-1px, -1px); }

        .task-col-add { transition: transform 100ms ease, background-color 100ms ease; }
        .task-col-add:hover { transform: scale(1.1); background-color: var(--accent-color) !important; color: #FFFDF8 !important; }

        @media (max-width: 640px) {
          .task-board-header { flex-direction: column; align-items: flex-start !important; }
          .task-board-actions { width: 100%; }
          /* Phone: stack the columns vertically instead of scrolling sideways. */
          .task-columns-grid { flex-direction: column !important; overflow-x: visible !important; }
          .task-columns-grid > div { flex: none !important; max-width: none !important; min-width: 0 !important; }
          .task-scroll-fade, .task-scroll-arrow { display: none !important; }
          /* No hover on touch devices — card actions are always visible, in flow above the title. */
          .task-card .task-card-actions {
            opacity: 1; position: static !important; align-self: flex-end;
            background: none !important; border: none !important; padding: 0 !important; margin-bottom: 4px;
          }
        }
      `}</style>

      <div className="task-board-header" style={styles.boardHeader}>
        <div style={styles.headerLeft}>
          <span style={styles.boardBadge}>{boardBadgeText}</span>
          <div style={styles.headerText}>
            <div style={styles.titleRow}>
              <h2 style={styles.boardTitle}>Task Board</h2>
              <button
                type="button"
                onClick={() => setWorkspaceMenuOpen((v) => !v)}
                className="task-team-pill"
                style={styles.teamPill}
                disabled={workspaces.length <= 1}
                title={workspaces.length > 1 ? "เปลี่ยนกลุ่ม" : undefined}
              >
                {displayTitle}
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
        </div>

        {/* Secondary controls + the primary "new task" button sit top-right */}
        <div className="task-board-actions" style={styles.headerActions}>
          <div style={styles.headerActionWrap}>
            <button
              type="button"
              onClick={() => setCategoryMenuOpen((v) => !v)}
              style={styles.secondaryBtn}
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

          <div style={styles.viewSwitch} role="tablist" aria-label="มุมมอง">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                title={v.label}
                onClick={() => changeView(v.id)}
                style={{ ...styles.viewBtn, ...(view === v.id ? styles.viewBtnActive : {}) }}
              >
                {v.icon}
                {view === v.id && <span>{v.label}</span>}
              </button>
            ))}
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
            <button
              type="button"
              className="doodle-btn"
              style={styles.primaryBtn}
              onClick={() => setAddingColumn(true)}
            >
              ⊕ เพิ่มสถานะ
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

      {/* Each status is one tinted, self-contained "page": header (label + count + add) / its cards / add-task */}
      {loading ? (
        <p style={styles.loadingText}>กำลังสลับกลุ่ม...</p>
      ) : view === "list" ? (
        renderListView()
      ) : view === "summary" ? (
        renderSummaryView()
      ) : (
        <div style={styles.scrollWrap}>
        {/* Soft page-colored fades + arrows on whichever side has more columns to reveal */}
        <div
          className="task-scroll-fade"
          style={{ ...styles.scrollFade, ...styles.scrollFadeLeft, opacity: scrollEdges.left ? 1 : 0 }}
        />
        <div
          className="task-scroll-fade"
          style={{ ...styles.scrollFade, ...styles.scrollFadeRight, opacity: scrollEdges.right ? 1 : 0 }}
        />
        {scrollEdges.left && (
          <button
            type="button"
            className="doodle-btn task-scroll-arrow"
            style={{ ...styles.scrollArrow, left: -14 }}
            onClick={() => scrollColumns(-1)}
            aria-label="เลื่อนไปทางซ้าย"
          >
            ‹
          </button>
        )}
        {scrollEdges.right && (
          <button
            type="button"
            className="doodle-btn task-scroll-arrow"
            style={{ ...styles.scrollArrow, right: -14 }}
            onClick={() => scrollColumns(1)}
            aria-label="เลื่อนไปทางขวา"
          >
            ›
          </button>
        )}
        <div ref={scrollRef} className="task-columns-grid" style={styles.columns}>
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
              style={{
                ...styles.column,
                background: columnTint(colColor.bg),
                ...(isDragOver ? styles.columnDragOver : {}),
              }}
              onDragOver={(e) => handleColumnDragOver(e, col.id)}
              onDragLeave={() => handleColumnDragLeave(col.id)}
              onDrop={(e) => handleColumnDrop(e, col.id)}
            >
              <div style={styles.columnHeader}>
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

                <span style={styles.countBadge}>{tasks.length}</span>

                {!showArchived && (
                  <button
                    type="button"
                    className="task-col-add"
                    style={styles.columnAddBtn}
                    onClick={() => requestComposer(col.id)}
                    title="เพิ่มงานในสถานะนี้"
                    aria-label={`เพิ่มงานในสถานะ ${col.name}`}
                  >
                    +
                  </button>
                )}
              </div>

              {tasks.length === 0 && !isDragOver && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 0" }}>
                  <Mascot name="puppy" width={46} anim="float" />
                  <p style={{ ...styles.emptyColumn, margin: 0 }}>ยังไม่มีงานที่นี่</p>
                </div>
              )}

              {tasks.map((task) => {
                const cat = task.categoryRef
                  ? { bg: task.categoryRef.color, text: getContrastText(task.categoryRef.color) }
                  : null;
                const urgency = getDueUrgency(task, columns);
                const isDragging = draggedTaskId === task.id;
                const editable = canEditTask(task);
                const isDone = !!col.isDoneColumn;
                const subtaskTotal = task.subtasks.length;
                const subtaskDone = task.subtasks.filter((s) => s.done).length;
                const subtaskPct = subtaskTotal ? Math.round((subtaskDone / subtaskTotal) * 100) : 0;
                const subtasksOpen = openSubtaskIds.has(task.id);
                const accent = urgency === "overdue" ? "#E0473E" : urgency === "soon" ? "#F4B740" : null;
                return (
                  <div
                    key={task.id}
                    className="task-card"
                    draggable={editable}
                    onDragStart={(e) => editable && handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      ...styles.card,
                      ...(isDone ? styles.cardDone : {}),
                      ...(isDragging ? styles.cardDragging : {}),
                      ...(editable ? {} : { cursor: "default" }),
                    }}
                  >
                    {accent && <span style={{ ...styles.cardAccent, background: accent }} />}

                    {cat && (
                      <div style={styles.cardTopRow}>
                        <span style={{ ...styles.cardCategoryTag, background: cat.bg, color: cat.text }}>
                          <span style={{ ...styles.categoryDot, background: cat.text }} />
                          {task.categoryRef.name}
                        </span>
                      </div>
                    )}
                    {/* Floats over the card's top-right corner (not a row of its own), so a
                        card without a category doesn't reserve an empty strip above its title. */}
                    <div className="task-card-actions" style={styles.cardTopBtns}>
                        {task.archivedAt ? (
                          editable && (
                            <button
                              type="button"
                              onClick={() => handleUnarchiveTask(task.id)}
                              style={styles.expandBtn}
                              title="กู้คืนงานนี้"
                            >
                              ↩
                            </button>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpandedTaskId(task.id)}
                              style={styles.expandBtn}
                              title={editable ? "ดูรายละเอียด" : "ดูรายละเอียด / คอมเมนต์"}
                            >
                              ⤢
                            </button>
                            {editable && (
                              <button
                                type="button"
                                onClick={() => handleArchiveTask(task.id)}
                                style={styles.expandBtn}
                                title="เก็บเข้าคลัง"
                              >
                                🗄️
                              </button>
                            )}
                          </>
                        )}
                        {editable && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            style={styles.deleteBtn}
                            title="ลบงาน"
                          >
                            ×
                          </button>
                        )}
                    </div>

                    <p style={{ ...styles.cardTitle, ...(isDone ? styles.cardTitleDone : {}) }}>{task.title}</p>
                    {task.note && <p style={styles.cardNote}>{task.note}</p>}
                    {!editable && (
                      <p style={styles.lockedNote}>🔒 แก้ไขได้เฉพาะผู้รับผิดชอบกับ Head กลุ่ม</p>
                    )}

                    {subtaskTotal > 0 && (
                      <div
                        style={styles.progressTrack}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={subtaskTotal}
                        aria-valuenow={subtaskDone}
                        aria-label="ความคืบหน้า subtask"
                      >
                        <div style={{ ...styles.progressFill, width: `${subtaskPct}%` }} />
                      </div>
                    )}

                    {subtasksOpen && (
                      <>
                        {subtaskTotal > 0 && (
                          <ul style={styles.subtaskList}>
                            {task.subtasks.map((s) => (
                              <li key={s.id} style={styles.subtaskItem}>
                                <label style={styles.subtaskLabel}>
                                  <input
                                    type="checkbox"
                                    checked={s.done}
                                    disabled={!editable}
                                    onChange={(e) => handleToggleSubtask(s.id, e.target.checked)}
                                  />
                                  <span style={s.done ? styles.subtaskDone : undefined}>{s.title}</span>
                                </label>
                                {editable && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubtask(s.id)}
                                    style={styles.subtaskDeleteBtn}
                                    title="ลบ subtask"
                                  >
                                    ×
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {editable && (
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
                        )}
                      </>
                    )}

                    <div style={styles.cardFooter}>
                      <div style={styles.cardMeta}>
                        {task.dueDate && (
                          <span
                            title={formatDueDate(task.dueDate)}
                            style={{
                              ...styles.metaChip,
                              ...(urgency === "overdue"
                                ? styles.metaChipOverdue
                                : urgency === "soon"
                                ? styles.metaChipSoon
                                : {}),
                            }}
                          >
                            {urgency === "overdue" ? "❗" : urgency === "soon" ? "⏰" : "📅"}{" "}
                            {isDone ? formatShortDate(task.dueDate) : formatDueLabel(task.dueDate)}
                          </span>
                        )}
                        {task.priority && PRIORITY_BADGE[task.priority] && (
                          <span
                            style={{
                              ...styles.metaChip,
                              background: PRIORITY_BADGE[task.priority].bg,
                              color: PRIORITY_BADGE[task.priority].text,
                              borderColor: PRIORITY_BADGE[task.priority].text,
                            }}
                          >
                            ⚑ {task.priority}
                          </span>
                        )}
                        {(subtaskTotal > 0 || (editable && !task.archivedAt)) && (
                          <button
                            type="button"
                            onClick={() => toggleSubtasksOpen(task.id)}
                            style={styles.subtaskToggle}
                            aria-expanded={subtasksOpen}
                            title={subtasksOpen ? "ซ่อน subtask" : "ดู / เพิ่ม subtask"}
                          >
                            {subtaskTotal > 0 ? `☑ ${subtaskDone}/${subtaskTotal}` : "+ subtask"}
                          </button>
                        )}
                      </div>
                      {task.assignee && (
                        <span style={styles.assigneeAvatar} title={`@${task.assignee.username}`}>
                          {task.assignee.name?.charAt(0).toUpperCase() || "?"}
                        </span>
                      )}
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
                  openRequest={composerRequests[col.id] || 0}
                />
              )}
            </div>
          );
        })}
        </div>
        </div>
      )}

      {expandedTask && (
        <TaskDetailModal
          task={expandedTask}
          columns={columns}
          categories={categories}
          members={members}
          canEdit={canEditTask(expandedTask)}
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

// Same hand-drawn "wobble" the TaskComposer's card uses — slightly uneven
// corner radii so the columns look sketched on paper, not stamped by CSS.
const WOBBLE_RADIUS = "26px 20px 24px 20px / 20px 26px 20px 24px";

// Everything neutral is derived from --ink / --bg-surface with color-mix so it
// flips correctly with the light/dark theme instead of hard-coded cream tones.
const SOFT_INK = "color-mix(in srgb, var(--ink) 9%, transparent)";
const LINE_INK = "color-mix(in srgb, var(--ink) 30%, transparent)";

const styles = {
  loadingText: {
    fontFamily: "'Itim', cursive",
    color: "var(--ink-faint)",
    fontSize: 16,
    textAlign: "center",
    padding: "40px 0",
  },
  board: {
    position: "relative",
    boxSizing: "border-box",
    marginBottom: 32,
  },

  /* --- header --- */
  boardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    paddingBottom: 18,
    marginBottom: 18,
    borderBottom: "2px dashed var(--ink-faint)", // the "ruled notebook line" under the title
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    minWidth: 0,
  },
  boardBadge: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "var(--accent-color)",
    border: "2px solid var(--ink)",
    boxShadow: "3px 3px 0 0 var(--ink)",
    color: "#FFFDF8",
    fontSize: 22,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: {
    minWidth: 0,
  },
  titleRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  titleButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    borderRadius: 10,
    padding: "2px 8px 2px 6px",
    margin: "-2px 0 0 -6px",
    cursor: "pointer",
    textAlign: "left",
  },
  chevron: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--ink-faint)",
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
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 var(--ink)",
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
    color: "var(--ink)",
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
    fontSize: 26,
    color: "var(--ink)",
    margin: 0,
  },
  boardSubtitle: {
    fontSize: 14,
    color: "var(--ink-faint)",
    margin: 0,
  },
  errorText: {
    color: "#E0473E",
    fontSize: 13,
    fontWeight: 600,
    marginTop: 8,
  },
  urgentBanner: {
    display: "inline-block",
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#B5453C",
    background: "#F6D3D0",
    border: "1.5px solid #B5453C",
    borderRadius: 999,
    padding: "2px 12px",
    margin: "8px 0 0",
  },
  clickCatcher: {
    position: "fixed",
    inset: 0,
    zIndex: 5,
  },

  /* --- header buttons --- */
  headerActions: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },
  headerActionWrap: {
    position: "relative",
  },
  primaryBtn: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    padding: "10px 22px",
    whiteSpace: "nowrap",
  },
  teamPill: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--ink)",
    background: "color-mix(in srgb, var(--accent-color) 18%, var(--bg-surface))",
    border: "1.5px solid var(--ink)",
    borderRadius: 999,
    padding: "3px 10px 3px 12px",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
    maxWidth: 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  viewSwitch: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: 3,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    boxShadow: "3px 3px 0 0 var(--ink)",
  },
  viewBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--ink-soft)",
    background: "transparent",
    border: "none",
    borderRadius: 999,
    padding: "7px 11px",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  },
  viewBtnActive: {
    background: "color-mix(in srgb, var(--accent-color) 18%, var(--bg-page))",
    color: "var(--accent-color)",
    padding: "7px 14px",
  },
  tableWrap: {
    overflowX: "auto",
    border: "2px solid var(--ink)",
    borderRadius: 14,
    background: "var(--bg-surface)",
    boxShadow: "4px 4px 0 0 var(--ink)",
  },
  table: { width: "100%", borderCollapse: "collapse", fontFamily: "'Itim', cursive", fontSize: 14, color: "var(--ink)" },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    borderBottom: "2px solid var(--ink)",
    background: "color-mix(in srgb, var(--ink) 5%, var(--bg-surface))",
    whiteSpace: "nowrap",
  },
  tr: { cursor: "pointer", borderBottom: `1.5px dashed ${LINE_INK}` },
  td: { padding: "11px 14px", verticalAlign: "middle" },
  summaryWrap: { display: "flex", flexDirection: "column", gap: 20 },
  tileRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  tile: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "16px 18px",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: WOBBLE_RADIUS,
    boxShadow: "3px 3px 0 0 var(--ink)",
  },
  tileValue: { fontSize: 34, fontWeight: 700, color: "var(--ink)", lineHeight: 1.1 },
  tileLabel: { fontSize: 13, color: "var(--ink-soft)" },
  chartRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  chartCard: {
    padding: "18px 20px 22px",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: WOBBLE_RADIUS,
    boxShadow: "3px 3px 0 0 var(--ink)",
  },
  chartTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--ink)" },
  barRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  barLabel: { width: 96, fontSize: 13.5, color: "var(--ink)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barTrack: { flex: 1, height: 16, borderRadius: 999, border: "2px solid var(--ink)", background: SOFT_INK, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, minWidth: 0, transition: "width 300ms ease" },
  barCount: { width: 24, textAlign: "right", fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  secondaryBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    padding: "8px 16px",
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  categoryMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 var(--ink)",
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
    color: "var(--ink-faint)",
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
    color: "var(--ink-faint)",
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
    borderTop: `1.5px solid ${LINE_INK}`,
  },
  categoryAddInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    background: "var(--bg-surface)",
    border: `1.5px solid ${LINE_INK}`,
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
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    padding: "4px 6px 4px 14px",
    flexShrink: 0,
  },
  newColumnInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    background: "transparent",
    border: "none",
    outline: "none",
    width: 110,
  },
  addBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    border: "none",
    borderRadius: 999,
    padding: "6px 12px",
    cursor: "pointer",
  },

  /* --- search + filters --- */
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    margin: "0 0 22px",
  },
  searchInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    padding: "8px 16px",
    outline: "none",
    minWidth: 180,
    flex: 1,
  },
  filterSelect: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    background: "var(--bg-surface)",
    border: `1.5px solid ${LINE_INK}`,
    borderRadius: 999,
    padding: "7px 10px",
    outline: "none",
    cursor: "pointer",
  },
  filterToggleBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    background: "var(--bg-surface)",
    borderWidth: 1.5, borderStyle: "solid", borderColor: `${LINE_INK}`,
    borderRadius: 999,
    padding: "7px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterToggleBtnActive: {
    background: "var(--accent-color)",
    color: "#FFFDF8",
    borderColor: "var(--ink)",
  },

  /* --- columns --- */
  // A horizontal Kanban strip: columns keep a comfortable card width and all
  // stretch to the tallest one's height, and a board with many statuses
  // scrolls sideways instead of wrapping a lone column onto a second row.
  // (The small padding leaves room for the cards' hard shadow, which an
  // overflow container would otherwise clip.)
  scrollWrap: {
    position: "relative",
  },
  scrollFade: {
    position: "absolute",
    top: 0,
    bottom: 26, // stop above the scrollbar
    width: 56,
    zIndex: 2,
    pointerEvents: "none",
    transition: "opacity 160ms ease",
  },
  scrollFadeLeft: {
    left: 0,
    background: "linear-gradient(90deg, var(--bg-page), transparent)",
  },
  scrollFadeRight: {
    right: 0,
    background: "linear-gradient(270deg, var(--bg-page), transparent)",
  },
  scrollArrow: {
    position: "absolute",
    top: 150,
    zIndex: 3,
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "var(--bg-surface)",
    color: "var(--ink)",
    fontSize: 26,
    lineHeight: 1,
    padding: "0 0 4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  columns: {
    display: "flex",
    alignItems: "stretch",
    gap: 20,
    overflowX: "auto",
    padding: "2px 6px 16px 2px",
  },
  // Columns share the full width evenly (capped, so a board with only a
  // couple of statuses doesn't turn into two enormous slabs) and are tall
  // enough that the board fills the screen even before it has many tasks.
  column: {
    flex: "1 0 300px",
    minWidth: 300,
    maxWidth: 520,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    border: "2px solid var(--ink)",
    borderRadius: WOBBLE_RADIUS,
    padding: "16px 14px 18px",
    boxSizing: "border-box",
    minHeight: "max(340px, calc(100vh - 400px))",
    transition: "box-shadow 120ms ease",
  },
  columnDragOver: {
    boxShadow: "0 0 0 3px var(--accent-color)",
  },
  columnHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 2px",
  },
  columnLabelWrap: {
    position: "relative",
    minWidth: 0,
  },
  columnLabel: {
    display: "inline-block",
    fontSize: 12.5,
    fontWeight: 700,
    padding: "4px 14px",
    borderRadius: 999,
    border: "2px solid var(--ink)",
    cursor: "pointer",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  columnLabelInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    padding: "4px 14px",
    borderRadius: 999,
    border: "2px solid var(--ink)",
    outline: "none",
    width: 140,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    padding: "0 7px",
    borderRadius: 999,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    color: "var(--ink)",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  columnAddBtn: {
    marginLeft: "auto",
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--bg-surface)",
    color: "var(--ink)",
    border: "2px solid var(--ink)",
    fontFamily: "'Itim', cursive",
    fontSize: 17,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emptyColumn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-faint)",
    textAlign: "center",
    margin: 0,
    padding: "10px 0",
    border: `2px dashed ${LINE_INK}`,
    borderRadius: 14,
  },
  menuPopover: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 var(--ink)",
    padding: 4,
    display: "flex",
    flexDirection: "column",
    gap: 2,
    zIndex: 20,
    minWidth: 160,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
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
    border: "2px solid var(--ink)",
    cursor: "pointer",
    padding: 0,
  },

  /* --- task cards --- */
  card: {
    position: "relative",
    overflow: "hidden",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 16,
    padding: "12px 14px 12px 18px", // extra left room for the urgency accent bar
    cursor: "grab",
    boxSizing: "border-box",
  },
  cardDone: {
    opacity: 0.78,
  },
  cardDragging: {
    opacity: 0.4,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  cardTopRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 6,
    paddingRight: 70, // keep the category tag clear of the floating actions
  },
  cardTopBtns: {
    position: "absolute",
    top: 7,
    right: 8,
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 7px",
    borderRadius: 999,
    background: "var(--bg-surface)",
    border: `1.5px solid ${LINE_INK}`,
    zIndex: 1,
  },
  cardCategoryTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 10px 2px 8px",
    borderRadius: 999,
    maxWidth: "70%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    color: "var(--ink)",
    margin: 0,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  cardTitleDone: {
    textDecoration: "line-through",
    color: "var(--ink-faint)",
  },
  expandBtn: {
    background: "transparent",
    border: "none",
    color: "var(--ink-faint)",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
    padding: 2,
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--ink-faint)",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },
  cardNote: {
    fontSize: 12.5,
    color: "var(--ink-faint)",
    margin: "5px 0 0",
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  lockedNote: {
    fontSize: 11.5,
    color: "var(--ink-faint)",
    margin: "6px 0 0",
    fontStyle: "italic",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    border: "1.5px solid var(--ink)",
    background: SOFT_INK,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    background: "var(--accent-color)",
    transition: "width 200ms ease",
  },
  cardFooter: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 10,
  },
  cardMeta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    minWidth: 0,
  },
  metaChip: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--ink-soft)",
    background: SOFT_INK,
    borderWidth: 1.5, borderStyle: "solid", borderColor: "transparent",
    borderRadius: 999,
    padding: "1px 9px",
    whiteSpace: "nowrap",
  },
  metaChipOverdue: {
    background: "#F6D3D0",
    color: "#B5453C",
    borderColor: "#B5453C",
  },
  metaChipSoon: {
    background: "#FCE8C2",
    color: "#8A5A1B",
    borderColor: "#8A5A1B",
  },
  subtaskToggle: {
    fontFamily: "'Itim', cursive",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--ink-soft)",
    background: "transparent",
    border: `1.5px dashed ${LINE_INK}`,
    borderRadius: 999,
    padding: "1px 9px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  assigneeAvatar: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "#F4B740",
    border: "2px solid var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#353B46",
    flexShrink: 0,
  },
  subtaskList: {
    listStyle: "none",
    margin: "10px 0 0",
    padding: 0,
    fontSize: 12.5,
    color: "var(--ink-soft)",
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
    color: "var(--ink-faint)",
  },
  subtaskDeleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--ink-faint)",
    fontSize: 14,
    cursor: "pointer",
    padding: 0,
  },
  subtaskAddRow: {
    marginTop: 8,
  },
  subtaskInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    background: "transparent",
    border: `1.5px dashed ${LINE_INK}`,
    borderRadius: 8,
    padding: "5px 8px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
  dropIndicator: {
    height: 4,
    borderRadius: 2,
    background: "var(--accent-color)",
    margin: "-4px 2px 2px",
  },
};
