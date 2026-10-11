// test/order-removal-guard.test.js — nothing may ever remove an order COMPLETELY (v444).
//
// WHY THIS FILE EXISTS, in her words: __"What my concern is it dont happen again"__ — asked after three
// PAID orders left her data on 11 Oct 2026 and were in **none** of her eleven saved copies.
//
// ⚠️⚠️ THE PART THAT MADE IT PERMANENT WAS NOT THE REMOVAL, IT WAS WHAT FOLLOWED. `sync.js` tombstones
// **every record that was in the last snapshot and is gone now** — whatever removed it: a press, a fault,
// a hand-edit. The tombstone goes to the shared cloud, the other phone deletes its copy, and every backup
// taken afterwards is a copy of data the order is already missing from. ⭐ A loss with no way back, on any
// device, for ever.
//
// ⭐ SO THIS FILE PINS TWO THINGS:
//   1. **ONE DOOR OUT.** Every removal goes through `state.js:removeOrders`, which KEEPS the row on a shelf
//      she can put back from. No screen may reassign `state.orders` for itself.
//   2. **THE CLOUD'S REMOVAL LANDS ON THE SHELF TOO** — a tombstone from the other phone is a removal
//      nobody here made, and it is the one that propagated her loss.
//
// ⚠️ IT DOES NOT CLAIM TO HAVE FOUND THE CAUSE. It cannot: the removal left no trace, which is the fault.
// **It makes the next one recoverable whatever the cause** — and that is the only honest promise available.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { defaultState, normalize, removeOrders, restoreRemovedOrder, REMOVED_KEEP_HOURS } from "../admin/js/state.js";

const JS_DIR = new URL("../admin/js/", import.meta.url).pathname;

function allSources(dir = JS_DIR, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) allSources(p, out);
    else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

