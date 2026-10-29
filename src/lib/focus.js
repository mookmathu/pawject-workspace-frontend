// Ref callback that focuses an input as soon as it appears (inline rename /
// "new item" fields that open on a click). Same behaviour as the autoFocus
// attribute, but only for fields the person just asked to type into. Keep it a
// module-level function so its identity never changes between renders — React
// then calls it once on mount, not on every re-render.
export function focusOnMount(el) {
  if (el) el.focus();
}
