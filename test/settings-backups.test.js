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
