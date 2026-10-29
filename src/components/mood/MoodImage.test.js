import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MoodImage from "./MoodImage";
import MoodIcon from "./MoodIcon";
import * as api from "../../lib/api";

jest.mock("../../lib/api");

beforeEach(() => {
  URL.revokeObjectURL = jest.fn();
});

describe("MoodImage", () => {
  it("shows a placeholder, then the private image", async () => {
    api.fetchMoodImageUrl.mockResolvedValue("blob:one");
    const { container } = render(<MoodImage day="2026-10-29" alt="meme" style={{ width: 10 }} />);
    expect(container.querySelector("img")).toBeNull();
    await waitFor(() => expect(screen.getByAltText("meme")).toHaveAttribute("src", "blob:one"));
  });

  it("stays on the placeholder when the image is missing", async () => {
    api.fetchMoodImageUrl.mockRejectedValue(new Error("image"));
    const { container } = render(<MoodImage day="d" />);
    await waitFor(() => expect(api.fetchMoodImageUrl).toHaveBeenCalled());
    expect(container.querySelector("img")).toBeNull();
  });

  it("revokes the object URL on unmount and ignores a late answer", async () => {
    api.fetchMoodImageUrl.mockResolvedValue("blob:two");
    const first = render(<MoodImage day="d" />);
    await waitFor(() => expect(first.container.querySelector("img")).not.toBeNull());
    first.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:two");

    let resolve;
    api.fetchMoodImageUrl.mockReturnValue(new Promise((r) => (resolve = r)));
    const second = render(<MoodImage day="d" />);
    second.unmount();
    resolve("blob:late");
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:late"));
  });
});

describe("MoodIcon", () => {
  it("renders a known mood, including legacy keys", () => {
    render(<MoodIcon mood="love" size={20} />);
    expect(screen.getByAltText("มีความสุข")).toHaveAttribute("width", "20");
    render(<MoodIcon mood="great" />);
    expect(screen.getAllByAltText("มีความสุข")).toHaveLength(2);
  });

  it("renders nothing for an unknown mood", () => {
    const { container } = render(<MoodIcon mood="nope" />);
    expect(container).toBeEmptyDOMElement();
  });
});
