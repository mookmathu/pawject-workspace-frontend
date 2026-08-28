import React from "react";

/**
 * Generic dashed-border placeholder for artwork/animations that haven't
 * been dropped in yet (boats, birds, signposts, mascots, ...).
 * Keeps the exact size + position reserved in the layout so the real
 * asset can be swapped in later without touching any layout code —
 * just replace the <AssetPlaceholder /> with an <img /> / animation.
 *
 * Usage:
 *   <AssetPlaceholder label="เรือใบ" hint="สัดส่วนแนะนำ 4:3" width={220} height={160} />
 */
export default function AssetPlaceholder({
  label,
  hint,
  width = 160,
  height = 120,
  style = {},
}) {
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        border: "2px dashed rgba(34, 29, 23, 0.4)",
        borderRadius: 16,
        background: "rgba(255, 253, 248, 0.55)",
        textAlign: "center",
        padding: 8,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "'Itim', cursive",
          fontSize: 11,
          fontWeight: 700,
          color: "#221D17",
          background: "#FFD166",
          border: "1.5px solid #221D17",
          borderRadius: 999,
          padding: "2px 10px",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {hint && (
        <span
          style={{
            fontFamily: "'Itim', cursive",
            fontSize: 10.5,
            color: "#5C5346",
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
