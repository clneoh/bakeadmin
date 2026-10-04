// test/store-offer-strip.test.js — the shop's standing offer strip must not change height
// while its offers turn.
//
// THE FAULT THIS FILE GUARDS (v292, fixed v295). v292 wrote each running offer into ONE
// pair of lines as the turn came round, so the strip was exactly as tall as the message it
// happened to be showing. Two codes where only one carries a sentence of her own are two
// different heights — so every turn made the whole page below the strip jump. Her words:
//
//   "when the message switch, the page is like jumping up and down repeatedly…
//    The window should be fix, base on the tallest message."
//
// THE FIX IS TWO DECLARATIONS, and they are the whole of it: every offer is a slide, and
// every slide is placed in the SAME grid cell. A grid row is as tall as its tallest item,
// so the strip is permanently as tall as the TALLEST message — worked out by the browser,
// at whatever font, language and text size the customer actually has, with no measurement
// of ours that can go stale.
//
// A layout fault needs a browser to see, so this file holds the MECHANISM in place and
// `marketing/harness-v295.html` measures the actual height across a run of turns. Neither
// is sufficient alone: the CSS could be right and the script still redraw into one line,
// which is precisely what v292 did.
//
// Run with: node --test test/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const url = (p) => new URL(`../${p}`, import.meta.url);
const css = readFileSync(url("store/app.css"), "utf8");
const html = readFileSync(url("store/index.html"), "utf8");
const app = readFileSync(url("store/app.js"), "utf8");

test("every offer shares one grid cell, so the strip cannot change height", () => {
  const rotor = css.match(/\.promo-rotor\s*\{[^}]*\}/);
  assert.ok(rotor, "app.css has no .promo-rotor rule");
  assert.match(rotor[0], /display:\s*grid/,
    "the rotor must be a grid — without it the slides stack in normal flow and the strip grows to hold all of them");

  const slide = css.match(/\.promo-slide\s*\{[^}]*\}/);
  assert.ok(slide, "app.css has no .promo-slide rule");
  assert.match(slide[0], /grid-area:\s*1\s*\/\s*1/,
    "every slide must land in the SAME cell — that is the one thing making the tallest message decide the height");
  assert.match(slide[0], /transition:\s*opacity/,
    "the cross-fade is a CSS transition on the slide; without it the offers cut rather than turn");
});

test("only the lit slide can be tapped", () => {
  // The unlit slides are stacked behind the lit one and cover the same box, so an
  // unlit slide left interactive would swallow a press meant for the strip.
  const slide = css.match(/\.promo-slide\s*\{[^}]*\}/)[0];
  assert.match(slide, /pointer-events:\s*none/);
  const lit = css.match(/\.promo-slide\.is-on\s*\{[^}]*\}/);
  assert.ok(lit, "the lit slide has no rule of its own");
  assert.match(lit[0], /pointer-events:\s*auto/);
});

test("the strip ships empty, so a static copy of an offer cannot defeat the stacking", () => {
  const block = html.match(/<div id="promo-rotor"[^>]*>[\s\S]*?<\/div>/);
  assert.ok(block, "index.html has no #promo-rotor element");
  assert.doesNotMatch(block[0], /<p\b/,
    "the rotor must start empty — a line written into the markup would be a second copy of an offer the script is about to draw");
});

test("nothing draws an offer into a single shared line any more", () => {
  // The v292 mechanism, named so a future edit cannot quietly bring it back. If the script
  // writes text into one element per line again, the height is once more whatever that
  // message happens to be — and the CSS above cannot save it.
  assert.doesNotMatch(app, /promoOffer\.textContent\s*=/,
    "the offer must be drawn once per slide, at build time — not rewritten into one line as the turn comes round");
  assert.doesNotMatch(app, /promoWords\.textContent\s*=/,
    "same for her own sentence");
  assert.doesNotMatch(app, /is-fading/,
    "the old JS-driven fade is gone: the cross-fade is the CSS transition on .promo-slide now");
});

test("the script rotates by lighting a slide, and the timer is her 1.5 seconds", () => {
  assert.match(app, /const TURN_MS = 1500;/,
    "she asked for a flip every 1.5 seconds");
  assert.match(app, /showSlide\(standingNext\(/,
    "the timer must move which slide is lit, and nothing else");
});
