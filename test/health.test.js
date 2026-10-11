// test/health.test.js — the app's own checks on her data (v446).
//
// HER QUESTION, and she says she always asks it: __"is the system robust enough in many ways. What measure,
// what test, we can do to effectively measure it?"__
//
// ⚠️⚠️ AND THE ANSWER THIS FILE EXISTS FOR: on 11 Oct 2026 her app had **3,335 passing tests while three
// PAID orders were missing.** Those tests check what the CODE does; everything they were pointed at worked.
// **Her loss was a fact about her DATA, and nothing looked at her data.** ⭐ So "the tests pass" is not a
// measure of robustness — and the checks below are the other kind.
//
// ⚠️ THE THREE FAULTS THAT COST HER ARE THE FIXTURES, one test each. A check nobody has seen fire is a
// check nobody knows works — and these three have all fired on her phone for real.

import { test } from "node:test";
import assert from "node:assert/strict";

const { runHealthChecks, localChecks, registerChecks, copyChecks } = await import("../admin/js/health.js");

// The smallest book that should come out CLEAN — one order, one bake day, paid, numbered, on the shelf
// nothing, and a register row that agrees with it.
function healthy() {
  return {
    settings: { currency: "RM" },
    products: [{ id: "p1", name: "Focaccia", price: 16, active: true }],
    deliveryDates: [{ id: "d1", date: "2026-10-12" }],
    orders: [{
      id: "ord_a1b2c3d4e5f6", groupId: "ord_a1b2c3d4e5f6", deliveryDateId: "d1",
      deliveryDate: "2026-10-12", productId: "p1", qty: 3, unitPrice: 16, status: "paid",
      paidReceived: true, paidMethod: "cash", customerName: "Jien", whatsapp: "60123456789",
      receiptNo: 7,
    }],
    removedOrders: [],
  };
}
const REGISTER = [{ number: 7, order_code: "D4E5F6", issued_at: "2026-10-11T08:25:00.000Z" }];
const COPIES = [{ id: "s1", kind: "daily", created_at: new Date().toISOString() }];
const resultOf = (res, id) => res.results.find((r) => r.id === id);

test("★★ a healthy book passes every check — and every check actually RAN", () => {
  const res = runHealthChecks(healthy(), { register: REGISTER, copies: COPIES });
  assert.deepEqual(res.results.filter((r) => r.status === "fail").map((r) => `${r.id}: ${r.why}`), [],
    "a healthy book was reported as having a fault");
  assert.deepEqual(res.results.filter((r) => r.status === "skipped").map((r) => r.id), [],
    "a check was skipped on a book and a register that were both readable");
  // ⚠️ THE COUNT IS THE POINT. `[].every(...)` is TRUE — a check list that had quietly emptied itself
  // would pass every assertion above, on a phone with no checks at all. This project has been bitten by
  // that exact shape before (v381's doors).
  assert.equal(res.total, 10, `the check list is no longer ten checks (it is ${res.total})`);
  assert.equal(res.passedChecks, 10);
  assert.equal(res.failed, 0);
});

test("★★ a receipt with no order behind it FAILS — the fault that cost her three orders", () => {
  // ⚠️ THIS IS HER 11 OCT: three receipts issued for orders that are not on the phone. Both screens showed
  // the row and neither could say whether the order was gone or merely unread.
  const st = healthy();
  const register = [...REGISTER, { number: 9, order_code: "D06D27", issued_at: "2026-10-11T08:25:00.000Z" }];
  const res = runHealthChecks(st, { register, copies: COPIES });
  const r = resultOf(res, "hasOrder");
  assert.equal(r.status, "fail", "★ a receipt with no order behind it was not reported");
  assert.deepEqual(r.detail, ["#D06D27"], "the failing receipt was not named");
  assert.match(r.why, /receipt stands and the money is recorded/i, "the check does not say what it means");
  assert.match(r.fix, /WhatsApp/i, "the check does not say what she can do about it");

  // ⭐ AND AN ORDER ON THE REMOVED LIST IS **NOT** A FAULT — that is the v444 shelf doing its job.
  const shelf = healthy();
  shelf.orders = [];
  // ⚠️ THE ID MUST HASH TO THE RECEIPT'S CODE, or this asserts nothing: `orderCode` is the last six hex
  // characters of the id, and `ord_a1b2d06d27` gives `D06D27`.
  shelf.removedOrders = [{ id: "ord_a1b2d06d27", removedAt: new Date().toISOString(),
    productId: "p1", qty: 2, deliveryDateId: "d1", deliveryDate: "2026-10-12" }];
  // ⚠️ THE REGISTER HERE HOLDS ONLY THAT ONE RECEIPT. The healthy order is deliberately not in this book,
  // so its own receipt would be unaccounted for — and this check would fail for a second, unrelated reason.
  const oneRow = [{ number: 9, order_code: "D06D27", issued_at: "2026-10-11T08:25:00.000Z" }];
  assert.equal(resultOf(runHealthChecks(shelf, { register: oneRow, copies: COPIES }), "hasOrder").status, "pass",
    "★ an order kept on the Removed list was reported as unaccounted for");
});

