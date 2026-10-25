// Chat stickers = the hand-drawn Pawject dogs. A sticker is sent as an
// ordinary text message whose content is "[[sticker:<id>]]", so it needs no
// backend/database change; the chat window renders that token as the picture.
// `ratio` is height / width of the artwork (same numbers as Mascot.jsx).
export const STICKERS = [
  { id: "cheer", ratio: 0.6911, label: "เชียร์" },
  { id: "pup", ratio: 0.7982, label: "ลูกหมา" },
  { id: "puppy", ratio: 383 / 480, label: "แลบลิ้น" },
  { id: "ears", ratio: 332 / 480, label: "หูกาง" },
  { id: "huh", ratio: 1.02, label: "งง" },
  { id: "nap", ratio: 0.5929, label: "นอนพัก" },
  { id: "scarf", ratio: 480 / 320, label: "ผ้าพันคอ" },
  { id: "scout", ratio: 1.3146, label: "สอดส่อง" },
  { id: "reader", ratio: 520 / 403, label: "อ่านหนังสือ" },
  { id: "glasses", ratio: 520 / 311, label: "ใส่แว่น" },
  { id: "artist", ratio: 455 / 520, label: "ศิลปิน" },
  { id: "music", ratio: 1.7073, label: "ฟังเพลง" },
  { id: "barista", ratio: 1.5217, label: "บาริสต้า" },
  { id: "clerk", ratio: 1.5686, label: "ถือกระดาษ" },
  { id: "bald", ratio: 0.7607, label: "Bald & Proud" },
  { id: "spotty", ratio: 0.975, label: "ลายจุด" },
  { id: "bone", ratio: 0.535, label: "กระดูก" },
  { id: "ball", ratio: 0.9973, label: "ลูกบอล" },
  { id: "frisbee", ratio: 0.7089, label: "จานร่อน" },
  { id: "bowl", ratio: 0.5214, label: "ชามข้าว" },
  { id: "house", ratio: 1.22, label: "บ้านหมา" },
];

const TOKEN_RE = /^\[\[sticker:([a-z]+)\]\]$/;

export function stickerToken(id) {
  return `[[sticker:${id}]]`;
}

// Returns the sticker definition when `content` is exactly one sticker token.
export function parseSticker(content) {
  const m = typeof content === "string" ? content.trim().match(TOKEN_RE) : null;
  return m ? STICKERS.find((s) => s.id === m[1]) || null : null;
}

// Width that keeps the artwork inside a size x size box.
export function fitWidth(sticker, size) {
  return Math.round(Math.min(size, size / sticker.ratio));
}
