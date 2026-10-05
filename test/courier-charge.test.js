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
const { todayISO } = await import("../admin/js/dates.js");

// One customer order of two Focaccia at RM15 — sold at a frozen price, the way a
// real order carries what it was sold for.
//
// `fulfillment: "courier"` is here because a charge only ever means anything on an order
// a courier is carrying (1 Oct 2026). Every fixture in this file is a delivery, and before
// v267 the file simply left the field off — which is exactly the shape that let a charge
// go on meaning something on an order that had stopped being a courier one.
const orders = (extra = {}) => ([
  { id: "ordabc123", groupId: "ordgabc123", deliveryDateId: "d18", deliveryDate: "2026-09-18",
    fulfillment: "courier",
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
  assert.equal(customerCourierFee({ courierFee: 8, courierPaidBy: "customer", fulfillment: "courier" }), 8);
  assert.equal(customerCourierFee({ courierFee: 8, courierPaidBy: "me", fulfillment: "courier" }), 0,
    "a charge she pays is her own cost and must never reach the customer's total");
  assert.equal(customerCourierFee({ courierFee: 8, fulfillment: "courier" }), 0,
    "no payer recorded, no charge to them");
});

// Her report on the morning of 1 Oct 2026, twice and in two places: "when i schange the
// courier delivery to self pickup, the courier chages tag still there" and "confirmation
// message still include courier charges".
//
// Switching an order to self collect does NOT clear the three keys — she may switch back,
// and re-typing a fee is not something an app should ask of her — so the charge outlives
// the fulfilment it was recorded for and every reader has to ask whether the order is
// still a courier one. Before v267 none of them did: the charge still came off the
// customer's total in the confirmation, in every later message and on the track card, and
// still wore a "Courier RM8.00 · customer" tag on a row that read "Self collect".
test("a charge on an order that is NOT going by courier is nothing, wherever it is read", () => {
  const parked = { courierFee: 8, courierPaidBy: "customer", fulfillment: "collect" };
  assert.equal(customerCourierFee(parked), 0, "not on the customer's total");
  assert.equal(customerCourierFee({ ...parked, courierCod: true }), 0,
    "and not COD money either — the charge's own COD flag is left alone on the order, but"
    + " there is no courier to collect it at the door, so none of it is asked for");
  assert.equal(customerCourierFee({ courierFee: 8, courierPaidBy: "customer" }), 0,
    "an order with no fulfillment at all reads as not a courier one — the same way its own"
    + " tag has always read it, so a charge and the tag beside it can never disagree");

  // The whole customer's total, and the three messages built off it, on a self-collect
  // order that still carries the charge it was sold with.
  const st = state();
  Object.assign(st.orders[0], { courierFee: 8, courierPaidBy: "customer", fulfillment: "collect" });
  const g = groupOf(st);
  assert.deepEqual(customerTotal(st, g), { items: 30, courier: 0, cod: 0, promo: 0, promoCode: "", notApplied: "", promoMinimum: 0, coupon: 0, couponId: "", couponCode: "", total: 30 },
    "the items alone — the courier is not carrying anything");
  assert.ok(!buildConfirmation(st, g, "https://x/track").message.includes("Courier charge"),
    "and the confirmation does not name a charge that is not being asked for");
  assert.ok(buildConfirmation(st, g, "https://x/track").message.includes("Items total: RM 30.00"),
    "the subtotal still prints — a plain order reads Items total then Total, two lines that agree");

  // Her books agree with the customer's: nothing still to collect for a charge nobody is
  // collecting. An order that was never a courier one is untouched either way.
  assert.equal(st.orders[0].courierFee, 8, "the keys are NOT cleared — the record survives the switch");
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
  assert.equal(st.expenses[0].date, todayISO(), "dated the day the money left, whichever day that is");

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

  // The row is stamped with the day the money left, which is TODAY — so the stretch is read
  // back off the same clock rather than written down. A hard-coded month (2026-09-01…30)
  // went stale on 1 Oct 2026 and then read as the app having lost the expense.
  const day = todayISO();
  const j = journalFor(st, "Cash", day, day);
  const line = j.rows.find((r) => r.dir === "out" && r.amount === 8);
  assert.ok(line, "the charge shows as money out of the Cash book");
  assert.equal(line.what, `Courier (order #${code})`,
    "named as the order it belongs to, so a figure she cannot place is still openable");
});

// ── the customer's messages ────────────────────────────────────────────────
// The whole money block, exactly as it must reach the customer (v199, 25 Sep 2026): the
// subtotal, the charge when there is one, a BLANK LINE, then the total inside the single
// asterisks WhatsApp renders as bold.
//
// Written out and matched WHOLE, not line by line, and that is the point of it. A message
// carrying "*Total: RM 38.00*" still contains "Total: RM 38.00", so a loose assertion goes
// on passing after the bold and the blank line have both been quietly dropped — it would
// only have proved the figures were somewhere in there. This proves the shape.
const money = (items, total, charge) =>
  `Items total: RM ${items}\n${charge ? `Courier charge: RM ${charge}\n` : ""}\n*Total: RM ${total}*\n`;

test("the customer's total carries their courier charge, and says so", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  st.orders[0].whatsapp = "60123456789";
  st.orders[0].fulfillment = "courier";
  const g = groupOf(st);

  const reminder = buildPaymentReminder(st, g, "https://x/track");
  assert.match(reminder.message, /Items: Focaccia x2/);
  assert.ok(reminder.message.includes(money("30.00", "38.00", "8.00")),
    `the reminder adds the RM8 up to the RM38 it asks for: ${JSON.stringify(reminder.message)}`);
  assert.ok(reminder.message.indexOf("Courier charge") < reminder.message.indexOf("Total:"),
    "the charge is read before the total it is part of");

  const shipped = buildShippedMessage(st, g, "https://x/track");
  assert.ok(shipped.message.includes(money("30.00", "38.00", "8.00")),
    "and the shipped message ends on the same total the reminder quoted, so the two can never disagree");
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
  assert.ok(msg.includes(money("30.00", "38.00", "8.00")),
    `the charge is named, not folded silently into the total: ${JSON.stringify(msg)}`);
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
  assert.ok(msg.includes(money("30.00", "30.00")),
    `what they owe is the bread, and only the bread: ${JSON.stringify(msg)}`);
  assert.doesNotMatch(msg, /Courier charge/,
    "asking them for a charge she is absorbing would be taking money she is not owed");
});

