// test/scenario-view.test.js — the Scenario planner's day chart rendered under a
// small DOM shim. Two things it pins, both from 22 Sep 2026:
//
//   1. A cycle's labour is drawn at the minute she really works it, and it is
//      never thinner inside the bar than the same job is on the person row
//      below it. Drawn one pixel wide, the fold landed exactly on the seam
//      between two cycles and read as that seam rather than as her working there.
//
//   2. The button that applies the ladder sits on the climb card's own heading.
//      A day of nine modules makes a nine-rung ladder, and a control she has to
//      scroll past all of it to reach is a control that has gone missing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    scrollTop: 0, hidden: false, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) { this.children.push(c); if (c.nodeType === 1) c.parent = this; } return c; },
    append(...cs) { for (const c of cs) if (c != null) { this.children.push(c); if (c.nodeType === 1) c.parent = this; } },
    replaceChildren(...cs) {
      this.children = [];
      for (const c of cs) if (c != null) { this.children.push(c); if (c.nodeType === 1) c.parent = this; }
    },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener(t, f) { this._listeners[t] = (this._listeners[t] || []).filter((x) => x !== f); },
    dispatchEvent(ev) { (this._listeners[ev.type] || []).forEach((f) => f(ev)); return true; },
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === "hidden") this.hidden = true;
      // A real DOM reflects its boolean attributes onto the properties a view
      // reads back, so `setAttribute("disabled", true)` makes `node.disabled`
      // true. A shim that kept only the attribute made a switched-off press read
      // as live and a placeholder option read as a pickable answer — the same
      // class of fault as the data-* gap below, on the other side of the same
      // question: a stub must be as unforgiving as the browser it stands in for.
      if (k === "disabled" || k === "selected" || k === "checked") this[k] = true;
      // A real DOM exposes a data-* attribute on `dataset`, and the timeline's tap
      // reads which batch it hit off `hit.dataset.k`. A shim that kept the attribute
      // and not the dataset made every bar tap read as batch 1: a whole class of
      // taps the tests could not see, because the stub was more forgiving than the
      // browser it stands in for.
      const m = /^data-(.+)$/.exec(k);
      if (m) this.dataset[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
    },
    getAttribute(k) { return this.attrs[k]; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 600, height: 400 }; },
    focus() {}, click() {},
    // A real node detaches itself from its parent and this one has to as well:
    // a call card that could only be "removed" by the shim quietly doing nothing
    // would let a dismissed announcement sit on the screen in every test.
    remove() {
      if (!this.parent) return;
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
      this.parent = null;
    },
    querySelector() { return null; },
  };
}
const layers = { "confirm-layer": createEl("div"), "popup-layer": createEl("div") };
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => layers[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  body: createEl("body"),
};
globalThis.setTimeout = (fn) => { fn(); return 1; };
globalThis.clearTimeout = () => {};
// The live clock's tick. The run holds a real interval in a browser and a handle
// here, so a test can drive the day a minute at a time instead of waiting for it.
const ticks = [];
globalThis.setInterval = (fn) => { ticks.push(fn); return ticks.length; };
globalThis.clearInterval = () => {};
// The wall clock the run measures itself against. Frozen, so a call's minute is
// an assertion rather than a race — and moved on by hand to walk the day.
let NOW = new Date("2026-09-22T09:00:00").getTime();
Date.now = () => NOW;
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  globalThis.crypto = { randomUUID: () => "00000000-0000-4000-8000-000000000000" };
}
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { renderScenario } = await import("../admin/js/views/scenario.js");
const { ONE_BAKER_SCENARIO, climbSteps, computeScenario, callWindows } = await import("../admin/js/scenario.js");

// Every element under `root`, depth-first, in document order.
function walk(root, out = []) {
  for (const c of root.children || []) {
    if (c.nodeType !== 1) continue;
    out.push(c);
    walk(c, out);
  }
  return out;
}
// The shim keeps text in child text nodes, so this walks them rather than
// trusting a `textContent` a real browser would maintain.
function textOf(n) {
  let s = n.textContent || "";
  for (const c of n.children || []) {
    if (c.nodeType === 3) s += ` ${c.text}`;
    else if (c.nodeType === 1) s += ` ${textOf(c)}`;
  }
  return s;
}
const hasClass = (n, cls) => new RegExp(`(^|\\s)${cls}(\\s|$)`).test(n.className || "");
// A px value out of the inline style string the view writes.
function px(node, key) {
  const m = new RegExp(`${key}:(-?\\d+(?:\\.\\d+)?)px`).exec(node.attrs.style || "");
  return m ? Number(m[1]) : null;
}

function render(overrides = {}) {
  const scen = {
    ...ONE_BAKER_SCENARIO,
    modules: ONE_BAKER_SCENARIO.modules.map((m) => ({ ...m, cycles: (m.cycles || []).map((c) => ({ ...c })) })),
    ...overrides,
  };
  const state = { settings: { currency: "RM", deliveryDays: [1, 3, 5], scenario: scen, scenarios: [] }, uoms: [], ingredients: [], products: [], orders: [], deliveryDates: [] };
  const root = createEl("div");
  renderScenario(root, state);
  return { root, state };
}

// The bars of the row whose name cell carries `name`.
function rowFor(root, name) {
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes(name));
  assert.ok(row, `no timeline row named ${name}`);
  const track = walk(row).find((n) => hasClass(n, "tl-track"));
  return walk(track).filter((n) => hasClass(n, "tl-bar"));
}
const bandsOf = (bar) => (bar.children || []).filter((c) => c.nodeType === 1 && hasClass(c, "tl-touch"));
const cyclesOf = (bar) => (bar.children || []).filter((c) => c.nodeType === 1 && hasClass(c, "tl-cycle"));
// The shade class of a cycle segment, as `shade-N`.
const shadeOf = (seg) => (String(seg.className).match(/shade-\d+/) || [""])[0];
// The batch numbers drawn above the bars of the row named `name`.
function tagsFor(root, name) {
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes(name));
  assert.ok(row, `no timeline row named ${name}`);
  const track = walk(row).find((n) => hasClass(n, "tl-track"));
  return walk(track).filter((n) => hasClass(n, "tl-btag"));
}

test("the fold is drawn at its own minute, at the end of its rest", () => {
  const { root } = render();
  const bar = rowFor(root, "The rests and the stretch and folds")[0];
  const barW = px(bar, "width");
  const bands = bandsOf(bar);
  assert.equal(bands.length, 3, "the first three rests each end in a fold");
  // The batch is 31 + 31 + 31 + 30 minutes and the fold is the last minute of
  // each rest, so the drawn position is 30/123 of the way along the bar — and it
  // must not be drawn at the bar's start, which is where the old screen put it.
  const where = px(bands[0], "left") / barW;
  assert.ok(Math.abs(where - 30 / 123) < 0.01, `fold drawn at ${where} of the batch, expected ${30 / 123}`);
});

test("a one-minute job is never thinner on the bar than on the person row", () => {
  const { root } = render();
  const bar = rowFor(root, "The rests and the stretch and folds")[0];
  const band = bandsOf(bar)[0];
  const bandW = px(band, "width");
  assert.ok(bandW >= 4, `the fold is drawn ${bandW}px wide — too thin to read`);

  // The same minute of her day, on the person row that attends it. The two rows
  // are the same arithmetic drawn twice, so they must agree about its width —
  // and its position must agree to within the pixel each of them rounds to.
  const at = px(bar, "left") + px(band, "left");
  const person = rowFor(root, "Person 1")
    .map((b) => ({ left: px(b, "left"), width: px(b, "width") }))
    .filter((b) => Math.abs(b.left - at) <= 1);
  assert.equal(person.length, 1, `no single person-row stretch starts at the fold (px ${at})`);
  assert.equal(person[0].width, bandW, "the bar and the person row disagree about a one-minute job");
});

test("the oven swap is drawn after the bake, not before it", () => {
  const { root } = render();
  const bar = rowFor(root, "The oven swap and the bake")[0];
  const barW = px(bar, "width");
  const band = bandsOf(bar)[0];
  // The module is a 13-minute bake then a 2-minute swap, so her hands are at the
  // far end of it. Drawn at the start it would read as hands going in before the
  // pans came out.
  const where = px(band, "left") / barW;
  assert.ok(Math.abs(where - 13 / 15) < 0.01, `the swap is drawn at ${where} of the module, expected ${13 / 15}`);
});

test("the climb card carries its apply button on the heading when there is a ladder", () => {
  const { root } = render({ target: 48 });
  const heading = walk(root).find((n) => hasClass(n, "section") && textOf(n).includes("The climb"));
  assert.ok(heading, "no climb card");
  const row = heading.parent;
  const btn = walk(row).find((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n)));
  assert.ok(btn, "the heading does not carry the apply button");
  // And the foot of the card still does, so both ends of a long ladder offer it.
  const all = walk(root).filter((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n)));
  assert.equal(all.length, 2);
});

test("a scenario that already makes the number she wants offers no button to press", () => {
  const { root } = render({ target: 24 });
  const all = walk(root).filter((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n)));
  assert.equal(all.length, 0, "there is nothing to apply, so there must be nothing to press");
  assert.match(textOf(root), /already makes your 24 pans/);
});

// ── The way down (v149) ─────────────────────────────────────────────────────
// Her report, 22 Sep 2026, on a One baker day the ladder had raised to 36 and
// then asked for 24: "this does not agrees?" The card said the day already made
// her 24 pans while the line directly above it said the day made 36, and there
// was nothing anywhere on the card to press. Both halves of that are pinned here.

// Her own day, raised the way the ladder raises it, so these tests start from the
// day she was actually looking at rather than from a scenario written in here.
function raisedTo(want) {
  const climb = climbSteps(ONE_BAKER_SCENARIO, want);
  const out = { ...ONE_BAKER_SCENARIO, modules: ONE_BAKER_SCENARIO.modules.map((m) => ({ ...m })) };
  for (const s of climb.steps) {
    out.modules = out.modules.map((m) => (m.id === s.id ? { ...m, ...(s.patch || { repeats: s.to }) } : m));
  }
  return out;
}

test("a day above the number she asked for is headed The way down and offers the button", () => {
  const raised = raisedTo(36);
  const { root } = render({ modules: raised.modules, target: 24 });
  const heading = walk(root).find((n) => hasClass(n, "section") && textOf(n).includes("The way down"));
  assert.ok(heading, "the card is not headed the way down");
  assert.match(textOf(root), /This scenario makes 36 pans, and you want 24\./);
  // The heading carries it, and the foot of the card still does: the day of nine
  // modules that made the climb's ladder long makes this card long too.
  const btn = walk(heading.parent).find((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n)));
  assert.ok(btn, "the heading does not carry the apply button");
  const all = walk(root).filter((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n)));
  assert.equal(all.length, 2);
});

test("the card cannot say it already makes her number while it says the day makes more", () => {
  // The exact contradiction she reported, as an assertion: the two sentences can
  // never appear together, because the branch that reads "already makes" is only
  // reached when the two numbers really do agree.
  const raised = raisedTo(36);
  const { root } = render({ modules: raised.modules, target: 24 });
  assert.doesNotMatch(textOf(root), /already makes your 24 pans/, "the card still says the two numbers agree");
  // And the honest reading of the gap is there instead.
  assert.match(textOf(root), /12 pans more than you asked for/);
});

test("pressing Use these numbers brings the day down and leaves her batch times alone", () => {
  const raised = raisedTo(36);
  // She has dragged the mixing's third batch an hour later than its own rhythm.
  // Coming down takes batches off the END of the day, so the times she set by hand
  // have to survive the move — the one place this half deliberately differs from
  // the climb, which re-spaces a module's times because a new count is a new rhythm.
  raised.modules = raised.modules.map((m) => (m.id === "solo_mix" ? { ...m, starts: [1, 88, 235, 262, 349, 436] } : m));
  const { root, state } = render({ modules: raised.modules, target: 24 });
  const btn = walk(root).find((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n)));
  assert.ok(btn, "no button to press");
  btn.dispatchEvent({ type: "click" });

  const mods = state.settings.scenario.modules;
  assert.ok(mods.every((m) => m.repeats === 4), "the button did not bring every module holding the day down");
  assert.equal(computeScenario(state.settings.scenario).pansPerDay, 24, "the day did not land on her number");
  // The stored list can still be longer than the batches that are left — the move
  // writes the count and never throws away a time she set by hand. Every reader
  // takes only the first `repeats` of it, so the four that remain are hers and
  // the ones off the end are kept rather than destroyed.
  const mix = mods.find((m) => m.id === "solo_mix");
  assert.deepEqual(mix.starts.slice(0, 4), [1, 88, 235, 262], "her dragged batch time was rewritten by the move");
});

test("a batch bigger than the number she wants says so instead of offering a dead button", () => {
  // Six pans a batch and one batch a day; she asks for three. Running fewer
  // batches cannot get under one batch, so there is no move to offer — and a card
  // with nothing on it has to say why rather than read as broken.
  const thin = { ...ONE_BAKER_SCENARIO, modules: ONE_BAKER_SCENARIO.modules.map((m) => ({ ...m, repeats: 1 })) };
  const { root } = render({ modules: thin.modules, target: 3 });
  assert.equal(walk(root).filter((n) => n.tagName === "BUTTON" && /Use these numbers/.test(textOf(n))).length, 0);
  assert.match(textOf(root), /one batch is 6 pans/);
  // Headed by its subject and not by whether a button is there: a card about the
  // day being too high must not be headed "The climb".
  const heading = walk(root).find((n) => hasClass(n, "section") && /The way down|The climb/.test(textOf(n)));
  assert.match(textOf(heading), /The way down/);
});

// ── The cycles inside a batch (v150) ───────────────────────────────────────
// Her report, 22 Sep 2026: "there is not steps term in this project, i want the
// cycle shown in batch, and the cycle labour shown visually". The drawing was
// already there; what was wrong was the word the screen used for a cycle, and a
// shade ladder that claimed "a batch of four reads as four" while giving a
// four-cycle batch the shades 0, 1, 2, 0 — the first and the last cycle wearing
// the same palest band.

