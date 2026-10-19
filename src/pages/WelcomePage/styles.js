/**
 * Welcome launcher: flat colours, the pup in the middle, five thought-bubble
 * destinations around it. Hover/animation rules live in the <style> tag in
 * index.jsx (inline styles can't express :hover or keyframes).
 */
const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "28px 16px 24px",
    fontFamily: "'Itim', cursive",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
  },
  greeting: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  kicker: { margin: 0, fontSize: 20, fontWeight: 700, color: "var(--accent-color)" },
  name: { margin: 0, fontSize: "clamp(28px, 4.6vw, 46px)", lineHeight: 1.15, fontWeight: 700, color: "var(--ink)" },
  date: { margin: 0, fontSize: 14, color: "var(--ink-soft)" },
  trail: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" },
  pic: { width: "100%", height: "100%", objectFit: "contain" },
  picWrap: { position: "relative", display: "flex", width: "100%", height: "100%" },
  avatarFallback: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--accent-color)",
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
  },
  badge: {
    position: "absolute",
    top: "-2%",
    right: "2%",
    minWidth: 24,
    height: 24,
    padding: "0 7px",
    boxSizing: "border-box",
    borderRadius: 12,
    background: "#E0473E",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid var(--ink)",
    zIndex: 4,
  },
};

export default styles;
