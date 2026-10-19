import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import { getWorkspaceBoard, getEvents, createEvent, updateEvent, deleteEvent } from "../../lib/api";
import { setTaskJump } from "../../lib/navJump";
import EventModal from "./EventModal";
import EventComposerModal from "./EventComposerModal";
import { StickerIcon } from "./EventStylePicker";
import { EVENT_LABELS, getLabel, labelSoftBg } from "./eventStyle";
import Mascot from "../common/Mascot";

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
const THAI_WEEKDAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

function formatTime(d) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatLongDate(d) {
  return `${THAI_WEEKDAYS_FULL[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// Order inside one day: all-day events, then timed events by clock time,
// then tasks that are due that day.
function agendaRank(item) {
  if (item.type === "task") return 2;
  return item.data.isAllDay === false ? 1 : 0;
}

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
  const [selectedDate, setSelectedDate] = useState(() => new Date()); // the day whose schedule is listed under the grid
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
    const d = new Date(year, month - 1, 1);
    setViewDate(d);
    setSelectedDate(d);
  }
  function goToNextMonth() {
    const d = new Date(year, month + 1, 1);
    setViewDate(d);
    setSelectedDate(d);
  }
  function goToToday() {
    const d = new Date();
    setViewDate(d);
    setSelectedDate(d);
  }
  function selectDay(dateObj) {
    setSelectedDate(dateObj);
    // Tapping a greyed-out day from the neighbouring month jumps there.
    if (dateObj.getMonth() !== month || dateObj.getFullYear() !== year) {
      setViewDate(new Date(dateObj.getFullYear(), dateObj.getMonth(), 1));
    }
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

  const selectedKey = dateKey(selectedDate);
  const selectedIsToday = isSameDay(selectedDate, today);
  const agendaItems = (itemsByDay[selectedKey] || []).slice().sort((a, b) => {
    const r = agendaRank(a) - agendaRank(b);
    if (r !== 0) return r;
    if (a.type === "event" && b.type === "event") return new Date(a.data.startDate) - new Date(b.data.startDate);
    return 0;
  });

  return (
    <div className="cal-page">
    <div className="card-clean cal-wrap" style={styles.wrap}>
      <style>{`
        .cal-page { display: flex; flex-direction: column; gap: 18px; min-height: calc(100vh - 150px); }
        .cal-day { cursor: pointer; transition: border-color 120ms ease, box-shadow 120ms ease; }
        .cal-day:hover { border-color: var(--ink-faint) !important; }
        .cal-day.is-selected { border: 2px solid var(--accent-color) !important; box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 22%, transparent); }
        .cal-day-addbtn { opacity: 0; transition: opacity 120ms ease; }
        .cal-day:hover .cal-day-addbtn { opacity: 1; }
        .cal-dots { display: none; }
        .cal-agenda { flex: 1 1 auto; }
        .cal-agenda-item:hover { background: var(--bg-page) !important; }

        @media (max-width: 640px) {
          .cal-page { gap: 14px; }
          .cal-wrap { padding: 14px !important; }
          .cal-grid { gap: 4px !important; }
          .cal-weekday-row { margin-top: 12px !important; }
          .cal-weekday-cell { font-size: 11px !important; padding: 2px 0 !important; }
          .cal-day { min-height: 52px !important; padding: 5px 2px 4px !important; border-radius: 10px !important; min-width: 0 !important; overflow: hidden !important; align-items: center; }
          .cal-day-top { justify-content: center !important; }
          .cal-day-number { width: 24px !important; height: 24px !important; font-size: 13px !important; }
          .cal-day-addbtn, .cal-day-items { display: none !important; } /* phone: tap a day, add from the schedule below */
          .cal-dots { display: flex; gap: 3px; align-items: center; justify-content: center; min-height: 8px; }
          .cal-title { font-size: 19px !important; }
          .cal-agenda { padding: 16px !important; }
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
              className={`cal-day${key === selectedKey ? " is-selected" : ""}`}
              style={{ ...styles.dayCell, ...(cell.currentMonth ? {} : styles.dayCellMuted) }}
              onClick={() => selectDay(cell.dateObj)}
            >
              <div className="cal-day-top" style={styles.dayTopRow}>
                <span
                  className="cal-day-number"
                  style={{ ...styles.dayNumber, ...(isToday ? styles.dayNumberToday : {}) }}
                >
                  {cell.dateObj.getDate()}
                </span>
                <button
                  type="button"
                  className="cal-day-addbtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setComposingDate(cell.dateObj);
                  }}
                  style={styles.dayAddBtn}
                  title="เพิ่มกิจกรรม"
                >
                  +
                </button>
              </div>

              <div className="cal-dots" aria-hidden="true">
                {items.slice(0, 3).map((item) => (
                  <span
                    key={`${item.type}-${item.data.id}`}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        item.type === "task" ? item.data.categoryRef?.color || "var(--accent-color)" : getLabel(item.data.label).color,
                    }}
                  />
                ))}
                {items.length > 3 && <span style={{ fontSize: 9, color: "var(--ink-faint)", lineHeight: 1 }}>+</span>}
              </div>

              <div className="cal-day-items" style={styles.dayItems}>
                {items.map((item) =>
                  item.type === "event" ? (
                    <button
                      key={`ev-${item.data.id}`}
                      type="button"
                      className="cal-event-chip"
                      onClick={() => setExpandedEvent(item.data)}
                      style={{
                        ...styles.eventChip,
                        background: labelSoftBg(getLabel(item.data.label).color, 20),
                        borderLeft: `3px solid ${getLabel(item.data.label).color}`,
                      }}
                      title={`${getLabel(item.data.label).name} · ${item.data.title}`}
                    >
                      {item.data.sticker ? <StickerIcon value={item.data.sticker} size={12} /> : null}
                      {item.data.sticker ? " " : ""}
                      {item.data.title}
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

      <div style={styles.legend} aria-label="ความหมายของสี">
        {EVENT_LABELS.map((l) => (
          <span key={l.key} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: l.color }} />
            {l.name}
          </span>
        ))}
      </div>
    </div>

    <section className="card-clean cal-agenda" style={styles.agenda}>
      <div style={styles.agendaHead}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.agendaKicker}>
            {selectedIsToday ? "🐾 วันนี้" : "กำหนดการ"}
            {agendaItems.length > 0 ? ` · ${agendaItems.length} รายการ` : ""}
          </div>
          <h3 style={styles.agendaTitle}>{formatLongDate(selectedDate)}</h3>
        </div>
        <button type="button" onClick={() => setComposingDate(selectedDate)} style={styles.agendaAddBtn}>
          + เพิ่มกิจกรรม
        </button>
      </div>

      {agendaItems.length === 0 ? (
        <div style={styles.agendaEmpty}>
          <Mascot name="artist" width={92} anim="wiggle" shadow />
          <span>{selectedIsToday ? "วันนี้ยังว่าง ไม่มีกำหนดการ" : "วันนี้ไม่มีกำหนดการ"}</span>
        </div>
      ) : (
        <ul style={styles.agendaList}>
          {agendaItems.map((item) => {
            const isEvent = item.type === "event";
            const d = item.data;
            let timeLabel = "ครบกำหนด";
            if (isEvent) {
              if (d.isAllDay === false) {
                const st = new Date(d.startDate);
                const en = d.endDate ? new Date(d.endDate) : null;
                timeLabel = en && en.getTime() !== st.getTime() ? `${formatTime(st)}–${formatTime(en)}` : formatTime(st);
              } else {
                timeLabel = "ทั้งวัน";
              }
            }
            const evLabel = isEvent ? getLabel(d.label) : null;
            const barColor = isEvent ? evLabel.color : d.categoryRef?.color || "var(--accent-color)";
            return (
              <li key={`${item.type}-${d.id}`} style={{ listStyle: "none" }}>
                <button
                  type="button"
                  className="cal-agenda-item"
                  style={styles.agendaItem}
                  onClick={() => {
                    if (isEvent) {
                      setExpandedEvent(d);
                    } else {
                      setTaskJump({ workspaceId: d.workspaceId, taskId: d.id });
                      navigate("/task");
                    }
                  }}
                >
                  <span style={styles.agendaTime}>{timeLabel}</span>
                  <span style={{ ...styles.agendaBar, background: barColor }} />
                  <span style={styles.agendaBody}>
                    <span style={styles.agendaItemTitle}>
                      {isEvent && d.sticker ? (
                        <>
                          <StickerIcon value={d.sticker} size={18} />{" "}
                        </>
                      ) : null}
                      {isEvent ? d.title : `☐ ${d.title}`}
                    </span>
                    <span style={styles.agendaItemSub}>
                      {isEvent ? (
                        <>
                          <span
                            style={{
                              ...styles.labelPill,
                              background: labelSoftBg(evLabel.color, 24),
                              borderColor: evLabel.color,
                            }}
                          >
                            {evLabel.name}
                          </span>
                          {d.attendees?.length ? ` · ${d.attendees.length} คนที่ถูกแท็ก` : ""}
                        </>
                      ) : (
                        `งาน · ${d.workspaceName}`
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>

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
    color: "var(--ink)",
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
  agenda: {
    border: "2px solid var(--ink)",
    padding: "22px 24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  agendaHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  agendaKicker: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--accent-color)",
    marginBottom: 2,
  },
  agendaTitle: {
    fontFamily: "'Itim', cursive",
    fontSize: 20,
    fontWeight: 700,
    color: "var(--ink)",
    margin: 0,
  },
  agendaAddBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    padding: "7px 16px",
    boxShadow: "2px 2px 0 0 var(--ink)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  agendaList: {
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  agendaItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    textAlign: "left",
    fontFamily: "'Itim', cursive",
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "1.5px solid var(--ink-faint)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    boxSizing: "border-box",
  },
  agendaTime: {
    flex: "0 0 74px",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--ink-soft)",
    textAlign: "right",
  },
  agendaBar: {
    flex: "0 0 4px",
    alignSelf: "stretch",
    borderRadius: 4,
  },
  agendaBody: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
    flex: 1,
  },
  labelPill: {
    display: "inline-block",
    fontSize: 11,
    color: "var(--ink)",
    border: "1.5px solid",
    borderRadius: 999,
    padding: "0 8px",
    lineHeight: 1.5,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 14px",
    alignItems: "center",
    marginTop: 14,
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-soft)",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: "50%", flex: "none" },
  agendaItemTitle: {
    fontSize: 15.5,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  agendaItemSub: {
    fontSize: 12.5,
    color: "var(--ink-faint)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  agendaEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "24px 0",
    minHeight: 120,
    fontFamily: "'Itim', cursive",
    fontSize: 15,
    color: "var(--ink-faint)",
  },
};
