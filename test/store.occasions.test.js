// test/store.occasions.test.js — the coloured dots and the "Holidays" caption
// under the customer's delivery calendar. What the shop publishes here is the
// privacy boundary of the whole feature, so the render side is pinned: only the
// standard days that arrive in CONFIG.occasions may draw anything, and nothing
// draws at all when the list is empty.
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
// this one — which still has to be named, because it covers the 1st and 2nd.
// December's is here only to prove the caption stays inside the shown month.
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
const note = () => cal().children.find((c) => c.className === "cal-note");
const items = () => note().children.filter((c) => c.className === "cal-note-item");

test("a single standard day wears its own colour as a dot", () => {
  const c = cell(16);
  const dots = c.children.filter((x) => String(x.className).includes("cal-dot"));
  assert.equal(dots.length, 1, "Malaysia Day draws one dot");
  assert.ok(dots[0].className.includes("occ-red"), "in the colour she gave it");
  assert.equal(cell(18).children.filter((x) => String(x.className).includes("cal-dot")).length, 0,
    "a plain day in the same month draws none");
});

test("a stretch of days draws a bar across every day it covers", () => {
  for (const day of [19, 20, 21, 25, 27]) {
    const bars = cell(day).children.filter((x) => String(x.className).includes("cal-bar"));
    assert.equal(bars.length, 1, `${day} Sep sits inside the school break`);
    assert.ok(bars[0].className.includes("occ-orange"));
  }
  for (const day of [18, 28]) {
    assert.equal(cell(day).children.filter((x) => String(x.className).includes("cal-bar")).length, 0,
      `${day} Sep falls outside it`);
  }
});

test("the caption names this month's days, one entry each, with the Holidays label", () => {
  const label = note().children.find((c) => c.className === "cal-note-label");
  assert.equal(label.children[0].text, "Holidays");

  const shown = items().map((i) => i.children[0].text);
  assert.deepEqual(shown,
    ["30 Aug – 2 Sep · Hungry Ghost", "16 Sep · Malaysia Day", "19 Sep – 27 Sep · School break"],
    "a single day reads as a date, a stretch as its range, the stretch from last month "
    + "still gets named, and December's is left out");
});
