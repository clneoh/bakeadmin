// test/courier-job.test.js — the trip: when, who, and which doors (v188,
// 25 Sep 2026).
//
// Two things in this file can be wrong in a way nobody notices until the driver is
// somewhere else, and both are pinned here rather than trusted:
//
//   1. THE TIME. Lalamove wants `scheduleAt` as an ISO instant in UTC. The bakery
//      works on a Penang clock. The gap between them is eight hours, and the
//      obvious way to close it — `new Date("2026-09-25T10:00")` — closes it with
//      the PHONE's timezone instead of the bakery's. On her phone in Penang that
//      looks right; the same phone flown to London books a 5 pm pickup while
//      showing her 10:00. One test below sets TZ elsewhere on purpose, so that a
//      conversion which reached for the device clock would fail it.
//
//   2. WHICH DOORS. A trip with an unpinned stop must keep that stop VISIBLE as
//      unpinned rather than quietly filling in a fallback. A fallback point is a
//      price for a journey that is not the one she is taking, and it is the kind of
//      wrong answer that looks like a right one on screen.
//
// Pure — no DOM, no fetch. `setDropPlace`/`setPickupPlace` are the real functions,
// called rather than stubbed, because what these tests are checking is the state
// they leave behind (and `save` swallows the missing localStorage under Node).

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  MY_UTC_OFFSET_HOURS, scheduleAtUTC, senderOf, stopOf, tripOf, tripReady,
  stopsUnplaced, tripProblem, fmtDistanceKm,
  orderDay, fmtQuote, fmtQuoteLeft, quoteExpired,
} = await import("../admin/js/courier_job.js");
const { setPickupPlace, setDropPlace } = await import("../admin/js/courier_place.js");

function emptyState(extra = {}) {
  return {
    settings: {
      currency: "RM",
      mailingAddress: "8 Lebuh Pantai, 10300 Penang",
      storefront: {},
    },
    orders: [],
    customers: [],
    ...extra,
  };
}

// One order from one customer, with a Penang address and a Malaysian number.
function makeOrder(extra = {}) {
  return {
    id: "ordaaa111",
    customerName: "Mei Ling",
    whatsapp: "0169601268",
    address: "12 Jalan Bunga, 10450 Penang",
    deliveryDate: "2026-09-25",
    ...extra,
  };
}

// ── the bakery's clock, turned into the API's ─────────────────────────────

test("the bakery's 10 am is 02:00 UTC — eight hours, not the device's offset", () => {
  assert.equal(MY_UTC_OFFSET_HOURS, 8, "Malaysia has had one offset since 1982; it must not be read off the phone");
  assert.equal(scheduleAtUTC("2026-09-25", "10:00"), "2026-09-25T02:00:00.000Z");
});

test("the offset is Malaysia's even when the phone thinks it is somewhere else", () => {
  // The trap, made testable. process.env.TZ is read by Node's own Date parsing, so
  // a conversion that built a local date string and let Date parse it would answer
  // differently here. This is the assertion that fails if the implementation ever
  // reaches for the device clock, and it is why the constant exists at all.
  const before = process.env.TZ;
  try {
    process.env.TZ = "Europe/London";
    assert.equal(scheduleAtUTC("2026-09-25", "10:00"), "2026-09-25T02:00:00.000Z");
    process.env.TZ = "America/New_York";
    assert.equal(scheduleAtUTC("2026-09-25", "10:00"), "2026-09-25T02:00:00.000Z");
    process.env.TZ = "Asia/Kolkata";
    assert.equal(scheduleAtUTC("2026-09-25", "10:00"), "2026-09-25T02:00:00.000Z", "and not a half-hour offset either");
  } finally {
    if (before === undefined) delete process.env.TZ; else process.env.TZ = before;
  }
});

