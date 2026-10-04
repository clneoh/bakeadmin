// invoice.js — one order, one invoice (4 Oct 2026).
//
// Her words: "And customer need an invoice". Asked what it should carry she chose
// __"One order, one invoice"__ and __"Yes — name, address, a number"__.
//
// There is very little new machinery here, and that is the point. An invoice IS a
// sheet (journal.js), so Print, Share and the PDF into WhatsApp come for free and
// the screen, the paper and the file cannot disagree about a row or a total. Every
// figure is read from `customerTotal`, the ONE order-money function the
// confirmation message, the tracking card and the order rows already read — so an
// invoice can never state a sum those three contradict. Every item name and price
// comes from the FROZEN `orderLineName` / `orderLinePrice`, so an invoice for an
// old order never shows a renamed product or today's price.
//
// THE LETTERHEAD IS HER REAL ADDRESS, and it already exists: `settings.mailingAddress`
// is the FROM block she typed once for the mailing labels, synced to both phones.
// There is no address on the storefront and there cannot be — `cleanStorefront`
// whitelists the settings keys and would drop one added there.
//
// ★ THE SERIAL NUMBER, AND WHY IT IS NOT A SETTINGS COUNTER
//
// She asked for a number that goes up one each time and never repeats. A counter in
// settings cannot give her that: `sync.js` stores settings as ONE record
// ({kind:"settings", id:"default"}) under last-write-wins, so two phones both
// incrementing from the same base means whichever push carries the newer timestamp
// REPLACES the whole settings record and discards the other's count. Numbers would
// repeat or skip, silently.
//
// So the number is assigned ONCE, on the ORDER — and an order is its own synced
// record, so each assignment is a record of its own and nothing can be lost:
//
//   · `nextInvoiceNo(state)` is the highest number already issued, plus one.
//   · It is written as `invoiceNo` / `invoicedAt` on every row of the group, at the
//     moment the invoice is first made, and NEVER re-assigned — so an invoice
//     reprinted next year carries the number it was given.
//   · THE ORDER'S OWN CODE PRINTS BESIDE IT (`orderCode`, e.g. #A3F9C2, unique by
//     construction), which is what a real invoice does anyway.
//
// THE LIMIT, STATED RATHER THAN HIDDEN: two phones issuing in the same instant could
// take the same number. Nothing is lost when that happens — both invoices exist, each
// on its own order — and the order code tells them apart. With one baker and two
// phones it is vanishingly unlikely, and the alternative, a number issued by the
// server, would mean an invoice she cannot write without the internet.
//
// Pure module: no DOM, no storage. Runs under Node for tests.

import { customerTotal } from "./courier.js";
import { orderCode, orderLineName, orderLinePrice, round2 } from "./state.js";
import { longDate } from "./dates.js";

// The highest invoice number already issued anywhere in her orders, plus one. Read
// off EVERY row rather than the first of each group, because the number is stamped
// on all of them and a group whose leading row was removed must still be counted.
export function nextInvoiceNo(state) {
  let highest = 0;
  for (const o of (state && state.orders) || []) {
    const n = Math.floor(Number(o && o.invoiceNo));
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return highest + 1;
}

// The number this order already carries, or 0 when it has never been invoiced.
export function invoiceNumberOf(group) {
  const rows = (group && group.orders) || [];
  for (const o of rows) {
    const n = Math.floor(Number(o && o.invoiceNo));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

// Give this order its number, ONCE. Called the first time an invoice is made for it
// and never again: an order that already has one keeps it, so a reprint is the same
// invoice rather than a new one. Mutates `state`; the caller saves and syncs.
//
// Written on EVERY row of the group deliberately. A group is several synced records,
// and stamping only the first would lose the number the day that one row is removed —
// the invoice in the customer's hand would then have no successor in the app.
export function assignInvoiceNo(state, group, now = new Date().toISOString()) {
  const rows = (group && group.orders) || [];
  if (!rows.length) return 0;
  const had = invoiceNumberOf(group);
  if (had) return had;
  const no = nextInvoiceNo(state);
  for (const o of rows) {
    o.invoiceNo = no;
    o.invoicedAt = now;
  }
  return no;
}

// A number as it is printed: 0007. Four digits, which runs to 9999 orders before it
// ever needs a fifth — and beyond that it simply prints the number it is, rather than
// truncating.
export function invoiceNoText(no) {
  const n = Math.floor(Number(no));
  return Number.isFinite(n) && n > 0 ? String(n).padStart(4, "0") : "";
}

// What one line of the order is called on paper. The quantity comes first because
// that is how a customer reads a receipt back — "4 × Focaccia" — and the name is the
// FROZEN one, so a product renamed since does not rewrite an old invoice.
export function invoiceLineName(state, o) {
  const qty = Number(o && o.qty) || 0;
  return `${qty} × ${orderLineName(state, o)}`;
}

// What one line was worth, at the price it was SOLD at. A line with no price at all
// counts as nothing rather than as a crash — the same reading `basketItems` takes.
export function invoiceLineAmount(state, o) {
  const price = orderLinePrice(state, o);
  return round2((Number(o && o.qty) || 0) * (price == null ? 0 : price));
}

// One order, as an invoice sheet. Everything the paper says, and nothing it does not.
//
// `from` is her mailing address, read from settings by the caller (this module holds
// no settings of its own, so it stays pure and testable).
export function invoiceSheet(state, group, { from = "", bakery = "", printed = "" } = {}) {
  const rows = (group && group.orders) || [];
  const first = rows[0] || {};
  const no = invoiceNumberOf(group) || nextInvoiceNo(state);
  const t = customerTotal(state, group);
  const cur = (state && state.settings && state.settings.currency) || "RM";

  const lines = rows.map((o) => ({
    what: invoiceLineName(state, o),
    amount: invoiceLineAmount(state, o),
  }));
  // The courier charge, when the CUSTOMER bears it. `customerTotal` already nets a
  // cash-on-delivery charge out of `courier`, so this is the same figure the
  // confirmation message states and never a second reading of the fee.
  if (t.courier > 0) lines.push({ what: "Courier", amount: t.courier });
  // The code, taken off. Drawn with `dir: "out"` because that is what prints the
  // minus in front of the figure on all four renderings — the sheet has one way of
  // saying "this much came off", and this is it.
  if (t.promo > 0) lines.push({ what: `Code ${t.promoCode}`, amount: t.promo, dir: "out" });

  return {
    title: `Invoice ${invoiceNoText(no)}`,
    // The date the order was PLACED, not today — a reprint is the same invoice and
    // must carry the same date as the first one.
    subtitle: `Order #${orderCode(first)} · ${longDate(first.orderDate || first.createdAt)}`,
    bakery,
    from,
    printed,
    lines,
    totals: [{ label: "Total", amount: t.total }],
    empty: "No items on this order.",
  };
}

// The currency an invoice is written in, so a caller never reaches into settings twice.
export function invoiceCurrency(state) {
  return (state && state.settings && state.settings.currency) || "RM";
}
