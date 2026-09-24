// test/courier-place.test.js — where a courier trip starts and ends (v188,
// 25 Sep 2026).
//
// The whole of this file turns on one sentence from the courier API: it wants a
// POINT, not an address. Everything that can go wrong here goes wrong the same way
// — a place that is not a place reaches the API, and what comes back is a price for
// a trip she is not taking, said in a code she cannot read. So the tests below are
// almost all about one question: does a half-known place read as NOT KNOWN.
//
// Three of them are worth naming before you read them, because each is a real way a
// doorstep gets lost:
//
//   • a latitude with no longitude — an interrupted paste — must be refused, not
//     rounded to zero, which would put the pin in the Gulf of Guinea;
//   • "5,100" must not parse as a coordinate. It is a price, or a quantity, or a
//     date, and reading it as a point is a wrong doorstep with no complaint;
//   • a pin saved for a customer must survive a profile EDIT. profiles.js carries
//     two field lists for folding duplicate records, and a new field that is on
//     neither is silently dropped the first time two records for one person meet.
//
// Pure: no DOM, no fetch. `save` is called and swallowed (state.js catches the
// missing localStorage under Node), so what these tests read is the STATE the
// functions leave behind rather than a stored copy of it.

import { test } from "node:test";
import assert from "node:assert/strict";

const {
  validPlace, pickupPlace, pickupAddress, dropPlaceOf, dropAddress,
  setDropPlace, setPickupPlace, latLngText, fmtPlace, parseCoords, placeProblem,
} = await import("../admin/js/courier_place.js");
const { canonicaliseCustomers } = await import("../admin/js/profiles.js");

// One order from one customer, with a Penang address and a Malaysian number.
function order(extra = {}) {
  return {
    id: "ordaaa111",
    customerName: "Mei Ling",
    whatsapp: "0169601268",
    address: "12 Jalan Bunga, 10450 Penang",
    deliveryDate: "2026-09-25",
    ...extra,
  };
}

function state(extra = {}) {
  return {
    settings: { currency: "RM", mailingAddress: "8 Lebuh Pantai, 10300 Penang" },
    orders: [order()],
    customers: [],
    ...extra,
  };
}

// ── what counts as a point ────────────────────────────────────────────────

test("a place needs BOTH numbers — a latitude alone is not a point", () => {
  assert.equal(validPlace({ lat: 5.4141 }), null);
  assert.equal(validPlace({ lng: 100.3288 }), null);
  assert.deepEqual(validPlace({ lat: 5.4141, lng: 100.3288 }), { lat: 5.4141, lng: 100.3288, label: "" });
  assert.deepEqual(validPlace({ lat: "5.4141", lng: "100.3288" }), { lat: 5.4141, lng: 100.3288, label: "" });
});

test("numbers that are not numbers are not a point", () => {
  assert.equal(validPlace({ lat: "5.41abc", lng: 100 }), null);
  assert.equal(validPlace({ lat: NaN, lng: 100 }), null);
  assert.equal(validPlace({ lat: null, lng: 100 }), null);
  assert.equal(validPlace(null), null);
  assert.equal(validPlace("5.4,100.3"), null);
});

test("a point off the planet is refused rather than sent to be refused later", () => {
  // Lalamove would take 999999 and answer with something. "The pin is nonsense,
  // put it again" is the only useful sentence, and it has to come from here.
  assert.equal(validPlace({ lat: 91, lng: 100 }), null);
  assert.equal(validPlace({ lat: 5, lng: 181 }), null);
  assert.equal(validPlace({ lat: -91, lng: 100 }), null);
  assert.equal(validPlace({ lat: 90, lng: 180 }).lat, 90); // the corner itself is on the planet
});

// ── the three answers, in order ───────────────────────────────────────────

