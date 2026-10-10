// messages.js — the WhatsApp messages the baker sends from later stages of the
// journey: the payment reminder (while an order is waiting on Paid), the pickup
// reminder (when an order is packed) and the shipped message (when a courier order
// is handed to the courier, carrying its tracking number). Pure (no DOM, no fetch)
// so they run under Node for tests. Like the confirmation, every message leads
// with the order code so the customer can always match it back to their order, and
// stays plain ASCII - emoji have come back as broken boxes on some phones.

import { byId, orderCode, orderLineName, waNumber } from "./state.js";
import { shortDate } from "./dates.js";
import { customerTotal, moneyLines } from "./courier.js";
import { fulfillmentText, orderPointName } from "./points.js";
import { courierDayOf, dayLine, promisedWindowSuffix, trackingLine, vanLine } from "./courier_job.js";

// The opening line, in the voice she chose on Settings (2 Oct 2026). WhatsApp
// carries no fonts at all — the letters always come from the customer's own phone
// — so the only lever over how her words land is its four marks, and a pair of
// underscores drawn as italics is the whole of this choice. It lives here, in the
// one file every message builder already shares, so the confirmation, the payment
// reminder, "on its way" and "ready" cannot lean over differently from each other.
//
// "plain" returns the line untouched, so a bakery that never opens the setting
// sends byte for byte what it sent before this existed. The marks go TIGHT against
// the words: a space inside the pair leaves the underscores showing as literal
// characters on some phones.
export function greeting(state, line) {
  const style = (state && state.settings && state.settings.messageStyle) || "plain";
  return style === "greeting" ? `_${line}_` : line;
}

function basics(state, group, trackUrl) {
  const orders = (group && group.orders) || [];
  const first = orders[0];
  if (!first) return null;
  const recipient = waNumber(first.whatsapp);
  // Same rule as the confirmation: quote the sale, not today's prices.
  const items = orders.map((o) => {
    const name = orderLineName(state, o);
    return `${name === "(deleted product)" ? "item" : name} x${o.qty}`;
  }).join(", ");
  // The customer's total, in its parts: what they were sold, plus the courier's charge
  // when THEY bear it — a charge the baker pays is her own cost and never reaches this
  // number. One helper shared with the confirmation and the track card, so the three
  // cannot quote different figures (19 Sep 2026). A COD charge is deliberately NOT in
  // the total — the courier takes it at the door (19 Sep 2026).
  const parts = customerTotal(state, group);
  const del = byId(state.deliveryDates, first.deliveryDateId);
  // The day, and the window the van will come in when the order is on a consolidated run
  // (v191). Every message below quotes THIS one string, so the window appears in the
  // payment reminder, the shipped message and the pickup message at once and none of them
  // can word the promise differently from the others. promisedWindowSuffix is the publishing gate
  // and answers "" for a window that could not be typed, so a half-filled promise cannot
  // be sent to a customer.
  // ⚠️ THE LABEL AND THE WINDOW COME FROM `dayLine` (v337). A courier order's day is its BAKE
  // day and its window is the VAN's, so they are not the same day and must not share a line —
  // see the helper for the customer who asked whether it was Wednesday or Thursday.
  const day = dayLine(state, first);
  const date = `${del ? shortDate(del.date) : String(first.deliveryDate || "")}${day.window}`;
  const courier = first.fulfillment === "courier";
  // The same ONE wording the confirmation uses (v299), so the four messages and the
  // confirmation cannot tell a customer two different things about where to go.
  const fulfillment = fulfillmentText(state, first);
  const sf = (state.settings && state.settings.storefront) || {};
  const bakery = sf.name || "";
  const qr = String(sf.tngQr || "").trim();
  // The courier's tracking number she typed on the order. Kept as typed (a
  // pasted number may carry spaces or dashes) — it goes to the customer verbatim.
  const trackingNo = String(first.trackingNo || "").trim();
  // The money block — the subtotal, the charge when there is one, and the bold total —
  // built by the one helper the confirmation uses too, so the messages word it
  // identically. Never empty: the subtotal and the total are on every order (v199).
  const money = moneyLines(state, parts);
  return { first, recipient, items, date, day, courier, fulfillment, bakery, qr, trackUrl, trackingNo, money };
}

export function buildPaymentReminder(state, group, trackUrl) {
  const b = basics(state, group, trackUrl);
  if (!b || !b.recipient) return null;
  // Mirrors the confirmation's layout (greeting, then the order code on its own
  // line) so every WhatsApp message leads with the same scannable #CODE.
  let msg = `${greeting(state, `Hi ${b.first.customerName || ""}! A friendly reminder from ${b.bakery} about your order.`)}\n`;
  msg += `Order #${orderCode(b.first)}\n`;
  msg += `${b.day.label}: ${b.date} - ${b.fulfillment}\n`;
  msg += vanLine(b.day, b.first);
  msg += `Items: ${b.items}\n`;
  // Shown as its parts as well as the sum: the customer is being asked for money, and a
  // figure that is RM8 more than the items they chose has to say so — and show them the
  // RM8 (19 Sep 2026). A COD charge is named here too, but outside the total below.
  msg += `${b.money.join("\n")}\n`;
  if (b.qr) {
    msg += `\nPay by TNG using the QR below:\n\n${b.qr}\n`;
    msg += `\nWhen you pay, put your phone number (${b.recipient}) in the payment description.\n`;
  } else {
    msg += `\nWhen you've paid by TNG, send the receipt screenshot here so we can confirm your order.\n`;
  }
  msg += `Already paid? Please ignore this message.\n`;
  msg += `Track your order: ${b.trackUrl}`;
  return { recipient: b.recipient, message: msg };
}

