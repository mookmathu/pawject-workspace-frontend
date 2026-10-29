import React from "react";
import { render, screen } from "@testing-library/react";
import BlinkDog from "./BlinkDog";
import DachFrame from "./DachFrame";

describe("BlinkDog", () => {
  it("is an accessible image sized from its width", () => {
    render(<BlinkDog width={200} style={{ margin: 3 }} />);
    const dog = screen.getByRole("img", { name: /Pawject/ });
    expect(dog).toHaveStyle({ width: "200px", height: `${Math.round(200 * (358 / 340))}px` });
    expect(dog.style.backgroundSize).toBe("1800% 100%");
    expect(dog).toHaveStyle({ margin: "3px" });
  });

  it("has a default size", () => {
    render(<BlinkDog />);
    expect(screen.getByRole("img")).toHaveStyle({ width: "260px" });
  });
});

describe("DachFrame", () => {
  it("wraps its children between the head and tail artwork", () => {
    const { container } = render(
      <DachFrame height={80} style={{ marginTop: 4 }}>
        <span>inside</span>
      </DachFrame>
    );
    expect(screen.getByText("inside").closest(".dachf-body")).not.toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(container.querySelector(".dachf").style.getPropertyValue("--dh")).toBe("80px");
  });

  it("has a default height", () => {
    const { container } = render(<DachFrame />);
    expect(container.querySelector(".dachf").style.getPropertyValue("--dh")).toBe("68px");
  });
});
