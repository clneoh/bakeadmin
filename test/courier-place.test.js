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
  setDropPlace, setPickupPlace, latLngText, fmtPlace, splitLabel, parseCoords, placeProblem,
  customerPlaceOf, customerPinOffer,
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

// ── the customer's own pin, which is a SUGGESTION (v197) ──────────────────
//
// The whole feature turns on one word, so these tests are about that word: what the
// customer dropped on the shop page is read, offered, and — until she presses —
// never the door anything uses. `dropPlaceOf` is what every quote, booking and
// charge asks, and the pin the customer dropped must not appear there on its own.

test("the customer's own pin is read off the order, and is not a doorstep", () => {
  const s = state();
  const pinned = order({ customerPlace: { lat: 5.42, lng: 100.33, label: "their door", at: "2026-09-25T10:00:00Z" } });
  assert.deepEqual(customerPlaceOf(pinned), { lat: 5.42, lng: 100.33, label: "their door" });
  // THE line that makes it a suggestion: the door the app drives to is still unknown
  // until she accepts it.
  assert.equal(dropPlaceOf(s, pinned), null);
});

test("an order nobody pinned has no suggestion at all", () => {
  assert.equal(customerPlaceOf(order()), null);
  assert.equal(customerPlaceOf(order({ customerPlace: null })), null);
  assert.equal(customerPlaceOf(null), null);
});

test("a pin that is not a pin is not a suggestion either", () => {
  // This is the one field on the order that a CUSTOMER wrote, so it arrives as
  // untrusted as anything the shop posts. Half-written, off the planet and
  // non-numeric all read as "they pinned nothing", which is the same answer as a
  // courier customer who just typed their address.
  assert.equal(customerPlaceOf(order({ customerPlace: { lat: 5.42 } })), null);
  assert.equal(customerPlaceOf(order({ customerPlace: { lat: null, lng: 100 } })), null);
  assert.equal(customerPlaceOf(order({ customerPlace: { lat: 999, lng: 100 } })), null);
  assert.equal(customerPlaceOf(order({ customerPlace: "5.42,100.33" })), null);
});

test("with no doorstep kept for them, their pin is offered", () => {
  const s = state();
  const pinned = order({ customerPlace: { lat: 5.42, lng: 100.33 } });
  const offer = customerPinOffer(s, pinned);
  assert.equal(offer.replacing, null, "nothing is being replaced — she has no door for them yet");
  assert.deepEqual(offer.place, { lat: 5.42, lng: 100.33, label: "" });
});

test("she is offered their pin EVEN when she keeps a door for them", () => {
  // Her answer, 25 Sep 2026, and it reverses what I would have built: a kept door
  // does not silence the offer, it only changes the words. So the offer carries the
  // door being replaced, and the screen says whose it is.
  const s = state();
  const pinned = order({ customerPlace: { lat: 5.42, lng: 100.33 } });
  setDropPlace(s, pinned, { lat: 5.4, lng: 100.3, label: "the door she checked" });
  const offer = customerPinOffer(s, pinned);
  assert.ok(offer, "a kept door must not hide the customer's own pin");
  assert.deepEqual(offer.place, { lat: 5.42, lng: 100.33, label: "" });
  assert.equal(offer.replacing.label, "the door she checked");
  // …and the door she keeps is still the one everything uses.
  assert.equal(dropPlaceOf(s, pinned).label, "the door she checked");
});

test("accepting it ends the offer — that is what makes the offer honest", () => {
  // No "dismissed" flag is stored anywhere: the offer is drawn while the kept door
  // differs from what the customer dropped, so taking it is the thing that removes it.
  const s = state();
  const pinned = order({ customerPlace: { lat: 5.42, lng: 100.33 } });
  setDropPlace(s, pinned, customerPlaceOf(pinned));
  assert.equal(customerPinOffer(s, pinned), null);
});

test("a pin nudged a few metres is the same door, and stops being offered", () => {
  // Leaflet hands back a slightly different number every time a pin is re-dropped in
  // the same spot. Offering the same door again because it moved 8 metres would be a
  // press that does nothing, forever.
  const s = state();
  const pinned = order({ customerPlace: { lat: 5.42, lng: 100.33 } });
  setDropPlace(s, pinned, { lat: 5.42005, lng: 100.33005 });
  assert.equal(customerPinOffer(s, pinned), null);
  // A different house down the road is not the same door.
  setDropPlace(s, pinned, { lat: 5.4202, lng: 100.33 });
  assert.ok(customerPinOffer(s, pinned));
});

// ── the two lines a match wears in the chooser (v198) ─────────────────────
//
// The lookup offers several matches now, so each one is a row with a name on its first
// line and a place on its second. The cut is the first comma and nothing cleverer, which
// is exact for Photon — whose labels are composed "name, town, postcode" by the courier
// function — and only passable for Nominatim, whose labels lead with whatever is most
// specific, often a house number. That is left alone on purpose; see splitLabel.

test("a label is cut at its first comma, into what the place is and where it is", () => {
  assert.deepEqual(splitLabel("Chulia Street, George Town, 10200"),
    { title: "Chulia Street", sub: "George Town, 10200" });
  assert.deepEqual(splitLabel("Road, 10200"), { title: "Road", sub: "10200" });
  assert.deepEqual(splitLabel("Chulia Street"), { title: "Chulia Street", sub: "" });
});

test("a Nominatim label reads poorly and is still cut in one piece, never in two halves", () => {
  // The honest shape of the fallback: Nominatim's display_name puts the house number
  // first, so the title of this row is "12". Ugly, and correct — the alternative is to
  // stop storing display_name, which is the label already saved on customers she has
  // pinned, so tidying a fallback would rewrite her own records.
  assert.deepEqual(splitLabel("12, Jalan Bunga, Taman Foo, 10450 George Town, Penang, Malaysia"),
    { title: "12", sub: "Jalan Bunga, Taman Foo, 10450 George Town, Penang, Malaysia" });
});

test("a label with nothing in it is two empty lines, not the word null and not NaN", () => {
  // The chooser draws what this returns, and this app has shipped a printed "null" to
  // her screen before. An absent label must come back as absence.
  assert.deepEqual(splitLabel(""), { title: "", sub: "" });
  assert.deepEqual(splitLabel("   "), { title: "", sub: "" });
  assert.deepEqual(splitLabel(null), { title: "", sub: "" });
  assert.deepEqual(splitLabel(undefined), { title: "", sub: "" });
  assert.deepEqual(splitLabel(0), { title: "0", sub: "" }, "a number is a name she can read, not a blank row");
});

test("stray spaces around the cut are trimmed, so no row starts with a gap", () => {
  assert.deepEqual(splitLabel("  Road ,  Town  "), { title: "Road", sub: "Town" });
  assert.deepEqual(splitLabel("Road,"), { title: "Road", sub: "" }, "a trailing comma leaves no empty second line");
  assert.deepEqual(splitLabel(", Town"), { title: "", sub: "Town" }, "and a leading one leaves the title empty rather than throwing it away");
});
