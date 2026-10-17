import React from "react";
import styles from "./styles";
import { resolveAvatarUrl } from "../../lib/api";
import { useUserProfile } from "../../lib/UserProfileContext";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

// Renders the real photo when one's set (workspace group image, friend's
// profile picture) and falls back to the initial-letter circle otherwise —
// same fallback every other avatar spot in the app uses.
function Avatar({ imageUrl, name }) {
  const resolved = resolveAvatarUrl(imageUrl);
  return resolved ? (
    <img src={resolved} alt={name} style={styles.sidebarAvatarImg} />
  ) : (
    <span style={styles.sidebarAvatar}>{initialOf(name)}</span>
  );
}

// Two sections: group chat per workspace (personal workspaces are skipped —
// chatting with a room of just yourself isn't useful) and 1-1 DMs with each
// friend. Both lists come from data the app already fetches elsewhere
// (WorkspacesContext, getFriends) — this component just renders them.
export default function ChatSidebar({ workspaces, friends, selected, onSelect, unreadCounts, onlineUserIds }) {
  const { openUserProfile } = useUserProfile();
  const groupWorkspaces = workspaces.filter((w) => !w.isPersonal);

  return (
    <div className="card-clean chat-sidebar" style={styles.sidebar}>
      <p style={styles.sidebarGroupTitle}>กลุ่ม</p>
      {groupWorkspaces.length === 0 ? (
        <p style={styles.sidebarEmpty}>ยังไม่มีกลุ่มที่เข้าร่วม</p>
      ) : (
        <ul style={styles.sidebarList}>
          {groupWorkspaces.map((ws) => {
            const isActive = selected?.type === "workspace" && selected.id === ws.id;
            const unread = unreadCounts[`workspace:${ws.id}`] || 0;
            return (
              <li key={ws.id}>
                <button
                  type="button"
                  style={{ ...styles.sidebarItem, ...(isActive ? styles.sidebarItemActive : {}) }}
                  onClick={() => onSelect({ type: "workspace", id: ws.id, name: ws.name })}
                >
                  <Avatar imageUrl={ws.imageUrl} name={ws.name} />
                  <span style={styles.sidebarItemName}>{ws.name}</span>
                  {unread > 0 && <span style={styles.unreadBadge}>{unread > 99 ? "99+" : unread}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p style={styles.sidebarGroupTitle}>แชทส่วนตัว</p>
      {friends.length === 0 ? (
        <p style={styles.sidebarEmpty}>ยังไม่มีเพื่อน</p>
      ) : (
        <ul style={styles.sidebarList}>
          {friends.map((f) => {
            const isActive = selected?.type === "dm" && selected.id === f.id;
            const unread = unreadCounts[`dm:${f.id}`] || 0;
            const isOnline = onlineUserIds?.has(f.id);
            return (
              <li key={f.id}>
                {/* A <div role="button"> instead of a real <button> — the
                    avatar inside is its own clickable "view profile" target
                    (stopping propagation so it doesn't also select the DM),
                    and a <button> can't contain another interactive
                    control without being invalid HTML. */}
                <div
                  role="button"
                  tabIndex={0}
                  style={{ ...styles.sidebarItem, ...(isActive ? styles.sidebarItemActive : {}) }}
                  onClick={() => onSelect({ type: "dm", id: f.id, name: f.name })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect({ type: "dm", id: f.id, name: f.name });
                    }
                  }}
                >
                  <span
                    style={{ ...styles.sidebarAvatarWrap, cursor: "pointer" }}
                    role="button"
                    tabIndex={0}
                    title="ดูโปรไฟล์"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUserProfile(f.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        openUserProfile(f.id);
                      }
                    }}
                  >
                    <Avatar imageUrl={f.avatarUrl} name={f.name} />
                    {isOnline && <span style={styles.onlineDot} title="ออนไลน์" />}
                  </span>
                  <span style={styles.sidebarItemName}>{f.name}</span>
                  {unread > 0 && <span style={styles.unreadBadge}>{unread > 99 ? "99+" : unread}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
