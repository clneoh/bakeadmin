// test/products-editor.test.js — the Products editor's per-product date rules
// ("Orders close (days before delivery)" + "Available for delivery dates").
// Renders the real view under a tiny DOM shim and drives the Add button, so the
// two optional boxes the owner fills in on her phone actually land on the saved
// product — and a backwards from/to pair is refused without saving.

import { test } from "node:test";
import assert from "node:assert/strict";

// --- DOM shim (mirrors test/orders.test.js, plus a querySelector that finds a
// descendant by id, which the recipe card needs) ---
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
// Keep toast/save timers from stalling the test run.
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

import { renderProducts } from "../admin/js/views/products.js";

// A state with just enough to render the editor: a count unit to pick, and no
// products yet (the always-visible New product card).
function freshState() {
  return {
    settings: { currency: "RM", supabase: {} },
    uoms: [
      { id: "u_loaf", name: "loaf", family: "count" },
      { id: "u_g", name: "g", family: "weight" },
    ],
    ingredients: [],
    products: [],
    orders: [],
    deliveryDates: [],
  };
}

// Every node under `root`, depth-first, in document order.
function walk(root, out = []) {
  for (const c of root.children || []) {
    out.push(c);
    walk(c, out);
  }
  return out;
}

function render(state) {
  const root = doc.createElement("div");
  renderProducts(root, state);
  return root;
}

// The New product card is always root.children[0]. Returns handles to the fields.
function formHandles(root) {
  const nodes = walk(root.children[0]);
  const byPlaceholder = (ph) => nodes.find((n) => n.tagName === "INPUT" && n.attrs.placeholder === ph);
  const dates = nodes.filter((n) => n.tagName === "INPUT" && n.attrs.type === "date");
  return {
    name: byPlaceholder("e.g. Focaccia"),
    unit: nodes.find((n) => n.tagName === "SELECT"),
    desc: nodes.find((n) => n.tagName === "TEXTAREA"),
    closeDays: byPlaceholder("e.g. 14"),
    validFrom: dates[0],
    validTo: dates[1],
    add: nodes.find((n) => n.tagName === "BUTTON"
      && (n.children || []).some((c) => c.text === "Add product")),
  };
}

const fire = (node) => (node._listeners.click || []).forEach((f) => f());

test("saving a product keeps its two date rules (close days + from–to window)", () => {
  const state = freshState();
  const root = render(state);
  const f = formHandles(root);
  assert.ok(f.closeDays, "new-product card shows the Orders-close box");
  assert.ok(f.validFrom && f.validTo, "new-product card shows From and To date pickers");

  f.name.value = "CNY Gift Set";
  f.unit.value = "u_loaf";
  f.closeDays.value = "14";
  f.validFrom.value = "2026-12-01";
  f.validTo.value = "2026-12-24";
  fire(f.add);

  assert.equal(state.products.length, 1);
  const saved = state.products[0];
  assert.equal(saved.name, "CNY Gift Set");
  assert.equal(saved.closeDays, 14, "typed close days round-trip onto the product");
  assert.equal(saved.validFrom, "2026-12-01");
  assert.equal(saved.validTo, "2026-12-24");
});

test("leaving both boxes blank saves a product that is open any day", () => {
  const state = freshState();
  const root = render(state);
  const f = formHandles(root);
  f.name.value = "Focaccia";
  f.unit.value = "u_loaf";
  fire(f.add);

  assert.equal(state.products.length, 1);
  const saved = state.products[0];
  assert.equal(saved.closeDays, undefined, "blank close box = no early close");
  assert.equal(saved.validFrom, undefined, "blank window = every open day");
  assert.equal(saved.validTo, undefined);
  assert.equal(saved.description, undefined, "blank description shows nothing on the shop");
});

test("typing a description saves it for customers to read (multiline kept)", () => {
  const state = freshState();
  const root = render(state);
  const f = formHandles(root);
  assert.ok(f.desc, "the new-product card shows the Description box");
  f.name.value = "Rosemary Focaccia";
  f.unit.value = "u_loaf";
  f.desc.value = "Crisp rosemary crust,\nairy crumb";
  fire(f.add);

  assert.equal(state.products.length, 1);
  assert.equal(state.products[0].description, "Crisp rosemary crust,\nairy crumb",
    "typed description round-trips onto the product, line breaks intact");

  const listCard = walk(root).find((n) => n.className === "product-desc");
  assert.ok(listCard, "the product's list card shows the description on the Products page");
  assert.equal(listCard.children[0].text, "Crisp rosemary crust,\nairy crumb",
    "what she typed reads back on the card");
});

test("a from-date after the to-date is refused and nothing is saved", () => {
  doc.body.replaceChildren();
  const state = freshState();
  const root = render(state);
  const f = formHandles(root);
  f.name.value = "Backwards Window";
  f.unit.value = "u_loaf";
  f.validFrom.value = "2026-12-24";
  f.validTo.value = "2026-12-01";
  fire(f.add);

  assert.equal(state.products.length, 0, "the bad product is not added");
  const toastNode = doc.body.children.at(-1);
  assert.ok(toastNode && /from.*to|swap/i.test(toastNode.textContent), "the owner is told to swap the dates");
});

