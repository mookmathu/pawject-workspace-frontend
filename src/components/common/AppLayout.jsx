import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import GlobalStyles from "./GlobalStyles";
import AppHeader from "./AppHeader";
import styles from "./appShellStyles";
import { WorkspacesProvider } from "../../lib/WorkspacesContext";
import { UserProfileProvider } from "../../lib/UserProfileContext";
import { getSocket, disconnectSocket } from "../../lib/socket";

// Shared shell for every logged-in page (Home/Dashboard/Task/Chat/Calendar/
// Profile) — rendered once by the parent route in App.js, with each page's
// own component rendered inside via <Outlet/>.
//
// This used to be duplicated in every page (<GlobalStyles/> + <AppHeader/>
// re-created per page), which meant AppHeader — and its friend-requests
// fetch on mount — remounted on every single navigation. With one shared
// instance here, that fetch only runs once per session instead of once per
// click, cutting a chunk of the redundant traffic hitting the database.
export default function AppLayout() {
  // The Task board is a wide, side-scrolling Kanban — it gets the whole
  // viewport width; every other page keeps the centered reading column.

  // One socket connection for the whole logged-in session, not just while
  // ChatPage happens to be open — AppHeader's notification bell needs to
  // receive notification:new pushes no matter which page is showing.
  // ChatPage still gets and uses this same connection (getSocket() always
  // returns the one shared instance) for its own message/presence/typing
  // listeners; it just no longer owns connecting or disconnecting it.
  useEffect(() => {
    getSocket().connect();
    return () => disconnectSocket();
  }, []);

  return (
    <UserProfileProvider>
      <WorkspacesProvider>
        <div style={styles.page}>
          <GlobalStyles />
          <AppHeader />

          <main className="app-panel" style={styles.main}>
            <Outlet />
          </main>
        </div>
      </WorkspacesProvider>
    </UserProfileProvider>
  );
}
