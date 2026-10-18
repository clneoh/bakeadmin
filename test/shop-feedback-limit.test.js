// test/shop-feedback-limit.test.js — how often one caller may send the shop a note (v565).
//
// ⚠️⚠️ WHY THIS EXISTS. The feedback endpoint is open to anyone by design, and **every accepted note sends
// up to five emails through Resend on her account** — the same mailbox her wish-list mail and her own
// replies use. ⚠️ A script could burn the monthly quota and flood the developer's inbox in a minute, and
// the honeypot only stops the naive bots.
//
// ⭐ The cap is deliberately loose: a real visitor writes at most one note a visit, and Malaysian carriers
// put many customers behind one address. Five in ten minutes costs an ordinary person nothing.

import { test } from "node:test";
import assert from "node:assert/strict";

const { overLimit, callerKey, sweep, MAX_PER_WINDOW, WINDOW_MS } =
  await import("../supabase/functions/shop-feedback/limit.ts");

test("★★★ one caller may send a handful of notes, and no more", () => {
  const hits = new Map();
  const t = 1_000_000;
  for (let i = 0; i < MAX_PER_WINDOW; i++) {
    assert.equal(overLimit(hits, "1.2.3.4", t), false, `note ${i + 1} of the cap was refused`);
  }
  assert.equal(overLimit(hits, "1.2.3.4", t), true,
    "★ the sixth note from one address went through — **a script can spend her whole Resend month**");
  // ⭐ And a different caller is untouched: carriers put many people behind one address, and a cap that
  // leaked across callers would refuse ordinary customers.
  assert.equal(overLimit(hits, "5.6.7.8", t), false, "★ one caller's spent notes refused another caller");
});

test("★★★ the window passes, and the caller is welcome again", () => {
  const hits = new Map();
  const t = 1_000_000;
  for (let i = 0; i <= MAX_PER_WINDOW; i++) overLimit(hits, "1.2.3.4", t);
  assert.equal(overLimit(hits, "1.2.3.4", t + WINDOW_MS + 1), false,
    "★ the cap never lifts — a customer who once sent a note is refused for ever");
});

test("★★★ the caller is the first address in x-forwarded-for, and a missing one is shared", () => {
  assert.equal(callerKey({ get: () => "203.0.113.9, 10.0.0.1" }), "203.0.113.9");
  assert.equal(callerKey({ get: () => "203.0.113.9" }), "203.0.113.9");
  assert.equal(callerKey({ get: () => "" }), "unknown",
    "★ a request with no address must still land in a bucket, or the cap is skipped for it");
  assert.equal(callerKey({ get: () => null }), "unknown");
});

test("★★★ the map does not grow for ever", () => {
  // ⚠️ A caller rotating its address would otherwise grow this map for as long as the instance lives.
  const hits = new Map();
  const t = 1_000_000;
  for (let i = 0; i < 6000; i++) overLimit(hits, `10.0.${i}`, t);
  assert.ok(hits.size <= 5000, `★ the limiter kept ${hits.size} addresses — **a slow leak by design**`);
  // And a closed window is dropped by the sweep.
  const old = new Map([["a", { n: 9, resetAt: t - 1 }], ["b", { n: 1, resetAt: t + 1000 }]]);
  for (let i = 0; i < 6000; i++) old.set(`k${i}`, { n: 1, resetAt: t + 1000 });
  sweep(old, t);
  assert.equal(old.has("a"), false, "a spent window was kept");
});
