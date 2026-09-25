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
//
// AND THE FOURTH (v195, 25 Sep 2026), which is the same fault at full size. The
// pickup-pin card's body hands showPopup a LIST of seven elements; `replaceChildren`
// is variadic, so the array was stringified and the card printed
// "[object HTMLParagraphElement],[object HTMLDivElement],…" — with no button, no field
// and no map on it, because every one of them had been thrown away. She found it on her
// own phone the first time she tried to pin her bakery's door. It got that far for the
// bluntest reason available: place_map.js had no test of any kind, in this file or any
// other. Both halves are asserted below, at the primitive every card goes through and at
// the screen she was looking at.

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
    // The map loader tears its own node out when a third party's script will not load
    // (`mapBox.remove()` in place_map.js), and a shim without this throws inside that
    // catch — turning the very branch the pickup-pin test exists to reach into a crash.
    remove() {
      if (this.parentNode && Array.isArray(this.parentNode.children)) {
        this.parentNode.children = this.parentNode.children.filter((x) => x !== this);
      }
      this.parentNode = null;
    },
  };
  Object.defineProperty(node, "textContent", {
    get() { return this.children.map((c) => (c.nodeType === 3 ? c.text : c.textContent)).join(""); },
    set(v) { this.children = v === "" ? [] : [{ nodeType: 3, text: String(v) }]; },
  });
  return node;
}
const layers = {};
// This suite is offline (the fetch stub below rejects), so a third party's script can
// never load — and the pickup-pin card has to survive that. Firing the `error` a real
// <script> fires when it cannot be fetched makes that branch reachable at once, instead
// of after the loader's own nine-second give-up.
const head = createEl("head");
head.append = (...cs) => {
  for (const c of cs) {
    if (c == null) continue;
    head.children.push(c);
    if (String(c.tagName) === "SCRIPT") {
      queueMicrotask(() => (c._listeners.error || []).forEach((f) => f({})));
    }
  }
};
const doc = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (layers[id] ||= createEl("div")),
  querySelector: () => null,
  querySelectorAll: () => [],
  scrollingElement: createEl("html"),
  body: createEl("body"),
  documentElement: createEl("html"),
  head,
};
globalThis.document = doc;
globalThis.window = { open() {}, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {} }) };
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
// The pop-up primitive itself, and the screen that found this fault on a real phone: the
// pickup-pin card, whose body is the one place in the app that hands showPopup a LIST of
// nodes rather than a single one.
const { showPopup } = await import("../admin/js/ui.js");
const { openPlacePicker } = await import("../admin/js/place_map.js");

const all = (node, out = []) => {
  for (const c of node.children || []) { out.push(c); all(c, out); }
  return out;
};
const byClass = (root, name) => all(root).find((n) => String(n.className).includes(name));
const buttonByText = (root, text) =>
  all(root).find((n) => n.tagName === "BUTTON" && n.textContent.includes(text));
// The ONE card showPopup builds, as the DOM holds it: layer > card > [head, body]. Every
// assertion below reads the card the app really drew rather than a node held in mid-air.
const popupBody = () => layers["popup-layer"].children[0].children[1];

// Every text node that would print as the word null/undefined on the screen.
const strayNulls = (root) => all(root)
  .filter((n) => n.nodeType === 3 && (n.text === "null" || n.text === "undefined"))
  .map((n) => n.text);

// The SAME fault one step along (v195): a thing that is neither a node nor a string is
// converted with String(), so an ARRAY handed to the variadic replaceChildren prints as
// "[object HTMLParagraphElement],[object HTMLDivElement],…". A null is the smallest
// version of this; a list of seven elements is the version that reached her phone.
const strayObjects = (root) => all(root)
  .filter((n) => n.nodeType === 3 && /\[object \w+\]/.test(n.text))
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

// ── the customer's own pin, offered (v197) ────────────────────────────────
//
// The offer line is drawn by `paintEnds()`, which every change to the doorstep repaints,
// and this is one of the two screens a shop-page pin can be taken up on. Read off the
// drawn card rather than off the function, for the same reason as the panel above: what
// is checked is what she sees.
//
// The second half is the rule that replaces a "dismissed" flag — the offer is shown only
// while the pin the customer dropped differs from the door already kept for them, so
// ACCEPTING is the thing that ends it, and nothing has to be stored about a refusal.

