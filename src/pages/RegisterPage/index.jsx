import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import ThemeToggle from "../../components/common/ThemeToggle";
import DogHero from "../../components/mockups/DogHero";
import { GoogleIcon, GithubIcon, FacebookIcon } from "../../components/common/icons";
import styles from "./styles";
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

    return (
        <div style={styles.page} className="auth-page">
            <GlobalStyles />
      <ThemeToggle />

            {/* LEFT: floating register card */}
            <div style={styles.card} className="card-clean auth-card">
                <div style={styles.brandRow}>
                    <span style={styles.brandDot} />
                    <span style={styles.brandText}>Pawject</span>
                </div>

                <h1 style={styles.heading} className="auth-heading">สมัครสมาชิก</h1>
                <p style={styles.subheading}>สร้างบัญชีใหม่เพื่อเริ่มทำงานร่วมกับทีมของคุณ</p>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}
                >
                    <label style={styles.label}>
                        ชื่อ-นามสกุล
                        <input
                            className="doodle-input"
                            type="text"
                            placeholder="ชื่อของคุณ"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ marginTop: 6, ...(errors.name ? styles.inputError : {}) }}
                        />
                        {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                    </label>

                    <label style={styles.label}>
                        ชื่อผู้ใช้ (username)
                        <div style={{ position: "relative", marginTop: 6 }}>
                            <span style={styles.atPrefix}>@</span>
                            <input
                                className="doodle-input"
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={(e) => handleUsernameChange(e.target.value)}
                                style={{ paddingLeft: 28, ...(errors.username ? styles.inputError : {}) }}
                            />
                        </div>
                        {errors.username && <span style={styles.errorText}>{errors.username}</span>}
                        {!errors.username && USERNAME_REGEX.test(username) && (
                            <span
                                style={{
                                    ...styles.usernameHint,
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
                        ประเภทองค์กร
                        <div style={styles.orgTypeRow}>
                            <button
                                type="button"
                                onClick={() => handleOrgTypeChange("university")}
                                style={{
                                    ...styles.orgTypeBtn,
                                    ...(orgType === "university" ? styles.orgTypeBtnActive : {}),
                                }}
                            >
                                🎓 มหาวิทยาลัย
                            </button>
                            <button
                                type="button"
                                onClick={() => handleOrgTypeChange("company")}
                                style={{
                                    ...styles.orgTypeBtn,
                                    ...(orgType === "company" ? styles.orgTypeBtnActive : {}),
                                }}
                            >
                                🏢 บริษัท/องค์กร
                            </button>
                        </div>
                        {errors.orgType && <span style={styles.errorText}>{errors.orgType}</span>}
                    </label>

                    {orgType && (
                        <label style={styles.label}>
                            {orgType === "university" ? "ชื่อมหาวิทยาลัย" : "ชื่อบริษัท/องค์กร"}
                            <div style={{ position: "relative", marginTop: 6 }}>
                                <input
                                    className="doodle-input"
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
                                    style={errors.orgName ? styles.inputError : {}}
                                />

                                {orgType === "university" && showOrgSuggestions && orgName.trim().length >= 2 && (
                                    <ul style={styles.suggestionList}>
                                        {orgSuggestions.length === 0 && (
                                            <li style={styles.suggestionLoading}>ไม่พบชื่อที่ตรงกัน — กรอกเองได้เลย</li>
                                        )}
                                        {orgSuggestions.map((uni) => (
                                            <li key={uni.en}>
                                                <button
                                                    type="button"
                                                    style={styles.suggestionItem}
                                                    onMouseDown={() => handleSelectSuggestion(uni)}
                                                >
                                                    {uni.th}
                                                    <span style={styles.suggestionMeta}>{uni.en}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {errors.orgName && <span style={styles.errorText}>{errors.orgName}</span>}
                        </label>
                    )}

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

                        {password.length > 0 && (
                            <ul style={styles.passwordChecklist}>
                                {PASSWORD_RULES.map((rule) => {
                                    const passed = rule.test(password);
                                    return (
                                        <li
                                            key={rule.key}
                                            style={{
                                                ...styles.passwordRuleItem,
                                                color: passed ? "#2E8B4F" : "var(--ink-faint)",
                                            }}
                                        >
                                            {passed ? "✓" : "○"} {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </label>

                    <label style={styles.label}>
                        ยืนยันรหัสผ่าน
                        <input
                            className="doodle-input"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ marginTop: 6, ...(errors.confirmPassword ? styles.inputError : {}) }}
                        />
                        {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
                    </label>

                    <div>
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
                        {errors.agreed && <span style={styles.errorText}>{errors.agreed}</span>}
                    </div>

                    {errors.form && (
                        <p style={{ ...styles.errorText, textAlign: "center" }}>{errors.form}</p>
                    )}

                    <button type="submit" className="doodle-btn" style={styles.signInBtn} disabled={submitting}>
                        {submitting ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
                    </button>

                    <div style={styles.dividerRow}>
                        <span style={styles.dividerLine} />
                        <span style={styles.dividerText}>หรือสมัครด้วย</span>
                        <span style={styles.dividerLine} />
                    </div>

                    <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
                        <button
                            type="button"
                            className="doodle-btn rough-sm social-btn"
                            aria-label="Google"
                            onClick={() => (window.location.href = getOAuthUrl("google"))}
                        >
                            <GoogleIcon />
                        </button>
                        <button
                            type="button"
                            className="doodle-btn rough-sm social-btn"
                            aria-label="GitHub"
                            onClick={() => (window.location.href = getOAuthUrl("github"))}
                        >
                            <GithubIcon />
                        </button>
                        <button
                            type="button"
                            className="doodle-btn rough-sm social-btn"
                            aria-label="Facebook"
                            onClick={() => (window.location.href = getOAuthUrl("facebook"))}
                        >
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

            {/* RIGHT: Pawject pup illustration (shared with login) */}
            <DogHero />
        </div>
    );
}
