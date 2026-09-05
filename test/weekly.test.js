// test/weekly.test.js — the Home "at a glance" numbers + weekly to-do logic.
// Pure-data module (admin/js/weekly.js) with no DOM dependency; every clocked
// function takes an explicit { today } so no test depends on the real date.
// Weeks run Sunday→Saturday: weekStartISO is the Sunday of today's week.

import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; },
};

import { addDays } from "../admin/js/dates.js";

const { WEEKLY_TASKS, loadRoutine: loadR, mergeWeekCheck: mergeWc,
  newOrderCount: countNew, nextBake: next, toggleRoutine: toggle,
  weekStartISO: sundayOf, weekStats: stats }
  = await import("../admin/js/weekly.js");

// A fixed mid-week day (2026-09-09 is a Wednesday; its week's Sunday is
// 2026-09-06) so windows and week labels are stable.
const TODAY = "2026-09-09";
const SUNDAY = "2026-09-06";

function baseState(overrides = {}) {
  return {
    settings: { currency: "RM", ...(overrides.settings || {}) },
    products: [
      { id: "p1", name: "Focaccia", price: 15 },
      { id: "p2", name: "Sandwich", price: undefined }, // no price yet
      { id: "p3", name: "Croissant", price: 8 },
    ],
    deliveryDates: [],
    orders: [],
    ...overrides,
  };
}

test("weekStartISO returns the Sunday of the week for any day", () => {
  assert.equal(sundayOf(TODAY), SUNDAY);
  assert.equal(sundayOf(SUNDAY), SUNDAY, "a Sunday maps to itself");
  // Every day from that Sunday to the following Saturday maps back to it.
  for (let k = 0; k < 7; k++) {
    assert.equal(sundayOf(addDays(SUNDAY, k)), SUNDAY, `Sun+${k} stays in the same week`);
  }
  assert.equal(sundayOf(addDays(SUNDAY, 7)), addDays(SUNDAY, 7), "the next Sunday starts a new week");
  assert.equal(sundayOf("2026-09-07"), SUNDAY, "Monday is after the Sunday start");
  assert.equal(sundayOf("2026-09-12"), SUNDAY, "Saturday still belongs to that week");
});

test("newOrderCount counts New groups, one cart counting once", () => {
  const s = baseState();
  assert.equal(countNew(s), 0, "no orders → 0");

  // One storefront cart of two items + one plain single order = 2 groups.
  s.orders = [
    { id: "o1", groupId: "g1", productId: "p1", qty: 1, status: "new", deliveryDateId: "d1" },
    { id: "o2", groupId: "g1", productId: "p3", qty: 2, status: "new", deliveryDateId: "d1" },
    { id: "o3", productId: "p1", qty: 1, status: "new", deliveryDateId: "d1" },
    { id: "o4", productId: "p1", qty: 1, status: "confirmed", deliveryDateId: "d1" },
  ];
  assert.equal(countNew(s), 2, "one 2-item group + one single");
});

test("weekStats: Sunday→today window, group count, RM + unpriced, top sellers", () => {
  const s = baseState({
    orders: [
      // One customer cart (2 items) placed today → counts as ONE order.
      { id: "o1", groupId: "g1", productId: "p1", qty: 2, status: "confirmed", orderDate: TODAY },
      { id: "o2", groupId: "g1", productId: "p2", qty: 3, status: "confirmed", orderDate: TODAY },
      // A single order placed on this week's Sunday — inside the window.
      { id: "o3", productId: "p3", qty: 4, status: "delivered", orderDate: SUNDAY },
      // Placed last Saturday (before the Sunday start) — outside the window.
      { id: "o4", productId: "p1", qty: 9, status: "delivered", orderDate: addDays(SUNDAY, -1) },
      // Placed in the future — not this week yet.
      { id: "o6", productId: "p1", qty: 1, status: "new", orderDate: addDays(TODAY, 1) },
      // Placed recently but recorded with no usable date — skipped.
      { id: "o5", productId: "p1", qty: 1, status: "new" },
    ],
  });

  const w = stats(s, { today: TODAY });
  assert.equal(w.orders, 2, "the two cart rows count as one order, plus the Sunday single");
  assert.equal(w.rm, (2 * 15) + (4 * 8), "priced items sum; unpriced Sandwich adds 0");
  assert.equal(w.unpriced, true, "Sandwich has no price → flagged");
  assert.deepEqual(w.top.map((t) => t.name), ["Croissant", "Sandwich", "Focaccia"],
    "top sellers by qty: Croissant ×4, Sandwich ×3, Focaccia ×2");
});

