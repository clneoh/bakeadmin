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
// A map measures its own box once the card has settled, in a rAF — the v201 door block is
// the first thing in this file to build one. The tests below reach it through a recording
// Leaflet stub (`window.L`), and the stub's map is only built inside this callback's run, so
// without it the whole path would be unreachable here.
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

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

// ── the matches the lookup used to throw away (v198) ──────────────────────
//
// The geocoder sends several candidates and this card used to be handed one of them —
// the first — so a pin on the wrong street was hers to notice and drag. The rows below
// are the other candidates, offered. Two things are load-bearing and both are asserted
// on the DRAWN page rather than on the code: that a row press moves the pin to THAT
// candidate and not to the first, and that the rows are real elements rather than the
// stringified array v195 shipped on this same card.

// The lookup's own reply, and the shape of it is the point: `place` is the first of
// `places`, because the quote card and the delivery run still take one answer and have
// no list to choose from.
const THREE_MATCHES = {
  ok: true,
  place: { lat: 5.4, lng: 100.3, label: "Jalan Bunga, George Town, 10450" },
  places: [
    { lat: 5.4, lng: 100.3, label: "Jalan Bunga, George Town, 10450" },
    { lat: 5.41, lng: 100.31, label: "Jalan Bunga, Butterworth, 12000" },
    { lat: 5.42, lng: 100.32, label: "Jalan Bunga Raya, Bayan Lepas, 11900" },
  ],
};

function stubGeocode(reply) {
  const real = globalThis.fetch;
  const asked = [];
  globalThis.fetch = async (url, opts = {}) => {
    asked.push(JSON.parse(opts.body || "{}").action);
    const body = reply;
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
  return { asked, restore() { globalThis.fetch = real; } };
}

const signIn = () => {
  globalThis.localStorage.getItem = (k) => (k === "bakeadmin.supabase"
    ? JSON.stringify({ access_token: "t", expires_at: Date.now() + 3600_000 }) : null);
};

// The rows off the drawn card. Re-read after every press, because the panel repaints
// itself and the nodes it was showing are then orphans — asserting against the first
// read would be asserting against a tree nobody is looking at.
const matchRows = (body) => all(body).filter((n) => String(n.className).includes("sugg-row"));
const rowLine = (row, i) => {
  const main = row.children[0];
  const line = main && main.children[i];
  return line ? line.textContent : "";
};

test("the lookup's other matches are offered, and pressing one moves the pin to THAT one (v198)", async () => {
  signIn();
  const s = stubGeocode(THREE_MATCHES);
  let close = null;
  let stray = null;
  try {
    close = openPlacePicker({ state: courierState(), title: "Put the pin on the map", address: "12 Jalan Bunga", onPick: () => {} });
    // The map loader's failure lands on a microtask — see the head shim above. This card
    // is the offline one on purpose: the chooser must work with no map at all.
    await new Promise((r) => setTimeout(r, 0));

    const body = popupBody();
    buttonByText(body, "Look it up")._listeners.click[0]();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1));

    assert.deepEqual(s.asked, ["geocode"], "one press is one lookup");
    assert.equal(matchRows(body).length, 3, "three matches, three rows");
    assert.deepEqual(matchRows(body).map((r) => rowLine(r, 0)), ["✓ Jalan Bunga", "Jalan Bunga", "Jalan Bunga Raya"],
      "each row leads with what the place is — and the pin is on the first match, so the first row is the ticked one");
    assert.deepEqual(matchRows(body).map((r) => rowLine(r, 1)),
      ["George Town, 10450", "Butterworth, 12000", "Bayan Lepas, 11900"],
      "with where it is on the second line, cut from the geocoder's own label");
    assert.match(body.textContent, /and 2 more below/,
      "the line under the button says the list is there, so it cannot be missed");

    // THE ASSERTION THIS TEST EXISTS FOR. The third row, so an app that quietly kept the
    // first match — which is what this card did before v198 — cannot pass by accident.
    matchRows(body)[2]._listeners.click[0]();
    assert.match(body.textContent, /Pinned at 5\.42000, 100\.32000/, "the pin is on the third match");
    assert.doesNotMatch(body.textContent, /Pinned at 5\.40000, 100\.30000/, "and NOT still on the first one");
    assert.match(body.textContent, /Found: Jalan Bunga Raya, Bayan Lepas, 11900/, "the line agrees with the pin");

    // The tick follows the pin, and it is re-derived rather than remembered: the rows
    // below are fresh nodes, made by the repaint the pin's own move triggered.
    assert.deepEqual(matchRows(body).map((r) => rowLine(r, 0)), ["Jalan Bunga", "Jalan Bunga", "✓ Jalan Bunga Raya"],
      "the tick moved with the pin and left the row above it");
    assert.equal(matchRows(body).length, 3, "the list kept its rows, so she can try another without asking again");
    stray = strayObjects(body);
  } finally {
    if (close) close();
    s.restore();
  }
  assert.deepEqual(stray, [], "no element printed as '[object …]' — the fault v195 shipped on this very card");
});

