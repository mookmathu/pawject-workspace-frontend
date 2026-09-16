// Base URL of the backend API. During local dev this is the Express server
// started with `npm run dev` inside the backend/ folder (see its README).
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

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

export function getMe() {
  return authRequest("/auth/me");
}

export function completeProfile({ username, orgType, orgName }) {
  return authRequest("/auth/complete-profile", {
    method: "PATCH",
    body: JSON.stringify({ username, orgType, orgName }),
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

export function createEvent({ title, description, isAllDay, startDate, endDate, attendeeUsernames }) {
  return authRequest("/events", {
    method: "POST",
    body: JSON.stringify({ title, description, isAllDay, startDate, endDate, attendeeUsernames }),
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
