// views/profit.js — the books, as a statement (16 Sep 2026). She asked for it as
// accounting software, so it reads like one: a month at a time, sales down to what
// was left, with the owner's own money kept out of the trading figures entirely.
// The arithmetic lives in js/profit.js, next to the cash side it must never be
// confused with.

import { el, button } from "../ui.js";
import { fmtRM } from "../state.js";
import { monthSpan, profitBetween } from "../profit.js";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// The month on screen, as { year, month } — module scope, like the other screens'
// own pickers, so a rebuild she did not ask for does not move the month.
let shown = null;

function currentMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function renderProfit(root, state) {
  const cur = state.settings.currency || "RM";
  if (!shown) shown = currentMonth();
  const now = currentMonth();
  const canNext = shown.year < now.year || (shown.year === now.year && shown.month < now.month);

  const line = (label, amount, cls = "") => el("div", { class: `info-row pl-row${cls}` },
    el("span", {}, label),
    el("span", { class: "info-val" }, fmtRM(amount, cur)));

  const draw = (year, month) => {
    shown = { year, month };
    const { from, to } = monthSpan(shown.year, shown.month);
    const pl = profitBetween(state, from, to);
    const margin = pl.sales > 0 ? Math.round((pl.gross / pl.sales) * 100) : 0;

    const move = (delta) => {
      const d = new Date(shown.year, shown.month + delta, 1);
      // Never past this month: there are no numbers after today.
      if (d.getFullYear() > now.year || (d.getFullYear() === now.year && d.getMonth() > now.month)) return;
      draw(d.getFullYear(), d.getMonth());
    };

    root.replaceChildren(
      el("h2", { class: "section" }, "Profit"),
      el("div", { class: "cal-head" },
        button("‹", () => move(-1), "ghost small cal-nav"),
        el("span", { class: "cal-title" }, `${MONTHS[shown.month]} ${shown.year}`),
        (() => { const b = button("›", () => move(1), "ghost small cal-nav"); if (!canNext) b.disabled = true; return b; })()),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, "Profit and loss"),
        line("Sales", pl.sales),
        line("Cost of sales", -pl.cost),
        line("Gross profit", pl.gross, " pl-total"),
        el("p", { class: "card-sub", style: "margin:8px 0 2px" }, "Running costs"),
        ...pl.expenses.map((e) => line(e.label, -e.amount)),
        ...pl.otherExpenses.map((e) => line(e.label, -e.amount)),
        line("Total expenses", -pl.expensesTotal, " pl-total"),
        line("Net profit", pl.net, " pl-net"),
        el("p", { class: "card-sub", style: "margin:10px 0 0" },
          `${pl.lines} order line${pl.lines === 1 ? "" : "s"} in this month${pl.sales > 0 ? ` · gross margin ${margin}%` : ""}.`)),
      el("div", { class: "card" },
        el("p", { class: "card-title" }, "Your own money"),
        el("p", { class: "card-sub", style: "margin:0 0 8px" },
          "What you put in is capital and what you take out is drawings. Neither is income and neither is a cost — they move cash, and the Money screen is where you check that."),
        line("Capital you put in", pl.capital),
        line("Drawings you took out", -pl.drawings),
        line("In the business so far this month", pl.capital - pl.drawings, " pl-total")),
      el("p", { class: "card-sub", style: "margin:0 2px" },
        `Ingredient cost is what the baking cost to make, from your recipes — so a pack bought today counts as the bread made from it is sold, not all at once. Sales are counted by the day you deliver. ${pl.uncosted ? `${pl.uncosted} line${pl.uncosted === 1 ? "" : "s"} this month had no recipe cost and was counted as nothing — check that product's recipe. ` : ""}Your own unpaid time is not a cost here: if you pay yourself, record it as Salary (you), and record EPF and SOCSO as their own category.`),
    );
  };

  draw(shown.year, shown.month);
}
