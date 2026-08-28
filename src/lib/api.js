// Base URL of the backend API. During local dev this is the Express server
// started with `npm run dev` inside the backend/ folder (see its README).
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

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
    throw new Error(data?.error || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
  }

  return data;
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

export function checkUsernameAvailable(username) {
  return apiRequest(`/auth/check-username?username=${encodeURIComponent(username)}`);
}
