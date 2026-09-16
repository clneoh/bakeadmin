// test/profit.test.js — the books (v105). She asked for accounting software, so
// what this pins is the accounting: sales at the price sold, cost of sales from the
// recipes (NOT the packs bought), running costs by category, and the owner's own
// money kept out of profit entirely.

import { test } from "node:test";
import assert from "node:assert/strict";

const { profitBetween, monthSpan, orderDay, lineCost } = await import("../admin/js/profit.js");
const { classOfCategory, categoryLabels, DEFAULT_CATEGORIES } = await import("../admin/js/accounts.js");

// Flour at 1 sen a gram; a Focaccia's recipe uses 100 g, so a loaf costs RM1.00 to
// bake and sells at RM15.
function state() {
  return {
    settings: { currency: "RM" },
    uoms: [],
    ingredients: [{ id: "g1", name: "Flour", unit: "g", costPerUnit: 0.01, active: true }],
    products: [{
      id: "p1", name: "Focaccia", price: 15, active: true,
      recipe: [{ ingredientId: "g1", qty: 100 }],
    }],
    deliveryDates: [{ id: "d1", date: "2026-09-10" }],
    orders: [],
    expenses: [],
    deposits: [],
  };
}
const order = (extra = {}) => ({
  id: "o1", deliveryDateId: "d1", deliveryDate: "2026-09-10", productId: "p1", qty: 2, ...extra,
});

test("sales, cost of sales and gross profit come from what was sold", () => {
  const st = state();
  st.orders = [order()]; // 2 loaves: RM30 of sales, RM2.00 of ingredients
  const pl = profitBetween(st, "2026-09-01", "2026-09-30");
  assert.equal(pl.sales, 30);
  assert.equal(pl.cost, 2);
  assert.equal(pl.gross, 28);
  assert.equal(pl.lines, 1);
  assert.equal(pl.uncosted, 0, "the recipe prices this product");
});

test("a price she changed on the order is what the sale counts", () => {
  const st = state();
  st.orders = [order({ unitPrice: 12.5 })];
  const pl = profitBetween(st, "2026-09-01", "2026-09-30");
  assert.equal(pl.sales, 25, "2 × RM12.50, not the menu's RM15");
});

test("an order outside the stretch is not in it", () => {
  const st = state();
  st.orders = [order(), order({ id: "o2", deliveryDate: "2026-10-02" })];
  const sept = profitBetween(st, "2026-09-01", "2026-09-30");
  assert.equal(sept.lines, 1);
  assert.equal(sept.sales, 30);
  assert.equal(profitBetween(st, "2026-10-01", "2026-10-31").sales, 30);
});

test("an order whose delivery date was deleted still counts on its own snapshot", () => {
  const st = state();
  st.deliveryDates = [];
  st.orders = [order({ deliveryDateId: "gone" })];
  assert.equal(orderDay(st, st.orders[0]), "2026-09-10");
  assert.equal(profitBetween(st, "2026-09-01", "2026-09-30").sales, 30);
});

test("a line with no recipe cost is counted as nothing, and said so", () => {
  const st = state();
  st.products = [{ id: "p1", name: "Mystery", price: 15, active: true, recipe: [] }];
  st.orders = [order()];
  const pl = profitBetween(st, "2026-09-01", "2026-09-30");
  assert.equal(pl.cost, 0);
  assert.equal(pl.uncosted, 1, "so the screen can tell her to check the recipe");
  assert.equal(lineCost(st, st.orders[0]), 0);
});

test("running costs are listed by category, in the chart's order", () => {
  const st = state();
  st.expenses = [
    { id: "e1", date: "2026-09-05", amount: 18, category: "Packaging" },
    { id: "e2", date: "2026-09-06", amount: 30, category: "Utilities" },
    { id: "e3", date: "2026-09-07", amount: 12, category: "Packaging" },
  ];
  const pl = profitBetween(st, "2026-09-01", "2026-09-30");
  assert.equal(pl.expensesTotal, 60);
  assert.deepEqual(pl.expenses.map((e) => e.label).slice(0, 3), ["Packaging", "Rent", "Utilities"]);
  assert.equal(pl.expenses.find((e) => e.label === "Packaging").amount, 30, "same category, added up");
  assert.equal(pl.expenses.find((e) => e.label === "Rent").amount, 0, "a category with nothing still shows");
});

test("stock bought, and her own money, never touch profit", () => {
  const st = state();
  st.orders = [order()];
  st.expenses = [
    { id: "x", date: "2026-09-05", amount: 250, category: "Ingredients & shopping", poId: "po1" },
    { id: "y", date: "2026-09-05", amount: 100, category: "My own withdrawal" },
  ];
  st.deposits = [{ id: "d", date: "2026-09-04", amount: 300, method: "cash" }];
  const pl = profitBetween(st, "2026-09-01", "2026-09-30");
  assert.equal(pl.expensesTotal, 0, "a flour run is cash and the shelf, not a cost of trading");
  assert.equal(pl.net, 28, "so the month's trading is untouched by either");
  assert.equal(pl.drawings, 100, "her withdrawal is a drawing, reported apart");
  assert.equal(pl.capital, 300, "and her money in is capital, not income");
});

