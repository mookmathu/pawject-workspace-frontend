import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import { getFriends, getWorkspaceMessages, sendWorkspaceMessage, getDmMessages, sendDmMessage, getUnreadCounts } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { consumeChatJump } from "../../lib/navJump";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import styles from "../../components/chat/styles";
import shellStyles from "../../components/common/appShellStyles";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Same key shape the backend's unread-counts endpoint (and its unread:bump
// socket event) uses — so a badge count and a live bump always land on the
// same key no matter which one touches it first.
function conversationKey(target) {
  if (!target) return null;
  return target.type === "workspace" ? `workspace:${target.id}` : `dm:${target.id}`;
}

// How long someone's "typing..." stays up after their last keystroke if no
// explicit stop-typing event arrives (e.g. they closed the tab).
const TYPING_TIMEOUT_MS = 4000;

export default function ChatPage() {
  const { workspaces, loading: workspacesLoading } = useWorkspaces();
  const [friends, setFriends] = useState([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);
  const [selected, setSelected] = useState(null); // { type: "workspace" | "dm", id, name }
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());
  const [typingUserIds, setTypingUserIds] = useState(() => new Set());

  const [user] = useState(getStoredUser);
  const myUserId = user?.id;

  // The room we're currently subscribed to on the socket, so switching
  // conversations (or leaving the page) can leave it before joining the
  // next one — otherwise we'd keep receiving messages for chats we've
  // already navigated away from.
  const currentRoomRef = useRef(null);
  const selectedRef = useRef(null);
  const typingTimeoutsRef = useRef(new Map());

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    getFriends()
      .then(({ friends }) => setFriends(friends))
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoaded(true));
    getUnreadCounts()
      .then(({ unread }) => setUnreadCounts(unread))
      .catch(() => {});
  }, []);

  // The connection itself is opened/closed once for the whole logged-in
  // session by AppLayout (so the notification bell keeps working on other
  // pages too) — this effect just attaches/detaches this page's own
  // listeners on top of that shared connection.
  useEffect(() => {
    const socket = getSocket();

    function handleNewMessage(message) {
      // The socket only delivers events for rooms we've joined, and we only
      // ever join the room of the conversation currently open — so anything
      // that arrives here belongs on screen right now. Dedupe by id: our
      // own messages are already appended the moment the send request
      // resolves (see handleSend below), so the broadcast echoing it back
      // a moment later shouldn't add it a second time.
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      // Whoever just sent it is done typing.
      setTypingUserIds((prev) => {
        if (!prev.has(message.senderId)) return prev;
        const next = new Set(prev);
        next.delete(message.senderId);
        return next;
      });
    }

    function handlePresenceUpdate({ userId, online }) {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    }

    function handleUnreadBump({ key }) {
      // Already looking at this conversation — its badge should stay at
      // zero, not blip up for a message we're about to read anyway.
      if (conversationKey(selectedRef.current) === key) return;
      setUnreadCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
    }

    function handleTyping({ userId, room, isTyping }) {
      if (room !== currentRoomRef.current || userId === myUserId) return;
      const timeouts = typingTimeoutsRef.current;
      clearTimeout(timeouts.get(userId));
      if (isTyping) {
        setTypingUserIds((prev) => new Set(prev).add(userId));
        timeouts.set(
          userId,
          setTimeout(() => {
            setTypingUserIds((prev) => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
          }, TYPING_TIMEOUT_MS)
        );
      } else {
        setTypingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    }

    function requestPresence() {
      socket.emit("presence:list", (onlineIds) => setOnlineUserIds(new Set(onlineIds)));
    }

    socket.on("message:new", handleNewMessage);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("unread:bump", handleUnreadBump);
    socket.on("typing", handleTyping);
    socket.on("connect", requestPresence);
    // The connection is opened by AppLayout, which may have already
    // finished connecting before this page (and this "connect" listener)
    // ever mounted — e.g. navigating to Chat well after login. Ask directly
    // in that case instead of waiting for a "connect" event that already
    // happened.
    if (socket.connected) requestPresence();

    // Captured now (not read again inside the cleanup) — by the time this
    // effect tears down, typingTimeoutsRef.current could already be a
    // different Map, and clearing that one instead would leave these
    // timeouts running past unmount.
    const timeouts = typingTimeoutsRef.current;

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("unread:bump", handleUnreadBump);
      socket.off("typing", handleTyping);
      socket.off("connect", requestPresence);
      timeouts.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openConversation = useCallback(async (target) => {
    setSelected(target);
    setMessages([]);
    setTypingUserIds(new Set());
    setLoadingMessages(true);
    // Opening it is as good as reading it — same assumption the server
    // makes (it marks the conversation read the moment its messages are
    // fetched), so the badge clears immediately instead of waiting on a
    // round trip.
    const key = conversationKey(target);
    setUnreadCounts((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const socket = getSocket();
    if (currentRoomRef.current) {
      socket.emit("room:leave", currentRoomRef.current);
      currentRoomRef.current = null;
    }

    try {
      const { messages, room } =
        target.type === "workspace" ? await getWorkspaceMessages(target.id) : await getDmMessages(target.id);
      setMessages(messages);
      socket.emit("room:join", room);
      currentRoomRef.current = room;
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Deep-link from elsewhere in the app (the notification bell, the Home
  // dashboard's "ข้อความที่ยังไม่อ่าน" list) — waits for both friends and
  // workspaces to be loaded so the opened conversation gets a real display
  // name instead of a blank header, then opens it exactly once.
  useEffect(() => {
    if (workspacesLoading || !friendsLoaded) return;
    const jump = consumeChatJump();
    if (!jump) return;
    if (jump.type === "dm") {
      const friend = friends.find((f) => f.id === jump.id);
      openConversation({ type: "dm", id: jump.id, name: friend?.name || jump.name || "แชท" });
    } else if (jump.type === "workspace") {
      const ws = workspaces.find((w) => w.id === jump.id);
      openConversation({ type: "workspace", id: jump.id, name: ws?.name || jump.name || "กลุ่ม" });
    }
  }, [workspacesLoading, friendsLoaded, friends, workspaces, openConversation]);

  async function handleSend({ content, file }) {
    if (!selected) return;
    try {
      // The send request's own response already carries the saved,
      // serialized message — append it the moment that resolves instead of
      // waiting for the socket to broadcast it back around to us too.
      // (That broadcast still arrives a moment later for everyone else in
      // the room; handleNewMessage above dedupes it by id so it doesn't
      // show up twice here.)
      const { message } =
        selected.type === "workspace"
          ? await sendWorkspaceMessage(selected.id, { content, file })
          : await sendDmMessage(selected.id, { content, file });
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
    }
  }

  function handleTypingChange(isTyping) {
    if (!currentRoomRef.current) return;
    getSocket().emit("typing", { room: currentRoomRef.current, isTyping });
  }

  const targetOnline = selected?.type === "dm" ? onlineUserIds.has(selected.id) : null;

  return (
    <>
      <style>{`
        @media (max-width: 720px) {
          .chat-layout { height: calc(100vh - 230px) !important; min-height: 380px !important; gap: 0 !important; }
          .chat-sidebar { width: 100% !important; }
          .chat-layout[data-open="true"] .chat-sidebar { display: none !important; }
          .chat-layout[data-open="false"] .chat-window { display: none !important; }
        }
        .chat-back-btn { display: none; }
        @media (max-width: 720px) {
          .chat-top[data-open="true"] .chat-back-btn { display: inline-flex; }
        }
      `}</style>
      <div className="chat-top" data-open={selected ? "true" : "false"} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          className="chat-back-btn"
          onClick={() => setSelected(null)}
          aria-label="กลับไปรายการแชท"
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", fontSize: 20, fontFamily: "inherit", cursor: "pointer", color: "var(--ink)", background: "var(--bg-surface)", borderWidth: 2, borderStyle: "solid", borderColor: "var(--ink)", borderRadius: "50%", flexShrink: 0 }}
        >
          ‹
        </button>
        <h1 style={{ ...shellStyles.sectionTitle, margin: 0 }}>แชท</h1>
      </div>
      <div className="chat-layout" data-open={selected ? "true" : "false"} style={styles.layout}>
        <ChatSidebar
          workspaces={workspaces}
          friends={friends}
          selected={selected}
          onSelect={openConversation}
          unreadCounts={unreadCounts}
          onlineUserIds={onlineUserIds}
        />
        <ChatWindow
          target={selected}
          targetOnline={targetOnline}
          messages={messages}
          myUserId={myUserId}
          onSend={handleSend}
          onTypingChange={handleTypingChange}
          typingUserIds={typingUserIds}
          loading={loadingMessages}
        />
      </div>
    </>
  );
}
