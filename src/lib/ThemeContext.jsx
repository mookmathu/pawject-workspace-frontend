import React, { createContext, useContext, useEffect, useState } from "react";

// The site has one fixed palette (Pawject cream / paw-blue / charcoal) and
// two modes: light and dark. The accent colour is constant; only the mode
// changes, via [data-theme="dark"] in GlobalStyles.jsx.
const MODE_STORAGE_KEY = "crew_theme_mode"; // "light" | "dark"
export const DEFAULT_ACCENT = "#4F83CC";

function applyBase() {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--accent-color", DEFAULT_ACCENT);
  try {
    localStorage.removeItem("crew_theme_color"); // legacy custom colour, no longer supported
  } catch {
    // best-effort only
  }
}

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
  mode: "light",
  toggleMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    applyBase();
    const initial = readStored(MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
    applyMode(initial); // set before first paint, no light-flash in dark mode
    return initial;
  });

  useEffect(() => {
    applyMode(mode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // best-effort only
    }
  }, [mode]);

  function toggleMode() {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ accentColor: DEFAULT_ACCENT, mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
