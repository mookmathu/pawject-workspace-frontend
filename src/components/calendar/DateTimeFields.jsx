import React, { useEffect, useRef, useState } from "react";

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/**
 * Day/Month/Year dropdowns, always in that order (วัน-เดือน-ปี), with the
 * year shown in the Buddhist era. `value` is a plain { day, month, year }
 * object using JS's 0-indexed month, so it plugs straight into
 * `new Date(year, month, day, ...)` — no ISO-string/timezone round trips,
 * which is what caused the "always off by one day" bug.
 */
export function DateFields({ value, onChange }) {
  const { day, month, year } = value;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const years = [];
  const base = new Date().getFullYear();
  for (let y = base - 2; y <= base + 5; y++) years.push(y);

  return (
    <span style={styles.group}>
      <span style={styles.emoji}>📅</span>
      <select
        value={day}
        onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
        style={styles.select}
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
        style={styles.select}
      >
        {THAI_MONTHS.map((m, i) => (
          <option key={i} value={i}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
        style={styles.select}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y + 543}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * Same { day, month, year } value/onChange interface as DateFields, but
 * shown as a single button ("📅 15 ก.ย. 2569") that pops open a real
 * clickable month calendar — for whoever wants the "tap a calendar" feel
 * instead of three dropdowns.
 */
function buildPickerGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, currentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, currentMonth: true });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: next++, month: m, year: y, currentMonth: false });
  }
  return cells;
}

export function CalendarPickerField({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.year);
  const [viewMonth, setViewMonth] = useState(value.month);

  function openPicker() {
    if (disabled) return;
    setViewYear(value.year);
    setViewMonth(value.month);
    setOpen(true);
  }

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectCell(cell) {
    onChange({ day: cell.day, month: cell.month, year: cell.year });
    setOpen(false);
  }

  const cells = buildPickerGrid(viewYear, viewMonth);
  const today = new Date();
  const label = `${value.day} ${THAI_MONTHS[value.month]} ${value.year + 543}`;

  return (
    <span style={styles.pickerWrap}>
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        style={{ ...styles.pickerBtn, ...(disabled ? { cursor: "default", opacity: 0.6 } : {}) }}
      >
        📅 {label}
      </button>

      {!disabled && open && (
        <>
          <div role="presentation" style={styles.pickerBackdrop} onClick={() => setOpen(false)} />
          <div style={styles.pickerPopup}>
            <div style={styles.pickerHeader}>
              <button type="button" onClick={goPrevMonth} style={styles.pickerNavBtn}>
                ‹
              </button>
              <span style={styles.pickerHeaderLabel}>
                {THAI_MONTHS[viewMonth]} {viewYear + 543}
              </span>
              <button type="button" onClick={goNextMonth} style={styles.pickerNavBtn}>
                ›
              </button>
            </div>

            <div style={styles.pickerWeekRow}>
              {THAI_WEEKDAYS.map((w) => (
                <span key={w} style={styles.pickerWeekCell}>
                  {w}
                </span>
              ))}
            </div>

            <div style={styles.pickerGrid}>
              {cells.map((cell, i) => {
                const isSelected =
                  cell.day === value.day && cell.month === value.month && cell.year === value.year;
                const isToday =
                  cell.day === today.getDate() &&
                  cell.month === today.getMonth() &&
                  cell.year === today.getFullYear();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectCell(cell)}
                    style={{
                      ...styles.pickerDay,
                      ...(cell.currentMonth ? {} : styles.pickerDayMuted),
                      ...(isToday && !isSelected ? styles.pickerDayToday : {}),
                      ...(isSelected ? styles.pickerDaySelected : {}),
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </span>
  );
}

/**
 * Hour/minute dropdowns styled as a cute little pill. `value` is
 * { hour: 0-23, minute: 0-59 }.
 */
const ITEM_H = 36;
const ROWS = 5; // visible rows; the middle one is the selected value

/**
 * One drum of an iOS-style time wheel: scroll (wheel / touch / drag) and it
 * snaps to the nearest value; the row in the highlighted band is selected.
 */
function WheelColumn({ values, value, onChange, label }) {
  const ref = useRef(null);
  const timer = useRef(0);
  const drag = useRef(null);
  const active = useRef(false); // true while the user is scrolling/dragging
  const valueRef = useRef(value);
  valueRef.current = value;

  // Follow external changes (e.g. the end time being corrected) — but never
  // yank the wheel while the user is still turning it.
  useEffect(() => {
    const el = ref.current;
    if (!el || active.current) return;
    const target = value * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
  }, [value]);

  // Runs once the wheel has stopped moving: whatever the user landed on wins.
  function settle() {
    const el = ref.current;
    if (!el) return;
    active.current = false;
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_H)));
    if (idx !== valueRef.current) onChange(idx);
  }

  function onScroll() {
    active.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(settle, 160);
  }

  function onPointerDown(e) {
    if (e.pointerType !== "mouse") return; // touch scrolls natively
    const el = ref.current;
    drag.current = { y: e.clientY, top: el.scrollTop };
    el.style.scrollSnapType = "none";
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    ref.current.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  }
  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    const el = ref.current;
    const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_H)));
    el.style.scrollSnapType = "";
    el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
  }
  function onKeyDown(e) {
    const step = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(values.length - 1, value + step));
    ref.current.scrollTo({ top: next * ITEM_H, behavior: "smooth" });
  }

  return (
    <div
      ref={ref}
      className="wheel-col"
      role="listbox"
      tabIndex={0}
      aria-label={label}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={styles.wheelCol}
    >
      <div style={{ height: ITEM_H * Math.floor(ROWS / 2) }} />
      {values.map((v, i) => (
        <div
          key={v}
          role="option"
          tabIndex={-1}
          aria-selected={i === value}
          onClick={() => ref.current.scrollTo({ top: i * ITEM_H, behavior: "smooth" })}
          style={{ ...styles.wheelItem, ...(i === value ? styles.wheelItemOn : {}) }}
        >
          {String(v).padStart(2, "0")}
        </div>
      ))}
      <div style={{ height: ITEM_H * Math.floor(ROWS / 2) }} />
    </div>
  );
}

