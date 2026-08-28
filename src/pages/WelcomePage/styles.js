/**
 * Inline-style tokens for WelcomePage.
 * Full-bleed, frameless long page: one continuous sky -> ocean gradient
 * runs behind the header, nav, and hero, edge to edge, no card/box/shadow.
 */
const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Itim', cursive",
    background:
      "linear-gradient(180deg, #EEF2F5 0%, #E2ECF1 8%, #D2E5EF 18%, #BEDCEC 30%, #9FCFE6 44%, #7EBBDA 56%, #5C9FCB 68%, #3E7CAE 82%, #2C5F8A 100%)",
    position: "relative",
    overflowX: "hidden",
  },

  /* --- header: mascot + title (floats directly on the gradient) --- */
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    maxWidth: 640,
    margin: "0 auto",
    padding: "40px 24px 20px",
    boxSizing: "border-box",
  },
  mascotWrap: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    border: "2.5px solid #221D17",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FFFDF8",
    fontSize: 24,
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: "clamp(26px, 4vw, 36px)",
    color: "#221D17",
    margin: 0,
    maxWidth: 640,
    margin: "0 auto",
  },

  /* --- segmented nav pill --- */
  navWrap: {
    width: "100%",
    maxWidth: 640,
    margin: "0 auto",
    padding: "0 24px 32px",
    boxSizing: "border-box",
  },
  navBar: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    background: "#EFEEE7",
    border: "2px solid #221D17",
    borderRadius: 999,
    padding: 5,
    gap: 4,
  },
  navItem: {
    flex: 1,
    textAlign: "center",
    padding: "10px 8px",
    borderRadius: 999,
    fontFamily: "'Itim', cursive",
    fontSize: 15,
    color: "#5C5346",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    transition: "background 120ms ease, color 120ms ease, box-shadow 120ms ease",
  },
  navItemActive: {
    background: "#FFFDF8",
    color: "#221D17",
    fontWeight: 700,
    boxShadow: "2px 2px 0 0 #221D17",
  },

  /* --- hero: long sky + ocean scene, fills the rest of the page --- */
  hero: {
    position: "relative",
    flex: 1,
    minHeight: "70vh",
    overflow: "hidden",
  },
  oceanWaveSvg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "56%",
    width: "100%",
    height: 30,
    display: "block",
  },

  bottomIndicatorWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "18px 0 28px",
  },
  bottomIndicator: {
    width: 120,
    height: 5,
    borderRadius: 3,
    background: "#FFFDF8",
    opacity: 0.6,
  },
};

export default styles;