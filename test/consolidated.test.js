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

// ── the document's own reference (v374) ──────────────────────────────────────

test("★★ the reference identifies the DOCUMENT and comes out the same every time", () => {
  // ⚠️⚠️ IT IS DERIVED, NOT COUNTED. Re-printing October's statement must carry the same reference — a
  // counter would turn one statement into two documents for the same money the second time she opened it.
  const st = state();
  st.orders = [row({ groupId: "g1", deliveryDate: D(5) })];
  const a = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const b = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(a.ref, b.ref, "opening the same document twice produced two references");
  assert.equal(a.ref, "CI-MONTH-2026-10");
  // And it is ON the document, in the line every copy carries.
  assert.match(a.subtitle, /^CI-MONTH-2026-10 · /, `the reference is not on the document: ${a.subtitle}`);
});

test("★★ a Sunday's DAY invoice never shares a number with that WEEK's", () => {
  // ⚠️ THE COLLISION THAT WOULD HAVE SHIPPED. `weekStartISO` is the Sunday, so a day document for 4 Oct
  // and the week document for the week starting 4 Oct both came out "CI-2026-10-04" — one day in seven,
  // two different documents under one number.
  const st = state();
  const day = consolidatedSheet(st, { kind: "day", anchor: "2026-10-04" });
  const week = consolidatedSheet(st, { kind: "week", anchor: "2026-10-04" });
  assert.notEqual(day.ref, week.ref, `a day and a week share the reference ${day.ref}`);
  assert.equal(day.ref, "CI-DAY-2026-10-04");
  assert.equal(week.ref, "CI-WEEK-2026-10-04");
});

test("★★ a customer-scoped document never shares a number with the whole month's", () => {
  // ⚠️ The other collision: a customer keyed by NAME has no phone number to put in the reference, so it
  // fell back to the month's all-customer one — two documents, one number.
  const st = state();
  st.orders = [row({ groupId: "g1", deliveryDate: D(5) })];
  const whole = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const named = consolidatedSheet(st, { kind: "month", anchor: D(8), customerKey: "60111111111" });
  assert.notEqual(named.ref, whole.ref, `a customer's invoice shares the month's reference ${named.ref}`);
  assert.match(named.ref, /^CI-MONTH-2026-10-/, `the customer is not in the reference: ${named.ref}`);
  // Stable for that person, and different for another.
  const other = consolidatedSheet(st, { kind: "month", anchor: D(8), customerKey: "60222222222" });
  assert.equal(consolidatedSheet(st, { kind: "month", anchor: D(8), customerKey: "60111111111" }).ref, named.ref);
  assert.notEqual(other.ref, named.ref, "two customers share a reference in the same month");
});

test("every scope names itself, so no two kinds of document can collide", () => {
  const st = state();
  const refs = ["all", "day", "week", "month"]
    .map((kind) => consolidatedSheet(st, { kind, anchor: D(5) }).ref);
  assert.deepEqual(refs, ["CI-ALL", "CI-DAY-2026-10-05", "CI-WEEK-2026-10-04", "CI-MONTH-2026-10"]);
  assert.equal(new Set(refs).size, refs.length, "two scopes produced the same reference");
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
  assert.equal(sheet.lines.filter((l) => !l.heading && !l.head && !l.cls).length, 1, "the refunded order is still listed");
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
  const rows = sheet.lines.filter((l) => !l.heading && !l.head && !l.cls);
  assert.equal(rows.length, 1, `two item rows of ONE order became ${rows.length} lines`);
  assert.equal(sheet.totals[0].amount, 34);
});

test("★★ every row ADDS UP to the Total beneath it — the filing list has no subtotals to hide behind", () => {
  // ⚠️ THIS TEST USED TO CHECK THE PER-CUSTOMER SUBTOTALS. v376 replaced the grouping with one flat
  // filing list — her choice, shown both — so the invariant that survives is the one that always
  // mattered: **the rows add up to the figure under them.**
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5) }),
    row({ groupId: "g2", deliveryDate: D(6), customerName: "Mei Ling", whatsapp: "60222222222", productId: "p2", unitPrice: 18 }),
    row({ groupId: "g3", deliveryDate: D(7), productId: "p2", unitPrice: 18 }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const rows = sheet.lines.filter((l) => !l.head && !l.heading);
  const sum = rows.reduce((s, l) => s + l.amount, 0);
  assert.equal(Math.round(sum * 100) / 100, sheet.totals[0].amount,
    "★ the rows do not add up to the total beneath them");
  assert.equal(sheet.lines.some((l) => l.heading), false, "a customer heading survived the flat list");
});

