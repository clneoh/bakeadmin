// views/dashboard.js — Home: upcoming delivery dates with status + fill.

import { navigate } from "../app.js";
import { deliveryStatus, generateUpcomingDates, longDate, todayISO, weekdayName } from "../dates.js";
import { capacityStatus, effectiveCapacity } from "../bom.js";
import { el, badge, fillMeter, emptyState, button } from "../ui.js";
import { newId, save } from "../state.js";

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
    fillMeter(cap.total, cap.capacity));
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

  root.replaceChildren(
    hero,
    el("h2", { class: "section" }, `Upcoming deliveries${dates.length ? ` (${dates.length})` : ""}`),
    ...(cards.length ? cards : [emptyState("No delivery dates yet",
      "Add the next Mon/Wed/Fri dates to start taking orders.")]),
    !dates.length ? el("div", {}, button("Generate next delivery dates",
      () => generateWeek(state), "block primary")) : null,
    past.length ? pastSection(state, past) : null,
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
