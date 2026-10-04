// views/points.js — the Self collection Points card (v298).
//
// HER SCOPE, and it is deliberately small: "we just need to have a card for points". One
// card, listing the Points, where she can add one, edit one, pause one, bring one back and
// delete one. There is no dashboard, no cost-against-value panel and no budget — all three
// were drawn once and withdrawn. See js/points.js for the model and for why a Point is not
// a "pickup point" and not the kitchen.
//
// Same shape as Parcel couriers / Suppliers / Ingredients: an always-on "New Point" card at
// the top, one row per Point below it, and a single editor pop-up shared by New and Edit.
//
// ⚠️ NO MINIMUM ORDER. She first chose one, then said keep it simple — so a Point carries
// no basket rule at all. Collecting is free; the fee on this card is what SHE pays the
// provider, not what a customer pays her. Do not add a minimum back without her asking.

import { el, button, emptyState, confirmDialog, showPopup, toast } from "../ui.js";
import { save } from "../state.js";
import { maybeSyncStorefront } from "../supabase.js";
import { openPlacePicker } from "../place_map.js";
import {
  DEFAULT_FEE_RM, addPoint, deletePoint, orderPointName, pointById, pointPhoneText,
  pointPlace, pointPlaceText, pointProblem, pointsOf, setPointPaused, setPointPlace,
  updatePoint,
} from "../points.js";

export function renderPoints(root, state) {
  renderAll(root, state);
}

// ⚠️ EVERY CHANGE TO A POINT HAS TO REACH THE SHOP. The Points travel in the published
// storefront row (v299), so saving one on this phone is only half of it — without republishing,
// she adds a Point and her shop never offers it. Her report: __"the point added still not able
// to appear on store"__. `maybeSyncStorefront` is the seam, debounced, and it is the same call
// the Promo codes screen already makes to publish its own list.
//
// The PIN is the one change that does NOT republish: it is never published at all (see
// publishPoints), so republishing for a drag would be a request that changes nothing.
function saveAndPublish(state) {
  save(state);
  maybeSyncStorefront(state);
}

function renderAll(root, state) {
  const list = pointsOf(state);
  const active = list.filter((p) => !p.paused).length;
  const paused = list.length - active;
  const rows = list.length
    ? list.map((p) => pointCard(state, p, root))
    : [emptyState("No Points yet",
      "A Self collection Point is somewhere other than your kitchen a customer can collect from — a friend's shop, a café. Open one when you are ready; you do not have to open them all.")];

  root.replaceChildren(
    newPointCard(state, root),
    el("h2", { class: "section" },
      list.length
        ? `Self collection Points (${list.length})${paused ? ` · ${active} active, ${paused} paused` : ""}`
        : "Self collection Points"),
    ...rows);
}

// One editor for New and Edit both, so the two can never ask for different things or save
// different fields — the lesson every other list in this app already learned.
function buildPointEditor(state, point) {
  const name = el("input", { class: "input", value: point?.name || "",
    placeholder: "e.g. Farlim, Air Itam" });
  const address = el("textarea", { class: "input", rows: 3, value: point?.address || "",
    placeholder: "Where it is, for the driver — a street, a shop name, a landmark" });
  const receiver = el("input", { class: "input", value: point?.receiver || "",
    placeholder: "e.g. Aunty Lim" });
  const phone = el("input", { class: "input", type: "tel", value: point?.phone || "",
    placeholder: "e.g. 012-345 6789" });
  const fee = el("input", { class: "input", type: "number", inputmode: "decimal", step: "0.10",
    min: "0", value: point ? String(point.feeRM) : String(DEFAULT_FEE_RM), style: "max-width:120px" });

  const collect = () => {
    const draft = {
      id: point?.id || "",
      name: name.value,
      address: address.value,
      receiver: receiver.value,
      phone: phone.value,
      feeRM: fee.value,
    };
    return { draft, error: pointProblem(draft, pointsOf(state)) };
  };
  return { name, address, receiver, phone, fee, collect };
}

function newPointCard(state, root) {
  const ed = buildPointEditor(state, null);
  return el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, "New Self collection Point"),
    el("div", { class: "field" }, el("label", {}, "Point name"), ed.name),
    el("div", { class: "field" }, el("label", {}, "Address"), ed.address),
    el("div", { class: "field" }, el("label", {}, "Who receives"), ed.receiver,
      el("p", { class: "hint" },
        "The person who hands the bags over when the driver arrives. A courier stop hands to a person, not to a doorstep — so without a name and a number here, the driver has nobody to look for.")),
    el("div", { class: "field" }, el("label", {}, "Their phone"), ed.phone),
    el("div", { class: "field" }, el("label", {}, "Fee per order (RM)"), ed.fee,
      el("p", { class: "hint" },
        "What YOU pay whoever receives here, per order. It is not a charge to the customer — collecting is free to them. Start at RM0.50 and change it whenever you like.")),
    button("Add Point", () => {
      const { draft, error } = ed.collect();
      if (error) return toast(error);
      addPoint(state, draft);
      toast("Point added — it is offered in the shop from now on");
      saveAndPublish(state);
      renderAll(root, state);
    }, "block primary"));
}

