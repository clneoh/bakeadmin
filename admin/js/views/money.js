// views/money.js — what came in, what went out, and what is still to come
// (16 Sep 2026). She asked for a way to reconcile: customers pay cash or by TNG,
// and the app should tell her what should be in her purse and on her phone. The
// maths lives in js/money.js — the same module the Orders day header reads, so the
// two can never disagree; this screen only draws it.

import { el, button, showPopup, toast, confirmDialog } from "../ui.js";
import { fmtRM, newId, save } from "../state.js";
import { depositsBetween, expensesBetween, moneyBetween } from "../money.js";
import { categoriesOf, categoryLabels, isCash, isTng, methodLabel, methodsOf } from "../accounts.js";
import { entryForm, newEntryChip } from "./accountsEditor.js";
import { dateField } from "../datepicker.js";
import { longDate, todayISO, weekdayName } from "../dates.js";
import { maybeSync } from "../supabase.js";

// Which stretch is showing. Module scope, like the other screens' own pickers, so a
// rebuild she did not ask for does not throw her back to Today.
let range = "today";

const RANGES = [["today", "Today"], ["week", "This week"], ["month", "This month"]];

function isoOf(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// "14 Sep" — the date without the year, for a range line or an expense row.
function dayMonth(iso) {
  return longDate(iso).slice(0, -5);
}

// The stretch a choice covers, always ending today: a week or a month still running
// is counted up to now, not to a day in the future.
function spanFor(which) {
  const today = todayISO();
  if (which === "today") return { from: today, to: today, label: `${weekdayName(today)}, ${dayMonth(today)}` };
  const d = new Date(`${today}T00:00:00`);
  const from = isoOf(which === "week"
    ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)) // Monday first
    : new Date(d.getFullYear(), d.getMonth(), 1));
  return { from, to: today, label: from === today ? `${weekdayName(today)}, ${dayMonth(today)}` : `${dayMonth(from)} – ${dayMonth(today)}` };
}

// Everything on the two lists, as a list of its own: tap a line to rename it, change
// what kind it is, or delete it. Opened from the line under the money cards, because
// this is where the spending is — a separate Settings card was the wrong home
// (16 Sep 2026: "dont put the setting separately, it should be at where it suppose to
// be"). The ＋ chips on the forms still add one on the spot.
function openListsManager(state, redraw) {
  // One editor at a time, in place of the line it is editing: no second pop-up, and
  // she can see the rest of the list while she works.
  let editing = null; // { kind, label } | { kind, label: "" } for a new one
  const body = el("div", {});
  const done = () => { editing = null; redraw(); show(); };

  const show = () => {
    const cats = categoriesOf(state); // { label, cls } — the labels alone carry no kind
    const methods = methodsOf(state);
    const row = (label, note, kind) => (
      editing && editing.kind === kind && editing.label === label
        ? entryForm(state, { kind, current: label, onDone: done })
        : el("div", { class: "info-row tappable", onclick: () => { editing = { kind, label }; show(); } },
            el("span", {}, label), el("span", { class: "info-val" },
              el("span", { class: "muted" }, `  ${note}`),
              el("span", { class: "muted", style: "margin-left:6px" }, "edit"))));

    body.replaceChildren(
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "What an expense was for, and how the money moved. Tap a line to rename it, change what kind it is, or delete it."),
      el("h3", { style: "margin:0 0 4px" }, "Categories"),
      ...cats.map((c) => row(c.label, c.cls === "stock" ? "ingredients"
        : c.cls === "drawing" ? "your own money" : "running cost", "category")),
      el("div", { class: "btn-row", style: "margin-top:8px" },
        editing && editing.kind === "category" && !editing.label
          ? entryForm(state, { kind: "category", current: "", onDone: done })
          : newEntryChip("category", () => { editing = { kind: "category", label: "" }; show(); })),
      el("h3", { style: "margin:16px 0 4px" }, "Ways to pay"),
      ...methods.map((m) => row(m, isCash(m) || isTng(m) ? "in your purse or phone" : "not from the purse", "method")),
      el("div", { class: "btn-row", style: "margin-top:8px" },
        editing && editing.kind === "method" && !editing.label
          ? entryForm(state, { kind: "method", current: "", onDone: done })
          : newEntryChip("method", () => { editing = { kind: "method", label: "" }; show(); })));
  };
  show();
  showPopup(el("div", { class: "popup-title-row" }, "Categories & ways to pay"), () => body);
}

