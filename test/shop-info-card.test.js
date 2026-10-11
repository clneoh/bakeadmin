// test/shop-info-card.test.js — the shop's "Bake days" / "Order by" card must read as two
// SENTENCES, not as two columns of words.
//
// Her report, with a picture: __"instead of a line, customer might confused that it is 2 group of
// word, one left one right"__
//
// ⚠️⚠️ SHE WAS RIGHT, AND IT WAS ONE LINE OF CSS. `.info-row` was `display: flex;
// justify-content: space-between` — which pins the word to the LEFT edge and its answer to the
// RIGHT edge with **nothing joining them**. A customer reading down the left and then down the
// right gets the pairing wrong, and this card is the one place on the shop that states the two
// rules an order depends on: which days she bakes, and when ordering closes.
//
// ⭐ THE SHAPE SHE CHOSE, OFF A DRAWN SHEET: **one line, one sentence** — `Bake days: Mon, Wed, Fri`.
//
// ⭐ NO TEST CAN SEE LAYOUT, SO THIS PINS THE RULE INSTEAD (the v388 lesson): the row must not push
// its two halves apart, and the label and its answer must be one run of text with the colon
// between them.
//
// ⚠️ AND THE COLON LIVES IN THE MARKUP, NOT IN THE TRANSLATED STRING — so all three languages keep
// their own wording and none has to carry punctuation it never had (store-lang.js).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../store/app.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../store/index.html", import.meta.url), "utf8");

// The rule itself, found BY CONTENT — never by where it happens to sit in the file, because an
// unrelated rule appended above it would then silently move the subject.
const RULE = /\.info-row\s*\{([^}]*)\}/.exec(css);
const row = (id) => new RegExp(`<p class="info-row">([\\s\\S]*?)<span id="${id}"[^>]*>`).exec(html);

test("★★ the card must not push its label and its answer to opposite edges", () => {
  assert.ok(RULE, "no .info-row rule in the shop's stylesheet at all, so this proves nothing");
  assert.doesNotMatch(RULE[1], /space-between/,
    "★ the row is spacing its halves apart again — that is the two-groups-of-words she caught");
  assert.doesNotMatch(RULE[1], /display:\s*flex/,
    "★ the row is a flex line again, so nothing ties the label to its answer");
});

test("★ each label and its answer read as ONE run of text, with the colon between them", () => {
  for (const [id, label] of [["delivery-days", "Bake days"], ["cutoff", "Order by"]]) {
    const m = row(id);
    assert.ok(m, `the shop's card no longer carries the "${label}" row`);
    // The colon must sit between the label and the value — that is the whole of the chosen shape.
    assert.match(m[1], /<\/strong>\s*:\s*$/,
      `★ "${label}" is no longer followed straight away by its answer (between them: ${JSON.stringify(m[1].slice(-40))})`);
  }
});

test("⚠️ and the two values still land in their own spans, so the shop can fill them in", () => {
  // ⚠️ The ids are what `store/app.js` writes the real days and cut-off into. A card that looked
  // right but lost its target would read as a fault with nothing in it.
  const days = /<span id="delivery-days" class="info-val"><\/span>/.test(html);
  const cutoff = /<span id="cutoff" class="info-val"><\/span>/.test(html);
  assert.ok(days, "the Bake days answer has nowhere to go");
  assert.ok(cutoff, "the Order by answer has nowhere to go");
});

// ⚠️ A RULE, NOT A PIXEL — no test can see layout, so what is pinned is the DECLARATION. The
// selector is anchored to the start of a line so `.seg-btn.active .seg-name` cannot answer for the
// bare `.seg-name`, which is a different rule about a different state.
const ruleFor = (sel) => {
  const m = new RegExp(`(?:^|\\n)\\s*${sel.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(m, `no standalone ${sel} rule in the shop's stylesheet, so this proves nothing`);
  return m[1];
};

test("★★ an AREA heading is NOT the brand red — it is a signpost, not a warning", () => {
  // Her words: __"area should not be in red, put as black"__. ⚠️ **On this shop the terracotta is
  // the voice for things the customer must NOTICE** — an instruction to tap, a day that is closed.
  // An area name asks for nothing: it says where the places under it are.
  const body = ruleFor(".point-area");
  assert.doesNotMatch(body, /var\(--brown-dark\)/,
    "★ the area heading is wearing the shop's attention colour again — it is a heading on a list");
  assert.match(body, /var\(--ink\)/, "the area heading is not set in the shop's ordinary ink");
  // ⭐ AND IT IS NOT SHOUTED (v434), her second look at the same line: __"why capitalised the
  // AREA?"__ ⚠️ **The capitals were never in the data** — the name is stored as 'Penang Island' and
  // `text-transform` drew it in caps. **A rule that re-added it would silently shout the signpost
  // again**, which is exactly the kind of change nothing on a screen would report.
  assert.doesNotMatch(body, /text-transform:\s*uppercase/,
    "★ the area heading is in capitals again — the name is written as she writes it");
});

test("★ 'Self collect' is a TITLE, in the shop's own title — 16px, serif", () => {
  // Her words: __"Self collect should be in bigger font being a title"__. ⚠️ **The answer is not a
  // size invented for it: it wears `.card-title`, the one heading shape this shop already has**, so
  // it reads like the product names above it rather than like body text.
  const body = ruleFor(".seg-name");
  assert.match(body, /font-size:\s*16px/, "'Self collect' is not at the shop's card-title size");
  assert.match(body, /font-family:\s*var\(--serif\)/, "'Self collect' is not in the shop's title face");
});

test("⚠️ and the colon is NOT inside a translated string", () => {
  // ⭐ The three languages keep their own words. A colon baked into the English key would arrive in
  // Chinese and Bahasa too, where it is not the punctuation those sentences use.
  const lang = readFileSync(new URL("../store-lang.js", import.meta.url), "utf8");
  for (const key of ["deliveryDays", "orderBy"]) {
    const hits = lang.match(new RegExp(`${key}:\\s*"[^"]*"`, "g")) || [];
    assert.equal(hits.length, 3, `expected ${key} in all three languages, found ${hits.length}`);
    for (const h of hits) {
      assert.doesNotMatch(h, /[:：]"\s*$/,
        `★ the translated string carries its own colon, so the markup now shows two: ${h}`);
    }
  }
});
