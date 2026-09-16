import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import AppHeader from "../../components/common/AppHeader";
import shellStyles from "../../components/common/appShellStyles";
import {
  getFriends,
  addFriend,
  removeFriend,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getMyWorkspaces,
  createWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  deleteWorkspace,
  searchUsers,
} from "../../lib/api";

function getStoredUserId() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw).id : null;
  } catch {
    return null;
  }
}

// Small reusable "type a username, pick from search results" input.
function UsernameTagInput({ placeholder, onPick, excludeIds = [] }) {
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

export default function HomePage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [pendingRequestIds, setPendingRequestIds] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [notice, setNotice] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);

  const myUserId = getStoredUserId();

  async function loadAll() {
    try {
      const [{ friends }, { workspaces }, { requests }] = await Promise.all([
        getFriends(),
        getMyWorkspaces(),
        getFriendRequests(),
      ]);
      setFriends(friends);
      setWorkspaces(workspaces);
      setIncomingRequests(requests);
      setError("");
    } catch (err) {
      if (err.status === 401) {
        navigate("/");
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddFriend(user) {
    try {
      setNotice("");
      const result = await addFriend(user.username);
      if (result?.request) {
        // Different university/organization — needs the other person to accept.
        setPendingRequestIds((prev) => [...prev, result.request.id]);
        setNotice(`ส่งคำขอเป็นเพื่อนถึง @${result.request.username} แล้ว รอการยืนยัน`);
      } else {
        loadAll();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveFriend(userId) {
    try {
      await removeFriend(userId);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAcceptRequest(requestId) {
    try {
      await acceptFriendRequest(requestId);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRejectRequest(requestId) {
    try {
      await rejectFriendRequest(requestId);
      loadAll();
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
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleInviteToGroup(workspaceId, user) {
    try {
      await addWorkspaceMember(workspaceId, user.username);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveGroupMember(workspaceId, userId) {
    try {
      await removeWorkspaceMember(workspaceId, userId);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteGroup(workspaceId) {
    try {
      await deleteWorkspace(workspaceId);
      setConfirmingDeleteId(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const groupWorkspaces = workspaces.filter((w) => !w.isPersonal);
  const friendIds = [...friends.map((f) => f.id), ...pendingRequestIds];

  if (loading) {
    return (
      <div style={shellStyles.page}>
        <GlobalStyles />
        <AppHeader active="Home" />
        <main className="app-panel" style={shellStyles.main}>
          <p style={styles.loadingText}>กำลังโหลด...</p>
        </main>
      </div>
    );
  }

  return (
    <div style={shellStyles.page}>
      <GlobalStyles />
      <AppHeader active="Home" />

      <main className="app-panel" style={shellStyles.main}>
        <style>{`
          .home-row { transition: background-color 120ms ease; border-radius: 12px; }
          .home-row:hover { background-color: #EFE9DB; }
          .home-group-card { transition: box-shadow 150ms ease, transform 150ms ease; }
          .home-group-card:hover { transform: translateY(-2px); box-shadow: 4px 6px 0 0 #221D17; }
        `}</style>
        {error && <p style={styles.errorText}>{error}</p>}

        {/* --- Incoming friend requests (cross-org, needs the receiver to accept) --- */}
        {incomingRequests.length > 0 && (
          <section style={shellStyles.section}>
            <h2 style={shellStyles.sectionTitle}>📬 คำขอเป็นเพื่อน ({incomingRequests.length})</h2>
            <div className="card-clean" style={styles.card}>
              <ul style={styles.friendList}>
                {incomingRequests.map((r) => (
                  <li key={r.id} className="home-row" style={styles.friendRow}>
                    <div style={styles.friendInfo}>
                      <span style={styles.friendAvatar}>{r.sender.name?.charAt(0).toUpperCase() || "?"}</span>
                      <div>
                        <p style={styles.friendName}>{r.sender.name}</p>
                        <p style={styles.friendUsername}>
                          @{r.sender.username} · {r.sender.orgName}
                        </p>
                      </div>
                    </div>
                    <div style={styles.requestActions}>
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(r.id)}
                        style={styles.acceptBtn}
                        title="ยอมรับ"
                      >
                        ✓ ยอมรับ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(r.id)}
                        style={styles.rejectBtn}
                        title="ปฏิเสธ"
                      >
                        ✕ ปฏิเสธ
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* --- Friends section --- */}
        <section style={shellStyles.section}>
          <h2 style={shellStyles.sectionTitle}>👥 เพื่อน</h2>
          <div className="card-clean" style={styles.card}>
            <UsernameTagInput
              placeholder="พิมพ์ username เพื่อเพิ่มเพื่อน..."
              onPick={handleAddFriend}
              excludeIds={friendIds}
            />
            {notice && <p style={styles.noticeText}>{notice}</p>}

            {friends.length === 0 ? (
              <p style={styles.emptyText}>ยังไม่มีเพื่อนเลย — ลองพิมพ์ username ด้านบนดูสิ</p>
            ) : (
              <ul style={styles.friendList}>
                {friends.map((f) => (
                  <li key={f.id} className="home-row" style={styles.friendRow}>
                    <div style={styles.friendInfo}>
                      <span style={styles.friendAvatar}>{f.name?.charAt(0).toUpperCase() || "?"}</span>
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

        {/* --- Work groups section --- */}
        <section style={shellStyles.section}>
          <div style={styles.groupHeaderRow}>
            <h2 style={{ ...shellStyles.sectionTitle, margin: 0 }}>🗂️ กลุ่มทำงาน</h2>
            {!creatingGroup && (
              <button type="button" onClick={() => setCreatingGroup(true)} style={styles.newGroupBtn}>
                + สร้างกลุ่มใหม่
              </button>
            )}
          </div>

          {creatingGroup && (
            <div className="card-clean" style={{ ...styles.card, marginBottom: 16 }}>
              <div style={styles.newGroupRow}>
                <input
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
            <div className="card-clean" style={styles.card}>
              <p style={styles.emptyText}>ยังไม่มีกลุ่มทำงาน — สร้างกลุ่มแรกกันเลย</p>
            </div>
          ) : (
            <div style={styles.groupsGrid}>
              {groupWorkspaces.map((ws) => {
                const isOwner = ws.members.some((m) => m.user.id === myUserId && m.role === "owner");
                const isConfirming = confirmingDeleteId === ws.id;

                return (
                  <div key={ws.id} className="card-clean home-group-card" style={styles.card}>
                    <div style={styles.groupHeaderInner}>
                      <h3 style={styles.groupName}>🗂️ {ws.name}</h3>
                      {isOwner && !isConfirming && (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(ws.id)}
                          style={styles.deleteGroupBtn}
                          title="ลบกลุ่มนี้"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {isConfirming && (
                      <div style={styles.deleteConfirmBox}>
                        <p style={styles.deleteConfirmText}>
                          ลบกลุ่มนี้แน่ใจนะ? งานทั้งหมดในบอร์ดของกลุ่มจะหายไปด้วย กู้คืนไม่ได้
                        </p>
                        <div style={styles.deleteConfirmBtns}>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(ws.id)}
                            style={styles.confirmDeleteBtn}
                          >
                            ลบเลย
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            style={styles.cancelBtn}
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}

                    <ul style={styles.memberList}>
                      {ws.members.map((m) => (
                        <li key={m.id} className="home-row" style={styles.memberRow}>
                          <span style={styles.memberChip}>
                            @{m.user.username}
                            {m.role === "owner" && <span style={styles.ownerTag}>เจ้าของ</span>}
                          </span>
                          {m.role !== "owner" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGroupMember(ws.id, m.user.id)}
                              style={styles.removeBtn}
                              title={m.user.id === myUserId ? "ออกจากกลุ่ม" : "ลบออกจากกลุ่ม"}
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
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  loadingText: {
    fontFamily: "'Itim', cursive",
    color: "#8A8071",
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
    color: "#3E6BE0",
    fontSize: 13,
    fontWeight: 600,
    margin: "10px 0 0",
  },
  card: {
    border: "2px solid #221D17",
    padding: "20px 22px",
    boxSizing: "border-box",
  },
  emptyText: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "#8A8071",
    margin: "12px 0 0",
  },

  tagInputWrap: {
    position: "relative",
  },
  tagInput: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "#221D17",
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
    background: "#FFFDF8",
    border: "2px solid #221D17",
    borderRadius: 10,
    boxShadow: "3px 3px 0 0 #221D17",
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
    color: "#221D17",
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
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  friendRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    background: "#F6F3EC",
    borderRadius: 12,
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
    border: "2px solid #221D17",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#221D17",
    flexShrink: 0,
  },
  friendName: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 14,
    color: "#221D17",
    margin: 0,
  },
  friendUsername: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#8A8071",
    margin: 0,
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#8A8071",
    fontSize: 20,
    lineHeight: 1,
    cursor: "pointer",
    padding: 4,
  },
  requestActions: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  acceptBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "#2E8B4F",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  rejectBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#8A8071",
    background: "transparent",
    border: "1.5px solid #E7E2D6",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  groupHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  newGroupBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 13,
    fontWeight: 700,
    color: "#5C5346",
    background: "#FFFDF8",
    border: "2px solid #221D17",
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
    color: "#221D17",
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
    background: "#3E6BE0",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
  },
  cancelBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 14,
    color: "#8A8071",
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
  groupHeaderInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  groupName: {
    fontFamily: "'Itim', cursive",
    fontWeight: 700,
    fontSize: 17,
    color: "#221D17",
    margin: "0 0 12px",
  },
  deleteGroupBtn: {
    background: "transparent",
    border: "none",
    fontSize: 16,
    lineHeight: 1,
    cursor: "pointer",
    padding: 4,
    flexShrink: 0,
    opacity: 0.6,
  },
  deleteConfirmBox: {
    background: "#FBEAE8",
    border: "1.5px solid #F0C6C1",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 12,
  },
  deleteConfirmText: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    color: "#8A3A32",
    margin: "0 0 8px",
    lineHeight: 1.5,
  },
  deleteConfirmBtns: {
    display: "flex",
    gap: 8,
  },
  confirmDeleteBtn: {
    fontFamily: "'Itim', cursive",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#FFFDF8",
    background: "#C0453B",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
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
    color: "#221D17",
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
