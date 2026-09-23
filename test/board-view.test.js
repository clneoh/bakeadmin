// test/board-view.test.js — the Production line screen as a BOARD (v176).
//
// Her words, 23 September 2026: "can we simplify the productioon portion, it ask for
// alot of key in" and then "maybe one function for production line, 1. copy the chart
// into Prodcution line, but should not be editable, it become a dashboard for worker,
// give the worker good inform of what next for them, how long, and others".
//
// Three things this file exists to hold, and each of them is a claim that would be
// silent if it broke:
//
//   1. A board does not write. Opening the Production line must put nothing into her
//      settings — not her scenario, not her plan — because the sync engine would carry
//      it to her other phone as though she had said it. This is the whole safety of
//      the screen, so it is measured over every tap the board offers, not asserted.
//
//   2. The board IS the planner's chart, not a second drawing of it. Two renderers of
//      one day drift, and this app's rule is that two screens may not disagree about
//      the same day. Where the two DO differ, the difference is deliberate and is
//      pinned here as a difference: a board's tooltip describes, the planner's invites
//      ("tap to move it"); a board has no ladder and no shelf; a board has one button.
//
//   3. The clock is the REAL clock. `placeNow` has no press behind it on a board — a
//      dashboard nobody has touched still has to say what time it is — and it parks at
//      the day's own edge rather than wrapping when the real clock is outside her day.
//
// The stand-in screen below is test/scenario-view.test.js's, copied rather than
// shared, with four additions and no subtractions:
//
//   - `isConnected`, walking up to document.body. `placeNow` asks the ruler whether it
//     is on the page before trusting its offset, and a shim that could not answer would
//     have made the real placement path unreachable from every test in this file.
//   - `offsetLeft`, so the ruler's own origin is a number a test can set rather than a
//     constant the assertion has to be written around.
//   - a frozen `Date` CLASS and not only `Date.now`. A board reads the wall clock
//     through `new Date()`, so freezing only the static left the now-line's minute to
//     the machine the suite happens to run on — an assertion that would pass or fail
//     by the time of day.
//   - a count of `replaceChildren` calls. "A tick repaints nothing" is the rule that
//     keeps a chart she is reading from being redrawn under her scroll, and the only
//     way to assert a repaint did not happen is to count them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// How many subtrees have been rebuilt through `replaceChildren` since the last reset.
// Kept here rather than on a node because a repaint can happen at any depth.
let replaceCount = 0;

function createEl(tag) {
  const node = {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    // scrollLeft is here with scrollTop, and for the same reason the disabled and
    // data-* reflections are: the pane scroll-sync READS a scroll position back off
    // a node, so a shim without one hands the writer undefined and every assertion
    // about the two windows moving together is vacuous. The widths start at zero —
    // a node with no box, as a detached one has — and a test that wants a day wider
    // than its window says so.
    scrollTop: 0, scrollLeft: 0, scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0,
    hidden: false, _listeners: {},
    // A real node is on the page or it is not, and `placeNow` will not trust an
    // offset read off a node that is not: the chart is assembled before it is
    // attached, and a detached element answers every measurement with zero. Walked
    // up to document.body, which is what appendChild and remove keep true.
    get isConnected() {
      for (let n = this; n; n = n.parent || null) if (n === globalThis.document.body) return true;
      return false;
    },
    // A real element's position in its offset parent. Deliberately a plain property
    // a test writes, because the one thing it is here for is being a number the
    // assertion can hold `placeNow` to.
    offsetLeft: 0, offsetTop: 0,
    // Every real node has one, and the view walks UP through it: the clock balloon is
    // placed against the box it is drawn in and the window that box is looked through,
    // and it reads both off `parentNode`.
    get parentNode() { return this.parent || null; },
    // And the other half of that walk: a test that asks whether a repaint rebuilt the
    // screen asks it through this.
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { if (c != null) { this.children.push(c); if (c.nodeType === 1) c.parent = this; } return c; },
    append(...cs) { for (const c of cs) if (c != null) { this.children.push(c); if (c.nodeType === 1) c.parent = this; } },
    // Faithful on purpose, and this is the one place it matters most: the real
    // `replaceChildren` does NOT skip a null the way `el()` skips a null child — it
    // converts every argument with String(), so `replaceChildren(ask, readout)` with
    // `ask` left null puts the literal word "null" on the screen. A shim that quietly
    // dropped it would hide exactly that from every test in this file.
    replaceChildren(...cs) {
      replaceCount += 1;
      this.children = [];
      for (const c of cs) {
        if (c && c.nodeType) { this.children.push(c); if (c.nodeType === 1) c.parent = this; }
        else this.children.push(globalThis.document.createTextNode(String(c)));
      }
    },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener(t, f) { this._listeners[t] = (this._listeners[t] || []).filter((x) => x !== f); },
    // A listener in a browser is handed an EVENT, not a bag of fields, and the calls
    // the chart makes on one — preventDefault, for the right-press pan and for the
    // browser's own menu — are on the event because the browser put them there.
    dispatchEvent(ev) {
      if (!ev.preventDefault) ev.preventDefault = () => { ev.defaultPrevented = true; };
      if (!ev.stopPropagation) ev.stopPropagation = () => {};
      (this._listeners[ev.type] || []).forEach((f) => f(ev));
      return true;
    },
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === "hidden") this.hidden = true;
      // The style string the view hands `el`, taken apart so the two views of one
      // style — the attribute and the property — cannot disagree.
      if (k === "style") {
        for (const part of String(v).split(";")) {
          const i = part.indexOf(":");
          if (i > 0) css[part.slice(0, i).trim()] = part.slice(i + 1).trim();
        }
      }
      // A real DOM reflects its boolean attributes onto the properties a view reads
      // back. A shim that kept only the attribute made a switched-off press read as
      // live — a stub more forgiving than the browser it stands in for.
      if (k === "disabled" || k === "selected" || k === "checked") this[k] = true;
      // A real DOM exposes a data-* attribute on `dataset`, and the timeline's tap
      // reads which batch it hit off `hit.dataset.k`.
      const m = /^data-(.+)$/.exec(k);
      if (m) this.dataset[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
    },
    getAttribute(k) { return this.attrs[k]; },
    // A real getBoundingClientRect returns a DOMRect, which carries right and bottom
    // as well, and a box without them is a stub more forgiving than the browser it
    // stands in for. A rect is measured from the window, so scrolling a box the node
    // is INSIDE moves the node's box and the node itself does not.
    getBoundingClientRect() {
      const r = this._rect || { left: 0, top: 0, width: 600, height: 400 };
      let left = r.left;
      let top = r.top;
      for (let n = this.parent || null; n; n = n.parent || null) {
        left -= Number(n.scrollLeft) || 0;
        top -= Number(n.scrollTop) || 0;
      }
      return { left, top, width: r.width, height: r.height, right: left + r.width, bottom: top + r.height };
    },
    focus() {}, click() {},
    remove() {
      if (!this.parent) return;
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
      this.parent = null;
    },
    querySelector() { return null; },
    // A real node can be asked for the nearest ancestor of a kind, and the view asks
    // exactly that to tell a press on a bar from a press on the row it sits in. A shim
    // with no `closest` answers `undefined` to a question the browser answers.
    closest(sel) {
      const tests = String(sel || "").split(",").map((s) => s.trim()).filter(Boolean);
      for (let n = this; n; n = n.parent || null) {
        if (n.nodeType !== 1) continue;
        for (const t of tests) {
          if (t.startsWith(".")) {
            if (String(n.className || "").split(/\s+/).filter(Boolean).includes(t.slice(1))) return n;
          } else if (n.tagName === t.toUpperCase()) return n;
        }
      }
      return null;
    },
  };
  // A real element's `style` and its style ATTRIBUTE are one thing seen twice: writing
  // `node.style.left` changes what `getAttribute("style")` answers, and setting the
  // attribute changes what `node.style.left` reads. The stub that keeps a plain object
  // beside the attribute makes one of the two invisible, and this screen is placed
  // entirely through `style.left` — the now-line, both of them, and its own label. A
  // shim with the two adrift would have said the line was never placed at all.
  const css = {};
  function syncStyle() {
    node.attrs.style = Object.keys(css).map((k) => `${k}:${css[k]}`).join("; ");
  }
  node.style = new Proxy(css, {
    get(t, k) { return t[k]; },
    set(t, k, v) { t[k] = String(v); syncStyle(); return true; },
    has(t, k) { return k in t; },
  });
  // A real DOM's textContent REPLACES the children when it is written, and a shim
  // where it merely adds a string beside them lets a node read as saying two things at
  // once: the fold caret came back as "▾ ▸" — the new mark and the old one together —
  // so a card that had opened looked like one that had not. Read off the children, as
  // a browser does, and never kept as a second copy of them.
  let own = "";
  Object.defineProperty(node, "textContent", {
    get() {
      let s = own;
      for (const c of node.children) s += c.nodeType === 3 ? c.text : (c.textContent || "");
      return s;
    },
    set(v) { own = v == null ? "" : String(v); node.children = []; },
    configurable: true,
  });
  // The class attribute, which classList writes through to.
  const list = () => String(node.className || "").split(/\s+/).filter(Boolean);
  const put = (names) => { node.className = names.join(" "); };
  node.classList = {
    add(...names) { put([...new Set([...list(), ...names.filter(Boolean)])]); },
    remove(...names) { put(list().filter((c) => !names.includes(c))); },
    contains(c) { return list().includes(c); },
    toggle(c, force) {
      const on = force === undefined ? !list().includes(c) : Boolean(force);
      if (on) node.classList.add(c); else node.classList.remove(c);
      return on;
    },
  };
  return node;
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
globalThis.window = { innerWidth: 1000, innerHeight: 800 };
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
globalThis.cancelAnimationFrame = () => {};
const flushFrames = () => {
  for (let i = 0; i < 20 && frames.length; i += 1) {
    for (const fn of frames.splice(0, frames.length)) fn();
  }
};
// The board's beat, and the planner's, are a real interval in a browser — they go on
// firing until they are stopped — so they are a live set here and not a queue that
// empties itself. A queue would have let the second minute of a test be driven by a
// callback the first minute had already eaten, and the rule that matters most about
// this clock is what the SECOND beat does.
const beats = new Set();
globalThis.setInterval = (fn) => { beats.add(fn); return fn; };
globalThis.clearInterval = (h) => { beats.delete(h); };
const flushTicks = () => { for (const fn of [...beats]) fn(); };

