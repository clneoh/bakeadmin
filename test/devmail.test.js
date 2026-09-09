// test/devmail.test.js — building the wish-list email that reaches the
// developer (pure buildWishMail), plus the developer contact readers. The send
// path (fetch) is covered by the edge function; here the message is what's
// verified: full list, newest first, engine version, project URL and a real
// date/time.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ENGINE_VERSION } from "../admin/js/version.js";
import {
  buildWishMail, developerEmails, developerName, PROJECT_URL,
} from "../admin/js/devmail.js";

// A state with a developer set and a wish list typed oldest → newest (as on
// More). Emails deliberately include a blank to prove they are cleaned.
const withWishes = (labels) => ({
  settings: {
    developer: { name: "  Dev Studio  ", emails: ["dev@example.com", "", "two@example.com"] },
    wishList: labels.map((label, i) => ({ id: `w_${i}`, label, done: false })),
  },
});

test("developerEmails trims, drops blanks and returns [] when unset", () => {
  assert.deepEqual(developerEmails(withWishes([])), ["dev@example.com", "two@example.com"]);
  assert.equal(developerName(withWishes([])), "Dev Studio");
  assert.deepEqual(developerEmails({ settings: {} }), []);
  assert.equal(developerName({ settings: {} }), "");
});

test("buildWishMail lists the WHOLE wish list, newest first, with the context", () => {
  const state = withWishes(["Reviews carousel", "A 中文 shop", "Hantar tempahan in BM"]);
  state.settings.wishList[1].done = true; // the middle wish is ticked
  const now = new Date(2026, 8, 9, 10, 15); // local: 2026-09-09 10:15
  const { subject, body } = buildWishMail(state, now);

  assert.equal(subject, `Wish list · Engine v${ENGINE_VERSION} · 2026-09-09`);
  assert.ok(body.includes(`Engine v${ENGINE_VERSION}`), "body names the engine");
  assert.ok(body.includes(PROJECT_URL), "body names the live project");
  assert.ok(body.includes("Sent: 2026-09-09 10:15"), "body carries the date/time");
  assert.ok(body.includes("Full wish list:"), "body announces the whole list");

  // Every wish is present with its [✓]/[ ] tick — not just the newest one.
  assert.ok(body.includes("[ ] Reviews carousel"));
  assert.ok(body.includes("[✓] A 中文 shop"));
  assert.ok(body.includes("[ ] Hantar tempahan in BM"));

  // Newest wish first — the one that prompted the email sits on top.
  const newest = body.indexOf("Hantar tempahan in BM");
  const oldest = body.indexOf("Reviews carousel");
  assert.ok(newest >= 0 && oldest >= 0 && newest < oldest, "newest wish is listed before older ones");
});

test("buildWishMail handles an empty list honestly", () => {
  const { subject, body } = buildWishMail(withWishes([]), new Date(2026, 8, 9, 10, 15));
  assert.ok(body.includes("(empty)"), "an empty list still sends context, saying so");
  assert.equal(subject, `Wish list · Engine v${ENGINE_VERSION} · 2026-09-09`);
});
