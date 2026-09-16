import React, { useState } from "react";

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

export function CalendarPickerField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.year);
  const [viewMonth, setViewMonth] = useState(value.month);

  function openPicker() {
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
      <button type="button" onClick={openPicker} style={styles.pickerBtn}>
        📅 {label}
      </button>

      {open && (
        <>
          <div style={styles.pickerBackdrop} onClick={() => setOpen(false)} />
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
export function TimeFields({ value, onChange }) {
  const { hour, minute } = value;
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <span style={styles.timePill}>
      <span style={styles.emoji}>🕐</span>
      <select
        value={hour}
        onChange={(e) => onChange({ ...value, hour: Number(e.target.value) })}
        style={styles.timeSelect}
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span style={styles.colon}>:</span>
      <select
        value={minute}
        onChange={(e) => onChange({ ...value, minute: Number(e.target.value) })}
        style={styles.timeSelect}
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span style={styles.ampmHint}>{hour < 12 ? "🌤️ เช้า" : "🌙 บ่าย/เย็น"}</span>
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
    color: "#221D17",
    background: "#FFFDF8",
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
    color: "#221D17",
    background: "#FFFDF8",
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
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 12,
    boxShadow: "3px 3px 0 0 #221D17",
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
    color: "#221D17",
  },
  pickerNavBtn: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    border: "1.5px solid #E7E2D6",
    background: "#FFFDF8",
    color: "#221D17",
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
    color: "#8A8071",
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
    color: "#221D17",
    cursor: "pointer",
  },
  pickerDayMuted: {
    color: "#D8CFBF",
  },
  pickerDayToday: {
    border: "1.5px solid #3E6BE0",
  },
  pickerDaySelected: {
    background: "#3E6BE0",
    color: "#FFFDF8",
    fontWeight: 700,
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
