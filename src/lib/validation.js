// Plain string checks instead of regexes: the usual one-line email regex backtracks
// heavily on long junk input, and this runs on every keystroke-sized string.

// "something@something.something": one @, no spaces, a dot in the domain with text on both sides.
export function isValidEmail(value) {
  const s = typeof value === "string" ? value : "";
  if (s.length === 0 || /\s/.test(s)) return false;
  const at = s.indexOf("@");
  if (at < 1 || at !== s.lastIndexOf("@")) return false;
  const domain = s.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1;
}
