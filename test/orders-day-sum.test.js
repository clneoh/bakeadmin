// test/orders-day-sum.test.js — the "Set day's availability" pop-up shows HOW the
// day adds up: one line per product on sale that day, ending on the number the
// order page itself uses. The owner asked for it on 15 Sep 2026 after the day's
// chip read "1/42" with no way to see where the 42 came from, or why a product she
// does not sell that day was inside it.
//
// The screens sit behind the sign-in, so this builds the pop-up for real and holds
// its arithmetic against effectiveCapacity — the function the shop's numbers come
// from. "Now" is frozen at Thu 10 Sep 2026, as in orders-cal.test.js.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  const node = {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, value: "", checked: false, disabled: false, hidden: false,
    scrollTop: 0, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus() {}, click() {},
  };
  Object.defineProperty(node, "textContent", {
    get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
    set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
  });
  return node;
}
// A layer registry, so the pop-up held in "popup-layer" can be read back after it
// has been built.
const layers = {};
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (layers[id] ||= createEl("div")),
  querySelector: () => null,
  querySelectorAll: () => [],
  scrollingElement: createEl("html"),
  body: createEl("body"),
};
globalThis.window = { open() {} };
globalThis.history = { replaceState() {} };

const RealDate = globalThis.Date;
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length) super(...args);
    else super(2026, 8, 10, 10, 0, 0); // Thu 10 Sep 2026
  }
  static now() { return new MockDate().getTime(); }
}
globalThis.Date = MockDate;

const { renderOrders } = await import("../admin/js/views/orders.js");
const { effectiveCapacity } = await import("../admin/js/bom.js");
const { orderLinePrice } = await import("../admin/js/state.js");

// Focaccia sells every day; the Saturday loaf is marked Saturdays only, and the
// day on screen (Thu 10 Sep) is not one of them. One order is already booked.
function state() {
  return {
    deliveryDates: [{ id: "d10", date: "2026-09-10" }],
    products: [
      { id: "p1", name: "Focaccia", limit: 12, active: true, recipe: [], unit: "pc" },
      { id: "p2", name: "Saturday loaf", limit: 8, active: true, recipe: [], unit: "pc",
        sellRules: [{ days: [6] }] },
    ],
    orders: [{ id: "o1", deliveryDateId: "d10", productId: "p1", qty: 2 }],
    ingredients: [],
    occasions: [],
    settings: { cutoff: "18:00", defaultCapacity: 12, currency: "RM" },
  };
}

const all = (node, out = []) => {
  for (const c of node.children || []) { out.push(c); all(c, out); }
  return out;
};
const byClass = (root, name) => all(root).find((n) => String(n.className).includes(name));
const buttonByText = (root, text) =>
  all(root).find((n) => n.tagName === "BUTTON" && n.textContent.includes(text));
// One pop-up now holds several dropdowns (who paid the courier, how they paid her),
// so a select is picked by an option it offers rather than by being the only one.
const selWith = (root, label) => all(root).find((n) => n.tagName === "SELECT"
  && all(n).some((o) => o.tagName === "OPTION" && o.textContent === label));

function openPopup(st) {
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));
  buttonByText(root, "Set day's availability")._listeners.click[0]();
  return layers["popup-layer"];
}

// The add-up table as plain lines: "· 12 Focaccia", "= 12 what the order page…".
const sumLines = (pop) => all(byClass(pop, "cost-grid"))
  .filter((n) => String(n.className).includes("cost-row"))
  .map((r) => `${byClass(r, "cost-op").textContent} ${byClass(r, "cost-val").textContent} ${byClass(r, "cost-name").textContent}`);
const totalOf = (pop) => Number(byClass(byClass(pop, "cost-total-row"), "cost-val").textContent);

test("the pop-up shows what each product contributes, ending on the shop's number", () => {
  const st = state();
  const pop = openPopup(st);

  assert.equal(byClass(pop, "cost-sum-title").textContent, "How the day adds up:");
  assert.deepEqual(sumLines(pop), [
    "· 12 Focaccia",
    "= 12 what the order page can take that day",
  ]);
  assert.equal(totalOf(pop), effectiveCapacity(st, "2026-09-10"),
    "the sum on screen IS the number the order page uses — one computation, no drift");
  assert.equal(effectiveCapacity(st, "2026-09-10"), 12, "the Saturday loaf adds nothing to a Thursday");
});

test("a product not sold that day is named as not counted, not silently dropped", () => {
  const pop = openPopup(state());
  const notes = all(pop).filter((n) => String(n.className).includes("card-sub")).map((n) => n.textContent);
  const notCounted = notes.find((t) => t.startsWith("Not counted:"));
  assert.ok(notCounted, "the pop-up says why a product it lists is not in the total");
  assert.match(notCounted, /^Not counted: Saturday loaf — not sold on this day/);

  // Its own row is still there to be adjusted — the pop-up lists every product
  // with a daily limit, and only the SUM leaves out the ones off sale.
  const rows = all(byClass(pop, "day-adj-rows")).filter((n) => String(n.className).includes("day-adjust-row"));
  assert.equal(rows.length, 2, "both products keep their row");
});

