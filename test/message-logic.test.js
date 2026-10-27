// test/message-logic.test.js — THE LOGIC OF WHAT A CUSTOMER IS TOLD (v659).
//
// Her words, on a real confirmation: __"what is the point of having time on the bake day?"__ It read
//
//     Baking day: Wed, 28 Oct, 6-7:09 pm
//     Collection: Thu, 29 Oct, 6pm
//
// ⚠️⚠️ **AND THE FAULT IS A CONTRADICTION, NOT A TYPO** — a SELF COLLECT order was promised a DELIVERY window,
// left on it from when it was a courier delivery. Her follow-up: __"the problem is logical, you should be able
// to detect if you check"__, then __"make it systemic as well"__.
//
// ⭐ SO THIS FILE CHECKS THE LOGIC, NOT THE WORDING. Every builder a customer can receive, over every shape an
// order can be in, must satisfy the same handful of rules — and each rule is a sentence a customer could catch
// us out on. A message that satisfies the strings but breaks the sense still fails here.

import { test } from "node:test";
import assert from "node:assert/strict";

const { buildConfirmation } = await import("../admin/js/confirm.js");
const { buildPaymentReminder, buildPickupReminder } = await import("../admin/js/messages.js");

const FARLIM = {
  id: "pt_farlim", name: "Farlim, Air Itam", address: "Lebuhraya Thean Teik, 11500 Air Itam",
  receiver: "Aunty Lim", phone: "60123456789", feeRM: 0, paused: false,
  createdAt: "2026-08-12T00:00:00.000Z", collectWindow: "14:00-18:00",
  place: { lat: 5.4, lng: 100.28, label: "Farlim" },
};
const NO_HOURS = { ...FARLIM, id: "pt_bare", name: "Bare Point", collectWindow: "" };

function state(points = [FARLIM]) {
  return {
    settings: { currency: "RM", storefront: { name: "Jien Luv 2 Bake" }, deliveryDays: [1, 3, 5],
      cutoff: "18:00", mailingAddress: "Jien Luv 2 Bake\n12, Jalan Bunga Raya\n11600 Pulau Pinang" },
    products: [{ id: "p1", name: "Focaccia", price: 15 }],
    deliveryDates: [{ id: "d1", date: "2026-09-07" }],
    points, orders: [], promoCodes: [],
  };
}
const order = (extra = {}) => ({
  id: "ord_ab12cd34ef56", groupId: "ordg_112233445566", deliveryDateId: "d1",
  fulfillment: "collect", whatsapp: "+60 12-345 6789", customerName: "Aunty Bee",
  productId: "p1", qty: 2, ...extra,
});
const group = (extra = {}) => ({ orders: [order(extra)] });

// ⚠️ Every shape an order can be in — including hers: a collection still carrying the van's window.
const SHAPES = [
  ["kitchen collection", {}, "collect"],
  ["Point with hours", { pointId: "pt_farlim", pointName: "Farlim, Air Itam" }, "collect"],
  ["Point with no hours", { pointId: "pt_bare", pointName: "Bare Point" }, "collect"],
  ["Point whose order carries the van's window", { pointId: "pt_farlim", pointName: "Farlim, Air Itam", deliveryWindow: "18:00-19:09" }, "collect"],
  ["collection with a time she typed", { collectDay: "2026-09-08", collectTime: "6pm" }, "collect"],
  ["collection still carrying a stale van day and window", { deliveryWindow: "18:00-19:09", courierDay: "2026-09-08" }, "collect"],
  ["courier with a van day and window", { fulfillment: "courier", address: "9 Jalan B", courierDay: "2026-09-08", deliveryWindow: "18:00-19:09" }, "courier"],
  ["courier with no van day yet", { fulfillment: "courier", address: "9 Jalan B" }, "courier"],
];

const builders = (st, g) => [
  ["confirmation", buildConfirmation(st, g, "")],
  ["payment reminder", buildPaymentReminder(st, g, "")],
  ["pickup reminder", buildPickupReminder(st, g, "")],
];

// A time written onto the bake-day line: "Wed, 28 Oct, 6-7:09 pm" or "Wed, 28 Oct, 2-6 pm".
const BAKE_LINE = /^Baking day: ([A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2})$/;
const bakeLines = (msg) => msg.split("\n").filter((l) => l.startsWith("Baking day:"));
const WINDOWISH = /\d{1,2}(:\d\d)?\s*[-–]\s*\d{1,2}(:\d\d)?\s*(am|pm)/i;

