import React, { useState } from "react";
import { Link } from "react-router-dom";
import GlobalStyles from "../loginpage/GlobalStyles";
import BoatMockup from "../loginpage/BoatMockup";
import { GoogleIcon, GithubIcon, FacebookIcon } from "../loginpage/icons";
import styles from "./styles";
import seenIcon from "../../images/seen.png";
import closeEyeIcon from "../../images/close-eye.png";

/**
 * RegisterPage
 * Same card + boat-mockup layout and hand-drawn styling as LoginPage,
 * with the extra fields a sign-up form needs: name, confirm password,
 * and a terms-of-service checkbox.
 */
export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreed, setAgreed] = useState(false);

    return (
        <div style={styles.page}>
            <GlobalStyles />

            {/* LEFT: floating register card */}
            <div style={styles.card} className="card-clean">
                <div style={styles.brandRow}>
                    <span style={styles.brandDot} />
                    <span style={styles.brandText}>Crew Space</span>
                </div>

                <h1 style={styles.heading}>สมัครสมาชิก</h1>
                <p style={styles.subheading}>สร้างบัญชีใหม่เพื่อเริ่มทำงานร่วมกับทีมของคุณ</p>

                <form
                    onSubmit={(e) => e.preventDefault()}
                    style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}
                >
                    <label style={styles.label}>
                        ชื่อผู้ใช้
                        <input
                            className="doodle-input"
                            type="text"
                            placeholder="ชื่อของคุณ"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ marginTop: 6 }}
                        />
                    </label>

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

                    <label style={styles.label}>
                        ยืนยันรหัสผ่าน
                        <input
                            className="doodle-input"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ marginTop: 6 }}
                        />
                    </label>

                    <div style={styles.checkboxRow}>
                        <input
                            id="agree-terms"
                            type="checkbox"
                            style={styles.checkbox}
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <label htmlFor="agree-terms" style={styles.checkboxLabel}>
                            ฉันยอมรับ <a href="#terms" style={styles.termsLink}>ข้อกำหนดการใช้งาน</a> และ{" "}
                            <a href="#privacy" style={styles.termsLink}>นโยบายความเป็นส่วนตัว</a>
                        </label>
                    </div>

                    <button type="submit" className="doodle-btn" style={styles.signInBtn} disabled={!agreed}>
                        สมัครสมาชิก
                    </button>

                    <div style={styles.dividerRow}>
                        <span style={styles.dividerLine} />
                        <span style={styles.dividerText}>หรือสมัครด้วย</span>
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
                        มีบัญชีอยู่แล้ว?{" "}
                        <Link to="/" style={styles.registerLink}>
                            เข้าสู่ระบบ
                        </Link>
                    </p>
                </form>
            </div>

            {/* RIGHT: boat illustration placeholder (shared with login) */}
            <BoatMockup />
        </div>
    );
}