test("a lookup with one match draws no list, and still lands that match (v198)", async () => {
  // The old server's reply, and the shape of the app on the day it is pushed but the
  // courier function has not been redeployed — `place` and nothing else. A single
  // candidate is not a choice: the line above it already names it, and a one-row list
  // would be a control with nothing to choose between.
  signIn();
  const s = stubGeocode({ ok: true, place: { lat: 5.4, lng: 100.3, label: "12 Jalan Bunga" } });
  let close = null;
  let stray = null;
  try {
    close = openPlacePicker({ state: courierState(), title: "Put the pin on the map", address: "12 Jalan Bunga", onPick: () => {} });
    await new Promise((r) => setTimeout(r, 0));

    const body = popupBody();
    buttonByText(body, "Look it up")._listeners.click[0]();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1));

    assert.equal(matchRows(body).length, 0, "one match is not a list");
    assert.match(body.textContent, /Found: 12 Jalan Bunga/, "and it is still named");
    assert.match(body.textContent, /Pinned at 5\.40000, 100\.30000/, "and still lands on the map, exactly as before");
    stray = strayObjects(body);
  } finally {
    if (close) close();
    s.restore();
  }
  assert.deepEqual(stray, []);
});

test("a second lookup that finds nothing takes the first one's matches off the card with it (v198)", async () => {
  // The failure path is the one that proves the panel is emptied BEFORE the ask rather
  // than after it. A lookup that succeeds repaints the list anyway, so it would hide a
  // missing clear; a lookup that MISSES paints nothing at all, and returns early. Without
  // the clear, "That address was not found" would be drawn with three cheerful matches
  // sitting under it — the card contradicting itself, which is worse than either sentence
  // alone. One press too many to remember to guard is why the clear is at the top.
  signIn();
  let call = 0;
  const real = globalThis.fetch;
  globalThis.fetch = async () => {
    call++;
    const body = call === 1
      ? THREE_MATCHES
      : { ok: false, reason: "That address was not found. Put the pin on the map instead." };
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
  let close = null;
  let stray = null;
  try {
    close = openPlacePicker({ state: courierState(), title: "Put the pin on the map", address: "12 Jalan Bunga", onPick: () => {} });
    await new Promise((r) => setTimeout(r, 0));

    const body = popupBody();
    const find = () => buttonByText(body, "Look it up")._listeners.click[0]();
    find();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1));
    assert.equal(matchRows(body).length, 3, "three the first time");

    find();
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 1));
    assert.match(body.textContent, /was not found/, "the miss is said");
    assert.equal(matchRows(body).length, 0, "and the first lookup's matches went with it");
    assert.doesNotMatch(body.textContent, /and 2 more below/, "the old count went too, rather than counting rows that are gone");
    stray = strayObjects(body);
  } finally {
    if (close) close();
    globalThis.fetch = real;
  }
  assert.deepEqual(stray, []);
});

