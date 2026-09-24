// courier_job.js — the trip: who collects what, from which door, to whose
// (25 Sep 2026).
//
// One shape for every courier, because every courier API is the same shape: a
// sender, an ordered list of drop-offs, and a time. Lalamove calls them stops; a
// second courier will call them something else, and the point of this module is
// that the words change in one provider file and nowhere else.
//
// WHAT IS HERE AND WHY IT IS HERE. Two facts about a trip are worth being able to
// test without a network, a browser or a key, because both of them are wrong in a
// way nobody notices until the driver is at the wrong door:
//
//   • tripOf      — which doors this trip has, read off the orders and the pinned
//                   places, with "not pinned" left visible rather than papered
//                   over by a fallback.
//   • scheduleAtUTC — the bakery's clock turned into the UTC instant the API
//                   demands. See the trap named on it below; it is the single most
//                   likely line in this feature to be quietly wrong.
//
// Everything returns plain data. Nothing here fetches, signs, draws or saves.

import {
  pickupPlace, dropPlaceOf, dropAddress, validPlace, strictNumber,
} from "./courier_place.js";
import { waNumber } from "./state.js";

// Malaysia has no daylight saving — one offset, all year, since 1982 — so the
// bakery's clock is a FIXED eight hours ahead of UTC. That is why the conversion
// below is arithmetic on the bakery's own time and not the phone's:
//
//   The trap. `new Date("2026-09-25T10:00")` is parsed in whatever timezone the
//   PHONE is set to. On her phone in Penang that is +8 and it looks right; on the
//   same phone taken to London it silently means 10:00 London, and the driver is
//   booked for 5 pm at the bakery. The delivery day is a Malaysia day because the
//   bakery is in Malaysia, so the offset is written down as a constant here rather
//   than inherited from the device that happens to be asking.
export const MY_UTC_OFFSET_HOURS = 8;

// "2026-09-25" + "10:00" -> "2026-09-25T02:00:00.000Z". Empty string when either
// half is not a real date or time, so a half-filled box can never reach the API as
// a scheduled pickup at midnight on the first of January 1970 — which is what the
// API would happily book.
//
// The date is validated by round-tripping it: Date.UTC(2026, 1, 31) is not an
// error in JavaScript, it is the 3rd of March, and a date box that somehow carries
// a 31st of February must be refused here rather than turned into a booking on a
// day she did not choose.
export function scheduleAtUTC(date, time) {
  const d = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = String(time || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !t) return "";
  const Y = Number(d[1]);
  const M = Number(d[2]);
  const D = Number(d[3]);
  const hh = Number(t[1]);
  const mm = Number(t[2]);
  if (M < 1 || M > 12 || D < 1 || D > 31) return "";
  if (hh > 23 || mm > 59) return "";
  const probe = new Date(Date.UTC(Y, M - 1, D));
  if (probe.getUTCFullYear() !== Y || probe.getUTCMonth() !== M - 1 || probe.getUTCDate() !== D) {
    return "";
  }
  // A negative hour is not a mistake — Date.UTC rolls it back a day, which is
  // exactly right for a 06:00 pickup, whose UTC instant is the evening before.
  const ms = Date.UTC(Y, M - 1, D, hh - MY_UTC_OFFSET_HOURS, mm);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
}

// Who the driver collects FROM: the bakery, and the number the driver should ring
// if the gate is shut — the bakery's own public number, which is already typed once
// for the shop and the homepage.
export function senderOf(state) {
  const s = (state && state.settings) || {};
  const shop = (s.storefront && typeof s.storefront === "object") ? s.storefront : {};
  return {
    name: String(shop.name || "").trim() || "Jienluv2bake",
    phone: waNumber(shop.whatsapp),
  };
}

// One door to knock on: the person, the number, the words she would say, and the
// pinned point — which may be null, and is left null rather than guessed.
export function stopOf(state, order) {
  const place = validPlace(dropPlaceOf(state, order));
  return {
    order: order || null,
    name: String((order && order.customerName) || "").trim(),
    phone: waNumber(order && order.whatsapp),
    address: dropAddress(order),
    place,
  };
}

// The whole trip. `orders` is an array because a trip has stops — today the quote
// panel sends one, and one trip with several stops is the same journey the
// consolidation screen books later, so this is the shape rather than a guess at it.
//
// Nothing is filled in where something is missing: a stop with no pinned point
// keeps `place: null`, and a trip with no pickup keeps `pickup: null`. The caller
// asks placeProblem() what is missing and says so; a fallback point invented here
// would be a price for a trip that is not the one she is taking.
export function tripOf(state, orders, { scheduleAt = "" } = {}) {
  const list = (Array.isArray(orders) ? orders : [orders]).filter(Boolean);
  return {
    pickup: validPlace(pickupPlace(state)),
    stops: list.map((o) => stopOf(state, o)),
    scheduleAt: String(scheduleAt || ""),
  };
}

