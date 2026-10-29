import React, { useEffect, useRef, useState } from "react";
import UserAvatar from "../../components/common/UserAvatar";
import { useNavigate, useSearchParams } from "react-router-dom";
import shellStyles from "../../components/common/appShellStyles";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import { useUserProfile } from "../../lib/UserProfileContext";
import {
  getFriends,
  addFriend,
  getMe,
  setMyFriendId,
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
import { CrownIcon, PawPinIcon, CameraIcon, ChatBubbleIcon } from "../../components/common/DoodleIcons";
import DachFrame from "../../components/common/DachFrame";
import { focusOnMount } from "../../lib/focus";

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

// "My friend ID" card — the ID other people type to add me. Created by the
// user (first one free, then up to 2 changes per account).
const MAX_FRIEND_ID_CHANGES = 2;
function MyFriendId() {
  const [state, setState] = useState({ loading: true, friendId: null, changesLeft: MAX_FRIEND_ID_CHANGES });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    getMe()
      .then(({ user }) => {
        if (!alive) return;
        setState({
          loading: false,
          friendId: user.friendId || null,
          changesLeft: Math.max(0, MAX_FRIEND_ID_CHANGES - (user.friendIdChangeCount || 0)),
        });
      })
      .catch(() => alive && setState((s) => ({ ...s, loading: false })));
    return () => {
      alive = false;
    };
  }, []);

  const hasId = !!state.friendId;
  const canEdit = !hasId || state.changesLeft > 0;
  const valid = /^[a-z0-9_]{4,20}$/.test(draft);

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    setErr("");
    try {
      const res = await setMyFriendId(draft);
      setState({ loading: false, friendId: res.friendId, changesLeft: res.changesLeft });
      setEditing(false);
    } catch (e) {
      setErr(e.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(state.friendId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the ID is visible anyway
    }
  }

  return (
    <div style={styles.myIdBox}>
      <div style={styles.myIdHead}>
        <span style={styles.myIdLabel}>ID เพิ่มเพื่อนของฉัน</span>
        {!editing && hasId && (
          <button type="button" style={styles.myIdLink} onClick={copy}>
            {copied ? "คัดลอกแล้ว ✓" : "คัดลอก"}
          </button>
        )}
      </div>
      {state.loading ? (
        <p style={styles.myIdHint}>กำลังโหลด...</p>
      ) : editing ? (
        <>
          <div style={styles.myIdRow}>
            <input
              ref={focusOnMount}
              value={draft}
              onChange={(e) => setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="เช่น mathu_01"
              style={styles.myIdInput}
              maxLength={20}
            />
            <button type="button" className="doodle-btn" disabled={!valid || saving} onClick={save}>
              {saving ? "..." : "บันทึก"}
            </button>
            <button type="button" style={styles.myIdLink} onClick={() => { setEditing(false); setErr(""); }}>
              ยกเลิก
            </button>
          </div>
          <p style={styles.myIdHint}>
            4–20 ตัว ใช้ a-z, 0-9 และ _ ได้
            {hasId ? ` · เปลี่ยนได้อีก ${state.changesLeft} ครั้ง` : " · ตั้งครั้งแรกยังไม่นับ และหลังจากนั้นเปลี่ยนได้ 2 ครั้ง"}
          </p>
          {err && <p style={styles.myIdErr}>{err}</p>}
        </>
      ) : hasId ? (
        <div style={styles.myIdRow}>
          <code style={styles.myIdValue}>{state.friendId}</code>
          {canEdit ? (
            <button type="button" style={styles.myIdLink} onClick={() => { setDraft(state.friendId); setEditing(true); }}>
              เปลี่ยน (เหลือ {state.changesLeft} ครั้ง)
            </button>
          ) : (
            <span style={styles.myIdHint}>เปลี่ยนครบแล้ว</span>
          )}
        </div>
      ) : (
        <div style={styles.myIdRow}>
          <span style={styles.myIdHint}>ยังไม่มี ID — สร้างเพื่อให้เพื่อนเพิ่มคุณได้</span>
          <button type="button" className="doodle-btn" onClick={() => { setDraft(""); setEditing(true); }}>
            สร้าง ID
          </button>
        </div>
      )}
    </div>
  );
}

// Add a friend by typing their friend ID.
function AddFriendBox({ onAdd }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    const id = value.trim().replace(/^@/, "");
    if (!id || busy) return;
    setBusy(true);
    const ok = await onAdd(id);
    setBusy(false);
    if (ok) setValue("");
  }
  return (
    <div style={styles.myIdRow}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="พิมพ์ ID ของเพื่อนเพื่อเพิ่ม..."
        style={styles.myIdInput}
      />
      <button type="button" className="doodle-btn" disabled={!value.trim() || busy} onClick={submit}>
        {busy ? "..." : "เพิ่มเพื่อน"}
      </button>
    </div>
  );
}

