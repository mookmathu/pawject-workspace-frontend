const mockSocket = { disconnect: jest.fn() };
jest.mock("socket.io-client", () => ({ io: jest.fn(() => mockSocket) }));

describe("shared socket", () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    mockSocket.disconnect.mockClear();
  });

  it("creates one lazy connection with the stored token and reuses it", () => {
    localStorage.setItem("crew_token", "tok");
    const { io } = require("socket.io-client");
    io.mockClear();
    const { getSocket } = require("./socket");
    const a = getSocket();
    const b = getSocket();
    expect(a).toBe(b);
    expect(io).toHaveBeenCalledTimes(1);
    expect(io.mock.calls[0][1]).toEqual({ auth: { token: "tok" }, autoConnect: false });
  });

  it("disconnects and lets the next call open a fresh connection", () => {
    const { io } = require("socket.io-client");
    io.mockClear();
    const { getSocket, disconnectSocket } = require("./socket");
    getSocket();
    disconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
    getSocket();
    expect(io).toHaveBeenCalledTimes(2);
  });

  it("disconnecting with no connection is a no-op", () => {
    const { disconnectSocket } = require("./socket");
    expect(() => disconnectSocket()).not.toThrow();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
