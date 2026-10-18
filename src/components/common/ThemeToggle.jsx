import React from "react";
import { useTheme } from "../../lib/ThemeContext";
import { SunIcon, MoonIcon } from "./dashboardIcons";

/**
 * Floating light/dark switch for the pages that have no header (login,
 * register, OTP, forgot/reset password, profile setup, legal pages). The
 * choice is the same one the in-app header toggle uses, so it carries over
 * after signing in.
 */
export default function ThemeToggle() {
  const { mode, toggleMode } = useTheme();
  const dark = mode === "dark";
  return (
    <button
      type="button"
      className="theme-float-toggle"
      onClick={toggleMode}
      title={dark ? "สลับเป็นธีมสว่าง" : "สลับเป็นธีมมืด"}
      aria-label={dark ? "สลับเป็นธีมสว่าง" : "สลับเป็นธีมมืด"}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 50,
        width: 42,
        height: 42,
        borderRadius: "50%",
        border: "2px solid var(--ink)",
        background: "var(--bg-surface)",
        color: "var(--ink)",
        boxShadow: "3px 3px 0 0 var(--ink)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {dark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