test("an early pickup lands on the day before, in UTC — and that is correct", () => {
  // A 06:00 collection in Penang is 22:00 the previous evening in UTC. The day
  // rolling back is not a bug; it is the same instant said the other way.
  assert.equal(scheduleAtUTC("2026-09-25", "06:00"), "2026-09-24T22:00:00.000Z");
  assert.equal(scheduleAtUTC("2026-09-25", "07:59"), "2026-09-24T23:59:00.000Z");
  assert.equal(scheduleAtUTC("2026-09-25", "08:00"), "2026-09-25T00:00:00.000Z");
  assert.equal(scheduleAtUTC("2026-09-25", "00:00"), "2026-09-24T16:00:00.000Z");
});

test("the last minute of the day survives", () => {
  assert.equal(scheduleAtUTC("2026-09-25", "23:59"), "2026-09-25T15:59:00.000Z");
});

test("a single-digit hour is read as itself, not as a minute", () => {
  assert.equal(scheduleAtUTC("2026-09-25", "9:30"), "2026-09-25T01:30:00.000Z");
  assert.equal(scheduleAtUTC("2026-09-25", "09:30"), "2026-09-25T01:30:00.000Z");
});

test("the 31st of February is refused, not rolled into March", () => {
  // Date.UTC(2026, 1, 31) is not an error in JavaScript, it is the 3rd of March. A
  // booking on a day she did not choose is worse than no booking at all.
  assert.equal(scheduleAtUTC("2026-02-31", "10:00"), "");
  assert.equal(scheduleAtUTC("2026-02-29", "10:00"), "", "2026 is not a leap year");
  assert.equal(scheduleAtUTC("2024-02-29", "10:00"), "2024-02-29T02:00:00.000Z", "but 2024 is");
  assert.equal(scheduleAtUTC("2026-04-31", "10:00"), "");
  assert.equal(scheduleAtUTC("2026-13-01", "10:00"), "");
});

test("a half-filled or nonsense box never becomes a booking at the epoch", () => {
  // The API would happily take "1970-01-01T00:00:00Z" and book it. Everything that
  // is not a real date and a real time is an empty string, which the panel reads as
  // "as soon as possible" and says out loud rather than guessing.
  assert.equal(scheduleAtUTC("", "10:00"), "");
  assert.equal(scheduleAtUTC("2026-09-25", ""), "");
  assert.equal(scheduleAtUTC(null, null), "");
  assert.equal(scheduleAtUTC("25/09/2026", "10:00"), "");
  assert.equal(scheduleAtUTC("2026-9-25", "10:00"), "");
  assert.equal(scheduleAtUTC("2026-09-25", "24:00"), "");
  assert.equal(scheduleAtUTC("2026-09-25", "10:60"), "");
  assert.equal(scheduleAtUTC("2026-09-25", "10"), "");
  assert.equal(scheduleAtUTC("2026-09-25", "ten"), "");
});

// ── who collects ──────────────────────────────────────────────────────────

test("the driver rings the number already on the shop, in the form a phone dials", () => {
  const s = emptyState();
  s.settings.storefront = { name: "Jienluv2bake", whatsapp: "016 960 1268" };
  assert.deepEqual(senderOf(s), { name: "Jienluv2bake", phone: "60169601268" });
});

test("a bakery with no name set still has a name for the driver", () => {
  assert.equal(senderOf(emptyState()).name, "Jienluv2bake");
  assert.equal(senderOf({}).name, "Jienluv2bake");
});

// ── which doors ───────────────────────────────────────────────────────────