test("★★ an order that is not carrying its receipt number FAILS — her #F447EE, on her own screen", () => {
  // ⚠️ HER CONSOLIDATED INVOICE printed "none yet" beside an order her receipt register could name in full.
  // The number had been issued and stamped on a ROW the filing page never read.
  const st = healthy();
  delete st.orders[0].receiptNo;
  const res = runHealthChecks(st, { register: REGISTER, copies: COPIES });
  const r = resultOf(res, "carried");
  assert.equal(r.status, "fail", "★ an order missing the number the register holds for it was not reported");
  assert.match(r.detail[0], /receipt #000007, order says none/,
    `the check did not say what is wrong: ${r.detail[0]}`);
  assert.match(r.why, /none yet/, "the check does not say what she would SEE on the page");
});

test("★★ one order's lines disagreeing about the order FAILS", () => {
  // ⚠️ THE SHAPE OF EVERY FAULT ON THIS SCREEN — v432 (status), v441 (the number), v445 (the receipt no).
  const st = healthy();
  st.orders = [
    { ...st.orders[0], id: "ord_a1b2c3d4e5f6" },
    { ...st.orders[0], id: "ord_a1b2c3d4e5f7", qty: 1, status: "new" },  // disagrees about the STATUS
  ];
  const r = resultOf(runHealthChecks(st, { register: REGISTER, copies: COPIES }), "agree");
  assert.equal(r.status, "fail", "★ a group disagreeing about its own status was not reported");
  assert.equal(r.detail.length, 1, "the disagreeing order was not named once");
  assert.match(r.detail[0], /status/, "the check did not say WHICH fact the lines disagree about");

  // ⚠️ AND A PER-LINE FACT MUST NOT TRIP IT — quantity is each line's own business, and a check that
  // flagged it would cry wolf on every ordinary multi-item order.
  const ok = healthy();
  ok.orders = [
    { ...ok.orders[0], id: "ord_a1b2c3d4e5f6", qty: 3 },
    { ...ok.orders[0], id: "ord_a1b2c3d4e5f7", qty: 1, lineNote: "no nuts" },
  ];
  assert.equal(resultOf(runHealthChecks(ok, { register: REGISTER, copies: COPIES }), "agree").status, "pass",
    "★ a perfectly ordinary two-item order was reported as disagreeing with itself");
});

test("★ an order not on any bake day FAILS — the order that is invisible", () => {
  const st = healthy();
  st.orders[0].deliveryDateId = "d_gone";
  const r = resultOf(runHealthChecks(st, { register: REGISTER, copies: COPIES }), "day");
  assert.equal(r.status, "fail", "★ an order no bake day can show was not reported");
  assert.match(r.fix, /bake day/, "the check does not say what she can do about it");
});

