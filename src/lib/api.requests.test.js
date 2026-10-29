import * as api from "./api";

const BASE = "http://localhost:4000/api";

function mockFetch(body = { ok: true }, { status = 200 } = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error("no body");
      return body;
    },
    blob: async () => new Blob(["x"]),
  });
  return global.fetch;
}

beforeEach(() => {
  localStorage.clear();
});

// [function name, args, HTTP method, path, expected body (or undefined)]
const JSON_CALLS = [
  ["registerUser", [{ name: "N", username: "u", email: "e", password: "p", orgType: "university", orgName: "KU" }], "POST", "/auth/register", { name: "N", username: "u", email: "e", password: "p", orgType: "university", orgName: "KU" }],
  ["loginUser", [{ email: "e", password: "p" }], "POST", "/auth/login", { email: "e", password: "p" }],
  ["forgotPassword", ["e"], "POST", "/auth/forgot-password", { email: "e" }],
  ["resetPassword", [{ email: "e", token: "t", newPassword: "n" }], "POST", "/auth/reset-password", { email: "e", token: "t", newPassword: "n" }],
  ["verifyOtp", [{ email: "e", otp: "1" }], "POST", "/auth/verify-otp", { email: "e", otp: "1" }],
  ["resendOtp", [{ email: "e" }], "POST", "/auth/resend-otp", { email: "e" }],
  ["checkUsernameAvailable", ["a b"], undefined, "/auth/check-username?username=a%20b"],
  ["getMyActivity", [], undefined, "/auth/me/activity"],
  ["getMyActivity", [2025], undefined, "/auth/me/activity?year=2025"],
  ["getUserActivity", ["u1"], undefined, "/auth/u1/activity"],
  ["getUserActivity", ["u1", 2025], undefined, "/auth/u1/activity?year=2025"],
  ["getMoodMonth", ["2026-10"], undefined, "/mood?month=2026-10"],
  ["getMoodRecent", [], undefined, "/mood?recent=90"],
  ["getMoodRecent", [30], undefined, "/mood?recent=30"],
  ["getMoodDay", ["2026-10-29"], undefined, "/mood?day=2026-10-29"],
  ["deleteMood", ["2026-10-29"], "DELETE", "/mood/2026-10-29"],
  ["getMe", [], undefined, "/auth/me"],
  ["getUserProfile", ["u1"], undefined, "/auth/u1/profile"],
  ["completeProfile", [{ username: "u", orgType: "university", orgName: "KU" }], "PATCH", "/auth/complete-profile", { username: "u", orgType: "university", orgName: "KU" }],
  ["updateProfile", [{ bio: "b" }], "PATCH", "/auth/me", { bio: "b" }],
  ["updateTheme", ["#fff"], "PATCH", "/auth/me/theme", { themeColor: "#fff" }],
  ["deleteAccount", ["pw"], "DELETE", "/auth/me", { password: "pw" }],
  ["getMyWorkspaces", [], undefined, "/workspaces"],
  ["createWorkspace", ["G"], "POST", "/workspaces", { name: "G" }],
  ["getWorkspaceBoard", ["w1"], undefined, "/workspaces/w1/board"],
  ["updateBoardNote", ["b1", [1]], "PATCH", "/board/b1/note", { noteContent: [1] }],
  ["addWorkspaceMember", ["w1", "bob"], "POST", "/workspaces/w1/members", { username: "bob" }],
  ["removeWorkspaceMember", ["w1", "u2"], "DELETE", "/workspaces/w1/members/u2"],
  ["deleteWorkspace", ["w1"], "DELETE", "/workspaces/w1"],
  ["joinWorkspaceByCode", ["ABC234"], "POST", "/workspaces/join", { code: "ABC234" }],
  ["regenerateWorkspaceJoinCode", ["w1"], "POST", "/workspaces/w1/join-code/regenerate"],
  ["transferWorkspaceOwnership", ["w1", "u2"], "POST", "/workspaces/w1/owner", { userId: "u2" }],
  ["createTask", ["b1", { title: "T", statusId: "s", priority: "high" }], "POST", "/board/b1/tasks", { title: "T", statusId: "s", priority: "high" }],
  ["updateTask", ["t1", { title: "N" }], "PATCH", "/tasks/t1", { title: "N" }],
  ["deleteTask", ["t1"], "DELETE", "/tasks/t1"],
  ["getMyTasks", [], undefined, "/tasks/mine"],
  ["addSubtask", ["t1", "s"], "POST", "/tasks/t1/subtasks", { title: "s" }],
  ["addComment", ["t1", "hi"], "POST", "/tasks/t1/comments", { content: "hi" }],
  ["deleteComment", ["c1"], "DELETE", "/comments/c1"],
  ["updateSubtask", ["s1", { done: true }], "PATCH", "/subtasks/s1", { done: true }],
  ["deleteSubtask", ["s1"], "DELETE", "/subtasks/s1"],
  ["createColumn", ["b1", "Col"], "POST", "/board/b1/columns", { name: "Col" }],
  ["updateColumn", ["c1", { name: "x" }], "PATCH", "/columns/c1", { name: "x" }],
  ["deleteColumn", ["c1"], "DELETE", "/columns/c1"],
  ["createCategory", ["b1", { name: "n", color: "#fff" }], "POST", "/board/b1/categories", { name: "n", color: "#fff" }],
  ["updateCategory", ["k1", { color: "#000" }], "PATCH", "/categories/k1", { color: "#000" }],
  ["deleteCategory", ["k1"], "DELETE", "/categories/k1"],
  ["getEvents", [{ year: 2026, month: 10 }], undefined, "/events?year=2026&month=10"],
  ["createEvent", [{ title: "E", startDate: "d", label: "urgent" }], "POST", "/events", { title: "E", startDate: "d", label: "urgent" }],
  ["updateEvent", ["e1", { title: "x" }], "PATCH", "/events/e1", { title: "x" }],
  ["deleteEvent", ["e1"], "DELETE", "/events/e1"],
  ["searchUsers", ["a&b"], undefined, "/users/search?q=a%26b"],
  ["getFriends", [], undefined, "/friends"],
  ["addFriend", ["bob_1"], "POST", "/friends", { friendId: "bob_1" }],
  ["setMyFriendId", ["bob_1"], "PATCH", "/auth/me/friend-id", { friendId: "bob_1" }],
  ["removeFriend", ["u2"], "DELETE", "/friends/u2"],
  ["getFriendRequests", [], undefined, "/friends/requests"],
  ["acceptFriendRequest", ["r1"], "POST", "/friends/requests/r1/accept"],
  ["rejectFriendRequest", ["r1"], "POST", "/friends/requests/r1/reject"],
  ["getNotifications", [], undefined, "/notifications"],
  ["markNotificationRead", ["n1"], "POST", "/notifications/n1/read"],
  ["markAllNotificationsRead", [], "POST", "/notifications/read-all"],
  ["getWorkspaceMessages", ["w1"], undefined, "/chat/workspace/w1/messages"],
  ["getDmMessages", ["u2"], undefined, "/chat/dm/u2/messages"],
  ["getUnreadCounts", [], undefined, "/chat/unread"],
];

