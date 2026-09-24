// supabase/functions/courier/providers/lalamove.ts — the signing half of Lalamove
// (25 Sep 2026).
//
// The client half (admin/js/couriers/lalamove.js) shapes a trip in the app's own
// words; this half turns it into Lalamove's words, signs it with the secret, and
// turns Lalamove's answer back. Nothing above this file knows that the api key and
// the secret exist, which is the point: they are read from the function's
// environment and never leave the server.
//
// ── BEFORE THE FIRST REAL CALL, CONFIRM THESE THREE AGAINST THE SANDBOX ─────
//
// The booking flow is documented publicly, but three details are not stated
// unambiguously in the developer pages, and each is a one-line change once the
// sandbox answers. They are named here rather than discovered one at a time:
//
//   1. STOP GEOMETRY. v3 is documented with `stops[].coordinates: { lat, lng }`,
//      with the numbers as STRINGS. If the sandbox answers ERR_INVALID_STOPS or
//      ignores the point, the older spelling is `location`.
//   2. THE LANGUAGE TAG. `en_MY` is used here; some accounts expect `en_SG`-style
//      tags per market.
//   3. WHETHER `distance` COMES BACK AS A VALUE WITH A UNIT (the client reads both
//      shapes, so this one is cosmetic).
//
// Sender and recipient phone formats are the fourth, and they only matter at booking
// time — a quotation is priced from the two points alone, so Phase 1 never sends a
// phone number.

import { signRequest } from "../sign.mjs";

export const LALAMOVE_KEY = "lalamove";

// Its name for anything a person reads. The dispatcher used to write "Lalamove" into
// a refusal sentence by hand, which is the same fault the Settings card carried on the
// app's side of the seam: a message naming the courier that does not come from the
// courier. A second provider adding its own file should never have to find and edit
// the dispatcher's sentences.
export const LALAMOVE_LABEL = "Lalamove";

// Sandbox and production are separate hosts with separate, environment-prefixed
// keys (pk_test_ / sk_test_ against pk_prod_ / sk_prod_). Which one is in use is a
// SECRET, not a build — so the same app can be pointed at the sandbox for a trial
// run and at production for a real one without a release.
const HOSTS: Record<string, string> = {
  sandbox: "https://rest.sandbox.lalamove.com",
  production: "https://rest.lalamove.com",
};

export function hostFor(env: unknown): string {
  return HOSTS[String(env || "").trim().toLowerCase()] || HOSTS.sandbox;
}

export type LlmConfig = { key: string; secret: string; market: string; host: string };

// The errors worth their own sentence, because the API's own words for them are
// codes. Anything not on this list is passed through in the API's own wording
// underneath a plain first line, so an unanticipated failure is still readable.
const PLAIN_ERRORS: Record<string, string> = {
  ERR_REVERSE_GEOCODE_FAILURE: "Lalamove could not place one of these addresses — put the pin on the map instead of typing it.",
  ERR_INVALID_SERVICE_TYPE: "Lalamove does not run that vehicle in this market.",
  ERR_QUOTATION_EXPIRED: "That price is more than five minutes old — ask for a fresh one.",
  ERR_QUOTATION_NOT_FOUND: "That price is no longer on Lalamove's side — ask for a fresh one.",
  ERR_INSUFFICIENT_CREDIT: "There is not enough money in the Lalamove wallet for this trip.",
  ERR_INSUFFICIENT_BALANCE: "There is not enough money in the Lalamove wallet for this trip.",
  ERR_OUT_OF_SERVICE_AREA: "Lalamove does not cover one of these addresses.",
  ERR_INVALID_PHONE_NUMBER: "Lalamove would not accept a phone number on this trip — check the customer's number.",
  ERR_CANCELLATION_FORBIDDEN: "Lalamove will not let this trip be cancelled any more.",
  ERR_INVALID_STOPS: "Lalamove would not accept one of the stops on this trip.",
  ERR_TOO_MANY_STOPS: "Lalamove will not carry this many drops on one trip.",
  ERR_INVALID_SCHEDULE_TIME: "Lalamove would not accept that pickup time — it must be at least two hours from now, and no more than thirty days ahead.",
};

