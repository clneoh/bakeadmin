// test/customers.test.js — customer / marketing list aggregation.
// Run with: node --test test/

import { test } from "node:test";
import assert from "node:assert/strict";
import { customerList, deliveryDateOf, orderDateOf } from "../js/customers.js";

function state(orders, deliveryDates = []) {
  return { orders, deliveryDates };
}

test("customerList aggregates by WhatsApp number and sums units", () => {
  const st = state([
    { id: "o1", deliveryDateId: "d1", qty: 3, customerName: "Aunty Bee", whatsapp: "6012-111", deliveryDate: "2026-09-07", orderDate: "2026-09-05" },
    { id: "o2", deliveryDateId: "d2", qty: 2, customerName: "Aunty Bee", whatsapp: "6012-111", deliveryDate: "2026-09-09", orderDate: "2026-09-07" },
    { id: "o3", deliveryDateId: "d3", qty: 1, customerName: "Mr Lim", whatsapp: "6013-222", deliveryDate: "2026-09-11", orderDate: "2026-09-10" },
  ]);
  const rows = customerList(st);
  assert.equal(rows.length, 2);
  const bee = rows.find((r) => r.whatsapp === "6012-111");
  assert.equal(bee.orders, 2);
  assert.equal(bee.units, 5);
  assert.equal(bee.last, "2026-09-09");
  assert.equal(bee.lastOrdered, "2026-09-07");
  assert.equal(rows[0].last, "2026-09-11"); // most recent delivery first
});

test("same WhatsApp under a different name is still one customer", () => {
  const st = state([
    { id: "o1", deliveryDateId: "d1", qty: 1, customerName: "Bee", whatsapp: "6012-111", deliveryDate: "2026-09-07" },
    { id: "o2", deliveryDateId: "d2", qty: 2, customerName: "Aunty Bee", whatsapp: "6012-111", deliveryDate: "2026-09-09" },
  ]);
  const rows = customerList(st);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].orders, 2);
  assert.equal(rows[0].units, 3);
});

test("orders without a WhatsApp number still appear, keyed by name", () => {
  const st = state([
    { id: "o1", deliveryDateId: "d1", qty: 2, customerName: "Cash walk-in", deliveryDate: "2026-09-07" },
    { id: "o2", deliveryDateId: "d1", qty: 1, customerName: "Cash walk-in", deliveryDate: "2026-09-07" },
  ]);
  const rows = customerList(st);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].orders, 2);
  assert.equal(rows[0].whatsapp, "");
});

test("deliveryDateOf resolves a deleted date via the snapshotted deliveryDate", () => {
  const st = state(
    [{ id: "o1", deliveryDateId: "gone", qty: 1, customerName: "X", deliveryDate: "2026-08-31" }],
    [], // the date was deleted; only the snapshot remains
  );
  assert.equal(deliveryDateOf(st, st.orders[0]), "2026-08-31");
});

test("deliveryDateOf falls back to resolving the delivery date by id", () => {
  const st = state(
    [{ id: "o1", deliveryDateId: "d1", qty: 1, customerName: "X" }],
    [{ id: "d1", date: "2026-09-14" }],
  );
  assert.equal(deliveryDateOf(st, st.orders[0]), "2026-09-14");
});

test("orderDateOf uses the snapshot, else the createdAt date", () => {
  assert.equal(orderDateOf({ orderDate: "2026-09-05", createdAt: "2026-09-05T10:00:00.000Z" }), "2026-09-05");
  assert.equal(orderDateOf({ createdAt: "2026-09-05T10:00:00.000Z" }), "2026-09-05");
  assert.equal(orderDateOf({}), "");
});

test("customerList supports sorting by name, orders, units, phone", () => {
  const st = state([
    { id: "o1", qty: 3, customerName: "Ali", whatsapp: "6012-000", deliveryDate: "2026-09-09", orderDate: "2026-09-08" },
    { id: "o2", qty: 2, customerName: "Ali", whatsapp: "6012-000", deliveryDate: "2026-09-09", orderDate: "2026-09-08" },
    { id: "o3", qty: 2, customerName: "Bee", whatsapp: "6013-000", deliveryDate: "2026-09-08", orderDate: "2026-09-06" },
    { id: "o4", qty: 1, customerName: "Zoe", whatsapp: "", deliveryDate: "2026-09-07", orderDate: "2026-09-07" },
  ]);
  assert.equal(customerList(st, "name").map((r) => r.name).join(","), "Ali,Bee,Zoe");
  assert.equal(customerList(st, "orders")[0].name, "Ali"); // 2 orders
  assert.equal(customerList(st, "units")[0].name, "Ali");  // 5 units
  assert.equal(customerList(st, "phone")[2].name, "Zoe");  // no phone last
  assert.equal(customerList(st, "recent")[0].name, "Ali"); // ordered most recently (09-08)
});
