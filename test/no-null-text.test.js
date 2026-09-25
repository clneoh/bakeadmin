// test/no-null-text.test.js — a `null` argument must never reach the screen.
//
// el() skips null/undefined and false, but replaceChildren() does NOT: it is a
// DOM method, and the real DOM converts each argument with String(), so a null
// becomes a text node reading "null" and the owner sees the word printed on the
// page. Three call sites passed a null for an optional child (19 Sep 2026):
// the Settings screen's sample-data card, the "How the day adds up" sum, and the
// date picker's Today shortcut.
//
// WHY THIS TEST EXISTS SEPARATELY, AND WHY ITS SHIM IS DIFFERENT. Every other
// view test's replaceChildren shim drops null arguments — `if (c != null)` — so
// they all render a screen with the stray "null" already removed, and the defect
// is invisible to them. This shim deliberately does what the browser does:
// non-node arguments become text. The rendering, the shim, and the "null" shim
// regression (flip one call site back to passing null and this file fails).
//
// AND THE THIRD SCREEN (v189, 25 Sep 2026). The courier price panel wrote its two
// optional lines as bare `?: null`, and the drawn panel printed the word "null"
// under the last price row — found by reading the panel on screen at 375 pixels,
// on the first booking this app ever made, which is the worst place for a stray
// word to stand. It was invisible here for the same reason as the others: this
// file simply did not render that screen yet. It does now.

import { test } from "node:test";
import assert from "node:assert/strict";