function openEditPointPopup(state, point, root) {
  const ed = buildPointEditor(state, point);
  showPopup(el("div", { class: "popup-title-row" }, "Edit Point"), (refresh, close) => el("div", {},
    el("div", { class: "field" }, el("label", {}, "Point name"), ed.name),
    el("div", { class: "field" }, el("label", {}, "Address"), ed.address),
    el("div", { class: "field" }, el("label", {}, "Who receives"), ed.receiver),
    el("div", { class: "field" }, el("label", {}, "Their phone"), ed.phone),
    el("div", { class: "field" }, el("label", {}, "Fee per order (RM)"), ed.fee),
    el("div", { class: "popup-actions" },
      button("Cancel", close, "ghost"),
      button("Update Point", () => {
        const { draft, error } = ed.collect();
        if (error) return toast(error);
        if (!updatePoint(state, point.id, draft)) return toast("Couldn't save that");
        toast("Point updated");
        saveAndPublish(state);
        close();
        renderAll(root, state);
      }, "primary"))), { wide: true });
}

// How many orders have been placed to this Point. Read off the orders rather than kept as
// a tally on the Point — the same recount-not-remember rule the promo codes follow, so
// nothing can drift and re-importing an order can never double-count.
function usedBy(state, point) {
  return (state.orders || []).filter((o) =>
    o && String(o.pointId || "") === point.id).length;
}

function pointCard(state, point, root) {
  const used = usedBy(state, point);
  const phone = pointPhoneText(point.phone);
  const who = [point.receiver || null, phone || null].filter(Boolean).join(" · ");

  // The three presses go on a LINE OF THEIR OWN under the details, not squeezed into the
  // card's right edge. Three is one more than that edge holds on a phone — Pause and Edit
  // fitted and Delete wrapped under them, which read as two rows that look alike and behave
  // differently. This is also the shape she approved in the drawing.
  return el("div", { class: "card" },
    el("div", { style: "min-width:0" },
      el("p", { class: "card-title" },
        point.name,
        el("span", { class: `st-chip ${point.paused ? "paused" : "valid"}` },
          point.paused ? "Paused" : "Active")),
      el("p", { class: "card-sub" },
        who || "Nobody named to receive here yet"),
      point.address ? el("p", { class: "card-sub" }, point.address) : null,
      el("p", { class: "card-sub" },
        [`RM${point.feeRM.toFixed(2)} per order`,
          used ? `${used} order${used === 1 ? "" : "s"}` : "no orders yet"]
          .join(" · "))),
    // ★ WHERE IT IS (v300). A Point is a name she can read and, until it is pinned, a place a
    // VAN CANNOT BE SENT TO — a courier is given coordinates, never an address. So the line
    // says plainly which of the two it is, and the press opens the same map a customer's
    // doorstep is placed with, because it is the same act.
    el("p", { class: "card-sub", style: "margin:6px 0 0" },
      pointPlace(point)
        ? `📍 ${pointPlaceText(point)}`
        : "📍 Not pinned yet — a van cannot be sent to a name alone."),
    el("div", { class: "btn-row" },
      button(pointPlace(point) ? "Move the pin" : "Put the pin on the map",
        () => openPinPicker(state, point, root), "soft small"),
      button(point.paused ? "Resume" : "Pause",
        () => togglePaused(state, point, root), "ghost small"),
      button("Edit", () => openEditPointPopup(state, point, root), "ghost small"),
      button("Delete", () => confirmDelete(state, point, root), "ghost small")));
}

// The same picker the bakery's own pickup pin uses, and the same one a customer's doorstep
// uses — one map, one shape, one thing to learn. The address box is given this Point's own
// text so the "Look it up" button has something to work from, which is what saves her
// dragging when she has already typed where it is.
//
// EXPORTED because the Delivery run pins a Point too (v301), and two screens pinning the same
// Point in two different ways is two ways to be wrong about where a van goes.
export function openPointPinPicker(state, point, after) {
  openPlacePicker({
    state,
    title: `${point.name} — where it is`,
    hint: "This is the door the driver is sent to. Pin it once and every run that carries this Point knows where to go.",
    address: String((point && point.address) || "").trim(),
    start: pointPlace(point),
    onPick: (spot) => {
      if (!setPointPlace(state, point.id, spot)) return toast("That spot couldn't be saved");
      save(state);
      toast(`${point.name} pinned`);
      if (after) after();
    },
  });
}

function openPinPicker(state, point, root) {
  openPointPinPicker(state, point, () => renderAll(root, state));
}

function togglePaused(state, point, root) {
  const back = point.paused;
  setPointPaused(state, point.id, !back);
  toast(back ? `${point.name} is offered in the shop again` : `${point.name} paused — the shop stops offering it`);
  saveAndPublish(state);
  renderAll(root, state);
}

function confirmDelete(state, point, root) {
  const used = usedBy(state, point);
  // ⚠️ DELETING IS SAFE, AND THE CONFIRMATION SAYS WHAT REALLY HAPPENS rather than
  // threatening to break history. The name was frozen onto each order when it was placed
  // (see orderPointName), so those orders keep reading correctly and keep telling the
  // customer where their order went. This is the same sentence Parcel couriers uses, for
  // the same reason.
  confirmDialog(used
    ? `Delete the Point “${point.name}”? ${used} order${used === 1 ? " has" : "s have"} collected there — those keep the name, and they keep showing it to the customer.`
    : `Delete the Point “${point.name}”?`,
  () => {
    deletePoint(state, point.id);
    toast("Point deleted");
    saveAndPublish(state);
    renderAll(root, state);
  }, { danger: true, yesLabel: "Delete" });
}

// Re-exported so a caller that only wants "where did this order collect from" does not have
// to reach into the model for it.
export { orderPointName };
