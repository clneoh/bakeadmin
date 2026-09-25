// test/delivery-run.test.js — the delivery run, on the drawn screen and on the wire
// (v191, 25 Sep 2026).
//
// test/courier-run.test.js holds the pure arithmetic — the window's packing, the load,
// the split, the one-trip-against-separate saving. This file holds the SCREEN, and the
// things only the screen can get wrong. Four of them, each one a way of being quietly
// wrong with real money behind it:
//
//   1. ONE DOORSTEP PER CUSTOMER, ON THE WIRE. A customer who bought three lines is one
//      stop. This is asserted on the BYTES that would have left the phone — the drops in
//      the request body — because a trip built from order lines sends the same van to the
//      same door three times and the courier bills a stop fee for each one. Reading the
//      trip object back would not catch it; the wire is where it costs money.
//
//   2. THE WINDOW REACHES THE CUSTOMER. A window typed on the run screen has to arrive on
//      the published track card and in the WhatsApp messages, and a window that could not
//      be typed — an end before its start — must reach NEITHER. This is the half of the
//      feature a customer can be disappointed by.
//
//   3. EVERY CUSTOMER GETS THE SAME TRIP. One booking, one share link, stamped onto every
//      order the run carries — and stamped on all of them, or the ones left behind have no
//      way to be tracked at all.
//
//   4. THE CHARGE IS ONE FEE SPLIT, NOT ONE FEE EACH. Each order's box takes its share,
//      and the shares add up to what she was charged. A run that wrote the FULL fee onto
//      every order would have her asking three customers for the price of one trip.
//
// The screen sits behind the sign-in, so it is built for real on a stand-in DOM, and the
// courier function is answered by a stubbed `fetch`. Nothing about the app's own code is
// stubbed: the same modules the phone runs are the ones under test here.
//
// Assertions avoid the middle dot (` · `) and the multiplication sign that the app's own
// strings carry. Those characters are identical in the source and here, but a test file
// is copied, pasted and retyped, and an assertion that fails over an invisible byte would
// be blamed on the screen rather than on the test. Each one is written as the readable
// words it is really about.

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

// ── the stand-in screen ───────────────────────────────────────────────────
//
// The house shim, and each part of it earns its place:
//
//   • isConnected is WALKED, not assumed. The run screen asks its own node whether it is
//     still on the page before writing a slow reply into it, so a stand-in that answered
//     `undefined` would send every write down the "it is gone" path and these tests would
//     pass for the wrong reason. Dropping a child with replaceChildren must therefore take
//     its isConnected away with it, which is why the parent link is cut.
//   • A STRING handed to a DOM write becomes a text node. The real DOM does this with
//     String(), and the run screen hands its load line a list of plain strings — so a
//     stand-in that stored them verbatim would answer `textContent` with `undefined` and
//     the load she reads would read as empty here while being right on her phone.
//   • A SELECT reads back the option that is selected, the way a browser's does. ui.js's
//     select() sets `value` on the OPTIONs and never on the select itself, so a plain
//     property would leave every picker in the app reading "" — and this screen's answer
//     to "How you paid the courier" is read from exactly there.

