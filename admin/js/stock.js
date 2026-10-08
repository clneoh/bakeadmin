// stock.js — how "on hand" stock moves. Three moments only: buying adds a saved
// PO's whole packs, baking (an order marked Baked) subtracts its recipe, and
// setting On hand on the ingredient card writes the real amount. Pure (no DOM)
// so it runs under Node for tests; the two callers (orders.js, history.js) call
// save() once afterwards.
//
// Stock is stored on each ingredient as a base-unit count (grams / millilitres /
// items) and never goes below 0. Re-adding after an undo recomputes from the
// recipe, which keeps it symmetric for a fixed recipe.

import { byId, round2 } from "./state.js";
import { expandProduct } from "./bom.js";
import { cookingUnit } from "./purchasing.js";
import { longDate, todayISO } from "./dates.js";

// ── ★★ the stock journal (v385) ───────────────────────────────────────────────
// Her words: __"why only show when there is price movement, qty movement cannot?"__ — and the honest
// answer was that quantity movements were **never recorded at all**. Five things move stock and every
// one of them simply overwrote the number, so the moment she asked where her flour went the app could
// only reply "that is the number".
//
// ⚠️⚠️ IT STARTS EMPTY, AND NOTHING BEFORE IT IS RECOVERABLE. Every movement that has already happened
// is gone — there is no way to rebuild it — so this records from the day it ships and nothing earlier.
// The same honesty as the cost freeze (v380): I will not invent a history that never existed.
//
// ⚠️ THE CAP, AND WHY IT IS THE SAME NUMBER AS THE PRICE LOG. A bake writes one row per DISTINCT
// ingredient in the recipe (five to fifteen rows), so this fills faster than a price log does — 50
// rows is roughly a month on a busy ingredient, enough to answer "where did it go" without growing
// for ever on a phone that has about 5 MB to play with.
export const STOCK_LOG_CAP = 50;

export function stockLogOf(ingredient) {
  return ingredient && Array.isArray(ingredient.stockLog) ? ingredient.stockLog : [];
}

// Append one movement, newest first. ⚠️ `delta` IS SIGNED AND IN BASE UNITS and is never formatted
// here — grams or kilograms is the display's decision, the same rule the rest of the app follows.
// `why` is one word so the reason can be told apart without reading the sentence; `what` is the
// sentence a person reads; `ref` ties a row back to the order or the list that caused it.
export function logStock(ingredient, { at, delta, why, what, ref } = {}) {
  if (!ingredient) return null;
  const n = Number(delta);
  // ⚠️ A movement of nothing is not a movement — the same rule the price log keeps. (A bake whose
  // recipe no longer resolves an ingredient must not write a row saying it moved none of it.)
  if (!Number.isFinite(n) || n === 0) return null;
  if (!Array.isArray(ingredient.stockLog)) ingredient.stockLog = [];
  const entry = {
    at: at || todayISO(),
    delta: round2(n),
    why: String(why || ""),
    what: String(what || ""),
    ref: String(ref || ""),
  };
  ingredient.stockLog.unshift(entry);
  if (ingredient.stockLog.length > STOCK_LOG_CAP) ingredient.stockLog.length = STOCK_LOG_CAP;
  return entry;
}

// ★★ SET the amount on the shelf and RECORD what moved (v385).
//
// ⚠️⚠️ TWO SCREENS WRITE AN ABSOLUTE AMOUNT — a stocktake on the ingredient card, and Day one — and
// they are the SAME RULE: set the figure, then write down what changed. Keeping that rule in two view
// callbacks would mean two chances to get the sign or the comparison wrong, in code no test can reach
// without driving a pop-up. Here it is one function, tested directly.
//
// `label` builds the sentence from the two figures, because only the caller knows what to call the
// movement ("Stocktake — 1.5 kg to 2 kg" vs "Day one — 5 kg"). ⚠️ A correction that sets the same
// number is NOT a movement, and `logStock` refuses it.
export function setStock(ingredient, base, { why, label, at } = {}) {
  if (!ingredient) return null;
  const was = Number(ingredient.onHand) || 0;
  const now = round2(Math.max(0, Number(base) || 0));
  ingredient.onHand = now;
  const delta = round2(now - was);
  logStock(ingredient, { at, delta, why, what: typeof label === "function" ? label(was, now) : "" });
  return { was, now, delta };
}

// What an order is called in a stock row — the product and how many, which is how she thinks of it.
function orderLabel(state, order) {
  const p = byId(state.products || [], order && order.productId);
  return `${p ? p.name : "a product that is gone"} ×${Number(order && order.qty) || 1}`;
}

// What a shopping list is called in a stock row: its own day, the way the PO history names it.
function listLabel(po) {
  const day = (Array.isArray(po && po.dates) && po.dates.length && po.dates[0] && po.dates[0].date)
    || (po && po.deliveryDate) || "";
  return day ? `${longDate(day)} list` : "shopping list";
}

export function stockOf(state, ingredient) {
  return Math.max(0, Number(ingredient && ingredient.onHand) || 0);
}

