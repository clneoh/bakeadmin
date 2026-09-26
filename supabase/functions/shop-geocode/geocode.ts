// supabase/functions/shop-geocode/geocode.ts — the same lookup the bakery's app
// makes, for a page that is open to the public (v202, 26 Sep 2026).
//
// WHY THIS IS A COPY OF ../courier/geocode.ts RATHER THAN AN IMPORT OF IT. A Supabase
// Edge Function is deployed as its own bundle, so one function cannot reach into
// another's directory at deploy time; the alternative — a `_shared/` module both
// import — would mean editing the courier function that is right now deployed and
// working with nothing owed on it, to serve a page nobody has ordered from yet. So
// the rules are duplicated deliberately, and `test/shop-geocode.test.js` drives BOTH
// files side by side with the same stubbed network and fails the moment they stop
// finding the same doors. A copy nobody compares is how the country filter, the
// longitude-first read or the service order would quietly diverge.
//
// WHAT DIFFERS, AND WHY IT HAS TO. The courier's version returns prose — "That address
// was not found. Put the pin on the map instead." — because the only reader is the
// baker's own app, in English. The reader here is a customer who may be reading the
// page in 中文 or Bahasa Malaysia, so this file answers with a CODE ("notfound") and
// the shop chooses the sentence in the customer's own language (store-lang.js). A
// sentence chosen on the server is a sentence nobody can translate.
//
// Everything else is the courier's own reasoning, and it is worth reading there in
// full (../courier/geocode.ts). In short: Photon is asked FIRST because Nominatim's
// usage policy turns away callers it cannot identify, and it did exactly that twice
// for an ordinary Penang address; Nominatim is kept as the second ask because it is
// the better-resourced index and the barrier may lift. Both are asked for Malaysian
// answers only, so a same-named street in another country is never handed back as a
// customer's door. A miss is a normal answer, not an error anybody has to understand.

import { validPoint } from "./place.ts";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const PHOTON = "https://photon.komoot.io/api/";

// Who is asking, in the form the services' usage policies require: a real name and a
// contact route, so a misbehaving caller is traceable rather than turned away. It
// names the SHOP rather than the courier function because they are two different
// callers, and a service that decides to slow one of them down should not take the
// bakery's own address lookups with it.
const USER_AGENT = "Jienluv2bake-Shop/1.0 (+https://jienluv2bake.com.my)";

const COUNTRY = "MY";

// How many candidates travel back to the phone. Also asked of the services in their
// own URLs and enforced again in the readers, because it is a promise about how long a
// list a customer has to read rather than a property of any one service's reply.
export const MAX_PLACES = 5;

// One candidate door. The same three fields a saved door has, so the shop can hand it
// to its own validPin with nothing in between knowing it came from a geocoder.
export type Place = { lat: number; lng: number; label: string };

// Why a lookup produced nothing. These are CODES, not sentences — see the header.
export type Why = "empty" | "notfound" | "refused" | "timeout" | "unreachable";

export type Lookup =
  | { ok: true; places: Place[] }
  | { ok: false; why: Why };

// Read Nominatim's reply into every place it offers, in the order it offered them.
// Kept exported for the same reason the courier's is: a reply read wrongly here is a
// pin in the wrong state put in front of a customer as a fact.
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
    // A row with no usable point is skipped rather than ending the read: the next row
    // down the list may be the right house, and stopping at a broken one would throw
    // it away for nothing.
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

// Read Photon's reply into every place it offers, in the order it offered them. This
// one needs the tests more than the other: Photon answers with GeoJSON, whose
// coordinates are LONGITUDE FIRST — the opposite order to every other point in this
// app. A reader that took them as written would put the customer in the Indian Ocean
// and show the numbers as a fact, so the swap happens here, once, where a test can see
// it.
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

// One ask, and what came back. Three outcomes are told apart because they become
// different words on the customer's screen: a service that answered but did not know
// the address is a MISS and nothing to complain about; a service that answered with an
// error, or did not answer at all, is a refusal worth its own sentence.
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
      console.error(`[shop-geocode] ${service.name} answered HTTP ${res.status}`);
      return { status: res.status };
    }
    const data = await res.json().catch(() => null);
    const places = service.read(data);
    // Which service did the work, and how much of it there was, said out loud. It is
    // the only way to tell from the log whether the first ask or the second one is
    // earning its place.
    if (places.length) {
      console.log(`[shop-geocode] ${service.name} found ${places.length} candidate${places.length === 1 ? "" : "s"}`);
    }
    return { replied: true, places };
  } catch (err) {
    console.error(`[shop-geocode] ${service.name} failed:`, (err as Error)?.message || err);
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
    // Asked for as many as Photon is: one press, one ask either way, so this costs
    // nothing and means the second service still offers a choice rather than a single
    // take-it-or-leave-it point. This is not the autocomplete Nominatim's policy turns
    // away — the shop sends nothing at all until typing has stopped, and what it sends
    // is a whole address.
    url: (q: string) => `${NOMINATIM}?format=jsonv2&limit=${MAX_PLACES}&countrycodes=my&addressdetails=0&q=${encodeURIComponent(q)}`,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    read: placesFromResults,
  },
];

// The same door offered twice, collapsed to once. A list a customer has to read should
// not spend two of its five rows on one answer, and it happens for a real reason: a
// house written with and without its street name is two rows to the service and one
// door to them. The label is the ONLY thing compared, and an empty one is never
// collapsed — every unlabelled candidate has the same words, which says nothing about
// whether they are the same place.
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

// The whole lookup. `timeoutMs` is per ask and deliberately half of what the shop's own
// patience is, so two asks cannot together outrun the caller waiting on them: a phone
// that gave up on a lookup still working would read a message describing the wrong
// problem entirely.
export async function lookupAddress(
  address: string,
  { timeoutMs = 5000 } = {},
): Promise<Lookup> {
  const q = String(address || "").trim();
  if (!q) return { ok: false, why: "empty" };

  let missed = false;
  let refused = false;
  let timedOut = false;
  let unreachable = false;

  for (const service of SERVICES) {
    const out = await ask(service, q, timeoutMs);
    const places = dedupe(out.places || []);
    if (places.length) return { ok: true, places };
    if (out.replied) missed = true;
    else if (out.status != null) refused = true;
    else if (out.aborted) timedOut = true;
    else unreachable = true;
  }

  // Not logged as an error: not finding a house is the expected outcome often enough
  // that treating it as a fault would bury the real ones.
  if (missed) return { ok: false, why: "notfound" };
  if (refused) return { ok: false, why: "refused" };
  if (timedOut) return { ok: false, why: "timeout" };
  if (unreachable) return { ok: false, why: "unreachable" };
  return { ok: false, why: "refused" };
}
