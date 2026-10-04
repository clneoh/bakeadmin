// test/invoice.test.js — one order, one invoice (v293).
//
// Her words: "And customer need an invoice", and to what it should carry: "One
// order, one invoice" and "Yes — name, address, a number".
//
// What this file is for, in one sentence: THE NUMBER IS GIVEN ONCE AND THE MONEY IS
// READ, NEVER RE-ADDED. The number is assigned on the order because a counter in
// settings is one record under sync's last-write-wins, and the money is
// `customerTotal` because that is the one function the confirmation message, the
// tracking card and the order row already read — an invoice that worked the sum out
// itself is an invoice that could disagree with all three.
//
// Run with: node --test test/

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignInvoiceNo, invoiceCurrency, invoiceLineAmount, invoiceLineName,
  invoiceNoText, invoiceNumberOf, invoiceSheet, nextInvoiceNo,
} from "../admin/js/invoice.js";
import { fromLines, journalSheet } from "../admin/js/journal.js";
import { customerTotal } from "../admin/js/courier.js";

function state(extra = {}) {
  return {
    settings: { currency: "RM", storefront: { name: "Jien Luv 2 Bake" },
      mailingAddress: "Jien Luv 2 Bake\n12, Jalan Bunga Raya\n11600 Pulau Pinang\n016 960 1268" },
    products: [{ id: "p1", name: "Focaccia", price: 15 }, { id: "p2", name: "Sandwich", price: 12 }],
    deliveryDates: [{ id: "d18", date: "2026-09-18" }],
    orders: [],
    promoCodes: [],
    ...extra,
  };
}

// One cart. `extra` lands on every row, so a courier charge or a promo code written
// once reads the way the app really stores it.
const group = (rows) => ({ orders: rows });

// A cart that really lives in `state.orders`. It has to: the invoice number is read back
// off her ORDERS, so a group hanging outside the state would take a number that the next
// invoice could not see — which is exactly how the first draft of this file was wrong.
function cart(rows = [{}]) {
  const st = state();
  st.orders = rows.map((o, i) => line({ id: "o" + (i + 1), groupId: "abc123", ...o }));
  return { st, g: group(st.orders) };
}
const line = (over = {}) => ({
  id: "ordabc123", groupId: "ordgabc123", deliveryDateId: "d18", deliveryDate: "2026-09-18",
  fulfillment: "pickup", whatsapp: "60123456789", orderDate: "2026-09-15",
  productId: "p1", qty: 2, productName: "Focaccia", unitPrice: 15, status: "ready", ...over,
});

// ── the serial number ────────────────────────────────────────────────────────

test("a first invoice is number 1, and the next one is 2", () => {
  const a = cart();
  assert.equal(nextInvoiceNo(a.st), 1, "with nothing issued, the first invoice is 1");
  assert.equal(assignInvoiceNo(a.st, a.g), 1);
  assert.equal(nextInvoiceNo(a.st), 2);
  const b = cart();
  b.st.orders = [...a.st.orders, line({ id: "o9", groupId: "def456" })];
  assert.equal(assignInvoiceNo(b.st, group([b.st.orders[1]])), 2);
  assert.equal(nextInvoiceNo(b.st), 3);
});

test("the highest number already issued wins, whatever order the rows are in", () => {
  // The two phones sync row by row, so the list is in no particular order and a row can
  // arrive from the other phone at any position. The next number is the highest, never
  // "the last one in the array" — which would hand out a number already on a customer's
  // paper the moment a row arrived out of order.
  const st = state({ orders: [
    line({ id: "o1", invoiceNo: 7 }), line({ id: "o2" }), line({ id: "o3", invoiceNo: 3 }),
  ]});
  assert.equal(nextInvoiceNo(st), 8);
});

test("an invoice's number is given ONCE and a reprint is the same invoice", () => {
  // The whole reason it lives on the order rather than in a counter. If every opening
  // issued a fresh number, a reprint the next day would be a different invoice for the
  // same order — and a customer holding the first one would have two documents.
  const { st, g } = cart();
  const first = assignInvoiceNo(st, g, "2026-10-01T00:00:00.000Z");
  const again = assignInvoiceNo(st, g, "2026-12-25T00:00:00.000Z");
  assert.equal(first, 1);
  assert.equal(again, 1, "the second opening returns the number it already had");
  assert.equal(st.orders[0].invoicedAt, "2026-10-01T00:00:00.000Z",
    "and the date it was first issued is not moved");
  assert.equal(nextInvoiceNo(st), 2, "so the NEXT invoice is still 2 — nothing was burned");
});

test("the number is written on EVERY row of the cart", () => {
  // A cart is several synced records. Stamping only the first would lose the number the
  // day that one row is removed, and the invoice in the customer's hand would have no
  // successor in the app.
  const { st, g } = cart([{ productId: "p1" }, { productId: "p2" }]);
  assignInvoiceNo(st, g);
  assert.deepEqual(st.orders.map((o) => o.invoiceNo), [1, 1]);
});

