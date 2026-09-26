// test/store-address.test.js — the shop's typed-address flow, driven through the real
// page (v202, 26 Sep 2026).
//
// WHY THIS FILE IS DRIVEN AND NOT READ. test/store-lookup.test.js proves the RULES — what
// is worth asking, how a reply is read, how a late answer is thrown away — and it is pure.
// What it cannot see is the wiring: that typing in the box reaches the lookup at all, that
// a row the customer taps actually puts the pin on their door, that the map opens on THAT
// door and not on the island, and that Cancel does not throw their choice away. That is
// store/app.js's own code, and the only honest way to test it is to boot the page.
//
// The shim is the one test/store.pool.dom.test.js and test/store.avail.test.js already
// boot store/app.js with, plus a Leaflet — because this feature's whole point is that the
// map comes to the address, and a stub map that recorded nothing could not tell a map that
// flew there from one that opened on Penang. The rule kept here, as everywhere in this
// suite: every part of the shim models the part of the browser that MATTERS to the
// assertion, and in particular `document.head.append(script)` does NOT load anything.

import { test } from "node:test";
import assert from "node:assert/strict";

// ── the shim ───────────────────────────────────────────────────────────────

function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    hidden: false, scrollTop: 0, _listeners: {},
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

const registry = {};
const head = createEl("head");
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (registry[id] ||= createEl("div")),
  querySelector: () => null,
  querySelectorAll: () => [],
  head,
  body: createEl("body"),
};
globalThis.window = {};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.localStorage = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};

// A Leaflet that records what it was asked to do. Not an approximation of Leaflet — a
// record of the calls the map makes, which is what the assertions below read.
const rec = { maps: [], views: [], tiles: [], markers: [] };
globalThis.window.L = {
  map(container, opts) {
    const m = {
      container, opts, removed: false, handlers: {},
      setView(center, zoom) { m.center = center; m.zoom = zoom; rec.views.push({ center, zoom }); return m; },
      addTo() { return m; }, on(evt, cb) { m.handlers[evt] = cb; return m; },
      remove() { m.removed = true; }, invalidateSize() {},
    };
    rec.maps.push(m);
    return m;
  },
  tileLayer(url, opts) { const t = { url, opts, addTo(map) { return t; } }; rec.tiles.push(t); return t; },
  marker(latlng, opts) {
    const mk = {
      latlng: { lat: latlng[0], lng: latlng[1] }, opts, handlers: {},
      addTo() { return mk; }, on(evt, cb) { mk.handlers[evt] = cb; return mk; },
      getLatLng() { return { ...mk.latlng }; }, setLatLng(ll) { mk.latlng = { lat: ll[0], lng: ll[1] }; },
    };
    rec.markers.push(mk);
    return mk;
  },
};

// What the lookup answers with. Set per test; everything that is not the lookup gets the
// empty array the shop's own data calls already answer with in the other store tests.
let reply = { ok: true, places: [] };
let asks = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes("/functions/v1/shop-geocode")) {
    asks.push({ url: u, body: opts.body });
    return { ok: true, status: 200, json: async () => reply };
  }
  return { ok: true, status: 200, json: async () => [] };
};

const { STORE } = await import("../store-lang.js");
const { setLang, resetPin } = await import("../store/app.js");

// ── helpers ────────────────────────────────────────────────────────────────

// A mocked clock fires a timer's CALLBACK, but everything the callback starts — the fetch
// promise, the lookup's own settle — is a promise reaction on the microtask queue. Without
// this the assertion reads the state before the answer lands. (test/store-map.test.js.)
const flush = async (rounds = 14) => { for (let i = 0; i < rounds; i++) await Promise.resolve(); };

// EVERY TEST BELOW DRIVES THE SAME BOOTED PAGE, so the module's own state — the pin, the
// box, the last list, the lookup — carries from one test straight into the next. That is
// not a theoretical worry: a fault sweep found the Cancel test passing off a pin a
// PREVIOUS test had left behind instead of the one it had just tapped, so it kept passing
// with the line that puts the tapped door back REMOVED. Each test therefore starts where a
// new customer starts, by calling the app's own between-customers reset rather than a
// test-only tidy — so this also exercises the code path that runs after every order.
function begin(t) {
  reply = { ok: true, places: [] };
  asks = [];
  rec.maps.length = 0; rec.views.length = 0; rec.tiles.length = 0; rec.markers.length = 0;
  t.mock.timers.enable({ apis: ["setTimeout"] });
  resetPin();
}

const el = (id) => registry[id];
// Fire the listener the page registered, which is what a real tap does.
const fire = (node, type) => { for (const f of (node._listeners[type] || [])) f(); };

// The one action under test: the customer types. `wireLookup` listens on `input`, so this
// is the real path from keystroke to lookup to painted list.
function type(text) {
  const input = el("address-input");
  input.value = text;
  fire(input, "input");
}

