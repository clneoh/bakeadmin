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
  // The REAL document has these. A shim without them is not a smaller DOM, it is a
  // different one: the shop registers a visibilitychange listener at start-up (v292),
  // and a missing method is a TypeError at import — every store test dies at once.
  _docListeners: {},
  addEventListener(t, f) { (this._docListeners[t] ||= []).push(f); },
  removeEventListener() {},
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
      // The NODE is kept beside its text, because a money row's shape is the two spans
      // inside it and not the words it makes when they are run together (v277).
      out.push({ text: lines(kid).join(""), cls: String(kid.className || ""), node: kid });
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

// A money row is TWO spans — the words on the left, the figure on the right — so that the
// figures form one column down the card (v277). Reading the element's text alone would run
// the two halves together ("Items totalRM 30.00"), so a row is read back here as the
// sentence it makes; the column itself is checked separately, just below, by reading each
// half where it sits.
function sentence(p) {
  const kids = (p.node.children || []).filter((c) => c.nodeType === 1);
  if (!kids.length) return p.text;
  const label = lines(kids[0]).join(" ").trim();
  const value = kids[1] ? lines(kids[1]).join("").trim() : "";
  return value ? `${label}: ${value}` : label;
}
const money = () => allParas(detailsNode()).map(sentence);

// The two halves of every money row, in the order the card draws them. This is the shape
// the CSS turns into a column: a label that takes the room, and a figure that does not.
function halves(cls) {
  return allParas(detailsNode()).filter((p) => p.cls.split(/\s+/).includes(cls))
    .map((p) => (p.node.children || []).filter((c) => c.nodeType === 1));
}

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
    "Courier charge — COD, pay the courier on delivery: RM 8.00",
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

// ── the promo (v272, 2 Oct 2026) ─────────────────────────────────────────────
// The code comes off the customer's total in every message AND here, so the card is the
// fourth place that has to move with it. The published total is already net of the
// discount, so the card — which derives the goods by subtracting the charge from that
// total — must add the discount back first, or the same mistake the COD case above
// catches appears from the other side: a subtotal RM10 short of what was sold.
test("a code on the order is named between the charge and the total", async () => {
  await card({ ...base, total: "RM 30.00", courier_fee: 8, promo_code: "FRESH10", promo_rm: 10 });
  assert.deepEqual(money(), [
    "Wed, 30 Sep",
    "Items: Focaccia x2",
    "Items total: RM 32.00",
    "Courier charge: RM 8.00",
    "Promo FRESH10: -RM 10.00",
    "Total: RM 30.00",
  ], `the RM10 put back to find the goods, then named again as what came off: ${JSON.stringify(money())}`);
});

test("the promo line is a muted working, and the total keeps the emphasis", async () => {
  const read = await card({ ...base, total: "RM 30.00", courier_fee: 8, promo_code: "FRESH10", promo_rm: 10 });
  assert.equal(withClass(read, "track-promo").map(sentence).join("|"), "Promo FRESH10: -RM 10.00",
    "the line carries its own class, beside the charge's, above the total");
  assert.equal(withClass(read, "track-total").map(sentence).join("|"), "Total: RM 30.00",
    "and the figure they are asked for is still the only bold one");
  assert.equal(withClass(read, "track-total")[0].text.includes("*"), false,
    "no asterisks — that is the WhatsApp message's way of bolding, not this page's");
});

test("an order with no code draws no promo line", async () => {
  // The same guard the messages carry: a null column must leave the line out, not print
  // an empty label or a discount of nothing.
  await card({ ...base, total: "RM 30.00", courier_fee: 8, promo_code: null, promo_rm: null });
  assert.equal(money().some((s) => s.startsWith("Promo")), false,
    `nothing said about a code that was never used: ${JSON.stringify(money())}`);
  assert.deepEqual(money().slice(2), [
    "Items total: RM 22.00",
    "Courier charge: RM 8.00",
    "Total: RM 30.00",
  ], "the goods derived as the total less the charge inside it — nothing added back, nothing taken off");
});

