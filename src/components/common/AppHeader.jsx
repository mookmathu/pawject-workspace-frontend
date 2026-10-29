import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SunIcon, MoonIcon, BellIcon } from "./dashboardIcons";
import styles from "./appShellStyles";
import { PawPrint } from "../mockups/DogSVG";
import pawLogo from "../../assets/icons/paw-logo.png";
import { useTheme } from "../../lib/ThemeContext";
import {
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  resolveAvatarUrl,
} from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { setTaskJump, setChatJump } from "../../lib/navJump";

const NOTIF_ICON = {
  task_assigned: "📋",
  task_comment: "💬",
  message: "✉️",
};

function formatRelativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

const NAV_ITEMS = [
  { label: "Home", path: "/home" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "Task", path: "/task" },
  { label: "Chat", path: "/chat" },
  { label: "Calendar", path: "/calendar" },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Rendered once by AppLayout (not per-page anymore) — which nav pill is
// "active" is derived from the current route instead of a prop, since a
// single long-lived instance has no per-page prop to receive.
export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleMode } = useTheme();
  const user = getStoredUser();
  const displayName = user?.name || "เพื่อนสมาชิก";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  // AppHeader now lives for the whole logged-in session (mounted once by
  // AppLayout) instead of remounting per page, so give a newly-uploaded
  // avatar a fresh chance instead of staying stuck on a stale failure.
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [showRequests, setShowRequests] = useState(false);
  const [dropdownAlignLeft, setDropdownAlignLeft] = useState(false);
  const bellWrapRef = useRef(null);
  const [navOpen, setNavOpen] = useState(false);
  const navWrapRef = useRef(null);

  async function loadRequests() {
    try {
      const { requests } = await getFriendRequests();
      setRequests(requests);
    } catch {
      // silently ignore — not worth interrupting the whole shell for this
    }
  }

  async function loadNotifications() {
    try {
      const { notifications, unreadCount } = await getNotifications();
      setNotifications(notifications);
      setNotifUnreadCount(unreadCount);
    } catch {
      // silently ignore, same as loadRequests
    }
  }

  useEffect(() => {
    void loadRequests();
    void loadNotifications();
  }, []);

  // AppHeader lives for the whole logged-in session (mounted once by
  // AppLayout, which also owns the socket connection's lifetime — see its
  // comment), so a notification created anywhere in the app while the
  // person is on any page reaches the bell live, not just on next refresh.
  useEffect(() => {
    const socket = getSocket();
    function handleNewNotification(notification) {
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      setNotifUnreadCount((prev) => prev + 1);
    }
    socket.on("notification:new", handleNewNotification);
    return () => socket.off("notification:new", handleNewNotification);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target)) {
        setShowRequests(false);
      }
      if (navWrapRef.current && !navWrapRef.current.contains(e.target)) {
        setNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAccept(requestId) {
    try {
      await acceptFriendRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // no-op — request list will still reflect its previous state
    }
  }

  async function handleReject(requestId) {
    try {
      await rejectFriendRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      // no-op
    }
  }

  function handleLogout() {
    localStorage.removeItem("crew_token");
    localStorage.removeItem("crew_user");
    void navigate("/");
  }

  // Marks it read (optimistically — no need to wait on the network for the
  // dropdown to stop highlighting it) and jumps to wherever it points, using
  // the same sessionStorage "deep link" the Home dashboard and Calendar's
  // task chips use, since Task/Chat pick their active board/conversation
  // from client state rather than the URL.
  function handleNotificationClick(notification) {
    setShowRequests(false);
    if (!notification.readAt) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)));
      setNotifUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationRead(notification.id).catch(() => {});
    }

    const link = notification.link;
    if (!link) return;
    if (link.type === "task") {
      setTaskJump({ workspaceId: link.workspaceId, taskId: link.taskId });
      void navigate("/task");
    } else if (link.type === "workspace_chat") {
      setChatJump({ type: "workspace", id: link.workspaceId, name: link.workspaceName });
      void navigate("/chat");
    } else if (link.type === "dm") {
      setChatJump({ type: "dm", id: link.userId, name: link.name });
      void navigate("/chat");
    }
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    setNotifUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // best-effort — a stale unread count self-corrects next time the bell loads
    }
  }

  return (
    <header className="app-navbar" style={styles.navBar}>
      <style>{`
        .app-brand{display:inline-flex;align-items:center;gap:8px;background:none;border:none;padding:0;cursor:pointer;font-family:'Itim',cursive;color:var(--ink)}
        .app-brand-name{font-size:24px;font-weight:700;letter-spacing:.2px;line-height:1}
        .app-navslot{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:46px;height:46px;z-index:12}
        .app-nav{position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;align-items:center;height:46px;box-sizing:border-box;padding:0 !important;overflow:hidden;white-space:nowrap;background:var(--bg-surface);border:2px solid var(--ink);border-radius:999px;box-shadow:3px 3px 0 0 var(--ink);transition:box-shadow .15s}
        .app-nav-paw{flex:0 0 auto;width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;background:none;border:none;border-radius:50%;cursor:pointer;padding:0}
        .app-nav-paw svg{transition:transform .25s}
        .app-nav.is-open .app-nav-paw svg{transform:rotate(-18deg) scale(1.08)}
        .app-nav-items{display:flex;align-items:center;gap:2px;max-width:0;opacity:0;transition:max-width .28s ease,opacity .2s ease,padding .28s ease;padding:0}
        .app-nav.is-open .app-nav-items{max-width:560px;opacity:1;padding:0 6px 0 0}
        .app-nav:not(.is-open) .app-nav-items{pointer-events:none}
        @media (max-width: 1200px) {
          .app-navbar { padding: 10px 14px !important; gap: 10px !important; }
          /* Phone: the paw sits in the first row (right of the brand) and its
             items drop down as a small card under it — not a pill that
             stretches across the screen and covers the page title. */
          .app-navslot{position:relative;left:auto;top:auto;transform:none;width:46px;order:1;margin-left:auto}
          .app-nav{left:auto;right:0;top:0;transform:none;overflow:visible}
          .app-nav-items{position:absolute;top:calc(100% + 10px);right:0;flex-direction:column;align-items:stretch;gap:4px;width:176px;max-width:none;padding:8px;background:var(--bg-surface);border:2px solid var(--ink);border-radius:16px;box-shadow:3px 3px 0 0 var(--ink);opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease,visibility .2s}
          .app-nav.is-open .app-nav-items{max-width:none;padding:8px;opacity:1;visibility:visible;transform:none}
          .app-nav-item{width:100%;text-align:left;padding:10px 12px !important;font-size:15px !important}
          .app-brand-name{font-size:20px}
          .app-navright { order:2; }
        }
        @media (max-width: 480px) {
          .app-navbar .app-logout-btn { padding: 6px 10px !important; font-size: 12.5px !important; }
          .app-navbar .app-username { display:none }
        }
        @media (prefers-reduced-motion: reduce){.app-nav-items,.app-nav-paw svg{transition:none}}
      `}</style>
      <button type="button" className="app-brand" onClick={() => navigate("/home")} title="Pawject">
        <img src={pawLogo} alt="" width={36} height={34} draggable={false} style={{ display: "block", objectFit: "contain" }} />
        <span className="app-brand-name">Pawject</span>
      </button>

      <div
        className="app-navslot"
        ref={navWrapRef}
        onPointerEnter={(e) => e.pointerType === "mouse" && setNavOpen(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setNavOpen(false)}
      >
        <nav className={`app-nav${navOpen ? " is-open" : ""}`} aria-label="เมนูหลัก">
          <button
            type="button"
            className="app-nav-paw"
            aria-expanded={navOpen}
            aria-label="เมนู"
            title="เมนู"
            onClick={() => setNavOpen((o) => !o)}
          >
            <PawPrint size={26} color="var(--ink)" />
          </button>
          <div className="app-nav-items">
            {NAV_ITEMS.map(({ label, path }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={label}
                  type="button"
                  className="app-nav-item"
                  tabIndex={navOpen ? 0 : -1}
                  onClick={() => {
                    setNavOpen(false);
                    void navigate(path);
                  }}
                  style={{
                    ...styles.pillNavItem,
                    ...styles.pillNavItemCompact,
                    ...(isActive ? styles.pillNavItemActive : {}),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="app-navright" style={styles.navRight}>
        <button
          type="button"
          style={styles.iconBtn}
          title={mode === "dark" ? "สลับเป็นธีมสว่าง" : "สลับเป็นธีมมืด"}
          onClick={toggleMode}
        >
          {mode === "dark" ? <MoonIcon /> : <SunIcon />}
        </button>

        <div ref={bellWrapRef} style={styles.bellWrap}>
          <button
            type="button"
            style={styles.iconBtn}
            title="การแจ้งเตือน"
            onClick={() => {
              const opening = !showRequests;
              setShowRequests(opening);
              if (opening) {
                void loadRequests();
                void loadNotifications();
                // Right-aligned dropdown would run off-screen if the bell
                // sits near the left edge (e.g. header wrapped to 2 rows).
                const rect = bellWrapRef.current?.getBoundingClientRect();
                setDropdownAlignLeft(!!rect && rect.right - 300 < 8);
              }
            }}
          >
            <BellIcon />
            {requests.length + notifUnreadCount > 0 && (
              <span style={styles.bellBadge}>{requests.length + notifUnreadCount}</span>
            )}
          </button>

          {showRequests && (
            <div
              style={
                dropdownAlignLeft
                  ? { ...styles.bellDropdown, right: "auto", left: 0 }
                  : styles.bellDropdown
              }
            >
              <p style={styles.bellDropdownTitle}>คำขอเป็นเพื่อน</p>
              {requests.length === 0 ? (
                <p style={styles.bellEmptyText}>ยังไม่มีคำขอเป็นเพื่อน</p>
              ) : (
                <ul style={styles.bellRequestList}>
                  {requests.map((r) => (
                    <li key={r.id} style={styles.bellRequestRow}>
                      <div>
                        <p style={styles.bellRequestName}>{r.sender.name}</p>
                        <p style={styles.bellRequestMeta}>
                          @{r.sender.username}
                          {r.sender.orgName ? ` · ${r.sender.orgName}` : ""}
                        </p>
                      </div>
                      <div style={styles.bellRequestActions}>
                        <button
                          type="button"
                          style={styles.bellAcceptBtn}
                          onClick={() => handleAccept(r.id)}
                          title="ยอมรับ"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          style={styles.bellRejectBtn}
                          onClick={() => handleReject(r.id)}
                          title="ปฏิเสธ"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div style={styles.bellDivider} />

              <div style={styles.bellNotifHeaderRow}>
                <p style={styles.bellDropdownTitle}>การแจ้งเตือน</p>
                {notifUnreadCount > 0 && (
                  <button type="button" style={styles.bellMarkAllBtn} onClick={handleMarkAllRead}>
                    อ่านทั้งหมด
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p style={styles.bellEmptyText}>ยังไม่มีการแจ้งเตือน</p>
              ) : (
                <ul style={styles.bellNotifList}>
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        style={{ ...styles.bellNotifRow, ...(n.readAt ? {} : styles.bellNotifRowUnread) }}
                      >
                        <span style={styles.bellNotifIcon}>{NOTIF_ICON[n.type] || "🔔"}</span>
                        <span style={styles.bellNotifBody}>
                          <span style={styles.bellNotifTitle}>{n.title}</span>
                          {n.body && <span style={styles.bellNotifSnippet}>{n.body}</span>}
                          <span style={styles.bellNotifTime}>{formatRelativeTime(n.createdAt)}</span>
                        </span>
                        {!n.readAt && <span style={styles.bellNotifDot} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          style={{ ...styles.userChip, background: "none", border: "none", padding: 0, cursor: "pointer" }}
          title={user?.email || ""}
          onClick={() => navigate("/profile")}
        >
          {avatarSrc && !avatarLoadFailed ? (
            <img
              src={avatarSrc}
              alt=""
              style={{ ...styles.avatar, objectFit: "cover" }}
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <span style={styles.avatar}>{initial}</span>
          )}
          <span className="app-username" style={styles.userName}>
            {displayName}
          </span>
        </button>

        <button type="button" onClick={handleLogout} className="app-logout-btn" style={styles.logoutBtn}>
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
