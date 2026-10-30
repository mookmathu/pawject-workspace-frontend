import React, { useEffect, useRef, useState } from "react";
import Mascot, { MascotNote } from "../../components/common/Mascot";
import { useNavigate } from "react-router-dom";
import {
  getMe,
  updateProfile,
  uploadAvatar,
  deleteAccount,
  resolveAvatarUrl,
  getMyActivity,
} from "../../lib/api";
import ActivityHeatmap from "../../components/profile/ActivityHeatmap";
import MoodCalendar from "../../components/mood/MoodCalendar";
import { isPopupEnabled, setPopupEnabled } from "../../lib/mood";
import AvatarCropModal from "../../components/common/AvatarCropModal";
import DoodleIcon from "../../components/common/DoodleIcon";
import styles from "./styles";

const PROVIDER_LABEL = {
  local: "อีเมล/รหัสผ่าน",
  google: "Google",
  facebook: "Facebook",
  github: "GitHub",
};

const MAX_USERNAME_CHANGES = 3;
const MAX_BIO_LENGTH = 280;

// Every field a person can choose to hide from other users — id must match
// what the backend accepts (profile.controller.js's HIDABLE_FIELDS).
const PRIVACY_TOGGLES = [
  { id: "org", label: "มหาวิทยาลัย/องค์กร", desc: "ซ่อนชื่อมหาวิทยาลัยหรือองค์กรของคุณ" },
  { id: "bio", label: "แนะนำตัว", desc: "ซ่อนข้อความแนะนำตัวของคุณ" },
  { id: "activity", label: "กิจกรรมการเข้าใช้งาน", desc: "ซ่อนกราฟการเข้าใช้งานรายวันของคุณไม่ให้เพื่อนเห็น" },
];

function persistUser(user) {
  try {
    localStorage.setItem("crew_user", JSON.stringify(user));
  } catch {
    // best-effort only
  }
}