test("an order with no charge confirms with the same money block as any other", () => {
  const st = state();
  st.orders[0].whatsapp = "60123456789";
  const g = groupOf(st);
  const plain = buildConfirmation(state({ orders: orders({ whatsapp: "60123456789" }) }),
    g, "https://x/track").message;
  assert.equal(buildConfirmation(st, g, "https://x/track").message, plain,
    "byte for byte — an order with no charge is the same order whatever else was recorded");
  assert.ok(plain.includes(money("30.00", "30.00")),
    `and its total stands under a subtotal rather than alone (v199): ${JSON.stringify(plain)}`);
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
  assert.ok(reminder.message.includes(money("30.00", "30.00")),
    `what they owe is the bread, and only the bread: ${JSON.stringify(reminder.message)}`);
  assert.doesNotMatch(reminder.message, /Courier charge/,
    "she is absorbing it — telling the customer about it would ask them for money they do not owe");
  const shipped = buildShippedMessage(st, g, "https://x/track").message;
  assert.doesNotMatch(shipped, /Courier charge/);
  // Reversed at v199 (25 Sep 2026): the shipped message used to leave the total out
  // entirely when there was no charge to explain, so a courier order the customer paid
  // nothing extra for carried no total at all while the reminder for the same order
  // carried one. Every message that names money now names the sum the same way.
  assert.ok(shipped.includes(money("30.00", "30.00")),
    `and it quotes the same total the reminder did: ${JSON.stringify(shipped)}`);
});

test("no charge at all leaves the figures untouched, and gives the total a subtotal", () => {
  const st = state();
  st.orders[0].whatsapp = "60123456789";
  const g = groupOf(st);
  const reminder = buildPaymentReminder(st, g, "https://x/track").message;
  assert.ok(reminder.includes(money("30.00", "30.00")));
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
  assert.equal(courierCodOf({ courierFee: 8, courierPaidBy: "customer", courierCod: true, fulfillment: "courier" }), true);
  assert.equal(courierCodOf({ courierFee: 8, courierPaidBy: "customer", courierCod: true, fulfillment: "collect" }), true,
    "and the charge's OWN settlement is still COD on a self collect — this reads the charge,"
    + " not the order. It is customerCourierFee that asks whether a courier is carrying it, and"
    + " a gate here instead would make the Edit form's COD box read off and delete the tick on"
    + " the next Save, losing a record it had no reason to touch (1 Oct 2026)");
});

test("a COD charge is split OUT of the advance total, not folded into it", () => {
  const st = state();
  const parts = customerTotal(st, codOrder(st));
  assert.deepEqual(parts, { items: 30, courier: 0, cod: 8, promo: 0, promoCode: "", notApplied: "", promoMinimum: 0, coupon: 0, couponId: "", couponCode: "", total: 30 },
    "the charge is named in cod, and the total asks for the bread alone");
});

