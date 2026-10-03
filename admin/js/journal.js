// journal.js — a book that can leave the screen (3 Oct 2026).
//
// Her words: "those journals in profits and other journals should be printable and able to be
// shared". Every journal in the app is a list of rows with a total, and until today each one
// existed only inside a pop-up she could scroll — nothing she could hand to anyone, keep, or
// paste into a message.
//
// A journal is described ONCE, as a `sheet`, and BOTH renderings read that description: the
// paper and the shared text can therefore never disagree about a row or a total. It is the
// same guarantee `expenseRows` and `tradingRows` already keep against the statement itself.
//
// Amounts are carried as NUMBERS, never as formatted strings. Screen, paper and message then
// all run the same `fmtRM`, so a figure written one way in the app and another way on the paper
// is not possible by construction.

import { el, button, copyText, toast } from "./ui.js";
import { fmtRM } from "./state.js";
import { longDate, todayISO } from "./dates.js";

// The rule a plain-text journal draws between its head, its rows and its totals. A fixed
// width deliberately: a rule that stretched with the longest row would drift line to line
// inside a proportional font like WhatsApp's.
const RULE = "-".repeat(30);

// How wide the `what` column is padded before the money. Capped, so one very long line cannot
// push every figure off to the right where nobody can read the column.
const PAD_MAX = 44;

// The day a sheet was printed, said in her own date style. A sheet built for the printer was
// printed the moment the press happened, which is why this is read here and not stored.
const printedOf = (s) => s.printed || longDate(todayISO());

// How one movement's money is written. A money journal shows the way it moved BEFORE the
// figure — "−RM 30.00" — rather than the sign a statement line wears after the currency, so
// the sheet has to say which convention it is using or the paper would read differently from
// the screen it came from. `dir` is empty for every other journal, which leaves the amount as
// the statement writes it.
const money = (amount, dir, cur) => `${dir === "out" ? "−" : ""}${fmtRM(amount, cur)}`;

// The one column width a plain-text sheet pads both its rows and its totals to, read off
// everything that shares the column. Capped, so one very long line cannot push every figure off
// to the right where nobody can read it.
function columnWidth(s) {
  const longest = Math.max(0, ...s.lines.filter((l) => !l.heading).map((l) => l.what.length),
    ...s.totals.map((t) => t.label.length));
  return Math.min(PAD_MAX, longest);
}

// Whose books these are, for the top of a sheet that has left the app. The shop's own name is
// the one she has already written, so a page and the shop can never disagree about who baked it.
export function bakeryName(state) {
  const s = (state && state.settings) || {};
  return String(((s.storefront || {}).name) || "").trim() || "Jienluv2bake";
}

// One journal, as a plain description and nothing else — no DOM, no storage, no wording about
// where it goes. `lines` are the movements in the order they should be read, each optionally
// wearing a statement class (a subtotal row) or being a heading with no money of its own;
// `totals` are the closing figures, drawn after a rule of their own.
export function journalSheet({
  title, subtitle = "", lines = [], totals = [], empty = "", note = "",
  where = "", bakery = "", printed = "",
} = {}) {
  return {
    title: String(title || "Journal"),
    subtitle: String(subtitle || ""),
    lines: (lines || []).map((l) => ({
      what: String(l && l.what != null ? l.what : ""),
      amount: Number(l && l.amount) || 0,
      cls: (l && l.cls) || "",
      // "out" when the money left, "" when it arrived or when the amount is already signed.
      dir: (l && l.dir) || "",
      // A heading exists because a statement read on paper has to say where trading ends and
      // running costs begin; the screen can lean on the section wording above the card, and a
      // page cannot. A heading carries no figure, so it is never padded into a money column.
      heading: !!(l && l.heading),
    })),
    totals: (totals || []).map((t) => ({
      label: String(t && t.label != null ? t.label : ""),
      amount: Number(t && t.amount) || 0,
      cls: (t && t.cls) || "pl-total",
    })),
    empty: String(empty || "Nothing to show here."),
    note: String(note || ""),
    where: String(where || ""),
    bakery: String(bakery || ""),
    printed: String(printed || ""),
  };
}

// The same sheet as plain text, for the share sheet and the clipboard. Built from the sheet
// rather than from the screen, so the two can never drift apart.
export function buildJournalText(sheet, cur = "RM") {
  const s = journalSheet(sheet);
  const out = [`${s.bakery ? `${s.bakery} — ` : ""}${s.title}`];
  if (s.subtitle) out.push(s.subtitle);

  if (!s.lines.length) {
    out.push("", s.empty);
  } else {
    const width = columnWidth(s);
    out.push(RULE);
    // A subtotal row gets a rule above it, so the text reads the way the screen does.
    s.lines.forEach((l, i) => {
      if ((l.cls || l.heading) && i > 0) out.push(RULE);
      if (l.heading) out.push(l.what);
      else out.push(`${l.what.padEnd(width)}  ${money(l.amount, l.dir, cur)}`);
    });
  }
  if (s.totals.length) {
    const width = columnWidth(s);
    out.push(RULE);
    for (const t of s.totals) out.push(`${t.label.padEnd(width)}  ${fmtRM(t.amount, cur)}`);
  }

  if (s.note) out.push("", s.note);
  if (s.where) out.push(`From ${s.where}.`);
  return out.join("\n");
}

