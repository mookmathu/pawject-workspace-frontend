import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import styles from "../LoginPage/styles";
import { resetPassword } from "../../lib/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const missingLinkData = !email || !token;

  function validate() {
    const next = {};
    if (!newPassword) {
      next.newPassword = "กรุณากรอกรหัสผ่านใหม่";
    } else if (newPassword.length < 8) {
      next.newPassword = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }
    if (confirmPassword !== newPassword) {
      next.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await resetPassword({ email, token, newPassword });
      setDone(true);
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page} className="auth-page">
      <GlobalStyles />
      <div style={styles.card} className="card-clean auth-card">
        <div style={styles.brandRow}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Pawject</span>
        </div>

        <h1 style={styles.heading} className="auth-heading">ตั้งรหัสผ่านใหม่</h1>

        {missingLinkData ? (
          <>
            <p style={{ ...styles.errorText, marginTop: 12 }}>
              ลิงก์นี้ไม่ถูกต้อง — กรุณาเปิดจากอีเมลที่ได้รับ หรือขอลิงก์ใหม่อีกครั้ง
            </p>
            <Link to="/forgot-password" style={styles.registerLink}>
              ขอลิงก์ใหม่
            </Link>
          </>
        ) : done ? (
          <>
            <p style={styles.subheading}>ตั้งรหัสผ่านใหม่สำเร็จแล้ว ลองเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
            <button type="button" className="doodle-btn" style={styles.signInBtn} onClick={() => navigate("/")}>
              ไปหน้าเข้าสู่ระบบ
            </button>
          </>
        ) : (
          <>
            <p style={styles.subheading}>ตั้งรหัสผ่านใหม่สำหรับ {email}</p>

            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}
            >
              <label style={styles.label}>
                รหัสผ่านใหม่
                <input
                  className="doodle-input"
                  type="password"
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ marginTop: 6, ...(errors.newPassword ? styles.inputError : {}) }}
                />
                {errors.newPassword && <span style={styles.errorText}>{errors.newPassword}</span>}
              </label>

              <label style={styles.label}>
                ยืนยันรหัสผ่านใหม่
                <input
                  className="doodle-input"
                  type="password"
                  placeholder="พิมพ์อีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ marginTop: 6, ...(errors.confirmPassword ? styles.inputError : {}) }}
                />
                {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
              </label>

              {errors.form && <p style={{ ...styles.errorText, textAlign: "center" }}>{errors.form}</p>}

              <button type="submit" className="doodle-btn" style={styles.signInBtn} disabled={submitting}>
                {submitting ? "กำลังบันทึก..." : "ตั้งรหัสผ่านใหม่"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