// The wall clock, frozen WHOLE — the class and not only the static. `boardNow` reads
// the clock through `new Date()`, so patching `Date.now` alone would have left the
// now-line's minute decided by the machine the suite runs on.
const REAL_DATE = Date;
let NOW = REAL_DATE.parse("2026-09-22T09:00:00");
class FrozenDate extends REAL_DATE {
  constructor(...args) { if (!args.length) super(NOW); else super(...args); }
  static now() { return NOW; }
}
globalThis.Date = FrozenDate;
const setNow = (iso) => { NOW = typeof iso === "number" ? iso : REAL_DATE.parse(iso); };

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { renderScenario, renderBoard } = await import("../admin/js/views/scenario.js");
const { renderProduction } = await import("../admin/js/views/production.js");
const { ONE_BAKER_SCENARIO, computeScenario, scenarioPlanPatch } = await import("../admin/js/scenario.js");
const { computeLine, planOf } = await import("../admin/js/production.js");
const { defaultState } = await import("../admin/js/state.js");

// Every element under `root`, depth-first, in document order.
function walk(root, out = []) {
  for (const c of root.children || []) {
    if (c.nodeType !== 1) continue;
    out.push(c);
    walk(c, out);
  }
  return out;
}
// The shim's `textContent` is the real DOM's: every character under the node, in
// order, whether it arrived from `el`'s children or from a later write.
function textOf(n) {
  return String(n.textContent || "").replace(/\s+/g, " ").trim();
}
const hasClass = (n, cls) => new RegExp(`(^|\\s)${cls}(\\s|$)`).test(n.className || "");
// A px value out of the inline style string the view writes.
function px(node, key) {
  const m = new RegExp(`${key}:(-?\\d+(?:\\.\\d+)?)px`).exec(node.attrs.style || "");
  return m ? Number(m[1]) : null;
}
const labelOf = (n) => {
  const m = /(^|\s)btn(\s|$)/.test(n.className || "") ? n : null;
  return m ? textOf(n).trim() : null;
};

// The word a `replaceChildren` writes when it is handed a null, read off the NODES
// rather than the flattened text: the word arrives with its neighbour's text welded
// straight onto it ("nullNext up"), so a word-boundary test cannot see it. Used by
// both the first paint and the strip's rebuild, because both hand a child list
// straight to `replaceChildren` with no `el()` in between to skip a null.
const BLANK_WORD = /^(null|undefined|false|NaN|\[object Object\])$/;
function strayWord(n) {
  for (const c of n.children || []) {
    if (c.nodeType === 3 && BLANK_WORD.test(String(c.text).trim())) return String(c.text).trim();
    const deeper = strayWord(c);
    if (deeper) return deeper;
  }
  return null;
}

