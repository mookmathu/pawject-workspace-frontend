import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    ["a@b.co", "mook.mathu@ku.th", "first+tag@sub.domain.com", "a@b..c"].forEach((e) => expect(isValidEmail(e)).toBe(true));
  });

  it("rejects missing or misplaced parts", () => {
    ["", "plain", "@b.com", "a@", "a@b", "a@.com", "a@b.", "a@@b.com", "a@b@c.com"].forEach((e) => expect(isValidEmail(e)).toBe(false));
  });

  it("rejects whitespace anywhere", () => {
    ["a b@c.com", "a@b .com", " a@b.com", "a@b.com "].forEach((e) => expect(isValidEmail(e)).toBe(false));
  });

  it("rejects non-strings", () => {
    [null, undefined, 42, {}].forEach((e) => expect(isValidEmail(e)).toBe(false));
  });

  it("stays fast on long junk input", () => {
    const start = Date.now();
    isValidEmail("a".repeat(50000) + "@" + "b.".repeat(25000));
    expect(Date.now() - start).toBeLessThan(500);
  });
});