// ── the door the driver is sent to (v201, 26 Sep 2026) ────────────────────
//
// Her report: "there is no customer enter address in the form, so there is no way we can
// check what customer pin is right, when in that window." The box she means is the Note /
// tracking one, and the reason a wrong pin costs her there is that a courier is given a
// POINT, not an address — and that box is where the trip is priced and booked.
//
// The block is asserted rather than merely read, for the reason this whole file exists: the
// last card on this section written without a test reached her phone with nothing on it at
// all (v195). And it is asserted THROUGH A RECORDING LEAFLET, because the two things that
// matter most about it — that the map is read-only until she presses the button, and that a
// moved pin is a WRITE — are invisible from the outside otherwise.

// A handler object, the way Leaflet really models these: `dragging`, `touchZoom`,
// `doubleClickZoom` and `boxZoom` are things that get switched on and off, not options.
const toggle = (name) => ({
  name, on: false, enable() { this.on = true; }, disable() { this.on = false; },
});

// Records what the map was ASKED FOR. Not an approximation of Leaflet — every assertion
// below reads one of these recordings, so a call the block stops making is a test that goes
// red rather than a test that keeps passing over a map that is no longer locked.
function makeLeaflet() {
  const rec = { maps: [], views: [], tiles: [], markers: [] };
  const L = {
    map(container, opts) {
      const m = {
        container, opts, removed: false, sized: 0, handlers: {}, zoom: 16,
        dragging: toggle("map drag"), touchZoom: toggle("pinch"),
        doubleClickZoom: toggle("double tap"), boxZoom: toggle("box"),
        setView(center, zoom) { m.center = center; m.zoom = zoom; rec.views.push({ center, zoom }); return m; },
        on(evt, cb) { m.handlers[evt] = cb; return m; },
        // Faithful about the difference that matters here: off() with no arguments lets go
        // of every handler, off("click", fn) lets go of that one. A stub that ignored the
        // arguments would leave a tap handler recorded on a map that had been locked again.
        off(evt, cb) {
          if (evt === undefined) m.handlers = {};
          else if (cb ? m.handlers[evt] === cb : true) delete m.handlers[evt];
          return m;
        },
        remove() { m.removed = true; },
        invalidateSize() { m.sized += 1; },
        getZoom() { return m.zoom; },
        getContainer() { return container; },
      };
      rec.maps.push(m);
      return m;
    },
    tileLayer(url, opts) {
      const t = { url, opts, addTo(map) { map.tile = t; return t; } };
      rec.tiles.push(t);
      return t;
    },
    marker(latlng, opts) {
      const mk = {
        // `draggable` is the creation option; `dragging` is the handler that gets switched
        // on and off afterwards. Both are real Leaflet's own names, and getting them the
        // wrong way round here is the sort of stub fault that hides a screen doing nothing.
        latlng: { lat: latlng[0], lng: latlng[1] }, opts, handlers: {},
        dragging: toggle("marker drag"),
        addTo(map) { mk.addedTo = map; map.marker = mk; return mk; },
        on(evt, cb) { mk.handlers[evt] = cb; return mk; },
        getLatLng() { return { lat: mk.latlng.lat, lng: mk.latlng.lng }; },
        setLatLng(ll) { mk.latlng = { lat: ll[0], lng: ll[1] }; },
      };
      rec.markers.push(mk);
      return mk;
    },
  };
  return { L, rec };
}

// Long enough for the loader's microtask, the map's own build and the rAF that measures the
// box — in that order, which is the order the real phone does them in.
const settle = async (rounds = 24) => {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 1));
};

// A door already known for the customer, as the pin they dropped on the shop page. This is
// the SUGGESTION path, which is the state a first order from somebody is really in — and it
// is the one v197 promised never reaches a driver unaccepted.
const DOOR = { lat: 5.4299, lng: 100.3399, label: "Sri Bunga guard house", at: "2026-09-25T10:00:00.000Z" };
const withDoor = () => ({ ...COURIER_ORDER, customerPlace: DOOR });

