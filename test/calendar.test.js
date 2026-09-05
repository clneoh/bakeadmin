// test/calendar.test.js — the month-grid helpers behind the delivery-date
// picker (admin/js/calendar.js). Sun-first weeks, ISO date cells.

import { test } from "node:test";
import assert from "node:assert/strict";

const { addMonth, DOW, monthLabel, monthWeeks, OCCASION_PRESETS, occKind, occForDate, occRange } =
  await import("../admin/js/calendar.js");

function flatDates(grid) { return grid.flat().filter(Boolean); }

test("DOW starts on Sunday", () => {
  assert.deepEqual(DOW, ["S", "M", "T", "W", "T", "F", "S"]);
});

test("September 2026: Sun-first padding, exactly 30 real dates, rows of 7", () => {
  const weeks = monthWeeks(2026, 8); // Sep 2026 starts on a Tuesday
  for (const row of weeks) assert.equal(row.length, 7, "every row is a week of 7 cells");

  const dates = flatDates(weeks);
  assert.equal(dates.length, 30, "one cell per September day");
  assert.equal(dates[0], "2026-09-01", "first cell is the 1st after the padding");
  assert.equal(dates[dates.length - 1], "2026-09-30");
  assert.equal(new Set(dates).size, 30, "no duplicates");
  assert.equal(weeks[0][0], null, "row 0 starts blank (weekday gap)");
  assert.equal(weeks[0][2], "2026-09-01", "Tuesday 1 Sep sits in the Tuesday column");
  assert.equal(weeks.length, 5);
});

test("a Sunday-start month begins in the first cell with no padding", () => {
  const weeks = monthWeeks(2026, 10); // 1 Nov 2026 is a Sunday
  assert.equal(weeks[0][0], "2026-11-01");
  const dates = flatDates(weeks);
  assert.equal(dates.length, 30);
});

test("February: leap year has 29 days, plain year has 28", () => {
  const leap = flatDates(monthWeeks(2024, 1)); // leap Feb, starts Thursday
  assert.equal(leap.length, 29);
  assert.equal(leap[leap.length - 1], "2024-02-29");
  assert.equal(leap[0], "2024-02-01");

  const plain = monthWeeks(2026, 1); // 1 Feb 2026 is a Sunday, 28 days → exact weeks
  assert.equal(flatDates(plain).length, 28);
  assert.equal(plain.length, 4, "28 days in a Sunday-start month fills exactly 4 rows");
  const p = (d) => `2026-02-${String(d).padStart(2, "0")}`;
  for (let r = 0; r < 4; r++) {
    assert.deepEqual(plain[r], Array.from({ length: 7 }, (_, c) => p(r * 7 + c + 1)),
      `row ${r} holds dates ${r * 7 + 1}–${r * 7 + 7} with no blanks`);
  }
});

test("a six-row month pads the tail, never spills into the next month", () => {
  const weeks = monthWeeks(2026, 7); // Aug 2026 starts Saturday
  assert.equal(weeks.length, 6);
  const dates = flatDates(weeks);
  assert.equal(dates.length, 31);
  assert.equal(weeks[weeks.length - 1][weeks[weeks.length - 1].length - 1], null, "trailing blanks");
  for (const d of dates) assert.ok(d.startsWith("2026-08-"), "every cell stays inside August");
});

test("addMonth wraps across year boundaries", () => {
  assert.deepEqual(addMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(addMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(addMonth(2026, 8, 1), { year: 2026, month: 9 });
  assert.deepEqual(addMonth(2026, 8, 12), { year: 2027, month: 8 });
});

test("monthLabel renders 'September 2026' style", () => {
  assert.equal(monthLabel(2026, 8), "September 2026");
  assert.equal(monthLabel(2026, 0), "January 2026");
  assert.equal(monthLabel(2027, 11), "December 2027");
});

// ── occasion marks (delivery-calendar reminders) ─────────────────────────

test("OCCASION_PRESETS covers the baker's one-tap marks", () => {
  assert.deepEqual(OCCASION_PRESETS, [
    "CNY", "Hari Raya", "Mid-Autumn", "Deepavali", "Public holiday", "School holiday",
  ]);
});

test("occKind maps a label to its preset colour family, any casing", () => {
  assert.equal(occKind("CNY"), "cny");
  assert.equal(occKind("hari raya"), "hari-raya");
  assert.equal(occKind("School holiday"), "school-holiday");
  assert.equal(occKind("Public Holiday"), "public-holiday");
  assert.equal(occKind("Mid-Autumn"), "mid-autumn");
  assert.equal(occKind("Deepavali"), "deepavali");
  assert.equal(occKind("Daughter's exam week"), "other", "custom labels get the default colour");
  assert.equal(occKind(""), "other");
});

test("occForDate finds the occasion holding a day, inclusive of both ends", () => {
  const occs = [
    { id: "a", from: "2026-09-14", to: "2026-09-22", label: "School holiday" },
    { id: "b", from: "2026-09-28", to: "2026-09-28", label: "Hari Raya" }, // single day
  ];
  assert.equal(occForDate(occs, "2026-09-01"), null, "before any range");
  assert.equal(occForDate(occs, "2026-09-13"), null, "the day before a range");
  assert.equal(occForDate(occs, "2026-09-14").id, "a", "first day is inside");
  assert.equal(occForDate(occs, "2026-09-22").id, "a", "last day is inside");
  assert.equal(occForDate(occs, "2026-09-23"), null, "the day after a range");
  assert.equal(occForDate(occs, "2026-09-28").id, "b", "a single-day mark holds its one day");
  assert.equal(occForDate([], "2026-09-14"), null, "no occasions → nothing");
  assert.equal(occForDate(null, "2026-09-14"), null, "missing list is safe");
});

test("occRange normalises a backwards drag to earlier → later", () => {
  assert.deepEqual(occRange("2026-09-29", "2026-09-21"), ["2026-09-21", "2026-09-29"]);
  assert.deepEqual(occRange("2026-09-21", "2026-09-29"), ["2026-09-21", "2026-09-29"]);
  assert.deepEqual(occRange("2026-09-25", "2026-09-25"), ["2026-09-25", "2026-09-25"], "single day");
  assert.equal(occRange("", "2026-09-29"), null);
  assert.equal(occRange(null, null), null);
});