// What a SCREEN shows, as against what the document holds. `textOf` reads `textContent`,
// and `textContent` — the shim's and the real browser's alike — walks straight through a
// `hidden` subtree, so every claim in this file about a shut card saying nothing was
// being made against text the browser never paints. This reader stops at a hidden node
// the way the screen does. It is the same lesson this file already carries about a
// stand-in that is more forgiving than the real thing: a fold test that cannot tell
// folded from unfolded is not a fold test.
function shownText(n) {
  if (n.hidden) return "";
  let out = "";
  for (const c of n.children || []) {
    out += c.nodeType === 3 ? String(c.text) : shownText(c);
  }
  return out.replace(/\s+/g, " ").trim();
}

// The scenario the board is drawn against: her own day, exactly as the planner's
// tests use it. `plan` is what the two folded cards read and write, and it is seeded
// from the app's OWN default rather than from numbers invented here — the fields show
// what a brand-new phone shows, so a test about a box being empty is about the app
// and not about this file.
function makeState(overrides = {}, plan = {}) {
  const scen = {
    ...ONE_BAKER_SCENARIO,
    modules: ONE_BAKER_SCENARIO.modules.map((m) => ({ ...m, cycles: (m.cycles || []).map((c) => ({ ...c })) })),
    ...overrides,
  };
  return {
    settings: {
      currency: "RM", deliveryDays: [1, 3, 5],
      scenario: scen, scenarios: [],
      production: { ...defaultState().settings.production, ...plan },
    },
    uoms: [], ingredients: [], products: [], orders: [], deliveryDates: [],
  };
}

// A rendered board, attached to the stand-in page — attached, because the real
// placement path asks whether the ruler is on the page before it trusts its offset.
// Every live beat is stopped first, so whatever a render schedules is exactly what is
// running: without that, a test about the clock would be driving another test's timer.
function render(which, state) {
  beats.clear();
  document.body.replaceChildren();
  const root = createEl("div");
  which(root, state);
  document.body.append(root);
  layers["popup-layer"].replaceChildren();
  return { root, state };
}
const board = (state = makeState()) => render(renderBoard, state);
const line = (state = makeState()) => render(renderProduction, state);

// What the Next-up strip says, and nothing else. Read from the strip's own card rather
// than from the whole board, because every module's name is written on the day chart
// below it too — so a test about what the strip names would otherwise be answered by
// the chart.
const stripText = (root) => {
  const card = walk(root).find((n) => hasClass(n, "bd-top"));
  return card ? textOf(card) : "";
};

const bars = (root) => walk(root).filter((n) => hasClass(n, "tl-bar"));
const nowLines = (root) => walk(root).filter((n) => hasClass(n, "tl-now"));
// A tap on a bar, as the chart really receives it: the click lands on the track and
// bubbles up from the bar, which is why the event carries its own target.
function tapBar(bar) {
  const track = bar.closest(".tl-track");
  assert.ok(track, "the bar is inside a track");
  const ev = { type: "click", button: 0, target: bar, stopPropagation() {}, preventDefault() {} };
  for (const f of track._listeners.click || []) f(ev);
}
// The input of the field labelled `label`, and a keystroke in it.
function fieldInput(root, label) {
  const f = walk(root).find((n) => hasClass(n, "field") && textOf(n).includes(label));
  assert.ok(f, `no field labelled ${label}`);
  const input = f.children.find((c) => c.nodeType === 1 && c.tagName === "INPUT");
  assert.ok(input, `the field ${label} has no input`);
  return input;
}
function type(input, value) {
  input.value = String(value);
  for (const f of input._listeners.input || []) f();
}

// ── 1. A board does not write ──────────────────────────────────────────────

test("opening the board writes nothing into her settings", () => {
  const state = makeState();
  state.settings.scenario.startDelta = undefined;
  const before = JSON.stringify(state.settings);
  const { root } = board(state);
  assert.ok(bars(root).length > 0, "the board drew a day");
  assert.equal(JSON.stringify(state.settings), before, "a render wrote to her settings");
});

test("and it does so with no day of her own — no scenario is seeded", () => {
  // The trap this closes: `ensureScenario` would seed a whole default scenario into
  // `settings.scenario` merely by the screen being opened, and the sync engine would
  // carry it to her other phone as though she had built it.
  const state = makeState();
  delete state.settings.scenario;
  board(state);
  assert.equal("scenario" in state.settings, false, "a board seeded a scenario into her settings");
});

test("and no tap the board offers writes either — every bar and every row", () => {
  const state = makeState();
  const { root } = board(state);
  const before = JSON.stringify(state.settings);
  const targets = walk(root).filter((n) => hasClass(n, "tl-bar") || hasClass(n, "tl-btag") || hasClass(n, "tl-row"));
  assert.ok(targets.length > 8, "there is a screen to tap");
  for (const n of targets) {
    const track = n.closest(".tl-track");
    const row = n.closest(".tl-row");
    const ev = { type: "click", button: 0, target: n, stopPropagation() {}, preventDefault() {} };
    // The chart's taps are wired to the TRACK and to the ROW, not to the bar itself,
    // so a faithful tap walks the same path a bubbling click would.
    for (const f of (track && track._listeners.click) || []) f(ev);
    for (const f of (row && row._listeners.click) || []) f(ev);
  }
  assert.equal(JSON.stringify(state.settings), before, "a tap on the board wrote to her settings");
});

test("her own scenario comes back byte-identical after a full pass of taps", () => {
  const state = makeState();
  const before = JSON.stringify(state.settings.scenario);
  const { root } = board(state);
  for (const n of bars(root)) tapBar(n);
  assert.equal(JSON.stringify(state.settings.scenario), before, "the board rewrote her day");
});

// ── 2. A board is the planner's chart, with the differences pinned ─────────

test("the board draws the day chart and the next-up strip", () => {
  const { root } = board();
  const all = walk(root);
  assert.ok(all.some((n) => hasClass(n, "tl-row")), "no chart");
  assert.ok(all.some((n) => hasClass(n, "tl-pane-proc")), "no modules window");
  assert.ok(all.some((n) => hasClass(n, "bd-top")), "no next-up strip");
  assert.match(textOf(root), /Next up/);
});

test("and not one word of nothing is written onto it", () => {
  // Found live on the real screen rather than reasoned about: the board withholds the
  // planner's ask strip, and it was withheld by handing `replaceChildren` a null. A real
  // `replaceChildren` does not skip a null — it converts every argument with String() —
  // so the first thing above the day read "null". Nothing in this file could see it,
  // because the stand-in screen quietly dropped nulls, which is the very fault the shim's
  // own notes warn about: a stub more forgiving than the browser it stands in.
  //
  // Read off the NODES and not the flattened text: the word arrives with the strip's own
  // text welded straight onto it ("nullNext up"), so a word-boundary test cannot see it —
  // it would have been the very check that missed the fault on the real screen too.
  for (const [what, which] of [["board", board], ["line", line]]) {
    const wrote = strayWord(which().root);
    assert.equal(wrote, null, `the ${what} writes the word "${wrote}" onto the screen`);
  }
});