test("a batch of four cycles is drawn in four different shades (v150)", () => {
  const { root } = render();
  // The seeded day's fold is one batch of four cycles: three 30-minute rests
  // each ending in a fold, and a last rest that is a rest and nothing else.
  const bar = rowFor(root, "The rests and the stretch and folds")[0];
  const shades = cyclesOf(bar).map(shadeOf);
  assert.equal(shades.length, 4, `the four cycles of the batch drew ${shades.length} segments`);
  assert.deepEqual(shades, ["shade-0", "shade-1", "shade-2", "shade-3"],
    "a four-cycle batch fell back to a shade it had already used");
});

test("a long batch never falls back to the palest shade (v150)", () => {
  // Five cycles on one batch. The ladder caps rather than wraps, so the fifth
  // wears the darkest band and the batch never ends on the faintest one — the
  // whole point of the ladder is that a cycle reads as a band of its own.
  const five = [{ name: "Rest", min: 25, load: 0, unload: 1 }, { name: "Rest", min: 25, load: 0, unload: 1 },
    { name: "Rest", min: 25, load: 0, unload: 1 }, { name: "Rest", min: 24, load: 0, unload: 1 },
    { name: "Rest", min: 24, load: 0, unload: 0 }];
  const modules = ONE_BAKER_SCENARIO.modules.map((m) => (m.id === "solo_fold" ? { ...m, cycles: five } : m));
  const { root } = render({ modules });
  const shades = cyclesOf(rowFor(root, "The rests and the stretch and folds")[0]).map(shadeOf);
  assert.equal(shades.length, 5, `the five cycles drew ${shades.length} segments`);
  assert.equal(shades[4], "shade-3", "the fifth cycle fell back to the palest shade");
  assert.notEqual(shades[4], shades[0]);
});

test("the cycles box does not call a cycle a step (v150)", () => {
  // The chart's own legend paragraph used to be the rendered half of this test.
  // She asked for that paragraph gone in v157 — 330 pixels of a phone screen
  // between her and the chart — so what is left is the cycles box itself, read off
  // the source: it is the sentence that made her doubt the feature existed, and the
  // one place a cycle is named in her own words.
  const src = read("admin/js/views/scenario.js");
  assert.match(src, /Each cycle is one piece of this module's work/);
  assert.doesNotMatch(src, /one step of this module/, "the screen still teaches 'step' for a cycle");
  assert.doesNotMatch(src, /the separate steps of that batch/);
});

// ── Batch numbers on the day (v151) ────────────────────────────────────────
// Her ask, 22 Sep 2026: "I want the each batch to be labeled, B=?, small word
// above it drown batch at every module, every production line."

test("every bar of every module carries its own batch number (v151)", () => {
  const { root } = render();
  const tags = walk(root).filter((n) => hasClass(n, "tl-btag"));
  assert.ok(tags.length > 0, "no batch numbers on the chart at all");
  // One per drawn batch, numbered from B1, and each one names the batch its bar
  // does — that data-k is what makes the number a handle and not just a label.
  for (const t of tags) {
    assert.match(textOf(t).trim(), /^B\d+( Δt=\+\d+)?$/, `a batch number reads "${textOf(t).trim()}"`);
    assert.ok(t.attrs["data-k"] != null, "a batch number carries no batch to open");
    assert.ok(px(t, "left") != null, "a batch number is not placed over its bar");
  }
  // The fold runs four batches in the day, so its row wears four.
  assert.equal(tagsFor(root, "The rests and the stretch and folds").length, 4);
});

test("a module she has two of wears a number on every one of its lines (v151)", () => {
  // Two ovens. The module is drawn as two lines, one under the other, and every
  // bar on both of them is a batch she has to be able to tell apart.
  const modules = ONE_BAKER_SCENARIO.modules.map((m) => (m.id === "solo_oven" ? { ...m, count: 2, overlap: false } : m));
  const { root } = render({ modules });
  const block = walk(root).find((n) => hasClass(n, "tl-block") && textOf(n).includes("The oven swap and the bake"));
  assert.ok(block, "a module she has two of is not drawn as two lines");
  const tags = walk(block).filter((n) => hasClass(n, "tl-btag"));
  // Four batches down two lines: two lots each, and every one of the four bars
  // numbered. A batch number on only the first line would leave half the day
  // unlabelled — which is exactly the module she asked to have labelled.
  assert.equal(tags.length, 4, `two lines of four batches drew ${tags.length} numbers`);
  // The batches are the MODULE's, not the line's: the odd lots take line one and
  // the even lots line two, so both lines together are B1 to B4 and neither line
  // repeats a number.
  const shown = tags.map((t) => textOf(t).trim()).sort();
  assert.deepEqual(shown, ["B1", "B2", "B3", "B4"]);
});

test("a duplicated module is a copy of it, not a new module (v151)", () => {
  const { root, state } = render();
  const before = state.settings.scenario.modules.length;
  const fold = state.settings.scenario.modules.find((m) => m.id === "solo_fold");

  // Open the fold's own editor the way she does — by tapping its row.
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes("The rests and the stretch and folds"));
  row.dispatchEvent({ type: "click" });
  const btn = walk(layers["popup-layer"]).find((n) => n.tagName === "BUTTON" && /Duplicate this module/.test(textOf(n)));
  assert.ok(btn, "the module editor offers no way to duplicate it");
  btn.dispatchEvent({ type: "click" });

  const mods = state.settings.scenario.modules;
  assert.equal(mods.length, before + 1, "duplicate did not add exactly one module");
  const at = mods.findIndex((m) => m.id === "solo_fold");
  const copy = mods[at + 1];
  assert.ok(copy && copy.id !== "solo_fold", "the copy is not a module of its own");
  assert.equal(copy.name, `${fold.name} (copy)`);
  // The copy carries the source's work verbatim. A new module's defaults are
  // exactly what must NOT reach it — retyping four cycles is the chore this
  // button exists to remove, and a copy that arrived as a fresh 20-minute module
  // would be that chore with extra steps.
  assert.deepEqual(copy.cycles, fold.cycles, "the copy did not carry the source's cycles");
  assert.equal(copy.everyMin, fold.everyMin);
  assert.equal(copy.repeats, fold.repeats);
  assert.equal(copy.batch, fold.batch);
  assert.equal(copy.person, fold.person);
});

// ── Her people (v151) ─────────────────────────────────────────────────────
// Her ask: "we should be allow to change person1 to a name, person2 to a name"
// — and her report on why she could not: "in the person card, now person card is
// not accessible". The row had no handler of any kind.

test("the person row opens their card, and a name typed there is the name on the chart (v151)", () => {
  const { root, state } = render();
  const row = walk(root).find((n) => hasClass(n, "tl-row") && hasClass(n, "tappable") && textOf(n).includes("Person 1"));
  assert.ok(row, "the person row is not a tappable row");
  row.dispatchEvent({ type: "click" });

  const field = walk(layers["popup-layer"]).find((n) => n.tagName === "INPUT" && n.attrs.type === "text");
  assert.ok(field, "the person card has no name field");
  field.value = "Ah Hock";
  field.dispatchEvent({ type: "input" });

  // Kept in the app's settings, not in the scenario: person numbers restart at 1
  // in every scenario, so a name has to belong to the person and not to the line.
  assert.equal(state.settings.personNames[1], "Ah Hock");
  assert.match(textOf(root), /Ah Hock/, "the chart still calls them Person 1");
  assert.doesNotMatch(textOf(root), /👤 Person 1/);

  // The card she is typing in follows too. It is not rebuilt — that is what keeps
  // the cursor in the box — so its own two mentions of the person are rewritten by
  // hand, and a card that went on saying "Call Person 1" over a row that said
  // "Ah Hock" is the card telling her the name did not take.
  const layer = textOf(layers["popup-layer"]);
  assert.match(layer, /👤 Ah Hock/, "the card's own title still says Person 1");
  assert.match(layer, /Call Ah Hock a minute before their next job/);
  assert.doesNotMatch(layer, /Call Person 1/);
});

// ── The live clock (v151) ─────────────────────────────────────────────────
// Her answer when asked how the announcement should be triggered: "A live
// clock". One minute before each job a person owns, in their own colour, with
// their name and a sound — and an unacknowledged call is replaced by the next.

function startTheDay(root) {
  NOW = new Date("2026-09-22T09:00:00").getTime();
  ticks.length = 0;
  const btn = walk(root).find((n) => n.tagName === "BUTTON" && /Start the day now/.test(textOf(n)));
  assert.ok(btn, "no way to start the day");
  btn.dispatchEvent({ type: "click" });
  assert.equal(ticks.length, 1, "the day is not walking");
  return () => ticks[ticks.length - 1]();
}
const minutesLater = (base, min) => { NOW = base + min * 60000; };
const callsOnChart = (root) => walk(root).filter((n) => hasClass(n, "tl-call"));

test("the call comes a minute before the job, and names the person and the job (v151)", () => {
  const { root, state } = render();
  const tick = startTheDay(root);
  const calls = callWindows(state.settings.scenario);
  // The second call of the day, so the first one's own minute is behind us and
  // the assertion is about where the call lands rather than about starting the
  // day at all.
  const second = calls.filter((c) => c.at > 0)[0];
  assert.ok(second, "the seeded day has no second call to test with");

  const base = NOW;
  minutesLater(base, second.at - 1); tick();
  minutesLater(base, second.at); tick();

  const shown = callsOnChart(root);
  assert.equal(shown.length, 1, "the day drew no call, or drew more than one");
  assert.match(textOf(shown[0]), new RegExp(second.name.slice(0, 12)));
  // One minute early and not at the minute: a call is a call to go and stand
  // somewhere, and her fold is a one-minute job.
  assert.match(textOf(shown[0]), /— 0\d:\d\d from now/);
  assert.ok(hasClass(shown[0], "tl-call"));
});

test("a person whose calls are switched off is not called (v151)", () => {
  const { root, state } = render();
  const calls = callWindows(state.settings.scenario);
  const second = calls.filter((c) => c.at > 0)[0];
  state.settings.personCalls = { [second.who]: false };

  const tick = startTheDay(root);
  const base = NOW;
  minutesLater(base, second.at - 1); tick();
  minutesLater(base, second.at); tick();

  // Nobody was called for that job. (Another person's call in the same minute
  // would still be theirs to make, so this asks about the one person, not about
  // the screen being empty.)
  const wrong = callsOnChart(root).filter((n) => new RegExp(second.name.slice(0, 12)).test(textOf(n)));
  assert.equal(wrong.length, 0, "a person she switched off was called anyway");
});

test("an unacknowledged call is replaced by the next, and OK dismisses one (v151)", () => {
  const { root, state } = render();
  const tick = startTheDay(root);
  const calls = callWindows(state.settings.scenario);
  const base = NOW;

  // Walk to the next two calls without ever pressing OK.
  const first = calls[0];
  minutesLater(base, first.at); tick();
  const one = callsOnChart(root);
  assert.equal(one.length, 1, "the first call never arrived");

  // OK takes it away.
  const ok = walk(one[0]).find((n) => n.tagName === "BUTTON" && textOf(n).trim() === "OK");
  assert.ok(ok, "the call carries no OK");
  ok.dispatchEvent({ type: "click" });
  assert.equal(callsOnChart(root).length, 0, "OK did not take the call away");

  // And the next one is not queued behind it: it is simply the next call.
  const last = calls[calls.length - 1];
  minutesLater(base, last.at); tick();
  const again = callsOnChart(root);
  assert.equal(again.length, 1, "the next call did not arrive after the first was dismissed");
  assert.match(textOf(again[0]), new RegExp(last.name.slice(0, 12)));
});

test("the call carries the cycle's name when she has given it one, and nothing when she has not (v151)", () => {
  // One module, one batch, starting a minute into the day — so the call at minute
  // 0 is unambiguously the one the assertions are about.
  const one = (name) => ({
    id: "solo", icon: "🥣", name: "Mixing the dough in the tub", job: "mix", on: true, person: 0,
    cycles: [{ name, min: 20, load: 20, unload: 0 }],
    batch: 6, everyMin: 0, repeats: 1, startMin: 1, people: 1,
  });
  const callFor = (name) => {
    const { root } = render({ modules: [one(name)] });
    const tick = startTheDay(root);
    minutesLater(NOW, 0); tick();
    const shown = callsOnChart(root);
    assert.equal(shown.length, 1, `no call arrived for a ${name ? "named" : "unnamed"} cycle`);
    return shown[0];
  };

  // Unnamed: no line at all. This is the assertion that catches the imported
  // trim() — it is production.js's NUMBER formatter, so trim("") answers "0" and
  // the card went out printing a bare 0 above the clock.
  const bare = callFor("");
  assert.equal(walk(bare).filter((n) => hasClass(n, "tl-call-cyc")).length, 0,
    "an unnamed cycle drew a line of its own");

  // Named: the line is there and it is her own words. "The rests and the stretch
  // and folds" is not a thing anybody can go and do, which is why the cycle's own
  // name is worth saying at all.
  const named = callFor("The fold");
  const line = walk(named).find((n) => hasClass(n, "tl-call-cyc"));
  assert.ok(line, "a cycle she named is not on the call");
  assert.match(textOf(line), /The fold/);
});

test("Stop takes the clock and any call away with it (v151)", () => {
  const { root, state } = render();
  const tick = startTheDay(root);
  const calls = callWindows(state.settings.scenario);
  minutesLater(NOW, calls[0].at); tick();
  assert.equal(callsOnChart(root).length, 1);

  const stop = walk(root).find((n) => n.tagName === "BUTTON" && /Stop/.test(textOf(n)));
  assert.ok(stop, "no way to stop the day once it is walking");
  stop.dispatchEvent({ type: "click" });
  assert.equal(callsOnChart(root).length, 0, "a call survived Stop");
  // The now-line is gone too — it is hidden rather than removed, so the class is
  // what to ask about.
  const nowLine = walk(root).find((n) => hasClass(n, "tl-now"));
  assert.ok(nowLine && nowLine.hidden, "the now-line is still drawn after Stop");
  // And the walk is over, so a later tick cannot call anybody.
  minutesLater(NOW, calls[calls.length - 1].at); tick();
  assert.equal(callsOnChart(root).length, 0, "a stopped day went on calling");
});