test("weekStats: all priced, no flag; qty ties break alphabetically; top capped at 3", () => {
  const s = baseState();
  s.products[1].price = 6;
  s.orders = [
    { id: "o1", productId: "p3", qty: 2, orderDate: TODAY },
    { id: "o2", productId: "p3", qty: 2, orderDate: TODAY },
    { id: "o3", productId: "p1", qty: 1, orderDate: TODAY },
    { id: "o4", productId: "p2", qty: 1, orderDate: TODAY },
  ];

  const w = stats(s, { today: TODAY });
  assert.equal(w.rm, (4 * 8) + 15 + 6, "everything priced sums");
  assert.equal(w.unpriced, false, "no unpriced product involved");
  assert.deepEqual(w.top.map((t) => t.name), ["Croissant", "Focaccia", "Sandwich"],
    "Croissant ×4 top; Focaccia ×1 before Sandwich ×1 alphabetically");
});

test("weekStats counts the week's start even when today is Sunday", () => {
  const s = baseState();
  const sunday = SUNDAY;
  s.orders = [
    { id: "o1", productId: "p3", qty: 2, orderDate: sunday },
  ];
  const w = stats(s, { today: sunday });
  assert.equal(w.orders, 1, "the single Sunday order is in 'this week'");
  assert.equal(w.rm, 16);
});

test("nextBake picks the earliest upcoming date still needing a bake", () => {
  const s = baseState({
    deliveryDates: [
      { id: "dA", date: "2026-09-10" }, // nearer, has work → the pick
      { id: "dB", date: "2026-09-12" }, // fully Baked/Delivered
      { id: "dC", date: "2026-09-15" }, // has work but later
    ],
    orders: [
      { id: "x1", deliveryDateId: "dA", productId: "p1", qty: 1, status: "new" },
      { id: "x2", deliveryDateId: "dB", productId: "p1", qty: 1, status: "baking" },
      { id: "x3", deliveryDateId: "dB", productId: "p3", qty: 1, status: "delivered" },
      { id: "x4", deliveryDateId: "dC", productId: "p1", qty: 2, status: "new" },
      { id: "x5", deliveryDateId: "dC", productId: "p3", qty: 1, status: "paid" },
    ],
  });
  const b = next(s, { today: TODAY });
  assert.equal(b.dateId, "dA", "dA is earliest AND has work");
  assert.equal(b.hasWork, true);
  assert.equal(b.totalItems, 1);
  assert.deepEqual(b.lines, [{ name: "Focaccia", qty: 1 }]);
});

test("nextBake skips dates fully handled; falls back to earliest upcoming when empty", () => {
  const s = baseState({
    deliveryDates: [
      { id: "dA", date: "2026-09-10" }, // only Baked/Delivered orders
      { id: "dB", date: "2026-09-12" }, // empty
    ],
    orders: [
      { id: "x1", deliveryDateId: "dA", productId: "p1", qty: 3, status: "baking" },
      { id: "x2", deliveryDateId: "dA", productId: "p3", qty: 2, status: "delivered" },
    ],
  });
  const b = next(s, { today: TODAY });
  assert.equal(b.dateId, "dA", "falls back to the soonest upcoming date");
  assert.equal(b.hasWork, false, "nothing to bake on it");
  assert.equal(b.totalItems, 0);
  assert.deepEqual(b.lines, []);
});