test("typing a change moves the sum and the total as she types", () => {
  const st = state();
  const pop = openPopup(st);
  const inputs = all(pop).filter((n) => String(n.className).includes("day-adj-input"));

  inputs[0].value = "3"; // Focaccia: 12 + 3
  inputs[0]._listeners.input[0]();

  assert.deepEqual(sumLines(pop), [
    "· 15 Focaccia",
    "= 15 what the order page can take that day",
  ]);
  assert.match(all(pop).map((n) => n.textContent).join(" "), /order page can still take 13/,
    "and the line under it reads against what is already booked (2)");
});

test("nothing on sale that day has a limit → the Settings default, never 0", () => {
  const st = state();
  st.products = st.products.filter((p) => p.id !== "p1"); // only the Saturday loaf is left
  const pop = openPopup(st);

  assert.equal(totalOf(pop), 12, "the day's default capacity, exactly as effectiveCapacity gives it");
  assert.equal(effectiveCapacity(st, "2026-09-10"), 12);
  assert.deepEqual(sumLines(pop), [
    "= 12 the day's default capacity (Settings) — nothing on sale this day has a daily limit",
  ]);
});

// ── v97: the tracking number lives in the Edit pop-up too ────────────────────
test("the Edit pop-up shows the tracking number and writes a new one back", () => {
  const st = state();
  st.orders[0].fulfillment = "courier";
  st.orders[0].trackingNo = "JT123";
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  buttonByText(root, "Edit")._listeners.click[0]();
  const pop = layers["popup-layer"];
  const box = all(pop).find((n) => n.tagName === "INPUT" && n.attrs.placeholder === "e.g. JT123456789");
  assert.ok(box, "the pop-up carries a box for the courier's number");
  assert.equal(box.value, "JT123", "opened on the number already saved");

  box.value = "JT999 888";
  box._listeners.input[0](); // the draft follows as she types
  buttonByText(pop, "Save changes")._listeners.click[0]();
  assert.equal(st.orders[0].trackingNo, "JT999 888", "and it reaches the order on save");
});

// ── v98/v101: Note / tracking / payment — the short way in, without Edit ────
test("Note / tracking opens just those fields, and save writes them onto the order", () => {
  const st = state();
  st.orders[0].fulfillment = "courier";
  st.orders[0].note = "no nuts";
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  buttonByText(root, "Note / tracking")._listeners.click[0]();
  const pop = layers["popup-layer"];
  assert.match(all(pop).find((n) => String(n.className).includes("popup-title-row")).textContent,
    /^Note \/ tracking \/ courier \/ payment/, "a pop-up of its own, not the whole Edit form (with the order code beside it)");
  const inputs = all(pop).filter((n) => n.tagName === "INPUT");
  assert.equal(inputs.length, 3, "the note, the number and the courier's charge — nothing else to scroll past");
  assert.equal(inputs[0].value, "no nuts", "the note as it stands");
  assert.equal(inputs[1].attrs.placeholder, "e.g. JT123456789", "and the courier's number");
  assert.equal(inputs[2].attrs.placeholder, "e.g. 8.00", "and what the courier charged");
  const paidSel = selWith(pop, "TNG transfer");
  assert.ok(paidSel, "with how it was paid");
  assert.deepEqual(paidSel.children.map((o) => o.children[0].text),
    ["Not recorded", "Cash", "TNG transfer"], "as a three-way choice, not recorded by default");

  inputs[0].value = "extra sauce";
  inputs[1].value = " JT999 888 ";
  paidSel.value = "cash";
  buttonByText(pop, "Save")._listeners.click[0]();
  assert.equal(st.orders[0].note, "extra sauce", "the note reaches the order");
  assert.equal(st.orders[0].trackingNo, "JT999 888", "and so does the number, trimmed at the ends");
  assert.equal(st.orders[0].paidMethod, "cash", "and how it was paid is recorded for reconciling");

  // "Not recorded" is the absent key, not an empty string, so a row that never had
  // a method reads exactly as it did before this existed.
  const root2 = createEl("div");
  renderOrders(root2, st, new URLSearchParams({ date: "d10" }));
  buttonByText(root2, "Note / tracking")._listeners.click[0]();
  const pop2 = layers["popup-layer"];
  selWith(pop2, "TNG transfer").value = "";
  buttonByText(pop2, "Save")._listeners.click[0]();
  assert.equal("paidMethod" in st.orders[0], false, "choosing Not recorded deletes the key");
});

// ── v124: the courier's charge, and who bore it ────────────────────────────
// The pop-up she pointed at ("the paid by in the notes/courier Tracking is for
// courier charges") now carries the charge itself. What these pin is the split she
// chose — "off profit only if I paid it" — reaching the order AND her books from the
// one Save.
const inputWithPlaceholder = (pop, ph) =>
  all(pop).find((n) => n.tagName === "INPUT" && n.attrs && n.attrs.placeholder === ph);
const feeInput = (pop) => inputWithPlaceholder(pop, "e.g. 8.00");