test("the same charge with the order still sits inside the total, exactly as before", () => {
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  assert.deepEqual(customerTotal(st, groupOf(st)), { items: 30, courier: 8, cod: 0, promo: 0, promoCode: "", notApplied: "", promoMinimum: 0, coupon: 0, couponId: "", couponCode: "", total: 38 },
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

test("an advance charge and a no-charge order both read their figures in one order", () => {
  const advance = state();
  advance.orders[0].courierFee = 8;
  advance.orders[0].courierPaidBy = "customer";
  advance.orders[0].whatsapp = "60123456789";
  advance.orders[0].fulfillment = "courier";
  const msg = buildPaymentReminder(advance, groupOf(advance), "https://x/track").message;
  assert.ok(msg.includes(money("30.00", "38.00", "8.00")),
    `the v126 lines, in the v126 order, with the v126 figures: ${JSON.stringify(msg)}`);

  // Reversed at v199 (25 Sep 2026). The subtotal used to be drawn only for an order that
  // carried a charge, so a plain order went from the items straight to the total and the
  // figure had nothing above it to be checked against. Her report, in her words: the
  // message has to show how the total adds up.
  const none = state();
  none.orders[0].whatsapp = "60123456789";
  const plain = buildPaymentReminder(none, groupOf(none), "https://x/track").message;
  assert.ok(plain.includes(money("30.00", "30.00")),
    `an order with no charge still shows the subtotal its total comes from: ${JSON.stringify(plain)}`);
  assert.doesNotMatch(plain, /Courier charge/, "and is given no charge to explain");
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

// ── what the trip cost, against what she charged (v235, 29 Sep 2026) ───────
//
// A charge is a price she DECIDED; a booked trip is what the journey really cost. Her ask
// was to see BOTH directions rather than only the alarming one — "real costing make aware,
// good for future promotion room if possible, i can even opt not to collect delivery" — so
// the tests below pin the sign as hard as the arithmetic. A difference is only useful if it
// says which way it fell, and a line that read "RM 5.50 different" would be worse than none.
//
// The three things most likely to be quietly wrong, and each has a test:
//   • the SUM, not the first row — a value set is one charge over several orders;
//   • the payer changes the SENTENCE and not the number;
//   • nothing is said when there is nothing to say, rather than "RM 0.00 different".
const { feeGapOf, feeGapLine } = await import("../admin/js/courier.js");

const trip = (amount, currency = "MYR") => ({ jobId: "J1", provider: "lalamove", amount, currency });

test("the trip costing more than she charged reads as short, and names whose pocket it came from", () => {
  const charged = orders({ courierFee: 25.5, courierPaidBy: "customer" });
  const gap = feeGapOf(charged, trip(31));
  assert.deepEqual(gap, { charged: 25.5, cost: 31, diff: -5.5, payer: "customer" },
    "the difference is SIGNED: the trip cost more, so it is negative");
  assert.equal(feeGapLine(charged, trip(31), "RM"),
    "The customer is charged RM 25.50 and the trip cost RM 31.00 — RM 5.50 short, so that much came out of your own pocket.");
});

test("the trip costing less reads as money that stayed with her, not as an error", () => {
  const charged = orders({ courierFee: 25.5, courierPaidBy: "customer" });
  const gap = feeGapOf(charged, trip(20));
  assert.equal(gap.diff, 5.5, "the other direction, and still the trip's own cost that is being compared");
  assert.equal(feeGapLine(charged, trip(20), "RM"),
    "The customer is charged RM 25.50 and the trip cost RM 20.00 — RM 5.50 under, and that difference stayed with you.");
});

test("a charge she bears is measured against what she allowed for, because the money never came in", () => {
  const mine = orders({ courierFee: 25.5, courierPaidBy: "me" });
  assert.equal(feeGapLine(mine, trip(31), "RM"),
    "You recorded RM 25.50 as your own cost, and the trip cost RM 31.00 — RM 5.50 more than you had allowed for.");
  assert.equal(feeGapLine(mine, trip(20), "RM"),
    "You recorded RM 25.50 as your own cost, and the trip cost RM 20.00 — RM 5.50 less than you had allowed for.");
});

test("a trip with no charge on the order says so, because that is the free-delivery case she named", () => {
  const free = orders({});
  assert.deepEqual(feeGapOf(free, trip(31)), { charged: 0, cost: 31, diff: -31, payer: "" });
  assert.equal(feeGapLine(free, trip(31), "RM"),
    "No courier charge is on the order, so the whole RM 31.00 of this trip is your own cost.");
});

test("a charge that matches the trip exactly says nothing at all", () => {
  const even = orders({ courierFee: 31, courierPaidBy: "customer" });
  assert.equal(feeGapOf(even, trip(31)).diff, 0, "the arithmetic still reads it, so a caller can still ask");
  assert.equal(feeGapLine(even, trip(31), "RM"), "",
    "but the card draws no line: a difference of nothing is not a difference");
});

test("a trip that never gave a price is not reported on", () => {
  const charged = orders({ courierFee: 25.5, courierPaidBy: "customer" });
  for (const nothing of [undefined, null, {}, trip(""), trip(null), trip("abc"), trip(0)]) {
    assert.equal(feeGapOf(charged, nothing), null, `no readable price in ${JSON.stringify(nothing)}`);
    assert.equal(feeGapLine(charged, nothing, "RM"), "", "and therefore no sentence built from it");
  }
  // `null`, `""` and `0` are the ones that matter: all three are a FINITE zero to `Number()`,
  // so a guard written as ">= 0" would have taken a job with no amount for a free trip and
  // put "the trip cost RM 0.00" on her card. A price has to be a positive number to be read.
  assert.equal(feeGapOf([], trip(31)), null, "no orders riding the trip is nothing to compare either");
});

test("every order riding the trip is counted, so a value set's single charge is not read three times", () => {
  // The same charge over three rows is ONE charge. Reading list[0] would have been right here
  // by accident; the trap is the opposite shape — a set whose rows each carry a share.
  //
  // Both rows say `fulfillment: "courier"` because a charge only counts on an order that is
  // actually being sent (v268 — see the gate's own test below). A trip is booked for an
  // order that goes by courier, so a fixture without it is not a shape this screen can meet.
  const row = (courierFee) => ({ courierFee, courierPaidBy: "me", fulfillment: "courier" });
  const set = [row(4.66), row(4.66), row(4.68)];
  assert.equal(feeGapOf(set, trip(14)).charged, 14, "the parts sum to the charge, the way splitEven wrote them");
  assert.equal(feeGapLine(set, trip(14), "RM"), "", "and summing them exactly is what makes this line silent");
  assert.equal(feeGapOf([{ courierFee: 8, courierPaidBy: "customer", fulfillment: "courier" }], trip(14)).diff, -6,
    "four rows left empty would otherwise read as a charge of zero");
});

test("the money is rounded to cents, so float dust never reaches her screen", () => {
  const ugly = [
    { courierFee: 8.1, courierPaidBy: "me", fulfillment: "courier" },
    { courierFee: 8.2, courierPaidBy: "me", fulfillment: "courier" },
  ];
  assert.equal(feeGapOf(ugly, trip(10.1)).charged, 16.3, "16.299999999999997 is not a number she has ever seen");
  assert.equal(feeGapLine(ugly, trip(16.3), "RM"), "", "and rounding it is what keeps a zero difference silent");
});

// ── v268: a charge parked on a self-collect order is not money anyone is paying ──
// Switching an order to Self collect deliberately KEEPS its three charge keys, because she
// may switch back without retyping them (v267). Every reader therefore has to ask whether the
// order is actually going by courier. This one did not, so the booked-trip card read "The
// customer is charged RM 8.00" about an order nobody was sending — a figure telling her money
// was coming in that was not.
test("a charge parked on a self-collect order is not counted against the trip", () => {
  const parked = [{ courierFee: 8, courierPaidBy: "customer" }]; // no fulfillment: collect
  const gap = feeGapOf(parked, trip(14));
  assert.deepEqual(gap, { charged: 0, cost: 14, diff: -14, payer: "customer" },
    "the parked charge is not counted, so the whole trip reads as her own cost");
  // The line still speaks, because a trip she booked with nothing charged on it IS the
  // free-delivery case it exists to name — what changes is that it no longer claims the
  // customer is being charged.
  assert.equal(feeGapLine(parked, trip(14), "RM"),
    "No courier charge is on the order, so the whole RM 14.00 of this trip is your own cost.",
    "and the sentence is about her own cost, never about money the customer owes");

  // The counterfactual, in one line: the SAME charge on the SAME amount, once the order is
  // really being sent, is counted again.
  const sent = [{ courierFee: 8, courierPaidBy: "customer", fulfillment: "courier" }];
  assert.equal(feeGapOf(sent, trip(8)).charged, 8, "a courier order's charge counts exactly as before");
  assert.equal(feeGapLine(sent, trip(8), "RM"), "", "so a trip priced to match it stays silent");
});
