// Base URL of the backend API. During local dev this is the Express server
// started with `npm run dev` inside the backend/ folder (see its README).
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

// Same host, without the trailing /api — used to build full URLs for
// uploaded files (avatars) that the API serves statically from /uploads.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

// Turns a stored avatarUrl ("/api/auth/<userId>/avatar?v=...") into a full
// URL the <img> tag can load. Returns null as-is so callers can fall back to
// the initial-letter avatar circle.
export function resolveAvatarUrl(avatarUrl) {
  return avatarUrl ? `${API_ORIGIN}${avatarUrl}` : null;
}

// Full-page redirect target for social login — these aren't fetch() calls,
// the browser navigates away to the provider's own consent screen.
export function getOAuthUrl(provider) {
  return `${API_BASE_URL}/auth/${provider}`;
}

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body — leave data as null
  }

  if (!res.ok) {
    const err = new Error(data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    err.code = data?.code;
    err.email = data?.email;
    err.status = res.status;
    throw err;
  }

  return data;
}

// Same as apiRequest, but attaches the logged-in user's token — use this
// for every endpoint that requires being signed in (board, tasks, ...).
function authRequest(path, options = {}) {
  const token = localStorage.getItem("crew_token");
  return apiRequest(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export function registerUser({ name, username, email, password, orgType, orgName }) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, username, email, password, orgType, orgName }),
  });
}

export function loginUser({ email, password }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function forgotPassword(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword({ email, token, newPassword }) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, token, newPassword }),
  });
}

// Daily-activity heatmap for the Profile page. No year = the last 365 days.
export function getMyActivity(year) {
  return authRequest(`/auth/me/activity${year ? `?year=${year}` : ""}`);
}

