// views/deliveries.js — manage delivery dates: pick dates on a month calendar
// (multi-select, already-added dates shown), or delete a date. A second mode,
// "Mark an occasion", paints reminder periods (public holidays, school
// holidays, CNY, Hari Raya...) on the same calendar. An occasion never adds or
// removes a delivery date — it is purely something to see while planning.

import { navigate } from "../app.js";
import { deliveryStatus, longDate, todayISO, weekdayName } from "../dates.js";
import { effectiveCapacity, totalUnitsOnDate } from "../bom.js";
import { el, button, emptyState, confirmDialog, showPopup, toast } from "../ui.js";
import { newId, save } from "../state.js";
import { maybeSync } from "../supabase.js";
import {
  DOW, addMonth, monthLabel, monthWeeks,
  OCCASION_PRESETS, occColour, occDays, occForDateAll, occRange, occStrength,
} from "../calendar.js";

// Local picker state (survives re-renders while this screen is open): which
// month is showing, which future dates the baker has tapped to add, and the
// occasion-marking mode with any start day awaiting a second tap.
let viewMonth = null;
const picked = new Set();
let occMode = false;
let occAnchor = null; // first day of a two-tap mark, waiting for the last day
let occColourChosen = "red"; // mark colour she picked last (red/grey)

function view() { return document.getElementById("view"); }

function resetOcc() { occAnchor = null; }

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
  // Spread conditionally: replaceChildren would render a bare null as text.
  const pastSection = past.length ? el("div", {},
    el("h2", { class: "section" }, "Past"),
    ...past.slice(0, 10).map((d) => dateCard(state, d))) : null;

  root.replaceChildren(
    addCard,
    el("h2", { class: "section" }, `Upcoming (${upcoming.length})`),
    ...(list.length ? list : [emptyState("No upcoming dates", "Tap dates on the calendar above to add them.")]),
    ...(pastSection ? [pastSection] : []));
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
    renderAll(view(), state);
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
  renderAll(view(), state);
}

// Occasion marks are drawn as stacked translucent "papers": each mark becomes
// one rounded rectangle over the days it covers in each week row (a long
// school-holiday stretch = one long pale band; a one-day public holiday = a
// small, more-solid box). Longer marks come first in the list so the CSS paints
// them BEHIND the shorter marks that overlap them — and because every fill is
// see-through, an overlap reads as sheets stacked on top of each other, never
// one colour wiping the other out. Papers only cover today and the future;
// past days keep their muted look.
function occOverlays(state, weeks, today) {
  const papers = [];
  const marks = (state.occasions || [])
    .filter((occ) => occ && occ.from && occ.to)
    .sort((a, b) => occDays(b) - occDays(a)); // long first → painted behind
  for (const occ of marks) {
    weeks.forEach((row, r) => {
      let first = -1, last = -1;
      row.forEach((d, c) => {
        if (d && d >= today && occ.from <= d && d <= occ.to) {
          if (first === -1) first = c;
          last = c;
        }
      });
      if (first === -1) return;
      // Grid row 1 is the day-of-week header, so week r sits on grid row r + 2.
      // Papers are absolutely placed against that area (see .occ-paper), which
      // lets them overlay the row without disturbing the day cells' layout.
      papers.push(el("div", {
        class: `occ-paper occ-${occColour(occ)} occ-${occStrength(occ)}`,
        style: `--gr:${r + 2};--gc1:${first + 1};--gc2:${last + 2};`,
      }));
    });
  }
  return papers;
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
    renderAll(view(), state);
  };

  const head = el("div", { class: "cal-head" },
    button("‹", () => nav(-1), "ghost small cal-nav"),
    el("span", { class: "cal-title" }, monthLabel(viewMonth.year, viewMonth.month)),
    button("›", () => nav(1), "ghost small cal-nav"));
  if (!canPrev) head.children[0].disabled = true;
  if (!canNext) head.children[2].disabled = true;

  const setMode = (toOcc) => {
    if (toOcc === occMode) return;
    occMode = toOcc;
    resetOcc();
    renderAll(view(), state);
  };
  const modes = el("div", { class: "cal-modes" },
    button("Add dates", () => setMode(false), `ghost small${occMode ? "" : " cal-mode-on"}`),
    button("Mark an occasion", () => setMode(true), `ghost small${occMode ? " cal-mode-on" : ""}`));

  const weeks = monthWeeks(viewMonth.year, viewMonth.month);
  const heading = occMode
    ? el("h3", { style: "margin:0 0 6px" }, "Mark an occasion")
    : el("h3", { style: "margin:0 0 6px" }, "Add a delivery date");
  const sub = occMode
    ? el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "A reminder on the calendar — it never adds or changes delivery dates.")
    : el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "Tap one or more dates, then Add — already-added dates are ticked.");

  return el("div", { class: "card" },
    modes,
    heading,
    sub,
    head,
    occMode ? buildOccGrid(state, weeks) : buildAddGrid(state, weeks),
    occMode ? occBody(state) : el("div", { class: "btn-row", style: "margin-top:10px" },
      button(`Add selected${picked.size ? ` (${picked.size})` : ""}`, () => addSelected(state), "primary")));
}

