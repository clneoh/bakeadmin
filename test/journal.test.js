// test/journal.test.js — a book that can leave the screen (v282).
//
// Her words: "those journals in profits and other journals should be printable and able to be
// shared". What this file pins is NOT the layout — it is the one promise the build rests on:
// the screen, the paper and the shared message are three renderings of ONE description, so
// they cannot disagree about a row or a total. Everything below is either that invariant or
// one of the two presses' failure paths, which are the places a "share" quietly goes wrong.

import { test } from "node:test";
import assert from "node:assert/strict";

// A stand-in screen, deliberately unforgiving: classList is real and keeps className in step,
// and getElementById searches the document the way a browser does — a forgiving shim would
// have hidden the one bug this file exists to catch (a second Print press reusing a layer the
// first press had already emptied). See the strict-shim rule in the project's own notes.
function domShim() {
  const walk = (n, out = []) => { for (const c of n.children || []) { out.push(c); walk(c, out); } return out; };
  const createEl = (tag) => {
    const node = {
      tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
      _classes: new Set(), style: {}, value: "", checked: false, selected: false,
      disabled: false, hidden: false, _listeners: {},
      appendChild(c) { if (c != null) this.children.push(c); return c; },
      append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
      replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
      addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
      removeEventListener(t, f) { this._listeners[t] = (this._listeners[t] || []).filter((g) => g !== f); },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k]; },
      focus() {}, click() {},
    };
    Object.defineProperty(node, "className", {
      get() { return [...node._classes].join(" "); },
      set(v) { node._classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
    });
    node.classList = {
      add(...cs) { for (const c of cs) if (c) node._classes.add(c); },
      remove(...cs) { for (const c of cs) node._classes.delete(c); },
      toggle(c, on) {
        const want = on === undefined ? !node._classes.has(c) : !!on;
        if (want) node._classes.add(c); else node._classes.delete(c);
        return want;
      },
      contains(c) { return node._classes.has(c); },
    };
    Object.defineProperty(node, "textContent", {
      get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
      set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
    });
    return node;
  };
  const body = createEl("body");
  globalThis.document = {
    createElement: createEl,
    createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
    getElementById: (id) => [body, ...walk(body)].find((n) => n.attrs && n.attrs.id === id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body,
  };
  return { body, createEl };
}
const screen = domShim();

const { journalSheet, buildJournalText, journalSheetEl, shareJournal, printJournal,
  journalButtons, bakeryName } = await import("../admin/js/journal.js");
const { fmtRM } = await import("../admin/js/state.js");

const sheetOf = (over = {}) => journalSheet({
  title: "Sales journal",
  subtitle: "Sales · September 2026",
  lines: [
    { what: "10 Sep · Focaccia · Bee", amount: 30 },
    { what: "12 Sep · Sourdough · Ali", amount: 12.5 },
  ],
  totals: [{ label: "Total", amount: 42.5 }],
  where: "More → Profit",
  bakery: "Jien Luv 2 Bake",
  ...over,
});

const walk = (n, out = []) => { for (const c of n.children || []) { out.push(c); walk(c, out); } return out; };

// Every row of money the sheet draws, in order, as [words, figure] — the lines and then the
// totals, which is the order a reader meets them in on the page and in the message.
const moneyRows = (node) => walk(node)
  .filter((n) => String(n.className).includes("info-row"))
  .map((n) => [n.children[0].textContent, n.children[1].textContent]);

const lineStarting = (text, starts) => text.split("\n").find((l) => l.startsWith(starts));

// ── one description, three renderings ────────────────────────────────────────

test("the paper and the message are the same book as the screen", () => {
  const s = sheetOf();
  const expected = [
    ...s.lines.map((l) => [l.what, fmtRM(l.amount)]),
    ...s.totals.map((t) => [t.label, fmtRM(t.amount)]),
  ];
  assert.deepEqual(moneyRows(journalSheetEl(s)), expected,
    "the printed sheet shows the sheet's own rows, in the sheet's own order");

  const text = buildJournalText(s);
  for (const [what, figure] of expected) {
    assert.ok(text.includes(what), `the shared message carries "${what}"`);
    assert.ok(text.includes(figure), `the shared message carries ${figure}`);
  }
  const total = lineStarting(text, "Total");
  assert.ok(total.endsWith(fmtRM(42.5)), `the message's total is the sheet's total, not a second sum: ${total}`);
});