// The section, with a host-supplied slot OUTSIDE its own node — exactly as both call sites in
// orders.js build it, and deliberately so: whether the block lands in the slot or gets built
// inside the section's own folded node is the first thing the first test below checks.
function mountDoor(state, order) {
  const doorSlot = createEl("div");
  const wrap = courierQuoteSection({ state, orders: [order], doorSlot });
  doc.body.append(doorSlot);
  doc.body.append(wrap);
  return { doorSlot, wrap };
}

function closeDoor({ wrap, doorSlot } = {}) {
  const hide = wrap && buttonByText(wrap, "Hide the delivery price");
  if (hide) hide._listeners.click[0]();
  if (wrap) wrap.parentNode = null;
  if (doorSlot) doorSlot.parentNode = null;
}

test("the door block is drawn into the host's slot when the box opens, and not inside the price fold (v201)", async () => {
  const leaf = makeLeaflet();
  globalThis.window.L = leaf.L;
  let mounted = null;
  try {
    mounted = mountDoor(courierState(), withDoor());
    await settle(4);

    assert.match(mounted.doorSlot.textContent, /The door the driver is sent to/,
      "the block is on the card before anything is pressed — her answer was 'Always, courier orders'");
    assert.match(mounted.doorSlot.textContent, /12 Jalan Bunga, 10450 Penang/,
      "and it names the address the order already carries");
    assert.match(mounted.doorSlot.textContent, /Sri Bunga guard house/,
      "and the pin, in the customer's own words for it");
    assert.match(mounted.doorSlot.textContent, /from the shop page/,
      "said as the customer's own suggestion, because v197 keeps their pin out of a driver's hands");
    assert.equal(leaf.rec.maps.length, 1, "the map itself was built, once");
    assert.equal(leaf.rec.markers[0].latlng.lat, 5.4299, "with its pin on the customer's door");

    // The card's TOP is the host's slot; the section's own node is the folded price panel.
    // A block built inside the fold would be invisible until she asked for a price — which
    // is precisely the state her report was about.
    assert.doesNotMatch(mounted.wrap.textContent, /The door the driver is sent to/,
      "and the block is NOT inside the section's own node, which is the fold she has to open");
  } finally {
    closeDoor(mounted);
    delete globalThis.window.L;
  }
});

test("a pin dragged on the map is written against the customer, and the prices quoted for the old door are cleared (v201)", async () => {
  signIn();
  const s = stubChannel();
  const leaf = makeLeaflet();
  globalThis.window.L = leaf.L;
  const st = courierState();
  let mounted = null;
  try {
    mounted = mountDoor(st, withDoor());
    await settle(4);
    buttonByText(mounted.wrap, "Get a delivery price")._listeners.click[0]();
    await settle();
    assert.match(mounted.wrap.textContent, /RM 14\.00/, "a price is on the panel to begin with");

    const map = leaf.rec.maps[0];
    const mk = leaf.rec.markers[0];
    assert.ok(map && mk, "the map and its pin are up");

    // LOCKED FIRST, and this is the load-bearing half of "Look, and a Move button": the
    // marker's drag handler is wired at build time, so the guard inside it is the only thing
    // standing between a stray touch and a customer's kept door moving under her.
    const before = { ...st.customers[0].place };
    mk.latlng = { lat: 5.6, lng: 100.5 };
    mk.handlers.dragend({ target: mk });
    assert.equal(st.customers[0].place.lat, before.lat, "a drag on the locked map moves nothing");
    assert.equal(map.handlers.click, undefined, "and a tap on the locked map places nothing");
    assert.doesNotMatch(mounted.wrap.textContent, /The door moved/, "and nothing is said about a move that did not happen");

    buttonByText(mounted.doorSlot, "Move this pin")._listeners.click[0]();
    assert.ok(buttonByText(mounted.doorSlot, "Done moving"), "the press now says how to put the card back");

    mk.latlng = { lat: 5.6, lng: 100.5 };
    mk.handlers.dragend({ target: mk });
    assert.equal(st.customers[0].place.lat, 5.6, "now the drop is written against the customer");
    assert.equal(st.customers[0].place.lng, 100.5, "both numbers of it");
    assert.equal(st.customers[0].place.label, "12 Jalan Bunga",
      "and the door keeps the words it had — a bare lat/lng would print as two numbers on the ends line and the track card");
    assert.match(mounted.doorSlot.textContent, /12 Jalan Bunga/, "the caption follows the write");

    assert.doesNotMatch(mounted.wrap.textContent, /RM 14\.00/,
      "the price quoted for the OLD door is gone — leaving it would price the wrong address");
    assert.match(mounted.wrap.textContent, /ask again for a price for this spot/,
      "with a line that says so, rather than silently spending eight requests on a re-ask");
  } finally {
    closeDoor(mounted);
    s.restore();
    delete globalThis.window.L;
  }
});