// "It's on its way" — sent when a courier order goes to the courier, carrying the
// tracking number she typed (15 Sep 2026). Courier orders only: a self-collect
// order is not shipped, and its "ready" moment is the pickup reminder above.
// Without a number the line is left out rather than printed empty — the message
// still tells the customer their order has gone.
export function buildShippedMessage(state, group, trackUrl) {
  const b = basics(state, group, trackUrl);
  if (!b || !b.recipient) return null;
  let msg = `${greeting(state, `Hi ${b.first.customerName || ""}! Your order from ${b.bakery} is on its way.`)}\n`;
  msg += `Order #${orderCode(b.first)}\n`;
  msg += `${b.day.label}: ${b.date} - Courier delivery\n`;
  msg += vanLine(b.day, b.first);
  msg += `Items: ${b.items}\n`;
  // One slot, two kinds of thing. A number she typed reads "Tracking number"; the
  // share link a booked trip came back with reads "Track your delivery", because it
  // is a page the customer opens rather than digits they read out (v189).
  const track = trackingLine(b.trackingNo);
  if (track) msg += `${track}\n`;
  // The courier's charge, when the customer bears it — the same lines the track card
  // shows them, so the two never disagree (19 Sep 2026). The total follows it, because
  // a message that names a charge and then never says what the order now comes to
  // leaves the customer to do the arithmetic (19 Sep 2026).
  //
  // This used to be skipped entirely on an order with no charge, so a courier order the
  // customer paid nothing extra for carried no total at all while the payment reminder
  // carried one (v199, 25 Sep 2026). Every message that names money now names the sum
  // the same way.
  msg += `${b.money.join("\n")}\n`;
  msg += `\nTrack your order: ${b.trackUrl}`;
  return { recipient: b.recipient, message: msg };
}

export function buildPickupReminder(state, group, trackUrl) {
  const b = basics(state, group, trackUrl);
  if (!b || !b.recipient) return null;
  let msg = `${greeting(state, `Hi ${b.first.customerName || ""}! Good news from ${b.bakery} - your order is ready.`)}\n`;
  msg += `Order #${orderCode(b.first)}\n`;
  // ★ AND WHERE TO COLLECT IT (v304). This line said "ready for pickup" and named no place at
  // all, so a customer collecting at a Point was told their order was ready and never where to
  // go — while the confirmation, the payment reminder and the shipped message all named it. v299
  // claimed all four later messages named the Point; three of them did, and this one did not.
  //
  // The place comes from HER OWN record, frozen onto the order when it was taken, and the KITCHEN
  // keeps the word it has always had — "ready for pickup" IS the kitchen, and it needs no name.
  // ⚠️ **NO COURIER BRANCH HERE ANY MORE (v344).** One lived here — *"Packed and will be sent for delivery
  // on <the BAKE day>"* — and it had been **UNREACHABLE since v340**, when the row stopped offering this
  // reminder to a courier order: a courier customer is told nothing at Packed, because nothing has left the
  // kitchen, and the message that IS theirs lives at Collected / Shipped. **It also named the bake day,
  // which is the very thing v337-v343 spent the day removing from every other surface** — so it is deleted
  // rather than left in place as a trap for whoever reads this file next.
  const place = orderPointName(state, b.first);
  // ★★ AND IT IS THE DAY THE BREAD IS ACTUALLY THERE (v429).
  //
  // ⚠️⚠️ **A POINT ORDER CAN CARRY A COURIER DAY** — the Delivery run writes one when the van is
  // booked — so a run that reaches the Point **the morning after the bake** was telling the customer
  // to collect on the wrong day. ⭐ **That is a customer standing outside a shop that has no bread**,
  // and it is the most serious of this version's faults: the rest are a word on a screen or a label.
  // ⚠️ The bake day remains the FALLBACK, which is exactly right for every order collected straight
  // from the kitchen — and for the common case, a Point order whose run day she has not booked yet,
  // **this message is byte-for-byte what it was.**
  const vanDay = courierDayOf(b.first);
  const readyOn = vanDay ? shortDate(vanDay) : b.date;
  msg += place
    ? `Packed and ready to collect from ${place} on ${readyOn}.\n`
    : `Packed and ready for pickup on ${readyOn}.\n`;
  msg += `\nTrack your order: ${b.trackUrl}`;
  return { recipient: b.recipient, message: msg };
}