// ── add-dates grid (mode 1) ───────────────────────────────────────────────

function buildAddGrid(state, weeks) {
  const today = todayISO();
  const addedSet = new Set(state.deliveryDates.map((d) => d.date));
  const cells = weeks.flat().map((d) => dayCell(state, d, today, addedSet));
  return el("div", { class: "cal-grid" },
    ...DOW.map((d) => el("span", { class: "cal-dow" }, d)),
    ...cells,
    ...occOverlays(state, weeks, today));
}

function dayCell(state, date, today, addedSet) {
  if (!date) return el("span", { class: "cal-cell blank" });
  const dayNum = String(Number(date.slice(8, 10)));
  const added = addedSet.has(date);
  const past = date < today;
  const selected = picked.has(date);
  const isToday = date === today;
  // A delivery date inside a mark is the top "paper" of the stack: a small solid
  // box, number white, ticked. Outside a mark it keeps the plain green tile.
  // (Only upcoming days sit above a mark — past marks aren't shown at all.)
  const top = added && !past ? occForDateAll(state.occasions, date)[0] || null : null;
  let cls = "cal-cell";
  if (top) cls += ` delb occ-${occColour(top)}`;
  else if (added) cls += " added";
  else if (past) cls += " past";
  if (isToday) cls += " today";
  if (added || past) {
    return el("span", { class: cls }, dayNum);
  }
  return el("button", {
    class: `${cls} tappable${selected ? " sel" : ""}`,
    onclick: () => {
      if (selected) picked.delete(date);
      else picked.add(date);
      renderAll(view(), state);
    },
  }, dayNum);
}

// ── occasion mode (mode 2) ────────────────────────────────────────────────

// Below the grid: a one-line tip, then the "Marked periods" list.
function occBody(state) {
  const occs = [...(state.occasions || [])].sort((a, b) => a.from.localeCompare(b.from));
  return el("div", { class: "occ-body" },
    el("p", { class: "occ-tip" },
      "Slide from the first day to the last — or tap the first, then the last."
      + " Tap the same day twice to mark just one day."),
    el("p", { class: "occ-sublabel" }, "Marked periods"),
    occs.length
      ? occs.map((o) => occRow(state, o))
      : el("p", { class: "card-sub", style: "margin:6px 0 0" },
        "Nothing marked yet — pick a range above and name it."));
}

function occRow(state, occ) {
  return el("div", { class: "occ-row" },
    el("span", { class: `occ-tag occ-${occColour(occ)}` }, occ.label),
    el("span", { class: "occ-row-dates" }, `${longDate(occ.from)} – ${longDate(occ.to)}`),
    button("✕", () => deleteOccasion(state, occ), "ghost small"));
}

