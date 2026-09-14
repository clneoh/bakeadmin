// test/store-cal.test.js — the shop's month-grid helpers (store/calendar.js).
// The shop carries its own copy of admin/js/calendar.js's two grid functions
// rather than importing the backoffice tree (like the duplicated waNumber), so
// the first test here pins the two copies together: any edit to one that is not
// made to the other fails loudly instead of drifting on the customer's page.

import { test } from "node:test";
import assert from "node:assert/strict";

import { monthWeeks, addMonth } from "../store/calendar.js";
import { monthWeeks as adminWeeks, addMonth as adminAddMonth } from "../admin/js/calendar.js";

// Every month of two years plus a couple of far ones — leap years, 31/30/28-day
// months, months starting on each weekday.
function spread() {
  const out = [];
  for (const y of [2026, 2027, 2028]) for (let m = 0; m < 12; m++) out.push([y, m]);
  out.push([1999, 1], [2000, 1], [2100, 1]);
  return out;
}

test("the shop's grid is identical to the app's, month for month", () => {
  for (const [y, m] of spread()) {
    assert.deepEqual(monthWeeks(y, m), adminWeeks(y, m), `${y}-${m} weeks agree`);
    for (const delta of [-13, -1, 0, 1, 13]) {
      assert.deepEqual(addMonth(y, m, delta), adminAddMonth(y, m, delta),
        `${y}-${m} ${delta} months agree`);
    }
  }
});

test("a month grid is whole Sun-first weeks with null padding", () => {
  for (const [y, m] of spread()) {
    const weeks = monthWeeks(y, m);
    for (const w of weeks) assert.equal(w.length, 7, "seven cells in every row");
    const days = weeks.flat().filter(Boolean);
    const daysIn = new Date(y, m + 1, 0).getDate();
    assert.equal(days.length, daysIn, "every date of the month appears once");
    assert.equal(days[0], `${y}-${String(m + 1).padStart(2, "0")}-01`, "starts on the 1st");
    assert.equal(new Set(days).size, daysIn, "no date appears twice");
    // Padding is only ever null, and each real date sits in its own weekday column.
    for (const w of weeks) {
      for (let i = 0; i < 7; i++) {
        if (w[i] == null) continue;
        assert.equal(new Date(`${w[i]}T00:00:00`).getDay(), i, `${w[i]} sits on its weekday`);
      }
    }
  }
});

test("February 2028 starts on a Tuesday and ends in a full row", () => {
  const weeks = monthWeeks(2028, 1); // Feb 2028 — a leap year, 29 days
  assert.equal(weeks[0][0], null, "Sunday before the 1st is blank");
  assert.equal(weeks[0][2], "2028-02-01", "the 1st sits in the Tuesday column");
  assert.equal(weeks[0][6], "2028-02-05");
  assert.deepEqual(weeks.at(-1), ["2028-02-27", "2028-02-28", "2028-02-29", null, null, null, null],
    "the leap day closes the month and the tail is padded out");
});

test("addMonth crosses year boundaries in both directions", () => {
  assert.deepEqual(addMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(addMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.deepEqual(addMonth(2026, 5, 12), { year: 2027, month: 5 });
  assert.deepEqual(addMonth(2026, 5, 0), { year: 2026, month: 5 });
});
