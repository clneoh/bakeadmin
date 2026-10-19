// test/home-facts.test.js — the two homepage facts that are hers to set (v581).
//
// ⚠️⚠️ THE FAULT: the homepage typed "Orders close at 6:00PM" and "Mon / Wed / Fri" into index.html
// while the shop read both from her published settings — ⭐ **change either one in the app and the two
// pages contradict each other on the same day.** ⭐ The homepage now takes both from the same publish.
//
// The clock formatter lives here for BOTH pages (`store/app.js` re-exports it), so one time cannot be
// spoken two ways.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CUTOFF_TOKEN, bakeDaysText, cutoffText, withCutoff } from "../home-facts.js";
import { HOME } from "../home-lang.js";

test("cutoffText speaks a clock the way a person does", () => {
  assert.equal(cutoffText("18:00"), "6pm");
  assert.equal(cutoffText("17:30"), "5:30pm");
  assert.equal(cutoffText("12:00"), "12pm");
  assert.equal(cutoffText("00:30"), "12:30am");
  assert.equal(cutoffText("09:00"), "9am");
  assert.equal(cutoffText(""), "", "nothing set is nothing said");
});

test("★★★ withCutoff writes her time into every language's sentence, and keeps its shape", () => {
  for (const lang of ["en", "zh", "ms"]) {
    const out = withCutoff(HOME[lang].n1Line, "18:00");
    assert.ok(out.includes("6pm"), `${lang}: the sentence does not carry her cut-off`);
    assert.equal(out.includes(CUTOFF_TOKEN), false, `${lang}: the old 6:00PM was left beside the new time`);
  }
  // The rest of the sentence is untouched — where the time sits belongs to the translator.
  assert.equal(withCutoff("Orders close at <strong>6:00PM</strong><br>the day before baking day.", "17:30"),
    "Orders close at <strong>5:30pm</strong><br>the day before baking day.");
  // A blank cut-off changes nothing at all.
  assert.equal(withCutoff(HOME.en.n1Line, ""), HOME.en.n1Line);
});

test("★★ every language's cut-off line carries the token the replacement looks for", () => {
  // ⚠️ A translator who writes the time another way would otherwise leave the homepage quietly wrong in
  // that language — a line that looks translated and states the wrong deadline.
  for (const lang of ["en", "zh", "ms"]) {
    assert.ok(String(HOME[lang].n1Line || "").includes(CUTOFF_TOKEN),
      `${lang}: the time is not written as ${CUTOFF_TOKEN}, so her cut-off can never replace it`);
  }
});

test("★★ bakeDaysText names HER bake days, in the visitor's language", () => {
  assert.equal(bakeDaysText([1, 3, 5], "en"), "Mon / Wed / Fri");
  assert.equal(bakeDaysText([1, 3, 5], "zh"), "周一 / 周三 / 周五");
  assert.equal(bakeDaysText([1, 3, 5], "ms"), "Isnin / Rabu / Jumaat");
  assert.equal(bakeDaysText([5, 1, 3], "en"), "Mon / Wed / Fri", "the order is the week's, not the list's");
  assert.equal(bakeDaysText([0], "en"), "Sun");
  // ⚠️ An EMPTY published list is an answer — she has none open — and must not leave "Mon / Wed / Fri"
  // on the page. `null`/absent is a publish that said nothing, and the translated line stays.
  assert.equal(bakeDaysText([], "en"), "—", "★ days she has closed still read as Mon / Wed / Fri");
  assert.equal(bakeDaysText(null, "en"), null, "a payload with no day list replaced her translated line");
});