test("and it draws none of the cards that change the day", () => {
  const { root } = board();
  const text = textOf(root);
  assert.doesNotMatch(text, /Your scenarios/, "the shelf of saved days is on a board");
  assert.doesNotMatch(text, /What it makes/, "the answer card is on a board");
  assert.doesNotMatch(text, /The climb|The way down/, "the ladder is on a board");
  assert.doesNotMatch(text, /Start the day now/, "a board is not walking anything");
  assert.doesNotMatch(text, /Not in this scenario/, "the unmapped card is on a board");
});

test("it has exactly one button, and it is the offer to make sound", () => {
  const { root } = board();
  const buttons = walk(root).filter((n) => n.tagName === "BUTTON" && hasClass(n, "btn"));
  const said = buttons.map((b) => textOf(b).trim());
  assert.deepEqual(said, ["Start calling"], `a board's buttons are ${JSON.stringify(said)}`);
});

test("a bar's tip describes the batch on a board and invites a move in the planner", () => {
  const b = board();
  const tags = walk(b.root).filter((n) => hasClass(n, "tl-btag"));
  assert.ok(tags.length, "no batch numbers on the chart");
  for (const t of tags) {
    assert.ok(t.attrs.title, "a batch number with no tip");
    assert.doesNotMatch(t.attrs.title, /tap to move it/,
      `a board's tip advertises a move it will refuse: ${t.attrs.title}`);
  }
  // The twin, so the guard cannot be satisfied by the string having been deleted
  // everywhere: the planner's own chart still says it.
  const p = render(renderScenario, makeState());
  const pTags = walk(p.root).filter((n) => hasClass(n, "tl-btag"));
  assert.ok(pTags.some((t) => /tap to move it/.test(t.attrs.title || "")),
    "the planner's tip no longer invites the move, so the board's silence proves nothing");
});

test("a tap on a bar opens a card naming the batch, and moves nothing", () => {
  const state = makeState();
  const { root } = board(state);
  const before = JSON.stringify(state.settings.scenario);
  const bar = bars(root)[0];
  tapBar(bar);
  const body = walk(layers["popup-layer"]).find((n) => hasClass(n, "bd-card"));
  assert.ok(body, "the tap opened no read-only card");
  const title = textOf(walk(layers["popup-layer"]).find((n) => hasClass(n, "popup-title")) || createEl("div"));
  assert.match(title, /batch 1 of/, `the card does not name the batch: ${title}`);
  assert.match(textOf(body), /When/, "the card does not say when");
  assert.equal(JSON.stringify(state.settings.scenario), before, "opening a card moved the day");
});

test("a row's card is a read-only card and not the module editor", () => {
  const { root } = board();
  const row = walk(root).find((n) => hasClass(n, "tl-row") && n._listeners.click);
  assert.ok(row, "no module row on the board");
  for (const f of row._listeners.click) f({ type: "click", button: 0, target: row, stopPropagation() {}, preventDefault() {} });
  const inner = walk(layers["popup-layer"]);
  assert.ok(inner.some((n) => hasClass(n, "bd-card")), "the row opened no read-only card");
  // No input of any kind: a read-only card can never acquire a control.
  assert.equal(walk(layers["popup-layer"]).filter((n) => n.tagName === "INPUT" || n.tagName === "SELECT").length, 0,
    "a board's card carries a control");
});

// ── 3. The clock ───────────────────────────────────────────────────────────

// The day the fixture plans: a 4 am start, and 570 minutes of it (endMin).
const DAY_START = ONE_BAKER_SCENARIO.dayStartMin;         // 240
const PX_PER_MIN = computeScenario(ONE_BAKER_SCENARIO).pxPerMin;
const END_MIN = computeScenario(ONE_BAKER_SCENARIO).endMin;
const RULER_LEFT = 156;
// Every track at one origin, because the view takes its origin from the clock row's
// own track and a test cannot reach into that closure to name it.
const setRulerLeft = (root, left) => {
  for (const t of walk(root).filter((n) => hasClass(n, "tl-track"))) t.offsetLeft = left;
};
const placeTheLine = (root) => { setRulerLeft(root, RULER_LEFT); flushTicks(); return nowLines(root); };

test("the now-line stands where the real clock falls in her day", () => {
  setNow("2026-09-22T09:00:00");                 // 540 real, an hour inside a 4 am day
  const { root } = board();
  const lines = placeTheLine(root);
  assert.ok(lines.length >= 2, "the line is not drawn in both windows");
  const want = Math.round(RULER_LEFT + (540 - DAY_START) * PX_PER_MIN);
  for (const l of lines) {
    assert.equal(px(l, "left"), want, "the line is not where the clock is");
    assert.equal(textOf(l.children[0]), "9:00 am", "the line names the wrong minute");
    // Drawn is not the same as shown. The line is hidden unless a walk-through is
    // running, and a board never runs one — so without its own reason to be shown the
    // whole clock would be drawn inside a hidden element and a worker would see none.
    assert.equal(l.hidden, false, "the line is drawn but hidden, so the board shows no clock");
  }
});

test("and the planner's own line is still hidden until she starts the day", () => {
  // The twin of the rule above, and the reason the board needed a flag of its own
  // rather than the line simply never being hidden: the planner draws the same
  // element on a screen that has not started walking anything, and it must stay out
  // of sight there until she presses Start.
  setNow("2026-09-22T09:00:00");
  const { root } = render(renderScenario, makeState());
  setRulerLeft(root, RULER_LEFT);
  flushTicks();
  const lines = nowLines(root);
  assert.ok(lines.length >= 2, "the planner draws no now-line at all");
  for (const l of lines) {
    assert.equal(l.hidden, true, "the planner is showing a clock for a day it is not walking");
  }
});

test("and it is parked at the left edge, saying so, before her day has begun", () => {
  // An 11 pm day, so at 9 am the real clock is nearly a whole day EARLY rather than
  // late — the case a wrap would have quietly turned into the middle of the day.
  setNow("2026-09-22T09:00:00");
  const { root } = board(makeState({ dayStartMin: 1380 }));
  const lines = placeTheLine(root);
  for (const l of lines) {
    assert.equal(px(l, "left"), RULER_LEFT, "the line is not parked at the day's left edge");
    assert.equal(textOf(l.children[0]), "day starts 11:00 pm", "the line does not say why it is parked");
  }
  // And the strip says the same thing in a sentence, from the same minute.
  assert.match(textOf(root), /day starts 11:00 pm|your day starts 11:00 pm/,
    "nothing on the board explains why the line is at the edge");
});

