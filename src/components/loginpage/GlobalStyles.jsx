import React from "react";

/**
 * Injects the hand-drawn "doodle" CSS system used across DoodleLoginPage:
 * rough hand-drawn borders/shadows, input/button styles, animations.
 * Fonts are loaded separately via <link> tags in public/index.html.
 * Rendered once at the top of DoodleLoginPage.
 */
export default function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      .rough {
        position: relative;
        border: 2.5px solid var(--ink);
        border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
        box-shadow: 5px 5px 0 0 var(--ink);
      }
      .rough-sm {
        border-radius: 12px 24px 12px 24px / 20px 12px 20px 12px;
      }
      .rough-dashed {
        position: relative;
        border: 2.5px dashed var(--ink);
        border-radius: 18px 32px 18px 32px / 28px 18px 28px 18px;
        background: #FBF8F1;
      }
      .card-clean {
        background: var(--bg-surface);
        border-radius: 28px;
        box-shadow: 0 20px 45px rgba(34, 29, 23, 0.12), 0 2px 8px rgba(34, 29, 23, 0.06);
      }
      .rough-tilt-l { transform: rotate(-0.6deg); }
      .rough-tilt-r { transform: rotate(0.6deg); }

      .doodle-input {
        font-family: 'Itim', cursive;
        background: var(--bg-surface);
        border: 2px solid var(--ink);
        border-radius: 10px 16px 10px 16px / 14px 10px 14px 10px;
        padding: 12px 14px;
        font-size: 17px;
        width: 100%;
        outline: none;
        transition: box-shadow 120ms ease, transform 120ms ease;
      }
      .doodle-input:focus {
        box-shadow: 3px 3px 0 0 var(--ink);
        transform: translate(-1px, -1px);
      }
      .doodle-input::placeholder { color: #A79E8E; }

      .doodle-btn {
        font-family: 'Itim', cursive;
        font-weight: 700;
        border: 2.5px solid var(--ink);
        border-radius: 10px 16px 10px 16px / 14px 10px 14px 10px;
        box-shadow: 4px 4px 0 0 var(--ink);
        cursor: pointer;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .doodle-btn:hover {
        transform: translate(-2px, -2px);
        box-shadow: 6px 6px 0 0 var(--ink);
      }
      .doodle-btn:active {
        transform: translate(1px, 1px);
        box-shadow: 2px 2px 0 0 var(--ink);
      }

      .social-btn {
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-surface);
      }

      .wiggle { animation: wiggle 4.5s ease-in-out infinite; }
      @keyframes wiggle {
        0%, 100% { transform: rotate(-2deg); }
        50% { transform: rotate(2deg); }
      }

      .float { animation: floaty 5s ease-in-out infinite; }
      @keyframes floaty {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }

      @media (max-width: 860px) {
        .split-right { display: none; }
      }
    `}</style>
  );
}