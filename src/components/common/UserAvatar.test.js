import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import UserAvatar, { initialOf } from "./UserAvatar";
import { API_ORIGIN } from "../../lib/api";

describe("initialOf", () => {
  it("uses the first letter, uppercased", () => {
    expect(initialOf("ann")).toBe("A");
    expect(initialOf("  bob")).toBe("B");
    expect(initialOf("มธุ")).toBe("ม");
  });
  it("falls back to ? for empty names", () => {
    expect(initialOf("")).toBe("?");
    expect(initialOf("   ")).toBe("?");
    expect(initialOf(undefined)).toBe("?");
  });
});

describe("UserAvatar", () => {
  it("shows the initial when there is no photo", () => {
    render(<UserAvatar name="ann" title="Ann" className="c" style={{ width: 30 }} />);
    const el = screen.getByText("A");
    expect(el).toHaveAttribute("title", "Ann");
    expect(el).toHaveClass("c");
    expect(el).toHaveStyle({ width: "30px" });
  });

  it("shows the photo from the API origin", () => {
    const { container } = render(<UserAvatar avatarUrl="/api/auth/u1/avatar?v=1" name="ann" style={{ width: 30 }} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", `${API_ORIGIN}/api/auth/u1/avatar?v=1`);
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveStyle({ objectFit: "cover", width: "30px" });
  });

  it("falls back to the initial when the image fails to load, and retries for a new url", () => {
    const { container, rerender } = render(<UserAvatar avatarUrl="/a.png" name="bo" />);
    fireEvent.error(container.querySelector("img"));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("B")).toBeInTheDocument();
    rerender(<UserAvatar avatarUrl="/b.png" name="bo" />);
    expect(container.querySelector("img")).toHaveAttribute("src", `${API_ORIGIN}/b.png`);
  });
});
