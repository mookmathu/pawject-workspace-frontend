// Same category name always maps to the same color pair, without needing
// a fixed predefined list of categories — new category names just pick
// the next color in rotation based on a simple hash of the text.
const PALETTE = [
  { bg: "#DCE9F8", text: "#2F5E9E" }, // Paw Blue
  { bg: "#F7D9C7", text: "#8A4A22" }, // Peach Biscuit
  { bg: "#DCEBDD", text: "#2F6B3F" }, // Sage Puppy
  { bg: "#F6E7A9", text: "#7A5E0B" }, // Butter Treat
  { bg: "#F1DFED", text: "#7A3F78" }, // Lavender Paw
  { bg: "#F9D6DC", text: "#9B3A4E" }, // Blush
];

export function categoryColor(text) {
  if (!text) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