// One entry in a money list. A spending row from a shopping run says so by its poId;
// everything else shows the category she picked, and a money-in row shows her note
// ("from my pocket") or the word that stands in for it.
function pocketRow(state, e, what, listKey, redraw, cur) {
  const how = methodLabel(e.method) || "no method";
  return el("div", { class: "info-row" },
    el("span", {}, `${dayMonth(String(e.date))} · ${what}${e.note ? ` · ${e.note}` : ""}`),
    el("span", { class: "info-val" }, fmtRM(Number(e.amount) || 0, cur),
      el("span", { class: "muted" }, `  ${how}`),
      button("✕", () => confirmDialog(
        `Delete this ${listKey === "deposits" ? "money-in record" : "expense"}? ${fmtRM(Number(e.amount) || 0, cur)} — ${what}, ${how}.`,
        () => {
          state[listKey] = (state[listKey] || []).filter((x) => x.id !== e.id);
          save(state);
          maybeSync(state);
          toast(listKey === "deposits" ? "Money-in record deleted" : "Expense deleted");
          redraw();
        }, { danger: true, yesLabel: "Delete" }), "ghost small")));
}
const expenseRow = (state, e, redraw, cur) =>
  pocketRow(state, e, e.poId ? "Shopping run (PO)" : (e.category || "Expense"), "expenses", redraw, cur);
const depositRow = (state, e, redraw, cur) =>
  pocketRow(state, e, "From my pocket", "deposits", redraw, cur);

// One row of pills built from a list of names, ending in a ＋ chip that adds a new
// one there and then (16 Sep 2026 — she asked why she could not find how to add a
// category, and the answer was that it was only in Settings).
//
// `current` is marked, `onPick` is told what she taps, and the chip's `onAdded` puts
// the new name straight into the caller's own state and reopens the form's body —
// which rebuilds these pills with the new one already picked.
function pillRow(names, current, onPick, { addKind, state, onAdded } = {}) {
  const wrap = el("div", { class: "cal-modes" });
  const mark = (label) => {
    for (const b of wrap.children) {
      if (b.tagName === "BUTTON") b.classList.toggle("cal-mode-on", b.textContent === label);
    }
  };
  for (const name of names) {
    wrap.append(button(name, () => { onPick(name); mark(name); },
      `ghost small${name === current ? " cal-mode-on" : ""}`));
  }
  if (addKind) wrap.append(newEntryChip(addKind, () => { if (onAdded) onAdded(null); }));
  return wrap;
}

// The Paid-by row of a money form: one pill per method on HER list — Cash, TNG, Loan,
// and whatever she adds. The list itself lives in js/accounts.js.
export function methodPills(state, current, onPick, refresh) {
  return pillRow(methodsOf(state), current, onPick, {
    addKind: "method", state,
    onAdded: (label) => { onPick(label); refresh(); },
  });
}

