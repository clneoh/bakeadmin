// bom.js — BOM explosion, cost calculation, capacity.
// Pure module: no DOM, no localStorage. Runs under Node for tests.
// The core value of the app: sum(order qty × recipe qty) per ingredient.
//
// A recipe line is either an ingredient ({ingredientId}) or another product
// ({productId}) — a product inside a recipe is a component, i.e. a set/pack
// like "Focaccia Family Econ = 4 × Focaccia". Component lines expand
// recursively, so the shopping list and cost always see the leaf ingredients.

import { byId, round2 } from "./state.js";

const MAX_RECIPE_DEPTH = 6;
const NO_DEMAND = new Map();

export function explodeBom(state, deliveryDateId) {
  const warnings = [];
  const orders = state.orders.filter((o) => o.deliveryDateId === deliveryDateId);
  const acc = new Map();
  const memo = new Map(); // per-product per-unit demand, shared across orders
  let totalUnits = 0;

  for (const order of orders) {
    const product = byId(state.products, order.productId);
    if (!product) {
      warnings.push(`Order for a deleted product (${order.qty} pcs) was skipped.`);
      continue;
    }
    if (!Array.isArray(product.recipe)) continue;
    totalUnits += order.qty;
    const cycleWarnings = [];
    const perUnit = demandMap(state, product.id, memo, new Set(), cycleWarnings);
    if (cycleWarnings.length) {
      warnings.push(...cycleWarnings.map((w) => cycleWarningText(state, w)));
    }
    for (const [ingredientId, d] of perUnit) {
      let it = acc.get(ingredientId);
      if (!it) {
        const ing = byId(state.ingredients, ingredientId);
        it = {
          ingredientId,
          ingredientName: ing ? ing.name : "(deleted ingredient)",
          unit: d.unit,
          costPerUnit: ing ? ing.costPerUnit || 0 : 0,
          totalQty: 0,
          estCost: 0,
          unitsOk: true,
          lines: [],
        };
        acc.set(ingredientId, it);
      }
      it.totalQty += order.qty * d.qty;
      it.unitsOk = it.unitsOk && d.unit === it.unit;
      it.lines.push({
        productName: product.name,
        orderQty: order.qty,
        perUnitQty: d.qty,
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

// Ingredient demand for ONE unit of `productId`: Map<ingredientId,{qty,unit}>,
// recursing through component lines. Memoised per product id. A cycle or depth
// overrun stops that branch with a warning instead of throwing. When an
// ingredient is reached through several lines, its qty sums; the unit of the
// first contributor is kept (a mismatch still surfaces in explodeBom's
// unitsOk check whenever it differs across products).
function demandMap(state, productId, memo, stack, warnings) {
  const cached = memo.get(productId);
  if (cached) return cached;
  const product = byId(state.products, productId);
  if (!product) return NO_DEMAND;
  if (stack.has(productId)) {
    warnings.push({ code: "recipe-cycle", path: [...stack, productId] });
    return NO_DEMAND;
  }
  if (stack.size >= MAX_RECIPE_DEPTH) {
    warnings.push({ code: "recipe-depth", productId });
    return NO_DEMAND;
  }
  stack.add(productId);
  const acc = new Map();
  for (const line of product.recipe || []) {
    const qty = Number(line.qty) || 0;
    if (qty <= 0) continue;
    if (line.ingredientId && !line.productId) {
      pushDemand(acc, line.ingredientId, qty, line.unit);
    } else if (line.productId) {
      const child = demandMap(state, line.productId, memo, stack, warnings);
      for (const [ingId, d] of child) pushDemand(acc, ingId, d.qty * qty, d.unit);
    }
  }
  stack.delete(productId);
  memo.set(productId, acc);
  return acc;
}

function pushDemand(acc, ingredientId, qty, unit) {
  const prev = acc.get(ingredientId);
  if (prev) prev.qty += qty;
  else acc.set(ingredientId, { qty, unit });
}

function cycleWarningText(state, w) {
  if (w.code === "recipe-cycle") {
    const names = w.path.map((id) => (byId(state.products, id) || {}).name || id);
    return `Recipe loop: ${names.join(" → ")}. Check the set — the loop was skipped.`;
  }
  if (w.code === "recipe-depth") {
    const p = byId(state.products, w.productId);
    return `"${p ? p.name : w.productId}" nests deeper than ${MAX_RECIPE_DEPTH} levels — check for a loop.`;
  }
  return "";
}

// Ingredient lines for ONE unit of `product` (default scale 1), expanded fully
// through components. `warnings` (optional array) collects cycle/depth notes.
export function expandProduct(state, product, scale = 1, warnings = []) {
  const map = demandMap(state, product && product.id, new Map(), new Set(), warnings);
  return {
    lines: [...map.entries()].map(([ingredientId, d]) => ({
      ingredientId,
      qty: round2(d.qty * scale),
      unit: d.unit,
    })),
    warnings,
  };
}

// Cost of one unit of `product`: leaf ingredient qty × costPerUnit, with any
// component costs (qty × component cost) compounding in. The product's own
// recipe lines are read off `product` (so a not-yet-saved draft works); its
// components resolve by id into state. Cycle-safe, no warnings needed.
export function costOf(state, product) {
  if (!product) return 0;
  return round2(costLines(state, product.recipe || [], new Map(), new Set()));
}

function costLines(state, lines, memo, stack) {
  let total = 0;
  for (const line of lines) {
    const qty = Number(line.qty) || 0;
    if (qty <= 0) continue;
    if (line.ingredientId && !line.productId) {
      const ing = byId(state.ingredients, line.ingredientId);
      total += qty * (ing ? ing.costPerUnit || 0 : 0);
    } else if (line.productId) {
      total += qty * costProduct(state, line.productId, memo, stack);
    }
  }
  return total;
}

function costProduct(state, productId, memo, stack) {
  const cached = memo.get(productId);
  if (cached != null) return cached;
  const product = byId(state.products, productId);
  if (!product || stack.has(productId)) return 0;
  stack.add(productId);
  const total = costLines(state, product.recipe || [], memo, stack);
  stack.delete(productId);
  memo.set(productId, total);
  return total;
}

// A product is a poolable value pack when its recipe is exactly one product
// line, it has no daily limit of its own, and it points at an active product
// that has its own limit (the shared pool's base). Returns {baseId, baseQty}
// or null. Mixed hampers and self-limited products get null (no shared pool).
export function isPoolablePack(state, product) {
  if (!product) return null;
  if (Number(product.limit) > 0) return null;
  const lines = (product.recipe || []).filter((l) => (Number(l.qty) || 0) > 0);
  if (lines.length !== 1) return null;
  const only = lines[0];
  if (!only.productId || only.ingredientId) return null;
  const base = byId(state.products, only.productId);
  if (!base || base.active === false || !(Number(base.limit) > 0)) return null;
  return { baseId: base.id, baseQty: Number(only.qty) };
}

// Pieces of a pool base still free for a delivery date = base.limit minus every
// order's qty × how many base pieces that product consumes (a pack of 4 takes
// 4). Returns {limit, booked, remaining}, or null when the base has no limit.
export function poolRemaining(state, deliveryDateId, baseId) {
  const base = byId(state.products, baseId);
  const limit = Number(base && base.limit);
  if (!base || !(limit > 0)) return null;
  const memo = new Map();
  let booked = 0;
  for (const o of state.orders) {
    if (o.deliveryDateId !== deliveryDateId) continue;
    const qty = Number(o.qty) || 0;
    if (qty <= 0) continue;
    booked += qty * baseUnitsOf(state, baseId, o.productId, memo, new Set());
  }
  return { limit, booked, remaining: limit - booked };
}

// How many pieces of `baseId` one unit of `productId` consumes: 1 for the base
// itself, else the sum over its component lines of qty × the component's own
// base units. Cycle-safe (a loop counts nothing); memoised per product.
function baseUnitsOf(state, baseId, productId, memo, stack) {
  if (productId === baseId) return 1;
  const cached = memo.get(productId);
  if (cached != null) return cached;
  if (stack.has(productId)) return 0;
  stack.add(productId);
  const product = byId(state.products, productId);
  let sum = 0;
  if (product) {
    for (const line of product.recipe || []) {
      const qty = Number(line.qty) || 0;
      if (qty <= 0 || !line.productId) continue;
      sum += qty * baseUnitsOf(state, baseId, line.productId, memo, stack);
    }
  }
  stack.delete(productId);
  memo.set(productId, sum);
  return sum;
}

// Save-time guard: walk this product's component lines through the product
// graph and return an error string if the chain ever reaches the product being
// saved (its own recipe containing itself, directly or via other sets).
// A brand-new product has no id yet and can't be referenced, so always null.
export function validateRecipeNoCycle(state, product) {
  const selfId = product && product.id;
  if (!selfId) return null;
  const seen = new Set([selfId]);
  const queue = [];
  for (const l of product.recipe || []) if (l.productId) queue.push(l.productId);
  while (queue.length) {
    const pid = queue.pop();
    if (pid === selfId) {
      return `"${product.name}" can't contain itself, even through other sets — please break the loop.`;
    }
    if (seen.has(pid)) continue;
    seen.add(pid);
    const p = byId(state.products, pid);
    if (p) for (const l of p.recipe || []) if (l.productId) queue.push(l.productId);
  }
  return null;
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
