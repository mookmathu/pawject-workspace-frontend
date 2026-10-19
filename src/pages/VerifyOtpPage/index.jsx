import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import { CardMascot } from "../../components/common/Mascot";
import styles from "./styles";
import { verifyOtp, resendOtp } from "../../lib/api";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtpPage() {
    const navigate = useNavigate();
    const location = useLocation();
    // Email/password signups arrive with the address in router state; a social
    // sign-in (Google/GitHub/Facebook) comes back from the provider as a full
    // page redirect, so there it travels in the query string instead.
    const query = new URLSearchParams(location.search);
    const email = location.state?.email || query.get("email") || "";
    const isSocial = query.get("social") === "1";

    const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef([]);

    // No email in state (e.g. page reloaded directly) — send them back to
    // register instead of showing a broken form.
    useEffect(() => {
        if (!email) {
            navigate("/register", { replace: true });
        }
    }, [email, navigate]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    function handleDigitChange(index, value) {
        const clean = value.replace(/[^0-9]/g, "");
        if (!clean) {
            setDigits((prev) => {
                const next = [...prev];
                next[index] = "";
                return next;
            });
            return;
        }

        // Handle pasting a full code into one box.
        if (clean.length > 1) {
            const chars = clean.slice(0, OTP_LENGTH).split("");
            setDigits((prev) => {
                const next = [...prev];
                chars.forEach((ch, i) => {
                    if (index + i < OTP_LENGTH) next[index + i] = ch;
                });
                return next;
            });
            const lastFilled = Math.min(index + chars.length, OTP_LENGTH) - 1;
            inputRefs.current[lastFilled]?.focus();
            return;
        }

        setDigits((prev) => {
            const next = [...prev];
            next[index] = clean;
            return next;
        });

        if (index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(index, e) {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const otp = digits.join("");
        setError("");
        setInfo("");

        if (otp.length !== OTP_LENGTH) {
            setError("กรุณากรอกรหัสให้ครบ 6 หลัก");
            return;
        }

        setSubmitting(true);
        try {
            const { token, user } = await verifyOtp({ email, otp });

            localStorage.setItem("crew_token", token);
            localStorage.setItem("crew_user", JSON.stringify(user));

            // A first-time social sign-in still has to pick a username etc.
            navigate(user.username ? "/welcome" : "/complete-profile", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResend() {
        if (cooldown > 0) return;
        setError("");
        setInfo("");
        try {
            await resendOtp({ email });
            setInfo("ส่งรหัสใหม่ไปที่อีเมลแล้ว");
            setCooldown(RESEND_COOLDOWN_SECONDS);
            setDigits(Array(OTP_LENGTH).fill(""));
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError(err.message);
        }
    }

    if (!email) return null;

    return (
        <div style={styles.page} className="auth-page">
            <GlobalStyles />
            <div style={styles.card} className="card-clean has-mascot otp-card">
        <CardMascot name="glasses" width={50} anim="sway" />
                <div style={styles.brandRow}>
                    <span style={styles.brandDot} />
                    <span style={styles.brandText}>Pawject</span>
                </div>

                <h1 style={styles.heading}>{isSocial ? "ยืนยันการเข้าสู่ระบบ" : "ยืนยันอีเมลของคุณ"}</h1>
                <p style={styles.subheading}>
                    เราส่งรหัส 6 หลักไปที่ <span style={styles.emailHighlight}>{email}</span>
                    <br />
                    {isSocial ? "กรอกรหัสด้านล่างเพื่อเข้าสู่ระบบ" : "กรอกรหัสด้านล่างเพื่อยืนยันบัญชี"}
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={styles.otpRow} className="otp-row">
                        {digits.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => (inputRefs.current[i] = el)}
                                className="doodle-input otp-digit"
                                type="text"
                                inputMode="numeric"
                                maxLength={OTP_LENGTH}
                                value={digit}
                                onChange={(e) => handleDigitChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                style={{ ...styles.otpDigit, ...(error ? styles.otpDigitError : {}) }}
                            />
                        ))}
                    </div>

                    {error && <p style={styles.errorText}>{error}</p>}
                    {!error && info && <p style={styles.successText}>{info}</p>}

                    <button type="submit" className="doodle-btn" style={styles.verifyBtn} disabled={submitting}>
                        {submitting ? "กำลังยืนยัน..." : isSocial ? "ยืนยันและเข้าสู่ระบบ" : "ยืนยันอีเมล"}
                    </button>
                </form>

                <div style={styles.resendRow}>
                    ไม่ได้รับรหัส?{" "}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={cooldown > 0}
                        style={{ ...styles.resendBtn, ...(cooldown > 0 ? styles.resendBtnDisabled : {}) }}
                    >
                        {cooldown > 0 ? `ส่งรหัสใหม่ได้ใน ${cooldown} วิ` : "ส่งรหัสอีกครั้ง"}
                    </button>
                </div>

                <Link to="/" style={styles.backLink}>
                    ← กลับไปหน้าเข้าสู่ระบบ
                </Link>
            </div>
        </div>
    );
}