// The Add an expense form: everything the PO never sees — packaging, gas, a market
// top-up, a new tray. Its own small pop-up, opened from the screen it lands on.
function openExpenseForm(state, redraw) {
  const amount = el("input", { class: "input", type: "number", inputmode: "decimal",
    min: "0", step: "0.01", placeholder: "RM", "aria-label": "Amount" });
  // Her own chart and her own list, read as the form opens; both are rebuilt when a
  // ＋ chip adds something, while what she has already typed stays put (the inputs
  // are made once, outside the body, and the body re-appends them).
  let category = categoryLabels(state).includes("Packaging") ? "Packaging" : (categoryLabels(state)[0] || "Other");
  let method = methodsOf(state)[0] || "Cash";
  let adding = null; // "category" | "method" while the inline ＋ form is open
  const note = el("input", { class: "input", placeholder: "e.g. Mydin run, 2 boxes", value: "" });
  let date = todayISO();
  const datePick = dateField(date, (iso) => { date = iso; });

  showPopup(el("div", { class: "popup-title-row" }, "Add an expense"), (refresh, close) => el("div", {},
    el("div", { class: "field" }, el("label", {}, "What did you spend?"), amount),
    el("div", { class: "field" }, el("label", {}, "What for"),
      adding === "category" ? null : pillRow(categoryLabels(state), category, (c) => { category = c; },
        { addKind: "category", state, onAdded: () => { adding = "category"; refresh(); } }),
      adding === "category"
        ? entryForm(state, { kind: "category", onDone: (label) => {
            if (label) category = label; // pick what she just made, and carry on
            adding = null;
            refresh();
          } })
        : null),
    el("div", { class: "field" }, el("label", {}, "Paid by"),
      adding === "method" ? null : methodPills(state, method, (m) => { method = m; },
        () => { adding = "method"; refresh(); }),
      adding === "method"
        ? entryForm(state, { kind: "method", onDone: (label) => {
            if (label) method = label;
            adding = null;
            refresh();
          } })
        : null),
    el("div", { class: "field" }, el("label", {}, "The day you paid it"), datePick),
    el("div", { class: "field" }, el("label", {}, "A note (optional)"), note),
    el("div", { class: "popup-actions" },
      button("Cancel", close, "ghost"),
      button("Save", () => {
        const value = Number(amount.value);
        if (!amount.value.trim() || !Number.isFinite(value) || value < 0) {
          return toast("Type how much you spent");
        }
        state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
        state.expenses.push({ id: newId("exp"), date, amount: value, category,
          method, note: note.value.trim() });
        save(state);
        maybeSync(state);
        toast(`Money out: ${fmtRM(value, state.settings.currency)}`);
        close();
        redraw();
      }, "primary"))));
}

// "Put money in" — the other side of a pocket list (16 Sep 2026). A packet of flour
// paid from her own purse before any orders came in, or a float of change for the
// day: it goes in here, and comes back out later as an ordinary expense with the
// "My own withdrawal" category.
function openMoneyInForm(state, redraw) {
  const amount = el("input", { class: "input", type: "number", inputmode: "decimal",
    min: "0", step: "0.01", placeholder: "RM", "aria-label": "How much you put in" });
  const note = el("input", { class: "input", placeholder: "e.g. from my pocket for the flour",
    value: "", oninput: function () { /* read at save */ } });
  let method = methodsOf(state)[0] || "Cash";
  let adding = false;
  let date = todayISO();
  const datePick = dateField(date, (iso) => { date = iso; });

  showPopup(el("div", { class: "popup-title-row" }, "Put money in"), (refresh, close) => el("div", {},
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Money of your own that went into the bakery — it counts into the money in for the day, and you can take it back out later with Add an expense → My own withdrawal."),
    el("div", { class: "field" }, el("label", {}, "How much?"), amount),
    el("div", { class: "field" }, el("label", {}, "Paid in as"),
      adding ? null : methodPills(state, method, (m) => { method = m; }, () => { adding = true; refresh(); }),
      adding ? entryForm(state, { kind: "method", onDone: (label) => {
        if (label) method = label;
        adding = false;
        refresh();
      } }) : null),
    el("div", { class: "field" }, el("label", {}, "The day you put it in"), datePick),
    el("div", { class: "field" }, el("label", {}, "What it was for (optional)"), note),
    el("div", { class: "popup-actions" },
      button("Cancel", close, "ghost"),
      button("Save", () => {
        const value = Number(amount.value);
        if (!amount.value.trim() || !Number.isFinite(value) || value < 0) {
          return toast("Type how much you put in");
        }
        state.deposits = Array.isArray(state.deposits) ? state.deposits : [];
        state.deposits.push({ id: newId("dep"), date, amount: value, method, note: note.value.trim() });
        save(state);
        maybeSync(state);
        toast(`Money in: ${fmtRM(value, state.settings.currency)} of your own`);
        close();
        redraw();
      }, "primary"))));
}

