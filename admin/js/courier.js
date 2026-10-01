// courier.js — the courier charge on an order (19 Sep 2026).
//
// A courier order costs money to send, and either the customer pays that or she
// does. Which of the two is the whole design, because they behave completely
// differently to her books:
//
//   • The customer bears it — the money arrives and leaves her purse in the same
//     breath, so her books never see either side of it. It is added to what the
//     customer owes and named where they can see it (their messages, their track
//     card), so a total that jumped by RM8 explains itself.
//   • She bears it — a real cost. It is written as an ORDINARY expense row under
//     "Delivery & fuel", the same way a shopping run writes one, so it reaches the
//     Money screen, every journal and the profit statement through machinery that
//     already exists.
//
// That split is hers, in so many words: "off profit only if I paid it". It is also
// why groupValue (money.js) counts product lines only and is NOT extended by this
// feature — a customer's charge that both comes in and goes out is not profit, and
// putting it in one side without the other would break her reconciliation.
//
// A customer-borne charge then splits again (19 Sep 2026), because it is not always
// paid the same way: "courier charges can be collect, that means customer pay courier
// upon collect". So it is either
//
//   • with the order — inside the total they are asked for, exactly as before, or
//   • COD — handed to the courier at the door, so it must stay OUT of that total or
//     the same RM8 is asked for twice, once by her and once by the courier.
//
// COD is her word for it, and Malaysia's: it is what EasyParcel, ABX, GDEX and DHL all
// call a parcel the receiver pays for. The key is written only when the CUSTOMER bears
// the charge — a charge she paid has nothing for anyone to collect at the door.
//
// Pure — no DOM, no fetch — so it runs under Node for tests.

import { newId, orderCode, orderLinePrice, fmtRM, groupOrders } from "./state.js";
import { todayISO } from "./dates.js";
import { methodLabel } from "./accounts.js";

// From her own chart of accounts, in her words: "delivery charges". The label IS
// the stored value, so it must match DEFAULT_CATEGORIES exactly.
export const COURIER_CATEGORY = "Delivery & fuel";

