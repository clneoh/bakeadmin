// supabase/functions/courier/geocode.ts — turning her typed address into a point
// (25 Sep 2026).
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
// OpenStreetMap's Nominatim is used because it is free, needs no key, and covers
// Malaysian addresses as well as anything free does. Its policy is respected rather
// than worked around: one request per address she asks about, no bulk, no loop.
//
// A MISS IS A NORMAL ANSWER. A house in a new Penang estate may simply not be in
// OpenStreetMap, and when it is not, the honest reply is "put the pin on the map
// instead" — which is exactly what she chose. It is never an error she has to
// understand.

import { validPoint } from "./place.ts";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Nominatim's policy asks for a real identifier with a contact route. This is that,
// and it also means a misbehaving caller is traceable rather than blocked outright.
const USER_AGENT = "Jienluv2bake-Courier/1.0 (+https://jienluv2bake.com.my)";

// Read the reply into one place, or null. Exported so the parsing is Node-tested
// without a network: a reply read wrongly here is a pin in the wrong state shown to
// her as a fact.
export function placeFromResults(data: unknown): { lat: number; lng: number; label: string } | null {
  const list = Array.isArray(data) ? data : [];
  const first = list.find((r) => r && typeof r === "object") as Record<string, unknown> | undefined;
  if (!first) return null;
  // Nominatim spells longitude `lon`; the app spells it `lng`. Both are read, and
  // whichever is there goes through the same rule as everywhere else — see place.ts
  // for why `Number(first.lat)` on its own is not good enough.
  const spot = validPoint({ lat: first.lat, lng: first.lon != null ? first.lon : first.lng });
  if (!spot) return null;
  return { lat: spot.lat, lng: spot.lng, label: String(first.display_name || "").trim() };
}

export async function geocodeAddress(
  address: string,
  { timeoutMs = 12000 } = {},
): Promise<{ ok: boolean; place?: { lat: number; lng: number; label: string }; reason?: string }> {
  const q = String(address || "").trim();
  if (!q) return { ok: false, reason: "There is no address to look up." };

  const url = `${NOMINATIM}?format=jsonv2&limit=1&countrycodes=my&addressdetails=0&q=${encodeURIComponent(q)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[courier] nominatim answered HTTP ${res.status}`);
      return { ok: false, reason: "The address lookup service did not answer. Put the pin on the map instead." };
    }
    const data = await res.json().catch(() => null);
    const place = placeFromResults(data);
    if (!place) {
      // Not logged as an error: not finding a house is the expected outcome often
      // enough that treating it as a fault would bury the real ones.
      return { ok: false, reason: "That address was not found. Put the pin on the map instead." };
    }
    return { ok: true, place };
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    console.error("[courier] nominatim failed:", (err as Error)?.message || err);
    return {
      ok: false,
      reason: aborted
        ? "The address lookup service did not answer in time. Put the pin on the map instead."
        : "The address lookup service could not be reached. Put the pin on the map instead.",
    };
  } finally {
    clearTimeout(timer);
  }
}
