// datepicker.js — the small calendar the app uses wherever a date is named: a
// manual order's order date, a new order's delivery day, and moving an existing
// order to another day.
//
// It expands in place, right under the button that names the date — never in a
// pop-up. showPopup() owns one shared #popup-layer and replaces its contents, so
// a calendar opened in a pop-up would wipe out the Edit-order pop-up it was
// opened from. Expanding under the control also reads better on a phone.
//
// Built on the pure grid helpers in calendar.js and painted with the same
// .cal-* rules the More → Delivery Dates screen already uses, so a day looks the
// same wherever the baker meets it.

import { el, button } from "./ui.js";
import { DOW, addMonth, monthLabel, monthWeeks } from "./calendar.js";
import { longDate, todayISO, weekdayName } from "./dates.js";

// How many months the free date field's arrows reach either way from today.
// Wide enough to record an order she took last week or plan one well ahead,
// narrow enough that the arrows always stop somewhere sensible.
const SPAN = 12;

function monthOf(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function before(a, b) {
  return a.year < b.year || (a.year === b.year && a.month < b.month);
}

// The month grid. `idFor(iso)` returns the day's id when that day can be tapped,
// or null to draw it as a plain number — the whole difference between a free
// date field and a delivery-day picker lives there.
function gridEl(shown, { selected, today, idFor, onPick }) {
  const cells = monthWeeks(shown.year, shown.month).flat().map((iso) => {
    if (!iso) return el("span", { class: "cal-cell blank" });
    const dayNum = String(Number(iso.slice(8, 10)));
    let cls = "cal-cell";
    if (iso === selected) cls += " sel";
    else if (iso < today) cls += " past";
    if (iso === today) cls += " today";
    const id = idFor(iso);
    if (id == null) return el("span", { class: cls }, dayNum);
    return el("button", { class: `${cls} tappable`, onclick: () => onPick(id, iso) }, dayNum);
  });
  return el("div", { class: "cal-grid" },
    ...DOW.map((d) => el("span", { class: "cal-dow" }, d)),
    ...cells);
}

// The two pickers share everything below. `value` is an ISO date (or "" when
// nothing is chosen yet); `idFor` decides which days are tappable; `lo`/`hi` are
// the months the arrows may reach; `todayShortcut` adds the one-tap way back to
// today that a free date field needs.
function build({ value, format, today, idFor, lo, hi, onPick, placeholder, todayShortcut }) {
  let open = false;
  let current = value || "";
  let shown = monthOf(current || today);

  const shownText = () => (current ? format(current) : placeholder);
  const btn = el("button", {
    class: "btn soft block datepick-btn",
    onclick: () => { open = !open; paint(); },
  }, el("span", { class: "datepick-val" }, shownText()),
    el("span", { class: "datepick-ico", "aria-hidden": "true" }, "📅"));
  const panel = el("div", { class: "datepick-panel" });
  const wrap = el("div", { class: "datepick" }, btn, panel);

  function choose(id, iso) {
    current = iso;
    shown = monthOf(iso);
    open = false;
    // Repaint before handing over: the caller's own re-render usually replaces
    // this widget, and where it does not (the order-date fields keep their draft
    // and repaint nothing) the label and the folded panel are right anyway.
    paint();
    onPick(id, iso);
  }

  function paint() {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.replaceChildren(
      el("span", { class: "datepick-val" }, shownText()),
      el("span", { class: "datepick-ico", "aria-hidden": "true" }, "📅"));
    if (!open) {
      panel.replaceChildren();
      return;
    }
    // The arrows stop at the months that actually hold a day, so the baker can
    // never page into an empty month and wonder where the dates went.
    if (before(shown, lo)) shown = { ...lo };
    else if (before(hi, shown)) shown = { ...hi };
    const nav = (delta) => { shown = addMonth(shown.year, shown.month, delta); paint(); };
    const prev = button("‹", () => nav(-1), "ghost small cal-nav");
    const next = button("›", () => nav(1), "ghost small cal-nav");
    if (!before(lo, shown)) prev.disabled = true;
    if (!before(shown, hi)) next.disabled = true;
    panel.replaceChildren(
      el("div", { class: "cal-head" },
        prev,
        el("span", { class: "cal-title" }, monthLabel(shown.year, shown.month)),
        next),
      gridEl(shown, { selected: current, today, idFor, onPick: choose }),
      todayShortcut
        ? el("div", { class: "datepick-foot" }, button("Today", () => choose(idFor(today), today), "ghost small"))
        : null);
  }

  paint();
  return wrap;
}

const withWeekday = (iso) => `${weekdayName(iso)}, ${longDate(iso)}`;

// A delivery-day picker over a fixed list of days ([{ id, date }], any order):
// only those days are tappable, and the arrows reach only the months they span
// — plus today's month, so a picker opened on a far-off order can still walk
// back to now. The button names the chosen day with its weekday, the way the
// Orders screen writes every other date.
export function dayPicker(valueId, days, onPick, { placeholder = "Choose a delivery day…" } = {}) {
  const list = (days || []).filter((d) => d && d.id && d.date);
  const today = todayISO();
  const byDate = new Map(list.map((d) => [d.date, d.id]));
  const months = list.map((d) => monthOf(d.date)).concat([monthOf(today)]);
  const match = list.find((d) => d.id === valueId);
  return build({
    value: match ? match.date : "",
    format: withWeekday,
    today,
    idFor: (iso) => (byDate.has(iso) ? byDate.get(iso) : null),
    lo: months.reduce((a, b) => (before(b, a) ? b : a)),
    hi: months.reduce((a, b) => (before(a, b) ? b : a)),
    onPick,
    placeholder,
  });
}

// A free date field — any day of any month in range is the answer, with a Today
// shortcut, since hunting for today through a month grid is tiresome otherwise.
export function dateField(value, onPick, placeholder = "Choose a date…") {
  const today = todayISO();
  const t = monthOf(today);
  return build({
    value,
    format: longDate,
    today,
    idFor: (iso) => iso,
    lo: addMonth(t.year, t.month, -SPAN),
    hi: addMonth(t.year, t.month, SPAN),
    onPick,
    placeholder,
    todayShortcut: true,
  });
}
