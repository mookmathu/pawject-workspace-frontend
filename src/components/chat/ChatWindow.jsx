import React, { useEffect, useRef, useState } from "react";
import styles from "./styles";
import { resolveAttachmentUrl, resolveAvatarUrl } from "../../lib/api";
import { useUserProfile } from "../../lib/UserProfileContext";
import Mascot from "../common/Mascot";
import { STICKERS, stickerToken, parseSticker, fitWidth } from "./stickers";

const ICON = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const ClipIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...ICON} aria-hidden="true">
    <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
  </svg>
);
const SendIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" {...ICON} aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...ICON} strokeWidth={2.4} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...ICON} aria-hidden="true">
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </svg>
);
const ChevronIcon = ({ dir }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...ICON} strokeWidth={2.4} aria-hidden="true">
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);
const SmileIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" {...ICON} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14c.9 1.4 2.1 2 3.5 2s2.6-.6 3.5-2" />
    <path d="M9 9.5v.5M15 9.5v.5" strokeWidth={2.6} />
  </svg>
);
const GalleryIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" {...ICON} aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 5" />
  </svg>
);
const BubbleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" {...ICON} strokeWidth={1.4} aria-hidden="true">
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" />
  </svg>
);

function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function formatDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "วันนี้";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "เมื่อวาน";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
const GROUP_GAP_MS = 5 * 60 * 1000; // consecutive messages within 5 min from one sender are grouped

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

