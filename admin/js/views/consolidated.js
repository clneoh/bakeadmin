// views/consolidated.js — one invoice over a period (v372).
//
// Her words: __"i need a month consolidated invoice printing page, selectable individual, daily,
// monthly"__ — and asked what one document should cover: __"per day, per week, per month, per
// customer as well"__.
//
// ⚠️ IT DRAWS A SHEET AND PRINTS IT, and that is the whole of it: `journalBodyEl` for the screen and
// `journalButtons` for Print and Share. **No second way onto paper.** A page that built its own
// printout would be a second rendering of the same figures, which is how a screen and its printout
// start disagreeing.

import { el, button, select } from "../ui.js";
import { journalBodyEl, journalButtons } from "../journal.js";
import { consolidatedSheet } from "../consolidated.js";
import { customerList } from "../customers.js";
import { addDays, todayISO } from "../dates.js";

// ⚠️ KEPT BETWEEN VISITS, like Profit's month. Stepping away and coming back should not silently
// re-scope the document she was just reading.
let kind = "month";
let anchor = "";
let customerKey = "";

const SCOPES = [["all", "All"], ["day", "A day"], ["week", "A week"], ["month", "A month"]];

const PILL = (on) => (on ? "soft small" : "ghost small");

export function renderConsolidated(root, state) {
  const cur = (state.settings && state.settings.currency) || "RM";
  if (!anchor) anchor = todayISO();

  const paint = () => {
    const sheet = consolidatedSheet(state, { kind, anchor, customerKey });
    const span = sheet.span;
    const people = customerList(state);
    // Nothing after today to invoice, so the forward step is refused at the current period — the same
    // rule Profit's month follows, for the same reason: there are no numbers after today.
    const canNext = span.to < todayISO();

    root.replaceChildren(
      el("h2", { class: "section" }, "Consolidated invoice"),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, "What to cover"),
        el("div", { class: "btn-row" },
          ...SCOPES.map(([k, label]) => button(label, () => { kind = k; paint(); }, PILL(kind === k)))),
        // ⚠️ NO ARROWS ON "ALL", BECAUSE THERE IS NOTHING TO STEP. A press that cannot do anything
        // reads as a broken screen (the app's own rule), so the row keeps its label — which still
        // says what is being looked at — and simply has no arrows on it.
        el("div", { class: "cal-head" },
          kind === "all" ? null : button("‹", () => { step(-1); paint(); }, "ghost small cal-nav"),
          el("span", { class: "cal-title" }, span.label),
          kind === "all" ? null
            : (() => { const b = button("›", () => { step(1); paint(); }, "ghost small cal-nav"); if (!canNext) b.disabled = true; return b; })()),
        el("div", { class: "field" }, el("label", {}, "Whose orders?"),
          select(
            [{ value: "", label: "All customers" },
              ...people.map((p) => ({ value: p._key, label: p.whatsapp ? `${p.name} · ${p.whatsapp}` : p.name }))],
            customerKey,
            function () { customerKey = this.value || ""; paint(); }))),

      el("div", { class: "card" },
        el("p", { class: "card-title" }, sheet.title),
        el("p", { class: "card-sub", style: "margin:0 0 8px" }, sheet.subtitle),
        journalBodyEl(sheet, cur),
        // ⚠️ The buttons come from the SHARED pair, so Print and Share (and the PDF inside Share)
        // are the same ones every other book in the app wears — and a change to how a page reaches
        // paper reaches this one too, without anyone remembering to come back here.
        el("div", { class: "btn-row", style: "margin-top:12px" }, ...journalButtons(sheet, cur))));
  };

  paint();
}

// One step back or forward, in whatever unit is showing.
function step(delta) {
  // ⚠️ A GUARD, NOT A HABIT. The arrows are not drawn on "All", so this is unreachable from the
  // screen — but without it an unknown kind would silently take the MONTH branch and move a date
  // nobody asked to move. A fall-through that guesses is how a later change goes wrong quietly.
  if (kind === "all") return;
  if (kind === "day") { anchor = addDays(anchor, delta); return; }
  if (kind === "week") { anchor = addDays(anchor, delta * 7); return; }
  const d = new Date(`${anchor}T00:00:00`);
  d.setMonth(d.getMonth() + delta, 1);
  anchor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