test("★★ the filing page leads with a HEADER row naming its columns, and carries no figure", () => {
  // ⚠️ UNLABELLED COLUMNS ARE NOT A FILING PAGE — she has to be able to see WHICH column is the invoice
  // number. And a header must never carry money: a zero in the amount column would read as a real row.
  const st = state();
  st.orders = [row({ groupId: "g1" }), row({ groupId: "g2", customerName: "Mei Ling", whatsapp: "60222222222" })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const head = sheet.lines.find((l) => l.head);
  assert.ok(head, "the filing list has no header row");
  assert.deepEqual(head.cols, ["Date", "Order", "Invoice", "Customer"]);
  assert.equal(head.amount, undefined, "the header row came with money on it");
  // And every row under it carries the same FOUR columns, so the header names them all.
  for (const l of sheet.lines.filter((x) => !x.head)) {
    assert.equal(l.cols.length, head.cols.length, `a row has ${l.cols.length} columns under a ${head.cols.length}-column header`);
  }
});

test("★ a walk-in with no name and no number is NAMED, not left blank", () => {
  // ⚠️ THE GROUPING IS GONE (v376), so this is about the CUSTOMER COLUMN now: a nameless order must
  // still say something in it rather than leaving a gap where a person belongs.
  const st = state();
  st.orders = [
    row({ groupId: "g1", customerName: "", whatsapp: "" }),
    row({ groupId: "g2", customerName: "", whatsapp: "" }),
    row({ groupId: "g3", customerName: "Aunty Bee", whatsapp: "60111111111" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const rows = sheet.lines.filter((l) => !l.head);
  const blank = rows.filter((l) => !String(l.cols[3] || "").trim());
  assert.deepEqual(blank, [], "a row left the customer column empty where a person belongs");
  assert.equal(rows.filter((l) => l.cols[3] === "No name").length, 2, "the walk-ins are not named");
  assert.equal(rows.some((l) => l.cols[3] === "Aunty Bee"), true, "the named customer is missing");
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

test("★★ ALL means ALL — no window for an order to fall outside of", () => {
  // Her words: __"pls add a selection ALL, on top of A DAy, A week, a month"__.
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5) }),
    row({ groupId: "g2", deliveryDate: "2026-09-30", customerName: "Mei Ling", whatsapp: "60222222222" }),
    row({ groupId: "g3", deliveryDate: "2025-01-02", customerName: "Old order", whatsapp: "60333333333" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "all", anchor: D(8) });
  assert.equal(sheet.span.label, "Everything");
  assert.equal(sheet.totals[0].amount, 48,
    `"All" left something out — it holds ${sheet.totals[0].amount}, not RM48`);
  assert.equal(sheet.lines.filter((l) => !l.heading && !l.head && !l.cls).length, 3);
});

test("a period still excludes what is outside it — ALL does not weaken the other scopes", () => {
  // ⚠️ The range is SKIPPED for "all", never widened for everybody — otherwise the month would stop
  // being a month and every scope would quietly become "everything".
  const st = state();
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(5) }),
    row({ groupId: "g2", deliveryDate: "2026-09-30", customerName: "Mei Ling", whatsapp: "60222222222" }),
  ];
  assert.equal(consolidatedSheet(st, { kind: "month", anchor: D(8) }).totals[0].amount, 16);
  assert.equal(consolidatedSheet(st, { kind: "week", anchor: D(8) }).totals[0].amount, 16);
  assert.equal(consolidatedSheet(st, { kind: "all", anchor: D(8) }).totals[0].amount, 32);
});

