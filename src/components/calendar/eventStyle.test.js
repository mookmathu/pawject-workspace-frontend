import { EVENT_LABELS, DEFAULT_LABEL, getLabel, labelSoftBg, MASCOT_STICKERS, EMOJI_STICKERS, mascotSticker, isMascotSticker, mascotName } from "./eventStyle";

describe("event labels", () => {
  it("match the keys the backend accepts", () => {
    expect(EVENT_LABELS.map((l) => l.key)).toEqual(["urgent", "important", "general", "personal", "idea"]);
  });

  it("falls back to the default label for unknown keys", () => {
    expect(getLabel("urgent").name).toBe("เร่งด่วน");
    expect(getLabel("nope").key).toBe(DEFAULT_LABEL);
    expect(getLabel(undefined).key).toBe("general");
  });

  it("builds a soft tint that works on light and dark surfaces", () => {
    expect(labelSoftBg("#E0615A")).toBe("color-mix(in srgb, #E0615A 20%, var(--bg-surface))");
    expect(labelSoftBg("#000", 35)).toContain("35%");
  });
});

describe("stickers", () => {
  it("round-trips mascot stickers", () => {
    const v = mascotSticker("puppy");
    expect(v).toBe("mascot:puppy");
    expect(isMascotSticker(v)).toBe(true);
    expect(mascotName(v)).toBe("puppy");
  });

  it("does not mistake emoji or empty values for mascots", () => {
    expect(isMascotSticker("🔥")).toBe(false);
    expect(isMascotSticker(null)).toBe(false);
    expect(isMascotSticker(undefined)).toBe(false);
  });

  it("offers the same mascots the backend allows", () => {
    expect([...MASCOT_STICKERS].sort()).toEqual(["artist", "ears", "glasses", "puppy", "reader", "scarf"]);
    expect(EMOJI_STICKERS.length).toBeGreaterThan(20);
  });
});
