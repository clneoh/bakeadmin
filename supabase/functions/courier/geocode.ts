// supabase/functions/courier/geocode.ts — turning her typed address into a point
// (25 Sep 2026; a second service added the same day, see below).
//
// WHY THE SERVER ASKS, AND NOT THE PHONE. Two reasons, and the first is the one
// that matters:
//
//   • A browser call to a public geocoder carries her CUSTOMER'S HOME ADDRESS out
//     of the app under the customer's own IP, with no way to say who is asking. The
//     server asks once, with a name and a contact, which is what the service's own
//     usage policy requires and what makes the request answerable if it is ever
//     questioned.
//   • The address is the only thing needed, so there is nothing here for the phone
//     to hold on to.
//
// TWO SERVICES, AND THE ORDER IS NOT ARBITRARY. Nominatim — OpenStreetMap's own
// geocoder — was the only one here until 25 Sep 2026, when it answered this function
// with an HTTP error, twice in a row, for an ordinary Penang address it is perfectly
// able to find. Its policy is the likely reason, and it is a fair one: it asks every
// caller to identify itself, and it turns away callers it cannot account for. THIS
// FUNCTION DOES SEND A NAME — a real one, with a contact route, as the policy asks
// (USER_AGENT below). Whether that name arrives is not something this code can see:
// the request leaves through a shared edge runtime, and the service's answer is the
// only report of what it received. Two identical refusals for an address the service
// demonstrably knows is what settled it: this is not a transient fault to retry, and
// it is not a question for the code to argue over.
//
// So a second service is asked FIRST rather than the first one being asked harder.
// Photon is built from the same OpenStreetMap data, needs no key, and asks nothing of
// the caller beyond the question itself — which is what a shared runtime can actually
// provide. Nominatim is kept as the second ask rather than deleted: it is the
// better-resourced index, and if the barrier that turned it away ever lifts it is
// already in the queue. The first service that answers with a place wins, so in
// normal use only ONE of them ever sees an address.
//
// AND AN ANSWER IS A LIST, NOT A POINT (v198). Both services reply with several
// candidates and this file used to keep only the first, so four good matches died in
// here on every lookup and she had to notice the pin was wrong and drag it. They are
// all carried back now and the app offers them to her — MAX_PLACES below is how many,
// and admin/js/place_map.js is the list she actually reads.
//
// A MISS IS A NORMAL ANSWER. A house in a new Penang estate may simply not be in
// OpenStreetMap, and when it is not, the honest reply is "put the pin on the map
// instead" — which is exactly what she chose. It is never an error she has to
// understand.

import { validPoint } from "./place.ts";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";

// Nominatim's policy asks for a real identifier with a contact route. This is that,
// and it also means a misbehaving caller is traceable rather than blocked outright.
const USER_AGENT = "Jienluv2bake-Courier/1.0 (+https://jienluv2bake.com.my)";

// The address is hers to deliver to, and she is in Penang. Both services are asked
// for Malaysian answers only, so a same-named street in another country cannot be
// handed back as her customer's door — Nominatim filters by `countrycodes=my` in the
// query, and Photon's replies are filtered on the way in (see below).
const COUNTRY = "MY";

// How many candidates are carried back for her to choose between. It is asked of the
// services in their URLs and enforced again here, because it is a promise the app makes
// about how long a list she has to read, not a property of any one service's reply.
const MAX_PLACES = 5;

// One candidate door. The same three fields a saved door has, so a candidate can be
// handed to the app's own validPlace and then to setDropPlace with nothing in between
// knowing it came from a geocoder.
type Place = { lat: number; lng: number; label: string };

// Read Nominatim's reply into every place it offers, in the order it offered them.
// Exported so the parsing is Node-tested without a network: a reply read wrongly here
// is a pin in the wrong state shown to her as a fact.
export function placesFromResults(data: unknown): Place[] {
  const list = Array.isArray(data) ? data : [];
  const out: Place[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    // Nominatim spells longitude `lon`; the app spells it `lng`. Both are read, and
    // whichever is there goes through the same rule as everywhere else — see place.ts
    // for why `Number(r.lat)` on its own is not good enough.
    const spot = validPoint({ lat: r.lat, lng: r.lon != null ? r.lon : r.lng });
    // A row with no usable point is skipped rather than ending the read, which is what
    // Photon's reader has always done: the next row down the list may be the right
    // house, and stopping at a broken one would throw it away for nothing.
    if (!spot) continue;
    out.push({ lat: spot.lat, lng: spot.lng, label: String(r.display_name || "").trim() });
    if (out.length >= MAX_PLACES) break;
  }
  return out;
}

// The words a Photon result wears on the pin. It sends no ready-made label the way
// Nominatim does, so one is composed from the parts it does send — street, then town,
// then postcode — and every part is optional.
function photonLabel(p: Record<string, unknown>): string {
  return [p.name, p.city || p.district || p.locality, p.postcode]
    .map((part) => String(part == null ? "" : part).trim())
    .filter(Boolean)
    .join(", ");
}

