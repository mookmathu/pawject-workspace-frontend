import baseStyles from "../loginpage/styles";

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
};

export default styles;