test("the chart of accounts covers what she named, and is hers to change", () => {
  const st = state();
  const labels = categoryLabels(st);
  for (const label of ["Rent", "Utilities", "Salary (you)", "EPF / SOCSO", "Delivery & fuel"]) {
    assert.ok(labels.includes(label), `${label} is a category`);
  }
  assert.equal(classOfCategory(st, "My own withdrawal"), "drawing");
  assert.equal(classOfCategory(st, "Ingredients & shopping"), "stock");
  assert.equal(classOfCategory(st, "Rent"), "expense");
  assert.equal(classOfCategory(st, "Something an old phone typed"), "expense",
    "an unknown label counts as an expense rather than vanishing");

  // A category she adds is hers; one she deletes still classifies its old rows.
  st.settings.categories = [...DEFAULT_CATEGORIES.map((c) => ({ ...c })), { label: "Baking class", cls: "expense" }];
  assert.ok(categoryLabels(st).includes("Baking class"));
  st.settings.categories = st.settings.categories.filter((c) => c.label !== "Rent");
  assert.ok(!categoryLabels(st).includes("Rent"), "gone from the picker");
  assert.equal(classOfCategory(st, "Rent"), "expense",
    "but the rows already written under it still count as a cost");
  assert.ok(profitBetween(st, "2026-09-01", "2026-09-30").expenses.every((e) => e.label !== "Rent"),
    "and the statement stops printing a line for it");
});

test("a month spans its own days, leap years included", () => {
  assert.deepEqual(monthSpan(2026, 8), { from: "2026-09-01", to: "2026-09-30" });
  assert.deepEqual(monthSpan(2024, 1), { from: "2024-02-01", to: "2024-02-29" });
});

// ── the statement on screen ──────────────────────────────────────────────────
function domShim() {
  const registry = {};
  const createEl = (tag) => {
    const node = {
      tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
      className: "", style: {}, value: "", checked: false, disabled: false, hidden: false,
      _listeners: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      appendChild(c) { if (c != null) this.children.push(c); return c; },
      append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
      replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
      addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
      removeEventListener() {},
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k]; },
      focus() {}, click() {},
    };
    Object.defineProperty(node, "textContent", {
      get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
      set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
    });
    return node;
  };
  globalThis.document = {
    createElement: createEl,
    createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
    getElementById: (id) => (registry[id] ||= createEl("div")),
    querySelector: () => null,
    querySelectorAll: () => [],
    body: createEl("body"),
  };
  return registry;
}
const { renderProfit } = await import("../admin/js/views/profit.js");
domShim();
const rowsOf = (root) => (function walk(n, out = []) {
  for (const c of n.children || []) { out.push(c); walk(c, out); }
  return out;
})(root).filter((n) => String(n.className).includes("pl-row"))
  .map((r) => `${r.children[0].textContent}=${r.children[1].textContent}`);

test("the statement reads down from sales to what the month left", () => {
  const st = state();
  st.orders = [order()];
  st.expenses = [{ id: "e1", date: "2026-09-05", amount: 18, category: "Packaging" }];
  // The screen opens on THIS month, so the month is set by naming its days.
  const now = new Date();
  const { from, to } = monthSpan(now.getFullYear(), now.getMonth());
  st.deliveryDates = [{ id: "d1", date: from }];
  st.orders = [order({ deliveryDate: from })];
  st.expenses = [{ id: "e1", date: from, amount: 18, category: "Packaging" }];

  const root = document.createElement("div");
  renderProfit(root, st);
  const rows = rowsOf(root);
  assert.ok(rows.includes("Sales=RM 30.00"), "sales at the top");
  assert.ok(rows.includes("Cost of sales=RM -2.00"), "what baking them cost, shown as a subtraction");
  assert.ok(rows.includes("Gross profit=RM 28.00"));
  assert.ok(rows.includes("Packaging=RM -18.00"), "the running costs, by category");
  assert.ok(rows.includes("Rent=RM 0.00"), "with the empty ones still shown");
  assert.ok(rows.includes("Total expenses=RM -18.00"));
  assert.ok(rows.includes("Net profit=RM 10.00"), "the bottom line");
  assert.ok(rows.includes("Capital you put in=RM 0.00") && rows.includes("Drawings you took out=RM 0.00"),
    "and her own money reported apart from the trading");
  assert.match(String(root.textContent), /Cost of sales|your recipes|recipes/,
    "the screen explains where the ingredient cost came from");
});

test("a month with nothing in it reads as zeroes, not blanks", () => {
  const st = state();
  const root = document.createElement("div");
  renderProfit(root, st);
  const rows = rowsOf(root);
  assert.ok(rows.includes("Sales=RM 0.00") && rows.includes("Net profit=RM 0.00"));
  assert.match(String(root.textContent), /0 order lines in this month/);
});
