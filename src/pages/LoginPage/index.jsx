import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import { AuthStyles, AuthDogAside } from "../../components/common/authTheme";
import { PawPrint } from "../../components/mockups/DogSVG";
import { GoogleIcon, GithubIcon, FacebookIcon } from "../../components/common/icons";
import seenIcon from "../../assets/images/seen.png";
import closeEyeIcon from "../../assets/images/close-eye.png";
import { loginUser, getOAuthUrl, getMe } from "../../lib/api";

/**
 * DoodleLoginPage
 * Layout: login card (left) floats beside an illustration area (right) —
 * matching the "Pawject" reference where the card and illustration are
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

  // Already signed in (the token lasts 7 days and lives in localStorage)?
  // Skip the form and go straight in. An expired/invalid token is cleared so
  // the form shows normally; a network hiccup keeps the token and just shows
  // the form. Skipped after a failed social sign-in so its error is visible.
  const [checking, setChecking] = useState(() => {
    try {
      return !!localStorage.getItem("crew_token") && !new URLSearchParams(window.location.search).get("oauthError");
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!checking) return undefined;
    let alive = true;
    getMe()
      .then(({ user }) => {
        if (!alive) return;
        try {
          localStorage.setItem("crew_user", JSON.stringify(user));
        } catch {
          // best-effort only
        }
        navigate("/welcome", { replace: true });
      })
      .catch((err) => {
        if (!alive) return;
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          localStorage.removeItem("crew_token");
          localStorage.removeItem("crew_user");
        }
        setChecking(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The backend sends the browser back to "/?oauthError=1" when a social
  // sign-in fails (provider refused, or the verification email couldn't be
  // sent) — without this the page just looked like nothing happened.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("oauthError")) {
      setErrors({ form: "เข้าสู่ระบบด้วยบัญชีโซเชียลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง หรือเข้าสู่ระบบด้วยอีเมล" });
    }
  }, []);

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
      if (err.code === "EMAIL_NOT_VERIFIED") {
        // The backend already sent a fresh OTP — just take them to enter it.
        navigate("/verify-otp", { state: { email: err.email || email } });
        return;
      }
      setErrors((prev) => ({ ...prev, form: err.message }));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="auth-page lg-page">
      <GlobalStyles />
      <AuthStyles />

      <div className="lg-shell">
        {/* LEFT: sign-in form */}
        <section className="lg-form-side">
          <div className="lg-brand">
            <PawPrint size={20} color="var(--accent-color)" />
            <span>Pawject</span>
          </div>

          <h1 className="lg-heading">เข้าสู่ระบบ</h1>
          <p className="lg-sub">ดีใจที่เจอกันอีกครั้งนะ! กรอกข้อมูลเพื่อเข้าทีมของคุณ</p>

          <form onSubmit={handleSubmit} noValidate className="lg-form">
            <label className="lg-label">
              อีเมล
              <input
                className="doodle-input lg-input"
                type="email"
                placeholder="username@gmail.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={errors.email ? { borderColor: "#E0473E" } : undefined}
              />
              {errors.email && <span className="lg-error">{errors.email}</span>}
            </label>

            <label className="lg-label">
              <span className="lg-label-row">
                รหัสผ่าน
                <Link to="/forgot-password" className="lg-forgot">
                  ลืมรหัสผ่าน?
                </Link>
              </span>
              <div style={{ position: "relative" }}>
                <input
                  className="doodle-input lg-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: 44, ...(errors.password ? { borderColor: "#E0473E" } : {}) }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="lg-eye"
                >
                  {showPassword ? (
                    <img src={seenIcon} alt="seen" style={{ width: 20, height: 20 }} />
                  ) : (
                    <img src={closeEyeIcon} alt="Close eye" style={{ width: 20, height: 20 }} />
                  )}
                </button>
              </div>
              {errors.password && <span className="lg-error">{errors.password}</span>}
            </label>

            {errors.form && <p className="lg-error lg-error-form">{errors.form}</p>}

            <button type="submit" className="doodle-btn lg-submit" disabled={submitting}>
              {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            <div className="lg-divider">
              <span />
              <em>หรือเข้าสู่ระบบด้วย</em>
              <span />
            </div>

            <div className="lg-social-row">
              <button type="button" className="social-btn lg-social" onClick={() => (window.location.href = getOAuthUrl("google"))}>
                <GoogleIcon />
                <span>Google</span>
              </button>
              <button type="button" className="social-btn lg-social" onClick={() => (window.location.href = getOAuthUrl("github"))}>
                <GithubIcon />
                <span>GitHub</span>
              </button>
              <button type="button" className="social-btn lg-social" onClick={() => (window.location.href = getOAuthUrl("facebook"))}>
                <FacebookIcon />
                <span>Facebook</span>
              </button>
            </div>

            <p className="lg-footer">
              ยังไม่มีบัญชีใช่ไหม? <Link to="/register">สมัครสมาชิกฟรี</Link>
            </p>
          </form>
        </section>

        {/* RIGHT: the blinking pup */}
        <AuthDogAside />
      </div>
    </div>
  );
}