test("a stop carries the person, the number, the words and the point", () => {
  const s = emptyState();
  const o = makeOrder();
  setDropPlace(s, o, { lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" });
  const stop = stopOf(s, o);
  assert.equal(stop.name, "Mei Ling");
  assert.equal(stop.phone, "60169601268");
  assert.equal(stop.address, "12 Jalan Bunga, 10450 Penang");
  assert.deepEqual(stop.place, { lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" });
  assert.equal(stop.order, o, "the order itself travels, so the panel can name it back to her");
});

test("an unpinned stop keeps place: null rather than a guessed point", () => {
  const s = emptyState();
  const stop = stopOf(s, makeOrder());
  assert.equal(stop.place, null);
  assert.equal(stop.address, "12 Jalan Bunga, 10450 Penang", "the words she typed are still there to look up");
});

test("a trip is the bakery plus every stop, and nothing invented", () => {
  const s = emptyState();
  setPickupPlace(s, { lat: 5.4141, lng: 100.3288 });
  const a = makeOrder({ id: "ordaaa111", whatsapp: "0169601268" });
  const b = makeOrder({ id: "ordbbb222", whatsapp: "0171234567", customerName: "Hafiz" });
  const trip = tripOf(s, [a, b], { scheduleAt: "2026-09-25T02:00:00.000Z" });
  assert.deepEqual(trip.pickup, { lat: 5.4141, lng: 100.3288, label: "" });
  assert.equal(trip.stops.length, 2);
  assert.equal(trip.scheduleAt, "2026-09-25T02:00:00.000Z");
});

test("a trip with no pickup keeps pickup: null", () => {
  const s = emptyState();
  const trip = tripOf(s, [makeOrder()]);
  assert.equal(trip.pickup, null);
  assert.equal(tripReady(trip), false);
});

test("one order is a trip of one stop — the same shape as a run of eight", () => {
  const s = emptyState();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  assert.equal(tripOf(s, makeOrder()).stops.length, 1, "a single order is not a special case");
});

test("tripReady needs both ends of every leg, and says nothing about the clock", () => {
  const s = emptyState();
  const o = makeOrder();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  assert.equal(tripReady(tripOf(s, o)), false, "the doorstep is still unpinned");
  setDropPlace(s, o, { lat: 5.41, lng: 100.32 });
  // No schedule is a legitimate trip: "as soon as possible" is a quote she can ask
  // for, and the panel says which one it asked for.
  assert.equal(tripReady(tripOf(s, o)), true);
});

test("tripReady refuses an empty trip rather than pricing a journey with nowhere to go", () => {
  const s = emptyState();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  assert.equal(tripReady(tripOf(s, [])), false);
  assert.equal(tripReady(null), false);
});

test("stopsUnplaced counts what is left to place", () => {
  const s = emptyState();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  const a = makeOrder({ id: "ordaaa111", whatsapp: "0169601268" });
  const b = makeOrder({ id: "ordbbb222", whatsapp: "0171234567", customerName: "Hafiz" });
  setDropPlace(s, a, { lat: 5.41, lng: 100.32 });
  const trip = tripOf(s, [a, b]);
  assert.equal(stopsUnplaced(trip), 1);
  assert.equal(stopsUnplaced(null), 0);
});

// ── what the panel says when something is missing ─────────────────────────

test("the pickup is named before the doorstep — the trip has no start without it", () => {
  assert.match(tripProblem(tripOf(emptyState(), [makeOrder()])), /Settings/);
});

test("one missing doorstep is said one way, several another, and the count is real", () => {
  const s = emptyState();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  const orders = ["0169601268", "0171234567", "0187654321"]
    .map((w, i) => makeOrder({ id: `ord000000${i}`, whatsapp: w }));
  setDropPlace(s, orders[0], { lat: 5.41, lng: 100.32 });
  assert.match(tripProblem(tripOf(s, orders)), /^2 of these doorsteps/);
  setDropPlace(s, orders[1], { lat: 5.42, lng: 100.33 });
  assert.match(tripProblem(tripOf(s, orders)), /^This customer's doorstep/);
  setDropPlace(s, orders[2], { lat: 5.43, lng: 100.34 });
  assert.equal(tripProblem(tripOf(s, orders)), "");
});

// ── distance, said plainly ────────────────────────────────────────────────

test("a short trip is metres and a long one is kilometres", () => {
  assert.equal(fmtDistanceKm(0.4), "400 m");
  assert.equal(fmtDistanceKm(0.999), "999 m");
  assert.equal(fmtDistanceKm(1), "1.0 km");
  assert.equal(fmtDistanceKm(12.34), "12.3 km");
  assert.equal(fmtDistanceKm(0), "0 km");
});

test("a distance that is not a distance says nothing rather than NaN", () => {
  assert.equal(fmtDistanceKm(null), "");
  assert.equal(fmtDistanceKm(undefined), "");
  assert.equal(fmtDistanceKm("far"), "");
  assert.equal(fmtDistanceKm(NaN), "");
  assert.equal(fmtDistanceKm(-1), "", "a negative distance is a bad reply, not a short trip");
});

// ── which day this order goes out ────────────────────────────────────────

test("the delivery day is the row's own day, and the saved date stands in once that day is gone", () => {
  const s = emptyState({ deliveryDates: [{ id: "dd1", date: "2026-09-25" }, { id: "dd2", date: "2026-10-02" }] });
  // The day the row points at is the day she promised, so it wins over the date the
  // order was saved with — she can move an order to another day.
  assert.equal(orderDay(s, makeOrder({ deliveryDateId: "dd2", deliveryDate: "2026-09-25" })), "2026-10-02");
  // A day that has since been deleted leaves the order where it was saved rather than
  // leaving it undated: a trip with no day is priced as "as soon as possible", and that
  // is a different price from the one she promised.
  assert.equal(orderDay(s, makeOrder({ deliveryDateId: "dd-removed", deliveryDate: "2026-09-25" })), "2026-09-25");
  assert.equal(orderDay(s, makeOrder({ deliveryDateId: "", deliveryDate: "2026-09-25" })), "2026-09-25");
  // Nothing known at all stays nothing: "" is what the panel reads as "no day on this
  // order", which it says out loud rather than guessing one.
  assert.equal(orderDay(s, makeOrder({ deliveryDateId: "", deliveryDate: "" })), "");
  assert.equal(orderDay(s, null), "");
});

// ── a price, and how long it lives ───────────────────────────────────────

test("a price in the bakery's own money reads like every other price, and another currency says which one it is", () => {
  assert.equal(fmtQuote(18.5, "MYR", "RM"), "RM 18.50");
  assert.equal(fmtQuote(18.5, "", "RM"), "RM 18.50", "a quote that named no currency is read as the bakery's own");
  assert.equal(fmtQuote(18.5, "RM", "RM"), "RM 18.50");
  assert.equal(fmtQuote(240000, "IDR", "RM"), "IDR 240000.00", "a price in another currency must never be shown with RM in front of it");
  assert.equal(fmtQuote(18.5, "MYR", "S$"), "MYR 18.50");
  assert.equal(fmtQuote(null, "MYR", "RM"), "");
  assert.equal(fmtQuote("", "MYR", "RM"), "");
  assert.equal(fmtQuote("free", "MYR", "RM"), "");
});

test("a quotation's clock counts down, and a dead one reads as dead", () => {
  const t0 = Date.parse("2026-09-25T02:00:00.000Z");
  const at = (secs) => ({ expiresAt: new Date(t0 + secs * 1000).toISOString() });
  assert.equal(fmtQuoteLeft(at(300), t0), "5:00");
  assert.equal(fmtQuoteLeft(at(61), t0), "1:01");
  assert.equal(fmtQuoteLeft(at(9), t0), "0:09");
  assert.equal(quoteExpired(at(9), t0), false);
  assert.equal(fmtQuoteLeft(at(0), t0), "expired");
  assert.equal(fmtQuoteLeft(at(-1), t0), "expired");
  assert.equal(quoteExpired(at(-1), t0), true);
  // A reply with no readable expiry is NOT evidence that a price is still good. The
  // two mistakes do not cost the same: asking again costs one tap, quoting a dead
  // price costs her money.
  for (const bad of [{}, { expiresAt: "" }, { expiresAt: "soon" }, null, undefined]) {
    assert.equal(fmtQuoteLeft(bad, t0), "expired");
    assert.equal(quoteExpired(bad, t0), true);
  }
});
