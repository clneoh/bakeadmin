// courier_place.js — where a courier trip starts and where it ends (25 Sep 2026).
//
// A courier API does not want an address. It wants a POINT. "5.41405,100.31408" is
// a doorstep; "12 Jalan Bunga, Penang" is a guess about one — and Lalamove says so
// itself: the error it raises when it cannot place an address is
// ERR_REVERSE_GEOCODE_FAILURE and its own text asks for "lat and lng". So the app
// has to hold a point for two things: the bakery (once) and each customer (once
// each).
//
// Hers was the choice, in so many words: "Locate it, let me fix it". The app looks
// the address up; where that fails or lands wrong she puts the pin where it belongs
// and that customer is remembered. Three answers in this order, because the first
// two are cheap and the third is the only one that is never wrong:
//
//   1. the point already saved for this customer  -> use it. No lookup, no screen.
//   2. the address their order already carries    -> look it up once, SAVE what
//                                                    comes back, so it is asked
//                                                    exactly once per customer.
//   3. a tap on a map                             -> the answer she can trust.
//
// A saved point lives on the CUSTOMER's profile row (profiles.js), not in a map of
// its own, and that is the whole reason this needs no new machinery: the profile is
// already keyed by the same number the orders are (keyOf), it is already re-keyed
// when she corrects a number, and — the part that matters — state.customers travels
// to the cloud whole (sync.js returns list records as they are), so a doorstep
// pinned on one phone is on the other phone without a line of sync code.
//
// Pure — no DOM, no fetch — so it runs under Node for tests. Asking a geocoder and
// drawing a map belong to the caller; the rules about what to ask for and what to
// keep live here, so the quote panel and Settings cannot disagree about them.

import { keyOf } from "./customers.js";
import { profileFor } from "./profiles.js";
import { newId, save } from "./state.js";

// A number, or null — and the guard, not the conversion, is the point.
//
// `Number(null)` is 0. So is `Number("")`, `Number([])`, `Number(false)` and
// `Number("   ")`. Every one of them is finite, and that is what makes this the
// most expensive one-line mistake available in this feature: a latitude that came
// through as null becomes a real point on the Equator, a distance that came through
// as null becomes "0 km" printed under a price, and neither is an error anywhere in
// the stack. So a thing that is not already a number and not a non-empty string is
// not a number, whatever it happens to convert to.
//
// It is exported because the same trap is in two other places: fmtDistanceKm in
// courier_job.js, and the server's own copy in supabase/functions/courier/place.ts.
export function strictNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// A stored point, or null. It takes BOTH numbers to be a point: a half-written
// place — a latitude from a half-finished paste, a longitude that came through as a
// word — must read as "not known" rather than reaching the API, where NaN is not a
// 400 she could act on but a quotation for a trip that does not exist.
//
// Out-of-range values are refused for the same reason. Lalamove would take 999,999
// and answer with something; "the pin is nonsense, put it again" is the only useful
// answer, and it has to come from here because the API will happily not complain.
//
// This is the app's ONE answer to "is this a place", and it is deliberately asked
// by sync.js as well — the guarded-key rules will only carry `pickupPlace` when
// this says yes, so the app can never believe a spot is pinned that sync would
// refuse to hand to the other phone.
export function validPlace(p) {
  if (!p || typeof p !== "object") return null;
  const lat = strictNumber(p.lat);
  const lng = strictNumber(p.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng, label: String(p.label || "").trim() };
}

// The bakery's own pickup point, or null while it is still unpinned.
export function pickupPlace(state) {
  return validPlace(state && state.settings && state.settings.pickupPlace);
}

// The text to look up when the bakery has no pin yet — her mailing address, which
// is already typed once for the label sheet, so the first pin costs her no typing.
export function pickupAddress(state) {
  const s = (state && state.settings) || {};
  return String(s.mailingAddress || "").trim();
}

// The customer's saved doorstep, or null. Found off the order's own key, so the pin
// follows the person and not the order — a second order from the same number is
// already pinned.
export function dropPlaceOf(state, order) {
  const row = profileFor(state, keyOf(order));
  return validPlace(row && row.place);
}

// The delivery address the order already carries, as typed (the store's one-line
// address box, or whatever she wrote under Edit).
export function dropAddress(order) {
  return String((order && order.address) || "").trim();
}

