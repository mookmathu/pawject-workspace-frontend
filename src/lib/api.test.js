import { API_ORIGIN, resolveAvatarUrl, resolveAttachmentUrl, getOAuthUrl } from "./api";

// These three are the only parts of api.js that are pure (no fetch, no
// token, no side effects) — everything else in that file talks to the
// backend, so it belongs behind integration/E2E testing, not a unit test.
// What's worth pinning down here: a relative path from the server gets
// turned into a URL the browser can actually load, and a missing value
// stays null instead of turning into the literal string "null".
describe("api.js URL helpers", () => {
  it("API_ORIGIN has no trailing /api", () => {
    expect(API_ORIGIN.endsWith("/api")).toBe(false);
  });

  it("resolveAvatarUrl prefixes a relative avatar path with the API origin", () => {
    expect(resolveAvatarUrl("/api/auth/user-1/avatar?v=2")).toBe(
      `${API_ORIGIN}/api/auth/user-1/avatar?v=2`
    );
  });

  it("resolveAvatarUrl returns null as-is (so callers fall back to the initial-letter avatar)", () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl(undefined)).toBeNull();
    expect(resolveAvatarUrl("")).toBeNull();
  });

  it("resolveAttachmentUrl prefixes a relative attachment path with the API origin", () => {
    expect(resolveAttachmentUrl("/api/chat/messages/msg-1/attachment")).toBe(
      `${API_ORIGIN}/api/chat/messages/msg-1/attachment`
    );
  });

  it("resolveAttachmentUrl returns null as-is for no attachment", () => {
    expect(resolveAttachmentUrl(null)).toBeNull();
  });

  it("getOAuthUrl builds a provider-specific auth URL", () => {
    expect(getOAuthUrl("google")).toBe(`${API_ORIGIN}/api/auth/google`);
  });
});