test("a code with no charge beside it still adds up", async () => {
  // A self-collect order, or a code on an order she is delivering herself: goods, the
  // discount, the total — the two lines that agree, one of them showing the working.
  await card({ ...base, total: "RM 20.00", promo_code: "FRESH10", promo_rm: 10 });
  assert.deepEqual(money().slice(2), [
    "Items total: RM 30.00",
    "Promo FRESH10: -RM 10.00",
    "Total: RM 20.00",
  ]);
});

// ── the emphasis ─────────────────────────────────────────────────────────────
test("the total is set apart by a class, and carries no WhatsApp markers", async () => {
  const read = await card({ ...base, total: "RM 38.00", courier_fee: 8 });
  const totals = withClass(read, "track-total");
  assert.equal(totals.length, 1, "exactly one line is the total");
  assert.equal(sentence(totals[0]), "Total: RM 38.00",
    "and it is the figure, with no asterisks — those are the message's way of bolding, not this page's");
  assert.equal(totals[0].text.includes("*"), false,
    "a card printing the asterisks would be the WhatsApp message leaking onto the page");

  // The workings recede instead: the subtotal and the charge are muted, the charge flagged
  // as its own kind of line, so the eye lands on the total rather than on the RM8.
  const sub = withClass(read, "money-row").map(sentence);
  assert.ok(sub.includes("Items total: RM 30.00"), `the subtotal is a muted working: ${JSON.stringify(sub)}`);
  assert.ok(sub.includes("Courier charge: RM 8.00"), "and so is the charge");
  assert.equal(withClass(read, "track-fee").map(sentence).join("|"), "Courier charge: RM 8.00",
    "the charge keeps the class it has always carried, above the total it is part of");
});

// ── the column itself (v277) ─────────────────────────────────────────────────
// Her report, 2 Oct 2026: "the format still not as clear as a receipt, the money have to
// align up ... line up in one column". A column is a SHAPE, so it is checked as one: every
// money line is a row of exactly two spans, the last of which is the figure and carries
// the class the stylesheet aligns and gives tabular digits to. A row drawn with the figure
// folded back into its words — which is what this card used to do — fails here even though
// its text would still read correctly, which is the whole point: the arithmetic tests above
// cannot see the difference between RM 30.00 on its own right edge and RM 30.00 trailing a
// label, and she can.
test("every money line is one row of a label and a figure, in that order", async () => {
  const read = await card({ ...base, total: "RM 38.00", courier_fee: 8, promo_code: "FRESH10", promo_rm: 5 });
  const rows = halves("money-row");
  assert.equal(rows.length, 4, `subtotal, charge, code and total: ${JSON.stringify(money())}`);
  for (const [label, value] of rows) {
    assert.ok(label && String(label.className || "").split(/\s+/).includes("money-label"),
      "the words come first, in the label span");
    assert.ok(value && String(value.className || "").split(/\s+/).includes("money-val"),
      "and the figure comes last, in the span the stylesheet pushes right");
  }
  assert.deepEqual(rows.map(([, v]) => lines(v).join("")),
    ["RM 35.00", "RM 8.00", "-RM 5.00", "RM 38.00"],
    "each figure is its own element, so the four stack into one column");
});

test("the figure is the last thing on the row, so nothing can sit to its right", async () => {
  // The one figure on the card that carries a rider — a COD charge — puts that rider in
  // the LABEL, not after the money: anything drawn to the right of the figure would move
  // it off the column, and the column is the whole request.
  const read = await card({ ...base, total: "RM 30.00", courier_fee: 8, courier_cod: true });
  const rows = halves("money-row");
  const cod = rows[1];
  assert.equal(lines(cod[1]).join(""), "RM 8.00", "the charge's figure, alone on the right");
  assert.ok(lines(cod[0]).join(" ").includes("COD"),
    `with the words it explains on the left: ${lines(cod[0]).join(" ")}`);
  for (const row of rows) {
    assert.equal(String(row[row.length - 1].className).split(/\s+/).includes("money-val"), true,
      "and every row on the card ends with its figure");
  }
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
