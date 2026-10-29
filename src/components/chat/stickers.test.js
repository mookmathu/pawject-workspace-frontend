import { STICKERS, stickerToken, parseSticker, fitWidth } from "./stickers";

describe("stickers", () => {
  it("ids are unique, lowercase letters only (the backend token regex)", () => {
    const ids = STICKERS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^[a-z]+$/));
  });

  it("round-trips a sticker through its token", () => {
    expect(stickerToken("pup")).toBe("[[sticker:pup]]");
    expect(parseSticker(stickerToken("pup"))).toMatchObject({ id: "pup" });
    expect(parseSticker(`  ${stickerToken("bone")}\n`)).toMatchObject({ id: "bone" });
  });

  it("ignores anything that is not exactly one known sticker token", () => {
    expect(parseSticker("hello")).toBeNull();
    expect(parseSticker("[[sticker:nope]]")).toBeNull();
    expect(parseSticker("hi [[sticker:pup]]")).toBeNull();
    expect(parseSticker(null)).toBeNull();
    expect(parseSticker(42)).toBeNull();
  });

  it("fitWidth keeps the artwork inside a square box", () => {
    expect(fitWidth({ ratio: 0.5 }, 100)).toBe(100); // wide: width-limited
    expect(fitWidth({ ratio: 2 }, 100)).toBe(50); // tall: height-limited
    expect(fitWidth({ ratio: 1 }, 80)).toBe(80);
  });
});