// ── The day's own card: working it backwards (v152) ───────────────────────
// Her ask: "how to make the calculate backward works?" The control lives on
// batch 1 of the last module in the build — the card she already gets by tapping
// that bar — and it is a press, not a switch. These three tests pin the card, the
// press and the way back.

// The track of the row named `name`, so a tap can be aimed at one bar of it.
function trackFor(root, name) {
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes(name));
  assert.ok(row, `no timeline row named ${name}`);
  const track = walk(row).find((n) => hasClass(n, "tl-track"));
  assert.ok(track, `no track in the row named ${name}`);
  return track;
}

// Tapping a bar is a click on the track whose target is the bar: the view reads
// the batch number off `closest(".tl-bar, .tl-btag")`, which the shim has no
// bubbling to deliver for it.
function tapBar(root, name, k) {
  const bar = rowFor(root, name)[k];
  assert.ok(bar, `${name} has no batch ${k + 1} drawn`);
  trackFor(root, name).dispatchEvent({
    type: "click", target: { closest: () => bar }, stopPropagation() {},
  });
  return bar;
}

const popupTitle = () => textOf(walk(layers["popup-layer"]).find((n) => hasClass(n, "popup-title")) || createEl("div"));
const popupBody = () => textOf(layers["popup-layer"]);
const popupButton = (re) => walk(layers["popup-layer"]).find((n) => n.tagName === "BUTTON" && re.test(textOf(n)));
const starts = (state, id) => computeScenario(state.settings.scenario).modules.find((m) => m.id === id).starts;

// The day-backwards group of the controls row. Until v157 it was found by its own
// label; the label is gone — it re-stated the button's own name and wrapped to two
// lines on her phone — so the group is found as the one holding the button, inside
// the controls row and not on the day's own card, which carries buttons with the
// same words on them.
function dayBackGroup(root) {
  const holds = (n) => walk(n).some((x) => x.tagName === "BUTTON" && /Work the day backwards/.test(textOf(x)));
  const row = walk(root).find((n) => hasClass(n, "tl-ctl") && holds(n));
  assert.ok(row, "the controls row has no day-backwards button");
  const el = walk(row).find((n) => hasClass(n, "tl-ctl-group") && holds(n));
  assert.ok(el, "the day-backwards button is not the button of a group in the row");
  return { el, button: (re) => walk(el).find((n) => n.tagName === "BUTTON" && re.test(textOf(n))) };
}

// One group of the controls row, found by the label it carries. The row is a
// series of these, and a view that grows one and drops another is best read as
// the groups it is made of rather than by counting children.
function ctlGroup(root, label) {
  const group = walk(root).find((n) => hasClass(n, "tl-ctl-group")
    && walk(n).some((x) => hasClass(x, "tl-ctl-lab") && new RegExp(`^\\s*${label}\\s*$`).test(textOf(x))));
  assert.ok(group, `the controls row has no group named ${label}`);
  return group;
}

// The last thing the app has said, which is the press she just made.
function lastToast() {
  const said = walk(document.body).filter((n) => hasClass(n, "toast"));
  assert.ok(said.length, "the press said nothing at all");
  return textOf(said[said.length - 1]);
}

test("the backward card opens on batch 1 at the last module, and nowhere else (v152)", () => {
  const { root, state } = render();

  // The last module in the build: Cutting and packing, whose first batch ends at
  // 9:09 am. That is the moment the whole day is hung from.
  tapBar(root, "Cutting and packing", 0);
  assert.match(popupTitle(), /the end of your first batch/, "batch 1 of the last module did not open the day's own card");
  assert.match(popupBody(), /9:09 am/, "the card does not name the moment the day hangs from");
  assert.match(popupBody(), /latest/, "the card does not say what each module's latest start is");
  assert.ok(popupBody().includes("Pull them back to their latest start"), "a day with slack offers no way to take it out");

  // The first module is not it: its batch 1 IS the module's own start time and the
  // first thing in the day, so it keeps the card it has always had.
  tapBar(root, "Mixing the dough in the tub", 0);
  assert.doesNotMatch(popupTitle(), /the end of your first batch/, "the first module opened the day's own card");
  assert.match(popupTitle(), /batch 1 of 4/, "the first module's own card is gone");

  // And a line of a single module is not a chain at all, so nothing hangs from its
  // last thing either — it keeps its ordinary card.
  const one = render({ modules: [ONE_BAKER_SCENARIO.modules.find((m) => m.id === "solo_pack")] });
  tapBar(one.root, "Cutting and packing", 0);
  assert.doesNotMatch(popupTitle(), /the end of your first batch/, "a one-module day opened the day's own card");
  // The signpost to the card names the bar to tap, but only where there is one.
  assert.match(textOf(one.root), /batch 1 of 4|Cutting and packing/);
  void state;
});

test("one press works the day backwards and leaves the day's own numbers alone (v152)", () => {
  const { root, state } = render();
  const before = computeScenario(state.settings.scenario);
  assert.equal(before.pansPerDay, 24, "one baker day does not make twenty-four pans before the press");
  assert.equal(before.endMin, 570, "the day did not finish at 1:30 pm before the press");

  tapBar(root, "Cutting and packing", 0);
  const pull = popupButton(/Pull them back to their latest start/);
  assert.ok(pull, "the day card has no pull-back button");
  pull.dispatchEvent({ type: "click" });

  const after = computeScenario(state.settings.scenario);
  // The mix goes in as late as the chain allows — 4:43 am against the 4:01 am it
  // was stored at — and every module above the last one comes with it.
  assert.equal(starts(state, "solo_mix")[0], 43, "the mix was not pulled back to its latest start");
  assert.deepEqual(starts(state, "solo_mix"), [43, 130, 217, 304], "the module's own rhythm did not come with it");
  assert.deepEqual(starts(state, "solo_oven"), [282, 369, 456, 543], "a module in the middle did not come with the chain");
  assert.deepEqual(starts(state, "solo_pack"), [297, 384, 471, 558], "the last module moved when there was nothing to pull it back to");

  // The whole point of a backward pass: the day is now tight, and it still makes
  // the same pans and still finishes in the same minute.
  assert.equal(after.pansPerDay, 24, "the press changed how many pans the day makes");
  assert.equal(after.endMin, 570, "the press moved the end of the day");
  for (const m of after.on) {
    const flat = m.passes.every((p, i, all) => i === 0 || Math.round(p.at - all[i - 1].at) === Math.round(m.everyMin));
    assert.ok(flat, `${m.name}: the press changed the spacing between its batches`);
  }

  // And the press cannot walk the day into an impossible order: no module may end
  // a lot after the module below it has started the same lot. The day was in order
  // before, so this asks whether the press kept it — which is the whole reason the
  // pass measures the room between neighbours instead of subtracting a sum.
  const outOfOrder = (r) => {
    let n = 0;
    for (let i = 0; i < r.on.length - 1; i += 1) {
      const above = r.on[i];
      const below = r.on[i + 1];
      for (let k = 0; k < above.passes.length; k += 1) {
        if (above.passes[k].end > below.passes[k].at + 0.001) n += 1;
      }
    }
    return n;
  };
  assert.equal(outOfOrder(before), 0, "the seeded day is not in order, so this test covers nothing");
  assert.equal(outOfOrder(after), 0, "the press started a lot before the dough it is made of exists");

  // A day with nothing left to take out says so rather than offering a button that
  // would change nothing, and the way back appears with it.
  assert.doesNotMatch(popupBody(), /Pull them back to their latest start/, "a tight day still offers the pull-back button");
  assert.match(popupBody(), /already as late as it can go/, "a tight day does not say so");
  assert.ok(popupButton(/Put my start times back/), "there is no way back from the press");
});

test("the way back puts every start time exactly where it was, and then goes (v152)", () => {
  const { root, state } = render();
  const was = { solo_mix: starts(state, "solo_mix"), solo_fold: starts(state, "solo_fold"), solo_oven: starts(state, "solo_oven") };
  // Stored the way her own modules are: a start time and no list of its own, which
  // is what the press has to survive without turning into a row of zeroes.
  for (const m of state.settings.scenario.modules) {
    assert.equal(m.starts, undefined, `${m.name} is stored with a list of times, so this test is not covering her case`);
  }

  tapBar(root, "Cutting and packing", 0);
  popupButton(/Pull them back to their latest start/).dispatchEvent({ type: "click" });
  assert.equal(starts(state, "solo_mix")[0], 43, "the press did not happen, so there is nothing to undo");

  const back = popupButton(/Put my start times back/);
  assert.ok(back, "the way back is missing");
  back.dispatchEvent({ type: "click" });
  assert.deepEqual(starts(state, "solo_mix"), was.solo_mix, "the mix was not put back");
  assert.deepEqual(starts(state, "solo_fold"), was.solo_fold, "a module above was not put back");
  assert.deepEqual(starts(state, "solo_oven"), was.solo_oven, "a module in the middle was not put back");
  assert.equal(computeScenario(state.settings.scenario).endMin, 570, "the day did not come back as it was");
  // The day she had is stored exactly as it was, list and all: putting a time back
  // must not leave behind a list that turns Auto spacing into an even one.
  for (const m of state.settings.scenario.modules) {
    assert.equal(m.starts, undefined, `${m.name} came back with a list of times it did not have`);
  }
  assert.equal(popupButton(/Put my start times back/), undefined, "the way back is still offered after it was used");
});

test("the step pairs on the day card move the whole day and keep its shape (v152)", () => {
  const { root, state } = render();
  const before = computeScenario(state.settings.scenario);
  const wasAt = new Map(before.on.map((f) => [f.id, Number(f.startMin)]));
  // The room between neighbouring modules, which is the shape of the day: a move
  // of the whole day leaves every one of these exactly where it was.
  const gaps = (r) => r.on.slice(1).map((f, i) => Number(f.startMin) - Number(r.on[i].startMin));

  tapBar(root, "Cutting and packing", 0);
  const later = popupButton(/\+ 5 min/);
  assert.ok(later, "the day's own card carries no five-minute pair");
  later.dispatchEvent({ type: "click" });

  const after = computeScenario(state.settings.scenario);
  for (const f of after.on) {
    assert.equal(Number(f.startMin) - wasAt.get(f.id), 5, `${f.name} did not move with the whole day`);
  }
  assert.deepEqual(gaps(after), gaps(before), "the whole-day move re-laid the day instead of moving it");
  assert.equal(after.pansPerDay, 24, "moving the whole day changed how many pans it makes");

  // A day moved by hand offers the same way back as a day pulled back, and it is
  // the day she began with rather than the step before the last one.
  const earlier = popupButton(/− 5 min/);
  assert.ok(earlier, "the day's own card carries no earlier button");
  earlier.dispatchEvent({ type: "click" });
  const back = popupButton(/Put my start times back/);
  assert.ok(back, "moving the whole day offers no way back");
  back.dispatchEvent({ type: "click" });
  for (const f of computeScenario(state.settings.scenario).on) {
    assert.equal(Number(f.startMin), wasAt.get(f.id), `${f.name} was not put back to where the day began`);
  }
});

test("the day's own row works the day backwards on the spot (v153)", () => {
  // v152 put this move behind a tap on one particular bar and left a chip in the
  // row that only said where that bar was. She reported it as what it looks like —
  // "why no button for work backward, this is to reeposition the batches latest
  // start time" — so the row does the work now: one press, no card in the way, and
  // the card keeps the chain and the way back.
  const { root, state } = render();
  const before = computeScenario(state.settings.scenario);
  assert.equal(before.endMin, 570, "one baker day does not finish at 1:30 pm before the press");

  const group = dayBackGroup(root);
  // The moment her day hangs from is named on the card this button's own move
  // opens, not above the button: v157 took the label out of the row, because it
  // re-stated the button's own name and wrapped to two lines on her phone. What is
  // left is the button and, once the day has moved, the way back — and still
  // nothing beside the button that only looks pressable.
  assert.equal(walk(group.el).filter((n) => hasClass(n, "tl-ctl-lab")).length, 0,
    "the day-backwards group has a label above the button again");
  assert.equal(walk(group.el).filter((n) => n.tagName === "BUTTON").length, 1,
    "something beside the button in the day-backwards row looks pressable");

  group.button(/Work the day backwards/).dispatchEvent({ type: "click" });

  // Exactly the card's own press: the mix in as late as the chain allows, the
  // anchor and the day's finish untouched, and the same pans on the shelf.
  assert.equal(starts(state, "solo_mix")[0], 43, "the row press did not put the mix at its latest start");
  assert.deepEqual(starts(state, "solo_mix"), [43, 130, 217, 304], "the module's own rhythm did not come with it");
  assert.deepEqual(starts(state, "solo_oven"), [282, 369, 456, 543], "a module above did not come with the chain");
  assert.deepEqual(starts(state, "solo_pack"), [297, 384, 471, 558], "the module the day hangs from moved");
  const after = computeScenario(state.settings.scenario);
  assert.equal(after.pansPerDay, 24, "the press changed how many pans the day makes");
  assert.equal(after.endMin, 570, "the press moved the end of the day");

  // And it says what it did, which is the card's own sentence rather than a second
  // wording to keep in step.
  const said = lastToast();
  assert.match(said, /worked back to their latest start/, "the row press does not say what moved");
  assert.match(said, /9:09 am/, "the row press does not read the moment back");
});

test("a day already worked back keeps the button, and it says it is done (v153)", () => {
  // The other half of her answer: a button that vanishes once the work is done
  // reads as a fault, which is the shape of the report this release answers.
  const { root, state } = render();
  dayBackGroup(root).button(/Work the day backwards/).dispatchEvent({ type: "click" });
  assert.equal(starts(state, "solo_mix")[0], 43, "the first press did not work the day back");

  const still = dayBackGroup(root).button(/Work the day backwards/);
  assert.ok(still, "the button disappeared once the day had been worked back");
  const was = starts(state, "solo_mix");
  still.dispatchEvent({ type: "click" });
  assert.deepEqual(starts(state, "solo_mix"), was, "a second press moved a day that was already tight");
  assert.match(lastToast(), /already as late as it can go/, "a finished day does not say so");
});

