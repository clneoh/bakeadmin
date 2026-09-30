// test/label.test.js — packing-label content model. packingLabelData returns a
// flat {style, rows} model ([kind, text] pairs) that the label popup renders and
// that is exactly what prints, so asserting on rows = asserting on the printed
// sheet. Rows keep the order they print in and omit blanks.

import { test } from "node:test";
import assert from "node:assert/strict";

// DOM shim (ui.js's el() etc. touch document only when called). Same header as
// orders.test.js so this file can later render label sheets too.
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
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: () => createEl("div"),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: createEl("body"),
};
globalThis.window = { open() {} };

import { packingLabelData, splitOrderLine, lineNoteSuffix } from "../admin/js/views/orders.js";
import { orderCode } from "../admin/js/state.js";
import { shortDate } from "../admin/js/dates.js";

const D1 = "2026-09-04";
const brand = "Jienluv2bake";
const dateLine = shortDate(D1);

const products = [
  { id: "p1", name: "Focaccia" },
  { id: "p2", name: "Sourdough Loaf" },
];

function makeState(overrides = {}) {
  return {
    settings: { storefront: { name: brand } },
    deliveryDates: [{ id: "d1", date: D1 }],
    products,
    ...overrides,
  };
}

function group(...orders) {
  return { orders };
}

const singleOrder = (extra = {}) => ({
  id: "o_9f3ba44e", deliveryDateId: "d1", productId: "p1", qty: 2,
  customerName: "Ain", fulfillment: "collect", ...extra,
});

test("full label: brand, date+method, code, customer and one item per line", () => {
  const data = packingLabelData(makeState(), group(singleOrder()), "full");
  assert.deepEqual(data, {
    style: "full",
    rows: [
      ["brand", brand],
      ["meta", `${dateLine} · Self collect`],
      ["code", "#3BA44E"],
      ["customer", "Ain"],
      ["item", "Focaccia ×2"],
    ],
  });
});

test("multi-item storefront group: one shared code, every item on its own line", () => {
  const orders = [
    { id: "o_11111111", groupId: "o_9f3ba44e", deliveryDateId: "d1", productId: "p1", qty: 2,
      customerName: "Maya", fulfillment: "collect", createdAt: "2026-09-01T09:00:00" },
    { id: "o_22222222", groupId: "o_9f3ba44e", deliveryDateId: "d1", productId: "p2", qty: 3,
      customerName: "Maya", fulfillment: "collect", createdAt: "2026-09-01T09:00:00" },
  ];
  const data = packingLabelData(makeState(), group(...orders), "full");
  const code = `#${orderCode(orders[0])}`;
  assert.deepEqual(data.rows, [
    ["brand", brand],
    ["meta", `${dateLine} · Self collect`],
    ["code", code],
    ["customer", "Maya"],
    ["item", "Focaccia ×2"],
    ["item", "Sourdough Loaf ×3"],
  ]);
});

test("courier orders print the address, collect orders never do", () => {
  const courier = packingLabelData(
    makeState(), group(singleOrder({ fulfillment: "courier", address: "12 Jalan Bunga" })), "full");
  assert.deepEqual(courier.rows.slice(-1), [["address", "Courier: 12 Jalan Bunga"]]);

  const collect = packingLabelData(
    makeState(), group(singleOrder({ fulfillment: "collect", address: "12 Jalan Bunga" })), "full");
  assert.ok(!collect.rows.some(([k]) => k === "address"), "a collect order hides its (stale) address");
});

test("the note prints in full only when the order has one", () => {
  const withNote = packingLabelData(
    makeState(), group(singleOrder({ note: "no onions" })), "full");
  assert.ok(withNote.rows.some(([k, t]) => k === "note" && t === "Note: no onions"));

  const clean = packingLabelData(makeState(), group(singleOrder()), "full");
  assert.ok(!clean.rows.some(([k]) => k === "note"));
});

test("an item's own note prints beside that item, never as the order's note (v236)", () => {
  const orders = [
    { id: "o_11111111", groupId: "o_9f3ba44e", deliveryDateId: "d1", productId: "p1", qty: 2,
      customerName: "Maya", fulfillment: "collect", createdAt: "2026-09-01T09:00:00",
      lineNote: "no nuts" },
    { id: "o_22222222", groupId: "o_9f3ba44e", deliveryDateId: "d1", productId: "p2", qty: 3,
      customerName: "Maya", fulfillment: "collect", createdAt: "2026-09-01T09:00:00" },
  ];
  const data = packingLabelData(makeState(), group(...orders), "full");
  const items = data.rows.filter(([k]) => k === "item").map(([, t]) => t);
  assert.deepEqual(items, ["Focaccia ×2 (no nuts)", "Sourdough Loaf ×3"],
    "the note rides the one item it belongs to and leaves the other exactly as it was");
  assert.ok(!data.rows.some(([k]) => k === "note"),
    "and it never turns into the order's own note row, which is a different thing");
});

