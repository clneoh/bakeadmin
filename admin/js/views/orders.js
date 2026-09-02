// views/orders.js — per-delivery-date order intake (manual, warn-not-block).

import { deliveryStatus, fmtPlaced, longDate, shortDate, todayISO, weekdayName } from "../dates.js";
import { capacityStatus, productRemaining } from "../bom.js";
import { el, button, select, fillMeter, emptyState, confirmDialog, toast } from "../ui.js";
import { byId, fmtRM, groupOrders, newId, orderCode, save, updateOrderBadge, waNumber } from "../state.js";
import { buildConfirmation } from "../confirm.js";
import { maybeSync, publishTracking } from "../supabase.js";

let editingOrderId = null;
let orderStatusFilter = "";

const STATUSES = [
  ["new", "New"],
  ["confirmed", "Confirmed"],
  ["baking", "Baking"],
  ["ready", "Ready"],
  ["delivered", "Delivered"],
];

// A confirmable status (Confirmed/Baking/Ready) is what sends the customer
// their WhatsApp confirmation with the payment QR — so it needs a number on
// the order. Exported so the gate is testable without a DOM.
export function statusNeedsWhatsapp(status) {
  return ["confirmed", "baking", "ready"].includes(status);
}

// Apply shared detail edits to every order in a storefront group (customer
// name, phone, delivery method, address, note, order date) plus each item's new
// quantity from its stepper. Pure — exported so the group-edit behaviour is
// testable without a DOM.
export function filterOrderGroups(groups, status) {
  if (!status) return groups;
  // Match the status the group *displays* (its first item's), not "any item in
  // the group". A storefront group shows one status dropdown that applies to the
  // whole order, so filtering by any item would make a mixed-status group appear
  // under every filter at once — e.g. a leftover Delivered order still showing
  // when another status is selected.
  return (groups || []).filter((g) => (((g.orders && g.orders[0]) || {}).status || "new") === status);
}

export function applyGroupPatch(orders, patch, qtyOf) {
  for (const o of orders || []) {
    if (qtyOf) o.qty = qtyOf(o.id);
    o.customerName = patch.customerName;
    o.whatsapp = patch.whatsapp;
    o.fulfillment = patch.fulfillment;
    o.address = patch.address;
    o.note = patch.note;
    o.orderDate = patch.orderDate;
  }
  return orders;
}

export function renderOrders(root, state, params) {
  editingOrderId = null;
  orderStatusFilter = "";
  renderAll(root, state, params);
}

function renderAll(root, state, params) {
  const dates = [...state.deliveryDates].sort((a, b) => a.date.localeCompare(b.date));
  if (!dates.length) {
    root.replaceChildren(emptyState("No delivery dates yet",
      "Add delivery dates first — go to More → Delivery Dates."));
    return;
  }
  const requested = params.get("date");
  let activeId = (requested && dates.some((d) => d.id === requested))
    ? requested
    : (dates.find((d) => d.date >= todayISO())?.id || dates[dates.length - 1].id);

  const strip = el("div", { class: "date-tabs" });
  const content = el("div", {});

  const renderContent = () => {
    const date = byId(state.deliveryDates, activeId);
    if (!date) {
      content.replaceChildren(emptyState("Delivery date missing",
        "This order's delivery date was deleted. Remove it from the New Orders box."));
      return;
    }
    content.replaceChildren(dateContent(state, date, root));
  };

  // Switch dates in place instead of navigating: the strip keeps its scroll and
  // only the order area below is rebuilt. The URL still updates (without
  // firing the router) so the current date stays shareable.
  const selectDate = (id) => {
    editingOrderId = null;
    activeId = id;
    for (const t of strip.querySelectorAll(".date-tab")) {
      t.classList.toggle("active", t.dataset.dateId === id);
    }
    renderContent();
    if (history && history.replaceState) {
      history.replaceState(null, "", `#/orders?date=${id}`);
    }
  };

  for (const d of dates) {
    const { closed, past } = deliveryStatus(d.date, state.settings);
    strip.appendChild(el("a", {
      class: `date-tab${d.id === activeId ? " active" : ""}`,
      href: `#/orders?date=${d.id}`,
      dataset: { dateId: d.id },
      onclick: (ev) => { ev.preventDefault(); selectDate(d.id); },
    },
      el("span", { class: `dot${closed || past ? " closed" : ""}` }, "● "),
      shortDate(d.date)));
  }

  // The strip is rebuilt on a full render (e.g. arriving via the router, or
  // after an order is saved). Scroll the active tab back into view so a later
  // date isn't hidden off the strip's edge.
  const raf = globalThis.requestAnimationFrame || ((fn) => fn());
  raf(() => {
    const active = strip.querySelector(".date-tab.active");
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });

  renderContent();
  const inbox = newOrdersInbox(state, selectDate, root);
  if (inbox) {
    root.replaceChildren(inbox, strip, content);
  } else {
    root.replaceChildren(strip, content);
  }
}