// The API answers a failure as { message, errors: [{ id, code, message }] } with a
// non-2xx status. Both the code and the id are read, because the two have carried
// the code in different releases.
export function plainReason(data: unknown, status: number): string {
  const body = (data && typeof data === "object") ? data as Record<string, unknown> : {};
  const errors = Array.isArray(body.errors) ? body.errors as Array<Record<string, unknown>> : [];
  for (const e of errors) {
    const code = String((e && (e.code || e.id)) || "").trim();
    if (code && PLAIN_ERRORS[code]) return PLAIN_ERRORS[code];
  }
  const first = errors.length ? String(errors[0].message || "").trim() : "";
  const message = String(body.message || "").trim();
  const detail = first || message;
  if (status === 401 || status === 403) {
    return "Lalamove refused the key — check the api key and secret in the function's secrets, and whether they are the sandbox pair or the live pair.";
  }
  return detail
    ? `Lalamove would not do that: ${detail}`
    : `Lalamove answered with an error (HTTP ${status}).`;
}

// One signed call. `query` is sent in the URL but deliberately NOT signed — the
// signature covers the path alone, which is what Lalamove verifies.
export async function llmRequest(
  cfg: LlmConfig,
  { method, path, body = null, query = "" }: { method: string; path: string; body?: unknown; query?: string },
): Promise<{ ok: boolean; status: number; data: unknown; reason: string }> {
  const raw = body == null ? "" : JSON.stringify(body);
  const { authorization } = await signRequest({
    key: cfg.key,
    secret: cfg.secret,
    method,
    path,
    body: raw,
  });
  const url = `${cfg.host}${path}${query ? `?${query}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        // The market is a header, not part of the path: MY. Without it Lalamove does
        // not know which country's fleet to price.
        Market: cfg.market,
        // A nonce per request, so a retried call is not mistaken for a duplicate.
        "Request-ID": crypto.randomUUID(),
        "Content-Type": "application/json",
      },
      body: method.toUpperCase() === "GET" ? undefined : raw,
    });
  } catch (err) {
    return { ok: false, status: 0, data: null, reason: `Could not reach Lalamove — ${(err as Error)?.message || "the request failed"}` };
  }
  let data: unknown = null;
  const text = await res.text().catch(() => "");
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    return { ok: false, status: res.status, data, reason: plainReason(data, res.status) };
  }
  return { ok: true, status: res.status, data, reason: "" };
}

// Every vehicle key Lalamove will quote in this market, read from its own city list
// so the app never carries a hard-coded fleet that goes stale. The response is
// { data: [ { locode, services: [ { key, name } ] } ] }.
export function servicesIn(data: unknown): Array<{ key: string; name: string }> {
  const body = (data && typeof data === "object") ? data as Record<string, unknown> : {};
  const cities = Array.isArray(body.data)
    ? body.data as Array<Record<string, unknown>>
    : (Array.isArray(data) ? data as Array<Record<string, unknown>> : []);
  const seen = new Map<string, { key: string; name: string }>();
  for (const city of cities) {
    const services = Array.isArray(city && city.services) ? city.services as Array<Record<string, unknown>> : [];
    for (const s of services) {
      const key = String((s && s.key) || "").trim();
      if (!key || seen.has(key)) continue;
      seen.set(key, { key, name: String((s && s.name) || "").trim() });
    }
  }
  return [...seen.values()];
}

export async function cities(cfg: LlmConfig) {
  return await llmRequest(cfg, { method: "GET", path: "/v3/cities" });
}

type Stop = { lat: number; lng: number; address?: string };

// Turn the app's points into Lalamove's stops. Coordinates are sent as strings —
// that is how v3 documents them, and a number where a string is expected is the
// kind of mismatch that comes back as a stop Lalamove cannot place.
export function stopsPayload(points: Stop[]): Array<Record<string, unknown>> {
  return points.map((p) => ({
    coordinates: { lat: String(p.lat), lng: String(p.lng) },
    address: String((p && p.address) || "").trim(),
  }));
}

export async function quotation(
  cfg: LlmConfig,
  { serviceType, points, scheduleAt = "" }: { serviceType: string; points: Stop[]; scheduleAt?: string },
) {
  const body: Record<string, unknown> = {
    serviceType,
    language: "en_MY",
    stops: stopsPayload(points),
  };
  // Omitted entirely when there is no time: an empty string is not "now" to this
  // API, it is a malformed schedule.
  const when = String(scheduleAt || "").trim();
  if (when) body.scheduleAt = when;
  return await llmRequest(cfg, { method: "POST", path: "/v3/quotations", body });
}
