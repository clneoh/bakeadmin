// views/courier_quote.js — what the courier would charge, before she promises it
// (25 Sep 2026).
//
// Phase one of the courier work, and deliberately the only phase with no booking in
// it. A price is what she has to know before she answers a customer, and a price is
// also the only thing a courier's API will tell her for nothing. So nothing here
// books, cancels, stores a trip or writes to her books. The one write it can make is
// into the charge box she was going to fill in by hand — and even that goes through
// courier.js's own model, so the amount, the payer and the COD keep running down the
// money path that already works.
//
// WHY THIS IS A SECTION AND NOT A POP-UP OF ITS OWN. The app has ONE pop-up layer, so
// opening a second card replaces the first — the charge box, the note she was part-way
// through and the Save button would all be destroyed by the act of asking for a price,
// and the fee would land in a box nothing could ever save. So the price opens IN the
// card that holds the charge box, folded away until she asks for it. There is then
// nothing to come back to, because nothing was left.
//
// THE HONESTY THIS FILE EXISTS FOR: a quotation DIES. Lalamove's last five minutes.
// The panel counts that life down in front of her, and when it runs out it says so and
// offers to ask again rather than leaving a dead number sitting there looking like a
// live price. A price under a fee is the one thing here that must never be wrong, and
// the two ways of being wrong are not symmetric — asking again costs one tap, quoting
// a dead price costs her money.
//
// THE TWO ENDS OF THE TRIP. A courier is not given an address, it is given a point
// (see courier_place.js), so before anything can be priced both doors have to be
// pinned. Hers was the choice — "Locate it, let me fix it" — so this looks up the
// address the order already carries, keeps the answer against that customer, and
// where the lookup misses puts the map one tap away. Both ends can be pinned from
// right here, because a dead end in a kitchen is not a signpost.
//
// WHAT THIS FILE MUST NOT KNOW: which courier it is talking to. It asks the registry
// for the active one and uses that courier's own words — its `label`, the names it
// puts on its vehicles. No courier's name, service keys or error codes appear below.

import { button, el, toast } from "../ui.js";
import {
  fmtDistanceKm, fmtQuote, fmtQuoteLeft, orderDay, quoteExpired, scheduleAtUTC, tripOf, tripProblem,
} from "../courier_job.js";
import {
  dropAddress, dropPlaceOf, fmtPlace, pickupAddress, pickupPlace, setDropPlace, setPickupPlace,
} from "../courier_place.js";
import { geocodeAddress } from "../couriers/api.js";
import { activeCourier } from "../couriers.js";
import { openPlacePicker } from "../place_map.js";

