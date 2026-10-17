import React, { createContext, useContext, useEffect, useState } from "react";

// The whole app's accent color lives in one CSS custom property
// (--accent-color), set on <html>. Every shared/page style file that wants
// to follow the theme just writes `var(--accent-color)` instead of a fixed
// hex, so changing it here repaints everything at once with no reload.
const COLOR_STORAGE_KEY = "crew_theme_color";
const MODE_STORAGE_KEY = "crew_theme_mode"; // "light" | "dark"
export const DEFAULT_ACCENT = "#4F83CC"; // deeper Paw Blue (readable with white text)
const LEGACY_DEFAULT_ACCENT = "#3E6BE0"; // the old boat-era default — treated as "never chose a color"

// A small curated palette shown in the Profile page's picker — the user
// can also type any custom hex value.
export const THEME_PRESETS = [
  { name: "ฟ้าอุ้งเท้า", value: "#4F83CC" },
  { name: "พีชบิสกิต", value: "#E07F52" },
  { name: "เสจพัพปี้", value: "#5BA06F" },
  { name: "ลาเวนเดอร์", value: "#9A74B8" },
  { name: "บัตเตอร์", value: "#D4A92F" },
  { name: "ชมพูอุ้งเท้า", value: "#E0708C" },
  { name: "น้ำตาลช็อก", value: "#8A5A3B" },
  { name: "ชาร์โคล", value: "#4A5260" },
];

function applyAccentColor(color) {
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--accent-color", color);
  }
}

// Light is the implicit default (no attribute needed — :root already holds
// the light values), dark is opted into via [data-theme="dark"] in
// GlobalStyles.jsx.
function applyMode(mode) {
  if (typeof document === "undefined") return;
  if (mode === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function readStored(key) {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

const ThemeContext = createContext({
  accentColor: DEFAULT_ACCENT,
  setAccentColor: () => {},
  mode: "light",
  toggleMode: () => {},
});

export function ThemeProvider({ children }) {
  const [accentColor, setAccentColorState] = useState(() => {
    const stored = readStored(COLOR_STORAGE_KEY);
    const initial = !stored || stored.toLowerCase() === LEGACY_DEFAULT_ACCENT.toLowerCase() ? DEFAULT_ACCENT : stored;
    applyAccentColor(initial); // set before first paint, no default-color flash
    return initial;
  });

  const [mode, setMode] = useState(() => {
    const initial = readStored(MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
    applyMode(initial); // set before first paint, no light-flash in dark mode
    return initial;
  });

  useEffect(() => {
    applyAccentColor(accentColor);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, accentColor);
    } catch {
      // best-effort only
    }
  }, [accentColor]);

  useEffect(() => {
    applyMode(mode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // best-effort only
    }
  }, [mode]);

  function setAccentColor(color) {
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      setAccentColorState(color);
    }
  }

  function toggleMode() {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor, mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