// Read Photon's reply into every place it offers, in the order it offered them.
// Exported for the same reason as the reader above, and it needs the tests more:
// Photon answers with GeoJSON, whose coordinates are LONGITUDE FIRST — the opposite
// order to every other point in this app. A reader that took them in the order they
// are written would put her customer in the Indian Ocean and show the numbers as a
// fact, so the swap happens here, once, where a test can see it.
export function placesFromPhoton(data: unknown): Place[] {
  const features = (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).features))
    ? (data as Record<string, unknown>).features as unknown[]
    : [];
  const out: Place[] = [];
  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    const p = (f.properties && typeof f.properties === "object")
      ? f.properties as Record<string, unknown>
      : {};
    // Malaysia only, which is what the other service's query asks for too. A feature
    // from anywhere else is skipped rather than refused, because the next result in
    // the list may be the right one.
    if (String(p.countrycode || "").toUpperCase() !== COUNTRY) continue;
    const geom = (f.geometry && typeof f.geometry === "object") ? f.geometry as Record<string, unknown> : {};
    const coords = Array.isArray(geom.coordinates) ? geom.coordinates : [];
    const spot = validPoint({ lat: coords[1], lng: coords[0] });
    if (!spot) continue;
    out.push({ lat: spot.lat, lng: spot.lng, label: photonLabel(p) });
    if (out.length >= MAX_PLACES) break;
  }
  return out;
}

// One ask, and what came back. Three outcomes are told apart because the words she
// ends up reading are chosen from them: a service that answered but did not know the
// address is a MISS, and nothing to complain about; a service that answered with an
// error, or did not answer at all, is a refusal, and worth a distinct sentence.
type AskOutcome = {
  replied?: boolean;
  status?: number;
  aborted?: boolean;
  places?: Place[];
};

async function ask(
  service: { name: string; url: (q: string) => string; headers: Record<string, string>;
             read: (data: unknown) => Place[] },
  q: string,
  timeoutMs: number,
): Promise<AskOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(service.url(q), { headers: service.headers, signal: controller.signal });
    if (!res.ok) {
      console.error(`[courier] ${service.name} answered HTTP ${res.status}`);
      return { status: res.status };
    }
    const data = await res.json().catch(() => null);
    const places = service.read(data);
    // Which service did the work, and how much of it there was, said out loud. One
    // line per lookup, and it is the only way to tell from the log whether the first
    // ask or the second one is the one earning its place — and whether either of them
    // is handing back a list too short to be worth choosing from.
    if (places.length) {
      console.log(`[courier] ${service.name} found ${places.length} candidate${places.length === 1 ? "" : "s"}`);
    }
    return { replied: true, places };
  } catch (err) {
    console.error(`[courier] ${service.name} failed:`, (err as Error)?.message || err);
    return { aborted: (err as Error)?.name === "AbortError" };
  } finally {
    clearTimeout(timer);
  }
}

const SERVICES = [
  {
    name: "photon",
    url: (q: string) => `${PHOTON}?q=${encodeURIComponent(q)}&limit=${MAX_PLACES}&lang=en`,
    headers: { "Accept-Language": "en" },
    read: placesFromPhoton,
  },
  {
    name: "nominatim",
    // Asked for as many as Photon is. The request count is identical either way — one
    // press, one ask — so this costs nothing and means the second service, which only
    // runs when the first one is down, still offers her a choice rather than a single
    // take-it-or-leave-it point. This is not the autocomplete Nominatim's policy turns
    // away: nothing is sent until she presses the button, and it carries a full address.
    url: (q: string) => `${NOMINATIM}?format=jsonv2&limit=${MAX_PLACES}&countrycodes=my&addressdetails=0&q=${encodeURIComponent(q)}`,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    read: placesFromResults,
  },
];

// The same door offered twice, collapsed to once. A list she has to read should not
// spend two of its five rows on one answer, and it happens for a real reason: a house
// written with and without its street name is two rows to the service and one door to
// her. The label is the ONLY thing compared, and an empty one is never collapsed —
// every candidate with no label has the same words, which says nothing about whether
// they are the same place. Two genuinely different doors wearing identical words are a
// problem no comparison can solve, and the map is one tap away.
//
// This can only SHORTEN a list, never lengthen one: MAX_PLACES is enforced by the two
// readers as they collect, so a cap here would be a guard that can never fire.
function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const p of places) {
    const key = String(p.label || "").trim().toLowerCase();
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(p);
  }
  return out;
}

export async function geocodeAddress(
  address: string,
  { timeoutMs = 5000 } = {},
): Promise<{ ok: boolean; place?: Place; places?: Place[]; reason?: string }> {
  const q = String(address || "").trim();
  if (!q) return { ok: false, reason: "There is no address to look up." };

  // The per-ask timeout is deliberately half of what it was when there was one
  // service. The app gives this call fifteen seconds in total, and two asks that
  // could each run to twelve would overrun it — the phone would give up on a lookup
  // that was still working, and the message she read would describe the wrong
  // problem entirely.
  let missed = false;
  let refused = false;
  let timedOut = false;
  let unreachable = false;

  for (const service of SERVICES) {
    const out = await ask(service, q, timeoutMs);
    const places = dedupe(out.places || []);
    // `place` is kept beside the list because two of the three callers want one answer
    // and not a choice: the quote card is asking what a trip costs, and the delivery
    // run is placing every unplaced customer in a loop that cannot ask a question per
    // address. It is always the first of the list, so the two can never disagree.
    if (places.length) return { ok: true, place: places[0], places };
    if (out.replied) missed = true;
    else if (out.status != null) refused = true;
    else if (out.aborted) timedOut = true;
    else unreachable = true;
  }

  // Not logged as an error: not finding a house is the expected outcome often enough
  // that treating it as a fault would bury the real ones.
  if (missed) return { ok: false, reason: "That address was not found. Put the pin on the map instead." };
  if (refused) return { ok: false, reason: "The address lookup service did not answer. Put the pin on the map instead." };
  if (timedOut) return { ok: false, reason: "The address lookup service did not answer in time. Put the pin on the map instead." };
  if (unreachable) return { ok: false, reason: "The address lookup service could not be reached. Put the pin on the map instead." };
  return { ok: false, reason: "The address lookup service did not answer. Put the pin on the map instead." };
}