test("the number is found even when the FIRST row of the cart has none", () => {
  // Two phones sync row by row, so a cart can arrive half-stamped: the row carrying the
  // number is there and the one beside it has not caught up. Reading the number off the
  // first row alone would call this order un-invoiced and hand it a SECOND number — one
  // order, two invoices, and the customer holding the first one. The number is read off
  // every row for exactly this.
  const st = state({ orders: [
    line({ id: "o1", groupId: "abc123" }),
    line({ id: "o2", groupId: "abc123", invoiceNo: 4 }),
  ] });
  assert.equal(invoiceNumberOf(group(st.orders)), 4, "read off every row, not the first");
  assert.equal(nextInvoiceNo(st), 5);
  assert.equal(assignInvoiceNo(st, group(st.orders)), 4, "and it is not given a second number");
});

test("an order with no rows has no number, and is never given one", () => {
  const st = state();
  assert.equal(invoiceNumberOf(group([])), 0);
  assert.equal(invoiceNumberOf(null), 0);
  assert.equal(assignInvoiceNo(st, group([])), 0);
  assert.equal(assignInvoiceNo(st, null), 0);
  assert.deepEqual(st.orders, [], "and nothing is written for nothing");
});

test("a number is printed four wide, and never cut short", () => {
  assert.equal(invoiceNoText(7), "0007");
  assert.equal(invoiceNoText(1), "0001");
  assert.equal(invoiceNoText(1234), "1234");
  assert.equal(invoiceNoText(12345), "12345", "past 9999 it prints what it is rather than truncating");
  assert.equal(invoiceNoText(0), "", "and a number nobody was given prints nothing at all");
  assert.equal(invoiceNoText(""), "");
  assert.equal(invoiceNoText(undefined), "");
});

// ── what the paper carries ───────────────────────────────────────────────────

test("an invoice is one order: the items at the price they were SOLD at, then the total", () => {
  const { st, g } = cart();
  assignInvoiceNo(st, g);
  const s = journalSheet(invoiceSheet(st, g, { bakery: "Jien Luv 2 Bake" }));

  assert.equal(s.title, "Invoice 0001");
  assert.equal(s.subtitle, "Order #ABC123 · 15 Sep 2026");
  assert.deepEqual(s.lines.map((l) => [l.what, l.amount]), [["2 × Focaccia", 30]]);
  assert.deepEqual(s.totals, [{ label: "Total", amount: 30, cls: "pl-total" }]);
});

test("the invoice's Total IS the customer's total, to the cent", () => {
  // The one guarantee that makes this an invoice rather than a second opinion. The
  // confirmation message, the tracking card and the order row all read `customerTotal`;
  // an invoice that added the lines up itself could disagree with all three.
  const st = state({ promoCodes: [{
    id: "c1", code: "FRESH10", state: "live", vis: "public", frozen: false,
    who: { type: "all" }, when: { from: "", to: "" }, basket: { type: "none", amount: 0 },
    gives: { type: "rm", value: 10, cap: 0 }, often: { type: "unlimited", n: 0, maxRM: 0 },
    beside: { type: "anything" }, say: "", sayZh: "", sayMs: "", used: 0, given: 0,
  }] });
  st.orders = [line({ id: "o1", groupId: "abc123", promo: "FRESH10", courierFee: 8, courierPaidBy: "customer" })];
  const g = group(st.orders);
  assignInvoiceNo(st, g);
  const parts = customerTotal(st, g);
  const s = journalSheet(invoiceSheet(st, g));
  assert.equal(s.totals[0].amount, parts.total, "the invoice totals what the customer owes");
  assert.equal(s.totals[0].amount, Math.max(0, parts.items + parts.courier - parts.promo));
});

test("a courier charge the customer bears is a line; a collect order has no line at all", () => {
  const { st, g: charged } = cart([{ fulfillment: "courier", courierFee: 8, courierPaidBy: "customer" }]);
  assignInvoiceNo(st, charged);
  const a = journalSheet(invoiceSheet(st, charged));
  assert.deepEqual(a.lines.map((l) => l.what), ["2 × Focaccia", "Courier"]);
  assert.equal(a.lines[1].amount, 8);

  // She bears it herself, or the order is a collection: no row, because the customer
  // was never asked for it. A charge on the invoice that the customer does not owe is
  // the same fault as a discount stated in one place and not another.
  const own = group([line({ id: "o2", groupId: "g2", fulfillment: "courier",
    courierFee: 8, courierPaidBy: "me" })]);
  const s2 = journalSheet(invoiceSheet(st, own));
  assert.deepEqual(s2.lines.map((l) => l.what), ["2 × Focaccia"]);
});

