// test/po.test.js — the consolidated PO: tick several bake days → one combined
// shopping list. Renders the real view under a tiny DOM shim and drives the
// checkboxes + Generate button, so the multi-date merge, the "✓ saved / orders
// changed" memory and the explicit ?dates= reopen all work as the baker would
// touch them. po.js deliberately imports no app.js (it sets location.hash
// directly), which is what lets this view run under Node at all.

import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, todayISO, shortDate } from "../admin/js/dates.js";

// --- DOM shim (mirrors test/products-editor.test.js) ---
function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    scrollTop: 0, hidden: false, _listeners: {},
    classList: {
      add() {}, remove() {}, toggle() {},
      contains() { return false; },
    },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    focus() {}, click() {},
    querySelector(sel) {
      const wantId = sel.startsWith("#");
      const walk = (n) => {
        for (const c of n.children || []) {
          if (c.nodeType !== 1) continue;
          if (wantId ? (c.attrs && c.attrs.id === sel.slice(1)) : c.tagName === sel.toUpperCase()) return c;
          const hit = walk(c);
          if (hit) return hit;
        }
        return null;
      };
      return walk(this);
    },
  };
}
const doc = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  body: createEl("body"),
};
globalThis.document = doc;
// Keep toast timers from stalling the test run.
globalThis.setTimeout = (fn) => { fn(); return 1; };
globalThis.clearTimeout = () => {};
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  globalThis.crypto = { randomUUID: () => "00000000-0000-4000-8000-000000000000" };
}
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.location = { hash: "" };

import { renderPO } from "../admin/js/views/po.js";

const P = { id: "prd_loaf", name: "Sourdough", unit: "loaf", active: true,
  recipe: [{ ingredientId: "ing_flour", qty: 500, unit: "g" }] };
const ING = { id: "ing_flour", name: "Strong flour", unit: "g", uomId: "u_g", costPerUnit: 0.006 };

// Two upcoming bake days, each with one Sourdough order. Returns fresh ids each
// call so tests that "save then reopen" don't share order objects.
function freshState() {
  const a = addDays(todayISO(), 2);
  const b = addDays(todayISO(), 4);
  return {
    settings: { defaultCapacity: 12, currency: "RM", supabase: {} },
    uoms: [{ id: "u_g", name: "g", family: "weight", toBase: 1 }],
    suppliers: [],
    ingredients: [ING],
    products: [P],
    deliveryDates: [
      { id: "del_a", date: a, notes: "" },
      { id: "del_b", date: b, notes: "" },
    ],
    orders: [
      { id: "ord_a1", deliveryDateId: "del_a", productId: "prd_loaf", qty: 1 },
      { id: "ord_b1", deliveryDateId: "del_b", productId: "prd_loaf", qty: 1 },
    ],
    purchaseOrders: [],
  };
}

function walk(n, out = []) {
  for (const c of n.children || []) {
    out.push(c);
    walk(c, out);
  }
  return out;
}

function textOf(n) {
  if (!n) return "";
  if (n.nodeType === 3) return n.text ?? "";
  if (n.textContent) return n.textContent;
  return (n.children || []).map(textOf).join("");
}

const fireClick = (node) => (node._listeners.click || []).forEach((f) => f());
const fireChange = (node) => (node._listeners.change || []).forEach((f) => f());

// The date-sorted tick rows under root: each row's first child is its checkbox.
function rows(root) {
  return walk(root).filter((n) => n.nodeType === 1 && String(n.className).includes("po-day-row"));
}
function rowTag(row) {
  const tag = (row.children || []).find((c) => c.nodeType === 1 && String(c.className).includes("po-day-tag"));
  return tag ? textOf(tag).trim() : "";
}
function nodeTexts(root) {
  return textOf(root);
}

function render(state, query = "") {
  const root = doc.createElement("div");
  renderPO(root, state, new URLSearchParams(query));
  return root;
}

function genButton(root) {
  return walk(root).find((n) => n.tagName === "BUTTON"
    && (n.children || []).some((c) => c.text === "💾 Generate & Save"));
}

test("default ticks two uncovered future days and shows ONE combined list that adds them up", () => {
  const state = freshState();
  const root = render(state);

  const r = rows(root);
  assert.equal(r.length, 2, "one tick row per delivery date");
  assert.equal(r[0].children[0].checked, true, "day A has orders & nothing saved → default ticked");
  assert.equal(r[1].children[0].checked, true, "day B likewise");

  const all = nodeTexts(root);
  assert.ok(all.includes("2 units planned across 2 bake days · Sourdough ×2"),
    "the sub-line announces the combined need across both days");
  assert.ok(all.includes("RM 6.00"), "1000 g flour × RM 0.006 = RM 6.00 grand total in the table");

  const labelA = shortDate(state.deliveryDates[0].date);
  const breakdown = walk(root).find((n) => String(n.className).includes("po-breakdown"));
  assert.ok(textOf(breakdown).includes(`${labelA}: Sourdough ×1 = 500g`),
    "each contributing day is named on its own breakdown line");
});