test("and at the right edge, saying so, after her day has ended", () => {
  setNow("2026-09-22T16:00:00");                 // 960 real, well past a day that ends at 1:30 pm
  const { root } = board();
  const lines = placeTheLine(root);
  const want = Math.round(RULER_LEFT + END_MIN * PX_PER_MIN);
  for (const l of lines) {
    assert.equal(px(l, "left"), want, "the line is not parked at the day's right edge");
    assert.equal(textOf(l.children[0]), "day ended 1:30 pm", "the line does not say why it is parked");
  }
});

test("a day the clock has passed is not a day with nobody on it", () => {
  // The strip's list is built from what is still AHEAD, so past the day's end it comes
  // out empty for the opposite of the reason its fallback sentence gives: the day is
  // full of hands, they have simply all been and gone. Read together with the foot,
  // which counts the day's rows, the old wording said both at once.
  setNow("2026-09-22T16:00:00");                 // 960 real, past a day that ends at 1:30 pm
  const { root } = board();
  placeTheLine(root);
  const text = textOf(root);
  assert.match(text, /The day is finished/, "nothing on the board says the day has been and gone");
  assert.doesNotMatch(text, /Nothing on this day needs hands/,
    "the board says a day it has already run has no hands on it");
});

test("and a board with no hands on it at all still says exactly that", () => {
  // The twin, and the reason the sentence above was not simply replaced: a day whose
  // hand-work has been taken off it is a real state, and it reads correctly. Built by
  // emptying every cycle's load and unload rather than by switching modules off, because
  // a module switched off is still drawn and still holds its minutes — only the cycles'
  // own touches are what the day's calls are made of.
  setNow("2026-09-22T09:00:00");
  const bare = {
    ...ONE_BAKER_SCENARIO,
    modules: ONE_BAKER_SCENARIO.modules.map((m) => ({
      ...m, cycles: (m.cycles || []).map((c) => ({ ...c, load: 0, unload: 0 })),
    })),
  };
  const { root } = board(makeState({ modules: bare.modules }));
  placeTheLine(root);
  const text = stripText(root);
  assert.doesNotMatch(text, /The day is finished/, "a day still running is called finished");
  assert.match(text, /Nothing on this day needs hands/, "a day with no hands left on it no longer says so");
});

test("and the offer to make a sound goes with the day, because it would ring for nobody", () => {
  // Not a matter of taste: `boardCallsStart` seeds `lastMin` from the minute the board
  // is standing on, and the board is standing on the day's last minute — so the button
  // would make its audio context and then call no one, all evening. The sentence the
  // strip carries is the whole of the explanation, so the foot row goes with the button
  // rather than being emptied and left standing.
  setNow("2026-09-22T16:00:00");
  const { root } = board();
  placeTheLine(root);
  assert.equal(walk(root).filter((n) => n.tagName === "BUTTON" && /Start calling/.test(textOf(n))).length, 0,
    "the board still offers to start calling a day that is over");
  assert.equal(walk(root).filter((n) => hasClass(n, "bd-foot")).length, 0,
    "an emptied foot row is left standing under the strip");
  assert.match(textOf(root), /The day is finished/, "nothing tells a worker why the offer has gone");
});

test("but calls she turned on earlier can always still be turned off", () => {
  // The one thing the withdrawal above must not take with it. Calls are switched on
  // inside the day, and the clock then passes the end — which is exactly an evening on
  // the board, and a phone that cannot be silenced is worse than one that cannot ring.
  setNow("2026-09-22T09:10:00");
  globalThis.window.AudioContext = class { constructor() {} close() {} };
  const { root } = board();
  placeTheLine(root);
  const start = walk(root).find((n) => n.tagName === "BUTTON" && /Start calling/.test(textOf(n)));
  for (const f of start._listeners.click || []) f({ type: "click", target: start });

  setNow("2026-09-22T16:00:00");
  flushTicks();
  const stop = walk(root).find((n) => n.tagName === "BUTTON" && /Stop calling/.test(textOf(n)));
  assert.ok(stop, "a board whose calls are on past the day's end cannot be silenced");
  assert.match(textOf(root), /Calling is on, but this day is finished/,
    "the board does not say calls are on over a day that is over");
  for (const f of stop._listeners.click || []) f({ type: "click", target: stop });
  assert.equal(walk(root).filter((n) => n.tagName === "BUTTON" && /calling/i.test(textOf(n))).length, 0,
    "pressing Stop calling left the offer up");
});

test("the strip says what is next AGAIN once the clock has passed a job", () => {
  // The whole promise of the screen, and the reason the strip is the one box on a board
  // that is not the plan: a strip drawn once when the board was opened would go on
  // naming a job that finished hours ago, and a worker reading it would be sent to the
  // bench for something already done. At 9:00 the day's next three are the packing
  // (8:57), a rest (9:12) and the oiling (9:18); ten minutes later the packing has been
  // and gone.
  setNow("2026-09-22T09:00:00");
  const { root } = board();
  placeTheLine(root);
  assert.match(stripText(root), /Cutting and packing/, "the strip does not name the job that is next");
  assert.doesNotMatch(stripText(root), /The oven swap and the bake/, "a job two ahead is named as next");

  setNow("2026-09-22T09:10:00");                 // past the packing's own end at 9:09
  flushTicks();
  const text = stripText(root);
  assert.doesNotMatch(text, /Cutting and packing/, "the strip still names a job the clock has passed");
  assert.match(text, /The oven swap and the bake/, "the strip does not name what came next");

  // And it is said again only then. The beat runs every second, so a strip that rebuilt
  // on every beat would put a fresh card under a worker's eyes sixty times a minute.
  const before = replaceCount;
  setNow("2026-09-22T09:10:30");
  flushTicks();
  assert.equal(replaceCount, before, "the strip was rebuilt with nothing different to say");

  // The rebuild hands its children straight to `replaceChildren`, so it is the same
  // road to the word "null" the first paint took — walked here rather than assumed.
  assert.equal(strayWord(root), null, "the rebuild wrote a word of nothing onto the board");
});

test("and the parked sentence keeps the wall clock honest, because it names the hour", () => {
  // The one thing on a board that is a reading of the real clock rather than of the
  // plan, and the reason the live minute rides on the strip's key while the line is
  // parked. Left out, the sentence would still be saying "It is 4:00 pm now" at
  // midnight — the only kind of clock on this screen that could be wrong.
  setNow("2026-09-22T16:00:00");
  const { root } = board();
  placeTheLine(root);
  assert.match(stripText(root), /It is 4:00 pm now/, "the parked sentence does not name the hour");

  setNow("2026-09-22T17:00:00");
  flushTicks();
  assert.match(stripText(root), /It is 5:00 pm now/, "the parked sentence's clock has stopped");
  // And the parked half of the rebuild is the half that CAN hand a null over: that
  // sentence is the one child the strip sometimes has and sometimes has not.
  assert.equal(strayWord(root), null, "the parked rebuild wrote a word of nothing onto the board");
});

