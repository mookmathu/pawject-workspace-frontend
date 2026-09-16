import React from "react";
import GlobalStyles from "../../components/common/GlobalStyles";
import AppHeader from "../../components/common/AppHeader";
import CalendarView from "../../components/calendar/CalendarView";
import styles from "../../components/common/appShellStyles";

export default function CalendarPage() {
  return (
    <div style={styles.page}>
      <GlobalStyles />
      <AppHeader active="Calendar" />

      <main className="app-panel" style={styles.main}>
        <CalendarView />
      </main>
    </div>
  );
}
