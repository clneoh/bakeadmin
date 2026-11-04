// test/crawl-files.test.js — the three files that tell a crawler what this site is (v684).
//
// ⚠️⚠️ HER INTENTION, IN HER WORDS: __"actually my intention that time is to make the apps more seo"__ and
// then __"or AI search optimisation"__. ⭐ These are the files a search engine and an AI assistant read before
// they read a single line of the page — and ⚠️ **none of them is visible on the site, so nothing else here can
// notice if one goes wrong.** A sitemap naming a page that does not exist, or a robots line pointing at a file
// that was renamed, fails silently and for months.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const ROBOTS = read("../robots.txt");
const SITEMAP = read("../sitemap.xml");
const LLMS = read("../llms.txt");
const HOME = read("../index.html");

test("★★ the sitemap lists the two pages a customer should find, and nothing else (v684)", () => {
  const locs = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [
    "https://jienluv2bake.com.my/",
    "https://jienluv2bake.com.my/store/",
  ], "★ the sitemap is not the two customer pages");
  // ⚠️⚠️ AND IT IS NOT A LIST OF WHAT EXISTS. This repo publishes every tracked file, so a sitemap built from
  // the filesystem would invite a crawler into /test/ and /admin/ — ⭐ the exact opposite of what robots.txt
  // is there to do.
  for (const loc of locs) {
    assert.equal(/\/test\/|\/admin\//.test(loc), false, `★ the sitemap invites a crawler to ${loc}`);
  }
});

test("★ every <loc> is an absolute https URL on her own domain (v684)", () => {
  for (const m of SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    assert.match(m[1], /^https:\/\/jienluv2bake\.com\.my\//,
      `★ a sitemap entry must be the real address a crawler can fetch: ${m[1]}`);
  }
});

test("★★ robots.txt points at the sitemap, and still keeps her working papers out (v684)", () => {
  assert.match(ROBOTS, /^Sitemap:\s*https:\/\/jienluv2bake\.com\.my\/sitemap\.xml\s*$/m,
    "★ nothing tells a crawler where the sitemap is, so it is never read");
  // ⚠️ THE LINE THAT MUST NOT BE LOST IN AN EDIT — /test/ holds 155 working files.
  assert.match(ROBOTS, /^Disallow:\s*\/test\/\s*$/m, "★ the working papers are no longer kept out");
  // ⚠️ AND /admin/ MUST STAY UNBLOCKED: it carries noindex in its own head, and a crawler refused the page can
  // never read that tag.
  assert.equal(/^Disallow:\s*\/admin\//m.test(ROBOTS), false,
    "★ blocking /admin/ here stops the crawler reaching the noindex tag the app relies on");
});

test("★★ llms.txt states the facts the site states, and invents nothing (v684)", () => {
  // ⚠️ EVERY LINE BELOW IS READ OFF THE SITE ITSELF. ⭐ A summary file that promises a bread she has not launched,
  // or a price she does not charge, is the same fault as a wrong price on a label.
  assert.match(LLMS, /RM16/, "the price must match the shop and the homepage");
  assert.match(LLMS, /Sungai Ara/, "the collection place");
  assert.match(LLMS, /60169601268/, "the WhatsApp number as the site prints it");
  assert.match(LLMS, /jienluv2bake\.com\.my\/store\//, "where a customer actually orders");
  assert.match(LLMS, /coming soon/i,
    "★ the four bakes she is not selling yet must be named as unavailable, or an assistant will offer them");
  // ⚠️ AND IT SAYS WHAT IT IS. ⭐ llms.txt is a proposal, not a standard — a file that implies otherwise is
  // claiming an authority it does not have.
  assert.match(LLMS, /proposed convention|not a standard/i,
    "★ the file does not say plainly that the convention is not yet standard");
});

test("★ the homepage's own price and the summary file cannot drift apart (v684)", () => {
  const homePrices = [...HOME.matchAll(/data-price="focaccia">RM(\d+)/g)].map((m) => m[1]);
  assert.ok(homePrices.length, "the homepage no longer prints the focaccia's price");
  assert.equal(new Set(homePrices).size, 1, "the homepage prints two different focaccia prices");
  assert.ok(LLMS.includes(`RM${homePrices[0]}`),
    `★ llms.txt says a different price from the homepage (${homePrices[0]})`);
});

test("the crawl files are the files that exist (v684)", () => {
  for (const f of ["../sitemap.xml", "../llms.txt", "../robots.txt"]) {
    assert.ok(existsSync(new URL(f, import.meta.url)), `${f} is missing from the site`);
  }
});
