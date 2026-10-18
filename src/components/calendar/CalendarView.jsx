import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import { getWorkspaceBoard, getEvents, createEvent, updateEvent, deleteEvent } from "../../lib/api";
import { setTaskJump } from "../../lib/navJump";
import EventModal from "./EventModal";
import EventComposerModal from "./EventComposerModal";

// Picks readable ink or cream text over a manually-chosen background color
// (same logic as TaskBoard's — duplicated here since it's tiny and this
// file doesn't otherwise depend on that one).
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

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year, month) {
  // month is 0-indexed (JS Date convention)
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ currentMonth: false, dateObj: new Date(year, month - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ currentMonth: true, dateObj: new Date(year, month, d) });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ currentMonth: false, dateObj: new Date(year, month + 1, nextDay++) });
  }
  return cells;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [tasksWithDueDate, setTasksWithDueDate] = useState([]);
  const [error, setError] = useState("");

  const [composingDate, setComposingDate] = useState(null); // Date | null — opens the popup composer
  const [expandedEvent, setExpandedEvent] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  async function loadEvents() {
    try {
      const { events } = await getEvents({ year, month: month + 1 });
      setEvents(events);
      setError("");
    } catch (err) {
      if (err.status === 401) {
        navigate("/");
        return;
      }
      setError(err.message);
    }
  }

  async function loadTasks() {
    try {
      // Pull every workspace the user belongs to (personal + every group
      // they're a member of) — a due date set on a task in a shared group
      // board must show up here too, not just tasks on the personal board.
      // The workspace list itself comes from the shared WorkspacesContext
      // now (see loadTasks' effect below), not a fetch of its own.
      const boards = await Promise.all(
        workspaces.map((w) =>
          getWorkspaceBoard(w.id)
            .then((res) => res.board)
            .catch(() => null)
        )
      );
      const allTasks = boards.flatMap((board, i) =>
        (board?.tasks || []).map((t) => ({
          ...t,
          workspaceId: workspaces[i].id,
          workspaceName: workspaces[i].isPersonal ? "ของฉัน" : workspaces[i].name,
        }))
      );
      // Only tasks that actually have a due date and aren't archived belong
      // on the calendar.
      setTasksWithDueDate(allTasks.filter((t) => t.dueDate && !t.archivedAt));
    } catch (err) {
      if (err.status === 401) {
        navigate("/");
      }
      // otherwise just skip showing tasks on the calendar — not fatal for this view
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  useEffect(() => {
    if (workspacesLoading) return; // wait for the shared workspace list to resolve
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacesLoading]);

  function goToPrevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function goToNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }
  function goToToday() {
    setViewDate(new Date());
  }

  const addingRef = useRef(false); // blocks a double-click from creating the event twice

  async function handleAddEvent(payload) {
    if (addingRef.current) return;
    addingRef.current = true;
    try {
      const { notFoundUsernames } = await createEvent(payload);
      if (notFoundUsernames && notFoundUsernames.length > 0) {
        setError(`ไม่พบผู้ใช้: ${notFoundUsernames.map((u) => "@" + u).join(", ")}`);
      } else {
        setError("");
      }
      setComposingDate(null);
      loadEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      addingRef.current = false;
    }
  }

  async function handleUpdateEvent(patch) {
    if (!expandedEvent) return;
    try {
      await updateEvent(expandedEvent.id, patch);
      loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteEvent() {
    if (!expandedEvent) return;
    try {
      await deleteEvent(expandedEvent.id);
      setExpandedEvent(null);
      loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  const cells = buildMonthGrid(year, month);
  const today = new Date();

  // group events + tasks by day key for quick lookup while rendering
  const itemsByDay = {};
  events.forEach((ev) => {
    const key = dateKey(new Date(ev.startDate));
    (itemsByDay[key] ||= []).push({ type: "event", data: ev });
  });
  tasksWithDueDate.forEach((task) => {
    const key = dateKey(new Date(task.dueDate));
    (itemsByDay[key] ||= []).push({ type: "task", data: task });
  });

  return (
    <div className="card-clean cal-wrap" style={styles.wrap}>
      <style>{`
        .cal-day-addbtn { opacity: 0; transition: opacity 120ms ease; }
        .cal-day:hover .cal-day-addbtn { opacity: 1; }

        @media (max-width: 640px) {
          .cal-wrap { padding: 14px !important; }
          .cal-grid { gap: 3px !important; }
          .cal-weekday-row { margin-top: 12px !important; }
          .cal-weekday-cell { font-size: 10px !important; padding: 2px 0 !important; }
          .cal-day { min-height: 60px !important; padding: 4px 3px 5px !important; border-radius: 8px !important; }
          .cal-day-number { width: 16px !important; height: 16px !important; font-size: 10.5px !important; }
          .cal-day-addbtn { opacity: 1; width: 14px !important; height: 14px !important; } /* no hover on touch — always visible, smaller */
          .cal-event-chip, .cal-task-chip { font-size: 9px !important; padding: 1px 4px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; min-width: 0 !important; }
          .cal-day { min-width: 0 !important; overflow: hidden !important; }
          .cal-title { font-size: 17px !important; }
        }
      `}</style>

      <div style={styles.header}>
        <h2 className="cal-title" style={styles.title}>
          {THAI_MONTHS[month]} {year + 543}
        </h2>
        <div style={styles.navBtns}>
          <button type="button" onClick={goToPrevMonth} style={styles.navBtn} title="เดือนก่อนหน้า">
            ‹
          </button>
          <button type="button" onClick={goToToday} style={styles.todayBtn}>
            วันนี้
          </button>
          <button type="button" onClick={goToNextMonth} style={styles.navBtn} title="เดือนถัดไป">
            ›
          </button>
        </div>
      </div>
      {error && <p style={styles.errorText}>{error}</p>}

      <div className="cal-weekday-row" style={styles.weekdayRow}>
        {THAI_WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday-cell" style={styles.weekdayCell}>
            {w}
          </div>
        ))}
      </div>

      <div className="cal-grid" style={styles.grid}>
        {cells.map((cell, i) => {
          const key = dateKey(cell.dateObj);
          const items = itemsByDay[key] || [];
          const isToday = isSameDay(cell.dateObj, today);

          return (
            <div
              key={i}
              className="cal-day"
              style={{ ...styles.dayCell, ...(cell.currentMonth ? {} : styles.dayCellMuted) }}
            >
              <div style={styles.dayTopRow}>
                <span
                  className="cal-day-number"
                  style={{ ...styles.dayNumber, ...(isToday ? styles.dayNumberToday : {}) }}
                >
                  {cell.dateObj.getDate()}
                </span>
                <button
                  type="button"
                  className="cal-day-addbtn"
                  onClick={() => setComposingDate(cell.dateObj)}
                  style={styles.dayAddBtn}
                  title="เพิ่มกิจกรรม"
                >
                  +
                </button>
              </div>

              <div style={styles.dayItems}>
                {items.map((item) =>
                  item.type === "event" ? (
                    <button
                      key={`ev-${item.data.id}`}
                      type="button"
                      className="cal-event-chip"
                      onClick={() => setExpandedEvent(item.data)}
                      style={styles.eventChip}
                      title={item.data.title}
                    >
                      • {item.data.title}
                    </button>
                  ) : (
                    <button
                      key={`task-${item.data.id}`}
                      type="button"
                      className="cal-task-chip"
                      onClick={() => {
                        setTaskJump({ workspaceId: item.data.workspaceId, taskId: item.data.id });
                        navigate("/task");
                      }}
                      style={{
                        ...styles.taskChip,
                        ...(item.data.categoryRef
                          ? {
                              background: item.data.categoryRef.color,
                              color: getContrastText(item.data.categoryRef.color),
                            }
                          : {}),
                      }}
                      title={`${item.data.title} (${item.data.workspaceName}) — ไปที่หน้า Task`}
                    >
                      <span style={styles.taskChipTitle}>☐ {item.data.title}</span>
                      <span
                        style={{
                          ...styles.taskChipWorkspace,
                          ...(item.data.categoryRef ? { color: "inherit", opacity: 0.75 } : {}),
                        }}
                      >
                        {item.data.workspaceName}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {composingDate && (
        <EventComposerModal
          date={composingDate}
          onClose={() => setComposingDate(null)}
          onSubmit={handleAddEvent}
        />
      )}

      {expandedEvent && (
        <EventModal
          event={expandedEvent}
          onClose={() => setExpandedEvent(null)}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}

const styles = {
  wrap: {
    border: "2px solid var(--ink)",
    padding: "24px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
    gap: 12,
  },
  title: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 22,
    color: "var(--ink)",
    margin: 0,
  },
  navBtns: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "2px solid var(--ink)",
    background: "var(--bg-surface)",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    color: "var(--ink)",
  },
  todayBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
  },
  errorText: {
    color: "#E0473E",
    fontSize: 13,
    fontWeight: 600,
    margin: "8px 0 0",
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    marginTop: 18,
    marginBottom: 6,
  },
  weekdayCell: {
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--ink-faint)",
    padding: "4px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 6,
  },
  dayCell: {
    minHeight: 96,
    background: "var(--bg-surface)",
    border: "1px solid #ECE6D8",
    borderRadius: 10,
    padding: "6px 6px 8px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  dayCellMuted: {
    background: "var(--bg-page)",
    opacity: 0.6,
  },
  dayTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayNumber: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--ink-soft)",
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },
  dayNumberToday: {
    background: "var(--accent-color)",
    color: "#FFFDF8",
  },
  dayAddBtn: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "1.5px dashed #C9C0AE",
    background: "transparent",
    color: "var(--ink-faint)",
    fontSize: 12,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dayItems: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  eventChip: {
    fontFamily: "'Itim', cursive",
    fontSize: 11,
    color: "#2C5F8A",
    background: "#EAF0FF",
    border: "none",
    borderRadius: 6,
    padding: "2px 6px",
    textAlign: "left",
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  taskChip: {
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Itim', cursive",
    fontSize: 11,
    color: "var(--ink-soft)",
    background: "var(--bg-page)",
    border: "none",
    borderRadius: 6,
    padding: "2px 6px",
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box",
  },
  taskChipTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  taskChipWorkspace: {
    fontSize: 9.5,
    color: "var(--ink-faint)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