// The charge in ringgit, or 0. Absent is the house convention for "not recorded",
// and 0 is read as not recorded too, so a clears-the-box save needs no special case.
export function courierFeeOf(first) {
  const n = Number(first && first.courierFee);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Who bore the charge: "me", "customer", or "" for not recorded.
export function courierPayerOf(first) {
  const who = String((first && first.courierPaidBy) || "");
  return who === "customer" || who === "me" ? who : "";
}

// Is this order going by courier at all? (1 Oct 2026.)
//
// A charge only ever means something on an order a courier is carrying, and this is
// the ONE fact the three charge keys cannot supply on their own. Switching an order to
// self collect does NOT clear them — deliberately: she may switch back, and re-typing a
// fee is not something an app should ask of her — so the stored keys outlive the
// fulfilment they were recorded for.
//
// Every reader of the customer's money therefore asks this first. Without it a
// self-collect order still tagged its own row "Courier RM8.00 · customer" AND still
// added the charge to what the customer was asked for, in the confirmation, every
// WhatsApp message and the track card. Two of those were her reports on the same
// morning: "when i schange the courier delivery to self pickup, the courier chages tag
// still there" and "confirmation message still include courier charges".
//
// Strict, and that is the point: it reads the same way the row's own fulfilment tag has
// always read it (`first.fulfillment === "courier"`), so a charge and the tag beside it
// can never disagree about what the order is.
export function isCourierOrder(first) {
  return !!(first && first.fulfillment === "courier");
}

// Is this charge COD — handed to the courier at the door rather than paid with the
// order? (19 Sep 2026.)
//
// The whole charge is required, not just the flag, for the same reason the row tag
// needs both halves since v127: a lone courierCod on an order with no payer or no
// amount says nothing about who owes what, and reading it as COD would take a charge
// out of a total that never had one. Absent means "with the order" — the behaviour
// every charge recorded before this existed already had, so nothing changes meaning.
// It deliberately does NOT ask isCourierOrder, and that is the one place the two differ.
// This answers "is this charge settled at the door", which is a fact about the charge and
// stays true however the order leaves — while `customerCourierFee` below is the only
// reader that turns it into money, and that one does ask. Gating here instead would make
// the Edit form's COD box read OFF on a self-collect order, so the next Save would delete
// the tick as though she had unticked it, and switching the order back to a courier would
// not bring it back. The money is identical either way; only her record would differ.
export function courierCodOf(first) {
  return courierPayerOf(first) === "customer" && courierFeeOf(first) > 0
    && !!(first && first.courierCod === true);
}

// What the customer owes on top of the items. Nothing unless they bear it — a
// charge she pays is her own cost and must never turn up on their total. And nothing at
// all on an order that is not going by courier — see isCourierOrder.
export function customerCourierFee(first) {
  return !isCourierOrder(first) ? 0
    : courierPayerOf(first) === "customer" ? courierFeeOf(first) : 0;
}

// The customer's total, in its parts, so that everyone who shows it can show the
// addition instead of a figure that appears from nowhere: "show the add up for rm72"
// (19 Sep 2026). One source for the number the messages, the track card and the app
// all quote, which is what makes them agree.
//
// Three parts once a charge can be COD: `courier` is the part INSIDE the advance
// total, `cod` is the part paid to the courier at the door, and `total` — what they
// are asked for now — is items + courier. A COD charge must never reach `total`, or
// she asks for the RM8 and the courier asks for it again (19 Sep 2026).
//
// The items are counted at the price each line was SOLD at (orderLinePrice), exactly
// as groupValue counts her takings — the two differ only by the customer's charge.
export function customerTotal(state, group) {
  const orders = (group && group.orders) || [];
  const items = orders.reduce((sum, o) => {
    const price = orderLinePrice(state, o);
    return sum + (Number(o.qty) || 0) * (price == null ? 0 : price);
  }, 0);
  const charge = customerCourierFee(orders[0]);
  const cod = courierCodOf(orders[0]) ? charge : 0;
  const courier = charge - cod;
  return { items, courier, cod, total: items + courier };
}

// The money part of every message, in ONE place so the confirmation, the payment
// reminder and the shipped message cannot word the sum differently — "And it should be
// the same for APP" (19 Sep 2026). The caller prints each line on its own row; nothing
// here is tied to a screen. The customer's track card carries the same lines, worded in
// the storefront's own three languages, so the two can be read side by side.
//
// The subtotal is shown on EVERY order (v199, 25 Sep 2026), not only one that carries a
// charge. Her report was that a plain order went from the items straight to the Total, so
// the figure arrived from nowhere and there was nothing for the customer to add up. An
// order with no charge now reads Items total / Total — two lines that agree — rather than
// one figure standing on its own.
//
// The total is set off by a blank line and wrapped in SINGLE asterisks, which WhatsApp
// renders as bold (v199). Ordinary ASCII, so it cannot come back as the broken "empty
// boxes" emoji did on some phones, and the same characters are plain text in any client
// that does not render them.
//
// A COD charge says who is paid and when, in full words, because COD on its own
// usually means paying for the GOODS at the door — here the goods are already paid
// and only the charge is collected.
export function moneyLines(state, parts) {
  const cur = state.settings.currency;
  const out = [`Items total: ${fmtRM(parts.items, cur)}`];
  if (parts.courier || parts.cod) {
    out.push(parts.cod
      ? `Courier charge: ${fmtRM(parts.cod, cur)} - COD, pay the courier when your order reaches you`
      : `Courier charge: ${fmtRM(parts.courier, cur)}`);
  }
  out.push("");
  out.push(`*Total: ${fmtRM(parts.total, cur)}*`);
  return out;
}

// Record the charge on the books. Called on save from the Note / tracking pop-up,
// idempotently keyed on the order code so saving twice updates the same row rather
// than writing a second one, and so flipping the payer (or clearing the amount)
// takes the row back out.
//
// Returns what happened — "created" | "updated" | "removed" | "none" — which is
// what the tests assert on, and what keeps this honest about touching state.
export function applyCourierCharge(state, group, fee, paidBy, method) {
  const first = group && group.orders && group.orders[0];
  const code = first ? orderCode(first) : "";
  const amount = Number(fee) || 0;
  const expenses = state.expenses || (state.expenses = []);
  const at = expenses.findIndex((e) => e && e.courierFor && e.courierFor === code);
  const owed = !!code && paidBy === "me" && amount > 0;
  if (!owed) {
    if (at < 0) return "none";
    expenses.splice(at, 1);
    return "removed";
  }
  const kept = at < 0 ? null : expenses[at];
  const row = {
    id: kept ? kept.id : newId("exp"),
    // The day the money left, not the day she last corrected it — a charge edited
    // a week later still belongs to the week it was spent in.
    date: kept ? kept.date : todayISO(),
    amount,
    category: COURIER_CATEGORY,
    // The Money screen buckets every spend by how it moved, so this has to be a real
    // method from her list or the money would sit in no column at all.
    method: methodLabel(method) || "Cash",
    courierFor: code,
    note: "",
  };
  if (kept) expenses[at] = row;
  else expenses.push(row);
  return kept ? "updated" : "created";
}

// Put a charge onto the orders that carry it AND onto her books, in one call.
//
// The amount, the payer and COD settle TOGETHER. The payer is what decides what a charge
// does — to her books and to the customer — so an amount with no payer is not half a
// charge, it is a charge nobody has assigned, and leaving the amount behind is how a row
// ends up tagged "Courier RM8.00 · customer" with nothing able to remove the tag. That
// was her report on 19 Sep 2026. All three keys therefore go together, as a set.
//
// Extracted at v191 from the two doors that already wrote it by hand — the Note /
// tracking box and the full Edit form, whose own comments name this exact risk. The
// Delivery run is the third, and three hands writing one charge on one order is three
// chances for the order and her books to end up disagreeing about it.
//
// `rows` is passed rather than taken from the group, because the Edit form writes the
// charge onto the rows rebuilt for the destination day, which are not the group's own
// rows until the move happens.
export function writeCourierCharge(state, rows, group, answers) {
  const a = answers || {};
  const fee = Number(a.fee) || 0;
  const who = String(a.who || "");
  const collect = !!a.collect;
  for (const o of (Array.isArray(rows) ? rows : []).filter(Boolean)) {
    if (fee > 0) o.courierFee = fee;
    else delete o.courierFee;
    if (who) o.courierPaidBy = who;
    else delete o.courierPaidBy;
    if (collect) o.courierCod = true;
    else delete o.courierCod;
  }
  return applyCourierCharge(state, group, fee, who, a.method);
}

// One fee, split evenly over the customers on a run — worked out in CENTS, with the odd
// cents on the LAST order (v191).
//
// Cents, because the parts have to sum EXACTLY to the fee. RM 14.00 over three orders is
// 4.66 + 4.66 + 4.68; rounding each part on its own gives 4.67 three times, which is
// 14.01 — a cent that appears in the bakery's books and in no customer's charge box. The
// last order takes the remainder, so the parts add up to the whole by construction rather
// than by hope.
//
// A count of zero is an empty list rather than an error: nothing to split over is not a
// failure, it is nothing to do.
export function splitEven(total, count) {
  const n = Math.floor(Number(count) || 0);
  if (!(n > 0)) return [];
  const cents = Math.round((Number(total) || 0) * 100);
  const each = Math.trunc(cents / n);
  const out = new Array(n).fill(each);
  out[n - 1] = cents - each * (n - 1);
  return out.map((c) => c / 100);
}

// What each order on a run is charged, decided by WHO bears it (v192, 25 Sep 2026).
//
// Her rule, in her own words: "the benefit of consolidated charges, should go to merchant,
// not the customer. And if the courier charges were reveal to them, it will shown as the
// original cost." So the one-trip fee is NEVER split between the customers. A customer who
// bears the charge pays what their own doorstep would have cost sent ALONE — the original,
// un-consolidated price — and the difference between that and the one trip is hers. The
// delivery run asks the courier for those separate prices; choosing WHICH set of amounts
// each order carries is this function's job, and it is pure so it can be proved.
//
//   "customer" — the customers' own costs, one each. A list of the wrong length is NO
//     CHARGE rather than a guess: half a list of originals cannot be completed, and a
//     customer charged a figure nobody asked the courier for is worse than one charged
//     nothing at all.
//   "me" — the run's fee is HER cost, so it reaches her books apportioned across the
//     orders by splitEven, summing to the fee exactly. The customer is charged nothing
//     either way (customerCourierFee returns 0 for "me"), so this number is about her books
//     and never about what they are told.
//   anything else — no charge at all: no payer means no charge, the v127 rule.
export function runChargeAmounts(who, fee, originals, count) {
  const n = Math.floor(Number(count) || 0);
  if (!(n > 0)) return [];
  if (who === "customer") {
    const list = Array.isArray(originals) ? originals : [];
    if (list.length !== n) return [];
    return list.map((x) => Number(x) || 0);
  }
  if (who === "me") return splitEven(fee, n);
  return [];
}

// WHAT THE TRIP ACTUALLY COST, AGAINST THE CHARGE SHE PUT ON THE ORDER (v235, 29 Sep 2026).
//
// A charge is a price she DECIDED; a booked trip is what the journey really cost. They are
// two numbers about the same thing, and when they disagree the difference is hers — carried
// by her if the trip cost more, kept by her if it cost less. She asked to see both directions
// rather than only the alarming one: "it is good to see it. Real costing make aware, good for
// future promotion room if possible, i can even opt not to collect delivery."
//
// The Delivery run screen already makes this comparison BEFORE booking (see delivery_run.js's
// chargeSentence); this is its after-the-fact twin for a trip booked from one order, and it is
// worded in the same family so the two screens cannot say the same thing two ways.
//
// The arithmetic is the same whoever bears the charge, so it is worked out once here; only the
// MEANING of a difference depends on the payer, and that is the sentence's business (below).
//
// `orders` is every order riding this trip — a value set is one charge over several rows — so
// the charges are summed rather than read off the first. Returns null — rather than zeros —
// when there is no readable price to compare against: a card cannot report on a number the
// trip never gave, and a line about nothing is worse than no line.
//
// The price must be ABOVE zero, not merely finite. `Number(null)`, `Number("")` and
// `Number([])` are all 0 rather than NaN, so a `>= 0` guard would read a job with no amount
// at all as a trip that cost nothing — and print "the trip cost RM 0.00" as a fact about her
// money. A booked trip never costs nothing, so demanding a positive price is the honest test.
export function feeGapOf(orders, job) {
  const list = (Array.isArray(orders) ? orders : [orders]).filter(Boolean);
  if (!list.length) return null;
  const cost = Number(job && job.amount);
  if (!Number.isFinite(cost) || !(cost > 0)) return null;
  const cent = (n) => Math.round(n * 100) / 100;
  const charged = cent(list.reduce((sum, o) => sum + courierFeeOf(o), 0));
  return { charged, cost: cent(cost), diff: cent(charged - cost), payer: courierPayerOf(list[0]) };
}

// The one line the booked-trip card draws about that difference, or "" when there is nothing
// worth saying — the two figures agree, or there is no price. Her screen only: a difference
// between what a trip cost and what she charged is hers to absorb or learn from, and is never
// put in front of a customer (see the standing rule, 29 Sep 2026).
//
// What a difference MEANS depends on whether the money was ever coming in, so there are three
// readings behind the five sentences:
//
//   • no charge at all — the whole trip is her cost, which is exactly the free-delivery case
//     she named, so it is worth stating rather than staying silent;
//   • the customer bears it — money in, money out, so a shortfall comes out of her own purse
//     and a surplus stays with her;
//   • she bears it (or a charge with no payer, which the app refuses to save but older data
//     may carry) — it was always her cost, so the difference is only against what she allowed.
export function feeGapLine(orders, job, cur) {
  const gap = feeGapOf(orders, job);
  if (!gap) return "";
  const { charged, cost, diff, payer } = gap;
  const money = (n) => fmtRM(n, cur);
  if (!charged) {
    return `No courier charge is on the order, so the whole ${money(cost)} of this trip is your own cost.`;
  }
  if (diff === 0) return "";
  if (payer === "customer") {
    return diff < 0
      ? `The customer is charged ${money(charged)} and the trip cost ${money(cost)} — ${money(-diff)} short, so that much came out of your own pocket.`
      : `The customer is charged ${money(charged)} and the trip cost ${money(cost)} — ${money(diff)} under, and that difference stayed with you.`;
  }
  return diff < 0
    ? `You recorded ${money(charged)} as your own cost, and the trip cost ${money(cost)} — ${money(-diff)} more than you had allowed for.`
    : `You recorded ${money(charged)} as your own cost, and the trip cost ${money(cost)} — ${money(diff)} less than you had allowed for.`;
}

// Take a charge off the order it belongs to, found by its order code — the way back
// from the Money screen, where the expense row is all she can see of a charge she paid
// herself (19 Sep 2026).
//
// A charge she paid is ONE thing with two halves: the Delivery & fuel row in her books
// and the charge on the order. Deleting the row used to take only the books half, so the
// order still wore the tag and its box still showed the charge — and the next Save in
// that box quietly wrote the expense straight back. Now the row and the order go
// together, which is what makes the delete mean one thing.
//
// Returns the group it cleared, so the caller can republish that customer's track card
// (the card quotes the customer's total, which moves whenever a charge does), or null
// when no order carries that code.
export function clearCourierCharge(state, code) {
  const want = String(code || "");
  if (!want) return null;
  const group = groupOrders(state.orders || [])
    .find((g) => g.orders[0] && orderCode(g.orders[0]) === want);
  if (!group) return null;
  for (const o of group.orders) {
    delete o.courierFee;
    delete o.courierPaidBy;
    // COD goes with the other two: it is a flag on a charge, so it cannot outlive one.
    delete o.courierCod;
  }
  return group;
}
