import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWorkspaceBoard, updateTask } from "../../lib/api";
import UserAvatar from "../../components/common/UserAvatar";
import { useWorkspaces } from "../../lib/WorkspacesContext";
import { setTaskJump } from "../../lib/navJump";
import { MascotNote } from "../../components/common/Mascot";
import { stripTags } from "../../lib/html";

const TEAM_KEY = "crew_dashboard_team";
const DAY = 24 * 60 * 60 * 1000;

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const BLUE = "#5B8FD6";
const RED = "#E0473E";
const GREEN = "#5BA971";
const AMBER = "#E5B94A";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function stripHtml(html) {
  return stripTags(html).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function tint(hex, pct = 16) {
  return `color-mix(in srgb, ${hex} ${pct}%, var(--bg-surface))`;
}

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Smooth line through points (simple midpoint quadratic smoothing).
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C ${mx} ${pts[i - 1].y}, ${mx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate();
  const { workspaces, loading: wsLoading } = useWorkspaces();

  const [mode, setMode] = useState(() => (readStored("crew_dashboard_mode") === "team" ? "team" : "me"));
  const [teamId, setTeamId] = useState(() => readStored(TEAM_KEY));
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoverDay, setHoverDay] = useState(null);
  const cacheRef = useRef({});
  const watchRef = useRef(null);
  const activeIdRef = useRef(null);

  const personal = workspaces.find((w) => w.isPersonal) || null;
  const teams = workspaces.filter((w) => !w.isPersonal);
  const activeTeam = teams.find((w) => w.id === teamId) || teams[0] || null;
  const activeWs = mode === "me" ? personal : activeTeam;

  function changeMode(next) {
    setMode(next);
    try {
      localStorage.setItem("crew_dashboard_mode", next);
    } catch {
      /* not remembered */
    }
  }

  function changeTeam(id) {
    setTeamId(id);
    try {
      localStorage.setItem(TEAM_KEY, id);
    } catch {
      /* not remembered */
    }
  }

  const loadBoard = useCallback(async (wsId) => {
    try {
      const { board: b } = await getWorkspaceBoard(wsId);
      cacheRef.current[wsId] = b;
      if (activeIdRef.current === wsId) {
        setBoard(b);
        setError("");
      }
    } catch (err) {
      setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  const activeWsId = activeWs?.id;
  activeIdRef.current = activeWsId;
  useEffect(() => {
    if (!activeWsId) {
      setBoard(null);
      setLoading(wsLoading);
      return;
    }
    // stale-while-revalidate, same idea as the Task page
    const cached = cacheRef.current[activeWsId];
    if (cached) {
      setBoard(cached);
      setLoading(false);
    } else {
      setBoard(null);
      setLoading(true);
    }
    loadBoard(activeWsId);
  }, [activeWsId, wsLoading, loadBoard]);

  const columns = useMemo(() => board?.columns || [], [board]);
  const tasks = useMemo(() => (board?.tasks || []).filter((t) => !t.archivedAt), [board]);

  // To-Do = the first non-done column, Done = any done column, Doing = the rest
  const stats = useMemo(() => {
    const doneIds = new Set(columns.filter((c) => c.isDoneColumn).map((c) => c.id));
    const firstOpen = columns.find((c) => !c.isDoneColumn);
    const now = Date.now();
    const done = tasks.filter((t) => doneIds.has(t.statusId));
    const open = tasks.filter((t) => !doneIds.has(t.statusId));
    const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate).getTime() < now);
    const overdueIds = new Set(overdue.map((t) => t.id));
    const todo = open.filter((t) => t.statusId === firstOpen?.id);
    const doing = open.filter((t) => t.statusId !== firstOpen?.id);
    const inProgress = open.filter((t) => !overdueIds.has(t.id));

    // last 14 days: completed (done tasks bucketed by their last update) vs created
    const today = startOfDay(new Date());
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today.getTime() - (13 - i) * DAY);
      return { date: d, completed: 0, created: 0 };
    });
    const bucket = (iso) => {
      const idx = Math.floor((startOfDay(iso).getTime() - days[0].date.getTime()) / DAY);
      return idx >= 0 && idx < 14 ? idx : -1;
    };
    done.forEach((t) => {
      const i = bucket(t.updatedAt);
      if (i >= 0) days[i].completed += 1;
    });
    tasks.forEach((t) => {
      const i = bucket(t.createdAt);
      if (i >= 0) days[i].created += 1;
    });
    const weekDone = days.slice(7).reduce((s, d) => s + d.completed, 0);
    const prevWeekDone = days.slice(0, 7).reduce((s, d) => s + d.completed, 0);
    const peak = days.slice(7).reduce((best, d) => (d.completed > best.completed ? d : best), days[7]);

    // Deadline watchlist: overdue first (most overdue on top), then anything due within a week.
    const today0 = startOfDay(new Date()).getTime();
    const dayDiff = (t) => Math.round((startOfDay(t.dueDate).getTime() - today0) / DAY);
    const watch = open
      .filter((t) => t.dueDate && (overdueIds.has(t.id) || dayDiff(t) <= 7))
      .map((t) => ({ task: t, late: overdueIds.has(t.id), diff: dayDiff(t) }))
      .sort((a, b) => new Date(a.task.dueDate) - new Date(b.task.dueDate));

    return { doneIds, firstOpen, done, open, overdue, inProgress, todo, doing, days, weekDone, prevWeekDone, peak, watch };
  }, [columns, tasks]);

  // Move a task by ticking its checkbox (Done <-> back to the first column)
  async function toggleDone(task) {
    const doneCol = columns.find((c) => c.isDoneColumn);
    const target = stats.doneIds.has(task.statusId) ? stats.firstOpen : doneCol;
    if (!target) return;
    const prev = board;
    setBoard((b) => ({ ...b, tasks: b.tasks.map((t) => (t.id === task.id ? { ...t, statusId: target.id, updatedAt: new Date().toISOString() } : t)) }));
    try {
      await updateTask(task.id, { statusId: target.id });
      cacheRef.current[activeWsId] = null;
    } catch (err) {
      setBoard(prev);
      setError(err.message || "ย้ายสถานะไม่สำเร็จ (อาจไม่มีสิทธิ์แก้ไขงานนี้)");
    }
  }

  function openTask(t) {
    setTaskJump({ workspaceId: activeWsId, taskId: t.id });
    void navigate("/task");
  }

  function openReport() {
    try {
      localStorage.setItem("crew_task_view", "summary");
      localStorage.setItem("crew_task_active_workspace", activeWsId);
    } catch {
      /* fine */
    }
    void navigate("/task");
  }

  function showOverdue() {
    if (watchRef.current) watchRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const members = (activeWs?.members || []).map((m) => m.user).filter(Boolean);
  const total = tasks.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  // ---- header + empty states ----------------------------------------------
  const header = (
    <div className="dash-head" style={S.head}>
      <div style={S.headLeft}>
        <span style={S.headDot} />
        <h2 style={S.title}>ภาพรวมงาน</h2>
        <span style={S.titlePill}>สรุปงานและความคืบหน้า · กราฟย้อนหลัง 14 วัน</span>
      </div>
      <div style={S.headRight}>
        {mode === "team" && teams.length > 0 && (
          <div style={S.teamPick}>
            <TeamPicker teams={teams} activeId={activeTeam?.id || ""} onChange={changeTeam} />
            {members.length > 0 && (
              <span style={S.avatarStack} title={members.map((m) => m.name || m.username).join(", ")}>
                {members.slice(0, 4).map((m, i) => (
                  <UserAvatar key={m.id} avatarUrl={m.avatarUrl} name={m.name || m.username} style={{ ...S.stackAvatar, marginLeft: i ? -8 : 0 }} />
                ))}
                {members.length > 4 && <span style={{ ...S.stackAvatar, marginLeft: -8, background: "var(--bg-page)", color: "var(--ink)" }}>+{members.length - 4}</span>}
              </span>
            )}
          </div>
        )}
        <div style={S.toggle} role="tablist">
          {[{ id: "me", label: "งานของฉัน" }, { id: "team", label: "ภาพรวมทีม" }].map((o) => (
            <button key={o.id} type="button" role="tab" aria-selected={mode === o.id} onClick={() => changeMode(o.id)} style={{ ...S.toggleBtn, ...(mode === o.id ? S.toggleOn : {}) }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (mode === "team" && !wsLoading && teams.length === 0) {
    return (
      <div className="dash">
        <DashStyles />
        {header}
        <div className="card-clean" style={S.empty}>
          <MascotNote name="scarf" width={70} text="ยังไม่มีกลุ่ม" sub="สร้างหรือเข้าร่วมกลุ่มจากหน้า Home เพื่อดูภาพรวมของทีม" />
          <button type="button" className="doodle-btn" style={S.emptyBtn} onClick={() => navigate("/home")}>ไปหน้า Home</button>
        </div>
      </div>
    );
  }

  if (loading && !board) {
    return (
      <div className="dash">
        <DashStyles />
        {header}
        <MascotNote name="nap" anim="float" width={140} text="กำลังโหลดภาพรวม..." />
      </div>
    );
  }

  return (
    <div className="dash">
      <DashStyles />
      {header}
      {error && <p style={S.errorText}>{error}</p>}

      {/* Row 2: status + workload */}
      <div style={S.twoCol}>
        <section className="dash-card" style={S.card}>
          <div style={{ ...S.cardHead, background: tint(BLUE, 16) }}>
            <h3 style={S.cardTitle}>สถานะงาน</h3>
            <button type="button" style={{ ...S.chip, ...S.chipBtn, background: "var(--bg-surface)", color: "var(--ink)", border: "1.5px solid var(--ink)" }} onClick={openReport}>
              ดูรายงานสรุป →
            </button>
          </div>
          <div className="dash-status-grid" style={S.statusGrid}>
            {[
              { color: BLUE, n: stats.inProgress.length, tag: "กำลังดำเนินการ", click: null },
              { color: RED, n: stats.overdue.length, tag: "ล่าช้า", click: stats.overdue.length ? showOverdue : null },
              { color: GREEN, n: stats.done.length, tag: "เสร็จแล้ว", click: null },
            ].map((s) => {
              const Box = s.click ? "button" : "div";
              return (
                <Box
                  key={s.tag}
                  {...(s.click ? { type: "button", onClick: s.click, title: "ดูรายการงานที่ล่าช้า", className: "dash-statusbtn" } : {})}
                  style={{ ...S.statusBox, background: tint(s.color, 16), borderColor: s.color, ...(s.click ? S.statusBtn : {}) }}
                >
                  <span className="dash-status-num" style={{ ...S.statusNum, color: s.color }}>{s.n}</span>
                  <span className="dash-status-pill" style={{ ...S.statusPill, color: s.color, borderColor: s.color }}>{s.tag}</span>
                  <span className="dash-status-sub" style={S.statusSub}>{pct(s.n)}% ของงานทั้งหมด</span>
                </Box>
              );
            })}
          </div>
        </section>

        <section className="dash-card" style={S.card}>
          <div style={{ ...S.cardHead, background: tint(AMBER, 24) }}>
            <h3 style={S.cardTitle}>{mode === "team" ? "ภาระงานรายสมาชิก" : "ภาระงานตามหมวดหมู่"}</h3>
            {mode === "team" && (
              <button type="button" style={{ ...S.chip, ...S.chipBtn, background: "var(--bg-surface)", color: "var(--ink)", border: "1.5px solid var(--ink)" }} onClick={() => navigate("/task")}>
                ไปที่หน้า Task →
              </button>
            )}
          </div>
          <Workload mode={mode} tasks={tasks} members={members} doneIds={stats.doneIds} categories={board?.categories || []} />
        </section>
      </div>

      {/* Row 3: checklists + completion line chart */}
      <div className="dash-check-row" style={S.checkRow}>
        {[
          { title: "todo", label: "ต้องทำ", color: BLUE, list: stats.todo },
          { title: "doing", label: "กำลังทำ", color: AMBER, list: stats.doing },
          { title: "done", label: "เสร็จแล้ว", color: GREEN, list: stats.done },
        ].map((col) => (
          <section key={col.title} className="dash-card" style={S.checkCol}>
            <div style={{ ...S.checkBand, background: tint(col.color, 26) }}>
              <h3 style={S.checkTitle}>{col.label}</h3>
              <span style={S.checkCount}>{col.list.length} งาน</span>
            </div>
            <div style={S.checkList}>
              {col.list.length === 0 && <span style={S.muted}>ว่าง</span>}
              {col.list.slice(0, 6).map((t) => {
                const isDone = stats.doneIds.has(t.statusId);
                return (
                  <div key={t.id} style={S.checkItem}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isDone}
                      onClick={() => toggleDone(t)}
                      style={{ ...S.box, ...(isDone ? S.boxOn : {}) }}
                      title={isDone ? "ย้ายกลับไปทำ" : "ทำเครื่องหมายว่าเสร็จ"}
                    >
                      {isDone ? "✓" : ""}
                    </button>
                    <button type="button" onClick={() => openTask(t)} style={{ ...S.checkText, ...(isDone ? { textDecoration: "line-through", color: "var(--ink-faint)" } : {}) }} title={t.title}>
                      {t.title}
                    </button>
                  </div>
                );
              })}
              {col.list.length > 6 && <span style={S.muted}>+ อีก {col.list.length - 6} งาน</span>}
            </div>
          </section>
        ))}

        <section className="dash-card" style={{ ...S.card, ...S.lineCard }}>
          <div style={{ ...S.cardHead, background: tint(GREEN, 18) }}>
            <h3 style={S.cardTitle}>งานที่เสร็จต่อวัน</h3>
            <span style={S.muted}>14 วันล่าสุด</span>
          </div>
          <LineChart days={stats.days} hover={hoverDay} setHover={setHoverDay} />
        </section>
      </div>

      {/* Row 4: donut + notes wall */}
      <div style={S.twoColRev}>
        <section ref={watchRef} className="dash-card" style={S.card}>
          <div style={{ ...S.cardHead, background: tint(RED, 14) }}>
            <h3 style={S.cardTitle}>งานที่ต้องจับตา</h3>
            {stats.watch.length > 0 && <span style={{ ...S.chip, background: RED, color: "#FFFDF8" }}>{stats.watch.length}</span>}
          </div>
          <Watchlist items={stats.watch} members={members} onOpen={openTask} showWho={mode === "team"} />
        </section>

        <section className="dash-card" style={S.card}>
          <div style={{ ...S.cardHead, background: tint("#9B87D8", 22) }}>
            <h3 style={S.cardTitle}>กระดานโน้ต</h3>
            <button type="button" style={{ ...S.chip, ...S.chipBtn, background: "var(--bg-surface)", color: "var(--ink)", border: "1.5px solid var(--ink)" }} onClick={() => navigate("/task")}>
              เปิดโน้ตทั้งหมด →
            </button>
          </div>
          <NoteWall notes={board?.noteContent || []} />
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// small chart pieces (plain SVG — no chart library, keeps the bundle small)

function LineChart({ days, hover, setHover }) {
  const W = 420;
  const H = 190;
  const padL = 24;
  const padR = 10;
  const padT = 14;
  const padB = 28;
  const max = Math.max(3, ...days.map((d) => d.completed));
  const x = (i) => padL + (i * (W - padL - padR)) / (days.length - 1);
  const y = (v) => padT + (1 - v / max) * (H - padT - padB);
  const pts = days.map((d, i) => ({ x: x(i), y: y(d.completed) }));
  const line = smoothPath(pts);
  const grid = [0, 0.5, 1].map((f) => Math.round(max * f));
  const hv = hover != null ? days[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="กราฟจำนวนงานที่เสร็จต่อวัน">
        {grid.map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="var(--ink)" strokeOpacity="0.12" strokeDasharray="3 4" />
            <text x={padL - 6} y={y(g) + 4} textAnchor="end" fontSize="10" fill="var(--ink-faint)">{g}</text>
          </g>
        ))}
        <path d={`${line} L ${pts[pts.length - 1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`} fill={BLUE} fillOpacity="0.16" />
        <path d={line} fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" />
        {hover != null && <line x1={pts[hover].x} x2={pts[hover].x} y1={padT} y2={H - padB} stroke="var(--ink)" strokeOpacity="0.3" strokeDasharray="3 3" />}
        {days.map((d, i) => (
          <g key={i}>
            {(i % 2 === 1 || i === days.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-faint)">{d.date.getDate()}</text>
            )}
            <circle cx={pts[i].x} cy={pts[i].y} r={hover === i ? 5.5 : d.completed ? 3.5 : 2} fill={hover === i ? BLUE : "var(--bg-surface)"} stroke={BLUE} strokeWidth="2" />
            <rect x={x(i) - 14} y={0} width="28" height={H} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${d.date.getDate()} ${THAI_MONTHS[d.date.getMonth()]} เสร็จ ${d.completed} งาน`} />
          </g>
        ))}
      </svg>
      {hv && (
        <div style={{ ...S.tooltip, left: `${(pts[hover].x / W) * 100}%` }}>
          {hv.date.getDate()} {THAI_MONTHS[hv.date.getMonth()]} · เสร็จ {hv.completed} · สร้างใหม่ {hv.created}
        </div>
      )}
    </div>
  );
}

// Themed replacement for the native <select>: the browser's own list pops up
// with a blue system highlight that clashes with the rest of the page.
function TeamPicker({ teams, activeId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = teams.find((w) => w.id === activeId) || teams[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="dash-pick" ref={ref}>
      <button type="button" className="dash-pick-btn" aria-haspopup="listbox" aria-expanded={open} aria-label="เลือกกลุ่ม" onClick={() => setOpen((v) => !v)}>
        <span className="dash-pick-name">{current?.name}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
          <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul className="dash-pick-list" role="listbox">
          {teams.map((w) => (
            <li key={w.id} role="option" aria-selected={w.id === current?.id}>
              <button
                type="button"
                className={`dash-pick-item${w.id === current?.id ? " is-on" : ""}`}
                onClick={() => {
                  setOpen(false);
                  if (w.id !== current?.id) onChange(w.id);
                }}
              >
                {w.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Watchlist({ items, members, onOpen, showWho }) {
  if (items.length === 0) return <MascotNote name="cheer" anim="float" width={84} text="ไม่มีงานเร่งด่วน" sub="ไม่มีงานเกินกำหนดหรือใกล้ครบกำหนดใน 7 วัน" />;
  const byId = Object.fromEntries(members.map((m) => [m.id, m]));
  const label = (it) => {
    if (it.late) return it.diff < 0 ? `เกินกำหนด ${-it.diff} วัน` : "เกินกำหนดวันนี้";
    if (it.diff === 0) return "ครบกำหนดวันนี้";
    if (it.diff === 1) return "ครบกำหนดพรุ่งนี้";
    return `อีก ${it.diff} วัน`;
  };
  return (
    <div style={S.watchList}>
      {items.slice(0, 8).map((it) => {
        const who = showWho && it.task.assigneeId ? byId[it.task.assigneeId] : null;
        return (
          <button key={it.task.id} type="button" onClick={() => onOpen(it.task)} style={S.watchRow} title={it.task.title}>
            <span style={{ ...S.watchDot, background: it.late ? RED : AMBER }} />
            <span style={S.watchMain}>
              <span style={S.watchTitle}>{it.task.title}</span>
              {who && <span style={S.muted}>{who.name || who.username}</span>}
            </span>
            <span style={{ ...S.duePill, ...(it.late ? S.duePillLate : {}) }}>{label(it)}</span>
          </button>
        );
      })}
      {items.length > 8 && <span style={S.muted}>+ อีก {items.length - 8} งาน</span>}
    </div>
  );
}

function Workload({ mode, tasks, members, doneIds, categories }) {
  let rows = [];
  if (mode === "team") {
    rows = members.map((m) => {
      const mine = tasks.filter((t) => t.assigneeId === m.id);
      const done = mine.filter((t) => doneIds.has(t.statusId)).length;
      return { key: m.id, name: m.name || m.username, sub: `@${m.username}`, avatarUrl: m.avatarUrl, n: mine.length, done };
    });
    const unassigned = tasks.filter((t) => !t.assigneeId);
    if (unassigned.length) rows.push({ key: "none", name: "ยังไม่มอบหมาย", sub: "", n: unassigned.length, done: unassigned.filter((t) => doneIds.has(t.statusId)).length, muted: true });
  } else {
    rows = categories.map((c) => {
      const mine = tasks.filter((t) => t.categoryId === c.id);
      return { key: c.id, name: c.name, sub: "", n: mine.length, done: mine.filter((t) => doneIds.has(t.statusId)).length, color: c.color };
    });
    const none = tasks.filter((t) => !t.categoryId);
    if (none.length) rows.push({ key: "none", name: "ไม่ระบุหมวดหมู่", sub: "", n: none.length, done: none.filter((t) => doneIds.has(t.statusId)).length, muted: true });
  }
  rows = rows.filter((r) => r.n > 0 || mode === "team").sort((a, b) => b.n - a.n);
  if (rows.length === 0) return <p style={S.muted}>ยังไม่มีงานให้สรุป</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.slice(0, 6).map((r, i) => {
        const energy = r.n ? Math.round((r.done / r.n) * 100) : 0;
        const col = r.muted ? "var(--ink-faint)" : [BLUE, AMBER, GREEN, "#9B87D8", "#E8829B"][i % 5];
        return (
          <div key={r.key}>
            <div style={S.wlHead}>
              <UserAvatar avatarUrl={r.avatarUrl} name={r.name} style={{ ...S.wlAvatar, background: tint(col === "var(--ink-faint)" ? "#888888" : col, 30) }} />
              <span style={S.wlName}>{r.name}</span>
              {r.sub && <span style={S.muted}>{r.sub}</span>}
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...S.chip, background: tint(GREEN, 22), color: GREEN }}>{energy}% เสร็จ</span>
                <span style={S.muted}>· {r.n} งาน</span>
              </span>
            </div>
            <div style={S.wlTrack} role="progressbar" aria-valuenow={energy} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} เสร็จ ${energy}%`}>
              <div style={{ width: `${energy}%`, height: "100%", background: GREEN, borderRadius: 999, transition: "width 300ms ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const NOTE_COLORS = { yellow: AMBER, blue: BLUE, green: GREEN, pink: "#E8829B", purple: "#9B87D8" };

function NoteWall({ notes }) {
  const list = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).slice(0, 6);
  if (list.length === 0) return <p style={S.muted}>ยังไม่มีโน้ต — ไปจดที่หน้า Task แล้วจะมาแปะที่นี่</p>;
  const fallback = [AMBER, BLUE, "#E8829B", GREEN, "#9B87D8", AMBER];
  return (
    <div style={S.wall}>
      {list.map((n, i) => {
        const color = NOTE_COLORS[n.color] || fallback[i % fallback.length];
        const text = stripHtml(n.html);
        const rot = [-2.2, 1.6, -1, 2.4, -1.8, 1.2][i % 6];
        return (
          <div key={n.id} style={{ ...S.sticky, background: tint(color, 30), borderColor: tint(color, 70), transform: `rotate(${rot}deg)` }}>
            <span style={S.tape} />
            {n.pinned && <span style={S.stickyPin} aria-label="ปักหมุด" />}
            {n.title && <b style={S.stickyTitle}>{n.title}</b>}
            <span style={{ ...S.stickyText, ...(n.type === "todo" && n.done ? { textDecoration: "line-through", opacity: 0.6 } : {}) }}>
              {n.type === "todo" ? (n.done ? "☑ " : "☐ ") : ""}
              {text || "(ว่าง)"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DashStyles() {
  return (
    <style>{`
      .dash-card { transition: transform 120ms ease, box-shadow 120ms ease; }
      .dash-card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 0 var(--ink) !important; }
      .dash-statusbtn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 0 var(--ink); }
      @media (max-width: 1000px) {
        .dash-check-row { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        .dash-check-row > section:last-child { grid-column: 1 / -1; }
      }
      .dash-pick { position: relative; }
      .dash-pick-btn { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 150px; max-width: 240px;
        font-family: 'Itim', cursive; font-size: 14px; color: var(--ink); cursor: pointer;
        background: color-mix(in srgb, var(--accent-color) 14%, var(--bg-surface)); border: 1.5px solid var(--ink); border-radius: 999px; padding: 7px 14px; }
      .dash-pick-btn:hover { background: color-mix(in srgb, var(--accent-color) 22%, var(--bg-surface)); }
      .dash-pick-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dash-pick-list { position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; min-width: 100%; max-width: 280px; max-height: 260px; overflow-y: auto;
        list-style: none; margin: 0; padding: 6px; background: var(--bg-surface); border: 2px solid var(--ink); border-radius: 16px; box-shadow: 3px 3px 0 0 var(--ink); }
      .dash-pick-item { display: block; width: 100%; text-align: left; font-family: 'Itim', cursive; font-size: 14px; color: var(--ink); cursor: pointer;
        background: transparent; border: none; border-radius: 10px; padding: 8px 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .dash-pick-item:hover { background: color-mix(in srgb, var(--accent-color) 14%, var(--bg-surface)); }
      .dash-pick-item.is-on { background: color-mix(in srgb, var(--accent-color) 24%, var(--bg-surface)); font-weight: 700; }
      @media (max-width: 640px) {
        .dash-check-row { grid-template-columns: 1fr !important; }
        /* status boxes become one row each: number on the left, tag + share on the right */
        .dash-status-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
        .dash-status-grid > * {
          display: grid !important; grid-template-columns: 56px 1fr; grid-template-rows: auto auto;
          column-gap: 14px; row-gap: 4px; align-items: center; text-align: left; padding: 12px 16px !important;
        }
        .dash-status-num { grid-row: 1 / span 2; text-align: center; font-size: 32px; }
        .dash-status-pill { justify-self: start; white-space: nowrap; }
        .dash-status-sub { white-space: nowrap; }
      }
      @media (max-width: 900px) {
        .dash-head { flex-direction: column; align-items: flex-start !important; }
      }
    `}</style>
  );
}

// ---------------------------------------------------------------------------

const BORDER = "color-mix(in srgb, var(--ink) 14%, var(--bg-surface))";
const SOFT = "color-mix(in srgb, var(--ink) 7%, var(--bg-surface))";

const S = {
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", paddingBottom: 14, marginBottom: 20, borderBottom: `1.5px solid ${BORDER}` },
  headLeft: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  headDot: { width: 12, height: 12, borderRadius: "50%", background: BLUE, border: "2px solid var(--ink)" },
  title: { fontFamily: "'Itim', cursive", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: 0 },
  titlePill: { fontSize: 12.5, color: "var(--ink-soft)", background: SOFT, borderRadius: 999, padding: "4px 12px" },
  headRight: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  teamPick: { display: "flex", alignItems: "center", gap: 10 },
  select: { fontFamily: "'Itim', cursive", fontSize: 13.5, color: "var(--ink)", background: tint(BLUE, 16), border: "1.5px solid var(--ink)", borderRadius: 999, padding: "7px 14px", cursor: "pointer", maxWidth: 200 },
  avatarStack: { display: "flex", alignItems: "center" },
  stackAvatar: { width: 26, height: 26, borderRadius: "50%", background: "var(--accent-color)", color: "#FFFDF8", border: "2px solid var(--bg-surface)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 1px var(--ink)" },
  toggle: { display: "flex", padding: 4, background: "var(--bg-surface)", border: "2px solid var(--ink)", borderRadius: 999, boxShadow: "3px 3px 0 0 var(--ink)" },
  toggleBtn: { fontFamily: "'Itim', cursive", fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, color: "var(--ink-soft)", background: "transparent", border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer" },
  toggleOn: { background: tint(BLUE, 20), color: BLUE },

  loadingText: { fontFamily: "'Itim', cursive", color: "var(--ink-soft)" },
  errorText: { fontFamily: "'Itim', cursive", color: RED, fontSize: 13.5, margin: "0 0 12px" },
  empty: { border: "2px dashed var(--ink)", padding: "44px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" },
  emptyText: { fontFamily: "'Itim', cursive", fontSize: 15, color: "var(--ink-soft)", margin: 0, maxWidth: 420 },
  emptyBtn: { fontSize: 15, fontWeight: 700, color: "#FFFDF8", background: "var(--accent-color)", padding: "10px 24px" },

  chip: { fontFamily: "'Itim', cursive", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0, border: "none" },
  chipBtn: { cursor: "pointer" },

  card: { background: "var(--bg-surface)", border: "2.5px solid var(--ink)", borderRadius: "22px 8px 20px 10px / 10px 20px 8px 22px", padding: "0 22px 20px", boxSizing: "border-box", minWidth: 0, boxShadow: "4px 4px 0 0 var(--ink)", overflow: "hidden" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 22px", margin: "0 -22px 16px", borderBottom: "2.5px solid var(--ink)" },
  cardTitle: { fontFamily: "'Itim', cursive", fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 },
  muted: { fontFamily: "'Itim', cursive", fontSize: 12.5, color: "var(--ink-faint)", margin: 0 },

  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, marginBottom: 20 },
  twoColRev: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, marginBottom: 20 },

  statusGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 },
  statusBox: { borderWidth: 2, borderStyle: "solid", borderRadius: 18, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "inherit", color: "var(--ink)" },
  statusBtn: { cursor: "pointer", transition: "transform 120ms ease, box-shadow 120ms ease" },
  statusNum: { fontSize: 34, fontWeight: 700, lineHeight: 1 },
  statusPill: { fontSize: 11.5, fontWeight: 700, background: "var(--bg-surface)", borderWidth: 1.5, borderStyle: "solid", borderRadius: 999, padding: "2px 10px" },
  statusSub: { fontSize: 12, color: "var(--ink-soft)" },
  wlHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13.5 },
  wlAvatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--ink)", flexShrink: 0 },
  wlName: { fontWeight: 700, color: "var(--ink)" },
  wlTrack: { height: 10, borderRadius: 999, background: SOFT, overflow: "hidden" },

  checkRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr)) minmax(0, 1.9fr)", gap: 16, marginBottom: 20 },
  checkCol: { background: "var(--bg-surface)", border: "2.5px solid var(--ink)", borderRadius: "20px 8px 18px 10px / 10px 18px 8px 20px", padding: "0 16px 14px", minWidth: 0, boxShadow: "4px 4px 0 0 var(--ink)", overflow: "hidden" },
  checkBand: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "10px 16px", margin: "0 -16px 12px", borderBottom: "2.5px solid var(--ink)" },
  checkTitle: { fontFamily: "'Itim', cursive", fontSize: 17, fontWeight: 700, margin: 0, color: "var(--ink)" },
  checkCount: { fontFamily: "'Itim', cursive", fontSize: 12.5, color: "var(--ink-soft)" },
  checkList: { display: "flex", flexDirection: "column", gap: 8 },
  checkItem: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  box: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, borderStyle: "solid", borderColor: "var(--ink)", background: "transparent", color: "#FFFDF8", fontSize: 11, fontWeight: 700, lineHeight: 1, cursor: "pointer", padding: 0, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  boxOn: { background: GREEN, borderColor: "var(--ink)" },
  checkText: { fontFamily: "'Itim', cursive", fontSize: 13, color: "var(--ink)", background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 },
  lineCard: { minWidth: 0 },
  tooltip: { position: "absolute", top: 0, transform: "translateX(-50%)", background: "var(--ink)", color: "var(--bg-page)", fontSize: 11.5, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap", pointerEvents: "none" },

  watchList: { display: "flex", flexDirection: "column", gap: 8 },
  watchRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", fontFamily: "'Itim', cursive", color: "var(--ink)", background: SOFT, border: "1.5px solid transparent", borderRadius: 14, padding: "8px 12px", cursor: "pointer" },
  watchDot: { width: 10, height: 10, borderRadius: "50%", border: "1.5px solid var(--ink)", flexShrink: 0 },
  watchMain: { display: "flex", flexDirection: "column", minWidth: 0, flex: 1 },
  watchTitle: { fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  duePill: { fontSize: 12, fontWeight: 700, color: "var(--ink)", background: tint(AMBER, 40), border: "1.5px solid var(--ink)", borderRadius: 999, padding: "2px 10px", flexShrink: 0, whiteSpace: "nowrap" },
  duePillLate: { background: tint(RED, 28), color: RED },

  wall: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16, padding: "6px 4px 4px" },
  sticky: { position: "relative", borderWidth: 1.5, borderStyle: "solid", borderRadius: 6, padding: "20px 12px 12px", display: "flex", flexDirection: "column", gap: 4, minHeight: 90, boxShadow: "2px 3px 0 rgba(53,59,70,0.14)" },
  tape: { position: "absolute", top: -8, left: "50%", marginLeft: -22, width: 44, height: 14, background: "color-mix(in srgb, var(--bg-surface) 70%, transparent)", border: "1px solid color-mix(in srgb, var(--ink) 15%, transparent)", transform: "rotate(-3deg)" },
  stickyPin: { position: "absolute", top: 6, right: 8, width: 10, height: 10, borderRadius: "50%", background: RED, border: "1.5px solid var(--ink)" },
  stickyTitle: { fontFamily: "'Itim', cursive", fontSize: 13, color: "var(--ink)" },
  stickyText: { fontFamily: "'Itim', cursive", fontSize: 13, color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.45 },
};