// Inbox card at the top of the Orders screen: every order still waiting to be
// handled (status New), across all delivery dates, oldest first. Tap a row to
// jump to that delivery date and confirm it. The red tab badge counts the same
// set, so a new storefront order surfaces here without digging through dates.
// A storefront order with several items is one row ("Focaccia + Sandwich"),
// not one row per item.
export function newOrdersInbox(state, selectDate, root) {
  const unread = (state.orders || [])
    .filter((o) => (o.status || "new") === "new")
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  if (!unread.length) return null;

  const rows = groupOrders(unread).map((g) => {
    const first = g.orders[0];
    const date = byId(state.deliveryDates, first.deliveryDateId);
    const orphan = !date;
    const title = g.orders
      .map((o) => byId(state.products, o.productId)?.name || "(deleted product)")
      .join(" + ");
    const qtyTotal = g.orders.reduce((s, o) => s + o.qty, 0);
    const sub = [first.customerName || "No name", date ? shortDate(date.date) : "",
      `Placed ${fmtPlaced(first.createdAt, first.orderDate)}`]
      .filter(Boolean).join(" · ");
    const main = el("div", { class: "li-main" },
      el("div", { class: "li-title" }, title,
        g.orders.some((o) => o.source === "storefront") ? el("span", { class: "src-tag" }, "storefront") : null),
      el("div", { class: "li-sub" }, sub));
    const meta = el("div", { class: "li-right" },
      el("span", { class: "qty-chip" }, `×${qtyTotal}`),
      orphan ? null : el("span", { class: "inbox-arrow" }, "›"));
    // An orphaned order (its delivery date was deleted) has no date to open, so
    // it renders as a plain row — but it still gets a ✕ so it can be removed.
    const nav = orphan
      ? el("span", { class: "inbox-main" }, main, meta)
      : el("a", {
          class: "inbox-main",
          href: `#/orders?date=${first.deliveryDateId}`,
          // Switch dates in place like the date tabs (not native hash navigation,
          // which is flaky on iOS) so the tap reliably opens the order's date.
          onclick: (ev) => { ev.preventDefault(); selectDate(first.deliveryDateId); },
        }, main, meta);
    return el("div", { class: "inbox-item" },
      nav,
      el("button", {
        class: "inbox-del",
        "aria-label": "Remove order",
        onclick: () => removeOrder(state, g, root, first.deliveryDateId),
      }, "✕"));
  });

  return el("div", { class: "card inbox" },
    el("h3", { style: "margin:0 0 2px" },
      `📥 ${rows.length} new order${rows.length === 1 ? "" : "s"}`),
    el("p", { class: "card-sub", style: "margin:0 0 6px" },
      "Tap a row to open the delivery date and confirm."),
    el("div", { class: "inbox-list" }, ...rows));
}

function dateContent(state, date, root) {
  const st = deliveryStatus(date.date, state.settings);
  const cap = capacityStatus(state, date.id);
  const dateLabel = `${weekdayName(date.date)}, ${longDate(date.date)}`;

  const header = el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("div", {},
        el("p", { class: "card-title" }, dateLabel),
        el("p", { class: "card-sub" },
          st.past ? "Past delivery"
            : st.closed ? `Orders closed at ${state.settings.cutoff} yesterday`
              : `Open · cut-off in ${st.countdown}`)),
      el("span", { class: "qty-chip" }, `${cap.total}/${cap.capacity}`)),
    fillMeter(cap.total, cap.capacity),
    cap.exceeded ? el("div", { class: "danger-banner" },
      `Over capacity by ${cap.total - cap.capacity}. Add more only if she can bake extra.`) : null);

  const form = orderForm(state, date.id, root);
  const list = orderList(state, date.id, root);

  return el("div", {}, header, form, list);
}

