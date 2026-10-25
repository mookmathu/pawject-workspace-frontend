import React from "react";
import BlinkDog from "./BlinkDog";

/**
 * Shared look of the Login / Register pages: one rounded card, the form on
 * the left and the blinking Pawject pup on the right (stacked on phones).
 */
export function AuthStyles() {
  return <style>{AUTH_CSS}</style>;
}

export function AuthDogAside() {
  return (
    <aside className="lg-dog-side" aria-label="Pawject">
      <div className="lg-dog-img">
        <BlinkDog width={270} />
      </div>
      <p className="lg-tagline">
        ทีมเดียวกัน งานไม่หลุดมือ
        <br />
        ไปกับ <b>Pawject</b>
      </p>
    </aside>
  );
}

const AUTH_CSS = `
.lg-page {
  min-height: 100vh; width: 100%; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; padding: 28px;
  font-family: 'Itim', cursive; background: var(--bg-page);
  background-image: radial-gradient(color-mix(in srgb, var(--ink) 8%, transparent) 1px, transparent 1px), radial-gradient(color-mix(in srgb, var(--ink) 8%, transparent) 1px, transparent 1px);
  background-size: 24px 24px; background-position: 0 0, 12px 12px;
}
.lg-shell {
  display: flex; width: 100%; max-width: 980px; background: var(--bg-surface);
  border: 2.5px solid var(--ink); border-radius: 26px 30px 26px 30px / 30px 26px 30px 26px;
  box-shadow: 6px 6px 0 0 var(--ink); overflow: hidden;
}
.lg-form-side { flex: 1 1 0; min-width: 0; padding: 48px 48px 40px; }
.lg-brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; color: var(--accent-color); margin-bottom: 18px; }
.lg-heading { font-size: 38px; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
.lg-sub { margin: 0; color: var(--ink-soft); font-size: 16.5px; }
.lg-form { display: flex; flex-direction: column; gap: 18px; margin-top: 26px; }
.lg-label { display: flex; flex-direction: column; gap: 6px; font-size: 16px; color: var(--ink); }
.lg-label-row { display: flex; align-items: baseline; justify-content: space-between; }
.lg-forgot { font-size: 14px; color: var(--accent-color); text-decoration: none; }
.lg-forgot:hover { text-decoration: underline; }
.lg-input { width: 100%; }
.lg-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; display: flex; padding: 0; }
.lg-error { color: #E0473E; font-size: 13px; font-weight: 600; }
.lg-error-form { text-align: center; margin: 0; }
.lg-submit { background: var(--accent-color); color: #FFFDF8; font-size: 19px; padding: 12px 0; margin-top: 2px; }
.lg-divider { display: flex; align-items: center; gap: 10px; }
.lg-divider span { flex: 1; height: 0; border-top: 2px dashed color-mix(in srgb, var(--ink) 25%, transparent); }
.lg-divider em { font-style: normal; font-size: 13px; color: var(--ink-faint); white-space: nowrap; }
.lg-social-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.lg-social {
  display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0;
  padding: 10px 8px; font-family: 'Itim', cursive; font-size: 14.5px; color: var(--ink);
  background: var(--bg-surface); border: 2px solid var(--ink); border-radius: 12px; cursor: pointer;
  transition: transform 100ms ease, background-color 100ms ease;
}
.lg-social:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-surface)); }
.lg-social svg { width: 20px; height: 20px; flex-shrink: 0; }
:root[data-theme="dark"] .lg-social { color: #24292F; }
.lg-footer { text-align: center; margin: 2px 0 0; font-size: 15px; color: var(--ink-soft); }
.lg-footer a { color: #FF6F91; font-weight: 700; text-decoration: none; }
.lg-footer a:hover { text-decoration: underline; }

.lg-dog-side {
  flex: 0 0 380px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  padding: 32px 20px; border-left: 2.5px solid var(--ink);
  background: color-mix(in srgb, var(--accent-color) 7%, var(--bg-surface));
}
.lg-dog-img { line-height: 0; }
.lg-tagline { margin: 0; text-align: center; font-size: 17px; line-height: 1.6; color: var(--ink-soft); }
.lg-tagline b { color: var(--accent-color); }

@media (max-width: 860px) {
  .lg-shell { flex-direction: column-reverse; max-width: 480px; }
  .lg-shell-wide .lg-dog-side { flex-basis: auto !important; }
  .lg-dog-side { flex: none; flex-direction: row; gap: 4px; padding: 22px 20px 16px; border-left: none; border-bottom: 2.5px solid var(--ink); }
  .lg-dog-img { flex-shrink: 0; }
  .lg-dog-img .blink-dog { width: 104px !important; height: 110px !important; }
  .lg-tagline { text-align: left; font-size: 14px; }
  .lg-dog-side { gap: 0 !important; }
}
@media (max-width: 480px) {
  .lg-page { padding: 14px; }
  .lg-form-side { padding: 28px 22px 26px; }
  .lg-heading { font-size: 28px; }
  .lg-social span { display: none; }
  .lg-social { padding: 11px 0; }
}

/* --- register extras --- */
.lg-shell-wide { max-width: 1040px; }
.lg-shell-wide .lg-dog-side { flex-basis: 320px; }
.lg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 14px; margin-top: 22px; }
.lg-grid .lg-span2 { grid-column: 1 / -1; }
.lg-grid .lg-label { min-width: 0; }
.lg-org-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.lg-org-btn { padding: 10px 12px; font-family: 'Itim', cursive; font-size: 15px; color: var(--ink);
  background: var(--bg-surface); border: 2px solid color-mix(in srgb, var(--ink) 35%, transparent); border-radius: 12px; cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease; }
.lg-org-btn:hover { border-color: var(--ink); }
.lg-org-btn.is-on { border-color: var(--ink); background: color-mix(in srgb, var(--accent-color) 18%, var(--bg-surface)); font-weight: 700; box-shadow: 2px 2px 0 0 var(--ink); }
.lg-at { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--ink-faint); font-weight: 700; pointer-events: none; }
.lg-hint { font-size: 13px; font-weight: 600; }
.lg-rules { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
.lg-rules li { font-size: 13px; font-weight: 600; transition: color .15s ease; }
.lg-check { display: flex; align-items: flex-start; gap: 10px; }
.lg-check input { width: 19px; height: 19px; flex-shrink: 0; margin-top: 2px; accent-color: var(--accent-color); cursor: pointer; }
.lg-check label { font-size: 14.5px; color: var(--ink-soft); line-height: 1.5; cursor: pointer; }
.lg-check a { color: var(--accent-color); text-decoration: none; font-weight: 700; }
.lg-suggest { list-style: none; margin: 6px 0 0; padding: 6px; position: absolute; top: 100%; left: 0; right: 0; z-index: 20;
  background: var(--bg-surface); border: 2px solid var(--ink); border-radius: 12px; max-height: 220px; overflow-y: auto; box-shadow: 3px 3px 0 0 var(--ink); }
.lg-suggest button { width: 100%; padding: 8px 10px; border-radius: 8px; font: inherit; font-size: 14px; color: var(--ink); cursor: pointer;
  display: flex; justify-content: space-between; gap: 10px; background: none; border: none; text-align: left; }
.lg-suggest button:hover { background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-surface)); }
.lg-suggest small { font-size: 12px; color: var(--ink-faint); white-space: nowrap; }
.lg-suggest-empty { padding: 8px 10px; font-size: 13px; color: var(--ink-faint); }
@media (max-width: 560px) {
  .lg-grid { grid-template-columns: 1fr; }
  .lg-rules { grid-template-columns: 1fr; }
}
`;
