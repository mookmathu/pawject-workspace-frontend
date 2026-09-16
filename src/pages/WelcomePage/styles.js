/**
 * WelcomePage is now just the launcher: a full-viewport illustrated
 * hero with an avatar+greeting and a big pill nav overlaid on it.
 * Clicking a nav item navigates to a real page (Dashboard/Task/Chat/
 * Calendar), each with its own compact header — see AppHeader and
 * appShellStyles for those shared pieces.
 */
const styles = {
  page: {
    width: "100%",
    minHeight: "100vh",
    fontFamily: "'Itim', cursive",
    background: "#EDE7D9",
  },

  hero: {
    position: "relative",
    width: "100%",
    minHeight: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background:
      "linear-gradient(180deg, #EEF2F5 0%, #E2ECF1 10%, #D2E5EF 22%, #BEDCEC 36%, #9FCFE6 50%, #7EBBDA 64%, #5C9FCB 76%, #3E7CAE 88%, #2C5F8A 100%)",
  },
  heroSvg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },

  homeHeader: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    width: "100%",
    padding: "40px 24px 0",
    boxSizing: "border-box",
  },
  homeGreetingRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  heroGreeting: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: "clamp(24px, 3.2vw, 34px)",
    color: "#221D17",
    margin: 0,
    textAlign: "center",
  },
};

export default styles;
