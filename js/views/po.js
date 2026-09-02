// views/po.js — the headline: pick a delivery date → auto ingredient PO.

import { navigate } from "../app.js";
import { longDate, todayISO, weekdayName } from "../dates.js";
import { explodeBom, capacityStatus } from "../bom.js";
import { el, button, select, emptyState, fmtQty, toast } from "../ui.js";
import { byId, fmtRM, newId, round2, save } from "../state.js";

export function renderPO(root, state, params) {
  const dates = [...state.deliveryDates].sort((a, b) => a.date.localeCompare(b.date));
  if (!dates.length) {
    root.replaceChildren(emptyState("No delivery dates",
      "Add delivery dates and orders first — then the PO writes itself."));
    return;
  }
  const requested = params.get("date");
  const activeId = (requested && dates.some((d) => d.id === requested))
    ? requested
    : (dates.find((d) => d.date >= todayISO())?.id || dates[dates.length - 1].id);

  const date = byId(dates, activeId);
  const sel = select(dates.map((d) => ({
    value: d.id,
    label: `${weekdayName(d.date)} ${d.date}`,
  })), date.id, () => navigate(`#/po?date=${sel.value}`));

  const preview = poPreview(state, date, true);

  root.replaceChildren(
    el("div", { class: "field" }, el("label", {}, "Delivery date"), sel),
    preview);
}

function poPreview(state, date, interactive) {
  const bom = explodeBom(state, date.id);
  const cap = capacityStatus(state, date.id);

  if (!bom.orders.length) {
    return el("div", { class: "card po-card" },
      emptyState("No orders for this date",
        "Nothing to buy — the PO is generated from orders."));
  }

  const rows = bom.items.map((it) => {
    const cells = [
      el("td", {},
        it.ingredientName,
        it.unitsOk ? null : el("div", { class: "warn", style: "margin:4px 0 0" }, "⚠ check units"),
        el("div", { class: "po-breakdown" },
          it.lines.map((l) => `${l.productName} ×${l.orderQty} = ${l.orderQty * l.perUnitQty}${it.unit}`).join(" · "))),
      el("td", { class: "num" }, fmtQty(it.totalQty, it.unit)),
      el("td", { class: "num" }, fmtRM(it.estCost, state.settings.currency)),
    ];
    return el("tr", {}, ...cells);
  });

  const total = round2(bom.items.reduce((s, i) => s + i.estCost, 0));

  const table = el("table", { class: "po-table" },
    el("thead", {}, el("tr", {},
      el("th", {}, "Ingredient"),
      el("th", { class: "num" }, "Qty"),
      el("th", { class: "num" }, "Est. cost"))),
    el("tbody", {}, ...rows),
    el("tfoot", {}, el("tr", {}, el("td", { colspan: "2", class: "po-total" }, "Total"),
      el("td", { class: "num po-total" }, fmtRM(total, state.settings.currency)))));

  const actions = interactive ? el("div", { class: "btn-row" },
    button("💾 Generate & Save", () => generate(state, date, bom, total), "primary"),
    button("Print", () => window.print(), "soft")) : null;

  return el("div", { class: "card po-card" },
    el("h2", { style: "margin:0 0 2px" }, `${weekdayName(date.date)}, ${longDate(date.date)} — Ingredients to buy`),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      `${cap.total} units planned (capacity ${cap.capacity}) · ${bom.productLines.map((p) => `${p.productName} ×${p.qty}`).join(", ")}`),
    cap.exceeded ? el("div", { class: "danger-banner" }, "Over capacity — check the order list.") : null,
    bom.warnings.length ? el("div", { class: "warn" }, bom.warnings.join(" ")) : null,
    table,
    actions,
    interactive ? el("p", { class: "po-snapshot-note" },
      "Generating saves an immutable snapshot to PO History. Changing orders later won't change it.") : null);
}

function generate(state, date, bom, total) {
  if (!bom.orders.length) return toast("No orders — nothing to generate");
  const po = {
    id: newId("po"),
    deliveryDateId: date.id,
    deliveryDate: date.date,
    generatedAt: new Date().toISOString(),
    items: bom.items,
    summary: {
      totalUnits: bom.totalUnits,
      capacity: state.deliveryDates.find((d) => d.id === date.id)?.capacity ?? state.settings.defaultCapacity,
      totalEstCost: total,
      productLines: bom.productLines,
    },
    orderIds: bom.orders.map((o) => o.id),
    warnings: bom.warnings,
  };
  state.purchaseOrders.unshift(po);
  save(state);
  toast("PO saved to history");
  navigate(`#/history?po=${po.id}`);
}
