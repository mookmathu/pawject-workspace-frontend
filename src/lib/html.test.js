import { stripTags } from "./html";

describe("stripTags", () => {
  it("removes tags and keeps the text", () => {
    expect(stripTags("<p>Hello <b>world</b></p>", "")).toBe("Hello world");
  });

  it("replaces each tag with a space by default so words do not glue together", () => {
    expect(stripTags("<p>one</p><p>two</p>")).toBe(" one  two ");
  });

  it("leaves text without tags alone", () => {
    expect(stripTags("just text")).toBe("just text");
  });

  it("keeps a trailing unclosed '<' as text instead of looping forever", () => {
    expect(stripTags("a < b and <c")).toBe("a < b and <c");
  });

  it("handles empty and non-string input", () => {
    expect(stripTags("")).toBe("");
    expect(stripTags(null)).toBe("");
    expect(stripTags(undefined)).toBe("");
  });

  it("stays fast on many unclosed '<'", () => {
    const start = Date.now();
    stripTags("<".repeat(100000));
    expect(Date.now() - start).toBeLessThan(500);
  });
});
