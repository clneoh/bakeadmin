// confirm.js — the WhatsApp confirmation sent when the baker confirms an order.
// Pure (no DOM, no fetch) so it runs under Node for tests. Builds the message
// text and the wa.me recipient; the caller opens WhatsApp.
//
// The message carries the TNG payment QR (a hosted image URL WhatsApp renders
// in the chat) so the customer can scan and pay, plus a tap-ready "send my
// payment receipt" link that opens WhatsApp to the bakery with the paid-for
// order pre-filled. Either part is skipped when the baker hasn't set it.

import { byId, fmtRM, orderCode, waNumber } from "./state.js";
import { shortDate } from "./dates.js";

// Returns { recipient, message }, or null when the group has no orders.
// `trackUrl` is the storefront track link (with ?track=CODE) for the message.
export function buildConfirmation(state, group, trackUrl) {
  const orders = (group && group.orders) || [];
  const first = orders[0];
  if (!first) return null;

  const recipient = waNumber(first.whatsapp);
  const items = orders.map((o) => {
    const p = byId(state.products, o.productId);
    return `${p ? p.name : "item"} ×${o.qty}`;
  }).join(", ");
  const total = fmtRM(orders.reduce((s, o) => {
    const p = byId(state.products, o.productId);
    return s + (Number(o.qty) || 0) * (p ? Number(p.price) || 0 : 0);
  }, 0), state.settings.currency);

  const del = byId(state.deliveryDates, first.deliveryDateId);
  const date = del ? shortDate(del.date) : String(first.deliveryDate || "");
  const courier = first.fulfillment === "courier";
  const fulfillment = courier ? "Courier delivery" : "Self collect";
  const address = courier && String(first.address || "").trim()
    ? `\n📍 ${String(first.address).trim()}` : "";

  const sf = (state.settings && state.settings.storefront) || {};
  const bakery = sf.name || "";
  // WhatsApp renders a picture for only the FIRST link in a message, so the QR
  // image URL must come before every other URL or it shows up as plain text.
  // The order summary leads (text only) so the facts stay at the top; the QR is
  // the first URL; the receipt + track links follow it as plain tappable links.
  const qr = String(sf.tngQr || "").trim();
  // The "send receipt" link opens WhatsApp to the bakery with a SHORT,
  // single-line note. Long pre-filled notes — or a second link buried inside —
  // are what WhatsApp truncates when the customer taps them, which is what
  // made the original message look like it fell apart. Matching the payment
  // only needs the order code and the attached receipt screenshot.
  const receiptMsg = `Hi! I paid order #${orderCode(first)} by TNG - my receipt:`;
  const recLine = sf.whatsapp
    ? `📲 Send my payment receipt: https://wa.me/${waNumber(sf.whatsapp)}?text=${encodeURIComponent(receiptMsg)}`
    : "";

  let msg = `Hi ${first.customerName || ""}! Your order from ${bakery} is confirmed 🎉\n`;
  msg += `Order #${orderCode(first)}\n`;
  msg += `📅 ${date} · ${fulfillment}${address}\n`;
  msg += `🛍 ${items} — ${total}\n`;
  msg += `\n💰 Please pay by TNG:\n`;
  // A bare image URL on its own line is what makes WhatsApp render the QR as a
  // single scannable picture. A label like "Your payment QR:" just makes the
  // URL show up as link text too, doubling the tap targets — so none here.
  if (qr) msg += `\n${qr}\n`;
  // Matching the payment to the order needs the customer's phone number as the
  // TNG payment description, plus a receipt screenshot sent back in this chat.
  msg += `When paying, put your phone number${recipient ? ` (${recipient})` : ""} in the payment description, screenshot the receipt, and send it here:\n`;
  if (recLine) msg += `${recLine}\n`;
  msg += `🔍 Track your order: ${trackUrl}`;
  return { recipient, message: msg };
}