export default function ProfilePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // --- edit form ---
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [orgType, setOrgType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState({});
  const [activity, setActivity] = useState(null);
  const [activityYear, setActivityYear] = useState(null); // null = rolling last 365 days
  const [activityLoading, setActivityLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState("info");
  const [moodPopupOn, setMoodPopupOn] = useState(isPopupEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // --- privacy toggles ---
  const [hiddenFields, setHiddenFields] = useState([]);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState("");

  // --- delete account ---
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { user } = await getMe();
        setUser(user);
        setName(user.name || "");
        setUsername(user.username || "");
        setOrgType(user.orgType || "");
        setOrgName(user.orgName || "");
        setBio(user.bio || "");
        setHiddenFields(Array.isArray(user.hiddenFields) ? user.hiddenFields : []);
        persistUser(user);
      } catch (err) {
        setErrors({ form: err.message });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    getMyActivity(activityYear)
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch(() => {
        // the heatmap is a nice-to-have — a failed fetch just leaves it empty
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityYear]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setSettingsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  function openSettings(nextTab = "info") {
    setTab(nextTab);
    setSettingsOpen(true);
  }

  // Picking a photo first opens the crop/zoom editor; only the framed
  // result is uploaded.
  const [cropFile, setCropFile] = useState(null);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setAvatarError("");
    setCropFile(file);
  }

  async function handleAvatarCropped(file) {
    setAvatarError("");
    setAvatarUploading(true);
    try {
      const { user: updated } = await uploadAvatar(file);
      setCropFile(null);
      setUser(updated);
      persistUser(updated);
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  function validate() {
    const next = {};
    if (!name.trim()) next.name = "กรุณากรอกชื่อ";
    if (!username.trim()) next.username = "กรุณากรอก username";
    if (!orgType) next.orgType = "กรุณาเลือกประเภทองค์กร";
    if (!orgName.trim()) next.orgName = orgType === "company" ? "กรุณากรอกชื่อบริษัท" : "กรุณากรอกชื่อองค์กร";
    if (bio.length > MAX_BIO_LENGTH) next.bio = `แนะนำตัวได้ไม่เกิน ${MAX_BIO_LENGTH} ตัวอักษร`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    if (!validate()) return;

    setSaving(true);
    try {
      const { user: updated } = await updateProfile({
        name: name.trim(),
        username: username.trim(),
        orgType,
        orgName: orgName.trim(),
        bio: bio.trim(),
      });
      setUser(updated);
      persistUser(updated);
      setSaved(true);
      setErrors({});
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  }

  // Each toggle saves immediately (like the theme swatches below) rather
  // than waiting for the main "บันทึกการแก้ไข" button, so flipping a
  // privacy switch takes effect right away instead of silently reverting if
  // the person navigates away without noticing it needed a separate save.
  async function handleTogglePrivacy(fieldId) {
    const next = hiddenFields.includes(fieldId)
      ? hiddenFields.filter((f) => f !== fieldId)
      : [...hiddenFields, fieldId];

    const previous = [...hiddenFields];
    setHiddenFields(next); // optimistic
    setPrivacyError("");
    setPrivacySaving(true);
    try {
      const { user: updated } = await updateProfile({ hiddenFields: next });
      setUser(updated);
      persistUser(updated);
      setHiddenFields(Array.isArray(updated.hiddenFields) ? updated.hiddenFields : next);
    } catch (err) {
      setHiddenFields(previous); // revert
      setPrivacyError(err.message);
    } finally {
      setPrivacySaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (user?.hasPassword && !deletePassword) {
      setDeleteError("กรุณากรอกรหัสผ่านเพื่อยืนยัน");
      return;
    }
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      localStorage.removeItem("crew_token");
      localStorage.removeItem("crew_user");
      void navigate("/");
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  // Give a freshly-uploaded avatar a fresh chance to load instead of
  // staying stuck on the fallback from a previous failed URL.
  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);
  const usernameChangesLeft = Math.max(0, MAX_USERNAME_CHANGES - (user?.usernameChangeCount ?? 0));

  return (
    <>
      {loading ? (
        <MascotNote name="nap" anim="float" width={140} text="กำลังโหลด..." />
      ) : (
        <div className="profile-layout" style={styles.layout}>
          <style>{`
            @media (max-width: 860px) {
              .profile-layout { grid-template-columns: 1fr !important; }
              .profile-side { position: static !important; }
            }
            @media (max-width: 600px) {
              .profile-avatar-big, .profile-avatar-big img, .profile-avatar-big > div:first-child { width: 128px !important; height: 128px !important; }
              .profile-avatar-big > div:first-child { font-size: 50px !important; }
            }
          `}</style>

          {/* --- sidebar: who you are --- */}
          <aside className="profile-side" style={styles.side}>
            <div style={styles.sideCover} aria-hidden="true">
              <span style={{ position: "absolute", left: 14, bottom: 8 }}><Mascot name="bone" width={30} anim="wiggle" /></span>
              <span style={{ position: "absolute", right: 16, bottom: 6 }}><Mascot name="ball" width={24} anim="bounce" /></span>
            </div>
            <div style={styles.sideBody}>
            <div className="profile-avatar-big" style={styles.avatarWrapBig}>
              {avatarSrc && !avatarLoadFailed ? (
                <img src={avatarSrc} alt="รูปโปรไฟล์" style={styles.avatarImgBig} onError={() => setAvatarLoadFailed(true)} />
              ) : (
                <div style={styles.avatarFallbackBig}>{initial}</div>
              )}
              <button
                type="button"
                style={styles.avatarEditBtn}
                title="เปลี่ยนรูปโปรไฟล์"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? "…" : <DoodleIcon name="pencil" size={20} style={{ verticalAlign: "middle" }} />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
            </div>
            {avatarError && <span style={styles.errorText}>{avatarError}</span>}
            {cropFile && (
              <AvatarCropModal
                file={cropFile}
                saving={avatarUploading}
                error={avatarError}
                onCancel={() => setCropFile(null)}
                onConfirm={handleAvatarCropped}
              />
            )}

            <h1 style={styles.sideName}>{user?.name}</h1>
            {user?.username && <p style={styles.sideUsername}>@{user.username}</p>}
            {user?.bio && <p style={styles.sideBio}>{user.bio}</p>}

            <button
              type="button"
              className="doodle-btn"
              style={styles.editProfileBtn}
              onClick={() => openSettings("info")}
            >
              แก้ไขโปรไฟล์
            </button>

            <ul style={styles.sideList}>
              {user?.orgName && <li style={styles.sideItem}><DoodleIcon name="school" size={18} style={{ marginRight: 6 }} />{user.orgName}</li>}
              {user?.email && <li style={styles.sideItem}><DoodleIcon name="envelope" size={18} style={{ marginRight: 6 }} />{user.email}</li>}
              {user?.provider && <li style={styles.sideItem}><DoodleIcon name="key" size={18} style={{ marginRight: 6 }} />{PROVIDER_LABEL[user.provider] || user.provider}</li>}
              {activity?.joinedAt && (
                <li style={styles.sideItem}>
                  <DoodleIcon name="calendar" size={18} style={{ marginRight: 6 }} />เข้าร่วมเมื่อ{" "}
                  {new Date(activity.joinedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                </li>
              )}
            </ul>
            <span style={{ display: "flex", justifyContent: "center", marginTop: 14 }} aria-hidden="true">
              <Mascot name="pup" width={92} anim="float" shadow />
            </span>
            </div>
          </aside>

          {/* --- main column --- */}
          <div style={styles.mainCol}>
            <ActivityHeatmap data={activity} loading={activityLoading} selectedYear={activityYear} onSelectYear={setActivityYear} />

            <MoodCalendar />
          </div>

        {settingsOpen && (
          <div role="presentation" style={styles.modalOverlay} onClick={() => setSettingsOpen(false)}>
            <div className="profile-modal" style={styles.modal} role="dialog" aria-modal="true" aria-label="ตั้งค่าโปรไฟล์" onClick={(e) => e.stopPropagation()}>
              <style>{`.profile-modal section { margin-bottom: 0 !important; } .profile-modal section > h2 { display: none; } @keyframes profilePop { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } } .profile-modal { animation: profilePop 160ms ease-out; }`}</style>
              <div style={styles.modalHead}>
                <h2 style={styles.modalTitle}>ตั้งค่าโปรไฟล์</h2>
                <button type="button" style={styles.modalClose} onClick={() => setSettingsOpen(false)} aria-label="ปิด">×</button>
              </div>
              <div style={styles.tabRow} role="tablist">
                {[
                  { id: "info", label: "👤 ข้อมูลส่วนตัว" },
                  { id: "privacy", label: "🔒 ความเป็นส่วนตัว" },
                  { id: "mood", label: "💭 อารมณ์รายวัน" },
                  { id: "account", label: "⚠️ บัญชี" },
                ].map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnOn : {}) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={styles.modalBody}>
              {tab === "info" && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>แก้ไขข้อมูลส่วนตัว</h2>
              <div style={styles.card}>
                <form style={styles.form} onSubmit={handleSave}>
                  <label style={styles.label}>
                    ชื่อ-นามสกุล
                    <input
                      className="doodle-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    {errors.name && <span style={styles.errorText}>{errors.name}</span>}
                  </label>

                  <label style={styles.label}>
                    ชื่อผู้ใช้ (username)
                    <input
                      className="doodle-input"
                      type="text"
                      value={username}
                      disabled={usernameChangesLeft <= 0}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                      }
                    />
                    {errors.username ? (
                      <span style={styles.errorText}>{errors.username}</span>
                    ) : (
                      <span style={styles.avatarHint}>
                        {usernameChangesLeft > 0
                          ? `เปลี่ยนชื่อผู้ใช้ได้อีก ${usernameChangesLeft} ครั้ง`
                          : "คุณใช้สิทธิ์เปลี่ยนชื่อผู้ใช้ครบแล้ว"}
                      </span>
                    )}
                  </label>

                  <label style={styles.labelReadonly}>
                    อีเมล
                    <span style={styles.readonlyValue}>{user?.email}</span>
                  </label>

                  <label style={styles.labelReadonly}>
                    วิธีเข้าสู่ระบบ
                    <span style={styles.readonlyValue}>
                      {PROVIDER_LABEL[user?.provider] || user?.provider}
                    </span>
                  </label>

                  <label style={styles.label}>
                    ประเภทองค์กร
                    <div style={styles.orgTypeRow}>
                      <button
                        type="button"
                        onClick={() => setOrgType("university")}
                        style={{
                          ...styles.orgTypeBtn,
                          ...(orgType === "university" ? styles.orgTypeBtnActive : {}),
                        }}
                      >
                        🎓 มหาวิทยาลัย
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrgType("company")}
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

                  <label style={styles.label}>
                    {orgType === "company" ? "ชื่อบริษัท/องค์กร" : "ชื่อมหาวิทยาลัย/องค์กร"}
                    <input
                      className="doodle-input"
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                    {errors.orgName && <span style={styles.errorText}>{errors.orgName}</span>}
                  </label>

                  <label style={styles.label}>
                    แนะนำตัว
                    <textarea
                      className="doodle-input"
                      style={styles.bioTextarea}
                      rows={3}
                      maxLength={MAX_BIO_LENGTH}
                      placeholder="เล่าเกี่ยวกับตัวคุณสั้น ๆ..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                    <span style={styles.bioCounter}>
                      {bio.length}/{MAX_BIO_LENGTH}
                    </span>
                    {errors.bio && <span style={styles.errorText}>{errors.bio}</span>}
                  </label>

                  {errors.form && <span style={styles.errorText}>{errors.form}</span>}

                  <div style={styles.saveRow}>
                    <button type="submit" className="doodle-btn" style={styles.saveBtn} disabled={saving}>
                      {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                    </button>
                    {saved && <p style={styles.successText}>✓ บันทึกแล้ว</p>}
                  </div>
                </form>
              </div>
            </section>
              )}
              {tab === "privacy" && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>ความเป็นส่วนตัว</h2>
              <div style={styles.card}>
                {PRIVACY_TOGGLES.map((field, i) => {
                  const isOn = hiddenFields.includes(field.id);
                  return (
                    <div
                      key={field.id}
                      style={{
                        ...styles.privacyRow,
                        ...(i === PRIVACY_TOGGLES.length - 1 ? styles.privacyRowLast : {}),
                      }}
                    >
                      <div style={styles.privacyMeta}>
                        <span style={styles.privacyLabel}>{field.label}</span>
                        <span style={styles.privacyDesc}>{field.desc}</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        title={isOn ? "กำลังซ่อน — กดเพื่อแสดง" : "กำลังแสดง — กดเพื่อซ่อน"}
                        disabled={privacySaving}
                        onClick={() => handleTogglePrivacy(field.id)}
                        style={{ ...styles.toggle, ...(isOn ? styles.toggleOn : {}) }}
                      >
                        <span style={{ ...styles.toggleKnob, ...(isOn ? styles.toggleKnobOn : {}) }} />
                      </button>
                    </div>
                  );
                })}
                {privacyError && <span style={styles.errorText}>{privacyError}</span>}
                <p style={styles.privacyNote}>
                  เมื่อเปิดสวิตช์ ข้อมูลนั้นจะถูกซ่อนจากเพื่อนและสมาชิกในกลุ่มของคุณ — ตัวคุณเองยังเห็นข้อมูลนี้ได้ตามปกติ
                  <br />
                  อีเมลและวิธีเข้าสู่ระบบเป็นข้อมูลบัญชีส่วนตัว ไม่แสดงต่อผู้ใช้คนอื่นอยู่แล้วไม่ว่ากรณีใด
                </p>
              </div>
            </section>
              )}
              {tab === "mood" && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>อารมณ์รายวัน</h2>
              <div style={styles.card}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 16 }}>
                  <input
                    type="checkbox"
                    checked={moodPopupOn}
                    onChange={(e) => {
                      setMoodPopupOn(e.target.checked);
                      setPopupEnabled(e.target.checked);
                    }}
                  />
                  ถามว่า "วันนี้รู้สึกยังไง" ตอนเข้าหน้า Home วันละครั้ง
                </label>
                <p style={styles.previewNote}>
                  บันทึกอารมณ์เห็นได้เฉพาะคุณคนเดียว ปิดป๊อปอัพแล้วก็ยังบันทึกได้จากการ์ดในหน้า Home และปฏิทินในหน้านี้ (ค่านี้จำไว้ในเบราว์เซอร์นี้)
                </p>
              </div>
            </section>
              )}
              {tab === "account" && (
            <section style={styles.section}>
              <h2 style={{ ...styles.sectionTitle, color: "#B8302A" }}>โซนอันตราย</h2>
              <div style={styles.dangerCard}>
                <p style={styles.dangerTitle}>ลบบัญชีผู้ใช้</p>
                <p style={styles.dangerDesc}>
                  การลบบัญชีจะลบข้อมูลทั้งหมดของคุณอย่างถาวร ทั้งพื้นที่ทำงานส่วนตัว กระดานงาน
                  รายการเพื่อน และกิจกรรมในปฏิทินที่คุณเป็นเจ้าของ — ไม่สามารถกู้คืนได้
                </p>

                {!confirmingDelete ? (
                  <button
                    type="button"
                    className="doodle-btn"
                    style={styles.deleteBtn}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    ลบบัญชีของฉัน
                  </button>
                ) : (
                  <div style={styles.confirmBox}>
                    <p style={styles.confirmText}>
                      ยืนยันการลบบัญชีอย่างถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                    </p>
                    {user?.hasPassword && (
                      <label style={styles.label}>
                        กรอกรหัสผ่านเพื่อยืนยัน
                        <input
                          className="doodle-input"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </label>
                    )}
                    {deleteError && <span style={styles.errorText}>{deleteError}</span>}
                    <div style={styles.confirmActions}>
                      <button
                        type="button"
                        className="doodle-btn"
                        style={styles.cancelBtn}
                        onClick={() => {
                          setConfirmingDelete(false);
                          setDeletePassword("");
                          setDeleteError("");
                        }}
                        disabled={deleting}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        className="doodle-btn"
                        style={styles.confirmDeleteBtn}
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                      >
                        {deleting ? "กำลังลบ..." : "ยืนยันลบบัญชี"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
              )}
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </>
  );
}
