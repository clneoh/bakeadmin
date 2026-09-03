// test/orders.test.js — the order-status gate: moving an order to Confirmed
// needs its WhatsApp number, because that is when the confirmation message with
// the payment QR goes out. Later stages advance the physical order even without
// a number (their message/Paid buttons just stay disabled).
// Covers the journey marks (New → Confirmed → Paid → Baked → Packed →
// Delivered, where Confirmed/Paid only tick green after their button is
// pressed) and the new-orders inbox, including orphaned orders (their delivery
// date was deleted) that can only be removed, not opened.

import { test } from "node:test";
import assert from "node:assert/strict";

// DOM shim so ui.js's el() can build nodes when newOrdersInbox renders.
function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    scrollTop: 0, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    focus() {}, click() {},
  };
}
globalThis.document = {
  createElement: createEl,
  createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
  getElementById: () => createEl("div"),
  querySelector: () => null,
  querySelectorAll: () => [],
  body: createEl("body"),
};
globalThis.window = { open() {} };

import { statusNeedsWhatsapp, newOrdersInbox, applyGroupPatch, filterOrderGroups, journeyMarks } from "../admin/js/views/orders.js";

test("only Confirmed needs a WhatsApp number (it gates sending the confirmation)", () => {
  assert.equal(statusNeedsWhatsapp("confirmed"), true);
  assert.equal(statusNeedsWhatsapp("baking"), false);
  assert.equal(statusNeedsWhatsapp("ready"), false);
});

test("new and delivered moves never need a number", () => {
  assert.equal(statusNeedsWhatsapp("new"), false);
  assert.equal(statusNeedsWhatsapp("delivered"), false);
  assert.equal(statusNeedsWhatsapp(""), false);
  assert.equal(statusNeedsWhatsapp(undefined), false);
});

test("journey marks: New is green on arrival, Confirmed is the live step", () => {
  assert.deepEqual(journeyMarks({ status: "new" }),
    ["done", "now", "todo", "todo", "todo", "todo"]);
});

test("journey marks: Confirmed completes only once the confirmation was sent", () => {
  // Legacy orders saved before the flag existed read as already handled.
  assert.deepEqual(journeyMarks({ status: "confirmed" }),
    ["done", "done", "now", "todo", "todo", "todo"], "absent flag = confirmation sent");
  assert.deepEqual(journeyMarks({ status: "confirmed", confirmedSent: true }),
    ["done", "done", "now", "todo", "todo", "todo"]);
  assert.deepEqual(journeyMarks({ status: "confirmed", confirmedSent: false }),
    ["done", "now", "todo", "todo", "todo", "todo"], "selecting Confirmed but not yet sent");
});

test("journey marks: Paid completes only once payment is received", () => {
  assert.deepEqual(journeyMarks({ status: "paid" }),
    ["done", "done", "done", "now", "todo", "todo"], "absent flag = payment received");
  assert.deepEqual(journeyMarks({ status: "paid", paidReceived: true }),
    ["done", "done", "done", "now", "todo", "todo"]);
  assert.deepEqual(journeyMarks({ status: "paid", paidReceived: false }),
    ["done", "done", "now", "todo", "todo", "todo"], "payment received not yet marked");
});

test("journey marks: later stages green on selection, Delivered ends all green", () => {
  assert.deepEqual(journeyMarks({ status: "baking" }),
    ["done", "done", "done", "done", "now", "todo"]);
  assert.deepEqual(journeyMarks({ status: "ready" }),
    ["done", "done", "done", "done", "done", "now"]);
  assert.deepEqual(journeyMarks({ status: "delivered" }),
    ["done", "done", "done", "done", "done", "done"]);
  assert.deepEqual(journeyMarks({}),
    ["done", "now", "todo", "todo", "todo", "todo"], "a missing status reads as New");
});

const inboxState = {
  products: [{ id: "p1", name: "Focaccia", active: true }],
  deliveryDates: [
    { id: "d1", date: "2026-09-04" },
    { id: "d2", date: "2026-09-07" },
  ],
  orders: [
    // Oldest first (by createdAt) — this one is orphaned: its date was deleted.
    { id: "o3", status: "new", groupId: "g3", deliveryDateId: "del_gone", productId: "p1", qty: 3, customerName: "Orphan", createdAt: "2026-09-01T08:00:00", orderDate: "2026-09-01" },
    { id: "o2", status: "new", groupId: "g2", deliveryDateId: "d2", productId: "p1", qty: 1, customerName: "Maya", createdAt: "2026-09-01T09:00:00", orderDate: "2026-09-01" },
    { id: "o1", status: "new", groupId: "g1", deliveryDateId: "d1", productId: "p1", qty: 2, customerName: "Ain", createdAt: "2026-09-01T10:00:00", orderDate: "2026-09-01" },
  ],
};