function Attachment({ mimeType, name, url, onOpenImage }) {
  if (isImageAttachment(mimeType)) {
    return (
      <button type="button" onClick={onOpenImage} style={styles.attachmentImageBtn} title="ดูรูปใหญ่" aria-label="ดูรูปใหญ่">
        <img src={url} alt={name || "รูปภาพ"} style={styles.attachmentImage} />
      </button>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={styles.attachmentFileChip}>
      <span style={styles.attachmentFileIcon}><ClipIcon size={16} /></span>
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null); // index into `images`, null = closed
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const imageCountRef = useRef(0);

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

  // Esc closes the viewer, arrows step through images.
  useEffect(() => {
    if (viewerIndex === null) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setViewerIndex(null);
      else if (e.key === "ArrowRight") setViewerIndex((i) => (i === null ? i : Math.min(i + 1, imageCountRef.current - 1)));
      else if (e.key === "ArrowLeft") setViewerIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerIndex]);

  // Esc closes the gallery (the viewer handles its own Esc first, on top of it).
  useEffect(() => {
    if (!galleryOpen || viewerIndex !== null) return undefined;
    const onKey = (e) => e.key === "Escape" && setGalleryOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryOpen, viewerIndex]);

  useEffect(() => {
    if (!stickerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setStickerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stickerOpen]);

  // Close the viewer/gallery/sticker tray when switching conversations.
  useEffect(() => {
    setStickerOpen(false);
    setViewerIndex(null);
    setGalleryOpen(false);
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
      <div className="chat-window" style={styles.window}>
        <div style={styles.windowEmpty}>
          <BubbleIcon />
          <p style={styles.emptyTitle}>เลือกกลุ่มหรือเพื่อนทางด้านซ้าย</p>
          <p style={styles.emptySub}>แล้วเริ่มแชทได้เลย</p>
        </div>
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

  // Every image in this conversation, in order, so the viewer can step through them.
  const images = (messages || [])
    .filter((m) => m.attachmentUrl && isImageAttachment(m.attachmentMimeType))
    .map((m) => ({ id: m.id, url: resolveAttachmentUrl(m.attachmentUrl), name: m.attachmentName, sender: m.sender?.name, createdAt: m.createdAt }));
  imageCountRef.current = images.length;
  // Group thumbnails by day, newest day first (indexes still point into `images`).
  const galleryGroups = [];
  images.forEach((img, index) => {
    const key = dayKey(img.createdAt);
    let g = galleryGroups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: formatDay(img.createdAt), items: [] };
      galleryGroups.push(g);
    }
    g.items.push({ img, index });
  });
  galleryGroups.reverse();
  const closeViewer = () => setViewerIndex(null);
  const viewing = viewerIndex !== null ? images[viewerIndex] : null;

  async function handleSendSticker(id) {
    setStickerOpen(false);
    clearTimeout(typingStopTimerRef.current);
    onTypingChange?.(false);
    try {
      await onSend({ content: stickerToken(id), file: null });
    } catch {
      // already logged by the caller
    }
  }

  const othersTyping = typingUserIds && typingUserIds.size > 0;

  return (
    <div className="chat-window" style={styles.window}>
      <div style={styles.windowHeader}>
        <span style={styles.windowHeaderAvatarFallback} aria-hidden="true">
          {(target.name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
        <div style={styles.windowHeaderTitleRow}>
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
          {target.type === "dm" && !othersTyping && (
            <span style={{ ...styles.headerOnlineDot, ...(targetOnline ? {} : styles.headerOnlineDotOffline) }} />
          )}
          {othersTyping ? "กำลังพิมพ์..." : target.type === "dm" ? (targetOnline ? "ออนไลน์" : "ออฟไลน์") : "แชทกลุ่ม"}
        </div>
        </div>
        <button
          type="button"
          style={styles.headerIconBtn}
          onClick={() => setGalleryOpen(true)}
          title="รูปภาพทั้งหมดในแชท"
          aria-label="รูปภาพทั้งหมดในแชท"
        >
          <GalleryIcon />
        </button>
      </div>

      <div style={styles.messageList} ref={listRef}>
        {loading ? (
          <div style={styles.windowEmpty}><p style={styles.emptySub}>กำลังโหลดข้อความ...</p></div>
        ) : messages.length === 0 ? (
          <div style={styles.windowEmpty}>
            <BubbleIcon />
            <p style={styles.emptyTitle}>ยังไม่มีข้อความ</p>
            <p style={styles.emptySub}>ทักทายกันก่อนเลย</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === myUserId;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            const sameAsPrev = !newDay && prev.senderId === m.senderId && new Date(m.createdAt) - new Date(prev.createdAt) < GROUP_GAP_MS;
            const sameAsNext = next && dayKey(next.createdAt) === dayKey(m.createdAt) && next.senderId === m.senderId && new Date(next.createdAt) - new Date(m.createdAt) < GROUP_GAP_MS;
            const senderAvatarUrl = resolveAvatarUrl(m.sender?.avatarUrl);
            const openSender = () => openUserProfile(m.senderId);
            const onKey = (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openSender();
              }
            };
            return (
              <React.Fragment key={m.id}>
                {newDay && <div style={styles.dateDivider}>{formatDay(m.createdAt)}</div>}
                <div style={{ ...styles.messageOuter, ...(mine ? styles.messageOuterMine : styles.messageOuterOther) }}>
                  {!mine && (
                    <div style={styles.messageAvatarSlot}>
                      {/* avatar sits beside the last message of a group */}
                      {!sameAsNext && (
                        <span role="button" tabIndex={0} style={{ cursor: "pointer", display: "block" }} title="ดูโปรไฟล์" onClick={openSender} onKeyDown={onKey}>
                          {senderAvatarUrl ? (
                            <img src={senderAvatarUrl} alt={m.sender?.name} style={styles.messageAvatarImg} />
                          ) : (
                            <span style={styles.messageAvatarPlaceholder}>{(m.sender?.name || "?").trim().charAt(0).toUpperCase()}</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ ...styles.messageRow, ...(mine ? styles.messageRowMine : styles.messageRowOther) }}>
                    {!mine && !sameAsPrev && (
                      <p style={{ ...styles.messageSender, cursor: "pointer" }} role="button" tabIndex={0} onClick={openSender} onKeyDown={onKey}>
                        {m.sender?.name}
                      </p>
                    )}
                    {m.attachmentUrl && (
                      <Attachment
                        mimeType={m.attachmentMimeType}
                        name={m.attachmentName}
                        url={resolveAttachmentUrl(m.attachmentUrl)}
                        onOpenImage={() => setViewerIndex(Math.max(0, images.findIndex((im) => im.id === m.id)))}
                      />
                    )}
                    {m.content && (() => {
                      const sticker = parseSticker(m.content);
                      return sticker ? (
                        <div style={styles.stickerMsg}>
                          <Mascot name={sticker.id} width={fitWidth(sticker, 120)} anim="none" decorative={false} title={sticker.label} />
                        </div>
                      ) : (
                        <div style={{ ...styles.bubble, ...(mine ? styles.bubbleMine : styles.bubbleOther) }}>{m.content}</div>
                      );
                    })()}
                    {!sameAsNext && <p style={styles.messageTime}>{formatTime(m.createdAt)}</p>}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <form style={styles.composerWrap} onSubmit={handleSubmit}>
        {stickerOpen && (
          <>
            <div style={styles.stickerCatcher} onClick={() => setStickerOpen(false)} />
            <div style={styles.stickerTray} role="dialog" aria-label="สติกเกอร์">
              <div style={styles.stickerTrayTitle}>สติกเกอร์</div>
              <div style={styles.stickerGrid}>
                {STICKERS.map((s) => (
                  <button key={s.id} type="button" style={styles.stickerCell} onClick={() => handleSendSticker(s.id)} title={s.label} aria-label={`ส่งสติกเกอร์ ${s.label}`}>
                    <Mascot name={s.id} width={fitWidth(s, 62)} anim="none" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {pendingFile && (
          <div style={styles.composerPreview}>
            {pendingPreviewUrl ? (
              <img src={pendingPreviewUrl} alt={pendingFile.name} style={styles.composerPreviewImage} />
            ) : (
              <span style={styles.attachmentFileChip}>
                <span style={styles.attachmentFileIcon}><ClipIcon size={16} /></span>
                <span style={styles.attachmentFileName}>{pendingFile.name}</span>
              </span>
            )}
            <span style={styles.composerPreviewMeta}>{formatFileSize(pendingFile.size)}</span>
            <button type="button" style={styles.composerPreviewRemove} onClick={clearPendingFile} aria-label="ลบไฟล์แนบ">
              <CloseIcon />
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
            style={styles.attachBtn}
            onClick={() => fileInputRef.current?.click()}
            title="แนบไฟล์"
            aria-label="แนบไฟล์"
          >
            <ClipIcon />
          </button>
          <button
            type="button"
            style={{ ...styles.attachBtn, ...(stickerOpen ? styles.attachBtnOn : {}) }}
            onClick={() => setStickerOpen((v) => !v)}
            title="สติกเกอร์"
            aria-label="สติกเกอร์"
            aria-expanded={stickerOpen}
          >
            <SmileIcon />
          </button>
          <input
            type="text"
            style={styles.composerInput}
            placeholder="พิมพ์ข้อความ..."
            value={draft}
            onChange={handleDraftChange}
          />
          <button
            type="submit"
            style={{ ...styles.sendBtn, ...(!draft.trim() && !pendingFile ? styles.sendBtnOff : {}) }}
            disabled={sending || (!draft.trim() && !pendingFile)}
            aria-label="ส่ง"
            title="ส่ง"
          >
            <SendIcon />
          </button>
        </div>
      </form>

      {galleryOpen && (
        <div style={styles.galleryBackdrop} onClick={() => setGalleryOpen(false)} role="dialog" aria-modal="true" aria-label="รูปภาพทั้งหมด">
          <div style={styles.galleryPanel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.galleryHead}>
              <div>
                <div style={styles.galleryTitle}>รูปภาพทั้งหมด</div>
                <div style={styles.gallerySub}>{target.name} · {images.length} รูป</div>
              </div>
              <button type="button" style={styles.galleryClose} onClick={() => setGalleryOpen(false)} aria-label="ปิด" title="ปิด">
                <CloseIcon />
              </button>
            </div>
            {images.length === 0 ? (
              <div style={{ ...styles.windowEmpty, padding: "48px 24px" }}>
                <GalleryIcon />
                <p style={styles.emptyTitle}>ยังไม่มีรูปภาพในแชทนี้</p>
                <p style={styles.emptySub}>รูปที่ส่งในแชทจะมารวมกันที่นี่</p>
              </div>
            ) : (
              <div style={styles.galleryBody}>
                {galleryGroups.map((g) => (
                  <section key={g.key}>
                    <div style={styles.galleryDay}>{g.label}</div>
                    <div style={styles.galleryGrid}>
                      {g.items.map(({ img, index }) => (
                        <button key={img.id} type="button" style={styles.galleryThumbBtn} onClick={() => setViewerIndex(index)} aria-label={`ดูรูปของ ${img.sender || ""}`}>
                          <img src={img.url} alt={img.name || "รูปภาพ"} loading="lazy" style={styles.galleryThumb} />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {viewing && (
        <div style={styles.viewerBackdrop} onClick={closeViewer} role="dialog" aria-modal="true" aria-label="ดูรูปภาพ">
          <div style={styles.viewerBar} onClick={(e) => e.stopPropagation()}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.viewerTitle}>{viewing.sender || viewing.name || "รูปภาพ"}</div>
              <div style={styles.viewerSub}>
                {formatTime(viewing.createdAt)}
                {images.length > 1 ? ` · ${viewerIndex + 1} / ${images.length}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={viewing.url} download={viewing.name || true} target="_blank" rel="noreferrer" style={styles.viewerBtn} title="ดาวน์โหลด" aria-label="ดาวน์โหลด">
                <DownloadIcon />
              </a>
              <button type="button" style={styles.viewerBtn} onClick={closeViewer} title="ปิด" aria-label="ปิด">
                <CloseIcon />
              </button>
            </div>
          </div>

          {viewerIndex > 0 && (
            <button type="button" style={{ ...styles.viewerNav, left: 16 }} onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex - 1); }} aria-label="รูปก่อนหน้า">
              <ChevronIcon dir="left" />
            </button>
          )}
          {viewerIndex < images.length - 1 && (
            <button type="button" style={{ ...styles.viewerNav, right: 16 }} onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex + 1); }} aria-label="รูปถัดไป">
              <ChevronIcon dir="right" />
            </button>
          )}

          <img src={viewing.url} alt={viewing.name || "รูปภาพ"} style={styles.viewerImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
