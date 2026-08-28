/**
 * Inline-style tokens for DoodleLoginPage.
 * Kept separate from JSX so the component file only has markup + logic.
 */
const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#EDE7D9",
    backgroundImage:
      "radial-gradient(#00000012 1px, transparent 1px), radial-gradient(#00000012 1px, transparent 1px)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 12px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
    padding: 28,
    fontFamily: "'Itim', cursive",
    flexWrap: "wrap",
  },

  /* --- login card (left) --- */
  card: {
    background: "#FFFDF8",
    width: 440,
    maxWidth: "100%",
    padding: "48px 44px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  brandDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#F4B740",
    border: "2px solid #221D17",
  },
  brandText: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    color: "#3E6BE0",
    fontSize: 15,
  },
  heading: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 40,
    color: "#221D17",
    margin: "4px 0 6px",
  },
  subheading: {
    color: "#5C5346",
    fontSize: 17,
    margin: 0,
  },
  label: {
    fontSize: 16,
    color: "#221D17",
    display: "flex",
    flexDirection: "column",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 17,
  },
  forgotLink: {
    alignSelf: "flex-end",
    fontSize: 14,
    color: "#3E6BE0",
    textDecoration: "none",
    marginTop: -8,
  },
  signInBtn: {
    background: "#3E6BE0",
    color: "#FFFDF8",
    fontSize: 19,
    padding: "12px 0",
    marginTop: 4,
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "4px 0",
  },
  dividerLine: {
    flex: 1,
    height: 2,
    background: "#221D17",
    opacity: 0.25,
  },
  dividerText: {
    fontSize: 13,
    color: "#8A8071",
    whiteSpace: "nowrap",
  },
  footerText: {
    textAlign: "center",
    fontSize: 15,
    color: "#5C5346",
    marginTop: 6,
  },
  registerLink: {
    color: "#FF6F91",
    fontWeight: 700,
    textDecoration: "none",
  },

  /* --- boat mockup placeholder (right) --- */
  boatArea: {
    width: 440,
    maxWidth: "100%",
    minHeight: 420,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 32,
    textAlign: "center",
  },
  boatLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 16,
    color: "#8A8071",
    margin: 0,
    lineHeight: 1.6,
  },
  boatBadge: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "#221D17",
    background: "#FFD166",
    border: "2px solid #221D17",
    borderRadius: "8px 14px 8px 14px / 12px 8px 12px 8px",
    padding: "4px 12px",
  },
};

export default styles;