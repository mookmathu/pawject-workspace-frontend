// Tiny "deep link" mechanism for cross-page navigation that isn't backed by
// a real URL param — the Task board and Chat page both pick their active
// workspace/conversation from client-side state, not the URL, so getting
// "take me straight to this task" or "open this conversation" from a
// notification or the Home dashboard means stashing where to land just
// before navigate() and having that page consume it once on mount.
// sessionStorage (not a query string) because navigate() elsewhere in the
// app doesn't thread query params through, and this is meant to be read
// exactly once, not linger as shareable app state.

const TASK_JUMP_KEY = "crew_task_jump";
const CHAT_JUMP_KEY = "crew_chat_jump";

export function setTaskJump({ workspaceId, taskId }) {
  try {
    sessionStorage.setItem(TASK_JUMP_KEY, JSON.stringify({ workspaceId, taskId }));
  } catch {
    // best-effort — worst case the page just opens without deep-linking
  }
}

// Reads and clears in one call — a jump target is only ever meant to be
// consumed once, by whichever page mounts next.
export function consumeTaskJump() {
  try {
    const raw = sessionStorage.getItem(TASK_JUMP_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(TASK_JUMP_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setChatJump(target) {
  try {
    sessionStorage.setItem(CHAT_JUMP_KEY, JSON.stringify(target));
  } catch {
    // best-effort
  }
}

export function consumeChatJump() {
  try {
    const raw = sessionStorage.getItem(CHAT_JUMP_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CHAT_JUMP_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