test("compact: items on one line, the delivery note kept, courier address kept", () => {
  // The delivery note prints on Compact too (v245). It was the one field this
  // style dropped, on a self-collect order as much as a courier one, so a note
  // about the doorstep disappeared the moment the denser label was picked.
  const data = packingLabelData(makeState(), group(
    singleOrder({ fulfillment: "courier", address: "12 Jalan Bunga", note: "no onions" })), "compact");
  assert.deepEqual(data.rows, [
    ["brand", brand],
    ["code", "#3BA44E"],
    ["customer", "Ain"],
    ["items", "Focaccia ×2"],
    ["note", "Note: no onions", "no onions"],
    ["address", "12 Jalan Bunga"],
  ]);
});

test("compact without a note keeps the rows it always had — no empty note line (v245)", () => {
  const data = packingLabelData(makeState(), group(
    singleOrder({ fulfillment: "courier", address: "12 Jalan Bunga" })), "compact");
  assert.deepEqual(data.rows, [
    ["brand", brand],
    ["code", "#3BA44E"],
    ["customer", "Ain"],
    ["items", "Focaccia ×2"],
    ["address", "12 Jalan Bunga"],
  ]);
});

test("a self-collect compact label carries the note too — the note is not a courier thing (v245)", () => {
  const data = packingLabelData(makeState(), group(
    singleOrder({ fulfillment: "collect", note: "collect after 3pm" })), "compact");
  assert.deepEqual(data.rows.find(([k]) => k === "note"),
    ["note", "Note: collect after 3pm", "collect after 3pm"],
    "the note's own words are the marked run, so the sheet underlines them");
});

test("a whitespace note prints no note row at all, in every style (v245)", () => {
  for (const style of ["full", "compact", "mailing"]) {
    const data = packingLabelData(makeState(), group(singleOrder({ note: "   " })), style);
    assert.ok(!data.rows.some(([, t]) => String(t).startsWith("Note:")),
      `${style}: whitespace is not a note, so no empty "Note:" line prints`);
  }
});

test("name-only: just brand, code and customer — no items, note or address", () => {
  const data = packingLabelData(makeState(), group(
    singleOrder({ fulfillment: "courier", address: "12 Jalan Bunga", note: "no onions" })), "name");
  assert.deepEqual(data.rows, [
    ["brand", brand],
    ["code", "#3BA44E"],
    ["customer", "Ain"],
  ]);
});

test("a nameless order still prints its date so the sheet is never blank", () => {
  const data = packingLabelData(makeState(), group(singleOrder({ customerName: "" })), "name");
  assert.deepEqual(data.rows, [
    ["brand", brand],
    ["code", "#3BA44E"],
    ["date", dateLine],
  ]);
});

test("a product that was deleted prints as (deleted product)", () => {
  const data = packingLabelData(makeState(), group(
    singleOrder({ productId: "gone" })), "full");
  assert.ok(data.rows.some(([k, t]) => k === "item" && t === "(deleted product) ×2"));
});

test("brand falls back to the bakery name when none was published", () => {
  const state = makeState({ settings: { storefront: { name: "" } } });
  const data = packingLabelData(state, group(singleOrder()), "full");
  assert.equal(data.rows[0][1], brand);
});

test("mailing: FROM from the settings box, TO the customer, ORDER the parcel", () => {
  const state = makeState({
    settings: {
      storefront: { name: brand },
      mailingAddress: "Jienluv2bake\n12, Jalan Bunga Raya\n11600 Pulau Pinang\n016 960 1268",
    },
  });
  const data = packingLabelData(state, group(singleOrder({
    fulfillment: "courier", whatsapp: "60123456789",
    address: "88 Jalan Merdeka\n10400 George Town",
    note: "ring before delivery",
  })), "mailing");
  assert.deepEqual(data, {
    style: "mailing",
    rows: [
      ["mail-sec", "FROM"],
      ["mail-line", "Jienluv2bake"],
      ["mail-line", "12, Jalan Bunga Raya"],
      ["mail-line", "11600 Pulau Pinang"],
      ["mail-line", "016 960 1268"],
      ["mail-sec", "TO"],
      ["mail-name", "Ain"],
      ["mail-line", "60123456789"],
      ["mail-line", "88 Jalan Merdeka"],
      ["mail-line", "10400 George Town"],
      ["mail-sec", "ORDER"],
      ["mail-line", `#3BA44E · Deliver ${dateLine}`],
      ["mail-line", "Focaccia ×2"],
      ["mail-line", "Note: ring before delivery", "ring before delivery"],
    ],
  });
});

