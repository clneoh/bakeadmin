// admin/js/health.js — the app's own checks on HER data (v446).
//
// WHY THIS EXISTS. Her question, and she says she always asks it:
//
//   __"is the system robust enough in many ways. What measure, what test, we can do to effectively
//   measure it?"__
//
// ⚠️⚠️ AND ON 11 OCT 2026 HER APP HAD 3,335 PASSING TESTS WHILE THREE PAID ORDERS WERE MISSING. Those
// tests check **what the code does**, and everything they were pointed at worked correctly. **Her loss
// was a fact about her DATA, and nothing in this app had ever looked at her data.** ⭐ So "the tests pass"
// is not a measure of robustness, and this module is the other kind: it reads what she actually has.
//
// ⭐ ROBUSTNESS HAS TWO HALVES — DETECTION AND RECOVERY. v444 gave her RECOVERY (a removed order is kept
// and can be put back). **This is detection**, and it was the missing half.
//
// ⚠️⚠️ THE RULE THIS MODULE IS BUILT ON, AND IT IS THE REGISTER'S OWN OLDEST RULE: **a check that could
// not run must NEVER report as a pass.** Every result is `pass`, `fail` or **`skipped`** — and a skipped
// check says why. A verdict that counted "I could not look" as "it is fine" would be worse than no verdict
// at all, because she would stop looking. ([[feedback-repeat-bug-reports]] in a new dress.)
//
// ⚠️ AND IT NEVER NAMES A CAUSE. It reports what it found and what it means. What removed an order is not
// knowable from the data that is left — which is the whole reason v444 keeps a copy of it.

import { byId, codeFromId, groupOrders, orderCode, orderLinePrice } from "./state.js";
import { isCollected } from "./money.js";
import { receiptNoOfGroup } from "./receipts.js";

// The order-level facts every row of ONE order must agree on. ⚠️ DELIBERATELY NOT THE PER-LINE ONES —
// `qty`, `unitPrice`, `unitCost` and `lineNote` are each row's own business, and a check that flagged
// them would cry wolf on every ordinary multi-item order.
const ORDER_LEVEL = [
  "status", "paidReceived", "paidMethod", "customerName", "whatsapp", "fulfillment", "address",
  "pointId", "note", "trackingNo", "courierDay", "deliveryWindow", "pickupTime", "orderDate",
  "groupId", "receiptNo", "promo", "referredBy",
];

// ⚠️ EVERY CHECK REPORTS A MEANING, NOT A COUNT. "3 rows disagree" is a number she cannot act on; the
// `why` says what it is and the `fix` says what she can do about it. A check that only says "failed" is
// a check she learns to ignore.
const pass = (id, title) => ({ id, title, status: "pass", count: 0 });
const fail = (id, title, detail, why, fix) =>
  ({ id, title, status: "fail", count: detail.length, detail, why, fix });
const skipped = (id, title, why) => ({ id, title, status: "skipped", count: 0, why });

// ── the checks that need only this phone ────────────────────────────────────

