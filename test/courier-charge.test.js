// test/courier-charge.test.js — the courier's charge, and who bore it (v124,
// 19 Sep 2026).
//
// The whole feature turns on one split, and it is hers: "off profit only if I paid
// it". A charge the CUSTOMER bears is a pass-through — it arrives and leaves her
// purse in the same breath, so her books must not see either side of it — while a
// charge SHE bears is a real cost that lands as an ordinary Delivery & fuel expense
// row. These tests pin both halves, and the thing they most need to catch is the
// customer's charge leaking into her takings (or her cost leaking onto the
// customer's total), because either one silently breaks her reconciliation.
//
// Pure throughout: state.js, money.js, messages.js and supabase.js are all
// side-effect free under Node, so there is no DOM and no fetch here.

import { test } from "node:test";
import assert from "node:assert/strict";

const { applyCourierCharge, courierFeeOf, courierPayerOf, customerCourierFee } =
  await import("../admin/js/courier.js");
const { groupValue, journalFor, moneyBetween } = await import("../admin/js/money.js");
const { buildPaymentReminder, buildShippedMessage } = await import("../admin/js/messages.js");
const { trackingSnapshot } = await import("../admin/js/supabase.js");

// One customer order of two Focaccia at RM15 — sold at a frozen price, the way a
// real order carries what it was sold for.
const orders = (extra = {}) => ([
  { id: "ordabc123", groupId: "ordgabc123", deliveryDateId: "d18", deliveryDate: "2026-09-18",
    productId: "p1", qty: 2, productName: "Focaccia", unitPrice: 15, status: "ready", ...extra },
]);

function state(extra = {}) {
  return {
    settings: { currency: "RM" },
    products: [{ id: "p1", name: "Focaccia", price: 15 }],
    deliveryDates: [{ id: "d18", date: "2026-09-18" }],
    orders: orders(),
    expenses: [],
    ...extra,
  };
}
const groupOf = (st) => ({ orders: st.orders });
const code = "ABC123"; // orderCode() strips the id to its last six hex characters

// ── reading the two fields ─────────────────────────────────────────────────
test("the charge and its payer are read the house way — absent means not recorded", () => {
  assert.equal(courierFeeOf({}), 0, "no field at all");
  assert.equal(courierFeeOf({ courierFee: "" }), 0, "a cleared box is no charge, not a broken number");
  assert.equal(courierFeeOf({ courierFee: 0 }), 0, "and zero is the same as nothing");
  assert.equal(courierFeeOf({ courierFee: "8.50" }), 8.5, "a typed number counts");
  assert.equal(courierPayerOf({}), "", "nobody recorded");
  assert.equal(courierPayerOf({ courierPaidBy: "nonsense" }), "", "an unknown payer reads as not recorded");
  assert.equal(courierPayerOf({ courierPaidBy: "me" }), "me");
  assert.equal(courierPayerOf({ courierPaidBy: "customer" }), "customer");
});

test("what the customer owes on top of the items — nothing unless they bear it", () => {
  assert.equal(customerCourierFee({ courierFee: 8, courierPaidBy: "customer" }), 8);
  assert.equal(customerCourierFee({ courierFee: 8, courierPaidBy: "me" }), 0,
    "a charge she pays is her own cost and must never reach the customer's total");
  assert.equal(customerCourierFee({ courierFee: 8 }), 0, "no payer recorded, no charge to them");
});

// ── the expense row ────────────────────────────────────────────────────────
test("a charge she bore becomes one Delivery & fuel expense, and saving twice updates it", () => {
  const st = state();
  const g = groupOf(st);

  assert.equal(applyCourierCharge(st, g, 8, "me", "Cash"), "created");
  assert.equal(st.expenses.length, 1, "one row, not none");
  assert.equal(st.expenses[0].amount, 8);
  assert.equal(st.expenses[0].category, "Delivery & fuel", "her own category, in her own words");
  assert.equal(st.expenses[0].method, "Cash", "and it lands in a real book on the Money screen");
  assert.equal(st.expenses[0].courierFor, code, "linked back to the order it belongs to");
  assert.equal(st.expenses[0].date, "2026-09-19", "dated the day the money left");

  // She corrects the amount a week later. One row, corrected — never a second row,
  // which is the failure a plain "push a new expense" would have shipped.
  const id = st.expenses[0].id;
  const day = st.expenses[0].date;
  assert.equal(applyCourierCharge(st, g, 12, "me", "TNG"), "updated");
  assert.equal(st.expenses.length, 1, "still exactly one row for this order");
  assert.equal(st.expenses[0].id, id, "the same row, so anything already filed against it stays filed");
  assert.equal(st.expenses[0].amount, 12);
  assert.equal(st.expenses[0].method, "TNG", "and it moved book with her correction");
  assert.equal(st.expenses[0].date, day, "the day the money left does not move to the day she corrected it");
});

test("the customer bearing it takes the expense back out — and leaves nothing behind", () => {
  const st = state();
  const g = groupOf(st);
  applyCourierCharge(st, g, 8, "me", "Cash");

  assert.equal(applyCourierCharge(st, g, 8, "customer", "Cash"), "removed",
    "flipping the payer flips the bookkeeping with it");
  assert.equal(st.expenses.length, 0, "her cost is gone, because it is not her cost any more");

  assert.equal(applyCourierCharge(st, g, 0, "", "Cash"), "none",
    "and clearing a charge that was never recorded writes nothing at all");
  assert.equal(st.expenses.length, 0);
});

