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
  assert.match(slide[0], /transition:[^;]*transform/,
    "the move itself must be a transition on transform");
  assert.match(css.match(/\.promo-rotor\s*\{[^}]*\}/)[0], /overflow:\s*hidden/,
    "without clipping, the offers parked off the right-hand edge would be visible beside the strip");
});

test("the offers scroll UP, and each message is its own box", () => {
  // ★ v318, and her words are the spec: "Maybe you box up each message, when 1st message start
  // to scroll up, the 2nd message is following, So effectively you see 2 message, one follow by
  // another, it scroll up, stop 2sec, scroll again until mouse over."
  //
  // ⚠️ THREE MOTIONS HAVE COME AND GONE HERE, AND ALL THREE WERE OURS: a fade (v292), a 3D flip
  // (v296/v297), a sideways slide (v316) — each with CSS reasoning about what "reads as a
  // glitch". She is the one who looks at this every day. **Do not restore any of them.**
  const slide = css.match(/\.promo-slide\s*\{[^}]*\}/)[0];
  assert.match(slide, /transform:\s*translateY\(/,
    "a waiting message is parked BELOW the window — the motion is up, not sideways");
  assert.equal(/translateX|rotateX|perspective/.test(slide), false,
    "the sideways slide and the flip are both gone");

  const lit = css.match(/\.promo-slide\.is-on\s*\{[^}]*\}/);
  assert.ok(lit, "the lit slide has no rule of its own");
  assert.match(lit[0], /transform:\s*translateY\(0\)/, "the showing message sits in the window");

  // ⚠️ THE MESSAGE GOES UP AND OUT THE TOP. If it went back down the way it came, the two
  // panels would cross and read as a swap.
  const left = css.match(/\.promo-slide\.is-left\s*\{[^}]*\}/);
  assert.ok(left, "nothing sends the replaced message up — that rule IS the scroll");
  assert.match(left[0], /translateY\(calc\(-100%/, "the replaced message leaves through the TOP");
  assert.equal(left[0].includes("opacity"), false,
    "the leaving panel carries no opacity — a scroll shows both, that is what makes it a scroll");
  // ⚠️ AND IT OVERSHOOTS BY A GAP. That gap is what passes between the two panels and is the
  // whole of what makes it read as one message FOLLOWING another rather than one block sliding.
  assert.match(left[0], /-100%\s*-\s*\d/, "the leaving panel must clear the window by a gap");
  assert.match(slide, /100%\s*\+\s*\d/, "and the waiting one must wait a gap below it");

  // ⚠️ AND NEITHER PANEL FADES. Fading either puts a half-visible message on screen mid-move,
  // which is what the old cross-fades existed to prevent.
  assert.equal(/opacity\s*:/.test(slide), false, "the base panel must not fade");
  assert.equal(/opacity\s*:/.test(lit[0]), false, "nor must the lit one");

  // ★ EACH MESSAGE IS ITS OWN BOX — her first three words were "you box up each message", so the
  // amber panel moved OFF the strip and onto the slides. Both halves are asserted: the panel has
  // it, and the strip no longer does, or the box would simply have been drawn twice.
  for (const [what, re] of [["a background", /background:/], ["a border", /border:/], ["padding", /padding:/]]) {
    assert.match(slide, re, `each message box needs ${what}`);
  }
  const strip = css.match(/\.promo-today\s*\{[^}]*\}/)[0];
  assert.equal(/background:|border:|padding:/.test(strip), false,
    "the strip is the WINDOW now — a box drawn on both would be two boxes, and it would add height");
  assert.match(strip, /color:/, "but it still carries the colour the panels inherit");

  // It has to win over the base rule on its own: more specific, and later in the sheet.
  assert.equal(
    css.lastIndexOf(".promo-slide.is-left") > css.lastIndexOf("\n.promo-slide {"),
    true, "the .is-left rule must come after the base .promo-slide rule");

  // ⚠️ AND THE DURATION STAYS INSIDE THE HOUSE BAND (250–400ms for a page-level state change).
  for (const [what, body] of [["leaving", slide], ["arriving", lit[0]]]) {
    const d = Number((body.match(/transition:[^;]*?([\d.]+)s[^;]*transform|transform[^;]*?([\d.]+)s/) || [])
      .slice(1).find(Boolean));
    assert.ok(Number.isFinite(d), `the ${what} panel has no duration on its transform`);
    assert.ok(d >= 0.25 && d <= 0.4, `the ${what} panel's move is ${d}s, outside the 250–400ms band`);
  }
});

