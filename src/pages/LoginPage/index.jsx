import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import BoatMockup from "../../components/mockups/BoatMockup";
import { GoogleIcon, GithubIcon, FacebookIcon } from "../../components/common/icons";
import styles from "./styles";
import seenIcon from "../../assets/images/seen.png";
import closeEyeIcon from "../../assets/images/close-eye.png";
import { loginUser } from "../../lib/api";

/**
 * DoodleLoginPage
 * Layout: login card (left) floats beside an illustration area (right) —
 * matching the "Crew Space" reference where the card and illustration are
 * two separate elements, not boxed together.
 * Decoration: hand-drawn / doodle notebook style.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DoodleLoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};

    if (!email.trim()) {
      next.email = "กรุณากรอกอีเมล";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (!password) {
      next.password = "กรุณากรอกรหัสผ่าน";
    } else if (password.length < 6) {
      next.password = "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { token, user } = await loginUser({ email, password });

      localStorage.setItem("crew_token", token);
      localStorage.setItem("crew_user", JSON.stringify(user));

      navigate("/welcome");
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message }));
    } finally {
      setSubmitting(false);
    }
  }

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
          onSubmit={handleSubmit}
          noValidate
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
              style={{ marginTop: 6, ...(errors.email ? styles.inputError : {}) }}
            />
            {errors.email && <span style={styles.errorText}>{errors.email}</span>}
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
                style={{ paddingRight: 44, ...(errors.password ? styles.inputError : {}) }}
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
            {errors.password && <span style={styles.errorText}>{errors.password}</span>}
          </label>

          <a href="#forgot" style={styles.forgotLink}>
            ลืมรหัสผ่าน?
          </a>

          {errors.form && (
            <p style={{ ...styles.errorText, textAlign: "center" }}>{errors.form}</p>
          )}

          <button type="submit" className="doodle-btn" style={styles.signInBtn} disabled={submitting}>
            {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
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
