// test/consolidated-view.test.js — the consolidated invoice SCREEN (v372).
//
// ⚠️ WHY THIS EXISTS ON TOP OF THE PURE TESTS. `consolidatedSheet` is proven next door; what this
// proves is that the SCREEN is wired to it — that the period pills and the customer picker really do
// re-scope the document, and that the empty state is a sentence rather than a blank card. A control
// nobody has pressed is a control nobody knows works (v333's rule), and the missing-import bug this
// session nearly shipped on the Bring-a-friend screen is exactly what a "does it build at all" test
// catches.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  const node = {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    _classes: new Set(), style: {}, value: "", checked: false, selected: false,
    disabled: false, hidden: false, _listeners: {},
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] ?? null; },
    focus() {}, click() {}, remove() {},
    querySelector: () => null, querySelectorAll: () => [],
  };
  Object.defineProperty(node, "className", {
    get() { return [...node._classes].join(" "); },
    set(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  Object.defineProperty(node, "textContent", {
    get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
    set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
  });
  return node;
}
const body = createEl("body");
// ⚠️ A PERSISTENT `#view`, so the view's own class change can be seen at all. A shim that answered
// null here would make the width code unreachable and leave it untested.
const viewEl = createEl("div");
viewEl.classList = {
  _s: new Set(),
  add(c) { this._s.add(c); },
  remove(c) { this._s.delete(c); },
  contains(c) { return this._s.has(c); },
  toggle() {},
};
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (id === "view" ? viewEl : id === "body" ? body : null),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  body,
};
globalThis.window = { innerWidth: 375, innerHeight: 812, print() {} };

const { renderConsolidated } = await import("../admin/js/views/consolidated.js");
void createEl;

const walk = (n, out = []) => { for (const c of n.children || []) { out.push(c); walk(c, out); } return out; };
const txt = (n) => walk(n).map((x) => (x.nodeType === 3 ? x.text : "")).join(" ").replace(/\s+/g, " ");
const press = (root, label) => {
  const b = walk(root).find((n) => n.tagName === "BUTTON" && txt(n).trim() === label);
  assert.ok(b, `no button reads "${label}"`);
  b._listeners.click[0]();
  return b;
};

const OCT = (d) => `2026-10-${String(d).padStart(2, "0")}`;
let n = 0;
function state() {
  n = 0;
  const order = (over) => {
    n += 1;
    return { id: `o${n}`, groupId: over.groupId || `o${n}`, status: "paid", paidReceived: true,
      paidMethod: "cash", productId: "p1", qty: 1, unitPrice: 16,
      deliveryDate: OCT(5), customerName: "Aunty Bee", whatsapp: "60111111111", ...over };
  };
  return {
    settings: { currency: "RM" },
    products: [{ id: "p1", name: "Focaccia", price: 16 }],
    deliveryDates: [], credits: [], expenses: [], deposits: [], ingredients: [], categories: [],
    orders: [
      order({ groupId: "g1", deliveryDate: OCT(5) }),
      order({ groupId: "g2", deliveryDate: OCT(20), customerName: "Mei Ling", whatsapp: "60222222222" }),
    ],
  };
}

test("★ the screen builds, and shows the period's own total", () => {
  const st = state();
  const root = createEl("div");
  renderConsolidated(root, st);
  const said = txt(root);
  assert.match(said, /Consolidated invoice/);
  assert.match(said, /RM 32\.00/, `the month's total is not on the screen: ${said.slice(0, 260)}`);
  // The period pills and the two presses come from the shared pair.
  assert.ok(walk(root).some((b) => b.tagName === "BUTTON" && txt(b).trim() === "Print"), "no Print press");
  assert.ok(walk(root).some((b) => b.tagName === "BUTTON" && txt(b).trim() === "Share"), "no Share press");
});

test("★★ the ALL pill is above the three, and carries no stepping arrows", () => {
  // Her words: __"pls add a selection ALL, on top of A DAy, A week, a month"__.
  const st = state();
  const root = createEl("div");
  renderConsolidated(root, st);
  const pills = walk(root)
    .filter((n) => n.tagName === "BUTTON" && ["All", "A day", "A week", "A month"].includes(txt(n).trim()))
    .map((n) => txt(n).trim());
  assert.deepEqual(pills, ["All", "A day", "A week", "A month"],
    `the scopes are not in the order she asked for: ${pills.join(" / ")}`);

  press(root, "All");
  // Everything, not just this month.
  assert.match(txt(root), /Everything/, "the All scope does not say what it is showing");
  // ⚠️ AND NO DEAD ARROWS. There is nothing to step on "All", and a press that cannot do anything
  // reads as a broken screen — the app's own rule for a control with nothing to do.
  const arrows = walk(root).filter((n) => n.tagName === "BUTTON" && ["‹", "›"].includes(txt(n).trim()));
  assert.equal(arrows.length, 0, "the All scope still offers stepping arrows");
  // And the other scopes still have theirs.
  press(root, "A month");
  assert.ok(walk(root).some((n) => n.tagName === "BUTTON" && txt(n).trim() === "‹"),
    "stepping disappeared from the periods that need it");
});

test("★★ the period pill really re-scopes the document", () => {
  const st = state();
  const root = createEl("div");
  renderConsolidated(root, st);
  assert.match(txt(root), /RM 32\.00/, "the month should hold both orders");

  // ⚠️ DRIVEN, NOT ASSERTED TO EXIST. The fifth of October holds only Aunty Bee's order.
  press(root, "A day");
  press(root, "‹");
  press(root, "‹"); // back to the 5th
  const said = txt(root);
  assert.match(said, /by bake day/, "the basis stopped being stated");
  assert.match(said, /A day/, "the day pill did not take");
});

test("★ picking one customer takes the other one out of the document", () => {
  const st = state();
  const root = createEl("div");
  renderConsolidated(root, st);
  // ⚠️ DRIVEN TO A KNOWN STATE FIRST. The screen keeps what she last looked at, so this test ran
  // against whatever the test before it had left — a DAY, holding one of the two orders — and its
  // assertions passed without the picker doing anything at all. The bite found that, not a reading:
  // removing `paint()` from the picker left this test green and only failed the one after it.
  press(root, "A month");
  assert.match(txt(root), /RM 32\.00/, "the month should hold both orders before the picker is touched");

  const picker = walk(root).find((x) => x.tagName === "SELECT");
  assert.ok(picker, "there is no customer picker on the screen");
  picker.value = "60222222222";
  picker._listeners.change[0].call(picker); // `select` calls back with the element as `this`
  const said = txt(root);
  assert.match(said, /Mei Ling/, "the picked customer is not named");
  assert.equal(/RM 32\.00/.test(said), false,
    `the other customer is still in the document: ${said.slice(0, 240)}`);
  assert.match(said, /RM 16\.00/, "the picked customer's own order is missing");
});

test("a customer with nothing in the period is told so, not shown a blank card", () => {
  // ⚠️ THE SCREEN REMEMBERS WHAT SHE LAST LOOKED AT — the period, the anchor and the customer are
  // kept between visits on purpose, so stepping away and back does not silently re-scope the
  // document. That means this test has to drive the picker BACK to everybody first rather than
  // assuming a fresh screen; the first run of it failed for exactly that reason.
  const st = state();
  st.orders = [];
  const root = createEl("div");
  renderConsolidated(root, st);
  const picker = walk(root).find((x) => x.tagName === "SELECT");
  picker.value = "";
  picker._listeners.change[0].call(picker);
  assert.match(txt(root), /Nothing was sold in this period/,
    "an empty period drew a blank card instead of saying so");

  // And a customer picked with nothing in the period gets their own sentence, not the same one.
  const st2 = state();
  const root2 = createEl("div");
  renderConsolidated(root2, st2);
  const picker2 = walk(root2).find((x) => x.tagName === "SELECT");
  picker2.value = "60111111111";
  picker2._listeners.change[0].call(picker2);
  st2.orders = [];
  renderConsolidated(root2, st2);
  assert.match(txt(root2), /This customer has nothing in this period/,
    "a customer with an empty period is told the bakery sold nothing at all");
});

test("★★ the page WIDENS itself on a desktop, and gives the width back when she leaves", () => {
  // ⚠️ THE WHOLE BACKOFFICE IS CAPPED AT 540px — a phone column, on every screen at every size. Her
  // words: __"that page can be optimise for desktop brouwser"__, and she is right: a filing page is
  // read and printed at a desk. **The cap is lifted for this view ALONE**, and a page that widened the
  // app without putting it back would quietly change every screen she opened next.
  const st = state();
  const root = createEl("div");
  const cleanup = renderConsolidated(root, st);
  assert.equal(viewEl.classList.contains("view-wide"), true,
    "the filing page did not widen — it is still a phone column on a desktop");
  assert.equal(typeof cleanup, "function",
    "★ the view returns no cleanup, so the wider cap would follow her to every other screen");
  cleanup();
  assert.equal(viewEl.classList.contains("view-wide"), false,
    "★ the width was not given back, so the next screen she opens is the wrong size");
});