test("★★★ the bake-day line is a DAY, in every message, for every shape (v659)", () => {
  const st = state();
  for (const [shape, extra] of SHAPES) {
    for (const [name, built] of builders(st, group(extra))) {
      if (!built) continue;
      const lines = bakeLines(built.message);
      // A pickup reminder has no bake line at all — it names the day it is ready. That is allowed.
      for (const line of lines) {
        assert.match(line, BAKE_LINE, `${shape} · ${name}: the bake line reads "${line}"`);
        assert.ok(!WINDOWISH.test(line), `${shape} · ${name}: ★ a TIME on the bake day — "${line}"`);
      }
    }
  }
});

test("★★★ a collection is never told a delivery window or a courier (v659)", () => {
  const st = state();
  for (const [shape, extra, how] of SHAPES) {
    for (const [name, built] of builders(st, group(extra))) {
      if (!built || how !== "collect") continue;
      assert.ok(!/Courier delivery/.test(built.message), `${shape} · ${name}: ★ told about a courier`);
      assert.ok(!/6-7:09 pm|18-7:09 pm/.test(built.message), `${shape} · ${name}: ★ told the VAN's window as a promise`);
      // ⭐ And her own case: the window that is on the order is the van's, so it must not surface at all on a
      // collection EXCEPT as the Point's own hours, which read "2-6 pm".
      const vanWindowShown = /\b6-7:09\b/.test(built.message);
      assert.ok(!vanWindowShown, `${shape} · ${name}: ★ the van's window reached the customer`);
    }
  }
});

test("★★★ a collection always says WHEN it is collected, when there is a time to say (v659)", () => {
  const st = state();
  // The Point's hours, in every builder that names a collection.
  for (const [name, built] of builders(st, group({ pointId: "pt_farlim", pointName: "Farlim, Air Itam" }))) {
    if (!built) continue;
    assert.match(built.message, /2-6 pm/, `${name}: the Point's own hours are said`);
  }
  // A time she typed wins over the Point's hours.
  const typed = buildConfirmation(st, group({ collectDay: "2026-09-08", collectTime: "6pm" }), "");
  assert.match(typed.message, /Collection: \w{3}, \d{1,2} \w{3}, 6pm/);
  assert.ok(!/2-6 pm/.test(typed.message), "her typed time replaces the Point's hours, not both");
  // A Point with NO hours promises the day and invents no time.
  const bare = buildConfirmation(st, group({ pointId: "pt_bare", pointName: "Bare Point" }), "");
  assert.ok(!WINDOWISH.test(bare.message), "★ a Point with no hours must not acquire one");
});

test("★★★ a courier order still names the van's day and window, and never a collection (v659)", () => {
  const st = state();
  const built = buildConfirmation(st, group({ fulfillment: "courier", address: "9 Jalan B",
    courierDay: "2026-09-08", deliveryWindow: "18:00-19:09" }), "");
  assert.match(built.message, /^Courier delivery: /m, "the van's own line");
  assert.match(built.message, /6-7:09 pm/, "with its window");
  assert.ok(!/^Collection: /m.test(built.message), "★ a courier order was given a collection line");
  assert.equal(bakeLines(built.message).length, 1, "and exactly one bake-day line");
});

test("★★★ the bake-day line refuses a time even when it is HANDED one (v660)", async () => {
  // ⚠️ Her second report came from a build whose callers had been fixed, so the guard has to live in the line
  // itself: a date is a STRING assembled somewhere else, and a string can carry anything. This hands `dayBlock`
  // exactly what produced her message.
  const { dayBlock } = await import("../admin/js/courier_job.js");
  const st = state();
  const o = order({ collectDay: "2026-10-29", collectTime: "6pm" });
  const block = dayBlock(st, o, "Wed, 28 Oct, 6-7:09 pm");
  assert.equal(block.split("\n")[0], "Baking day: Wed, 28 Oct",
    "★ a window handed in as part of the date still reached the bake-day line");
  assert.equal(block.split("\n")[1], "Collection: Thu, 29 Oct, 6pm", "and the collection keeps its own time");
  // A day with no time is passed through untouched.
  assert.equal(dayBlock(st, o, "Wed, 28 Oct").split("\n")[0], "Baking day: Wed, 28 Oct");
  // A plain window form is refused too, and a date is never mangled.
  assert.equal(dayBlock(st, o, "Wed, 28 Oct, 2-5 pm").split("\n")[0], "Baking day: Wed, 28 Oct");
  assert.equal(dayBlock(st, o, "Wed, 28 Oct 2026").split("\n")[0], "Baking day: Wed, 28 Oct 2026");
});
