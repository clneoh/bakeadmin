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

import { el, button, emptyState, confirmDialog, select, showPopup, toast, wireRowReorder } from "../ui.js";
import { save } from "../state.js";
import { addressSuggester } from "../address_suggest.js";
import { windowAt, windowParts, windowProblem } from "../time_window.js";
import { maybeSyncStorefront } from "../supabase.js";
import { openPlacePicker } from "../place_map.js";
import { flattenTree, groupPointsByArea, movePointInArea } from "../pointAreas.js";
import {
  DEFAULT_FEE_RM, addPoint, deletePoint, orderPointName, pointById, pointPhoneText,
  pointMinOrder, pointPlace, pointPlaceText, pointProblem, pointWindow, pointWindowText, pointsOf,
  setPointPaused, setPointPlace,
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
  // ⚠️ A REDRAW MUST NOT MOVE HER. Adding, editing, dragging or deleting a row repaints this list,
  // and coming back to the top of a long tree would lose her place mid-drag.
  const y = typeof window !== "undefined" ? window.scrollY : 0;
  const list = pointsOf(state);
  const active = list.filter((p) => !p.paused).length;
  const paused = list.length - active;

  const body = [];
  if (!list.length) {
    body.push(emptyState("No Points yet",
      "A Self collection Point is somewhere other than your kitchen a customer can collect from — a friend's shop, a café. Open one when you are ready; you do not have to open them all."));
  } else {
    // ★★ GROUPED BY AREA (v410). Her words: __"top level is Penang Island & Prai. Under Penang
    // Island will be Area like Sg Ara, Balik Pulau, Farlim, Georgetown"__. The heading is the
    // area's own name, indented by its depth so a nested area reads as inside its parent rather
    // than beside it; the Points no area carries come FIRST, under a heading that says so, because
    // **a Point is a real place a customer can go** and burying one below her headings helps
    // nobody — it is also where a Point lands when the area under it is deleted.
    for (const g of groupPointsByArea(state, list)) {
      body.push(el("p", {
        class: "point-area-head",
        style: `--depth:${g.depth}`,
      }, g.area ? g.area.name : "No area yet"));
      for (const p of g.points) body.push(pointCard(state, p, root));
    }
  }

  root.replaceChildren(
    newPointCard(state, root),
    el("h2", { class: "section" },
      list.length
        ? `Self collection Points (${list.length})${paused ? ` · ${active} active, ${paused} paused` : ""}`
        : "Self collection Points"),
    ...body);
  if (y && typeof window !== "undefined") window.scrollTo(0, y);
}

// ★★ WHICH AREA THIS POINT SITS UNDER (v410). The same picker the Categories screen uses for
// "Sits under", built the same way — a plain select whose nested rows are indented with two spaces
// and a `└ `, so a tree reads as a tree in a control that is only ever a flat list of options.
//
// ⚠️ IT IS BUILT FROM `flattenTree` RATHER THAN THE RAW LIST, so the options come out in her order,
// parents before their children, and an area buried three deep is still reachable.
// ⚠️ NO EXCLUSION SET IS NEEDED, unlike the category picker: a Point sits in one area and cannot
// be its own ancestor, so there is no cycle to make impossible.
function areaPicker(state, value) {
  const options = [el("option", { value: "", selected: !value }, "— No area —")];
  for (const { area, depth } of flattenTree(state.pointAreas)) {
    options.push(el("option", { value: area.id, selected: area.id === value },
      `${"  ".repeat(depth)}${depth ? "└ " : ""}${area.name}`));
  }
  return el("select", { class: "input" }, options);
}

