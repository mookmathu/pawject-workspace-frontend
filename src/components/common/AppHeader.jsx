import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GearIcon, BellIcon } from "./dashboardIcons";
import styles from "./appShellStyles";
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from "../../lib/api";

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

export default function AppHeader({ active }) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user?.name || "เพื่อนสมาชิก";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [dropdownAlignLeft, setDropdownAlignLeft] = useState(false);
  const bellWrapRef = useRef(null);

  async function loadRequests() {
    try {
      const { requests } = await getFriendRequests();
      setRequests(requests);
    } catch {
      // silently ignore — not worth interrupting the whole shell for this
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target)) {
        setShowRequests(false);
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
    navigate("/");
  }

  return (
    <header className="app-navbar" style={styles.navBar}>
      <style>{`
        @media (max-width: 480px) {
          .app-navbar { padding: 10px 14px !important; gap: 8px !important; }
          .app-navbar .app-logout-btn { padding: 6px 10px !important; font-size: 12.5px !important; }
        }
      `}</style>
      <nav style={{ ...styles.pillNav, ...styles.pillNavCompact }}>
        {NAV_ITEMS.map(({ label, path }) => {
          const isActive = label === active;
          return (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
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
      </nav>

      <div style={styles.navRight}>
        <button type="button" style={styles.iconBtn} title="ตั้งค่า">
          <GearIcon />
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
                loadRequests();
                // Right-aligned dropdown would run off-screen if the bell
                // sits near the left edge (e.g. header wrapped to 2 rows).
                const rect = bellWrapRef.current?.getBoundingClientRect();
                setDropdownAlignLeft(!!rect && rect.right - 300 < 8);
              }
            }}
          >
            <BellIcon />
            {requests.length > 0 && <span style={styles.bellBadge}>{requests.length}</span>}
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
                          @{r.sender.username} · {r.sender.orgName}
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
            </div>
          )}
        </div>

        <div style={styles.userChip} title={user?.email || ""}>
          <span style={styles.avatar}>{initial}</span>
          <span className="app-username" style={styles.userName}>
            {displayName}
          </span>
        </div>

        <button type="button" onClick={handleLogout} className="app-logout-btn" style={styles.logoutBtn}>
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}