function deleteOccasion(state, occ) {
  confirmDialog(
    `Remove the "${occ.label}" mark (${longDate(occ.from)} – ${longDate(occ.to)})?`
    + " Your delivery dates are untouched.",
    () => {
      state.occasions = state.occasions.filter((o) => o.id !== occ.id);
      save(state);
      maybeSync(state);
      toast("Removed from the calendar");
      resetOcc();
      renderAll(view(), state);
    }, { danger: true, yesLabel: "Remove" });
}

function addOccasion(state, from, to, label, colour, close) {
  state.occasions.push({
    id: newId("occ"), from, to, label: String(label).trim(),
    colour: colour === "red" ? "red" : "grey",
  });
  save(state);
  maybeSync(state);
  toast(`Marked "${label}" on the calendar`);
  close();
  resetOcc();
  renderAll(view(), state);
}

function rangeText(from, to) {
  return `${weekdayName(from)} ${longDate(from)} – ${weekdayName(to)} ${longDate(to)}`;
}

function occLabelPicker(state, from, to) {
  showPopup("Mark this period", (refresh, close) => {
    const custom = el("input", { class: "input", placeholder: "Or type a name of your own", maxlength: "40" });
    let colour = occColourChosen;
    const finish = (label) => {
      if (!String(label).trim()) return toast("Type a name first");
      addOccasion(state, from, to, label, colour, close);
    };
    custom.addEventListener("keydown", (e) => { if (e.key === "Enter") finish(custom.value); });
    const cancel = () => {
      resetOcc();
      close();
      renderAll(view(), state);
    };

    // Colour is the first choice — red for a big, very-prominent holiday,
    // grey for a long stretch. Remembered so the next mark keeps it.
    const colBtns = new Map(); // key -> { btn, check }
    const pickColour = (key) => {
      colour = key;
      occColourChosen = key;
      for (const [k, { btn, check }] of colBtns) {
        btn.classList.toggle("colour-on", k === key);
        check.style.visibility = k === key ? "visible" : "hidden";
      }
    };
    const colourBtn = (key, text) => {
      const check = el("span", { class: "occ-check" }, "✓");
      check.style.visibility = occColourChosen === key ? "visible" : "hidden";
      const btn = button(text, () => pickColour(key), `occ-colbtn ${key}${occColourChosen === key ? " colour-on" : ""}`);
      btn.prepend(el("span", { class: "occ-dot" }));
      btn.appendChild(check);
      colBtns.set(key, { btn, check });
      return btn;
    };
    const colours = el("div", { class: "occ-colours" },
      colourBtn("red", "Red — a big, very-prominent day"),
      colourBtn("grey", "Grey — a long stretch of days"));

    const chips = el("div", { class: "occ-chips" },
      ...OCCASION_PRESETS.map((p) => button(p, () => finish(p), "occ-chip")));
    return el("div", {},
      el("p", { class: "cal-range" }, rangeText(from, to)),
      el("p", { class: "occ-sublabel", style: "margin-top:2px" }, "Pick a colour"),
      colours,
      el("p", { class: "occ-sublabel", style: "margin-top:12px" }, "Name it"),
      chips,
      custom,
      el("div", { class: "popup-actions", style: "margin-top:12px;display:flex;gap:8px" },
        button("Cancel", cancel, "ghost"),
        button("Add", () => finish(custom.value), "primary")));
  });
}

// The occasion-mode month grid: future days are a drag surface; existing
// occasion periods are tinted. Handles pointer drags AND two-tap ranges.
function buildOccGrid(state, weeks) {
  const today = todayISO();
  const addedSet = new Set(state.deliveryDates.map((d) => d.date));
  const cells = [];
  const byDate = new Map(); // ISO date -> its cell button, for live drag paint
  for (const d of weeks.flat()) {
    if (!d) { cells.push(el("span", { class: "cal-cell blank" })); continue; }
    const dayNum = String(Number(d.slice(8, 10)));
    const past = d < today;
    const isToday = d === today;
    // Same stacking as the add-date grid: a delivery date inside a mark is the
    // small solid top box; otherwise the plain green ticked tile.
    const top = !past && addedSet.has(d)
      ? occForDateAll(state.occasions, d)[0] || null : null;
    let base = `cal-cell${past ? " past" : " occ-cell"}`;
    if (top) base += ` delb occ-${occColour(top)}`;
    else if (!past && addedSet.has(d)) base += " added";
    if (isToday && !past) base += " today";
    if (past) {
      cells.push(el("span", { class: base }, dayNum));
    } else {
      const cell = el("button", { class: base, dataset: { date: d } }, dayNum);
      byDate.set(d, cell);
      cells.push(cell);
    }
  }

  const grid = el("div", { class: "cal-grid", style: "touch-action:none" },
    ...DOW.map((d) => el("span", { class: "cal-dow" }, d)),
    ...cells,
    ...occOverlays(state, weeks, today));
  attachOccDrag(grid, byDate, state);
  return grid;
}

