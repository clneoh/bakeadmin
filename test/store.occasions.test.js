// test/store.occasions.test.js — the soft wash on a standard day the bakery
// marked, and the bubble that names it. What the shop publishes here is the
// privacy boundary of the whole feature, so the render side is pinned: only the
// standard days that arrive in CONFIG.occasions may draw anything, and nothing
// draws at all when the list is empty.
//
// The name is never listed any more — the day-by-day caption under the grid was
// removed — so these tests also pin the one route that is left: the name waits in
// a hidden bubble and comes out when the day is tapped.
//
// Its own file because store/app.js renders once, at import: this one hands
// CONFIG its days before that import, where store.avail.test.js renders a
// calendar with no marks at all.
//
// "Now" is frozen at Tue 1 Sep 2026 (as in store.avail.test.js), so the
// September 2026 grid is the one under test.

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
  };
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
globalThis.fetch = async () => ({ ok: true, json: async () => [] });

const RealDate = globalThis.Date;
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length) super(...args);
    else super(2026, 8, 1, 10, 0, 0);
  }
  static now() { return new MockDate().getTime(); }
}
globalThis.Date = MockDate;

const { CONFIG } = await import("../store/config.js");
// Sorted by start date, as the app publishes them. Three shapes are under test:
// a single day, a long stretch, and a stretch that starts in the month before
// this one — which still has to be washed, because it covers the 1st and 2nd.
// December's is here only to prove a mark outside the shown month draws nothing.
CONFIG.occasions = [
  { label: "Hungry Ghost", from: "2026-08-30", to: "2026-09-02", colour: "grey" },
  { label: "Malaysia Day", from: "2026-09-16", to: "2026-09-16", colour: "red" },
  { label: "School break", from: "2026-09-19", to: "2026-09-27", colour: "orange" },
  { label: "Christmas", from: "2026-12-25", to: "2026-12-25", colour: "green" },
];

await import("../store/app.js");

const cal = () => registry["dates"].children[0];
const grid = () => cal().children.find((c) => c.className === "cal-grid");
const cells = () => grid().children.filter((c) => !c.className.includes("cal-dow"));
// September 2026's 1st is a Tuesday, so two padding cells sit in front of it.
const cell = (day) => cells()[2 + (day - 1)];
const tipOf = (c) => c.children.find((x) => String(x.className).includes("cal-tip"));
// Every node under the calendar, so a caption can never hide somewhere unexpected.
function all(node, out = []) {
  for (const c of node.children || []) { out.push(c); all(c, out); }
  return out;
}

test("a marked day wears a soft wash in its own colour", () => {
  const c = cell(16);
  assert.ok(c.className.includes("occ-red"), "Malaysia Day is washed in the colour she gave it");
  assert.ok(!cell(18).className.includes("occ-"), "a plain day in the same month is not washed");
  assert.equal(c.children[0].children[0].text, "16", "the number is still the cell's first child");
});

test("a stretch of days wears the wash across every day it covers", () => {
  for (const day of [19, 20, 21, 25, 27]) {
    assert.ok(cell(day).className.includes("occ-orange"), `${day} Sep sits inside the school break`);
  }
  for (const day of [18, 28]) {
    assert.ok(!cell(day).className.includes("occ-"), `${day} Sep falls outside it`);
  }
});

test("the name is never listed — it waits in a hidden bubble and comes out on a tap", () => {
  const nodes = all(cal());
  assert.equal(nodes.filter((c) => String(c.className).includes("cal-note-label")).length, 0,
    "the Holidays caption is gone");
  assert.equal(nodes.filter((c) => String(c.className).includes("cal-note-item")).length, 0,
    "and no day is listed anywhere else either");

  const c = cell(16);
  const tip = tipOf(c);
  assert.ok(tip, "the marked day carries a bubble");
  assert.equal(tip.children[0].text, "Malaysia Day", "holding the name she loaded");
  assert.equal(tip.hidden, true, "shut until the day is tapped");

  // The tap rebuilds the grid, so the same day has to be read again.
  c._listeners.click[0]();
  const after = cell(16);
  assert.equal(tipOf(after).hidden, false, "the tap opens it");
  assert.equal(tipOf(after).children[0].text, "Malaysia Day");
  assert.equal(tipOf(cell(18)), undefined, "and a plain day still has no bubble");
});
