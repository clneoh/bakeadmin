// test/bom.test.js — multi-level recipes: products inside products (sets).
// Mirrors test/core.test.js fixtures; every helper here is pure + Node-testable.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  explodeBom,
  expandProduct,
  costOf,
  recipeLineCosts,
  isPoolablePack,
  poolRemaining,
  productRemaining,
  validateRecipeNoCycle,
  dayDelta,
  effectiveLimit,
  effectiveCapacity,
  dayRuleRows,
  parseDayDelta,
  saveDayAdjustments,
} from "../admin/js/bom.js";

// Focaccia (leaf ingredients, daily limit 12) is the pool base. The family set
// is 4 × Focaccia; the party box is 2 × family set (a set of a set).
function fixtureState() {
  return {
    settings: { defaultCapacity: 12, deliveryDays: [1, 3, 5], cutoff: "18:00", currency: "RM" },
    ingredients: [
      { id: "ing_f", name: "Strong flour", unit: "g", costPerUnit: 0.006 },
      { id: "ing_y", name: "Instant yeast", unit: "g", costPerUnit: 0.05 },
      { id: "ing_s", name: "Fine salt", unit: "g", costPerUnit: 0.004 },
    ],
    products: [
      { id: "prd_f", name: "Focaccia", unit: "loaf", limit: 12, active: true, price: 15, recipe: [
        { ingredientId: "ing_f", qty: 500, unit: "g" },
        { ingredientId: "ing_y", qty: 5, unit: "g" },
        { ingredientId: "ing_s", qty: 10, unit: "g" },
      ] },
      { id: "prd_s", name: "Sandwich", unit: "piece", active: true, recipe: [
        { ingredientId: "ing_f", qty: 250, unit: "g" },
        { ingredientId: "ing_y", qty: 3, unit: "g" },
        { ingredientId: "ing_s", qty: 4, unit: "g" },
      ] },
      { id: "prd_p", name: "Family (4 pcs)", unit: "set", active: true, price: 54, recipe: [
        { productId: "prd_f", qty: 4, unit: "loaf" },
      ] },
      { id: "prd_c", name: "Party Box", unit: "set", active: true, recipe: [
        { productId: "prd_p", qty: 2, unit: "set" },
      ] },
    ],
    deliveryDates: [{ id: "del_a", date: "2026-09-07", notes: "" }],
    orders: [],
    purchaseOrders: [],
  };
}

function linesByName(res) {
  const map = new Map();
  for (const l of res.lines) map.set(l.ingredientId, l);
  return map;
}

test("expandProduct turns one set into its component's leaf ingredients ×4", () => {
  const st = fixtureState();
  const family = st.products.find((p) => p.id === "prd_p");
  const m = linesByName(expandProduct(st, family));
  assert.equal(m.get("ing_f").qty, 2000); // 4 × 500g
  assert.equal(m.get("ing_y").qty, 20);
  assert.equal(m.get("ing_s").qty, 40);
});

test("expandProduct explodes a set of a set (Party = 2 × Family = 8 × Focaccia)", () => {
  const st = fixtureState();
  const party = st.products.find((p) => p.id === "prd_c");
  const m = linesByName(expandProduct(st, party));
  assert.equal(m.get("ing_f").qty, 4000);
  assert.equal(m.get("ing_y").qty, 40);
  assert.equal(m.get("ing_s").qty, 80);
});

test("expandProduct supports a scale factor", () => {
  const st = fixtureState();
  const family = st.products.find((p) => p.id === "prd_p");
  const m = linesByName(expandProduct(st, family, 3));
  assert.equal(m.get("ing_f").qty, 6000);
});

