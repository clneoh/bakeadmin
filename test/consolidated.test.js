// test/consolidated.test.js — the consolidated invoice (v372). Pure module, no DOM.
//
// Her words: __"i need a month consolidated invoice printing page, selectable individual, daily,
// monthly"__, and asked what one document should cover: __"per day, per week, per month, per customer
// as well"__.
//
// ⚠️⚠️ THE ASSERTION THAT MATTERS MOST IS THE COURIER ONE. Her takings (`orderNet`) deliberately leave
// the courier charge OUT — it is a pass-through to the courier and was never hers. An INVOICE includes
// it, because the customer was billed it. So a consolidated invoice built on the takings figure would
// disagree with the sum of her OWN individual invoices by every courier charge on the page — a document
// that contradicts the paperwork it is meant to summarise.

import { test } from "node:test";
import assert from "node:assert/strict";

const { consolidatedSheet, periodSpan, orderInvoice } =
  await import("../admin/js/consolidated.js");
const { invoiceSheet } = await import("../admin/js/invoice.js");
const { groupOrders, orderCode } = await import("../admin/js/state.js");

const D = (d) => `2026-10-${String(d).padStart(2, "0")}`; // October 2026

function state() {
  return {
    settings: { currency: "RM" },
    products: [{ id: "p1", name: "Focaccia", price: 16 }, { id: "p2", name: "Sourdough", price: 18 }],
    deliveryDates: [],
    orders: [],
    credits: [], expenses: [], deposits: [], ingredients: [], categories: [],
  };
}
let n = 0;
const row = (extra = {}) => {
  n += 1;
  const id = extra.groupId || `ord${n}`;
  return {
    id, groupId: extra.groupId || id, status: "paid", paidReceived: true, paidMethod: "cash",
    productId: "p1", qty: 1, unitPrice: 16, deliveryDate: D(5), customerName: "Aunty Bee",
    whatsapp: "60111111111", ...extra,
  };
};

// ── the period itself ────────────────────────────────────────────────────────

test("★ the week is the SUNDAY one, and the sheet says which basis it counts on", () => {
  // ⚠️ THE APP HAS TWO WEEKS. `weekStartISO` is Sunday and names the window the Home tile shows
  // ("Week of Sun, 4 Oct"); `mondayAnchor` is Mon–Sun and drives the delivery runs. Using the wrong
  // one would make the word "week" mean two different things on two screens.
  const w = periodSpan("week", "2026-10-08"); // Thursday
  assert.equal(w.from, "2026-10-04", "the week did not start on the Sunday");
  assert.equal(w.to, "2026-10-10", "the week is not seven days");
  assert.match(w.label, /Week of/);

  const m = periodSpan("month", "2026-10-08");
  assert.equal(m.from, "2026-10-01");
  assert.equal(m.to, "2026-10-31");
  assert.equal(m.label, "October 2026");

  const d = periodSpan("day", "2026-10-08");
  assert.equal(d.from, w.from.length === 10 ? "2026-10-08" : d.from);
  assert.equal(d.to, "2026-10-08");

  // ⚠️ AND THE PAPER SAYS THE BASIS. The Home tile's own RM figure counts orders as PLACED, this
  // counts them as DELIVERED — both honest, and they will not match. The document states its own.
  const st = state();
  st.orders = [row({ deliveryDate: D(5) })];
  assert.match(consolidatedSheet(st, { kind: "month", anchor: D(8) }).subtitle, /by bake day/);
});

// ── the money ────────────────────────────────────────────────────────────────

test("★★ the total EQUALS THE SUM OF THE INDIVIDUAL INVOICES — the courier charge is in both", () => {
  const st = state();
  st.orders = [
    // A courier order whose charge the CUSTOMER pays: billed RM16 + RM8.
    row({ groupId: "g1", deliveryDate: D(5), fulfillment: "courier", courierFee: 8, courierPaidBy: "customer" }),
    // A plain collect order.
    row({ groupId: "g2", deliveryDate: D(6), productId: "p2", unitPrice: 18, customerName: "Mei Ling" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const total = sheet.totals[0].amount;
  assert.equal(total, 42, `the month total is ${total} — the courier charge is missing from it`);

  // ⚠️ And the same orders through the app's OWN invoice renderer must add up to it.
  const each = groupOrders(st.orders)
    .reduce((s, g) => s + invoiceSheet(st, g, { bakery: "x" }).totals[0].amount, 0);
  assert.equal(total, Math.round(each * 100) / 100,
    "★ the consolidated total disagrees with the sum of the individual invoices");
});

test("★ a discounted order reads at what was charged, less the discount", () => {
  const st = state();
  st.orders = [row({ groupId: "g1", deliveryDate: D(5), qty: 2 })];
  // ⚠️ The coupon is matched to the order by the app's OWN code, not a guess at it.
  st.credits = [{ id: "c1", holder: "60111111111", amountRM: 3, role: "friendOff",
    earnedAt: "2026-10-01T00:00:00.000Z", expiresAt: "", usedAt: null,
    orderCode: orderCode(st.orders[0]) }];
  assert.equal(orderInvoice(st, { orders: st.orders }), 29, "RM32 less the RM3 coupon is RM29");
});

test("★ a part-refunded order shows its net; a fully refunded one is OFF the rows and SAID", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5), refundAmountRM: 5, refundedAt: "2026-10-06T00:00:00.000Z" }),
    row({ groupId: "g2", deliveryDate: D(6), customerName: "Mei Ling", productId: "p2",
      unitPrice: 18, refundedAt: "2026-10-07T00:00:00.000Z" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(sheet.totals[0].amount, 11, "RM16 less the RM5 given back is RM11");
  assert.equal(sheet.lines.filter((l) => !l.heading && !l.cls).length, 1, "the refunded order is still listed");
  assert.match(sheet.note, /1 order was refunded in full/,
    `a fully refunded order left the page in silence: "${sheet.note}"`);
});

test("★ 'still to collect' is read off the SAME orders the rows show", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5) }),
    row({ groupId: "g2", deliveryDate: D(6), customerName: "Mei Ling", paidReceived: false, status: "confirmed" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(sheet.totals[0].amount, 32);
  assert.match(sheet.note, /Still to collect from these orders: RM 16\.00/,
    `the owed figure does not match the page: "${sheet.note}"`);
});