test("nextBake ignores past dates, orphan orders, and returns null with no dates", () => {
  const s = baseState({
    deliveryDates: [{ id: "dF", date: "2026-09-20" }],
    orders: [
      { id: "x1", deliveryDateId: "dPast", productId: "p1", qty: 9, status: "new" }, // orphan
    ],
  });
  // No delivery date >= today at all → null.
  assert.equal(next(baseState(), { today: TODAY }), null, "no dates → null");
  // Orphan order only → the real date shows empty, orphan never counted.
  const b = next(s, { today: TODAY });
  assert.equal(b.dateId, "dF");
  assert.equal(b.hasWork, false);
  assert.deepEqual(b.lines, [], "orphan's qty is not baked");

  // A past date with new orders must not be chosen.
  s.deliveryDates.push({ id: "dPastD", date: addDays(TODAY, -1) });
  s.orders.push({ id: "x2", deliveryDateId: "dPastD", productId: "p1", qty: 4, status: "new" });
  const b2 = next(s, { today: TODAY });
  assert.equal(b2.dateId, "dF", "past date ignored even though it has a new order");
});

test("routine ticks persist under the current week and reset on a new one", () => {
  const s = baseState();
  assert.equal(loadR(s, { today: TODAY }).done.orders, undefined, "fresh list");

  toggle(s, "orders", { today: TODAY });
  toggle(s, "social", { today: TODAY });
  const rt = loadR(s, { today: TODAY });
  assert.equal(rt.week, SUNDAY, "stored under the current Sunday");
  assert.deepEqual(Object.keys(rt.done).sort(), ["orders", "social"]);
  assert.equal(WEEKLY_TASKS.some((t) => t.id === "orders" && t.label.includes("Reply")), true,
    "routine list carries readable tasks");

  // Un-tick removes only that task.
  toggle(s, "orders", { today: TODAY });
  assert.deepEqual(loadR(s, { today: TODAY }).done, { social: true }, "orders un-ticked, social kept");

  // A stored week from before → the list reads fresh until the next tick.
  const s2 = baseState();
  s2.settings.weekCheck = { week: addDays(SUNDAY, -7), done: { orders: true, stock: true } };
  assert.deepEqual(loadR(s2, { today: TODAY }).done, {}, "old week's ticks don't show");
  toggle(s2, "orders", { today: TODAY }); // first tick of the new week
  assert.deepEqual(loadR(s2, { today: TODAY }).done, { orders: true }, "stale ticks cleared on write");
});

test("mergeWeekCheck unions the same week and lets the later week win otherwise", () => {
  assert.deepEqual(mergeWc(), { week: "", done: {} }, "nothing → fresh list");
  assert.deepEqual(mergeWc({ week: "", done: {} }, { week: "", done: {} }), { week: "", done: {} });

  // Same week: phone and Mac ticks both survive.
  const a = { week: SUNDAY, done: { orders: true, social: true } };
  const b = { week: SUNDAY, done: { orders: true, stock: true, menu: true } };
  assert.deepEqual(mergeWc(a, b), { week: SUNDAY, done: { orders: true, social: true, stock: true, menu: true } });

  // Different weeks: the later (lexically larger ISO) week wins alone.
  const older = { week: addDays(SUNDAY, -7), done: { orders: true, dates: true } };
  assert.deepEqual(mergeWc(a, older), a, "current week beats a stale one");
  assert.deepEqual(mergeWc(older, a), a, "order of the arguments doesn't matter");

  // An empty side never wipes a real week.
  assert.deepEqual(mergeWc(a, {}), a);
  assert.deepEqual(mergeWc({}, a), a);

  // Malformed input falls back to a fresh list.
  assert.deepEqual(mergeWc({ week: SUNDAY, done: "nope" }, { done: [1] }), { week: SUNDAY, done: {} });
});

test("WEEKLY_TASKS has six unique, sensible routine ids", () => {
  const ids = WEEKLY_TASKS.map((t) => t.id);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6, "unique ids");
  for (const t of WEEKLY_TASKS) assert.ok(t.label.trim().length > 3);
});
