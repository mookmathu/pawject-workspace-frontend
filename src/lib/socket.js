import { io } from "socket.io-client";
import { API_ORIGIN } from "./api";

let socket = null;

// One shared connection for the whole app, created the first time some page
// needs it (right now, only ChatPage) and reused after that — same idea as
// WorkspacesContext fetching its data once instead of every component
// opening its own copy. The JWT is sent as the handshake's `auth.token`
// (checked in the auth.controller.js of Express or lib/socket.js on the
// backend) since a socket connection doesn't get to send an Authorization
// header per message the way a normal fetch() call does.
export function getSocket() {
  if (socket) return socket;

  const token = localStorage.getItem("crew_token");
  socket = io(API_ORIGIN, {
    auth: { token },
    autoConnect: false,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