test("the door the panel looks up on its way to a price moves the map's pin (v201)", async () => {
  signIn();
  const s = stubChannel();
  const leaf = makeLeaflet();
  globalThis.window.L = leaf.L;
  const st = courierState();
  let mounted = null;
  try {
    mounted = mountDoor(st, withDoor());
    await settle(4);
    const mk = leaf.rec.markers[0];
    assert.equal(mk.latlng.lat, 5.4299, "the pin starts on the customer's own suggestion");

    buttonByText(mounted.wrap, "Get a delivery price")._listeners.click[0]();
    await settle();

    assert.equal(st.customers[0].place.lat, 5.42,
      "asking for a price looks the address up and KEEPS the point against the customer");
    assert.equal(mk.latlng.lat, 5.42, "so the pin on the card has to follow it");
    assert.equal(mk.latlng.lng, 100.33, "both numbers of it");
    assert.equal(leaf.rec.maps.length, 1,
      "on the map that was already there — a second one would refetch every tile to say the same thing");
  } finally {
    closeDoor(mounted);
    s.restore();
    delete globalThis.window.L;
  }
});

test("a collect order gets no door block, and a courier order with no point gets no map (v201)", async () => {
  const leaf = makeLeaflet();
  globalThis.window.L = leaf.L;
  let collected = null;
  let pinless = null;
  try {
    // A collect order is not delivered anywhere, so there is no door to check. The slot is
    // handed over all the same — the host does not know which kind it is holding.
    collected = mountDoor(courierState(), { ...COURIER_ORDER, fulfillment: "collect" });
    await settle(4);
    assert.equal(collected.doorSlot.children.length, 0, "a collect order gets no door block at all");
    assert.equal(leaf.rec.maps.length, 0, "and no map is built for it");

    // A courier order with an address and nothing pinned: the words are the door, and a map
    // with no pin on it is a picture of nothing spending 200 pixels of the card.
    pinless = mountDoor(courierState(), { ...COURIER_ORDER });
    await settle(4);
    assert.match(pinless.doorSlot.textContent, /no point pinned yet/,
      "the address is shown, and said to be the door the driver is sent to");
    assert.ok(buttonByText(pinless.doorSlot, "Put this doorstep on the map"),
      "with the one press that CAN answer it — the address still has to be looked up");
    assert.equal(leaf.rec.maps.length, 0, "and still no map");
    assert.equal(byClass(pinless.doorSlot, "door-map").hidden, true,
      "the empty box is taken out of the way rather than left as a 200px hole");
  } finally {
    closeDoor(collected);
    closeDoor(pinless);
    delete globalThis.window.L;
  }
});