test("the courier charge reaches every row, and only she paying makes it an expense", () => {
  const st = state();
  st.orders[0].fulfillment = "courier";
  st.orders[0].groupId = "ordgabc123";
  st.orders.push({ ...st.orders[0], id: "o2", qty: 1 }); // a second item of one order
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  buttonByText(root, "Note / tracking")._listeners.click[0]();
  let pop = layers["popup-layer"];
  assert.equal(selWith(pop, "Loan"), undefined,
    "how she paid is not asked until she says she paid it");
  const box = feeInput(pop);
  box.value = "8";
  box._listeners.input[0].call(box); // the handler reads this.value
  const payerSel = selWith(pop, "I paid it");
  payerSel.value = "me";
  payerSel._listeners.change[0]();

  pop = layers["popup-layer"]; // the body was rebuilt to reveal the question
  const methodSel = selWith(pop, "Loan");
  assert.ok(methodSel, "now it asks how she paid the courier");
  methodSel.value = "TNG";
  buttonByText(pop, "Save")._listeners.click[0]();

  assert.equal(st.orders.length, 2, "still one order of two items");
  for (const o of st.orders) {
    assert.equal(o.courierFee, 8, "the charge belongs to the order, so every row carries it");
    assert.equal(o.courierPaidBy, "me");
  }
  assert.equal(st.expenses.length, 1, "and it became exactly one expense for that order");
  assert.equal(st.expenses[0].amount, 8);
  assert.equal(st.expenses[0].category, "Delivery & fuel");
  assert.equal(st.expenses[0].method, "TNG", "filed in the book she said she paid from");
});

test("a charge the customer bears is tagged on the row and writes nothing to her books", () => {
  const st = state();
  st.orders[0].fulfillment = "courier";
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "customer";
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  const tag = all(root).find((n) => String(n.className).includes("paid-tag courier"));
  assert.ok(tag, "the charge is on the row, in the paid-tag's own family");
  assert.equal(tag.textContent, "Courier RM 8.00 · customer");
  assert.equal(String(tag.className).includes("mine"), false,
    "and wears no amber — it is not her money going out");
  assert.equal((st.expenses || []).length, 0, "nor is it an expense: it never touched her purse");
});

test("a charge she bore wears the amber tag, because it is already off her profit", () => {
  const st = state();
  st.orders[0].fulfillment = "courier";
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "me";
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  const tag = all(root).find((n) => String(n.className).includes("paid-tag courier"));
  assert.equal(tag.textContent, "Courier RM 8.00 · me");
  assert.ok(String(tag.className).includes("mine"), "told apart at a glance from one she did not pay");
});

test("an item swapped out through Edit leaves the courier charge on the order", () => {
  // The charge belongs to the ORDER, not to any one item — so replacing the only
  // item must not take it with it. Edit has no courier control of its own; it carries
  // the two fields into the row it creates here, which is the only path where they
  // would otherwise be dropped.
  const st = state();
  st.orders[0].courierFee = 8;
  st.orders[0].courierPaidBy = "me";
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  buttonByText(root, "Edit")._listeners.click[0]();
  let pop = layers["popup-layer"];
  all(pop).find((n) => String(n.className).includes("inbox-del"))._listeners.click[0](); // ✕ that item
  pop = layers["popup-layer"];
  buttonByText(pop, "＋ Add another item")._listeners.click[0]();
  pop = layers["popup-layer"];
  const prodSel = selWith(pop, "Product…");
  prodSel.value = "p1";
  prodSel._listeners.change[0]();
  pop = layers["popup-layer"];
  buttonByText(pop, "Save changes")._listeners.click[0]();

  assert.equal(st.orders.length, 1, "one order of one item — the old line really was replaced");
  assert.equal(st.orders[0].courierFee, 8, "and the order kept the charge it had");
  assert.equal(st.orders[0].courierPaidBy, "me", "including who bore it");
});

// ── v101: the price she types on an order is what that order is sold at ─────
test("a price changed in the Edit pop-up is frozen onto that order", () => {
  const st = state();
  st.products[0].price = 15; // Focaccia, RM15
  const root = createEl("div");
  renderOrders(root, st, new URLSearchParams({ date: "d10" }));

  buttonByText(root, "Edit")._listeners.click[0]();
  const pop = layers["popup-layer"];
  const box = all(pop).find((n) => String(n.className).includes("line-price"));
  assert.ok(box, "each item line carries its selling price");
  assert.equal(String(box.value), "15", "and it opens on the price the order is sold at");

  box.value = "12.50";
  box._listeners.input.forEach((f) => f.call(box)); // the handler reads this.value
  assert.match(all(pop).map((n) => n.textContent).join(" "), /Order total: RM 25.00/,
    "2 × RM12.50 — the total follows the price she typed");

  buttonByText(pop, "Save changes")._listeners.click[0]();
  assert.equal(st.orders[0].unitPrice, 12.5, "the order is sold at the price she typed");
  // A menu price changed later never rewrites the sale.
  st.products[0].price = 22;
  assert.equal(orderLinePrice(st, st.orders[0]), 12.5, "and it stays that price afterwards");
});