test("Generate & Save records one snapshot over both days; reopening leaves both as ✓ saved", () => {
  const state = freshState();
  const root = render(state);

  fireClick(genButton(root));
  assert.equal(state.purchaseOrders.length, 1);
  const po = state.purchaseOrders[0];
  assert.equal(po.dates.length, 2, "snapshot lists both covered days");
  assert.equal(po.deliveryDateId, "del_a", "backward-compatible single-day pointer keeps the first day");
  assert.equal(po.deliveryDate, state.deliveryDates[0].date);
  assert.equal(po.summary.capacity, 24, "capacity = the two days' effective capacity summed (12 + 12)");

  // A fresh screen with no URL defaults to NOTHING ticked (both days shopped).
  const reopen = render(state);
  const r = rows(reopen);
  assert.equal(r[0].children[0].checked, false, "day A no longer default-ticked");
  assert.equal(r[1].children[0].checked, false, "day B no longer default-ticked");
  assert.equal(rowTag(r[0]), "✓ saved");
  assert.equal(rowTag(r[1]), "✓ saved");
  assert.ok(nodeTexts(reopen).includes("Those days are already shopped ✓"),
    "an empty selection explains that everything is already saved");
});

test("an order change after saving flips that day to \"orders changed\" and re-ticks it", () => {
  const state = freshState();
  fireClick(genButton(render(state))); // save an accurate snapshot for both days
  assert.equal(state.purchaseOrders.length, 1);

  state.orders[1].qty = 2; // day B's order changes after the list was saved

  const root = render(state);
  const r = rows(root);
  assert.equal(r[0].children[0].checked, false, "unchanged day A stays unticked");
  assert.equal(rowTag(r[0]), "✓ saved");
  assert.equal(r[1].children[0].checked, true, "changed day B rejoins the default list");
  assert.equal(rowTag(r[1]), "orders changed");
  assert.ok(nodeTexts(root).includes("Ingredients to buy"), "the combined list for day B still builds");
});

test("explicit ?dates= reopens an already-saved day (the history Regenerate path)", () => {
  const state = freshState();
  render(state);
  fireClick(genButton(render(state)));

  const root = render(state, `dates=${state.deliveryDates[0].id}`);
  const r = rows(root);
  assert.equal(r[0].children[0].checked, true, "the requested saved day is ticked");
  assert.equal(r[1].children[0].checked, false, "the other day is not pulled in");
  assert.ok(nodeTexts(root).includes("Ingredients to buy"), "its list builds despite being saved");
});

test("legacy single-date snapshots fall back to order-id matching (add/remove = changed)", () => {
  const state = freshState();
  const [a, b] = state.deliveryDates;
  // Simulate a PO saved by an older build: no dates[], just deliveryDate+orderIds.
  state.purchaseOrders.push({
    id: "po_legacy", deliveryDateId: a.id, deliveryDate: a.date,
    generatedAt: new Date().toISOString(), items: [], summary: {}, orderIds: ["ord_a1"], warnings: [],
  });

  let root = render(state);
  assert.equal(rows(root)[0].children[0].checked, false, "matching order ids → still saved");
  assert.equal(rowTag(rows(root)[0]), "✓ saved");

  state.orders.push({ id: "ord_a2", deliveryDateId: "del_a", productId: "prd_loaf", qty: 1 });
  root = render(state);
  assert.equal(rowTag(rows(root)[0]), "orders changed", "a new order id no longer matches");
  assert.equal(rows(root)[0].children[0].checked, true, "the stale legacy day re-ticks");
});

test("a legacy ?date= single selection still works", () => {
  const state = freshState();
  const root = render(state, `date=${state.deliveryDates[1].id}`);
  const r = rows(root);
  assert.equal(r[1].children[0].checked, true, "the legacy param selects that day");
  assert.equal(r[0].children[0].checked, false);
  assert.ok(nodeTexts(root).includes("Ingredients to buy"));
});

test("ticking an extra day updates the combined list and grand total live", () => {
  const state = freshState();
  fireClick(genButton(render(state))); // cover both days accurately

  // Reopen just day A, then tick day B in place — the list must grow live.
  const root = render(state, `dates=del_a`);
  const r = rows(root);
  assert.equal(r[1].children[0].checked, false);

  r[1].children[0].checked = true;
  fireChange(r[1].children[0]);

  const all = nodeTexts(root);
  assert.ok(all.includes("2 units planned across 2 bake days · Sourdough ×2"),
    "day B's 500 g joined the combined need");
  assert.ok(all.includes("RM 6.00"), "grand total now covers both days");
});