export function localChecks(state) {
  const orders = Array.isArray(state && state.orders) ? state.orders : [];
  const shelf = Array.isArray(state && state.removedOrders) ? state.removedOrders : [];
  const days = Array.isArray(state && state.deliveryDates) ? state.deliveryDates : [];
  const out = [];

  // ── 1 · no order appears twice ──────────────────────────────────────────
  {
    const seen = new Map();
    for (const o of orders) if (o && o.id) seen.set(o.id, (seen.get(o.id) || 0) + 1);
    const dup = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => `#${codeOf({ id })}`);
    out.push(dup.length
      ? fail("dup", "No order appears twice", dup,
        "The same order is in your list more than once, so its bread is counted twice and its money reads as two sales.",
        "Open each of these and remove the extra one. It will be kept on the Removed list, so nothing is lost by trying.")
      : pass("dup", "No order appears twice"));
  }

  // ── 2 · nothing is on both lists at once ────────────────────────────────
  {
    const live = new Set(orders.filter(Boolean).map((o) => o.id));
    const both = shelf.filter((r) => r && live.has(r.id)).map((r) => `#${codeOf(r)}`);
    out.push(both.length
      ? fail("both", "Nothing is on the orders list and the Removed list at once", both,
        "An order is in your live list AND on the Removed list. Its bread may be counted once by the kitchen and once as gone.",
        "Press Run again in a moment. If it stays, open the order and save it — that settles which list it belongs to.")
      : pass("both", "Nothing is on the orders list and the Removed list at once"));
  }

  // ── 3 · every order sits on a real bake day ─────────────────────────────
  {
    const bad = orders.filter((o) => o && !(o.deliveryDateId && byId(days, o.deliveryDateId)));
    out.push(bad.length
      ? fail("day", "Every order sits on a real bake day", bad.map((o) => `#${codeOf(o)}`),
        "These orders are not on any bake day you have, so no Orders screen can show them — they are in your data and invisible.",
        "Open the Removed list, or find each order by its number in the Orders search box, and set its bake day.")
      : pass("day", "Every order sits on a real bake day"));
  }

  // ── 4 · every line of one order agrees about the order ──────────────────
  {
    const groups = groupOrders(orders).filter((g) => g.orders.length > 1);
    const bad = [];
    for (const g of groups) {
      const first = g.orders[0];
      for (const field of ORDER_LEVEL) {
        if (g.orders.some((o) => JSON.stringify(o[field]) !== JSON.stringify(first[field]))) {
          bad.push(`#${orderCode(first)} · ${field}`);
          break;
        }
      }
    }
    out.push(bad.length
      ? fail("agree", "Every line of one order agrees about the order", bad,
        "One order's lines disagree about something that belongs to the whole order — the money, the status, the day or the address. That is the shape of every fault this app has had on this screen.",
        "Open each of these orders and press Save. That writes one answer onto every line.")
      : pass("agree", "Every line of one order agrees about the order"));
  }

  // ── 5 · every line of one order wears the same number ───────────────────
  {
    const groups = groupOrders(orders).filter((g) => g.orders.length > 1);
    const bad = groups.filter((g) => new Set(g.orders.map((o) => orderCode(o))).size > 1);
    out.push(bad.length
      ? fail("code", "Every line of one order wears the same order number", bad.map((g) => `#${orderCode(g.orders[0])}`),
        "One order is wearing more than one number, so a receipt or a WhatsApp message can point at half of it.",
        "Open the order and press Save. Its lines are then numbered together.")
      : pass("code", "Every line of one order wears the same order number"));
  }

  // ── 6 · no PAID order has a line nothing can price ──────────────────────
  {
    const bad = [];
    for (const g of groupOrders(orders)) {
      if (!isCollected(g)) continue;
      const un = g.orders.filter((o) => o && o.productId && orderLinePrice(state, o) == null);
      if (un.length) bad.push(`#${orderCode(g.orders[0])}`);
    }
    out.push(bad.length
      ? fail("price", "Every paid order can be priced", bad,
        "Money was recorded on these orders but a line on them has no price, so what the customer paid for is not knowable from the order.",
        "Open each order and type the price that line was sold at, then Save.")
      : pass("price", "Every paid order can be priced"));
  }

  // ── 7 · the Removed list says when each row came off ────────────────────
  {
    const bad = shelf.filter((r) => r && !r.removedAt);
    out.push(bad.length
      ? fail("shelf", "Every removed order says when it came off", bad.map((r) => `#${codeOf(r)}`),
        "A row on the Removed list has no date on it, so the list cannot be trusted to say how old it is.",
        "Nothing to do — this one is the app's own bookkeeping and tells us the list was written by an older version.")
      : pass("shelf", "Every removed order says when it came off"));
  }

  return out;
}

// ── the checks that need the register (shared data) ─────────────────────────