const HIT = { lat: 5.4166, lng: 100.3311, label: "12, Jalan Bunga, Penang" };

// ── the flow ───────────────────────────────────────────────────────────────

test("typing an address brings up the doors, and tapping one opens the map ON it", async (t) => {
  begin(t);
  reply = { ok: true, places: [{ ...HIT }] };

  type("12 Jalan Bunga, Penang");
  assert.equal(asks.length, 0, "nothing is asked while they are still typing");
  t.mock.timers.tick(700);
  await flush();

  const list = el("addr-list");
  assert.equal(asks.length, 1, "one pause, one ask");
  assert.equal(list.hidden, false, "the list is on screen");
  assert.equal(list.children.length, 2, "one line explaining, one row per door");
  assert.equal(list.children[0].textContent, STORE.en.addrPick);
  assert.equal(list.children[1].textContent, HIT.label, "the row says which door it is");

  // The tap. Everything from here is the feature she asked for.
  fire(list.children[1], "click");
  await flush();

  assert.equal(rec.maps.length, 1, "the map was built — this is the 'bring them there' half");
  assert.deepEqual(rec.views[0].center, [HIT.lat, HIT.lng],
    "and it opened on the address they chose, not on the whole island");
  assert.equal(rec.views[0].zoom, 17, "close enough to see their own door");
  assert.equal(rec.markers.length, 1, "with the pin already on it");
  assert.equal(el("pin-box").hidden, false, "the box it lives in is open");
  assert.equal(el("pin-status").textContent, STORE.en.pinSet);
  assert.equal(el("pin-keep").disabled, false, "and 'Keep this spot' is live");
});

test("tapping a door while the map is already open aims THAT map, and Cancel keeps the door", async (t) => {
  // The customer opened the map first and had a look round. Then they typed an address and
  // tapped a door. Two things must hold: the map they are already looking at is the one
  // that flies (not a second one drawn over it), and Cancel must put back the door they
  // chose rather than the nothing that was there when the map session began — which is
  // exactly the state `begin` puts the page in below.
  begin(t);
  reply = { ok: true, places: [{ ...HIT }] };

  fire(el("pin-map"), "click");   // "Pin on the map" — opened by hand, nothing pinned yet
  await flush();
  assert.equal(rec.maps.length, 1, "the map is up, with no pin on it");

  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();
  fire(el("addr-list").children[1], "click");
  await flush();

  assert.equal(rec.maps.length, 1, "ONE map — the open one was aimed, not rebuilt");
  assert.equal(rec.views.length, 2, "and a second setView, which is the flying");
  assert.deepEqual(rec.views[1].center, [HIT.lat, HIT.lng]);
  assert.equal(rec.views[1].zoom, 17);

  // Cancel. pinWasAt was moved onto the choice when they tapped, so this puts the pin back
  // to the door — a customer must not be able to undo a decision they did not make.
  fire(el("pin-cancel"), "click");
  await flush();
  assert.equal(el("pin-box").hidden, true, "the box is closed");
  assert.equal(el("pin-status").textContent, STORE.en.pinSet,
    "but the door they picked is still their pin — Cancel restored it, it did not erase it");
  assert.equal(el("pin-keep").disabled, false, "and it can still be kept");
});

test("a lookup that finds nothing says so, and the map is still one tap away", async (t) => {
  begin(t);
  reply = { ok: false, why: "notfound" };

  type("Nowhere At All, Penang");
  t.mock.timers.tick(700);
  await flush();

  const list = el("addr-list");
  assert.equal(list.hidden, false, "the customer is told something rather than left guessing");
  assert.equal(list.children.length, 1, "there is nothing to choose from, so there are no rows");
  assert.equal(list.children[0].textContent, STORE.en.addrNone);
  assert.match(STORE.en.addrNone, /pin on your door/i, "and it points at the map, which still works");
  assert.notEqual(el("pin-map").disabled, true,
    "the map button is untouched by a lookup that found nothing — the sale is never blocked");
});

test("the lookup being unavailable reads DIFFERENTLY from the address not existing", async (t) => {
  // Telling a customer their house does not exist when the bakery's server is simply down
  // is the wrong sentence, and it is the one that would make them stop trying.
  begin(t);
  reply = { ok: false, why: "unreachable" };
  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();

  const list = el("addr-list");
  assert.equal(list.children[0].textContent, STORE.en.addrFailed);
  assert.notEqual(list.children[0].textContent, STORE.en.addrNone);
});

test("emptying the box takes the list away — a stale list under an empty box is worse than none", async (t) => {
  begin(t);
  reply = { ok: true, places: [{ ...HIT }] };
  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();
  assert.equal(el("addr-list").hidden, false);

  type("");
  await flush();
  assert.equal(el("addr-list").hidden, true, "the list goes as the box empties");
  assert.equal(el("addr-list").children.length, 0, "and is emptied, not just hidden");
});

