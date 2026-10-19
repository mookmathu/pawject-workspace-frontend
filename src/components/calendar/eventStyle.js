// Colour labels + stickers for calendar events.
// The label key is what the API stores; colours live here so the palette can
// change without touching the database.
export const EVENT_LABELS = [
  { key: "urgent", name: "เร่งด่วน", color: "#E0615A" },
  { key: "important", name: "สำคัญ", color: "#E07F52" },
  { key: "general", name: "ทั่วไป", color: "#4F83CC" },
  { key: "personal", name: "ส่วนตัว", color: "#5BA06F" },
  { key: "idea", name: "ไอเดีย", color: "#9A74B8" },
];

export const DEFAULT_LABEL = "general";

export function getLabel(key) {
  return EVENT_LABELS.find((l) => l.key === key) || EVENT_LABELS.find((l) => l.key === DEFAULT_LABEL);
}

// Soft tinted background that works on both the light and the dark surface.
export function labelSoftBg(color, percent = 20) {
  return `color-mix(in srgb, ${color} ${percent}%, var(--bg-surface))`;
}

export const MASCOT_STICKERS = ["reader", "glasses", "artist", "puppy", "ears", "scarf"];

export const EMOJI_STICKERS = [
  "🔥", "⏰", "❗", "⭐", "🎯", "📌", "📝", "📚", "💻", "🧪",
  "🎓", "📅", "🤝", "💬", "📞", "✉️", "🚀", "💡", "🏆", "✅",
  "🎉", "🎂", "🍕", "☕", "🍜", "🛒", "🎬", "🎮", "🎵", "🎨",
  "🏃", "💪", "🧘", "🚗", "✈️", "🏖️", "🏥", "🐶", "🐾", "💖",
];

export const MASCOT_PREFIX = "mascot:";
export const mascotSticker = (name) => `${MASCOT_PREFIX}${name}`;
export const isMascotSticker = (value) => typeof value === "string" && value.startsWith(MASCOT_PREFIX);
export const mascotName = (value) => value.slice(MASCOT_PREFIX.length);
