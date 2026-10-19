import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import Mascot from "../../components/common/Mascot";
import { getMyTasks, getUnreadCounts, resolveAvatarUrl } from "../../lib/api";
import styles from "./styles";

/**
 * Welcome launcher: the pup sits in the middle and the five destinations
 * float around it as thought bubbles ("what is the pup thinking about?").
 * Names only show on hover/focus; the profile is just the user's avatar.
 * Flat colours only. Layout maths lives in a 100 x H "unit" space so the
 * bubbles, the dotted thought trail and the SVG overlay always line up.
 */

const INK = "#353B46";

/* ---- doodle icons (flat fill + ink line) ---- */
const svgProps = { viewBox: "0 0 64 64", fill: "none", stroke: INK, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

function BoneShape({ x = 0, y = 0, s = 1, fill = "#FFFDF8" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M10 6 a5 5 0 1 0 -1 9 a5 5 0 1 0 8 4 H37 a5 5 0 1 0 8 -4 a5 5 0 1 0 -1 -9 a5 5 0 1 0 -7 -3 H17 a5 5 0 1 0 -7 3 Z" fill={fill} />
    </g>
  );
}

function IconDashboard() {
  return (
    <svg {...svgProps}>
      <path d="M8 54 H56" />
      <rect x="11" y="36" width="12" height="18" rx="3" fill="#FFFDF8" />
      <rect x="26" y="18" width="12" height="36" rx="3" fill="#F6D98F" />
      <rect x="41" y="28" width="12" height="26" rx="3" fill="#FFFDF8" />
      <path d="M44 12 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7 Z" fill="#fff" strokeWidth="2.2" transform="translate(-6 -4) scale(.95)" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg {...svgProps}>
      <path d="M12 12 H52 a6 6 0 0 1 6 6 V38 a6 6 0 0 1 -6 6 H34 L22 54 V44 H12 a6 6 0 0 1 -6 -6 V18 a6 6 0 0 1 6 -6 Z" fill="#FFFDF8" />
      <BoneShape x={14} y={19} s={0.72} fill="#F6D98F" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg {...svgProps}>
      <rect x="8" y="12" width="48" height="44" rx="7" fill="#FFFDF8" />
      <path d="M8 26 H56" />
      <path d="M20 7 V17 M44 7 V17" />
      <g fill={INK} stroke="none" transform="translate(32 41)">
        <ellipse cx="0" cy="4" rx="6.5" ry="5.4" />
        <ellipse cx="-8.5" cy="-3" rx="2.6" ry="3.2" />
        <ellipse cx="-3" cy="-7.5" rx="2.6" ry="3.2" />
        <ellipse cx="3" cy="-7.5" rx="2.6" ry="3.2" />
        <ellipse cx="8.5" cy="-3" rx="2.6" ry="3.2" />
      </g>
    </svg>
  );
}

function IconHome() {
  return (
    <svg {...svgProps}>
      <path d="M13 31 V55 H51 V31" fill="#FFFDF8" />
      <path d="M6 33 L32 7 L58 33 Z" fill="#F6D98F" />
      <path d="M25 55 V43 a7 7 0 0 1 14 0 V55" fill="#A9C8F0" />
      <g fill={INK} stroke="none" transform="translate(32 24) scale(.55)">
        <ellipse cx="0" cy="4" rx="6.5" ry="5.4" />
        <ellipse cx="-8.5" cy="-3" rx="2.6" ry="3.2" />
        <ellipse cx="-3" cy="-7.5" rx="2.6" ry="3.2" />
        <ellipse cx="3" cy="-7.5" rx="2.6" ry="3.2" />
        <ellipse cx="8.5" cy="-3" rx="2.6" ry="3.2" />
      </g>
    </svg>
  );
}

function IconTask() {
  return (
    <span style={styles.picWrap}>
      <svg {...svgProps} style={{ width: "100%", height: "100%" }}>
        <path d="M9 32 L15 52 Q16.5 56 21 56 H43 Q47.5 56 49 52 L55 32" fill="#F6D98F" />
        <BoneShape x={19} y={38} s={0.5} />
        <ellipse cx="32" cy="32" rx="23" ry="8.5" fill="#E8B98A" />
        <g fill={INK} stroke="none">
          <circle cx="24" cy="31" r="1.8" />
          <circle cx="33" cy="34" r="1.8" />
          <circle cx="41" cy="30" r="1.8" />
        </g>
      </svg>
    </span>
  );
}

const DESTINATIONS = [
  { key: "home", title: "Home", path: "/home", tint: "#F6D98F", icon: <IconHome />, thought: "อยากกลับบ้าน" },
  { key: "dashboard", title: "Dashboard", path: "/dashboard", tint: "#A9C8F0", icon: <IconDashboard />, thought: "อยากดูภาพรวม" },
  { key: "task", title: "Task", path: "/task", tint: "#A8D8B9", icon: <IconTask />, thought: "อยากกินข้าว" },
  { key: "chat", title: "Chat", path: "/chat", tint: "#F4B8B8", icon: <IconChat />, thought: "อยากคุยกับเพื่อน" },
  { key: "calendar", title: "Calendar", path: "/calendar", tint: "#CDBDE8", icon: <IconCalendar />, thought: "อยากไปเที่ยว" },
];

/* positions in a 100 x H unit box: [cx, cy] of each bubble, origin = pup's head */
const LAYOUT = {
  wide: { H: 66, size: 21, origin: [45, 27], dog: { w: 0.42, cx: 50, bottom: 1 }, pos: { home: [11, 36], dashboard: [25, 14], task: [50, 8], chat: [75, 14], calendar: [89, 36] } },
  narrow: { H: 168, size: 33, origin: [42, 99], dog: { w: 0.74, cx: 52, bottom: 1 }, pos: { task: [50, 13], dashboard: [27, 42], chat: [73, 42], home: [18, 71], calendar: [82, 71] } },
};

const CSS = `
.wl-page{background:var(--bg-page)}
.wl-scene{position:relative;width:min(1000px,100%,max(560px,calc((100vh - 170px) * 1.5)));margin:0 auto}
@media (max-width:699px){.wl-scene{width:100%}.wl-label{font-size:13px;padding:0 9px 1px;border-width:2px;box-shadow:2px 2px 0 0 var(--ink);margin-top:-8px}}
.wl-th{position:absolute;transform:translate(-50%,-50%);aspect-ratio:1.44/1;padding:0;border:0;background:none;cursor:pointer;font-family:inherit;color:#353B46;
  animation:wl-pop .55s cubic-bezier(.3,1.6,.5,1) both,wl-bob 4.6s ease-in-out infinite;animation-delay:var(--d),calc(var(--d) + .6s)}
.wl-th-in{display:block;width:100%;height:100%;position:relative;transition:transform .2s cubic-bezier(.3,1.7,.5,1)}
.wl-cloud{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.wl-ico{position:absolute;left:21%;right:21%;top:16%;bottom:4%;display:flex;align-items:center;justify-content:center}
.wl-ico>svg,.wl-ico>img{width:100%;height:100%;object-fit:contain}
.wl-label{position:absolute;left:50%;top:100%;margin-top:-4px;transform:translate(-50%,6px) scale(.9);white-space:nowrap;padding:3px 14px 4px;font-size:17px;font-weight:700;
  color:var(--ink);background:var(--bg-surface);border:2.5px solid var(--ink);border-radius:255px 15px 225px 15px / 15px 225px 15px 255px;box-shadow:3px 3px 0 0 var(--ink);
  opacity:0;pointer-events:none;transition:opacity .15s,transform .2s cubic-bezier(.3,1.6,.5,1);z-index:5}
.wl-th:hover,.wl-th:focus-visible{z-index:6;outline:none}
.wl-th:hover .wl-th-in,.wl-th:focus-visible .wl-th-in{transform:scale(1.12) rotate(-3deg)}
.wl-th:hover .wl-label,.wl-th:focus-visible .wl-label{opacity:1;transform:translate(-50%,0) scale(1)}
.wl-th:focus-visible .wl-cloud g:first-child{fill:var(--accent-color);stroke:var(--accent-color)}
.wl-th:active .wl-th-in{transform:scale(.96)}
.wl-dot{animation:wl-dot 2.4s ease-in-out infinite;animation-delay:var(--d)}
.wl-ground{position:absolute;left:50%;transform:translateX(-50%);border-radius:50%;background:#CFE3D2}
:root[data-theme="dark"] .wl-ground{background:#2F4A47}
.wl-av{position:fixed;top:20px;right:24px;z-index:20}
.wl-av-btn{display:block;padding:0;border:0;background:none;cursor:pointer;border-radius:50%;transition:transform .2s cubic-bezier(.3,1.7,.5,1)}
.wl-av-btn:hover,.wl-av-btn:focus-visible{transform:scale(1.1) rotate(-4deg);outline:none}
.wl-av-tip{position:absolute;right:0;top:calc(100% + 8px);white-space:nowrap;padding:3px 14px 4px;font-size:16px;font-weight:700;color:var(--ink);background:var(--bg-surface);border:2.5px solid var(--ink);border-radius:255px 15px 225px 15px / 15px 225px 15px 255px;box-shadow:3px 3px 0 0 var(--ink);opacity:0;transform:translateY(-4px);pointer-events:none;transition:opacity .15s,transform .2s}
.wl-av-btn:hover+.wl-av-tip,.wl-av-btn:focus-visible+.wl-av-tip{opacity:1;transform:none}
@keyframes wl-pop{from{opacity:0;transform:translate(-50%,-50%) scale(.2)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes wl-bob{0%,100%{margin-top:0}50%{margin-top:-6px}}
@keyframes wl-dot{0%,100%{opacity:.55}50%{opacity:1}}
@media (hover:none){.wl-label{opacity:1;transform:translate(-50%,0) scale(1);font-size:14px;padding:1px 10px 2px;box-shadow:2px 2px 0 0 var(--ink);border-width:2px}}
@media (max-width:700px){.wl-av{top:12px;right:14px}}
@media (prefers-reduced-motion: reduce){.wl-th{animation:none}.wl-dot{animation:none}}
`;

function getStoredUser() {
  try {
    const raw = localStorage.getItem("crew_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function greetingWord() {
  const h = new Date().getHours();
  if (h < 5) return "ดึกแล้วนะ";
  if (h < 12) return "อรุณสวัสดิ์";
  if (h < 17) return "สวัสดียามบ่าย";
  if (h < 20) return "สวัสดียามเย็น";
  return "สวัสดียามค่ำ";
}

const CLOUD_SHAPES = (
  <>
    <rect x="22" y="58" width="100" height="32" rx="16" />
    <circle cx="44" cy="62" r="20" />
    <circle cx="70" cy="44" r="28" />
    <circle cx="100" cy="56" r="22" />
  </>
);

function Cloud({ tint }) {
  return (
    <svg className="wl-cloud" viewBox="10 10 124 86" aria-hidden="true">
      <g fill="var(--ink)" stroke="var(--ink)" strokeWidth="7" strokeLinejoin="round">{CLOUD_SHAPES}</g>
      <g fill={tint}>{CLOUD_SHAPES}</g>
      <path d="M52 30 a16 16 0 0 1 14 -6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const [user] = useState(getStoredUser);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [taskCount, setTaskCount] = useState(null);
  const [unread, setUnread] = useState(null);
  const sceneRef = useRef(null);
  const [box, setBox] = useState({ w: 1000, narrow: false });

  const displayName = user?.name || "เพื่อนสมาชิก";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);

  useEffect(() => {
    let alive = true;
    getMyTasks()
      .then(({ tasks }) => alive && setTaskCount(tasks.length))
      .catch(() => {});
    getUnreadCounts()
      .then(({ unread: u }) => {
        if (alive) setUnread(Object.values(u || {}).reduce((s, n) => s + n, 0));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, narrow: window.innerWidth < 700 });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const dateText = new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const L = box.narrow ? LAYOUT.narrow : LAYOUT.wide;
  const unit = box.w / 100;
  const dogW = Math.round(box.w * L.dog.w);
  const badges = { task: taskCount, chat: unread };
  const avatarBox = { width: 54, height: 54, borderRadius: "50%", border: "2.5px solid var(--ink)", boxShadow: "3px 3px 0 0 var(--ink)", boxSizing: "border-box" };

  return (
    <div className="wl-page" style={styles.page}>
      <GlobalStyles />
      <style>{CSS}</style>

      <div className="wl-av">
        <button type="button" className="wl-av-btn" aria-label={`โปรไฟล์ของ ${displayName}`} onClick={() => navigate("/profile")}>
          {avatarSrc && !avatarLoadFailed ? (
            <img src={avatarSrc} alt="" style={{ ...avatarBox, objectFit: "cover", display: "block" }} onError={() => setAvatarLoadFailed(true)} />
          ) : (
            <span style={{ ...avatarBox, ...styles.avatarFallback }}>{initial}</span>
          )}
        </button>
        <span className="wl-av-tip" aria-hidden="true">{displayName}</span>
      </div>

      <header style={styles.greeting}>
        <p style={styles.kicker}>{greetingWord()}</p>
        <h1 style={styles.name}>{displayName}</h1>
        <p style={styles.date}>{dateText}</p>
      </header>

      <main className="wl-scene" ref={sceneRef} style={{ height: unit * L.H }}>
        <div className="wl-ground" style={{ bottom: 0, width: "78%", height: unit * 9 }} aria-hidden="true" />

        <svg width="100%" height="100%" viewBox={`0 0 100 ${L.H}`} style={styles.trail} aria-hidden="true">
          {DESTINATIONS.map((d, di) => {
            const [cx, cy] = L.pos[d.key];
            const [ox, oy] = L.origin;
            const dist = Math.hypot(cx - ox, cy - oy);
            const tEnd = Math.max(0.5, 1 - (L.size * 0.5) / dist);
            return [0.3, 0.62, 0.95].map((f) => f * tEnd).map((t, i) => (
              <circle
                key={`${d.key}${i}`}
                className="wl-dot"
                style={{ "--d": `${(di * 0.25 + i * 0.3).toFixed(2)}s` }}
                cx={ox + (cx - ox) * t}
                cy={oy + (cy - oy) * t}
                r={0.85 + i * 0.55}
                fill={d.tint}
                stroke="var(--ink)"
                strokeWidth="0.35"
              />
            ));
          })}
        </svg>

        <div style={{ position: "absolute", left: `${L.dog.cx}%`, bottom: unit * L.dog.bottom, transform: "translateX(-50%)" }}>
          <Mascot name="spotty" width={dogW} anim="wiggle" />
        </div>

        {DESTINATIONS.map((d, i) => {
          const [cx, cy] = L.pos[d.key];
          const n = badges[d.key];
          return (
            <button
              key={d.key}
              type="button"
              className="wl-th"
              aria-label={d.title}
              title={d.title}
              style={{ left: `${cx}%`, top: `${(cy / L.H) * 100}%`, width: `${L.size}%`, "--d": `${(i * 0.09).toFixed(2)}s` }}
              onClick={() => navigate(d.path)}
            >
              <span className="wl-th-in">
                <Cloud tint={d.tint} />
                <span className="wl-ico">{d.icon}</span>
                {n > 0 && <span style={styles.badge}>{n > 99 ? "99+" : n}</span>}
                <span className="wl-label">{d.title}</span>
              </span>
            </button>
          );
        })}
      </main>
    </div>
  );
}
