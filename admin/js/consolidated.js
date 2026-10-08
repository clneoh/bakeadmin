// consolidated.js — ONE document over a period (v372). Pure: no DOM, no storage.
//
// Her words: __"i need a month consolidated invoice printing page, selectable individual, daily,
// monthly"__ — and asked what one document should cover: __"per day, per week, per month, per
// customer as well"__.
//
// ★ AND IT IS AN **INVOICE**, WHICH IS NOT THE SAME NUMBER AS HER TAKINGS. `orderNet` — what the Money
// screen and Profit count — deliberately LEAVES OUT the courier charge, because that money is passed
// to the courier and was never hers. An invoice includes it, because the customer was billed it. So a
// document built on the takings figure would disagree with the sum of her OWN individual invoices by
// every courier charge on the page. **⟹ The money here is `customerTotal().total`, less anything given
// back** — the invoice's own figure, which is what `invoiceSheet` totals too.
//
// ⚠️ AND IT IS READ FROM `groupOrders`, NEVER FROM ROWS. A discount and a refund are facts about the
// WHOLE order, stamped on every one of its rows so a row read alone knows them — so anything that sums
// rows counts them once per item. That is the v370 trap, and it is why every loop below walks groups.

import { groupOrders, orderCode, orderLineName, orderLinePrice, round2, waNumber } from "./state.js";
import { addDays, longDate } from "./dates.js";
import { customerTotal } from "./courier.js";
import { isCollected, isRefunded, refundOf } from "./money.js";
import { orderDay, monthSpan } from "./profit.js";
import { weekStartISO } from "./weekly.js";
import { customerList, keyOf } from "./customers.js";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// ⚠️ EVERY PERIOD IS COUNTED BY THE BAKE DAY — the day the order is FOR. That is what an invoice is
// about (what she supplied), and it is the same basis Profit's month uses, so the two agree.
//
// ⚠️⚠️ THE WEEK IS THE SUNDAY ONE, AND THAT MATTERS. The app has TWO weeks: `weekStartISO` (Sunday —
// the window the Home tile names, "Week of Sun, 4 Oct") and `mondayAnchor` (Mon–Sun, which drives the
// delivery runs). Using the wrong one would make "week" mean two things on two screens.
export function periodSpan(kind, anchor) {
  const day = String(anchor || "").slice(0, 10);
  // ★ ALL OF IT (v373). Her words: __"pls add a selection ALL, on top of A DAy, A week, a month"__.
  // ⚠️ An empty `from`/`to` is not "a period from nothing to nothing" — `consolidatedSheet` reads
  // `kind === "all"` and skips the range test entirely. Giving it a SENTINEL range instead would
  // have been a second rule about what a date is, and the day the sentinel was wrong the document
  // would have gone quietly short.
  if (kind === "all") return { from: "", to: "", label: "Everything" };
  if (kind === "week") {
    const from = weekStartISO(day);
    const to = addDays(from, 6);
    return { from, to, label: `Week of ${longDate(from)} – ${longDate(to)}` };
  }
  if (kind === "month") {
    const y = Number(day.slice(0, 4));
    const m = Number(day.slice(5, 7)) - 1;
    const { from, to } = monthSpan(y, m);
    return { from, to, label: `${MONTHS[m]} ${y}` };
  }
  return { from: day, to: day, label: longDate(day) };
}

// ★★ THE DOCUMENT'S OWN REFERENCE (v374). Until this, the consolidated invoice carried NO number at all —
// every other thing she hands out has one (an order has a code, a receipt has a serial).
//
// ⚠️⚠️ IT IS DERIVED FROM THE SCOPE, NOT COUNTED, AND THAT IS THE WHOLE DESIGN. **Re-printing October's
// statement must carry the same reference.** A counter would make one statement into two different
// documents for the same money the second time she opened it — which is precisely what a numbered series
// exists to prevent.
//
// ⚠️ AND THE SCOPE IS NAMED IN IT, because two real collisions were found before it shipped:
//   • `weekStartISO` is the SUNDAY, so a DAY invoice for that Sunday and the WEEK invoice for that week
//     both came out "CI-2026-10-04" — the same number for two different documents, one day in seven.
//   • a customer keyed by NAME (no number) fell back to the month's all-customer reference.
// Naming the scope fixes the first; the second is fixed by every customer-scoped document carrying a
// suffix, so it can never equal a whole-scope one.
export function invoiceRef(kind, span, customerKey = "") {
  const scope = { all: "ALL", day: "DAY", week: "WEEK", month: "MONTH" }[kind] || "ALL";
  const period = kind === "all" ? "" : kind === "month" ? String(span.from).slice(0, 7) : String(span.from);
  const who = customerKey ? `-${refSuffix(customerKey)}` : "";
  return ["CI", scope, period].filter(Boolean).join("-") + who;
}

