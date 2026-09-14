// A day the baker marked must look the same everywhere: the customer's calendar
// and the app's own calendar both paint a mark as a see-through wash of its own
// colour, at the same depth for the same length of mark. These pin that — the two
// stylesheets are separate files (the shop must not depend on the app's tree), so
// nothing but a guard stops one of them drifting back to a solid block.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const SHEETS = [["shop", read("store/app.css")], ["app", read("admin/css/app.css")]];
const WASHES = ["--occ-wash: 32%", "--occ-wash: 22%", "--occ-wash: 14%"];

function block(css, selector) {
  const at = css.indexOf(`${selector} {`);
  assert.ok(at !== -1, `${selector} is declared`);
  return css.slice(at, css.indexOf("}", at));
}

test("both calendars mix a mark down by the same three depths", () => {
  for (const [name, css] of SHEETS) {
    for (const w of WASHES) assert.ok(css.includes(w), `${name}: ${w} is missing`);
  }
});

test("a marked day is never a solid block, on either calendar", () => {
  for (const [name, css] of SHEETS) {
    const box = block(css, ".cal-cell.sol::before");
    assert.match(box, /background: color-mix\(/, `${name}: the box is a wash`);
    assert.match(box, /var\(--occ-wash/, `${name}: its depth comes from the shared ladder`);
    assert.ok(!/background: var\(--occ-solid/.test(box),
      `${name}: never the mark's plain solid colour`);
  }
});

test("both calendars hand the box the strength class a band would get", () => {
  for (const [name, file] of [["shop", "store/app.js"], ["app", "admin/js/occgrid.js"]]) {
    assert.ok(read(file).includes("occ-${occStrength(sol)}"),
      `${name}: the box reads its depth from occStrength, like a band`);
  }
});

// The app owns five month calendars and every one of them asks occgrid.js for the
// marks, so Orders cannot quietly drift from Delivery Dates. This is the guard
// against a screen growing its own copy of the class string — the failure mode
// that would put the shop and the app back out of step.
test("the app builds a marked day's classes in exactly one place", () => {
  const CALENDARS = [
    ["Delivery Dates", "admin/js/views/deliveries.js"],
    ["Orders", "admin/js/views/orders.js"],
    ["a product's Availability card", "admin/js/views/products.js"],
    ["the free date fields", "admin/js/datepicker.js"],
  ];
  for (const [name, file] of CALENDARS) {
    assert.ok(!read(file).includes("occ-${occStrength(sol)}"),
      `${name}: asks occgrid.js for the box's classes instead of rebuilding them`);
  }
});