test("a minute of the clock repaints nothing", () => {
  setNow("2026-09-22T09:00:00");
  const { root } = board();
  placeTheLine(root);
  const before = replaceCount;
  setNow("2026-09-22T09:01:00");
  flushTicks();
  assert.equal(replaceCount, before, "the minute's beat redrew the screen under her scroll");
  // The line still moved, which is the half that makes the count mean something.
  const lines = nowLines(root);
  assert.equal(px(lines[0], "left"), Math.round(RULER_LEFT + (541 - DAY_START) * PX_PER_MIN));
});

// ── 4. Calls ───────────────────────────────────────────────────────────────

test("nothing is announced until a real finger has turned calls on", () => {
  setNow("2026-09-22T09:10:00");                 // minute 310 of her day
  const { root } = board();
  placeTheLine(root);
  setNow("2026-09-22T09:11:00");                 // a call is due at 311
  flushTicks();
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-call")).length, 0,
    "a board announced a call with calls switched off");
  assert.match(textOf(root), /would be called/, "the board does not offer the count");
});

test("pressing Start calling makes the sound and cannot fire a backlog", () => {
  setNow("2026-09-22T09:10:00");
  const made = [];
  globalThis.window.AudioContext = class { constructor() { made.push(1); } close() {} };
  const { root } = board();
  placeTheLine(root);
  const start = walk(root).find((n) => n.tagName === "BUTTON" && /Start calling/.test(textOf(n)));
  assert.ok(start, "no Start calling button");
  for (const f of start._listeners.click || []) f({ type: "click", target: start });
  assert.equal(made.length, 1, "pressing Start calling made no audio context, so a phone stays silent");
  assert.match(textOf(root), /Calling 1 person/, "the board does not say calls are on");

  // Whatever was due in the minute she pressed is already answered for: the whole
  // morning's 20-odd calls must not arrive at once.
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-call")).length, 0, "pressing started a backlog");

  // One minute on, exactly one call — the one due at minute 311 and no other.
  const after = nowLines(root);
  setNow("2026-09-22T09:11:00");
  flushTicks();
  const cards = walk(root).filter((n) => hasClass(n, "tl-call"));
  assert.equal(cards.length, 1, `${cards.length} calls were announced for one minute`);
  // A call sounds a minute BEFORE the job (callWindows' `at = from - 1`), and the card
  // names the clock the JOB starts at: the call due at minute 311 names 9:12 am.
  assert.match(textOf(cards[0]), /9:12 am/, "the call does not name the time she has to be there");
  assert.ok(after.length >= 2, "the line is still drawn in both windows");
});

test("and the minute she switches calls on has already been answered for", () => {
  // The seeding's real job, and the one the test above cannot see: a call is due at
  // minute 311, so a finger that switches calls on AT 9:11 is standing on a call the
  // morning has already made. Without the seed the very next beat announces it, a bell
  // for a job that started the minute she pressed.
  setNow("2026-09-22T09:11:00");                 // exactly minute 311, where a call is due
  globalThis.window.AudioContext = class { constructor() {} close() {} };
  const { root } = board();
  placeTheLine(root);
  const start = walk(root).find((n) => n.tagName === "BUTTON" && /Start calling/.test(textOf(n)));
  for (const f of start._listeners.click || []) f({ type: "click", target: start });
  flushTicks();                                  // the beat inside the minute she pressed
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-call")).length, 0,
    "pressing on a call's own minute rang for a job that had already started");
});

// ── 5. The two folded cards ────────────────────────────────────────────────

test("both cards start folded, and folding is done in place", () => {
  const { root } = line();
  const cards = walk(root).filter((n) => hasClass(n, "fold-body"));
  assert.equal(cards.length, 2, `the screen has ${cards.length} folded cards`);
  for (const c of cards) assert.equal(c.hidden, true, "a folded card started open");
  const heads = walk(root).filter((n) => hasClass(n, "fold-head"));
  assert.equal(heads.length, 2);
  const caret = heads[0].children.find((c) => hasClass(c, "fold-caret"));
  assert.equal(textOf(caret).trim(), "▸", "a shut card does not wear the shut caret");
  const bodyBefore = cards[0];
  const before = replaceCount;
  for (const f of heads[0]._listeners.click || []) f({ type: "click" });
  assert.equal(cards[0], bodyBefore, "opening a card rebuilt it, so the board above lost its scroll");
  assert.equal(cards[0].hidden, false, "the card did not open");
  assert.equal(textOf(caret).trim(), "▾", "the caret did not change");
  assert.equal(replaceCount, before, "opening a card repainted something");
  // The shut/open flag is the module's, so it outlives this test exactly as it outlives
  // a visit. A test puts the screen back as it found it.
  for (const f of heads[0]._listeners.click || []) f({ type: "click" });
  assert.equal(cards[0].hidden, true, "the card did not shut again");
});

test("a card being open is the screen's business and is never written into her settings", () => {
  // The flag lives in the module, which is what makes a fresh page load — and so a
  // worker's next visit — come back shut. The trap the flag guards against is the other
  // way round: a card's open state leaking into her stored settings, which would be a
  // write to her data caused by reading a screen.
  const state = makeState();
  const { root } = line(state);
  const before = JSON.stringify(state.settings);
  const head = walk(root).find((n) => hasClass(n, "fold-head"));
  const body = () => walk(root).filter((n) => hasClass(n, "fold-body"))[0];
  assert.equal(body().hidden, true, "the card did not start shut");
  for (const f of head._listeners.click || []) f({ type: "click" });
  assert.equal(body().hidden, false, "the card did not open");
  assert.equal(JSON.stringify(state.settings), before, "opening a card wrote into her settings");
  // Only the module holds it — which is exactly what a fresh visit reads.
  const src = read("admin/js/views/production.js");
  assert.match(src, /const LINE_FOLD = \{ open: false \}/, "the line card's shut state is not the screen's own");
  assert.match(src, /const TIME_FOLD = \{ open: false \}/, "the timetable card's shut state is not the screen's own");
  // Put it back, because the flag outlives this test the way it outlives a visit.
  for (const f of head._listeners.click || []) f({ type: "click" });
  assert.equal(body().hidden, true, "the card did not shut again");
});

