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

// Is this charge COD — handed to the courier at the door rather than paid with the
// order? (19 Sep 2026.)
//
// The whole charge is required, not just the flag, for the same reason the row tag
// needs both halves since v127: a lone courierCod on an order with no payer or no
// amount says nothing about who owes what, and reading it as COD would take a charge
// out of a total that never had one. Absent means "with the order" — the behaviour
// every charge recorded before this existed already had, so nothing changes meaning.
export function courierCodOf(first) {
  return courierPayerOf(first) === "customer" && courierFeeOf(first) > 0
    && !!(first && first.courierCod === true);
}

// What the customer owes on top of the items. Nothing unless they bear it — a
// charge she pays is her own cost and must never turn up on their total.
export function customerCourierFee(first) {
  return courierPayerOf(first) === "customer" ? courierFeeOf(first) : 0;
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

// The lines that name the charge and the sum it reaches, in ONE place so the
// confirmation, the payment reminder and the shipped message cannot word it
// differently — "And it should be the same for APP" (19 Sep 2026). The caller prints
// each line on its own row; nothing here is tied to a screen.
//
// A COD charge says who is paid and when, in full words, because COD on its own
// usually means paying for the GOODS at the door — here the goods are already paid
// and only the charge is collected.
export function courierAddUp(state, parts) {
  const cur = state.settings.currency;
  if (!parts.courier && !parts.cod) return [];
  const charge = parts.cod
    ? `Courier charge: ${fmtRM(parts.cod, cur)} - COD, pay the courier when your order reaches you`
    : `Courier charge: ${fmtRM(parts.courier, cur)}`;
  return [`Items total: ${fmtRM(parts.items, cur)}`, charge];
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