test("the row carries the way back beside the button that moved the day (v153)", () => {
  // Without this the row's press would move her whole day and leave the undo three
  // taps away on one bar — the same hunt the row's button exists to end.
  const { root, state } = render();
  const was = starts(state, "solo_mix");
  assert.equal(dayBackGroup(root).button(/Put my start times back/), undefined,
    "the way back is offered before anything has moved");

  dayBackGroup(root).button(/Work the day backwards/).dispatchEvent({ type: "click" });
  assert.equal(starts(state, "solo_mix")[0], 43, "the press did not happen, so there is nothing to undo");

  const back = dayBackGroup(root).button(/Put my start times back/);
  assert.ok(back, "a press from the row offers no way back in the row");
  back.dispatchEvent({ type: "click" });
  assert.deepEqual(starts(state, "solo_mix"), was, "the row's way back did not put the day where it was");
  assert.equal(dayBackGroup(root).button(/Put my start times back/), undefined,
    "the way back is still offered after it was used");
  // A module whose spacing was Auto before the press must have no stored list
  // afterwards either, or it comes back as an even spacing she never asked for.
  assert.equal(state.settings.scenario.modules.every((m) => m.starts === undefined), true,
    "the way back left behind a list of times the module did not have");
});

test("the way back lives in the screen, not in her saved data (v153)", () => {
  // The snapshot must never reach her data blob. Written there, a reload would
  // resurrect a day she has since left and offer to put her times back to a shape
  // that is no longer hers — and this was found by measuring the blob after a
  // press, not by reading the code, because the two doors passed different things
  // in and only one of them was the screen's own record.
  const { root, state } = render();
  dayBackGroup(root).button(/Work the day backwards/).dispatchEvent({ type: "click" });
  assert.equal(starts(state, "solo_mix")[0], 43, "the press did not happen");
  assert.equal(state.dayBefore, undefined, "the row press wrote its snapshot into her saved state");

  // Both doors are one press: the card she would have opened first carries the way
  // back for a day the ROW moved, because both read the one snapshot.
  tapBar(root, "Cutting and packing", 0);
  assert.ok(popupButton(/Put my start times back/),
    "a press from the row leaves the card with no way back, so the two doors are not the same press");
  assert.equal(state.dayBefore, undefined, "opening the card wrote a snapshot into her saved state");
});

test("a line with no chain says so rather than drawing a dead button (v153)", () => {
  // A line of a single module is not a chain: its first batch is that module's own
  // start time and there is nothing above it to measure a latest start against.
  // The button stays where it is — it never comes and goes — and says which of the
  // two this is instead of inventing a move.
  const one = render({ modules: [ONE_BAKER_SCENARIO.modules.find((m) => m.id === "solo_pack")] });
  const group = dayBackGroup(one.root);
  // Nothing in this group claims a clock at all — since v157 there is no label
  // here to name one, and a one-module line has no moment to name.
  assert.doesNotMatch(textOf(group.el), /\d:\d\d/, "a one-module line named a moment it does not have");

  const wasAt = one.state.settings.scenario.modules[0].startMin;
  group.button(/Work the day backwards/).dispatchEvent({ type: "click" });
  assert.match(lastToast(), /no module above its last one/, "a one-module line said nothing useful");
  assert.equal(one.state.settings.scenario.modules[0].startMin, wasAt, "a one-module line was moved anyway");
  assert.equal(dayBackGroup(one.root).button(/Put my start times back/), undefined,
    "a line that never moved offered a way back");
});

// ── How a module takes its start, and the people she is reading it against (v154)
// Her three reports of 22 September, all inside the Scenario planner:
//
//   1. "the cut and packing batch din follow the earlier batch end", corrected by
//      her to "cutting and packing sit below cooling down, so cutting and packing
//      batch start should follow cooling down batch end".
//   2. "The delta t disappeared, before this we have it. I want each batch start
//      time to be adjustable, like the 1st module. Just need to show delta on the
//      batch 1st offset only, then following module of that step dont have to show
//      the delta because it follow the previous module tightly."
//   3. "I want to freeze the persons card, so that by scrolling thru modules i can
//      see exactly where that slot of that person tie up to and searching for
//      opportunity to move some batch start time to reduce the number of person
//      needed."
//
// Her directive for the first of them: "the behaviour has to base on configuration,
// not a hard wired" — so the answer is three pills on the module's own card.

// The module editor of the row named `name`, opened the way she opens it.
function openModule(root, name) {
  const row = walk(root).find((n) => hasClass(n, "tl-row") && !hasClass(n, "person") && textOf(n).includes(name));
  assert.ok(row, `no module row named ${name}`);
  row.dispatchEvent({ type: "click" });
  return row;
}

test("the module card offers the three answers, and the packing lands on the oven (v154)", () => {
  const { root, state } = render();
  const pack = () => state.settings.scenario.modules.find((m) => m.id === "solo_pack");

  openModule(root, "Cutting and packing");
  assert.match(popupBody(), /How this module takes its start/, "the card does not ask how this module takes its start");
  for (const label of ["As the one above finishes", "Never before the one above finishes", "Its own time"]) {
    assert.ok(popupButton(new RegExp(label)), `the card offers no way to say ${label}`);
  }
  // It opens on the answer the module already behaves with. Her saved packing has a
  // start time of its own and nothing above it has a say, which is what the old
  // switch being off meant — so the pill it opens on is "Its own time".
  assert.ok(hasClass(popupButton(/Its own time/), "cal-mode-on"), "the card does not show which answer this module is on");

  const before = px(rowFor(root, "Cutting and packing")[0], "left");
  popupButton(/As the one above finishes/).dispatchEvent({ type: "click" });

  // Both keys are written: the new one for the three-way choice, and the old switch
  // a save made by an older phone is still read through.
  assert.equal(pack().startMode, "after", "the answer she picked was not stored");
  assert.equal(pack().follow, true, "the old switch was not written with it");
  // The packing now starts the minute the oven ends its own lot — 8:15 am against
  // the 8:57 am she had it at, on every one of its four lots.
  assert.deepEqual(starts(state, "solo_pack"), [255, 342, 429, 516], "the packing did not land on the end of the oven");
  // Nothing above it moved, so what she sets below can never re-lay the day above her.
  assert.deepEqual(starts(state, "solo_oven"), [240, 327, 414, 501], "setting the packing moved the oven");
  // And the day still makes what it made: a tight follow takes the waiting out, not
  // the pans.
  assert.equal(computeScenario(state.settings.scenario).pansPerDay, 24, "the answer she picked changed how many pans the day makes");
  assert.ok(px(rowFor(root, "Cutting and packing")[0], "left") < before, "the bar was not redrawn where the new answer puts it");
});

test("a module that waits keeps the later time she set, and one that follows does not (v154)", () => {
  const { root, state } = render();
  const pack = () => state.settings.scenario.modules.find((m) => m.id === "solo_pack");
  const was = starts(state, "solo_pack");

  // "Never before the one above finishes" is the floor, and the floor is what her
  // saved modules already behave with: a time she set that is already the later one
  // stands exactly where it is.
  openModule(root, "Cutting and packing");
  popupButton(/Never before the one above finishes/).dispatchEvent({ type: "click" });
  assert.equal(pack().startMode, "wait");
  assert.deepEqual(starts(state, "solo_pack"), was, "the floor moved a time it should have left alone");

  // "As the one above finishes" is the tight follow, and it is the only one of the
  // three that can pull a lot EARLIER — which is the whole of her first report.
  popupButton(/As the one above finishes/).dispatchEvent({ type: "click" });
  assert.deepEqual(starts(state, "solo_pack"), [255, 342, 429, 516], "the tight follow did not pull the packing onto the oven");
  for (let k = 0; k < 4; k += 1) {
    assert.ok(starts(state, "solo_pack")[k] < was[k], `packing lot ${k + 1} was not pulled earlier`);
  }
});

test("every batch's own card offers the pair, on a module that waits included (v154)", () => {
  const { root, state } = render();
  const pack = () => state.settings.scenario.modules.find((m) => m.id === "solo_pack");
  const was = starts(state, "solo_pack").slice();

  // Her report: "The delta t disappeared, before this we have it. I want each batch
  // start time to be adjustable, like the 1st module." Batch 2 of the last module
  // used to be refused the pair outright, with a sentence telling her to go and
  // change the module instead.
  tapBar(root, "Cutting and packing", 1);
  assert.match(popupBody(), /Batch 2/, "batch 2's own card did not open");
  const later = popupButton(/\+ 5 min/);
  assert.ok(later, "batch 2's card offers no way to move it");
  later.dispatchEvent({ type: "click" });

  // Below batch 1 the lot rides the module above, so its move is written as a hold
  // on that lot — not as a start time, which the line would overwrite on the next
  // repaint.
  assert.equal(pack().startDelta[1], 5, "the move on batch 2 was not written as a hold on batch 2");
  assert.equal(pack().startDelta[0], 0, "moving batch 2 moved batch 1");
  assert.equal(starts(state, "solo_pack")[1], was[1] + 5, "batch 2 did not move");
  assert.equal(starts(state, "solo_pack")[2], was[2], "a batch after the one she moved came with it");
  assert.match(lastToast(), /Batch 2 held back 5 minutes/, "the move did not say what it did");

  // And it is not a one-way door: the card offers the way back, on that batch alone.
  popupButton(/Back onto the line/).dispatchEvent({ type: "click" });
  assert.equal(pack().startDelta[1], 0, "the way back left the batch held");
  assert.deepEqual(starts(state, "solo_pack"), was, "the way back did not put the batch where it was");
});

test("batch 1 reads this module's offset, and the batches below it read as riding the line (v154)", () => {
  const { root } = render();
  // Her ask: "Just need to show delta on the batch 1st offset only, then following
  // module of that step dont have to show the delta because it follow the previous
  // module tightly." Read on the oven, which is a module in the middle of her day:
  // the last module's first batch opens the day's own card (v152) and the first
  // module's first batch is its own start time, so neither is where an offset from
  // a module above would be read.
  openModule(root, "The oven swap and the bake");
  popupButton(/Never before the one above finishes/).dispatchEvent({ type: "click" });

  // Batch 1 of a module below the first carries the module's own answer about the
  // module above it.
  tapBar(root, "The oven swap and the bake", 0);
  assert.match(popupBody(), /never before the module above/, "batch 1 does not read this module's own answer");
  assert.doesNotMatch(popupBody(), /Δt =/, "a batch that is not held claims an offset it does not have");

  // The batches below it do not repeat the module's offset, because they ride the
  // module above at this module's own pace and there is nothing of the module's to
  // read on them.
  tapBar(root, "The oven swap and the bake", 2);
  assert.match(popupBody(), /on the line/, "a later batch does not read as riding the line");
  assert.doesNotMatch(popupBody(), /never before the module above/, "a later batch repeats the module's own offset");

  // A batch she HAS held says so on its own card, because a lot that is off the
  // line must never look like one that is on it.
  popupButton(/\+ 5 min/).dispatchEvent({ type: "click" });
  assert.match(popupBody(), /Δt = \+5 min/, "a held batch does not read out its own hold");
});

// Her own day with one more step after the packing. The last module of the build
// is where batch 1 opens the day's own card (v152), so a test about a batch card at
// the packing needs the packing to not be the last thing she does.
const oneMore = () => render({
  modules: [
    ...ONE_BAKER_SCENARIO.modules.map((m) => ({ ...m, cycles: (m.cycles || []).map((c) => ({ ...c })) })),
    {
      id: "solo_label", icon: "🏷️", name: "Labelling and boxing", on: true, job: "", cycleMin: 5, batch: 1,
      touchMin: 5, everyMin: 87, everyAuto: false, repeats: 4, repeatsAuto: false, startMin: 320,
      startMode: "own", follow: false, overlap: true, people: 1, person: 0, crew: [0], count: 1,
      cycles: [{ name: "", min: 5, load: 5, unload: 0 }],
    },
  ],
});

test("a press on batch 1 of a module that follows moves the whole module, and there is a way back (v154)", () => {
  const { root, state } = oneMore();
  const pack = () => state.settings.scenario.modules.find((m) => m.id === "solo_pack");
  openModule(root, "Cutting and packing");
  popupButton(/As the one above finishes/).dispatchEvent({ type: "click" });

  // A module set this way has no start time of its own to write — it begins where
  // the oven ends, whatever a stored start says — so a press that wrote one would
  // be a button that does nothing. It writes the module's own hold instead, which
  // is also what keeps a press on batch 1 meaning the same thing on every module.
  const was = starts(state, "solo_pack").slice();
  tapBar(root, "Cutting and packing", 0);
  popupButton(/\+ 5 min/).dispatchEvent({ type: "click" });

  assert.deepEqual(pack().startDelta.slice(0, 4), [5, 5, 5, 5], "the press did not hold the whole module");
  const now = starts(state, "solo_pack");
  for (let k = 0; k < 4; k += 1) assert.equal(now[k], was[k] + 5, `lot ${k + 1} did not come with the module`);
  assert.match(lastToast(), /held 5 minutes behind where the module above finishes/, "the press did not say what it did");

  // An earlier press can only ever take the hold off again, and it cannot go past
  // the line: below zero there is nothing left to take off, and the card says so
  // rather than quietly doing nothing.
  popupButton(/− 5 min/).dispatchEvent({ type: "click" });
  assert.deepEqual(pack().startDelta.slice(0, 4), [0, 0, 0, 0], "the way back left part of the module held");
  assert.deepEqual(starts(state, "solo_pack"), was, "the way back did not put the whole module where it was");
  assert.match(lastToast(), /back on the line/, "taking the hold all the way off did not say so");

  // And a press with nothing left to take off says that rather than doing nothing
  // quietly: the hold is off, so a further earlier press cannot move the module.
  popupButton(/− 5 min/).dispatchEvent({ type: "click" });
  assert.deepEqual(starts(state, "solo_pack"), was, "a press took the module past the line");
  assert.match(lastToast(), /already as early as the line allows|nothing left to take off/, "a module with nothing left to take off did not say so");
});