// `register` is the rows `pullReceiptRegister` returns, or null when it could not be read — and
// ⚠️ NULL MEANS SKIPPED, NEVER PASSED. That distinction is the whole reason this file has three states.
export function registerChecks(state, register, voided) {
  const orders = Array.isArray(state && state.orders) ? state.orders : [];
  const shelf = Array.isArray(state && state.removedOrders) ? state.removedOrders : [];
  if (!Array.isArray(register)) {
    return [
      skipped("hasOrder", "Every receipt has an order behind it", "Your receipts could not be read from the cloud — sign in to shared data and run this again."),
      skipped("carried", "Every receipt's number is on the order it names", "Your receipts could not be read from the cloud — sign in to shared data and run this again."),
    ];
  }

  // ⚠️ THE SAME TWO NUMBERS THE REGISTER ITSELF MATCHES ON — the one an order wears today, and the one
  // it wore before it was grouped (v441). A check that only knew the first would report a false fault on
  // every order that has ever gained an item.
  const live = new Map();
  const groups = new Map();
  for (const g of groupOrders(orders)) {
    const first = g.orders[0];
    if (!first) continue;
    for (const key of [orderCode(first), codeFromId(first)]) {
      if (key && key !== "??????") { live.set(key, first); groups.set(key, g); }
    }
  }
  const removedCodes = new Set();
  for (const r of shelf) {
    for (const key of [orderCode(r), codeFromId(r)]) if (key && key !== "??????") removedCodes.add(key);
  }

  // ── 8 · every receipt has an order behind it (or one on the Removed list) ──
  {
    // ⚠️ A RECEIPT FOR AN ORDER ON THE REMOVED LIST IS **NOT** A FAULT — that is the v444 shelf doing
    // exactly its job. ⭐ AND NEITHER IS ONE SHE HAS DECLARED VOID (v448): **a recorded decision is not an
    // unexplained hole.** ⚠️ Without this the check could never go green on those rows, and **a warning
    // that can never be satisfied is one she learns to ignore** — which would cost her the whole page.
    const voidedNos = new Set((Array.isArray(voided) ? voided : [])
      .map((v) => Math.floor(Number(v && v.no))).filter((n) => Number.isFinite(n) && n > 0));
    const bad = register
      .filter((r) => !voidedNos.has(Math.floor(Number(r && r.number))))
      .map((r) => String((r && r.order_code) || "").trim().toUpperCase())
      .filter((c) => c && !live.has(c) && !removedCodes.has(c));
    return [
      bad.length
        ? fail("hasOrder", "Every receipt has an order behind it", bad.map((c) => `#${c}`),
          "A receipt was issued for money you took, and there is no order wearing that number on this phone or on the Removed list. The receipt stands and the money is recorded — but the order behind it is not here.",
          "Search WhatsApp for the number printed on the receipt: the confirmation you sent names the customer. Enter the order again by hand.")
        : pass("hasOrder", "Every receipt has an order behind it"),
      // ── 9 · every receipt's number is carried by the order it names ────────
      (() => {
        const wrong = [];
        for (const r of register) {
          const code = String((r && r.order_code) || "").trim().toUpperCase();
          const g = groups.get(code);
          if (!g) continue;
          const has = receiptNoOfGroup(g.orders);
          const want = String(Math.floor(Number(r && r.number))).padStart(6, "0");
          if (has !== want) wrong.push(`#${code} · receipt #${want}, order says ${has ? `#${has}` : "none"}`);
        }
        return wrong.length
          ? fail("carried", "Every receipt's number is on the order it names", wrong,
            "A number was issued for these orders and the order is not carrying it, so your filing page can print \"none yet\" beside a receipt your register can name in full.",
            "Open the order's own receipt — or open the order and press Save, then Paid again. Either way the app asks for the number again and gets back the SAME one, never a new one.")
          : pass("carried", "Every receipt's number is on the order it names");
      })(),
    ];
  }
}

// ── the check on her own safety net ─────────────────────────────────────────

// `copies` is `backups.listBackups`' rows, or null when it could not be read.
export function copyChecks(copies, now = new Date()) {
  if (!Array.isArray(copies)) {
    return [skipped("copies", "Your saved copies are recent and readable",
      "Your saved copies could not be read — sign in to shared data and run this again.")];
  }
  if (!copies.length) {
    return [fail("copies", "Your saved copies are recent and readable", ["none"],
      "This phone holds no saved copy of your data at all, so there is nothing to go back to if something goes wrong.",
      "Open the app with shared data on — a copy is saved every day you open it.")];
  }
  const newest = copies
    .map((r) => String((r && r.created_at) || ""))
    .filter(Boolean)
    .sort()
    .pop() || "";
  const ageDays = newest ? Math.floor((now.getTime() - new Date(newest).getTime()) / 86400000) : Infinity;
  // ⚠️ THREE DAYS, because a copy is written on the days she OPENS the app: a bakery that has not opened
  // it in three days has no recent copy, and the day it matters is the day it is missing.
  return [ageDays > 3
    ? fail("copies", "Your saved copies are recent and readable", [newest ? `newest ${newest.slice(0, 10)}` : "none"],
      `Your newest saved copy is ${Number.isFinite(ageDays) ? `${ageDays} days old` : "missing"}. If an order goes missing now, there is little to go back to.`,
      "Open the app with shared data on — a copy is saved every day you open it.")
    : pass("copies", "Your saved copies are recent and readable")];
}

// ── the check that would have caught HER loss on the day it happened ────────

// `copy` is the PARSED data of one saved copy (or null when it could not be opened), and `when` is that
// copy's own date, for the words. ⚠️ NULL MEANS SKIPPED, NEVER PASSED — the same rule as everywhere here.
//
// ⚠️⚠️ WHY THIS EXISTS, AND WHY IT IS THE HALF THAT WAS STILL MISSING. v444 made a removal recoverable and
// v446 taught the app to look at her records — but every check so far compares **one part of her live data
// against another part of her live data**. ⭐ **If an order leaves, both sides leave together and every
// check stays green.** ⭐⭐ A SAVED COPY IS THE ONLY THING IN THE APP THAT REMEMBERS WHAT WAS THERE BEFORE
// — so it is the only thing that can see an order disappear.
//
// ⭐ AND THE COPY CARRIES THE REMOVED LIST TOO, because `removedOrders` is itself a synced list. So a copy
// is a complete picture of one moment: what was live, and what had been taken off. **That is what makes a
// comparison possible without guessing.**
//
// ⚠️ THE LIMIT, SAID OUT LOUD, because a check that cries wolf is a check she stops reading: an order
// removed by hand **before v444 kept a Removed list** has no row to explain it, and it looks exactly like a
// loss. Those copies age out of the window within about a week, so this settles by itself — and the `why`
// below says so rather than leaving her to work it out.
export function backupChecks(state, copy, when = "") {
  const TITLE = "No order has left this phone's list without a trace";
  if (!copy || typeof copy !== "object") {
    return [skipped("stable", TITLE,
      "Your saved copies could not be opened — sign in to shared data and run this again.")];
  }
  // ⚠️ BOTH WAYS AN ORDER CAN BE RECOGNISED, exactly as `registerChecks` does it: the code it wears today
  // and the one it wore before it was grouped (v441). A check that knew only the first would report a
  // false loss for every order that has ever gained an item.
  const codesOf = (list) => {
    const s = new Set();
    for (const o of Array.isArray(list) ? list : []) {
      if (!o) continue;
      for (const k of [orderCode(o), codeFromId(o)]) if (k && k !== "??????") s.add(k);
    }
    return s;
  };
  const here = codesOf(state && state.orders);
  const shelf = codesOf(state && state.removedOrders);
  const shelfThen = codesOf(copy.removedOrders);
  // ⚠️ AND THE COPY'S OWN LIST COUNTS: an order she took off a week ago, whose shelf row has since been
  // pruned, is still explained by the copy that was written while it was on the shelf.
  const missing = [...codesOf(copy.orders)]
    .filter((c) => !here.has(c) && !shelf.has(c) && !shelfThen.has(c))
    .sort();

  return [missing.length
    ? fail("stable", TITLE, missing.map((c) => `#${c}`),
      `The copy saved on ${when || "an earlier day"} holds ${missing.length === 1 ? "an order" : "orders"} that this phone no longer has — and ${missing.length === 1 ? "it is" : "they are"} not on the Removed list either, so the app did not take ${missing.length === 1 ? "it" : "them"} off by any route it knows. A removal made before the Removed list existed would look the same, so check the dates before worrying.`,
      "Open Backup and safety and put that copy back if these are orders you took, or search WhatsApp for the number and enter the order again by hand.")
    : pass("stable", TITLE)];
}

// ── the check that asks whether this phone's records REACHED the other one ───

// `cloud` is `sync.cloudKeys`' answer — `{ ok, keys }` or a reason — and `local` is `sync.localKeys`' list
// of everything this phone holds. ⚠️ NULL/UNREADABLE MEANS SKIPPED, NEVER PASSED, as everywhere here.
//
// ⚠️⚠️ WHY THIS EXISTS. Her report: __"i add a bake date 10/10, other user dont see it"__, and before it
// __"why my other user dont see some order that is on my device?"__. ⭐ **EVERY CHECK IN THIS APP COMPARED
// THIS PHONE WITH ITSELF** — its own lists, its own copies, its own receipts. ⭐⭐ **Nothing had ever asked
// the one question her report is about: is what is on this phone actually IN the shared data?**
// ⚠️ And the journal records a change as handed over when it is QUEUED, not when it leaves — so a change
// whose queue was lost would sit here for ever with nothing to say so. **This is what says so.**
export function reachedCloudCheck(state, cloud, local) {
  const TITLE = "Everything on this phone has reached your shared data";
  if (!cloud || !cloud.ok) {
    return [skipped("reached", TITLE,
      (cloud && cloud.reason) || "Your shared data could not be read — sign in and run this again.")];
  }
  const held = cloud.keys instanceof Set ? cloud.keys : new Set(Array.isArray(cloud.keys) ? cloud.keys : []);
  const missing = (Array.isArray(local) ? local : []).filter((k) => !held.has(k));
  // ⭐ NAMED THE WAY SHE CAN LOOK THEM UP — an order by its number, a bake day by its date.
  const nameOf = (key) => {
    const at = String(key).indexOf(":");
    const kind = String(key).slice(0, at);
    const id = String(key).slice(at + 1);
    if (kind === "orders") return `#${codeOf({ id })}`;
    if (kind === "deliveryDates") {
      const d = (state && state.deliveryDates || []).find((x) => x && x.id === id);
      return d && d.date ? `bake day ${d.date}` : "a bake day";
    }
    return kind;
  };
  return [missing.length
    ? fail("reached", TITLE, missing.map(nameOf),
      "These are on this phone and NOT in your shared data, so no other phone can see them. The record itself is safe here — what is missing is the hand-over.",
      "Open Settings → Shared data and press Sync now, then run this check again. If they are still missing after that, the change was lost on its way out.")
    : pass("reached", TITLE)];
}

// ── and the SAME QUESTION THE OTHER WAY ROUND ────────────────────────────────

// Her instruction: __"build the reverse check"__ — asked while two orders sat in her 6 October copy and
// on **neither** device, ⚠️ **and I could not tell her whether they were still in the shared data.**
//
// ⭐⭐ **THE CHECK ABOVE GOES THIS PHONE → THE SHARED DATA.** This one goes **THE SHARED DATA → THIS
// PHONE**: is there anything in the shared data that is NOT here? ⭐ **That is the difference between a
// record that is LOST and a record that is merely not yet pulled** — and it is the question that could not
// be answered at all until now.
//
// ⚠️⚠️ AND IT MUST NOT CRY WOLF. **An order she removed on purpose is gone from this phone and its row
// stays in the shared data until the tombstone lands** — so **anything on this phone's own Removed list is
// excluded**, the same carve-out the receipt check makes. ⭐ A warning that fires on a deliberate removal is
// one she learns to ignore.
export function cloudOnlyCheck(state, cloud, local) {
  const TITLE = "Nothing is sitting in your shared data that is not on this phone";
  if (!cloud || !cloud.ok) {
    return [skipped("cloudOnly", TITLE,
      (cloud && cloud.reason) || "Your shared data could not be read — sign in and run this again.")];
  }
  const held = cloud.keys instanceof Set ? cloud.keys : new Set(Array.isArray(cloud.keys) ? cloud.keys : []);
  const here = new Set(Array.isArray(local) ? local : []);
  // ⚠️ THE SHELF IS THE EXPLANATION FOR A RECORD THAT IS NOT IN THE LIVE LIST, so it is allowed for.
  const shelf = new Set();
  for (const r of (state && state.removedOrders) || []) {
    if (r && r.id) { shelf.add(`orders:${r.id}`); shelf.add(`orders:${codeOf(r)}`); }
  }
  const extra = [...held].filter((k) => !here.has(k) && !shelf.has(k));
  const nameOf = (key) => {
    const at = String(key).indexOf(":");
    const kind = String(key).slice(0, at);
    const id = String(key).slice(at + 1);
    if (kind === "orders") return `#${codeFromId({ id })}`;
    return kind;
  };
  return [extra.length
    ? fail("cloudOnly", TITLE, extra.map(nameOf),
      `${extra.length} record${extra.length === 1 ? " is" : "s are"} in your shared data and NOT on this phone — so ${extra.length === 1 ? "it is" : "they are"} either waiting to come down, or sitting only on your other device. Either way ${extra.length === 1 ? "it is" : "they are"} NOT lost.`,
      "Press Sync now on this phone — a record held in your shared data comes down on the next sync. If it stays here after that, open the other device and check there.")
    : pass("cloudOnly", TITLE)];
}

// ★ AND WHAT IS STILL WAITING TO LEAVE (v466). ⚠️ **THIS IS THE NUMBER THAT DECIDED WHETHER THE PAGE ABOVE
// IS A FAULT OR A PHOTOGRAPH OF A PHONE MID-SEND** — and until now nothing could show it at all. ⭐ It needs
// no network: it is a local count.
export function waitingCheck(waiting = 0) {
  const TITLE = "Nothing on this phone is still waiting to be sent";
  const n = Number.isFinite(Number(waiting)) ? Math.max(0, Math.floor(Number(waiting))) : 0;
  return [n > 0
    ? fail("waiting", TITLE, [`${n} change${n === 1 ? "" : "s"}`],
      `${n} change${n === 1 ? " is" : "s are"} on this phone and ${n === 1 ? "has" : "have"} not been handed to your shared data yet, so no other phone can see ${n === 1 ? "it" : "them"}. If this number does not go down on its own, press Sync now.`,
      "Open Settings → Shared data and press Sync now. If the number stays, this phone's sending queue needs looking at — and the records themselves are safe.")
    : pass("waiting", TITLE)];
}

// ── and the whole verdict, in one shape the screen can draw ─────────────────

// ⚠️ `register`, `copies` and `copy` absent = SKIPPED, and a skipped check is counted ON ITS OWN, never
// folded into the passes. The headline the screen draws is built from these three numbers and nothing else.
export function runHealthChecks(state, extra = {}) {
  const results = [
    ...localChecks(state),
    ...registerChecks(state, extra.register, state && state.voidedReceipts),
    ...copyChecks(extra.copies),
    ...backupChecks(state, extra.copy, extra.copyWhen),
    ...reachedCloudCheck(state, extra.cloud, extra.local),
    ...cloudOnlyCheck(state, extra.cloud, extra.local),
    ...waitingCheck(extra.waiting),
  ];
  return {
    results,
    failed: results.filter((r) => r.status === "fail").reduce((s, r) => s + r.count, 0),
    failedChecks: results.filter((r) => r.status === "fail").length,
    passedChecks: results.filter((r) => r.status === "pass").length,
    skippedChecks: results.filter((r) => r.status === "skipped").length,
    total: results.length,
  };
}

const codeOf = (o) => orderCode(o);