// One editor for New and Edit both, so the two can never ask for different things or save
// different fields — the lesson every other list in this app already learned.
function buildPointEditor(state, point) {
  const name = el("input", { class: "input", value: point?.name || "",
    placeholder: "e.g. Farlim, Air Itam" });
  // ★★ WHICH AREA IT SITS UNDER (v410). Carried on the draft as `areaId`, so a Point is filed by
  // saving it — not by a drag. ⭐ A drag REORDERS AMONG BROTHERS and never re-parents, the same
  // rule the Categories screen keeps: reading a sideways drop as "move it somewhere else" is a
  // rule you have to be taught, and this box is the one place the move is written down.
  const area = areaPicker(state, point ? (point.areaId || "") : "");
  // ★ THE ADDRESS BOX ASKS GOOGLE AS SHE TYPES, exactly as the order's delivery address box
  // does (v228, made shared in v303). Her question was __"there is no address auto complete for
  // collection point?"__ and it was a fair one: this is the box a DRIVER is sent to and the box
  // the pin is looked up from, so a postcode typed correctly matters here more than anywhere.
  //
  // The same helper as the order's box and the same promise: nothing here can block a save —
  // a failure shows nothing at all, and the box keeps whatever she typed.
  const addressSug = addressSuggester(state, (text) => { address.value = text; });
  const address = el("textarea", { class: "input", rows: 3, value: point?.address || "",
    placeholder: "Where it is, for the driver — a street, a shop name, a landmark",
    oninput: function () { addressSug.typed(this.value); } });

  // ★★ MAY THIS ADDRESS BE PRINTED ON THE PUBLIC SHOP? (v410). Her words: __"in point card, a
  // switch to on/off address to be shown or not"__.
  //
  // ⚠️ A real tick box with a visible label, like the kitchen switch above it — a statement about
  // what this Point shows, not a small press.
  // ⚠️⚠️ THE WORDING NAMES THE ONE PLACE IT GOVERNS. "Show this address on the shop" — the public
  // page — and NOT "hide it from customers", because the WhatsApp confirmation goes to a customer
  // too and it keeps its "Where:" line whatever this says: **somebody who has paid must always be
  // told where to walk.** A label promising more than the switch does is how a customer ends up
  // with an order and no directions.
  const showAddr = el("input", { type: "checkbox", checked: point ? point.showAddress === true : false });
  const showAddrField = el("div", { class: "field" },
    el("label", { style: "display:flex;align-items:center;gap:8px;font-weight:600" },
      showAddr, "Show this address on the shop"),
    el("p", { class: "hint" },
      "Tick this and your public shop page prints the address under the Point, so a customer can see "
      + "where it is before they order. Leave it off and the page shows the name only. "
      + "⚠️ It does not change the message you send: a customer who has ordered is always told where to collect."));
  const receiver = el("input", { class: "input", value: point?.receiver || "",
    placeholder: "e.g. Aunty Lim" });
  const phone = el("input", { class: "input", type: "tel", value: point?.phone || "",
    placeholder: "e.g. 012-345 6789" });
  const fee = el("input", { class: "input", type: "number", inputmode: "decimal", step: "0.10",
    min: "0", value: point ? String(point.feeRM) : String(DEFAULT_FEE_RM), style: "max-width:120px" });

  // ★ THE SMALLEST BASKET THIS POINT WILL TAKE (v306). The SAME switch the Promo codes screen
  // already uses — "No smallest basket" / "Only on a basket of at least" — because a minimum is
  // a minimum, and learning a second shape for the same idea is how two screens come to mean
  // two different things by one word.
  //
  // ⚠️ IT DEFAULTS TO NONE, which is where every Point already is: she chose "keep it as simple
  // as possible, say no minimum for self collect order", and a Point she opens without one keeps
  // behaving exactly as it did. A minimum of 0 IS no minimum.
  const minOn = select(
    [{ value: "none", label: "No minimum" }, { value: "amount", label: "Only on a basket of at least" }],
    pointMinOrder(point) > 0 ? "amount" : "none",
    function () { paintMin(); });
  const minAmount = el("input", { class: "input", type: "number", inputmode: "decimal",
    step: "1", min: "0", style: "max-width:120px",
    value: pointMinOrder(point) > 0 ? String(pointMinOrder(point)) : "" });
  const minField = el("div", { class: "field" },
    el("label", {}, "Smallest basket (RM)"), minAmount);
  function paintMin() { minField.hidden = minOn.value !== "amount"; }
  paintMin();

  // ★ WHEN THEY CAN COLLECT (v304). Two time boxes, the same pair the Delivery run fills in for
  // the van — so a window means one thing in this app and is read by one piece of code.
  //
  // ⚠️ SET IT FROM WHEN THE BREAD IS THERE, NOT FROM WHEN THE SHOP OPENS. The van arrives during
  // the round, so a window that starts at opening time can have a customer standing at the counter
  // before their order has been delivered. That is her judgement to make — the app does not work
  // it out, the same way it never works out the fee.
  const parts = pointWindow(point) ? windowParts(pointWindow(point)) : null;
  const collectFrom = el("input", { class: "input", type: "time", style: "max-width:150px",
    value: (parts && parts.from) || "", "aria-label": "Customers can collect from" });
  const collectTo = el("input", { class: "input", type: "time", style: "max-width:150px",
    value: (parts && parts.to) || "", "aria-label": "Customers can collect until" });

  // ★★ THE KITCHEN SWITCH (v406). Her words: __"at self collection point, add a switch whether that
  // collection is a kitchen. Allow only one collection point as kitchen for the time being. NO pin is
  // needed if it is kitchen"__.
  //
  // ⚠️ A real tick box with a visible label, not a small press — it is a statement about one of the
  // places on this screen, and she has to be able to see at a glance which one carries it.
  const kitchen = el("input", { type: "checkbox", checked: point ? point.isKitchen === true : false });
  const kitchenField = el("div", { class: "field" },
    el("label", { style: "display:flex;align-items:center;gap:8px;font-weight:600" },
      kitchen, "This is the kitchen"),
    el("p", { class: "hint" },
      "Your own kitchen, as a place customers can collect from. It needs no pin — they are given your "
      + "address instead. Only one Point can be the kitchen; ticking this unticks whichever held it."));

  const collect = () => {
    const draft = {
      id: point?.id || "",
      name: name.value,
      address: address.value,
      receiver: receiver.value,
      phone: phone.value,
      feeRM: fee.value,
      // ★★ IS THIS THE KITCHEN? (v406). ⚠️ Carried on the draft and acted on by `addPoint`/`updatePoint`,
      // which call `markKitchen` — so **the exclusivity is not this screen's to keep.** A switch that has
      // to remember to clear the others is a switch that forgets.
      isKitchen: kitchen.checked,
      // ★ WHEN THEY CAN COLLECT (v304) - the two boxes packed into the one value the Point
      // stores, exactly as a delivery window is (see time_window.js).
      collectWindow: windowAt(collectFrom.value, collectTo.value),
      // "No minimum" IS a minimum of zero — nothing in the record distinguishes a Point she has
      // never set one on from one she has just switched off, which is what "no minimum" means.
      minOrderRM: minOn.value === "amount" ? Number(minAmount.value) || 0 : 0,
      // ★ WHERE IT BELONGS AND WHAT IT SHOWS (v410). Both on the draft, so `addPoint`/`updatePoint`
      // write them — and `updatePoint` carries them across when a caller's draft leaves them out
      // (see points.js), which is what stops an edit to the NAME from un-filing the Point.
      areaId: area.value || "",
      showAddress: showAddr.checked,
    };
    // The same two questions the run screen asks, in the same words: the name is the Point's
    // own floor, and a window that ends before it starts is refused rather than published.
    const error = pointProblem(draft, pointsOf(state))
      || windowProblem(collectFrom.value, collectTo.value);
    return { draft, error };
  };
  return { name, area, address, addressSug, showAddrField, receiver, phone, fee, minOn, minField,
    collectFrom, collectTo, kitchenField, collect };
}