/**
 * Time picker: a pill showing HH:MM that expands into two scroll-wheel
 * drums (hours 00-23, minutes 00-59, one-minute steps), like the clock app.
 */
export function TimeFields({ value, onChange }) {
  const { hour, minute } = value;
  const [open, setOpen] = useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <span style={styles.timeWrap}>
      <style>{`
        .wheel-col { scrollbar-width: none; -ms-overflow-style: none; scroll-snap-type: y mandatory; }
        .wheel-col::-webkit-scrollbar { display: none; }
        .wheel-col > div[role=option] { scroll-snap-align: center; }
        .wheel-col:focus-visible { outline: 2px dashed var(--accent-color); outline-offset: 2px; }
      `}</style>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={styles.timePillBtn}>
        <span style={styles.emoji}>🕐</span>
        <span style={styles.timeText}>
          {pad(hour)}:{pad(minute)}
        </span>
        <span style={styles.ampmHint}>{hour < 12 ? "🌤️ เช้า" : "🌙 บ่าย/เย็น"}</span>
        <span style={styles.chev}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <span style={styles.wheelPanel}>
          <span style={styles.wheelBand} aria-hidden="true" />
          <WheelColumn values={hours} value={hour} label="ชั่วโมง" onChange={(h) => onChange({ ...value, hour: h })} />
          <span style={styles.wheelColon}>:</span>
          <WheelColumn values={minutes} value={minute} label="นาที" onChange={(m) => onChange({ ...value, minute: m })} />
          <span style={styles.wheelFadeTop} aria-hidden="true" />
          <span style={styles.wheelFadeBottom} aria-hidden="true" />
        </span>
      )}
    </span>
  );
}

// Helpers for converting to/from the local Date object cleanly (no UTC
// string round-trip, which is what caused the previous off-by-one bug).
export function dateToFields(d) {
  return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
}
export function timeToFields(d) {
  return { hour: d.getHours(), minute: d.getMinutes() };
}
export function fieldsToDate(dateFields, timeFields) {
  return new Date(
    dateFields.year,
    dateFields.month,
    dateFields.day,
    timeFields?.hour ?? 0,
    timeFields?.minute ?? 0,
    0
  );
}

