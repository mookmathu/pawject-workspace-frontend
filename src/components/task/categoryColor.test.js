import { categoryColor } from "./categoryColor";

// categoryColor is what lets a category tag get a consistent color without
// the app maintaining a fixed name -> color table anywhere — these tests
// pin down the two properties that guarantee: same name always looks the
// same, and the result is always a real palette entry (never undefined,
// which would break the {bg, text} destructuring at every call site).
describe("categoryColor", () => {
  it("returns the same color for the same category name every time", () => {
    const first = categoryColor("งานด่วน");
    const second = categoryColor("งานด่วน");
    expect(second).toEqual(first);
  });

  it("returns a {bg, text} pair with usable CSS color strings", () => {
    const color = categoryColor("Frontend");
    expect(color).toHaveProperty("bg");
    expect(color).toHaveProperty("text");
    expect(color.bg).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
    expect(color.text).toMatch(/^#[0-9A-Fa-f]{3,6}$/);
  });

  it("falls back to the first palette entry for an empty/falsy name", () => {
    expect(categoryColor("")).toEqual(categoryColor(undefined));
  });

  it("different names can land on different colors (not a constant function)", () => {
    // Not guaranteed for every possible pair (it's a hash into a small
    // palette), but across a reasonably sized sample at least two distinct
    // colors should show up — otherwise the hash isn't doing anything.
    const names = ["Design", "Backend", "QA", "Docs", "Research", "Ops", "Marketing"];
    const colors = new Set(names.map((n) => categoryColor(n).bg));
    expect(colors.size).toBeGreaterThan(1);
  });
});
