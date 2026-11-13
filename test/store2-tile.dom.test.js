// test/store2-tile.dom.test.js — the /store2/ trial's product TILE, driven end to end (v687_2).
//
// ⚠️ WHY THIS FILE EXISTS. Every card test in this suite (store.pool.dom, storefront.config, store-shop-parts)
// targets /store/, and the drift guard deliberately does NOT compare store2/app.js — so the tile that v686_2
// built had no test at all: a broken stepper or a fold that snapped shut would have passed 4,020 green.
// ⭐ The day /store2/ BECOMES /store/, these are the assertions that replace the `.card-head` ones.
//
// What it pins, each from a review finding on v686_2:
//   1. The tile's shape: card-body > [card-words, card-buy(price, stepper), (Details fold)].
//   2. Her description is drawn WHOLE (no fold of its own, nothing cut).
//   3. "What is in it" is ON the tile — never inside the fold; "Keeping it" is in the fold.
//   4. The fold stays open through the rebuild a + press makes.
//   5. A RESIZE re-reads the bar's height and the spacer (an iPad turned 1024 → 768 kept the card's height).

import { test } from "node:test";
import assert from "node:assert/strict";

// ⚠️ A shim as unforgiving as the real DOM where it matters here: `append(null)` prints "null" (as the real
// one does), and a listener is called with `this` bound to its element — the fold's `ontoggle` reads
// `this.open`, and a shim that called it bare would throw for a reason that is not the shop's.
function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    scrollTop: 0, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) this.children.push(c == null ? { nodeType: 3, text: "null" } : c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) this.children.push(c == null ? { nodeType: 3, text: "null" } : c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    focus() {}, click() {},
  };
}
const registry = {};
// The bar, as a desktop lays it out: a tall card. `querySelector(".order-bar")` is how the shop finds it.
const bar = Object.assign(createEl("div"), {
  offsetHeight: 260,
  getBoundingClientRect() { return { height: this.offsetHeight }; },
});
const rootStyle = {};
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (registry[id] ||= createEl("div")),
  querySelector: (sel) => (sel === ".order-bar" ? bar : null),
  querySelectorAll: () => [],
  body: createEl("body"),
  documentElement: { style: { setProperty(k, v) { rootStyle[k] = v; } } },
  _docListeners: {},
  addEventListener(t, f) { (this._docListeners[t] ||= []).push(f); },
  removeEventListener() {},
};
const winListeners = {};
globalThis.window = {
  open() {},
  addEventListener(t, f) { (winListeners[t] ||= []).push(f); },
  removeEventListener() {},
};

// Freeze "now": Tue 1 Sep 2026, 10:00 — Wed 2 Sep is the first open day (Mon/Wed/Fri, 6pm cut-off).
const RealDate = globalThis.Date;
class MockDate extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super(2026, 8, 1, 10, 0, 0); }
  static now() { return new MockDate().getTime(); }
}
globalThis.Date = MockDate;

const LONG = "Slow-fermented for two days, baked in olive oil until the base crackles, finished with rosemary "
  + "from the garden and flakes of sea salt — the loaf people come back for, and the one we sell out of first.";
const published = {
  products: [
    { name: "Focaccia", price: 16, unit: "loaf", description: LONG,
      allergens: "Wheat flour, olive oil, salt", keeping: "Best on the day; two days in a paper bag" },
    { name: "Sandwich", price: 8, unit: "piece" },
  ],
};
const DAY = "2026-09-02";
globalThis.fetch = async (url) => {
  if (String(url).includes("product_availability")) {
    return { ok: true, json: async () => [
      { date: DAY, product: "Focaccia", slots_left: 12 }, { date: DAY, product: "Sandwich", slots_left: 5 }] };
  }
  if (String(url).includes("storefront_config")) return { ok: true, json: async () => [{ data: JSON.stringify(published) }] };
  return { ok: true, json: async () => [{ date: DAY, slots_left: 6 }], text: async () => "" };
};

await import("../store2/app.js");
const flush = () => new Promise((r) => setTimeout(r, 0));
await flush(); await flush(); await flush();

const kids = (n) => (n && n.children) || [];
const textOf = (n) => kids(n).map((c) => (c.nodeType === 3 ? c.text : textOf(c))).join("");
const byClass = (n, cls) => kids(n).find((c) => String(c.className || "").split(" ").includes(cls));
function walkFind(n, pred) {
  for (const c of kids(n)) { if (pred(c)) return c; const hit = walkFind(c, pred); if (hit) return hit; }
  return null;
}
function tile(name) {
  const card = kids(registry["menu"]).find((c) => String(c.className).includes("tile")
    && textOf(byClass(byClass(byClass(c, "card-body"), "card-words"), "card-title")) === name);
  assert.ok(card, `the ${name} tile is on the menu`);
  return card;
}
const bodyOf = (card) => { const b = byClass(card, "card-body"); assert.ok(b, "the card body"); return b; };

