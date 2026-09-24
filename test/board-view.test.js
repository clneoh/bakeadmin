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
  // A real CSSStyleDeclaration is not a bag of keys, and a CUSTOM property is the one
  // place where that matters: `style.setProperty("--coach-w", "36px")` sets it, while
  // `style["--coach-w"] = "36px"` sets nothing at all — a browser makes an expando on
  // the style object and leaves the declarations alone, which is exactly what the stub
  // used to accept. It hid a real fault: the board asked for its coach widths through
  // the wrong door, every `--coach-w` fell through to the stylesheet's 34px fallback,
  // and six coaches filled a line the plan says four fill, at 34px against the 36px
  // floor her own rule about a tap target asks for. So both doors are here as a browser
  // has them, and a value asked for through the wrong one reads back empty.
  const loose = {};
  const isCustom = (k) => typeof k === "string" && k.startsWith("--");
  const methods = {
    getPropertyValue(k) { return k in css ? css[k] : ""; },
    setProperty(k, v) { css[k] = String(v); syncStyle(); },
    removeProperty(k) { delete css[k]; syncStyle(); },
  };
  node.style = new Proxy(methods, {
    get(t, k) { return k in t ? t[k] : (k in css ? css[k] : loose[k]); },
    set(t, k, v) {
      if (isCustom(k)) { loose[k] = String(v); return true; }
      css[k] = String(v); syncStyle(); return true;
    },
    has(t, k) { return k in t || k in css || k in loose; },
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

const { renderScenario, renderBoard, trainSegments, xOfMinute, minuteAtTrainX } =
  await import("../admin/js/views/scenario.js");
const { renderProduction } = await import("../admin/js/views/production.js");
const { ONE_BAKER_SCENARIO, computeScenario, scenarioPlanPatch, jobKey } = await import("../admin/js/scenario.js");
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

test("and no tap the board offers on the day itself writes either — every bar, every tag, every module row (v184)", () => {
  // The modules' window, and deliberately only it. What the workers' window offers is a
  // coach, and a coach is the ONE tap on this screen that writes on purpose — her words,
  // 24 September: "Person should click on their work to turn it green" — and it is
  // covered by its own two tests below. Everything in the window above it is still
  // read-only, and this is the proof: not one bar, not one tag, not one module row
  // writes a byte of her settings.
  const state = makeState();
  const { root } = board(state);
  const before = JSON.stringify(state.settings);
  const proc = walk(root).find((n) => hasClass(n, "tl-pane-proc"));
  assert.ok(proc, "the board draws no modules' window, so this test would be tapping nothing");
  const targets = walk(proc).filter((n) => hasClass(n, "tl-bar") || hasClass(n, "tl-btag") || hasClass(n, "tl-row"));
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

test("it has exactly two controls, and the Clear press is quiet until there is something to clear (v184)", () => {
  // One is the offer to make sound; the other, new at v184, is the one press that takes
  // every tick off the board. It is drawn at every width of the day rather than coming
  // and going — a control that appears only sometimes reads as a fault — so on a board
  // nobody has touched it is here and DISABLED, which is what stops a press that would
  // do nothing from looking like a press that failed.
  const { root } = board();
  const buttons = walk(root).filter((n) => n.tagName === "BUTTON" && hasClass(n, "btn"));
  const said = buttons.map((b) => textOf(b).trim());
  assert.deepEqual(said, ["Start calling", "Clear the board"], `a board's buttons are ${JSON.stringify(said)}`);
  const clear = buttons.find((b) => /Clear the board/.test(textOf(b)));
  assert.equal(clear.disabled, true, "the Clear press is live on a board where nothing has been marked as taken");
  assert.match(textOf(root), /Nothing is marked as taken, so there is nothing to clear yet\./,
    "the board does not say why its Clear press is quiet");
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
  }
  // Drawn is not the same as shown. The line is hidden unless a walk-through is
  // running, and a board never runs one — so without its own reason to be shown the
  // whole clock would be drawn inside a hidden element and a worker would see none.
  // It is shown in the MODULES window, which is a strip of time and the one place on
  // the board where a minute is a position at all.
  assert.equal(lines[0].hidden, false, "the line is drawn but hidden, so the board shows no clock");
  // And not in the people's window, which since v184 is a strip of WORK: a coach does
  // not sit under the minute it happens at, so a minute line down that window would be
  // pointing at a place that does not mean what it says. What carries the clock there
  // is the CENTRE line, which is the one thing on that axis that has a position — see
  // "the train's clock is one line at the centre of the people's window".
  assert.equal(lines[1].hidden, true, "the board drew a minute line down a window that has no minute axis");
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
  // strip carries is the whole of the explanation.
  //
  // What changed at v184 is the row it stood in. It used to be withdrawn with the button,
  // because an emptied row left standing read as a fault. The Clear press now lives in
  // that row and must stay there — a finished day can still be carrying ticks nothing
  // will ever answer — so the row stays and the offering BUTTON is what goes. The claim
  // is therefore narrowed rather than dropped: no offer to start calling, and no word
  // promising a sound either way.
  setNow("2026-09-22T16:00:00");
  const { root } = board();
  placeTheLine(root);
  assert.equal(walk(root).filter((n) => n.tagName === "BUTTON" && /Start calling/.test(textOf(n))).length, 0,
    "the board still offers to start calling a day that is over");
  const foot = walk(root).filter((n) => hasClass(n, "bd-foot"));
  assert.equal(foot.length, 1, "the row that carries the Clear press has gone with the day");
  assert.equal(walk(root).filter((n) => n.tagName === "BUTTON" && /Clear the board/.test(textOf(n))).length, 1,
    "a finished day can still be carrying ticks, and the Clear press went with the offer to call");
  assert.doesNotMatch(textOf(root), /would be called|Calling \d/,
    "the board still says people would be called on a day that has finished");
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

// The modules window of a rendered screen. Since v184 the board's two windows are no
// longer the same kind of drawing — the modules are a strip of time and the people are
// a strip of work — so "the same day" is a claim about the modules, and the people are
// compared by their own test below.
const procPane = (root) => walk(root).find((n) => hasClass(n, "tl-pane-proc"));

test("the board and the planner draw the same day, bar for bar", () => {
  const b = board();
  const p = render(renderScenario, makeState());
  const shape = (root) => bars(procPane(root)).map((n) => `${n.attrs.style}|${textOf(n).trim()}`);
  assert.ok(shape(b.root).length > 8, "the board drew too little to compare");
  assert.deepEqual(shape(b.root), shape(p.root), "the two screens disagree about the same day");
});

test("and the people's window is the one place the two screens are drawn differently (v184)", () => {
  // The board's people window is a train — a coach per job, joined in the order the
  // jobs happen — and the planner's is still the time-true strip of bars she lays her
  // day out on. Both halves are asserted, because either one alone can be satisfied by
  // breaking the other: a board that lost its coaches and a planner that lost its bars
  // would pass a test that only looked at the board.
  const b = board();
  const p = render(renderScenario, makeState());
  const people = (root) => walk(root).find((n) => hasClass(n, "tl-pane-people"));
  assert.ok(bars(people(p.root)).length > 0, "the planner's people window lost the bars it lays the day out with");
  assert.equal(bars(people(b.root)).length, 0, "the board's people window is still drawn as a strip of time");
  assert.ok(walk(people(b.root)).some((n) => hasClass(n, "tl-coach")), "the board's people window has no coaches on it");
  assert.equal(walk(people(p.root)).filter((n) => hasClass(n, "tl-coach")).length, 0,
    "the planner is drawing the board's train");
});

test("the board draws the hours she typed and nothing the app worked out for her (v182)", () => {
  // The board is the same day drawn by the same code, so whatever band the planner
  // carries arrives on it for free — and that is exactly what this asserts, because a
  // second drawing is how the two screens would come to disagree. Her rule of 24
  // September retired the computed shade: "shade should just follow what i set, not
  // other consideration." So a day with nobody's hours typed is drawn with no band on
  // either screen, and a worker's card no longer claims a stretch of the day nobody set.
  const root = createEl("div");
  const state = makeState();
  const teardown = renderProduction(root, state);
  document.body.append(root);
  layers["popup-layer"].replaceChildren();
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-work")).length, 0,
    "the worker's board still draws a working stretch worked out from the day");
  assert.equal(walk(root).filter((n) => hasClass(n, "tl-shift")).length, 0,
    "a day with nobody's hours typed draws a band on the board anyway");
  const row = walk(root).find((n) => hasClass(n, "tl-row")
    && walk(n).some((x) => hasClass(x, "tl-coach")));
  assert.ok(row, "the board drew no person row with work on it");
  row.dispatchEvent({ type: "click" });
  assert.doesNotMatch(textOf(layers["popup-layer"]), /Working/,
    "the worker's card still says Working … about a stretch no band stands for");
  assert.ok(state.settings.scenario.shifts == null,
    "opening a worker's card wrote hours onto her stored day");
  teardown();

  // And where she HAS typed the hours, the board still draws NO band — and that changed
  // in v184, deliberately. The band is drawn at `startMin x pxPerMin`, which is
  // arithmetic on the day's minute axis, and the people's window on a board no longer
  // has one: a coach does not sit under the minute it happens at, so the same band
  // stretched across the strip would be a quiet lie of exactly the kind this app's own
  // notes refuse. The hours are still said, twice, where they always were — on the
  // row's own tip and on the worker's card — and neither is allowed to go quiet here.
  const typed = makeState({ shifts: { 1: { startMin: 60, endMin: 300 } } });
  const root2 = createEl("div");
  const teardown2 = renderProduction(root2, typed);
  document.body.append(root2);
  layers["popup-layer"].replaceChildren();
  const person = walk(root2).find((n) => hasClass(n, "tl-row")
    && walk(n).some((x) => hasClass(x, "tl-coach")) && textOf(n).includes("Person 1"));
  assert.ok(person, "the board drew no row for the person whose hours she typed");
  assert.equal(walk(procPane(root2)).filter((n) => hasClass(n, "tl-shift")).length, 0,
    "the board drew a band on a window with no minute axis");
  const hours = /Here \d{1,2}:\d{2} (am|pm) → \d{1,2}:\d{2} (am|pm)/;
  assert.match(textOf(person), hours,
    "the row's own tip stopped saying the hours she set, so the typed hours left the board");
  person.dispatchEvent({ type: "click" });
  const card = textOf(layers["popup-layer"]);
  assert.match(card, hours, "the worker's card does not say the hours she set for them");
  assert.doesNotMatch(card, /Working/,
    "the worker's card still carries the computed line beside her own hours");
  assert.deepEqual(typed.settings.scenario.shifts, { 1: { startMin: 60, endMin: 300 } },
    "opening a worker's card rewrote the hours she typed");
  // And the board's clock is let go of here, so a screen left open by this test cannot
  // go on beating behind the one that follows it.
  teardown2();
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

// ── the train's geometry (v184) ───────────────────────────────────────────
//
// The board's workers' window is a train: one coach a job, joined in order, with the
// clock pinned to the centre. The minute axis is gone, so the strip is placed by the
// pair of maps measured here — a minute of her day to a pixel along the row, and back
// again. Nothing else on this screen fails quietly the way these can: a map that has
// stopped being reversible still draws a train, it just draws the wrong one.

// Three jobs in one morning: a 12-minute dimple, a 6-minute fold and a 2-minute pack,
// with waits of 3 and 5 minutes between them. Coaches 100px, links 20px, 10px of space
// at each end, so every number below is a round one and a drift is a drift.
const TRAIN_JOBS = [
  { from: 0, to: 12 },
  { from: 15, to: 21 },
  { from: 26, to: 28 },
];
const TRAIN_SEG = trainSegments(TRAIN_JOBS, 100, 20, 10);
const near = (a, b) => Math.abs(a - b) < 1e-9;

test("a job's minutes cross its own coach and the wait before the next crosses the link (v184)", () => {
  assert.equal(xOfMinute(TRAIN_SEG, 0), 10, "the day's first minute is not at the first coach's own edge");
  assert.equal(xOfMinute(TRAIN_SEG, 6), 60, "half past the first job is not halfway across its coach");
  assert.equal(xOfMinute(TRAIN_SEG, 12), 110, "the first job's last minute is not at its coach's far edge");
  assert.equal(xOfMinute(TRAIN_SEG, 15), 130, "the second job's minutes did not start after the wait");
  assert.equal(xOfMinute(TRAIN_SEG, 21), 230);
  assert.equal(xOfMinute(TRAIN_SEG, 28), 350, "the day's last minute is not at the last coach's far edge");
  // The wait itself, which is the half of this map the countdowns are drawn on: three
  // minutes of waiting spread across the 20px link between coaches one and two.
  assert.ok(near(xOfMinute(TRAIN_SEG, 13.5), 120), "a minute of waiting did not cross the link");
  assert.ok(near(xOfMinute(TRAIN_SEG, 23.5), 240), "nor did the second wait");
});

test("every minute of a row reads back off its own strip, and every pixel back to a minute (v184)", () => {
  for (let m = 0; m <= 28; m++) {
    const back = minuteAtTrainX(TRAIN_SEG, xOfMinute(TRAIN_SEG, m));
    assert.ok(near(back, m), `minute ${m} of the row read back as ${back}`);
  }
  for (let x = 10; x <= 350; x++) {
    const back = xOfMinute(TRAIN_SEG, minuteAtTrainX(TRAIN_SEG, x));
    assert.ok(near(back, x), `pixel ${x} of the row read back as ${back}`);
  }
});

test("two jobs that run back to back get no strip between them (v184)", () => {
  // A job that ends at the minute the next one starts has no wait to draw, and a link
  // given the full 20px for nought minutes of waiting would be a slab of the row under
  // no minute at all — the one thing that stops the map above from being reversible.
  const tight = trainSegments([{ from: 0, to: 12 }, { from: 12, to: 18 }], 100, 20, 10);
  for (const s of tight) {
    if (s.kind === "stub") continue;
    assert.ok(s.to > s.from || s.w === 0, `a ${s.kind} owns ${s.w}px and no minutes at all`);
  }
  assert.equal(tight[2].start, 110, "the second coach did not start where the first one ended");
  for (let m = 0; m <= 18; m++) {
    assert.ok(near(minuteAtTrainX(tight, xOfMinute(tight, m)), m), `minute ${m}`);
  }
  for (let x = 10; x <= 210; x++) {
    assert.ok(near(xOfMinute(tight, minuteAtTrainX(tight, x)), x), `pixel ${x}`);
  }
});

// ── the board's train (v184) ──────────────────────────────────────────────
//
// What the workers' window on a board actually IS, as against the arithmetic above:
// one coach a job, all the same width, the countdown on the links between them, and a
// row that says who it is and what that person is on. Every one of these can be wrong
// while the screen still draws something that looks like a train, which is why each
// claim is counted from the drawing rather than trusted to it.

const peoplePaneOf = (root) => walk(root).find((n) => hasClass(n, "tl-pane-people"));
const peopleRows = (root) => walk(peoplePaneOf(root)).filter((n) => hasClass(n, "tl-row"));
const kidEls = (n) => (n.children || []).filter((c) => c.nodeType === 1);
const coachesOf = (row) => walk(row).filter((n) => hasClass(n, "tl-coach"));
const coachTipsOf = (row) => kidEls(row).filter((n) => hasClass(n, "tl-tip-coach"));
const partOf = (n, cls) => walk(n).find((x) => hasClass(x, cls));
// A coach's own span, in minutes from the day's own start, read off the clocks the strip
// says in full — the TIP's pair, which carries am/pm, and not the face's, which has no
// room for one. The tip is also the only place on a board where a job's END is written,
// which is what lets a test rebuild a row's own strip from what the row itself says.
function tipSpan(tip) {
  const m = /(\d{1,2}):(\d{2}) (am|pm) → (\d{1,2}):(\d{2}) (am|pm)/.exec(textOf(tip));
  assert.ok(m, `a coach's tip does not name the job's span: "${textOf(tip)}"`);
  const mins = (h, mi, ap) => (((Number(h) % 12) + (ap === "pm" ? 12 : 0)) * 60)
    + Number(mi) - ONE_BAKER_SCENARIO.dayStartMin;
  return { from: mins(m[1], m[2], m[3]), to: mins(m[4], m[5], m[6]) };
}
function coachStartMin(tip) {
  return tipSpan(tip).from;
}
const cssBody = (sel) => {
  const m = new RegExp(`${sel}\\s*\\{([^}]*)\\}`).exec(read("admin/css/app.css"));
  assert.ok(m, `${sel} has no rule of its own`);
  return m[1];
};
// The board's own strip of work: the element every coach is a child of, and the thing
// that is translated to hold the clock at its centre.
const stripOf = (row) => partOf(row, "tl-train");
// Where that strip has been placed, in pixels, as the drawing itself says it — the only
// honest source for a claim about placement, since a strip that is never placed reads as
// an empty string and not as a wrong number.
function placedLeft(row) {
  const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(stripOf(row).style.transform || "");
  assert.ok(m, `a row's strip was never placed: "${stripOf(row).style.transform}"`);
  return Number(m[1]);
}
// The row's own segment map, rebuilt here from what the ROW says it holds — one coach per
// tip, each tip's own span, and the widths written onto its track — so the arithmetic the
// view used can be checked rather than assumed.
const segsOf = (row) => {
  const track = partOf(row, "tl-track");
  return trainSegments(coachTipsOf(row).map(tipSpan),
    px(track, "--coach-w"), px(track, "--link-w"), px(track, "--stub-w"));
};
// The clock the workers read the line against, and the label it carries.
const theClock = (root) => walk(root).filter((n) => hasClass(n, "tl-clock"));
const clockLabOf = (clock) => walk(clock).find((n) => hasClass(n, "tl-clock-lab"));
// The name column's own width, read out of the stylesheet: the one declared number on
// this strip, and the width the tests hold the measured column and the width budget to.
const trainNameW = () => Number(/width:\s*(\d+)px/.exec(cssBody("\\.tl-row\\.train\\s*>\\s*\\.tl-name"))[1]);
// The board's own rule for its clock line — and the one thing it must not carry, which
// is a rung of its own (see the v174 note on .tl-wrap: nothing here climbs a ladder).
const clockCss = () => cssBody("\\.tl-clock(?![\\w-])");
// The clock string for a minute of her day, worked out here rather than imported from the
// view: a test that formatted its expectations with the function it is checking would
// pass whatever that function did. Twelve-hour, no leading zero, "am"/"pm" — the format
// the whole app reads out in.
function clockAtMinute(min, dayStartMin = ONE_BAKER_SCENARIO.dayStartMin) {
  const total = ((((dayStartMin + Math.round(min)) % 1440) + 1440) % 1440);
  const h24 = Math.floor(total / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(total % 60).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}`;
}
// One coach in the board whose tip names `needle`, with the row it sits on — because a
// claim about a coach is a claim about one job in one person's day, and step three of the
// clock is a claim about a coach AFTER its own job has ended.
function coachFor(root, needle) {
  for (const row of peopleRows(root)) {
    const tips = coachTipsOf(row);
    const at = tips.findIndex((t) => textOf(t).includes(needle));
    if (at >= 0) return { row, coach: coachesOf(row)[at], tip: tips[at] };
  }
  return null;
}
// A gesture, fired at the pane as a browser fires it: the event carries its own target,
// and every listener the pane has for that type runs, in the order it was added.
function gesture(pane, type, x, y, target) {
  const ev = {
    type, button: 0, clientX: x, clientY: y, target,
    preventDefault() {}, stopPropagation() {},
  };
  for (const f of pane._listeners[type] || []) f(ev);
}
// A tap on a coach, fired at the coach itself as a browser fires it — a plain left
// press, no movement, and the event carrying its own target. `stopped` records whether
// the handler kept the event from reaching the row, because the row's own handler opens
// the person's card: a tap that both ticked a job and opened a card under it would be two
// answers to one tap.
function tapCoach(coach) {
  const said = { stopped: 0 };
  const ev = {
    type: "click", button: 0, target: coach,
    preventDefault() {}, stopPropagation() { said.stopped += 1; },
  };
  for (const f of coach._listeners.click || []) f(ev);
  return said;
}
// The last thing the app said back to her. `toast` builds a fresh `.toast` node on
// document.body every time — the shim's `querySelector` answers null, so the real one's
// reuse-the-node path is never taken here — which makes the newest toast the last one.
function lastToast() {
  const ts = (globalThis.document.body.children || [])
    .filter((n) => n.nodeType === 1 && hasClass(n, "toast"));
  return ts.length ? textOf(ts[ts.length - 1]) : null;
}
// The labels of the buttons on whatever is in the app's confirm layer, and a way to press
// one of them — the only path by which a confirm in this app is answered.
function confirmButtons() {
  return walk(layers["confirm-layer"]).filter((n) => n.tagName === "BUTTON");
}
function pressConfirm(label) {
  const b = confirmButtons().find((n) => textOf(n).trim() === label);
  assert.ok(b, `the confirm card offers no "${label}": ${confirmButtons().map((n) => textOf(n).trim()).join(", ")}`);
  for (const f of b._listeners.click || []) f({ type: "click", button: 0, target: b });
}
// Every string the board puts on the screen OR into a style, scanned for the two words a
// broken number leaves behind. Text alone is not enough here: the whole strip is placed
// by a transform, and `translateX(NaNpx)` is a train that has vanished with not one
// character of text to show for it.
function boardStrays(root) {
  for (const n of walk(root)) {
    for (const [k, v] of Object.entries(n.attrs || {})) {
      if (/NaN|undefined/.test(String(v))) return `${k}="${v}"`;
    }
    for (const c of n.children || []) {
      if (c.nodeType === 3 && /NaN|undefined/.test(String(c.text))) return `"${c.text}"`;
    }
  }
  return null;
}

// A day with TWO hands on it, so "all the same width" is a claim about two rows and
// not about one. Untouched, her scenario names nobody and the automatic pass puts the
// whole morning on one person's row.
const TWO_HANDS = { modules: ONE_BAKER_SCENARIO.modules.map((m, i) => ({ ...m, person: i < 4 ? 1 : 2 })) };

test("one coach a job, all one width, and the countdown on the links (v184)", () => {
  // The planner's screen is drawn FIRST and the board's second, because a render wipes
  // the beats the one before it started — and this test has to be able to drive the
  // board's own beat to re-measure the strip at a width this file chooses.
  const p = render(renderScenario, makeState(TWO_HANDS));
  const b = board(makeState(TWO_HANDS));
  const countIn = (rows, cls) => rows.reduce((n, r) => n + walk(r).filter((x) => hasClass(x, cls)).length, 0);
  // One coach a job, counted against the OTHER screen. The claim is an identity between
  // the two drawings of one day — the planner still draws a time-true bar per job — so
  // a number invented in this file could not be the evidence for it.
  const jobs = countIn(peopleRows(p.root), "tl-bar");
  assert.ok(jobs > 3, "her day drew too few jobs for a coach count to mean anything");
  assert.equal(countIn(peopleRows(b.root), "tl-coach"), jobs,
    "a coach is not a job: the board and the planner disagree about how many jobs the day holds");

  // All one width, and the width is the room left after the name column — one measured
  // number written onto every row's track rather than a width each coach works out of
  // its own words. Measured at her phone's 375px, where she asked for four coaches on a
  // visible line.
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();
  const tracks = walk(pane).filter((n) => hasClass(n, "tl-track"));
  assert.ok(tracks.length >= 2, "the board drew no trains to size");
  const ws = tracks.map((t) => px(t, "--coach-w"));
  assert.ok(ws.every((w) => Number.isFinite(w) && w > 0), `a row was given no coach width: ${ws.join(", ")}`);
  // Read through the door CSS reads a custom property through, and not only off the
  // attribute. `style["--coach-w"] = "36px"` is not a write: a browser leaves an expando
  // on the style object and the declarations untouched, so every coach falls through to
  // the stylesheet's own fallback width and the line is drawn at a size nobody measured.
  // This test passed while that was true — the stub kept the attribute the browser never
  // writes — so the number is asked for the way CSS asks for it, on every row.
  for (const t of tracks) {
    assert.match(t.style.getPropertyValue("--coach-w"), /^\d+px$/,
      `a row's coach width is not in the declarations ("${t.style.getPropertyValue("--coach-w")}"), so the stylesheet's fallback is what is drawn`);
    assert.match(t.style.getPropertyValue("--link-w"), /^\d+px$/,
      "a row's link width is not in the declarations, so the wait between two jobs is the stylesheet's fallback");
    assert.match(t.style.getPropertyValue("--stub-w"), /^\d+px$/,
      "a row's stub width is not in the declarations, so the end of the line is the stylesheet's fallback");
  }
  assert.equal(new Set(ws).size, 1, "two rows were given two different coach widths, so the coaches are not all one size");
  const [coach, link, stub] = [ws[0], px(tracks[0], "--link-w"), px(tracks[0], "--stub-w")];
  assert.ok(Number.isFinite(link) && link > 0 && Number.isFinite(stub) && stub > 0,
    `the link or the stub was given no width: link ${link}, stub ${stub}`);
  const nameRule = cssBody("\\.tl-row\\.train\\s*>\\s*\\.tl-name");
  const nameW = Number(/width:\s*(\d+)px/.exec(nameRule)[1]);
  assert.match(nameRule, new RegExp(`flex:\\s*0\\s+0\\s+${nameW}px`),
    "the name column is not held at one width by both its basis and its width, so it can size differently");
  const visW = 375 - nameW;
  assert.equal(coach, Math.max(34, Math.floor((visW - 3 * link - 2 * stub) / 4)),
    "the coach width is not the room left after the name column the stylesheet declares, so the column and the strip disagree about how much of the pane is theirs");
  const four = (coach * 4) + (link * 3) + (stub * 2);
  assert.ok(four <= visW, `four coaches do not fit her phone's line: ${four}px of ${visW}px`);
  assert.ok(four + coach + link > visW, `five coaches fit her phone's line, so four is not what fills it (${four + coach + link}px of ${visW}px)`);

  // And the countdown is on the LINK, never on a coach — her "numbers ... Only on the
  // links" — and there is exactly one per link, at a fixed width so a number that
  // changes length cannot shuffle its neighbours.
  const links = walk(pane).filter((n) => hasClass(n, "tl-link"));
  const counts = walk(pane).filter((n) => hasClass(n, "tl-count"));
  assert.ok(links.length > 0, "the board drew no link, so a countdown has nowhere to be");
  assert.equal(counts.length, links.length, "a link carries no countdown, or a countdown was drawn loose on the strip");
  for (const c of counts) {
    assert.ok(hasClass(c.parent, "tl-link"), "a countdown was drawn somewhere other than on a link");
    assert.match(textOf(c), /^(✓|due|\d+m)$/, `the countdown on a link reads "${textOf(c)}", which is not a countdown`);
  }
  assert.equal(walk(pane).filter((n) => hasClass(n, "tl-coach") && walk(n).some((x) => hasClass(x, "tl-count"))).length, 0,
    "a countdown was drawn on a coach, and a coach is a job rather than the wait before one");

  assert.match(cssBody("\\.tl-coach"), /width:\s*var\(--coach-w/,
    "the coach does not take its width from the one measured number, so a coach is as wide as its own words");
  assert.match(cssBody("\\.tl-coach"), /flex:\s*0\s+0/,
    "the coach grows or shrinks with the line, so the coaches are not all one width");
  assert.match(cssBody("\\.tl-link"), /width:\s*var\(--link-w/, "the link does not take its width from the measured number");
  assert.match(cssBody("\\.tl-stub"), /width:\s*var\(--stub-w/, "the stub does not take its width from the measured number");
  assert.match(cssBody("\\.tl-count"), /width:\s*2\.4em[^}]*text-align:\s*center/,
    "the countdown is not a fixed-width centred pill, so a number changing length reflows the strip");
  assert.match(cssBody("\\.tl-count"), /font-variant-numeric:\s*tabular-nums/,
    "the countdown's digits are not tabular, so it jitters as it counts");
});

test("the coach face shows meaning, never a clipped word, and the tip carries the rest (v184)", () => {
  const rows = peopleRows(board().root);
  assert.ok(rows.length > 0, "the board drew nobody");
  // The word goes rather than being cut: at 43 pixels and under, the face is the icon,
  // the clock and the batch. This is the half of her refinement a stylesheet can hold —
  // "if the coach box is too small to house the full words, then just show meaningful" —
  // and without it a narrow coach would ellipsise a word instead of dropping it.
  assert.match(read("admin/css/app.css"),
    /@container\s*\(max-width:\s*43px\)\s*\{\s*\.tl-cname\s*\{\s*display:\s*none/,
    "a coach too narrow for its word has nowhere to put it, so the face clips the word instead");
  assert.match(cssBody("\\.tl-tip-coach"), /white-space:\s*normal/,
    "the coach's tip is held to one line, so the full name it carries is clipped in its turn");
  assert.match(read("admin/css/app.css"),
    /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*\{\s*\.tl-tip-coach\.on\s*\{\s*display:\s*block/,
    "the coach's tip is shown by a rule a phone can reach, so a tap means two things at once");

  let faces = 0;
  for (const row of rows) {
    const cs = coachesOf(row);
    const ts = coachTipsOf(row);
    assert.equal(ts.length, cs.length, "a coach has no tip, or a tip was drawn for a coach that is not on the strip");
    for (let i = 0; i < cs.length; i++) {
      const icon = partOf(cs[i], "tl-cicon");
      const when = partOf(cs[i], "tl-cwhen");
      assert.ok(icon && textOf(icon), "a coach's face carries no icon, so it is a blank box");
      assert.match(textOf(when), /^\d{1,2}:\d{2}$/, `a coach's face does not name its own clock: "${textOf(when)}"`);
      // The tip is a child of the ROW and not of the coach: the strip is translated and
      // the track clips, so a box opened inside one would be dragged off and cut.
      assert.ok(hasClass(ts[i].parent, "tl-row"), "the coach's tip is inside the strip, where a clipped translated box would cut it off");
      const tip = textOf(ts[i]);
      assert.match(tip, /\d{1,2}:\d{2} (am|pm) → \d{1,2}:\d{2} (am|pm) · \d+ min/,
        `the tip does not carry the job's own clocks and length: "${tip}"`);
      assert.match(tip, /👤 \S/, "the tip does not name the person the job belongs to");
      assert.match(tip, /Taken|Due now|Running now|Coming up/,
        `the tip does not say in words where the job stands: "${tip}"`);
      const name = partOf(cs[i], "tl-cname");
      if (!name) continue;
      faces += 1;
      const word = textOf(name);
      assert.ok(word && !/…|\.\.\./.test(word), `a coach's face is showing a clipped word: "${word}"`);
      assert.match(word, /^\S+$/, `a coach's face is showing more than one word: "${word}"`);
      assert.ok(tip.includes(word), `the face says "${word}" and the tip does not carry the job it belongs to`);
      // And it is opened by hand, because a `:hover` selector cannot reach a box that is
      // a sibling of the thing being hovered. Fired as the browser fires it — every
      // listener on the coach, in the order it was added — rather than by reaching for
      // one of them, since the coach carries two.
      const open = cs[i]._listeners.mouseenter || [];
      const shut = cs[i]._listeners.mouseleave || [];
      assert.ok(open.length, "the coach has no way to open its own tip");
      assert.ok(shut.length, "the coach has no way to shut its own tip");
      for (const f of open) f();
      assert.ok(ts[i].classList.contains("on"), "hovering a coach does not open its tip");
      for (const f of shut) f();
      assert.equal(ts[i].classList.contains("on"), false, "the tip stays open after the pointer has left the coach");
    }
  }
  assert.ok(faces > 0, "not one coach carried a word, so the face was never tested");

  // The word is DERIVED, not the first word and not a cut one. "The oven swap and the
  // bake" is the case that decides it: its first word means nothing at all, so a face
  // reading "The" would be showing a word and saying nothing — and the word that means
  // it, "oven", is the second one, not the first.
  const faceFor = (needle) => {
    const row = rows.find((r) => coachTipsOf(r).some((t) => textOf(t).includes(needle)));
    assert.ok(row, `her day has no job called ${needle}`);
    const at = coachTipsOf(row).findIndex((t) => textOf(t).includes(needle));
    return textOf(partOf(coachesOf(row)[at], "tl-cname"));
  };
  assert.equal(faceFor("The oven swap and the bake"), "oven",
    '"The oven swap and the bake" is not shown as the word that means it');
  assert.equal(faceFor("Cutting and packing"), "Cutting",
    '"Cutting and packing" is not shown as the word that means it');
  assert.equal(faceFor("The rests and the stretch and folds"), "rests",
    '"The rests and the stretch and folds" is not shown as the word that means it');
});

test("the row says who is on it and what is next (v184)", () => {
  // After the day is over with nothing ticked, two facts that are NOT the same sentence
  // have to be told apart. A row with work on it has work nobody has taken — and those
  // coaches are red and STAY red (her clause 3: "the coach can pass the current timeline,
  // but stay red, click it turn green") — so the row counts what is left instead of
  // telling a worker they have finished something they have never touched. A row with no
  // work on it never started, and says that instead.
  setNow("2026-09-22T14:00:00");
  const over = board();
  const rowsOver = peopleRows(over.root);
  assert.ok(rowsOver.length > 0, "the board drew nobody");
  for (const row of rowsOver) {
    const cell = kidEls(row)[0];
    assert.ok(hasClass(cell, "tl-name"), "a row does not begin with its person's own cell");
    assert.match(textOf(cell), /👤 \S/, "the row does not say who is on it");
    const next = walk(row).find((n) => hasClass(n, "tl-next"));
    assert.ok(next, "the row does not say what is next");
    assert.equal(next.parent, cell, "what is next is not part of the person's own cell, so a phone cannot read it without a tap");
    const said = textOf(next);
    assert.match(said, /^(All done|Nothing on|\d+ not taken|Now: .+|Due: .+|Next \d+m)$/, `the row's next line reads "${said}"`);
    const n = coachesOf(row).length;
    if (!n) {
      assert.equal(said, "Nothing on", "a row with no work on it no longer says so");
      continue;
    }
    assert.equal(said, `${n} not taken`,
      "a row whose every coach is red and untaken reads as finished, which is the board talking a worker out of the tap her clause 3 asks for");
    assert.ok(hasClass(next, "due"), "the row's line about untaken work is not drawn as urgent");
  }

  // And the count gives up as the work is taken. Tick every coach on ONE row and read
  // that row's own line back off the redrawn screen: it alone turns quiet, and the rows
  // nobody touched keep saying what is left — so the count is read from the acks and not
  // from the clock, which has not moved at all. Then untick one coach: the count comes
  // back at one, which is what tells "All done" from "the last tick was taken off".
  const live = board();
  // By POSITION, because the row is rebuilt by every tap and a node held across one is
  // a node that is no longer on the screen. The rows keep their order: the redraw puts
  // the same people in the same places.
  const rowsAt = (root) => peopleRows(root);
  const at = rowsAt(live.root).findIndex((r) => coachesOf(r).length > 1);
  assert.ok(at >= 0, "no row on her day carries more than one job, so this proves nothing");
  const mine = coachesOf(rowsAt(live.root)[at]).length;
  const saidAt = (i) => textOf(walk(rowsAt(live.root)[i]).find((n) => hasClass(n, "tl-next")));
  const otherAt = rowsAt(live.root).findIndex((r, i) => i !== at && coachesOf(r).length > 0);
  const otherSaid = otherAt >= 0 ? saidAt(otherAt) : null;
  for (let i = 0; i < mine - 1; i += 1) tapCoach(coachesOf(rowsAt(live.root)[at])[i]);
  assert.equal(saidAt(at), "1 not taken",
    "ticking every coach but one on a row did not leave the row saying what is left");
  tapCoach(coachesOf(rowsAt(live.root)[at])[mine - 1]);
  const done = walk(rowsAt(live.root)[at]).find((n) => hasClass(n, "tl-next"));
  assert.equal(textOf(done), "All done", "a row whose every coach is green still says work is left");
  assert.ok(!hasClass(done, "due"), "a row with nothing left to take is still drawn as urgent");
  if (otherAt >= 0) {
    assert.equal(saidAt(otherAt), otherSaid,
      "ticking one person's row changed the line of a row nobody touched");
  }
  // And the tick that turns the row quiet is undone by the same tap: the count is back.
  tapCoach(coachesOf(rowsAt(live.root)[at])[mine - 1]);
  assert.equal(saidAt(at), "1 not taken",
    "taking a tick off did not put the row's count of what is left back");

  // And mid-morning, where there IS a next thing: the countdown the row shows is the gap
  // to that row's OWN next job, read back off the same strip the coaches are drawn on.
  setNow("2026-09-22T04:30:00");
  const mid = board();
  const nowMin = 30; // 4:30 am against her 4:00 am start, which is the subtraction boardNow makes
  let counted = 0;
  for (const row of peopleRows(mid.root)) {
    const said = textOf(walk(row).find((n) => hasClass(n, "tl-next")));
    const m = /^Next (\d+)m$/.exec(said);
    if (!m) continue;
    counted += 1;
    const ahead = coachTipsOf(row).map(coachStartMin).filter((v) => v > nowMin).sort((a, b) => a - b);
    assert.ok(ahead.length, `the row says a job is ${m[1]} minutes away and its own strip has none after the clock`);
    assert.equal(Number(m[1]), ahead[0] - nowMin,
      `the row counts ${m[1]} minutes to its next job and its own strip puts that job ${ahead[0] - nowMin} minutes away`);
  }
  assert.ok(counted > 0, "no row was counting down at all, so this proves nothing about the countdown");
});

test("a coach turns red at its own job and STAYS red once the clock has gone past it (v184)", () => {
  // Her clause 3, in her own words: "The coach can pass the current timeline, but stay
  // red, click it turn green." So there is no upper bound on the due test — a job nobody
  // has taken is exactly the thing a board exists to show, and a job that goes quiet an
  // hour later is a job nobody sees.
  setNow("2026-09-22T04:00:00");
  const b = board();
  const found = coachFor(b.root, "The oven swap and the bake");
  assert.ok(found, "her day has no oven job on the board");
  const { from, to } = tipSpan(found.tip);
  assert.ok(from >= 5 && to > from, `the oven job runs ${from} to ${to}, too near the day's own edge to watch it turn`);
  // The day's own clock, driven a minute at a time through the board's own beat. One
  // board throughout: a claim about a coach going red and STAYING red is a claim about
  // the same coach, and a second render would be a second coach.
  const at = (min) => { setNow(REAL_DATE.parse("2026-09-22T04:00:00") + (min * 60000)); flushTicks(); };
  at(from - 2);
  assert.equal(hasClass(found.coach, "due"), false,
    `a coach is red ${from - (from - 2)} minutes before its own job starts, so red means nothing at all`);
  // The app's own call minute, which is one before the job starts (see callAtOf) — the
  // same minute the bell rings, so a coach turning red and a call going out cannot
  // disagree about when a job is due.
  at(from - 1);
  assert.equal(hasClass(found.coach, "due"), true,
    "a coach does not turn red on the minute its own job is called");
  at(from);
  assert.equal(hasClass(found.coach, "due"), true, "a coach is not red while its own job is running");
  at(to + 5);
  assert.equal(hasClass(found.coach, "due"), true,
    "a coach the clock has passed goes quiet, so the job nobody has taken can no longer be seen");
});

test("the clock is one line at the centre, and each row is placed against its own strip (v184)", () => {
  setNow("2026-09-22T04:30:00");
  const nowMin = 30; // 4:30 am against her 4:00 am start, which is the subtraction boardNow makes
  const b = board(makeState(TWO_HANDS));
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();

  // ONE line for the whole window and not one per row: the minutes on this strip are the
  // workers' own, and two rows carrying two clocks could disagree about how long is left.
  const clocks = theClock(b.root);
  assert.equal(clocks.length, 1, "the workers' window draws more than one clock, so two rows can point at two different minutes");
  const clock = clocks[0];
  assert.equal(clock.parent, partOf(pane, "tl-inner"), "the clock is not the pane's own line, so it cannot span every row");
  // It is the LAST thing drawn in the window, and that is what puts it over the coaches:
  // a translated strip is painted as though it were positioned with no z-index, so tree
  // order is the whole of the rule — and the v174 lesson is that nothing here climbs.
  const inPane = kidEls(partOf(pane, "tl-inner"));
  assert.equal(inPane[inPane.length - 1], clock, "the clock is not drawn last in the window, so the coaches are painted over it");
  assert.ok(!/z-index/.test(clockCss()),
    "the clock declares a rung of its own, which is the v174 fault: an element that climbs here covers her pinned names");

  // At the centre of the LINE A COACH STANDS ON — what is left of the pane after the
  // names, halved — and not at the centre of the pane, because the names are not part of
  // the line.
  const inner = pane.clientWidth;
  const nameW = trainNameW();
  const centre = Math.round(nameW + (inner - nameW) / 2);
  assert.equal(px(clock, "left"), centre,
    `the clock stands at ${px(clock, "left")}px, not at the centre of the line (${centre}px of a ${inner}px pane)`);
  assert.equal(clock.hidden, false, "the board's own clock is hidden on the board");

  // Its reading is the CLOCK TIME and never the word "now": the modules above still draw
  // the day's own now-line, and two lines on one screen both saying "now" would be two
  // answers to one question.
  const lab = clockLabOf(clock);
  assert.ok(lab, "the clock carries no reading");
  assert.match(textOf(lab), /^\d{1,2}:\d{2} [ap]m$/, `the clock reads "${textOf(lab)}"`);
  assert.ok(!/now/i.test(textOf(lab)), "the workers' clock claims to be now, which the day's own line above already says");
  assert.equal(textOf(lab), clockAtMinute(nowMin), "the clock does not read the minute the day is actually at");
  // Sticky, because these rows are 56 pixels each and the window scrolls: a label pinned
  // to the strip's top would scroll away and leave a line with no reading on it.
  assert.match(cssBody("\\.tl-clock-lab"), /position:\s*sticky/,
    "the clock's reading would scroll away with the rows it belongs to");
  assert.match(cssBody("\\.tl-clock-lab"), /font-variant-numeric:\s*tabular-nums/,
    "the clock's digits are not tabular, so the label shuffles as it counts");
  // And it reads the same colour the day's own line does at rest, because at rest it IS
  // the live minute; only a reading takes the other colour. See the next test.
  assert.match(clockCss(), /background:\s*var\(--red\)/, "the clock at rest is not the colour of the minute the day is at");

  // Every row is placed against its OWN strip: its own segments, its own widths. The
  // claims are worked out here from what each row says it holds — its tips' spans and its
  // track's widths — and never read back out of the view's own arithmetic.
  const rows = peopleRows(b.root);
  assert.ok(rows.length >= 2, "the board drew one row, so this proves nothing about two strips");
  for (const row of rows) {
    const x = xOfMinute(segsOf(row), nowMin);
    const left = placedLeft(row);
    assert.equal(left, Math.round(centre - nameW - x),
      `a row's strip stands at ${left}px, where this row's own map puts the day's minute at ${Math.round(centre - nameW - x)}px`);
    // The strip is translated inside a track that BEGINS at the name column, so the minute
    // it puts at the centre lands at `nameW + left + x` in the pane's own pixels — the same
    // 242 the clock stands at, and the arithmetic that proves the two agree.
    assert.ok(Math.abs(nameW + left + x - centre) <= 1,
      `the minute the day is at does not stand on the centre of the line for this row (${Math.round(nameW + left + x)}px of ${centre}px)`);
  }
  // The same minute, the same centre, on both rows — her "the current time at the center
  // sharing with all person". The strips do NOT stand at the same pixel and must not be
  // asked to: each is placed from its own map, and a row holding two jobs and a row holding
  // six put the same minute at different distances along their own strips. What is claimed
  // is that each puts the SAME MINUTE on the centre, to within the pixel its own rounding
  // costs — so the claim is a distance from the centre, never an equality of positions.
  const off = rows.map((row) => nameW + placedLeft(row) + xOfMinute(segsOf(row), nowMin) - centre);
  assert.ok(off.every((d) => Math.abs(d) <= 1),
    `the rows put the minute the day is at at ${off.map((d) => Math.round(d)).join(" and ")}px from the centre, so the clock is not shared`);

  // And nothing on the screen says a word of nothing once it is placed.
  assert.equal(boardStrays(b.root), null, "a beat put a broken number on the board");
});

test("dragging reads the day without moving the trains, and letting go re-centres (v184)", () => {
  // Her words: "lock the clock relative to the train, when drag, clock line move, when
  // click outside, the clock centred on the line." A reading is a question about the day
  // and not a change to it, so the thing that moves is the LINE.
  setNow("2026-09-22T04:30:00");
  const b = board(makeState(TWO_HANDS));
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();
  const clock = theClock(b.root)[0];
  const lab = clockLabOf(clock);
  const row = peopleRows(b.root)[0];
  const strip = stripOf(row);
  const centre = px(clock, "left");
  const live = textOf(lab);
  const before = strip.style.transform;
  const coach = coachesOf(row)[0];

  for (const f of pane._listeners.pointerdown || []) {
    const ev = { type: "pointerdown", button: 0, clientX: 60, clientY: 20, target: coach, preventDefault() {}, stopPropagation() {} };
    f(ev);
  }
  // A four-pixel slop, so a tap is never read as a reading — and the finger must go
  // further sideways than up or down, so a finger scrolling the page is not one either.
  gesture(pane, "pointermove", 62, 21, coach);
  assert.equal(px(clock, "left"), centre, "a two-pixel twitch moved the clock, so a tap on a coach can flicker the line");
  assert.equal(strip.style.transform, before, "a twitch moved the trains");

  gesture(pane, "pointermove", 120, 22, coach);
  assert.equal(px(clock, "left"), 120, "the clock line did not follow her hand");
  assert.equal(strip.style.transform, before,
    "a reading moved the trains, so a worker reading the line has had it moved under them");
  assert.equal(clock.classList.contains("reading"), true, "a line she is reading looks exactly like the minute the day is at");
  // The minute it reads is read off the ROW HER HAND IS ON, by the same map the strips
  // are placed by, run backwards — checked here by running it backwards in the test.
  const x = 120 - trainNameW() - placedLeft(row);
  assert.equal(textOf(lab), clockAtMinute(Math.max(0, Math.round(minuteAtTrainX(segsOf(row), x)))),
    `the clock reads "${textOf(lab)}" where this row puts the minute at ${Math.round(minuteAtTrainX(segsOf(row), x))}`);
  assert.notEqual(textOf(lab), live, "the reading says the same thing as the clock at the centre, so the drag can be seen to do nothing");

  // Letting go puts it back: a line left standing at a minute nobody is at is a board
  // quietly telling a worker something that is not true.
  gesture(pane, "pointerup", 120, 22, coach);
  assert.equal(px(clock, "left"), centre, "letting go does not put the clock back at the centre");
  assert.equal(clock.classList.contains("reading"), false, "the line still looks like a reading after she has let go");
  assert.equal(textOf(lab), live, "the reading did not go back to the live clock");
  assert.equal(strip.style.transform, before, "the trains moved while she was reading");

  // And a press that begins where there is no row re-centres it — her "when click
  // outside, the clock centred on the line" — rather than starting a reading.
  const nameCell = kidEls(row)[0];
  gesture(pane, "pointerdown", 300, 20, nameCell);
  gesture(pane, "pointermove", 340, 21, nameCell);
  assert.equal(px(clock, "left"), centre, "a drag that began on the name column moved the clock out of the centre");
});

test("a tap on a coach marks the job as taken, turns it green, and names the job (v184)", () => {
  // Her words, 24 September 2026: "Person should click on their work to turn it green
  // indicating acknowledgement." So the tap WRITES, the coach turns green under the
  // finger, and the same tap takes it back again — a finger that slipped must not need a
  // second control to undo itself.
  setNow("2026-09-22T04:30:00");
  const state = makeState(TWO_HANDS);
  const b = board(state);
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();
  const found = coachFor(b.root, "Cutting and packing");
  assert.ok(found, "no coach for the job this test is about");
  const { tip, row } = found;
  const at = ONE_BAKER_SCENARIO.dayStartMin + coachStartMin(tip);
  assert.equal("boardAcks" in state.settings, false,
    "the board wrote a tick into her settings before anything was tapped");
  assert.ok(!hasClass(found.coach, "ack"), "a coach is green before anybody has touched it");
  const when = clockAtMinute(coachStartMin(tip));

  const popBefore = (layers["popup-layer"].children || []).length;
  const said = tapCoach(found.coach);

  // One: green, and green in the stylesheet's own words rather than in this file's. The
  // coach is read off the SCREEN again rather than held from before the tap: a tick says
  // the screen again (the heading's own count and the Clear press's own state move with
  // it), so the claim is about what a worker is looking at now.
  const after = coachFor(b.root, "Cutting and packing");
  assert.ok(hasClass(after.coach, "ack"), "a tap on a coach did not mark the job as taken");
  assert.ok(!hasClass(after.coach, "due"), "a coach is drawn both taken and due at once");
  assert.match(cssBody("\\.tl-coach\\.ack"), /--green-bg/, "a taken coach is not the green her clause three asks for");
  assert.match(cssBody("\\.tl-coach\\.ack"), /--green\b/, "the taken coach's own words are not green");
  // Two: written down, in her settings, under exactly one key.
  const acks = state.settings.boardAcks;
  assert.ok(acks, "the tap was drawn and never written, so nothing about it reaches her other phone");
  assert.equal(Object.keys(acks).length, 1, `one tap wrote ${Object.keys(acks).length} ticks`);
  assert.equal(Object.values(acks)[0], 1, "the tick was written as something other than taken");
  // And written down means SAVED, not just changed in memory: the object above is the
  // live state the app holds, and a tap that moved it and never persisted would look
  // exactly the same on the screen until the phone was next opened. So the claim is read
  // back off the store — the same place the app's own save() puts it — where a tap that
  // skipped the write is visible.
  const stored = JSON.parse(localStorage.getItem("bakeadmin.v1") || "null");
  assert.ok(stored && stored.settings && stored.settings.boardAcks,
    "the tap marked the job taken on screen and never saved it, so the tick dies with the phone");
  assert.deepEqual(Object.keys(stored.settings.boardAcks), Object.keys(acks),
    "the tick that was saved is not the tick that was shown");
  // Three: the job is named, back to her, in the words the rest of the app names it by —
  // and with the clock time, because a module running two batches gives two coaches and
  // the time is the only thing that tells them apart.
  const told = lastToast();
  assert.ok(told, "the tap said nothing back");
  assert.ok(told.includes("Cutting and packing"), `the tap named the job as "${told}"`);
  assert.ok(told.includes(when), `the tap did not say which of the day's jobs it was about: "${told}"`);
  assert.match(told, /marked as taken\./, `the tap read as "${told}"`);
  // Four: and it said the coach, not the card under it. The row's own handler opens the
  // person's card, so a tap that reached it would tick a job AND open a card over it.
  assert.equal(said.stopped, 1, "a tap on a coach was left to reach the row, which opens the person's card under it");
  assert.equal((layers["popup-layer"].children || []).length, popBefore,
    "a tap on a coach opened the person's card over the job it had just ticked");
  // And the tip — the one place a coach's state is written in words — agrees with the
  // coach it belongs to.
  assert.match(textOf(after.tip), /taken/i, `a taken coach's tip still reads "${textOf(after.tip)}"`);

  // The same tap takes it back, and takes the empty map with it: a job nobody has taken
  // leaves nothing behind to explain in her stored settings.
  tapCoach(coachFor(b.root, "Cutting and packing").coach);
  assert.ok(!hasClass(coachFor(b.root, "Cutting and packing").coach, "ack"),
    "the second tap did not take the tick off");
  assert.equal("boardAcks" in state.settings, false,
    "taking the last tick off left an empty tick map in her settings");
  assert.match(lastToast(), /not marked as taken any more/, "the undo did not say what it had done");

  // And the key names the PERSON, which is what makes a job handed to somebody else start
  // unanswered again — the safe reading at a bench, and the one the CHANGELOG says out
  // loud. Checked on the shared spelling, because the view, the tap and this test have to
  // key one job one way.
  const one = { who: 1, module: "m", batch: 0, slot: 0, cycle: 0 };
  assert.notEqual(jobKey(one), jobKey({ ...one, who: 2 }),
    "the tick's key does not name the person, so handing a job on would carry the tick with it");
});

test("a tick is kept by the screen being drawn again, on the person it was made for (v184)", () => {
  // The tick reaches the drawing through the same settings the rest of the app saves, so
  // the proof that it was written — rather than remembered in the closure — is a screen
  // built fresh from those settings.
  setNow("2026-09-22T04:30:00");
  const state = makeState(TWO_HANDS);
  const first = board(state);
  const pane = peoplePaneOf(first.root);
  pane.clientWidth = 375;
  flushTicks();
  const found = coachFor(first.root, "Cutting and packing");
  const ownerName = /👤\s*([^A-Z]*\S)/.exec(textOf(found.row))[0];
  tapCoach(found.coach);

  const again = board(state);
  flushTicks();
  const greenRows = peopleRows(again.root)
    .filter((r) => walk(r).filter((n) => hasClass(n, "tl-coach") && hasClass(n, "ack")).length);
  assert.equal(greenRows.length, 1, `the second screen drew ${greenRows.length} green rows, not one`);
  assert.ok(greenRows[0].textContent.includes(ownerName),
    `the tick came back on a row that is not ${ownerName}'s`);
  assert.match(textOf(greenRows[0]), /Cutting/, "the tick came back on the wrong job of the right person");
  assert.equal(Object.keys(state.settings.boardAcks).length, 1, "drawing the board again changed what was ticked");
});

test("the click that ends a reading is not a tap on the work (v184)", () => {
  // A drag along the line ends with a click on whatever the finger was over, which on
  // this screen is usually a coach. That click is the end of a reading and not a worker
  // saying "I'm on it" — see run.scrubbed — so it must leave the job exactly as it was.
  setNow("2026-09-22T04:30:00");
  const state = makeState(TWO_HANDS);
  const b = board(state);
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();
  const row = peopleRows(b.root)[0];
  const coach = coachesOf(row)[0];

  gesture(pane, "pointerdown", 120, 20, coach);
  gesture(pane, "pointermove", 190, 21, coach);
  tapCoach(coach);
  assert.equal("boardAcks" in state.settings, false,
    "the click that ended a reading was taken as a tap on the work");

  // The next real press clears the flag and ticks as it always did, so a reading can cost
  // at most its own one click.
  gesture(pane, "pointerdown", 120, 20, coach);
  gesture(pane, "pointerup", 120, 20, coach);
  tapCoach(coach);
  assert.equal(Object.keys(state.settings.boardAcks || {}).length, 1,
    "the press after a reading no longer marks the job as taken");
});

test("Clear the board asks first, clears everything, and writes the empty rather than deleting it (v184)", () => {
  // The one control on this screen that throws information away, and the one whose
  // storage shape is not the obvious one: the sync engine tells a phone with no opinion
  // from a phone that has decided to empty a key by whether the key is SPOKEN in what it
  // publishes (see the v181 rules in sync.js). Deleting would make the clear silent, and
  // the other phone's rule 3 would put every cleared tick straight back.
  setNow("2026-09-22T04:30:00");
  const state = makeState(TWO_HANDS);
  const b = board(state);
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();

  // Drawn and quiet while there is nothing to clear, rather than absent.
  const buttonOf = (label) => walk(b.root).find((n) => n.tagName === "BUTTON" && textOf(n).trim() === label);
  const clear = () => buttonOf("Clear the board");
  assert.ok(clear(), "the Clear press is not on the board at all");
  assert.equal(clear().disabled, true, "the Clear press is live with nothing marked as taken");
  assert.match(textOf(b.root), /Nothing is marked as taken, so there is nothing to clear yet\./,
    "the board does not say why its Clear press is quiet");

  // One tap on each row's first job. Each row is read off the live screen rather than
  // held across the previous tap, because a tick says the screen again.
  tapCoach(coachesOf(peopleRows(b.root)[0])[0]);
  tapCoach(coachesOf(peopleRows(b.root)[1])[0]);
  const ticked = Object.keys(state.settings.boardAcks).length;
  assert.equal(ticked, 2, `two taps on two rows marked ${ticked} jobs`);
  flushTicks();
  assert.equal(clear().disabled, false, "the Clear press is still quiet with jobs marked as taken");
  assert.ok(walk(b.root).filter((n) => hasClass(n, "tl-coach") && hasClass(n, "ack")).length >= 2,
    "the ticked coaches are not drawn green");

  // It asks, and the question names what it is about to throw away.
  for (const f of clear()._listeners.click || []) f({ type: "click", button: 0, target: clear() });
  const question = textOf(layers["confirm-layer"]);
  assert.match(question, /Clear the board\?/, `the Clear press asks nothing: "${question}"`);
  assert.match(question, /2 jobs are marked as taken/, `the question does not say what it will clear: "${question}"`);
  assert.ok(confirmButtons().some((n) => hasClass(n, "danger")),
    "the press that discards real information is not dressed as one");
  // Cancel leaves everything exactly as it was.
  pressConfirm("Cancel");
  assert.equal(Object.keys(state.settings.boardAcks).length, 2, "cancelling the Clear press cleared something anyway");

  // And answering it clears every coach, writes the EMPTY map, and never deletes the key.
  for (const f of clear()._listeners.click || []) f({ type: "click", button: 0, target: clear() });
  pressConfirm("Clear the board");
  assert.equal("boardAcks" in state.settings, true, "the Clear press deleted the tick map, so the other phone reads the clear as ignorance and puts every tick back");
  assert.deepEqual(state.settings.boardAcks, {}, `the cleared board holds ${JSON.stringify(state.settings.boardAcks)}`);
  // And the empty map is SAVED, which is the whole point of writing it rather than
  // deleting: a clear that only emptied the object in memory and never reached the store
  // would leave the phone's own saved file holding every tick, and reading it back would
  // put the whole board green again. Read off the store for that reason.
  const saved = JSON.parse(localStorage.getItem("bakeadmin.v1") || "null");
  assert.ok(saved && saved.settings, "the Clear press saved nothing at all");
  assert.equal("boardAcks" in saved.settings, true,
    "the clear reached the screen and not the store, so reopening the app reads every tick back");
  assert.deepEqual(saved.settings.boardAcks, {},
    `the saved board still holds ${JSON.stringify(saved.settings.boardAcks)} after it was cleared`);
  // Read what it said BEFORE the screen is drawn again: a redraw starts the page's body
  // over, and the app's own toast is a child of it, so the words are gone with the redraw.
  assert.match(lastToast(), /every job is unanswered again/, "the Clear press did not say what it had done");
  const after = board(state);
  flushTicks();
  assert.equal(walk(after.root).filter((n) => hasClass(n, "tl-coach") && hasClass(n, "ack")).length, 0,
    "a coach is still green after the board was cleared");
});

test("a reading never claims to be now, and the day's own line is not on this window (v184)", () => {
  setNow("2026-09-22T04:30:00");
  const b = board(makeState(TWO_HANDS));
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  flushTicks();
  const clock = theClock(b.root)[0];
  const lab = clockLabOf(clock);
  const row = peopleRows(b.root)[0];
  const coach = coachesOf(row)[0];
  const live = textOf(lab);

  gesture(pane, "pointerdown", 150, 20, coach);
  gesture(pane, "pointermove", 200, 21, coach);
  assert.equal(clock.classList.contains("reading"), true, "the line she is reading is not marked as a reading");
  assert.notEqual(textOf(lab), live, "the reading says the live clock, so nothing about it can be read");
  // The reading is the clock time, in words, and NOT a sentence about where the day is.
  // A board parked before her day or after it has a `nowNote` of its own ("day starts…"),
  // and that sentence belongs to the line above; a reading that borrowed it would be a
  // reading saying the day has not begun while it is standing in the middle of it.
  assert.match(textOf(lab), /^\d{1,2}:\d{2} [ap]m$/, `the reading says "${textOf(lab)}", which is not a clock time`);
  assert.ok(!/now|day (starts|ended)/i.test(textOf(lab)), `the reading borrows the day's own sentence: "${textOf(lab)}"`);
  // A reading is NOT the colour of the day's own line: red on this chart means the
  // minute the morning is at, and it must never mean anything else.
  assert.match(cssBody("\\.tl-clock\\.reading"), /background:\s*var\(--brown\)/,
    "a reading is drawn in the colour of the minute the day is actually at");

  // And the board's own now-line is not drawn down this window at all: the axis under
  // this strip is WORK and not time, so a line placed at a minute would be pointing at
  // nothing. It stays in the DOM — one clock is placed in both windows from one
  // computation — and it is hidden here.
  const now2 = walk(pane).find((n) => hasClass(n, "tl-now"));
  assert.ok(now2, "the workers' window lost the day's own line altogether");
  assert.equal(now2.hidden, true, "the day's own line is drawn down a strip that has no minute axis");
});

test("the board's strip can never scroll sideways, and the planner's window still can (v184)", () => {
  // The strip is placed by translating it against a centre, so a pane that could also be
  // panned sideways would have two ways to move the line — and the centre would leave the
  // middle the moment a worker panned. This is also what makes the drag unambiguous.
  const b = board();
  const p = render(renderScenario, makeState());
  // The class is on the PANE and not on the row, because it is the window that scrolls —
  // and because `.tl-pane-people.train` is the one selector the whole train block hangs
  // off, so a screen without it is a screen drawing the planner's rows.
  assert.ok(hasClass(peoplePaneOf(b.root), "train"), "the board's workers' window does not say it is a train");
  assert.equal(hasClass(peoplePaneOf(p.root), "train"), false,
    "the planner's workers' window is a train, so the two screens' people rows are one drawing again");
  assert.match(cssBody("\\.tl-pane-people\\.train"), /overflow-x:\s*hidden/,
    "the board's strip may be panned sideways, so the centre the clock stands at is not the centre of the line");
  // And the planner's window keeps its own pan untouched: the pan is the rule every
  // window shares, and a guard that took it off a board by taking it off every window
  // would be a board fixed by breaking the screen it was copied from.
  assert.match(cssBody("\\.tl(?![\\w-])"), /overflow:\s*auto/,
    "the pan every window shares has gone, so the planner can no longer move its day");
  assert.ok(!/overflow-x:\s*hidden/.test(cssBody("\\.tl-pane-people(?![\\w.-])")),
    "the planner's window has lost its sideways pan along with the board's");
  // The trains are drawn nowhere but the board: a row on the planner is a strip of time.
  assert.equal(walk(p.root).filter((n) => hasClass(n, "tl-train")).length, 0,
    "the planner is drawing trains, so its rows are no longer the day's own axis");

  // And the tie is off in the WIRING, not only in the stylesheet — the stylesheet cannot
  // stop a write the panes' own code makes. On the planner the two windows share one
  // position: whichever one carries the hand brings the other. On a board the workers'
  // strip is nobody's follower, and no right press on it starts a pan.
  const procOf = (root) => walk(root).find((n) => hasClass(n, "tl-pane-proc"));
  const scrolls = (from, to) => { from.scrollLeft = 300; from.dispatchEvent({ type: "scroll" }); flushFrames(); return to.scrollLeft; };
  const rightPress = (pane) => { pane.dispatchEvent({ type: "pointerdown", button: 2, buttons: 2, clientX: 40, clientY: 20, pointerId: 7, target: pane }); return pane.classList.contains("tl-dragging"); };
  for (const win of [peoplePaneOf(b.root), peoplePaneOf(p.root), procOf(b.root)]) win.clientWidth = 375;
  assert.equal(scrolls(peoplePaneOf(p.root), procOf(p.root)), 300,
    "the planner's two windows no longer move together, so the guard took the pan off the screen it was copied from");
  assert.equal(scrolls(peoplePaneOf(b.root), procOf(b.root)), 0,
    "a scroll on the board's workers' window moved the modules' window with it");
  assert.equal(rightPress(peoplePaneOf(p.root)), true,
    "the planner's people window no longer takes a right-press pan");
  assert.equal(rightPress(peoplePaneOf(b.root)), false,
    "a right press on the board's strip started a pan it cannot make");
  // The third tie-up, and the one a stylesheet cannot make either — the reading drawn in
  // both windows at once. A pointer moved along the modules' window puts a hairline in
  // the people's too; a board's strip has no minutes under it for a hairline to stand on,
  // so it stays hidden there.
  const hairline = (root) => walk(peoplePaneOf(root)).find((n) => hasClass(n, "tl-cursor"));
  const readOver = (root) => {
    const proc = procOf(root);
    proc.dispatchEvent({ type: "pointermove", clientX: 200, clientY: 20, target: proc });
    return hairline(root).hidden;
  };
  assert.equal(readOver(p.root), false, "the planner's reading is no longer drawn in both windows at once");
  assert.equal(readOver(b.root), true, "a hairline is drawn down the board's strip, which has no minutes under it");
});

test("no beat puts a word of nothing on the board, whichever minute it is standing at (v184)", () => {
  // A board's beat runs once a second all morning, and the two ways it can go wrong are
  // both silent: a strip placed at `translateX(NaNpx)` is a train that has vanished, and a
  // countdown that reads "undefinedm" is a number nobody can act on. Driven here at a
  // minute inside the day, at one before it, and at the middle of the night after it —
  // the three places boardNow parks the clock at an edge, where a map that was asked for
  // a minute outside the row's own strip has to answer with a number.
  setNow("2026-09-22T04:00:00");
  const b = board(makeState(TWO_HANDS));
  const pane = peoplePaneOf(b.root);
  pane.clientWidth = 375;
  const at = (iso) => { setNow(iso); flushTicks(); };
  for (const iso of ["2026-09-22T03:00:00", "2026-09-22T04:13:00", "2026-09-22T04:45:00",
    "2026-09-22T06:03:00", "2026-09-22T14:00:00", "2026-09-22T23:30:00"]) {
    at(iso);
    assert.equal(boardStrays(b.root), null, `the board put a broken number on itself at ${iso}`);
    // And every strip is placed by a real number at every one of them — a transform that
    // is missing is as blank a screen as one that says NaN, and reads as "never placed".
    for (const row of peopleRows(b.root)) placedLeft(row);
    assert.match(textOf(clockLabOf(theClock(b.root)[0])), /^\d{1,2}:\d{2} [ap]m$/,
      `the clock reads nothing a worker can use at ${iso}`);
  }
});

test("the train's map answers with a number, whatever it is asked (v184)", () => {
  // This is the guard that matters most on a live screen: a `translateX(NaNpx)` is a
  // train that has vanished, not an error anybody is shown. So the two maps are asked
  // for a row with no jobs, for a minute that is not a number, and for a minute
  // outside her day altogether.
  assert.equal(xOfMinute([], 5), 0, "a row with no jobs gave back something that is not a number");
  assert.equal(minuteAtTrainX([], 5), 0);
  assert.equal(xOfMinute(TRAIN_SEG, NaN), 10, "a minute that is not a number was not parked at the day's own edge");
  assert.equal(minuteAtTrainX(TRAIN_SEG, undefined), 0);
  assert.equal(xOfMinute(TRAIN_SEG, -30), 10, "an hour before her day did not park the train at its edge");
  assert.equal(xOfMinute(TRAIN_SEG, 900), 350, "the middle of the night threw the train off the end of the line");
  assert.equal(minuteAtTrainX(TRAIN_SEG, -40), 0);
  assert.equal(minuteAtTrainX(TRAIN_SEG, 4000), 28);
  for (const v of [xOfMinute(TRAIN_SEG, 0), xOfMinute(TRAIN_SEG, 28),
    minuteAtTrainX(TRAIN_SEG, 0), minuteAtTrainX(TRAIN_SEG, 4000)]) {
    assert.ok(Number.isFinite(v), `the map answered ${v}`);
  }
});
