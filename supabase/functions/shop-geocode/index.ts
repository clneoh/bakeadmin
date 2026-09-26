// supabase/functions/shop-geocode/index.ts — the shop page's address lookup.
//
// WHY THIS IS ITS OWN FUNCTION AND NOT AN ACTION ON `courier`. The courier function
// holds the baker's Lalamove key and secret, and it refuses every request that does not
// carry a real owner session (courier/index.ts, the 401 branch). This function is
// called by customers, who are nobody's signed-in user, so it cannot have that gate —
// and the answer is not to widen the courier function's door, it is to build a second
// door with nothing behind it. There is no secret in this file, nothing here reads one,
// and the only thing it can reach is two public geocoders that need no key at all. A
// fault in this function can cost a lookup; it cannot cost the baker her wallet.
//
// THE CONTRACT:
//
//   POST { address: "..." }
//     → 200 { ok: true,  places: [{ lat, lng, label }, …] }   found, up to five
//     → 200 { ok: false, why: "empty"|"notfound"|"refused"|"timeout"|"unreachable" }
//
// Every failure is a 200 with a CODE, never prose: the reader is a customer who may be
// reading the page in 中文 or Bahasa Malaysia, so the sentence is chosen on their own
// phone (store-lang.js) and never here. A sentence chosen on the server is a sentence
// nobody can translate.
//
// ONE-TIME SETUP (her side, ~1 min, in a terminal, never in chat and never in a file
// that ships):
//
//   supabase functions deploy shop-geocode --project-ref hzpyblqygnntixkijeem
//
//   The --project-ref is not optional in practice, for the same reason the courier
//   function records: without it the CLI asks "Select a project" and this repo's
//   project list also carries a second, unrelated project, so a stray Enter can aim
//   the deploy at the wrong one.
//
//   There are NO secrets to set. That is the point of this function.
//
// The shop calls it at ${SUPABASE_URL}/functions/v1/shop-geocode with the anon key, the
// same key the shop already uses for everything else (store/config.js).

import { lookupAddress } from "./geocode.ts";
import { allowHit, type Hits } from "./limit.ts";

// The shop is served from jienluv2bake.com.my, a different origin than supabase.co, so
// the browser sends a preflight first and checks every response for these headers.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

// The live count of asks per caller, for as long as this instance happens to live.
// There is no database behind it and nothing is written down: Edge Functions are
// stateless between instances, so this is a fence against a script rather than an
// account of anybody's use. See limit.ts for why the cap is as loose as it is.
const hits: Hits = new Map();

// A typed address is a street and an area. Anything longer is not a longer address, it
// is a caller seeing what happens — and it becomes a URL on the way out, so it is cut
// to a size that is still an address before it goes anywhere. A real lookup is far
// under this and never notices.
const MAX_ADDRESS = 200;

// The caller's address, as the edge runtime saw it. x-forwarded-for is a chain when
// anything proxies in front, and the first entry is the one that arrived at the edge.
function callerOf(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  let payload: Record<string, unknown> | null = null;
  try { payload = await req.json(); } catch { payload = null; }
  const args = ((payload && payload.payload) || payload || {}) as Record<string, unknown>;
  const address = String(args.address || "").trim().slice(0, MAX_ADDRESS);

  // Nothing was asked, so nothing was spent and nothing is counted. This costs no
  // upstream request, which is the thing the cap exists to protect.
  if (!address) return json({ ok: false, why: "empty" });

  if (!allowHit(hits, callerOf(req), Date.now())) {
    // The same answer as a service that would not answer, because it is the same
    // thing to the customer: no lookup just now, so use the map. Deliberately not a
    // 429 — the shop reads one shape of reply and says one sentence either way.
    console.error("[shop-geocode] rate limited a caller");
    return json({ ok: false, why: "refused" });
  }

  const out = await lookupAddress(address);
  return json(out);
});
