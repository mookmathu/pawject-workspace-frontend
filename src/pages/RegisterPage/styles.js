import baseStyles from "../LoginPage/styles";

/**
 * Register page reuses every token from the login page (card, inputs,
 * buttons, boat area, etc.) and only adds the few things unique to
 * the sign-up form: the terms checkbox row.
 */
const styles = {
  ...baseStyles,

  checkboxRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginTop: -6,
  },
  checkbox: {
    width: 20,
    height: 20,
    flexShrink: 0,
    marginTop: 2,
    accentColor: "#3ee04e",
    cursor: "pointer",
  },
  checkboxLabel: {
    fontSize: 14.5,
    color: "var(--ink-soft)",
    lineHeight: 1.5,
    cursor: "pointer",
  },
  termsLink: {
    color: "var(--accent-color)",
    textDecoration: "none",
    fontWeight: 700,
  },

  passwordChecklist: {
    listStyle: "none",
    margin: "8px 0 0",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  passwordRuleItem: {
    fontSize: 13,
    fontWeight: 600,
    transition: "color 0.15s ease",
  },

  orgTypeRow: {
    display: "flex",
    gap: 10,
    marginTop: 6,
  },
  orgTypeBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "2px solid #D8CFBF",
    background: "var(--bg-surface)",
    fontSize: 14,
    fontWeight: 600,
    color: "#4A4436",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  orgTypeBtnActive: {
    borderColor: "var(--accent-color)",
    background: "#EAF0FF",
    color: "var(--accent-color)",
  },
  suggestionList: {
    listStyle: "none",
    margin: "6px 0 0",
    padding: 6,
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "var(--bg-surface)",
    border: "2px solid #D8CFBF",
    borderRadius: 10,
    maxHeight: 220,
    overflowY: "auto",
    zIndex: 20,
    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
  },
  suggestionItem: {
    // Rendered as a <button>, not the <li> itself, so it's natively
    // focusable/keyboard-operable instead of relying on a mouse-only
    // handler on a non-interactive element.
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    color: "var(--ink)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    background: "none",
    border: "none",
    textAlign: "left",
  },
  suggestionMeta: {
    fontSize: 12,
    color: "var(--ink-faint)",
    whiteSpace: "nowrap",
  },
  suggestionLoading: {
    padding: "8px 10px",
    fontSize: 13,
    color: "var(--ink-faint)",
  },

  atPrefix: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--ink-faint)",
    fontWeight: 700,
    fontSize: 15,
    pointerEvents: "none",
  },
  usernameHint: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginTop: 5,
  },
};

export default styles;
