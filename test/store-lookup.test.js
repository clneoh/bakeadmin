// test/store-lookup.test.js — typing an address and being brought to it (v202,
// 26 Sep 2026).
//
// Her request, verbatim: "When customer start keying in their address, can the map
// bring them their, where thay can easily pin without have to seach thru the map?
// Should work just like Grab app".
//
// This file is the SHOP half: what is worth asking (store/geo.js), how the asking is
// paced and how a late answer is thrown away (store/lookup.js). The map actually
// flying there is test/store-address.test.js, driven through the real page; the server
// that answers is test/shop-geocode.test.js.
//
// Pure — no DOM and no network of its own. `fetch` is passed IN to createLookup rather
// than read off the global, which is what lets every case here be a promise rather
// than a wait, and is the same rule store/geo.js keeps about navigator.geolocation:
// a stub that assumes the thing exists can never reach the case where it does not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LOOKUP_MIN, LOOKUP_MAX, MAX_HITS, lookupQuery, readPlaces, lookupWhy } from "../store/geo.js";
import { createLookup } from "../store/lookup.js";
import { CONFIG } from "../store/config.js";
import { STORE } from "../store-lang.js";
import { LANGS } from "../i18n.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A stubbed wire, shaped exactly like the real one: a Response has `ok` and `json()`.
// Returns the capture so a test can read what would have gone out, and a restore so no
// stub outlives its test.
function stubFetch(reply) {
  const real = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, opts = {}) => {
    sent.push({ url: String(url), method: (opts.method || "GET").toUpperCase(), headers: opts.headers || {}, body: opts.body });
    return typeof reply === "function" ? reply(url, opts) : reply;
  };
  return { sent, restore() { globalThis.fetch = real; } };
}

function jsonReply(obj, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => obj };
}

// The states a lookup announced, in order. Every one is `{ key, hits }` where `key` is a
// dictionary key or null.
function recorder() {
  const said = [];
  return { said, onState: (s) => said.push({ key: s.key, hits: s.hits }) };
}

// ── what is worth asking (store/geo.js) ────────────────────────────────────

test("nothing is asked until somebody has actually typed an address", () => {
  // "Pen" is a question with no useful answer, and every one of these costs one of the
  // handful of lookups a free service will take from the bakery in an hour.
  assert.equal(lookupQuery(""), null);
  assert.equal(lookupQuery(null), null);
  assert.equal(lookupQuery(undefined), null);
  assert.equal(lookupQuery("   "), null);
  assert.equal(lookupQuery("Jalan "), null);
  assert.equal(lookupQuery("1234567"), null, "seven characters is still part of a word");
  assert.equal(lookupQuery("12345678"), "12345678", "eight is the first worth asking");
  assert.equal(LOOKUP_MIN, 8, "and the boundary above is this file's own constant");
});

test("a pasted address is tidied, and a pasted MESSAGE is cut rather than refused", () => {
  // Whitespace is collapsed: a pasted address arrives with newlines and tabs in it, and
  // a geocoder asked for "12,\n Jalan" is asked a question nobody would type.
  assert.equal(lookupQuery("  12   Jalan  "), "12 Jalan");
  assert.equal(lookupQuery("12,\n Jalan\tBunga"), "12, Jalan Bunga");
  assert.equal(lookupQuery("  88,   Lorong  "), "88, Lorong");

  // The tail of a long paste is a telephone number, so the FRONT is the part worth
  // sending. It is cut and not refused: a box that silently does nothing when you paste
  // into it is the dead control this shop has a standing rule against.
  const long = "A".repeat(LOOKUP_MAX + 60);
  assert.equal(lookupQuery(long).length, LOOKUP_MAX);
  assert.equal(lookupQuery(long), "A".repeat(LOOKUP_MAX));
});

test("a reply is believed only as far as it can be checked", () => {
  // The safest possible read of something that arrived over a network. Everything here
  // has been seen from a real service or is a shape a broken one would send.
  assert.deepEqual(readPlaces(null), []);
  assert.deepEqual(readPlaces("ok"), []);
  assert.deepEqual(readPlaces({}), []);
  assert.deepEqual(readPlaces({ ok: false, why: "notfound" }), [],
    "a reply that says it failed found nothing, whatever else is in it");
  assert.deepEqual(readPlaces({ ok: true }), []);
  assert.deepEqual(readPlaces({ ok: true, places: "nope" }), []);
});

