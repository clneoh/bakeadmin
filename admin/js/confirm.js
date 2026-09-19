// confirm.js — the WhatsApp confirmation sent when the baker confirms an order.
// Pure (no DOM, no fetch) so it runs under Node for tests. Builds the message
// text and the wa.me recipient; the caller opens WhatsApp.
//
// The message leads with the order facts and shows the TNG payment QR (a
// hosted image URL that WhatsApp renders in the chat - it MUST be the first
// link in the message, or WhatsApp shows it as plain text). It then tells the
// customer to reply in THIS SAME CHAT with the receipt. Deliberately no
// tap-through "send receipt" deep link: opening one inside the chat makes
// WhatsApp jump away and the original message look truncated. Plain ASCII text
// only - emoji have come back as broken "empty boxes" on some phones. The QR
// is skipped when the baker hasn't set one.

import { byId, fmtRM, orderCode, orderLineName, waNumber } from "./state.js";
import { shortDate } from "./dates.js";
import { customerTotal } from "./courier.js";

// Returns { recipient, message }, or null when the group has no orders.
// `trackUrl` is the storefront track link (with ?track=CODE) for the message.
export function buildConfirmation(state, group, trackUrl) {
  const orders = (group && group.orders) || [];
  const first = orders[0];
  if (!first) return null;

  const recipient = waNumber(first.whatsapp);
  // The confirmation quotes what the customer is actually being charged: the
  // name and price each line was sold at, not today's menu.
  const items = orders.map((o) => {
    const name = orderLineName(state, o);
    return `${name === "(deleted product)" ? "item" : name} x${o.qty}`;
  }).join(", ");
  // The customer's total, in its two parts. This is the message that first asks them
  // for money, so a charge missing from this Total is the one they would pay against
  // and every later message would then contradict (19 Sep 2026). When there IS a
  // charge the parts are shown as well as the sum — the customer should be able to add
  // the figure up themselves rather than take it on trust (19 Sep 2026).
  const { items: itemsTotal, courier: courierFee, total: totalNum } = customerTotal(state, group);
  const cur = state.settings.currency;
  const total = fmtRM(totalNum, cur);

  const del = byId(state.deliveryDates, first.deliveryDateId);
  const date = del ? shortDate(del.date) : String(first.deliveryDate || "");
  const courier = first.fulfillment === "courier";
  const fulfillment = courier ? "Courier delivery" : "Self collect";
  const address = courier && String(first.address || "").trim()
    ? `\nAddress: ${String(first.address).trim()}` : "";

  const sf = (state.settings && state.settings.storefront) || {};
  const bakery = sf.name || "";
  const qr = String(sf.tngQr || "").trim();

  let msg = `Hi ${first.customerName || ""}! Your order from ${bakery} is confirmed.\n`;
  msg += `Order #${orderCode(first)}\n`;
  msg += `Delivery: ${date} - ${fulfillment}${address}\n`;
  msg += `Items: ${items}\n`;
  // With a charge on top, the sum is shown as its two parts as well as the total, so the
  // customer can add RM72 up themselves rather than take it on trust — "the message need
  // to show the add up for rm72" (19 Sep 2026). No charge, and this message is unchanged.
  if (courierFee) {
    msg += `Items total: ${fmtRM(itemsTotal, cur)}\n`;
    msg += `Courier charge: ${fmtRM(courierFee, cur)}\n`;
  }
  msg += `Total: ${total}\n`;
  msg += `\nPay by TNG using the QR below:\n`;
  // A bare image URL on its own line is what makes WhatsApp render the QR as a
  // single scannable picture, and it must stay the FIRST link in the message
  // (WhatsApp pictures only the first link). No label line - a label would add
  // a second, unwanted tap target.
  if (qr) msg += `\n${qr}\n`;
  // Matching the payment to the order needs the customer's phone number as the
  // TNG payment description, plus the receipt screenshot sent back in THIS
  // chat. No tap-through link: staying in the chat keeps the order details in
  // front of the customer, so nothing ever jumps away or looks truncated.
  msg += `\nWhen you pay, put your phone number${recipient ? ` (${recipient})` : ""} in the payment description.\n`;
  msg += `Then send your TNG receipt screenshot here as a photo - thank you!\n`;
  msg += `Track your order: ${trackUrl}`;
  return { recipient, message: msg };
}
