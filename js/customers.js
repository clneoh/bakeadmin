// customers.js — build the customer / marketing list from order history.
// Pure module: no DOM, runs under Node for tests.

// The delivery date for an order. New orders snapshot their delivery date, so
// history survives a delivery date being deleted; older orders fall back to
// resolving the date via deliveryDateId.
export function deliveryDateOf(state, o) {
  if (o.deliveryDate) return o.deliveryDate;
  const del = state.deliveryDates.find((d) => d.id === o.deliveryDateId);
  return del ? del.date : "";
}

// The date the order was placed/recorded. New orders snapshot orderDate;
// older orders fall back to the createdAt timestamp's date.
export function orderDateOf(o) {
  if (o.orderDate) return o.orderDate;
  if (o.createdAt) return String(o.createdAt).slice(0, 10);
  return "";
}

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

// Aggregate orders into one row per customer. A customer is keyed by WhatsApp
// number when present (same number = same person, even under a different
// name), else by name. sort ∈ recent | name | orders | units | phone.
export function customerList(state, sort = "recent") {
  const map = new Map();
  for (const o of state.orders) {
    const key = norm(o.whatsapp) || norm(o.customerName) || o.id;
    let row = map.get(key);
    if (!row) {
      row = {
        name: (o.customerName || "").trim() || "(no name)",
        whatsapp: (o.whatsapp || "").trim(),
        orders: 0,
        units: 0,
        last: "",       // most recent delivery date
        lastOrdered: "", // most recent order date
      };
      map.set(key, row);
    }
    row.orders += 1;
    row.units += Number(o.qty) || 0;
    const d = deliveryDateOf(state, o);
    const od = orderDateOf(o);
    if (d && (!row.last || d > row.last)) row.last = d;
    if (od && (!row.lastOrdered || od > row.lastOrdered)) row.lastOrdered = od;
  }

  const rows = [...map.values()];
  const byRecent = (a, b) => (b.lastOrdered || "").localeCompare(a.lastOrdered || "") || (b.last || "").localeCompare(a.last || "");
  switch (sort) {
    case "name":
      rows.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "orders":
      rows.sort((a, b) => b.orders - a.orders || byRecent(a, b));
      break;
    case "units":
      rows.sort((a, b) => b.units - a.units || byRecent(a, b));
      break;
    case "phone":
      rows.sort((a, b) => (b.whatsapp ? 1 : 0) - (a.whatsapp ? 1 : 0) || byRecent(a, b));
      break;
    default: // recent
      rows.sort(byRecent);
  }
  return rows;
}
