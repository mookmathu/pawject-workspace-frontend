// Removes <tags> from an HTML string with a single left-to-right scan (a
// "<[^>]*>" regex gets quadratic on input with many unclosed "<").
// Each removed tag is replaced by `replacement` so words don't glue together.
export function stripTags(html, replacement = " ") {
  const s = typeof html === "string" ? html : "";
  let out = "";
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf("<", i);
    if (open === -1) {
      out += s.slice(i);
      break;
    }
    const close = s.indexOf(">", open + 1);
    if (close === -1) {
      out += s.slice(i);
      break;
    }
    out += s.slice(i, open) + replacement;
    i = close + 1;
  }
  return out;
}
