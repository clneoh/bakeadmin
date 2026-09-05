// views/deliveries.js — manage delivery dates: pick dates on a month calendar
// (multi-select, already-added dates shown), or delete a date.

import { navigate } from "../app.js";
import { deliveryStatus, longDate, todayISO, weekdayName } from "../dates.js";
import { effectiveCapacity, totalUnitsOnDate } from "../bom.js";
import { el, button, emptyState, confirmDialog, toast } from "../ui.js";
import { newId, save } from "../state.js";
import { maybeSync } from "../supabase.js";
import { DOW, addMonth, monthLabel, monthWeeks } from "../calendar.js";

// Local picker state (survives re-renders while this screen is open): which
// month is showing and which future dates the baker has tapped to add.
let viewMonth = null;
const picked = new Set();

function renderAll(root, state) {
  const today = todayISO();
  if (!viewMonth) {
    const now = new Date();
    viewMonth = { year: now.getFullYear(), month: now.getMonth() };
  }

  const dates = [...state.deliveryDates].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = dates.filter((d) => d.date >= today);
  const past = dates.filter((d) => d.date < today);

  const addCard = buildAddCard(state);
  const list = upcoming.map((d) => dateCard(state, d));
  const pastCard = past.length ? el("div", {},
    el("h2", { class: "section" }, "Past"),
    ...past.slice(0, 10).map((d) => dateCard(state, d))) : null;

  root.replaceChildren(
    addCard,
    el("h2", { class: "section" }, `Upcoming (${upcoming.length})`),
    ...(list.length ? list : [emptyState("No upcoming dates", "Tap dates on the calendar above to add them.")]),
    pastCard);
}

function deleteDate(state, date) {
  const count = state.orders.filter((o) => o.deliveryDateId === date.id).length;
  const msg = count
    ? `${date.date} has ${count} order(s) on it. Delete the date? The orders are kept in your delivery history.`
    : `Delete delivery date ${date.date}?`;
  confirmDialog(msg, () => {
    state.deliveryDates = state.deliveryDates.filter((d) => d.id !== date.id);
    for (const o of state.orders) {
      if (o.deliveryDateId === date.id) o.deliveryDate = o.deliveryDate || date.date;
    }
    save(state);
    maybeSync(state);
    toast("Delivery date deleted — orders kept in history");
    renderAll(document.getElementById("view"), state);
  }, { danger: true, yesLabel: "Delete" });
}

function addSelected(state) {
  const picks = [...picked].sort();
  if (!picks.length) return toast("Pick a date on the calendar first");
  let added = 0;
  for (const date of picks) {
    if (state.deliveryDates.some((d) => d.date === date)) continue;
    state.deliveryDates.push({ id: newId("del"), date, notes: "" });
    added++;
  }
  picked.clear();
  save(state);
  maybeSync(state);
  toast(added ? `Added ${added} delivery date${added === 1 ? "" : "s"}`
    : "Those dates were already added");
  renderAll(document.getElementById("view"), state);
}

function buildAddCard(state) {
  const today = todayISO();
  const todayKey = new Date(`${today}T00:00:00`);
  const thisMonth = { year: todayKey.getFullYear(), month: todayKey.getMonth() };
  const canPrev = viewMonth.year > thisMonth.year
    || (viewMonth.year === thisMonth.year && viewMonth.month > thisMonth.month);
  const limit = addMonth(thisMonth.year, thisMonth.month, 12);
  const canNext = viewMonth.year < limit.year
    || (viewMonth.year === limit.year && viewMonth.month < limit.month);

  const nav = (delta) => {
    viewMonth = addMonth(viewMonth.year, viewMonth.month, delta);
    renderAll(document.getElementById("view"), state);
  };

  const head = el("div", { class: "cal-head" },
    button("‹", () => nav(-1), "ghost small cal-nav"),
    el("span", { class: "cal-title" }, monthLabel(viewMonth.year, viewMonth.month)),
    button("›", () => nav(1), "ghost small cal-nav"));
  if (!canPrev) head.children[0].disabled = true;
  if (!canNext) head.children[2].disabled = true;

  const addedSet = new Set(state.deliveryDates.map((d) => d.date));
  const weeks = monthWeeks(viewMonth.year, viewMonth.month);
  const cells = weeks.flat().map((d) => dayCell(state, d, today, addedSet));

  const grid = el("div", { class: "cal-grid" },
    ...DOW.map((d) => el("span", { class: "cal-dow" }, d)),
    ...cells);

  return el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, "Add a delivery date"),
    el("p", { class: "card-sub", style: "margin:0 0 4px" },
      "Tap one or more dates, then Add — already-added dates are ticked."),
    head,
    grid,
    el("div", { class: "btn-row", style: "margin-top:10px" },
      button(`Add selected${picked.size ? ` (${picked.size})` : ""}`, () => addSelected(state), "primary")));
}

function dayCell(state, date, today, addedSet) {
  if (!date) return el("span", { class: "cal-cell blank" });
  const dayNum = String(Number(date.slice(8, 10)));
  const added = addedSet.has(date);
  const past = date < today;
  const selected = picked.has(date);
  const isToday = date === today;
  if (added || past) {
    return el("span", {
      class: `cal-cell${added ? " added" : " past"}${isToday ? " today" : ""}`,
    }, dayNum);
  }
  return el("button", {
    class: `cal-cell tappable${selected ? " sel" : ""}${isToday ? " today" : ""}`,
    onclick: () => {
      if (selected) picked.delete(date);
      else picked.add(date);
      renderAll(document.getElementById("view"), state);
    },
  }, dayNum);
}

export function renderDeliveries(root, state) {
  renderAll(root, state);
}

function dateCard(state, date) {
  const ordered = totalUnitsOnDate(state, date.id);
  const left = Math.max(0, effectiveCapacity(state, date.date) - ordered);
  const st = deliveryStatus(date.date, state.settings);
  const closed = st.closed && !st.past;

  return el("div", { class: `card${closed ? " closed" : ""}` },
    el("div", { class: "card-row" },
      el("div", { onclick: () => navigate(`#/orders?date=${date.id}`), style: "cursor:pointer;min-width:0" },
        el("p", { class: "card-title" }, `${weekdayName(date.date)}, ${longDate(date.date)}`),
        el("p", { class: "card-sub" },
          `${ordered} ordered · ${left} left${closed ? " · orders closed" : ""}`)),
      el("div", { class: "li-right" },
        button("Del", () => deleteDate(state, date), "ghost small"))));
}
