import React from "react";
import GlobalStyles from "../../components/common/GlobalStyles";
import AppHeader from "../../components/common/AppHeader";
import { AddWorkspaceIcon, InviteIcon, CompassIcon, BoxOpenIcon } from "../../components/common/dashboardIcons";
import styles from "../../components/common/appShellStyles";

const QUICK_ACTIONS = [
  {
    icon: AddWorkspaceIcon,
    title: "สร้าง Workspace ใหม่",
    desc: "เริ่มพื้นที่ทำงานสำหรับทีมหรือโปรเจกต์ของคุณ",
  },
  {
    icon: InviteIcon,
    title: "เชิญเพื่อนร่วมทีม",
    desc: "ชวนเพื่อนเข้ามาช่วยกันทำงานในพื้นที่เดียวกัน",
  },
  {
    icon: CompassIcon,
    title: "สำรวจเทมเพลต",
    desc: "หยิบโครงสร้างสำเร็จรูปไปเริ่มงานได้ทันที",
  },
];

export default function DashboardPage() {
  return (
    <div style={styles.page}>
      <GlobalStyles />
      <AppHeader active="Dashboard" />

      <main className="app-panel" style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>เริ่มต้นใช้งาน</h2>
          <div style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-clean" style={styles.actionCard}>
                <div style={styles.actionIconWrap}>
                  <Icon />
                </div>
                <h3 style={styles.actionTitle}>{title}</h3>
                <p style={styles.actionDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Workspace ของคุณ</h2>
          <div className="card-clean" style={styles.emptyState}>
            <BoxOpenIcon />
            <p style={styles.emptyStateText}>ยังไม่มี Workspace ที่นี่ — สร้างอันแรกของคุณกันเลย</p>
            <button type="button" className="doodle-btn" style={styles.emptyStateBtn}>
              สร้าง Workspace
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
