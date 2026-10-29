import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme, DEFAULT_ACCENT } from "./ThemeContext";

function Probe() {
  const { mode, accentColor, toggleMode } = useTheme();
  return (
    <button onClick={toggleMode}>
      {mode}:{accentColor}
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("--accent-color");
});
afterEach(() => jest.restoreAllMocks());

describe("ThemeProvider", () => {
  it("starts light with the fixed accent colour and clears the legacy colour key", () => {
    localStorage.setItem("crew_theme_color", "#123456");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByRole("button")).toHaveTextContent(`light:${DEFAULT_ACCENT}`);
    expect(document.documentElement.style.getPropertyValue("--accent-color")).toBe(DEFAULT_ACCENT);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem("crew_theme_color")).toBeNull();
  });

  it("restores dark mode from storage before first paint", () => {
    localStorage.setItem("crew_theme_mode", "dark");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByRole("button")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles, updates the document and remembers the choice", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("crew_theme_mode")).toBe("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem("crew_theme_mode")).toBe("light");
  });

  it("still works when storage is blocked", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("dark");
  });

  it("has a safe default outside a provider", () => {
    render(<Probe />);
    expect(screen.getByRole("button")).toHaveTextContent("light");
  });
});