test("each recipe line shows its working, the header adds them up, and the list below lands on the same total", () => {
  doc.body.replaceChildren();
  const state = freshState();
  state.ingredients = [
    { id: "ing_flour", name: "Strong flour", unit: "g", active: true, costPerUnit: 0.01 },
    { id: "ing_water", name: "Water", unit: "ml", active: true }, // no cost set
  ];
  const root = render(state);
  const nodes = walk(root.children[0]);
  const addIng = nodes.find((n) => n.tagName === "BUTTON"
    && (n.children || []).some((c) => c.text === "＋ Add ingredient"));
  assert.ok(addIng, "the recipe card offers + Add ingredient");
  fire(addIng);
  fire(addIng); // two lines

  const fireType = (n, t) => (n._listeners[t] || []).forEach((f) => f());
  const box = () => walk(root.children[0]).find((n) => n.attrs && n.attrs.id === "recipe-lines");
  const row = (i) => box().children[i];
  const sel = (i) => row(i).children.find((c) => c.tagName === "SELECT");
  const qty = (i) => row(i).children.find((c) => c.tagName === "INPUT" && c.attrs && c.attrs.type === "number");
  const caption = (i) => {
    const c = row(i).children.find((n) => n.nodeType === 1 && n.className === "line-cost");
    return c && c.children[0] ? c.children[0].text : "";
  };

  // No breakdown table before any line is filled.
  assert.ok(!walk(root.children[0]).some((n) => n.className === "cost-sum"),
    "nothing filled yet → no add-up list");

  sel(0).value = "ing_flour"; fireType(sel(0), "change");
  qty(0).value = "100"; fireType(qty(0), "change");
  sel(1).value = "ing_water"; fireType(sel(1), "change");
  qty(1).value = "200"; fireType(qty(1), "change");

  assert.equal(caption(0), "100 g × RM 0.01 = RM 1.00", "flour line shows the amount × its price");
  assert.equal(caption(1), "no cost set", "water has no cost typed yet");
  const total = walk(root.children[0]).find((n) => typeof n.textContent === "string"
    && n.textContent.startsWith("Est. ingredient cost"));
  assert.equal(total.textContent, "Est. ingredient cost / unit: RM 1.00", "the two lines add up on the header");

  const costSum = walk(root.children[0]).find((n) => n.className === "cost-sum");
  assert.ok(costSum, "the add-up list appears once lines are filled");
  const grid = costSum.children.find((n) => n.className === "cost-grid");
  const childText = (n) => (n.children && n.children[0] && n.children[0].text != null ? n.children[0].text : "");
  const kids = grid.children.map(childText);
  assert.deepEqual(kids.slice(0, 6),
    ["·", "RM 1.00", "Strong flour", "+", "RM 0.00", "Water  (no cost set)"],
    "the list adds each filled line, and a no-cost line is counted as RM 0.00 with a note");
  assert.deepEqual(kids.slice(6), ["=", "RM 1.00"],
    "the list lands on the same RM 1.00 total as the header");
});

test("a set line shows qty × its own cost per unit, and counts as one row in the add-up list", () => {
  doc.body.replaceChildren();
  const state = freshState();
  state.ingredients = [
    { id: "ing_flour", name: "Strong flour", unit: "g", active: true, costPerUnit: 0.01 },
  ];
  state.products = [
    { id: "prd_foc", name: "Focaccia", unit: "loaf", active: true,
      recipe: [{ ingredientId: "ing_flour", qty: 100, unit: "g" }] }, // RM 1.00 per loaf
  ];
  const root = render(state);
  const nodes = walk(root.children[0]);
  const addProd = nodes.find((n) => n.tagName === "BUTTON"
    && (n.children || []).some((c) => c.text === "＋ Add product"));
  assert.ok(addProd, "the recipe card offers + Add product");
  fire(addProd);

  const fireType = (n, t) => (n._listeners[t] || []).forEach((f) => f());
  const row = () => walk(root.children[0])
    .find((n) => n.attrs && n.attrs.id === "recipe-lines").children[0];
  const sel = row().children.find((c) => c.tagName === "SELECT");
  const qty = row().children.find((c) => c.tagName === "INPUT" && c.attrs && c.attrs.type === "number");
  const caption = () => {
    const c = row().children.find((n) => n.nodeType === 1 && n.className === "line-cost");
    return c && c.children[0] ? c.children[0].text : "";
  };

  sel.value = "prd_foc"; fireType(sel, "change");
  qty.value = "2"; fireType(qty, "change");

  assert.equal(caption(), "2 × RM 1.00 = RM 2.00", "the set line shows qty × the pack's per-unit cost");
  const costSum = walk(root.children[0]).find((n) => n.className === "cost-sum");
  const grid = costSum.children.find((n) => n.className === "cost-grid");
  const childText = (n) => (n.children && n.children[0] && n.children[0].text != null ? n.children[0].text : "");
  const kids = grid.children.map(childText);
  assert.deepEqual(kids, ["·", "RM 2.00", "Focaccia", "=", "RM 2.00"],
    "one + row for the set, landing on RM 2.00");
});
