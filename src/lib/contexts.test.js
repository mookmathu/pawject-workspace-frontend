import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspacesProvider, useWorkspaces } from "./WorkspacesContext";
import { UserProfileProvider, useUserProfile } from "./UserProfileContext";
import * as api from "./api";

jest.mock("./api");
jest.mock("../components/common/UserProfileModal", () => ({ userId, onClose }) => (
  <div>
    modal:{userId}
    <button onClick={onClose}>close</button>
  </div>
));

const mockNavigate = require("../testUtils/routerMock").navigate;
jest.mock("react-router-dom", () => require("../testUtils/routerMock"));

let ctx;
function Probe() {
  ctx = useWorkspaces();
  return <div>{ctx.loading ? "loading" : `${ctx.workspaces.length} workspaces`}{ctx.error && ` error:${ctx.error}`}</div>;
}
const renderWs = () =>
  render(
    <MemoryRouter>
      <WorkspacesProvider>
        <Probe />
      </WorkspacesProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.resetAllMocks();
});

describe("WorkspacesProvider", () => {
  it("loads once and exposes the list", async () => {
    api.getMyWorkspaces.mockResolvedValue({ workspaces: [{ id: "w1" }, { id: "w2" }] });
    renderWs();
    expect(screen.getByText("loading")).toBeInTheDocument();
    await screen.findByText("2 workspaces");
    expect(api.getMyWorkspaces).toHaveBeenCalledTimes(1);
  });

  it("can be refreshed", async () => {
    api.getMyWorkspaces.mockResolvedValueOnce({ workspaces: [] }).mockResolvedValueOnce({ workspaces: [{ id: "w9" }] });
    renderWs();
    await screen.findByText("0 workspaces");
    await act(async () => {
      expect(await ctx.refreshWorkspaces()).toEqual([{ id: "w9" }]);
    });
    await screen.findByText("1 workspaces");
  });

  it("sends an expired session back to the login page", async () => {
    api.getMyWorkspaces.mockRejectedValue(Object.assign(new Error("expired"), { status: 401 }));
    renderWs();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });

  it("surfaces other errors from a refresh and rethrows them", async () => {
    api.getMyWorkspaces.mockResolvedValueOnce({ workspaces: [] });
    renderWs();
    await screen.findByText("0 workspaces");
    api.getMyWorkspaces.mockRejectedValueOnce(new Error("boom"));
    await act(async () => {
      await expect(ctx.refreshWorkspaces()).rejects.toThrow("boom");
    });
    expect(screen.getByText(/error:boom/)).toBeInTheDocument();
  });

  it("refuses to be used outside a provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("WorkspacesProvider");
  });
});

describe("UserProfileProvider", () => {
  function Opener() {
    const { openUserProfile } = useUserProfile();
    return (
      <>
        <button onClick={() => openUserProfile("u7")}>open</button>
        <button onClick={() => openUserProfile(null)}>open-empty</button>
      </>
    );
  }

  it("opens and closes the profile modal for a user", () => {
    render(
      <UserProfileProvider>
        <Opener />
      </UserProfileProvider>
    );
    expect(screen.queryByText(/modal:/)).toBeNull();
    screen.getByText("open-empty").click();
    expect(screen.queryByText(/modal:/)).toBeNull();
    act(() => screen.getByText("open").click());
    expect(screen.getByText("modal:u7")).toBeInTheDocument();
    act(() => screen.getByText("close").click());
    expect(screen.queryByText(/modal:/)).toBeNull();
  });

  it("refuses to be used outside a provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Opener />)).toThrow("UserProfileProvider");
  });
});
