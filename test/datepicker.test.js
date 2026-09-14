// test/datepicker.test.js — the inline calendar behind the app's date controls
// (admin/js/datepicker.js). The screens it serves sit behind the sign-in, so
// these are the rules that would otherwise only be found by tapping: which days
// are tappable, which months the arrows reach, and what the button says.
//
// "Now" is frozen at Tue 1 Sep 2026 so the grid is deterministic, as in
// store.avail.test.js.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
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
}
globalThis.document = { createElement: createEl, createTextNode: (s) => ({ nodeType: 3, text: String(s) }) };

const RealDate = globalThis.Date;
class MockDate extends RealDate {
  constructor(...args) {
    if (args.length) super(...args);
    else super(2026, 8, 1, 10, 0, 0);
  }
  static now() { return new MockDate().getTime(); }
}
globalThis.Date = MockDate;

const { dateField, dayPicker } = await import("../admin/js/datepicker.js");

// ── reading the widget ───────────────────────────────────────────────────────
const btn = (w) => w.children[0];
const panel = (w) => w.children[1];
const label = (w) => btn(w).children[0].children[0].text;
const toggle = (w) => btn(w)._listeners.click[0]();

function grid(w) {
  const g = panel(w).children.find((c) => c.className === "cal-grid");
  return g.children.filter((c) => !c.className.includes("cal-dow"));
}
// The cell for day N of whichever month is showing: the leading padding cells
// differ per month, so count from the first real day rather than assuming.
function cell(w, day) {
  const g = grid(w);
  return g[g.findIndex((c) => !c.className.includes("blank")) + (day - 1)];
}
const head = (w) => panel(w).children.find((c) => c.className === "cal-head");
const arrows = (w) => [head(w).children[0], head(w).children[2]];
const title = (w) => head(w).children[1].children[0].text;

// ── the delivery-day picker ─────────────────────────────────────────────────
const DAYS = [
  { id: "d2", date: "2026-09-02" },
  { id: "d17", date: "2026-09-17" },
  { id: "d7", date: "2026-11-07" },
];

test("a day picker offers only the days it is given", () => {
  const w = dayPicker("d2", DAYS, () => {});
  assert.equal(label(w), "Wed, 2 Sep 2026", "the button names the chosen day with its weekday");

  toggle(w);
  assert.equal(title(w), "September 2026", "it opens on the chosen day's month");
  assert.equal(cell(w, 2).tagName, "BUTTON", "a day in the list is tappable");
  assert.ok(cell(w, 2).className.includes("sel"), "and the chosen one is marked");
  assert.equal(cell(w, 17).tagName, "BUTTON", "so is the other day in this month");
  assert.equal(cell(w, 3).tagName, "SPAN", "an ordinary day is not");
  assert.equal(cell(w, 3).children[0].text, "3", "…but is still drawn");
});

test("picking a day reports its id and folds the calendar away", () => {
  const picked = [];
  const w = dayPicker("d2", DAYS, (id) => picked.push(id));
  toggle(w);
  cell(w, 17)._listeners.click[0]();

  assert.deepEqual(picked, ["d17"], "the caller gets the day's id, not its date");
  assert.equal(label(w), "Thu, 17 Sep 2026", "the button now names the new day");
  assert.equal(panel(w).children.length, 0, "and the grid has folded away");
});

test("a day picker's arrows reach only the months its days span, plus this one", () => {
  const w = dayPicker("d2", DAYS, () => {});
  // Opened on September: September is the earliest month anything sits in, but
  // today's month is September too, so back is the end of the line.
  toggle(w);
  assert.equal(arrows(w)[0].disabled, true, "nothing earlier to show");
  assert.equal(arrows(w)[1].disabled, false, "November is still ahead");

  arrows(w)[1]._listeners.click[0]();
  assert.equal(title(w), "October 2026", "one month forward");
  assert.equal(cell(w, 3).tagName, "SPAN", "a month with no delivery day offers nothing");

  arrows(w)[1]._listeners.click[0]();
  assert.equal(title(w), "November 2026");
  assert.equal(cell(w, 7).tagName, "BUTTON", "the November day is offered here");
  assert.equal(arrows(w)[1].disabled, true, "and November is the end of the line");
  arrows(w)[0]._listeners.click[0]();
  arrows(w)[0]._listeners.click[0]();
  assert.equal(title(w), "September 2026");
  assert.equal(arrows(w)[0].disabled, true, "September is the other end");
});