// Remember a doorstep against the person this order belongs to. Creates the profile
// row if this customer has none yet, shaped exactly as profiles.js's own
// upsertProfile shapes one (the "cus" id prefix, the key, the contact the orders
// already carry) so a pin written from here and a profile saved from the customer
// card are the same kind of record.
//
// Refused, quietly, when the order has nothing to key a person by — the same
// invariant profiles.js keeps: a row nobody can find again is worse than no row.
export function setDropPlace(state, order, place) {
  const p = validPlace(place);
  const key = keyOf(order);
  if (!p || !key) return null;
  const list = Array.isArray(state.customers) ? state.customers : (state.customers = []);
  let row = list.find((x) => x && x.key === key) || null;
  if (!row) {
    row = {
      id: newId("cus"),
      key,
      name: String((order && order.customerName) || "").trim(),
      whatsapp: String((order && order.whatsapp) || "").trim(),
      createdAt: new Date().toISOString(),
    };
    list.push(row);
  }
  row.place = {
    lat: p.lat,
    lng: p.lng,
    label: p.label,
    at: new Date().toISOString(),
  };
  save(state);
  return row.place;
}

// Pin the bakery. Written once and rarely moved, so it needs no history.
export function setPickupPlace(state, place) {
  const p = validPlace(place);
  if (!p) return null;
  state.settings.pickupPlace = {
    lat: p.lat,
    lng: p.lng,
    label: p.label,
    at: new Date().toISOString(),
  };
  save(state);
  return state.settings.pickupPlace;
}

// "5.4141,100.3288" — the pair as the API wants it, or "" when there is no point.
export function latLngText(place) {
  const p = validPlace(place);
  return p ? `${p.lat},${p.lng}` : "";
}

// How a point is said on screen. A pinned spot carries the words she pinned it with
// (the geocoder's own label, or the address she typed beside a hand-placed pin);
// without one, the numbers themselves, at five decimals — about a metre, which is
// as close as anyone needs to say out loud.
export function fmtPlace(place, fallback = "not pinned yet") {
  const p = validPlace(place);
  if (!p) return fallback;
  return p.label || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

// Numbers she pasted, from anywhere she copied them. Four shapes, in the order that
// matters — the two Google Maps URL forms are tried before the bare pair, because a
// URL can contain a bare pair and the other way round is a wrong answer rather than
// a missed one:
//
//   https://www.google.com/maps/place/.../@5.4141,100.3288,17z    -> @lat,lng
//   https://maps.google.com/?q=5.4141,100.3288                    -> q=lat,lng
//   https://www.google.com/maps/...!3d5.4141!4d100.3288           -> !3d..!4d..
//   5.4141, 100.3288                                              -> a plain paste
//
// The bare form requires a decimal point somewhere, which is the one guard that
// keeps a pasted "5,100" — a price, a quantity, a date — from being read as a point
// in the South China Sea.
//
// Returns { lat, lng } with no label: the caller knows what this point is FOR and
// has better words for it than the numbers do.
export function parseCoords(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const num = "(-?\\d{1,3}(?:\\.\\d+)?)";
  const tryPair = (a, b) => {
    const lat = strictNumber(a);
    const lng = strictNumber(b);
    if (lat === null || lng === null) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},${num}`),
    new RegExp(`[?&#](?:q|ll|query|destination|center|daddr)=${num},${num}`, "i"),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const hit = tryPair(m[1], m[2]);
      if (hit) return hit;
    }
  }
  const bare = s.match(new RegExp(`^${num}\\s*,\\s*${num}$`));
  if (bare && /\d\.\d/.test(s)) {
    return tryPair(bare[1], bare[2]);
  }
  return null;
}

// What this trip is still missing, in words she can act on, or null when both ends
// are known. One place, so the quote panel and Settings say it the same way.
export function placeProblem(state, order) {
  if (!pickupPlace(state)) {
    return {
      need: "pickup",
      say: pickupAddress(state)
        ? "The bakery's pickup spot is not pinned yet — pin it in Settings and every price from now on is for the right door."
        : "Pin the bakery's pickup spot in Settings first — a courier needs a door to collect from.",
    };
  }
  if (!dropPlaceOf(state, order)) {
    return {
      need: "drop",
      say: dropAddress(order)
        ? "This customer's doorstep is not pinned yet — look it up, or put the pin on the map."
        : "This order has no delivery address to look up. Add one under Edit, or put the pin on the map.",
    };
  }
  return null;
}
