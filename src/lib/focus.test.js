import { focusOnMount } from "./focus";

describe("focusOnMount", () => {
  it("focuses the element it is given", () => {
    const el = { focus: jest.fn() };
    focusOnMount(el);
    expect(el.focus).toHaveBeenCalledTimes(1);
  });

  it("ignores null (React passes null on unmount)", () => {
    expect(() => focusOnMount(null)).not.toThrow();
  });
});