test("with nothing sold at all, ALL says so without offering another period", () => {
  const st = state();
  const sheet = consolidatedSheet(st, { kind: "all", anchor: D(8) });
  assert.match(sheet.empty, /Nothing has been sold yet/);
  assert.equal(/another period/.test(sheet.empty), false,
    '"another period" is nonsense on the scope that is not a period');
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

test("★ an order nothing can price is SAID, not printed as a confident nothing", () => {
  // ⚠️ THE ITEM COLUMN IS GONE (v376) — her own drawn layout is Date · Order · Invoice · Customer ·
  // Amount — and that column was also where an unpriced line said "no price". A row nothing could price
  // adds RM 0.00 to the Total with nothing on the line to explain it, so the warning MOVED to the note
  // rather than being dropped with the column. Profit says the same thing about its own journal.
  const st = state();
  st.products[0].price = "";
  st.orders = [row({ groupId: "g1", unitPrice: "" })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.match(sheet.note, /1 order has an item with no price/,
    `an unpriced order reads as a lie: "${sheet.note}"`);
  assert.equal(sheet.totals[0].amount, 0, "the unpriced order was counted as money anyway");
});

// ── ★★ v376: THE FILING LIST ─────────────────────────────────────────────────
//
// Her words: __"can we have a column for order no. and a column for invoice no, sort it to inv will allow
// us to printout for filing purpose"__ — and shown two layouts, she picked the flat list over keeping the
// per-customer grouping.
//
// ⚠️⚠️ THE "INVOICE NUMBER" IS THE **RECEIPT SERIAL** THE APP ALREADY ISSUES (`#000001`…), not a new
// series. It is a real, unbroken, never-re-used sequence — which is what a filing folder is read against —
// and it needs no counter, no SQL and no rules guessed at. The order code sits beside it because that is
// what finds the order again.

test("★★ the filing list runs in INVOICE-NUMBER order, with the unnumbered at the END", () => {
  const st = state();
  // ⚠️⚠️ THE DATES RUN **OPPOSITE** TO THE SERIALS, DELIBERATELY. The first version of this test had them
  // ascending together, so sorting by date and sorting by invoice number gave the SAME list — and the bite
  // (sort by date again) did not disturb it at all. **A test whose data cannot tell the two answers apart
  // proves nothing about either.** And the unnumbered order carries the EARLIEST date, so a date sort would
  // put it first rather than last, which is the other half of what is being pinned.
  st.orders = [
    row({ groupId: "g1", deliveryDate: D(9), receiptNo: 1, customerName: "A" }),
    row({ groupId: "g9", deliveryDate: D(1), customerName: "Z" }),          // not paid yet — no serial
    row({ groupId: "g3", deliveryDate: D(7), receiptNo: 3, customerName: "C" }),
    row({ groupId: "g2", deliveryDate: D(8), receiptNo: 2, customerName: "B" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const rows = sheet.lines.filter((l) => !l.head);
  assert.deepEqual(rows.map((r) => r.cols[2]),
    ["#000001", "#000002", "#000003", "none yet"],
    "★ the filing list is not in invoice order, or an unnumbered order is sitting inside the run");
  // ⚠️ AND THE ENTRY GATE IS ON THE LINE, NOT SORTED BY ACCIDENT — the header is first.
  assert.ok(sheet.lines[0].head, "the header row is not at the top of the filing list");
});

test("★★ the two numbers are the ORDER's own code and its own receipt serial", () => {
  const st = state();
  st.orders = [row({ groupId: "g1", receiptNo: 7 })];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  const r = sheet.lines.find((l) => !l.head);
  assert.equal(r.cols[1], `#${orderCode(st.orders[0])}`, "the Order column is not the order's own code");
  assert.equal(r.cols[2], "#000007", "the Invoice column is not the order's own receipt serial");
  // ⚠️ AND THE SAME FACTS ARE IN `what`, so the shared text and the PDF — which read `what` — say
  // everything the screen's columns say. One set of values, two arrangements.
  for (const cell of r.cols) assert.ok(r.what.includes(cell), `"${cell}" is missing from the line text`);
});

test("★ an unnumbered order still counts toward the Total, and is called out as owed", () => {
  const st = state();
  st.orders = [
    row({ groupId: "g1", receiptNo: 1, paidReceived: true }),
    row({ groupId: "g2", customerName: "Mei Ling", whatsapp: "60222222222", paidReceived: false, status: "confirmed" }),
  ];
  const sheet = consolidatedSheet(st, { kind: "month", anchor: D(8) });
  assert.equal(sheet.totals[0].amount, 32, "the unnumbered order was left out of the money");
  assert.match(sheet.note, /Still to collect from these orders: RM 16\.00/);
});
