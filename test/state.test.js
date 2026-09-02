// test/state.test.js — normalize() guarantees for the storefront settings and
// the order status field, plus the unread-orders badge counter.

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, defaultState, updateOrderBadge, groupOrders, orderCode, waNumber } from "../js/state.js";

test("normalize fills the default storefront when missing", () => {
  const out = normalize({ version: 1, settings: {} });
  assert.deepEqual(out.settings.storefront, defaultState().settings.storefront);
});

test("normalize completes a partial storefront and keeps only well-formed products", () => {
  const out = normalize({
    version: 1,
    settings: {
      storefront: {
        whatsapp: "60123456789",
        products: [
          { name: "Focaccia", price: "15", unit: "loaf" },
          { name: "  ", price: 9 }, // blank name → dropped
          null,
        ],
      },
    },
  });
  const sf = out.settings.storefront;
  assert.equal(sf.whatsapp, "60123456789");
  assert.equal(sf.name, "");
  assert.equal(sf.tagline, "");
  assert.equal(sf.instagram, "");
  assert.equal(sf.products.length, 1);
  assert.deepEqual(sf.products[0], { name: "Focaccia", price: 15, unit: "loaf" });
});

test("normalize defaults order status to new and preserves an explicit one", () => {
  const out = normalize({
    version: 1,
    orders: [
      { id: "a" },
      { id: "b", status: "delivered" },
    ],
  });
  assert.equal(out.orders[0].status, "new");
  assert.equal(out.orders[1].status, "delivered");
});

function badgeShim() {
  const badge = { textContent: "", hidden: true };
  globalThis.document = { getElementById: (id) => (id === "orders-badge" ? badge : null) };
  return badge;
}

test("updateOrderBadge counts orders still New and hides at zero", () => {
  const badge = badgeShim();
  try {
    updateOrderBadge({ orders: [{ status: "new" }, { status: "new" }, { status: "delivered" }, {}] });
    assert.equal(badge.textContent, "3", "unset status counts as new");
    assert.equal(badge.hidden, false);
    updateOrderBadge({ orders: [{ status: "confirmed" }, { status: "delivered" }] });
    assert.equal(badge.textContent, "0");
    assert.equal(badge.hidden, true, "no new orders hides the badge");
    updateOrderBadge({ orders: [] });
    assert.equal(badge.hidden, true);
  } finally {
    delete globalThis.document;
  }
});

test("updateOrderBadge caps the count at 99+", () => {
  const badge = badgeShim();
  try {
    const orders = Array.from({ length: 150 }, () => ({ status: "new" }));
    updateOrderBadge({ orders });
    assert.equal(badge.textContent, "99+");
  } finally {
    delete globalThis.document;
  }
});

test("updateOrderBadge counts a multi-item storefront order once", () => {
  const badge = badgeShim();
  try {
    updateOrderBadge({ orders: [
      { status: "new", groupId: "g1" },
      { status: "new", groupId: "g1" },
      { status: "new" },
    ] });
    assert.equal(badge.textContent, "2", "grouped items count as one, plus the standalone");
    assert.equal(badge.hidden, false);
  } finally {
    delete globalThis.document;
  }
});

test("normalize consolidates duplicate delivery dates and re-points orders", () => {
  const out = normalize({
    version: 1,
    deliveryDates: [
      { id: "del_a", date: "2026-09-04", notes: "" },
      { id: "del_b", date: "2026-09-04", notes: "" },
      { id: "del_c", date: "2026-09-07", notes: "" },
    ],
    orders: [
      { id: "o1", deliveryDateId: "del_a", productId: "p", qty: 1 },
      { id: "o2", deliveryDateId: "del_b", productId: "p", qty: 2 },
      { id: "o3", deliveryDateId: "del_c", productId: "p", qty: 4 },
    ],
  });
  assert.equal(out.deliveryDates.length, 2, "duplicate dates merged");
  assert.equal(out.deliveryDates[0].id, "del_a", "first entry survives");
  assert.ok(out.orders.every((o) => o.deliveryDateId !== "del_b"), "no order points at the removed date");
  const moved = out.orders.find((o) => o.id === "o2");
  assert.equal(moved.deliveryDateId, "del_a");
  assert.deepEqual(out.orders.map((o) => o.qty), [1, 2, 4], "no orders lost");
});

test("groupOrders merges shared groupIds and keeps standalone orders separate", () => {
  const g = groupOrders([
    { id: "a", groupId: "g1" },
    { id: "b" },
    { id: "c", groupId: "g1" },
    { id: "d", groupId: "g2" },
  ]);
  assert.equal(g.length, 3);
  assert.deepEqual(g[0].orders.map((o) => o.id), ["a", "c"], "g1 merged in place of its first member");
  assert.deepEqual(g[1].orders.map((o) => o.id), ["b"]);
  assert.deepEqual(g[2].orders.map((o) => o.id), ["d"]);
  assert.deepEqual(groupOrders([]), []);
  assert.deepEqual(groupOrders(null), []);
});

test("orderCode is the last 6 hex of the id, uppercased", () => {
  assert.equal(orderCode({ id: "ord_ab12cd34ef56" }), "34EF56");
  assert.equal(orderCode({ id: "ord_123456" }), "123456", "short ids still work");
  assert.equal(orderCode({}), "??????", "no id yet → placeholder");
  assert.equal(orderCode(null), "??????");
});

test("orderCode prefers the groupId so a multi-item order shares one code", () => {
  const a = { id: "ord_aaaaaaaaaaaa", groupId: "ordg_112233445566" };
  const b = { id: "ord_bbbbbbbbbbbb", groupId: "ordg_112233445566" };
  assert.equal(orderCode(a), orderCode(b));
  assert.equal(orderCode(a), "445566");
});

test("normalize keeps the TNG QR field on the storefront", () => {
  const out = normalize({ version: 1, settings: { storefront: { tngQr: "https://img/tng.png" } } });
  assert.equal(out.settings.storefront.tngQr, "https://img/tng.png");
});

test("waNumber strips +/spaces/dashes and adds the +60 country code to locals", () => {
  assert.equal(waNumber("+60 12-345 6789"), "60123456789");
  assert.equal(waNumber("60123456789"), "60123456789");
  assert.equal(waNumber("012-345 6789"), "60123456789");
  assert.equal(waNumber("0123456789"), "60123456789");
  assert.equal(waNumber("+65 8123 4567"), "6581234567", "foreign +65 is kept");
  assert.equal(waNumber(""), "");
  assert.equal(waNumber(null), "");
});
