// messages.js — the WhatsApp messages the baker sends from later stages of the
// journey: the payment reminder (while an order is waiting on Paid), the pickup
// reminder (when an order is packed) and the shipped message (when a courier order
// is handed to the courier, carrying its tracking number). Pure (no DOM, no fetch)
// so they run under Node for tests. Like the confirmation, every message leads
// with the order code so the customer can always match it back to their order, and
// stays plain ASCII - emoji have come back as broken boxes on some phones.

import { byId, fmtRM, orderCode, orderLineName, waNumber } from "./state.js";
import { shortDate } from "./dates.js";
import { customerTotal, courierAddUp } from "./courier.js";

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
  const total = fmtRM(parts.total, state.settings.currency);
  const del = byId(state.deliveryDates, first.deliveryDateId);
  const date = del ? shortDate(del.date) : String(first.deliveryDate || "");
  const courier = first.fulfillment === "courier";
  const fulfillment = courier ? "Courier delivery" : "Self collect";
  const sf = (state.settings && state.settings.storefront) || {};
  const bakery = sf.name || "";
  const qr = String(sf.tngQr || "").trim();
  // The courier's tracking number she typed on the order. Kept as typed (a
  // pasted number may carry spaces or dashes) — it goes to the customer verbatim.
  const trackingNo = String(first.trackingNo || "").trim();
  // The charge lines, built by the one helper the confirmation uses too, so the two
  // messages word the charge identically. Empty when there is no charge at all.
  const addUp = courierAddUp(state, parts);
  return { first, recipient, items, total, date, courier, fulfillment, bakery, qr, trackUrl, trackingNo, addUp };
}

export function buildPaymentReminder(state, group, trackUrl) {
  const b = basics(state, group, trackUrl);
  if (!b || !b.recipient) return null;
  // Mirrors the confirmation's layout (greeting, then the order code on its own
  // line) so every WhatsApp message leads with the same scannable #CODE.
  let msg = `Hi ${b.first.customerName || ""}! A friendly reminder from ${b.bakery} about your order.\n`;
  msg += `Order #${orderCode(b.first)}\n`;
  msg += `Delivery: ${b.date} - ${b.fulfillment}\n`;
  msg += `Items: ${b.items}\n`;
  // Shown as its parts as well as the sum: the customer is being asked for money, and a
  // figure that is RM8 more than the items they chose has to say so — and show them the
  // RM8 (19 Sep 2026). A COD charge is named here too, but outside the total below.
  if (b.addUp.length) msg += `${b.addUp.join("\n")}\n`;
  msg += `Total: ${b.total}\n`;
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
  let msg = `Hi ${b.first.customerName || ""}! Your order from ${b.bakery} is on its way.\n`;
  msg += `Order #${orderCode(b.first)}\n`;
  msg += `Delivery: ${b.date} - Courier delivery\n`;
  msg += `Items: ${b.items}\n`;
  if (b.trackingNo) msg += `Tracking number: ${b.trackingNo}\n`;
  // The courier's charge, when the customer bears it — the same lines the track card
  // shows them, so the two never disagree (19 Sep 2026). The total follows it, because
  // a message that names a charge and then never says what the order now comes to
  // leaves the customer to do the arithmetic (19 Sep 2026).
  if (b.addUp.length) {
    msg += `${b.addUp.join("\n")}\n`;
    msg += `Total: ${b.total}\n`;
  }
  msg += `\nTrack your order: ${b.trackUrl}`;
  return { recipient: b.recipient, message: msg };
}

export function buildPickupReminder(state, group, trackUrl) {
  const b = basics(state, group, trackUrl);
  if (!b || !b.recipient) return null;
  let msg = `Hi ${b.first.customerName || ""}! Good news from ${b.bakery} - your order is ready.\n`;
  msg += `Order #${orderCode(b.first)}\n`;
  msg += b.courier
    ? `Packed and will be sent for delivery on ${b.date}.\n`
    : `Packed and ready for pickup on ${b.date}.\n`;
  msg += `\nTrack your order: ${b.trackUrl}`;
  return { recipient: b.recipient, message: msg };
}
