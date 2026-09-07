// views/po.js — the headline: tick the bake days to shop for → one combined
// ingredient PO. Days with orders are remembered as already shopped when a
// snapshot covers them (PO History), so they drop out of the default list;
// if orders changed after that day was saved it flips to "orders changed" and
// rejoins the default. Tick a day → its orders add into the SAME list, packs
// round on the combined total, and a running grand total shows below.

import { longDate, todayISO, weekdayName, shortDate } from "../dates.js";
import { explodeBomDates, ordersFingerprint, effectiveCapacity } from "../bom.js";
import { el, button, emptyState, toast } from "../ui.js";
import { save, newId } from "../state.js";
import { priceItems } from "../purchasing.js";
import { poTableEl, totalOf } from "./poTable.js";

export function renderPO(root, state, params) {
  const dates = [...(state.deliveryDates || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!dates.length) {
    root.replaceChildren(emptyState("No delivery dates",
      "Add delivery dates and orders first — then the PO writes itself."));
    return;
  }
  const metas = dates.map((rec) => metaOf(state, rec));

  // Explicit ?dates=/legacy ?date= win over the default selection so PO History
  // can reopen past or already-saved days.
  const explicit = explicitSelection(params, dates);
  const ticked = new Set(explicit ?? metas.filter((m) => defaultTicked(m)).map((m) => m.rec.id));

  const render = () => {
    const chosen = dates.filter((d) => ticked.has(d.id));
    const bom = chosen.length ? explodeBomDates(state, chosen) : null;
    root.replaceChildren(
      pickerCard(metas, ticked, toggle),
      previewCard(state, chosen, bom));
  };
  // Ticking or unticking a day switches to the explicit ?dates= URL (empty when
  // everything is unticked — a bare #/po would silently re-default), then the
  // preview and its running total redraw in place.
  const toggle = (id, checked) => {
    if (checked) ticked.add(id); else ticked.delete(id);
    const ids = dates.filter((d) => ticked.has(d.id)).map((d) => d.id).join(",");
    location.hash = `#/po?dates=${ids}`;
    render();
  };

  render();
}

// One bake day's standing, read only from live state + saved PO snapshots
// (nothing new is persisted for this — coverage is derived, never stored).
function metaOf(state, rec) {
  const past = rec.date < todayISO();
  const orders = (state.orders || []).filter((o) => o.deliveryDateId === rec.id);
  const units = orders.reduce((s, o) => s + (Number(o.qty) || 0), 0);
  const covered = coveringPO(state, rec.date);
  const accurate = covered ? poAccurate(state, covered, rec.date) : false;
  return { rec, past, hasOrders: orders.length > 0, units, covered, accurate };
}

// The newest saved snapshot that covers a date string. New snapshots record
// dates:[{date, fp}]; legacy single-date ones recorded po.deliveryDate.
function coveringPO(state, dateStr) {
  let best = null;
  for (const po of state.purchaseOrders || []) {
    const covers = (Array.isArray(po.dates) && po.dates.some((d) => d.date === dateStr))
      || po.deliveryDate === dateStr;
    if (!covers) continue;
    if (!best || String(po.generatedAt || "").localeCompare(String(best.generatedAt || "")) > 0) best = po;
  }
  return best;
}

// Does the saved list still match today's orders for this date? New snapshots
// compare per-date fingerprints; legacy snapshots (no dates field) fall back to
// matching order id sets — which misses qty edits, a documented acceptable gap.
function poAccurate(state, po, dateStr) {
  if (Array.isArray(po.dates)) {
    const e = po.dates.find((d) => d.date === dateStr);
    return !!e && e.fp === ordersFingerprint(state, dateStr);
  }
  const dateIds = new Set((state.deliveryDates || []).filter((d) => d.date === dateStr).map((d) => d.id));
  const cur = (state.orders || []).filter((o) => dateIds.has(o.deliveryDateId)).map((o) => o.id).sort().join(",");
  const saved = (po.orderIds || []).slice().sort().join(",");
  return cur === saved;
}

// Default ticks: future days with orders whose list was never saved accurately.
// Covered-but-changed days ("orders changed") rejoin; saved + unchanged and past
// days stay unticked. The user can always tick anything with orders by hand.
function defaultTicked(m) {
  return m.hasOrders && !(m.covered && m.accurate) && !m.past;
}

function explicitSelection(params, dates) {
  const multi = params.get("dates");
  if (multi !== null) {
    return multi.split(",").map((s) => s.trim()).filter(Boolean)
      .filter((id) => dates.some((d) => d.id === id));
  }
  const legacy = params.get("date");
  if (legacy && dates.some((d) => d.id === legacy)) return [legacy];
  return null;
}

function pickerCard(metas, ticked, toggle) {
  const rows = metas.map((m) => {
    const { rec, past, units, hasOrders, covered, accurate } = m;
    const box = el("input", { type: "checkbox", checked: ticked.has(rec.id), disabled: !hasOrders });
    box.addEventListener("change", () => toggle(rec.id, box.checked));

    const sub = [];
    if (!hasOrders) sub.push("No orders on this day");
    else sub.push(`${units} unit${units === 1 ? "" : "s"} planned`);
    if (hasOrders && covered && !accurate) sub.push("orders changed since it was saved");
    if (past) sub.push("past");
    const tag = rightTag(m);

    return el("div", { class: `po-day-row${ticked.has(rec.id) ? " on" : ""}${past ? " past" : ""}` },
      box,
      el("div", { class: "po-day-main" },
        el("span", { class: "po-day-title" }, `${weekdayName(rec.date)}, ${longDate(rec.date)}`),
        el("span", { class: "po-day-sub" }, sub.join(" · "))),
      tag ? [tag] : []);
  });

  return el("div", { class: "card" },
    el("h3", { style: "margin:0 0 2px" }, "Shop for which days?"),
    el("p", { class: "card-sub", style: "margin:0 0 4px" },
      "Tick the bake days to shop for — their ingredient needs add up into ONE list. Already-saved days stay unticked."),
    rows.length ? el("div", { class: "po-day-list" }, ...rows) : null);
}

function rightTag(m) {
  const { covered, accurate, hasOrders, past } = m;
  const tag = (cls, text) => el("span", { class: `po-day-tag ${cls}` }, text);
  if (!hasOrders) return tag("no-orders", "no orders");
  if (covered && accurate) return tag("saved", "✓ saved");
  if (covered) return tag("changed", "orders changed");
  if (past) return tag("past", "past");
  return null;
}

// The one date title both the screen heading and the copy-to-supplier order
// text share. A single day reads exactly as it always did.
function headline(recs) {
  const first = recs[0];
  if (recs.length === 1) return `${weekdayName(first.date)}, ${longDate(first.date)}`;
  return recs.map((r) => shortDate(r.date)).join(" · ");
}

function previewCard(state, chosen, bom) {
  if (!chosen.length || !bom || !bom.orders.length) return emptyPreview(state, chosen);

  const items = priceItems(state, bom.items);
  const total = totalOf(items);
  const multi = bom.multi === true;
  const cap = multi ? 0 : effectiveCapacity(state, chosen[0].date);
  const products = bom.productLines.map((p) => `${p.productName} ×${p.qty}`).join(", ");

  const sub = multi
    ? `${bom.totalUnits} units planned across ${chosen.length} bake days · ${products}`
    : `${bom.totalUnits} units planned (capacity ${cap}) · ${products}`;

  const chips = multi
    ? el("div", { class: "po-day-chips" },
      ...chosen.map((r) => el("span", { class: "qty-chip" }, shortDate(r.date))))
    : null;

  const overCap = !multi && bom.totalUnits > cap;

  const table = poTableEl(state, items, { interactive: true, dateTitle: headline(chosen) });

  return el("div", { class: "card po-card" },
    el("h2", { style: "margin:0 0 2px" }, `${headline(chosen)} — Ingredients to buy`),
    el("p", { class: "card-sub", style: "margin:0 0 8px" }, sub),
    chips,
    overCap ? el("div", { class: "danger-banner" }, "Over capacity — check the order list.") : null,
    bom.warnings.length ? el("div", { class: "warn" }, bom.warnings.join(" ")) : null,
    table,
    el("div", { class: "btn-row" },
      button("💾 Generate & Save", () => generate(state, chosen, bom, items, total), "primary"),
      button("Print", () => window.print(), "soft")),
    el("p", { class: "po-snapshot-note" },
      multi
        ? "Generating saves ONE snapshot of these days to PO History — each becomes \"✓ saved\" and drops out of the default list."
        : "Generating saves an immutable snapshot to PO History. Changing orders later won't change it."));
}

function emptyPreview(state, chosen) {
  if (!chosen.length) {
    const anyOrders = (state.orders || []).length > 0;
    return el("div", { class: "card po-card" },
      emptyState(anyOrders ? "Those days are already shopped ✓" : "No orders yet",
        anyOrders
          ? "Every day with orders already has a saved, unchanged list. Tick any day above to rebuild it — days marked \"orders changed\" include the new orders."
          : "The PO is built from orders — add some orders to a bake day first, then come back."));
  }
  return el("div", { class: "card po-card" },
    emptyState("Nothing to buy",
      "None of the ticked days have orders yet, so there is nothing to add up."));
}

function generate(state, recs, bom, items, total) {
  if (!bom.orders.length) return toast("No orders — nothing to generate");
  const po = {
    id: newId("po"),
    deliveryDateId: recs[0].id, // backward-compatible single-day pointer
    deliveryDate: recs[0].date,
    generatedAt: new Date().toISOString(),
    items,
    dates: recs.map((r) => ({ id: r.id, date: r.date, fp: ordersFingerprint(state, r.date) })),
    summary: {
      totalUnits: bom.totalUnits,
      capacity: recs.reduce((s, r) => s + effectiveCapacity(state, r.date), 0),
      totalEstCost: total,
      buyTotal: total, // whole-pack cost of the firm supplier lines + loose estimates
      productLines: bom.productLines,
    },
    orderIds: bom.orders.map((o) => o.id),
    warnings: bom.warnings,
  };
  state.purchaseOrders.unshift(po);
  save(state);
  toast("PO saved to history");
  location.hash = `#/history?po=${po.id}`;
}
