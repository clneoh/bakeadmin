// test/store-track-money.test.js — Engine v199: the customer's track card shows how the
// total adds up, in the same figures and the same order as their WhatsApp message.
//
// Her report, 25 Sep 2026: the message has to show how the total adds up, "and the Track
// message need to show how the total add up also". The card used to name the courier's
// charge and then squeeze the goods and the total onto ONE line joined by a dash:
//
//   Courier charge: RM 8.00
//   Focaccia x2 — RM 38.00
//
// which names the charge but never shows the goods' own figure, so there is no addition
// to read. It now draws the goods, their subtotal, the charge, and the total.
//
// Two rules hold this file together:
//
//   • The subtotal is WORKED OUT, not read. Only the total is published as a figure the
//     card can print (a display string like "RM 38.00"); the courier's charge is published
//     as a number, and it is INSIDE the total unless the courier collects it at the door.
//     So the goods are the total less that part. Getting this backwards would print an
//     items subtotal of RM38 on an order the customer is being asked RM38 for, with an RM8
//     charge named above it — a card that does not add up, which is what it looked like
//     before. The COD case below is the one that catches that.
//   • The emphasis is a CLASS, not a character. The message bolds its total with a pair of
//     asterisks because WhatsApp has no other way; the card is a page, so it carries a
//     class and is styled. A card printing the asterisks would be the WhatsApp message
//     leaking onto the web page, so this file asserts they are NOT there.
//
// A total that cannot be read as a number falls back to the single line the card has
// always drawn — measured below — because a subtitle invented from an unreadable figure is
// worse than no subtotal.

import { test } from "node:test";
import assert from "node:assert/strict";

// ── Minimal DOM shim (the shape test/store-trip.test.js uses) ────────────────
function createEl(tag) {
  const classes = new Set();
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    hidden: false, scrollLeft: 0, _listeners: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, on) => {
        if (on === undefined ? !classes.has(c) : on) classes.add(c);
        else classes.delete(c);
      },
    },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener(t, f) { this._listeners[t] = (this._listeners[t] || []).filter((x) => x !== f); },
    scrollIntoView() {},
    setAttribute(k, v) {
      this.attrs[k] = String(v);
      if (k === "href" || k === "title" || k === "rel") this[k] = String(v);
    },
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
  documentElement: createEl("html"),
  body: createEl("body"),
};
globalThis.window = { open() {} };
Object.defineProperty(globalThis, "navigator", {
  value: { language: "en-US" }, configurable: true, writable: true,
});
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.location = { search: "" };

const TRACK_ROW = { row: null };
globalThis.fetch = async (url) => {
  const href = String(url);
  if (href.includes("/rest/v1/order_tracking")) {
    return { ok: true, json: async () => (TRACK_ROW.row ? [TRACK_ROW.row] : []) };
  }
  return { ok: true, json: async () => [] };
};

const { trackOrder } = await import("../store/app.js");
await new Promise((r) => setTimeout(r, 0));

// ── reading the drawn card ───────────────────────────────────────────────────
const box = () => registry["track-result"];

function lines(node, out = []) {
  for (const kid of node.children || []) {
    if (kid.nodeType === 3) { out.push(String(kid.text)); continue; }
    lines(kid, out);
  }
  return out;
}

// Every paragraph under `root`, each with the class it was drawn with — because on this
// card the class IS the emphasis. The total is bold because it carries .track-total, and a
// test that read only the words could not tell a styled total from an unstyled one.
function allParas(root, out = []) {
  for (const kid of root.children || []) {
    if (kid.nodeType !== 1) continue;
    if (String(kid.tagName).toLowerCase() === "p") {
      out.push({ text: lines(kid).join(""), cls: String(kid.className || "") });
      continue;
    }
    allParas(kid, out);
  }
  return out;
}

// The .track-details box, which is where the money lives. Read on its own so the ordered
// assertions below are about the delivery and the figures and nothing else on the card.
function detailsNode(node = box()) {
  if (String(node.className || "").split(/\s+/).includes("track-details")) return node;
  for (const kid of node.children || []) {
    if (kid.nodeType !== 1) continue;
    const found = detailsNode(kid);
    if (found) return found;
  }
  return null;
}

async function card(row) {
  TRACK_ROW.row = row;
  await trackOrder("A3F9C2");
  return allParas(box());
}
const texts = (read) => read.map((p) => p.text);
const withClass = (read, cls) => read.filter((p) => p.cls.split(/\s+/).includes(cls));
const money = () => texts(allParas(detailsNode()));

const base = {
  status: "baking", confirmed_sent: true, paid_received: true,
  delivery: "Wed, 30 Sep", items: "Focaccia x2", customer: "Mei Ling",
};

// ── the addition ─────────────────────────────────────────────────────────────
test("the card shows the goods, their subtotal, the charge and the total — in that order", async () => {
  await card({ ...base, total: "RM 38.00", courier_fee: 8 });
  assert.deepEqual(money(), [
    "Wed, 30 Sep",
    "Items: Focaccia x2",
    "Items total: RM 30.00",
    "Courier charge: RM 8.00",
    "Total: RM 38.00",
  ], `the RM8 charge shown coming off the RM30 of goods, reaching the RM38 asked for: ${JSON.stringify(money())}`);
});

