import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import HeroIllustration from "../../components/mockups/HeroIllustration";
import shellStyles from "../../components/common/appShellStyles";
import styles from "./styles";

const NAV_ITEMS = [
  { label: "Home", path: "/home" },
  { label: "Dashboard", path: "/dashboard" },
  { label: "Task", path: "/task" },
  { label: "Chat", path: "/chat" },
  { label: "Calendar", path: "/calendar" },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser);

  const displayName = user?.name || "เพื่อนสมาชิก";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div style={styles.page}>
      <GlobalStyles />

      <section style={styles.hero}>
        <HeroIllustration style={styles.heroSvg} />

        <div style={styles.homeHeader}>
          <div style={styles.homeGreetingRow}>
            <span style={shellStyles.avatar}>{initial}</span>
            <h1 style={styles.heroGreeting}>ยินดีต้อนรับ, {displayName} 👋</h1>
          </div>

          <nav style={shellStyles.pillNav}>
            {NAV_ITEMS.map(({ label, path }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(path)}
                style={shellStyles.pillNavItem}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </section>
    </div>
  );
}