test("★★ no file may drop rows from state.orders except the one door (v444)", () => {
  // ⚠️ THE GUARD IS A GREP ON PURPOSE. A behaviour test can only cover the removals that exist today —
  // this covers the one somebody adds next year, which is how the fault got in. ⭐ Everything else in the
  // app may still build, map and normalise a list of orders (`normalize` and the two id-repair passes in
  // state.js all do); what is forbidden is REASSIGNING the live list anywhere but the door.
  const offenders = allSources()
    .filter((f) => !f.endsWith("/state.js") && /state\.orders\s*=/.test(readFileSync(f, "utf8")))
    .map((f) => f.slice(f.indexOf("/admin/js/") + 1));
  assert.deepEqual(offenders, [],
    `★ a file drops rows from state.orders outside the one door: ${offenders.join(", ")}`);

  // ⚠️ AND THE DOOR MUST STILL BE A DOOR. If `removeOrders` were deleted, the grep above would pass
  // over an app with no guard at all — the `[].every()` trap this project has written down more than
  // once. So the two files that DO remove orders are required to use it.
  assert.match(readFileSync(join(JS_DIR, "state.js"), "utf8"), /export function removeOrders/,
    "the one door is gone, so nothing else here proves anything");
  for (const rel of ["views/orders.js", "sync.js"]) {
    assert.match(readFileSync(join(JS_DIR, rel), "utf8"), /removeOrders\(/,
      `★ ${rel} removes orders without going through the one door`);
  }
});

test("★ a removed order is KEPT, not destroyed — and put back exactly as it was", () => {
  const st = { orders: [
      { id: "o1", deliveryDateId: "d1", productId: "p1", qty: 20, customerName: "Jien", groupId: "g1" },
      { id: "o2", deliveryDateId: "d1", productId: "p1", qty: 3, customerName: "Mei Ling" },
    ], deliveryDates: [], removedOrders: [] };
  const before = JSON.parse(JSON.stringify(st.orders[0]));

  const gone = removeOrders(st, ["o1"], "an edit");
  assert.equal(gone.length, 1, "the door removed nothing, so nothing about it is being tested");
  assert.deepEqual(st.orders.map((o) => o.id), ["o2"], "the wrong order left the live list");
  assert.equal(st.removedOrders.length, 1, "★ the removed order was destroyed instead of kept");
  assert.equal(st.removedOrders[0].id, "o1");
  assert.ok(st.removedOrders[0].removedAt, "the shelf does not say when it was taken off");

  // ⭐ PUT IT BACK — the same id, day, group and quantity, and no loss-mark left on it.
  const back = restoreRemovedOrder(st, "o1");
  assert.ok(back, "the row on the shelf could not be put back");
  assert.equal(st.removedOrders.length, 0, "the shelf kept a row it had already restored");
  assert.deepEqual(st.orders.find((o) => o.id === "o1"), before,
    "★ the order came back different from the one that left");
  // ⚠️ AND NOTHING ELSE MOVED.
  assert.deepEqual(st.orders.map((o) => o.id).sort(), ["o1", "o2"]);
});

test("★★ an order deleted on the OTHER phone lands on this phone's shelf (v444)", async () => {
  // ⚠️⚠️ THIS IS THE PATH THAT COST HER THE ORDERS. A tombstone is a removal nobody here made, it takes
  // the whole order away in one line of the merge, and it propagates back to everything.
  const { mergeRows } = await import("../admin/js/sync.js");
  const st = {
    orders: [{ id: "o1", deliveryDateId: "d1", productId: "p1", qty: 20, customerName: "Jien" }],
    deliveryDates: [], removedOrders: [],
  };
  mergeRows(st, [{ kind: "orders", id: "o1", data: null, _deleted: true,
    updated_at: new Date(Date.now() + 60000).toISOString() }]);

  assert.equal(st.orders.some((o) => o.id === "o1"), false,
    "the tombstoned order is still in the live list, so the fixture proves nothing");
  assert.equal(st.removedOrders.length, 1,
    "★ an order deleted on the other phone was destroyed here rather than kept");
  assert.equal(st.removedOrders[0].id, "o1");
  assert.match(String(st.removedOrders[0].removedWhy || ""), /another phone/,
    "the shelf does not say the removal came from the other phone");
});

test("★ the shelf is pruned, so keeping things cannot leak", () => {
  // ⚠️⚠️ AND HER NUMBER IS PINNED, not merely read. Her words: __"the deleted order just need to keep for
  // 48hrs"__ — and a test that only compares against the constant would pass with ANY value in it,
  // **including the thirty days I guessed before she corrected me.** ⭐ A duration is a decision, so the
  // test states the decision.
  assert.equal(REMOVED_KEEP_HOURS, 48, `★ the shelf keeps orders for ${REMOVED_KEEP_HOURS} hours, not her 48`);
  const st = { orders: [], removedOrders: [] };
  const old = new Date(Date.now() - (REMOVED_KEEP_HOURS + 5) * 3600000).toISOString();
  st.removedOrders = [{ id: "ancient", removedAt: old }, { id: "today", removedAt: new Date().toISOString() }];
  st.orders = [{ id: "o1" }, { id: "o2" }];
  removeOrders(st, ["o1"]);
  assert.equal(st.removedOrders.some((r) => r.id === "ancient"), false,
    "★ a row older than the keeping period was left on the shelf");
  assert.equal(st.removedOrders.some((r) => r.id === "today"), true, "a fresh row was pruned away");
});

test("⚠️ a phone that has never removed an order, and a state written before v444, both behave as before", () => {
  // ⚠️ Guarded like every other list she owns — an older state has no `removedOrders` key at all, and the
  // door has to work on it without throwing.
  const old = normalize({ version: 1, orders: [{ id: "o1" }], deliveryDates: [] });
  assert.deepEqual(old.removedOrders, [], "an older state did not come back with an empty shelf");
  // ⚠️ `normalize` stamps a status on an order that had none, so the row that goes to the shelf is the
  // NORMALISED one — asserted by id rather than by a whole object, which would be asserting `normalize`'s
  // business from the wrong file.
  assert.deepEqual(removeOrders(old, ["o1"]).map((o) => o.id), ["o1"]);
  assert.deepEqual(old.removedOrders.map((r) => r.id), ["o1"]);
  // ⚠️ And a call that names nothing removes nothing, rather than emptying the list.
  assert.deepEqual(removeOrders(old, []), []);
  assert.deepEqual(removeOrders(old, [undefined, null]), []);
  assert.equal(old.orders.length, 0);
  assert.equal(defaultState().removedOrders.length, 0, "a brand-new state does not start with an empty shelf");
});
