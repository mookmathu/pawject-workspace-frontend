import React, { useState, useRef, useEffect } from "react";
import { searchUsers } from "../../lib/api";
import { DateFields, TimeFields, dateToFields, fieldsToDate, fixRange, rangeMs } from "./DateTimeFields";

/**
 * Popup-style "new event" composer.
 * `date` is the day already chosen (from clicking "+" on a day cell) —
 * used as the default for both start and end, editable from here.
 */
export default function EventComposerModal({ date, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [startDateFields, setStartDateFields] = useState(dateToFields(date));
  const [startTimeFields, setStartTimeFields] = useState({ hour: 9, minute: 0 });
  const [endDateFields, setEndDateFields] = useState(dateToFields(date));
  const [endTimeFields, setEndTimeFields] = useState({ hour: 10, minute: 0 });

  const [attendeeQuery, setAttendeeQuery] = useState("");
  const [attendeeResults, setAttendeeResults] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);

  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!attendeeQuery.trim()) {
      setAttendeeResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { users } = await searchUsers(attendeeQuery.trim());
        setAttendeeResults(users.filter((u) => !taggedUsers.some((t) => t.id === u.id)));
      } catch {
        setAttendeeResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendeeQuery]);

  function addAttendee(user) {
    setTaggedUsers((prev) => [...prev, user]);
    setAttendeeQuery("");
    setAttendeeResults([]);
  }
  function removeAttendee(userId) {
    setTaggedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  // Any change to the start/end fields goes through here so the end can
  // never be left before the start (see fixRange).
  function changeRange(patch, changed) {
    const cur = { startDate: startDateFields, startTime: startTimeFields, endDate: endDateFields, endTime: endTimeFields, isAllDay };
    const fixed = fixRange({ ...cur, ...patch, changed, prevMs: rangeMs(cur) });
    setStartDateFields(fixed.startDate);
    setStartTimeFields(fixed.startTime);
    setEndDateFields(fixed.endDate);
    setEndTimeFields(fixed.endTime);
  }

  function toggleAllDay() {
    const next = !isAllDay;
    setIsAllDay(next);
    // Switching to timed: make sure the times already in the fields are valid.
    const fixed = fixRange({ startDate: startDateFields, startTime: startTimeFields, endDate: endDateFields, endTime: endTimeFields, isAllDay: next, changed: "end", prevMs: 0 });
    setEndDateFields(fixed.endDate);
    setEndTimeFields(fixed.endTime);
  }

  function handleConfirm() {
    if (!title.trim() || submitted) return;
    setSubmitted(true);

    const startDt = fieldsToDate(startDateFields, isAllDay ? { hour: 0, minute: 0 } : startTimeFields);
    const endDt = fieldsToDate(endDateFields, isAllDay ? { hour: 23, minute: 59 } : endTimeFields);

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      isAllDay,
      startDate: startDt.toISOString(),
      endDate: endDt.toISOString(),
      attendeeUsernames: taggedUsers.map((u) => u.username),
    });
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.topRow}>
          <button type="button" onClick={onClose} style={styles.iconBtn} title="ปิด">
            ×
          </button>
          <span style={styles.topTitle}>กิจกรรมใหม่ ✨</span>
          <button
            type="button"
            onClick={handleConfirm}
            style={{ ...styles.confirmBtn, ...(title.trim() ? {} : styles.confirmBtnDisabled) }}
            title="บันทึก"
            disabled={!title.trim() || submitted}
          >
            ✓
          </button>
        </div>

        <div style={styles.fieldGroup}>
          <input
            ref={titleRef}
            type="text"
            placeholder="ชื่อกิจกรรม"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.titleInput}
          />
          <textarea
            placeholder="รายละเอียด (ถ้ามี)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.descInput}
            rows={2}
          />
        </div>

        {/* All-day toggle */}
        <div style={styles.toggleRow}>
          <span style={styles.toggleLabel}>🌞 ทั้งวัน</span>
          <button
            type="button"
            onClick={toggleAllDay}
            style={{ ...styles.toggleSwitch, ...(isAllDay ? styles.toggleSwitchOn : {}) }}
          >
            <span style={{ ...styles.toggleKnob, ...(isAllDay ? styles.toggleKnobOn : {}) }} />
          </button>
        </div>

        {/* Start / end */}
        <div style={styles.dateTimeGroup}>
          <div style={styles.dateTimeRow}>
            <span style={styles.dateTimeLabel}>เริ่ม</span>
            <div style={styles.fieldsWrap}>
              <DateFields value={startDateFields} onChange={(v) => changeRange({ startDate: v }, "start")} />
              {!isAllDay && <TimeFields value={startTimeFields} onChange={(v) => changeRange({ startTime: v }, "start")} />}
            </div>
          </div>
          <div style={{ ...styles.dateTimeRow, borderBottom: "none" }}>
            <span style={styles.dateTimeLabel}>สิ้นสุด</span>
            <div style={styles.fieldsWrap}>
              <DateFields value={endDateFields} onChange={(v) => changeRange({ endDate: v }, "end")} />
              {!isAllDay && <TimeFields value={endTimeFields} onChange={(v) => changeRange({ endTime: v }, "end")} />}
            </div>
          </div>
        </div>

        {/* Attendees / tagging */}
        <div style={styles.attendeeSection}>
          <span style={styles.attendeeSectionLabel}>👥 ผู้เกี่ยวข้อง</span>

          {taggedUsers.length > 0 && (
            <div style={styles.tagList}>
              {taggedUsers.map((u) => (
                <span key={u.id} style={styles.tagChip}>
                  @{u.username}
                  <button
                    type="button"
                    onClick={() => removeAttendee(u.id)}
                    style={styles.tagRemoveBtn}
                    title="เอาออก"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={styles.attendeeInputWrap}>
            <input
              type="text"
              placeholder="พิมพ์ username เพื่อแท็ก..."
              value={attendeeQuery}
              onChange={(e) => setAttendeeQuery(e.target.value)}
              style={styles.attendeeInput}
            />
            {attendeeResults.length > 0 && (
              <ul style={styles.attendeeDropdown}>
                {attendeeResults.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => addAttendee(u)} style={styles.attendeeOption}>
                      <strong>@{u.username}</strong> {u.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 20,
    boxShadow: "6px 6px 0 0 var(--ink)",
    width: "100%",
    maxWidth: 420,
    maxHeight: "88vh",
    overflowY: "auto",
    padding: "18px 18px 22px",
    boxSizing: "border-box",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "none",
    background: "transparent",
    color: "var(--ink-faint)",
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
  },
  topTitle: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 17,
    color: "var(--ink)",
  },
  confirmBtn: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    border: "2px solid var(--ink)",
    background: "#DCEFD9",
    color: "#353B46",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    cursor: "pointer",
  },
  confirmBtnDisabled: {
    background: "#F0EDE3",
    color: "#C9C0AE",
    border: "2px solid #E7E2D6",
    cursor: "not-allowed",
  },
  fieldGroup: {
    background: "#F6F3EC",
    borderRadius: 12,
    padding: "4px 12px",
    marginBottom: 12,
  },
  titleInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 15,
    color: "#353B46",
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    padding: "10px 0",
    borderBottom: "1.5px solid #E7E2D6",
  },
  descInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "#5C5346",
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    padding: "8px 0",
    resize: "none",
  },
  toggleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F6F3EC",
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 8,
  },
  toggleLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "#353B46",
  },
  toggleSwitch: {
    width: 40,
    height: 22,
    borderRadius: 999,
    border: "none",
    background: "#D8CFBF",
    position: "relative",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  toggleSwitchOn: {
    background: "var(--accent-color)",
  },
  toggleKnob: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "var(--bg-surface)",
    transition: "left 120ms ease",
  },
  toggleKnobOn: {
    left: 20,
  },
  dateTimeGroup: {
    background: "#F6F3EC",
    borderRadius: 12,
    padding: "6px 12px",
    marginBottom: 12,
    display: "flex",
    flexDirection: "column",
  },
  dateTimeRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    padding: "10px 0",
    borderBottom: "1.5px solid #E7E2D6",
  },
  dateTimeLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "#5C5346",
    width: 52,
    flexShrink: 0,
  },
  fieldsWrap: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
  },
  attendeeSection: {
    background: "#F6F3EC",
    borderRadius: 12,
    padding: "10px 12px",
  },
  attendeeSectionLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "#5C5346",
    display: "block",
    marginBottom: 8,
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  tagChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    fontWeight: 700,
    color: "#2C5F8A",
    background: "#EAF0FF",
    borderRadius: 999,
    padding: "3px 6px 3px 10px",
  },
  tagRemoveBtn: {
    background: "transparent",
    border: "none",
    color: "#2C5F8A",
    fontSize: 14,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },
  attendeeInputWrap: {
    position: "relative",
  },
  attendeeInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    padding: "4px 0",
  },
  attendeeDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 var(--ink)",
    listStyle: "none",
    margin: 0,
    padding: 4,
    zIndex: 10,
    maxHeight: 160,
    overflowY: "auto",
  },
  attendeeOption: {
    display: "block",
    width: "100%",
    textAlign: "left",
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    padding: "7px 8px",
    cursor: "pointer",
  },
};
