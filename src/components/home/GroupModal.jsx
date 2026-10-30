import React, { useEffect } from "react";
import DoodleIcon from "../common/DoodleIcon";
import { resolveAvatarUrl } from "../../lib/api";

function initialOf(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

/**
 * Group detail popup. Friends join with the group code only (no more
 * invite-by-username), so the code is the hero of the card; members, Head
 * tools and the leave/delete action sit below it.
 */
export default function GroupModal({
  ws,
  isOwner,
  imageSlot,
  onClose,
  onOpenProfile,
  onRemoveMember,
  copied,
  onCopyCode,
  onRegenerate,
  transferTarget,
  onTransferTargetChange,
  onTransfer,
  confirming,
  onAskConfirm,
  onCancelConfirm,
  busy,
  onConfirm,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const otherMembers = ws.members.filter((m) => m.user.id !== ws.ownerId);
  const code = ws.joinCode || "";

  return (
    <div role="presentation" style={S.overlay} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={ws.name} style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} style={S.closeBtn} title="ปิด" aria-label="ปิด">
          ×
        </button>

        {/* ---- header ---- */}
        <div style={S.header}>
          {imageSlot}
          <div style={S.headerText}>
            <h3 style={S.name}>{ws.name}</h3>
            <span style={S.countPill}>{ws.members.length} สมาชิก</span>
          </div>
        </div>

        {/* ---- join code (the only way to invite) ---- */}
        <section style={S.codeCard} aria-label="รหัสเข้ากลุ่ม">
          <p style={S.eyebrow}>รหัสเข้ากลุ่ม</p>
          {code ? (
            <>
              <div style={S.tiles} aria-label={`รหัส ${code}`}>
                {code.split("").map((ch, i) => (
                  <span key={i} style={S.tile}>{ch}</span>
                ))}
              </div>
              <div style={S.codeActions}>
                <button type="button" style={S.primaryBtn} onClick={onCopyCode}>
                  {copied ? "คัดลอกแล้ว ✓" : "คัดลอกรหัส"}
                </button>
                {isOwner && (
                  <button type="button" style={S.linkBtn} onClick={onRegenerate} title="รหัสเดิมจะใช้ไม่ได้อีก">
                    สร้างรหัสใหม่
                  </button>
                )}
              </div>
              <p style={S.hint}>
                ส่งรหัสนี้ให้เพื่อน แล้วให้กด “เข้าร่วมด้วยรหัส” ที่หน้า Home และกรอกรหัสนี้
              </p>
            </>
          ) : isOwner ? (
            <>
              <p style={S.hint}>กลุ่มนี้ยังไม่มีรหัส สร้างรหัสเพื่อให้เพื่อนเข้าร่วมได้</p>
              <button type="button" style={S.primaryBtn} onClick={onRegenerate}>
                สร้างรหัสเข้ากลุ่ม
              </button>
            </>
          ) : (
            <p style={S.hint}>กลุ่มนี้ยังไม่มีรหัส ให้ Head ของกลุ่มสร้างรหัสก่อน</p>
          )}
        </section>

        {/* ---- members ---- */}
        <section style={S.section} aria-label="สมาชิก">
          <h4 style={S.sectionTitle}>สมาชิก</h4>
          <ul style={S.list}>
            {ws.members.map((m) => (
              <li key={m.id} style={S.row}>
                <button type="button" style={S.person} onClick={() => onOpenProfile(m.user.id)} title="ดูโปรไฟล์">
                  {m.user.avatarUrl ? (
                    <img src={resolveAvatarUrl(m.user.avatarUrl)} alt="" style={S.avatar} />
                  ) : (
                    <span style={S.avatarFallback}>{initialOf(m.user.name)}</span>
                  )}
                  <span style={S.personText}>
                    <span style={S.personName}>{m.user.name}</span>
                    <span style={S.personUser}>@{m.user.username}</span>
                  </span>
                </button>
                {m.role === "owner" && (
                  <span style={S.headTag}>
                    <DoodleIcon name="crown" size={14} style={{ marginRight: 3 }} />Head
                  </span>
                )}
                {m.role !== "owner" && isOwner && (
                  <button
                    type="button"
                    style={S.removeBtn}
                    onClick={() => onRemoveMember(m.user.id)}
                    title="ลบออกจากกลุ่ม"
                    aria-label={`ลบ ${m.user.name} ออกจากกลุ่ม`}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Head tools ---- */}
        {isOwner && otherMembers.length > 0 && (
          <details style={S.details}>
            <summary style={S.summary}>โอนสิทธิ์ Head ให้สมาชิกคนอื่น</summary>
            <div style={S.transferRow}>
              <select value={transferTarget} onChange={(e) => onTransferTargetChange(e.target.value)} style={S.select}>
                <option value="">เลือกสมาชิก...</option>
                {otherMembers.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name} (@{m.user.username})
                  </option>
                ))}
              </select>
              <button type="button" style={S.ghostBtn} disabled={!transferTarget} onClick={onTransfer}>
                โอนสิทธิ์
              </button>
            </div>
            <p style={S.hint}>หลังโอนแล้ว คุณจะกลายเป็นสมาชิกทั่วไป และไม่สามารถโอนกลับเองได้ทันที</p>
          </details>
        )}

        {/* ---- way out ---- */}
        <div style={S.danger}>
          {confirming ? (
            <>
              <p style={S.dangerText}>
                {isOwner
                  ? `ลบกลุ่ม "${ws.name}" ใช่ไหม? บอร์ดและงานทั้งหมดในกลุ่มจะถูกลบไปด้วย และกู้คืนไม่ได้`
                  : `ออกจากกลุ่ม "${ws.name}" ใช่ไหม?`}
              </p>
              <div style={S.codeActions}>
                <button type="button" style={S.dangerSolid} disabled={busy} onClick={onConfirm}>
                  {busy ? "กำลังดำเนินการ..." : isOwner ? "ยืนยันลบกลุ่ม" : "ยืนยันออกจากกลุ่ม"}
                </button>
                <button type="button" style={S.ghostBtn} onClick={onCancelConfirm}>
                  ยกเลิก
                </button>
              </div>
            </>
          ) : (
            <button type="button" style={S.dangerBtn} onClick={onAskConfirm}>
              {isOwner ? "ลบกลุ่มนี้" : "ออกจากกลุ่ม"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const FONT = "'Itim', cursive";
const RED = "#E0473E";
const btnBase = { fontFamily: FONT, fontSize: 14, fontWeight: 700, borderRadius: 999, padding: "8px 16px", cursor: "pointer", border: "2px solid var(--ink)" };

const S = {
  overlay: { position: "fixed", inset: 0, background: "rgba(53,59,70,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 },
  sheet: { position: "relative", background: "var(--bg-surface)", border: "2.5px solid var(--ink)", borderRadius: 24, boxShadow: "6px 6px 0 0 var(--ink)", width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", padding: "26px 24px 22px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18 },
  closeBtn: { position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--ink)", background: "var(--bg-page)", color: "var(--ink)", fontSize: 20, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },

  header: { display: "flex", alignItems: "center", gap: 14, paddingRight: 36 },
  headerText: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 0 },
  name: { fontFamily: FONT, fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: 0, lineHeight: 1.15, wordBreak: "break-word" },
  countPill: { fontFamily: FONT, fontSize: 13, color: "var(--ink)", background: "color-mix(in srgb, var(--accent-color) 18%, var(--bg-surface))", border: "1.5px solid var(--ink)", borderRadius: 999, padding: "1px 12px" },

  codeCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 16px 14px", background: "color-mix(in srgb, #F4B740 22%, var(--bg-surface))", border: "2px dashed var(--ink)", borderRadius: 18, textAlign: "center" },
  eyebrow: { fontFamily: FONT, fontSize: 13, letterSpacing: 1, color: "var(--ink-soft)", margin: 0 },
  tiles: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  tile: { width: 40, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 28, fontWeight: 700, color: "var(--ink)", background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 12, boxShadow: "2px 2px 0 0 var(--ink)" },
  codeActions: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" },
  primaryBtn: { ...btnBase, color: "#FFFDF8", background: "var(--accent-color)", boxShadow: "2px 2px 0 0 var(--ink)" },
  linkBtn: { fontFamily: FONT, fontSize: 13, color: "var(--ink-soft)", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", padding: 4 },
  hint: { fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: "var(--ink-soft)", margin: 0 },

  section: { display: "flex", flexDirection: "column", gap: 8 },
  sectionTitle: { fontFamily: FONT, fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 6px", background: "var(--bg-page)", border: "1.5px solid color-mix(in srgb, var(--ink) 30%, transparent)", borderRadius: 14 },
  person: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: FONT, color: "var(--ink)" },
  avatar: { width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--ink)", flexShrink: 0 },
  avatarFallback: { width: 38, height: 38, borderRadius: "50%", border: "2px solid var(--ink)", background: "var(--accent-color)", color: "#FFFDF8", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  personText: { display: "flex", flexDirection: "column", minWidth: 0 },
  personName: { fontSize: 15, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  personUser: { fontSize: 12.5, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  headTag: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: "var(--ink)", background: "color-mix(in srgb, #F4B740 40%, var(--bg-surface))", border: "1.5px solid var(--ink)", borderRadius: 999, padding: "1px 10px", display: "inline-flex", alignItems: "center", flexShrink: 0 },
  removeBtn: { width: 26, height: 26, borderRadius: "50%", border: "1.5px solid var(--ink-faint)", background: "transparent", color: "var(--ink-soft)", fontSize: 16, lineHeight: 1, cursor: "pointer", padding: 0, flexShrink: 0 },

  details: { background: "var(--bg-page)", border: "1.5px dashed color-mix(in srgb, var(--ink) 35%, transparent)", borderRadius: 14, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 },
  summary: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: "var(--ink)", cursor: "pointer" },
  transferRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  select: { flex: 1, minWidth: 150, fontFamily: FONT, fontSize: 14, color: "var(--ink)", background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 10, padding: "7px 10px" },
  ghostBtn: { ...btnBase, color: "var(--ink)", background: "var(--bg-surface)" },

  danger: { borderTop: "2px dashed color-mix(in srgb, var(--ink) 25%, transparent)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" },
  dangerText: { fontFamily: FONT, fontSize: 14, lineHeight: 1.5, color: RED, margin: 0 },
  dangerBtn: { ...btnBase, color: RED, background: "transparent", borderColor: RED },
  dangerSolid: { ...btnBase, color: "#FFFDF8", background: RED, borderColor: RED },
};
