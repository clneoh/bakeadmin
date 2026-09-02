// views/deliveries.js — manage delivery dates: add, delete.

import { navigate } from "../app.js";
import { deliveryStatus, generateUpcomingDates, longDate, todayISO, weekdayName } from "../dates.js";
import { dayCapacity, totalUnitsOnDate } from "../bom.js";
import { el, button, emptyState, confirmDialog, toast } from "../ui.js";
import { newId, save } from "../state.js";
import { maybeSync } from "../supabase.js";

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

function addDate(state, dateInput) {
  const date = dateInput.value.trim();
  if (!date) return toast("Pick a date first");
  if (state.deliveryDates.some((d) => d.date === date)) return toast("That date already exists");
  state.deliveryDates.push({
    id: newId("del"),
    date,
    notes: "",
  });
  save(state);
  maybeSync(state);
  toast("Delivery date added");
  renderAll(document.getElementById("view"), state);
}

function generateWeek(state) {
  const newDates = generateUpcomingDates(state.settings, 6,
    state.deliveryDates.map((d) => d.date));
  if (!newDates.length) return toast("No new dates to add");
  for (const date of newDates) {
    state.deliveryDates.push({ id: newId("del"), date, notes: "" });
  }
  save(state);
  maybeSync(state);
  toast(`Added ${newDates.length} delivery date(s)`);
  renderAll(document.getElementById("view"), state);
}

export function renderDeliveries(root, state) {
  renderAll(root, state);
}

function renderAll(root, state) {
  const dates = [...state.deliveryDates].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = dates.filter((d) => d.date >= todayISO());
  const past = dates.filter((d) => d.date < todayISO());

  const dateInput = el("input", { class: "input", type: "date" });

  const addCard = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, "Add a delivery date"),
    el("div", { class: "field" }, el("label", {}, "Date"), dateInput),
    el("div", { class: "btn-row" },
      button("Add date", () => addDate(state, dateInput), "primary"),
      button("Add next Mon/Wed/Fri", () => generateWeek(state), "soft")));

  const list = upcoming.map((d) => dateCard(state, d));
  const pastCard = past.length ? el("div", {},
    el("h2", { class: "section" }, "Past"),
    ...past.slice(0, 10).map((d) => dateCard(state, d))) : null;

  root.replaceChildren(
    addCard,
    el("h2", { class: "section" }, `Upcoming (${upcoming.length})`),
    ...(list.length ? list : [emptyState("No upcoming dates", "Add dates or generate the next Mon/Wed/Fri.")]),
    pastCard);
}

function dateCard(state, date) {
  const ordered = totalUnitsOnDate(state, date.id);
  const left = Math.max(0, dayCapacity(state) - ordered);
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
