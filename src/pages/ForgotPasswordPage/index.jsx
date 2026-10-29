import React, { useState } from "react";
import { Link } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import { CardMascot } from "../../components/common/Mascot";
import styles from "../LoginPage/styles";
import { forgotPassword } from "../../lib/api";
import { isValidEmail } from "../../lib/validation";


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page} className="auth-page">
      <GlobalStyles />
      <div style={styles.card} className="card-clean has-mascot auth-card">
        <CardMascot name="scarf" width={52} anim="wiggle" />
        <div style={styles.brandRow}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Pawject</span>
        </div>

        <h1 style={styles.heading} className="auth-heading">ลืมรหัสผ่าน?</h1>

        {sent ? (
          <>
            <p style={styles.subheading}>
              ถ้าอีเมล <strong>{email.trim()}</strong> มีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
              — เช็คกล่องจดหมาย (รวมถึงถังขยะ/สแปม) แล้วคลิกลิงก์ในอีเมลได้เลย
            </p>
            <Link to="/" style={styles.registerLink}>
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </>
        ) : (
          <>
            <p style={styles.subheading}>กรอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้</p>

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
                  style={{ marginTop: 6, ...(error ? styles.inputError : {}) }}
                />
                {error && <span style={styles.errorText}>{error}</span>}
              </label>

              <button type="submit" className="doodle-btn" style={styles.signInBtn} disabled={submitting}>
                {submitting ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
              </button>

              <p style={styles.footerText}>
                นึกรหัสผ่านได้แล้ว?{" "}
                <Link to="/" style={styles.registerLink}>
                  เข้าสู่ระบบ
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
