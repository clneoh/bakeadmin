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
// Pure — no DOM, no fetch — so it runs under Node for tests.

import { newId, orderCode, orderLinePrice } from "./state.js";
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

// What the customer owes on top of the items. Nothing unless they bear it — a
// charge she pays is her own cost and must never turn up on their total.
export function customerCourierFee(first) {
  return courierPayerOf(first) === "customer" ? courierFeeOf(first) : 0;
}

// The customer's total, in its two parts, so that everyone who shows it can show the
// addition instead of a figure that appears from nowhere: "show the add up for rm72"
// (19 Sep 2026). One source for the number the messages, the track card and the app
// all quote, which is what makes them agree.
//
// The items are counted at the price each line was SOLD at (orderLinePrice), exactly
// as groupValue counts her takings — the two differ only by the customer's charge.
export function customerTotal(state, group) {
  const orders = (group && group.orders) || [];
  const items = orders.reduce((sum, o) => {
    const price = orderLinePrice(state, o);
    return sum + (Number(o.qty) || 0) * (price == null ? 0 : price);
  }, 0);
  const courier = customerCourierFee(orders[0]);
  return { items, courier, total: items + courier };
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
