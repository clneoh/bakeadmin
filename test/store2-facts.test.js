// test/store2-facts.test.js — the second gateway's "Good to know" sheet: the reassurance layer of the
// customer-levels plan, at the one moment a customer starts to wonder how the shop works.
//
// ⚠️⚠️ AND THE RULE THAT KEEPS IT HONEST: **every sentence here is a fact of hers.** Allergens, keeping and
// freezing are NOT in it, because she has not given those words and a shop must never invent a food fact.
// That absence is pinned, so the day someone adds a plausible-sounding line, this file says no.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { STORE } from "../store-lang.js";
import { LANGS } from "../i18n.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const HTML = read("store2/index.html");
const APP = read("store2/app.js");
const CSS = read("store2/app.css");

// comments out before any match — a commented-out line has fooled this repo before
const live = (src) => String(src).split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .map((l) => l.replace(/\/\*.*?\*\//g, ""))
  .join("\n");

const KEYS = ["factsLink", "factsHead", "factBake", "factCutoff", "factGet", "factPay", "factChange", "factAsk",
  "factKeep", "factFreeze", "factAllergen"];

test("★★★ the sheet exists, starts shut, and is opened by its own link (v636_2)", () => {
  assert.match(HTML, /id="facts-open"[^>]*aria-expanded="false"[^>]*aria-controls="facts-sheet"/,
    "★ the link that opens it is gone, or it claims a panel it does not control");
  assert.match(HTML, /<div class="facts-sheet" id="facts-sheet" hidden>/,
    "★ the panel must START hidden — a shop that arrives with a wall of small print is the fault wearing the fix's clothes");
  assert.match(live(APP), /sheet\("facts-open", "facts-sheet", null\);/,
    "★ nothing opens it — a press that does nothing is a bug");
});

test("★★★ one behaviour for both panels, and a language press is not 'away' (v636_2)", () => {
  assert.match(live(APP), /const sheet = \(openId, sheetId, zoneId\) => \{/,
    "★ the sheet behaviour was copied instead of shared — two copies of one rule drift");
  assert.match(live(APP), /sheet\("privacy-open", "privacy-sheet", "privacy-zone"\);/,
    "the privacy notice lost its wiring");
  // ⚠️ THE USE, NOT THE DECLARATION. ⭐ BITTEN: removing only the `&& !changingLanguage` from the condition left
  // the `const changingLanguage = …` line behind, and a test that looked for the *name* stayed green while the
  // fault was back. A guard has to assert the thing that runs.
  assert.match(live(APP), /!changingLanguage\) setOpen\(false\);/,
    "★ measured: switching language SHUT the panel — a customer reading in the wrong language had to open it again");
});

test("★★★ every FOOD claim is marked as a draft, so her words can be found and swapped in (v637)", () => {
  // ⚠️⚠️ HER WORDS: __"you can just fill in something, i will tell you to update later"__ — ⭐ so the three food
  // facts are written CONSERVATIVELY (over-declared, never under-declared) and each carries `data-draft`.
  // ⚠️ THE GUARD IS NOW "NO UNMARKED FOOD CLAIM", not "no food claim at all": a claim nobody can find is a claim
  // nobody will replace, and a shop that quietly states a food fact is the fault this file exists for.
  // ⚠️ HTML COMMENTS OUT FIRST (the house rule): the note explaining the draft foods names allergens too, and a
  // raw slice made the guard accuse its own documentation. A guard must not trip on its own explanation.
  const page = HTML.replace(/<!--[\s\S]*?-->/g, "");
  const sheet = page.slice(page.indexOf('id="facts-sheet"'), page.indexOf('id="facts-sheet"') + 2600);
  const FOOD_CLAIMS = /allergen|freez|frozen|refrigerat|reheat|shelf life|keeps?\s+for|lasts?\s+\d+\s+days?|good\s+for\s+\d+\s+days?|halal|microwav|room temperature|wheat|gluten/i;
  const lines = sheet.split("\n").filter((l) => FOOD_CLAIMS.test(l));
  assert.ok(lines.length > 0, "the food facts went missing — she asked for them to be filled in as drafts");
  for (const line of lines) {
    assert.match(line, /data-draft="food-fact"/,
      `★ an unmarked food claim: ${line.trim().slice(0, 60)} — every one of these must be findable as a draft`);
  }
  // Exactly the three she asked to be filled in for now.
  const drafts = [...sheet.matchAll(/data-i18n="(fact[A-Za-z]+)" data-draft="food-fact"/g)].map((m) => m[1]);
  assert.deepEqual(drafts.sort(), ["factAllergen", "factFreeze", "factKeep"],
    "★ the set of draft food facts changed — her words are owed for exactly these three");
  // And the facts she already lives by are still stated.
  for (const key of ["factBake", "factCutoff", "factGet", "factPay", "factChange"]) {
    assert.ok(sheet.includes(`data-i18n="${key}"`), `the sheet lost "${key}"`);
  }
});

// ⚠️ AND THE ALLERGEN LINE IS THE ONE THAT MUST BE READ BY HER: it is the only sentence on the page that can
// hurt someone if it is wrong. It is pinned as DRAFT here so no release can quietly freeze it as final.
test("★★★ the allergen sentence is a placeholder until she says otherwise (v637)", () => {
  assert.match(HTML, /data-i18n="factAllergen" data-draft="food-fact"/,
    "★ the allergen line is no longer marked as a draft — it is now being stated to customers as settled");
  assert.match(STORE.en.factAllergen, /wheat \(gluten\)/i, "the allergen line stopped naming what it is made with");
});

test("★★★ and every sentence exists in three languages, not copied (v636_2)", () => {
  for (const key of KEYS) {
    const vals = LANGS.map((l) => STORE[l] && STORE[l][key]);
    assert.ok(vals.every((v) => typeof v === "string" && v.trim().length > 0), `★ ${key} is missing in one language`);
    assert.notEqual(vals[1], vals[0], `★ ${key} 中文 is the English line`);
    assert.notEqual(vals[2], vals[0], `★ ${key} Bahasa Malaysia is the English line`);
  }
});

test("★★ the panel opens in the FLOW, not against the order bar (v636_2)", () => {
  // ⚠️ Measured: given the privacy panel's own class, this one opened with zero height and nothing on screen —
  // it was being positioned against the order bar, which it has nothing to do with.
  assert.match(CSS, /\.facts-sheet \{[\s\S]{0,220}?margin: -6px 0 14px;/,
    "★ the facts panel is bar-anchored again — measured, it then opens with no height at all");
  assert.ok(!/class="privacy-sheet" id="facts-sheet"/.test(HTML),
    "★ the panel went back to the order bar's class");
});
