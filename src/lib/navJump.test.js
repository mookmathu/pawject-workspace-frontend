import { setTaskJump, consumeTaskJump, setChatJump, consumeChatJump } from "./navJump";

// navJump is a tiny sessionStorage-backed "write once, read once" mailbox —
// these tests exist to pin down exactly that contract, since a regression
// here (e.g. forgetting to clear the key) would silently break every
// deep-link consumer in the app (TaskBoard, ChatPage, the notification bell).
describe("navJump", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("task jump", () => {
    it("returns null when nothing was set", () => {
      expect(consumeTaskJump()).toBeNull();
    });

    it("round-trips the workspace/task id that was set", () => {
      setTaskJump({ workspaceId: "ws-1", taskId: "task-1" });
      expect(consumeTaskJump()).toEqual({ workspaceId: "ws-1", taskId: "task-1" });
    });

    it("only returns the value once — a second read is null", () => {
      setTaskJump({ workspaceId: "ws-1", taskId: "task-1" });
      consumeTaskJump();
      expect(consumeTaskJump()).toBeNull();
    });

    it("a later set overwrites an unconsumed earlier one", () => {
      setTaskJump({ workspaceId: "ws-1", taskId: "task-1" });
      setTaskJump({ workspaceId: "ws-2", taskId: "task-2" });
      expect(consumeTaskJump()).toEqual({ workspaceId: "ws-2", taskId: "task-2" });
    });
  });

  describe("chat jump", () => {
    it("returns null when nothing was set", () => {
      expect(consumeChatJump()).toBeNull();
    });

    it("round-trips a dm target", () => {
      setChatJump({ type: "dm", id: "user-1", name: "Mook" });
      expect(consumeChatJump()).toEqual({ type: "dm", id: "user-1", name: "Mook" });
    });

    it("round-trips a workspace target and only once", () => {
      setChatJump({ type: "workspace", id: "ws-1", name: "โปรเจกต์จบ" });
      expect(consumeChatJump()).toEqual({ type: "workspace", id: "ws-1", name: "โปรเจกต์จบ" });
      expect(consumeChatJump()).toBeNull();
    });

    it("keeps the task jump and chat jump independent of each other", () => {
      setTaskJump({ workspaceId: "ws-1", taskId: "task-1" });
      setChatJump({ type: "dm", id: "user-1", name: "Mook" });
      expect(consumeChatJump()).toEqual({ type: "dm", id: "user-1", name: "Mook" });
      // The task jump should still be there — consuming one must not
      // touch the other's key.
      expect(consumeTaskJump()).toEqual({ workspaceId: "ws-1", taskId: "task-1" });
    });
  });
});