function createEl(tag) {
  const node = {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, value: "", checked: false, disabled: false, hidden: false,
    scrollTop: 0, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this._adopt(c); if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) { if (c == null) continue; this._adopt(c); this.children.push(c); } },
    // The real DOM: a node is used as-is, anything else is stringified into a
    // text node — so null arrives on the page as "null".
    replaceChildren(...cs) {
      // And the children it drops are ORPHANED, not merely forgotten — a real DOM
      // detaches them, so their parent is null and `isConnected` below answers no. A node
      // left pointing at the parent it was taken out of would go on answering "yes, still
      // here" for the rest of the run, which is enough to keep the courier panel's own
      // one-second clock alive in a box that was thrown away. test/orders-day-sum.test.js
      // and test/orders-autocollect.test.js carry the same fix for the same reason.
      for (const old of this.children) {
        if (old && old.nodeType === 1 && old.parentNode === this) old.parentNode = null;
      }
      this.children = cs.map((c) => (c && c.nodeType ? c : { nodeType: 3, text: String(c) }));
      for (const c of this.children) this._adopt(c);
    },
    // The real DOM keeps a child's parent, and `isConnected` walks it. The courier
    // price panel asks `wrap.isConnected` before it does anything (and re-asks it
    // after every await, because the card can be closed mid-flight), so a shim with
    // no parent links would make the panel's whole path unreachable and every
    // assertion about it would pass over an empty screen. Added here for the same
    // stated reason test/board-view.test.js added it.
    _adopt(c) { if (c && c.nodeType === 1) c.parentNode = this; },
    get isConnected() {
      for (let n = this; n; n = n.parentNode) if (n === doc.body) return true;
      return false;
    },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    focus() {}, click() {},
  };
  Object.defineProperty(node, "textContent", {
    get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
    set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
  });
  return node;
}
const layers = {};
const doc = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (layers[id] ||= createEl("div")),
  querySelector: () => null,
  querySelectorAll: () => [],
  scrollingElement: createEl("html"),
  body: createEl("body"),
  documentElement: createEl("html"),
};
globalThis.document = doc;
globalThis.window = { open() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.history = { replaceState() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
// globalThis.navigator is getter-only in Node, so it has to be redefined.
Object.defineProperty(globalThis, "navigator", {
  value: { language: "en-US", clipboard: null }, configurable: true, writable: true,
});
globalThis.fetch = () => Promise.reject(new Error("offline in tests"));

const RealDate = globalThis.Date;
class MockDate extends RealDate {
  constructor(...args) { if (args.length) super(...args); else super(2026, 8, 10, 10, 0, 0); } // Thu 10 Sep 2026
  static now() { return new MockDate().getTime(); }
}
globalThis.Date = MockDate;

const { renderOrders } = await import("../admin/js/views/orders.js");
const { renderSettings } = await import("../admin/js/views/settings.js");
const { courierQuoteSection } = await import("../admin/js/views/courier_quote.js");

const all = (node, out = []) => {
  for (const c of node.children || []) { out.push(c); all(c, out); }
  return out;
};
const byClass = (root, name) => all(root).find((n) => String(n.className).includes(name));
const buttonByText = (root, text) =>
  all(root).find((n) => n.tagName === "BUTTON" && n.textContent.includes(text));

// Every text node that would print as the word null/undefined on the screen.
const strayNulls = (root) => all(root)
  .filter((n) => n.nodeType === 3 && (n.text === "null" || n.text === "undefined"))
  .map((n) => n.text);

// Focaccia sells every day; the Saturday loaf is marked Saturdays only, and the
// day on screen (Thu 10 Sep) is not one of them — so it is the day's OFF-SALE
// product, which is what puts the "Not counted" line in or leaves it out.
function state(products) {
  return {
    deliveryDates: [{ id: "d10", date: "2026-09-10" }],
    products,
    orders: [{ id: "o1", deliveryDateId: "d10", productId: "p1", qty: 2 }],
    ingredients: [], occasions: [],
    settings: {
      cutoff: "18:00", defaultCapacity: 12, currency: "RM", deliveryDays: [4],
      customers: [], expenses: [], payments: [], capital: [], drawings: [],
      categories: [], methods: [], books: [],
      storefront: { name: "Jienluv2bake" },
    },
  };
}
const FOCACCIA = { id: "p1", name: "Focaccia", limit: 12, active: true, recipe: [], unit: "pc" };
const SATURDAY = { id: "p2", name: "Saturday loaf", limit: 8, active: true, recipe: [], unit: "pc",
  sellRules: [{ days: [6] }] };

function openDay() {
  const root = createEl("div");
  renderOrders(root, state([FOCACCIA, SATURDAY]), new URLSearchParams({ date: "d10" }));
  buttonByText(root, "Set day's availability")._listeners.click[0]();
  return layers["popup-layer"];
}

test("the day's add-up prints no 'null' when every product on sale was counted", () => {
  // The common case: nothing is off-sale that day, so the "Not counted" line is
  // absent — and this is exactly the branch that used to pass null to
  // replaceChildren and print the word between the total and "Booked so far".
  const root = createEl("div");
  renderOrders(root, state([FOCACCIA]), new URLSearchParams({ date: "d10" }));
  buttonByText(root, "Set day's availability")._listeners.click[0]();
  const pop = layers["popup-layer"];

  assert.deepEqual(strayNulls(pop), [], "no 'null' between the total and 'Booked so far'");
  assert.match(byClass(pop, "cost-grid").textContent, /what the order page can take that day/,
    "and the sum itself still rendered");
  assert.match(pop.textContent, /Booked so far/, "with the booked line still under it");
});

test("the day's add-up prints no 'null' when a product is off-sale", () => {
  // The other branch — the "Not counted" line IS present, and must not be
  // joined by a stray null from the line that is not.
  const pop = openDay();
  assert.deepEqual(strayNulls(pop), [], "no 'null' above or below the named off-sale line");
  assert.match(pop.textContent, /Not counted: Saturday loaf/,
    "the branch really was taken, so the check above is not passing on an empty screen");
});

test("the Settings screen prints no 'null' for an owner who has set anything up", () => {
  // The sample-data card is only offered to an owner with nothing yet, so for
  // anyone with a product or an ingredient it is null — and it printed at the
  // very foot of Settings, under Delete all data.
  const root = createEl("div");
  renderSettings(root, state([FOCACCIA]));

  assert.deepEqual(strayNulls(root), [], "no 'null' at the foot of Settings");
  assert.ok(buttonByText(root, "Delete all data"), "and the screen still built to its last card");
});

test("the Settings screen offers the sample card, and still prints no 'null', when nothing exists yet", () => {
  const root = createEl("div");
  renderSettings(root, state([]));

  assert.deepEqual(strayNulls(root), [], "the other side of the same branch");
  assert.ok(buttonByText(root, "Load sample data"),
    "the sample card is offered to a brand-new owner");
});

// ── the courier price panel (v189) ────────────────────────────────────────
//
// The screen where the stray word was actually found: read off the drawn panel at
// 375 pixels, under the last price row of the first booking this app ever made. The
// two optional lines it writes — "why no row can be booked" and the note about the
// fee not going into the charge box — were bare `?: null`.

const COURIER_ORDER = {
  id: "o1", deliveryDateId: "d10", productId: "p1", qty: 2, price: 22,
  customerName: "Mei Ling", whatsapp: "60123456789", fulfillment: "courier",
  address: "12 Jalan Bunga, 10450 Penang", orderDate: "2026-09-25",
};

function courierState() {
  return {
    deliveryDates: [{ id: "d10", date: "2026-09-30" }],
    products: [], orders: [COURIER_ORDER], ingredients: [], occasions: [], customers: [],
    settings: {
      cutoff: "18:00", defaultCapacity: 12, currency: "RM", deliveryDays: [4],
      supabase: { url: "https://demo.supabase.co" },
      storefront: { name: "Jienluv2bake", whatsapp: "016 960 1268" },
      pickupPlace: { lat: 5.4141, lng: 100.3288, label: "8 Lebuh Pantai" },
    },
  };
}

// The channel, stood in for the way courier-booking.test.js stands in for it: the
// ONE thing stubbed is the network, never a function under test. Two prices come
// back so the panel really draws its rows — an assertion of "no stray null" over a
// panel that never rendered anything would pass without testing anything.
function stubChannel() {
  const real = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async (url, opts = {}) => {
    const said = JSON.parse(opts.body || "{}");
    asked.push(said.action);
    const body = said.action === "geocode"
      ? { ok: true, place: { lat: 5.42, lng: 100.33, label: "12 Jalan Bunga" } }
      : said.action === "vehicles"
        ? { ok: true, services: [{ key: "MOTORCYCLE" }, { key: "CAR" }] }
        : {
          ok: true,
          quotes: [{ quotationId: "q-car", serviceType: "CAR", priceBreakdown: { total: 14, currency: "MYR" },
            stops: [{ stopId: "s-bakery", coordinates: { lat: 5.4141, lng: 100.3288 } },
              { stopId: "s-mei", coordinates: { lat: 5.42, lng: 100.33 } }] }],
          failed: [],
        };
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { asked, restore() { globalThis.fetch = real; } };
}

test("the courier price panel prints no 'null' under its last price row", async () => {
  globalThis.localStorage.getItem = (k) => (k === "bakeadmin.supabase"
    ? JSON.stringify({ access_token: "t", expires_at: Date.now() + 3600_000 }) : null);
  const s = stubChannel();
  let wrap = null;
  let stray = null;
  try {
    wrap = courierQuoteSection({ state: courierState(), orders: [COURIER_ORDER] });
    // On the page, because that is where the panel lives and what it asks about
    // itself: nothing is priced until the wrap is connected, so a test that held it
    // in mid-air would assert "no stray null" over a screen that never drew.
    doc.body.append(wrap);
    buttonByText(wrap, "Get a delivery price")._listeners.click[0]();

    // The prices arrive a few microtasks later — exactly the state the panel was in
    // on screen when the word was read off it.
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1));

    assert.deepEqual(s.asked, ["geocode", "vehicles", "quote"],
      "the panel asked what it should have asked — so the picture below is not of an empty screen");
    assert.match(wrap.textContent, /RM 14\.00/, "the price row really drew");
    assert.match(wrap.textContent, /Book this trip/, "with its booking press on it");
    stray = strayNulls(wrap);
  } finally {
    // Closing the panel is what she does AND what stops its own clock — and it has to
    // happen even when an assertion above throws, or a failed run would sit until the
    // test timeout with the interval still ticking. A test that hangs instead of
    // failing fast is its own small trap.
    const hide = wrap && buttonByText(wrap, "Hide the delivery price");
    if (hide) hide._listeners.click[0]();
    if (wrap) wrap.parentNode = null;
    s.restore();
  }
  assert.deepEqual(stray, [], "no 'null' under the last price row");
});