const styles = {
  group: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  emoji: {
    fontSize: 13,
  },
  select: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "1.5px solid #E7E2D6",
    borderRadius: 8,
    padding: "4px 6px",
    outline: "none",
    cursor: "pointer",
  },
  pickerWrap: {
    position: "relative",
    display: "inline-block",
  },
  pickerBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "1.5px solid #E7E2D6",
    borderRadius: 8,
    padding: "6px 10px",
    outline: "none",
    cursor: "pointer",
  },
  pickerBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
  },
  pickerPopup: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 12,
    boxShadow: "3px 3px 0 0 var(--ink)",
    padding: 10,
    zIndex: 31,
    width: 240,
  },
  pickerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pickerHeaderLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--ink)",
  },
  pickerNavBtn: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "1.5px solid #E7E2D6",
    background: "var(--bg-surface)",
    color: "var(--ink)",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
  },
  pickerWeekRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: 4,
  },
  pickerWeekCell: {
    textAlign: "center",
    fontSize: 10.5,
    fontWeight: 700,
    color: "var(--ink-faint)",
  },
  pickerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 2,
  },
  pickerDay: {
    width: "100%",
    aspectRatio: "1",
    border: "none",
    background: "transparent",
    borderRadius: 8,
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    color: "var(--ink)",
    cursor: "pointer",
  },
  pickerDayMuted: {
    color: "#D8CFBF",
  },
  pickerDayToday: {
    border: "1.5px solid var(--accent-color)",
  },
  pickerDaySelected: {
    background: "var(--accent-color)",
    color: "#FFFDF8",
    fontWeight: 700,
  },
  timeWrap: { display: "inline-flex", flexDirection: "column", gap: 10, alignItems: "stretch", minWidth: 0 },
  timePillBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    fontFamily: "inherit",
    cursor: "pointer",
    color: "var(--ink)",
    background: "color-mix(in srgb, var(--accent-color) 12%, var(--bg-surface))",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--accent-color) 35%, transparent)",
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  timeText: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  chev: { fontSize: 10, color: "var(--ink-faint)" },
  wheelPanel: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: ITEM_H * ROWS,
    width: 200,
    maxWidth: "100%",
    boxSizing: "border-box",
    background: "var(--bg-surface)",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "var(--ink)",
    borderRadius: 16,
    overflow: "hidden",
  },
  wheelBand: {
    position: "absolute",
    left: 8,
    right: 8,
    top: "50%",
    height: ITEM_H,
    marginTop: -ITEM_H / 2,
    borderRadius: 10,
    background: "color-mix(in srgb, var(--accent-color) 16%, var(--bg-page))",
    pointerEvents: "none",
  },
  wheelCol: {
    position: "relative",
    zIndex: 1,
    width: 64,
    height: ITEM_H * ROWS,
    overflowY: "scroll",
    cursor: "grab",
    touchAction: "pan-y",
    userSelect: "none",
  },
  wheelItem: {
    height: ITEM_H,
    lineHeight: `${ITEM_H}px`,
    textAlign: "center",
    fontSize: 19,
    color: "var(--ink-faint)",
  },
  wheelItemOn: { color: "var(--ink)", fontWeight: 700, fontSize: 22 },
  wheelColon: { position: "relative", zIndex: 1, fontSize: 22, fontWeight: 700, color: "var(--ink)" },
  wheelFadeTop: {
    position: "absolute", left: 0, right: 0, top: 0, height: ITEM_H * 1.6, zIndex: 2, pointerEvents: "none",
    background: "linear-gradient(to bottom, var(--bg-surface), transparent)",
  },
  wheelFadeBottom: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: ITEM_H * 1.6, zIndex: 2, pointerEvents: "none",
    background: "linear-gradient(to top, var(--bg-surface), transparent)",
  },
  timePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "#EAF0FF",
    border: "1.5px solid #D7E8FB",
    borderRadius: 999,
    padding: "4px 10px",
  },
  timeSelect: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "#2C5F8A",
    background: "transparent",
    border: "none",
    outline: "none",
    cursor: "pointer",
  },
  colon: {
    fontWeight: 700,
    color: "#2C5F8A",
  },
  ampmHint: {
    fontSize: 11,
    color: "#5B8CBF",
    marginLeft: 4,
  },
};

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/**
 * Keeps an event's end after its start. Call it with the fields as they are
 * AFTER the user's change, and say which side changed:
 *  - start moved past the end  -> the end follows, keeping the old length
 *    (or 1 minute if there wasn't a usable one);
 *  - end set before/at the start -> the end snaps to start + 1 minute
 *    (all-day events: to the start date).
 * Returns the (possibly corrected) { startDate, startTime, endDate, endTime }.
 */
export function fixRange({ startDate, startTime, endDate, endTime, isAllDay, changed, prevMs }) {
  const s = fieldsToDate(startDate, isAllDay ? { hour: 0, minute: 0 } : startTime);
  const e = fieldsToDate(endDate, isAllDay ? { hour: 0, minute: 0 } : endTime);

  if (isAllDay) {
    if (e >= s) return { startDate, startTime, endDate, endTime };
    const dayMs = 24 * HOUR_MS;
    const keep = changed === "start" && prevMs > 0 ? Math.round(prevMs / dayMs) * dayMs : 0;
    return { startDate, startTime, endDate: dateToFields(new Date(s.getTime() + keep)), endTime };
  }

  if (e > s) return { startDate, startTime, endDate, endTime };
  const length = changed === "start" && prevMs > 0 ? prevMs : MIN_MS;
  const fixed = new Date(s.getTime() + length);
  return { startDate, startTime, endDate: dateToFields(fixed), endTime: timeToFields(fixed) };
}

// Length of the current range in ms (0 if it's empty or inverted).
export function rangeMs({ startDate, startTime, endDate, endTime, isAllDay }) {
  const s = fieldsToDate(startDate, isAllDay ? { hour: 0, minute: 0 } : startTime);
  const e = fieldsToDate(endDate, isAllDay ? { hour: 0, minute: 0 } : endTime);
  return Math.max(0, e - s);
}
