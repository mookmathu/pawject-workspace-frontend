import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import styles from "../LoginPage/styles";
import { getMe } from "../../lib/api";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const needsProfile = params.get("needsProfile") === "true";

    if (!token) {
      setError("เข้าสู่ระบบไม่สำเร็จ — ไม่พบ token");
      return;
    }

    localStorage.setItem("crew_token", token);

    getMe()
      .then(({ user }) => {
        localStorage.setItem("crew_user", JSON.stringify(user));
        navigate(needsProfile ? "/complete-profile" : "/welcome", { replace: true });
      })
      .catch((err) => {
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page} className="auth-page">
      <GlobalStyles />
      <div style={styles.card} className="card-clean auth-card">
        <div style={styles.brandRow}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Pawject</span>
        </div>
        {error ? (
          <>
            <p style={{ ...styles.errorText, textAlign: "center", marginTop: 20 }}>{error}</p>
            <button
              type="button"
              className="doodle-btn"
              style={{ ...styles.signInBtn, marginTop: 16 }}
              onClick={() => navigate("/")}
            >
              กลับไปหน้าเข้าสู่ระบบ
            </button>
          </>
        ) : (
          <p style={{ textAlign: "center", marginTop: 20, color: "var(--ink-faint)", fontFamily: "'Itim', cursive" }}>
            กำลังเข้าสู่ระบบ...
          </p>
        )}
      </div>
    </div>
  );
}