// ── the grouping ─────────────────────────────────────────────────────────────

test("★ one row per ORDER, never per item — a discount is a fact about the whole order", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5), id: "a" }),
    row({ groupId: "g1", deliveryDate: D(5), id: "b", productId: "p2", unitPrice: 18 }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const rows = sheet.lines.filter((l) => !l.heading && !l.cls);
  assert.equal(rows.length, 1, `two item rows of ONE order became ${rows.length} lines`);
  assert.equal(sheet.totals[0].amount, 34);
});

test("★ the per-customer subtotals ADD UP to the grand total", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5) }),
    row({ groupId: "g2", deliveryDate: D(6), customerName: "Mei Ling", whatsapp: "60222222222", productId: "p2", unitPrice: 18 }),
    row({ groupId: "g3", deliveryDate: D(7), productId: "p2", unitPrice: 18 }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const subs = sheet.lines.filter((l) => l.cls && /total/.test(l.cls));
  assert.equal(subs.length, 2, "two customers, two subtotals");
  const sum = subs.reduce((s, l) => s + l.amount, 0);
  assert.equal(sum, sheet.totals[0].amount, "★ the subtotals do not add up to the total beneath them");
  assert.ok(sheet.lines.some((l) => l.heading), "there are no customer headings over the rows");
});

test("★ a heading carries NO figure, and a subtotal carries the class paper rules on", () => {
  const st = state();
  st.orders = [row({ groupId: "g1" }), row({ groupId: "g2", customerName: "Mei Ling", whatsapp: "60222222222" })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const head = sheet.lines.find((l) => l.heading);
  assert.equal(head.amount, undefined, "a heading came with money on it");
  const sub = sheet.lines.find((l) => l.cls);
  assert.match(sub.cls, /total/, "a subtotal without a total class is plain on paper and in the PDF");
});

test("★ a walk-in with no name and no number shares ONE heading", () => {
  // ⚠️ `keyOf` keys such an order to its own ID, so grouping by that alone gives every nameless order
  // a heading of its own — a page of one-line "customers".
  const st = state();
  st.orders = [
    row({ groupId: "g1", customerName: "", whatsapp: "" }),
    row({ groupId: "g2", customerName: "", whatsapp: "" }),
    row({ groupId: "g3", customerName: "Aunty Bee", whatsapp: "60111111111" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const heads = sheet.lines.filter((l) => l.heading);
  assert.equal(heads.length, 2, `expected two headings (No name + Aunty Bee), got ${heads.length}`);
  assert.ok(heads.some((h) => h.what === "NO NAME"));
});

test("one customer can be picked out of the period", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1" }),
    row({ groupId: "g2", customerName: "Mei Ling", whatsapp: "60222222222", productId: "p2", unitPrice: 18 }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8), customerKey: "60222222222" });
  assert.equal(sheet.totals[0].amount, 18, "the customer filter let somebody else's order through");
  assert.equal(sheet.lines.some((l) => l.heading), false,
    "one customer's own list is headed by their name — a heading over the only list says nothing");
});

// ── what is left out, and SAID ───────────────────────────────────────────────

test("★ an order with no bake day is counted and SAID, never merely dropped", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5) }),
    row({ groupId: "g2", deliveryDate: "", deliveryDateId: "" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(sheet.totals[0].amount, 16, "the order with no day was counted anyway");
  assert.match(sheet.note, /1 order has no bake day/,
    `the document is quietly short: "${sheet.note}"`);
});

test("an order outside the period is simply not in it, and is not complained about", () => {
  const st = state();
  st.orders = [row({ groupId: "g1", deliveryDate: D(5) }), row({ groupId: "g2", deliveryDate: "2026-09-30" })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(sheet.totals[0].amount, 16);
  assert.equal(/no bake day/.test(sheet.note), false, "an order in September was reported as undated");
});

test("a period with nothing in it says so rather than drawing an empty page", () => {
  const st = state();
  st.orders = [row({ groupId: "g1", deliveryDate: "2026-09-30" })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(sheet.lines.length, 0);
  assert.deepEqual(sheet.totals, []);
  assert.match(sheet.empty, /Nothing was sold in this period/);
});

test("a line nothing can price is MARKED, not printed as a confident nothing", () => {
  const st = state();
  st.products[0].price = "";
  st.orders = [row({ groupId: "g1", unitPrice: "" })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const line = sheet.lines.find((l) => !l.heading);
  assert.match(line.what, /no price/, `an unpriced loaf reads as a lie: "${line.what}"`);
});