function productOptions(state, dateId, excludeOrderId = null) {
  return state.products
    .filter((p) => p.active !== false)
    .map((p) => {
      const pr = productRemaining(state, dateId, p.id, excludeOrderId);
      const label = pr ? `${p.name} — ${pr.remaining <= 0 ? "sold out" : `${pr.remaining} left`}` : p.name;
      return { value: p.id, label };
    });
}

function orderForm(state, dateId, root) {
  const date = byId(state.deliveryDates, dateId);
  const editing = editingOrderId ? byId(state.orders, editingOrderId) : null;
  const group = editing
    ? (groupOrders(state.orders).find((g) => g.orders.some((o) => o.id === editing.id)) || { orders: [editing] })
    : null;
  const groupEdit = !!group && group.orders.length > 1;

  // The form edits a *draft*, not the order directly. Each input writes through
  // to the draft as the baker types and reads back from it, so a mid-edit
  // re-render (a sync pull, a fresh storefront import, another row's status
  // change) rebuilds this form with what she actually typed — a cleared WhatsApp
  // number stays cleared instead of the saved value popping back in. Cancel just
  // discards the draft; nothing is written until Update.
  const draft = {
    customerName: editing ? (editing.customerName || "") : "",
    whatsapp: editing ? waNumber(editing.whatsapp || "") : "",
    fulfillment: editing ? (editing.fulfillment || "collect") : "collect",
    address: editing ? (editing.address || "") : "",
    note: editing ? (editing.note || "") : "",
    orderDate: editing ? (editing.orderDate || String(editing.createdAt || "").slice(0, 10) || todayISO()) : todayISO(),
  };
  // `this` is the input element (addEventListener binds it), which lets the
  // handler reference the element before its const is assigned.
  const customer = el("input", { class: "input", placeholder: "Customer name (optional)",
    value: draft.customerName, oninput: function () { draft.customerName = this.value; } });
  const whatsapp = el("input", { class: "input", type: "tel", inputmode: "tel",
    placeholder: "e.g. 012-345 6789",
    value: draft.whatsapp, oninput: function () { draft.whatsapp = this.value; } });
  const fulfillmentSel = select(
    [{ value: "collect", label: "Self collect" }, { value: "courier", label: "Courier delivery" }],
    draft.fulfillment, function () { draft.fulfillment = this.value; });
  const address = el("input", { class: "input", placeholder: "Delivery address (if courier)",
    value: draft.address, oninput: function () { draft.address = this.value; } });
  const note = el("input", { class: "input", placeholder: "Note (optional)",
    value: draft.note, oninput: function () { draft.note = this.value; } });
  const orderDate = el("input", { class: "input", type: "date",
    value: draft.orderDate, oninput: function () { draft.orderDate = this.value; } });

  // Group edit (a storefront order with several items): each item gets its own
  // quantity stepper; the fields below apply to the whole customer order.
  const qtyRefs = new Map();
  let topSection;
  let submit;
  if (groupEdit) {
    const itemRows = group.orders.map((o) => {
      const p = byId(state.products, o.productId);
      const qtySpan = el("span", { class: "stepper-val" }, String(o.qty));
      qtyRefs.set(o.id, () => Math.max(1, Number(qtySpan.textContent) || 1));
      return el("div", { class: "edit-item" },
        el("span", { class: "li-title" }, p ? p.name : "(deleted product)"),
        el("div", { class: "stepper" },
          el("button", { onclick: () => { qtySpan.textContent = Math.max(1, qtyRefs.get(o.id)() - 1); } }, "−"),
          qtySpan,
          el("button", { onclick: () => { qtySpan.textContent = qtyRefs.get(o.id)() + 1; } }, "＋")));
    });
    topSection = el("div", { class: "field" },
      el("label", {}, "Items"),
      ...itemRows);
    submit = () => {
      applyGroupPatch(group.orders, {
        customerName: customer.value.trim(),
        whatsapp: waNumber(whatsapp.value.trim()),
        fulfillment: fulfillmentSel.value,
        address: address.value.trim(),
        note: note.value.trim(),
        orderDate: orderDate.value,
      }, (id) => qtyRefs.get(id)());
      save(state);
      maybeSync(state);
      editingOrderId = null;
      toast("Order updated");
      rerender();
    };
  } else {
    let products = productOptions(state, dateId, editing ? editing.id : null);
    if (editing && !products.some((p) => p.value === editing.productId)) {
      const prod = byId(state.products, editing.productId);
      if (prod) products = [...products, { value: prod.id, label: `${prod.name} (hidden)` }];
    }
    if (!products.length) {
      return el("div", { class: "card" },
        el("p", { class: "muted" }, "No products yet. Add products with their recipes first — More → Products."));
    }
    if (editing) {
      const qtySpan = el("span", { class: "stepper-val" }, String(editing.qty));
      const qty = () => Math.max(1, Number(qtySpan.textContent) || 1);
      const availLine = el("p", { class: "avail-line" });
      const updateAvail = () => {
        const product = byId(state.products, productSel.value);
        const pr = product ? productRemaining(state, dateId, product.id, editing.id) : null;
        if (!pr) {
          availLine.textContent = product
            ? `${product.name}: no daily limit — unlimited`
            : "Pick a product to see how many are left today";
          availLine.className = "avail-line";
          return;
        }
        const adding = qty();
        const over = adding > pr.remaining;
        availLine.textContent = pr.remaining <= 0
          ? `${product.name}: sold out today — ${pr.booked} of ${pr.limit} ordered`
          : `${product.name}: ${pr.remaining} of ${pr.limit} left today${over ? ` — adding ${adding} is more than is left` : ""}`;
        availLine.className = "avail-line" + (pr.remaining <= 0 || over ? " warn" : "");
      };
      const productSel = select(products, editing.productId, updateAvail, "Product…");
      updateAvail();
      topSection = el("div", {},
        el("div", { class: "field" }, productSel),
        availLine,
        el("div", { class: "form-grid" },
          el("div", {},
            el("label", {}, "Quantity"),
            el("div", { class: "stepper" },
              el("button", { onclick: () => { qtySpan.textContent = Math.max(1, qty() - 1); updateAvail(); } }, "−"),
              qtySpan,
              el("button", { onclick: () => { qtySpan.textContent = qty() + 1; updateAvail(); } }, "＋"))),
          el("div", {}, el("label", {}, "Customer"), customer),
          el("div", {},
            el("label", {}, "Order date"),
            orderDate),
          el("div", {},
            el("label", {}, "WhatsApp (optional)"),
            whatsapp),
          el("div", {}, el("label", {}, "Fulfillment"), fulfillmentSel),
          el("div", {},
            el("label", {}, "Delivery address (if courier)"),
            address)));
      submit = () => {
        if (!productSel.value) return toast("Choose a product");
        editing.productId = productSel.value;
        editing.qty = qty();
        editing.customerName = customer.value.trim();
        editing.whatsapp = waNumber(whatsapp.value.trim());
        editing.fulfillment = fulfillmentSel.value;
        editing.address = address.value.trim();
        editing.note = note.value.trim();
        editing.orderDate = orderDate.value;
        save(state);
        maybeSync(state);
        editingOrderId = null;
        toast("Order updated");
        return rerender();
      };
    } else {
      // Manual entry can take several items at once — they become ONE customer
      // order (a shared group), the same shape a multi-item storefront order
      // arrives as, so the list/inbox/confirm all treat it as a single order.
      const rowsEl = el("div", {});
      const items = [{ productId: "", qty: 1 }];
      const renderRows = () => {
        rowsEl.replaceChildren(...items.map((it, i) => {
          const prodSel = select(products, it.productId,
            () => { it.productId = prodSel.value; }, "Product…");
          const qtySpan = el("span", { class: "stepper-val" }, String(it.qty));
          return el("div", { class: "add-item" },
            prodSel,
            el("div", { class: "stepper" },
              el("button", { onclick: () => { it.qty = Math.max(1, it.qty - 1); qtySpan.textContent = String(it.qty); } }, "−"),
              qtySpan,
              el("button", { onclick: () => { it.qty = it.qty + 1; qtySpan.textContent = String(it.qty); } }, "＋")),
            el("button", { class: "inbox-del", "aria-label": "Remove item",
              onclick: () => { items.splice(i, 1); renderRows(); } }, "✕"));
        }));
      };
      renderRows();
      topSection = el("div", {},
        el("div", { class: "field" },
          el("label", {}, "Items"),
          rowsEl,
          button("＋ Add another item", () => { items.push({ productId: "", qty: 1 }); renderRows(); }, "ghost")),
        el("div", { class: "form-grid" },
          el("div", {}, el("label", {}, "Customer"), customer),
          el("div", {}, el("label", {}, "Order date"), orderDate),
          el("div", {}, el("label", {}, "WhatsApp (optional)"), whatsapp),
          el("div", {}, el("label", {}, "Fulfillment"), fulfillmentSel),
          el("div", {}, el("label", {}, "Delivery address (if courier)"), address)));
      submit = () => {
        const picked = items.filter((it) => it.productId);
        if (!picked.length) return toast("Choose a product");
        // Local names avoid shadowing the form elements declared above.
        const customerName = customer.value.trim();
        const phone = waNumber(whatsapp.value.trim());
        const fulfillment = fulfillmentSel.value;
        const addressText = address.value.trim();
        const noteText = note.value.trim();
        const placed = orderDate.value;
        if (picked.length === 1) {
          addNew(state, date, picked[0].productId, picked[0].qty, customerName, phone, fulfillment, addressText, noteText, placed, root);
        } else {
          addGroupNew(state, date, picked, customerName, phone, fulfillment, addressText, noteText, placed, root);
        }
      };
    }
  }

  const formGrid = groupEdit
    ? el("div", { class: "form-grid" },
        el("div", {}, el("label", {}, "Customer"), customer),
        el("div", {},
          el("label", {}, "Order date"),
          orderDate),
        el("div", {},
          el("label", {}, "WhatsApp (optional)"),
          whatsapp),
        el("div", {}, el("label", {}, "Fulfillment"), fulfillmentSel),
        el("div", {},
          el("label", {}, "Delivery address (if courier)"),
          address))
    : null;

  const submitBtn = button(editing ? "Update order" : "＋ Add order", submit, "block primary");

  const card = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, editing ? "Edit order" : "New order"),
    topSection,
    formGrid,
    groupEdit ? el("div", { class: "card-sub", style: "margin:0 0 10px" },
      "This is one customer order with several items — the details above apply to the whole order.") : null,
    !editing ? el("div", { class: "card-sub", style: "margin:0 0 10px" },
      "Everything in the Items list becomes one customer order — add every item, then press Add order.") : null,
    el("div", { class: "card-sub", style: "margin:0 0 10px" },
      "Order date = when it was placed (defaults to today). WhatsApp is kept in your delivery history for marketing follow-ups."),
    el("div", { class: "field", style: "margin-top:10px" }, note),
    submitBtn,
    editing ? el("div", { style: "margin-top:8px" },
      button("Cancel edit", () => { editingOrderId = null; rerender(); }, "ghost block")) : null);

  function rerender() { renderAll(root, state, new URLSearchParams({ date: dateId })); }
  return card;
}

