// calendar.js — pure month-grid helpers for the "manage delivery dates"
// calendar picker. Weeks start on Sunday (the app's week). No DOM — runs under
// Node for tests. Cell values are ISO "YYYY-MM-DD" strings for the displayed
// month; adjacent-month padding cells are null.

function pad(n) { return String(n).padStart(2, "0"); }

function iso(y, m1, d) { return `${y}-${pad(m1)}-${pad(d)}`; }

// Grid for `year` (4-digit) and `month` (0-based). Rows are Sun-first weeks;
// each row is 7 cells, blank padding is null. Every date of the month appears
// exactly once; weeks never spill into adjacent months.
export function monthWeeks(year, month) {
  const first = new Date(year, month, 1);
  const lead = first.getDay(); // 0 Sun … 6 Sat
  const daysIn = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(iso(year, month + 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// The month `delta` months away from (year, month) → { year, month }.
export function addMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export function monthLabel(year, month) {
  return `${MONTHS[month]} ${year}`;
}

export const DOW = ["S", "M", "T", "W", "T", "F", "S"];
