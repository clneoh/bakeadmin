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

const { applyCourierCharge, courierFeeOf, courierPayerOf, courierCodOf, customerCourierFee, customerTotal } =
  await import("../admin/js/courier.js");
const { groupValue, journalFor, moneyBetween } = await import("../admin/js/money.js");
const { buildPaymentReminder, buildShippedMessage } = await import("../admin/js/messages.js");
const { buildConfirmation } = await import("../admin/js/confirm.js");
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
  assert.match(shipped.message, /Total: RM 38\.00/,
    "and ends on the same total the reminder quoted, so the two can never disagree");
});

// The confirmation is the message that FIRST asks for money, so a charge missing from
// its Total is the one the customer would pay against — every later message would then
// contradict it (19 Sep 2026).
test("the confirmation carries their charge, because it is the message that asks for money", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  st.orders[0].whatsapp = "60123456789";
  st.orders[0].fulfillment = "courier";
  const g = groupOf(st);

  const msg = buildConfirmation(st, g, "https://x/track").message;
  assert.match(msg, /Courier charge: RM 8\.00/, "named, not folded silently into the total");
  assert.match(msg, /Total: RM 38\.00/, "RM30 of bread plus the RM8 charge");
  assert.ok(msg.indexOf("Courier charge") < msg.indexOf("Total:"),
    "read before the total it is part of");
});

// "the message need to show the add up for rm72. And it should be the same for APP"
// (19 Sep 2026). Not just the charge named and the total correct — the customer has to
// be able to ADD IT UP from what the message says, on every message that quotes a
// total. So this reads the three figures back out of the message itself and does the
// arithmetic, rather than trusting any of them.
function addUpFrom(message) {
  const pick = (label) => {
    const m = message.match(new RegExp(`${label}: RM ([0-9.]+)`));
    assert.ok(m, `the message says what "${label}" is: ${JSON.stringify(message)}`);
    return Number(m[1]);
  };
  return { items: pick("Items total"), courier: pick("Courier charge"), total: pick("Total") };
}

test("every message that quotes a total shows the customer the sum that reaches it", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  st.orders[0].whatsapp = "60123456789";
  st.orders[0].fulfillment = "courier";
  const g = groupOf(st);

  const messages = {
    confirmation: buildConfirmation(st, g, "https://x/track").message,
    reminder: buildPaymentReminder(st, g, "https://x/track").message,
    shipped: buildShippedMessage(st, g, "https://x/track").message,
  };
  for (const [which, message] of Object.entries(messages)) {
    const { items, courier, total } = addUpFrom(message);
    assert.equal(items + courier, total,
      `the ${which} adds up: the bread plus the charge IS the total it asks for`);
    assert.equal(items, 30, `and the ${which} counts the bread at the price it was sold at`);
    assert.equal(courier, 8, `and the ${which} names the charge itself, so there is no mystery RM8`);
  }
});

test("a charge SHE bore never reaches the confirmation either", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "me";
  st.orders[0].whatsapp = "60123456789";
  const g = groupOf(st);

  const msg = buildConfirmation(st, g, "https://x/track").message;
  assert.match(msg, /Total: RM 30\.00/, "what they owe is the bread, and only the bread");
  assert.doesNotMatch(msg, /Courier charge/,
    "asking them for a charge she is absorbing would be taking money she is not owed");
});

