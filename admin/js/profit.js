// profit.js — the books (16 Sep 2026). She asked for it in so many words: "make it
// like an accounting software". So this is a profit and loss account, not a cash
// summary — and the two are kept apart on purpose, because they answer different
// questions and a baker needs both:
//
//   • Money (views/money.js) is the CASH: what is in the purse and on the phone.
//     A sack of flour is money out on the day it is bought.
//   • Profit (this) is the TRADING: what was sold, what those sales cost to bake,
//     and what running the bakery cost. The same sack is a cost as the bread made
//     from it is sold — so a big stock-up week looks alarming on Money and calm
//     here, which is the truth of both.
//
// That split is also why nothing is counted twice: ingredient buying is a cash
// movement (and stock on the shelf), while cost of sales comes from the recipes.
//
// Owner's money is neither income nor expense. Money she puts in is CAPITAL, money
// she takes back out is DRAWINGS; both move cash, neither changes profit. That is
// why "My own withdrawal" is its own class here even though it lives in the same
// money-out list as the rest.
import { byId, orderLinePrice } from "./state.js";
import { costOf } from "./bom.js";
import { categoriesOf, classOfCategory } from "./accounts.js";

// The day an order is FOR: the delivery date record while it exists, its own
// snapshot after the date was deleted. Sales are counted by delivery day, the same
// day the day headers, the weekly numbers and the customer's calendar all use.
export function orderDay(state, o) {
  if (o && o.deliveryDate) return String(o.deliveryDate).slice(0, 10);
  const rec = (state.deliveryDates || []).find((d) => d && d.id === (o && o.deliveryDateId));
  return rec ? rec.date : "";
}

const inRange = (iso, from, to) => !!iso && iso >= from && iso <= to;

// What one sold line cost to bake, from its recipe.
export function lineCost(state, o) {
  const p = byId(state.products, o && o.productId);
  return (Number(o && o.qty) || 0) * (p ? costOf(state, p) : 0);
}

// The profit and loss account for a stretch of days.
//
//   sales      every order delivered in the stretch, at the price it was sold at
//   cost       what those lines cost to make, from the recipes
//   gross      sales − cost
//   expenses   running costs recorded in the stretch, by category — never stock
//              purchases (those are cash and the shelf) and never drawings
//   net        gross − expenses
//   capital    her own money put in during the stretch
//   drawings   her own money taken out during the stretch
//
// `uncosted` counts the lines whose recipe prices to nothing, so the screen can say
// so instead of quietly reporting a profit that is too high.
export function profitBetween(state, from, to) {
  let sales = 0;
  let cost = 0;
  let lines = 0;
  let uncosted = 0;
  for (const o of state.orders || []) {
    if (!o || !inRange(orderDay(state, o), from, to)) continue;
    const qty = Number(o.qty) || 0;
    const price = orderLinePrice(state, o);
    sales += qty * (price == null ? 0 : price);
    const lined = lineCost(state, o);
    if (!lined) uncosted++;
    cost += lined;
    lines++;
  }

  const byCategory = new Map();
  let expensesTotal = 0;
  let drawings = 0;
  for (const e of state.expenses || []) {
    if (!e || !inRange(String(e.date || ""), from, to)) continue;
    const amount = Number(e.amount) || 0;
    const cls = classOfCategory(state, e.category);
    if (cls === "drawing") { drawings += amount; continue; }
    if (cls === "stock") continue; // cash and the shelf, not this stretch's trading
    const label = e.category || "Other";
    byCategory.set(label, (byCategory.get(label) || 0) + amount);
    expensesTotal += amount;
  }

  let capital = 0;
  for (const d of state.deposits || []) {
    if (d && inRange(String(d.date || ""), from, to)) capital += Number(d.amount) || 0;
  }

  return {
    sales,
    cost,
    gross: sales - cost,
    lines,
    uncosted,
    // The chart of accounts in order, so the statement always reads the same way
    // even when a category has nothing in it.
    expenses: categoriesOf(state).filter((c) => c.cls === "expense")
      .map((c) => ({ label: c.label, amount: byCategory.get(c.label) || 0 })),
    // Anything whose label is no longer in the chart, so nothing vanishes from the
    // books: an old category still shows, at the end.
    otherExpenses: [...byCategory.entries()]
      .filter(([label]) => !categoriesOf(state).some((c) => c.label === label))
      .map(([label, amount]) => ({ label, amount })),
    expensesTotal,
    net: sales - cost - expensesTotal,
    capital,
    drawings,
  };
}

// The first and last day of a month, as the statement works in months.
export function monthSpan(year, month) {
  const last = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
}
