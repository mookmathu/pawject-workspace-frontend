import React from "react";
import GlobalStyles from "../../components/common/GlobalStyles";
import AppHeader from "../../components/common/AppHeader";
import styles from "../../components/common/appShellStyles";

export default function ChatPage() {
  return (
    <div style={styles.page}>
      <GlobalStyles />
      <AppHeader active="Chat" />

      <main className="app-panel" style={styles.main}>
        <div className="card-clean" style={styles.emptyState}>
          <p style={styles.emptyStateText}>
            <strong style={{ color: "#221D17" }}>ยังไม่มีข้อความ</strong>
            <br />
            ระบบแชทกำลังจะมาเร็ว ๆ นี้
          </p>
        </div>
      </main>
    </div>
  );
}