// The same sheet as the screen shows it, for a book that is read in place rather than in a
// pop-up of its own — the Money screen draws one both ways. Reading the sheet rather than the
// books a second time is what makes "the paper says what the screen says" true by
// construction instead of by care.
export function journalBodyEl(sheet, cur = "RM") {
  const s = journalSheet(sheet);
  return el("div", {},
    s.lines.length
      ? el("div", {}, ...s.lines.map((l) => el("div", { class: "info-row journal-line" },
          el("span", { class: "j-what" }, l.what),
          el("span", { class: "info-val" }, money(l.amount, l.dir, cur)))))
      : el("p", { class: "card-sub" }, s.empty),
    ...s.totals.map((t) => el("div", { class: `info-row ${t.cls}` },
      el("span", {}, t.label),
      el("span", { class: "info-val" }, fmtRM(t.amount, cur)))),
    s.note ? el("p", { class: "card-sub", style: "margin:10px 0 0" }, s.note) : null);
}

// The sheet as it reaches paper. Everything here is written for the printer only — it lives
// inside the print layer, which is hidden on screen — so it can carry the letterhead such a
// page needs without putting a second title above the one already on the pop-up.
export function journalSheetEl(sheet, cur = "RM") {
  const s = journalSheet(sheet);
  return el("div", { class: "journal-sheet" },
    el("div", { class: "js-head" },
      s.bakery ? el("p", { class: "js-bakery" }, s.bakery) : null,
      el("h2", { class: "js-title" }, s.title),
      s.subtitle ? el("p", { class: "js-sub" }, s.subtitle) : null),
    s.lines.length
      ? el("div", { class: "js-rows" }, ...s.lines.map((l) => (l.heading
          ? el("p", { class: "js-section" }, l.what)
          : el("div", { class: `info-row journal-line${l.cls ? ` ${l.cls}` : ""}` },
              el("span", { class: "j-what" }, l.what),
              el("span", { class: "info-val" }, money(l.amount, l.dir, cur))))))
      : el("p", { class: "card-sub" }, s.empty),
    ...s.totals.map((t) => el("div", { class: `info-row ${t.cls}` },
      el("span", {}, t.label),
      el("span", { class: "info-val" }, fmtRM(t.amount, cur)))),
    // A note may be more than one paragraph — the statement's is two, and paper has no other
    // way to show a break — so a blank line in the note becomes a paragraph of its own. HTML
    // would otherwise run them together, because a newline is just a space on a page.
    ...s.note.split("\n\n").filter((p) => p.trim()).map((p) => el("p", { class: "js-note" }, p)),
    el("p", { class: "js-foot" },
      [s.where ? `From ${s.where}` : "", `printed ${printedOf(s)}`].filter(Boolean).join(" · ")));
}

// Where the sheet is built for the printer. Made on demand rather than carried in the app
// shell: nothing on screen ever needs it, and a page that has never printed has no node in
// the tree at all.
function printLayer() {
  if (typeof document === "undefined" || !document.body) return null;
  let layer = document.getElementById("print-layer");
  // The layer is recognised by its CLASS, not its id alone: a stand-in screen's getElementById
  // hands back a freshly created node for any id it has never seen, and adopting that node would
  // mean printing into something the stylesheet was never meant to match.
  if (layer && String(layer.className || "").includes("print-layer")) return layer;
  layer = el("div", { class: "print-layer", id: "print-layer" });
  document.body.appendChild(layer);
  return layer;
}

// Print one sheet. The body class lives only for the instant of printing, and is cleared on
// `afterprint` AND by a fallback timer — the same guard the packing labels already carry, so a
// class left behind by a browser that never fires the event can never hide the app afterwards.
export function printJournal(sheet, cur = "RM") {
  // A press that cannot do its job says so and names the press that will — a control that
  // silently does nothing reads as a broken screen. It is checked BEFORE anything is built:
  // a press that cannot print should leave no trace of having tried.
  const canPrint = typeof window !== "undefined" && typeof window.print === "function";
  const layer = canPrint ? printLayer() : null;
  if (!layer) {
    toast("This phone can't print — use Share instead.");
    return;
  }
  layer.replaceChildren(journalSheetEl(sheet, cur));
  document.body.classList.add("journal-print");
  const done = () => {
    document.body.classList.remove("journal-print");
    layer.replaceChildren();
    if (typeof window !== "undefined") window.removeEventListener("afterprint", done);
    clearTimeout(timer);
  };
  const timer = setTimeout(done, 2000);
  if (typeof window !== "undefined") window.addEventListener("afterprint", done);
  window.print();
}

// Share one sheet: the phone's own share sheet where there is one — straight into WhatsApp,
// Mail or Notes — and the clipboard where there is not.
export async function shareJournal(sheet, cur = "RM") {
  const text = buildJournalText(sheet, cur);
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: journalSheet(sheet).title, text });
      return;
    } catch (err) {
      // Her own cancel arrives here as an AbortError. That is a decision, not a fault, and
      // copying the journal behind her back would be the one outcome worse than doing nothing.
      if (err && err.name === "AbortError") return;
      // Anything else is the share genuinely failing, and the copy is the way through.
    }
  }
  copyText(text, "Journal copied — paste it into WhatsApp or an email");
}

// The two presses, as buttons. Returned as a list so each caller wraps them in the row its
// own screen uses — a pop-up's action row, or the button row a whole card wears.
export function journalButtons(sheet, cur = "RM") {
  return [
    button("Print", () => printJournal(sheet, cur), "soft"),
    button("Share", () => shareJournal(sheet, cur), "soft"),
  ];
}
