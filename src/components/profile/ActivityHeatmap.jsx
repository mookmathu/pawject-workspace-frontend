import React, { useEffect, useMemo, useRef, useState } from "react";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DAY_LABELS = { 1: "จ", 3: "พ", 5: "ศ" }; // rows: 0 = Sunday … 6 = Saturday
const CELL = 14;
const GAP = 4;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 24;

// Days are handled as "YYYY-MM-DD" strings and UTC math throughout, so the
// viewer's own timezone can never shift a cell onto a neighbouring day.
function parse(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date, n) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// count = number of ~5-minute active windows that day → 0..4 intensity
function levelOf(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 7) return 3;
  return 4;
}

const LEVEL_PCT = [0, 28, 52, 76, 100];
function fillFor(level) {
  return level === 0
    ? "color-mix(in srgb, var(--ink) 8%, var(--bg-surface))"
    : `color-mix(in srgb, var(--accent-color) ${LEVEL_PCT[level]}%, var(--bg-surface))`;
}

function formatThaiDate(key) {
  const d = parse(key);
  return `${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

function minutesLabel(count) {
  if (!count) return "ไม่ได้เข้าใช้งาน";
  const min = count * 5;
  return min >= 60 ? `เข้าใช้งาน ≈ ${(min / 60).toFixed(min % 60 ? 1 : 0)} ชม.` : `เข้าใช้งาน ≈ ${min} นาที`;
}

export default function ActivityHeatmap({ data, loading, selectedYear, onSelectYear }) {
  const [hover, setHover] = useState(null);
  // 6 months fills the card with big, easy-to-read cells; 1 year is the full
  // GitHub-style strip (scrolls sideways). Only applies to the rolling view —
  // picking an older calendar year always shows that whole year.
  const [range, setRange] = useState("6m");
  const scrollRef = useRef(null);
  const rolling = selectedYear == null || selectedYear === data?.years?.[0];
  const short = rolling && range === "6m";

  const grid = useMemo(() => {
    if (!data) return null;
    const counts = new Map(data.days.map((d) => [d.day, d.count]));
    const last = parse(data.to);
    let first = parse(data.from);
    if (short) {
      const shortFrom = addDays(last, -(26 * 7 - 1));
      if (shortFrom > first) first = shortFrom;
    }
    const start = addDays(first, -first.getUTCDay()); // back up to that week's Sunday
    const weeks = Math.floor((last - start) / (7 * 86400000)) + 1;

    const cells = [];
    const months = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      let labelled = false;
      for (let r = 0; r < 7; r++) {
        const date = addDays(start, w * 7 + r);
        if (date < first || date > last) continue;
        const key = fmt(date);
        cells.push({ key, w, r, count: counts.get(key) || 0 });
        if (!labelled) {
          labelled = true;
          const m = date.getUTCMonth();
          if (m !== lastMonth) {
            lastMonth = m;
            const prev = months[months.length - 1];
            // a partial first week would crowd the next month's label — let the newer one win
            if (prev && w - prev.w < 3) {
              if (prev.w === 0) months.pop();
              else continue;
            }
            months.push({ w, label: THAI_MONTHS[m] });
          }
        }
      }
    }
    const shown = cells.filter((c) => c.count > 0).length;
    return { cells, months, weeks, shown };
  }, [data, short]);

  // the strip is read right-to-left in time: keep "today" in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [grid]);

  const years = data?.years || [];
  const thisYear = years[0];
  const selected = selectedYear ?? thisYear;
  const title = !data
    ? "กำลังโหลด..."
    : selectedYear == null || selectedYear === thisYear
      ? `เข้าใช้งาน ${(grid?.shown ?? data.totalDays)} วัน ในช่วง ${short ? "6 เดือน" : "ปี"} ที่ผ่านมา`
      : `เข้าใช้งาน ${data.totalDays} วัน ในปี ${selectedYear + 543}`;

  const W = grid ? LEFT + grid.weeks * STEP : 0;
  const H = TOP + 7 * STEP;

  return (
    <div className="profile-activity" style={S.wrap}>
      <div style={S.main}>
        <div style={S.titleRow}>
          <h2 style={S.title}>{title}</h2>
          {rolling && (
            <div style={S.years}>
              {[{ id: "6m", label: "6 เดือน" }, { id: "1y", label: "1 ปี" }].map((o) => (
                <button key={o.id} type="button" onClick={() => setRange(o.id)} style={{ ...S.yearBtn, ...(range === o.id ? S.rangeBtnOn : {}) }}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {years.length > 1 && (
            <div className="profile-years" style={S.years}>
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => onSelectYear(y === thisYear ? null : y)}
                  style={{ ...S.yearBtn, ...(y === selected ? S.yearBtnOn : {}) }}
                >
                  {y + 543}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={S.card}>
          {grid ? (
            <div ref={scrollRef} style={{ overflowX: "auto", opacity: loading ? 0.5 : 1, transition: "opacity 150ms" }}>
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", minWidth: short ? 0 : 940 }} role="img" aria-label="ปฏิทินการเข้าใช้งานรายวัน">
                {grid.months.map((m) => (
                  <text key={`${m.w}-${m.label}`} x={LEFT + m.w * STEP} y={13} fontSize="11" fill="var(--ink-soft)">
                    {m.label}
                  </text>
                ))}
                {Object.entries(DAY_LABELS).map(([row, label]) => (
                  <text key={row} x={0} y={TOP + row * STEP + CELL - 1} fontSize="11" fill="var(--ink-soft)">
                    {label}
                  </text>
                ))}
                {grid.cells.map((c) => (
                  <rect
                    key={c.key}
                    x={LEFT + c.w * STEP}
                    y={TOP + c.r * STEP}
                    width={CELL}
                    height={CELL}
                    rx="4"
                    style={{ fill: fillFor(levelOf(c.count)), stroke: hover === c.key ? "var(--ink)" : "none", strokeWidth: 1.2 }}
                    onMouseEnter={() => setHover(c.key)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>{`${formatThaiDate(c.key)} · ${minutesLabel(c.count)}`}</title>
                  </rect>
                ))}
              </svg>
            </div>
          ) : (
            <p style={S.muted}>กำลังโหลดข้อมูลการเข้าใช้งาน...</p>
          )}

          <div style={S.footer}>
            <div style={S.stats}>
              <span>🔥 ต่อเนื่องตอนนี้ <b>{data?.currentStreak ?? 0}</b> วัน</span>
              <span>🏆 ต่อเนื่องนานสุด <b>{data?.longestStreak ?? 0}</b> วัน</span>
            </div>
            <div style={S.legend} aria-hidden>
              <span>น้อย</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} style={{ ...S.legendBox, background: fillFor(l) }} />
              ))}
              <span>มาก</span>
            </div>
          </div>
          <p style={S.hint}>นับจากวันที่คุณเปิดใช้งาน Pawject (เวลาประเทศไทย) — สีเข้มขึ้นเมื่อใช้งานนานขึ้น</p>
        </div>
      </div>

    </div>
  );
}

const S = {
  wrap: { marginBottom: 40 },
  main: { minWidth: 0 },
  titleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  title: { fontFamily: "'Itim', cursive", fontWeight: 700, fontSize: 20, color: "var(--ink)", margin: 0 },
  card: {
    background: "var(--bg-surface)",
    border: "2px solid var(--ink)",
    borderRadius: 18,
    boxShadow: "4px 4px 0 0 var(--ink)",
    padding: "18px 20px 14px",
    boxSizing: "border-box",
  },
  footer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10, fontFamily: "'Itim', cursive", fontSize: 13, color: "var(--ink-soft)" },
  stats: { display: "flex", gap: 18, flexWrap: "wrap" },
  legend: { display: "flex", alignItems: "center", gap: 4 },
  legendBox: { width: 12, height: 12, borderRadius: 2.5, display: "inline-block" },
  hint: { fontFamily: "'Itim', cursive", fontSize: 12, color: "var(--ink-faint)", margin: "8px 0 0" },
  muted: { fontFamily: "'Itim', cursive", fontSize: 13.5, color: "var(--ink-soft)", margin: 0 },
  years: { display: "flex", gap: 6, flexWrap: "wrap" },
  yearBtn: { fontFamily: "'Itim', cursive", fontSize: 14, color: "var(--ink-soft)", background: "transparent", borderWidth: 2, borderStyle: "solid", borderColor: "transparent", borderRadius: 10, padding: "5px 14px", cursor: "pointer" },
  rangeBtnOn: { background: "color-mix(in srgb, var(--accent-color) 16%, var(--bg-surface))", color: "var(--ink)", fontWeight: 700, borderColor: "var(--ink)" },
  yearBtnOn: { background: "var(--accent-color)", color: "#FFFDF8", fontWeight: 700, borderColor: "var(--ink)", boxShadow: "2px 2px 0 0 var(--ink)" },
};
