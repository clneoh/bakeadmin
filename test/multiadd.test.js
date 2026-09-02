// test/multiadd.test.js — manually entering several items for the same customer
// must produce ONE order: a shared group, shown as a single list block with one
// status and one order code, exactly like a multi-item storefront order.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    scrollTop: 0, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    focus() {}, click() {},
    scrollIntoView() {},
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel) {
      const cls = String(sel || "").replace(/^\./, "").split(".").filter(Boolean);
      const out = [];
      (function walk(n) {
        const has = String(n.className || "").split(/\s+/).filter(Boolean);
        if (cls.every((c) => has.includes(c))) out.push(n);
        for (const c of n.children || []) walk(c);
      })(this);
      return out;
    },
  };
}
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: () => createEl("div"),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: createEl("body"),
};
globalThis.window = { open() {} };
globalThis.localStorage = {
  _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; },
};

const { renderOrders } = await import("../admin/js/views/orders.js");

function walk(node, fn, out = []) {
  fn(node, out);
  for (const c of node.children || []) walk(c, fn, out);
  return out;
}
function byClass(node, cls) { return walk(node, (n, o) => { if (String(n.className || "").split(/\s+/).includes(cls)) o.push(n); }); }
function byPlaceholder(node, ph) { return walk(node, (n, o) => { if (n.attrs && n.attrs.placeholder === ph) o.push(n); }); }
function byText(node, text) {
  return walk(node, (n, o) => {
    if (n.children && n.children.length === 1 && n.children[0] && n.children[0].nodeType === 3 && n.children[0].text === text) o.push(n);
  });
}
function byAttrs(node, k, v) { return walk(node, (n, o) => { if (n.attrs && n.attrs[k] === v) o.push(n); }); }
function selectedValue(sel) {
  const opt = (sel.children || []).find((c) => c.selected === true);
  return opt ? opt.value : "";
}

const baseState = () => ({
  settings: {
    currency: "RM",
    defaultCapacity: 12,
    cutoff: "18:00",
    storefront: { name: "Jienluv2bake", tngQr: "" },
  },
  products: [
    { id: "p1", name: "Focaccia", price: 15 },
    { id: "p2", name: "Sandwich", price: 8 },
  ],
  deliveryDates: [{ id: "d1", date: "2026-09-04" }],
  orders: [],
});

function click(btn) { btn._listeners.click[0](); }
function change(sel, value) { sel.value = value; (sel._listeners.change || []).forEach((f) => f.call(sel)); }

test("several manual items for one customer land as a single order group", () => {
  const state = baseState();
  const root = createEl("div");
  renderOrders(root, state, new URLSearchParams({ date: "d1" }));

  // Pick product + quantity on row 1.
  let rows = byClass(root, "add-item");
  assert.equal(rows.length, 1, "starts with one item row");
  change(rows[0].children[0], "p1"); // product select
  click(rows[0].children[1].children[2]); // stepper "+" → qty 2
  assert.equal(rows[0].children[1].children[1].textContent, "2");

  // Add a second item and pick it.
  const addAnother = byText(root, "＋ Add another item")[0];
  assert.ok(addAnother, "has an 'Add another item' button");
  click(addAnother);
  rows = byClass(root, "add-item");
  assert.equal(rows.length, 2);
  change(rows[1].children[0], "p2");
  click(rows[1].children[1].children[2]);
  click(rows[1].children[1].children[2]); // qty 3
  assert.equal(rows[1].children[1].children[1].textContent, "3");

  // Customer details apply to the whole order.
  byPlaceholder(root, "Customer name (optional)")[0].value = "Ain";
  byAttrs(root, "type", "tel")[0].value = "60123456789";

  click(byText(root, "＋ Add order")[0]);

  assert.equal(state.orders.length, 2, "two order rows (one per item)");
  const [o1, o2] = state.orders;
  assert.ok(o1.groupId && o2.groupId, "both carry a group id");
  assert.equal(o1.groupId, o2.groupId, "shared group — one customer order");
  assert.equal(o1.productId, "p1");
  assert.equal(o1.qty, 2);
  assert.equal(o2.productId, "p2");
  assert.equal(o2.qty, 3);
  assert.equal(o1.customerName, "Ain");
  assert.equal(o2.customerName, "Ain", "details apply to every item");
  assert.equal(o1.whatsapp, "60123456789");
  assert.equal(o2.whatsapp, "60123456789");
  assert.equal(o1.fulfillment, "collect");
  assert.equal(o1.status, "new");
  assert.equal(o1.deliveryDateId, "d1");
  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  assert.equal(o1.orderDate, today, "order date defaults to today");
  assert.equal(o1.createdAt, o2.createdAt, "same placed time");

  // The list shows ONE block with one status select and the combined quantity.
  const blocks = byClass(root, "list-item");
  assert.equal(blocks.length, 1, "the group is a single list block");
  assert.equal(blocks[0].querySelectorAll(".li-title")[0].children[0].text, "Focaccia + Sandwich");
  assert.equal(byClass(blocks[0], "qty-chip")[0].children[0].text, "×5");
  assert.equal(byClass(blocks[0], "sel-small").length, 1, "one status select for the whole order");
});

test("a single manual item still adds a plain order (no group)", () => {
  const state = baseState();
  const root = createEl("div");
  renderOrders(root, state, new URLSearchParams({ date: "d1" }));

  const row = byClass(root, "add-item")[0];
  change(row.children[0], "p1");
  byPlaceholder(root, "Customer name (optional)")[0].value = "Bee";
  click(byText(root, "＋ Add order")[0]);

  assert.equal(state.orders.length, 1);
  assert.equal(state.orders[0].groupId, undefined, "single item is a plain order");
  assert.equal(state.orders[0].productId, "p1");
  assert.equal(state.orders[0].qty, 1);
  assert.equal(state.orders[0].customerName, "Bee");
});

test("removing an item row drops it before submit", () => {
  const state = baseState();
  const root = createEl("div");
  renderOrders(root, state, new URLSearchParams({ date: "d1" }));

  change(byClass(root, "add-item")[0].children[0], "p1");
  click(byText(root, "＋ Add another item")[0]);
  click(byText(root, "＋ Add another item")[0]); // three rows total
  assert.equal(byClass(root, "add-item").length, 3);

  // Remove the second row (its ✕ button is the row's last child).
  click(byClass(root, "add-item")[1].children[2]);
  assert.equal(byClass(root, "add-item").length, 2, "row removed on ✕");
  assert.equal(selectedValue(byClass(root, "add-item")[0].children[0]), "p1", "kept row keeps its selection");

  click(byText(root, "＋ Add order")[0]);
  assert.equal(state.orders.length, 1, "only the kept row is added");
  assert.equal(state.orders[0].qty, 1);
});