test("a COD charge is NOT taken off the subtotal, because it is not inside the total", async () => {
  // The one case that catches a derivation written the wrong way round: the courier
  // collects the RM8 at the door, so the total published is the goods ALONE (RM30) and the
  // subtotal must read RM30 — not RM30 minus a charge that was never added to it.
  await card({ ...base, total: "RM 30.00", courier_fee: 8, courier_cod: true });
  assert.deepEqual(money(), [
    "Wed, 30 Sep",
    "Items: Focaccia x2",
    "Items total: RM 30.00",
    "Courier charge: RM 8.00 - COD, pay the courier on delivery",
    "Total: RM 30.00",
  ], `the charge named without being asked for twice: ${JSON.stringify(money())}`);
});

test("with no charge the subtotal still stands above the total", async () => {
  await card({ ...base, total: "RM 30.00" });
  assert.deepEqual(money(), [
    "Wed, 30 Sep",
    "Items: Focaccia x2",
    "Items total: RM 30.00",
    "Total: RM 30.00",
  ], `two lines that agree, rather than a figure from nowhere: ${JSON.stringify(money())}`);
});

test("a charge the baker absorbed is not published, so the card does not draw one", async () => {
  // `courier_fee` is null for a charge she paid: it is her own cost and never reaches the
  // customer's card. The subtotal must not move either, because the total it came from
  // never carried it.
  await card({ ...base, total: "RM 30.00", courier_fee: null });
  assert.ok(money().includes("Items total: RM 30.00"));
  assert.ok(money().includes("Total: RM 30.00"));
  assert.equal(money().some((s) => s.startsWith("Courier charge")), false,
    "telling the customer about a charge they do not owe would ask them for money");
});

test("the money is counted in the currency the total was published in", async () => {
  // The symbol comes off the published total rather than out of a constant, so a shop
  // priced in something else cannot end up with its subtotal written in ringgit.
  await card({ ...base, total: "$ 38.00", courier_fee: 8 });
  assert.deepEqual(money().slice(2), [
    "Items total: $ 30.00",
    "Courier charge: $ 8.00",
    "Total: $ 38.00",
  ], `the published currency and no other: ${JSON.stringify(money())}`);
});

test("a thousands separator in the published total is read straight through", async () => {
  // fmtRM writes two decimals and no separator, so this is not a shape her app produces
  // today — it is the tolerance for one that changes its mind, checked rather than assumed.
  await card({ ...base, total: "RM 1,038.00", courier_fee: 8 });
  assert.ok(money().includes("Items total: RM 1030.00"), `read and subtracted: ${JSON.stringify(money())}`);
  assert.ok(money().includes("Total: RM 1038.00"));
});

// ── the emphasis ─────────────────────────────────────────────────────────────
test("the total is set apart by a class, and carries no WhatsApp markers", async () => {
  const read = await card({ ...base, total: "RM 38.00", courier_fee: 8 });
  const totals = withClass(read, "track-total");
  assert.equal(totals.length, 1, "exactly one line is the total");
  assert.equal(totals[0].text, "Total: RM 38.00",
    "and it is the figure, with no asterisks — those are the message's way of bolding, not this page's");
  assert.equal(totals[0].text.includes("*"), false,
    "a card printing the asterisks would be the WhatsApp message leaking onto the page");

  // The workings recede instead: the subtotal and the charge are muted, the charge flagged
  // as its own kind of line, so the eye lands on the total rather than on the RM8.
  const sub = withClass(read, "track-note").map((p) => p.text);
  assert.ok(sub.includes("Items total: RM 30.00"), `the subtotal is a muted working: ${JSON.stringify(sub)}`);
  assert.ok(sub.includes("Courier charge: RM 8.00"), "and so is the charge");
  assert.equal(withClass(read, "track-fee").map((p) => p.text).join("|"), "Courier charge: RM 8.00",
    "the charge keeps the class it has always carried, above the total it is part of");
});

test("the goods are labelled, so the list above a stack of figures says what it is", async () => {
  await card({ ...base, total: "RM 38.00", courier_fee: 8, items: "Focaccia x2, Sandwich x1" });
  assert.ok(money().includes("Items: Focaccia x2, Sandwich x1"),
    "the same word the WhatsApp message uses for the same thing");
});

// ── the fallback ─────────────────────────────────────────────────────────────
test("a total that cannot be read as a number maps the goods and the total onto one line", async () => {
  // The line this card drew before v199, kept for a total the page cannot parse — a build
  // older than this one, or anything a later change publishes. A subtotal worked out from
  // an unreadable figure would be a number this page made up, which is worse than none.
  for (const odd of ["", "Ask us", "to be confirmed", null, undefined]) {
    await card({ ...base, total: odd });
    assert.deepEqual(money(), ["Wed, 30 Sep", `Focaccia x2 — ${String(odd == null ? "" : odd)}`],
      `nothing is derived from ${JSON.stringify(odd)}`);
  }
});

test("a number with a space after it is still a number", async () => {
  // Trailing space, then read: the parse takes the figure and the symbol before it, so a
  // stray space cannot push an order onto the fallback line and quietly cost it the sum.
  // The total is then written from the figure rather than echoed, so it comes out the same
  // two-decimal shape as every other figure on the card.
  await card({ ...base, total: "RM 38.00 ", courier_fee: 8 });
  assert.deepEqual(money().slice(1), [
    "Items: Focaccia x2",
    "Items total: RM 30.00",
    "Courier charge: RM 8.00",
    "Total: RM 38.00",
  ], `read normally, in the card's own shape: ${JSON.stringify(money())}`);
});