function createEl(tag) {
  const node = {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, checked: false, disabled: false, hidden: false, selected: false,
    scrollTop: 0, parentNode: null, _listeners: {}, _val: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) {
      if (c == null) return c;
      const n = toNode(c);
      this.children.push(n);
      if (n.nodeType === 1) n.parentNode = this;
      return n;
    },
    append(...cs) {
      for (const c of cs) if (c != null) {
        const n = toNode(c);
        this.children.push(n);
        if (n.nodeType === 1) n.parentNode = this;
      }
    },
    replaceChildren(...cs) {
      for (const old of this.children) if (old && old.nodeType === 1) old.parentNode = null;
      this.children = [];
      for (const c of cs) if (c != null) {
        const n = toNode(c);
        this.children.push(n);
        if (n.nodeType === 1) n.parentNode = this;
      }
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
  Object.defineProperty(node, "isConnected", {
    get() {
      let n = this;
      while (n) { if (n.__root) return true; n = n.parentNode; }
      return false;
    },
  });
  Object.defineProperty(node, "value", {
    get() {
      if (this._val !== "") return this._val;
      // A real select with nothing marked selected shows its first option.
      const opts = all(this).filter((n) => n.tagName === "OPTION");
      const sel = opts.find((o) => o.selected) || opts[0];
      return sel ? sel.value : "";
    },
    set(v) { this._val = String(v); },
  });
  return node;
}

// What the real DOM does with anything that is not already a node.
const toNode = (c) => (c && c.nodeType ? c : { nodeType: 3, text: String(c) });

const all = (node, out = []) => {
  for (const c of node.children || []) { out.push(c); all(c, out); }
  return out;
};

// One toast node for the whole file. toast() looks its own node up by class and creates
// one only when it finds none, so a `querySelector` that always answered null would leave
// a fresh 2.2-second timer behind on every call — and the suite would sit there after its
// last assertion waiting for a toast nobody is reading.
const toastNode = Object.assign(createEl("div"), { className: "toast" });
const layers = {};
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: (id) => (layers[id] ||= Object.assign(createEl("div"), { __root: true })),
  querySelector: (sel) => (String(sel).includes("toast") ? toastNode : null),
  querySelectorAll: () => [],
  scrollingElement: createEl("html"),
  body: (() => { const b = createEl("body"); b.__root = true; return b; })(),
  head: createEl("head"),
};
globalThis.window = { open() {} };
globalThis.history = { replaceState() {} };

// The phone's own storage, in the shape supabase.js reads it. The channel refuses to call
// anything without a session, so a file that skipped this would be testing the refusal
// message rather than the run.
globalThis.localStorage = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
globalThis.localStorage.setItem(
  "bakeadmin.supabase",
  JSON.stringify({ access_token: "test-session-token", expires_at: Date.now() + 3600_000 }),
);

// Everything this file installs or opens, so a test that throws part way through still
// puts the global fetch back and still stops the screen's own beat. The run screen clears
// its beat itself once its node is detached — but these roots are marked as on the page,
// so it never will, and an interval left running keeps the whole Node process alive after
// the last assertion. A suite that passes and then never finishes is its own kind of bug.
const wires = [];
const cleanups = [];

afterEach(() => {
  for (const c of cleanups.splice(0)) { try { c(); } catch { /* nothing to stop */ } }
  for (const w of wires.splice(0).reverse()) w.restore();
  clearTimeout(toastNode._timer);
});

const { renderDeliveryRun } = await import("../admin/js/views/delivery_run.js");
const { trackingSnapshot } = await import("../admin/js/supabase.js");
const { buildShippedMessage, buildPaymentReminder } = await import("../admin/js/messages.js");
const { keyOf } = await import("../admin/js/customers.js");

// ── the world ─────────────────────────────────────────────────────────────