test("the customer's own pin is offered with no stray 'null', and stops being offered once it is taken (v197)", async () => {
  globalThis.localStorage.getItem = (k) => (k === "bakeadmin.supabase"
    ? JSON.stringify({ access_token: "t", expires_at: Date.now() + 3600_000 }) : null);
  const s = stubChannel();
  const st = courierState();
  const order = {
    ...COURIER_ORDER,
    customerPlace: { lat: 5.4299, lng: 100.3399, label: "Sri Bunga guard house", at: "2026-09-25T10:00:00.000Z" },
  };
  let wrap = null;
  let offered = null;
  try {
    wrap = courierQuoteSection({ state: st, orders: [order] });
    doc.body.append(wrap);
    buttonByText(wrap, "Get a delivery price")._listeners.click[0]();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1));

    offered = byClass(wrap, "pin-offer");
    assert.ok(offered, "the offer block is drawn on the order card");
    assert.equal(offered.hidden, false, "and it is shown");
    // "Instead", because the panel looked the typed address up on its way to a price and
    // kept that answer against this customer — so there IS a door of hers for the pin to
    // differ from. That is the branch her own answer is about: the offer arrives even
    // when she already has a door, and it is the WORDS that change, not whether it shows.
    assert.match(offered.textContent, /Mei Ling pinned a different spot this time/);
    assert.match(offered.textContent, /The doorstep you keep for them is untouched until you take this one/);
    assert.equal((st.customers[0] || {}).place.lat, 5.42,
      "the door looked up from the typed address is what she keeps, until the pin is taken");
    const press = buttonByText(offered, "Use the customer's pin instead");
    assert.ok(press, "with one press to take it");
    assert.deepEqual(strayNulls(wrap), [], "and nothing on the card prints 'null'");

    press._listeners.click[0]();
    assert.equal(offered.hidden, true, "taking it ends the offer — there is nothing to dismiss");
    assert.equal(offered.children.length, 0, "and it is emptied, not left holding the last customer's words");
    const kept = (st.customers || [])[0] || {};
    assert.equal((kept.place || {}).lat, 5.4299, "the pin is what is now kept against that customer");
    assert.deepEqual(strayNulls(wrap), [], "still no 'null' on the card once it is taken");
  } finally {
    const hide = wrap && buttonByText(wrap, "Hide the delivery price");
    if (hide) hide._listeners.click[0]();
    if (wrap) wrap.parentNode = null;
    s.restore();
  }
});

// ── the pop-up primitive, and the pickup-pin card (v195) ───────────────────
//
// The fault at the level it was at: `body.replaceChildren(makeBody(...))` handed a
// non-node to a variadic DOM method. Every card in the app goes through this one line,
// so it is asserted here as well as on the screen that found it.

test("a card body handed back as a LIST is drawn, not printed (v195)", () => {
  showPopup("A card", () => [createEl("p"), createEl("div"), createEl("p")]);

  const body = popupBody();
  assert.equal(body.children.length, 3, "three elements drawn, not one stringified array");
  assert.deepEqual(body.children.map((c) => c.tagName), ["P", "DIV", "P"], "the elements themselves");
  assert.deepEqual(strayObjects(body), [], "and nothing printed as '[object …]'");
});

test("a card body handed back as ONE node is still drawn exactly as before (v195)", () => {
  // The other side of the same line, so this cannot have been fixed by making the 37
  // cards that return a single node worse than they were.
  showPopup("A card", () => createEl("div"));

  const body = popupBody();
  assert.equal(body.children.length, 1, "one node, one child");
  assert.equal(body.children[0].tagName, "DIV", "and it is the node the body built");
  assert.deepEqual(strayObjects(body), [], "with nothing printed as '[object …]'");
});

test("the pickup-pin card draws its controls even when no map can load (v195)", async () => {
  // The screen her pin was going on, and it had no test of any kind before this — which
  // is the whole reason a card with nothing on it reached her phone. The map cannot load
  // in an offline suite, and that is the branch worth asserting: a picker that dead-ends
  // because a third party is unreachable would be worse than no map at all. Every control
  // below lives in the body, so all three are lost to the array, not just the map.
  const close = openPlacePicker({
    state: courierState(),
    title: "The bakery's pickup pin",
    address: "12 Jalan Bunga, 10450 Penang",
    onPick: () => {},
  });
  // The loader's own failure lands on a microtask — see the head shim above.
  await new Promise((r) => setTimeout(r, 0));

  const body = popupBody();
  assert.ok(buttonByText(body, "Look it up"), "the address lookup is on the card");
  assert.ok(buttonByText(body, "Use these numbers"), "and the coordinates fallback");
  assert.ok(buttonByText(body, "Use this spot"), "and the press that keeps the pin");
  assert.match(body.textContent, /The map is not available right now/,
    "the map's failure is said in words rather than left as a blank card");
  assert.deepEqual(strayObjects(body), [], "no element printed as '[object …]'");
  close();
});
