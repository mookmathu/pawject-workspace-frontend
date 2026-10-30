import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlobalStyles from "../../components/common/GlobalStyles";
import Mascot from "../../components/common/Mascot";
import { getMyTasks, getUnreadCounts, resolveAvatarUrl } from "../../lib/api";
import styles from "./styles";
import iconHome from "../../assets/welcome/icon-home.png";
import iconDashboard from "../../assets/welcome/icon-dashboard.png";
import iconTask from "../../assets/welcome/icon-task.png";
import iconChat from "../../assets/welcome/icon-chat.png";
import iconCalendar from "../../assets/welcome/icon-calendar.png";

/**
 * Welcome launcher: the pup sits in the middle and the five destinations
 * float around it as thought bubbles ("what is the pup thinking about?").
 * Names only show on hover/focus; the profile is just the user's avatar.
 * Icons are hand-drawn PNGs (src/assets/welcome). Layout maths lives in a 100 x H "unit" space so the
 * bubbles, the dotted thought trail and the SVG overlay always line up.
 */

function Doodle({ src }) {
  return <img src={src} alt="" draggable={false} />;
}

const DESTINATIONS = [
  { key: "home", title: "Home", path: "/home", tint: "#F6D98F", icon: <Doodle src={iconHome} />, thought: "อยากกลับบ้าน" },
  { key: "dashboard", title: "Dashboard", path: "/dashboard", tint: "#A9C8F0", icon: <Doodle src={iconDashboard} />, thought: "อยากดูภาพรวม" },
  { key: "task", title: "Task", path: "/task", tint: "#A8D8B9", icon: <Doodle src={iconTask} />, thought: "อยากกินข้าว" },
  { key: "chat", title: "Chat", path: "/chat", tint: "#F4B8B8", icon: <Doodle src={iconChat} />, thought: "อยากคุยกับเพื่อน" },
  { key: "calendar", title: "Calendar", path: "/calendar", tint: "#CDBDE8", icon: <Doodle src={iconCalendar} />, thought: "อยากไปเที่ยว" },
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
.wl-ico>img{filter:drop-shadow(2px 0 0 #FFFDF8) drop-shadow(-2px 0 0 #FFFDF8) drop-shadow(0 2px 0 #FFFDF8) drop-shadow(0 -2px 0 #FFFDF8);user-select:none}
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