// --- Daily mood check-ins (private to the signed-in user) ---
export function getMoodMonth(month) {
  return authRequest(`/mood?month=${month}`);
}
export function getMoodRecent(days = 90) {
  return authRequest(`/mood?recent=${days}`);
}
export function getMoodDay(day) {
  return authRequest(`/mood?day=${day}`);
}
export async function saveMood(day, { mood, note, image, removeImage }) {
  const token = localStorage.getItem("crew_token");
  const fd = new FormData();
  fd.append("mood", mood);
  fd.append("note", note || "");
  if (image) fd.append("image", image);
  else if (removeImage) fd.append("removeImage", "1");
  const res = await fetch(`${API_BASE_URL}/mood/${day}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) throw new Error(data?.error || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  return data;
}
export function deleteMood(day) {
  return authRequest(`/mood/${day}`, { method: "DELETE" });
}
// The meme is private, so it's fetched with the bearer token and shown via
// an object URL (an <img src> can't send the Authorization header).
export async function fetchMoodImageUrl(day) {
  const token = localStorage.getItem("crew_token");
  const res = await fetch(`${API_BASE_URL}/mood/${day}/image`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("image");
  return URL.createObjectURL(await res.blob());
}

export function getMe() {
  return authRequest("/auth/me");
}

// Another user's public profile card — respects whatever they've chosen to
// hide (see the Profile page's "ความเป็นส่วนตัว" toggles).
export function getUserProfile(userId) {
  return authRequest(`/auth/${userId}/profile`);
}

export function completeProfile({ username, orgType, orgName }) {
  return authRequest("/auth/complete-profile", {
    method: "PATCH",
    body: JSON.stringify({ username, orgType, orgName }),
  });
}

// Partial update — only send the fields that changed.
export function updateProfile(updates) {
  return authRequest("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function updateTheme(themeColor) {
  return authRequest("/auth/me/theme", {
    method: "PATCH",
    body: JSON.stringify({ themeColor }),
  });
}

// Multipart upload — bypasses authRequest/apiRequest because those always
// set Content-Type: application/json, which would break the boundary the
// browser sets for FormData.
export async function uploadAvatar(file) {
  const token = localStorage.getItem("crew_token");
  const formData = new FormData();
  formData.append("avatar", file);

  const res = await fetch(`${API_BASE_URL}/auth/me/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    throw new Error(data?.error || "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
  return data;
}

export function deleteAccount(password) {
  return authRequest("/auth/me", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}

export function checkUsernameAvailable(username) {
  return apiRequest(`/auth/check-username?username=${encodeURIComponent(username)}`);
}

export function verifyOtp({ email, otp }) {
  return apiRequest("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export function resendOtp({ email }) {
  return apiRequest("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// --- workspaces (groups) / board / tasks / columns ---

export function getMyWorkspaces() {
  return authRequest("/workspaces");
}

export function createWorkspace(name) {
  return authRequest("/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getWorkspaceBoard(workspaceId) {
  return authRequest(`/workspaces/${workspaceId}/board`);
}

export function updateBoardNote(boardId, noteContent) {
  return authRequest(`/board/${boardId}/note`, {
    method: "PATCH",
    body: JSON.stringify({ noteContent }),
  });
}

export function addWorkspaceMember(workspaceId, username) {
  return authRequest(`/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function removeWorkspaceMember(workspaceId, userId) {
  return authRequest(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
}

export function deleteWorkspace(workspaceId) {
  return authRequest(`/workspaces/${workspaceId}`, { method: "DELETE" });
}

// Multipart upload, same shape as uploadAvatar below — bypasses
// authRequest/apiRequest since those force Content-Type: application/json.
export async function uploadWorkspaceImage(workspaceId, file) {
  const token = localStorage.getItem("crew_token");
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    throw new Error(data?.error || "อัปโหลดรูปกลุ่มไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
  return data;
}

export function joinWorkspaceByCode(code) {
  return authRequest("/workspaces/join", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function regenerateWorkspaceJoinCode(workspaceId) {
  return authRequest(`/workspaces/${workspaceId}/join-code/regenerate`, { method: "POST" });
}

export function transferWorkspaceOwnership(workspaceId, userId) {
  return authRequest(`/workspaces/${workspaceId}/owner`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function createTask(boardId, { title, statusId, dueDate, note, categoryId, priority, assigneeId }) {
  return authRequest(`/board/${boardId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title, statusId, dueDate, note, categoryId, priority, assigneeId }),
  });
}

export function updateTask(taskId, updates) {
  return authRequest(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteTask(taskId) {
  return authRequest(`/tasks/${taskId}`, { method: "DELETE" });
}

// Every non-archived, not-done task assigned to me across every board I'm
// on — powers the Home dashboard's "งานใกล้ครบกำหนดของฉัน" section.
export function getMyTasks() {
  return authRequest("/tasks/mine");
}

export function addSubtask(taskId, title) {
  return authRequest(`/tasks/${taskId}/subtasks`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function addComment(taskId, content) {
  return authRequest(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function deleteComment(commentId) {
  return authRequest(`/comments/${commentId}`, { method: "DELETE" });
}

export function updateSubtask(subtaskId, updates) {
  return authRequest(`/subtasks/${subtaskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteSubtask(subtaskId) {
  return authRequest(`/subtasks/${subtaskId}`, { method: "DELETE" });
}

export function createColumn(boardId, name) {
  return authRequest(`/board/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateColumn(columnId, updates) {
  return authRequest(`/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteColumn(columnId) {
  return authRequest(`/columns/${columnId}`, { method: "DELETE" });
}

export function createCategory(boardId, { name, color }) {
  return authRequest(`/board/${boardId}/categories`, {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
}

export function updateCategory(categoryId, updates) {
  return authRequest(`/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteCategory(categoryId) {
  return authRequest(`/categories/${categoryId}`, { method: "DELETE" });
}

// --- calendar events ---

export function getEvents({ year, month }) {
  return authRequest(`/events?year=${year}&month=${month}`);
}

export function createEvent({ title, description, isAllDay, startDate, endDate, attendeeUsernames, label, sticker }) {
  return authRequest("/events", {
    method: "POST",
    body: JSON.stringify({ title, description, isAllDay, startDate, endDate, attendeeUsernames, label, sticker }),
  });
}

export function updateEvent(eventId, updates) {
  return authRequest(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function deleteEvent(eventId) {
  return authRequest(`/events/${eventId}`, { method: "DELETE" });
}

export function searchUsers(query) {
  return authRequest(`/users/search?q=${encodeURIComponent(query)}`);
}

// --- friends ---

export function getFriends() {
  return authRequest("/friends");
}

export function addFriend(username) {
  return authRequest("/friends", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export function removeFriend(userId) {
  return authRequest(`/friends/${userId}`, { method: "DELETE" });
}

export function getFriendRequests() {
  return authRequest("/friends/requests");
}

export function acceptFriendRequest(requestId) {
  return authRequest(`/friends/requests/${requestId}/accept`, { method: "POST" });
}

export function rejectFriendRequest(requestId) {
  return authRequest(`/friends/requests/${requestId}/reject`, { method: "POST" });
}

// --- notifications ---
export function getNotifications() {
  return authRequest("/notifications");
}

export function markNotificationRead(notificationId) {
  return authRequest(`/notifications/${notificationId}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return authRequest("/notifications/read-all", { method: "POST" });
}

// --- chat ---
// Each GET also returns `room` — the exact socket.io room name for that
// conversation — so the frontend never has to duplicate the backend's
// workspace/DM room-naming logic, it just joins whatever room the API says.

// Turns a stored attachmentUrl ("/api/chat/messages/<id>/attachment") into a
// full URL an <img>/<a> tag can load — same idea as resolveAvatarUrl.
export function resolveAttachmentUrl(attachmentUrl) {
  return attachmentUrl ? `${API_ORIGIN}${attachmentUrl}` : null;
}

export function getWorkspaceMessages(workspaceId) {
  return authRequest(`/chat/workspace/${workspaceId}/messages`);
}

export function getDmMessages(userId) {
  return authRequest(`/chat/dm/${userId}/messages`);
}

export function getUnreadCounts() {
  return authRequest("/chat/unread");
}

// Shared by both send-message endpoints below — always sent as
// multipart/form-data (even when there's no file) so a text message and an
// attachment go through the exact same code path instead of two.
async function sendChatMessage(path, { content, file }) {
  const token = localStorage.getItem("crew_token");
  const formData = new FormData();
  if (content) formData.append("content", content);
  if (file) formData.append("attachment", file);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    throw new Error(data?.error || "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
  return data;
}

export function sendWorkspaceMessage(workspaceId, { content, file } = {}) {
  return sendChatMessage(`/chat/workspace/${workspaceId}/messages`, { content, file });
}

export function sendDmMessage(userId, { content, file } = {}) {
  return sendChatMessage(`/chat/dm/${userId}/messages`, { content, file });
}