// Two customers on one delivery day, one of them with TWO lines on their order. That
// second customer is the whole point: they are one doorstep and two order rows.
//
// Both doorsteps are already pinned, so the run screen has nothing to geocode — which
// keeps the stubbed wire down to the calls this feature is actually about.
//
// Shared data is on for its URL, but NOT signed in as an app account: the publish and
// sync paths answer nothing without a login, so this file reaches no network it did not
// stub. email/password are deliberately absent, which is what holds that door shut.
function world() {
  const st = {
    version: 1,
    settings: {
      currency: "RM",
      courier: { dispatch: "10:00" },
      supabase: { enabled: true, url: "https://proj.supabase.co", anonKey: "anon-key" },
      storefront: { name: "Jienluv2bake", whatsapp: "60123456789" },
      pickupPlace: { lat: 5.4141, lng: 100.3288, label: "The bakery, Penang" },
    },
    products: [{ id: "p1", name: "Focaccia", price: 15, active: true }],
    deliveryDates: [{ id: "d1", date: "2026-09-26" }],
    customers: [],
    orders: [
      { id: "o1", groupId: "g1", deliveryDateId: "d1", fulfillment: "courier",
        status: "paid", createdAt: "2026-09-20T02:00:00.000Z",
        address: "1 Jalan A", whatsapp: "+60 12-111 1111", customerName: "Ain",
        productId: "p1", qty: 2 },
      { id: "o2", groupId: "g1", deliveryDateId: "d1", fulfillment: "courier",
        status: "paid", createdAt: "2026-09-20T02:00:00.000Z",
        address: "1 Jalan A", whatsapp: "+60 12-111 1111", customerName: "Ain",
        productId: "p1", qty: 1 },
      { id: "o3", groupId: "g2", deliveryDateId: "d1", fulfillment: "courier",
        status: "paid", createdAt: "2026-09-20T03:00:00.000Z",
        address: "9 Jalan B", whatsapp: "+60 12-222 2222", customerName: "Bala",
        productId: "p1", qty: 3 },
    ],
    ingredients: [], occasions: [], expenses: [],
  };
  // Pinned doorsteps, keyed the way the app keys a person — derived from the orders
  // themselves, so this fixture cannot drift away from the key the screen looks up.
  st.customers = [
    { id: "cus_1", key: keyOf(st.orders[0]), name: "Ain", whatsapp: "+60 12-111 1111",
      place: { lat: 5.42, lng: 100.33, label: "Ain's door" } },
    { id: "cus_2", key: keyOf(st.orders[2]), name: "Bala", whatsapp: "+60 12-222 2222",
      place: { lat: 5.43, lng: 100.34, label: "Bala's door" } },
  ];
  return st;
}

// A third customer, for the one case the split cannot get right by accident: a fee that
// does not divide evenly. RM22 over two orders is RM11 each, which any wrong arithmetic
// would also produce.
function withThirdCustomer(st) {
  st.orders.push({ id: "o4", groupId: "g3", deliveryDateId: "d1", fulfillment: "courier",
    status: "paid", createdAt: "2026-09-20T04:00:00.000Z",
    address: "5 Jalan C", whatsapp: "+60 12-333 3333", customerName: "Chandra",
    productId: "p1", qty: 1 });
  st.customers.push({ id: "cus_3", key: keyOf(st.orders[3]), name: "Chandra",
    whatsapp: "+60 12-333 3333", place: { lat: 5.44, lng: 100.35, label: "Chandra's door" } });
  return st;
}

// ── the stubbed wire ──────────────────────────────────────────────────────
//
// It answers the courier function's own contract — a JSON body carrying `{ok, ...}` — and
// records every request, so a test can read the bytes that would have left the phone.
//
// The fleet is Motorcycle then Car, in the app's own order (sortServices), and the two
// prices differ so a test can tell which row it pressed.
const MOTORCYCLE_FEE = 18.5;
const CAR_FEE = 22;

function stubCourier() {
  const real = globalThis.fetch;
  const sent = [];
  const stubFetch = async (url, opts = {}) => {
    const body = JSON.parse(String(opts.body || "{}"));
    sent.push(body);
    const reply = answerFor(body);
    return { ok: true, status: 200, json: async () => reply, text: async () => JSON.stringify(reply) };
  };
  globalThis.fetch = stubFetch;
  // Putting the real one back only if this stub is the one still in place. Two stubs in
  // one test, and a restore that fired blindly, would hand the second one the first one's
  // predecessor and quietly un-stub the wire the test is still reading.
  const stub = { sent, restore() { if (globalThis.fetch === stubFetch) globalThis.fetch = real; } };
  wires.push(stub);
  return stub;
}

