// couriers/lalamove.js — Lalamove, and the only file in the app that says so
// (25 Sep 2026).
//
// THE SEAM. Everything above this file talks about a courier: a trip, a price, a
// vehicle, a booking. Everything Lalamove-specific — its service keys, the shape of
// its quotation, its five-minute validity, its error codes — stops here. A second
// courier is a sibling of this file plus one line in couriers.js; nothing that calls
// a courier has to be opened to add one.
//
// This half shapes the request and reads the reply. It does NOT sign anything: the
// HMAC signature, the api key and the secret live in the `courier` edge function and
// never travel to a browser. See couriers/api.js for why that wall is not negotiable.
//
// The normalisers below are pure and take `now`, so every one of them is tested
// under Node without a network — which matters here more than usual, because a
// mis-read reply is a WRONG PRICE shown to her as a real one, and a wrong price she
// quotes to a customer is money she has already lost by the time anyone notices.

import { callCourier } from "./api.js";
import { tripReady, tripProblem } from "../courier_job.js";
import { strictNumber } from "../courier_place.js";

export const LALAMOVE_KEY = "lalamove";

// How long a quotation is worth. Lalamove's own policy, quoted from its docs, and
// used ONLY when the reply does not carry an expiry of its own — a quotation that
// says when it dies is believed; one that does not is given this, and the screen
// says "about five minutes" rather than pretending to know the second.
export const QUOTE_VALID_MS = 5 * 60 * 1000;

// The order she thinks in: the smallest thing that can carry a box first, then up.
// Any service Lalamove adds that is not on this list still appears — it sorts after
// these, alphabetically — so a market we did not anticipate is shown rather than
// hidden.
const SERVICE_ORDER = ["MOTORCYCLE", "CAR", "VAN", "7FT_VAN", "9FT_VAN", "4X4", "TRUCK", "LORRY"];

// A vehicle's name for the screen: Lalamove's own if it sent one, else its key said
// in words ("MOTORCYCLE" -> "Motorcycle"). Never blank — a nameless row in a list of
// prices cannot be chosen.
//
// A word also opens after a DIGIT, which `\b` alone does not do: two of the keys in
// this market's own fleet start with a number, and without it "7FT_VAN" reads as
// "7ft Van" and "4X4" as "4x4" — the vehicle's name spelled wrong on the only row she
// can use to tell it from the car.
export function serviceLabel(key, name = "") {
  const said = String(name || "").trim();
  if (said) return said;
  const k = String(key || "").trim();
  if (!k) return "Vehicle";
  return k.toLowerCase().replace(/[_-]+/g, " ").replace(/(^|[\s_-]+|\d)([a-z])/g, (m, lead, c) => lead + c.toUpperCase());
}

// Order the vehicles the way she thinks about them. Pure, and pinned by a test,
// because a list that silently reorders itself between two opens reads as a bug.
export function sortServices(list) {
  const rank = (k) => {
    const at = SERVICE_ORDER.indexOf(String(k || "").toUpperCase());
    return at < 0 ? SERVICE_ORDER.length : at;
  };
  return (Array.isArray(list) ? list.slice() : []).sort((a, b) => {
    const d = rank(a.key) - rank(b.key);
    return d !== 0 ? d : String(a.key).localeCompare(String(b.key));
  });
}

// The vehicle list, read from Lalamove's own cities rather than written down here —
// so a service it adds or retires in Malaysia shows up without a release.
export function normaliseVehicles(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Map();
  for (const s of list) {
    const key = String((s && s.key) || "").trim();
    if (!key || seen.has(key)) continue;
    seen.set(key, { key, name: serviceLabel(key, s && s.name) });
  }
  return sortServices([...seen.values()]);
}

// A number out of a reply, or null. Strict rather than plain `Number()`, because
// this is the ONE place a wrong reading becomes a wrong PRICE on screen: a field
// Lalamove sent as null would convert to 0, and a 0 in a price breakdown is not an
// absence, it is a measurement — a VAT line of RM0.00, a distance of 0 km under a
// fee. courier_place.js's strictNumber is the app's one answer to "is this a
// number", and this feature has already paid for its absence twice.
function numOrNull(v) {
  return strictNumber(v);
}

// Lalamove reports distance as a value with a unit, and short trips are the common
// case. Metres become kilometres; anything else is taken at face value, because
// inventing a conversion for a unit we were not told about would be a guess printed
// as a measurement.
export function distanceKmOf(d) {
  if (d == null) return null;
  if (typeof d === "object") {
    const v = numOrNull(d.value);
    if (v === null) return null;
    const unit = String(d.unit || "km").trim().toLowerCase();
    if (unit === "m" || unit === "meter" || unit === "meters" || unit === "metre" || unit === "metres") {
      return v / 1000;
    }
    if (unit === "mi" || unit === "mile" || unit === "miles") return v * 1.609344;
    return v;
  }
  return numOrNull(d);
}