export function renderMoney(root, state) {
  const cur = state.settings.currency || "RM";
  const row = (label, value, extra, cls = "") => el("div", { class: `info-row${cls}` },
    el("span", {}, label),
    el("span", { class: "info-val" }, fmtRM(value, cur),
      extra ? el("span", { class: "muted" }, `  ${extra}`) : null));

  const draw = (which) => {
    if (which) range = which;
    const { from, to, label } = spanFor(range);
    const m = moneyBetween(state, from, to);
    const out = expensesBetween(state, from, to);
    const mine = depositsBetween(state, from, to);
    // The net is what should be in her hand and on her phone RIGHT NOW, so three
    // things stay out of it: money still to collect (owed, not held), anything paid
    // by a method that never touched the purse (a loan, the bank overdraft), and —
    // for the same reason — money in that arrived that way. Her own pocket money
    // counts IN: it really is in the purse, and these rows are what she checks it
    // against. A line below says how much of it was hers, and the entries are listed.
    const net = m.cash + m.tng + mine.cash + mine.tng - out.cash - out.tng;

    root.replaceChildren(
      el("h2", { class: "section" }, "Money"),
      el("div", { class: "cal-modes" },
        ...RANGES.map(([id, text]) => button(text, () => draw(id),
          `ghost small${range === id ? " cal-mode-on" : ""}`))),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, label),
        el("div", { class: "money-rows" },
          row("Cash in", m.cash + mine.cash),
          row("TNG in", m.tng + mine.tng),
          row("Cash out", out.cash),
          row("TNG out", out.tng),
          row("Net", net, "", " net-row"),
          row("Still to collect", m.toCollect,
            m.toCollectCount ? `(${m.toCollectCount} order${m.toCollectCount === 1 ? "" : "s"})` : "", " recv-row"),
          out.other || mine.other
            ? row("Paid by loan / other", -(out.other - mine.other), "", " recv-row")
            : null,
          row("Paid, no method", m.unmarked + mine.unmarked),
          out.unmarked ? row("Spent, no method recorded", -out.unmarked) : null,
          mine.total
            ? el("p", { class: "card-sub", style: "margin:8px 0 0" },
                `· of the money in, ${fmtRM(mine.total, cur)} was your own`)
            : null,
          out.other || mine.other
            ? el("p", { class: "card-sub", style: "margin:6px 0 0" },
                "· loan, bank overdraft or any method you added that is not cash or TNG — it paid for things without coming out of your purse, so it is not in the net above.")
            : null)),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, `Money in · ${label}`),
        mine.rows.length
          ? null
          : el("p", { class: "card-sub", style: "margin:0 0 8px" }, "Nothing of your own put in this stretch."),
        ...mine.rows.map((e) => depositRow(state, e, () => draw(), cur)),
        el("div", { class: "btn-row", style: "margin-top:10px" },
          button("＋ Put money in", () => openMoneyInForm(state, () => draw()), "soft"))),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, `Expenses · ${label}`),
        out.rows.length
          ? null
          : el("p", { class: "card-sub", style: "margin:0 0 8px" }, "Nothing spent in this stretch yet."),
        ...out.rows.map((e) => expenseRow(state, e, () => draw(), cur)),
        el("div", { class: "btn-row", style: "margin-top:10px" },
          button("＋ Add an expense", () => openExpenseForm(state, () => draw()), "soft"))),
      el("div", { class: "card" },
        el("div", { class: "card-row" },
          el("div", {},
            el("p", { class: "card-title" }, "Categories & ways to pay"),
            el("p", { class: "card-sub" },
              `${categoryLabels(state).length} categories · ${methodsOf(state).join(", ")}`)),
          button("Edit", () => openListsManager(state, () => draw()), "ghost small"))),
      el("p", { class: "card-sub", style: "margin:0 2px" },
        "Money in is counted by the day it landed - an order paid by transfer today counts today, even if it delivers on Friday. Money out is counted on the day you paid it: a shopping run records itself when you tap Bought on it, and everything else goes in by hand. Net is what should be in your purse and on your phone for this stretch; what is still to collect is counted by delivery day, because that is when you hand it over. The two lists this screen reads - what you spend ON, and HOW you paid - are edited right above, or added on the spot with the ＋ chip on either form."),
    );
  };

  draw();
}
