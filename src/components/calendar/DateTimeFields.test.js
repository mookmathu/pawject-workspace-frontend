import { fixRange, rangeMs } from "./DateTimeFields";

const d = (day) => ({ day, month: 9, year: 2026 });
const t = (hour, minute = 0) => ({ hour, minute });
const base = { startDate: d(14), endDate: d(14), isAllDay: false };

test("end set before start snaps to start + 1 minute", () => {
  const r = fixRange({ ...base, startTime: t(15, 55), endTime: t(10), changed: "end", prevMs: 0 });
  expect(r.endDate).toEqual(d(14));
  expect(r.endTime).toEqual(t(15, 56));
});

test("end only 1 minute after start is accepted as is", () => {
  const r = fixRange({ ...base, startTime: t(15, 55), endTime: t(15, 56), changed: "end", prevMs: 0 });
  expect(r.endTime).toEqual(t(15, 56));
});

test("end equal to start is bumped by 1 minute", () => {
  const r = fixRange({ ...base, startTime: t(9), endTime: t(9), changed: "end", prevMs: 0 });
  expect(r.endTime).toEqual(t(9, 1));
});

test("start moved past end drags the end along, keeping the length", () => {
  const cur = { ...base, startTime: t(9), endTime: t(10, 30) };
  const r = fixRange({ ...cur, startTime: t(14), changed: "start", prevMs: rangeMs(cur) });
  expect(r.endTime).toEqual(t(15, 30));
});

test("a start at 23:59 rolls the end into the next day", () => {
  const r = fixRange({ ...base, startTime: t(23, 59), endTime: t(10), changed: "end", prevMs: 0 });
  expect(r.endDate).toEqual(d(15));
  expect(r.endTime).toEqual(t(0, 0));
});

test("valid ranges are untouched", () => {
  const r = fixRange({ ...base, startTime: t(9), endTime: t(11), changed: "end", prevMs: 0 });
  expect(r.endTime).toEqual(t(11));
});

test("all-day: end date before start snaps to start date", () => {
  const r = fixRange({ startDate: d(14), endDate: d(12), startTime: t(0), endTime: t(0), isAllDay: true, changed: "end", prevMs: 0 });
  expect(r.endDate).toEqual(d(14));
});