function answerFor(body) {
  const p = body.payload || {};
  if (body.action === "vehicles") {
    return { ok: true, services: [{ key: "MOTORCYCLE" }, { key: "CAR" }] };
  }
  if (body.action === "quote") {
    // One price per vehicle asked for, and one price for the journey it was asked about:
    // the bakery plus one point per drop. A separate-trip request carries two points, a
    // run of two customers carries three.
    const points = 1 + (Array.isArray(p.drops) ? p.drops.length : 1);
    return {
      ok: true,
      quotes: (p.services || []).map((key) => ({
        quotationId: `Q-${key}-${points}`,
        serviceType: key,
        priceBreakdown: { total: key === "CAR" ? CAR_FEE : MOTORCYCLE_FEE, currency: "MYR" },
        distance: { value: 12.5, unit: "km" },
        // No geometry at all, which is the documented reply: the reader then takes the
        // stop handles in order, and a test can assert on the count without inventing
        // coordinates it does not care about.
        stops: Array.from({ length: points }, (_, i) => ({ stopId: `${key}-${points}-s${i}` })),
      })),
      failed: [],
    };
  }
  if (body.action === "book") {
    return { ok: true, order: {
      orderId: "LLM-RUN-1",
      quotationId: p.quotationId,
      status: "ASSIGNING_DRIVER",
      shareLink: "https://lalamove.com/t/run-abc",
      priceBreakdown: { total: CAR_FEE, currency: "MYR" },
    } };
  }
  return { ok: false, reason: `no stub for ${body.action}` };
}

// ── driving the screen ────────────────────────────────────────────────────

const buttonByText = (root, text) =>
  all(root).find((n) => n.tagName === "BUTTON" && n.textContent.includes(text));
const inputByLabel = (root, label) =>
  all(root).find((n) => n.tagName === "INPUT" && n.attrs["aria-label"] === label);

function press(node) { for (const f of node._listeners.click || []) f({ preventDefault() {} }); }
function type(node, value) { node.value = value; for (const f of node._listeners.input || []) f({}); }
function change(node, value) { node.value = value; for (const f of node._listeners.change || []) f({}); }

// The async chains down the wire are real promises, so a press is followed by a flush of
// the microtask and timer queues rather than an assumption about how many hops deep the
// work goes.
async function settle(rounds = 14) {
  for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0));
}

// The screen, rendered for the one day there is. The root is marked as on the page: the
// real one is inside #view, and every press on this screen refuses to act against a node
// that has been taken off it, so a root with no marker would answer "not connected" and
// nothing would ever be priced.
function openRun(st) {
  const root = Object.assign(createEl("div"), { __root: true });
  const cleanup = renderDeliveryRun(root, st, new URLSearchParams({ date: "d1" }));
  if (typeof cleanup === "function") cleanups.push(cleanup);
  return { root, cleanup };
}

// One price row, found by the vehicle's own name — the name the courier's own file gave
// it, which is what the screen prints and what she reads when she chooses.
function priceRow(root, name) {
  const cell = all(root).find((n) => String(n.className).includes("quote-name") && n.textContent === name);
  let node = cell;
  while (node && !String(node.className).includes("quote-row")) node = node.parentNode;
  return node && String(node.className).includes("quote-row") ? node : undefined;
}

// The charge questions, answered the way she answers them: by picking the words she sees.
// Order matters — the method picker only exists once the payer has said she bore it.
function answerCharge(root, { payer = "", method = "" } = {}) {
  for (const want of [payer, method].filter(Boolean)) {
    const sel = all(root).find((n) => n.tagName === "SELECT"
      && all(n).some((o) => o.tagName === "OPTION" && o.textContent === want));
    assert.ok(sel, `there is a picker offering "${want}"`);
    const opt = all(sel).find((o) => o.tagName === "OPTION" && o.textContent === want);
    change(sel, opt.value);
  }
}

// The whole trip, as she makes it: price the run, answer the charge questions, press Book
// on ONE vehicle's row, and say yes to the app's own red confirmation.
async function book(st, { window: win = "", payer = "", method = "", vehicle = "Car" } = {}) {
  const wire = stubCourier();
  const { root } = openRun(st);
  if (win) {
    type(inputByLabel(root, "The delivery window opens"), win.split("-")[0]);
    type(inputByLabel(root, "The delivery window closes"), win.split("-")[1]);
  }
  press(buttonByText(root, "Price this run"));
  await settle();
  assert.ok(priceRow(root, vehicle), `the ${vehicle} came back priced`);
  answerCharge(root, { payer, method });
  press(buttonByText(priceRow(root, vehicle), "Book this run"));
  const confirm = layers["confirm-layer"];
  const yes = buttonByText(confirm, "Book this run");
  assert.ok(yes, "the app asked before spending money");
  press(yes);
  await settle();
  return { root, wire, confirm };
}