// The base multiplier for a recipe line whose unit name may or may not exist in
// the Units list — fall back to the ingredient's own cooking unit. A unit found
// by name is only honoured when it shares the ingredient's cooking family: now
// that hr/min/cm/m exist as convertible units, a cross-family line unit (say
// "hr" on a gram ingredient) must never distort stock by a ×60/×100 factor.
function baseOf(state, ingredient, unitName) {
  const list = state.uoms || [];
  const cook = cookingUnit(list, ingredient);
  const byName = unitName
    ? list.find((u) => String(u.name || "").toLowerCase() === String(unitName).toLowerCase()
        && (!cook || u.family === cook.family))
    : null;
  const u = byName || cook;
  return Number(u && u.toBase) || 1;
}

// Recipe ingredient amounts for one order of one product, in base units per
// ingredient. null when the product is gone (nothing to take off stock).
function orderConsumption(state, order) {
  const product = byId(state.products || [], order && order.productId);
  if (!product) return null;
  const res = expandProduct(state, product, Number(order.qty) || 1);
  const total = new Map();
  for (const line of res.lines || []) {
    const ingredient = byId(state.ingredients || [], line.ingredientId);
    const base = (Number(line.qty) || 0) * baseOf(state, ingredient, line.unit);
    total.set(line.ingredientId, (total.get(line.ingredientId) || 0) + base);
  }
  return total;
}

// An order marked Baked used its ingredients — take them off the shelf.
export function consumeOrder(state, order) {
  const amounts = orderConsumption(state, order);
  if (!amounts) return;
  const label = orderLabel(state, order);
  for (const [ingredientId, base] of amounts) {
    const ing = byId(state.ingredients || [], ingredientId);
    if (!ing) continue;
    const before = Number(ing.onHand) || 0;
    ing.onHand = round2(Math.max(0, before - base));
    // ⚠️ THE ROW RECORDS THE CHANGE IN THE NUMBER, not the recipe's figure. ⚠️⚠️ `Math.max(0, …)`
    // above CLAMPS a subtraction that would have gone below zero — stock never goes negative — so a
    // bake against an empty shelf moves nothing, and claiming it moved the recipe's amount would
    // make the rows stop adding up to the number. **A journal whose rows do not sum to the figure it
    // explains is worse than no journal**, so the delta is measured, never assumed.
    // (A zero change is refused by `logStock` itself — a movement of nothing is not a movement.)
    logStock(ing, {
      delta: round2((Number(ing.onHand) || 0) - before),
      why: "baked",
      what: `Baked — ${label}`,
      ref: (order && order.id) || "",
    });
  }
}

// Un-marking Baked (back to Paid/Confirmed/New) puts the ingredients back.
export function addBackOrder(state, order) {
  const amounts = orderConsumption(state, order);
  if (!amounts) return;
  const label = orderLabel(state, order);
  for (const [ingredientId, base] of amounts) {
    const ing = byId(state.ingredients || [], ingredientId);
    if (!ing) continue;
    ing.onHand = round2((Number(ing.onHand) || 0) + base);
    logStock(ing, {
      delta: base,
      why: "unbaked",
      what: `Un-baked — ${label}`,
      ref: (order && order.id) || "",
    });
  }
}

// The status-change stock rule for a set of orders all moving to nextStatus,
// given the status ids in forward journey order. Stepping INTO Baked consumes
// the orders' ingredients; stepping back from Baked to an earlier stage (an
// undo) restores them; forward moves change nothing. Call BEFORE assigning the
// new statuses, since each order's current status is the "from" state.
export function adjustForStatus(state, orders, nextStatus, statusOrder = []) {
  const bakingIdx = statusOrder.indexOf("baking");
  const nextIdx = statusOrder.indexOf(nextStatus);
  for (const o of orders || []) {
    const prev = o.status || "new";
    if (nextStatus === "baking" && prev !== "baking") consumeOrder(state, o);
    else if (prev === "baking" && nextIdx >= 0 && nextIdx < bakingIdx) addBackOrder(state, o);
  }
}

// "Bought" on a saved PO adds its actually-bought amounts to stock. Returns the
// [[ingredient, base], …] that moved, for the success toast.
export function applyBought(state, po) {
  const perIngredient = new Map();
  for (const it of (po && po.items) || []) {
    const addBase = Number(it && it.addBase) || 0;
    if (!(addBase > 0)) continue;
    perIngredient.set(it.ingredientId, (perIngredient.get(it.ingredientId) || 0) + addBase);
  }
  const added = [];
  const label = listLabel(po);
  for (const [ingredientId, base] of perIngredient) {
    const ing = byId(state.ingredients || [], ingredientId);
    if (!ing) continue;
    ing.onHand = round2((Number(ing.onHand) || 0) + base);
    // ⚠️ `base` IS `addBase` — WHAT SHE ACTUALLY BOUGHT, which the Bought flow lets her change from
    // what the list asked for. So the row says what came into the kitchen, not what was planned.
    logStock(ing, { delta: base, why: "bought", what: `Bought — ${label}`, ref: (po && po.id) || "" });
    added.push([ing, base]);
  }
  return added;
}
