// views/health.js — the screen she runs herself: "Check my system" (v446).
//
// HER QUESTION, and she says she always asks it: __"is the system robust enough in many ways. What measure,
// what test, we can do to effectively measure it?"__
//
// ⚠️⚠️ AND THE REASON THERE IS A SCREEN AND NOT JUST A FILE OF CHECKS: **a measure she cannot run is not a
// measure for her.** On 11 Oct 2026 this app had 3,335 passing tests while three of her paid orders were
// missing — because every one of those tests checks what the CODE does, and her loss was a fact about her
// DATA. The checks are in `health.js`; **this is the surface that lets her look.**
//
// ⚠️ THE VERDICT IS THREE NUMBERS, NEVER ONE. Passed, FAILED, and **could not run** — because a check that
// could not look must never be counted as fine. See the long note in `health.js`; the same rule the receipt
// register follows for an unreadable run.

import { el, button } from "../ui.js";
import { runHealthChecks } from "../health.js";
import { pullReceiptRegister } from "../supabase.js";
import * as backups from "../backups.js";

const MARK = { pass: "✓", fail: "✗", skipped: "—" };

// ⚠️ `(root, state)` — THE APP'S ORDER, the one the router calls every screen with (`viewEl, state,
// params`). Written the other way round first, and the smoke pass caught it by name.
export function renderHealth(root, state) {
  let dead = false;

  const card = el("div", { class: "card" });
  const list = el("div", { class: "card" });

  function verdictLine(res, when) {
    if (!res) return "Nothing has been checked yet on this phone.";
    // ⚠️ PLAIN TEXT — `el` draws a string as-is, so markdown here would print its own asterisks.
    const bits = [`${res.total} checks`];
    bits.push(res.failedChecks ? `${res.failedChecks} FAILED` : "none failed");
    if (res.skippedChecks) bits.push(`${res.skippedChecks} could not run`);
    return `${bits.join(" · ")}${when ? ` · ${when}` : ""}`;
  }

  function paint(res) {
    card.replaceChildren(
      el("h3", { style: "margin:0 0 2px" }, "System check"),
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "Reads the records on this phone, and your receipts and saved copies in your shared data."),
      el("p", { class: "hc-verdict" }, verdictLine(res, res ? "just now" : "")),
      el("div", { class: "btn-row", style: "margin:0" },
        button("Run the check", () => run(false), "primary")),
      res && res.skippedChecks
        ? el("p", { class: "card-sub", style: "margin:10px 0 0" },
            "⚠️ A check that could not look is counted on its own — never as a pass. Sign in to shared data, "
            + "then run this again.")
        : null);
  }

  function paintList(res) {
    if (!res) return list.replaceChildren();
    const rows = res.results.map((r) => el("div", { class: `hc-row ${r.status}` },
      el("div", { class: "hc-head" },
        el("span", { class: "hc-mark" }, MARK[r.status] || "?"),
        el("span", { class: "hc-title" }, r.title),
        r.count ? el("span", { class: "hc-count" }, `${r.count}`) : null),
      r.status === "pass" ? null : el("p", { class: "hc-why" }, r.why),
      r.status === "fail" && r.fix ? el("p", { class: "hc-fix" }, r.fix) : null,
      // ⚠️ THE THINGS THEMSELVES, NAMED. A count she cannot look up is a number she cannot act on — every
      // failing check carries the rows it is about, by order number, so each one can be found.
      r.detail && r.detail.length
        ? el("p", { class: "hc-detail" }, r.detail.slice(0, 12).join(" · ")
            + (r.detail.length > 12 ? ` · and ${r.detail.length - 12} more` : ""))
        : null));
    list.replaceChildren(
      el("h3", { style: "margin:0 0 8px" }, "What each check found"),
      ...rows);
  }

  async function run(again) {
    if (run.busy) return;
    run.busy = true;
    paint(null);
    paintList(null);
    list.replaceChildren(el("p", { class: "card-sub" }, "Reading your records, your receipts and your copies…"));

    // ⚠️ EACH SOURCE IS READ SEPARATELY AND PASSED IN AS IT CAME OUT. If the register cannot be read the
    // checks that need it are SKIPPED — never passed — and the same for the copies. One unreadable source
    // must not take the checks that only need this phone down with it.
    const register = await pullReceiptRegister(state).then((r) => (r && r.ok ? r.rows : null)).catch(() => null);
    if (dead) return;
    const copies = await backups.listBackups(state).then((r) => (r && r.ok ? r.rows : null)).catch(() => null);
    if (dead) return;

    const res = runHealthChecks(state, { register, copies });
    run.busy = false;
    paint(res);
    paintList(res);
  }

  const about = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 4px" }, "What this is, and what it is not"),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "Your app has thousands of automatic tests, and on 11 Oct 2026 they were all passing while three of "
      + "your paid orders were missing — because those tests check what the app DOES, and the loss was in "
      + "your RECORDS. This page looks at your records instead."),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "⚠️ It is a floor, not a promise. A check can only find a fault somebody has already described, so "
      + "passing here does not prove your app is perfect — it means none of the known faults are present."),
    el("p", { class: "card-sub", style: "margin:0" },
      "Run it whenever you like. Nothing on this page changes anything: it reads, and writes nothing."));

  paint(null);
  paintList(null);
  root.replaceChildren(card, list, about);
  run(true);
  return () => { dead = true; };
}
