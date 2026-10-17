import React, { useEffect, useState } from "react";
import { getUserProfile, resolveAvatarUrl } from "../../lib/api";

function formatJoined(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", { year: "numeric", month: "long" });
  } catch {
    return "";
  }
}

// A GitHub-style "click someone's avatar/name, see their profile card"
// popup — used from anywhere another user's account appears (friends list,
// group members, chat). Fetches lazily on open rather than each caller
// preloading the data, since most of the time nobody clicks through.
export default function UserProfileModal({ userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setUser(null);
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
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" style={styles.closeBtn} onClick={onClose} title="ปิด" aria-label="ปิด">
          ×
        </button>

        {loading ? (
          <p style={styles.stateText}>กำลังโหลด...</p>
        ) : error ? (
          <p style={{ ...styles.stateText, color: "#E0473E" }}>{error}</p>
        ) : (
          <>
            <div style={styles.avatarWrap}>
              {avatarSrc && !avatarLoadFailed ? (
                <img
                  src={avatarSrc}
                  alt=""
                  style={styles.avatarImg}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                <div style={styles.avatarFallback}>{initial}</div>
              )}
            </div>

            <p style={styles.name}>{user.name}</p>
            {user.username && <p style={styles.username}>@{user.username}</p>}

            {user.bio && <p style={styles.bio}>{user.bio}</p>}

            <div style={styles.metaList}>
              {user.orgName && (
                <div style={styles.metaRow}>
                  <span style={styles.metaIcon}>{user.orgType === "company" ? "🏢" : "🎓"}</span>
                  <span>{user.orgName}</span>
                </div>
              )}
              {user.createdAt && (
                <div style={styles.metaRow}>
                  <span style={styles.metaIcon}>📅</span>
                  <span>เข้าร่วมเมื่อ {formatJoined(user.createdAt)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(53,59,70,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
    padding: 16,
  },
  sheet: {
    position: "relative",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 20,
    boxShadow: "6px 6px 0 0 var(--ink)",
    padding: "32px 28px 28px",
    width: "100%",
    maxWidth: 340,
    maxHeight: "88vh",
    overflowY: "auto",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "none",
    border: "none",
    fontSize: 22,
    lineHeight: 1,
    color: "var(--ink-soft)",
    cursor: "pointer",
    padding: 4,
  },
  stateText: {
    fontFamily: "'Itim', cursive",
    fontSize: 15,
    color: "var(--ink-soft)",
    margin: "20px 0",
  },
  avatarWrap: {
    width: 92,
    height: 92,
    marginBottom: 14,
  },
  avatarImg: {
    width: 92,
    height: 92,
    borderRadius: "50%",
    border: "2.5px solid var(--ink)",
    objectFit: "cover",
    display: "block",
    background: "var(--bg-page)",
  },
  avatarFallback: {
    width: 92,
    height: 92,
    borderRadius: "50%",
    border: "2.5px solid var(--ink)",
    background: "var(--accent-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
    fontWeight: 700,
    color: "#FFFDF8",
  },
  name: {
    fontFamily: "'Itim', cursive",
    fontSize: 21,
    fontWeight: 700,
    color: "var(--ink)",
    margin: 0,
  },
  username: {
    fontSize: 13.5,
    color: "var(--ink-faint)",
    margin: "2px 0 0",
  },
  bio: {
    fontSize: 14,
    color: "var(--ink-soft)",
    margin: "14px 0 0",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  metaList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 18,
    width: "100%",
    textAlign: "left",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13.5,
    color: "var(--ink-soft)",
  },
  metaIcon: {
    fontSize: 15,
    flexShrink: 0,
  },
};
