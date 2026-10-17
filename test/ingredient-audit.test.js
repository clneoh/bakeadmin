// test/ingredient-audit.test.js — the faults a full audit of the ingredient feature turned up, pinned.
//
// ⚠️⚠️ WHY THIS FILE EXISTS. She asked for a thorough audit, and it found three faults that put a WRONG NUMBER
// in front of her. ⭐ **Every one of them was a calculation that looked right and was not**, and every one is
// reproduced here against the REAL modules rather than a fixture of my own arithmetic.
//
// ⭐ AND THE RULE THEY ALL BROKE, which her own words name: __"i found that you had too many errors, you should
// run thru a very thorough details audit on each and every small detail by yourself"__. ⚠️ **A green suite did
// not find any of them** — they were found by reading the producer and measuring the number.

import { test } from "node:test";
import assert from "node:assert/strict";

import { priceItems, baseFactorOf } from "../admin/js/purchasing.js";
import { explodePicks } from "../admin/js/bom.js";
import { productConsumption, setBakedTotal } from "../admin/js/stock.js";
import { defaultState } from "../admin/js/state.js";

const base = () => {
  const st = defaultState();
  st.uoms = [{ id: "g", name: "g", family: "weight", toBase: 1 },
    { id: "kg", name: "kg", family: "weight", toBase: 1000 }];
  st.suppliers = [{ id: "s1", name: "Aroma", active: true }];
  return st;
};

// ── 1 · the shopping list read the quantity in the WRONG UNIT (×1000) ───────
test("★★★ the shopping list and the bake agree about ONE loaf — the ×1000 fault", () => {
  // ⚠️⚠️ THE FAULT: `needBase = cookBase * totalQty` used **the ingredient's own unit factor** on a quantity
  // written in **the recipe line's unit**. ⭐ **An ingredient measured in kg with a line saying 500 g was read as
  // 500 kg — a thousand times too much to buy — while the bake correctly took 500 g.**
  const st = base();
  st.ingredients = [{ id: "i1", name: "Flour", unit: "kg", uomId: "kg", onHand: 0, safetyBase: 0,
    prices: [{ supplierId: "s1", packQty: 1, packUnit: "kg", price: 4.2, primary: true }] }];
  st.products = [{ id: "p1", name: "Focaccia", active: true, unit: "pc",
    recipe: [{ ingredientId: "i1", qty: 500, unit: "g" }] }];

  const bake = [...productConsumption(st, st.products[0], 1).values()][0];
  assert.equal(bake, 500, "precondition: the bake does not take 500 g, so nothing below proves anything");

  const row = priceItems(st, [{ ingredientId: "i1", ingredientName: "Flour", unit: "g", totalQty: 500, costPerUnit: 0.0042 }])[0];
  // ⚠️ `openQty` is in the ingredient's COOKING unit (kg), so 500 g reads 0.5.
  assert.equal(Math.round(row.openQty * 1000), bake,
    "★ the shopping list and the bake disagree about one loaf — **the list is computed with the ingredient's "
    + "unit on a quantity written in the RECIPE's unit, and 500 g became 500 kg**");
});

test("★★★ and the factor honours the LINE's unit, not the ingredient's", () => {
  const st = base();
  const ing = { id: "i1", name: "Flour", unit: "kg", uomId: "kg" };
  assert.equal(baseFactorOf(st, ing, "g"), 1, "a line in g must convert as grams");
  assert.equal(baseFactorOf(st, ing, "kg"), 1000, "a line in kg must convert as kilograms");
  // ⚠️ AND A CROSS-FAMILY UNIT IS REFUSED, falling back to the ingredient's own — the x60/x100 guard.
  st.uoms.push({ id: "hr", name: "hr", family: "time", toBase: 60 });
  assert.equal(baseFactorOf(st, ing, "hr"), 1000, "★ a TIME unit was honoured on a weight ingredient");
});

