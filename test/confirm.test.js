// test/confirm.test.js — the WhatsApp confirmation the baker sends
// when confirming an order. Pure module, no DOM shim needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConfirmation } from "../admin/js/confirm.js";

function state(overrides = {}) {
  return {
    settings: { currency: "RM", storefront: { name: "Jienluv2bake", whatsapp: "60123456789", tngQr: "https://img/tng.png" } },
    products: [{ id: "p1", name: "Focaccia", price: 15 }, { id: "p2", name: "Sandwich", price: 8 }],
    deliveryDates: [{ id: "d1", date: "2026-09-07" }],
    ...overrides,
  };
}

// The money block as the customer receives it (v199, 25 Sep 2026): the subtotal, a blank
// line, then the total inside the single asterisks WhatsApp renders as bold. Two bread at
// RM15, self collect, so there is no charge to name.
//
// Matched WHOLE rather than searched for, and that matters here: "*Total: RM 30.00*" still
// contains "Total: RM 30.00", so a plain `includes("Total: RM 30.00")` would go on passing
// with both the blank line and the bold quietly gone.
const MONEY = "Items total: RM 30.00\n\n*Total: RM 30.00*\n";

test("buildConfirmation shows the TNG QR and asks for the receipt in the same chat", () => {
  const group = { orders: [{
    id: "ord_ab12cd34ef56", groupId: "ordg_112233445566",
    deliveryDateId: "d1", fulfillment: "collect",
    whatsapp: "+60 12-345 6789", customerName: "Aunty Bee",
    productId: "p1", qty: 2,
  }] };
  const built = buildConfirmation(state(), group, "https://bake.app/store/?track=445566");
  assert.equal(built.recipient, "60123456789", "wa.me digits, no + / spaces");
  assert.ok(built.message.includes("Order #445566"), "order code");
  assert.ok(built.message.includes("Delivery: Mon, 7 Sep - Self collect"), "date + fulfillment");
  assert.ok(built.message.includes("Items: Focaccia x2"), "items, plain ASCII x");
  assert.ok(built.message.includes(MONEY), "the total stands under the subtotal it comes from");
  assert.ok(built.message.includes("Pay by TNG using the QR below:"),
    "asks for payment by TNG QR");
  assert.ok(built.message.includes("\nhttps://img/tng.png\n"),
    "the published QR image URL sits on its own line so WhatsApp renders it as one picture");
  assert.ok(built.message.indexOf("https://img/tng.png") < built.message.indexOf("Track your order"),
    "the QR image URL is the message's first link, so WhatsApp renders it as a picture rather than the track page");
  assert.ok(!built.message.includes("wa.me"),
    "no tap-through receipt deep link — staying in the chat is what stops the jump-away truncation");
  assert.ok(built.message.includes("put your phone number (60123456789) in the payment description"),
    "reminds the customer to use their number as the TNG description");
  assert.ok(built.message.includes("send your TNG receipt screenshot here"),
    "asks the customer to attach the receipt in this same chat");
  assert.ok(built.message.includes("Track your order: https://bake.app/store/?track=445566"),
    "the track link stays in the message, after the QR");
  // Plain ASCII end to end — nothing that can corrupt into a broken glyph. The asterisks
  // around the total are covered by this too, and that is the point of testing it here:
  // the bold pair is chosen BECAUSE it is ordinary ASCII, so unlike an emoji it cannot
  // come back on some phones as an empty box.
  const nonAscii = [...built.message].filter((ch) => ch.codePointAt(0) > 0x7f);
  assert.deepEqual(nonAscii, [], "message contains only ASCII characters");
});

