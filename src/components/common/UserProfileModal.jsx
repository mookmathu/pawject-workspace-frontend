import React, { useEffect, useState } from "react";
import Mascot, { MascotNote } from "./Mascot";
import ActivityHeatmap from "../profile/ActivityHeatmap";
import { getUserProfile, getUserActivity, resolveAvatarUrl } from "../../lib/api";

function formatJoined(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// "Click someone's avatar/name, see their profile" window — used from
// anywhere another user's account appears (friends list, group members,
// chat). A big two-column window: profile card on the left, their activity
// heatmap on the right (friends only, and only if they left it switched on
// in their privacy settings). Fetches lazily on open.
export default function UserProfileModal({ userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const [activity, setActivity] = useState(null);
  const [activityYear, setActivityYear] = useState(null); // null = rolling last 365 days
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setUser(null);
    setActivity(null);
    setActivityYear(null);
    setActivityError("");
    (async () => {
      try {
        const { user } = await getUserProfile(userId);
        if (!cancelled) setUser(user);
      } catch (err) {
        if (!cancelled) setError(err.message || "โหลดโปรไฟล์ไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activityVisible = !!user && user.activityVisible !== false;
  useEffect(() => {
    if (!activityVisible) return undefined;
    let cancelled = false;
    setActivityLoading(true);
    setActivityError("");
    getUserActivity(userId, activityYear)
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch((err) => {
        if (!cancelled) setActivityError(err.message || "โหลดกิจกรรมไม่สำเร็จ");
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, activityVisible, activityYear]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);
  const initial = (user?.name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>{CSS}</style>
      <div className="upm-sheet" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="upm-x" style={styles.closeBtn} onClick={onClose} title="ปิด" aria-label="ปิด">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>

        {loading ? (
          <div style={styles.center}>
            <MascotNote name="nap" anim="float" width={120} text="กำลังโหลด..." />
          </div>
        ) : error ? (
          <p style={{ ...styles.stateText, color: "#E0473E" }}>{error}</p>
        ) : (
          <div className="upm-grid" style={styles.grid}>
            <aside style={styles.side}>
              <div style={styles.cover} aria-hidden="true">
                <span style={{ position: "absolute", left: 14, bottom: 8 }}>
                  <Mascot name="bone" width={30} anim="wiggle" />
                </span>
                <span style={{ position: "absolute", right: 16, bottom: 6 }}>
                  <Mascot name="ball" width={24} anim="bounce" />
                </span>
              </div>
              <div style={styles.sideBody}>
                <div style={styles.avatarWrap}>
                  {avatarSrc && !avatarLoadFailed ? (
                    <img src={avatarSrc} alt="" style={styles.avatarImg} onError={() => setAvatarLoadFailed(true)} />
                  ) : (
                    <div style={styles.avatarFallback}>{initial}</div>
                  )}
                </div>
                <h2 style={styles.name}>{user.name}</h2>
                {user.username && <p style={styles.username}>@{user.username}</p>}
                {user.bio && <p style={styles.bio}>{user.bio}</p>}
                <ul style={styles.list}>
                  {user.orgName && <li style={styles.item}>{user.orgType === "company" ? "🏢" : "🏫"} {user.orgName}</li>}
                  {user.createdAt && <li style={styles.item}>📅 เข้าร่วมเมื่อ {formatJoined(user.createdAt)}</li>}
                </ul>
              </div>
            </aside>

            <section style={styles.main}>
              {!activityVisible ? (
                <div style={styles.hiddenBox}>
                  <MascotNote name="huh" anim="float" width={110} text="เพื่อนคนนี้ซ่อนกิจกรรมไว้" sub="เจ้าของโปรไฟล์เลือกไม่แสดงกราฟการเข้าใช้งาน" />
                </div>
              ) : activityError ? (
                <div style={styles.hiddenBox}>
                  <p style={{ ...styles.stateText, color: "#E0473E" }}>{activityError}</p>
                </div>
              ) : (
                <ActivityHeatmap data={activity} loading={activityLoading} selectedYear={activityYear} onSelectYear={setActivityYear} />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.upm-sheet .profile-activity { margin-bottom: 0 !important; }
.upm-x { transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease; }
.upm-x:hover { transform: translate(-1px, -1px) rotate(90deg); box-shadow: 3px 3px 0 0 var(--ink); background: color-mix(in srgb, #F4B8B8 55%, var(--bg-surface)); }
.upm-x:active { transform: translate(1px, 1px); box-shadow: 0 0 0 0 var(--ink); }
@media (max-width: 760px) {
  .upm-grid { grid-template-columns: 1fr !important; }
}
`;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(53,59,70,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16,
  },
  sheet: {
    position: "relative",
    background: "var(--bg-page)",
    border: "2.5px solid var(--ink)",
    borderRadius: "24px 10px 22px 12px / 12px 22px 10px 24px",
    boxShadow: "7px 7px 0 0 var(--ink)",
    padding: "56px 22px 22px",
    width: "100%",
    maxWidth: 980,
    maxHeight: "92vh",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    zIndex: 2,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontFamily: "inherit",
    color: "var(--ink)",
    background: "var(--bg-surface)",
    border: "2.5px solid var(--ink)",
    borderRadius: "50%",
    boxShadow: "2px 2px 0 0 var(--ink)",
    cursor: "pointer",
  },
  center: { display: "flex", justifyContent: "center", padding: "40px 0" },
  stateText: { fontFamily: "'Itim', cursive", fontSize: 15, color: "var(--ink-soft)", margin: "20px 0", textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 22, alignItems: "start" },
  side: {
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-surface)",
    border: "2.5px solid var(--ink)",
    borderRadius: 22,
    boxShadow: "5px 5px 0 0 var(--ink)",
    overflow: "hidden",
  },
  cover: { position: "relative", height: 84, background: "color-mix(in srgb, var(--accent-color) 24%, var(--bg-surface))", borderBottom: "2.5px solid var(--ink)" },
  sideBody: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 4, padding: "0 18px 20px" },
  avatarWrap: { position: "relative", width: 112, height: 112, marginTop: -56, marginBottom: 8 },
  avatarImg: { width: 112, height: 112, borderRadius: "50%", border: "3px solid var(--ink)", objectFit: "cover", display: "block", background: "var(--bg-page)", boxShadow: "4px 4px 0 0 var(--ink)" },
  avatarFallback: { width: 112, height: 112, borderRadius: "50%", border: "3px solid var(--ink)", background: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, fontWeight: 700, color: "#FFFDF8", boxShadow: "4px 4px 0 0 var(--ink)" },
  name: { fontFamily: "'Itim', cursive", fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "4px 0 0", lineHeight: 1.2, wordBreak: "break-word" },
  username: { fontFamily: "'Itim', cursive", fontSize: 16, color: "var(--ink-soft)", margin: "0 0 6px" },
  bio: { fontFamily: "'Itim', cursive", fontSize: 15, color: "var(--ink)", margin: "4px 0 10px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },
  list: { listStyle: "none", margin: "6px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8, width: "100%", fontFamily: "'Itim', cursive", fontSize: 14, color: "var(--ink-soft)" },
  item: { display: "block", padding: "7px 12px", borderRadius: 12, background: "color-mix(in srgb, var(--accent-color) 8%, var(--bg-page))", border: "1.5px dashed color-mix(in srgb, var(--ink) 28%, transparent)", textAlign: "left" },
  main: { minWidth: 0 },
  hiddenBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 220,
    background: "var(--bg-surface)",
    border: "2.5px dashed color-mix(in srgb, var(--ink) 40%, transparent)",
    borderRadius: 22,
    padding: 20,
  },
};