// One quotation, read into the app's own words. Returns null when there is no price
// in it at all — a reply with no total is not a price of zero, and showing RM0.00
// would be worse than showing nothing.
export function normaliseQuote(raw, now = Date.now(), service = "") {
  if (!raw || typeof raw !== "object") return null;
  const bd = (raw.priceBreakdown && typeof raw.priceBreakdown === "object") ? raw.priceBreakdown : {};
  // The first of the three places a total can be, read through the same strict
  // guard as everything else: `Number(null)` is 0, so a reply whose total came back
  // as null would otherwise be quoted to her as RM0.00 — a real price, shown as a
  // real price, for a trip Lalamove never priced.
  const total = numOrNull(bd.total != null ? bd.total : (raw.total != null ? raw.total : raw.amount));
  if (total === null) return null;

  // The reply's own expiry if it has one, else the documented five minutes from
  // this moment — with which of the two it was kept, so the screen never states a
  // precision it does not have.
  const said = String(raw.expiresAt || "").trim();
  const saidMs = said ? Date.parse(said) : NaN;
  const fromApi = Number.isFinite(saidMs) && saidMs > 0;
  const expiresAt = fromApi ? new Date(saidMs).toISOString() : new Date(now + QUOTE_VALID_MS).toISOString();

  return {
    id: String(raw.quotationId || raw.id || ""),
    service: String(raw.serviceType || service || ""),
    amount: Math.round(total * 100) / 100,
    currency: String(bd.currency || raw.currency || "MYR"),
    breakdown: { base: numOrNull(bd.base), vat: numOrNull(bd.vat) },
    distanceKm: distanceKmOf(raw.distance),
    expiresAt,
    expiryFrom: fromApi ? "api" : "policy",
  };
}

// The whole quotation reply: the prices that came back, and the vehicles that did
// not, named. A vehicle refused on its own is NOT a failed screen — the motorcycle
// may be priced while the van is not available at this hour, and she must still be
// able to see and use the one that works.
export function normaliseQuotes(out, now = Date.now()) {
  const quotes = [];
  for (const q of (Array.isArray(out && out.quotes) ? out.quotes : [])) {
    const service = String((q && q.serviceType) || (q && q.service) || "").trim();
    const one = normaliseQuote(q, now, service);
    if (one) quotes.push(one);
  }
  const failed = (Array.isArray(out && out.failed) ? out.failed : [])
    .map((f) => ({ service: String((f && f.service) || ""), reason: String((f && f.reason) || "").trim() }))
    .filter((f) => f.service || f.reason);
  return { quotes, failed };
}

// A point, as the API wants it. `address` travels beside the numbers because
// Lalamove shows it to the driver and asks for it when its own reverse-geocode
// fails — the coordinates are what it routes by, the words are what the driver
// reads at the gate.
function pointPayload(place, address) {
  return {
    lat: Number(place.lat),
    lng: Number(place.lng),
    address: String(address || "").trim(),
  };
}

function tripPayload(trip) {
  return {
    pickup: pointPayload(trip.pickup, (trip.pickup && trip.pickup.label) || ""),
    drops: trip.stops.map((s) => pointPayload(s.place, s.address || (s.place && s.place.label) || "")),
  };
}

// LALAMOVE, as a courier. The three verbs the app needs today; booking, reading a
// live job and cancelling join them when the booking half is built.
export const lalamove = {
  key: LALAMOVE_KEY,
  label: "Lalamove",

  // Which vehicles Lalamove will quote in Malaysia. Asked of Lalamove, cached for
  // the life of the module — the fleet does not change between two taps, and this
  // call is not worth making on every open of the panel.
  async vehicles(state) {
    if (lalamove._vehicles) return { ok: true, vehicles: lalamove._vehicles };
    const out = await callCourier(state, { action: "vehicles", provider: LALAMOVE_KEY });
    if (!out.ok) return out;
    const vehicles = normaliseVehicles(out.services);
    if (!vehicles.length) {
      return { ok: false, reason: "Lalamove did not name any vehicles for Malaysia — the account may not be set up yet." };
    }
    lalamove._vehicles = vehicles;
    return { ok: true, vehicles };
  },

  // Price the trip for every vehicle asked for. One vehicle refused comes back in
  // `failed` rather than taking the whole answer with it.
  //
  // The trip is checked against its OWN definition (courier_job.js) rather than by
  // a test written out here, for the same reason sync.js asks the place module: one
  // answer to "is this trip ready", so a provider can never send a point the app
  // would call unpinned.
  async quote(state, trip, { services = [], scheduleAt = "" } = {}) {
    if (!tripReady(trip)) {
      return { ok: false, reason: tripProblem(trip) };
    }
    const { pickup, drops } = tripPayload(trip);
    const out = await callCourier(state, {
      action: "quote",
      provider: LALAMOVE_KEY,
      payload: { pickup, drops, services, scheduleAt: String(scheduleAt || "") },
    });
    if (!out.ok) return out;
    const { quotes, failed } = normaliseQuotes(out, Date.now());
    // Every price wears the vehicle's own NAME, so a screen listing prices can label
    // a row without knowing which courier it came from. The alternative — the view
    // importing this file's label-maker — is exactly the coupling the seam exists to
    // prevent, and a row reading "7FT_VAN" instead of "7ft Van" is the reason the
    // label-maker has tests of its own.
    const named = (key) => {
      const k = String(key || "").trim();
      const hit = (lalamove._vehicles || []).find((v) => v.key === k);
      if (hit) return hit.name;
      const made = normaliseVehicles([{ key: k }]);
      return made.length ? made[0].name : "";
    };
    return {
      ok: true,
      quotes: quotes.map((q) => ({ ...q, name: named(q.service) })),
      // A vehicle that could not be priced is named too. It is the row she most needs
      // to read: "no van at this hour" is a reason to book a car, and it is unreadable
      // as "7FT_VAN".
      failed: failed.map((f) => ({ ...f, name: named(f.service) })),
    };
  },

  // Forget the cached fleet. Called when the account changes in Settings, so a
  // phone that was set up against a sandbox does not keep quoting a sandbox fleet.
  forget() {
    lalamove._vehicles = null;
  },
};