test("a pin named with the customer's own address is not printed twice on her card (v205)", async () => {
  // Since v205 the shop's pin carries the customer's OWN typed address as its words —
  // "One address, one point. Nothing else named." So on her screen the two are one string,
  // and the card saying it once as the address and once as the pin's name would be the
  // "it did not tally" report read backwards. The address is printed, and the pin adds
  // nothing that is already above it.
  globalThis.window.L = null;
  const ADDR = "12 Jalan Bunga, 10450 Penang";
  const lying = { ...COURIER_ORDER, address: ADDR, customerPlace: { lat: 5.4299, lng: 100.3399, label: ADDR, at: "2026-09-27T10:00:00.000Z" } };
  let mounted = null;
  try {
    mounted = mountDoor(courierState(), lying);
    await settle(4);
    const said = mounted.doorSlot.textContent;
    assert.equal(said.split(ADDR).length - 1, 1,
      "the address is on her card exactly once — it is the name of the pin, not two facts");
    assert.match(said, /Mei Ling's own pin from the shop page/,
      "and the pin is still said to be theirs and still not yet the driver's door");
    assert.match(said, /Not yet the door the driver is sent to/);
    assert.doesNotMatch(said, new RegExp(`${ADDR}[^]*?${ADDR}`),
      "never the address above the pin and the same words as the pin's own name");
  } finally {
    closeDoor(mounted);
    delete globalThis.window.L;
  }
});

test("a pin named with words that are NOT the address still says which spot it is (v205)", async () => {
  // The other half, and it must not be lost to the fix above: an older order's pin (or one
  // from a phone that has not reloaded) can still carry a name of its own, and a card that
  // dropped it would leave her unable to tell where the point was meant to be at all.
  globalThis.window.L = null;
  let mounted = null;
  try {
    mounted = mountDoor(courierState(), withDoor());
    await settle(4);
    const said = mounted.doorSlot.textContent;
    assert.match(said, /12 Jalan Bunga, 10450 Penang — Mei Ling's own pin from the shop page: Sri Bunga guard house/,
      "the address, then the pin, then what the pin calls itself — three facts, none repeated");
  } finally {
    closeDoor(mounted);
    delete globalThis.window.L;
  }
});

test("a phone that cannot load the map still shows the door, and says why the map is missing (v201)", async () => {
  // This file's default condition: the fetch stub rejects and the head shim fires every
  // script's `error` on a microtask, so Leaflet can never arrive. That is a one-bar phone,
  // and the block still has to be a way to check a door.
  globalThis.window.L = null;
  const st = courierState();
  let mounted = null;
  try {
    mounted = mountDoor(st, withDoor());
    await settle(4);

    assert.match(mounted.doorSlot.textContent, /The door the driver is sent to/,
      "the block is still there");
    assert.match(mounted.doorSlot.textContent, /Sri Bunga guard house/,
      "and still names the door — the words are the same fact the map would have drawn");
    assert.match(mounted.doorSlot.textContent, /The map is not available right now/,
      "with the missing map said out loud, rather than a blank space she cannot explain");
    assert.equal(byClass(mounted.doorSlot, "door-map").hidden, true, "and the empty box out of the way");
    assert.ok(buttonByText(mounted.doorSlot, "Move this pin"),
      "the press is still offered — the picker reads coordinates as well as addresses");
  } finally {
    closeDoor(mounted);
    delete globalThis.window.L;
  }
});

