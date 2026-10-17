// Mood keys are what the backend stores; the emoji/label/tint live here.
export const MOODS = [
  { key: "love", emoji: "🥰", label: "มีความสุข", tint: "#F4B6B6" },
  { key: "good", emoji: "😊", label: "อารมณ์ดี", tint: "#F7D878" },
  { key: "ok", emoji: "😐", label: "เฉย ๆ", tint: "#B9D3F3" },
  { key: "stressed", emoji: "😵‍💫", label: "เครียด", tint: "#C9B4E6" },
  { key: "sad", emoji: "😢", label: "เศร้า", tint: "#F1C4A8" },
];

// Entries saved before the set was trimmed to five keep their old keys in
// the database; show them as the closest current mood.
const LEGACY = { great: "love", tired: "ok", angry: "stressed" };
export const canonicalMood = (key) => LEGACY[key] || key;

export const MOOD_BY_KEY = {
  ...Object.fromEntries(MOODS.map((m) => [m.key, m])),
  ...Object.fromEntries(Object.entries(LEGACY).map(([old, now]) => [old, MOODS.find((m) => m.key === now)])),
};

// "YYYY-MM-DD" for now in Bangkok, matching the server's day key.
export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const POPUP_PREF = "crew_mood_popup"; // "off" disables the daily popup
const dismissKey = (day) => `crew_mood_dismissed_${day}`;

export function isPopupEnabled() {
  try {
    return localStorage.getItem(POPUP_PREF) !== "off";
  } catch {
    return true;
  }
}
export function setPopupEnabled(on) {
  try {
    if (on) localStorage.removeItem(POPUP_PREF);
    else localStorage.setItem(POPUP_PREF, "off");
  } catch {
    // ignore (private mode)
  }
}
export function isDismissedToday() {
  try {
    return localStorage.getItem(dismissKey(todayKey())) === "1";
  } catch {
    return false;
  }
}
export function dismissToday() {
  try {
    localStorage.setItem(dismissKey(todayKey()), "1");
  } catch {
    // ignore
  }
}