test("the figure on the paper is the figure on the screen, to the cent", () => {
  // The Money screen writes a movement out as "−RM 8.00". A sheet that let each renderer
  // choose would print "RM -8.00" on one and "−RM 8.00" on the other, which is exactly the
  // disagreement this module exists to make impossible.
  const s = sheetOf({ lines: [
    { what: "10 Sep · a sale", amount: 30 },
    { what: "10 Sep · flour", amount: 8, dir: "out" },
  ], totals: [] });
  const dom = moneyRows(journalSheetEl(s));
  assert.equal(dom[1][1], "−RM 8.00");
  assert.equal(lineStarting(buildJournalText(s), "10 Sep · flour").endsWith("−RM 8.00"), true);
  assert.equal(lineStarting(buildJournalText(s), "10 Sep · a sale").includes("−"), false,
    "money that arrived carries no direction");
});

test("a heading is a heading — its own words and no money column", () => {
  const s = sheetOf({
    lines: [
      { what: "Sales", amount: 42.5 },
      { what: "Running costs", heading: true },
      { what: "Packaging", amount: -8 },
    ],
    totals: [{ label: "Total expenses", amount: -8 }],
  });
  const text = buildJournalText(s);
  assert.ok(text.split("\n").includes("Running costs"), "the heading gets a line of its own");
  assert.equal(text.split("\n").some((l) => /^Running costs\s/.test(l)), false,
    "nothing is padded onto a heading, so it cannot be read as a figure");

  const section = walk(journalSheetEl(s)).find((n) => String(n.className).includes("js-section"));
  assert.equal(section.textContent, "Running costs");
  assert.equal(section.children.length, 1, "a heading carries no value node to hold a figure");
});

test("a note of more than one paragraph prints as more than one paragraph", () => {
  const s = sheetOf({ note: "First thing.\n\nSecond thing." });
  const notes = walk(journalSheetEl(s)).filter((n) => String(n.className).includes("js-note"));
  assert.deepEqual(notes.map((n) => n.textContent), ["First thing.", "Second thing."],
    "a page has no other way to show a break, so a blank line has to become one");
  assert.ok(buildJournalText(s).includes("First thing.\n\nSecond thing."),
    "and the message keeps the same break");
});

test("an empty journal is still a document, and never invents a figure", () => {
  const s = sheetOf({ lines: [], totals: [], empty: "Nothing was sold in September 2026." });
  const text = buildJournalText(s);
  assert.ok(text.includes("Sales journal"), "it still says what it is");
  assert.ok(text.includes("Nothing was sold in September 2026."));
  assert.equal(/NaN|undefined|RM 0\.00/.test(text), false, "an empty book has no figure to print");

  const dom = journalSheetEl(s);
  assert.equal(moneyRows(dom).length, 0, "and no row of money at all");
  assert.equal(walk(dom).some((n) => n.textContent === "Nothing was sold in September 2026."), true);
});

test("an amount is carried as a number, never as a figure already written down", () => {
  // If a formatted string could get in here, the screen and the paper would be free to round
  // differently. Normalising on the way in is what closes that door.
  const s = journalSheet({ title: "x", lines: [{ what: "a", amount: "30.00" }], totals: [{ label: "Total", amount: "30" }] });
  assert.equal(s.lines[0].amount, 30);
  assert.equal(s.totals[0].amount, 30);
  assert.equal(typeof s.lines[0].amount, "number");
});

test("the sheet says whose books it is, in the shop's own name", () => {
  assert.equal(bakeryName({ settings: { storefront: { name: "  Jien Luv 2 Bake  " } } }), "Jien Luv 2 Bake");
  assert.equal(bakeryName({ settings: {} }), "Jienluv2bake");
  assert.equal(bakeryName(null), "Jienluv2bake");
});

test("every journal wears the same two presses, in the same order", () => {
  const btns = journalButtons(sheetOf());
  assert.deepEqual(btns.map((b) => b.textContent), ["Print", "Share"]);
  assert.equal(btns.every((b) => typeof b._listeners.click[0] === "function"), true);
});

// ── the Share press ─────────────────────────────────────────────────────────

test("Share hands the phone's own share sheet the journal as plain text", async () => {
  let shared = null; let copied = null;
  globalThis.navigator.share = (payload) => { shared = payload; return Promise.resolve(); };
  globalThis.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
  try {
    await shareJournal(sheetOf());
    assert.equal(shared.title, "Sales journal");
    assert.ok(shared.text.includes("Jien Luv 2 Bake — Sales journal"));
    assert.equal(copied, null, "a share that worked must not also copy");
  } finally {
    delete globalThis.navigator.share;
    delete globalThis.navigator.clipboard;
  }
});