// ── 1. one doorstep per customer, on the wire ─────────────────────────────

test("a run prices ONE drop per customer, however many lines their order holds", async () => {
  // The fault this pins: the trip is built from the ORDER rows. Ain has two lines, so a
  // trip built from lines carries three drops and the courier bills three stop fees for
  // two houses. Read on the wire rather than off the trip object, because the wire is
  // where the money is.
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);
  press(buttonByText(root, "Price this run"));
  await settle();

  const asks = wire.sent.filter((b) => b.action === "quote");
  assert.equal(asks.length, 1, "one price request for the whole run");
  assert.equal(asks[0].payload.drops.length, 2, "two customers, two drops — not three order lines");
  assert.deepEqual(asks[0].payload.drops.map((d) => d.address), ["1 Jalan A", "9 Jalan B"]);
  assert.deepEqual(asks[0].payload.services, ["MOTORCYCLE", "CAR"],
    "the fleet is asked of the courier, not written down in the screen");
  assert.equal(asks[0].payload.scheduleAt, "2026-09-26T02:00:00.000Z",
    "the collection day and time she set, turned into the UTC instant the API wants");
});

test("the load beside the price counts doorsteps and items, not rows", async () => {
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);
  const read = all(root).find((n) => String(n.className).includes("run-load"));
  assert.ok(read.textContent.startsWith("2 stops"), `two doors — read "${read.textContent}"`);
  assert.ok(read.textContent.includes("6 items"), "six focaccia, however the lines are split");
  assert.ok(read.textContent.includes("Focaccia"), "named the way the rest of the app names an item");
});

test("one customer of three does not need three ticks", async () => {
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);
  const ticks = all(root).filter((n) => n.tagName === "INPUT" && String(n.className).includes("run-tick"));
  assert.equal(ticks.length, 2, "one tick per customer, never per order line");
  assert.ok(ticks.every((t) => t.checked), "and the whole day is on to begin with");
});

test("one row's own tick moves the count and the bulk press with it", async () => {
  // The fault this pins: the head line and the bulk press describe the SAME set the ticks do,
  // so a single row's tick has to move them too. It did not — the row's handler repainted the
  // load, the prices and the pay box, and only the bulk press rebuilt the list the head lives
  // in, so unticking one customer left the head reading "2 of 2" over a list of one. Two
  // controls that look alike answering differently is the shape of bug this app treats as a
  // broken promise rather than a cosmetic one.
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);

  const head = () => all(root).find((n) => String(n.className).includes("run-head-title")).textContent;
  const bulk = () => (buttonByText(root, "Tick them all") || buttonByText(root, "Untick them all")).textContent;

  assert.equal(head(), "Who is on the run — 2 of 2", `the whole day is on — read "${head()}"`);
  assert.equal(bulk(), "Untick them all", "and the bulk press offers to take them off");

  const ticks = all(root).filter((n) => n.tagName === "INPUT" && String(n.className).includes("run-tick"));
  ticks[1].checked = false;
  change(ticks[1], "");

  assert.equal(head(), "Who is on the run — 1 of 2", `one off, and the count says so — read "${head()}"`);
  assert.equal(bulk(), "Tick them all", "and the bulk press now offers to put them back");
});

// ── 2. booking the run ────────────────────────────────────────────────────

test("one booking puts the same trip and one link on every order the run carries", async () => {
  const st = world();
  const { wire } = await book(st, { payer: "The customer paid it" });
  for (const o of st.orders) {
    assert.ok(o.courierJob, `${o.id} is on the trip`);
    assert.equal(o.courierJob.jobId, "LLM-RUN-1");
    assert.equal(o.trackingNo, "https://lalamove.com/t/run-abc",
      "every customer's card and message carries the one share link");
    assert.equal(o.courierJob.courierName, "Lalamove", "from the provider's own label");
  }
  const books = wire.sent.filter((b) => b.action === "book");
  assert.equal(books.length, 1, "ONE trip, not one per customer");
  assert.equal(books[0].payload.recipients.length, 2, "and it names both doorsteps");
  assert.equal(books[0].payload.sender.stopId, "CAR-3-s0", "the bakery, by the handle it was priced at");
  assert.deepEqual(books[0].payload.recipients.map((r) => r.stopId), ["CAR-3-s1", "CAR-3-s2"]);
  assert.equal(books[0].payload.quotationId, "Q-CAR-3", "booked at the quotation she chose");
});