test("a cleared amount takes the expense out, whatever the payer still says", () => {
  const st = state();
  const g = groupOf(st);
  applyCourierCharge(st, g, 8, "me", "Cash");
  assert.equal(applyCourierCharge(st, g, 0, "me", "Cash"), "removed");
  assert.equal(st.expenses.length, 0);
});

test("a blank method still files the spend somewhere real", () => {
  // The Money screen buckets every spend by how it moved, so a row with no method
  // would sit in no column at all — visible in the profit figure and in no book.
  const st = state();
  applyCourierCharge(st, groupOf(st), 8, "me", "");
  assert.equal(st.expenses[0].method, "Cash", "rather than a blank the journals cannot place");
});

test("two different orders each get their own row", () => {
  const st = state();
  const a = groupOf(st);
  const b = { orders: [{ ...st.orders[0], id: "orddef456", groupId: "ordgdef456" }] };
  applyCourierCharge(st, a, 8, "me", "Cash");
  applyCourierCharge(st, b, 5, "me", "Cash");
  assert.equal(st.expenses.length, 2, "the link is per order, not per baker");
  assert.deepEqual(st.expenses.map((e) => e.courierFor).sort(), ["ABC123", "DEF456"]);
});

// ── her books ──────────────────────────────────────────────────────────────
test("a charge the customer bears never touches her takings", () => {
  const st = state();
  const g = groupOf(st);
  const before = { value: groupValue(st, g), money: moneyBetween(st, "2026-09-01", "2026-09-30") };

  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";

  assert.equal(groupValue(st, g), before.value, "the order is worth exactly what it was before");
  assert.deepEqual(moneyBetween(st, "2026-09-01", "2026-09-30"), before.money,
    "and not one figure on the Money screen moves — the charge arrives and leaves in the same breath");
});

test("a charge she bears comes off the money she has out, under its own name", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "me";
  applyCourierCharge(st, groupOf(st), 8, "me", "Cash");

  const j = journalFor(st, "Cash", "2026-09-01", "2026-09-30");
  const line = j.rows.find((r) => r.dir === "out" && r.amount === 8);
  assert.ok(line, "the charge shows as money out of the Cash book");
  assert.equal(line.what, `Courier (order #${code})`,
    "named as the order it belongs to, so a figure she cannot place is still openable");
});

// ── the customer's messages ────────────────────────────────────────────────
test("the customer's total carries their courier charge, and says so", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  st.orders[0].whatsapp = "60123456789";
  st.orders[0].fulfillment = "courier";
  const g = groupOf(st);

  const reminder = buildPaymentReminder(st, g, "https://x/track");
  assert.match(reminder.message, /Items: Focaccia x2/);
  assert.match(reminder.message, /Courier charge: RM 8\.00/,
    "named above the total, not left to be discovered inside it");
  assert.match(reminder.message, /Total: RM 38\.00/, "RM30 of bread plus the RM8 charge");
  assert.ok(reminder.message.indexOf("Courier charge") < reminder.message.indexOf("Total:"),
    "the charge is read before the total it is part of");

  const shipped = buildShippedMessage(st, g, "https://x/track");
  assert.match(shipped.message, /Courier charge: RM 8\.00/, "and the shipped message carries it too");
});

test("a charge SHE bore is absent from the customer's total, and from what they are told", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "me";
  st.orders[0].whatsapp = "60123456789";
  st.orders[0].trackingNo = "JT123";
  const g = groupOf(st);

  const reminder = buildPaymentReminder(st, g, "https://x/track");
  assert.match(reminder.message, /Total: RM 30\.00/, "what they owe is the bread, and only the bread");
  assert.doesNotMatch(reminder.message, /Courier charge/,
    "she is absorbing it — telling the customer about it would ask them for money they do not owe");
  assert.doesNotMatch(buildShippedMessage(st, g, "https://x/track").message, /Courier charge/);
});

test("no charge at all leaves every message exactly as it was", () => {
  const st = state();
  st.orders[0].whatsapp = "60123456789";
  const g = groupOf(st);
  const reminder = buildPaymentReminder(st, g, "https://x/track").message;
  assert.match(reminder, /Total: RM 30\.00/);
  assert.doesNotMatch(reminder, /Courier charge/);
  assert.equal(reminder, buildPaymentReminder(state({ orders: orders({ whatsapp: "60123456789" }) }),
    g, "https://x/track").message, "byte for byte the same as an order this feature never touched");
});

// ── the customer's track card ──────────────────────────────────────────────
test("the published snapshot adds their charge to the total and names it", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  const snap = trackingSnapshot(st, groupOf(st));
  assert.equal(snap.total, "RM 38.00", "the same number their messages quote");
  assert.equal(snap.courier_fee, 8, "published by name, so the card can draw the line");
});

test("a charge she bore is not published to the customer at all", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "me";
  const snap = trackingSnapshot(st, groupOf(st));
  assert.equal(snap.total, "RM 30.00");
  assert.equal(snap.courier_fee, null, "null, and the card leaves the line out rather than printing it empty");
});