test("a day picker with no day chosen yet shows the placeholder and today's month", () => {
  const w = dayPicker("", DAYS, () => {});
  assert.equal(label(w), "Choose a delivery day…");
  toggle(w);
  assert.equal(title(w), "September 2026", "it opens on today's month");
  assert.ok(!grid(w).some((c) => c.className.includes("sel")), "nothing is marked as chosen");
});

test("an id that is not in the list falls back to the placeholder rather than a broken date", () => {
  const w = dayPicker("d_gone", DAYS, () => {});
  assert.equal(label(w), "Choose a delivery day…");
});

// ── the free date field ─────────────────────────────────────────────────────
test("a date field offers every day of the month, with a Today shortcut", () => {
  const picked = [];
  const w = dateField("2026-09-10", (iso) => picked.push(iso));
  assert.equal(label(w), "10 Sep 2026", "the button writes the date out in full");
  toggle(w);

  assert.equal(cell(w, 3).tagName, "BUTTON", "any day is tappable — a date field records history too");
  assert.ok(cell(w, 1).className.includes("today"), "today is ringed");

  // September has no day behind us — today is the 1st — so step back a month to
  // see the days that are.
  arrows(w)[0]._listeners.click[0]();
  assert.equal(title(w), "August 2026");
  assert.ok(cell(w, 20).className.includes("past"), "a day already gone is dimmed");
  assert.equal(cell(w, 20).tagName, "BUTTON", "…but still tappable: a past order must be recordable");
  arrows(w)[1]._listeners.click[0]();
  assert.equal(title(w), "September 2026");

  const foot = panel(w).children.find((c) => c.className === "datepick-foot");
  assert.ok(foot, "the field carries the Today shortcut a picker does not need");
  foot.children[0]._listeners.click[0]();
  assert.deepEqual(picked, ["2026-09-01"], "Today hands back today's ISO date");
  assert.equal(label(w), "1 Sep 2026");
});

test("a date field's arrows reach a year either way from today", () => {
  const w = dateField("2026-09-10", () => {});
  toggle(w);
  const [prev, next] = arrows(w);
  assert.equal(prev.disabled, false, "September 2026 is not the earliest month offered");
  assert.equal(next.disabled, false);

  for (let i = 0; i < 12; i++) next._listeners.click[0]();
  assert.equal(title(w), "September 2027", "twelve months forward");
  // Each repaint builds fresh arrows, so the ones to read are the new ones.
  assert.equal(arrows(w)[1].disabled, true, "and that is as far as it goes");
  for (let i = 0; i < 24; i++) arrows(w)[0]._listeners.click[0]();
  assert.equal(title(w), "September 2025", "twelve months back from today");
  assert.equal(arrows(w)[0].disabled, true);
});

test("a date field with nothing chosen opens on today", () => {
  const w = dateField("", () => {});
  assert.equal(label(w), "Choose a date…");
  toggle(w);
  assert.equal(title(w), "September 2026");
});

test("tapping the button again folds the calendar without picking anything", () => {
  const picked = [];
  const w = dateField("2026-09-10", (iso) => picked.push(iso));
  toggle(w);
  assert.ok(panel(w).children.length, "open");
  toggle(w);
  assert.equal(panel(w).children.length, 0, "shut");
  assert.deepEqual(picked, [], "nothing was picked");
});
