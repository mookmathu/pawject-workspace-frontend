import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import shellStyles from "../../components/common/appShellStyles";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import { useUserProfile } from "../../lib/UserProfileContext";
import {
  getFriends,
  addFriend,
  removeFriend,
  createWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  deleteWorkspace,
  searchUsers,
  uploadWorkspaceImage,
  resolveAvatarUrl,
  joinWorkspaceByCode,
  regenerateWorkspaceJoinCode,
  transferWorkspaceOwnership,
  getMyTasks,
  getUnreadCounts,
  getMoodDay,
} from "../../lib/api";
import { isPopupEnabled, isDismissedToday, todayKey } from "../../lib/mood";
import MoodPopup from "../../components/mood/MoodPopup";
import MoodCard from "../../components/mood/MoodCard";
import { setTaskJump, setChatJump } from "../../lib/navJump";
import Mascot, { MascotNote } from "../../components/common/Mascot";

function formatTaskDueDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

// "overdue" | "soon" | null — same thresholds as the Task board's own
// getDueUrgency, just without needing the board's columns (this list is
// already filtered to not-done tasks server-side).
function getTaskUrgency(dueDate) {
  if (!dueDate) return null;
  const diffMs = new Date(dueDate).getTime() - Date.now();
  if (diffMs < 0) return "overdue";
  if (diffMs <= 24 * 60 * 60 * 1000) return "soon";
  return null;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "ดึกแล้วนะ";
  if (h < 12) return "สวัสดีตอนเช้า";
  if (h < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

// Small reusable "type a username, pick from search results" input.
function UsernameTagInput({ placeholder, onPick, excludeIds = [], inputRef }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const { users } = await searchUsers(query.trim());
        setResults(users.filter((u) => !excludeIds.includes(u.id)));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div style={styles.tagInputWrap}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={styles.tagInput}
      />
      {results.length > 0 && (
        <ul style={styles.tagDropdown}>
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(u);
                  setQuery("");
                  setResults([]);
                }}
                style={styles.tagOption}
              >
                <strong>@{u.username}</strong> {u.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The workspace's photo, with a camera-icon overlay the owner can click to
// replace it — same idea as ProfilePage's own avatar uploader, just scoped
// to one group instead of the account.
function GroupImage({ workspace, isOwner, onUpload }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const imageUrl = resolveAvatarUrl(workspace.imageUrl);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={styles.groupImageWrap}>
      {imageUrl ? (
        <img src={imageUrl} alt={workspace.name} style={styles.groupImage} />
      ) : (
        <span style={styles.groupImagePlaceholder}>{initialOf(workspace.name)}</span>
      )}
      {isOwner && (
        <>
          <button
            type="button"
            style={styles.groupImageEditBtn}
            onClick={(e) => {
              // The image sits inside the card's clickable expand/collapse
              // header — without this, clicking the camera icon would also
              // toggle the card.
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            title="เปลี่ยนรูปกลุ่ม"
            aria-label="เปลี่ยนรูปกลุ่ม"
          >
            {uploading ? "…" : "📷"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { openUserProfile } = useUserProfile();
  const { workspaces, loading: workspacesLoading, refreshWorkspaces } = useWorkspaces();
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard summary — tasks assigned to me across every workspace, and
  // per-conversation unread counts (same shape ChatPage keeps in its own
  // unread badges), fetched once on mount alongside the friends list.
  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(true);
  // undefined = still loading, null = nothing saved for today yet.
  const [todayMood, setTodayMood] = useState(undefined);
  const [moodPopupOpen, setMoodPopupOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [unreadCountsLoading, setUnreadCountsLoading] = useState(true);

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [pendingRequestIds, setPendingRequestIds] = useState([]);
  const [notice, setNotice] = useState("");

  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");

  // Collapsed by default — clicking a card's header expands it to show
  // members/invite/join-code/transfer-Head. Only one open at a time keeps
  // the grid from turning into a wall of detail.
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [transferTargets, setTransferTargets] = useState({}); // { [workspaceId]: userId }
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [user] = useState(getStoredUser);
  const myUserId = user?.id;

  const groupFormRef = useRef(null);
  const newGroupInputRef = useRef(null);
  const friendInputRef = useRef(null);

  // Only friends are fetched here now — the workspace list is shared via
  // WorkspacesContext (fetched once by AppLayout) instead of this page
  // pulling its own copy of the exact same data.
  async function loadFriends() {
    try {
      const { friends } = await getFriends();
      setFriends(friends);
      setError("");
    } catch (err) {
      if (err.status === 401) {
        navigate("/");
        return;
      }
      setError(err.message);
    } finally {
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getMyTasks()
      .then(({ tasks }) => setMyTasks(tasks))
      .catch(() => setMyTasks([]))
      .finally(() => setMyTasksLoading(false));
    getUnreadCounts()
      .then(({ unread }) => setUnreadCounts(unread))
      .catch(() => setUnreadCounts({}))
      .finally(() => setUnreadCountsLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    getMoodDay(todayKey())
      .then(({ entry }) => {
        if (!alive) return;
        setTodayMood(entry);
        if (!entry && isPopupEnabled() && !isDismissedToday()) setMoodPopupOpen(true);
      })
      .catch(() => alive && setTodayMood(undefined));
    return () => {
      alive = false;
    };
  }, []);

  const loading = friendsLoading || workspacesLoading;

  async function handleAddFriend(user) {
    try {
      setNotice("");
      const result = await addFriend(user.username);
      if (result?.request) {
        // Different university/organization — needs the other person to accept.
        setPendingRequestIds((prev) => [...prev, result.request.id]);
        setNotice(`ส่งคำขอเป็นเพื่อนถึง @${result.request.username} แล้ว รอการยืนยัน`);
      } else {
        loadFriends();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveFriend(userId) {
    try {
      await removeFriend(userId);
      loadFriends();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      await createWorkspace(name);
      setNewGroupName("");
      setCreatingGroup(false);
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleInviteToGroup(workspaceId, user) {
    try {
      await addWorkspaceMember(workspaceId, user.username);
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveGroupMember(workspaceId, userId) {
    try {
      await removeWorkspaceMember(workspaceId, userId);
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUploadGroupImage(workspaceId, file) {
    try {
      await uploadWorkspaceImage(workspaceId, file);
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleJoinByCode() {
    const code = joinCodeInput.trim();
    if (!code) return;
    setJoinCodeError("");
    try {
      const { workspace } = await joinWorkspaceByCode(code);
      setJoinCodeInput("");
      setJoiningByCode(false);
      await refreshWorkspaces();
      setExpandedGroupId(workspace.id);
    } catch (err) {
      // Shown next to the code input itself, not the page-level error, so
      // it doesn't get lost among the group cards below.
      setJoinCodeError(err.message);
    }
  }

  async function handleRegenerateJoinCode(workspaceId) {
    try {
      await regenerateWorkspaceJoinCode(workspaceId);
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCopyJoinCode(workspaceId, code) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedCodeId(workspaceId);
      setTimeout(() => setCopiedCodeId((prev) => (prev === workspaceId ? null : prev)), 1500);
    });
  }

  async function handleTransferOwnership(workspaceId) {
    const targetUserId = transferTargets[workspaceId];
    if (!targetUserId) return;
    try {
      await transferWorkspaceOwnership(workspaceId, targetUserId);
      setTransferTargets((prev) => ({ ...prev, [workspaceId]: "" }));
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    }
  }

  function closeGroupModal() {
    setExpandedGroupId(null);
    setConfirmingDeleteId(null);
  }

  // Two-step (an inline "แน่ใจนะ?" row, not a browser confirm()) since this
  // also deletes the group's board and every task on it — the backend does
  // that cascade itself, this just makes sure a stray click doesn't trigger it.
  async function handleDeleteWorkspace(workspaceId) {
    setDeletingId(workspaceId);
    try {
      await deleteWorkspace(workspaceId);
      closeGroupModal();
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // A non-owner's way out of a group — removeWorkspaceMember already allows
  // removing yourself (the backend only blocks the owner from doing this,
  // since an ownerless group can't happen — see workspace.controller.js).
  async function handleLeaveWorkspace(workspaceId) {
    setDeletingId(workspaceId);
    try {
      await removeWorkspaceMember(workspaceId, myUserId);
      closeGroupModal();
      refreshWorkspaces();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // The three quick-action cards double as shortcuts into the sections
  // below, instead of being purely decorative like the old static Dashboard
  // mockup — opening the create-group form, jumping to (and focusing) the
  // add-friend input, or heading straight to chat.
  function handleQuickCreateWorkspace() {
    setCreatingGroup(true);
    requestAnimationFrame(() => {
      groupFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      newGroupInputRef.current?.focus();
    });
  }

  function handleQuickInviteFriend() {
    friendInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    friendInputRef.current?.focus();
  }

  const groupWorkspaces = workspaces.filter((w) => !w.isPersonal);
  const friendIds = [...friends.map((f) => f.id), ...pendingRequestIds];

  // One row per conversation with unread messages — group workspaces and
  // DMs share the same "workspace:<id>" / "dm:<id>" key shape the chat
  // unread-badge map already uses, so this just looks each one up.
  const unreadEntries = [
    ...groupWorkspaces
      .filter((w) => unreadCounts[`workspace:${w.id}`])
      .map((w) => ({ type: "workspace", id: w.id, name: w.name, count: unreadCounts[`workspace:${w.id}`] })),
    ...friends
      .filter((f) => unreadCounts[`dm:${f.id}`])
      .map((f) => ({ type: "dm", id: f.id, name: f.name, count: unreadCounts[`dm:${f.id}`] })),
  ];

  const totalUnread = unreadEntries.reduce((sum, e) => sum + e.count, 0);

  if (loading) {
    return <p style={styles.loadingText}>กำลังโหลด...</p>;
  }

  return (
    <>
      {error && <p style={styles.errorText}>{error}</p>}

      {/* --- Hero: greeting + what needs attention + quick actions --- */}
      <style>{`
        .home-card { transition: transform 120ms ease, box-shadow 120ms ease; }
        .home-card:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 0 var(--ink); }
        .home-row { transition: background-color 120ms ease; }
        .home-row:hover { background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-surface)) !important; }
        @media (max-width: 700px) { .home-hero-stats { flex: 1 1 100% !important; grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 480px) { .home-hero-stats { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
      <section className="home-hero" style={styles.hero}>
        <div style={styles.heroText}>
          <p style={styles.heroDate}>
            {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 style={styles.heroTitle}>
            {greeting()}, {(user?.name || "เพื่อน").split(" ")[0]} 👋
          </h1>
          <p style={styles.heroSub}>
            {myTasksLoading || unreadCountsLoading
              ? "กำลังดูว่าวันนี้มีอะไรรออยู่..."
              : myTasks.length === 0 && totalUnread === 0
                ? "วันนี้ไม่มีงานค้างและไม่มีข้อความรอ — ใช้เวลาให้คุ้มนะ ✨"
                : `มี ${myTasks.length} งานที่ยังค้างอยู่ และ ${totalUnread} ข้อความที่ยังไม่อ่าน`}
          </p>
          <div style={styles.heroActions}>
            <button type="button" className="doodle-btn" style={styles.heroPrimary} onClick={handleQuickCreateWorkspace}>
              ⊕ สร้างกลุ่มใหม่
            </button>
            <button type="button" style={styles.heroChip} onClick={() => { setJoiningByCode(true); setJoinCodeError(""); }}>
              🔑 เข้าร่วมด้วยรหัส
            </button>
            <button type="button" style={styles.heroChip} onClick={handleQuickInviteFriend}>
              🤝 เพิ่มเพื่อน
            </button>
            <button type="button" style={styles.heroChip} onClick={() => navigate("/chat")}>
              💬 ไปที่แชท
            </button>
          </div>
        </div>
        <div className="home-hero-stats" style={styles.heroStats}>
          {[
            { icon: "👥", value: groupWorkspaces.length, label: "กลุ่ม" },
            { icon: "🤝", value: friends.length, label: "เพื่อน" },
            { icon: "📌", value: myTasksLoading ? "–" : myTasks.length, label: "งานค้าง" },
            { icon: "💬", value: unreadCountsLoading ? "–" : totalUnread, label: "ยังไม่อ่าน" },
          ].map((x) => (
            <div key={x.label} style={styles.heroStat}>
              <span style={styles.heroStatIcon}>{x.icon}</span>
              <span style={styles.heroStatValue}>{x.value}</span>
              <span style={styles.heroStatLabel}>{x.label}</span>
            </div>
          ))}
        </div>
      </section>

      <MoodCard entry={todayMood} onChange={setTodayMood} />
      {moodPopupOpen && <MoodPopup onClose={() => setMoodPopupOpen(false)} onSaved={setTodayMood} />}

      {/* --- Needs attention: due soon + unread --- */}
      <section style={shellStyles.section}>
        <div style={styles.dashboardGrid}>
          <div className="card-clean home-card" style={{ ...styles.dashboardCard, ...styles.attnTasks }}>
            <div style={styles.attnHead}>
              <p style={styles.dashboardCardTitle}>📋 งานใกล้ครบกำหนด</p>
              {myTasks.length > 0 && <span style={styles.countPill}>{myTasks.length}</span>}
            </div>
            {myTasksLoading ? (
              <p style={styles.dashboardEmpty}>กำลังโหลด...</p>
            ) : myTasks.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Mascot name="ears" width={64} anim="wiggle" />
                <p style={{ ...styles.dashboardEmpty, margin: 0 }}>ไม่มีงานที่ต้องทำตอนนี้ 🎉</p>
              </div>
            ) : (
              <ul style={styles.dashboardList}>
                {myTasks.slice(0, 5).map((t) => {
                  const urgency = getTaskUrgency(t.dueDate);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="home-row"
                        style={styles.dashboardTaskRow}
                        onClick={() => {
                          setTaskJump({ workspaceId: t.workspaceId, taskId: t.id });
                          navigate("/task");
                        }}
                      >
                        <span style={{ ...styles.urgencyDot, background: urgency ? "#E0473E" : "var(--ink-faint)" }} />
                        <span style={styles.rowMain}>
                          <span style={styles.dashboardTaskTitle}>{t.title}</span>
                          <span style={styles.dashboardTaskMeta}>{t.workspaceName}</span>
                        </span>
                        {t.dueDate && (
                          <span style={{ ...styles.duePill, ...(urgency ? styles.duePillUrgent : {}) }}>
                            {formatTaskDueDate(t.dueDate)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {myTasks.length > 5 && (
              <button type="button" style={styles.moreLink} onClick={() => navigate("/task")}>
                ดูทั้งหมด {myTasks.length} งาน →
              </button>
            )}
          </div>

          <div className="card-clean home-card" style={{ ...styles.dashboardCard, ...styles.attnChat }}>
            <div style={styles.attnHead}>
              <p style={styles.dashboardCardTitle}>💬 ข้อความที่ยังไม่อ่าน</p>
              {totalUnread > 0 && <span style={styles.countPill}>{totalUnread > 99 ? "99+" : totalUnread}</span>}
            </div>
            {unreadCountsLoading ? (
              <p style={styles.dashboardEmpty}>กำลังโหลด...</p>
            ) : unreadEntries.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Mascot name="reader" width={58} anim="float" />
                <p style={{ ...styles.dashboardEmpty, margin: 0 }}>อ่านหมดแล้ว ไม่มีข้อความค้าง ☕</p>
              </div>
            ) : (
              <ul style={styles.dashboardList}>
                {unreadEntries.map((entry) => (
                  <li key={`${entry.type}-${entry.id}`}>
                    <button
                      type="button"
                      className="home-row"
                      style={styles.dashboardTaskRow}
                      onClick={() => {
                        setChatJump({ type: entry.type, id: entry.id, name: entry.name });
                        navigate("/chat");
                      }}
                    >
                      <span style={styles.chatInitial}>{initialOf(entry.name)}</span>
                      <span style={styles.rowMain}>
                        <span style={styles.dashboardTaskTitle}>{entry.name}</span>
                        <span style={styles.dashboardTaskMeta}>{entry.type === "workspace" ? "แชทกลุ่ม" : "ข้อความส่วนตัว"}</span>
                      </span>
                      <span style={styles.dashboardUnreadBadge}>{entry.count > 99 ? "99+" : entry.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* --- Work groups section --- */}
      <section style={shellStyles.section}>
        <div style={styles.groupHeaderRow}>
          <h2 style={{ ...shellStyles.sectionTitle, margin: 0 }}>Workspace ของคุณ <span style={styles.titleCount}>{groupWorkspaces.length}</span></h2>
          <div style={styles.groupHeaderActions}>
            {!joiningByCode && (
              <button
                type="button"
                onClick={() => {
                  setJoiningByCode(true);
                  setJoinCodeError("");
                }}
                style={styles.newGroupBtn}
              >
                เข้าร่วมด้วยรหัส
              </button>
            )}
            {!creatingGroup && (
              <button type="button" onClick={() => setCreatingGroup(true)} style={styles.newGroupBtn}>
                + สร้างกลุ่มใหม่
              </button>
            )}
          </div>
        </div>

        {joiningByCode && (
          <div className="card-clean" style={{ ...styles.card, marginBottom: 16 }}>
            <div style={styles.newGroupRow}>
              <input
                autoFocus
                type="text"
                placeholder="กรอกรหัสเข้ากลุ่ม 6 หลัก"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                style={{ ...styles.newGroupInput, textTransform: "uppercase" }}
                maxLength={6}
              />
              <button type="button" onClick={handleJoinByCode} style={styles.addBtn}>
                เข้าร่วม
              </button>
              <button
                type="button"
                onClick={() => {
                  setJoiningByCode(false);
                  setJoinCodeInput("");
                  setJoinCodeError("");
                }}
                style={styles.cancelBtn}
              >
                ยกเลิก
              </button>
            </div>
            {joinCodeError && <p style={styles.errorText}>{joinCodeError}</p>}
          </div>
        )}

        {creatingGroup && (
          <div ref={groupFormRef} className="card-clean" style={{ ...styles.card, marginBottom: 16 }}>
            <div style={styles.newGroupRow}>
              <input
                ref={newGroupInputRef}
                autoFocus
                type="text"
                placeholder="ชื่อกลุ่ม เช่น โปรเจกต์จบ"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                style={styles.newGroupInput}
              />
              <button type="button" onClick={handleCreateGroup} style={styles.addBtn}>
                สร้าง
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingGroup(false);
                  setNewGroupName("");
                }}
                style={styles.cancelBtn}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {groupWorkspaces.length === 0 && !creatingGroup ? (
          <div className="card-clean" style={shellStyles.emptyState}>
            <Mascot name="puppy" width={92} anim="bounce" shadow style={{ marginBottom: 12 }} />
            <p style={shellStyles.emptyStateText}>ยังไม่มี Workspace ที่นี่ — สร้างอันแรกของคุณกันเลย</p>
            <button type="button" className="doodle-btn" style={shellStyles.emptyStateBtn} onClick={() => setCreatingGroup(true)}>
              สร้าง Workspace
            </button>
          </div>
        ) : (
          <div style={styles.groupsGrid}>
            {groupWorkspaces.map((ws) => (
              // A <div role="button"> rather than a real <button> — GroupImage
              // renders its own edit <button> for the owner, and a <button>
              // can't legally contain another <button>.
              <div
                key={ws.id}
                role="button"
                tabIndex={0}
                className="card-clean home-card"
                style={styles.groupCardBtn}
                onClick={() => setExpandedGroupId(ws.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedGroupId(ws.id);
                  }
                }}
              >
                <div style={styles.groupCardHeader}>
                  <GroupImage
                    workspace={ws}
                    isOwner={ws.ownerId === myUserId}
                    onUpload={(file) => handleUploadGroupImage(ws.id, file)}
                  />
                  <span style={styles.groupCardHeaderInfo}>
                    <span style={{ ...styles.groupName, margin: 0 }}>{ws.name}</span>
                    <span style={ws.ownerId === myUserId ? styles.roleHead : styles.roleMember}>
                      {ws.ownerId === myUserId ? "👑 Head" : "สมาชิก"}
                    </span>
                  </span>
                </div>
                <div style={styles.groupCardMeta}>
                  <span style={styles.avatarStack}>
                    {(ws.members || []).slice(0, 4).map((m, i) => (
                      <span key={m.user?.id || i} style={{ ...styles.stackAvatar, marginLeft: i ? -8 : 0 }} title={m.user?.name}>
                        {initialOf(m.user?.name)}
                      </span>
                    ))}
                    {(ws.members || []).length > 4 && (
                      <span style={{ ...styles.stackAvatar, marginLeft: -8, background: "var(--bg-page)", color: "var(--ink)" }}>
                        +{ws.members.length - 4}
                      </span>
                    )}
                  </span>
                  <span style={styles.groupMemberCount}>{ws.members.length} สมาชิก</span>
                </div>
                <div style={styles.groupCardChips}>
                  {(() => {
                    const mine = myTasks.filter((t) => t.workspaceId === ws.id).length;
                    const unread = unreadCounts[`workspace:${ws.id}`] || 0;
                    return (
                      <>
                        <span style={styles.miniChip}>📌 งานของฉัน {mine}</span>
                        {unread > 0 && <span style={{ ...styles.miniChip, ...styles.miniChipAlert }}>💬 {unread > 99 ? "99+" : unread}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- Group detail popup — opens on top instead of pushing the grid
          around, so clicking one card never shifts another. --- */}
      {expandedGroupId &&
        (() => {
          const ws = groupWorkspaces.find((w) => w.id === expandedGroupId);
          if (!ws) return null;
          const isOwner = ws.ownerId === myUserId;
          const otherMembers = ws.members.filter((m) => m.user.id !== ws.ownerId);
          return (
            <div style={styles.modalOverlay} onClick={closeGroupModal}>
              <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={closeGroupModal}
                  style={styles.modalCloseBtn}
                  title="ปิด"
                >
                  ×
                </button>

                <div style={styles.groupCardHeader}>
                  <GroupImage
                    workspace={ws}
                    isOwner={isOwner}
                    onUpload={(file) => handleUploadGroupImage(ws.id, file)}
                  />
                  <span style={styles.groupCardHeaderInfo}>
                    <span style={{ ...styles.groupName, margin: 0, fontSize: 19 }}>{ws.name}</span>
                    <span style={styles.groupMemberCount}>{ws.members.length} สมาชิก</span>
                  </span>
                </div>

                <div style={styles.groupCardBody}>
                  <ul style={styles.memberList}>
                    {ws.members.map((m) => (
                      <li key={m.id} style={styles.memberRow}>
                        <span
                          role="button"
                          tabIndex={0}
                          style={{ ...styles.memberChip, cursor: "pointer" }}
                          onClick={() => openUserProfile(m.user.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openUserProfile(m.user.id);
                            }
                          }}
                          title="ดูโปรไฟล์"
                        >
                          {m.user.avatarUrl ? (
                            <img src={resolveAvatarUrl(m.user.avatarUrl)} alt={m.user.name} style={styles.memberAvatar} />
                          ) : (
                            <span style={styles.memberAvatarPlaceholder}>{initialOf(m.user.name)}</span>
                          )}
                          @{m.user.username}
                          {m.role === "owner" && <span style={styles.ownerTag}>เจ้าของ</span>}
                        </span>
                        {m.role !== "owner" && isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveGroupMember(ws.id, m.user.id)}
                            style={styles.removeBtn}
                            title="ลบออกจากกลุ่ม"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <UsernameTagInput
                    placeholder="เชิญเพื่อนด้วย username..."
                    onPick={(u) => handleInviteToGroup(ws.id, u)}
                    excludeIds={ws.members.map((m) => m.user.id)}
                  />

                  {ws.joinCode && (
                    <div style={styles.joinCodeBox}>
                      <div>
                        <p style={styles.joinCodeLabel}>รหัสเข้ากลุ่ม</p>
                        <p style={styles.joinCodeValue}>{ws.joinCode}</p>
                      </div>
                      <div style={styles.joinCodeActions}>
                        <button
                          type="button"
                          style={styles.joinCodeBtn}
                          onClick={() => handleCopyJoinCode(ws.id, ws.joinCode)}
                        >
                          {copiedCodeId === ws.id ? "คัดลอกแล้ว" : "คัดลอก"}
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            style={styles.joinCodeBtn}
                            onClick={() => handleRegenerateJoinCode(ws.id)}
                            title="สร้างรหัสใหม่ (รหัสเดิมจะใช้ไม่ได้อีก)"
                          >
                            สร้างรหัสใหม่
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {isOwner && otherMembers.length > 0 && (
                    <div style={styles.transferBox}>
                      <p style={styles.transferLabel}>โอนสิทธิ์ Head ให้สมาชิกคนอื่น</p>
                      <div style={styles.transferRow}>
                        <select
                          value={transferTargets[ws.id] || ""}
                          onChange={(e) => setTransferTargets((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                          style={styles.transferSelect}
                        >
                          <option value="">เลือกสมาชิก...</option>
                          {otherMembers.map((m) => (
                            <option key={m.user.id} value={m.user.id}>
                              @{m.user.username}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          style={styles.joinCodeBtn}
                          disabled={!transferTargets[ws.id]}
                          onClick={() => handleTransferOwnership(ws.id)}
                        >
                          โอนสิทธิ์
                        </button>
                      </div>
                      <p style={styles.transferNote}>
                        หลังโอนแล้ว คุณจะกลายเป็นสมาชิกทั่วไป และไม่สามารถโอนกลับเองได้ทันที
                      </p>
                    </div>
                  )}

                  {/* Every group has a way out of it here — Head deletes
                      the whole group, anyone else just leaves it. */}
                  <div style={styles.dangerBox}>
                    {confirmingDeleteId === ws.id ? (
                      <>
                        <p style={styles.dangerConfirmText}>
                          {isOwner
                            ? `ลบกลุ่ม "${ws.name}" ใช่ไหม? บอร์ดและงานทั้งหมดในกลุ่มจะถูกลบไปด้วย และกู้คืนไม่ได้`
                            : `ออกจากกลุ่ม "${ws.name}" ใช่ไหม?`}
                        </p>
                        <div style={styles.transferRow}>
                          <button
                            type="button"
                            style={styles.dangerConfirmBtn}
                            disabled={deletingId === ws.id}
                            onClick={() =>
                              isOwner ? handleDeleteWorkspace(ws.id) : handleLeaveWorkspace(ws.id)
                            }
                          >
                            {deletingId === ws.id ? "กำลังดำเนินการ..." : isOwner ? "ยืนยันลบกลุ่ม" : "ยืนยันออกจากกลุ่ม"}
                          </button>
                          <button type="button" style={styles.cancelBtn} onClick={() => setConfirmingDeleteId(null)}>
                            ยกเลิก
                          </button>
                        </div>
                      </>
                    ) : (
                      <button type="button" style={styles.dangerBtn} onClick={() => setConfirmingDeleteId(ws.id)}>
                        {isOwner ? "ลบกลุ่มนี้" : "ออกจากกลุ่ม"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* --- Friends section --- */}
      <section style={shellStyles.section}>
        <h2 style={shellStyles.sectionTitle}>เพื่อน <span style={styles.titleCount}>{friends.length}</span></h2>
        <div className="card-clean" style={styles.card}>
          <UsernameTagInput
            inputRef={friendInputRef}
            placeholder="พิมพ์ username เพื่อเพิ่มเพื่อน..."
            onPick={handleAddFriend}
            excludeIds={friendIds}
          />
          {notice && <p style={styles.noticeText}>{notice}</p>}

          {friends.length === 0 ? (
            <MascotNote name="puppy" width={70} text="ยังไม่มีเพื่อนเลย" sub="ลองพิมพ์ username ด้านบนดูสิ" />
          ) : (
            <ul style={styles.friendList}>
              {friends.map((f) => (
                <li key={f.id} style={styles.friendRow}>
                  <div
                    role="button"
                    tabIndex={0}
                    style={{ ...styles.friendInfo, cursor: "pointer" }}
                    onClick={() => openUserProfile(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openUserProfile(f.id);
                      }
                    }}
                    title="ดูโปรไฟล์"
                  >
                    {f.avatarUrl ? (
                      <img src={resolveAvatarUrl(f.avatarUrl)} alt={f.name} style={styles.friendAvatarImg} />
                    ) : (
                      <span style={styles.friendAvatar}>{initialOf(f.name)}</span>
                    )}
                    <div>
                      <p style={styles.friendName}>{f.name}</p>
                      <p style={styles.friendUsername}>@{f.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(f.id)}
                    style={styles.removeBtn}
                    title="ลบเพื่อน"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

const styles = {
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 28,
    flexWrap: "wrap",
    padding: "28px 30px",
    marginBottom: 32,
    background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-color) 16%, var(--bg-surface)) 0%, color-mix(in srgb, #F4B740 16%, var(--bg-surface)) 100%)",
    border: "2.5px solid var(--ink)",
    borderRadius: "30px 24px 28px 24px / 24px 30px 24px 28px",
    boxShadow: "5px 5px 0 0 var(--ink)",
    boxSizing: "border-box",
  },
  heroText: { flex: "1 1 340px", minWidth: 0 },
  heroDate: { fontFamily: "'Itim', cursive", fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 4px" },
  heroTitle: { fontFamily: "'Itim', cursive", fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 700, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.2 },
  heroSub: { fontFamily: "'Itim', cursive", fontSize: 15, color: "var(--ink-soft)", margin: "0 0 18px" },
  heroActions: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  heroPrimary: { fontSize: 14.5, fontWeight: 700, color: "#FFFDF8", background: "var(--accent-color)", padding: "10px 20px", whiteSpace: "nowrap" },
  heroChip: { fontFamily: "'Itim', cursive", fontSize: 13.5, fontWeight: 700, color: "var(--ink)", background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 999, padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap" },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(2, minmax(96px, 1fr))", gap: 12, alignSelf: "center", flex: "0 1 260px" },
  heroStat: { background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 16, padding: "10px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 },
  heroStatIcon: { fontSize: 16 },
  heroStatValue: { fontFamily: "'Itim', cursive", fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1.15 },
  heroStatLabel: { fontFamily: "'Itim', cursive", fontSize: 12, color: "var(--ink-soft)" },

  attnTasks: { background: "color-mix(in srgb, #E0473E 5%, var(--bg-surface))" },
  attnChat: { background: "color-mix(in srgb, var(--accent-color) 6%, var(--bg-surface))" },
  attnHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  countPill: { fontFamily: "'Itim', cursive", fontSize: 12, fontWeight: 700, color: "#FFFDF8", background: "var(--accent-color)", borderRadius: 999, padding: "1px 10px", minWidth: 20, textAlign: "center" },
  urgencyDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  rowMain: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1, textAlign: "left" },
  duePill: { fontFamily: "'Itim', cursive", fontSize: 12, fontWeight: 700, color: "var(--ink)", background: "color-mix(in srgb, var(--ink) 8%, var(--bg-surface))", borderRadius: 999, padding: "2px 10px", flexShrink: 0, whiteSpace: "nowrap" },
  duePillUrgent: { color: "#C23B33", background: "color-mix(in srgb, #E0473E 18%, var(--bg-surface))" },
  chatInitial: { width: 30, height: 30, borderRadius: "50%", background: "var(--accent-color)", color: "#FFFDF8", border: "2px solid var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 },
  moreLink: { fontFamily: "'Itim', cursive", fontSize: 13, fontWeight: 700, color: "var(--accent-color)", background: "none", border: "none", cursor: "pointer", padding: "10px 0 0" },

  titleCount: { fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", background: "color-mix(in srgb, var(--ink) 8%, var(--bg-surface))", borderRadius: 999, padding: "1px 10px", marginLeft: 6, verticalAlign: "middle" },

  groupCardMeta: { display: "flex", alignItems: "center", gap: 10, marginTop: 14 },
  avatarStack: { display: "flex", alignItems: "center" },
  stackAvatar: { width: 26, height: 26, borderRadius: "50%", background: "var(--accent-color)", color: "#FFFDF8", border: "2px solid var(--bg-surface)", boxShadow: "0 0 0 1px var(--ink)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" },
  groupCardChips: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 },
  miniChip: { fontFamily: "'Itim', cursive", fontSize: 12, color: "var(--ink-soft)", background: "color-mix(in srgb, var(--ink) 7%, var(--bg-surface))", borderRadius: 999, padding: "3px 10px" },
  miniChipAlert: { color: "#FFFDF8", background: "var(--accent-color)", fontWeight: 700 },
  roleHead: { fontFamily: "'Itim', cursive", fontSize: 11.5, fontWeight: 700, color: "var(--ink)", background: "color-mix(in srgb, #F4B740 35%, var(--bg-surface))", borderRadius: 999, padding: "1px 9px" },
  roleMember: { fontFamily: "'Itim', cursive", fontSize: 11.5, color: "var(--ink-soft)", background: "color-mix(in srgb, var(--ink) 8%, var(--bg-surface))", borderRadius: 999, padding: "1px 9px" },

  loadingText: {
    fontFamily: "'Itim', cursive",
    color: "var(--ink-faint)",
    fontSize: 16,
    textAlign: "center",
    padding: "40px 0",
  },
  errorText: {
    color: "#E0473E",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  noticeText: {
    color: "var(--accent-color)",
    fontSize: 13,
    fontWeight: 600,
    margin: "10px 0 0",
  },
  card: {
    border: "2px solid var(--ink)",
    padding: "20px 22px",
    boxSizing: "border-box",
  },
  emptyText: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink-faint)",
    margin: "12px 0 0",
  },

  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
  dashboardCard: {
    border: "2px solid var(--ink)",
    padding: "20px 22px",
    boxSizing: "border-box",
  },
  dashboardCardTitle: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 16,
    color: "var(--ink)",
    margin: "0 0 12px",
  },
  dashboardEmpty: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    color: "var(--ink-faint)",
    margin: 0,
  },
  dashboardList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  dashboardTaskRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    width: "100%",
    textAlign: "left",
    background: "color-mix(in srgb, var(--ink) 6%, var(--bg-surface))",
    border: "none",
    borderRadius: 12,
    padding: "9px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  dashboardTaskTitle: {
    fontFamily: "'Itim', cursive",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--ink)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
  dashboardTaskMeta: {
    fontFamily: "'Itim', cursive",
    fontSize: 11.5,
    color: "var(--ink-soft)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dashboardTaskDueUrgent: {
    color: "#E0473E",
    fontWeight: 700,
  },
  dashboardUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    background: "var(--accent-color)",
    color: "#FFFDF8",
    fontSize: 11,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6px",
    flexShrink: 0,
  },

  // Quick-action cards are buttons now (clickable shortcuts), styled to
  // look exactly like the plain actionCard div they replace.
  actionCardBtn: {
    border: "2px solid var(--ink)",
    padding: "26px 22px",
    boxSizing: "border-box",
    background: "var(--bg-surface)",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  },

  tagInputWrap: {
    position: "relative",
  },
  tagInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink)",
    border: "2px solid #E7E2D6",
    borderRadius: 10,
    padding: "10px 14px",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
  },
  tagDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 var(--ink)",
    listStyle: "none",
    margin: 0,
    padding: 4,
    zIndex: 10,
    maxHeight: 180,
    overflowY: "auto",
  },
  tagOption: {
    display: "block",
    width: "100%",
    textAlign: "left",
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    padding: "8px 10px",
    cursor: "pointer",
  },

  friendList: {
    listStyle: "none",
    margin: "16px 0 0",
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: 10,
  },
  friendRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "color-mix(in srgb, var(--ink) 6%, var(--bg-surface))",
    border: "1.5px solid color-mix(in srgb, var(--ink) 14%, var(--bg-surface))",
    borderRadius: 14,
  },
  friendInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#F4B740",
    border: "2px solid var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#353B46",
    flexShrink: 0,
  },
  friendAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "2px solid var(--ink)",
    objectFit: "cover",
    flexShrink: 0,
  },
  friendName: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 14,
    color: "var(--ink)",
    margin: 0,
  },
  friendUsername: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-soft)",
    margin: 0,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--ink-faint)",
    fontSize: 20,
    lineHeight: 1,
    cursor: "pointer",
    padding: 4,
  },

  groupHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  groupHeaderActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  newGroupBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--ink-soft)",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
  },
  newGroupRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  newGroupInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink)",
    border: "2px solid #E7E2D6",
    borderRadius: 10,
    padding: "10px 14px",
    flex: 1,
    minWidth: 180,
    boxSizing: "border-box",
    outline: "none",
  },
  addBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "var(--accent-color)",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
  },
  cancelBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "var(--ink-faint)",
    background: "transparent",
    border: "none",
    padding: "10px 8px",
    cursor: "pointer",
  },

  groupsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  // The collapsed card itself is a button — clicking anywhere on it opens
  // the group's detail popup (see modalOverlay/modalSheet below). It no
  // longer grows in place, so opening one card can't nudge its neighbors.
  groupCardBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    padding: "20px 22px",
    boxSizing: "border-box",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  groupCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  groupCardHeaderInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  groupMemberCount: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "var(--ink-faint)",
  },
  // Popup for a group's full detail — same overlay/sheet convention as
  // EventModal/TaskDetailModal, so it looks consistent with the rest of the app.
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(53,59,70,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modalSheet: {
    position: "relative",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 20,
    boxShadow: "6px 6px 0 0 var(--ink)",
    width: "100%",
    maxWidth: 440,
    maxHeight: "88vh",
    overflowY: "auto",
    padding: "32px 28px 26px",
    boxSizing: "border-box",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 18,
    background: "transparent",
    border: "none",
    fontSize: 24,
    color: "var(--ink-faint)",
    cursor: "pointer",
    lineHeight: 1,
  },
  groupCardBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "2px solid #EFEAE0",
  },
  joinCodeBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
    padding: "10px 14px",
    background: "#F6F3EC",
    borderRadius: 12,
    flexWrap: "wrap",
  },
  joinCodeLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 12,
    color: "#8A8071",
    margin: 0,
  },
  joinCodeValue: {
    fontFamily: "'Itim', cursive",
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 2,
    color: "var(--ink)",
    margin: "2px 0 0",
  },
  joinCodeActions: {
    display: "flex",
    gap: 8,
  },
  joinCodeBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--ink-soft)",
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
  },
  transferBox: {
    marginTop: 14,
    padding: "10px 14px",
    background: "#F6F3EC",
    borderRadius: 12,
  },
  transferLabel: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--ink)",
    margin: "0 0 8px",
  },
  transferRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  transferSelect: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
    border: "2px solid #E7E2D6",
    borderRadius: 10,
    padding: "8px 10px",
    flex: 1,
    minWidth: 140,
  },
  transferNote: {
    fontFamily: "'Itim', cursive",
    fontSize: 11.5,
    color: "var(--ink-faint)",
    margin: "8px 0 0",
    lineHeight: 1.5,
  },
  dangerBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: "2px dashed #EFEAE0",
  },
  dangerBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#E0473E",
    background: "transparent",
    border: "2px solid #E0473E",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
  },
  dangerConfirmText: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "#E0473E",
    margin: "0 0 10px",
    lineHeight: 1.5,
  },
  dangerConfirmBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "#E0473E",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
  },
  groupImageWrap: {
    position: "relative",
    flexShrink: 0,
    width: 48,
    height: 48,
  },
  groupImage: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "2px solid var(--ink)",
    objectFit: "cover",
    display: "block",
  },
  groupImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "var(--accent-color)",
    border: "2px solid var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
    color: "#FFFDF8",
  },
  groupImageEditBtn: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "var(--bg-surface)",
    border: "1.5px solid var(--ink)",
    fontSize: 11,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  groupName: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 17,
    color: "var(--ink)",
  },
  memberList: {
    listStyle: "none",
    margin: "0 0 14px",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  memberRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    color: "var(--ink)",
  },
  memberAvatar: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "1.5px solid var(--ink)",
    objectFit: "cover",
  },
  memberAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "var(--accent-color)",
    border: "1.5px solid var(--ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#FFFDF8",
  },
  ownerTag: {
    fontSize: 10.5,
    fontWeight: 700,
    color: "#8A5A1B",
    background: "#FCE8C2",
    borderRadius: 999,
    padding: "1px 8px",
  },
};