function newPointCard(state, root) {
  const ed = buildPointEditor(state, null);
  return el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, "New Self collection Point"),
    el("div", { class: "field" }, el("label", {}, "Point name"), ed.name),
    el("div", { class: "field" }, el("label", {}, "Area"), ed.area,
      el("p", { class: "hint" },
        "Which part of your list this Point belongs under — Penang Island, Prai. Build the areas "
        + "under More, then Collection areas. Leave it as no area and it sits at the top of your "
        + "list until you file it.")),
    el("div", { class: "field" }, el("label", {}, "Address"), ed.address, ed.addressSug.panel),
    ed.showAddrField,
    ed.kitchenField,
    el("div", { class: "field" }, el("label", {}, "Who receives"), ed.receiver,
      el("p", { class: "hint" },
        "The person who hands the bags over when the driver arrives. A courier stop hands to a person, not to a doorstep — so without a name and a number here, the driver has nobody to look for.")),
    el("div", { class: "field" }, el("label", {}, "Their phone"), ed.phone),
    el("div", { class: "field" }, el("label", {}, "Fee per order (RM)"), ed.fee,
      el("p", { class: "hint" },
        "What YOU pay whoever receives here, per order. It is not a charge to the customer — collecting is free to them. Start at RM0.50 and change it whenever you like.")),
    el("div", { class: "field" }, el("label", {}, "Minimum order"), ed.minOn),
    ed.minField,
    el("div", { class: "field" }, el("label", {}, "Customers can collect from"), ed.collectFrom),
    el("div", { class: "field" }, el("label", {}, "and until"), ed.collectTo,
      el("p", { class: "hint" },
        "Optional. Leave both empty and your customers are told the day and nothing else. Set them and every order collecting here is told these hours — so set them from when the BREAD IS THERE, not from when the shop opens: the van arrives during the round, and a window that starts too early has someone waiting at the counter for an order that has not been delivered.")),
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
    el("div", { class: "field" }, el("label", {}, "Area"), ed.area),
    el("div", { class: "field" }, el("label", {}, "Address"), ed.address, ed.addressSug.panel),
    ed.showAddrField,
    ed.kitchenField,
    el("div", { class: "field" }, el("label", {}, "Who receives"), ed.receiver),
    el("div", { class: "field" }, el("label", {}, "Their phone"), ed.phone),
    el("div", { class: "field" }, el("label", {}, "Fee per order (RM)"), ed.fee),
    el("div", { class: "field" }, el("label", {}, "Minimum order"), ed.minOn),
    ed.minField,
    el("div", { class: "field" }, el("label", {}, "Customers can collect from"), ed.collectFrom),
    el("div", { class: "field" }, el("label", {}, "and until"), ed.collectTo,
      el("p", { class: "hint" },
        "Optional. Leave both empty and your customers are told the day and nothing else. Set them from when the BREAD IS THERE, not from when the shop opens.")),
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

  // ★★ SHE ARRANGES HER OWN POINTS (v410). Her words: __"design the handle too"__ — the same grip
  // the Categories, Products and Ingredients screens carry, from the same rule in app.css, driven
  // by the same helper in ui.js.
  const handle = el("span", { class: "point-handle", title: "Drag to reorder", "aria-hidden": "true" }, "⠿");

  // The three presses go on a LINE OF THEIR OWN under the details, not squeezed into the
  // card's right edge. Three is one more than that edge holds on a phone — Pause and Edit
  // fitted and Delete wrapped under them, which read as two rows that look alike and behave
  // differently. This is also the shape she approved in the drawing.
  const row = el("div", { class: "card point-row", dataset: { id: point.id } },
    handle,
    el("div", { class: "point-row-body" },
      el("p", { class: "card-title" },
        point.name,
        // ★★ AND THE CARD SAYS WHICH ONE IS THE KITCHEN (v406). ⚠️ The switch lives in the EDIT card —
        // one press away — so the list itself has to show the answer, or she has to open every Point to
        // find out which is which. **Only one can carry it**, which is what makes it worth reading here.
        point.isKitchen === true
          ? el("span", { class: "st-chip valid", style: "margin-left:6px" }, "🏠 The kitchen")
          : null,
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
      pointMinOrder(point)
        ? `🧺 Minimum order RM${pointMinOrder(point).toFixed(2)}`
        : "🧺 No minimum order — one loaf still goes."),
    el("p", { class: "card-sub", style: "margin:6px 0 0" },
      pointWindowText(point)
        ? `🕑 Collect ${pointWindowText(point)}`
        : "🕑 No collection window — customers are told the day only."),
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

  // ★★ AND THE DRAG ITSELF (v410). ⚠️ THE ORDER IS WRITTEN ONTO THE POINTS — never an index and
  // never the array position — because `sync.js` carries whole records keyed by id, so a row's
  // POSITION in `state.points` never travels between her phones; only a field inside the record
  // does. See pointAreas.js `movePointInArea`.
  wireRowReorder({
    row,
    handle,
    boxOf: () => row.parentElement,
    rowSelector: "point-row",
    // ⚠️ A drop may land among the Points of THIS GROUP and nowhere else. Moving a Point into
    // another area is the editor's "Area" box, not a sideways drop — the same rule the Categories
    // screen keeps, for the same reason: **reading a sideways drop as "move it somewhere else" is
    // a rule you have to be taught.** Only the row's own id is read, so a stale record elsewhere
    // on the screen cannot change the answer.
    kin: (n) => {
      const other = (state.points || []).find((x) => x && x.id === n.dataset.id);
      return !!other && (other.areaId || "") === (point.areaId || "");
    },
    onDrop: (slot) => {
      state.points = movePointInArea(state.points, point.id, slot, idsInGroup(state, point.areaId));
      saveAndPublish(state); // the order she just set is the order her customers see
      // ⚠️⚠️ AND NO `renderAll` HERE, WHICH IS NOT AN OVERSIGHT. `wireRowReorder` moves the dragged
      // NODE itself, immediately after this returns — and a redraw replaces every card with a new
      // one, so the row it is about to move has already been detached from the page. `boxOf()` is
      // `row.parentElement`, so the next line would read `children` off null and throw **in the
      // middle of her drop**. The Categories screen omits the redraw for the same reason, and its
      // helper says why in its own words: *"never a re-render of the list, which would throw every
      // row back to its start and take the page's scroll with it."*
      // ⭐ Nothing needs redrawing anyway: a reorder changes no card's text, only where it sits.
    },
  });
  return row;
}

// The ids of one group, in the order the screen is drawing them. ⚠️ READ FROM THE SAME FUNCTION
// THAT DRAWS THEM (`groupPointsByArea`), not from a second walk over `state.points`: a drop slot
// counted against one order and written into another is how a drag lands a row in the wrong place,
// which is the whole reason `indexForDrop` exists on the Products screen.
function idsInGroup(state, areaId) {
  const want = String(areaId || "");
  const g = groupPointsByArea(state, pointsOf(state)).find((x) => (x.area ? x.area.id : "") === want);
  return g ? g.points.map((p) => p.id) : [];
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