function attachOccDrag(grid, byDate, state) {
  // Live-paint the chosen band as a ring on the cells it covers.
  const paint = (from, to) => {
    const [lo, hi] = occRange(from, to) || [null, null];
    for (const [d, cell] of byDate) {
      cell.classList.toggle("occ-sel", !!lo && lo <= d && d <= hi);
    }
  };
  const hoverDate = (e) => {
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const cell = hit && hit.closest ? hit.closest(".occ-cell") : null;
    return cell && cell.dataset.date ? cell.dataset.date : null;
  };

  let gesture = null; // { start, moved, last } while the finger is down
  grid.addEventListener("pointerdown", (e) => {
    const d = hoverDate(e);
    if (!d) return;
    e.preventDefault();
    gesture = { start: d, moved: false, last: d };
    try { grid.setPointerCapture(e.pointerId); } catch (err) { /* older engine */ }
    paint(d, d);
  });
  grid.addEventListener("pointermove", (e) => {
    if (!gesture) return;
    const d = hoverDate(e);
    if (!d) return;
    if (d !== gesture.start) gesture.moved = true;
    gesture.last = d;
    paint(gesture.start, d);
  });
  const finish = (e) => {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    try { grid.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    if (g.moved) {
      // A real drag: name the swept range straight away.
      occAnchor = null;
      const end = hoverDate(e) || g.last;
      paint(g.start, end);
      occLabelPicker(state, g.start, end);
      return;
    }
    if (occAnchor) {
      // Second tap completes the range (or re-taps the start for one day).
      const [lo, hi] = occRange(occAnchor, g.start);
      occAnchor = null;
      paint(lo, hi);
      occLabelPicker(state, lo, hi);
      return;
    }
    // First plain tap: hold it as the range's start day.
    occAnchor = g.start;
    paint(g.start, g.start);
  };
  grid.addEventListener("pointerup", finish);
  grid.addEventListener("pointercancel", () => { gesture = null; });
}

export function renderDeliveries(root, state) {
  renderAll(root, state);
}

function dateCard(state, date) {
  const ordered = totalUnitsOnDate(state, date.id);
  const left = Math.max(0, effectiveCapacity(state, date.date) - ordered);
  const st = deliveryStatus(date.date, state.settings);
  const closed = st.closed && !st.past;
  const occs = occForDateAll(state.occasions, date.date);

  const col = el("div",
    { onclick: () => navigate(`#/orders?date=${date.id}`), style: "cursor:pointer;min-width:0" },
    el("p", { class: "card-title" }, `${weekdayName(date.date)}, ${longDate(date.date)}`),
    el("p", { class: "card-sub" },
      `${ordered} ordered · ${left} left${closed ? " · orders closed" : ""}`));
  // A delivery day can sit inside several overlapping marks — show each as a
  // small coloured tag, shortest (strongest) first.
  for (const occ of occs) {
    col.append(el("span", { class: `occ-tag occ-${occColour(occ)}`, style: "margin-top:6px" }, occ.label));
  }

  return el("div", { class: `card${closed ? " closed" : ""}` },
    el("div", { class: "card-row" },
      col,
      el("div", { class: "li-right" },
        button("Del", () => deleteDate(state, date), "ghost small"))));
}