test("the code comes off as its own row, named, with the minus in front", () => {
  const st = state({ promoCodes: [{
    id: "c1", code: "FRESH10", state: "live", vis: "public", frozen: false,
    who: { type: "all" }, when: { from: "", to: "" }, basket: { type: "none", amount: 0 },
    gives: { type: "rm", value: 10, cap: 0 }, often: { type: "unlimited", n: 0, maxRM: 0 },
    beside: { type: "anything" }, say: "", sayZh: "", sayMs: "", used: 0, given: 0,
  }] });
  st.orders = [line({ id: "o1", groupId: "abc123", promo: "FRESH10" })];
  const g = group(st.orders);
  assignInvoiceNo(st, g);
  const s = journalSheet(invoiceSheet(st, g));
  const code = s.lines.find((l) => l.what.startsWith("Code "));
  assert.ok(code, "the code is a line of its own, never folded into the items");
  assert.equal(code.what, "Code FRESH10", "and it is named, so the customer can check it");
  assert.equal(code.amount, 10);
  assert.equal(code.dir, "out", "dir 'out' is what prints the minus on every rendering");
  assert.equal(s.totals[0].amount, 20);
});

test("an invoice for an old order shows the price it was SOLD at, not today's", () => {
  // The frozen line is the whole reason a rename or a price rise cannot rewrite history.
  const st = state();
  st.products[0].price = 99; // she has put the price up since
  const g = group([line({ id: "o1", groupId: "g1", productName: "Focaccia (old name)", unitPrice: 15 })]);
  const s = journalSheet(invoiceSheet(st, g));
  assert.deepEqual(s.lines.map((l) => [l.what, l.amount]), [["2 × Focaccia (old name)", 30]]);
  assert.equal(s.totals[0].amount, 30);
});

test("an order placed with no price set reads as nothing rather than as a crash", () => {
  const st = state({ products: [] });
  const g = group([line({ id: "o1", groupId: "g1", productId: "gone", productName: "", unitPrice: "" })]);
  assert.equal(invoiceLineAmount(st, g.orders[0]), 0);
  assert.equal(invoiceLineName(st, g.orders[0]), "2 × (deleted product)");
  assert.equal(journalSheet(invoiceSheet(st, g)).totals[0].amount, 0);
});

test("the invoice carries her letterhead, and the currency she bills in", () => {
  const st = state();
  st.orders = [line({ id: "o1", groupId: "abc123" })];
  const s = journalSheet(invoiceSheet(st, group(st.orders), {
    bakery: "Jien Luv 2 Bake", from: st.settings.mailingAddress,
  }));
  assert.equal(s.bakery, "Jien Luv 2 Bake");
  assert.equal(s.from, st.settings.mailingAddress);
  assert.equal(invoiceCurrency(st), "RM");
  assert.equal(invoiceCurrency({}), "RM", "and a state with no settings still bills in ringgit");
});

// ── the letterhead, and the name said once ───────────────────────────────────

test("her address block never says the bakery's name twice", () => {
  // The mailing-label card tells her to make the bakery's name the FIRST line of that
  // block, so a head drawn straight from it would repeat the name — and the sheet would
  // read as though the bakery were at two addresses.
  assert.deepEqual(
    fromLines("Jien Luv 2 Bake\n12, Jalan Bunga Raya\n11600 Pulau Pinang", "Jien Luv 2 Bake"),
    ["12, Jalan Bunga Raya", "11600 Pulau Pinang"]);
  // Case and stray spaces are not a difference.
  assert.deepEqual(fromLines("jien luv 2 bake \n12, Jalan Bunga Raya", "Jien Luv 2 Bake"),
    ["12, Jalan Bunga Raya"]);
  // A block that does NOT open with the name keeps every line — an address with no name
  // in it is still an address, and dropping a line she typed would be the worse fault.
  assert.deepEqual(fromLines("12, Jalan Bunga Raya\n11600 Pulau Pinang", "Jien Luv 2 Bake"),
    ["12, Jalan Bunga Raya", "11600 Pulau Pinang"]);
  // A one-line block that IS the name leaves nothing to draw, which is right: the name
  // is already above it in its own larger line.
  assert.deepEqual(fromLines("Jien Luv 2 Bake", "Jien Luv 2 Bake"), []);
  assert.deepEqual(fromLines("", "Jien Luv 2 Bake"), []);
  assert.deepEqual(fromLines("  \n \n", "Jien Luv 2 Bake"), [], "blank lines are not lines");
});

test("every other journal is unchanged by the letterhead", () => {
  // `from` is optional and every existing journal passes nothing, so the shared sheet
  // must draw exactly what it drew before.
  const s = journalSheet({ title: "Sales", bakery: "Jien Luv 2 Bake", lines: [{ what: "Focaccia", amount: 30 }] });
  assert.equal(s.from, "");
  assert.deepEqual(fromLines(s.from, s.bakery), []);
});