test("there is one dot per offer, and none for a single offer", () => {
  // Her ask: "there should be 2 dot if there is 2 message, 3 dot if 3 message."
  assert.match(html, /<div id="promo-dots"[^>]*><\/div>/,
    "index.html must carry an empty #promo-dots for the script to fill");
  assert.match(app, /dots = list\.map\(/,
    "the dots must be built one per offer, from the same list the slides come from");
  // A row of dots that a single offer does not need — the same rule that leaves the timer
  // unarmed, and the :empty rule is what keeps an empty row from adding height.
  assert.match(css, /\.promo-dots:empty\s*\{\s*display:\s*none/,
    "an empty dot row must not take up space");
});

test("the dots meet the accessibility floor the house skill sets", () => {
  // ⚠️ THE FIRST DRAFT SHIPPED 22px HIT AREAS — under WCAG 2.5.8's 24×24 CSS px floor.
  // These are the rules that were missing, held here so they cannot quietly go again.
  const dot = css.match(/\.promo-dot\s*\{[^}]*\}/);
  assert.ok(dot, "app.css has no .promo-dot rule");
  const size = (prop) => {
    const m = dot[0].match(new RegExp(`${prop}:\\s*(\\d+)px`));
    return m ? Number(m[1]) : 0;
  };
  assert.equal(size("width") >= 24, true,
    `the dot's hit area must clear WCAG 2.5.8's 24px floor (it is ${size("width")}px)`);
  assert.equal(size("height") >= 24, true,
    `…in both directions (height is ${size("height")}px)`);

  // A control must say what it is to a screen reader, and this one is a button with no text.
  assert.match(app, /"aria-label": `\$\{i \+ 1\} \/ \$\{list\.length\}`/,
    "each dot needs its own aria-label — it is an icon-only button");

  // A visible focus ring: the house skill forbids `outline: none` without a replacement,
  // and these are keyboard-reachable buttons.
  assert.match(css, /\.promo-dot:focus-visible\s*\{[^}]*outline:/,
    "the dots are reachable by keyboard and must show where the focus is");
});

test("the motion follows the house rules for durations and easings", () => {
  // The house skill: 250–400ms for a page-level state change, never over 500ms; and
  // ease-out for entering, ease-in for leaving.
  const slide = css.match(/\.promo-slide\s*\{[^}]*\}/)[0];
  const lit = css.match(/\.promo-slide\.is-on\s*\{[^}]*\}/)[0];
  const dur = (rule) => Number((rule.match(/transform\s+([\d.]+)s/) || [])[1] || 0);
  assert.equal(dur(slide) > 0 && dur(slide) <= 0.5, true,
    `the turn must stay inside the house ceiling of 500ms (it is ${dur(slide)}s)`);
  assert.equal(dur(lit), dur(slide),
    "the two halves of one turn must take the same time, or the swap looks like a stumble");

  // ease-in leaves, ease-out arrives. Both are cubic-beziers, so the first control point
  // tells them apart: an ease-out starts fast (x1 ≈ 0) and an ease-in starts slow (x1 high).
  const leaveX1 = Number((slide.match(/cubic-bezier\(([\d.]+),/) || [])[1]);
  const enterX1 = Number((lit.match(/cubic-bezier\(([\d.]+),/) || [])[1]);
  assert.equal(enterX1 < leaveX1, true,
    "the arriving offer should ease OUT (starts fast) and the leaving one ease IN (starts slow)");
});

test("a press on the strip can no longer freeze the turn for ever", () => {
  // ⚠️ HER REPORT: "once we put mouse over it or click it, the flip stop… move the mouse
  // outside the window, the flip should be back." v292 paused on any `pointerdown` for
  // twenty seconds — a CLOCK, not the pointer — so a click trapped the strip and moving
  // away could not release it. The pointer being over the strip is the whole of the pause.
  assert.doesNotMatch(app, /PRESS_HOLD_MS/,
    "the twenty-second press-hold is back — it traps the strip on any click");
  assert.doesNotMatch(app, /heldUntil/,
    "a clock-based hold is back; the pause must be the pointer being over the strip, and nothing else");
  assert.match(app, /promoToday\.addEventListener\("pointerleave", \(\) => \{ overStrip = false; \}\)/,
    "leaving the strip must release the turn");
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

test("the script rotates by lighting a slide, and the timer is her 2 seconds", () => {
  // ★ HER NUMBER, AND IT HAS MOVED ONCE. v292 set 1.5s, when the line was mostly a short
  // code. By v316 her offers had grown — the longest is 38 words, because it carries her own
  // sentence in the chalk hand as well as the code — and she reported the result as too fast:
  // "maybe the scrolling is too fast and hardly see the results". **Shown the arithmetic (38
  // words wants about 11 seconds; 1.5s left about 1.1s of stillness), she chose 2 seconds.**
  // So 2 it is, and the slowness that remains is her decision rather than our oversight.
  assert.match(app, /const TURN_MS = 2000;/,
    "the pace is her 2 seconds an offer");
  assert.match(app, /showSlide\(standingNext\(/,
    "the timer must move which slide is lit, and nothing else");
});
