// store/lookup.js — asking the bakery's own server where a typed address is (v202).
//
// The only new file in the shop with a `fetch` in it, and it is its own file for that
// reason: store/app.js is the page's wiring and this is the network, and the two are
// easier to read apart. The RULES are not here — what is worth asking and how to read
// the answer are in store/geo.js, which is pure and has no network in it at all.
//
// WHERE THE QUESTION GOES, AND WHY THERE. To her own Supabase function
// (supabase/functions/shop-geocode), which asks Photon and then Nominatim with the
// bakery's name on the request. A phone asking a public geocoder directly would carry
// the customer's home address out under the customer's own address on the network, with
// nothing saying who was asking — which is exactly what that function's own geocode.ts
// refuses to do. That was her decision, in her words: "Through your own Supabase."
//
// THREE THINGS ARE WORTH MORE THAN THE REQUEST ITSELF:
//
//   • NOTHING IS ASKED WHILE SOMEBODY IS STILL TYPING. A lookup goes out only after a
//     pause with no keystrokes. Nominatim's usage policy is against autocomplete, and a
//     keystroke stream is what that means; a pause, a whole address and one ask is not.
//     It is also cheaper for her, and it is what makes the list settle instead of
//     flickering under somebody's thumb.
//   • THE SAME QUESTION IS NEVER ASKED TWICE. Somebody deleting a letter and typing it
//     again has asked the same thing again, and the answer is already here.
//   • AN ANSWER THAT ARRIVED TOO LATE IS THROWN AWAY. The customer may have typed past
//     it, or emptied the box, or placed the order — and a stale list appearing under a
//     box that has since been cleared is worse than no list at all. So every ask carries
//     the number of the generation it belongs to, and only the newest one is allowed to
//     speak.

import { CONFIG } from "./config.js";
import { lookupQuery, readPlaces, lookupWhy } from "./geo.js";

// How long the customer has to stop typing before anything is sent. Long enough that a
// word is finished, short enough that the list feels like it is keeping up.
const WAIT_MS = 700;

// How long the shop waits for an answer before giving up on it. The function allows
// itself two asks of five seconds each, so this is that plus room for the round trip —
// a patience shorter than the work would report a failure that was still coming.
const CALL_MS = 12000;

// The path on her Supabase. The function is called with the same anon key the shop uses
// for everything else — it is public by design, and this function holds no secret that
// could be reached with it.
const PATH = "/functions/v1/shop-geocode";

// `onState` is called with `{ key, hits }` on every change, where `key` is a DICTIONARY
// KEY (store-lang.js) or null for "say nothing at all". It is a key rather than a
// sentence because a sentence chosen here could not be translated if the customer
// switched language while the list was on screen.
//
// `fetchFn` is an argument so the whole thing is driven under Node; it defaults to the
// page's own fetch, read at the moment of the call rather than captured here.
export function createLookup({ fetchFn = null, waitMs = WAIT_MS, callMs = CALL_MS, onState = () => {} } = {}) {
  const send = fetchFn || ((...args) => globalThis.fetch(...args));

  // The generation counter. It is bumped by anything that discards what is in the air,
  // and an ask is only allowed to answer if its own generation is still the current one.
  let gen = 0;
  let timer = null;      // the pending pause
  let live = null;       // the abort controller of the ask in the air, or null
  let answered = null;   // { q, key, hits } — the last question and what came back

  const say = (key, hits) => onState({ key, hits: hits || [] });

  function cancel() {
    gen += 1;
    if (timer) { clearTimeout(timer); timer = null; }
    if (live) { live.abort(); live = null; }
  }

  // Forget everything and go quiet: the box was emptied, or the order was placed and a
  // stranger is about to use the phone (store/app.js, resetPin).
  function clear() {
    cancel();
    answered = null;
    say(null);
  }

  // The customer typed something. This is called on every keystroke and must be cheap:
  // it cancels whatever was pending and decides whether anything is worth scheduling.
  function typed(text) {
    const q = lookupQuery(text);
    cancel();
    if (!q) {
      // Still part-way through a word. The list goes away and nothing is said — which
      // is the one silence that is not a dead control, because they are mid-keystroke.
      answered = null;
      say(null);
      return;
    }
    // Asked and answered already: show it again without spending another lookup.
    if (answered && answered.q === q) {
      say(answered.key, answered.hits);
      return;
    }
    const mine = gen;
    timer = setTimeout(() => { timer = null; run(q, mine); }, waitMs);
  }

  function settle(q, key, hits) {
    answered = { q, key, hits };
    say(key, hits);
  }

  async function run(q, mine) {
    // Everything between here and the settle below is allowed to be overtaken.
    if (mine !== gen) return;

    const sb = CONFIG.supabase || {};
    const base = sb.url ? String(sb.url).replace(/\/+$/, "") : "";
    // Nowhere to ask, or no way to ask. Not an error anybody can act on, and the same
    // sentence the customer would read if the service were down.
    if (!base || !sb.anonKey) { settle(q, "addrFailed", []); return; }

    say("addrLooking");
    const ctl = new AbortController();
    live = ctl;
    const kill = setTimeout(() => ctl.abort(), callMs);

    let key = "addrFailed";
    let hits = [];
    try {
      // NO `apikey` HEADER HERE, and this is load-bearing rather than tidiness. An
      // Edge Function's CORS policy lists the request headers it will accept, and
      // shop-geocode's lists "Authorization, Content-Type" — the same two the admin's
      // own two callers send (admin/js/couriers/api.js, devmail.js). Adding a header the
      // list omits makes the browser's PREFLIGHT fail, which arrives as a bare
      // "TypeError: Failed to fetch" and reads to the customer as the lookup being down.
      // The anon key is carried in Authorization, which is a valid JWT and satisfies the
      // gateway on its own, so `apikey` bought nothing and cost the whole feature.
      // test/store-lookup.test.js holds this against the function's own header list.
      const res = await send(`${base}${PATH}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sb.anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: q }),
        signal: ctl.signal,
      });
      // A function that has not been deployed yet answers 404, and that is a failure
      // rather than a miss — the customer is told the lookup is unavailable, not that
      // their house does not exist.
      const data = res && res.ok ? await res.json().catch(() => null) : null;
      hits = readPlaces(data);
      key = hits.length ? "addrPick"
        : (data && data.ok === false ? lookupWhy(data.why) : "addrFailed");
    } catch {
      // Offline, aborted, or an answer that was not JSON. All the same to the customer.
      key = "addrFailed";
      hits = [];
    } finally {
      clearTimeout(kill);
    }

    if (mine !== gen) return;   // overtaken while this was in the air — say nothing
    live = null;
    settle(q, key, hits);
  }

  return { typed, clear };
}
