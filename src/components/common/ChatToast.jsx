import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSocket } from "../../lib/socket";
import { getFriends } from "../../lib/api";
import UserAvatar from "./UserAvatar";
import { setChatJump } from "../../lib/navJump";

/**
 * Short pop-up in the corner when a chat message arrives while the person is
 * using some other page. It rides on the same "notification:new" socket push
 * that feeds the bell (type "message"), so the backend needs no change.
 * Click it to jump straight to that conversation.
 */
const SHOW_MS = 5000;
const MAX_TOASTS = 3;

function senderOf(title = "") {
  // "ข้อความใหม่จาก Pim"  |  "Pim ส่งข้อความในกลุ่ม โปรเจกต์จบ"
  const DM_PREFIX = "ข้อความใหม่จาก";
  if (title.startsWith(DM_PREFIX)) {
    const name = title.slice(DM_PREFIX.length).trim();
    if (name) return name;
  }
  const at = title.indexOf(" ส่งข้อความในกลุ่ม");
  return at > 0 ? title.slice(0, at).trim() : title;
}

const CSS = `
.ct-wrap { position: fixed; top: 78px; right: 16px; z-index: 1500; display: flex; flex-direction: column; gap: 10px; width: 330px; max-width: calc(100vw - 24px); pointer-events: none; }
.ct { pointer-events: auto; position: relative; overflow: hidden; display: flex; gap: 12px; align-items: flex-start; text-align: left; cursor: pointer;
  padding: 12px 38px 14px 12px; font-family: 'Itim', cursive; color: var(--ink);
  background: var(--bg-surface); border: 2px solid var(--ink); border-radius: 16px; box-shadow: 3px 3px 0 0 var(--ink);
  animation: ct-in 260ms cubic-bezier(.2,.9,.3,1.1) both; }
.ct.is-out { animation: ct-out 200ms ease forwards; }
.ct-avatar { flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 16px; color: var(--accent-color); background: color-mix(in srgb, var(--accent-color) 18%, var(--bg-surface)); border: 2px solid var(--ink); }
.ct-main { min-width: 0; flex: 1; }
.ct-title { font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-sub { font-size: 12px; color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.ct-body { font-size: 14.5px; margin-top: 4px; color: var(--ink-soft); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
.ct-x { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; padding: 0;
  border: none; border-radius: 50%; background: transparent; color: var(--ink-faint); cursor: pointer; }
.ct-x:hover { background: color-mix(in srgb, var(--ink) 10%, transparent); color: var(--ink); }
.ct-bar { position: absolute; left: 0; bottom: 0; height: 4px; width: 100%; background: var(--accent-color); transform-origin: 0 50%; animation: ct-bar linear forwards; }
.ct:hover .ct-bar { animation-play-state: paused; }
@keyframes ct-in { from { opacity: 0; transform: translateX(40px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes ct-out { to { opacity: 0; transform: translateX(40px) scale(.96); } }
@keyframes ct-bar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@media (max-width: 560px) { .ct-wrap { top: 70px; right: 12px; left: 12px; width: auto; max-width: none; } }
@media (prefers-reduced-motion: reduce) { .ct, .ct.is-out { animation: none; } .ct-bar { animation: none; display: none; } }
`;

export default function ChatToast() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [toasts, setToasts] = useState([]);
  const [avatars, setAvatars] = useState({}); // friend id → avatarUrl, loaded the first time a DM toast shows
  const avatarsLoaded = useRef(false);
  const timers = useRef({});

  function dismiss(id) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, out: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 200);
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }

  function schedule(id) {
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => dismiss(id), SHOW_MS);
  }

  useEffect(() => {
    const socket = getSocket();
    const pending = timers.current;
    function onNotification(n) {
      if (!n || n.type !== "message") return;
      // Already in the chat: the conversation itself and its unread badges show it.
      if (pathRef.current === "/chat") return;
      if (n.link?.type === "dm" && !avatarsLoaded.current) {
        avatarsLoaded.current = true;
        getFriends()
          .then(({ friends }) => setAvatars(Object.fromEntries((friends || []).map((f) => [f.id, f.avatarUrl]))))
          .catch(() => {
            avatarsLoaded.current = false;
          });
      }
      const id = `${n.id ?? Date.now()}`;
      const key = n.link?.type === "dm" ? `dm:${n.link.userId}` : `ws:${n.link?.workspaceId}`;
      setToasts((prev) => {
        const without = prev.filter((t) => t.key !== key); // same chat → replace, newest message wins
        return [...without, { id, key, notification: n, tick: Date.now() }].slice(-MAX_TOASTS);
      });
      schedule(id);
    }
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
      Object.values(pending).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open(t) {
    const link = t.notification.link;
    dismiss(t.id);
    if (!link) return;
    if (link.type === "workspace_chat") {
      setChatJump({ type: "workspace", id: link.workspaceId, name: link.workspaceName });
    } else if (link.type === "dm") {
      setChatJump({ type: "dm", id: link.userId, name: link.name });
    } else {
      return;
    }
    void navigate("/chat");
  }

  if (toasts.length === 0) return null;
  return (
    <>
      <style>{CSS}</style>
      <div className="ct-wrap" aria-live="polite">
        {toasts.map((t) => {
          const n = t.notification;
          const name = senderOf(n.title);
          const isGroup = n.link?.type === "workspace_chat";
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              className={`ct${t.out ? " is-out" : ""}`}
              onClick={() => open(t)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(t)}
              onMouseEnter={() => clearTimeout(timers.current[t.id])}
              onMouseLeave={() => schedule(t.id)}
            >
              <UserAvatar className="ct-avatar" avatarUrl={n.link?.type === "dm" ? avatars[n.link.userId] : null} name={name} />
              <div className="ct-main">
                <div className="ct-title">{name}</div>
                {isGroup && <div className="ct-sub">ในกลุ่ม {n.link.workspaceName}</div>}
                <div className="ct-body">{n.body || "ส่งข้อความถึงคุณ"}</div>
              </div>
              <button
                type="button"
                className="ct-x"
                aria-label="ปิด"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <span className="ct-bar" style={{ animationDuration: `${SHOW_MS}ms` }} key={t.tick} />
            </div>
          );
        })}
      </div>
    </>
  );
}
