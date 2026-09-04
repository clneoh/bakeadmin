// test/bom.test.js — multi-level recipes: products inside products (sets).
// Mirrors test/core.test.js fixtures; every helper here is pure + Node-testable.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  explodeBom,
  expandProduct,
  costOf,
  isPoolablePack,
  poolRemaining,
  productRemaining,
  validateRecipeNoCycle,
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