test("the people are held below the modules, so a slot can be read against any module (v154)", () => {
  const { root } = render();
  // Her ask: "I want to freeze the persons card, so that by scrolling thru modules
  // i can see exactly where that slot of that person tie up to and searching for
  // opportunity to move some batch start time to reduce the number of person
  // needed." The modules scroll; the people do not.
  const people = walk(root).find((n) => hasClass(n, "tl-people"));
  assert.ok(people, "the people rows are not held in a block of their own, so they scroll away with the modules");

  // Every person's row and the total are inside it — the total is half of reading
  // one slot against another — and no module row is.
  const inside = walk(people);
  assert.ok(inside.some((n) => hasClass(n, "tl-row") && hasClass(n, "person") && textOf(n).includes("Person 1")),
    "the person rows are not in the held block");
  assert.ok(inside.some((n) => hasClass(n, "total-row") && /People at once/.test(textOf(n))),
    "the total row is not in the held block");
  // A MODULE row, and the class is what makes that a real assertion rather than a
  // lucky one: since v158 a person's row carries the jobs they do in its tip, so
  // "Cutting and packing" is now a name that appears inside the held block legit —
  // it is one of Person 1's jobs. The row wearing the name is the module row.
  assert.equal(inside.filter((n) => hasClass(n, "tl-row") && !hasClass(n, "person")
    && textOf(n).includes("Cutting and packing")).length, 0,
    "a module row is inside the held block, so the block is not the people");
  // Drawn once, not once per module.
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-people")).length, 1, "the people block is drawn more than once");

  // And it is pinned by its own rule rather than by hope: sticky at the foot of the
  // panel, opaque, over the module rows but under the day's own now-line.
  const css = read("admin/css/app.css");
  assert.match(css, /\.tl-people\s*\{[^}]*position:\s*sticky;\s*bottom:\s*0/, "the people block is not pinned to the foot of the panel");
  assert.match(css, /\.tl-people\s*\{[^}]*background:/, "the people block is see-through, so the modules show through it");
});

// ── v155: the module row is the height of its bars ──────────────────────────
//
// Her report of 22 September: "The window for scrolling module became too small,
// why not reduce the height of each module, the notes can just shown up upon mouse
// hoover." The two notes under every module name were what made a row tall — on her
// own day they ran to 912px of rows inside a 536px window. They are off the row
// now, printed instead on the module's own card, which is what a tap on the row
// opens; a computer gets them back under the pointer, where there is a pointer.

test("a module row carries its notes but does not print them, and its card does (v155)", () => {
  const { root } = render();
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes("Mixing the dough in the tub"));
  assert.ok(row, "no timeline row for the mixing module");

  // Both notes are still built and still say what they said — they are carried, not
  // dropped, so the card below and a computer's hover can print them word for word.
  const held = walk(row).filter((n) => hasClass(n, "tl-tip"));
  assert.equal(held.length, 1, "the row does not carry exactly one tip");
  assert.match(textOf(held[0]), /starts 4:01 am · 4 batches/,
    `the tip no longer says when the module starts: ${textOf(held[0])}`);
  assert.match(textOf(held[0]), /20 min a batch · 20 min of you/,
    `the tip no longer says what a batch costs: ${textOf(held[0])}`);
  // The same two sentences, as two lines rather than one run together.
  assert.equal(walk(held[0]).filter((n) => hasClass(n, "tl-sub")).length, 2,
    "the tip does not hold the module's two notes as two lines");

  // The card the row's tap opens carries both, at the top, before anything else.
  openModule(root, "Mixing the dough in the tub");
  const body = popupBody();
  assert.match(body, /starts 4:01 am · 4 batches/, "the module card does not carry the row's first note");
  assert.match(body, /20 min a batch · 20 min of you/, "the module card does not carry the row's second note");
});

// ── v156: the tip does not expand the module ────────────────────────────────
//
// Her correction of 22 September, on seeing it described: "i prefer not to expend
// the module with mouse hoover. Remain the height. When mouse hoover to the module
// title, only the note should shot as a too tip". v155 revealed the notes by making
// the row taller, which is the very thing this release exists to stop: a row that
// grows under the pointer moves everything below it, so the bar she was reading is
// no longer where she left it. The notes are laid OVER the day instead, from the
// title cell alone, and the row's height is the same whether or not the tip is open.

test("the notes open as a tip over the day, and the row keeps its height (v156)", () => {
  const css = read("admin/css/app.css");

  // Hidden until the title is pointed at, and taken out of the row's flow while it
  // is showing: absolute is what keeps the height. A revealed block here would be
  // v155 again, and the row would grow by two lines the moment she pointed at it.
  assert.match(css, /\.tl-tip\s*\{[^}]*display:\s*none/, "the tip is not off the row, so the row is still as tall as its notes");
  assert.match(css, /\.tl-tip\s*\{[^}]*position:\s*absolute/, "the tip is laid out in the row, so opening it moves every row below it");
  assert.match(css, /\.tl-tip\s*\{[^}]*top:\s*50%[^}]*translateY\(-50%\)/, "the tip is not centred on the row it belongs to");

  // Opened by the title cell, and only by it — she asked for the note, not for the
  // row to react — and only where there is a pointer that can hover. A phone has no
  // hover, so a reveal tied to one would be a reveal her phone can never reach.
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.tl-name:hover\s+\.tl-tip\s*\{\s*display:\s*block/,
    "the tip is not opened by pointing at the module's own title");
  assert.ok(!/\.tl-row:hover[^{]*\{[^}]*display:\s*block/.test(css),
    "something on the row is still revealed in the row's own flow, which is what grew it");

  // And the height it must not change: the box is capped under the row's own 46px,
  // so a tip on the first or the last module of a long day is not cut by the edge of
  // the scrolling panel.
  assert.match(css, /\.tl-tip\s+\.tl-sub\s*\{[^}]*line-height:\s*1\.3/, "the tip's two lines are not held to a height that fits inside a row");
});


test("the name takes the whole of the row's first line (v155)", () => {
  const { root } = render();
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes("The rests and the stretch and folds"));
  const top = walk(row).find((n) => hasClass(n, "tl-name-top"));
  const name = walk(top).find((n) => hasClass(n, "tl-name-txt"));
  assert.ok(name, "the name is not in a span of its own, so a long one cannot be shortened");
  assert.equal(textOf(name).trim(), "🫙 The rests and the stretch and folds", "the row stopped naming the module in full");

  // Sharing the name's line was the real damage: this module's name is 273px wide
  // and a badge beside it left 35px of it to read. The name takes the whole line,
  // and a badge — if one were ever put back here — breaks onto the one below,
  // which is 16px, under the 45px the bars already ask for, so the row is no
  // taller for it.
  const css = read("admin/css/app.css");
  assert.match(css, /\.tl-name-top\s*\{[^}]*flex-wrap:\s*wrap/, "the name and its badges could never break onto two lines");
  assert.match(css, /\.tl-name-txt\s*\{[^}]*flex:\s*1 1 100%/, "the name does not take the line it is on");
  assert.match(css, /\.tl-name-txt\s*\{[^}]*text-overflow:\s*ellipsis/, "a long name is not shortened, so it wraps the row taller than its bars");
  // And the column those 156px of name live in, measured rather than promised.
  assert.match(css, /\.tl-name\s*\{[^}]*width:\s*156px/, "the name column is not the width the row was measured at");
});

// ── v157: every tag leaves the row, for the tip and the card ─────────────────
//
// Her ask of 22 September: "The module tag, can you put them in the tip tips?"
// and then, asked which ones, "Every tag, into the tip". The badges were the last
// words left on the row, and every word on the row is height the modules window
// cannot have. They are everywhere the notes already are — in the tip a computer
// opens under the pointer, and written out on the card her tap opens, which is
// where a phone reads them, because a finger has no hover to open a tip with.

test("every module tag is off the row, and in the tip and on the card instead (v157)", () => {
  const { root } = render();

  // Not one badge on any row of the whole day — not on a name cell and not beside
  // one. The row is the name and its bars and nothing else, which is what makes it
  // 46px and what the 54 pixels the old badges cost her phone buy back.
  const rows = walk(root).filter((n) => hasClass(n, "tl-row"));
  const onRow = rows.flatMap((r) => walk(r)).filter((n) => hasClass(n, "badge"));
  assert.equal(onRow.length, 0, `a tag is still on a row: ${onRow.map((n) => textOf(n).trim()).join(" / ")}`);

  // Every tag the tip carries is the same tag the module's own card carries, word
  // for word. That is the whole promise of the move: nothing is lost, it is only
  // somewhere a phone can reach it — a finger has no hover to open a tip with.
  const tagged = rows.filter((r) => walk(r).some((n) => hasClass(n, "tl-tag-line")));
  assert.ok(tagged.length, "no row carries a tag line at all, so the tags went nowhere");
  for (const row of tagged) {
    const named = walk(row).find((n) => hasClass(n, "tl-name-txt"));
    if (!named) continue; // a second production line: its tags are the module's, on line 0
    const name = textOf(named).replace(/\s+/g, " ").trim().replace(/^\S+\s+/, "");

    const held = walk(row).find((n) => hasClass(n, "tl-tip"));
    const tagLine = walk(held).find((n) => hasClass(n, "tl-tag-line"));
    // The tag line is the first of the tip's three lines, because it is the
    // shortest of them to read.
    assert.equal(walk(held).filter((n) => hasClass(n, "tl-sub"))[0], tagLine,
      `the tag line is not the first line of the tip on ${name}`);
    const said = textOf(tagLine).replace(/\s+/g, " ").trim();

    openModule(root, name);
    const cardTags = walk(layers["popup-layer"]).find((n) => hasClass(n, "tl-tag-row"));
    assert.ok(cardTags, `the card for ${name} has no tag row, so a phone cannot read its tags`);
    const onCard = walk(cardTags).filter((n) => hasClass(n, "badge")).map((n) => textOf(n).replace(/\s+/g, " ").trim());
    assert.equal(onCard.join(" · "), said, `the tip and the card disagree about ${name}`);
  }
});

test("tags that only exist for a repeated module are carried the same way (v157)", () => {
  // Two of the module: it wears "2 of them", which no number in the bars says.
  const modules = ONE_BAKER_SCENARIO.modules.map((m) => (m.id === "solo_scale" ? { ...m, count: 2 } : { ...m }));
  const { root } = render({ modules });

  const rows = walk(root).filter((n) => hasClass(n, "tl-row"));
  assert.equal(rows.flatMap((r) => walk(r)).filter((n) => hasClass(n, "badge")).length, 0,
    "a tag is still on a row of a repeated module");

  openModule(root, "Oil the pans");
  const cardTags = walk(layers["popup-layer"]).find((n) => hasClass(n, "tl-tag-row"));
  assert.ok(cardTags, "the card of a repeated module has no tag row");
  assert.match(textOf(cardTags), /2 of them/, `the card does not say how many of it there are: ${textOf(cardTags)}`);
});

// The tip is three lines now — the tags, then when the module starts, then what a
// batch costs — which is taller than the 46px row it belongs to. It is still not
// cut by the edge of the scrolling panel, and that is not luck: it is centred on
// its own row, so half the box goes into the slack above the first module (the
// clock strip) or below the last one (the person rows).
test("the three-line tip is held inside the panel it is drawn in (v157)", () => {
  const css = read("admin/css/app.css");
  assert.match(css, /\.tl-tip\s*\{[^}]*max-width:\s*min\(340px, calc\(100vw - 240px\)\)/,
    "a wide tag line can run the tip off the right edge of the panel");
  assert.match(css, /\.tl-tip\s+\.tl-tag-line\s*\{[^}]*white-space:\s*normal/,
    "the tag line cannot wrap, so a long one widens the box instead of folding");
  assert.match(css, /\.tl-tip\s*\{[^}]*top:\s*50%[^}]*translateY\(-50%\)/,
    "the tip is not centred on its row, so a first or last module's tip is cut in half");
});

// ── v157: a shorter control list, so the modules window gets the room ────────
//
// Her words: "Make the scale with + -, People: make it drop down option, The
// line: this name is very unclear, we just need the button, WORK BACKWARD. The
// idea is to make this list shorter and make room for a bigger modules windows."
// Four named stops became two presses, three People chips became one drop-down
// whose closed text is the arrangement in force, the "The line" group left the
// row for the module card, and the day-backwards group lost its label and kept
// only the button.

test("the scale is two presses around the name of the stop it is on (v157)", () => {
  const { root } = render();
  const group = ctlGroup(root, "Scale");

  const steps = walk(group).filter((n) => hasClass(n, "tl-step"));
  assert.equal(steps.length, 2, `the scale is not exactly two presses: ${steps.length}`);
  assert.deepEqual(steps.map((n) => textOf(n).trim()), ["−", "+"], "the two presses are not a minus and a plus");
  // Each press says out loud what it will do, because a lone − and + on a phone
  // says nothing about which way the day is about to move.
  assert.match(steps[0].attrs["aria-label"] || "", /wider/i, "the minus does not say it widens the view");
  assert.match(steps[1].attrs["aria-label"] || "", /closer/i, "the plus does not say it closes in");

  // Between them, the name of the stop the view is on — the four names v154 put in
  // four chips, kept as a read-out rather than as four taps.
  const named = walk(group).find((n) => hasClass(n, "tl-step-name"));
  assert.ok(named, "the scale no longer names the stop it is on");
  assert.match(textOf(named), /Wide|Standard|Close|Closest/, `the scale reads "${textOf(named).trim()}"`);

  // The four chips are gone — a shorter row was the whole point of the change.
  assert.equal(walk(group).filter((n) => hasClass(n, "tl-chip")).length, 0, "the four scale chips are still in the row");

  // And the presses do move the view, one stop at a time: on + the day is drawn
  // closer, and at the closest stop the + is itself switched off rather than
  // running past the end of the dial and leaving her day off the screen.
  const { root: r2, state } = render();
  const before = state.settings.scenario.pxPerMin;
  walk(r2).filter((n) => hasClass(n, "tl-step"))[1].dispatchEvent({ type: "click" });
  assert.ok(state.settings.scenario.pxPerMin > before, "the closer press did not close the view in");

  const end = render({ pxPerMin: 1000 });
  assert.equal(walk(end.root).filter((n) => hasClass(n, "tl-step"))[1].disabled, true,
    "the closer press is still live at the closest stop");
  const start = render({ pxPerMin: 0.1 });
  assert.equal(walk(start.root).filter((n) => hasClass(n, "tl-step"))[0].disabled, true,
    "the wider press is still live at the widest stop");
});