test("BOM explosion mixes a set with singles into one shopping list", () => {
  const st = fixtureState();
  st.orders = [
    { id: "ord_1", deliveryDateId: "del_a", productId: "prd_f", qty: 2 }, // 2 singles
    { id: "ord_2", deliveryDateId: "del_a", productId: "prd_p", qty: 1 }, // 1 family set
    { id: "ord_3", deliveryDateId: "del_a", productId: "prd_s", qty: 1 }, // unrelated product
  ];
  const bom = explodeBom(st, "del_a");
  assert.equal(bom.totalUnits, 4, "each order line counts once, set or single");
  const flour = bom.items.find((i) => i.ingredientId === "ing_f");
  assert.equal(flour.totalQty, 2 * 500 + 1 * 2000 + 1 * 250); // 3250
  const setLine = bom.items.find((i) => i.ingredientId === "ing_f").lines
    .find((l) => l.productName === "Family (4 pcs)");
  assert.equal(setLine.orderQty, 1);
  assert.equal(setLine.perUnitQty, 2000, "per-unit qty is per pack, after expansion");
});

test("a recipe loop warns instead of throwing and never hangs", () => {
  const st = fixtureState();
  st.products.push({ id: "prd_a", name: "A", unit: "box", active: true, recipe: [
    { productId: "prd_b", qty: 1, unit: "" },
  ] });
  st.products.push({ id: "prd_b", name: "B", unit: "box", active: true, recipe: [
    { productId: "prd_a", qty: 1, unit: "" },
  ] });
  st.orders = [{ id: "ord_cyc", deliveryDateId: "del_a", productId: "prd_a", qty: 2 }];
  const bom = explodeBom(st, "del_a"); // must not throw or hang
  assert.equal(bom.totalUnits, 2, "the order is still counted");
  assert.equal(bom.items.length, 0, "no ingredients come from the loop");
  assert.ok(bom.warnings.some((w) => w.includes("Recipe loop: A → B → A")), bom.warnings.join(" | "));
});

test("costOf compounds a component's cost into the set", () => {
  const st = fixtureState();
  const focaccia = st.products.find((p) => p.id === "prd_f");
  const family = st.products.find((p) => p.id === "prd_p");
  const party = st.products.find((p) => p.id === "prd_c");
  // 500×0.006 + 5×0.05 + 10×0.004 = 3.29 per focaccia
  assert.equal(costOf(st, focaccia), 3.29);
  assert.equal(costOf(st, family), 13.16, "4 × focaccia");
  assert.equal(costOf(st, party), 26.32, "2 × family");
});

test("costOf reads a not-yet-saved draft's own lines (new product card)", () => {
  const st = fixtureState();
  const draft = { name: "Draft", recipe: [
    { ingredientId: "ing_f", qty: 100, unit: "g" },
    { productId: "prd_p", qty: 2, unit: "set" },
  ] };
  assert.equal(costOf(st, draft), 100 * 0.006 + 2 * 13.16); // 26.92
});

test("recipeLineCosts returns one cost per line and the lines add up to costOf", () => {
  const st = fixtureState();
  const focaccia = st.products.find((p) => p.id === "prd_f");
  // 500×0.006 = 3.00, 5×0.05 = 0.25, 10×0.004 = 0.04 → 3.29 total
  assert.deepEqual(recipeLineCosts(st, focaccia), [3, 0.25, 0.04]);
  assert.equal(recipeLineCosts(st, focaccia).reduce((s, c) => s + c, 0), costOf(st, focaccia));
});

test("recipeLineCosts compounds a set and a set of a set on the line", () => {
  const st = fixtureState();
  const family = st.products.find((p) => p.id === "prd_p");
  const party = st.products.find((p) => p.id === "prd_c");
  assert.deepEqual(recipeLineCosts(st, family), [13.16], "4 × focaccia");
  assert.deepEqual(recipeLineCosts(st, party), [26.32], "2 × family");
});

test("recipeLineCosts counts 0 for a line whose ingredient has no cost, and costOf agrees", () => {
  const st = fixtureState();
  const focaccia = st.products.find((p) => p.id === "prd_f");
  st.ingredients.find((i) => i.id === "ing_s").costPerUnit = 0; // salt: no cost set
  const costs = recipeLineCosts(st, focaccia);
  assert.deepEqual(costs, [3, 0.25, 0]);
  assert.equal(costs.reduce((s, c) => s + c, 0), costOf(st, focaccia));
});

