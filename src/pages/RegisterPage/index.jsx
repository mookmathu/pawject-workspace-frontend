import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import { AuthStyles, AuthDogAside } from "../../components/common/authTheme";
import { PawPrint } from "../../components/mockups/DogSVG";
import { GoogleIcon, GithubIcon, FacebookIcon } from "../../components/common/icons";
import seenIcon from "../../assets/images/seen.png";
import closeEyeIcon from "../../assets/images/close-eye.png";
import THAI_UNIVERSITIES from "../../data/thaiUniversities";
import { registerUser, checkUsernameAvailable, getOAuthUrl } from "../../lib/api";

/**
 * RegisterPage
 * Same card + boat-mockup layout and hand-drawn styling as LoginPage,
 * with the extra fields a sign-up form needs: name, confirm password,
 * and a terms-of-service checkbox.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

// Turn the part of an email before "@" into a valid username suggestion —
// used instead of transliterating the (often Thai) display name, since the
// email is reliably ASCII.
function suggestUsernameFromEmail(email) {
    const local = email.split("@")[0] || "";
    return local.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

const PASSWORD_RULES = [
    { key: "length", label: "อย่างน้อย 8 ตัวอักษร", test: (pw) => pw.length >= 8 },
    { key: "lower", label: "มีตัวพิมพ์เล็ก (a-z)", test: (pw) => /[a-z]/.test(pw) },
    { key: "upper", label: "มีตัวพิมพ์ใหญ่ (A-Z)", test: (pw) => /[A-Z]/.test(pw) },
    { key: "number", label: "มีตัวเลข (0-9)", test: (pw) => /[0-9]/.test(pw) },
];

export default function RegisterPage() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Username: auto-suggested from the email as soon as the user hasn't
    // typed their own — once they edit it manually, stop overwriting it.
    const [username, setUsername] = useState("");
    const [usernameTouched, setUsernameTouched] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(null); // null | true | false
    const [usernameChecking, setUsernameChecking] = useState(false);
    const usernameDebounceRef = useRef(null);

    useEffect(() => {
        if (!usernameTouched) {
            setUsername(suggestUsernameFromEmail(email));
        }
    }, [email, usernameTouched]);

    useEffect(() => {
        setUsernameAvailable(null);

        if (!USERNAME_REGEX.test(username)) return;

        if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
        usernameDebounceRef.current = setTimeout(async () => {
            setUsernameChecking(true);
            try {
                const { available } = await checkUsernameAvailable(username);
                setUsernameAvailable(available);
            } catch {
                setUsernameAvailable(null); // couldn't check — don't block typing, just skip the hint
            } finally {
                setUsernameChecking(false);
            }
        }, 400);

        return () => clearTimeout(usernameDebounceRef.current);
    }, [username]);

    function handleUsernameChange(value) {
        setUsernameTouched(true);
        setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
    }

    // Organization: pick a type first (university / company), then type the name.
    // University names are matched against a local Thai-language dataset so
    // searching in Thai (e.g. "เกษตรศาสตร์") actually works.
    const [orgType, setOrgType] = useState(""); // "university" | "company"
    const [orgName, setOrgName] = useState("");
    const [showOrgSuggestions, setShowOrgSuggestions] = useState(false);

    const orgSuggestions =
        orgType === "university" && orgName.trim().length >= 2
            ? THAI_UNIVERSITIES.filter((uni) => {
                  const q = orgName.trim().toLowerCase();
                  return uni.th.includes(orgName.trim()) || uni.en.toLowerCase().includes(q);
              }).slice(0, 8)
            : [];

    function handleOrgTypeChange(type) {
        setOrgType(type);
        setOrgName("");
        setShowOrgSuggestions(false);
    }

    function handleSelectSuggestion(uni) {
        setOrgName(uni.th);
        setShowOrgSuggestions(false);
    }

    function validate() {
        const next = {};

        if (!name.trim()) {
            next.name = "กรุณากรอกชื่อ-นามสกุล";
        }

        if (!username) {
            next.username = "กรุณาตั้งชื่อผู้ใช้ (username)";
        } else if (!USERNAME_REGEX.test(username)) {
            next.username = "username ต้องยาว 3-20 ตัว ใช้ได้แค่ a-z, 0-9, _";
        } else if (usernameAvailable === false) {
            next.username = "username นี้ถูกใช้งานแล้ว";
        }

        if (!email.trim()) {
            next.email = "กรุณากรอกอีเมล";
        } else if (!EMAIL_REGEX.test(email.trim())) {
            next.email = "รูปแบบอีเมลไม่ถูกต้อง";
        }

        if (!orgType) {
            next.orgType = "กรุณาเลือกประเภทองค์กร";
        }

        if (!orgName.trim()) {
            next.orgName = orgType === "company" ? "กรุณากรอกชื่อบริษัท" : "กรุณากรอกชื่อองค์กร";
        }

        if (!password) {
            next.password = "กรุณากรอกรหัสผ่าน";
        } else if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
            next.password = "รหัสผ่านยังไม่ตรงตามเงื่อนไขที่กำหนด";
        }

        if (!confirmPassword) {
            next.confirmPassword = "กรุณายืนยันรหัสผ่าน";
        } else if (confirmPassword !== password) {
            next.confirmPassword = "รหัสผ่านไม่ตรงกัน";
        }

        if (!agreed) {
            next.agreed = "กรุณายอมรับข้อกำหนดการใช้งาน";
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            await registerUser({
                name,
                username,
                email,
                password,
                orgType,
                orgName,
            });

            navigate("/verify-otp", { state: { email } });
        } catch (err) {
            setErrors((prev) => ({ ...prev, form: err.message }));
        } finally {
            setSubmitting(false);
        }
    }

    const pwEye = (
        <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="lg-eye"
        >
            {showPassword ? (
                <img className="eye-icon" src={seenIcon} alt="" style={{ width: 20, height: 20 }} />
            ) : (
                <img className="eye-icon" src={closeEyeIcon} alt="" style={{ width: 20, height: 20 }} />
            )}
        </button>
    );
    const bad = { borderColor: "#E0473E" };

    return (
        <div className="auth-page lg-page">
            <GlobalStyles />
            <AuthStyles />

            <div className="lg-shell lg-shell-wide">
                {/* LEFT: sign-up form */}
                <section className="lg-form-side">
                    <div className="lg-brand">
                        <PawPrint size={20} color="var(--accent-color)" />
                        <span>Pawject</span>
                    </div>

                    <h1 className="lg-heading">สมัครสมาชิก</h1>
                    <p className="lg-sub">สร้างบัญชีใหม่เพื่อเริ่มทำงานร่วมกับทีมของคุณ</p>

                    <form onSubmit={handleSubmit} noValidate className="lg-grid">
                        <label className="lg-label">
                            ชื่อ-นามสกุล
                            <input
                                className="doodle-input lg-input"
                                type="text"
                                placeholder="ชื่อของคุณ"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={errors.name ? bad : undefined}
                            />
                            {errors.name && <span className="lg-error">{errors.name}</span>}
                        </label>

                        <label className="lg-label">
                            ชื่อผู้ใช้ (username)
                            <div style={{ position: "relative" }}>
                                <span className="lg-at">@</span>
                                <input
                                    className="doodle-input lg-input"
                                    type="text"
                                    placeholder="username"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => handleUsernameChange(e.target.value)}
                                    style={{ paddingLeft: 30, ...(errors.username ? bad : {}) }}
                                />
                            </div>
                            {errors.username && <span className="lg-error">{errors.username}</span>}
                            {!errors.username && USERNAME_REGEX.test(username) && (
                                <span
                                    className="lg-hint"
                                    style={{
                                        color: usernameChecking
                                            ? "var(--ink-faint)"
                                            : usernameAvailable === false
                                            ? "#E0473E"
                                            : usernameAvailable === true
                                            ? "#2E8B4F"
                                            : "var(--ink-faint)",
                                    }}
                                >
                                    {usernameChecking
                                        ? "กำลังตรวจสอบ..."
                                        : usernameAvailable === false
                                        ? "✕ มีคนใช้ชื่อนี้แล้ว"
                                        : usernameAvailable === true
                                        ? "✓ ใช้ชื่อนี้ได้"
                                        : "\u00A0"}
                                </span>
                            )}
                        </label>

                        <label className="lg-label lg-span2">
                            อีเมล
                            <input
                                className="doodle-input lg-input"
                                type="email"
                                placeholder="username@gmail.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={errors.email ? bad : undefined}
                            />
                            {errors.email && <span className="lg-error">{errors.email}</span>}
                        </label>

                        <div className="lg-label lg-span2">
                            ประเภทองค์กร
                            <div className="lg-org-row">
                                <button
                                    type="button"
                                    className={`lg-org-btn${orgType === "university" ? " is-on" : ""}`}
                                    onClick={() => handleOrgTypeChange("university")}
                                >
                                    มหาวิทยาลัย
                                </button>
                                <button
                                    type="button"
                                    className={`lg-org-btn${orgType === "company" ? " is-on" : ""}`}
                                    onClick={() => handleOrgTypeChange("company")}
                                >
                                    บริษัท/องค์กร
                                </button>
                            </div>
                            {errors.orgType && <span className="lg-error">{errors.orgType}</span>}
                        </div>

                        {orgType && (
                            <label className="lg-label lg-span2">
                                {orgType === "university" ? "ชื่อมหาวิทยาลัย" : "ชื่อบริษัท/องค์กร"}
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="doodle-input lg-input"
                                        type="text"
                                        placeholder={
                                            orgType === "university"
                                                ? "พิมพ์ชื่อมหาวิทยาลัย เช่น เกษตรศาสตร์"
                                                : "ชื่อบริษัทหรือองค์กรของคุณ"
                                        }
                                        value={orgName}
                                        onChange={(e) => {
                                            setOrgName(e.target.value);
                                            setShowOrgSuggestions(true);
                                        }}
                                        onFocus={() => setShowOrgSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowOrgSuggestions(false), 150)}
                                        style={errors.orgName ? bad : undefined}
                                    />

                                    {orgType === "university" && showOrgSuggestions && orgName.trim().length >= 2 && (
                                        <ul className="lg-suggest">
                                            {orgSuggestions.length === 0 && (
                                                <li className="lg-suggest-empty">ไม่พบชื่อที่ตรงกัน — กรอกเองได้เลย</li>
                                            )}
                                            {orgSuggestions.map((uni) => (
                                                <li key={uni.en}>
                                                    <button type="button" onMouseDown={() => handleSelectSuggestion(uni)}>
                                                        {uni.th}
                                                        <small>{uni.en}</small>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {errors.orgName && <span className="lg-error">{errors.orgName}</span>}
                            </label>
                        )}

                        <label className="lg-label">
                            รหัสผ่าน
                            <div style={{ position: "relative" }}>
                                <input
                                    className="doodle-input lg-input"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingRight: 44, ...(errors.password ? bad : {}) }}
                                />
                                {pwEye}
                            </div>
                            {errors.password && <span className="lg-error">{errors.password}</span>}
                        </label>

                        <label className="lg-label">
                            ยืนยันรหัสผ่าน
                            <input
                                className="doodle-input lg-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={errors.confirmPassword ? bad : undefined}
                            />
                            {errors.confirmPassword && <span className="lg-error">{errors.confirmPassword}</span>}
                        </label>

                        {password.length > 0 && (
                            <ul className="lg-rules lg-span2">
                                {PASSWORD_RULES.map((rule) => {
                                    const passed = rule.test(password);
                                    return (
                                        <li key={rule.key} style={{ color: passed ? "#2E8B4F" : "var(--ink-faint)" }}>
                                            {passed ? "✓" : "○"} {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <div className="lg-span2">
                            <div className="lg-check">
                                <input id="agree-terms" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                                <label htmlFor="agree-terms">
                                    ฉันยอมรับ <a href="#terms">ข้อกำหนดการใช้งาน</a> และ <a href="#privacy">นโยบายความเป็นส่วนตัว</a>
                                </label>
                            </div>
                            {errors.agreed && <span className="lg-error" style={{ display: "block", marginTop: 6 }}>{errors.agreed}</span>}
                        </div>

                        {errors.form && <p className="lg-error lg-error-form lg-span2">{errors.form}</p>}

                        <button type="submit" className="doodle-btn lg-submit lg-span2" disabled={submitting}>
                            {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                        </button>

                        <div className="lg-divider lg-span2">
                            <span />
                            <em>หรือสมัครด้วย</em>
                            <span />
                        </div>

                        <div className="lg-social-row lg-span2">
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

                        <p className="lg-footer lg-span2">
                            มีบัญชีอยู่แล้ว? <Link to="/">เข้าสู่ระบบ</Link>
                        </p>
                    </form>
                </section>

                {/* RIGHT: the blinking pup */}
                <AuthDogAside />
            </div>
        </div>
    );
}
