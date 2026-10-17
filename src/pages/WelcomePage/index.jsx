import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import DoodleIcon from "../../components/common/DoodleIcons";
import DogScene from "../../components/mockups/DogScene";
import shellStyles from "../../components/common/appShellStyles";
import { getMyTasks, getUnreadCounts, resolveAvatarUrl } from "../../lib/api";
import styles from "./styles";

const DESTINATIONS = [
  { key: "home", icon: "home", title: "Home", desc: "กลุ่มและเพื่อนของคุณ", path: "/home" },
  { key: "dashboard", icon: "dashboard", title: "Dashboard", desc: "ภาพรวมงานของทีม", path: "/dashboard" },
  { key: "task", icon: "task", title: "Task", desc: "บอร์ดงานแบบ Kanban", path: "/task" },
  { key: "chat", icon: "chat", title: "Chat", desc: "คุยกับทีมแบบเรียลไทม์", path: "/chat" },
  { key: "calendar", icon: "calendar", title: "Calendar", desc: "นัดหมายและกำหนดส่ง", path: "/calendar" },
];

const CARD_CSS = `
.wl-card{transition:transform .15s ease, box-shadow .15s ease}
.wl-card:hover,.wl-card:focus-visible{transform:translate(-2px,-4px) rotate(-0.6deg);box-shadow:7px 8px 0 0 var(--ink)!important;outline:none}
.wl-card:active{transform:translate(2px,2px);box-shadow:1px 1px 0 0 var(--ink)!important}
.wl-card:focus-visible{outline:3px dashed var(--accent-color);outline-offset:3px}
@media (prefers-reduced-motion: reduce){.wl-card{transition:none}.wl-card:hover{transform:none}}
`;

function getStoredUser() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function greetingWord() {
  const h = new Date().getHours();
  if (h < 5) return "ดึกแล้วนะ";
  if (h < 12) return "อรุณสวัสดิ์";
  if (h < 17) return "สวัสดียามบ่าย";
  if (h < 20) return "สวัสดียามเย็น";
  return "สวัสดียามค่ำ";
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [taskCount, setTaskCount] = useState(null);
  const [unread, setUnread] = useState(null);

  const displayName = user?.name || "เพื่อนสมาชิก";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);

  useEffect(() => {
    let alive = true;
    getMyTasks()
      .then(({ tasks }) => alive && setTaskCount(tasks.length))
      .catch(() => {});
    getUnreadCounts()
      .then(({ unread: u }) => {
        if (alive) setUnread(Object.values(u || {}).reduce((s, n) => s + n, 0));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const dateText = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const badges = { task: taskCount, chat: unread };
  const avatarStyle = { ...shellStyles.avatar, objectFit: "cover", width: 72, height: 72, fontSize: 30 };

  return (
    <div style={styles.page}>
      <GlobalStyles />
      <style>{CARD_CSS}</style>

      <section style={styles.hero}>
        <DogScene />

        <div style={styles.content}>
          <div style={styles.greeting}>
            <span style={styles.avatarRing}>
              {avatarSrc && !avatarLoadFailed ? (
                <img src={avatarSrc} alt="" style={avatarStyle} onError={() => setAvatarLoadFailed(true)} />
              ) : (
                <span style={avatarStyle}>{initial}</span>
              )}
            </span>
            <p style={styles.kicker}>{greetingWord()} · ยินดีต้อนรับกลับมา</p>
            <h1 style={styles.name}>{displayName} 🐾</h1>
            <p style={styles.date}>{dateText}</p>
            {(taskCount !== null || unread !== null) && (
              <div style={styles.status}>
                {taskCount !== null && <span style={styles.statusChip}>งานค้าง {taskCount}</span>}
                {unread !== null && <span style={styles.statusChip}>ยังไม่อ่าน {unread}</span>}
              </div>
            )}
          </div>

          <nav style={styles.grid} aria-label="เมนูหลัก">
            {DESTINATIONS.map((d) => {
              const n = badges[d.key];
              return (
                <button
                  key={d.key}
                  type="button"
                  className="wl-card"
                  style={styles.card}
                  onClick={() => navigate(d.path)}
                >
                  {n > 0 && <span style={styles.badge}>{n > 99 ? "99+" : n}</span>}
                  <span style={styles.cardIcon}><DoodleIcon name={d.icon} size={44} /></span>
                  <h2 style={styles.cardTitle}>{d.title}</h2>
                  <p style={styles.cardDesc}>{d.desc}</p>
                </button>
              );
            })}
          </nav>

          <div style={styles.footer}>
            <button type="button" style={styles.footBtn} onClick={() => navigate("/profile")}>
              โปรไฟล์ของฉัน
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
