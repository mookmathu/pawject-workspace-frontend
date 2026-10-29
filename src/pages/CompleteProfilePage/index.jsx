import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import { CardMascot } from "../../components/common/Mascot";
import styles from "../RegisterPage/styles";
import THAI_UNIVERSITIES from "../../data/thaiUniversities";
import { completeProfile, checkUsernameAvailable } from "../../lib/api";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export default function CompleteProfilePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("crew_user") || "null");
      if (stored?.name) setName(stored.name);
    } catch {
      // ignore — the greeting just won't show a name
    }
  }, []);

  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameDebounceRef = useRef(null);

  const [orgType, setOrgType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [showOrgSuggestions, setShowOrgSuggestions] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);

    return () => clearTimeout(usernameDebounceRef.current);
  }, [username]);

  function handleUsernameChange(value) {
    setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  }

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
    if (!username) {
      next.username = "กรุณาตั้งชื่อผู้ใช้ (username)";
    } else if (!USERNAME_REGEX.test(username)) {
      next.username = "username ต้องยาว 3-20 ตัว ใช้ได้แค่ a-z, 0-9, _";
    } else if (usernameAvailable === false) {
      next.username = "username นี้ถูกใช้งานแล้ว";
    }
    if (!orgType) {
      next.orgType = "กรุณาเลือกประเภทองค์กร";
    }
    if (!orgName.trim()) {
      next.orgName = "กรุณากรอกชื่อองค์กร";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { user } = await completeProfile({ username, orgType, orgName: orgName.trim() });
      localStorage.setItem("crew_user", JSON.stringify(user));
      void navigate("/welcome");
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page} className="auth-page">
      <GlobalStyles />

      <div style={styles.card} className="card-clean has-mascot auth-card">
        <CardMascot name="puppy" width={66} anim="bounce" />
        <div style={styles.brandRow}>
          <span style={styles.brandDot} />
          <span style={styles.brandText}>Pawject</span>
        </div>

        <h1 style={styles.heading} className="auth-heading">
          {name ? `ยินดีต้อนรับ ${name}!` : "เกือบเสร็จแล้ว!"}
        </h1>
        <p style={styles.subheading}>ขอข้อมูลอีกนิดเดียวก่อนเริ่มใช้งานนะ</p>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 22 }}
        >
          <label style={styles.label}>
            ชื่อผู้ใช้ (username)
            <input
              className="doodle-input"
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              style={{ marginTop: 6, ...(errors.username ? styles.inputError : {}) }}
            />
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
                  : usernameAvailable
                  ? "✓ ใช้ได้"
                  : usernameAvailable === false
                  ? "username นี้ถูกใช้แล้ว"
                  : ""}
              </span>
            )}
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
                🏢 บริษัท
              </button>
            </div>
            {errors.orgType && <span style={styles.errorText}>{errors.orgType}</span>}
          </label>

          {orgType && (
            <label style={{ ...styles.label, position: "relative" }}>
              {orgType === "university" ? "ชื่อมหาวิทยาลัย" : "ชื่อบริษัท"}
              <input
                className="doodle-input"
                type="text"
                placeholder={orgType === "university" ? "เช่น จุฬาลงกรณ์มหาวิทยาลัย" : "เช่น บริษัทของคุณ"}
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setShowOrgSuggestions(true);
                }}
                onFocus={() => setShowOrgSuggestions(true)}
                onBlur={() => setTimeout(() => setShowOrgSuggestions(false), 150)}
                style={{ marginTop: 6, ...(errors.orgName ? styles.inputError : {}) }}
              />
              {errors.orgName && <span style={styles.errorText}>{errors.orgName}</span>}
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
            </label>
          )}

          {errors.form && <p style={{ ...styles.errorText, textAlign: "center" }}>{errors.form}</p>}

          <button type="submit" className="doodle-btn" style={styles.signInBtn} disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : "เริ่มใช้งาน"}
          </button>
        </form>
      </div>
    </div>
  );
}
