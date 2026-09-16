import React from "react";
import GlobalStyles from "../../components/common/GlobalStyles";
import AppHeader from "../../components/common/AppHeader";
import TaskBoard from "../../components/task/TaskBoard";
import styles from "../../components/common/appShellStyles";

export default function TaskPage() {
  return (
    <div style={styles.page}>
      <GlobalStyles />
      <AppHeader active="Task" />

      <main className="app-panel" style={styles.main}>
        <TaskBoard />
      </main>
    </div>
  );
}
