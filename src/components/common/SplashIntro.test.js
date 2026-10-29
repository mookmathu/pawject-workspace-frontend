import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import SplashIntro from "./SplashIntro";

const KEY = "pawject_intro_seen";

function mockMotion(reduce) {
  window.matchMedia = jest.fn().mockReturnValue({ matches: reduce });
}

beforeEach(() => {
  sessionStorage.clear();
  mockMotion(false);
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete window.matchMedia;
});

describe("SplashIntro", () => {
  it("plays once: shows, reveals at 2s, unmounts at 2.9s and remembers it", () => {
    const { container } = render(<SplashIntro />);
    expect(container.querySelector(".splash")).not.toBeNull();
    expect(container.querySelector("[role='img']")).not.toBeNull(); // the blinking dog
    expect(sessionStorage.getItem(KEY)).toBe("1");
    expect(container.querySelector(".splash-leave")).toBeNull();

    act(() => jest.advanceTimersByTime(2000));
    expect(container.querySelector(".splash-leave")).not.toBeNull();

    act(() => jest.advanceTimersByTime(900));
    expect(container.querySelector(".splash")).toBeNull();
  });

  it("does not play again in the same session", () => {
    sessionStorage.setItem(KEY, "1");
    const { container } = render(<SplashIntro />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is skipped for people who prefer reduced motion", () => {
    mockMotion(true);
    const { container } = render(<SplashIntro />);
    expect(container).toBeEmptyDOMElement();
  });

  it("plays when the browser has no matchMedia or blocks storage", () => {
    delete window.matchMedia;
    const { container, unmount } = render(<SplashIntro />);
    expect(container.querySelector(".splash")).not.toBeNull();
    unmount();

    sessionStorage.clear();
    mockMotion(false);
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const again = render(<SplashIntro />);
    expect(again.container.querySelector(".splash")).not.toBeNull();
  });

  it("can be skipped with a click", () => {
    const { container } = render(<SplashIntro />);
    fireEvent.click(container.querySelector(".splash"));
    expect(container.querySelector(".splash-leave")).not.toBeNull();
    act(() => jest.advanceTimersByTime(900));
    expect(container.querySelector(".splash")).toBeNull();
  });

  it("cleans up its timers when unmounted early", () => {
    const { unmount } = render(<SplashIntro />);
    unmount();
    expect(() => act(() => jest.advanceTimersByTime(5000))).not.toThrow();
  });
});
