// test/ui.test.js — el()/select() DOM-building behavior.
// Guards the select() helper: exactly ONE option may be selected. A
// `selected: false` value must never be set as an attribute — in a real browser
// "selected" is a boolean attribute, so any presence (even ="false") selects
// the option, and with every option selected the browser falls back to showing
// the LAST one.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, selected: false, disabled: false,
    _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    // Recorded, not dropped: select() paints the picker on change, and the only
    // way to prove that here is to fire the handler the caller would fire.
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
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

import { select } from "../admin/js/ui.js";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "delivered", label: "Delivered" },
];

test("select() marks exactly the matching option selected, no stray attributes", () => {
  const s = select(STATUSES, "confirmed", () => {});
  assert.equal(s.children.length, 3);

  assert.equal(s.children[1].selected, true, "matching option is selected");
  assert.equal(s.children[1].attrs.selected, undefined, "selected set as a property, not an attribute");

  for (const [i, o] of s.children.entries()) {
    if (i === 1) continue;
    assert.equal(o.selected, false, `option ${i} is not selected`);
    assert.equal(o.attrs.selected, undefined, `option ${i} carries no selected attribute`);
  }
});

test("select() with no match leaves every option unselected", () => {
  const s = select(STATUSES, "zzz", () => {});
  for (const o of s.children) {
    assert.equal(o.selected, false);
    assert.equal(o.attrs.selected, undefined);
  }
});

test("select() placeholder is selected when the value is empty", () => {
  const s = select([{ value: "a", label: "A" }], "", () => {}, "All statuses");
  assert.equal(s.children[0].selected, true, "placeholder selected when value is empty");
  assert.equal(s.children[1].selected, false, "real option not selected");
  assert.equal(s.children[1].attrs.selected, undefined);
});

// ── Engine v121 — the closed picker wears the tone of what it holds ──────────
// The product picker hands each choice a tone (on the shop / sold out today /
// taken down) and the closed box is painted with it. Only the closed box can be:
// iOS draws the open list itself.
const TONED = [
  { value: "a", label: "Focaccia", tone: "ok" },
  { value: "b", label: "Ciabatta", tone: "warn" },
  { value: "c", label: "Pandan", tone: "off" },
];

test("select() wears the tone of the option it holds", () => {
  assert.equal(select(TONED, "a", () => {}).className, "tone-ok");
  assert.equal(select(TONED, "b", () => {}).className, "tone-warn");
  assert.equal(select(TONED, "c", () => {}).className, "tone-off");
});

test("select() with no choice, or a toneless one, wears no colour", () => {
  assert.equal(select(TONED, "", () => {}, "Product…").className, "", "nothing picked yet");
  assert.equal(select(STATUSES, "new", () => {}).className, "", "a toneless list stays plain");
});

test("select() repaints on change, and a caller's own class survives it", () => {
  const s = select(TONED, "a", () => {}, "Product…");
  s.className = "input";            // the status filter does exactly this
  s.value = "b";
  s._listeners.change[0]();         // what the browser fires when she picks
  assert.equal(s.className, "input tone-warn", "the tone follows the choice, the class stays");
  s.value = "";
  s._listeners.change[0]();
  assert.equal(s.className, "input", "and a repaint with no tone leaves it as it was");
});