test("a row with no usable point is SKIPPED, so the row below it still gets read", () => {
  // The row below a broken one may be the customer's actual house, so stopping at the
  // first bad row would throw a good door away for nothing.
  const reply = {
    ok: true,
    places: [
      null,
      "the door",
      {},
      { lat: 91, lng: 100, label: "off the planet" },
      // The expensive one-line mistake this project guards everywhere: Number(null) is 0,
      // and 0,0 is a real point in the Gulf of Guinea.
      { lat: null, lng: null, label: "the equator" },
      { lat: 5.4141, lng: 100.3288, label: "  12 Jalan Bunga, Penang  " },
    ],
  };
  assert.deepEqual(readPlaces(reply), [
    { lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga, Penang" },
  ]);
});

test("a point spelled as a string is accepted, and comes back a NUMBER", () => {
  // What travels back is JSON and what the order carries is a number, so this is the
  // same tidy-and-convert validPin already does for every other pin.
  assert.deepEqual(readPlaces({ ok: true, places: [{ lat: "5.4141", lng: "100.3288", label: "x" }] }),
    [{ lat: 5.4141, lng: 100.3288, label: "x" }]);
});

test("the cap on how long a list a customer reads is the SHOP's, not the reply's", () => {
  // The function is asked for five too; this is the shop's own promise about how long a
  // list somebody has to read, kept here so a reply that ignored the cap cannot make the
  // page longer than the design accounts for. The survivors are the FIRST five.
  const places = [];
  for (let i = 0; i < 20; i++) places.push({ lat: 5.4 + i / 100, lng: 100.3, label: `door ${i}` });
  const out = readPlaces({ ok: true, places });
  assert.equal(out.length, MAX_HITS);
  assert.equal(MAX_HITS, 5);
  assert.equal(out[0].label, "door 0");
  assert.equal(out[4].label, "door 4");
});

test("a row with a point and no words is still a door, with an empty label", () => {
  // It is shown as its numbers rather than dropped — the row has to be tappable, and a
  // geocoder that found the point but sent no words still found the point.
  assert.deepEqual(readPlaces({ ok: true, places: [{ lat: 5.4141, lng: 100.3288 }] }),
    [{ lat: 5.4141, lng: 100.3288, label: "" }]);
  assert.deepEqual(readPlaces({ ok: true, places: [{ lat: 5.4141, lng: 100.3288, label: null }] }),
    [{ lat: 5.4141, lng: 100.3288, label: "" }]);
});

// ── why it found nothing, in words the customer can read ───────────────────

test("every code the function can send becomes a sentence, and a code it cannot also does", () => {
  // The function answers with a CODE and never a sentence, because a sentence chosen on
  // the server is a sentence nobody can translate. The choosing happens here, off the
  // shop's own dictionary — so this is the test that notices a new code arriving with
  // nothing to say it with.
  assert.equal(lookupWhy("empty"), "addrNone");
  assert.equal(lookupWhy("notfound"), "addrNone");
  assert.equal(lookupWhy("refused"), "addrFailed");
  assert.equal(lookupWhy("timeout"), "addrFailed");
  assert.equal(lookupWhy("unreachable"), "addrFailed");
  // Codes that do not exist yet. The customer still gets a sentence, and it is the one
  // that points at the map rather than the one that blames their address.
  assert.equal(lookupWhy("kaboom"), "addrFailed");
  assert.equal(lookupWhy(""), "addrFailed");
  assert.equal(lookupWhy(null), "addrFailed");
  assert.equal(lookupWhy(undefined), "addrFailed");
  assert.equal(lookupWhy({ why: "notfound" }), "addrFailed", "an object is not a code");
});

test("the function's own list of codes is covered — a new one cannot ship without words", () => {
  // Read out of the function rather than restated here, so the two cannot drift: adding a
  // member to `export type Why` in the function and not teaching the shop about it would
  // otherwise be a silent fall-through to a generic sentence.
  const src = readFileSync(new URL("../supabase/functions/shop-geocode/geocode.ts", import.meta.url), "utf8");
  const m = /export type Why = ([^;]+);/.exec(src);
  assert.ok(m, "the function still declares its codes in one place");
  const codes = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(codes.length >= 5, "the union still lists its members");
  for (const code of codes) {
    const key = lookupWhy(code);
    for (const l of LANGS) assert.equal(typeof STORE[l][key], "string", `${l} has no words for "${code}"`);
  }
});

test("the words the customer reads exist in all three languages", () => {
  // These four are built in JS rather than tagged on store/index.html, so nothing in
  // test/store-i18n.test.js would notice one going missing or half-translated.
  for (const key of ["addrLooking", "addrPick", "addrNone", "addrFailed"]) {
    for (const l of LANGS) assert.equal(typeof STORE[l][key], "string", `${l}.${key} is missing`);
  }
  // The two failures must not be the same sentence: one is about their address, the other
  // about the service. Collapsing them would tell a customer their house does not exist
  // when the bakery's server is simply down.
  for (const l of LANGS) {
    assert.notEqual(STORE[l].addrNone, STORE[l].addrFailed, `${l}: the two failures read alike`);
    assert.notEqual(STORE[l].addrNone, STORE[l].addrPick, `${l}: a miss reads like a list to choose from`);
  }
});

// ── the asking: paced, remembered, and never overtaken (store/lookup.js) ───

test("nothing leaves the phone while somebody is still typing", async () => {
  const wire = stubFetch(jsonReply({ ok: true, places: [] }));
  try {
    const rec = recorder();
    const lk = createLookup({ onState: rec.onState, waitMs: 40 });
    lk.typed("12 Jala");
    await sleep(80);
    assert.deepEqual(wire.sent, [], "part-way through a word, nothing was asked");
    assert.deepEqual(rec.said, [{ key: null, hits: [] }], "and the list said nothing at all");
  } finally { wire.restore(); }
});

test("the ask carries the address and the bakery's own key — nothing else", async () => {
  const wire = stubFetch(jsonReply({ ok: true, places: [] }));
  try {
    const rec = recorder();
    const lk = createLookup({ onState: rec.onState, waitMs: 1 });
    lk.typed("12 Jalan Bunga, Penang");
    await sleep(30);

    assert.equal(wire.sent.length, 1);
    const one = wire.sent[0];
    assert.equal(one.method, "POST");
    assert.match(one.url, /\/functions\/v1\/shop-geocode$/);
    assert.equal(one.url.startsWith(String(CONFIG.supabase.url).replace(/\/+$/, "")), true,
      "it goes to the bakery's own Supabase, which is the whole of her decision");
    assert.equal(one.headers.apikey, CONFIG.supabase.anonKey);
    assert.equal(one.headers.Authorization, `Bearer ${CONFIG.supabase.anonKey}`,
      "the anon key is sent as a bearer token, which is what the edge gateway checks");
    assert.deepEqual(JSON.parse(one.body), { address: "12 Jalan Bunga, Penang" },
      "a JOURNEY — the address — and not one of this shop's stored fields");
  } finally { wire.restore(); }
});

test("the list is drawn while the lookup is out, so the wait is not a dead control", async () => {
  let release;
  const wire = stubFetch(() => new Promise((r) => { release = () => r(jsonReply({ ok: false, why: "notfound" })); }));
  try {
    const rec = recorder();
    const lk = createLookup({ onState: rec.onState, waitMs: 1 });
    lk.typed("12 Jalan Bunga, Penang");
    await sleep(30);

    assert.deepEqual(rec.said.map((s) => s.key), ["addrLooking"],
      "something is said the moment the ask leaves, rather than leaving the box blank");
    release();
    await sleep(20);
    assert.equal(rec.said[rec.said.length - 1].key, "addrNone", "and then the answer replaces it");
  } finally { wire.restore(); }
});

test("the same question is never asked twice — the answer is already here", async () => {
  const wire = stubFetch(jsonReply({ ok: true, places: [{ lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" }] }));
  try {
    const rec = recorder();
    const lk = createLookup({ onState: rec.onState, waitMs: 1 });
    lk.typed("12 Jalan Bunga, Penang");
    await sleep(30);
    assert.equal(wire.sent.length, 1);

    // Re-typing the same thing — which is what adding and removing a trailing space
    // amounts to, and what re-focusing the box and touching a key does — is answered
    // from the answer already here rather than spending another lookup.
    lk.typed("  12 Jalan Bunga, Penang  ");
    await sleep(30);
    assert.equal(wire.sent.length, 1, "the same address cost exactly one lookup");
    assert.equal(rec.said[rec.said.length - 1].key, "addrPick");
    assert.equal(rec.said[rec.said.length - 1].hits.length, 1);

    // A genuinely different address IS a new question, so the memo above is not simply
    // "ask once and never again".
    lk.typed("88 Lorong Baru, Penang");
    await sleep(30);
    assert.equal(wire.sent.length, 2);
  } finally { wire.restore(); }
});

test("an answer that arrived too late is thrown away rather than shown", async () => {
  // The customer has typed past it. A stale list appearing under a box they have since
  // cleared is worse than no list at all, so every ask carries its generation and only
  // the newest one may speak.
  //
  // THE FIRST ASK HAS TO ACTUALLY COME BACK. It is tempting to write this with a first ask
  // that never settles, and that version proves nothing: a promise that never resolves
  // reaches the generation check neither. It looked like coverage until a fault sweep
  // removed the check and the test stayed green.
  let late = null;
  const wire = stubFetch(() => {
    if (!late) {
      return new Promise((r) => {
        late = () => r(jsonReply({ ok: true, places: [{ lat: 5.4, lng: 100.3, label: "first answer" }] }));
      });
    }
    return jsonReply({ ok: true, places: [{ lat: 5.5, lng: 100.4, label: "second answer" }] });
  });
  try {
    const rec = recorder();
    const lk = createLookup({ onState: rec.onState, waitMs: 1 });
    lk.typed("12 Jalan Bunga, Penang");
    await sleep(20);
    assert.equal(rec.said[rec.said.length - 1].key, "addrLooking");

    lk.typed("88 Lorong Baru, Penang");
    await sleep(30);
    assert.equal(rec.said[rec.said.length - 1].key, "addrPick");
    assert.equal(rec.said[rec.said.length - 1].hits[0].label, "second answer",
      "the newest question is the one that got to speak");

    // Now the abandoned ask finally answers, about an address the customer left behind.
    late();
    await sleep(40);
    assert.equal(rec.said[rec.said.length - 1].hits[0].label, "second answer",
      "the answer to the question they abandoned never gets to speak");
  } finally { wire.restore(); }
});

test("a lookup that never answers is given up on, and the customer is told", async () => {
  // A press that hangs forever is a press that reads as broken. CALL_MS is what bounds
  // it, and it is exercised here through the abort signal the fetch is actually handed.
  const wire = stubFetch((url, opts) => new Promise((_r, reject) => {
    opts.signal.addEventListener("abort", () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      reject(err);
    });
  }));
  try {
    const rec = recorder();
    const lk = createLookup({ onState: rec.onState, waitMs: 1, callMs: 30 });
    lk.typed("12 Jalan Bunga, Penang");
    await sleep(90);
    assert.equal(rec.said[rec.said.length - 1].key, "addrFailed");
  } finally { wire.restore(); }
});

test("a service that is down and an address that does not exist are DIFFERENT sentences", async () => {
  // A function that has not been deployed yet answers 404, and that is a failure rather
  // than a miss: the customer is told the lookup is unavailable, not that their house
  // does not exist.
  const notFound = stubFetch(jsonReply({ ok: false, why: "notfound" }));
  try {
    const rec = recorder();
    createLookup({ onState: rec.onState, waitMs: 1 }).typed("12 Jalan Bunga, Penang");
    await sleep(30);
    assert.equal(rec.said[rec.said.length - 1].key, "addrNone");
  } finally { notFound.restore(); }

  const missing = stubFetch({ ok: false, status: 404, json: async () => ({ message: "not found" }) });
  try {
    const rec = recorder();
    createLookup({ onState: rec.onState, waitMs: 1 }).typed("12 Jalan Bunga, Penang");
    await sleep(30);
    assert.equal(rec.said[rec.said.length - 1].key, "addrFailed",
      "a 404 is the function not existing, not the house not existing");
  } finally { missing.restore(); }

  // THE SAME RULE WHERE THE BODY WOULD OTHERWISE BE BELIEVED. A reply that arrived with
  // a failing status is a failing reply whatever it carries, so the address is not read
  // out of it. Stated as its own case because the body below is shaped exactly like a
  // successful answer: believing it would hand a customer a list of doors produced by a
  // service that had just refused the request.
  const lying = stubFetch({
    ok: false, status: 502,
    json: async () => ({ ok: true, places: [{ lat: 5.4141, lng: 100.3288, label: "12 Jalan Bunga" }] }),
  });
  try {
    const rec = recorder();
    createLookup({ onState: rec.onState, waitMs: 1 }).typed("12 Jalan Bunga, Penang");
    await sleep(30);
    assert.equal(rec.said[rec.said.length - 1].key, "addrFailed",
      "a reply with a failing status is not read, however much it looks like a good one");
    assert.deepEqual(rec.said[rec.said.length - 1].hits, [],
      "and nothing reached the list from it");
  } finally { lying.restore(); }

  const broken = stubFetch(() => { throw new Error("offline"); });
  try {
    const rec = recorder();
    createLookup({ onState: rec.onState, waitMs: 1 }).typed("12 Jalan Bunga, Penang");
    await sleep(30);
    assert.equal(rec.said[rec.said.length - 1].key, "addrFailed");
  } finally { broken.restore(); }
});

test("clearing the box forgets everything, and the next customer starts clean", () => {
  // A phone can be handed across a counter. resetPin() calls this when an order is
  // placed, so the next customer must not be shown the last one's house.
  const rec = recorder();
  const lk = createLookup({ onState: rec.onState, waitMs: 1 });
  lk.clear();
  assert.deepEqual(rec.said, [{ key: null, hits: [] }], "the list goes away and nothing is said");
});