test("the line card answers with a number while it is shut, and the number is computed", () => {
  const state = makeState();
  const { root } = line(state);
  const card = walk(root).find((n) => hasClass(n, "card") && textOf(n).includes("The line behind this day"));
  assert.ok(card, "no line card");
  // The answer sits between the head and the body, so it is readable shut.
  const head = card.children.find((c) => hasClass(c, "fold-head"));
  const body = card.children.find((c) => hasClass(c, "fold-body"));
  const answer = card.children[card.children.indexOf(head) + 1];
  assert.notEqual(answer, body, "the answer is inside the fold, so a shut card says nothing");
  assert.match(textOf(answer), /\d+ pans? today/, "the shut card does not give a capacity");
  assert.match(textOf(answer), /holds it back/, "the shut card does not name the wall");
  // And it is computed from the day, not stored: her settings came back untouched.
  assert.equal(state.settings.production.capacity, undefined);
});

test("the capacity sentence names the station as the station names itself", () => {
  // Both directions, because one of them alone would pass on a sentence that named the
  // wrong station and got the verb right by luck. With no day of her own the plan is
  // hers alone, so what the arithmetic decided is knowable from here — and the expected
  // wording is built from the arithmetic's own station object, not typed out.
  const cases = [
    { plan: { prooferPans: 1 }, wall: "proofer" },                  // 0.74 pans an hour
    { plan: { prooferPans: 400, ovenPans: 400 }, wall: "hands" },   // nothing holds her but her own hands
  ];
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  for (const c of cases) {
    const state = makeState({}, c.plan);
    delete state.settings.scenario;
    const r = computeLine(planOf(state.settings.production));
    assert.equal(r.bottleneck.key, c.wall, "the fixture no longer puts the wall where this test expects");
    const card = walk(line(state).root)
      .find((n) => hasClass(n, "card") && textOf(n).includes("The line behind this day"));
    const want = `${lower(r.bottleneck.name)} ${r.bottleneck.plural ? "are" : "is"} the wall that holds it back`;
    assert.ok(textOf(card).includes(want),
      `the sentence does not read "${want}": ${textOf(card).slice(0, 160)}`);
  }
});

test("with no day of her own the line is computed from her plan and not from a day it invented", () => {
  // The gate, measured at the screen. An empty scenario is not an empty day — the model
  // falls back to a full ten-module default one — so a screen that derived whenever a
  // scenario object merely EXISTED would read a day she never built. Deleted and empty
  // are the two shapes of "no day of her own", and both must come out at her own number.
  const mine = computeLine(planOf(makeState().settings.production)).dayCapacity;
  const invented = computeLine({
    ...makeState().settings.production,
    ...scenarioPlanPatch({}, makeState().settings.production).patch,
  }).dayCapacity;
  assert.notEqual(mine, invented, "the two days no longer tell apart, so this test sees nothing");
  for (const shape of ["deleted", "empty"]) {
    const state = makeState();
    if (shape === "deleted") delete state.settings.scenario;
    else state.settings.scenario = {};
    const text = textOf(line(state).root);
    assert.ok(text.includes(`${mine} pans today`),
      `a board with a ${shape} scenario read a day it invented: ${text.match(/\d+ pans today/) || "no capacity at all"}`);
    assert.ok(!text.includes(`${invented} pans today`),
      `a board with a ${shape} scenario read the invented default day`);
    if (shape === "deleted") {
      assert.equal("scenario" in state.settings, false, "the screen seeded a day into her settings");
    } else {
      assert.deepEqual(state.settings.scenario, {}, "the screen filled in the day she had left empty");
    }
  }
});

test("and with a day of her own the line IS read off it, so the gate is not simply off", () => {
  // The twin of the rule above: a screen that never derived would pass the gate test by
  // never deriving anything, and she would be back to typing numbers her planner already
  // knows. Her own day moves the line, and the number comes from the derivation.
  const state = makeState();
  const hers = computeLine(planOf(state.settings.production)).dayCapacity;
  const derived = computeLine({
    ...state.settings.production,
    ...scenarioPlanPatch(state.settings.scenario, state.settings.production).patch,
  }).dayCapacity;
  assert.notEqual(hers, derived, "her own day no longer changes the line, so this proves nothing");
  const text = textOf(line(state).root);
  assert.ok(text.includes(`${derived} pans today`),
    `the board did not read her own day: it says ${text.match(/\d+ pans today/) || "nothing"}`);
});

test("typing one of the four numbers changes exactly that number", () => {
  const state = makeState();
  const { root } = line(state);
  const before = JSON.stringify(state.settings.production);
  type(fieldInput(root, "Baking pans you own"), 20);
  const after = JSON.parse(JSON.stringify(state.settings.production));
  const changed = Object.keys(after).filter((k) => after[k] !== JSON.parse(before)[k]);
  assert.deepEqual(changed, ["pans"], `typing one box changed ${JSON.stringify(changed)}`);
  assert.equal(after.pans, 20);
});

test("a cleared box is mid-typing and holds the last good number", () => {
  const state = makeState();
  const { root } = line(state);
  type(fieldInput(root, "Baking pans you own"), "");
  assert.equal(state.settings.production.pans, 12, "a cleared box wrote a number nobody asked for");
});

test("the eight numbers the timetable works from are all reachable, and folded", () => {
  const { root } = line();
  const body = walk(root).filter((n) => hasClass(n, "fold-body"))[1];
  const labels = walk(body).filter((n) => n.tagName === "LABEL").map((l) => textOf(l).trim());
  assert.equal(labels.length, 8, `the timetable card carries ${labels.length} fields`);
  for (const l of labels) assert.ok(l.length > 6, `a field is labelled "${l}", which names no unit`);
});

test("the timetable still works the day back from the oven", () => {
  const { root } = line();
  const card = walk(root).find((n) => hasClass(n, "card") && textOf(n).includes("The last moment each stage may start"));
  assert.ok(card, "no timetable card");
  const head = card.children.find((c) => hasClass(c, "fold-head"));
  const body = card.children.find((c) => hasClass(c, "fold-body"));
  // Shut, this card is its own head and nothing else. The timetable is a page of advice,
  // not a glance, so a caret promising "there is more" must not be sitting over the whole
  // of what there is — which is what it was doing while the answer sat outside the fold.
  assert.equal(body.hidden, true, "the timetable card did not start shut");
  assert.match(shownText(card), /last moment each stage may start/, "the shut card lost its own title");
  assert.doesNotMatch(shownText(card), /\d{1,2}:\d\d (am|pm)/,
    "a shut timetable card is already showing its clock times, so its caret lies");
  for (const f of head._listeners.click || []) f({ type: "click" });
  const text = shownText(card);
  assert.match(text, /last moment that stage may start/, "the timetable lost its own explanation");
  assert.match(text, /\d{1,2}:\d\d (am|pm)/, "the timetable names no clock times");
  assert.match(text, /stretch and fold|rest/i, "the timetable lost its stages");
  assert.match(text, /tub/, "the timetable lost the tub it is anchored to");
  for (const f of head._listeners.click || []) f({ type: "click" });
  assert.equal(body.hidden, true, "the card did not shut again");
});

