import React from "react";
import Mascot from "../common/Mascot";
import {
  EVENT_LABELS,
  EMOJI_STICKERS,
  MASCOT_STICKERS,
  mascotSticker,
  isMascotSticker,
  mascotName,
  labelSoftBg,
} from "./eventStyle";

/** A sticker value (emoji or "mascot:<name>") drawn at the given pixel size. */
export function StickerIcon({ value, size = 16 }) {
  if (!value) return null;
  if (isMascotSticker(value)) {
    return (
      <span style={{ display: "inline-flex", verticalAlign: "middle", width: size * 1.25 }}>
        <Mascot name={mascotName(value)} width={size * 1.25} anim="none" />
      </span>
    );
  }
  return (
    <span style={{ fontSize: size, lineHeight: 1, verticalAlign: "middle", fontFamily: "inherit" }} aria-hidden="true">
      {value}
    </span>
  );
}

/**
 * Colour label + sticker chooser, shared by the new-event composer and the
 * event detail popup.
 *   label / sticker: current values;  onLabel / onSticker: called with the new value.
 */
export default function EventStylePicker({ label, sticker, onLabel, onSticker }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.group}>
        <span style={styles.heading}>🎨 ระดับ / สี</span>
        <div style={styles.labelRow} role="radiogroup" aria-label="ระดับของกิจกรรม">
          {EVENT_LABELS.map((l) => {
            const on = label === l.key;
            return (
              <button
                key={l.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onLabel(l.key)}
                style={{
                  ...styles.labelBtn,
                  background: labelSoftBg(l.color, on ? 30 : 14),
                  borderColor: on ? l.color : "transparent",
                  boxShadow: on ? `0 0 0 2px ${labelSoftBg(l.color, 35)}` : "none",
                }}
              >
                <span style={{ ...styles.labelDot, background: l.color }} />
                {l.name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.group}>
        <span style={styles.heading}>✨ สติกเกอร์</span>
        <div style={styles.stickerGrid}>
          <button
            type="button"
            onClick={() => onSticker(null)}
            title="ไม่ใช้สติกเกอร์"
            style={{ ...styles.stickerBtn, ...(!sticker ? styles.stickerOn : {}), color: "var(--ink-faint)", fontSize: 18 }}
          >
            ∅
          </button>
          {MASCOT_STICKERS.map((n) => {
            const v = mascotSticker(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => onSticker(v)}
                title="น้องหมา"
                style={{ ...styles.stickerBtn, ...(sticker === v ? styles.stickerOn : {}), background: "var(--bg-page)" }}
              >
                <Mascot name={n} width={n === "glasses" || n === "scarf" ? 22 : 32} anim="none" />
              </button>
            );
          })}
          {EMOJI_STICKERS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onSticker(e)}
              style={{ ...styles.stickerBtn, ...(sticker === e ? styles.stickerOn : {}), fontSize: 20 }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 14, marginTop: 14 },
  group: { display: "flex", flexDirection: "column", gap: 8 },
  heading: { fontFamily: "'Itim', cursive", fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  labelRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  labelBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    border: "2px solid transparent",
    borderRadius: 999,
    padding: "4px 11px",
    cursor: "pointer",
  },
  labelDot: { width: 9, height: 9, borderRadius: "50%", flex: "none" },
  stickerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
    gap: 6,
    maxHeight: 140,
    overflowY: "auto",
    padding: 2,
    marginBottom: 4,
  },
  stickerBtn: {
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "2px solid var(--ink-faint)",
    borderRadius: 10,
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    color: "var(--ink)",
  },
  stickerOn: {
    borderColor: "var(--accent-color)",
    boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, transparent)",
  },
};
