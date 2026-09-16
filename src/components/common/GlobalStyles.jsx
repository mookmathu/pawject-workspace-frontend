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

      * { box-sizing: border-box; }

      .doodle-btn {
        font-family: 'Itim', cursive;
        border: 2px solid #221D17;
        border-radius: 12px;
        box-shadow: 3px 3px 0 0 #221D17;
        cursor: pointer;
        transition: transform 100ms ease, box-shadow 100ms ease;
      }
      .doodle-btn:hover {
        transform: translate(-1px, -1px);
        box-shadow: 4px 4px 0 0 #221D17;
      }
      .doodle-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 0 #221D17;
      }
      .doodle-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }

      .doodle-input {
        font-family: 'Itim', cursive;
        font-size: 15px;
        border: 2px solid #221D17;
        border-radius: 10px;
        padding: 10px 14px;
        width: 100%;
        outline: none;
        background: #FFFDF8;
      }
      .doodle-input:focus {
        box-shadow: 2px 2px 0 0 #221D17;
      }

      .card-clean {
        background: #FFFDF8;
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(34,29,23,0.08);
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

      /* Generic safety net: nothing should ever force horizontal scroll. */
      html, body { overflow-x: hidden; }
      img, svg { max-width: 100%; }
    `}</style>
  );
}