test("a stage start that is a time of day is written back as a clock", () => {
  const state = makeState();
  const { root } = line(state);
  const input = fieldInput(root, "Minutes after midnight the first 6 pans must be at the oven");
  assert.match(textOf(input.parentNode), /That is 8:00 am\./, "the time field does not read back as a clock");
  type(input, "510");
  assert.match(textOf(input.parentNode), /That is 8:30 am\./);
});

// ── 6. The field count, and the thing that left ─────────────────────────────

const lineCardOf = (root) => walk(root).find((n) => hasClass(n, "card") && textOf(n).includes("The line behind this day"));
const timeCardOf = (root) => walk(root).find((n) => hasClass(n, "card") && textOf(n).includes("The last moment each stage may start"));
const inputsIn = (card) => walk(card).filter((n) => n.tagName === "INPUT");

test("the screen asks for twelve numbers where it used to ask for twenty-one", () => {
  const { root } = line();
  const all = walk(root).filter((n) => n.tagName === "INPUT");
  assert.equal(all.length, 12, `the screen asks for ${all.length} numbers`);
  // Four are hers, in the line card; eight are what the timetable works from, behind
  // the second fold.
  assert.equal(inputsIn(lineCardOf(root)).length, 4, "the line card is not four numbers");
  assert.equal(inputsIn(timeCardOf(root)).length, 8, "the timetable card is not eight numbers");
});

test("nothing she has to type is on the board with both cards shut", () => {
  // A worker opens this screen and reads; she opens a card to type. So with the screen
  // as it comes, not one box is out on it — what the line SAYS is not behind a fold,
  // and what she has to type is. The card answers, and the answer is readable shut.
  const { root } = line();
  const shown = walk(root).filter((n) => n.tagName === "INPUT" && !n.closest(".fold-body"));
  assert.equal(shown.length, 0, `${shown.length} boxes are out on the board`);
  assert.match(textOf(root), /\d+ pans? today/, "the answer is behind the fold too, so a shut screen says nothing");
});

test("the manual load row is gone, not merely hidden", () => {
  assert.doesNotMatch(read("admin/js/views/production.js"), /Load \$\{moves\}/,
    "the manual load row is still in the file");
  assert.doesNotMatch(read("admin/js/views/production.js"), /previewLoad|loadCard/,
    "the load card is still in the file");
});

// ── 7. The board and the planner are one drawing ────────────────────────────

test("the board and the planner draw the same day, bar for bar", () => {
  const b = board();
  const p = render(renderScenario, makeState());
  const shape = (root) => bars(root).map((n) => `${n.attrs.style}|${textOf(n).trim()}`);
  assert.ok(shape(b.root).length > 8, "the board drew too little to compare");
  assert.deepEqual(shape(b.root), shape(p.root), "the two screens disagree about the same day");
});

test("the board shades each worker's own stretch of the day too, and says it in words (v179)", () => {
  // The board is the same day drawn by the same code, so the shade arrives on it for
  // free — and that is exactly what this asserts, because a second drawing is how the
  // two screens would come to disagree. A worker reading their own row wants the clock
  // their own day starts and finishes at.
  const root = createEl("div");
  const state = makeState();
  const teardown = renderProduction(root, state);
  document.body.append(root);
  layers["popup-layer"].replaceChildren();
  const shades = walk(root).filter((n) => hasClass(n, "tl-work"));
  assert.ok(shades.length > 0, "the worker's board draws no working stretch at all");
  const row = walk(root).find((n) => hasClass(n, "tl-row") && hasClass(n, "person")
    && walk(n).some((x) => hasClass(x, "tl-bar")));
  assert.ok(row, "the board drew no person row with work on it");
  const track = walk(row).find((n) => hasClass(n, "tl-track"));
  const shade = walk(track).find((n) => hasClass(n, "tl-work"));
  const rowBars = walk(track).filter((n) => hasClass(n, "tl-bar"));
  const ends = rowBars.map((b) => [px(b, "left"), px(b, "left") + px(b, "width")]);
  assert.equal(px(shade, "left"), Math.min(...ends.map((e) => e[0])),
    "the board's shade does not begin where that worker's first job begins");
  assert.equal(px(shade, "left") + px(shade, "width"), Math.max(...ends.map((e) => e[1])),
    "the board's shade does not run to the end of that worker's last job");

  // And tapping their row opens the worker's own card, which names the same stretch —
  // read off the one builder, so the two can never tell her two stories.
  row.dispatchEvent({ type: "click" });
  const card = textOf(layers["popup-layer"]);
  assert.match(card, /Working \d{1,2}:\d{2} (am|pm) → \d{1,2}:\d{2} (am|pm)/,
    "the worker's card does not say when their own work starts and finishes");
  assert.ok(state.settings.scenario.shifts == null,
    "opening a worker's card wrote hours onto her stored day");
  // And the board's clock is let go of here, so a screen left open by this test cannot
  // go on beating behind the one that follows it.
  teardown();
});

test("the board widens the view and the tab bar, and puts both back on leaving", () => {
  const tabbar = createEl("div");
  tabbar.id = "tabbar";
  const real = globalThis.document.getElementById;
  globalThis.document.getElementById = (id) => (id === "tabbar" ? tabbar : layers[id] || null);
  const root = createEl("div");
  const teardown = renderBoard(root, makeState());
  assert.ok(hasClass(root, "wide"), "a board is drawn in the narrow column");
  assert.ok(hasClass(tabbar, "wide"), "the tab bar still draws the narrow strip");
  teardown();
  assert.equal(hasClass(root, "wide"), false, "the wide class outlives the screen");
  assert.equal(hasClass(tabbar, "wide"), false);
  globalThis.document.getElementById = real;
});

test("leaving the board stops its clock", () => {
  setNow("2026-09-22T09:00:00");
  const root = createEl("div");
  const teardown = renderBoard(root, makeState());
  document.body.append(root);
  assert.equal(beats.size, 1, "the board did not start its beat");
  // First prove the beat is a live one — a set that was never populated would make the
  // assertion after the teardown true for the wrong reason.
  const lit = () => px(nowLines(root)[0], "left");
  const at9 = lit();
  setNow("2026-09-22T09:05:00");
  flushTicks();
  assert.ok(lit() > at9, "the board's beat does not move its clock, so this test proves nothing");
  teardown();
  assert.equal(beats.size, 0, "leaving the screen left its beat running");
  const before = replaceCount;
  const parked = lit();
  setNow("2026-09-22T09:10:00");
  flushTicks();
  assert.equal(replaceCount, before, "the clock went on running behind another screen");
  assert.equal(lit(), parked, "the line moved behind a screen she had left");
});