test("a saved doorstep is used and never looked up again", () => {
  const s = state();
  assert.equal(dropPlaceOf(s, order()), null);
  const saved = setDropPlace(s, order(), { lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" });
  assert.equal(saved.lat, 5.4141);
  assert.deepEqual(dropPlaceOf(s, order()), { lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" });
});

test("the pin follows the PERSON, not the order — a second order is already pinned", () => {
  const s = state();
  setDropPlace(s, order(), { lat: 5.4141, lng: 100.3288 });
  const later = order({ id: "ordbbb222", deliveryDate: "2026-10-02" });
  assert.ok(dropPlaceOf(s, later), "the same number pins the same door");
});

test("pinning a customer who has no profile row creates one shaped like the others", () => {
  const s = state();
  assert.equal(s.customers.length, 0);
  setDropPlace(s, order(), { lat: 5.4141, lng: 100.3288 });
  assert.equal(s.customers.length, 1);
  const row = s.customers[0];
  assert.match(row.id, /^cus_/);
  assert.equal(row.key, "60169601268");
  assert.equal(row.name, "Mei Ling");
  assert.ok(row.createdAt, "a profile row with no createdAt would sort oddly against the others");
});

test("an order that keys to nobody is refused quietly — no row nobody can find again", () => {
  const s = state();
  const anonymous = { id: "", customerName: "", whatsapp: "" };
  assert.equal(setDropPlace(s, anonymous, { lat: 5.4, lng: 100.3 }), null);
  assert.equal(s.customers.length, 0);
});

test("a refusal writes nothing at all", () => {
  const s = state();
  // A place that is not a place must not create the profile row either — the row
  // would be empty forever and the customer would look pinned and not be.
  setDropPlace(s, order(), { lat: 5.4141 });
  assert.equal(s.customers.length, 0);
});

test("the bakery's own pin lives in settings and survives a re-pin", () => {
  const s = state();
  assert.equal(pickupPlace(s), null);
  setPickupPlace(s, { lat: 5.4141, lng: 100.3288, label: "8 Lebuh Pantai" });
  assert.deepEqual(pickupPlace(s).label, "8 Lebuh Pantai");
  setPickupPlace(s, { lat: 5.42, lng: 100.33, label: "moved" });
  assert.equal(pickupPlace(s).lat, 5.42);
  assert.equal(pickupPlace(s).label, "moved");
});

test("the address to look up is the one she already typed for the label sheet", () => {
  assert.equal(pickupAddress(state()), "8 Lebuh Pantai, 10300 Penang");
  assert.equal(pickupAddress({ settings: {} }), "");
  assert.equal(dropAddress(order()), "12 Jalan Bunga, 10450 Penang");
  assert.equal(dropAddress({}), "");
});

// ── the pin survives the profile machinery ────────────────────────────────

test("a pin survives canonicaliseCustomers folding two records of one person", () => {
  // The list of fields a fold copies is written out by hand in profiles.js, and a
  // field on neither list is dropped the first time two records meet. This is the
  // test that fails if `place` is ever taken off those lists.
  const s = state();
  s.customers = [
    { id: "cus_1", key: "60169601268", name: "Mei Ling", whatsapp: "60169601268",
      createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
      place: { lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" } },
    { id: "cus_2", key: "60169601268", name: "Mei Ling", whatsapp: "60169601268",
      createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z" },
  ];
  canonicaliseCustomers(s);
  assert.equal(s.customers.length, 1, "the two records fold into one");
  assert.equal(s.customers[0].place.lat, 5.4141, "the door that was known must not be lost in the fold");
});

test("a pin is folded in whichever record happened to carry it", () => {
  const s = state();
  s.customers = [
    { id: "cus_1", key: "60169601268", name: "Mei Ling", whatsapp: "60169601268",
      createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z" },
    { id: "cus_2", key: "60169601268", name: "Mei Ling", whatsapp: "60169601268",
      createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z",
      place: { lat: 5.4141, lng: 100.3288 } },
  ];
  canonicaliseCustomers(s);
  assert.equal(s.customers.length, 1);
  assert.equal(s.customers[0].place.lng, 100.3288, "the newer record wins the row, but the only pin must still travel");
});

// ── numbers she pasted ────────────────────────────────────────────────────

test("coordinates come back out of the shapes she would actually copy", () => {
  const want = { lat: 5.4141, lng: 100.3288 };
  assert.deepEqual(parseCoords("5.4141,100.3288"), want);
  assert.deepEqual(parseCoords("5.4141, 100.3288"), want);
  assert.deepEqual(parseCoords("  5.4141 , 100.3288  "), want);
  assert.deepEqual(parseCoords("https://www.google.com/maps/place/X/@5.4141,100.3288,17z"), want);
  assert.deepEqual(parseCoords("https://maps.google.com/?q=5.4141,100.3288"), want);
  assert.deepEqual(parseCoords("https://www.google.com/maps/place/X/data=!3d5.4141!4d100.3288"), want);
  assert.deepEqual(parseCoords("https://www.google.com/maps/dir/?destination=5.4141,100.3288"), want);
  assert.deepEqual(parseCoords("https://maps.apple.com/?ll=5.4141,100.3288"), want);
});

test("negative coordinates survive — half the world is south and west", () => {
  assert.deepEqual(parseCoords("-5.4141,-100.3288"), { lat: -5.4141, lng: -100.3288 });
  assert.deepEqual(parseCoords("@-5.4141,-100.3288,17z"), { lat: -5.4141, lng: -100.3288 });
});

test('"5,100" is not a coordinate — a price or a quantity must never become a doorstep', () => {
  // The one guard that keeps a bare paste honest: a decimal point is required. The
  // Gulf of Guinea is at 5,100 and a pin there is a wrong door with no complaint.
  assert.equal(parseCoords("5,100"), null);
  assert.equal(parseCoords("12, 25"), null);
  assert.equal(parseCoords("2026,09"), null);
});

test("nonsense is refused rather than half-read", () => {
  assert.equal(parseCoords(""), null);
  assert.equal(parseCoords(null), null);
  assert.equal(parseCoords("Penang"), null);
  assert.equal(parseCoords("5.4141"), null);
  assert.equal(parseCoords("91.0,100.3"), null, "off the planet");
  assert.equal(parseCoords("5.4,181.0"), null);
});

test("a URL carrying a bare pair is read as the URL, not as the pair", () => {
  // Order matters: the URL forms are tried first. If the bare form ran first it
  // would still find these, but a URL is the shape with the most ways to be
  // slightly different, so it is read on its own terms.
  const got = parseCoords("https://www.google.com/maps/@5.4141,100.3288,17z");
  assert.deepEqual(got, { lat: 5.4141, lng: 100.3288 });
});

// ── saying it on screen ───────────────────────────────────────────────────

test("a point is said with the words it was pinned with, or the numbers", () => {
  assert.equal(fmtPlace({ lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" }), "12 Jalan Bunga");
  assert.equal(fmtPlace({ lat: 5.4141, lng: 100.3288 }), "5.41410, 100.32880");
  assert.equal(fmtPlace(null), "not pinned yet");
  assert.equal(fmtPlace(undefined, "no spot"), "no spot");
});

test("the pair as the API wants it", () => {
  assert.equal(latLngText({ lat: 5.4141, lng: 100.3288 }), "5.4141,100.3288");
  assert.equal(latLngText(null), "");
  assert.equal(latLngText({ lat: 5.4141 }), "");
});

// ── what a trip is still missing ──────────────────────────────────────────

test("nothing missing means no problem is reported", () => {
  const s = state();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  setDropPlace(s, order(), { lat: 5.41, lng: 100.32 });
  assert.equal(placeProblem(s, order()), null);
});

test("an unpinned bakery is named before anything else — the trip has no start", () => {
  const s = state();
  const p = placeProblem(s, order());
  assert.equal(p.need, "pickup");
  assert.match(p.say, /Settings/);
});

test("a bakery with no address to look up asks her to pin rather than to look", () => {
  const s = state({ settings: { currency: "RM", mailingAddress: "" } });
  const p = placeProblem(s, order());
  assert.equal(p.need, "pickup");
  assert.match(p.say, /Pin the bakery/);
});

test("a customer with no doorstep is named second, and told which way to fix it", () => {
  const s = state();
  setPickupPlace(s, { lat: 5.4, lng: 100.3 });
  const withAddress = placeProblem(s, order());
  assert.equal(withAddress.need, "drop");
  assert.match(withAddress.say, /pin on the map/);

  const noAddress = placeProblem(s, order({ address: "" }));
  assert.equal(noAddress.need, "drop");
  assert.match(noAddress.say, /no delivery address/);
});
