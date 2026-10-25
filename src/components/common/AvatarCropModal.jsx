import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Let the person frame their profile photo before it is uploaded: drag to move,
 * slider / mouse wheel / pinch to zoom, then "บันทึกรูป" renders the circle
 * area to a 512×512 image and hands it back as a File. The server is not
 * involved in the cropping, so the existing upload endpoint is unchanged.
 */
const OUT = 512;
const MAX_ZOOM = 4;

export default function AvatarCropModal({ file, onCancel, onConfirm, saving = false, error = "" }) {
  const [src, setSrc] = useState(null);
  const [nat, setNat] = useState(null); // { w, h }
  const [zoom, setZoom] = useState(1); // 1 = image just covers the circle
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image top-left inside the stage, px
  const [size, setSize] = useState(280);
  const imgRef = useRef(null);
  const drag = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const fit = () => setSize(Math.max(200, Math.min(300, window.innerWidth - 80)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const base = useMemo(() => (nat ? size / Math.min(nat.w, nat.h) : 1), [nat, size]); // scale at zoom 1
  const scale = base * zoom;

  const clamp = useCallback(
    (p, s) => {
      if (!nat) return p;
      const minX = size - nat.w * s;
      const minY = size - nat.h * s;
      return { x: Math.min(0, Math.max(minX, p.x)), y: Math.min(0, Math.max(minY, p.y)) };
    },
    [nat, size]
  );

  // Centre the picture whenever it (or the stage size) changes.
  useEffect(() => {
    if (!nat) return;
    setZoom(1);
    setPos(clamp({ x: (size - nat.w * base) / 2, y: (size - nat.h * base) / 2 }, base));
  }, [nat, size, base, clamp]);

  // Zoom around the middle of the circle so the framed spot stays put.
  function applyZoom(nextZoom) {
    const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
    const s0 = base * zoom;
    const s1 = base * z;
    const cx = size / 2;
    const cy = size / 2;
    const ix = (cx - pos.x) / s0;
    const iy = (cy - pos.y) / s0;
    setZoom(z);
    setPos(clamp({ x: cx - ix * s1, y: cy - iy * s1 }, s1));
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      drag.current = null;
    }
  }
  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      applyZoom(pinch.current.z * (d / pinch.current.d));
    } else if (drag.current) {
      const d = drag.current;
      setPos(clamp({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) }, scale));
    }
  }
  function onPointerUp(e) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    drag.current = pointers.current.size === 1 ? { sx: [...pointers.current.values()][0].x, sy: [...pointers.current.values()][0].y, px: pos.x, py: pos.y } : null;
  }
  function onWheel(e) {
    e.preventDefault();
    applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  // React attaches wheel listeners as passive, so preventDefault needs a native one.
  const stageRef = useRef(null);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const h = (e) => onWheel(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  function handleSave() {
    if (!nat || !imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.imageSmoothingQuality = "high";
    const sw = size / scale;
    ctx.drawImage(imgRef.current, -pos.x / scale, -pos.y / scale, sw, sw, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  return createPortal(
    <div className="avc-backdrop" onMouseDown={() => !saving && onCancel()} role="dialog" aria-modal="true" aria-label="ปรับรูปโปรไฟล์">
      <style>{CSS}</style>
      <div className="avc-card" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="avc-title">ปรับรูปโปรไฟล์</h3>
        <p className="avc-sub">ลากรูปเพื่อเลื่อน และซูมเพื่อเลือกส่วนที่ต้องการ</p>

        <div
          ref={stageRef}
          className="avc-stage"
          style={{ width: size, height: size }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: nat ? nat.w * scale : "auto",
                height: nat ? nat.h * scale : "auto",
                maxWidth: "none",
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
          <span className="avc-mask" />
          <span className="avc-ring" />
        </div>

        <div className="avc-zoom">
          <button type="button" className="avc-step" onClick={() => applyZoom(zoom / 1.2)} aria-label="ซูมออก">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <input
            type="range"
            min="1"
            max={MAX_ZOOM}
            step="0.01"
            value={zoom}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            aria-label="ซูม"
          />
          <button type="button" className="avc-step" onClick={() => applyZoom(zoom * 1.2)} aria-label="ซูมเข้า">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>

        {error && <p className="avc-error">{error}</p>}

        <div className="avc-actions">
          <button type="button" className="avc-cancel" onClick={onCancel} disabled={saving}>ยกเลิก</button>
          <button type="button" className="avc-save" onClick={handleSave} disabled={!nat || saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกรูป"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const CSS = `
.avc-backdrop { position: fixed; inset: 0; z-index: 1600; background: rgba(12,14,20,.55); display: flex; align-items: center; justify-content: center; padding: 16px; animation: avc-fade 160ms ease both; }
.avc-card { width: 100%; max-width: 380px; box-sizing: border-box; padding: 22px 22px 18px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-family: 'Itim', cursive; color: var(--ink); background: var(--bg-surface); border: 2.5px solid var(--ink); border-radius: 22px; box-shadow: 5px 5px 0 0 var(--ink); animation: avc-pop 220ms cubic-bezier(.2,.9,.3,1.1) both; }
.avc-title { margin: 0; font-size: 21px; font-weight: 700; }
.avc-sub { margin: 0 0 12px; font-size: 13.5px; color: var(--ink-faint); text-align: center; }
.avc-stage { position: relative; overflow: hidden; border-radius: 14px; background: #111; cursor: grab; touch-action: none; user-select: none; }
.avc-stage:active { cursor: grabbing; }
.avc-mask { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 0 0 999px rgba(255,255,255,.62); pointer-events: none; }
:root[data-theme="dark"] .avc-mask { box-shadow: 0 0 0 999px rgba(20,22,30,.66); }
.avc-ring { position: absolute; inset: 0; border-radius: 50%; border: 2.5px solid var(--ink); pointer-events: none; }
.avc-zoom { display: flex; align-items: center; gap: 10px; width: 100%; max-width: 300px; margin: 16px 0 6px; }
.avc-zoom input[type=range] { flex: 1; min-width: 0; accent-color: var(--accent-color); cursor: pointer; }
.avc-step { flex-shrink: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; padding: 0; cursor: pointer;
  color: var(--ink); background: var(--bg-surface); border: 2px solid var(--ink); border-radius: 50%; }
.avc-step:hover { background: color-mix(in srgb, var(--accent-color) 14%, var(--bg-surface)); }
.avc-error { margin: 6px 0 0; font-size: 13px; font-weight: 600; color: #E0473E; text-align: center; }
.avc-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; width: 100%; margin-top: 10px; }
.avc-cancel { font: inherit; font-size: 15px; color: var(--ink-soft); background: none; border: none; text-decoration: underline; cursor: pointer; padding: 8px 10px; }
.avc-save { font: inherit; font-size: 16px; font-weight: 700; color: #FFFDF8; background: var(--accent-color); border: 2.5px solid var(--ink); border-radius: 999px; box-shadow: 0 3px 0 0 var(--ink); padding: 8px 24px; cursor: pointer; }
.avc-save:disabled { opacity: .55; cursor: not-allowed; }
@keyframes avc-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes avc-pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .avc-backdrop, .avc-card { animation: none; } }
`;