test("recipeLineCosts ignores blank, zero-qty and missing-ingredient lines; null product is []", () => {
  const st = fixtureState();
  const draft = { name: "Draft", recipe: [
    { qty: 0, unit: "g" }, // blank/zero line
    { ingredientId: "ing_missing", qty: 100, unit: "g" }, // deleted ingredient
    { ingredientId: "ing_f", qty: 100, unit: "g" },
  ] };
  assert.deepEqual(recipeLineCosts(st, draft), [0, 0, 0.6]);
  assert.deepEqual(recipeLineCosts(st, null), []);
});

test("recipeLineCosts survives a recipe loop (bounded, counts 0, no hang)", () => {
  const st = fixtureState();
  st.products.push(
    { id: "prd_a", name: "A", active: true, recipe: [{ productId: "prd_b", qty: 1, unit: "" }] },
    { id: "prd_b", name: "B", active: true, recipe: [{ productId: "prd_a", qty: 1, unit: "" }] },
  );
  const a = st.products.find((p) => p.id === "prd_a");
  assert.deepEqual(recipeLineCosts(st, a), [0], "a loop must resolve to 0, not hang");
});

test("isPoolablePack: only a single-line, own-cap-less, active-limited base counts", () => {
  const st = fixtureState();
  const family = st.products.find((p) => p.id === "prd_p");
  const focaccia = st.products.find((p) => p.id === "prd_f");

  assert.deepEqual(isPoolablePack(st, family), { baseId: "prd_f", baseQty: 4 });

  // the base itself isn't a pack
  assert.equal(isPoolablePack(st, focaccia), null);

  // a mixed hamper (ingredient + product lines) has no shared pool
  const hamper = { id: "prd_h", name: "Hamper", recipe: [
    { ingredientId: "ing_f", qty: 250, unit: "g" },
    { productId: "prd_s", qty: 2, unit: "piece" },
  ] };
  assert.equal(isPoolablePack(st, hamper), null);

  // a pack with its own daily cap is independent, not pool-derived
  const capped = { id: "prd_l", name: "Capped set", limit: 5, recipe: [
    { productId: "prd_f", qty: 4, unit: "loaf" },
  ] };
  assert.equal(isPoolablePack(st, capped), null);

  // a hidden or missing base is not a pool
  const st2 = fixtureState();
  st2.products.find((p) => p.id === "prd_s").active = false;
  const sPack = { id: "prd_x", name: "S pack", recipe: [{ productId: "prd_s", qty: 2, unit: "piece" }] };
  assert.equal(isPoolablePack(st2, sPack), null, "hidden base");
  assert.equal(isPoolablePack(st2, { id: "prd_y", name: "Y", recipe: [{ productId: "prd_gone", qty: 1, unit: "" }] }), null, "missing base");
});

test("poolRemaining counts set sales into the base pool; productRemaining only sees singles", () => {
  const st = fixtureState();
  st.orders = [
    { id: "ord_1", deliveryDateId: "del_a", productId: "prd_f", qty: 2 }, // singles
    { id: "ord_2", deliveryDateId: "del_a", productId: "prd_p", qty: 1 }, // set = 4 pieces
  ];
  const pool = poolRemaining(st, "del_a", "prd_f");
  assert.deepEqual(pool, { limit: 12, booked: 6, remaining: 6 }, "2 singles + 4 from the set");

  const own = productRemaining(st, "del_a", "prd_f");
  assert.deepEqual(own, { limit: 12, booked: 2, remaining: 10 }, "old per-product count sees only singles");

  // a pack itself has no limit → null from both helpers
  assert.equal(poolRemaining(st, "del_a", "prd_p"), null);
  assert.equal(productRemaining(st, "del_a", "prd_p"), null);
});

