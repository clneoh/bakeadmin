// money.js — what came in, and how it came in (16 Sep 2026). Pure and shared: the
// Orders day header and the Money screen are one computation, so the line she reads
// on a day and the screen she reconciles against can never disagree.
//
// Two things are counted, and they are counted by different days on purpose:
//   • money COLLECTED is counted by the day it landed (paidAt). That is what a
//     reconciliation is about: an order delivered on the 18th but paid by transfer
//     on the 16th belongs to the 16th. Money paid before that stamp existed falls
//     back to its delivery date, which is the day it was handed over.
//   • money STILL TO COLLECT is counted by DELIVERY date — it is money owed for the
//     orders she is about to hand over, whatever the calendar says today.
import { groupOrders, orderLinePrice } from "./state.js";

// The stages in order, so "is this past Paid?" can be asked here without importing
// the Orders screen (which imports this one). The list has not changed since the app
// had a journey map.
const STAGES = ["new", "confirmed", "paid", "baking", "ready", "delivered"];
const PAID_STAGE = STAGES.indexOf("paid");

const firstOf = (g) => ((g && g.orders) || [])[0] || {};
const isWithin = (iso, from, to) => !!iso && iso >= from && iso <= to;

// What one customer order is worth: every row of its group, at the price it was sold
// at — so a price she changed on the order is the price counted here.
export function groupValue(state, group) {
  return (group.orders || []).reduce((sum, o) =>
    sum + (Number(o.qty) || 0) * (orderLinePrice(state, o) || 0), 0);
}

// Has the money actually been collected? Picking Paid in the dropdown only says the
// order has reached the paying stage: it stays uncollected until the Paid · Cash /
// Paid · TNG button is pressed (paidReceived). An order from before those flags
// existed has none, which reads as collected — the same rule the journey map has
// always used, so an old order does not suddenly look unpaid.
export function isCollected(group) {
  const first = firstOf(group);
  const at = STAGES.indexOf(String(first.status || "new"));
  return at >= PAID_STAGE && first.paidReceived !== false;
}

// "cash" | "tng" | "" — collected, but nobody wrote down how.
export function methodOf(group) {
  const m = String(firstOf(group).paidMethod || "");
  return m === "cash" || m === "tng" ? m : "";
}

// The day a customer order is for: the delivery date record while it exists, its own
// snapshot after the date was deleted.
export function deliveryOf(state, group) {
  const first = firstOf(group);
  if (first.deliveryDate) return String(first.deliveryDate);
  const rec = (state.deliveryDates || []).find((d) => d && d.id === first.deliveryDateId);
  return rec ? rec.date : "";
}

// The day the money landed, in HER day. paidAt is a full instant, so slicing the
// UTC string counts a payment taken at half past midnight as the day before — it is
// the local calendar day she reconciles against, so that is what is read off it.
export function paidOf(state, group) {
  const at = String(firstOf(group).paidAt || "");
  if (at) {
    const d = new Date(at);
    if (!Number.isNaN(d.getTime())) {
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${m}-${day}`;
    }
  }
  return deliveryOf(state, group);
}

function tally(state, groups) {
  const out = { cash: 0, tng: 0, unmarked: 0, toCollect: 0, toCollectCount: 0, count: 0 };
  for (const g of groups) {
    out.count++;
    const value = groupValue(state, g);
    if (!isCollected(g)) { out.toCollect += value; out.toCollectCount++; continue; }
    const method = methodOf(g);
    if (method === "cash") out.cash += value;
    else if (method === "tng") out.tng += value;
    else out.unmarked += value;
  }
  return out;
}

// One delivery day, as its own little till.
export function dayMoney(state, deliveryDateId) {
  const groups = groupOrders(state.orders || [])
    .filter((g) => firstOf(g).deliveryDateId === deliveryDateId);
  return tally(state, groups);
}

// What she spent in a stretch, and how she paid for it — the other half of the
// Money screen (16 Sep 2026). Every expense carries its own day, so this needs no
// fallback rule: an expense is recorded on the day it was paid, by definition.
export function expensesBetween(state, from, to) {
  const rows = (state.expenses || [])
    .filter((e) => e && e.date && isWithin(String(e.date), from, to))
    .sort((a, b) => String(b.date).localeCompare(String(a.date))); // newest first
  const out = { rows, cash: 0, tng: 0, unmarked: 0, total: 0 };
  for (const e of rows) {
    const amount = Number(e.amount) || 0;
    out.total += amount;
    if (e.method === "cash") out.cash += amount;
    else if (e.method === "tng") out.tng += amount;
    else out.unmarked += amount;
  }
  return out;
}

// A stretch of days, for the Money screen.
export function moneyBetween(state, fromISO, toISO) {
  const groups = groupOrders(state.orders || []).filter((g) => (isCollected(g)
    ? isWithin(paidOf(state, g), fromISO, toISO)
    : isWithin(deliveryOf(state, g), fromISO, toISO)));
  return tally(state, groups);
}
