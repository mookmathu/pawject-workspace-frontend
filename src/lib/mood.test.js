import { MOODS, MOOD_BY_KEY, canonicalMood, todayKey, isPopupEnabled, setPopupEnabled, isDismissedToday, dismissToday } from "./mood";

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe("mood catalogue", () => {
  it("has five current moods, each with an emoji, label and tint", () => {
    expect(MOODS.map((m) => m.key)).toEqual(["love", "good", "ok", "stressed", "sad"]);
    MOODS.forEach((m) => expect(m).toEqual({ key: expect.any(String), emoji: expect.any(String), label: expect.any(String), tint: expect.stringMatching(/^#/) }));
  });

  it("maps legacy keys to the closest current mood", () => {
    expect(canonicalMood("great")).toBe("love");
    expect(canonicalMood("tired")).toBe("ok");
    expect(canonicalMood("angry")).toBe("stressed");
    expect(canonicalMood("good")).toBe("good");
    expect(MOOD_BY_KEY.great).toBe(MOOD_BY_KEY.love);
    expect(MOOD_BY_KEY.sad.key).toBe("sad");
  });
});

describe("todayKey", () => {
  it("uses the Bangkok calendar day", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-29T18:30:00Z")); // already the 30th in Bangkok
    expect(todayKey()).toBe("2026-10-30");
    jest.useRealTimers();
  });
});

describe("popup preference", () => {
  it("is on by default and can be switched off and on", () => {
    expect(isPopupEnabled()).toBe(true);
    setPopupEnabled(false);
    expect(isPopupEnabled()).toBe(false);
    setPopupEnabled(true);
    expect(isPopupEnabled()).toBe(true);
  });

  it("remembers a dismissal for today only", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-29T05:00:00Z"));
    expect(isDismissedToday()).toBe(false);
    dismissToday();
    expect(isDismissedToday()).toBe(true);
    jest.setSystemTime(new Date("2026-10-30T05:00:00Z"));
    expect(isDismissedToday()).toBe(false);
    jest.useRealTimers();
  });

  it("survives storage being unavailable", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(isPopupEnabled()).toBe(true);
    expect(isDismissedToday()).toBe(false);
    expect(() => setPopupEnabled(false)).not.toThrow();
    expect(() => setPopupEnabled(true)).not.toThrow();
    expect(() => dismissToday()).not.toThrow();
  });
});