// Ready to be priced: every end of it is a real point. The schedule is NOT part of
// this — a quote for "as soon as possible" is a legitimate quote, and the panel
// says which one it is asking for.
export function tripReady(trip) {
  if (!trip || !validPlace(trip.pickup)) return false;
  if (!Array.isArray(trip.stops) || !trip.stops.length) return false;
  return trip.stops.every((s) => validPlace(s.place));
}

// How many stops have no pinned doorstep yet — what the panel counts when it tells
// her how many are still to place.
export function stopsUnplaced(trip) {
  if (!trip || !Array.isArray(trip.stops)) return 0;
  return trip.stops.filter((s) => !validPlace(s.place)).length;
}

// What is still missing from this trip, in words, or "" when nothing is.
//
// This asks the same question as courier_place.js's placeProblem does, and asks it
// of a TRIP rather than of a state and an order — because a trip has already been
// built by the time a provider or a panel holds one, and rebuilding it just to find
// out what is wrong with it would be a second way to answer the same question. Both
// end in the same sentences, because both are about the same two ends of the same
// journey.
export function tripProblem(trip) {
  if (!validPlace(trip && trip.pickup)) {
    return "The bakery's pickup spot is not pinned yet — pin it in Settings and every price from now on is for the right door.";
  }
  const missing = stopsUnplaced(trip);
  if (missing === 0) return "";
  if (missing === 1) {
    return "This customer's doorstep is not pinned yet — look it up, or put the pin on the map.";
  }
  return `${missing} of these doorsteps are not pinned yet — pin them all and the price is for the whole run.`;
}

// The day this order goes out, read the way the order ROW reads it: the delivery day
// the order points at while that day still exists, else the date it was saved with.
//
// It is a function here rather than three lines in the quote panel because a
// schedule is a day plus a time, and a price for the wrong day is a price she quotes
// to a customer and then has to take back. One reading, in the tested half.
export function orderDay(state, order) {
  const id = String((order && order.deliveryDateId) || "").trim();
  const row = id ? (((state && state.deliveryDates) || []).find((d) => d && d.id === id) || null) : null;
  return String((row && row.date) || (order && order.deliveryDate) || "").trim();
}

// A quoted price in the bakery's own money. The quote names its own currency; while
// it is the bakery's, the price reads exactly as every other price in the app does.
// When it is NOT — a courier quoting in a currency this bakery does not sell in —
// the code is printed in place of the symbol, because "RM 300.00" over a quote that
// was really in rupiah is a price out by a factor of three thousand, and a number on
// a screen is believed.
export function fmtQuote(amount, currency, appCurrency = "RM") {
  const n = strictNumber(amount);
  if (n === null) return "";
  const said = String(currency || "").trim().toUpperCase();
  const own = String(appCurrency || "RM").trim() || "RM";
  // RM and MYR are the same money — the app stores the symbol, a courier quotes the
  // code — so both are folded to the code before they are compared. They are NOT
  // folded to whatever the bakery uses: a bakery whose own money is S$ being quoted
  // MYR must see "MYR" in front of the number, because that is a different currency
  // and this line is the only thing on screen that would say so.
  const code = (x) => (x === "RM" ? "MYR" : x);
  const same = !said || code(said) === code(own);
  return `${same ? own : said} ${(Math.round(n * 100) / 100).toFixed(2)}`;
}

// How long this price has left, or "expired". A quotation that carried no readable
// expiry reads as expired rather than as live: a price with no clock on it is not
// evidence that a price is still good, and the cost of the two mistakes is not
// symmetric — asking again costs one tap, quoting a dead price costs her money.
export function fmtQuoteLeft(quote, now = Date.now()) {
  const at = Date.parse(String((quote && quote.expiresAt) || ""));
  if (!Number.isFinite(at)) return "expired";
  const left = at - now;
  if (left <= 0) return "expired";
  const s = Math.floor(left / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Whether that price is past its life. The same reading as fmtQuoteLeft, kept as a
// question of its own so a caller never has to compare a printed string to decide
// what to disable.
export function quoteExpired(quote, now = Date.now()) {
  return fmtQuoteLeft(quote, now) === "expired";
}

// A distance the way Lalamove reports it, said plainly on screen. It arrives in
// metres or kilometres depending on the trip, and short trips are the common case,
// so under a kilometre is metres and the rest is one decimal of a kilometre.
export function fmtDistanceKm(km) {
  // strictNumber, not Number: `Number(null)` is 0, so a reply with no distance in it
  // would print "0 km" beside a real price — a measurement invented out of an
  // absence, which is exactly what a distance under a fee must never be.
  const n = strictNumber(km);
  if (n === null || n < 0) return "";
  if (n === 0) return "0 km";
  if (n < 1) return `${Math.round(n * 1000)} m`;
  return `${n.toFixed(1)} km`;
}
