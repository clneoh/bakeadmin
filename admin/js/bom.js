// bom.js — BOM explosion, cost calculation, capacity.
// Pure module: no DOM, no localStorage. Runs under Node for tests.
// The core value of the app: sum(order qty × recipe qty) per ingredient.

import { byId, round2 } from "./state.js";

export function explodeBom(state, deliveryDateId) {
  const warnings = [];
  const orders = state.orders.filter((o) => o.deliveryDateId === deliveryDateId);
  const acc = new Map();
  let totalUnits = 0;

  for (const order of orders) {
    const product = byId(state.products, order.productId);
    if (!product) {
      warnings.push(`Order for a deleted product (${order.qty} pcs) was skipped.`);
      continue;
    }
    if (!Array.isArray(product.recipe)) continue;
    totalUnits += order.qty;
    for (const line of product.recipe) {
      let it = acc.get(line.ingredientId);
      if (!it) {
        const ing = byId(state.ingredients, line.ingredientId);
        it = {
          ingredientId: line.ingredientId,
          ingredientName: ing ? ing.name : "(deleted ingredient)",
          unit: line.unit,
          costPerUnit: ing ? ing.costPerUnit || 0 : 0,
          totalQty: 0,
          estCost: 0,
          unitsOk: true,
          lines: [],
        };
        acc.set(line.ingredientId, it);
      }
      it.totalQty += order.qty * line.qty;
      it.unitsOk = it.unitsOk && line.unit === it.unit;
      it.lines.push({
        productName: product.name,
        orderQty: order.qty,
        perUnitQty: line.qty,
      });
    }
  }

  const items = [...acc.values()].map((it) => {
    it.estCost = round2(it.totalQty * it.costPerUnit);
    return it;
  });
  items.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

  const productLines = aggregateByProduct(orders, state.products);

  return { items, orders, totalUnits, productLines, warnings };
}

function aggregateByProduct(orders, products) {
  const map = new Map();
  for (const o of orders) {
    const p = byId(products, o.productId);
    if (!p) continue;
    map.set(p.id, { productId: p.id, productName: p.name, qty: (map.get(p.id)?.qty || 0) + o.qty });
  }
  return [...map.values()];
}

// Daily capacity per product (product.limit), summed across active products.
// Returns 0 when no product has a limit set — callers then fall back to the
// legacy single-per-day capacity.
export function productCapacity(state) {
  const active = state.products.filter((p) => p.active !== false);
  const limits = active.map((p) => Number(p.limit) || 0);
  return limits.some((n) => n > 0) ? limits.reduce((a, b) => a + b, 0) : 0;
}

// A day's capacity. Product daily limits sum first (e.g. 12 focaccia + 12
// sandwiches = 24); otherwise the default capacity.
export function dayCapacity(state) {
  const byProducts = productCapacity(state);
  if (byProducts > 0) return byProducts;
  return state.settings.defaultCapacity ?? 12;
}

export function capacityStatus(state, deliveryDateId) {
  const { totalUnits } = explodeBom(state, deliveryDateId);
  const cap = dayCapacity(state);
  const remaining = cap - totalUnits;
  return {
    capacity: cap,
    total: totalUnits,
    remaining,
    exceeded: totalUnits > cap,
    ratio: cap > 0 ? totalUnits / cap : 0,
  };
}

// Total planned units across ALL delivery dates (for the dashboard strip).
export function totalUnitsOnDate(state, deliveryDateId) {
  return state.orders
    .filter((o) => o.deliveryDateId === deliveryDateId)
    .reduce((s, o) => s + o.qty, 0);
}

// Units of a single product already booked for a date, and how many of its
// daily limit remain. Returns null when the product has no daily limit
// (unlimited), so callers can hide the count. excludeOrderId lets the order
// being edited opt out of its own quantity.
export function productRemaining(state, deliveryDateId, productId, excludeOrderId = null) {
  const product = byId(state.products, productId);
  const limit = Number(product?.limit);
  if (!product || !(limit > 0)) return null;
  const booked = state.orders
    .filter((o) => o.deliveryDateId === deliveryDateId && o.productId === productId && o.id !== excludeOrderId)
    .reduce((s, o) => s + o.qty, 0);
  return { limit, booked, remaining: limit - booked };
}