test("the tile's shape: words, then the price and the + and − together, then the fold", () => {
  const body = bodyOf(tile("Focaccia"));
  const names = kids(body).filter((c) => c.nodeType === 1).map((c) => String(c.className).split(" ")[0]);
  assert.deepEqual(names.slice(0, 3), ["card-words", "card-buy", "prod-more"],
    "card-body runs words → buy → Details (v686_2's tile, now pinned)");
  const buy = byClass(body, "card-buy");
  assert.equal(textOf(byClass(buy, "card-price")), "RM16.00", "the price sits in the buy block");
  assert.ok(byClass(buy, "stepper"), "the + and − sit with the price");
  assert.equal(walkFind(body, (c) => c.nodeType === 3 && c.text === "null"), null, "no printed null anywhere");
});

test("her description is drawn whole — nothing cut, nothing folded away (v687_2)", () => {
  const words = byClass(bodyOf(tile("Focaccia")), "card-words");
  assert.equal(textOf(byClass(words, "prod-desc")), LONG, "the whole description, in the words");
});

test("'What is in it' is ON the tile; 'Keeping it' is in the fold (v687_2)", () => {
  const body = bodyOf(tile("Focaccia"));
  const words = byClass(body, "card-words");
  const allergen = kids(words).find((c) => c.className === "prod-fact");
  assert.ok(allergen, "⚠️ the allergen line is printed on the tile, not behind a press");
  assert.match(textOf(allergen), /Wheat flour, olive oil, salt/);
  const fold = byClass(body, "prod-more");
  assert.equal(fold.tagName, "DETAILS");
  const inFold = textOf(fold);
  assert.match(inFold, /two days in a paper bag/, "keeping is in the fold");
  assert.doesNotMatch(inFold, /Wheat flour/, "⚠️ the allergen line is NOT also hidden in the fold");
  // A product with neither fact has no fold and no fact line at all.
  const plain = bodyOf(tile("Sandwich"));
  assert.equal(byClass(plain, "prod-more"), undefined, "no fold when there is nothing to fold");
  assert.equal(walkFind(plain, (c) => c.className === "prod-fact"), null, "no fact line she did not write");
});

// ★★★ THE STEP LOCK (v454): + refuses until a bake day has been TAPPED — the same tap store.pool.dom makes.
function tapDay() {
  const hit = walkFind(registry["dates"], (c) => c.tagName === "BUTTON"
    && String(c.className || "").includes("cal-cell") && String(c.className || "").includes("tappable"));
  if (hit && hit._listeners.click) hit._listeners.click[0]();
  return !!hit;
}

test("the Details fold stays open through the rebuild a + press makes", async () => {
  assert.ok(tapDay(), "a bake day was tapped (step 1 before step 2)");
  await flush();
  const fold = byClass(bodyOf(tile("Focaccia")), "prod-more");
  fold.open = true;
  for (const f of fold._listeners.toggle || []) f.call(fold, { type: "toggle" });
  const plus = byClass(byClass(bodyOf(tile("Focaccia")), "card-buy"), "stepper").children[2];
  plus._listeners.click[0]();
  await flush();
  const again = byClass(bodyOf(tile("Focaccia")), "prod-more");
  assert.notEqual(again, fold, "the card WAS rebuilt (otherwise this proves nothing)");
  assert.equal(again.attrs.open, "", "⭐ and the rebuilt fold is drawn open");
});

test("a RESIZE re-reads the bar's height and the spacer (v687_2 — the iPad turn)", () => {
  const spacer = registry["bar-spacer"];
  bar.offsetHeight = 260;                       // landscape: the sidebar card
  for (const f of winListeners.resize || []) f();
  assert.equal(rootStyle["--bar-h"], "260px");
  bar.offsetHeight = 126;                       // turned to portrait: the strip along the foot
  for (const f of winListeners.resize || []) f();
  assert.equal(rootStyle["--bar-h"], "126px", "⚠️ the page's foot follows the bar's NEW shape");
  assert.equal(spacer.style.height, "126px", "⚠️ and so does the spacer");
});

// ★ The three layout findings live in the stylesheet, where no DOM shim can see them — so they are read there.
import { readFileSync } from "node:fs";
test("the stylesheet: no cut description, a privacy panel that fits under the card, no guessed row count", () => {
  const css = readFileSync(new URL("../store2/app.css", import.meta.url), "utf8");
  const descRule = (css.match(/\.tile \.prod-desc\s*\{[^}]*\}/g) || []).join("\n");
  assert.doesNotMatch(descRule, /line-clamp/, "⚠️ her description is never cut to N lines with no way to read the rest");
  const desk = css.slice(css.indexOf("@media (min-width: 960px)"));
  assert.match(desk, /\.order-bar \.privacy-sheet\s*\{[^}]*max-height:[^;]*var\(--bar-h/,
    "⚠️ on a desktop the panel's height is what is LEFT under the card (a 768px laptop cut its foot off)");
  assert.doesNotMatch(desk, /span 12/, "⚠️ the card's sticky range is the steps column, not a guessed row count");
  assert.match(desk, /\.steps-col\s*\{[^}]*grid-column:\s*1/, "the steps are one column beside the card");
});
