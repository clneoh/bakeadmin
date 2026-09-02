// confirm.js — the WhatsApp confirmation sent when the baker confirms an order.
// Pure (no DOM, no fetch) so it runs under Node for tests. Builds the message
// text and the wa.me recipient; the caller opens WhatsApp.
//
// The message carries the baker's TNG QR (as a hosted image URL, which
// WhatsApp renders as an image in the chat) so the customer can scan and pay,
// and collects proof through the "send my payment receipt" flow. The QR is
// only added when a published tngQr URL is set.

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
  // The hosted image URL of the TNG payment QR. A bare URL line in the message
  // is what makes WhatsApp render the image in the chat so the customer can
  // scan it; skipped entirely when the baker hasn't published one.
  const qr = String(sf.tngQr || "").trim();

  let msg = `Hi ${first.customerName || ""}! Your order from ${bakery} is confirmed 🎉\n`;
  msg += `Order #${orderCode(first)}\n`;
  msg += `📅 ${date} · ${fulfillment}${address}\n`;
  msg += `🛍 ${items} — ${total}\n`;
  msg += `💰 Please pay by TNG QR before collection.\n`;
  if (qr) msg += `Your payment QR:\n${qr}\n`;
  // Matching the payment to the order needs the customer's phone number as the
  // TNG payment description, plus a receipt screenshot sent back in this chat.
  msg += `When paying, put your phone number${recipient ? ` (${recipient})` : ""} in the payment description.\n`;
  msg += `Then screenshot the receipt and send it back here — thank you!\n`;
  msg += `🔍 Track your order: ${trackUrl}`;
  return { recipient, message: msg };
}
