// views/money.js — what came in, what went out, and what is still to come
// (16 Sep 2026). She asked for a way to reconcile: customers pay cash or by TNG,
// and the app should tell her what should be in her purse and on her phone. The
// maths lives in js/money.js — the same module the Orders day header reads, so the
// two can never disagree; this screen only draws it.

import { el, button, showPopup, toast, confirmDialog } from "../ui.js";
import { fmtRM, newId, save } from "../state.js";
import { expensesBetween, moneyBetween } from "../money.js";
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

// One entry in the spending list. A row from a shopping run says so by its poId;
// everything else shows the category she picked.
function expenseRow(state, e, redraw, cur) {
  const what = e.poId ? "Shopping run (PO)" : (e.category || "Expense");
  const how = e.method === "tng" ? "TNG" : e.method === "cash" ? "Cash" : "no method";
  return el("div", { class: "info-row" },
    el("span", {}, `${dayMonth(String(e.date))} · ${what}${e.note ? ` · ${e.note}` : ""}`),
    el("span", { class: "info-val" }, fmtRM(Number(e.amount) || 0, cur),
      el("span", { class: "muted" }, `  ${how}`),
      button("✕", () => confirmDialog(
        `Delete this expense? ${fmtRM(Number(e.amount) || 0, cur)} — ${what}, ${how}.`,
        () => {
          state.expenses = (state.expenses || []).filter((x) => x.id !== e.id);
          save(state);
          maybeSync(state);
          toast("Expense deleted");
          redraw();
        }, { danger: true, yesLabel: "Delete" }), "ghost small")));
}

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
    // What is still to collect is money owed, not money held, so it stays out of
    // the net — the net is what should be in her hand and on her phone right now.
    const net = m.cash + m.tng + m.unmarked - out.total;

    root.replaceChildren(
      el("h2", { class: "section" }, "Money"),
      el("div", { class: "cal-modes" },
        ...RANGES.map(([id, text]) => button(text, () => draw(id),
          `ghost small${range === id ? " cal-mode-on" : ""}`))),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, label),
        el("div", { class: "money-rows" },
          row("Cash in", m.cash),
          row("TNG in", m.tng),
          row("Cash out", out.cash),
          row("TNG out", out.tng),
          row("Net", net, "", " net-row"),
          row("Still to collect", m.toCollect,
            m.toCollectCount ? `(${m.toCollectCount} order${m.toCollectCount === 1 ? "" : "s"})` : "", " recv-row"),
          row("Paid, no method", m.unmarked))),
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
