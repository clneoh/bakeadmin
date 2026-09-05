// weekly.js — the "at a glance" numbers on Home plus the weekly to-do list.
// Everything the Home tab needs about the baker's week, derived from existing
// data (orders, products, delivery dates). Pure module — no DOM, never imports
// app.js — so it runs under Node for tests.

import { byId, fmtRM, groupOrders, save } from "./state.js";
import { addDays, todayISO } from "./dates.js";
import { orderDateOf } from "./customers.js";

// The fixed weekly routine the baker ticks off on Home. Wording mirrors the
// marketing guide's daily/weekly routine so the app and the guide agree.
export const WEEKLY_TASKS = [
  { id: "orders", label: "Reply to new orders & WhatsApp" },
  { id: "social", label: "Post on social media (promo plan)" },
  { id: "stock", label: "Check ingredient stock — top up / order" },
  { id: "dates", label: "Set availability for the next delivery dates" },
  { id: "menu", label: "Publish the shop menu (if anything changed)" },
  { id: "review", label: "Read This week — what sold, what didn't" },
];

// Sunday of the week containing `today` (ISO). A week runs Sunday→Saturday, so
// a "fresh each Sunday" list resets here and the This-week numbers run Sunday→today.
export function weekStartISO(today = todayISO()) {
  const day = new Date(`${today}T00:00:00`).getDay(); // 0 Sun … 6 Sat
  return addDays(today, -day);
}

// Orders still waiting on the baker: every group whose status is New, one
// customer cart counting once — the same set as the Orders-screen inbox and the
// red tab badge.
export function newOrderCount(state) {
  const unread = (state.orders || []).filter((o) => (o.status || "new") === "new");
  return groupOrders(unread).length;
}

// The numbers tile: orders PLACED since the current week's Sunday (by
// orderDate/createdAt, whatever the delivery date), counted by customer group,
// their sell value (only where the product has a price), and the top 3 products
// by quantity.
export function weekStats(state, { today = todayISO() } = {}) {
  const from = weekStartISO(today);
  const rows = (state.orders || []).filter((o) => {
    const d = orderDateOf(o);
    return !!d && d >= from && d <= today;
  });

  let rm = 0;
  let unpriced = false;
  const byQty = new Map();
  for (const o of rows) {
    const p = byId(state.products, o.productId);
    if (!p) continue;
    if (p.price == null) unpriced = true;
    else rm += (Number(o.qty) || 0) * Number(p.price);
    byQty.set(p.id, (byQty.get(p.id) || 0) + (Number(o.qty) || 0));
  }

  const top = [...byQty.entries()]
    .map(([id, qty]) => ({ name: byId(state.products, id)?.name || "(deleted product)", qty }))
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
    .slice(0, 3);

  return { orders: groupOrders(rows).length, rm, unpriced, top };
}

// Orders still to bake are everything before the baking stage — New, Confirmed,
// Paid. Once a batch is Baked it stops being next-week's workload.
const TO_BAKE = new Set(["new", "confirmed", "paid"]);

// The next delivery the baker still has to bake for: the soonest upcoming date
// holding an order in TO_BAKE, falling back to the soonest upcoming date when
// nothing is booked yet (so the tile can say "no orders yet"). Null only when
// there are no upcoming delivery dates at all. Orphan orders (deliveryDateId
// that matches no date) can never match a date here, so they never show.
export function nextBake(state, { today = todayISO() } = {}) {
  const dates = [...state.deliveryDates]
    .filter((d) => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!dates.length) return null;

  const rowsFor = (dateId) => (state.orders || []).filter((o) => o.deliveryDateId === dateId);
  const hasWorkFor = (dateId) => rowsFor(dateId).some((o) => TO_BAKE.has(o.status || "new"));
  const pick = dates.find((d) => hasWorkFor(d.id)) || dates[0];

  const byQty = new Map();
  for (const o of rowsFor(pick.id)) {
    if (!TO_BAKE.has(o.status || "new")) continue;
    const p = byId(state.products, o.productId);
    if (!p) continue;
    byQty.set(p.id, (byQty.get(p.id) || 0) + (Number(o.qty) || 0));
  }
  const lines = [...byQty.entries()]
    .map(([id, qty]) => ({ name: byId(state.products, id).name, qty }))
    .sort((a, b) => b.qty - a.qty);

  return {
    dateId: pick.id,
    date: pick.date,
    lines,
    totalItems: lines.reduce((s, l) => s + l.qty, 0),
    hasWork: lines.length > 0,
  };
}

// Read the weekly to-do without writing: when the stored week is behind the
// current one the list is shown fresh (it only resets on the next tick).
export function loadRoutine(state, { today = todayISO() } = {}) {
  const wc = (state.settings && state.settings.weekCheck) || {};
  const week = wc.week || "";
  const done = (wc.done && typeof wc.done === "object") ? wc.done : {};
  const weekStart = weekStartISO(today);
  if (week === weekStart) return { week, done };
  return { week: weekStart, done: {} };
}

// Tick / un-tick one routine task for the current week, persisting under
// settings.weekCheck. Synced across phones (it rides the settings row) via the
// union merge in sync.js, so a tick made on one phone shows on the other.
export function toggleRoutine(state, taskId, { today = todayISO() } = {}) {
  const weekStart = weekStartISO(today);
  const stored = (state.settings && state.settings.weekCheck) || {};
  const done = stored.week === weekStart ? { ...((stored.done && typeof stored.done === "object") ? stored.done : {}) } : {};
  if (done[taskId]) delete done[taskId];
  else done[taskId] = true;
  if (!state.settings) state.settings = {};
  state.settings.weekCheck = { week: weekStart, done };
  save(state);
}

// Merge two devices' checklists when their settings rows meet. Same week →
// union the ticked tasks (phone + Mac ticks both survive). Different weeks →
// the later week wins alone, because the older one is stale and done. Both
// empty / malformed input falls back to a fresh list. Used by sync.js's
// settings merge so last-write-wins never silently drops a tick.
export function mergeWeekCheck(a = {}, b = {}) {
  const weekA = a && typeof a === "object" && typeof a.week === "string" ? a.week : "";
  const weekB = b && typeof b === "object" && typeof b.week === "string" ? b.week : "";
  const doneA = (a && a.done && typeof a.done === "object") ? a.done : {};
  const doneB = (b && b.done && typeof b.done === "object") ? b.done : {};
  if (!weekA && !weekB) return { week: "", done: {} };
  if (weekA === weekB) return { week: weekA, done: { ...doneB, ...doneA } };
  const later = weekA > weekB ? a : b;
  return {
    week: typeof later.week === "string" ? later.week : "",
    done: (later.done && typeof later.done === "object") ? { ...later.done } : {},
  };
}

// Currency formatter used by the This-week tile (shared here so tests and the
// view agree).
export function money(state, n) {
  const currency = (state.settings && state.settings.currency) || "RM";
  return fmtRM(n, currency);
}