test("validateRecipeNoCycle refuses a set that contains itself, directly or through another", () => {
  const st = fixtureState();
  // direct self-reference in the saved product's own recipe
  assert.match(validateRecipeNoCycle(st, {
    id: "prd_f",
    name: "Focaccia",
    recipe: [{ productId: "prd_f", qty: 1, unit: "" }],
  }), /can't contain itself/);

  // A → B where B's saved recipe already points back at A
  st.products.push({ id: "prd_a", name: "A", unit: "box", recipe: [] });
  st.products.push({ id: "prd_b", name: "B", unit: "box", recipe: [{ productId: "prd_a", qty: 1, unit: "" }] });
  assert.match(validateRecipeNoCycle(st, {
    id: "prd_a",
    name: "A",
    recipe: [{ productId: "prd_b", qty: 1, unit: "" }],
  }), /can't contain itself/);

  // a clean chain is fine
  assert.equal(validateRecipeNoCycle(st, {
    id: "prd_p",
    name: "Family (4 pcs)",
    recipe: [{ productId: "prd_f", qty: 4, unit: "loaf" }],
  }), null);

  // a brand-new product (no id yet) can't create a loop
  assert.equal(validateRecipeNoCycle(st, { recipe: [{ productId: "prd_f", qty: 1, unit: "" }] }), null);
});

// --- "this day's bakes": per-delivery-date availability adjustments ---

test("dayDelta reads only the first same-date record's integer delta", () => {
  const st = fixtureState();
  st.deliveryDates[0].dayAdj = { prd_f: 5 };
  // a duplicate same-date record is ignored — the first record owns the day
  st.deliveryDates.push({ id: "del_b", date: "2026-09-07", notes: "", dayAdj: { prd_f: 99 } });
  st.deliveryDates.push({ id: "del_c", date: "2026-09-14", notes: "", dayAdj: { prd_f: 7 } });
  assert.equal(dayDelta(st, "2026-09-07", "prd_f"), 5);
  assert.equal(dayDelta(st, "2026-09-14", "prd_f"), 7, "a different date reads its own record");
  assert.equal(dayDelta(st, "2026-09-21", "prd_f"), 0, "no record → no delta");
  assert.equal(dayDelta(st, "", "prd_f"), 0);

  const st2 = fixtureState();
  st2.deliveryDates[0].dayAdj = { prd_f: "two" }; // non-integer is ignored
  assert.equal(dayDelta(st2, "2026-09-07", "prd_f"), 0);
  assert.equal(dayDelta(st2, "2026-09-07", "prd_s"), 0, "product not in dayAdj → no delta");
});

test("effectiveLimit adds the day's delta, clamps at 0; unlimited/missing are null", () => {
  const st = fixtureState();
  st.deliveryDates[0].dayAdj = { prd_f: 5 };
  assert.equal(effectiveLimit(st, "2026-09-07", "prd_f"), 17);
  assert.equal(effectiveLimit(st, "2026-09-14", "prd_f"), 12, "no delta that day → the usual limit");

  st.deliveryDates[0].dayAdj = { prd_f: -30 }; // stored raw below −limit, only the read clamps
  assert.equal(effectiveLimit(st, "2026-09-07", "prd_f"), 0);

  assert.equal(effectiveLimit(st, "2026-09-07", "prd_s"), null, "unlimited product has no effective limit");
  assert.equal(effectiveLimit(st, "2026-09-07", "prd_missing"), null);
});

test("productRemaining uses the day's adjusted limit with unchanged bookings", () => {
  const st = fixtureState();
  st.deliveryDates[0].dayAdj = { prd_f: 5 };
  st.orders.push({ id: "o1", deliveryDateId: "del_a", productId: "prd_f", qty: 2 });
  assert.deepEqual(productRemaining(st, "del_a", "prd_f"), { limit: 17, booked: 2, remaining: 15 });

  // a paused product still returns a record (it has a usual limit); remaining can go below 0
  st.deliveryDates[0].dayAdj = { prd_f: -12 };
  assert.deepEqual(productRemaining(st, "del_a", "prd_f"), { limit: 0, booked: 2, remaining: -2 });
});

test("poolRemaining uses the base's adjusted limit for that date", () => {
  const st = fixtureState();
  st.deliveryDates[0].dayAdj = { prd_f: -3 };
  st.orders.push(
    { id: "o1", deliveryDateId: "del_a", productId: "prd_f", qty: 1 }, // 1 single
    { id: "o2", deliveryDateId: "del_a", productId: "prd_p", qty: 1 }); // 1 family set = 4 pieces
  assert.deepEqual(poolRemaining(st, "del_a", "prd_f"), { limit: 9, booked: 5, remaining: 4 });

  st.deliveryDates[0].dayAdj = { prd_f: -12 };
  assert.equal(poolRemaining(st, "del_a", "prd_f").limit, 0, "a paused base keeps a pool record");
  assert.equal(poolRemaining(st, "del_a", "prd_s"), null, "an unlimited base has no pool");
});

test("effectiveCapacity sums adjusted limits, isolates per date, falls back when unconstrained", () => {
  const st = fixtureState();
  assert.equal(effectiveCapacity(st, "2026-09-07"), 12, "only Focaccia is limited → its usual limit");

  st.deliveryDates[0].dayAdj = { prd_f: 5 };
  assert.equal(effectiveCapacity(st, "2026-09-07"), 17);
  assert.equal(effectiveCapacity(st, "2026-09-14"), 12, "the next date keeps its baseline");

  st.products.find((p) => p.id === "prd_s").limit = 8; // add a second limited product
  st.deliveryDates[0].dayAdj = { prd_f: 5, prd_s: -2 };
  assert.equal(effectiveCapacity(st, "2026-09-07"), 23, "12+5 + 8−2");

  st.deliveryDates[0].dayAdj = { prd_f: -12, prd_s: -8 };
  assert.equal(effectiveCapacity(st, "2026-09-07"), 0, "pausing every product closes the day");

  // nothing limited at all → today's default capacity fallback
  const st2 = fixtureState();
  st2.products = st2.products.map((p) => (p.id === "prd_f" ? { ...p, limit: undefined } : p));
  assert.equal(effectiveCapacity(st2, "2026-09-07"), 12, "defaultCapacity when nothing is limited");
});

test("dayRuleRows lists active limited products (menu order) and finds poolable packs", () => {
  const st = fixtureState();
  st.deliveryDates[0].dayAdj = { prd_f: 3 };
  st.products.push({ id: "prd_h", name: "Hidden", unit: "x", limit: 5, active: false, recipe: [] });
  const { rows, packs } = dayRuleRows(st, "2026-09-07");
  assert.deepEqual(rows.map((r) => [r.productId, r.name, r.usual, r.delta]),
    [["prd_f", "Focaccia", 12, 3]]);
  assert.deepEqual(packs, ["Family (4 pcs)"], "a poolable pack whose base is listed");

  const empty = dayRuleRows(st, "2026-10-01"); // a date with no adjustments yet
  assert.deepEqual(empty.rows.map((r) => [r.productId, r.delta]), [["prd_f", 0]]);
  assert.deepEqual(empty.packs, ["Family (4 pcs)"]);
});

test("parseDayDelta: blank is no change, signed whole numbers only", () => {
  assert.deepEqual(parseDayDelta(""), { delta: 0 });
  assert.deepEqual(parseDayDelta("   "), { delta: 0 });
  assert.deepEqual(parseDayDelta("0"), { delta: 0 });
  assert.deepEqual(parseDayDelta("5"), { delta: 5 });
  assert.deepEqual(parseDayDelta("+5"), { delta: 5 });
  assert.deepEqual(parseDayDelta("-2"), { delta: -2 });
  assert.ok(parseDayDelta("2.5").error);
  assert.ok(parseDayDelta("abc").error);
  assert.ok(parseDayDelta("-").error);
});

test("saveDayAdjustments writes to the owner record, prunes zeros, removes dayAdj when empty", () => {
  const st = fixtureState();
  st.deliveryDates.push({ id: "del_dup", date: "2026-09-07", notes: "" }); // not the first record
  const owner = saveDayAdjustments(st, "del_dup", { prd_f: 5, prd_s: 0 });
  assert.equal(owner, st.deliveryDates[0], "the FIRST same-date record owns the day");
  assert.deepEqual(st.deliveryDates[0].dayAdj, { prd_f: 5 }, "zero entries pruned");

  saveDayAdjustments(st, "del_dup", { prd_f: 0 });
  assert.ok(!("dayAdj" in st.deliveryDates[0]), "clearing everything removes dayAdj");

  assert.equal(saveDayAdjustments(st, "del_nope", { prd_f: 1 }), null, "unknown date is a no-op");
});
