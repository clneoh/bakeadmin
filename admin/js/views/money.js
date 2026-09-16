// views/money.js — what came in, what went out, and what is still to come
// (16 Sep 2026). She asked for a way to reconcile: customers pay cash or by TNG,
// and the app should tell her what should be in her purse and on her phone. The
// maths lives in js/money.js — the same module the Orders day header reads, so the
// two can never disagree; this screen only draws it.

import { el, button, showPopup, toast, confirmDialog } from "../ui.js";
import { fmtRM, newId, save } from "../state.js";
import { depositsBetween, expensesBetween, moneyBetween } from "../money.js";
import { dateField } from "../datepicker.js";
import { longDate, todayISO, weekdayName } from "../dates.js";
import { maybeSync } from "../supabase.js";

// What she spent categories: short, and the first one is what a purchase order
// records by itself, so most rows land there without her choosing anything.
const CATEGORIES = [
  "Ingredients & shopping",
  "Packaging",
  "Delivery & fuel",
  "Utilities",
  "Equipment & tools",
  "My own withdrawal", // money she takes back out for herself, not a cost of baking
  "Other",
];

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

// One entry in a money list. A spending row from a shopping run says so by its poId;
// everything else shows the category she picked, and a money-in row shows her note
// ("from my pocket") or the word that stands in for it.
function pocketRow(state, e, what, listKey, redraw, cur) {
  const how = e.method === "tng" ? "TNG" : e.method === "cash" ? "Cash" : "no method";
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

// The Add an expense form: everything the PO never sees — packaging, gas, a market
// top-up, a new tray. Its own small pop-up, opened from the screen it lands on.
function openExpenseForm(state, redraw) {
  const amount = el("input", { class: "input", type: "number", inputmode: "decimal",
    min: "0", step: "0.01", placeholder: "RM", "aria-label": "Amount" });
  let category = CATEGORIES[1]; // Packaging: the most common thing the PO misses
  let method = "cash";
  const cats = el("div", { class: "cal-modes" },
    ...CATEGORIES.map((c) => button(c, () => {
      category = c;
      for (const b of cats.children) b.classList.toggle("cal-mode-on", b.textContent === c);
    }, `ghost small${c === category ? " cal-mode-on" : ""}`)));
  const cashBtn = button("Cash", () => {
    method = "cash";
    cashBtn.classList.add("cal-mode-on");
    tngBtn.classList.remove("cal-mode-on");
  }, "ghost small cal-mode-on");
  const tngBtn = button("TNG", () => {
    method = "tng";
    tngBtn.classList.add("cal-mode-on");
    cashBtn.classList.remove("cal-mode-on");
  }, "ghost small");
  let date = todayISO();
  const datePick = dateField(date, (iso) => { date = iso; });

  showPopup(el("div", { class: "popup-title-row" }, "Add an expense"), (refresh, close) => el("div", {},
    el("div", { class: "field" }, el("label", {}, "What did you spend?"), amount),
    el("div", { class: "field" }, el("label", {}, "What for"), cats),
    el("div", { class: "field" }, el("label", {}, "Paid by"), el("div", { class: "cal-modes" }, cashBtn, tngBtn)),
    el("div", { class: "field" }, el("label", {}, "The day you paid it"), datePick),
    el("div", { class: "popup-actions" },
      button("Cancel", close, "ghost"),
      button("Save", () => {
        const value = Number(amount.value);
        if (!amount.value.trim() || !Number.isFinite(value) || value < 0) {
          return toast("Type how much you spent");
        }
        state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
        state.expenses.push({ id: newId("exp"), date, amount: value, category, method, note: "" });
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
  let method = "cash";
  const cashBtn = button("Cash", () => {
    method = "cash";
    cashBtn.classList.add("cal-mode-on");
    tngBtn.classList.remove("cal-mode-on");
  }, "ghost small cal-mode-on");
  const tngBtn = button("TNG", () => {
    method = "tng";
    tngBtn.classList.add("cal-mode-on");
    cashBtn.classList.remove("cal-mode-on");
  }, "ghost small");
  let date = todayISO();
  const datePick = dateField(date, (iso) => { date = iso; });

  showPopup(el("div", { class: "popup-title-row" }, "Put money in"), (refresh, close) => el("div", {},
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Money of your own that went into the bakery — it counts into the money in for the day, and you can take it back out later with Add an expense → My own withdrawal."),
    el("div", { class: "field" }, el("label", {}, "How much?"), amount),
    el("div", { class: "field" }, el("label", {}, "Paid in as"), el("div", { class: "cal-modes" }, cashBtn, tngBtn)),
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
    // What is still to collect is money owed, not money held, so it stays out of
    // the net — the net is what should be in her hand and on her phone right now.
    // Her own money counts INTO the cash and TNG rows: it really is in the purse, and
    // those rows are what she checks the purse against. A line below says how much of
    // it was hers, and the entries are listed underneath.
    const net = m.cash + m.tng + m.unmarked + mine.total - out.total;

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
          row("Paid, no method", m.unmarked + mine.unmarked),
          mine.total
            ? el("p", { class: "card-sub", style: "margin:8px 0 0" },
                `· of the money in, ${fmtRM(mine.total, cur)} was your own`)
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
      el("p", { class: "card-sub", style: "margin:0 2px" },
        "Money in is counted by the day it landed — an order paid by transfer today counts today, even if it delivers on Friday. Money out is counted on the day you paid it: a shopping run records itself when you tap Bought on it, and everything else goes in by hand. Net is what should be in your purse and on your phone for this stretch; what is still to collect is counted by delivery day, because that is when you hand it over."),
    );
  };

  draw();
}
