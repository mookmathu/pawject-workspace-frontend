import React, { useState } from "react";
import { Link } from "react-router-dom";
import GlobalStyles from "./GlobalStyles";
import BoatMockup from "./BoatMockup";
import { GoogleIcon, GithubIcon, FacebookIcon } from "./icons";
import styles from "./styles";
import seenIcon from "../../images/seen.png";
import closeEyeIcon from "../../images/close-eye.png";

/**
 * DoodleLoginPage
 * Layout: login card (left) floats beside an illustration area (right) —
 * matching the "Crew Space" reference where the card and illustration are
 * two separate elements, not boxed together.
 * Decoration: hand-drawn / doodle notebook style.
 */
export default function DoodleLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {/* LEFT: floating login card */}
      <div style={styles.card} className="card-clean">
        <div style={styles.brandRow}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Crew Space</span>
        </div>

        <h1 style={styles.heading}>เข้าสู่ระบบ</h1>
        <p style={styles.subheading}>ดีใจที่เจอกันอีกครั้งนะ! กรอกข้อมูลเพื่อเข้าทีมของคุณ</p>

        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}
        >
          <label style={styles.label}>
            อีเมล
            <input
              className="doodle-input"
              type="email"
              placeholder="username@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </label>

          <label style={styles.label}>
            รหัสผ่าน
            <div style={{ position: "relative", marginTop: 6 }}>
              <input
                className="doodle-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <img src={seenIcon} alt="seen" style={{ width: 20, height: 20 }} />
                ) : (
                  <img src={closeEyeIcon} alt="Close eye" style={{ width: 20, height: 20 }} />
                )}
              </button>
            </div>
          </label>

          <a href="#forgot" style={styles.forgotLink}>
            ลืมรหัสผ่าน?
          </a>

          <button type="submit" className="doodle-btn" style={styles.signInBtn}>
            เข้าสู่ระบบ
          </button>

          <div style={styles.dividerRow}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>หรือเข้าสู่ระบบด้วย</span>
            <span style={styles.dividerLine} />
          </div>

          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button type="button" className="doodle-btn rough-sm social-btn" aria-label="Google">
              <GoogleIcon />
            </button>
            <button type="button" className="doodle-btn rough-sm social-btn" aria-label="GitHub">
              <GithubIcon />
            </button>
            <button type="button" className="doodle-btn rough-sm social-btn" aria-label="Facebook">
              <FacebookIcon />
            </button>
          </div>

          <p style={styles.footerText}>
            ยังไม่มีบัญชีใช่ไหม?{" "}
            <Link to="/register" style={styles.registerLink}>
              สมัครสมาชิกฟรี
            </Link>
          </p>
        </form>
      </div>

      {/* RIGHT: boat illustration placeholder */}
      <BoatMockup />
    </div>
  );
}