test("the people are one drop-down, and its closed text is the arrangement in force (v157)", () => {
  const { root } = render();
  const people = ctlGroup(root, "People");
  const sel = walk(people).find((n) => n.tagName === "SELECT" && hasClass(n, "tl-select"));
  assert.ok(sel, "the people are not a drop-down any more");

  // One placeholder that shows as the closed control's own text, and three answers
  // behind it. The placeholder is what she has now rather than an instruction — a
  // control that only ever said "choose" would hide the answer she came here to read.
  const options = walk(sel).filter((n) => n.tagName === "OPTION");
  assert.equal(options.length, 4, `the drop-down does not hold a reading and three answers: ${options.length}`);
  const showing = options[0];
  assert.ok(showing.disabled && showing.selected, "the drop-down's closed text is not the reading");
  assert.ok(sel.value === "" || sel.value === undefined, "the drop-down opens on an answer rather than on the reading");
  assert.match(textOf(showing), /Sharing|One a module|One a line|Your own|Combined/,
    `the closed control reads "${textOf(showing).trim()}", which is not the arrangement in force`);

  const labels = options.slice(1).map((n) => textOf(n));
  assert.ok(labels.some((l) => /One a module|One a line/.test(l)), `no one-to-a-job answer: ${labels.join(" / ")}`);
  assert.ok(labels.some((l) => /Share them out/.test(l)), `no share-them-out answer: ${labels.join(" / ")}`);
  assert.ok(labels.some((l) => /Combine two people/.test(l)), `no combine answer: ${labels.join(" / ")}`);

  // And the three People chips v154 put in the row are gone, replaced by this one
  // control rather than sitting beside it.
  assert.equal(walk(people).filter((n) => hasClass(n, "tl-chip")).length, 0, "the People chips are still in the row");
});

test("the line's own group has left the control row for the module card (v157)", () => {
  const { root } = render();

  // Off the row: neither its label nor the bulk presses that lived under it. The
  // name was the part she could not read — "this name is very unclear" — and the
  // presses set a thing that is set per module anyway, beside the three answers
  // that already do exactly that.
  const ctl = walk(root).find((n) => hasClass(n, "tl-ctl"));
  assert.ok(ctl, "the controls row is gone altogether");
  assert.ok(!/\bline\b/i.test(walk(ctl).filter((n) => hasClass(n, "tl-ctl-lab")).map((n) => textOf(n)).join(" ")),
    "the controls row still carries a label about the line");
  assert.equal(walk(ctl).filter((n) => n.tagName === "BUTTON" && /^Chain |Take the waiting off/.test(textOf(n).trim())).length, 0,
    "the chain-the-line press is still in the controls row");

  // And on the card, which is what she asked for: "put into the module card".
  openModule(root, "Mixing the dough in the tub");
  assert.match(popupBody(), /Waiting on the module above/, "the module card does not carry the line's own words");
  assert.match(popupBody(), /Nothing is waiting right now|waits? on the module above/,
    "the card does not say what is waiting, which is what the group was for");
  assert.ok(walk(layers["popup-layer"]).some((n) => n.tagName === "BUTTON" && /Chain every module/.test(textOf(n))),
    "the module card offers no way to chain the line");

  // Everything the chip's own card carried comes with the move, or it is not a move
  // but a deletion: the three cost numbers were on that card, and a card that lost
  // them while gaining the presses would be quietly thinner than the thing it
  // replaced. The numbers are the day's own, in the shape the chip's card used.
  assert.match(popupBody(), /\bperson\b|\bpeople\b/, "the card lost the count of people the chip's card carried");
  assert.match(popupBody(), /of hands/, "the card lost the hands figure the chip's card carried");
  assert.match(popupBody(), /day\./, "the card lost the length of the day the chip's card carried");
});

// ── v157: a taller window ────────────────────────────────────────────────────

test("the modules window is taller, and the paragraphs above it are gone (v157)", () => {
  const { root } = render();

  // Her first ask, "i want to make the modules window taller", and her last,
  // "remove?" on the two paragraphs.
  //
  // v157 answered the height with a floor and a raised cap, and v159 replaced both
  // with ONE height: the pair left the panel a rubber band that followed the day's
  // rows, which is the fault she reported on 23 September. What v157 was for is
  // kept — the window is still a window and still scrolls — so the assertions are
  // the same two facts, read off the rule that carries them now.
  const css = read("admin/css/app.css");
  assert.match(css, /\.tl\s*\{[^}]*height:\s*min\(80vh, 760px\)/, "the modules window has no height of its own, so it is not a window");
  assert.match(css, /\.tl\s*\{[^}]*overflow:\s*auto/, "the modules window no longer scrolls");
  // And the rubber band is gone with it: one height, and no floor or cap left to
  // hand the panel back to the day's rows. See v159 below for what that fixed.
  const tlRule = css.slice(css.indexOf(".tl {"), css.indexOf("}", css.indexOf(".tl {")));
  assert.doesNotMatch(tlRule, /min-height/, "the modules window still has a floor, so its height is the day's again");
  assert.doesNotMatch(tlRule, /max-height/, "the modules window still has a cap, so it stops growing only where the day stops");

  // The two paragraphs above the chart are gone from the day card, and so is the
  // signpost that named the day-backwards control: the button names itself.
  const src = read("admin/js/views/scenario.js");
  assert.doesNotMatch(src, /dayBackSignpost/, "the removed day-backwards signpost is still built");
});

test("the day-backwards group is the button and nothing else (v157)", () => {
  const { root } = render();
  const group = dayBackGroup(root);

  // "we just need the button, WORK BACKWARD" — no label over it, and no clock in
  // the label. The button's own words say what it does.
  assert.equal(walk(group.el).filter((n) => hasClass(n, "tl-ctl-lab")).length, 0,
    "the day-backwards group has a label above the button again");
  const buttons = walk(group.el).filter((n) => n.tagName === "BUTTON");
  assert.equal(buttons.length, 1, `the group is not one button: ${buttons.map(textOf).join(" / ")}`);
  assert.match(textOf(buttons[0]), /Work the day backwards/, "the button stopped saying what it does");
});

// ── v158: the people rows come down to one line, the tally becomes a ruler ──
//
// Her ask of 22 September, following v157: "can i have all the peoples cards
// noted in tool tips as well?" — and then, asked how far it should go, "not on
// the whole roll, just the title. The height of people is fix. show everything
// about them in tooltips". So the people rows and the tally at the foot of the
// day keep what every module row already keeps: the name and nothing else, with
// everything they have to say in a tip on the title.
//
// The height is the point of it. A person's row was ≈42px and ≈56px on a day
// where two of their jobs collided, against a module row's 46px — so the strip
// pinned to the foot of the panel grew and shrank as she scrolled the day, which
// is the one thing v157's window was for.

// Every person row in the held block: the people, never the tally.
function personRows(root) {
  return walk(root).filter((n) => hasClass(n, "tl-row") && hasClass(n, "person") && !hasClass(n, "total-row"));
}
const nameCell = (row) => walk(row).find((n) => hasClass(n, "tl-name"));
const tipOf = (row) => walk(row).find((n) => hasClass(n, "tl-tip"));
// The direct children of an element, elements only.
const kidElements = (n) => (n.children || []).filter((c) => c.nodeType === 1);
// What a node says with every tip inside it left out — the reading she gets
// without pointing at anything, which on a phone is the only reading there is.
function textWithoutTips(n) {
  if (n.nodeType === 1 && hasClass(n, "tl-tip")) return "";
  let s = n.textContent || "";
  for (const c of n.children || []) {
    if (c.nodeType === 3) s += ` ${c.text}`;
    else if (c.nodeType === 1) s += ` ${textWithoutTips(c)}`;
  }
  return s;
}
// The day where two of a person's jobs collide: the oven and the packing both on
// person 2, both starting at the same minute. Nothing stored is touched — this is
// a scenario built for the test and handed to the screen.
function collidingDay() {
  return ONE_BAKER_SCENARIO.modules.map((m) => (m.id === "solo_pack"
    ? { ...m, person: 2, startMin: 250 }
    : m.id === "solo_oven" ? { ...m, person: 2 } : { ...m }));
}
// A day where one person has a single module's work and nothing else, so their row
// is four short stretches and then empty ground the rest of the way down. Handed to
// the screen as a scenario of its own; nothing she has saved is touched.
function oneJobDay() {
  return ONE_BAKER_SCENARIO.modules.map((m) => (
    m.id === "solo_mix" ? { ...m, person: 1 } : { ...m, person: 2 }
  ));
}

test("a person's row is their name and nothing else, and their tip carries the rest (v158)", () => {
  const { root } = render();
  const rows = personRows(root);
  assert.ok(rows.length, "the day has no person rows at all");

  for (const row of rows) {
    const cell = nameCell(row);
    assert.ok(cell, "a person row has no name cell");
    // Nothing under the name outside the tip: the work total, the places and the
    // red collision line used to be printed here, on the row, and they are what
    // made the row taller than the bars beside it.
    const loose = walk(cell).filter((n) => hasClass(n, "tl-sub") && !walk(tipOf(row)).includes(n));
    assert.equal(loose.length, 0,
      `a person row still prints ${loose.length} line(s) of its own: ${loose.map((n) => textOf(n).trim()).join(" / ")}`);
    const own = textWithoutTips(cell);
    assert.doesNotMatch(own, /of work/, "the work total is still on the row itself");
    assert.doesNotMatch(own, /collisions|two jobs at once/, "the collision line is still on the row itself");

    // And all of it is in the tip, which is what a computer points at.
    const tip = tipOf(row);
    assert.ok(tip, "the person's row carries no tip, so their notes went nowhere");
    assert.match(textOf(tip), /of work/, "the tip does not carry the work total");
    assert.match(textOf(tip), /What they do today/, "the tip does not carry the jobs");
  }
});

test("a person's tip and their card say the same things, word for word (v158)", () => {
  const { root } = render();
  for (const row of personRows(root)) {
    const tip = tipOf(row);
    const workLine = walk(tip).find((n) => hasClass(n, "tl-sub") && /of work/.test(textOf(n)));
    assert.ok(workLine, "the tip carries no work total at all");
    const work = textOf(workLine).split(" · ")[0].replace(/\s+/g, " ").trim();
    // Every job line the tip carries, in the tip's own order — read off the same
    // list the card prints, with the same cap of six and the same "…and N more".
    const jobs = walk(tip).filter((n) => hasClass(n, "tl-note-job"))
      .map((n) => textOf(n).replace(/\s+/g, " ").trim());

    row.dispatchEvent({ type: "click" });
    const body = popupBody();
    assert.ok(body.includes(work), `the tip says "${work}" and the card does not`);
    assert.ok(jobs.length, "the tip carries no job lines at all");
    let from = 0;
    for (const job of jobs) {
      const at = body.indexOf(job, from);
      assert.ok(at >= 0, `the card does not carry the tip's job line "${job}"`);
      from = at + job.length;
    }
  }
});

test("a collision changes nothing about a row's shape, so the strip's height is fixed (v158)", () => {
  const { root } = render({ modules: collidingDay() });
  const rows = personRows(root);
  // The shape of a name cell, by what each part is for rather than by its exact
  // class list — a person's tip wears one class more than a module's, and the
  // question here is which parts are in the cell, not what they are painted with.
  const shape = (row) => kidElements(nameCell(row)).map((c) => (hasClass(c, "tl-tip") ? "tip"
    : hasClass(c, "tl-name-top") ? "name" : String(c.className))).join(" + ");

  const clashing = rows.find((r) => /collisions|two jobs at once/.test(textOf(tipOf(r))));
  const clean = rows.find((r) => !/collisions|two jobs at once/.test(textOf(tipOf(r))));
  assert.ok(clashing, "no person on this day has a collision, so the comparison proves nothing");
  assert.ok(clean, "every person on this day has a collision, so there is no clean row to compare with");

  assert.equal(shape(clashing), shape(clean),
    "a collision still adds a line to its own row, so the foot of the panel moves under her");

  // And a person's row is shaped exactly like a module's — the same two things in
  // the name cell — which is why it is the same height and why the height cannot
  // move. A module row carries its name and its tip; nothing else.
  const moduleRow = walk(root).find((n) => hasClass(n, "tl-row") && !hasClass(n, "person") && tipOf(n));
  assert.ok(moduleRow, "no module row carries a tip");
  assert.equal(shape(clean), shape(moduleRow),
    `a person's row is not shaped like a module's: ${shape(clean)} against ${shape(moduleRow)}`);
});

test("the tip is a sibling of the name and not inside it (v158)", () => {
  const { root } = render();
  for (const row of personRows(root)) {
    const cell = nameCell(row);
    const kids = kidElements(cell);
    assert.equal(kids.length, 2, `a person's name cell holds ${kids.length} things, not two`);
    assert.ok(hasClass(kids[0], "tl-name-top"), "the name cell does not open with the name's line");
    assert.ok(hasClass(kids[1], "tl-tip"), "the tip is not a sibling of the name's line");
    // Inside the name's own line, opening the tip would be back in the row's flow —
    // which is the growing row v156 exists to stop.
    assert.equal(walk(kids[0]).filter((n) => hasClass(n, "tl-tip")).length, 0,
      "the tip is inside the name's own line, so opening it can move the row");

    // The label is in a span of its own, without which the ellipsis can never
    // apply: a bare string in a flex row is an anonymous flex item no rule reaches.
    const label = walk(kids[0]).find((n) => hasClass(n, "tl-name-txt"));
    assert.ok(label, "the person's label is a bare string, so a long one wraps the row taller than its bars");
    assert.match(textOf(label), /Person 1/, `the label stopped naming the person: ${textOf(label)}`);
  }
});

