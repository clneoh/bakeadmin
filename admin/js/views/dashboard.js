// views/dashboard.js — Home: upcoming delivery dates with status + fill.

import { navigate } from "../app.js";
import { deliveryStatus, generateUpcomingDates, longDate, todayISO, weekdayName } from "../dates.js";
import { capacityStatus, effectiveCapacity } from "../bom.js";
import { el, badge, emptyState, button } from "../ui.js";
import { gauge } from "../gauge.js";
import { byId, newId, save } from "../state.js";
import { WEEKLY_TASKS, loadRoutine, money, newOrderCount, nextBake, toggleRoutine, weekStats } from "../weekly.js";

function statusInfo(state, date, total) {
  const { closed, past } = deliveryStatus(date.date, state.settings);
  const cap = effectiveCapacity(state, date.date);
  if (past) return { label: "Past", cls: "badge-past", closed: true };
  if (closed) return { label: "Closed", cls: "badge-closed", closed: true };
  if (total > cap) return { label: "Over", cls: "badge-over", closed: false };
  if (total >= cap) return { label: "Full", cls: "badge-full", closed: false };
  return { label: "Open", cls: "badge-open", closed: false };
}

function deliveryCard(state, date) {
  const cap = capacityStatus(state, date.id);
  const st = statusInfo(state, date, cap.total);
  const sub = st.closed && !st.past && date.date === todayISO()
    ? "Today — orders closed"
    : `${st.closed ? "" : "Cut-off in "}${deliveryStatus(date.date, state.settings).countdown}`.trim();

  const badgeEl = badge(st.cls.replace("badge-", ""));

  return el("div", {
    class: `card tappable${st.closed && !st.past ? " closed" : ""}`,
    onclick: () => navigate(`#/orders?date=${date.id}`),
  },
    el("div", { class: "card-row" },
      el("div", {},
        el("p", { class: "card-title" }, `${weekdayName(date.date)}, ${longDate(date.date)}`),
        el("p", { class: "card-sub countdown", dataset: { date: date.date } },
          st.closed || st.past ? `${cap.total} ordered` : sub)),
      badgeEl),
    gauge(cap.total, cap.capacity));
}

function generateWeek(state) {
  const newDates = generateUpcomingDates(state.settings, 6,
    state.deliveryDates.map((d) => d.date));
  for (const date of newDates) {
    state.deliveryDates.push({
      id: newId("del"),
      date,
      notes: "",
    });
  }
  save(state);
  renderInner(document.getElementById("view"), state);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// "What needs you now": every group still marked New, across all delivery dates.
// Tapping goes to the Orders tab, which already leads with the New-Orders inbox.
function needsCard(n) {
  return el("div", {
    class: "card tappable",
    onclick: () => navigate("#/orders"),
  },
    el("div", { class: "card-row" },
      el("div", {},
        el("p", { class: "card-title" }, `${n} new order${n === 1 ? "" : "s"} to confirm`),
        el("p", { class: "card-sub" }, "Waiting on you — tap to open")),
      el("span", { class: "badge badge-open" }, n > 99 ? "99+" : String(n))));
}

// "Next bake": the next delivery with orders still to bake, product by product.
function bakeCard(state, bake) {
  const date = byId(state.deliveryDates, bake.dateId);
  const head = el("div", { class: "card-row" },
    el("div", {},
      el("p", { class: "card-title" }, "Next bake"),
      el("p", { class: "card-sub" },
        date ? `${weekdayName(date.date)}, ${longDate(date.date)}` : "")),
    bake.hasWork ? el("span", { class: "qty-chip" },
      `${bake.totalItems} item${bake.totalItems === 1 ? "" : "s"}`) : null);
  const body = bake.hasWork
    ? el("div", { class: "bake-lines" },
        ...bake.lines.map((l) => el("div", { class: "bake-line" },
          el("span", {}, l.name),
          el("span", { class: "muted" }, `×${l.qty}`))))
    : el("p", { class: "card-sub", style: "margin-top:8px" },
        date ? `Nothing to bake for ${weekdayName(date.date)} yet` : "");
  return el("div", {
    class: "card tappable",
    onclick: () => navigate(`#/orders?date=${bake.dateId}`),
  }, head, body);
}

// "This week": orders placed in the last 7 days, their value, top sellers.
function weekCard(state, w) {
  const fig = (n, label) => el("div", {},
    el("p", { class: "stat-num" }, n),
    el("p", { class: "stat-label" }, label));
  const rows = [
    el("div", { class: "stat-grid" },
      fig(w.orders, "orders placed"),
      fig(`≈ ${money(state, w.rm)}`, "est. value")),
  ];
  if (w.orders === 0) {
    rows.push(el("p", { class: "card-sub", style: "margin-top:8px" },
      "Nothing yet — share your shop link."));
  } else {
    rows.push(el("p", { class: "card-sub", style: "margin-top:8px" },
      w.top.length
        ? `Top sellers: ${w.top.map((t) => t.name).join(", ")}`
        : "No prices set on products yet",
      w.unpriced ? " · some items unpriced" : ""));
  }
  return el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("p", { class: "card-title" }, "This week"),
      w.orders ? el("span", { class: "qty-chip" }, `${w.orders} order${w.orders === 1 ? "" : "s"}`) : null),
    ...rows);
}