test("filterOrderGroups matches the group's displayed status, not any single item", () => {
  // A storefront order shows ONE status (its first item's) and that status
  // applies to the whole group. Matching "any item" would make a mixed-status
  // leftover group appear under every filter — e.g. a Delivered order still
  // showing when "New" is selected.
  const mixed = { orders: [{ id: "a", status: "delivered" }, { id: "b", status: "new" }] };
  const all = [mixed, { orders: [{ id: "c", status: "new" }] }, { orders: [{ id: "d", status: "delivered" }] }];

  assert.equal(filterOrderGroups(all, "").length, 3, "no filter shows everything");
  assert.deepEqual(filterOrderGroups(all, "new").map((g) => g.orders[0].id), ["c"], "only the group displayed as New");
  assert.deepEqual(filterOrderGroups(all, "delivered").map((g) => g.orders[0].id), ["a", "d"], "both groups displayed as Delivered");
});

test("applyGroupPatch edits the whole multi-item order (details + per-item qty)", () => {
  const orders = [
    { id: "a", qty: 2, customerName: "Old", whatsapp: "", fulfillment: "collect", address: "", note: "", orderDate: "2026-09-01" },
    { id: "b", qty: 1, customerName: "Old", whatsapp: "", fulfillment: "collect", address: "", note: "", orderDate: "2026-09-01" },
  ];
  const patch = {
    customerName: "Ain",
    whatsapp: "60123456789",
    fulfillment: "courier",
    address: "12 Jalan Bunga",
    note: "No onions",
    orderDate: "2026-09-02",
  };
  applyGroupPatch(orders, patch, (id) => (id === "a" ? 4 : 3));
  assert.deepEqual(orders[0], { id: "a", qty: 4, ...patch });
  assert.deepEqual(orders[1], { id: "b", qty: 3, ...patch });
});

test("newOrdersInbox returns null when there are no new orders", () => {
  const inbox = newOrdersInbox({ orders: [], deliveryDates: [], products: [] }, () => {});
  assert.equal(inbox, null);
});

test("newOrdersInbox lists every new order with a ✕ remove button, orphans included", () => {
  const inbox = newOrdersInbox(inboxState, () => {});
  assert.ok(inbox, "inbox renders when new orders exist");

  const rows = inbox.children[2].children; // .inbox-list
  assert.equal(rows.length, 3, "one row per new order group");

  // Orphaned order: no date to open, so it's a plain row — but still removable.
  const orphanRow = rows[0];
  assert.equal(orphanRow.children[0].tagName, "SPAN", "orphan row is not a link");
  assert.equal(orphanRow.children[0].attrs.href, undefined, "orphan row has no href");
  assert.equal(orphanRow.children[0].children[1].children.length, 1, "no arrow on an orphan row");

  // Normal order: navigates to its delivery date.
  const normalRow = rows[2]; // o1 → d1
  assert.equal(normalRow.children[0].tagName, "A");
  assert.equal(normalRow.children[0].attrs.href, "#/orders?date=d1");
  assert.equal(typeof normalRow.children[0]._listeners.click[0], "function");

  // Every row — normal or orphan — carries a working ✕.
  for (const row of rows) {
    const del = row.children[row.children.length - 1];
    assert.equal(del.className, "inbox-del");
    assert.equal(del.attrs["aria-label"], "Remove order");
    assert.equal(del.children[0].text, "✕");
    assert.equal(typeof del._listeners.click[0], "function");

    // And its own order-code tag (#…) inside the title line, so every inbox
    // order can be matched back to its WhatsApp message.
    const title = row.children[0].children[0].children[0]; // inbox-main → .li-main → .li-title
    const code = (title.children || []).find((c) => String(c.className || "").includes("ord-code"));
    assert.ok(code, "title line carries the order code tag");
    assert.ok(String(code.children[0].text || "").startsWith("#"), "tag reads like #A3F9C2");
  }
});