test("the total is set off and bold even when there is no charge to explain", () => {
  const group = { orders: [{
    id: "ord_ab12cd34ef56", deliveryDateId: "d1", fulfillment: "collect",
    whatsapp: "60123456789", customerName: "Bee", productId: "p1", qty: 2,
  }] };
  const msg = buildConfirmation(state(), group, "https://bake.app/store/?track=34ef56").message;
  assert.ok(msg.includes(MONEY),
    `the subtotal, a blank line, then the bold total: ${JSON.stringify(msg)}`);
  assert.ok(!msg.includes("Courier charge"),
    "and nothing is invented to sit between them on an order that has no charge");
  assert.ok(msg.indexOf("Items total") < msg.indexOf("*Total:"),
    "the workings are read before the figure they reach");
});

test("the description reminder has no dangling number when the order has none", () => {
  const group = { orders: [{
    id: "ord_ab12cd34ef56", deliveryDateId: "d1", fulfillment: "collect",
    whatsapp: "", customerName: "Bee", productId: "p1", qty: 1,
  }] };
  const built = buildConfirmation(state(), group, "https://bake.app/store/?track=34ef56");
  assert.ok(built.message.includes("put your phone number in the payment description"));
  assert.ok(!built.message.includes("()"), "no empty parentheses");
});

test("courier orders include the delivery address", () => {
  const group = { orders: [{
    id: "ord_ab12cd34ef56", groupId: "ordg_112233445566",
    deliveryDateId: "d1", fulfillment: "courier", address: "12 Jalan Bunga",
    whatsapp: "60123456789", productId: "p2", qty: 1,
  }] };
  const built = buildConfirmation(state(), group, "https://bake.app/store/?track=445566");
  assert.ok(built.message.includes("Courier delivery"));
  assert.ok(built.message.includes("Address: 12 Jalan Bunga"));
});

test("without a published QR the pay line still appears but no image URL", () => {
  const s = state({ settings: { currency: "RM", storefront: { name: "Jienluv2bake", tngQr: "" } } });
  const group = { orders: [{
    id: "ord_ab12cd34ef56", deliveryDateId: "d1", fulfillment: "collect",
    whatsapp: "60123456789", customerName: "Bee", productId: "p1", qty: 1,
  }] };
  const built = buildConfirmation(s, group, "https://bake.app/store/?track=34ef56");
  assert.ok(built.message.includes("Pay by TNG using the QR below:"));
  assert.ok(!built.message.includes("https://img/tng.png"));
});

test("empty group returns null", () => {
  assert.equal(buildConfirmation(state(), { orders: [] }, "https://bake.app/store/?track=x"), null);
});

// ── v304: what a customer collecting at a Point is told ─────────────────────
// v299 made the confirmation and all four messages name the Point, and it was only ever tested
// through `fulfillmentText` — the helper — rather than through the builders a customer actually
// receives. This drives the real confirmation for a Point order, and pins the three things the
// discussion said the customer must be told: WHERE, the ADDRESS, and WHEN.
//
// Her choice for the window (2026-10-04, from three offered): it belongs to the PLACE, typed
// once on the Point — never the van's arrival window, which is when the bread gets there.

const FARLIM = {
  id: "pt_farlim", name: "Farlim, Air Itam", address: "Lebuhraya Thean Teik, 11500 Air Itam",
  receiver: "Aunty Lim", phone: "60123456789", feeRM: 0.5, paused: false,
  createdAt: "2026-08-12T00:00:00.000Z", collectWindow: "14:00-18:00",
  place: { lat: 5.4, lng: 100.28, label: "Farlim" },
};
const atPoint = (extra = {}) => ({ orders: [{
  id: "ord_ab12cd34ef56", groupId: "ordg_112233445566",
  deliveryDateId: "d1", fulfillment: "collect", pointId: "pt_farlim", pointName: "Farlim, Air Itam",
  whatsapp: "+60 12-345 6789", customerName: "Aunty Bee",
  productId: "p1", qty: 2,
  // The run that takes the bread to the Point stamps its own arrival window on the order (v302).
  // The customer must not be told it — it is when the van gets there, not when they can collect.
  deliveryWindow: "10:00-12:00",
  ...extra,
} ] });

