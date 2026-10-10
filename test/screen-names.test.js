// test/screen-names.test.js — a signpost must name a screen that exists.
//
// v337 renamed the app's day vocabulary from "delivery date" to "bake day", and
// the rename missed three strings that POINTED at the renamed screen: her Orders
// calendar said "Add it in More → Delivery Dates" while the menu row it was
// sending her to had already become "Bake days". A signpost that names a row
// nobody can find is a dead end — and nothing in the suite noticed, because the
// message and the row were only ever read apart.
//
// So this test reads both: every "More → X" / "More -> X" anywhere in admin/js,
// checked against the names that really exist — the route titles, the More menu
// rows, and the group headings those rows sit under.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const JS = join(ROOT, "admin/js");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

// The names a signpost is allowed to use.
function destinations() {
  const names = new Set();

  const app = readFileSync(join(JS, "app.js"), "utf8");
  for (const m of app.matchAll(/title:\s*"([^"]+)"/g)) names.add(m[1]);

  // More's rows and the headings they sit under: ["#/href", "Label", "hint"].
  const more = readFileSync(join(JS, "views/more.js"), "utf8");
  for (const m of more.matchAll(/\["#[^"]*",\s*"([^"]+)"/g)) {
    names.add(m[1].replace(/^[^\p{L}]+/u, ""));   // drop the emoji prefix
  }
  // The group headings: ["Logistic", [ …rows… ]] and menuGroup(["Settings & this app", …
  for (const m of more.matchAll(/\["([^"#][^"]*)",\s*\[/g)) names.add(m[1]);
  for (const m of more.matchAll(/menuGroup\(\["([^"]+)"/g)) names.add(m[1]);

  return [...names].filter(Boolean);
}

// "More → Bake days." captured as "Bake days." — keep only the leading phrase,
// because the sentence goes on to explain itself ("Bake days screen already uses…").
function phraseAfter(text) {
  return text.split(/[.,;:!?—()]/)[0].trim();
}

test("every 'More → X' signpost names a screen that exists", () => {
  const names = destinations();
  assert.ok(names.length > 15, `expected the app's whole screen list, got ${names.length}`);
  assert.ok(names.includes("Bake days"), "the renamed screen is among them");

  const lower = names.map((n) => n.toLowerCase());
  const bad = [];

  for (const file of walk(JS)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/More\s*(?:→|->)\s*([^\n"]+)/g)) {
      const said = phraseAfter(m[1]);
      if (!said) continue;
      const starts = lower.some((n) => {
        const s = said.toLowerCase();
        return s === n || s.startsWith(n + " ");
      });
      if (!starts) bad.push(`${file.slice(ROOT.length)}  →  "${said}"`);
    }
  }

  assert.deepEqual(bad, [],
    "a signpost sends her to a screen name the app does not have");
});

test("★★ ONE screen, ONE name — the Kitchen pin is called the same thing everywhere (v402)", () => {
  // Her words: __"instead of send a van, change the term to Location pin for Kitchen"__ — and asked
  // whether the ORDER CARD's "Send a van" should change too, she chose **the screen only**.
  //
  // ⚠️⚠️ THIS SCREEN'S NAME LIVES IN THREE PLACES, and the file it is renamed in is NOT the file that
  // draws the menu. Rename one and not the others and she gets **two names for one screen** — the menu
  // row saying one thing, the title bar another and the page heading a third — with every test still
  // green, because nothing read the three together. That is the same class of fault this whole file
  // exists for: a signpost and its destination only ever read APART.
  const app = readFileSync(join(JS, "app.js"), "utf8");
  const more = readFileSync(join(JS, "views/more.js"), "utf8");
  const view = readFileSync(join(JS, "views", "send_van.js"), "utf8");

  const route = app.match(/"\/send-van":\s*\{\s*title:\s*"([^"]+)"/);
  assert.ok(route, "the /send-van route has gone");
  const row = more.match(/\["#\/send-van",\s*"([^"]+)"/);
  assert.ok(row, "the More row for the Kitchen pin has gone");
  const heading = view.match(/el\("h2",\s*\{\s*class:\s*"section"\s*\},\s*"([^"]+)"\)/);
  assert.ok(heading, "the screen no longer draws a heading of its own");

  const strip = (s) => s.replace(/^[^\p{L}]+/u, "").trim(); // drop the emoji prefix
  const names = [route[1], strip(row[1]), heading[1]];
  assert.deepEqual(new Set(names).size, 1,
    `⚠️ the Kitchen pin screen has ${new Set(names).size} different names: ${JSON.stringify(names)}`);

  // ⚠️ AND THE ADDRESS DOES NOT MOVE WHEN A NAME DOES. `#/send-van` is one she may have bookmarked or
  // arrived at from another screen, and this app has never moved an address for a rename.
  assert.ok(more.includes('"#/send-van"'), "⚠️ the route path was changed along with the name");

  // ⚠️ AND THE ORDER CARDS KEEP THEIR OWN WORD — that is how an order LEAVES, which is a different job.
  const orders = readFileSync(join(JS, "views", "orders.js"), "utf8");
  assert.ok(orders.includes('["Send a van"'), "⚠️ the order card's delivery method was renamed too");
});