test("an order with no charge confirms exactly as it did before this existed", () => {
  const st = state();
  st.orders[0].whatsapp = "60123456789";
  const g = groupOf(st);
  const plain = buildConfirmation(state({ orders: orders({ whatsapp: "60123456789" }) }),
    g, "https://x/track").message;
  assert.equal(buildConfirmation(st, g, "https://x/track").message, plain,
    "byte for byte — nothing about an order without a charge moved");
  assert.doesNotMatch(plain, /Courier charge/);
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
  assert.doesNotMatch(buildShippedMessage(st, g, "https://x/track").message, /Total:/,
    "and with no charge to explain, the shipped message is left exactly as it was");
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

// ── Courier COD: the charge the courier collects at the door ───────────────
//
// "courier charges can be collect, that means customer pay courier upon collect"
// (19 Sep 2026). Same charge, same customer bears it — settled differently. Every
// test here exists to catch ONE failure: the same RM8 being asked for twice, once
// by her TNG total and once by the courier at the door. So the total is the thing
// under watch, in all three messages, in the app's own figures and on the track
// card, not just in one of them.

const codOrder = (st) => {
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  st.orders[0].courierCod = true;
  st.orders[0].whatsapp = "60123456789";
  st.orders[0].fulfillment = "courier";
  return groupOf(st);
};

test("COD is read the house way — a lone flag on no charge is not COD", () => {
  assert.equal(courierCodOf({}), false, "no fields at all");
  assert.equal(courierCodOf({ courierCod: true }), false,
    "a flag with no amount or payer says nothing — reading it as COD would take a charge out of a total that never had one");
  assert.equal(courierCodOf({ courierFee: 8, courierCod: true }), false, "no payer recorded");
  assert.equal(courierCodOf({ courierFee: 8, courierPaidBy: "me", courierCod: true }), false,
    "a charge SHE paid has nothing for anyone to collect at the door");
  assert.equal(courierCodOf({ courierFee: 8, courierPaidBy: "customer" }), false,
    "absent means with the order — the behaviour every charge recorded before this existed already had");
  assert.equal(courierCodOf({ courierFee: 8, courierPaidBy: "customer", courierCod: "true" }), false,
    "only the boolean true counts; a truthy string is a stored accident, not a decision");
  assert.equal(courierCodOf({ courierFee: 8, courierPaidBy: "customer", courierCod: true }), true);
});

test("a COD charge is split OUT of the advance total, not folded into it", () => {
  const st = state();
  const parts = customerTotal(st, codOrder(st));
  assert.deepEqual(parts, { items: 30, courier: 0, cod: 8, total: 30 },
    "the charge is named in cod, and the total asks for the bread alone");
});

test("the same charge with the order still sits inside the total, exactly as before", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  assert.deepEqual(customerTotal(st, groupOf(st)), { items: 30, courier: 8, cod: 0, total: 38 },
    "only the mode moved — with the order, the charge is in the total it was always in");
});

test("COD stays out of the total in all three messages, and is named as COD in each", () => {
  const st = state();
  const g = codOrder(st);
  const messages = {
    confirmation: buildConfirmation(st, g, "https://x/track").message,
    reminder: buildPaymentReminder(st, g, "https://x/track").message,
    shipped: buildShippedMessage(st, g, "https://x/track").message,
  };
  for (const [which, message] of Object.entries(messages)) {
    assert.match(message, /Courier charge: RM 8\.00 - COD, pay the courier when your order reaches you/,
      `the ${which} says who is paid and when — COD on its own reads as paying for the goods`);
    const m = message.match(/Total: RM ([0-9.]+)/);
    assert.ok(m, `the ${which} still quotes a total`);
    assert.equal(Number(m[1]), 30,
      `the ${which} asks for the bread alone — RM38 here is the RM8 asked for twice`);
    assert.doesNotMatch(message, /Total: RM 38\.00/, `the ${which} must never quote the un-split figure`);
  }
});

test("the COD charge is still shown in full, so the customer can add up what they hand over", () => {
  const st = state();
  const g = codOrder(st);
  const message = buildConfirmation(st, g, "https://x/track").message;
  const items = Number(message.match(/Items total: RM ([0-9.]+)/)[1]);
  const cod = Number(message.match(/Courier charge: RM ([0-9.]+)/)[1]);
  const total = Number(message.match(/Total: RM ([0-9.]+)/)[1]);
  assert.equal(items, 30);
  assert.equal(cod, 8, "the RM8 is not hidden — it is re-labelled, not removed");
  assert.equal(total, items, "and the advance total is the items, which is what the reader can still check");
  assert.equal(items + cod, 38, "what changes hands altogether is still bread + charge, whoever is paid");
});

test("an advance charge and a no-charge order are byte-identical to what v127 produced", () => {
  const advance = state();
  advance.orders[0].courierFee = 8;
  advance.orders[0].courierPaidBy = "customer";
  advance.orders[0].whatsapp = "60123456789";
  advance.orders[0].fulfillment = "courier";
  const msg = buildPaymentReminder(advance, groupOf(advance), "https://x/track").message;
  assert.match(msg, /Items total: RM 30\.00\nCourier charge: RM 8\.00\nTotal: RM 38\.00\n/,
    "the v126 lines, in the v126 order, with the v126 figures — the split added no line and moved none");

  const none = state();
  none.orders[0].whatsapp = "60123456789";
  assert.doesNotMatch(buildPaymentReminder(none, groupOf(none), "https://x/track").message, /Items total/,
    "and an order with no charge is not given an add-up it has nothing to add");
});

test("neither mode moves her takings — a COD charge is pass-through like any other", () => {
  const st = state();
  const plain = { value: groupValue(st, groupOf(st)), money: moneyBetween(st, "2026-09-01", "2026-09-30") };
  const g = codOrder(st);

  assert.equal(groupValue(st, g), plain.value, "the order is worth exactly what it was before");
  assert.deepEqual(moneyBetween(st, "2026-09-01", "2026-09-30"), plain.money,
    "counting a charge the courier collects would show her money she never keeps");
});

test("the published snapshot carries the flag, keeps the charge out of the total, and still names it", () => {
  const st = state();
  const snap = trackingSnapshot(st, codOrder(st));
  assert.equal(snap.total, "RM 30.00", "the card quotes the same total the messages do");
  assert.equal(snap.courier_cod, true, "the flag the card reads to word the line as COD");
  assert.equal(snap.courier_fee, 8,
    "and the whole charge is still published, so the card can name the RM8 it is telling them not to pay her");
});

test("a charge with the order publishes no COD flag, so nothing already recorded changes", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  const snap = trackingSnapshot(st, groupOf(st));
  assert.equal(snap.total, "RM 38.00", "in the total, exactly as before this existed");
  assert.equal(snap.courier_cod, null, "null, and the card's courier line reads as it did before this column existed");
  assert.equal(snap.courier_fee, 8);
});