test("a tip inside the strip at the foot of the panel opens upward, and the module's still centres (v158)", () => {
  const css = read("admin/css/app.css");
  // The module tip is unchanged, and a v157 test stands on this line: it is
  // centred on its row, which is what keeps a first or last module's box inside
  // the panel. The tally sits ON the panel's bottom edge, where a centred box
  // would be cut in half, so it gets an override rather than a rewrite.
  assert.match(css, /\.tl-tip\s*\{[^}]*top:\s*50%[^}]*translateY\(-50%\)/,
    "the module's tip stopped being centred on its row");
  assert.match(css, /\.tl-people\s+\.tl-tip\s*\{[^}]*top:\s*auto[^}]*bottom:\s*0[^}]*transform:\s*none/,
    "a tip in the strip at the foot is not opened upward, so it is cut in half by the panel's own edge");
  // And it folds instead of widening: a job line is a module's name with a clock
  // and a line number in front of it, and that is wider than the box is allowed.
  assert.match(css, /\.tl-tip-person\s*\{[^}]*white-space:\s*normal/,
    "a job line cannot fold, so the box runs past the width it is allowed");
  // The strip itself may not clip what it holds.
  assert.doesNotMatch(css, /\.tl-people\s*\{[^}]*overflow\s*:\s*(?!visible)/,
    "the strip has an overflow of its own, which would clip the tips inside it");
  // And the hover tint on a person's row is gone, her own v156 instruction applied
  // to the last rows that had not had it: only the title opens the note.
  assert.doesNotMatch(css, /\.tl-row\.person\.tappable:hover/,
    "a person's row still reacts when the pointer is not on their title");
});

test("the tally's three facts are in its tip and off the row (v158)", () => {
  const { root } = render({ modules: collidingDay() });
  const total = walk(root).find((n) => hasClass(n, "total-row"));
  assert.ok(total, "the day has no tally row");

  const tip = tipOf(total);
  assert.ok(tip, "the tally carries no tip, so its three facts went nowhere");
  // All three, and they are printed nowhere else in the app.
  assert.match(textOf(tip), /up to 2 at once/, "the tip does not say how many the day asks for");
  assert.match(textOf(tip), /busiest/, "the tip does not name the busiest stretch");
  assert.match(textOf(tip), /with two at a time/, "the tip does not say how much of the day is paid for twice");

  // And none of them is on the row, which is one line like every other row. The
  // row's own NAME is "People at once", so the facts are what is looked for here
  // and not the phrase — "up to 2 at once" is a fact, "People at once" is a title.
  const own = textWithoutTips(nameCell(total));
  assert.doesNotMatch(own, /up to \d+ at once|one at a time|busiest|with two at a time/,
    `the tally still prints itself on the row: ${own.trim()}`);
  assert.equal(kidElements(nameCell(total)).length, 2, "the tally's name cell is not the name and its tip");
});

test("the PEOPLE heading is gone (v158)", () => {
  const { root } = render();
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-split")).length, 0,
    "the PEOPLE heading is still drawn over the people");
  // And its rules went with it, rather than being left in the stylesheet for the
  // next reader to wonder about.
  assert.doesNotMatch(read("admin/js/views/scenario.js"), /tl-split/, "the PEOPLE heading is still built");
  assert.doesNotMatch(read("admin/css/app.css"), /\.tl-split\s*\{/,
    "the PEOPLE heading's rule is still in the stylesheet with nothing on the screen wearing it");
});

test("the ruler's step follows the scale, and reaches the minute at Closest (v158)", () => {
  // Her ask: "make the ruler resolution to 1min" — and, asked where a minute could
  // be drawn at all, "a minute where it can be drawn". A minute is 1.2px at the
  // wide stop and 3.2px at the closest, so the step follows the scale: half hours
  // across a whole day, quarter hours at the standard reading, five minutes at
  // Close, and a minute at Closest.
  const windowMin = computeScenario(ONE_BAKER_SCENARIO).windowMin;
  const hourCount = Math.floor(windowMin / 60) + 1;
  const minorCount = Math.max(0, Math.floor((windowMin - 30) / 60) + 1);

  for (const c of [
    { pxPerMin: 1.2, step: 30, name: "Wide" },
    { pxPerMin: 1.6, step: 15, name: "Standard" },
    { pxPerMin: 2.4, step: 5, name: "Close" },
    { pxPerMin: 3.2, step: 1, name: "Closest" },
  ]) {
    const { root } = render({ pxPerMin: c.pxPerMin });
    const ruler = walk(root).find((n) => hasClass(n, "tl-ruler"));
    assert.ok(ruler, `no ruler at ${c.name}`);
    const ticks = walk(ruler).filter((n) => hasClass(n, "tl-tick"));
    assert.equal(ticks.length, Math.floor(windowMin / c.step) + 1,
      `at ${c.name} the ruler is not drawn every ${c.step} minutes`);

    // On the hour: solid and labelled, and nothing else is labelled. The half
    // hour: the dashed tick it has always been. Anything finer: the new fine
    // hairline, which is the only thing v158 added to the ruler.
    const labelled = ticks.filter((n) => walk(n).some((x) => x.tagName === "SPAN"));
    assert.equal(labelled.length, hourCount, `at ${c.name} something other than an hour is labelled`);
    const minor = ticks.filter((n) => hasClass(n, "minor"));
    assert.equal(minor.length, minorCount, `at ${c.name} the half hour is not the dashed tick`);
    const fine = ticks.filter((n) => hasClass(n, "fine"));
    assert.equal(fine.length, ticks.length - hourCount - minorCount, `at ${c.name} the fine ticks are not the rest`);
    if (c.step < 30) assert.ok(fine.length > 0, `at ${c.name} the ruler is not drawn finer than the half hour`);
    else assert.equal(fine.length, 0, `at ${c.name} a minute is ${c.pxPerMin}px and there is no room for a finer mark`);
  }
});

test("a module drawn as lines can wait on the module above it (v155)", () => {
  // Found while building v155, and it is older than this release: a module drawn as
  // two production line read the waiting badge's words from `aboveBadge`, which was
  // declared inside the other half of an if. Two production line on a module that
  // waits on the one above — two taps on her own card — threw instead of drawing.
  // Nothing she has saved is drawn as lines, which is the only reason it is a latent
  // fault rather than a report.
  const modules = ONE_BAKER_SCENARIO.modules.map((m) => (m.id === "solo_scale" ? { ...m, count: 2, follow: true, startMode: "wait" } : { ...m }));
  const { root } = render({ modules });

  const lines = walk(root).filter((n) => hasClass(n, "tl-row") && hasClass(n, "tl-line"));
  assert.equal(lines.length, 2, "the module's two production line were not drawn");
  const first = lines.find((n) => textOf(n).includes("Oil the pans"));
  assert.ok(first, "the line rows do not name the module they belong to");
  assert.match(textOf(first), /waits above/, "the line row lost the badge saying it waits on the module above");
  // And the module is still one thing she can read in one place: its name and its
  // waiting are on the first line, never repeated on the second.
  const second = lines.find((n) => !textOf(n).includes("Oil the pans"));
  assert.ok(!/waits above/.test(textOf(second)), "the waiting badge is repeated on the second production line");
});

// ── The ruler's lines carried down to the people (v160) ───────────────────
// Her ask: "can the ruler extend down to peoples marker area?" The clock strip is
// one row at the top of the chart and the markers are rows below it, so the lines
// are painted down every track instead — and a marker's edge then lands on a line
// she can follow up to the clock. Asked which way she wanted it, she chose a faint
// grid down every row; a clock repeated above the people was the other option.
//
// The grid's step is the ruler's own wherever the ruler can be read, and a coarser
// one where it cannot: at the closest stop a minute is 3.2px, and a line every
// 3.2px is a wash of grey rather than a grid. It takes the smallest step that is
// BOTH at least the ruler's — which is what makes every grid line a tick as well,
// so the two can never disagree about where a minute is — and at least twelve
// pixels wide.
test("the ruler's lines are carried down every row, at a step that is still a grid (v160)", () => {
  // The grid is PAINTED rather than laid out — a second gradient layer on the
  // track, which is zero new nodes. That is not a detail: the ruler alone draws
  // 1441 tick elements at the closest stop, and duplicating those down eight
  // module rows and every person row would be ten thousand nodes in the panel.
  const css = read("admin/css/app.css");
  const rules = (re) => [...css.matchAll(re)].map((m) => m[0]);
  const trackRules = rules(/\.tl-track\s*\{[^}]*\}/g);
  const twoLayer = trackRules.filter((r) => (r.match(/repeating-linear-gradient/g) || []).length === 2);
  assert.equal(twoLayer.length, 1,
    `the track does not carry the hour line with a grid under it: ${trackRules.length} rule(s), ${twoLayer.length} with two layers`);
  assert.match(twoLayer[0], /--tick-w/, "the grid layer is not drawn at --tick-w");
  // The hour line is written first because it is the one painted on top: where the
  // two fall on the same pixel it must be the line she reads the clock by.
  assert.ok(twoLayer[0].indexOf("--hour-w") < twoLayer[0].indexOf("--tick-w"),
    "the grid is painted over the hour line rather than under it");

  // The ruler's own track keeps the hour line alone. Its tick elements already draw
  // on top of it, so a finer layer under them would put lines between the ticks the
  // clock is read off.
  const rulerRules = rules(/\.tl-ruler \.tl-track\s*\{[^}]*\}/g);
  assert.ok(rulerRules.length, "the ruler's own track is not told apart from the rows under it");
  assert.ok(rulerRules.every((r) => !/--tick-w/.test(r)),
    "the ruler's track carries the grid under its own ticks");

  // And a module switched off keeps both layers rather than dropping the only thing
  // its own dimmed bars are read against.
  const offRules = rules(/\.tl-row\.off \.tl-track\s*\{[^}]*\}/g);
  assert.ok(offRules.length, "there is no rule for a switched-off module's track");
  assert.ok(offRules.every((r) => !/background-image/.test(r)),
    "a switched-off module paints its own background and so drops the grid");

  // The step at each of the four stops, as the chart itself sets it — read off the
  // .tl element's own style rather than recomputed, so the test cannot agree with a
  // rule the screen does not use.
  for (const c of [
    { pxPerMin: 1.2, step: 30, gridMin: 30, tickW: 36, name: "Wide" },
    { pxPerMin: 1.6, step: 15, gridMin: 15, tickW: 24, name: "Standard" },
    { pxPerMin: 2.4, step: 5, gridMin: 5, tickW: 12, name: "Close" },
    { pxPerMin: 3.2, step: 1, gridMin: 5, tickW: 16, name: "Closest" },
  ]) {
    const { root } = render({ pxPerMin: c.pxPerMin });
    const tl = walk(root).find((n) => hasClass(n, "tl"));
    assert.ok(tl, `no chart at ${c.name}`);
    assert.equal(px(tl, "--hour-w"), Math.round(60 * c.pxPerMin), `at ${c.name} the hour line moved`);
    assert.equal(px(tl, "--tick-w"), c.tickW,
      `at ${c.name} the grid is not every ${c.gridMin} minutes (${c.gridMin * c.pxPerMin}px)`);
    // Never a line she cannot tell from its neighbour — which is the whole reason
    // the grid has a step of its own and does not simply follow the ruler.
    assert.ok(c.gridMin * c.pxPerMin >= 12,
      `at ${c.name} the grid is ${c.gridMin * c.pxPerMin}px apart, which reads as a wash`);
    // And never a step that lands between the ruler's own ticks: a grid line that
    // is not also a tick is a second opinion about where a minute is.
    assert.equal(c.gridMin % c.step, 0,
      `at ${c.name} a grid line every ${c.gridMin} min is not on the ruler's ${c.step} min ticks`);
  }
});

// ── The clock, drawn once (v162 reverted) ────────────────────────────────
// v162 drew the clock a second time directly above the people's rows, at her own
// ask — "yes, draw the clock above the people's rows". Read on the screen, she did
// not want it: "i dont want the clock, i just want the ruler to draw into person
// row". And the ruler's LINES do reach her people's rows already — that is the
// v160 grid, whose test stands above — so the second clock was answering an ask
// that had been answered with the grid.
//
// So the clock is one row again, at the top of the panel, which is where it has
// always been. Kept as a test rather than left to the diff, because the second
// clock is a thing that could be re-added by accident: it came from a shared
// builder, so giving rulerRow a second call site is one line.
test("the clock is drawn once, at the top of the chart", () => {
  const { root } = render();
  const clocks = walk(root).filter((n) => hasClass(n, "tl-ruler") || hasClass(n, "tl-ruler-foot"));
  assert.equal(clocks.length, 1, `${clocks.length} clock rows are drawn on the chart, not one`);
  assert.ok(hasClass(clocks[0], "tl-ruler"), "the clock row is not the ruler at the top of the panel");
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-ruler-foot")).length, 0,
    "a clock is drawn above the people's rows again");
  assert.equal(read("admin/css/app.css").indexOf("tl-ruler-foot"), -1,
    "the stylesheet still carries rules for a clock above the people's rows");
  // And it is still pinned where it has always been, wearing the class that pins it.
  assert.match(read("admin/css/app.css"), /\.tl-ruler\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/,
    "the clock is no longer pinned to the top of the panel");

  // The drag still belongs to it, and to nothing else: one strip, one handler.
  const trackOf = (row) => walk(row).find((n) => hasClass(n, "tl-track"));
  const band = trackOf(clocks[0]);
  assert.ok(band, "the clock row has no track to read along");
  assert.ok((band._listeners.pointerdown || []).length, "the clock strip cannot be dragged");
  assert.ok((band._listeners.pointermove || []).length, "the clock strip does not follow a drag");
  const cursor = walk(root).find((n) => hasClass(n, "tl-cursor"));
  const lab = walk(root).find((n) => hasClass(n, "tl-cursor-lab"));
  assert.ok(cursor && lab, "the chart draws no time cursor to read against");
  band.dispatchEvent({ type: "pointerdown", clientX: 400, clientY: 100, pointerId: 1 });
  const at = lab.textContent;
  band.dispatchEvent({ type: "pointerup", clientX: 400, clientY: 100, pointerId: 1 });
  assert.ok(!cursor.hidden && at, "a drag along the clock reads nothing at all");
});

// ── Handing one stretch of somebody's day to somebody else (v160, v161) ──
// Her ask: "can the personX marker be click to change it job to personY, by a drop
// down person selector" — and then, asked which gesture she meant, "click on the
// person's occupied time slot, a drop down list, list the other people available".
//
// And her correction of the day after, once v160 shipped the move at module level:
// "The reassign job to next person is not whole day, it is that slot only" — then,
// asked what one tap should take with it, "we dont change the batch. Say a labour
// slot belongs to person1, clicking that slot, will offer to swap it to others,
// this basically to balance work load". So what changes hands is the ONE stretch
// under her finger. A fold loop that folds three times in a batch draws three
// markers, and handing one over leaves the other two where they are.
//
// The stretch is found by the MINUTE under the finger and not by closest(".tl-bar"),
// which is what the module rows do: a person's marker carries no dataset at all, so
// a bar could not say which module it came off. Reading the minute also gives her
// the row's whole height instead of the 11px sliver a bar is.