test("a trip is stamped on every LINE of a group, not only its first", async () => {
  // Ain's order is two rows. A booking written on the first row alone would come apart the
  // moment that order is edited and its rows are re-split, and the customer would be left
  // with an order that had never heard of the trip carrying it.
  const st = world();
  await book(st, { payer: "The customer paid it" });
  assert.equal(st.orders[1].courierJob.jobId, "LLM-RUN-1", "the second line of Ain's order too");
  assert.equal(st.orders[1].trackingNo, "https://lalamove.com/t/run-abc");
});

test("the money each customer is asked for is a SHARE of one fee, and the shares are the fee", async () => {
  // The fault this pins: the whole fee written onto every order. Two customers on a RM22
  // trip would then be asked for RM44 — the courier paid once and billed twice.
  const st = world();
  await book(st, { payer: "The customer paid it" });
  assert.equal(st.orders[0].courierFee, 11, "half of RM22");
  assert.equal(st.orders[1].courierFee, 11, "the second line of the SAME order is the same order");
  assert.equal(st.orders[2].courierFee, 11);
  assert.equal(st.orders[0].courierPaidBy, "customer");
  assert.equal(st.orders[2].courierPaidBy, "customer");
  assert.deepEqual(st.expenses, [],
    "a charge the customer bears never becomes a cost on her own books");
});

test("a charge SHE bears lands on her books once per order, at the share and not the fee", async () => {
  const st = world();
  await book(st, { payer: "I paid it", method: "Cash" });
  // Two groups on the run, so two shares of the fee, and each one is its own row — the
  // row is what reconciles against that customer's order.
  assert.equal(st.expenses.length, 2);
  assert.deepEqual(st.expenses.map((e) => e.amount), [11, 11]);
  for (const e of st.expenses) {
    assert.equal(e.category, "Delivery & fuel");
    assert.equal(e.method, "Cash");
  }
  assert.equal(st.orders[0].courierPaidBy, "me");
});

test("the odd cents are on the last order, so the shares add up to the fee exactly", async () => {
  // RM22 over two orders divides evenly, so the interesting case is a fee that does not.
  // THREE customers is what makes it: the screen divides by the ticked count and works in
  // cents (see splitEven), and the sum has to be the fee she was charged.
  const st = withThirdCustomer(world());
  await book(st, { payer: "The customer paid it" });

  const shares = st.orders.map((o) => o.courierFee);
  assert.equal(shares.length, 4, "three customers, one of them with two lines");
  assert.deepEqual(shares, [7.33, 7.33, 7.33, 7.34], "RM22 over three orders, and the odd cent is last");
  // What she was charged is the sum of the RUN's charges, which is one per CUSTOMER. The
  // charge is written onto every line of a group (a customer's own card reads their first
  // line), so adding all four rows would count Ain's order twice — and the whole point of
  // this test is that the parts add up to the whole, so it is added up the way the app
  // spends it.
  const perCustomer = [st.orders[0], st.orders[2], st.orders[3]].map((o) => o.courierFee);
  assert.deepEqual(perCustomer, [7.33, 7.33, 7.34]);
  assert.equal(Math.round(perCustomer.reduce((a, b) => a + b, 0) * 100) / 100, 22,
    "and the parts are the whole by construction, not by rounding luck");
});

