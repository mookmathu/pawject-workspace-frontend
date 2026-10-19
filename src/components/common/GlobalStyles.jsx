import React from "react";

/**
 * Shared global CSS for the whole app: the Itim font import, the
 * hand-drawn "doodle" button/input treatment, the plain white card style
 * used by content cards, and small utility animations/media queries.
 * Rendered once per page via <GlobalStyles /> near the top of each page.
 */
export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Itim&display=swap');

      /* Site-wide accent color — overridden inline on <html> by ThemeProvider
         (lib/ThemeContext.jsx) as soon as a user picks a color on the
         Profile page. This :root value is only the fallback for the very
         first paint before that runs. */
      :root {
        --accent-color: #4F83CC;

        /* Pawject palette */
        --pw-cream: #FFF9F2;     /* Vanilla Cream — main background */
        --pw-blue: #DCE9F8;      /* Paw Blue — brand */
        --pw-peach: #F7D9C7;     /* Peach Biscuit — highlight */
        --pw-sage: #DCEBDD;      /* Sage Puppy — done */
        --pw-butter: #F6E7A9;    /* Butter Treat — gentle alerts */
        --pw-lavender: #F1DFED;  /* Lavender Paw — personal / ideas */
        --pw-charcoal: #353B46;  /* Soft Charcoal — text & headings */

        /* Light mode (default) */
        --bg-page: #FFF9F2;
        --bg-surface: #FFFEFC;
        --ink: #353B46;
        --ink-soft: #5E6573;
        --ink-faint: #8D93A0;
      }

      /* Dark mode — toggled by ThemeProvider setting data-theme="dark" on
         <html>. Charcoal-based so the hand-drawn borders/shadows still read
         as ink against the surface instead of disappearing. */
      :root[data-theme="dark"] {
        --bg-page: #20242B;
        --bg-surface: #2B3039;
        --ink: #F6EFE6;
        --ink-soft: #CBC6BD;
        --ink-faint: #9A9AA2;
        --pw-cream: #20242B;
        --pw-blue: #2C3A52;
        --pw-peach: #4A3A33;
        --pw-sage: #2F4238;
        --pw-butter: #4A432A;
        --pw-lavender: #3E3345;
        --pw-charcoal: #F6EFE6;
      }

      /* Dark-mode fixes for assets/colors that are not driven by the CSS vars */
      :root[data-theme="dark"] img[alt="seen"],
      :root[data-theme="dark"] img[alt="Close eye"] { filter: invert(1); }
      :root[data-theme="dark"] .social-btn { background: #FFFDF8 !important; }
      :root[data-theme="dark"] .social-btn svg { fill: #24292F; }
      :root[data-theme="dark"] .doodle-input { color: var(--ink); }
      :root[data-theme="dark"] .doodle-input::placeholder { color: var(--ink-faint); }

      * { box-sizing: border-box; }

      .doodle-btn {
        font-family: 'Itim', cursive;
        border: 2px solid var(--ink);
        border-radius: 12px;
        box-shadow: 3px 3px 0 0 var(--ink);
        cursor: pointer;
        transition: transform 100ms ease, box-shadow 100ms ease;
      }
      .doodle-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 0 var(--ink);
      }
      .doodle-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 0 var(--ink);
      }
      .doodle-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .doodle-input {
        font-family: 'Itim', cursive;
        font-size: 15px;
        color: var(--ink);
        border: 2px solid var(--ink);
        border-radius: 10px;
        padding: 10px 14px;
        width: 100%;
        outline: none;
        background: var(--bg-surface);
      }
      .doodle-input::placeholder {
        color: var(--ink-faint);
      }
      .doodle-input:focus {
        box-shadow: 2px 2px 0 0 var(--ink);
      }
      /* Safety net: any plain <input>/<select>/<textarea> that doesn't use
         .doodle-input (e.g. TaskBoard's filter dropdowns) still inherits a
         readable color instead of the browser's default black-on-anything. */
      input, select, textarea {
        color: var(--ink);
      }

      .has-mascot { position: relative; }
      .card-clean {
        background: var(--bg-surface);
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(53,59,70,0.08);
      }

      .float { animation: floaty 5s ease-in-out infinite; }
      @keyframes floaty {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }

      /* Used by every page reached from the app nav (Dashboard/Task/Chat/
         Calendar) so its content animates in on arrival. */
      .app-panel { animation: appPanelIn 320ms ease-out; }
      @keyframes appPanelIn {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 640px) {
        .app-username { display: none; }
        /* Every inner page's <main className="app-panel"> uses a fixed
           40px/80px desktop padding inline — override it here so it
           doesn't eat most of a phone screen. */
        .app-panel { padding: 20px 16px 48px !important; }
      }

      @media (max-width: 400px) {
        .app-panel { padding: 16px 12px 40px !important; }
      }

      @media (max-width: 860px) {
        .split-right { display: none; }
      }

      /* Login / Register / Verify-OTP cards — these use a fixed 440px card
         with 48px/44px desktop padding inline, which is too roomy once the
         viewport gets phone-sized. */
      @media (max-width: 480px) {
        .auth-page { padding: 16px !important; gap: 20px !important; }
        .auth-card { padding: 32px 22px !important; }
        .auth-heading { font-size: 28px !important; }
        .otp-card { padding: 30px 18px !important; }
      }

      @media (max-width: 380px) {
        /* 6 OTP boxes at their default 46px + 10px gap need ~326px, which
           doesn't fit a narrow phone even after the card padding shrinks
           above — so the boxes themselves need to shrink too. */
        .otp-row { gap: 6px !important; }
        .otp-digit { width: 38px !important; height: 48px !important; font-size: 20px !important; padding: 0 !important; }
      }

      /* Hand-drawn scrollbars: slim track, inked pill thumb tinted with the
         theme accent. (WebKit/Blink use ::-webkit-scrollbar; Firefox gets
         the closest standard equivalent. Setting scrollbar-width on
         Chrome would disable the custom thumb, so it is Firefox-only.) */
      *::-webkit-scrollbar { width: 12px; height: 12px; }
      *::-webkit-scrollbar-track { background: transparent; margin: 6px 0; }
      *::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--accent-color) 45%, var(--bg-surface));
        border: 2px solid var(--ink);
        border-radius: 999px;
        background-clip: padding-box;
      }
      *::-webkit-scrollbar-thumb:hover { background: var(--accent-color); background-clip: padding-box; }
      *::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
      *::-webkit-scrollbar-corner { background: transparent; }
      @supports (-moz-appearance: none) {
        * { scrollbar-width: thin; scrollbar-color: var(--accent-color) transparent; }
      }

      /* Generic safety net: nothing should ever force horizontal scroll. */
      html, body { overflow-x: hidden; }
      body { background: var(--bg-page); color: var(--ink); }
      img, svg { max-width: 100%; }
    `}</style>
  );
}
