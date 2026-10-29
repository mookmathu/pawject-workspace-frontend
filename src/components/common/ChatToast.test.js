import React from "react";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import ChatToast from "./ChatToast";
import * as api from "../../lib/api";
import * as navJump from "../../lib/navJump";

jest.mock("../../lib/api", () => ({
  ...jest.requireActual("../../lib/api"),
  getFriends: jest.fn(),
}));
jest.mock("../../lib/navJump", () => ({ setChatJump: jest.fn() }));

const router = require("../../testUtils/routerMock");
const mockNavigate = router.navigate;
jest.mock("react-router-dom", () => require("../../testUtils/routerMock"));

const handlers = {};
const mockSocket = { on: jest.fn(), off: jest.fn() };
jest.mock("../../lib/socket", () => ({ getSocket: () => mockSocket }));

const dm = (over = {}) => ({ id: "n1", type: "message", title: "ข้อความใหม่จาก Pim", body: "hello", link: { type: "dm", userId: "u2", name: "Pim" }, ...over });
const group = (over = {}) => ({ id: "n2", type: "message", title: "Ann ส่งข้อความในกลุ่ม Team", body: "hi all", link: { type: "workspace_chat", workspaceId: "w1", workspaceName: "Team" }, ...over });

const renderToast = (path = "/home") => {
  router.location.pathname = path;
  return render(<ChatToast />);
};
const push = (n) => act(() => handlers["notification:new"](n));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  // CRA resets mock implementations before every test, so wire them up here
  mockSocket.on.mockImplementation((ev, fn) => {
    handlers[ev] = fn;
  });
  api.getFriends.mockResolvedValue({ friends: [{ id: "u2", avatarUrl: "/api/auth/u2/avatar?v=1" }] });
});
afterEach(() => jest.useRealTimers());

describe("ChatToast", () => {
  it("renders nothing until a message arrives", () => {
    const { container } = renderToast();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a direct message with the sender's name and body", async () => {
    renderToast();
    push(dm());
    expect(screen.getByText("Pim")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    await waitFor(() => expect(api.getFriends).toHaveBeenCalledTimes(1));
  });

  it("shows group messages with the group name", () => {
    renderToast();
    push(group());
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.getByText("ในกลุ่ม Team")).toBeInTheDocument();
  });

  it("falls back to default body text and ignores unrelated notifications", () => {
    renderToast();
    push(null);
    push({ type: "task_assigned", title: "x" });
    push(dm({ body: "" }));
    expect(screen.getByText("ส่งข้อความถึงคุณ")).toBeInTheDocument();
  });

  it("stays quiet while the person is already in the chat", () => {
    const { container } = renderToast("/chat");
    push(dm());
    expect(container).toBeEmptyDOMElement();
  });

  it("replaces an earlier toast from the same conversation and keeps at most three", () => {
    renderToast();
    push(dm({ id: "a", body: "first" }));
    push(dm({ id: "b", body: "second" }));
    expect(screen.queryByText("first")).toBeNull();
    expect(screen.getByText("second")).toBeInTheDocument();
    push(group({ id: "c", link: { type: "workspace_chat", workspaceId: "w1", workspaceName: "T1" }, body: "g1" }));
    push(group({ id: "d", link: { type: "workspace_chat", workspaceId: "w2", workspaceName: "T2" }, body: "g2" }));
    push(group({ id: "e", link: { type: "workspace_chat", workspaceId: "w3", workspaceName: "T3" }, body: "g3" }));
    expect(screen.getAllByRole("button", { name: /./ }).filter((b) => b.className.includes("ct ")).length).toBeLessThanOrEqual(3);
    expect(screen.queryByText("second")).toBeNull();
  });

  it("dismisses itself after five seconds, but not while hovered", () => {
    renderToast();
    push(dm());
    const toast = screen.getByText("hello").closest(".ct");
    fireEvent.mouseEnter(toast);
    act(() => jest.advanceTimersByTime(6000));
    expect(screen.getByText("hello")).toBeInTheDocument();
    fireEvent.mouseLeave(toast);
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.getByText("hello").closest(".ct")).toHaveClass("is-out");
    act(() => jest.advanceTimersByTime(250));
    expect(screen.queryByText("hello")).toBeNull();
  });

  it("closes with the x button without opening the chat", () => {
    renderToast();
    push(dm());
    fireEvent.click(screen.getByLabelText("ปิด"));
    act(() => jest.advanceTimersByTime(250));
    expect(screen.queryByText("hello")).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("opens the DM or group conversation when clicked, or with Enter / Space", () => {
    renderToast();
    push(dm());
    fireEvent.click(screen.getByText("hello"));
    expect(navJump.setChatJump).toHaveBeenLastCalledWith({ type: "dm", id: "u2", name: "Pim" });
    expect(mockNavigate).toHaveBeenLastCalledWith("/chat");

    push(group());
    fireEvent.keyDown(screen.getByText("hi all").closest(".ct"), { key: "Enter" });
    expect(navJump.setChatJump).toHaveBeenLastCalledWith({ type: "workspace", id: "w1", name: "Team" });

    push(dm({ id: "z", body: "again" }));
    fireEvent.keyDown(screen.getByText("again").closest(".ct"), { key: " " });
    fireEvent.keyDown(screen.getByText("again").closest(".ct"), { key: "a" });
    expect(navJump.setChatJump).toHaveBeenCalledTimes(3);
  });

  it("does nothing sensible for a toast without a usable link", () => {
    renderToast();
    push(dm({ link: undefined, body: "nolink" }));
    fireEvent.click(screen.getByText("nolink"));
    expect(mockNavigate).not.toHaveBeenCalled();
    push({ id: "q", type: "message", title: "Someone", body: "odd", link: { type: "other" } });
    fireEvent.click(screen.getByText("odd"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("retries loading friend avatars after a failure and stops listening on unmount", async () => {
    api.getFriends.mockRejectedValueOnce(new Error("x")).mockResolvedValue({ friends: [] });
    const { unmount } = renderToast();
    push(dm({ id: "1" }));
    await waitFor(() => expect(api.getFriends).toHaveBeenCalledTimes(1));
    await act(async () => {});
    push(dm({ id: "2", body: "second" }));
    await waitFor(() => expect(api.getFriends).toHaveBeenCalledTimes(2));
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith("notification:new", handlers["notification:new"]);
  });

  it("uses the whole title when it matches neither pattern", () => {
    renderToast();
    push({ id: "t", type: "message", title: "Plain title", body: "b", link: { type: "dm", userId: "u2", name: "x" } });
    expect(screen.getByText("Plain title")).toBeInTheDocument();
    push({ id: "t2", type: "message", title: "ข้อความใหม่จาก", body: "b2", link: { type: "workspace_chat", workspaceId: "w9", workspaceName: "G" } });
    expect(screen.getByText("ข้อความใหม่จาก")).toBeInTheDocument();
  });
});