// The weekly to-do: her fixed routine, ticked off, fresh each Monday.
function routineCard(root, state, today) {
  const rt = loadRoutine(state, { today });
  const monday = rt.week;
  const doneCount = WEEKLY_TASKS.filter((t) => rt.done[t.id]).length;
  const rows = WEEKLY_TASKS.map((t) => {
    const done = !!rt.done[t.id];
    return el("button", {
      class: "check-row",
      onclick: () => { toggleRoutine(state, t.id, { today }); renderInner(root, state); },
    },
      el("span", { class: `check-dot${done ? " done" : ""}` }, done ? "✓" : ""),
      el("span", { class: `check-label${done ? " done" : ""}` }, t.label));
  });
  return el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("div", {},
        el("p", { class: "card-title" }, "This week's to-do"),
        el("p", { class: "card-sub" },
          `Week of ${weekdayName(monday)}, ${longDate(monday)} — tick as you go`)),
      el("span", { class: "qty-chip" }, `${doneCount}/${WEEKLY_TASKS.length}`)),
    el("div", { class: "check-list" }, ...rows));
}

function atAGlanceBlocks(root, state, today) {
  const blocks = [];

  const needs = newOrderCount(state);
  if (needs > 0) blocks.push(needsCard(needs));

  const bake = nextBake(state, { today });
  if (bake) blocks.push(bakeCard(state, bake));

  blocks.push(weekCard(state, weekStats(state, { today })));
  blocks.push(routineCard(root, state, today));
  return blocks;
}

function renderInner(root, state) {
  const today = todayISO();
  const dates = [...state.deliveryDates]
    .filter((d) => d.date >= todayISO())
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = [...state.deliveryDates]
    .filter((d) => d.date < todayISO())
    .sort((a, b) => b.date.localeCompare(a.date));

  const cards = dates.map((d) => deliveryCard(state, d));

  const hero = el("div", { class: "hero" },
    el("div", { class: "hero-row" },
      el("div", { class: "hero-text" },
        el("p", { class: "hero-eyebrow" }, `${weekdayName(today)}, ${longDate(today)}`),
        el("h2", { class: "hero-title" }, `${greeting()}, ready to bake?`)),
      button("＋ New order", () => navigate("#/orders"), "hero-btn")),
    el("p", { class: "hero-sub" },
      `Orders close ${state.settings.cutoff} the day before · tap a date below to take orders`));

  // Conditional pieces are spread from arrays: replaceChildren would otherwise
  // turn a trailing null into a stray "null" text node in the real DOM.
  root.replaceChildren(
    hero,
    ...atAGlanceBlocks(root, state, today),
    el("h2", { class: "section" }, `Upcoming deliveries${dates.length ? ` (${dates.length})` : ""}`),
    ...(cards.length ? cards : [emptyState("No delivery dates yet",
      "Add the next Mon/Wed/Fri dates to start taking orders.")]),
    ...(!dates.length ? [el("div", {}, button("Generate next delivery dates",
      () => generateWeek(state), "block primary"))] : []),
    ...(past.length ? [pastSection(state, past)] : []),
  );
}

function pastSection(state, past) {
  const list = el("div", { hidden: true });
  const head = el("button", {
    class: "btn ghost small",
    onclick: () => { list.hidden = !list.hidden; },
  }, `Past dates (${past.length})`);
  for (const d of past.slice(0, 8)) {
    const cap = capacityStatus(state, d.id);
    list.appendChild(el("div", {
      class: "card tappable",
      onclick: () => navigate(`#/orders?date=${d.id}`),
    },
      el("div", { class: "card-row" },
        el("div", {}, el("p", { class: "card-title" }, `${weekdayName(d.date)}, ${longDate(d.date)}`)),
        el("span", { class: "qty-chip" }, `${cap.total} ordered`))));
  }
  return el("div", { style: "margin-top:18px" }, head, list);
}

export function renderDashboard(root, state) {
  renderInner(root, state);

  // Refresh countdowns + status badges every minute without a full re-render.
  const timer = setInterval(() => {
    for (const node of root.querySelectorAll(".countdown")) {
      const dateStr = node.dataset.date;
      if (!dateStr) continue;
      const st = deliveryStatus(dateStr, state.settings);
      if (!st.closed && !st.past) node.textContent = `Cut-off in ${st.countdown}`;
    }
  }, 60000);

  return () => clearInterval(timer);
}