test("the map is read-only until she presses Move this pin (v201)", async () => {
  const leaf = makeLeaflet();
  globalThis.window.L = leaf.L;
  let mounted = null;
  try {
    mounted = mountDoor(courierState(), withDoor());
    await settle(4);
    const map = leaf.rec.maps[0];
    const mk = leaf.rec.markers[0];
    const box = byClass(mounted.doorSlot, "door-map");

    assert.equal(map.opts.dragging, false, "the map itself does not drag");
    assert.equal(map.opts.touchZoom, false, "nor pinch");
    assert.equal(map.opts.doubleClickZoom, false, "nor double-tap");
    assert.equal(map.opts.boxZoom, false, "nor box");
    assert.equal(map.opts.zoomControl, false, "and it carries no zoom buttons on a card that is only looking");
    assert.equal(map.opts.scrollWheelZoom, false, "a wheel passing over it scrolls the card, not the map");
    assert.equal(mk.opts.draggable, false, "the pin does not drag either");
    assert.equal(map.handlers.click, undefined, "and a tap on the map places nothing");
    // Measured once the card settled. A map built while the card is still being laid out
    // measures zero, draws a corner of one tile and never recovers — see the note on
    // `.place-map` in app.css. This is the rAF that prevents it.
    assert.equal(map.sized, 1, "and the box was measured once the card settled, not left at zero");
    // The dead zone. Leaflet sets `touch-action: none` on its own container, so a locked map
    // inside a scrolling card would make 200px of that card swallow her finger and leave the
    // Save button under it feeling unreachable.
    assert.equal(box.style.touchAction, "pan-y", "a locked map lets the card's own scroll through it");

    buttonByText(mounted.doorSlot, "Move this pin")._listeners.click[0]();
    assert.equal(map.dragging.on, true, "pressing it turns the map's drag on");
    assert.equal(map.touchZoom.on, true, "and pinch");
    assert.equal(map.doubleClickZoom.on, true, "and double-tap");
    assert.equal(map.boxZoom.on, true, "and box");
    assert.equal(mk.dragging.on, true, "and the pin's own drag");
    assert.equal(typeof map.handlers.click, "function", "and a tap becomes a way to place the pin");
    assert.equal(box.style.touchAction, "none", "the unlocked map takes the gesture for itself, like the picker's");

    buttonByText(mounted.doorSlot, "Done moving")._listeners.click[0]();
    assert.equal(map.dragging.on, false, "pressing it again locks the map");
    assert.equal(mk.dragging.on, false, "and the pin");
    assert.equal(map.handlers.click, undefined, "and takes the tap-to-place away with it");
    assert.equal(box.style.touchAction, "pan-y", "giving the card its scroll back");
  } finally {
    closeDoor(mounted);
    delete globalThis.window.L;
  }
});

test("a redraw of the card leaves the map where she left it (v201)", async () => {
  signIn();
  const s = stubChannel();
  const leaf = makeLeaflet();
  globalThis.window.L = leaf.L;
  const st = courierState();
  let mounted = null;
  try {
    mounted = mountDoor(st, withDoor());
    await settle(4);
    const mk = leaf.rec.markers[0];
    assert.equal(leaf.rec.views.length, 1, "the map is aimed at the door once, when it is built");

    // Every one of these is a repaint of an OPEN card, and `paintDoor` hands the current
    // point back to a map that is already showing it. The fault this catches is subtle
    // enough to have shipped: `setPlace` re-centred unconditionally, so a repaint threw away
    // a pan she had made with her own thumb, and a pin she had just dropped jumped back to
    // the middle of the box from under her finger. Both were found on a real render, not
    // here — which is the reason this test now exists to hold the fix.
    buttonByText(mounted.doorSlot, "Move this pin")._listeners.click[0]();
    assert.equal(leaf.rec.views.length, 1, "unlocking the pin does not re-aim the map at its own pin");

    buttonByText(mounted.doorSlot, "Done moving")._listeners.click[0]();
    assert.equal(leaf.rec.views.length, 1, "nor does locking it again");

    mk.latlng = { lat: 5.6, lng: 100.5 };
    mk.handlers.dragend({ target: mk });
    assert.equal(leaf.rec.views.length, 1,
      "and the drop she just made does not slide the map out from under her hand");

    // The other half, and it is not the same half: a door the map has never shown IS worth
    // moving the view for, or the address lookup would resolve a new door and leave her
    // looking at the old one.
    buttonByText(mounted.wrap, "Get a delivery price")._listeners.click[0]();
    await settle();
    assert.equal(leaf.rec.views.length, 2, "the door the lookup finds is the one the map moves to");
    assert.deepEqual(leaf.rec.views[1].center, [5.42, 100.33], "and it is aimed at the new point");
    assert.equal(mk.latlng.lat, 5.42, "with the pin on it");
  } finally {
    closeDoor(mounted);
    s.restore();
    delete globalThis.window.L;
  }
});
