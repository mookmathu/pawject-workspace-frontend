import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import UserProfileModal from "../components/common/UserProfileModal";

// Lets any page open "someone else's profile card" (friends list, group
// members, chat) without each page owning its own copy of the modal —
// one instance lives here, mounted once by AppLayout, and any component
// under it just calls openUserProfile(userId).
const UserProfileCtx = createContext(null);

export function UserProfileProvider({ children }) {
  const [openUserId, setOpenUserId] = useState(null);

  const openUserProfile = useCallback((userId) => {
    if (userId) setOpenUserId(userId);
  }, []);
  const closeUserProfile = useCallback(() => setOpenUserId(null), []);

  const value = useMemo(() => ({ openUserProfile }), [openUserProfile]);

  return (
    <UserProfileCtx.Provider value={value}>
      {children}
      {openUserId && <UserProfileModal userId={openUserId} onClose={closeUserProfile} />}
    </UserProfileCtx.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileCtx);
  if (!ctx) {
    // Fails loudly instead of silently no-op-ing, so a page rendered outside
    // AppLayout by mistake is caught during development rather than just
    // quietly doing nothing when someone clicks a name.
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return ctx;
}