// The workspace's photo, with a camera-icon overlay the owner can click to
// replace it — same idea as ProfilePage's own avatar uploader, just scoped
// to one group instead of the account.
function GroupImage({ workspace, isOwner, onUpload, size = 48 }) {
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
    <div style={{ ...styles.groupImageWrap, width: size, height: size }}>
      {imageUrl ? (
        <img src={imageUrl} alt={workspace.name} style={{ ...styles.groupImage, width: size, height: size }} />
      ) : (
        <span style={{ ...styles.groupImagePlaceholder, width: size, height: size, fontSize: Math.round(size * 0.38) }}>{initialOf(workspace.name)}</span>
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
            {uploading ? "…" : <CameraIcon size={13} style={{ verticalAlign: "middle" }} />}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "friends" ? "friends" : "groups";
  function switchTab(next) {
    setSearchParams(next === "friends" ? { tab: "friends" } : {}, { replace: true });
  }
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
        void navigate("/");
        return;
      }
      setError(err.message);
    } finally {
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    void loadFriends();
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

  async function handleAddFriend(friendId) {
    try {
      setNotice("");
      setError("");
      const result = await addFriend(friendId);
      if (result?.request) {
        // Different university/organization — needs the other person to accept.
        setNotice(`ส่งคำขอเป็นเพื่อนถึง ${result.request.name} แล้ว รอการยืนยัน`);
      } else {
        void loadFriends();
        setNotice(`เพิ่ม ${result?.friend?.name || "เพื่อน"} เป็นเพื่อนแล้ว`);
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function handleRemoveFriend(userId) {
    try {
      await removeFriend(userId);
      void loadFriends();
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
    void navigator.clipboard?.writeText(code).then(() => {
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

  const groupWorkspaces = workspaces.filter((w) => !w.isPersonal);

  // One row per conversation with unread messages — group workspaces and
  // DMs share the same "workspace:<id>" / "dm:<id>" key shape the chat
  // unread-badge map already uses, so this just looks each one up.
  const unreadEntries = [
    ...groupWorkspaces
      .filter((w) => unreadCounts[`workspace:${w.id}`])
      .map((w) => ({ type: "workspace", id: w.id, name: w.name, count: unreadCounts[`workspace:${w.id}`] })),
    ...friends
      .filter((f) => unreadCounts[`dm:${f.id}`])
      .map((f) => ({ type: "dm", id: f.id, name: f.name, avatarUrl: f.avatarUrl, count: unreadCounts[`dm:${f.id}`] })),
  ];

  const totalUnread = unreadEntries.reduce((sum, e) => sum + e.count, 0);

  if (loading) {
    return <MascotNote name="nap" anim="float" width={140} text="กำลังโหลด..." />;
  }

  return (
    <>
      {error && <p style={styles.errorText}>{error}</p>}

      <style>{`
        .home-card { transition: transform 120ms ease, box-shadow 120ms ease; }
        @media (max-width: 700px) { .ws-grid { grid-template-columns: 1fr !important; } }
        .ws-card:hover { box-shadow: 6px 6px 0 0 var(--ink) !important; transform: translate(-2px, -2px) !important; }
        .home-card:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 0 var(--ink); }
        .home-row { transition: background-color 120ms ease; }
        .home-row:hover { background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-surface)) !important; }
      `}</style>

      <DachFrame height={72} style={{ marginBottom: -3, position: "relative", zIndex: 2 }} />

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
              <MascotNote name="nap" anim="float" width={96} text="กำลังโหลด..." />
            ) : myTasks.length === 0 ? (
              <div>
                <MascotNote name="clerk" anim="sway" width={84} text="ยังไม่มีงานที่ต้องทำตอนนี้" sub="เยี่ยมมาก! ไม่มีงานเร่งด่วนในตอนนี้" style={{ padding: "6px 0 2px" }} />
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
                          void navigate("/task");
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
              <MascotNote name="nap" anim="float" width={96} text="กำลังโหลด..." />
            ) : unreadEntries.length === 0 ? (
              <div>
                <MascotNote name="nap" anim="float" width={132} text="ยังไม่มีข้อความใหม่" sub="พักผ่อนบ้างนะ เดี๋ยวก็มีคนทักมาเอง" style={{ padding: "6px 0 2px" }} />
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
                        void navigate("/chat");
                      }}
                    >
                      <UserAvatar avatarUrl={entry.type === "dm" ? entry.avatarUrl : null} name={entry.name} style={styles.chatInitial} />
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


      <section id="home-groups" style={{ ...shellStyles.section, marginBottom: 14, marginTop: 8 }}>
        <div style={styles.tabs} role="tablist">
          {[
            { id: "groups", label: "กลุ่ม", count: groupWorkspaces.length },
            { id: "friends", label: "เพื่อน", count: friends.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnOn : {}) }}
            >
              {t.label} <span style={styles.tabCount}>{t.count}</span>
            </button>
          ))}
        </div>
      </section>

      {tab === "groups" && (
        <>
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
                ref={focusOnMount}
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
                ref={focusOnMount}
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
            <Mascot name="house" width={92} anim="float" shadow style={{ marginBottom: 12 }} />
            <p style={shellStyles.emptyStateText}>ยังไม่มี Workspace ที่นี่ — สร้างอันแรกของคุณกันเลย</p>
            <button type="button" className="doodle-btn" style={shellStyles.emptyStateBtn} onClick={() => setCreatingGroup(true)}>
              สร้าง Workspace
            </button>
          </div>
        ) : (
          <div className="ws-grid" style={styles.groupsGrid}>
            {groupWorkspaces.map((ws, wi) => (
              // A <div role="button"> rather than a real <button> — GroupImage
              // renders its own edit <button> for the owner, and a <button>
              // can't legally contain another <button>.
              <div
                key={ws.id}
                role="button"
                tabIndex={0}
                className="card-clean home-card ws-card"
                style={{ ...styles.groupCardBtn, background: `color-mix(in srgb, ${WS_TINTS[wi % WS_TINTS.length]} 30%, var(--bg-surface))` }}
                onClick={() => setExpandedGroupId(ws.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpandedGroupId(ws.id);
                  }
                }}
              >
                <span style={styles.wsHole} aria-hidden />
                <span style={styles.wsDeco} aria-hidden>
                  <Mascot name={WS_DECO[wi % WS_DECO.length]} width={WS_DECO[wi % WS_DECO.length] === "bone" ? 54 : 40} />
                </span>
                <div style={styles.wsTop}>
                  <GroupImage
                    workspace={ws}
                    isOwner={ws.ownerId === myUserId}
                    onUpload={(file) => handleUploadGroupImage(ws.id, file)}
                    size={58}
                  />
                  <span style={styles.wsTitleCol}>
                    <span style={{ ...styles.groupName, fontSize: 19, lineHeight: 1.2, wordBreak: "break-word" }}>{ws.name}</span>
                    <span style={{ ...(ws.ownerId === myUserId ? styles.roleHead : styles.roleMember), ...styles.wsRole }}>
                      {ws.ownerId === myUserId ? (<><CrownIcon size={15} style={{ marginRight: 4 }} />Head</>) : "สมาชิก"}
                    </span>
                  </span>
                </div>
                <div style={styles.wsDash} />
                <div style={styles.wsInfo}>
                  <span style={styles.avatarStack}>
                    {(ws.members || []).slice(0, 4).map((m, i) => (
                      <UserAvatar key={m.user?.id || i} avatarUrl={m.user?.avatarUrl} name={m.user?.name} style={{ ...styles.stackAvatar, marginLeft: i ? -8 : 0 }} title={m.user?.name} />
                    ))}
                    {(ws.members || []).length > 4 && (
                      <span style={{ ...styles.stackAvatar, marginLeft: -8, background: "var(--bg-page)", color: "var(--ink)" }}>
                        +{ws.members.length - 4}
                      </span>
                    )}
                  </span>
                  <span style={styles.groupMemberCount}>{ws.members.length} สมาชิก</span>
                </div>
                <div style={{ ...styles.groupCardChips, justifyContent: "flex-start", marginTop: 10 }}>
                  {(() => {
                    const mine = myTasks.filter((t) => t.workspaceId === ws.id).length;
                    const unread = unreadCounts[`workspace:${ws.id}`] || 0;
                    return (
                      <>
                        <span style={{ ...styles.miniChip, ...styles.wsChip }}><PawPinIcon size={15} style={{ marginRight: 4 }} />งานของฉัน {mine}</span>
                        {unread > 0 && <span style={{ ...styles.miniChip, ...styles.miniChipAlert }}><ChatBubbleIcon size={14} style={{ marginRight: 4, stroke: "#FFFDF8" }} />{unread > 99 ? "99+" : unread}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

        </>
      )}

      {(
        <>
      {/* --- Group detail popup — opens on top instead of pushing the grid
          around, so clicking one card never shifts another. --- */}
      {expandedGroupId &&
        (() => {
          const ws = groupWorkspaces.find((w) => w.id === expandedGroupId);
          if (!ws) return null;
          const isOwner = ws.ownerId === myUserId;
          const otherMembers = ws.members.filter((m) => m.user.id !== ws.ownerId);
          return (
            <div role="presentation" style={styles.modalOverlay} onClick={closeGroupModal}>
              <div role="presentation" style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
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

        </>
      )}

      {tab === "friends" && (
        <>
      {/* --- Friends section --- */}
      <section style={shellStyles.section}>
        <h2 style={shellStyles.sectionTitle}>เพื่อน <span style={styles.titleCount}>{friends.length}</span></h2>
        <div className="card-clean" style={styles.card}>
          <MyFriendId />
          <AddFriendBox onAdd={handleAddFriend} />
          {notice && <p style={styles.noticeText}>{notice}</p>}

          {friends.length === 0 ? (
            <MascotNote name="spotty" anim="wiggle" width={104} text="ยังไม่มีเพื่อนเลย" sub="ลองพิมพ์ username ด้านบนดูสิ" />
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
      )}
    </>
  );
}

const WS_DECO = ["bone", "ball", "bowl", "frisbee"];
const WS_TINTS = ["#A9C8F0", "#F6D98F", "#A8D8B9", "#F4B8B8", "#CDBDE8"];

const styles = {
  myIdBox: { background: "color-mix(in srgb, var(--accent-color) 8%, var(--bg-surface))", border: "2px dashed color-mix(in srgb, var(--ink) 35%, transparent)", borderRadius: 16, padding: "12px 14px", marginBottom: 14 },
  myIdInput: { flex: 1, minWidth: 160, width: "auto", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15, padding: "10px 14px", color: "var(--ink)", background: "var(--bg-surface)", border: "2px solid color-mix(in srgb, var(--ink) 30%, transparent)", borderRadius: 14, outline: "none" },
  myIdHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  myIdLabel: { fontFamily: "'Itim', cursive", fontWeight: 700, fontSize: 14, color: "var(--ink)" },
  myIdRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  myIdValue: { fontFamily: "'Itim', cursive", fontSize: 20, fontWeight: 700, color: "var(--ink)", background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 12, padding: "3px 14px" },
  myIdLink: { background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Itim', cursive", fontSize: 13.5, color: "var(--accent-color)", fontWeight: 700 },
  myIdHint: { fontFamily: "'Itim', cursive", fontSize: 13, color: "var(--ink-soft)", margin: "6px 0 0" },
  myIdErr: { fontFamily: "'Itim', cursive", fontSize: 13, color: "#C23B33", margin: "6px 0 0" },
  backLink: { background: "none", border: "none", padding: 0, marginBottom: 10, cursor: "pointer", fontFamily: "'Itim', cursive", fontSize: 14, color: "var(--ink-soft)" },
  pageHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, padding: "22px 26px 18px", marginBottom: 18, border: "2.5px solid var(--ink)", borderRadius: "26px 20px 24px 20px / 20px 26px 20px 24px", boxShadow: "4px 4px 0 0 var(--ink)", background: "linear-gradient(120deg, color-mix(in srgb, #A9C8F0 30%, var(--bg-surface)) 0%, color-mix(in srgb, #F7E3C4 34%, var(--bg-surface)) 100%)" },
  pageTitle: { fontFamily: "'Itim', cursive", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" },
  pageSub: { fontFamily: "'Itim', cursive", fontSize: 14.5, color: "var(--ink-soft)", margin: 0 },
  tabs: { display: "inline-flex", gap: 6, padding: 5, marginBottom: 22, background: "color-mix(in srgb, var(--ink) 7%, var(--bg-surface))", border: "1.5px solid color-mix(in srgb, var(--ink) 22%, transparent)", borderRadius: 999 },
  tabBtn: { fontFamily: "'Itim', cursive", fontSize: 15, fontWeight: 700, color: "var(--ink-soft)", background: "transparent", border: "none", borderRadius: 999, padding: "8px 20px", cursor: "pointer" },
  tabBtnOn: { color: "#FFFDF8", background: "var(--accent-color)", boxShadow: "0 4px 10px -5px var(--accent-color)" },
  tabCount: { fontSize: 12, opacity: 0.85, marginLeft: 4 },
  hero: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 24,
    padding: "28px 34px 30px 26px",
    minHeight: 196,
    marginBottom: 20,
    background: "linear-gradient(120deg, color-mix(in srgb, #A9C8F0 34%, var(--bg-surface)) 0%, color-mix(in srgb, #F7E3C4 38%, var(--bg-surface)) 55%, color-mix(in srgb, #F4C6C0 30%, var(--bg-surface)) 100%)",
    border: "2.5px solid var(--ink)",
    borderRadius: "30px 24px 28px 24px / 24px 30px 24px 28px",
    boxShadow: "5px 5px 0 0 var(--ink)",
    boxSizing: "border-box",
  },
  heroText: { flex: "1 1 auto", minWidth: 0, position: "relative", zIndex: 2 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 },
  statCard: { display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "'Itim', cursive", color: "var(--ink)", border: "2px solid var(--ink)", borderRadius: 18, padding: "14px 14px", boxShadow: "3px 3px 0 0 var(--ink)", boxSizing: "border-box", minWidth: 0 },
  statIcon: { flex: "none", width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 },
  statText: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  statLabel: { fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 },
  statValue: { fontSize: 28, fontWeight: 700, lineHeight: 1.15 },
  statSub: { fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.2 },
  statArrow: { flex: "none", width: 24, height: 24, borderRadius: "50%", border: "1.5px solid", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1, paddingBottom: 2 },
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

  attnTasks: { background: "color-mix(in srgb, #4F83CC 9%, var(--bg-surface))" },
  attnChat: { background: "color-mix(in srgb, #9A74B8 9%, var(--bg-surface))" },
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
  groupCardChips: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, justifyContent: "center" },
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
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 320px))",
    gap: 20,
  },
  // The collapsed card itself is a button — clicking anywhere on it opens
  // the group's detail popup (see modalOverlay/modalSheet below). It no
  // longer grows in place, so opening one card can't nudge its neighbors.
  groupCardBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "var(--bg-surface)",
    borderStyle: "solid",
    borderColor: "var(--ink)",
    position: "relative",
    padding: "18px 20px 18px",
    boxSizing: "border-box",
    cursor: "pointer",
    fontFamily: "inherit",
    borderWidth: 2.5,
    borderRadius: "22px 8px 20px 10px / 10px 20px 8px 22px",
    boxShadow: "4px 4px 0 0 var(--ink)",
  },
  wsHole: { position: "absolute", top: 10, left: "50%", marginLeft: -7, width: 14, height: 14, borderRadius: "50%", background: "var(--bg-page)", border: "2px solid var(--ink)" },
  wsDeco: { position: "absolute", right: 12, bottom: 10, opacity: 0.95, pointerEvents: "none", transform: "rotate(-10deg)" },
  wsTop: { display: "flex", alignItems: "center", gap: 12, paddingTop: 14 },
  wsTitleCol: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, minWidth: 0, flex: 1 },
  wsRole: { border: "1.5px solid var(--ink)", display: "inline-flex", alignItems: "center" },
  wsDash: { borderTop: "2px dashed color-mix(in srgb, var(--ink) 40%, transparent)", margin: "14px 0 12px" },
  wsInfo: { display: "flex", alignItems: "center", gap: 10 },
  wsChip: { background: "var(--bg-surface)", border: "1.5px solid var(--ink)", display: "inline-flex", alignItems: "center" },
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
