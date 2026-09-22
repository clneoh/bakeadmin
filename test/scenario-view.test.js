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
  const { root } = render();
  // The timeline's own legend, which is the copy she reads over the day chart.
  assert.match(textOf(root), /the separate cycles of that batch/);
  // And the cycles box, which only draws once a module is opened, read off the
  // source — it is the sentence that made her doubt the feature existed.
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

// The day-backwards group of the controls row, found by its own label rather than
// by a button's words: the day's own card carries buttons with the same words on
// them, so text alone cannot tell the row from the card.
function dayBackGroup(root) {
  const label = walk(root).find((n) => hasClass(n, "tl-ctl-lab") && /Your day backwards/.test(textOf(n)));
  assert.ok(label, "the controls row has no day-backwards group");
  const el = walk(root).find((n) => hasClass(n, "tl-ctl-group") && (n.children || []).includes(label));
  assert.ok(el, "the day-backwards label is not the label of a group in the row");
  return { el, label, button: (re) => walk(el).find((n) => n.tagName === "BUTTON" && re.test(textOf(n))) };
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
  // The moment her day hangs from is a LABEL and not a second control: nothing
  // beside the button may look pressable, because she has tapped a label that
  // looked like a button once already and read it as a dead control.
  assert.match(textOf(group.label), /9:09 am/, "the row does not name the moment the day hangs from");
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
  assert.doesNotMatch(textOf(group.label), /\d:\d\d/, "a one-module line named a moment it does not have");

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
  assert.equal(inside.filter((n) => hasClass(n, "tl-row") && textOf(n).includes("Cutting and packing")).length, 0,
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
  const held = walk(row).filter((n) => hasClass(n, "tl-detail"));
  assert.equal(held.length, 2, "the row does not carry exactly its two notes");
  assert.match(textOf(held[0]), /starts 4:01 am · 4 batches/,
    `the row's first note no longer says when the module starts: ${textOf(held[0])}`);
  assert.match(textOf(held[1]), /20 min a batch · 20 min of you/,
    `the row's second note no longer says what a batch costs: ${textOf(held[1])}`);

  // Off the row by rule, and back only under a pointer that can hover: a phone has
  // no hover, so a reveal tied to one would be a reveal her phone can never reach.
  const css = read("admin/css/app.css");
  assert.match(css, /\.tl-detail\s*\{\s*display:\s*none/, "the notes are not off the row, so the row is still as tall as them");
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*?\.tl-row:hover\s+\.tl-detail\s*\{\s*display:\s*block/,
    "the notes cannot be brought back on a computer");

  // The card the row's tap opens carries both, at the top, before anything else.
  openModule(root, "Mixing the dough in the tub");
  const body = popupBody();
  assert.match(body, /starts 4:01 am · 4 batches/, "the module card does not carry the row's first note");
  assert.match(body, /20 min a batch · 20 min of you/, "the module card does not carry the row's second note");
});

test("the name takes the row's first line and the badges take the next (v155)", () => {
  const { root } = render();
  const row = walk(root).find((n) => hasClass(n, "tl-row") && textOf(n).includes("The rests and the stretch and folds"));
  const top = walk(row).find((n) => hasClass(n, "tl-name-top"));
  const name = walk(top).find((n) => hasClass(n, "tl-name-txt"));
  assert.ok(name, "the name is not in a span of its own, so a long one cannot be shortened");
  assert.equal(textOf(name).trim(), "🫙 The rests and the stretch and folds", "the row stopped naming the module in full");
  const badges = walk(top).filter((n) => hasClass(n, "badge"));
  assert.ok(badges.length, "the badges are not on the name cell at all");

  // Sharing the name's line was the real damage: this module's name is 273px wide
  // and a badge beside it left 35px of it to read. The name now takes the whole
  // line and the badges break onto the one below, which is 16px — under the 45px
  // the bars already ask for, so the row is no taller for it.
  const css = read("admin/css/app.css");
  assert.match(css, /\.tl-name-top\s*\{[^}]*flex-wrap:\s*wrap/, "the name and its badges cannot break onto two lines");
  assert.match(css, /\.tl-name-txt\s*\{[^}]*flex:\s*1 1 100%/, "the name does not take the line it is on");
  assert.match(css, /\.tl-name-txt\s*\{[^}]*text-overflow:\s*ellipsis/, "a long name is not shortened, so it wraps the row taller than its bars");
  // And the column those 146px of name live in, measured rather than promised.
  assert.match(css, /\.tl-name\s*\{[^}]*width:\s*156px/, "the name column is not the width the row was measured at");
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