// A short, stable, non-secret tag for one person — the same key always gives the same six characters, so
// the reference is reproducible without putting a phone number on the document.
function refSuffix(key) {
  let h = 0;
  const s = String(key || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(-6).padStart(6, "0");
}

// The line under an order: what was in it, named as the order FROZE it, so a product she has since
// renamed or deleted still reads as what was actually sold.
function itemsLine(state, group) {
  return (group.orders || []).map((o) => {
    const qty = Number(o.qty) || 0;
    const name = orderLineName(state, o);
    // ⚠️ NOT "× 0" AND NOT A SILENT ZERO. A line nothing can price says so, the way Profit's own
    // journal does — a confident RM 0.00 beside a loaf is a figure that lies quietly.
    const priced = orderLinePrice(state, o) != null;
    return `${name}${qty > 1 ? ` ×${qty}` : ""}${priced ? "" : " (no price)"}`;
  }).join(", ");
}

// What one order is on this document: the invoice's own figure, less what went back.
export function orderInvoice(state, group) {
  return round2(Math.max(0, customerTotal(state, group).total - refundOf(state, group)));
}

// The whole document, as the object `journalSheet` wants.
//
// `kind` is "day" | "week" | "month"; `anchor` is any ISO date inside the period you want; and
// `customerKey` is a `keyOf` value to keep to ONE customer, or "" for everybody.
export function consolidatedSheet(state, { kind = "month", anchor = "", customerKey = "" } = {}) {
  const cur = (state.settings && state.settings.currency) || "RM";
  const span = periodSpan(kind, anchor);
  const byKey = new Map(customerList(state).map((r) => [r._key, r]));

  const mine = [];
  for (const g of groupOrders(state.orders || [])) {
    const first = (g.orders || [])[0];
    if (!first) continue;
    if (customerKey && keyOf(first) !== customerKey) continue;
    mine.push(g);
  }

  let noDay = 0;
  let refundedOut = 0;
  const keep = [];
  for (const g of mine) {
    const first = (g.orders || [])[0];
    // ⚠️ AN ORDER WITH NO BAKE DAY IS COUNTED AND SAID, never merely dropped. It resolves to "" and
    // would otherwise leave the page in silence — a document that is quietly short is worse than one
    // that says what it left out.
    const day = orderDay(state, first);
    if (!day) { noDay += 1; continue; }
    // ⚠️ "Everything" has no window to fall outside of — the range is skipped rather than widened,
    // so an order can never be left out of the one scope that means ALL of it.
    if (kind !== "all" && (day < span.from || day > span.to)) continue;
    // A sale refunded IN FULL is off the invoice entirely; it is counted below and said in the note.
    //
    // ⚠️⚠️ AND **ONLY A REFUND** EARNS THAT SKIP — never a zero. An order whose product carries no
    // price is worth nothing to add up, but it is still an order she supplied, and it must stay on the
    // page MARKED "no price" rather than vanishing from it. This is the same trap that cost a
    // regression in v370 (`refundedInFull`, money.js), and it was caught here by a test that asked
    // for the marking rather than for the total.
    if (orderInvoice(state, g) <= 0 && isRefunded(g)) { refundedOut += 1; continue; }
    keep.push(g);
  }

  // Bucketed by the person on the order. ⚠️ A WALK-IN WITH NO NAME AND NO NUMBER KEYS TO ITS OWN
  // ORDER ID (`keyOf`), so grouping by that key alone would give every nameless order a heading of
  // its own — a page of one-line "customers". They share ONE bucket instead.
  const buckets = new Map();
  for (const g of keep) {
    const first = (g.orders || [])[0];
    const row = byKey.get(keyOf(first));
    const name = row && row.name && row.name !== "(no name)" ? row.name : "";
    const shown = name || waNumber(first.whatsapp);
    const key = shown ? keyOf(first) : "__unnamed__";
    if (!buckets.has(key)) buckets.set(key, { label: shown || "No name", groups: [] });
    buckets.get(key).groups.push(g);
  }

  const lines = [];
  let total = 0;
  let owed = 0;
  const many = buckets.size > 1;

  for (const b of buckets.values()) {
    b.groups.sort((a, z) => String(orderDay(state, a.orders[0])).localeCompare(String(orderDay(state, z.orders[0]))));
    // A heading is only worth drawing when there is more than one person on the page — a heading over
    // the only list says nothing, and a subtotal that equals the total reads as a mistake.
    if (many) lines.push({ what: b.label.toUpperCase(), heading: true });
    let sub = 0;
    for (const g of b.groups) {
      const first = (g.orders || [])[0];
      const amount = orderInvoice(state, g);
      sub = round2(sub + amount);
      total = round2(total + amount);
      if (!isCollected(g)) owed = round2(owed + amount);
      lines.push({
        what: `${shortDay(orderDay(state, first))}  #${orderCode(first)}  ${itemsLine(state, g)}`,
        amount,
      });
    }
    if (many) lines.push({ what: `${b.label} subtotal`, amount: sub, cls: "pl-total" });
  }

  const said = [];
  if (!keep.length) {
    said.push(customerKey
      ? `This customer has nothing${kind === "all" ? " yet" : " in this period"}.`
      : kind === "all" ? "Nothing has been sold yet." : "Nothing was sold in this period.");
  } else {
    said.push(`Every order is listed on the day it is FOR — the bake day.`);
    if (owed > 0) said.push(`Still to collect from these orders: ${cur} ${owed.toFixed(2)}.`);
    else said.push("Every order in this period has been paid.");
  }
  if (refundedOut) {
    said.push(`${refundedOut} order${refundedOut === 1 ? " was" : "s were"} refunded in full and ${refundedOut === 1 ? "is" : "are"} not listed above.`);
  }
  if (noDay) {
    // ⚠️ WORDED FOR EVERY SCOPE, "Everything" INCLUDED. "cannot belong to any period" read oddly on
    // the one scope that is not a period at all.
    said.push(`${noDay} order${noDay === 1 ? " has" : "s have"} no bake day on ${noDay === 1 ? "it" : "them"} and ${noDay === 1 ? "is" : "are"} not listed — give ${noDay === 1 ? "it" : "them"} a day and ${noDay === 1 ? "it" : "they"} will appear here.`);
  }

  // The document's own number, worked out once so the field and the subtitle cannot disagree.
  const ref = invoiceRef(kind, span, customerKey);

  return {
    // The window itself, so the screen's stepper and its heading are the SAME answer as the
    // document's own subtitle rather than a second call that could be given different inputs.
    span,
    // ⚠️ THE REFERENCE LEADS THE SUBTITLE, which is the one line drawn on the screen, on the paper, in
    // the shared text AND in the PDF — so the document number is on every copy of it or on none.
    ref,
    title: "Consolidated invoice",
    subtitle: [
      ref,
      kind === "all" ? "" : span.label,
      customerKey ? byKey.get(customerKey)?.name || "One customer" : "all customers",
      "by bake day",
    ].filter(Boolean).join(" · "),
    lines,
    totals: keep.length
      ? [{ label: `Total — ${span.label}`, amount: total }]
      : [],
    // ⚠️ "Pick another period" is nonsense on the scope that is not a period — and this is the one
    // sentence a screen with nothing on it has to say for itself.
    empty: customerKey
      ? `This customer has nothing${kind === "all" ? " yet" : " in this period"}.`
      : kind === "all"
        ? "Nothing has been sold yet."
        : "Nothing was sold in this period. Pick another period.",
    note: said.join(" "),
  };
}

// "2 Oct" — a document wants the day, not the year, because the period names it.
const shortDay = (iso) => longDate(String(iso || "").slice(0, 10)).replace(/,? \d{4}$/, "");
