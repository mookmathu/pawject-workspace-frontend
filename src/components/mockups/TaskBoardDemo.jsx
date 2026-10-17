import React from "react";

const COLUMNS = [
  {
    key: "not_started",
    label: "Not started",
    color: "#E7E2D6",
    text: "var(--ink-soft)",
    cards: [{ title: "พาน้องหมาไปหาหมอ", tag: "ครบกำหนด 4/11", tagColor: "#F6C9C4" }],
  },
  {
    key: "in_progress",
    label: "In progress",
    color: "#E3DEF6",
    text: "#5B4EA6",
    cards: [
      {
        title: "งานภาษี",
        subtasks: ["ยื่นสัญญานักบัญชี", "ขอสลิปเงินเดือน", "ยกเลิกเลข VAT"],
      },
    ],
  },
  {
    key: "blocked",
    label: "Blocked",
    color: "#F6D3D0",
    text: "#B5453C",
    cards: [
      {
        title: "ย้ายบ้าน",
        note: "รอดูสถานการณ์ก่อน",
        subtasks: ["ขอใบเสนอราคาย้ายบ้าน", "สั่งกล่องลังแล้ว ✓"],
      },
    ],
  },
  {
    key: "done",
    label: "Done",
    color: "#DCEFD9",
    text: "#2E8B4F",
    cards: [{ title: "ไม่มีงานค้างแล้ว 🎉" }],
  },
];

export default function TaskBoardDemo() {
  return (
    <div className="card-clean" style={taskStyles.board}>
      <div style={taskStyles.boardHeader}>
        <h2 style={taskStyles.boardTitle}>
          Design Team <span style={taskStyles.chevron}>⌄</span>
        </h2>
        <p style={taskStyles.boardSubtitle}>บอร์ดตัวอย่างสำหรับติดตามงานของทีมออกแบบ</p>
      </div>

      <div style={taskStyles.columns}>
        {COLUMNS.map((col) => (
          <div key={col.key} style={taskStyles.column}>
            <span style={{ ...taskStyles.columnLabel, background: col.color, color: col.text }}>
              {col.label}
            </span>

            {col.cards.map((card, i) => (
              <div key={i} style={taskStyles.card}>
                <p style={taskStyles.cardTitle}>{card.title}</p>
                {card.tag && (
                  <span style={{ ...taskStyles.cardTag, background: card.tagColor }}>{card.tag}</span>
                )}
                {card.note && <p style={taskStyles.cardNote}>{card.note}</p>}
                {card.subtasks && (
                  <ul style={taskStyles.subtaskList}>
                    {card.subtasks.map((s, j) => (
                      <li key={j} style={taskStyles.subtaskItem}>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <button type="button" style={taskStyles.addTaskBtn}>
              + Add a Task
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const taskStyles = {
  board: {
    border: "2px solid var(--ink)",
    padding: "28px 28px 24px",
    boxSizing: "border-box",
  },
  boardHeader: {
    marginBottom: 22,
  },
  boardTitle: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 24,
    color: "var(--ink)",
    margin: "0 0 4px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  chevron: {
    fontSize: 18,
    color: "var(--ink-faint)",
  },
  boardSubtitle: {
    fontSize: 14,
    color: "var(--ink-faint)",
    margin: 0,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  columnLabel: {
    alignSelf: "flex-start",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 999,
    marginBottom: 4,
  },
  card: {
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: "10px 16px 10px 16px / 14px 10px 14px 10px",
    padding: "12px 14px",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--ink)",
    margin: "0 0 6px",
  },
  cardTag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color: "#7A3B34",
    padding: "2px 9px",
    borderRadius: 999,
  },
  cardNote: {
    fontSize: 12,
    color: "var(--ink-faint)",
    margin: "0 0 6px",
  },
  subtaskList: {
    margin: 0,
    padding: "0 0 0 16px",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    lineHeight: 1.7,
  },
  subtaskItem: {},
  addTaskBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink-faint)",
    background: "transparent",
    border: "2px dashed #C9C0AE",
    borderRadius: "10px 16px 10px 16px / 14px 10px 14px 10px",
    padding: "8px 10px",
    cursor: "pointer",
    textAlign: "left",
  },
};
