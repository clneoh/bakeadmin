// admin/js/receipt_slip.js — the small customer receipt for the 100 × 150 mm label printer.
//
// ⭐ WHY IT IS NOT THE INVOICE. ⚠️ An invoice is an A4 page of many lines; the GP-1326D is 104 mm wide, so
// sending the invoice to it clips the columns or shrinks the text to a smear. ⭐ This is a designed sticker:
// who, what, how much, how it was paid — the piece a customer takes away at a collection.
//
// ⚠️ The money comes from `customerTotal`, the SAME reader the confirmation, the invoice and the tracking card
// use — so the slip cannot disagree with the paper she already sent.

import { customerTotal } from "./courier.js";
import { methodLabel } from "./accounts.js";
import { orderDay } from "./profit.js";
import { receiptNoOfGroup } from "./receipts.js";
import { longDate } from "./dates.js";
import { orderDateOf } from "./customers.js";
import { refundDayOf } from "./money.js";
import { fmtRM, orderCode, orderLineName, orderLinePrice, round2 } from "./state.js";

// The whole sale, not the day's slice — the same family rule the invoice uses.
function familyOf(state, rows) {
  const first = rows[0] || null;
  const gid = first && first.groupId;
  if (!gid) return rows;
  const rest = (state.orders || []).filter((o) => o && o.groupId === gid && !rows.includes(o));
  return rest.length ? rows.concat(rest) : rows;
}

// Rows in the label printer's own vocabulary: `brand`/`code`/`customer` are centred and bold,
// `mail-line` is the left-aligned body. ⭐ A class the label layout does not know would silently take the
// default size, so this list uses only classes `label_pdf.js` defines.
export function receiptSlipRows(state, group) {
  const rows = (group && group.orders) || [];
  const first = rows[0];
  if (!first) return [];
  const family = familyOf(state, rows);
  const t = customerTotal(state, { orders: family });
  const bakery = String((state.settings && state.settings.storefront
    && state.settings.storefront.name) || "Jienluv2bake").trim();
  const day = orderDay(state, first);
  const placed = orderDateOf(first);
  const out = [["brand", bakery]];
  // ⭐ THE BAKERY'S OWN ADDRESS, the same one the invoice prints (v627) — a customer slip with a phone
  // number and a name but no address reads as a receipt from nowhere.
  const addressLines = String((state.settings && state.settings.mailingAddress) || "")
    .split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
  for (const line of addressLines) out.push(["note", line]);
  out.push(["meta", "RECEIPT"], ["code", `#${orderCode(first)}`]);
  // ⚠️⚠️ TWO DIFFERENT TRUE DATES, EACH LABELLED (v627). ⚠️ The invoice prints the day the order was PLACED;
  // this slip used to print the BAKE day with no label, so the two documents looked contradicting when both
  // were right. ⭐ Name both and there is nothing to reconcile.
  if (placed) out.push(["date", `Ordered ${longDate(placed)}`]);
  if (day) out.push(["date", `Bake day ${longDate(day)}`]);
  const name = String(first.customerName || "").trim();
  if (name) out.push(["customer", name]);

  for (const o of family) {
    const qty = Number(o.qty) || 0;
    const price = orderLinePrice(state, o);
    const amount = price == null ? "" : fmtRM(round2(price * qty));
    // ⚠️ THE SAME ORDER AS THE INVOICE (v627): quantity, then the name. Two documents for one sale should not
    // read the same line in two shapes.
    out.push(["mail-line", `${qty} × ${orderLineName(state, o)}${amount ? `   ${amount}` : ""}`]);
  }
  if (t.promo > 0) {
    out.push(["mail-line", `${String(t.promoCode || "Code").trim()} discount   -${fmtRM(t.promo)}`]);
  }
  if (t.coupon > 0) out.push(["mail-line", `Discount   -${fmtRM(t.coupon)}`]);
  if (t.courier > 0) out.push(["mail-line", `Delivery   ${fmtRM(t.courier)}`]);

  out.push(["customer", `TOTAL   ${fmtRM(t.total)}`]);
  out.push(["mail-line", first.paidReceived
    ? `Paid - ${methodLabel(first.paidMethod) || "received"}`
    : "Not yet paid"]);
  const no = receiptNoOfGroup(family);
  out.push(["mail-line", no ? `Receipt #${no}` : "No receipt number"]);
  // ⚠️⚠️ A CASH-ON-DELIVERY FEE IS NOT IN THE TOTAL — SAY SO (v627). ⚠️ The invoice has this sentence; the
  // small receipt did not, so a customer could hand over the driver's fee believing it was included.
  if (Number(t.cod) > 0) {
    out.push(["mail-line", `Courier ${fmtRM(t.cod)} paid to the driver (COD)`]);
  }
  // ⚠️ AND A REFUNDED SALE SAYS SO ON THE SMALL RECEIPT TOO (v627) — the invoice does; the slip a customer
  // keeps should not read like an unrefunded one. The TOTAL above stays the sale's own total, as on the invoice.
  const refunded = family.find((o) => o && o.refundedAt) || null;
  if (refunded) {
    const back = round2(Number(refunded.refundAmountRM) || 0);
    const day = refundDayOf({ orders: [refunded] }, state);
    const when = /^\d{4}-\d{2}-\d{2}$/.test(day) ? ` on ${longDate(day)}` : "";
    out.push(["mail-line", back > 0 ? `Refunded ${fmtRM(back)}${when}` : `Refunded${when}`]);
  }
  out.push(["mail-line", "Thank you"]);
  return out;
}