function addNew(state, date, productId, qty, customerName, whatsapp, fulfillment, address, note, orderDate, root) {
  const cap = capacityStatus(state, date.id);
  const newTotal = cap.total + qty;
  const st = deliveryStatus(date.date, state.settings);

  function commit() {
    state.orders.push({
      id: newId("ord"),
      deliveryDateId: date.id,
      deliveryDate: date.date, // snapshot so the order stays in history if the date is deleted
      orderDate: orderDate || todayISO(), // when the order was placed/recorded (defaults to today)
      productId,
      qty,
      customerName,
      whatsapp,
      fulfillment: fulfillment || "collect",
      address: address || "",
      note,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    save(state);
    maybeSync(state);
    updateOrderBadge(state);
    toast("Order added");
    renderAll(root, state, new URLSearchParams({ date: date.id }));
  }

  if (newTotal > cap.capacity) {
    confirmDialog(`Add ${qty}? This makes ${newTotal}/${cap.capacity} — over today's capacity.`,
      commit, { danger: true, yesLabel: "Add anyway" });
  } else if (st.closed && !st.past) {
    confirmDialog("Orders for this date closed at 6pm yesterday. Add this as a backfill?",
      commit, { yesLabel: "Add anyway" });
  } else {
    commit();
  }
}

// Several manual items for one customer — added as a single order group so the
// list shows one block with one status and the group shares one order code
// (orderCode uses groupId || id), exactly like a multi-item storefront order.
// The capacity/backfill checks run against the combined quantity.
function addGroupNew(state, date, items, customerName, whatsapp, fulfillment, address, note, orderDate, root) {
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  const cap = capacityStatus(state, date.id);
  const newTotal = cap.total + totalQty;
  const st = deliveryStatus(date.date, state.settings);

  function commit() {
    const groupId = newId("ordg");
    const createdAt = new Date().toISOString();
    for (const it of items) {
      state.orders.push({
        id: newId("ord"),
        deliveryDateId: date.id,
        deliveryDate: date.date, // snapshot so the order stays in history if the date is deleted
        orderDate: orderDate || todayISO(), // when the order was placed/recorded (defaults to today)
        productId: it.productId,
        qty: it.qty,
        customerName,
        whatsapp,
        fulfillment: fulfillment || "collect",
        address: address || "",
        note,
        status: "new",
        groupId,
        createdAt,
      });
    }
    save(state);
    maybeSync(state);
    updateOrderBadge(state);
    toast("Order added");
    renderAll(root, state, new URLSearchParams({ date: date.id }));
  }

  if (newTotal > cap.capacity) {
    confirmDialog(`Add ${totalQty}? This makes ${newTotal}/${cap.capacity} — over today's capacity.`,
      commit, { danger: true, yesLabel: "Add anyway" });
  } else if (st.closed && !st.past) {
    confirmDialog("Orders for this date closed at 6pm yesterday. Add this as a backfill?",
      commit, { yesLabel: "Add anyway" });
  } else {
    commit();
  }
}

function orderList(state, dateId, root) {
  const listEl = el("div", { class: "card" });
  const rebuild = () => {
    const all = state.orders
      .filter((o) => o.deliveryDateId === dateId)
      .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    if (!all.length) {
      listEl.replaceChildren(
        el("p", { class: "muted", style: "text-align:center;margin:0" },
          "No orders for this date yet."));
      return;
    }
    // Storefront orders with several items arrive as one customer order: group
    // them so the list shows a single block (status applies to the whole order).
    const groups = groupOrders(all);
    const filteredGroups = filterOrderGroups(groups, orderStatusFilter);

    const filterSel = select(
      [{ value: "", label: "All statuses" }, ...STATUSES.map(([v, l]) => ({ value: v, label: l }))],
      orderStatusFilter,
      () => { orderStatusFilter = filterSel.value; rebuild(); });
    filterSel.className = "input";

    const blocks = filteredGroups.map((g) => orderGroupRow(state, g, root, dateId));

    const list = el("div", {},
      el("h3", { style: "margin:0 0 4px" }, "Orders"),
      el("div", { class: "row-actions", style: "margin:0 0 8px" }, filterSel),
      ...blocks);
    if (!filteredGroups.length) {
      list.appendChild(el("p", { class: "muted", style: "text-align:center;margin:0" },
        "No orders with this status."));
    }
    const cap = capacityStatus(state, dateId);
    list.appendChild(el("p", { class: "po-snapshot-note" }, `${cap.total} total · ${cap.capacity - cap.total} left of ${cap.capacity}`));
    listEl.replaceChildren(list);
  };
  rebuild();
  return listEl;
}

// One row per order (or per storefront order group). A group shows its items
// joined ("Focaccia + Sandwich"), its total quantity, and a single status
// select that advances the whole customer order. Edit opens the order form for
// any order — single items and multi-item groups alike.
function orderGroupRow(state, group, root, dateId) {
  const orders = group.orders;
  const first = orders[0];
  const multi = orders.length > 1;
  const items = orders.map((o) => {
    const p = byId(state.products, o.productId);
    return { name: p ? p.name : "(deleted product)", qty: o.qty };
  });
  const title = items.map((i) => i.name).join(" + ");
  const qtyTotal = items.reduce((s, i) => s + i.qty, 0);
  const sub = [first.customerName, waNumber(first.whatsapp), first.note].filter(Boolean).join(" · ");
  const stSel = select(STATUSES.map(([v, l]) => ({ value: v, label: l })), first.status || "new",
    () => {
      // Confirming (and Baking/Ready) is what sends the customer their WhatsApp
      // confirmation with the payment QR — that needs a number on the order.
      if (!first.whatsapp && statusNeedsWhatsapp(stSel.value)) {
        stSel.value = first.status || "new";
        toast("Add the customer's WhatsApp first (tap Edit on the order).");
        return;
      }
      for (const o of orders) o.status = stSel.value;
      save(state);
      maybeSync(state);
      updateOrderBadge(state);
      publishTracking(state, group); // the customer's track card follows the status
      toast("Status saved");
      renderAll(root, state, new URLSearchParams({ date: dateId }));
    });
  stSel.className = "sel-small";

  const actions = [];
  // Edit is available on every order — single items and multi-item groups alike —
  // so the baker can always add the customer's WhatsApp, address, or notes.
  actions.push(button("Edit", () => { editingOrderId = first.id; renderAll(root, state, new URLSearchParams({ date: dateId })); }, "ghost small"));
  // Send the customer a confirmation once the order is confirmed (re-send
  // anytime while it's baking or ready). Needs their WhatsApp number.
  const sendable = ["confirmed", "baking", "ready"].includes(first.status || "new");
  if (sendable) {
    const sendBtn = button("Send confirmation", () => sendConfirmation(state, group), "soft small");
    if (!first.whatsapp) sendBtn.disabled = true;
    actions.push(sendBtn);
  }
  actions.push(button("✕", () => removeOrder(state, group, root, dateId), "ghost small"));

  const courier = first.fulfillment === "courier";
  const placedLine = el("div", { class: "li-sub" },
    `Placed ${fmtPlaced(first.createdAt, first.orderDate)}`,
    el("span", { class: `fulfill-tag${courier ? " courier" : ""}` }, courier ? "Courier" : "Self collect"),
    courier && String(first.address || "").trim() ? el("span", { class: "fulfill-sub" }, String(first.address).trim()) : null);
  const noWaHint = sendable && !first.whatsapp
    ? el("div", { class: "li-sub muted" }, "Add the customer's WhatsApp (tap Edit) to confirm this order.")
    : null;

  return el("div", { class: "list-item" },
    el("div", { class: "li-main" },
      el("div", { class: "li-title" }, title,
        orders.some((o) => o.source === "storefront") ? el("span", { class: "src-tag" }, "storefront") : null),
      multi ? el("div", { class: "li-sub" }, items.map((i) => `${i.name} ×${i.qty}`).join("  ·  ")) : null,
      placedLine,
      sub ? el("div", { class: "li-sub" }, sub) : null,
      noWaHint),
    el("div", { class: "li-right" },
      el("span", { class: "qty-chip" }, `×${qtyTotal}`),
      stSel,
      ...actions));
}

// Build the customer-facing WhatsApp confirmation: their order code, the
// delivery date + method (and address for courier), the items + total, and a
// track link. Opens in WhatsApp so the baker can press Send.
function sendConfirmation(state, group) {
  const first = group.orders[0];
  if (!first || !first.whatsapp) return;
  const code = orderCode(first);
  const trackUrl = `${location.origin}/store/?track=${code}`;
  const built = buildConfirmation(state, group, trackUrl);
  if (!built || !built.recipient) return;
  window.open(`https://wa.me/${built.recipient}?text=${encodeURIComponent(built.message)}`, "_blank");
}

function removeOrder(state, group, root, dateId) {
  const label = group.orders.map((o) => {
    const p = byId(state.products, o.productId);
    return `${p ? p.name : "?"} ×${o.qty}`;
  }).join(", ");
  confirmDialog(`Remove order "${label}"?`,
    () => {
      const ids = new Set(group.orders.map((o) => o.id));
      state.orders = state.orders.filter((o) => !ids.has(o.id));
      save(state);
      maybeSync(state);
      updateOrderBadge(state);
      toast("Order removed");
      renderAll(root, state, new URLSearchParams({ date: dateId }));
    }, { danger: true, yesLabel: "Remove" });
}