// ── 2 · two lines in different units were SUMMED RAW ───────────────────────
test("★★★ two recipe lines in DIFFERENT units are added correctly, not summed raw", () => {
  // ⚠️⚠️ THE FAULT: `pushDemand` did `prev.qty += qty`, so **500 g + 1 kg became 501**. ⭐ The unit of the first
  // contributor was kept and the other number was simply added to it — and `unitsOk` could not catch it,
  // because it compares the already-collapsed single unit.
  const st = base();
  st.ingredients = [{ id: "i1", name: "Flour", unit: "g", uomId: "g", onHand: 0 }];
  // a pack that uses the same ingredient, in kg
  st.products = [
    { id: "p1", name: "Focaccia", active: true, unit: "pc",
      recipe: [{ ingredientId: "i1", qty: 500, unit: "g" }, { productId: "p2", qty: 1 }] },
    { id: "p2", name: "Pack", active: true, unit: "set",
      recipe: [{ ingredientId: "i1", qty: 1, unit: "kg" }] },
  ];
  const row = explodePicks(st, [{ productId: "p1", qty: 1 }]).items.find((x) => x.ingredientId === "i1");
  // 500 g + 1 kg = 1,500 g — expressed in whichever unit came first
  const inBase = baseFactorOf(st, st.ingredients[0], row.unit) * row.totalQty;
  assert.equal(Math.round(inBase), 1500,
    "★ two lines for one ingredient in different units were summed raw — **500 g and 1 kg became 501, not "
    + "1,500**");
});

// ── 3 · a correction INVENTED stock ────────────────────────────────────────
test("★★★ correcting a bake that the shelf could not cover does NOT invent stock", () => {
  // ⚠️⚠️ MEASURED BEFORE THE FIX: 1,000 g, bake 10 (needs 2,500) → the shelf stops at 0 → correct back to 0 →
  // **the shelf became 2,500 g. She started with 1,000.** ⭐ **The deduction was clamped at zero and the add-back
  // was not.**
  const st = base();
  st.ingredients = [{ id: "i1", name: "Flour", unit: "g", uomId: "g", onHand: 1000, stockLog: [] }];
  st.products = [{ id: "p1", name: "Focaccia", active: true, unit: "pc",
    recipe: [{ ingredientId: "i1", qty: 250, unit: "g" }] }];

  setBakedTotal(st, st.products[0], "2026-10-17", 10);
  assert.equal(st.ingredients[0].onHand, 0, "precondition: the shelf did not stop at zero");

  setBakedTotal(st, st.products[0], "2026-10-17", 0);
  assert.equal(st.ingredients[0].onHand, 1000,
    "★ a correction turned 1,000 g into MORE than 1,000 g — **the add-back put back the recipe's full amount "
    + "while the deduction had been stopped at zero, so the shelf gained flour that never existed**");

  // ⭐ AND THE JOURNAL SUMS TO THE SHELF — that is the invariant the fix restores.
  const sum = st.ingredients[0].stockLog.reduce((s, e) => s + e.delta, 0);
  assert.equal(sum, 0, "★ the journal no longer adds up to the shelf it explains");
});

test("★★★ and a bake row she DELETED leaves nothing to correct — no stock appears", () => {
  // ⚠️ The same rule from the other side: the bound is the day's own journal, so removing a row removes the
  // ability to "correct" it back. ⭐ **A row she took off the card must not be reversible into new stock.**
  const st = base();
  st.ingredients = [{ id: "i1", name: "Flour", unit: "g", uomId: "g", onHand: 5000, stockLog: [] }];
  st.products = [{ id: "p1", name: "Focaccia", active: true, unit: "pc",
    recipe: [{ ingredientId: "i1", qty: 250, unit: "g" }] }];
  setBakedTotal(st, st.products[0], "2026-10-17", 4);
  assert.equal(st.ingredients[0].onHand, 4000, "precondition");
  // she deletes the row by hand — the shelf goes back, and the journal is emptied
  st.ingredients[0].onHand = 5000;
  st.ingredients[0].stockLog = [];
  setBakedTotal(st, st.products[0], "2026-10-17", 0);   // now "correct" the bake she already undid by hand
  assert.equal(st.ingredients[0].onHand, 5000,
    "★ correcting a bake whose row was deleted ADDED stock — **there was nothing left to give back**");
});