test("mailing without a bakery address prints a reminder instead of a blank FROM", () => {
  const data = packingLabelData(makeState(), group(singleOrder({
    fulfillment: "courier", whatsapp: "60123456789", address: "88 Jalan Merdeka",
  })), "mailing");
  assert.equal(data.style, "mailing");
  assert.equal(data.rows[0][1], "FROM");
  assert.ok(data.rows.some(([k, t]) => k === "mail-line" && t.includes("Settings")));
});

test("an unknown style behaves like full", () => {
  const data = packingLabelData(makeState(), group(singleOrder()), "garbage");
  assert.equal(data.style, "full");
  assert.ok(data.rows.some(([k]) => k === "item"));
});

// ── v244: the item's own words, underlined on the row and on the sheet ──────

test("splitOrderLine cuts the line at the customer's note and leaves a clean line whole", () => {
  const state = makeState();
  assert.deepEqual(
    splitOrderLine(state, { productId: "p1", qty: 2, lineNote: "no nuts" }),
    { head: "Focaccia ×2", suffix: " (no nuts)" },
    "the head is everything up to the bracket, the suffix is the bracket itself");
  assert.deepEqual(
    splitOrderLine(state, { productId: "p1", qty: 2 }),
    { head: "Focaccia ×2", suffix: "" },
    "no note means no suffix, and the head is the whole line");
  assert.equal(lineNoteSuffix("  no nuts  "), " (no nuts)", "trimmed, and bracketed with a leading space");
  assert.equal(lineNoteSuffix("   "), "", "whitespace alone is not a note — same rule as the box");
});

test("a noted item row carries the marked run, so a sheet can underline it (v244)", () => {
  const state = makeState();
  const withNote = packingLabelData(state, group(
    singleOrder({ productId: "p1", qty: 2, lineNote: "no nuts" })), "full");
  assert.deepEqual(
    withNote.rows.find(([k]) => k === "item"),
    ["item", "Focaccia ×2 (no nuts)", " (no nuts)"],
    "the printed line is unchanged and the run to underline is its own element");

  const clean = packingLabelData(state, group(singleOrder({ productId: "p1", qty: 2 })), "full");
  assert.deepEqual(
    clean.rows.find(([k]) => k === "item"),
    ["item", "Focaccia ×2"],
    "a clean row stays the two-element pair it always was — no empty third slot");

  const mail = packingLabelData(state, group(
    singleOrder({ productId: "p1", qty: 2, lineNote: "no nuts" })), "mailing");
  assert.deepEqual(
    mail.rows.find(([k, , mark]) => k === "mail-line" && mark),
    ["mail-line", "Focaccia ×2 (no nuts)", " (no nuts)"],
    "the mailing sheet's item line carries the same marked run");
});

// ── v245: the order's OWN note — underlined, and on every label ─────────────

test("the marked run is always the tail of the row's own text, in every style", () => {
  // The sheet slices the run off the END of the text it is given. Anything else
  // would underline the wrong characters, so this is checked on both note kinds
  // and on every style rather than trusted.
  const state = makeState();
  for (const style of ["full", "compact", "mailing"]) {
    const data = packingLabelData(state, group(singleOrder({
      fulfillment: "courier", address: "12 Jalan Bunga", note: "gate 2B",
      productId: "p1", qty: 2, lineNote: "no nuts",
    })), style);
    for (const [cls, text, mark] of data.rows) {
      if (!mark) continue;
      assert.ok(String(text).endsWith(mark),
        `${style}/${cls}: "${mark}" is the tail of "${text}"`);
      assert.ok(String(text).length > String(mark).length,
        `${style}/${cls}: the marked run leaves something to print before it`);
    }
  }
});

test("sheetNoteRow returns null for nothing to say, so no row is pushed", async () => {
  const { sheetNoteRow } = await import("../admin/js/views/orders.js");
  assert.equal(sheetNoteRow(""), null);
  assert.equal(sheetNoteRow("   "), null);
  assert.equal(sheetNoteRow(null), null);
  assert.deepEqual(sheetNoteRow("  ring the bell  "), ["note", "Note: ring the bell", "ring the bell"]);
  assert.deepEqual(sheetNoteRow("ring the bell", "mail-line"),
    ["mail-line", "Note: ring the bell", "ring the bell"]);
});