// A fold loop on person 1 and a mix on person 2: two rows, and a batch of the fold
// that draws three separate stretches of hands. Every fold is six minutes rather
// than the one her own rest really takes, so the finger can land well inside a
// stretch instead of beside it — a one-minute marker is 1.6 pixels wide.
function foldDay() {
  return [
    { id: "fold", name: "The fold loop", on: true, person: 1, people: 1,
      cycles: [
        { name: "Rest, then fold one", min: 31, load: 0, unload: 6 },
        { name: "Rest, then fold two", min: 31, load: 0, unload: 6 },
        { name: "Rest, then fold three", min: 31, load: 0, unload: 6 },
      ],
      batch: 6, everyMin: 300, repeats: 2, startMin: 0 },
    { id: "mix", name: "Mixing the dough", on: true, person: 2, people: 1,
      cycleMin: 20, batch: 6, touchMin: 20, everyMin: 20, repeats: 1, startMin: 0 },
  ];
}

// A tap on a person's track at the pixel `x` along the day. The view reads the
// minute under the finger, so the test states a position and not a bar — and the
// shim's own rects start at zero, so `x` is the day's own offset. Returns whether
// the tap was swallowed, because what happens to an unswallowed one is that the
// row underneath opens the person's own card.
function tapSlot(track, x) {
  let stopped = false;
  track.dispatchEvent({ type: "click", clientX: x, target: track, stopPropagation() { stopped = true; } });
  return stopped;
}
// The track of the person row wearing the tone class `tone`, so a row is found by
// who it is rather than by a name that may also read out of a module above it.
function personTrack(root, tone) {
  const row = personRows(root).find((n) => hasClass(n, tone));
  assert.ok(row, `the day has no ${tone} person row`);
  const track = walk(row).find((n) => hasClass(n, "tl-track"));
  assert.ok(track, `the ${tone} person row has no track`);
  return track;
}
const barsOf = (track) => walk(track).filter((n) => hasClass(n, "tl-bar"));
// Every person row as the tone it wears and the job titles it carries, which is how
// a move is read back: the marker that was on one row is on the other. A row for a
// person who has been left with nothing is not here at all, which is itself one of
// the answers.
function rowsByTone(root) {
  return personRows(root).map((n) => ({
    tone: (String(n.className).match(/ptone-\d+/) || [""])[0],
    titles: barsOf(walk(n).find((x) => hasClass(x, "tl-track"))).map((b) => String(b.attrs.title)),
  }));
}
const titlesOf = (root, tone) => (rowsByTone(root).find((r) => r.tone === tone) || { titles: [] }).titles;

test("a tap on a person's occupied stretch hands that one stretch over, and nothing beside it (v161)", () => {
  const { root, state } = render({ modules: foldDay() });
  const track = personTrack(root, "ptone-1");
  const bars = barsOf(track);
  assert.equal(bars.length, 6, "the fold day does not draw three stretches for each of its two batches");

  // The SECOND fold of the first batch — the middle one of the three, so a hand-over
  // that took the whole batch with it would show on both sides of this tap. The three
  // are told apart by the clock they carry, which is what the marker says and what
  // the card repeats; the module's name is on all three of them, as it should be.
  const first = bars.slice(0, 3).map((b) => String(b.attrs.title || ""));
  assert.equal(new Set(first).size, 3, `the three folds of one batch are not three markers: ${first.join(" | ")}`);
  const bar = bars[1];
  const job = first[1];
  const x = px(bar, "left") + px(bar, "width") / 2;
  assert.equal(tapSlot(track, x), true,
    "a tap on a stretch of the day was let through to the person's own card");

  // The card names the one stretch it is about, in the same words the marker's own
  // title carries — so there is no doubt which of the three she tapped.
  assert.match(popupTitle(), /Move this slot off Person 1/, `the tap opened "${popupTitle()}"`);
  assert.ok(popupBody().includes(job), `the card is not about "${job}": ${popupBody().slice(0, 180)}`);
  // And it says out loud, with the count, that the two folds beside this one stay
  // put — rather than letting her find that out from the chart afterwards.
  assert.match(popupBody(), /3 stretches on Person 1's row/,
    `the card does not count the batch's other stretches: ${popupBody().slice(0, 260)}`);

  // What it offers is the other people on this day, plus the day's own arrangement.
  // A person with no row is not standing anywhere on the chart, so listing them
  // would be offering an answer the day cannot give — but "whoever is free" is not a
  // person, it is what the day does when nobody is named, and it is the only way a
  // stretch can be handed back to nobody in particular.
  const picker = walk(layers["popup-layer"]).find((n) => n.tagName === "SELECT");
  assert.ok(picker, "the card offers no list of people to hand the stretch to");
  const options = walk(picker).filter((n) => n.tagName === "OPTION");
  assert.deepEqual(options.map((o) => String(o.value)), ["0", "2"],
    "the list is not the other people on this day");
  assert.match(textOf(options[0]), /Whoever is free/, "the way back to the day's own arrangement is not offered");
  assert.match(textOf(options[1]), /Person 2/, "an unnamed person is not named by their number");
  const press = popupButton(/Move it to/);
  assert.ok(press, "the card offers no press to make the move");
  assert.match(textOf(press), /Person 2/, "the press does not say who it will hand the stretch to");

  // The move. One stretch of her day changes hands and nothing else does.
  press.dispatchEvent({ type: "click" });
  assert.match(lastToast(), /handed to Person 2/, `the press said "${lastToast()}"`);
  const one = titlesOf(root, "ptone-1");
  const two = titlesOf(root, "ptone-2");
  assert.equal(one.length, 5, `person 1's row has ${one.length} stretches, not the five left behind`);
  assert.equal(two.length, 2, `person 2's row has ${two.length} stretches, not its own job plus the one handed over`);
  assert.ok(!one.includes(job), "the stretch she handed over is still on person 1's row");
  assert.ok(two.includes(job), "the stretch she handed over did not arrive on person 2's row");
  // And its two neighbours from the SAME batch did not follow it, which is the whole
  // of what she corrected: the batch is unchanged and the one slot under her finger
  // moved. The batch's other batch is up on person 1's row too, untouched, and is not
  // the thing being checked here.
  assert.ok(one.includes(first[0]), "the fold before it went with it");
  assert.ok(one.includes(first[2]), "the fold after it went with it");
  assert.ok(!two.includes(first[0]) && !two.includes(first[2]),
    "a fold beside the one she tapped was handed over too");

  // The model's own answer, which is what the editor's "Who is at this module" box
  // and the next phone to sync both read. The module keeps its person and its crew;
  // what is written is the one stretch, under the batch and stretch it belongs to.
  const fold = state.settings.scenario.modules.find((m) => m.id === "fold");
  assert.deepEqual(fold.slotPerson, { "0.1": 2 }, "the stretch she tapped is not the one that changed hands");
  assert.equal(fold.person, 1, "the module's own person was changed by a hand-over of one stretch");
  assert.equal(fold.person, fold.crew[0], "the module and its first line disagree about who is standing there");

  // And the card goes with the stretch. Its heading names the person it is being
  // taken off, and once the day has redrawn that person no longer holds it — so a
  // card left standing would offer a press against a state that is gone. Measured
  // on the layer itself, since an empty card and a closed one differ only here.
  assert.equal(walk(layers["popup-layer"]).length, 0,
    "the card is still on the screen after the move, describing a stretch that has left the row");
  assert.equal(layers["popup-layer"].hidden, true, "the card is empty but the layer is still showing");

  // And the module's own card can no longer say the whole of it. Without the note,
  // "Who is at this module" would read Person 1 while a marker of that module sat on
  // person 2's row — the card and the chart disagreeing about the same day.
  openModule(root, "The fold loop");
  assert.match(popupBody(), /Stretches handed on/, "the module's card says nothing about the stretch handed on");
  assert.match(popupBody(), /stretch of this module has been handed to somebody else: Person 2/,
    `the note does not name who holds it: ${popupBody().slice(0, 400)}`);
});

test("a tap on a person's empty day still opens their own card (v160)", () => {
  // The other half of the gesture: the tap must only be swallowed where there is a
  // job under it. One person with one stretch of work leaves the rest of their row
  // as empty ground, and a tap there has to fall through to the row's own handler —
  // which is what opens the person's card, exactly as it did before this release.
  const { root } = render({ modules: oneJobDay() });
  const track = personTrack(root, "ptone-1");
  const bars = barsOf(track);
  assert.equal(bars.length, 4, "the one-job day does not draw four batches for person 1");

  const scale = 1.6;
  const trackW = px(track, "width");
  const right = Math.max(...bars.map((b) => px(b, "left") + px(b, "width")));
  // Past the last stretch by a fingertip's reach and a whole minute more, and
  // still inside the day — so the only reason nothing is found there is that
  // nothing is there.
  const gapX = right + Math.max(2 * scale, 6) + scale + 2;
  assert.ok(gapX < trackW - 1,
    `the day ends at ${trackW}px with the last stretch at ${right}px, so there is no empty ground to tap`);
  assert.equal(tapSlot(track, gapX), false,
    "a tap where the person is not working was swallowed by the marker's own handler");

  // A tap just past a marker's edge is still that marker: a one-minute job is 1.2
  // pixels at the widest reading, so a finger lands beside a job far more often
  // than on it. Without the reach the narrow end of the scale could not be tapped.
  const last = bars[bars.length - 1];
  const lastJob = String(last.attrs.title || "");
  assert.ok(lastJob, "the last marker of the day does not name its job");
  assert.equal(tapSlot(track, px(last, "left") + px(last, "width") + 2), true,
    "a tap beside a marker found nothing, so a sliver of a job cannot be tapped");
  assert.ok(popupBody().includes(lastJob),
    `the nearest-stretch reach opened a card about something else: ${popupBody().slice(0, 180)}`);
});

test("a day with nobody else on it says so rather than offering an empty list (v160)", () => {
  // Every module on one person, so there is no second row to hand anything to. The
  // click is real — the day is hers and the gesture is hers — so the card must
  // answer rather than open a menu with nothing in it.
  const { root } = render({ modules: ONE_BAKER_SCENARIO.modules.map((m) => ({ ...m, person: 1 })) });
  assert.equal(personRows(root).length, 1, "the day does not have exactly one person on it");
  // The shim's pop-up layer is one layer for the whole file, so it is emptied here:
  // what this test asks is whether THIS tap opened anything, not what the test
  // before it left lying there.
  layers["popup-layer"].replaceChildren();
  const track = personTrack(root, "ptone-1");
  const bar = barsOf(track)[0];
  assert.equal(tapSlot(track, px(bar, "left") + px(bar, "width") / 2), true,
    "a tap on a job with nobody to hand it to did nothing at all");
  assert.match(lastToast(), /Nobody else is on this day/,
    `the tap said "${lastToast()}" instead of saying there is nobody else`);
  // The tap is answered and swallowed rather than opening a second card over the
  // first: the person's own card is one tap away on the row around this job.
  assert.equal(walk(layers["popup-layer"]).filter((n) => n.tagName === "SELECT").length, 0,
    "a card with an empty list of people was opened");
});

// ── The cycles of one batch (v164) ──────────────────────────────────────────
//
// Every number in the cycles list is written by touching that one box, and the
// card is deliberately NOT repainted while she types (v142: a rebuild would throw
// the box out from under her finger). So each box has to write onto the list as
// it stands, never onto a copy taken when the card was built — or the second box
// she touches drags the first one back to what it was when the card opened.
//
// Measured on her own fold module before this: cycle 1's Minutes 31 → 40, then
// cycle 2's Unload, and cycle 1 was back to 31 while its box still read 40. The
// screen and the day disagreed, and the number looked as though it had changed by
// itself.
test("a number typed into one cycle box is not undone by the next box she touches (v164)", () => {
  const { root, state } = render();
  const fold = () => state.settings.scenario.modules.find((m) => m.id === "solo_fold");
  assert.equal(fold().cycles.length, 4, "the fold module no longer has the four cycles this is measured on");

  openModule(root, "The rests and the stretch and folds");
  const box = (label, i) => walk(layers["popup-layer"])
    .find((n) => n.tagName === "INPUT" && n.attrs["aria-label"] === `${label} in cycle ${i + 1}`);
  const type = (label, i, v) => {
    const input = box(label, i);
    assert.ok(input, `the card has no ${label} box on cycle ${i + 1}`);
    input.value = String(v);
    input.dispatchEvent({ type: "input" });
  };

  // Cycle 1's Minutes, then cycle 2's Unload. The first number must survive the
  // second box — this is the fault she saw.
  type("Minutes", 0, 40);
  assert.equal(fold().cycles[0].min, 40, "the first box she used did not reach the module");
  type("Unload", 1, 2);
  assert.equal(fold().cycles[1].unload, 2, "the second box she used did not reach the module");
  assert.equal(fold().cycles[0].min, 40,
    "the second box she touched put cycle 1's Minutes back to where it was when the card opened");

  // Two boxes on ONE row are the same case: Load, then Minutes beside it.
  type("Load", 0, 5);
  type("Minutes", 0, 44);
  assert.equal(fold().cycles[0].load, 5, "a box on the same row was undone by the box beside it");
  assert.equal(fold().cycles[0].min, 44, "the Minutes box did not reach the module");

  // A cycle's own name is a box like any other.
  const nameBox = walk(layers["popup-layer"]).filter((n) => hasClass(n, "cyc-name"))[2];
  assert.ok(nameBox, "the card has no name box for cycle 3");
  nameBox.value = "Fold 3";
  nameBox.dispatchEvent({ type: "input" });
  assert.equal(fold().cycles[2].name, "Fold 3", "renaming a cycle did not reach the module");
  assert.equal(fold().cycles[0].load, 5, "renaming a cycle undid a number she had typed");
  assert.equal(fold().cycles[0].min, 44, "renaming a cycle undid a number she had typed");
});
