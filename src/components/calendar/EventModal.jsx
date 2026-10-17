import React, { useState, useEffect } from "react";
import { searchUsers } from "../../lib/api";
import { DateFields, TimeFields, dateToFields, timeToFields, fieldsToDate, fixRange, rangeMs } from "./DateTimeFields";

export default function EventModal({ event, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [isAllDay, setIsAllDay] = useState(event.isAllDay);

  const [startDateFields, setStartDateFields] = useState(dateToFields(new Date(event.startDate)));
  const [startTimeFields, setStartTimeFields] = useState(timeToFields(new Date(event.startDate)));
  const [endDateFields, setEndDateFields] = useState(
    dateToFields(new Date(event.endDate || event.startDate))
  );
  const [endTimeFields, setEndTimeFields] = useState(
    timeToFields(new Date(event.endDate || event.startDate))
  );

  const [taggedUsers, setTaggedUsers] = useState(
    (event.attendees || []).map((a) => a.user)
  );
  const [attendeeQuery, setAttendeeQuery] = useState("");
  const [attendeeResults, setAttendeeResults] = useState([]);

  function commitTitle() {
    if (title.trim() && title.trim() !== event.title) onUpdate({ title: title.trim() });
  }
  function commitDescription() {
    if (description.trim() !== (event.description || "")) onUpdate({ description: description.trim() || null });
  }
  function handleToggleAllDay() {
    const next = !isAllDay;
    setIsAllDay(next);
    const fixed = fixRange({ startDate: startDateFields, startTime: startTimeFields, endDate: endDateFields, endTime: endTimeFields, isAllDay: next, changed: "end", prevMs: 0 });
    setEndDateFields(fixed.endDate);
    setEndTimeFields(fixed.endTime);
    onUpdate({
      isAllDay: next,
      startDate: fieldsToDate(fixed.startDate, next ? { hour: 0, minute: 0 } : fixed.startTime).toISOString(),
      endDate: fieldsToDate(fixed.endDate, next ? { hour: 23, minute: 59 } : fixed.endTime).toISOString(),
    });
  }
  // Every start/end edit is validated together (end must stay after start),
  // then saved as one update containing both dates.
  function commitRange(patch, changed) {
    const cur = { startDate: startDateFields, startTime: startTimeFields, endDate: endDateFields, endTime: endTimeFields, isAllDay };
    const fixed = fixRange({ ...cur, ...patch, changed, prevMs: rangeMs(cur) });
    setStartDateFields(fixed.startDate);
    setStartTimeFields(fixed.startTime);
    setEndDateFields(fixed.endDate);
    setEndTimeFields(fixed.endTime);
    onUpdate({
      startDate: fieldsToDate(fixed.startDate, isAllDay ? { hour: 0, minute: 0 } : fixed.startTime).toISOString(),
      endDate: fieldsToDate(fixed.endDate, isAllDay ? { hour: 23, minute: 59 } : fixed.endTime).toISOString(),
    });
  }
  const commitStartDate = (v) => commitRange({ startDate: v }, "start");
  const commitStartTime = (v) => commitRange({ startTime: v }, "start");
  const commitEndDate = (v) => commitRange({ endDate: v }, "end");
  const commitEndTime = (v) => commitRange({ endTime: v }, "end");
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
    const next = [...taggedUsers, user];
    setTaggedUsers(next);
    setAttendeeQuery("");
    setAttendeeResults([]);
    onUpdate({ attendeeUsernames: next.map((u) => u.username) });
  }
  function removeAttendee(userId) {
    const next = taggedUsers.filter((u) => u.id !== userId);
    setTaggedUsers(next);
    onUpdate({ attendeeUsernames: next.map((u) => u.username) });
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={styles.closeBtn} title="ปิด">
          ×
        </button>

        {event.owner && (
          <p style={styles.creatorLine}>สร้างโดย @{event.owner.username}</p>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          style={styles.titleInput}
        />

        <textarea
          placeholder="เพิ่มรายละเอียด..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={commitDescription}
          style={styles.descInput}
          rows={2}
        />

        <div style={styles.row}>
          <span style={styles.rowLabel}>🌞 ทั้งวัน</span>
          <button
            type="button"
            onClick={handleToggleAllDay}
            style={{ ...styles.toggle, ...(isAllDay ? styles.toggleOn : {}) }}
          >
            <span style={{ ...styles.toggleKnob, ...(isAllDay ? styles.toggleKnobOn : {}) }} />
          </button>
        </div>
        <div style={styles.row}>
          <span style={styles.rowLabel}>เริ่ม</span>
          <div style={styles.fieldsWrap}>
            <DateFields value={startDateFields} onChange={commitStartDate} />
            {!isAllDay && <TimeFields value={startTimeFields} onChange={commitStartTime} />}
          </div>
        </div>
        <div style={{ ...styles.row, borderBottom: "none" }}>
          <span style={styles.rowLabel}>สิ้นสุด</span>
          <div style={styles.fieldsWrap}>
            <DateFields value={endDateFields} onChange={commitEndDate} />
            {!isAllDay && <TimeFields value={endTimeFields} onChange={commitEndTime} />}
          </div>
        </div>

        <p style={styles.inviteHint}>ผู้เกี่ยวข้อง</p>
        {taggedUsers.length > 0 && (
          <div style={styles.inviteChips}>
            {taggedUsers.map((u) => (
              <span key={u.id} style={styles.inviteChip}>
                @{u.username}
                <button type="button" onClick={() => removeAttendee(u.id)} style={styles.inviteChipRemove}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="พิมพ์ username เพื่อแท็ก..."
            value={attendeeQuery}
            onChange={(e) => setAttendeeQuery(e.target.value)}
            style={styles.inviteInput}
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

        <hr style={styles.divider} />

        <button type="button" onClick={onDelete} style={styles.deleteBtn}>
          ลบกิจกรรมนี้
        </button>
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
    maxWidth: 440,
    maxHeight: "88vh",
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
  creatorLine: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-faint)",
    margin: "0 0 6px",
  },
  titleInput: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 22,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    width: "100%",
    marginBottom: 10,
    background: "transparent",
  },
  descInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink-soft)",
    border: "1.5px solid #ECE6D8",
    borderRadius: 10,
    padding: "10px 12px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    marginBottom: 16,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1.5px solid #EFEAE0",
    gap: 10,
  },
  rowLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink-faint)",
    flexShrink: 0,
  },
  dateInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    border: "none",
    outline: "none",
    background: "transparent",
    textAlign: "right",
  },
  fieldsWrap: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 999,
    border: "2px solid #C9C0AE",
    background: "#E7E2D6",
    position: "relative",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  toggleOn: {
    background: "var(--accent-color)",
    border: "2px solid var(--accent-color)",
  },
  toggleKnob: {
    position: "absolute",
    top: 1,
    left: 1,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "var(--bg-surface)",
    transition: "transform 120ms ease",
  },
  toggleKnobOn: {
    transform: "translateX(18px)",
  },
  inviteHint: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-faint)",
    margin: "16px 0 6px",
  },
  inviteChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  inviteChip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    color: "#2C5F8A",
    background: "#D7E8FB",
    padding: "3px 8px",
    borderRadius: 999,
  },
  inviteChipRemove: {
    background: "transparent",
    border: "none",
    color: "#2C5F8A",
    fontSize: 13,
    lineHeight: 1,
    cursor: "pointer",
    padding: 0,
  },
  inviteInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    border: "1.5px solid #ECE6D8",
    borderRadius: 8,
    padding: "6px 10px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
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
  divider: {
    border: "none",
    borderTop: "1.5px solid #EFEAE0",
    margin: "20px 0 16px",
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