describe("JSON endpoints", () => {
  // pad every row to 5 entries so jest never mistakes the missing body for a done() callback
  it.each(JSON_CALLS.map((r) => [r[0], r[1], r[2], r[3], r[4]]))("%s(%j) hits %s %s", async (name, args, method, path, body) => {
    const fetchMock = mockFetch({ hello: "world" });
    const result = await api[name](...args);
    expect(result).toEqual({ hello: "world" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}${path}`);
    expect(init.method).toBe(method);
    if (body) expect(JSON.parse(init.body)).toEqual(body);
    else expect(init.body).toBeUndefined();
  });

  it("login/register are public (no Authorization header) even if a token is stored", async () => {
    localStorage.setItem("crew_token", "tok");
    const fetchMock = mockFetch();
    await api.loginUser({ email: "e", password: "p" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it("signed-in endpoints send the bearer token when there is one", async () => {
    localStorage.setItem("crew_token", "tok");
    const fetchMock = mockFetch();
    await api.getMe();
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: "Bearer tok", "Content-Type": "application/json" });
  });

  it("signed-in endpoints omit it when logged out", async () => {
    const fetchMock = mockFetch();
    await api.getMe();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});

describe("error handling", () => {
  it("throws the server's message with code, email and status", async () => {
    mockFetch({ error: "nope", code: "EMAIL_NOT_VERIFIED", email: "a@b.co" }, { status: 403 });
    await expect(api.loginUser({ email: "a", password: "b" })).rejects.toMatchObject({
      message: "nope",
      code: "EMAIL_NOT_VERIFIED",
      email: "a@b.co",
      status: 403,
    });
  });

  it("falls back to a generic message when the body has no error or is not JSON", async () => {
    mockFetch({}, { status: 500 });
    await expect(api.getMe()).rejects.toThrow("เกิดข้อผิดพลาด");
    mockFetch(undefined, { status: 502 });
    await expect(api.getMe()).rejects.toMatchObject({ status: 502 });
  });

  it("returns null data when a successful response has no JSON body", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error("no body"); } });
    localStorage.setItem("crew_token", "t");
    expect(await api.getMe()).toBeNull();
  });
});

describe("request path guard", () => {
  // Every endpoint path starts with "/", so the guard only trips when an id
  // smuggles in a parent-directory or backslash segment.
  it.each(["../x", "a/../b", "a\\b"])("refuses an id containing %j and never calls fetch", async (id) => {
    const fetchMock = mockFetch();
    await expect(api.getWorkspaceBoard(id)).rejects.toThrow("Invalid request path");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only inspects the path, not the query string", async () => {
    const fetchMock = mockFetch();
    await api.searchUsers("../x");
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("multipart uploads", () => {
  const file = new File(["x"], "f.png", { type: "image/png" });

  it("uploadAvatar posts FormData with the token and no JSON content type", async () => {
    localStorage.setItem("crew_token", "tok");
    const fetchMock = mockFetch({ user: {} });
    await api.uploadAvatar(file);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/auth/me/avatar`);
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get("avatar")).toBeInstanceOf(File);
    expect(init.headers).toEqual({ Authorization: "Bearer tok" });
  });

  it("uploadAvatar works logged-out and reports errors", async () => {
    const fetchMock = mockFetch({ user: {} });
    await api.uploadAvatar(file);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
    mockFetch({ error: "too big" }, { status: 400 });
    await expect(api.uploadAvatar(file)).rejects.toThrow("too big");
    mockFetch(undefined, { status: 500 });
    await expect(api.uploadAvatar(file)).rejects.toThrow("อัปโหลดรูปไม่สำเร็จ");
  });

  it("uploadWorkspaceImage", async () => {
    const fetchMock = mockFetch({ workspace: {} });
    await api.uploadWorkspaceImage("w1", file);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/workspaces/w1/image`);
    expect(fetchMock.mock.calls[0][1].body.get("image")).toBeInstanceOf(File);
    mockFetch({ error: "bad" }, { status: 400 });
    await expect(api.uploadWorkspaceImage("w1", file)).rejects.toThrow("bad");
    mockFetch(undefined, { status: 500 });
    await expect(api.uploadWorkspaceImage("w1", file)).rejects.toThrow("อัปโหลดรูปกลุ่มไม่สำเร็จ");
  });

  it("saveMood sends mood, note and optional image / removeImage", async () => {
    let fetchMock = mockFetch({ entry: {} });
    await api.saveMood("2026-10-29", { mood: "good", note: "hi", image: file });
    let [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/mood/2026-10-29`);
    expect(init.method).toBe("PUT");
    expect(init.body.get("mood")).toBe("good");
    expect(init.body.get("image")).toBeInstanceOf(File);

    fetchMock = mockFetch({ entry: {} });
    await api.saveMood("2026-10-29", { mood: "ok", removeImage: true });
    init = fetchMock.mock.calls[0][1];
    expect(init.body.get("note")).toBe("");
    expect(init.body.get("removeImage")).toBe("1");

    localStorage.setItem("crew_token", "tok");
    fetchMock = mockFetch({ entry: {} });
    await api.saveMood("2026-10-29", { mood: "ok" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");

    mockFetch({ error: "x" }, { status: 400 });
    await expect(api.saveMood("d", { mood: "ok" })).rejects.toThrow("x");
    mockFetch(undefined, { status: 500 });
    await expect(api.saveMood("d", { mood: "ok" })).rejects.toThrow("บันทึกไม่สำเร็จ");
  });

  it("chat messages send content and/or an attachment", async () => {
    localStorage.setItem("crew_token", "tok");
    let fetchMock = mockFetch({ message: {} });
    await api.sendWorkspaceMessage("w1", { content: "hi", file });
    let [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/chat/workspace/w1/messages`);
    expect(init.body.get("content")).toBe("hi");
    expect(init.body.get("attachment")).toBeInstanceOf(File);
    expect(init.headers.Authorization).toBe("Bearer tok");

    fetchMock = mockFetch({ message: {} });
    await api.sendDmMessage("u2", { content: "yo" });
    [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/chat/dm/u2/messages`);
    expect(init.body.get("attachment")).toBeNull();

    fetchMock = mockFetch({ message: {} });
    await api.sendDmMessage("u2");
    expect(fetchMock.mock.calls[0][1].body.get("content")).toBeNull();

    localStorage.clear();
    fetchMock = mockFetch({ message: {} });
    await api.sendDmMessage("u2", { content: "a" });
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});

    mockFetch({ error: "full" }, { status: 400 });
    await expect(api.sendDmMessage("u2", { content: "a" })).rejects.toThrow("full");
    mockFetch(undefined, { status: 500 });
    await expect(api.sendWorkspaceMessage("w1", { content: "a" })).rejects.toThrow("ส่งข้อความไม่สำเร็จ");
  });
});

describe("fetchMoodImageUrl", () => {
  it("turns the private image into an object URL", async () => {
    URL.createObjectURL = jest.fn(() => "blob:abc");
    localStorage.setItem("crew_token", "tok");
    const fetchMock = mockFetch();
    expect(await api.fetchMoodImageUrl("2026-10-29")).toBe("blob:abc");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("works logged-out and throws when the image is missing", async () => {
    URL.createObjectURL = jest.fn(() => "blob:abc");
    const fetchMock = mockFetch();
    await api.fetchMoodImageUrl("d");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
    mockFetch({}, { status: 404 });
    await expect(api.fetchMoodImageUrl("d")).rejects.toThrow("image");
  });
});
