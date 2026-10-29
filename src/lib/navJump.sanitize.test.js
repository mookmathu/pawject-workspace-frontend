import { setTaskJump, consumeTaskJump, setChatJump, consumeChatJump } from "./navJump";

beforeEach(() => sessionStorage.clear());

describe("jump targets only keep plain id/name strings", () => {
  it("task jump drops anything extra and stringifies ids", () => {
    setTaskJump({ workspaceId: 7, taskId: "t1", evil: "<script>" });
    expect(consumeTaskJump()).toEqual({ workspaceId: "7", taskId: "t1" });
  });

  it("chat jump keeps only type, id and name", () => {
    setChatJump({ type: "dm", id: "u1", name: "Pim", extra: { a: 1 } });
    expect(consumeChatJump()).toEqual({ type: "dm", id: "u1", name: "Pim" });
  });

  it("missing values become empty strings, not 'undefined'", () => {
    setChatJump({});
    expect(consumeChatJump()).toEqual({ type: "", id: "", name: "" });
  });
});
