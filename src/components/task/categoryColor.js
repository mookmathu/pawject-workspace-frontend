// Same category name always maps to the same color pair, without needing
// a fixed predefined list of categories — new category names just pick
// the next color in rotation based on a simple hash of the text.
const PALETTE = [
  { bg: "#F6D3D0", text: "#7A3B34" }, // rose
  { bg: "#D7E8FB", text: "#2C5F8A" }, // sky
  { bg: "#E3DEF6", text: "#5B4EA6" }, // lavender
  { bg: "#DCEFD9", text: "#2E8B4F" }, // mint
  { bg: "#FCE8C2", text: "#8A5A1B" }, // sand
  { bg: "#F6C9C4", text: "#B5453C" }, // coral
];

export function categoryColor(text) {
  if (!text) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