test("★★⚠️ A CHECK THAT COULD NOT RUN IS SKIPPED — IT IS NEVER A PASS", () => {
  // ⚠️⚠️ THE RULE THIS MODULE IS BUILT ON, and the register's own oldest rule: an unreadable register must
  // never be drawn as an empty one. **A verdict that counted "I could not look" as "it is fine" is worse
  // than no verdict**, because she would stop looking.
  const res = runHealthChecks(healthy(), { register: null, copies: null });
  assert.equal(resultOf(res, "hasOrder").status, "skipped", "★ an unreadable register was reported as a pass");
  assert.equal(resultOf(res, "carried").status, "skipped", "★ an unreadable register was reported as a pass");
  assert.equal(resultOf(res, "copies").status, "skipped", "★ unreadable copies were reported as a pass");
  assert.equal(res.passedChecks, 7, "a skipped check was counted among the passes");
  assert.equal(res.skippedChecks, 3, "the skipped checks were not counted separately");
  // ⚠️ AND A SKIP SAYS WHY — the same discipline the register screen follows.
  assert.match(resultOf(res, "hasOrder").why, /shared data/i, "a skipped check does not say why it could not run");

  // And an EMPTY copy list is a real fault, not a skip: there is a difference between "none saved" and
  // "could not read", and the two must not be drawn alike.
  assert.equal(copyChecks([])[0].status, "fail", "no saved copies at all was not reported as a fault");
});

test("★ a stale copy is a fault, because the day it matters is the day it is missing", () => {
  const old = [{ id: "s1", kind: "daily", created_at: "2026-10-01T00:00:00.000Z" }];
  const now = new Date("2026-10-11T12:00:00.000Z");
  assert.equal(copyChecks(old, now)[0].status, "fail", "a ten-day-old copy was reported as fine");
  const fresh = [{ id: "s2", kind: "daily", created_at: "2026-10-11T08:00:00.000Z" }];
  assert.equal(copyChecks(fresh, now)[0].status, "pass", "a copy from this morning was reported as stale");
});

test("★★ no check's words carry markdown — her screen prints it literally (v447)", () => {
  // ⚠️⚠️ SHE SAW IT BEFORE I DID. The first run on her phone printed, in the middle of a sentence:
  // **"**The receipt stands and the money is recorded — but the order behind it is not here.**"** — asterisks
  // and all. `el()` draws a string AS-IS, so markdown in a user-facing sentence is not emphasis, it is
  // punctuation she has to read past. ⭐ **Guard is on the OUTPUT, not on the source**: exercises every
  // failing check and reads what each one actually says, so a check written next year is covered too.
  const st = {
    settings: { currency: "RM" },
    products: [{ id: "p1", name: "Focaccia", price: 16, active: true }],
    deliveryDates: [{ id: "d1", date: "2026-10-12" }],
    orders: [
      { id: "ord_a1b2c3d4e5f6", deliveryDateId: "d_gone", productId: "p1", qty: 1, status: "paid",
        paidReceived: true, customerName: "A", receiptNo: 0 },
      { id: "ord_a1b2c3d4e5f6", deliveryDateId: "d_gone", productId: "p1", qty: 1 },   // a duplicate id
    ],
    removedOrders: [{ id: "ord_a1b2c3d4e5f6" }, { id: "ord_bbbbbbbbbbbb", removedAt: new Date().toISOString() }],
  };
  const res = runHealthChecks(st, { register: [{ number: 1, order_code: "FFFFFF" }], copies: [] });
  assert.ok(res.failedChecks >= 4, `the fixture did not fail enough checks to read their words (${res.failedChecks})`);
  const words = res.results.flatMap((r) => [r.title, r.why, r.fix, ...(r.detail || [])]).filter(Boolean);
  const withMarkup = words.filter((w) => /\*\*|__/.test(w));
  assert.deepEqual(withMarkup, [],
    `★ a check's own words carry markdown, which her screen prints as punctuation: ${withMarkup.join(" | ")}`);
  // ⚠️ AND THE FIX MUST ALWAYS BE THERE when a check fails — a fault with no way out is a dead end.
  for (const r of res.results.filter((x) => x.status === "fail")) {
    assert.ok(r.why, `${r.id} failed without saying what it means`);
    assert.ok(r.fix, `${r.id} failed without saying what she can do about it`);
  }
});

test("⚠️ a phone with no orders at all is checked without throwing", () => {
  const bare = { settings: { currency: "RM" }, products: [], deliveryDates: [], orders: [], removedOrders: [] };
  const res = runHealthChecks(bare, { register: [], copies: COPIES });
  assert.equal(res.failed, 0, "an empty book reported a fault");
  assert.equal(res.total, 10, "the checks did not all run on an empty book");
  assert.equal(localChecks(bare).length, 7, "the local checks are not seven");
  assert.equal(registerChecks(bare, []).length, 2, "the register checks are not two");
});
