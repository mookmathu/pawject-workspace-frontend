import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyWorkspaces } from "./api";

// Shared "which workspaces does this user belong to" list — TaskBoard,
// CalendarView and HomePage each used to call getMyWorkspaces() on their
// own, so every navigation between them re-fetched the exact same data.
// This context fetches it once (when AppLayout first mounts) and everyone
// reads from here instead. Pages that change membership (creating a group,
// inviting/removing a member) call refreshWorkspaces() afterwards so the
// shared list doesn't go stale.
const WorkspacesContext = createContext(null);

export function WorkspacesProvider({ children }) {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshWorkspaces = useCallback(async () => {
    try {
      const { workspaces } = await getMyWorkspaces();
      setWorkspaces(workspaces);
      setError("");
      return workspaces;
    } catch (err) {
      // Same behavior the individual pages used to have: an expired/invalid
      // session bounces back to the login page instead of showing an error.
      if (err.status === 401) {
        navigate("/");
        return [];
      }
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    refreshWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorkspacesContext.Provider value={{ workspaces, loading, error, refreshWorkspaces }}>
      {children}
    </WorkspacesContext.Provider>
  );
}

export function useWorkspaces() {
  const ctx = useContext(WorkspacesContext);
  if (!ctx) {
    throw new Error("useWorkspaces() must be used inside <WorkspacesProvider>");
  }
  return ctx;
}
