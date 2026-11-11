// test/store2-drift.test.js — the SECOND gateway must not drift from the shop where money is decided.
//
// ⭐ BROUGHT BACK FOR v686_2 (the "more versatile" trial) — it guarded the first trial (v631_2) and went with it.
//
// ⚠️ WHY THIS EXISTS. `/store2/` is a copy of `/store/` so the live shop can stay untouched while the second
// gateway is tried. A copy is always one edit away from a different answer about money, and the shop's own
// suite only ever runs against `/store/app.js`. ⭐ So the functions that price a basket, judge a promo code,
// build the WhatsApp message and mark what is missing are compared BETWEEN the two files: identical text or
// the suite fails. ⚠️ That is a guard against silent drift, not a substitute for the shop's own tests.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const STORE = read("store/app.js");
const TRIAL = read("store2/app.js");

// The body of a `function name(` by brace matching. ⚠️ Braces inside strings and comments are not
// understood — which is safe HERE, because the same extractor runs on both files and any mistake moves both
// sides together. It is enough to answer "is this function still the same function?".
function extract(src, name) {
  const at = src.indexOf(`function ${name}(`);
  if (at < 0) return null;
  let depth = 0;
  let seen = false;
  for (let k = src.indexOf("{", at); k < src.length; k += 1) {
    const ch = src[k];
    if (ch === "{") { depth += 1; seen = true; }
    else if (ch === "}") { depth -= 1; if (seen && depth === 0) return src.slice(at, k + 1); }
  }
  return null;
}

const GUARDED = ["cartTotal", "judge", "judgeCtx", "paintPromo", "waUrl", "pageContext", "markField", "sayStepFirst"];

test("★★★ the money, the promo judge and the message are the SAME code in both gateways (v631_2)", () => {
  for (const name of GUARDED) {
    const shop = extract(STORE, name);
    const trial = extract(TRIAL, name);
    assert.ok(shop, `★ ${name} is gone from the live shop — this guard needs to name the new one`);
    assert.ok(trial, `★ ${name} is missing from the second gateway: the two shops would price or refuse differently`);
    assert.equal(trial, shop, `★ ${name} has drifted between /store/ and /store2/ — one of them is now wrong`);
  }
});

test("★★ the trial gateway is a copy of the shop, not a rewrite (v631_2)", () => {
  // The two files must still be recognisably one shop: the trial may add, it may not lose a whole section.
  const lines = (s) => s.split("\n").length;
  assert.ok(lines(TRIAL) > lines(STORE) * 0.98,
    `★ the trial is much smaller than the shop (${lines(TRIAL)} vs ${lines(STORE)} lines) — a section went missing in the copy`);
  // And every import the shop relies on is still imported there.
  const imports = (s) => [...s.matchAll(/^import .*$/gm)].map((m) => m[0]);
  const shopImports = imports(STORE);
  const trialImports = imports(TRIAL);
  for (const line of shopImports) {
    assert.ok(trialImports.includes(line), `★ the trial does not import ${line} any more`);
  }
});

test("★★★ every other module of the shop is byte-for-byte the same file in the trial (v686_2)", () => {
  // ⭐ The trial changes the LOOK: the card in app.js, the page's wrappers and the stylesheet. ⚠️ The calendar,
  // the pools, the address lookup, the config and the rest decide what a customer can order and what it costs,
  // so they must be the shop's own files — a change made to one copy only would be a second, quieter shop.
  const dir = (p) => new URL(`../${p}/`, import.meta.url);
  const mods = readdirSync(dir("store")).filter((f) => f.endsWith(".js") && f !== "app.js");
  assert.ok(mods.length >= 10, `★ expected the shop's modules, found ${mods.length}`);
  for (const f of mods) {
    assert.equal(read(`store2/${f}`), read(`store/${f}`), `★ store2/${f} has drifted from store/${f}`);
  }
});

test("★★ the trial stays out of search while it shares the shop's place (v686_2)", () => {
  const page = read("store2/index.html");
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/,
    "★ /store2/ must carry noindex, nofollow — two pages selling one shop would compete in Google");
  assert.ok(!/<meta name="robots" content="index/.test(page), "★ the trial says index somewhere");
  assert.ok(!read("sitemap.xml").includes("/store2/"), "★ the trial must not be in the sitemap");
});
