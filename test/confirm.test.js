// test/confirm.test.js — the WhatsApp confirmation message the baker sends
// when confirming an order. Pure module, no DOM shim needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConfirmation } from "../js/confirm.js";

function state(overrides = {}) {
  return {
    settings: { currency: "RM", storefront: { name: "Jienluv2bake", whatsapp: "60123456789", tngQr: "https://img/tng.png" } },
    products: [{ id: "p1", name: "Focaccia", price: 15 }, { id: "p2", name: "Sandwich", price: 8 }],
    deliveryDates: [{ id: "d1", date: "2026-09-07" }],
    ...overrides,
  };
}

test("buildConfirmation carries the payment QR and a tap-ready send-receipt link", () => {
  const group = { orders: [{
    id: "ord_ab12cd34ef56", groupId: "ordg_112233445566",
    deliveryDateId: "d1", fulfillment: "collect",
    whatsapp: "+60 12-345 6789", customerName: "Aunty Bee",
    productId: "p1", qty: 2,
  }] };
  const built = buildConfirmation(state(), group, "https://bake.app/store/?track=445566");
  assert.equal(built.recipient, "60123456789", "wa.me digits, no + / spaces");
  assert.ok(built.message.includes("Order #445566"), "order code");
  assert.ok(built.message.includes("Mon, 7 Sep · Self collect"), "date + fulfillment");
  assert.ok(built.message.includes("Focaccia ×2 — RM 30.00"), "items + total");
  assert.ok(built.message.includes("Please pay by TNG QR before collection."),
    "asks for payment by TNG QR");
  assert.ok(built.message.includes("\nhttps://img/tng.png\n"),
    "the published QR image URL sits on its own line so WhatsApp renders it as one picture");
  assert.ok(!built.message.includes("Your payment QR:"),
    "no extra 'Your payment QR:' label line that would add a second tap target");
  assert.ok(built.message.includes("📲 Send my payment receipt on WhatsApp: https://wa.me/60123456789?text="),
    "receipt link goes to the bakery's WhatsApp");
  assert.ok(built.message.includes("%23445566"),
    "the tap-ready receipt message mentions this order's code (#445566)");
  assert.ok(built.message.includes("Track your order: https://bake.app/store/?track=445566"));
  assert.ok(built.message.includes("put your phone number (60123456789) in the payment description"),
    "reminds the customer to use their number as the TNG description");
  assert.ok(built.message.includes("screenshot the receipt and send it back here"),
    "reminds the customer to share the receipt screenshot");
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
  assert.ok(built.message.includes("📍 12 Jalan Bunga"));
});

test("without a published QR the pay line still appears but no image URL", () => {
  const s = state({ settings: { currency: "RM", storefront: { name: "Jienluv2bake", tngQr: "" } } });
  const group = { orders: [{
    id: "ord_ab12cd34ef56", deliveryDateId: "d1", fulfillment: "collect",
    whatsapp: "60123456789", customerName: "Bee", productId: "p1", qty: 1,
  }] };
  const built = buildConfirmation(s, group, "https://bake.app/store/?track=34ef56");
  assert.ok(built.message.includes("Please pay by TNG QR"));
  assert.ok(!built.message.includes("https://img/tng.png"));
});

test("empty group returns null", () => {
  assert.equal(buildConfirmation(state(), { orders: [] }, "https://bake.app/store/?track=x"), null);
});
