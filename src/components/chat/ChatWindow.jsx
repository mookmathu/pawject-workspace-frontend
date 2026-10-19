import React, { useEffect, useRef, useState } from "react";
import styles from "./styles";
import { resolveAttachmentUrl, resolveAvatarUrl } from "../../lib/api";
import { useUserProfile } from "../../lib/UserProfileContext";
import { MascotNote } from "../common/Mascot";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function isImageAttachment(mimeType) {
  return typeof mimeType === "string" && mimeType.startsWith("image/");
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// How long after the last keystroke we tell the room "stopped typing" —
// shorter than the listener's own TYPING_TIMEOUT_MS fallback so under
// normal conditions the explicit stop event is what clears it.
const TYPING_STOP_DELAY_MS = 2000;

function Attachment({ mimeType, name, url }) {
  if (isImageAttachment(mimeType)) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={name || "รูปภาพ"} style={styles.attachmentImage} />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={styles.attachmentFileChip}>
      <span style={styles.attachmentFileIcon}>📎</span>
      <span style={styles.attachmentFileName}>{name || "ไฟล์แนบ"}</span>
    </a>
  );
}

export default function ChatWindow({ target, targetOnline, messages, myUserId, onSend, onTypingChange, typingUserIds, loading }) {
  const { openUserProfile } = useUserProfile();
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingStopTimerRef = useRef(null);

  // Jump to the newest message whenever the list changes — a new message
  // arrived (mine or someone else's), or we just switched conversations.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset the composer whenever the open conversation changes, and make
  // sure we don't leave a stray "typing" flag active in the room we just
  // left behind.
  useEffect(() => {
    setDraft("");
    clearPendingFile();
    clearTimeout(typingStopTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.type, target?.id]);

  function clearPendingFile() {
    setPendingFile(null);
    setPendingPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    clearPendingFile();
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setPendingPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleDraftChange(e) {
    setDraft(e.target.value);
    onTypingChange?.(true);
    clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => onTypingChange?.(false), TYPING_STOP_DELAY_MS);
  }

  if (!target) {
    return (
      <div className="card-clean chat-window" style={styles.window}>
        <div style={styles.windowEmpty}><MascotNote name="puppy" width={110} anim="wiggle" text="เลือกกลุ่มหรือเพื่อนทางด้านซ้าย" sub="แล้วเริ่มแชทได้เลย" /></div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed && !pendingFile) return;

    clearTimeout(typingStopTimerRef.current);
    onTypingChange?.(false);

    setSending(true);
    try {
      await onSend({ content: trimmed, file: pendingFile });
      setDraft("");
      clearPendingFile();
    } catch {
      // Error is already logged by the caller — leave the draft and file
      // in place so the person doesn't lose what they typed/picked.
    } finally {
      setSending(false);
    }
  }

  const othersTyping = typingUserIds && typingUserIds.size > 0;

  return (
    <div className="card-clean chat-window" style={styles.window}>
      <div style={styles.windowHeader}>
        <div style={styles.windowHeaderTitleRow}>
          {target.type === "dm" && (
            <span style={{ ...styles.headerOnlineDot, ...(targetOnline ? {} : styles.headerOnlineDotOffline) }} />
          )}
          {target.type === "dm" ? (
            <span
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer" }}
              title="ดูโปรไฟล์"
              onClick={() => openUserProfile(target.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openUserProfile(target.id);
                }
              }}
            >
              {target.name}
            </span>
          ) : (
            <span>{target.name}</span>
          )}
        </div>
        <div style={styles.windowHeaderStatus}>
          {othersTyping ? "กำลังพิมพ์..." : target.type === "dm" ? (targetOnline ? "ออนไลน์" : "ออฟไลน์") : ""}
        </div>
      </div>

      <div style={styles.messageList} ref={listRef}>
        {loading ? (
          <div style={styles.windowEmpty}><MascotNote name="puppy" anim="bounce" width={60} text="กำลังโหลดข้อความ..." /></div>
        ) : messages.length === 0 ? (
          <div style={styles.windowEmpty}><MascotNote name="ears" width={92} text="ยังไม่มีข้อความ" sub="ทักทายกันก่อนเลย" /></div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myUserId;
            const senderAvatarUrl = resolveAvatarUrl(m.sender?.avatarUrl);
            return (
              <div key={m.id} style={{ ...styles.messageOuter, ...(mine ? styles.messageOuterMine : styles.messageOuterOther) }}>
                {!mine && (
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    title="ดูโปรไฟล์"
                    onClick={() => openUserProfile(m.senderId)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openUserProfile(m.senderId);
                      }
                    }}
                  >
                    {senderAvatarUrl ? (
                      <img src={senderAvatarUrl} alt={m.sender?.name} style={styles.messageAvatarImg} />
                    ) : (
                      <span style={styles.messageAvatarPlaceholder}>{(m.sender?.name || "?").trim().charAt(0).toUpperCase()}</span>
                    )}
                  </span>
                )}
                <div style={{ ...styles.messageRow, ...(mine ? styles.messageRowMine : styles.messageRowOther) }}>
                  {!mine && (
                    <p
                      style={{ ...styles.messageSender, cursor: "pointer" }}
                      role="button"
                      tabIndex={0}
                      onClick={() => openUserProfile(m.senderId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openUserProfile(m.senderId);
                        }
                      }}
                    >
                      {m.sender?.name}
                    </p>
                  )}
                  {m.attachmentUrl && (
                    <Attachment mimeType={m.attachmentMimeType} name={m.attachmentName} url={resolveAttachmentUrl(m.attachmentUrl)} />
                  )}
                  {m.content && (
                    <div style={{ ...styles.bubble, ...(mine ? styles.bubbleMine : styles.bubbleOther) }}>{m.content}</div>
                  )}
                  <p style={styles.messageTime}>{formatTime(m.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form style={styles.composerWrap} onSubmit={handleSubmit}>
        {pendingFile && (
          <div style={styles.composerPreview}>
            {pendingPreviewUrl ? (
              <img src={pendingPreviewUrl} alt={pendingFile.name} style={styles.composerPreviewImage} />
            ) : (
              <span style={styles.attachmentFileChip}>
                <span style={styles.attachmentFileIcon}>📎</span>
                <span style={styles.attachmentFileName}>{pendingFile.name}</span>
              </span>
            )}
            <span style={styles.composerPreviewMeta}>{formatFileSize(pendingFile.size)}</span>
            <button type="button" style={styles.composerPreviewRemove} onClick={clearPendingFile} aria-label="ลบไฟล์แนบ">
              ✕
            </button>
          </div>
        )}
        <div style={styles.composer}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFilePick}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          />
          <button
            type="button"
            className="doodle-btn"
            style={styles.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            title="แนบไฟล์"
            aria-label="แนบไฟล์"
          >
            📎
          </button>
          <input
            type="text"
            className="doodle-input"
            style={styles.composerInput}
            placeholder="พิมพ์ข้อความ..."
            value={draft}
            onChange={handleDraftChange}
          />
          <button type="submit" className="doodle-btn" style={styles.sendBtn} disabled={sending}>
            ส่ง
          </button>
        </div>
      </form>
    </div>
  );
}