test("her own cancel of the share sheet is a decision, not a fault", async () => {
  // The one behaviour here that would read as a bug: she opens the share sheet, changes her
  // mind, closes it — and the journal lands on her clipboard anyway.
  const abort = new Error("cancelled"); abort.name = "AbortError";
  let shared = null; let copied = null;
  globalThis.navigator.share = (payload) => { shared = payload; return Promise.reject(abort); };
  globalThis.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
  try {
    await shareJournal(sheetOf());
    assert.ok(shared, "the share sheet was asked");
    assert.equal(copied, null, "a cancel puts nothing on the clipboard behind her back");
  } finally {
    delete globalThis.navigator.share;
    delete globalThis.navigator.clipboard;
  }
});

test("a phone with no share sheet falls back to the clipboard, with the whole journal", async () => {
  let copied = null;
  globalThis.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
  try {
    await shareJournal(sheetOf());
    assert.equal(copied, buildJournalText(sheetOf()),
      "what reaches the clipboard is the same text the share sheet would have been handed");
  } finally {
    delete globalThis.navigator.clipboard;
  }
});

test("a share that genuinely failed still gets the journal out", async () => {
  let copied = null;
  globalThis.navigator.share = () => Promise.reject(new Error("no handler"));
  globalThis.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
  try {
    await shareJournal(sheetOf());
    assert.ok(copied && copied.includes("Sales journal"), "a real failure is what the copy is for");
  } finally {
    delete globalThis.navigator.share;
    delete globalThis.navigator.clipboard;
  }
});

// ── the Print press ─────────────────────────────────────────────────────────

const lastToast = () => walk(screen.body)
  .filter((n) => String(n.className).includes("toast")).pop();

test("a press that cannot print says so, and names the press that can", () => {
  printJournal(sheetOf());
  assert.equal(walk(screen.body).filter((n) => String(n.className).includes("print-layer")).length, 0,
    "a press that cannot print leaves no layer behind, and no sheet either");
  assert.equal(walk(screen.body).some((n) => String(n.className).includes("journal-sheet")), false);
  assert.match(lastToast().textContent, /can't print — use Share instead/,
    "a control that silently does nothing reads as a broken screen");
});

test("Print builds the sheet in its own layer, and clears both away afterwards", () => {
  const handlers = {};
  let printed = 0;
  globalThis.window = {
    print() { printed += 1; },
    addEventListener(t, f) { (handlers[t] ||= []).push(f); },
    removeEventListener(t, f) { handlers[t] = (handlers[t] || []).filter((g) => g !== f); },
  };
  try {
    printJournal(sheetOf());
    assert.equal(printed, 1);
    const layer = screen.body.children.find((n) => String(n.className).includes("print-layer"));
    assert.ok(layer, "the sheet is built somewhere the stylesheet can find it on its own");
    assert.equal(layer.children[0].className, "journal-sheet");
    assert.equal(screen.body.classList.contains("journal-print"), true,
      "the body says a journal is printing, so print.css can hide the app");
    assert.equal(walk(layer).some((n) => n.textContent === "Sales journal"), true);

    // The browser says it has finished printing.
    assert.equal(handlers.afterprint.length, 1);
    handlers.afterprint.forEach((f) => f());
    assert.equal(screen.body.classList.contains("journal-print"), false,
      "a class left behind would hide the whole app the next time anything printed");
    assert.equal(layer.children.length, 0, "and the sheet does not linger in the tree");
    assert.equal(handlers.afterprint.length, 0, "the listener is taken off again");
  } finally {
    delete globalThis.window;
  }
});

test("a second Print press reuses the first press's own layer", () => {
  // The trap the strict getElementById in the shim exists to catch: two layers would mean
  // print.css hides one of them and the sheet that reached paper is the wrong one.
  let printed = 0;
  globalThis.window = { print() { printed += 1; }, addEventListener() {}, removeEventListener() {} };
  try {
    printJournal(sheetOf());
    printJournal(sheetOf({ title: "Cost of sales journal" }));
    assert.equal(printed, 2);
    const layers = walk(screen.body).filter((n) => String(n.className).includes("print-layer"));
    assert.equal(layers.length, 1, "one layer, whichever press built it");
    assert.equal(walk(layers[0]).some((n) => n.textContent === "Cost of sales journal"), true,
      "and it holds the sheet from the press that just happened, not the one before");
  } finally {
    delete globalThis.window;
  }
});