test("switching language says the SAME sentence again in the language just chosen", async (t) => {
  // The list holds a dictionary KEY, not a sentence, and this is why: a customer reading
  // 中文 who switches mid-list must not be left with an English line above their doors.
  begin(t);
  reply = { ok: false, why: "notfound" };
  setLang("en");
  type("Nowhere At All, Penang");
  t.mock.timers.tick(700);
  await flush();
  assert.equal(el("addr-list").children[0].textContent, STORE.en.addrNone);

  setLang("zh");
  await flush();
  assert.equal(el("addr-list").children[0].textContent, STORE.zh.addrNone,
    "the line was re-said in 中文, off the key rather than the sentence");
  setLang("en");
});

test("a door the lookup found but could not name is still a row, shown as its numbers", async (t) => {
  // A geocoder that found the point but sent no words still found the point. Dropping the
  // row would throw away a real door, and a blank row would be a tap that says nothing
  // about where it goes — which is the dead-control complaint this shop has a rule about.
  begin(t);
  reply = { ok: true, places: [{ lat: 5.4141, lng: 100.3288 }] };

  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();

  const list = el("addr-list");
  assert.equal(list.children.length, 2, "a nameless door is still a row to tap");
  assert.equal(list.children[1].textContent, "5.4141, 100.3288",
    "and it says where it is rather than leaving the row blank");

  fire(list.children[1], "click");
  await flush();
  assert.deepEqual(rec.views[0].center, [5.4141, 100.3288], "and it still takes them there");
  assert.equal(el("pin-status").textContent, STORE.en.pinSet);
});

test("choosing a door retires the instruction it obeyed, and a new answer brings it back", async (t) => {
  // "Tap the one that matches your address" is something to DO. The moment a door is taken,
  // the line under the map says the pin is set — and an instruction that outlives its own
  // action is the dead-control family this shop has a rule about. The ROWS stay, though:
  // changing your mind should be a second tap, not retyping the street.
  begin(t);
  reply = { ok: true, places: [{ ...HIT }] };

  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();
  const list = el("addr-list");
  assert.equal(list.children[0].textContent, STORE.en.addrPick, "the instruction is there to be obeyed");

  fire(list.children[1], "click");
  await flush();
  assert.equal(list.hidden, false, "the list is still there to choose from");
  assert.equal(list.children.length, 1, "the instruction is gone, the row it named is not");
  assert.equal(list.children[0].textContent, HIT.label, "and the row still says which door it is");

  // A second tap still lands — nothing about the choice froze the list.
  fire(list.children[0], "click");
  await flush();
  assert.equal(el("pin-status").textContent, STORE.en.pinSet, "the other door can still be taken");

  // Any fresh answer is a fresh question, so the instruction belongs on screen again.
  type("14 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();
  assert.equal(el("addr-list").children[0].textContent, STORE.en.addrPick,
    "asking again puts the instruction back — it is retired by a choice, not by the list");
  assert.equal(el("addr-list").children.length, 2);
});

// ── the phone is handed to the next customer (resetPin) ────────────────────

test("a placed order leaves no door and no list behind — the next customer starts clean", async (t) => {
  // The phone is passed across the counter after a sale. resetPin is what the page calls
  // the moment an order is placed, and a stranger's front door left on screen is the
  // small, ordinary harm this prevents.
  begin(t);
  reply = { ok: true, places: [{ ...HIT }] };
  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();
  fire(el("addr-list").children[1], "click");
  await flush();
  assert.equal(el("pin-status").textContent, STORE.en.pinSet, "the door is pinned to start with");
  // ONE child, not two: the instruction above the rows was retired by the tap below.
  assert.equal(el("addr-list").children.length, 1, "the row they tapped, with no instruction left over");

  resetPin();
  await flush();

  assert.equal(el("addr-list").hidden, true, "the list goes with the order");
  assert.equal(el("addr-list").children.length, 0, "and is emptied rather than merely hidden");
  assert.equal(el("pin-status").hidden, true, "and no door is still standing");
  assert.equal(el("pin-status").textContent, "");
  assert.equal(el("pin-keep").disabled, true, "so 'Keep this spot' is not live for a stranger");
});

test("an answer still in the air cannot land on the NEXT customer's empty box", async (t) => {
  // The other half of the same moment, and the one that is easy to miss: a lookup asked
  // for by the last customer can still be in the air when the order is placed. It must not
  // arrive a second later and put their house back on the screen.
  begin(t);
  let release;
  reply = new Promise((r) => { release = () => r({ ok: true, places: [{ ...HIT }] }); });

  type("12 Jalan Bunga, Penang");
  t.mock.timers.tick(700);
  await flush();
  resetPin();
  await flush();

  release();          // the lookup finally answers, to a box that has moved on
  await flush();

  assert.equal(el("addr-list").hidden, true, "the last customer's door never reappeared");
  assert.equal(el("addr-list").children.length, 0);
  assert.equal(el("pin-status").hidden, true);
});