test("a run booked with the charge questions unanswered records no charge at all", async () => {
  // She is allowed to book a trip before she has decided who pays for it — the vehicle is
  // on the road either way, and the run screen does not make the money a condition of the
  // booking. What must not happen is an order left carrying a charge of NOTHING. The three
  // keys are a set (see writeCourierCharge): a `courierFee: 0` sitting on an order reads as
  // "a charge was recorded here" to anything that asks whether the key is present, and the
  // app's own way back — Money's delete, which takes the row and the order together — has
  // nothing to find. Absent, not zero.
  const st = world();
  await book(st, {});
  for (const o of st.orders) {
    assert.equal("courierFee" in o, false, `${o.id} carries no charge key at all`);
    assert.equal("courierPaidBy" in o, false, "and none saying who paid it");
    assert.equal("courierCod" in o, false, "and none asking the courier to collect");
  }
  assert.deepEqual(st.expenses, [], "and nothing was invented on her books");
  assert.equal(st.orders[0].courierJob.jobId, "LLM-RUN-1",
    "the trip is booked all the same — the money is not a condition of the vehicle");
});

// ── 3. the window, and where it has to arrive ─────────────────────────────

test("a window typed on the run reaches every customer's card and messages", async () => {
  // The window is typed where the run is booked and has to arrive on the customer's own
  // two surfaces — the track card and the WhatsApp — because a promise that exists only in
  // the bakery's screen is a promise nobody was told.
  const st = world();
  await book(st, { window: "14:00-17:00", payer: "The customer paid it" });
  for (const o of st.orders) {
    assert.equal(o.deliveryWindow, "14:00-17:00", `${o.id} carries the promise`);
  }

  const snap = trackingSnapshot(st, { orders: st.orders.slice(0, 2) });
  assert.ok(snap.delivery.includes("Sat, 26 Sep"), `the day — read "${snap.delivery}"`);
  assert.ok(snap.delivery.includes("Courier"), "carried by courier");
  assert.ok(snap.delivery.includes("1 Jalan A"), "to the right doorstep");
  assert.ok(snap.delivery.endsWith(", 2-5 pm"),
    "with the window inside it — no new column, no storefront change");

  const shipped = buildShippedMessage(st, { orders: st.orders.slice(2) }, "https://bake.app/track");
  assert.ok(shipped.message.includes("Sat, 26 Sep, 2-5 pm"),
    "the shipped message promises the window, not just the day");
  const reminder = buildPaymentReminder(st, { orders: st.orders.slice(0, 2) }, "https://bake.app/track");
  assert.ok(reminder.message.includes("Sat, 26 Sep, 2-5 pm"), "and so does the payment reminder");
});

test("no window typed leaves every customer with the promise they already had", async () => {
  const st = world();
  await book(st, { payer: "The customer paid it" });
  for (const o of st.orders) assert.equal(o.deliveryWindow, undefined, "nothing was invented");
  const snap = trackingSnapshot(st, { orders: st.orders.slice(0, 2) });
  assert.ok(snap.delivery.includes("Sat, 26 Sep"), "the day");
  assert.ok(snap.delivery.includes("1 Jalan A"), "and the doorstep");
  assert.equal(snap.delivery.includes("pm"), false, "and no hour on it, exactly as before");
});

test("a window whose end is before its start is refused in words, never booked", async () => {
  // The one thing that must never happen: a customer told to expect the van before it left
  // the bakery. The box she is still typing in may read anything at all.
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);
  type(inputByLabel(root, "The delivery window opens"), "17:00");
  type(inputByLabel(root, "The delivery window closes"), "14:00");
  press(buttonByText(root, "Price this run"));
  await settle();
  assert.equal(wire.sent.filter((b) => b.action === "quote").length, 0,
    "a promise that cannot be made is not even priced, let alone booked");
  for (const o of st.orders) assert.equal(o.deliveryWindow, undefined);
  assert.equal(st.orders[0].courierJob, undefined, "and nothing was booked");
  assert.ok(all(root).some((n) => /ends before it starts/.test(n.textContent)),
    "and the screen says why in words");
});

