// test/settings-backups.test.js — the copies list must actually be DRAWN (v642).
//
// ⚠️⚠️ THE FAULT THIS EXISTS FOR, AND ITS AGE. **v574 deleted `kids.push(...rows.map(rowEl))` while lifting the
// kept-copy block out of `fillBackups`**, and for sixty versions the card said *"Daily copy saved today"* and
// listed nothing. ⭐ Restore, Download, Put back missing orders and Delete are reachable ONLY from those rows,
// so the whole backup ladder was invisible while every test stayed green — `rowEl` simply became dead code.
// ⭐ Her report: __"normally i use to see each backup copies, collapsed, but now no"__.
//
// It is a source test because the screen needs a mounted DOM and a stubbed cloud; what is pinned here is the
// thing that was removed — the rows being rendered at all, and every control still being on them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../admin/js/views/settings.js", import.meta.url), "utf8");
// comments out before any match — a commented-out push would otherwise satisfy this
const live = (text) => String(text).split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .map((l) => l.replace(/\/\*.*?\*\//g, ""))
  .join("\n");

test("★★★ the copies are rendered into the card (v642)", () => {
  const code = live(src);
  assert.match(code, /kids\.push\(\.\.\.rows\.map\(rowEl\)\);/,
    "★ the rows are gone again — the card will say a copy was saved and list none");
  // and they are pushed BEFORE the card is shown, or they would be drawn into nothing
  const pushAt = code.indexOf("kids.push(...rows.map(rowEl))");
  const showAt = code.indexOf("show(...kids, ...keptCopyKids())");
  assert.ok(pushAt > 0 && showAt > pushAt, "★ the rows are built after the card is drawn — they never appear");
});

test("★★★ every control a copy needs is still on its row (v642)", () => {
  const row = live(src).slice(live(src).indexOf("function rowEl(row)"));
  const body = row.slice(0, row.indexOf("function viewOne"));
  for (const label of ["View", "Restore", "Put back missing orders", "Download", "Delete"]) {
    assert.ok(body.includes(`"${label}"`), `★ a copy lost its ${label} control`);
  }
});

test("★★ rowEl is used, not dead code (v642)", () => {
  const code = live(src);
  const defs = (code.match(/function rowEl\(/g) || []).length;
  const uses = (code.match(/rows\.map\(rowEl\)/g) || []).length;
  assert.equal(defs, 1, "rowEl is defined more than once");
  assert.equal(uses, 1, "★ rowEl is defined and never called — that is exactly how the list vanished before");
});

test("★★★ each copy is COLLAPSED, and opens on its own head (v644)", () => {
  // Her words: __"there is so many backup copies, should shown collapsed"__. ⭐ The head is one press and names
  // the copy; the five controls sit inside the body; ⚠️ and what she opened stays open across a refill, or
  // "Back up to cloud now" would slam the card shut under her thumb.
  const code = live(src);
  assert.match(code, /class: "fold-body", hidden: !open\b/,
    "★ the copies open by themselves again — a long list with every row expanded is what she asked to end");
  assert.match(code, /class: "fold-head copy-head",/, "the press lost its fold head");
  assert.match(code, /"aria-expanded": open \? "true" : "false"/, "★ the head does not say whether it is open");
  assert.match(code, /const openCopies = new Set\(\);/, "★ what she opened is forgotten on the next refill");
  // ⚠️ and the controls are INSIDE the body, never beside it — a control outside the fold is one a collapsed
  // row still shows, which is the long list she is trying to avoid.
  const row = code.slice(code.indexOf("function rowEl(row)"));
  const body = row.slice(0, row.indexOf("function viewOne"));
  const bodyAt = body.indexOf("const body = el(\"div\", { class: \"fold-body\"");
  const buttonsAt = body.indexOf('button("View"');
  assert.ok(bodyAt > 0 && buttonsAt > bodyAt, "★ the controls are outside the fold body");
});