// The price section for a trip, as a node to drop into a card.
//
// `orders` is an array because a trip has stops — today it is handed one, and the same
// section prices a run of several drops when the consolidation screen arrives.
//
// `onUseFee(quote)` is what an accepted price does. The note/tracking card passes its
// own charge box's `set`, so a quoted fee and a typed one are the same kind of answer
// and there is no second charge editor for the two to disagree through.
export function courierQuoteSection({ state, orders, onUseFee = null }) {
  const list = (Array.isArray(orders) ? orders : [orders]).filter(Boolean);
  const first = list[0] || null;
  const cur = state.settings.currency;
  const courier = first ? activeCourier() : null;
  if (!first) return el("span", {});
  if (!courier) {
    return el("p", { class: "card-sub", style: "margin:0" },
      "This build has no courier set up, so there is no one to ask for a price.");
  }

  // The section is built on the FIRST open and then kept, because building it is what
  // asks the courier for eight quotations. Nothing here is rebuilt while she works, so
  // the note box above it and the amount she has typed below it both keep what they
  // hold — the same reason the charge block repaints only itself.
  let built = false;
  let open = false;
  let busy = false;
  let timer = null;
  let quotes = [];
  let failed = [];
  // What the prices on screen were asked for, in words. Moving the time box does not
  // silently re-ask: a re-ask is eight requests, so it stays her tap, and this is what
  // tells her the numbers under her thumb belong to a time she has left behind.
  let pricedFor = "";
  // Each price's own clock, so a second passing rewrites one line of one row instead
  // of rebuilding the list. One of those rows holds the button this section exists
  // for, and a tap lost to a repaint is a tap she has to make twice.
  let clocks = [];

  const bodyWrap = el("div", { style: "margin-top:10px" });
  bodyWrap.hidden = true;
  const toggleBtn = button("Get a delivery price", () => {
    open = !open;
    if (open && !built) {
      built = true;
      build();
    }
    paintFold();
  }, "ghost small");
  const wrap = el("div", {}, el("div", { class: "btn-row" }, toggleBtn), bodyWrap);

  function paintFold() {
    toggleBtn.textContent = open ? "Hide the delivery price" : "Get a delivery price";
    bodyWrap.hidden = !open;
    if (open && quotes.length) startClock();
    if (!open) stopClock();
  }

  function stopClock() {
    clearInterval(timer);
    timer = null;
  }

  // A second passing rewrites the two short lines that changed and nothing else. The
  // interval also clears ITSELF once the card is gone: closing the pop-up empties the
  // layer, so the node this is written into stops being on the page — and an interval
  // left running against a detached node would keep eight quotes' worth of clocks
  // alive for the rest of the session.
  function startClock() {
    stopClock();
    if (!clocks.length) return;
    timer = setInterval(() => {
      if (!wrap.isConnected) { stopClock(); return; }
      for (const c of clocks) c(Date.now());
    }, 1000);
  }

  // ── built once, on the first open ──────────────────────────────────────
  function build() {
    const endsLine = el("p", { class: "card-sub", style: "margin:0 0 10px" });
    const endsRow = el("div", { class: "btn-row" });

    const pickupBtn = button("Pin the bakery's door", () => {
      openPlacePicker({
        state,
        title: "The bakery's pickup pin",
        hint: "This is the door the driver collects from. Pin it once — it is kept with your settings and travels to your other phone.",
        address: pickupAddress(state),
        start: (state.settings && state.settings.pickupPlace) || null,
        onPick: (spot) => {
          setPickupPlace(state, spot);
          paintEnds();
          ask();
        },
      });
    }, "ghost small");

    const dropBtn = button("Put this doorstep on the map", () => {
      openPlacePicker({
        state,
        title: `${String(first.customerName || "The customer").trim()}'s doorstep`,
        hint: "Look the address up, then drag the pin to the exact door. It is remembered for this customer.",
        address: dropAddress(first),
        start: dropPlaceOf(state, first),
        onPick: (spot) => {
          setDropPlace(state, first, spot);
          paintEnds();
          ask();
        },
      });
    }, "ghost small");

    function paintEnds() {
      const up = pickupPlace(state);
      const drop = dropPlaceOf(state, first);
      const who = String(first.customerName || "the customer").trim() || "the customer";
      endsLine.textContent = [
        up ? `From ${fmtPlace(up)}` : "The bakery's pickup spot is not pinned",
        drop ? `to ${fmtPlace(drop)}` : `to ${who} — doorstep not pinned`,
        drop || dropAddress(first) ? "" : "(this order has no address yet)",
      ].filter(Boolean).join(" ");
      // The doorstep button stays on screen once a pin exists, and that is the point: a
      // pin that landed on the wrong estate is worse than no pin, and she is the only
      // one who knows which it is. So the same button reads "Change" rather than going
      // away and leaving her no way back to the map.
      dropBtn.textContent = drop ? "Change this doorstep" : "Put this doorstep on the map";
      endsRow.replaceChildren(...[up ? null : pickupBtn, dropBtn].filter(Boolean));
    }

    // ── when the driver collects ─────────────────────────────────────────
    const dayInput = el("input", { class: "input", type: "date", value: orderDay(state, first),
      "aria-label": "The day the driver collects" });
    const timeInput = el("input", {
      class: "input", type: "time",
      value: String(((state.settings || {}).courier || {}).dispatch || "").trim(),
      "aria-label": "The time the driver collects",
    });
    const whenNote = el("p", { class: "card-sub", style: "margin:6px 0 0" });

    function whenLabel() {
      const d = String(dayInput.value || "").trim();
      const t = String(timeInput.value || "").trim();
      if (!d) return "as soon as possible";
      return t ? `${d} at ${t}` : d;
    }
    // The time box is inert without a day, and it is DRAWN inert with the reason
    // beside it: a time with no day is a schedule the API cannot be given at all, so
    // leaving it live would be a control that does nothing.
    function paintWhen() {
      const d = String(dayInput.value || "").trim();
      timeInput.disabled = !d;
      whenNote.textContent = d
        ? "The time the driver collects. It opens on the app's own dispatch time; changing it here changes this price only — when a trip can really be booked, this becomes a setting of its own."
        : "This order has no delivery day on it, so this prices collection as soon as possible. Choose a day to schedule it.";
      if (pricedFor && pricedFor !== whenLabel()) {
        whenNote.textContent += ` The prices below were asked for ${pricedFor}.`;
      }
    }

    // ── the prices ───────────────────────────────────────────────────────
    const quoteBox = el("div", { class: "quote-box" });
    const statusLine = el("p", { class: "card-sub", style: "margin:10px 0 0" });
    const askBtn = button(`Get a price from ${courier.label}`, () => ask(), "primary");
    const askRow = el("div", { class: "btn-row", style: "margin-top:12px" }, askBtn);

    function useFee(q) {
      if (!onUseFee || quoteExpired(q)) return;
      // The charge box is asked whether it TOOK the amount before this says it did. A
      // courier replying with a total of zero is answered with a price of RM 0.00 on
      // the row above, and a zero is not a charge — so the box refuses it, and a toast
      // claiming otherwise would be the screen telling her a number had landed when
      // the very box it landed in was empty.
      if (onUseFee(q) === false) {
        toast(`${courier.label} priced this trip at ${fmtQuote(q.amount, q.currency, cur)} — that is not a charge, so nothing was put in the box. Ask again, or type the amount.`);
        return;
      }
      toast(`Fee ${fmtQuote(q.amount, q.currency, cur)} put in the charge box`);
      // Folded away so the amount it just wrote is what she is looking at, with the
      // payer question under it — which is the next thing she has to answer.
      open = false;
      paintFold();
    }

    // One price, as a row: the vehicle, what it costs, how far it is, and how long the
    // number is good for. Everything the row cannot hold is nowhere, because a phone
    // has no hover — so nothing that matters is left out.
    function quoteRow(q) {
      const dist = fmtDistanceKm(q.distanceKm);
      const durable = q.expiryFrom !== "policy";
      const sub = el("span", { class: "quote-sub" });
      const useBtn = onUseFee ? button("Use this fee", () => useFee(q), "primary small") : null;
      const row = el("div", { class: "quote-row" },
        el("div", { class: "quote-what" },
          el("span", { class: "quote-name" }, String(q.name || "").trim() || "Vehicle"),
          sub),
        el("span", { class: "quote-price" }, fmtQuote(q.amount, q.currency, cur)),
        useBtn);

      clocks.push((now) => {
        const left = fmtQuoteLeft(q, now);
        const dead = left === "expired";
        sub.replaceChildren(...[
          dist,
          dist ? " · " : "",
          dead ? "expired — ask again" : durable ? `valid for ${left}` : `about ${left} left`,
        ].filter((x) => x !== ""));
        if (useBtn) {
          useBtn.disabled = dead;
          if (dead) useBtn.textContent = "Expired";
        } else if (dead) {
          row.classList.add("quote-dead");
        }
      });
      return row;
    }

    function paintQuotes() {
      clocks = [];
      const rows = quotes.map(quoteRow);
      const missed = failed.map((f) => el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `${String(f.name || f.service || "A vehicle").trim()}: ${f.reason}`));
      quoteBox.replaceChildren(...rows, ...missed);
      for (const c of clocks) c(Date.now());
    }

    // ── asking ───────────────────────────────────────────────────────────
    async function ask() {
      if (busy || !wrap.isConnected) return;
      busy = true;
      askBtn.disabled = true;
      stopClock();
      quotes = [];
      failed = [];
      pricedFor = "";
      paintQuotes();
      paintEnds();

      // 1. THE BAKERY'S DOOR.
      if (!pickupPlace(state)) {
        busy = false;
        askBtn.disabled = false;
        statusLine.textContent = pickupAddress(state)
          ? "The bakery's pickup spot is not pinned yet — pin it here or in Settings, and every price from now on is for the right door."
          : "Pin the bakery's pickup spot first — a courier needs a door to collect from.";
        return;
      }

      // 2. THE CUSTOMER'S DOOR, looked up ONCE and then kept against the person, so a
      //    second order from the same number costs no lookup at all.
      if (!dropPlaceOf(state, first)) {
        const words = dropAddress(first);
        if (!words) {
          busy = false;
          askBtn.disabled = false;
          statusLine.textContent = "This order has no delivery address to look up. Put the pin on the map, or add the address under Edit.";
          return;
        }
        statusLine.textContent = `Looking up ${words}…`;
        const found = await geocodeAddress(state, words);
        if (!wrap.isConnected) return;
        if (!found.ok) {
          busy = false;
          askBtn.disabled = false;
          statusLine.textContent = `${found.reason} Nothing has been priced.`;
          return;
        }
        setDropPlace(state, first, found.place);
        paintEnds();
      }

      // 3. THE FLEET, from the courier's own list rather than one written down here, so
      //    a vehicle it adds or retires appears without a release.
      statusLine.textContent = `Asking ${courier.label} for a price on every vehicle — this takes a few seconds.`;
      const fleet = await courier.vehicles(state);
      if (!wrap.isConnected) return;
      if (!fleet.ok) {
        busy = false;
        askBtn.disabled = false;
        statusLine.textContent = fleet.reason;
        return;
      }
      const trip = tripOf(state, list, {
        scheduleAt: scheduleAtUTC(dayInput.value, String(timeInput.value || "").trim()),
      });
      const problem = tripProblem(trip);
      if (problem) {
        busy = false;
        askBtn.disabled = false;
        statusLine.textContent = problem;
        return;
      }

      const out = await courier.quote(state, trip, {
        services: fleet.vehicles.map((v) => v.key),
        scheduleAt: trip.scheduleAt,
      });
      if (!wrap.isConnected) return;
      busy = false;
      askBtn.disabled = false;
      if (!out.ok) {
        statusLine.textContent = out.reason;
        return;
      }
      quotes = out.quotes || [];
      failed = out.failed || [];
      pricedFor = whenLabel();
      paintQuotes();
      paintWhen();
      statusLine.textContent = quotes.length
        ? `${quotes.length} price${quotes.length === 1 ? "" : "s"} from ${courier.label}, just now, for collection ${pricedFor}. Each one dies on its own clock.`
        : "No vehicle could be priced for this trip.";
      startClock();
    }

    dayInput.addEventListener("input", paintWhen);
    timeInput.addEventListener("input", paintWhen);

    paintEnds();
    paintWhen();
    paintQuotes();

    bodyWrap.replaceChildren(
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        `A price for this delivery, from ${courier.label}'s own account. Nothing is booked and nothing is saved — a price you take fills the charge box, where you still choose who paid the courier, and it is the Save button that writes anything at all.`),
      endsLine,
      endsRow,
      el("div", { class: "field", style: "margin-top:12px" },
        el("label", {}, "The day the driver collects"), dayInput),
      el("div", { class: "field" }, el("label", {}, "The time the driver collects"), timeInput),
      whenNote,
      askRow,
      statusLine,
      quoteBox,
      el("p", { class: "card-sub", style: "margin:14px 0 0" },
        "Booking, the driver's name and the share link the customer follows are the next step, and they are not in this screen yet. This one only answers what it would cost."));

    ask();
  }

  return wrap;
}