test("an untypeable window publishes exactly the promise of no window at all", async () => {
  // The second line of defence, and the one that matters if the first is ever bypassed: the
  // PUBLISHING gate. windowSuffix is asked by the card and by every message, so a window
  // that could not be typed contributes nothing to what a customer is told — even when it is
  // sitting on the order.
  //
  // Asserted against the NO-WINDOW promise rather than against the words in the box, and
  // that distinction is the whole test. An end-before-start window formats perfectly well —
  // "17:00-14:00" comes out as "5-2 pm", a promise to expect the van at five and again at
  // two — so looking for the digits she typed would pass while the customer was told
  // nonsense. What has to be true is that the untypeable one says exactly what saying
  // nothing says.
  const bare = world();
  const bad = world();
  for (const o of bad.orders) o.deliveryWindow = "17:00-14:00";

  const clean = trackingSnapshot(bare, { orders: bare.orders.slice(0, 2) }).delivery;
  const dirty = trackingSnapshot(bad, { orders: bad.orders.slice(0, 2) }).delivery;
  assert.equal(dirty, clean, `the card is unchanged — read "${dirty}"`);
  assert.equal(clean.includes("pm"), false, "and what it publishes carries no hour at all");

  const said = buildShippedMessage(bad, { orders: bad.orders.slice(2) }, "https://bake.app/track");
  const quiet = buildShippedMessage(bare, { orders: bare.orders.slice(2) }, "https://bake.app/track");
  assert.equal(said.message, quiet.message, "and no half-promise reaches the message either");
});

// ── 4. a price belongs to the list it was asked for ───────────────────────

test("unticking a customer after a price makes the Book press inert, and says why", async () => {
  // The fault this pins: booking the trip the screen REMEMBERS rather than the one on
  // screen. Its own sentence has to be readable, because a greyed press with nothing said
  // is a screen with a hole in it.
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);
  press(buttonByText(root, "Price this run"));
  await settle();
  assert.equal(buttonByText(priceRow(root, "Car"), "Book this run").disabled, false,
    "bookable while the list is the one that was priced");

  const ticks = all(root).filter((n) => n.tagName === "INPUT" && String(n.className).includes("run-tick"));
  ticks[1].checked = false;
  change(ticks[1], "");

  assert.equal(buttonByText(priceRow(root, "Car"), "Book this run").disabled, true,
    "the list moved, so the price did");
  assert.ok(all(root).some((n) => /no longer taking/.test(n.textContent)),
    "and the reason is on the screen in words");
});

test("moving the collection day throws the price away rather than leaving it standing", async () => {
  // A price is for one journey. The same stops on another day are a different trip, and a
  // number left standing beside a moved box is a price she could book by mistake.
  const st = world();
  const wire = stubCourier();
  const { root } = openRun(st);
  press(buttonByText(root, "Price this run"));
  await settle();
  assert.ok(priceRow(root, "Car"), "priced");
  change(inputByLabel(root, "The day the driver collects"), "2026-09-27");
  assert.equal(priceRow(root, "Car"), undefined, "the price is gone, not left standing");
});

// ── 5. the run cannot grow a second set of charge questions ───────────────

test("the run asks the charge questions through the one shared block", async () => {
  // The run is the THIRD door that writes a courier charge. Its own comment forbids a
  // second copy of the questions, and three hands writing one charge on one order is three
  // chances for the order and her books to disagree. So this reads the source: the block is
  // imported, and the run does not restate its answers.
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../admin/js/views/delivery_run.js", import.meta.url), "utf8");
  assert.match(src, /import \{[^}]*courierPayQuestions[^}]*\} from "\.\/orders\.js"/,
    "the questions come from the block the order card and the Edit form use");
  assert.match(src, /writeCourierCharge/, "and the charge is written by the one writer every door uses");
  for (const own of ["courierPaidBy", "courierCod", "courierFee"]) {
    assert.equal(src.includes(own), false, `the run must not restate the charge fields by hand (${own})`);
  }
});

test("the run names no courier of its own", async () => {
  // Her second clause, kept true at the third screen that wears it: a second courier is a
  // new file, and this screen must keep asking the registry what to call it.
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../admin/js/views/delivery_run.js", import.meta.url), "utf8");
  assert.equal(/lalamove/i.test(src), false, "no courier's name in the run screen");
  assert.equal(/MOTORCYCLE|7FT_VAN/.test(src), false, "and none of its service keys either");
  assert.match(src, /activeCourier\(\)/, "it asks the registry which courier it is talking to");
});
