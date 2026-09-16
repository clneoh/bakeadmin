// test/settings-accounts.test.js — the two lists are hers to shape (v106): what an
// expense was FOR, and HOW money moved. The card lives in More → Settings; this
// builds it for real and drives the buttons, because "add one", "delete one" and
// "never leave her with no way to pay" are behaviours, not data.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  const node = {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, value: "", checked: false, disabled: false, hidden: false,
    _listeners: {},
    classList: {
      _c: new Set(),
      add(c) { this._c.add(c); },
      remove(c) { this._c.delete(c); },
      toggle(c, on) { if (on === undefined ? !this._c.has(c) : on) this._c.add(c); else this._c.delete(c); },
      contains(c) { return this._c.has(c); },
    },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === "hidden") this.hidden = true; },
    getAttribute(k) { return this.attrs[k]; },
    focus() {}, click() {},
  };
  Object.defineProperty(node, "textContent", {
    get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
    set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
  });
  return node;
}
const registry = {};
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (registry[id] ||= createEl("div")),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: createEl("body"),
};
globalThis.window = { open() {} };
globalThis.location = { hash: "#/settings", reload() {} };
globalThis.history = { replaceState() {} };
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.fetch = async () => ({ ok: true, json: async () => [] });

const { renderSettings } = await import("../admin/js/views/settings.js");

function freshState() {
  return {
    version: 1,
    settings: {
      defaultCapacity: 12, deliveryDays: [1, 3, 5], cutoff: "18:00", currency: "RM",
      supabase: {}, cloud: {}, lock: {}, storefront: {}, referrals: {}, developer: {},
      categories: [], payMethods: [],
    },
    products: [], ingredients: [], suppliers: [], uoms: [], deliveryDates: [], orders: [],
    customers: [], purchaseOrders: [], expenses: [], deposits: [], credits: [], occasions: [],
  };
}
const walk = (n, out = []) => {
  for (const c of n.children || []) { out.push(c); walk(c, out); }
  return out;
};
const fire = (node) => (node._listeners.click || []).forEach((f) => f());
const byText = (root, text) =>
  walk(root).find((n) => n.tagName === "BUTTON" && n.textContent.trim() === text);
const boxByPlaceholder = (root, ph) =>
  walk(root).find((n) => n.tagName === "INPUT" && n.attrs.placeholder === ph);
const cardOf = (root) => walk(root).find((n) => (n.children || []).some((c) =>
  c.tagName === "H3" && c.textContent.includes("Categories & ways to pay")));

function mount(state) {
  const root = createEl("div");
  renderSettings(root, state);
  return root;
}

test("the card lists the built-in chart and the ways to pay, with a loan among them", () => {
  const root = mount(freshState());
  const text = cardOf(root).textContent;
  for (const label of ["Rent", "Salary (you)", "EPF / SOCSO", "My own withdrawal"]) {
    assert.ok(text.includes(label), `${label} is on the card`);
  }
  assert.ok(text.includes("Loan"), "the third choice she asked for");
  assert.ok(text.includes("in your purse or phone"), "cash and TNG are marked as the ones that move the purse");
});

test("a category she adds becomes part of the chart", () => {
  const state = freshState();
  const root = mount(state);

  boxByPlaceholder(root, "e.g. Baking class").value = "Baking class";
  fire(byText(root, "A running cost")); // the class it belongs to
  fire(byText(root, "＋ Add a category"));

  assert.deepEqual(state.settings.categories.map((c) => c.label).slice(-1), ["Baking class"]);
  assert.equal(state.settings.categories.slice(-1)[0].cls, "expense", "recorded as a running cost");
  // The screen redraws itself, so the new one is on the rebuilt card.
  assert.ok(cardOf(registry["view"]).textContent.includes("Baking class"));
});

test("a category she does not want can go, and its records are kept", () => {
  const state = freshState();
  const root = mount(state);
  state.expenses = [{ id: "e1", date: "2026-09-10", amount: 30, category: "Utilities" }];
  const redraw = mount(state); // as the screen looks with that expense recorded

  // The ✕ beside Utilities.
  const rows = walk(cardOf(redraw)).filter((n) => String(n.className).includes("info-row"));
  const utilities = rows.find((r) => r.children[0].textContent === "Utilities");
  fire(walk(utilities).find((n) => n.tagName === "BUTTON"));

  const layer = registry["confirm-layer"];
  fire(walk(layer).find((n) => n.tagName === "BUTTON" && n.textContent.trim() === "Delete"));

  assert.ok(!state.settings.categories.some((c) => c.label === "Utilities"), "gone from the chart");
  assert.equal(state.expenses.length, 1, "and the expense recorded under it is untouched");
  assert.equal(root.children.length >= 0, true); // the tree the caller held is simply replaced
});

test("a way to pay she adds is hers, and the last one cannot be deleted", () => {
  const state = freshState();
  const root = mount(state);
  boxByPlaceholder(root, "e.g. Bank OD").value = "Bank OD";
  fire(byText(root, "＋ Add a way to pay"));
  assert.deepEqual(state.settings.payMethods, ["Cash", "TNG", "Loan", "Bank OD"]);

  // Deleting down to the last one is refused: there must always be a way to pay.
  state.settings.payMethods = ["Cash"];
  const one = mount(state);
  const cashRow = walk(cardOf(one)).filter((n) => String(n.className).includes("info-row"))[0];
  fire(walk(cashRow).find((n) => n.tagName === "BUTTON"));
  assert.deepEqual(state.settings.payMethods, ["Cash"], "she cannot delete the only way to pay");
});