test("a customer collecting at a Point is told the place, the address AND when (v304)", () => {
  const built = buildConfirmation(state({ points: [FARLIM] }), atPoint(), "");
  assert.ok(built.message.includes("Self collect at Farlim, Air Itam"), "WHERE — named");
  assert.ok(built.message.includes("Where: Lebuhraya Thean Teik, 11500 Air Itam"), "and the address");
  assert.ok(built.message.includes("collect 2-6 pm"), "and WHEN — the place's own hours");
  assert.ok(!built.message.includes("10-12"), "never the van's arrival window");
});

test("★★ the address switch does NOT silence the confirmation (v410)", () => {
  // ⚠️⚠️ THIS IS A DECISION, NOT AN OMISSION, AND IT IS WORTH A TEST BECAUSE THE TEMPTING CHANGE
  // IS THE WRONG ONE. v410 gave each Point a switch, "Show this address on the shop" — and the
  // obvious reading of "hidden" is that no customer should ever be handed it. **They must.**
  //
  // ⭐ A customer who has PAID has to be told where to walk or the order is uncollectable, and the
  // two surfaces are not the same kind of thing: the shop is a public page with no login that
  // anyone can read, and this is a private message to one person who has already chosen. So the
  // switch governs the public page only, and suppressing this line would strand somebody.
  //
  // ⚠️ If a future change DOES want the switch to reach here, it has to delete this test on
  // purpose — which is the point of writing it down.
  const hidden = { ...FARLIM, showAddress: false };
  const built = buildConfirmation(state({ points: [hidden] }), atPoint(), "");
  assert.ok(built.message.includes("Where: Lebuhraya Thean Teik, 11500 Air Itam"),
    "the confirmation still says where to collect, switch or no switch");
  assert.ok(built.message.includes("Self collect at Farlim, Air Itam"), "and still names the place");
});

test("a Point with no hours set promises the day and says nothing about a time (v304)", () => {
  const noHours = { ...FARLIM, collectWindow: "" };
  const built = buildConfirmation(state({ points: [noHours] }), atPoint(), "");
  assert.ok(built.message.includes("Self collect at Farlim, Air Itam"), "still told where to go");
  assert.ok(!/collect \d/.test(built.message), "and nothing about a time");
  assert.ok(!built.message.includes("10-12"), "nor the van's window, even though the order carries one");
});

test("a courier order at this stage is unchanged — its van is booked later (v304)", () => {
  // The window rides the day's own words, so the confirmation gains nothing for a courier order
  // that has no trip yet. If this ever gains a time, something has started promising the van
  // before it was booked.
  const group = { orders: [{ id: "ord_aa11bb22cc33", groupId: "ordg_99", deliveryDateId: "d1",
    fulfillment: "courier", whatsapp: "+60 12-345 6789", customerName: "Bala",
    address: "9 Jalan B", productId: "p1", qty: 1 }] };
  const built = buildConfirmation(state(), group, "");
  // ⚠️ AND IT IS LABELLED THE BAKE DAY (v337), not a delivery: a courier order is baked on this
  // day and delivered when the van goes, which may be the next morning. Her report — a Wednesday
  // bake with a Thursday-morning van "asking whether the delivery date is wed or thurday".
  const line = built.message.split("\n").find((l) => l.startsWith("Baking day:"));
  assert.ok(line.includes("Baking day: Mon, 7 Sep - Courier delivery"), `read "${line}"`);
  assert.ok(!/collect \d|\d\s*-\s*\d+\s*(am|pm)/.test(line),
    "no time invented for a van that has not been booked — the window is stamped at booking");
  // AND THE TIME IS PROMISED RATHER THAN LEFT UNSAID: the van is booked later, so the app says so.
  assert.ok(built.message.includes("Your courier delivery time will be confirmed separately."),
    "the customer is told the van's time is still to come");
});
