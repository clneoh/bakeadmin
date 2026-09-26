// views/delivery_run.js — the delivery run: one trip, several doorsteps (v191,
// 25 Sep 2026).
//
// THE MONEY. A courier charges one base fare plus a fee for each extra stop, so eight
// cakes to eight houses on one motorcycle is one fare plus seven stop fees against eight
// separate fares. That is the whole reason this screen exists, and it is why the saving
// is worked out here and SHOWN — a claim in a sentence is not a number she can check.
//
// Six things this screen is careful about, each of them a way of being confidently wrong
// that would cost her money, a customer's patience, or both:
//
//   • ONE STOP PER CUSTOMER. The trip is built from one row per GROUP, never from the
//     order lines. A customer who bought three things is one doorstep, and a trip built
//     from lines sends the same van to the same door three times and is charged three
//     stop fees for it.
//
//   • THE PRICE MUST BELONG TO THE LIST ON SCREEN. Ticking or unticking a customer after
//     a price was asked leaves that price describing a journey she is no longer taking, so
//     the Book press goes inert and says so rather than booking the list it remembers.
//
//   • IT DOES NOT SAY WHAT FITS. No price reply carries a capacity figure — a vehicle is
//     priced, not measured — so the load is counted and shown beside the vehicle, and the
//     judgement is hers. Her choice, in her words: "show me the load and let me judge".
//
//   • IT DOES NOT CHOOSE THE STOP ORDER. The courier's own documents disagree about
//     whether route optimisation is available, so the order stays hers to arrange and
//     nothing here may claim to have found her an optimum.
//
//   • THE COMPARISON IS ASKED FOR, AND IT IS ALSO WHAT EACH CUSTOMER PAYS. Pricing the run
//     on every vehicle is one set of requests; pricing the same stops separately is another
//     request per stop, and the courier allows two requests a second. Those separate prices
//     ARE the original costs the customers are charged, so they are never taken quietly: the
//     press that shows the saving asks for them early, and if she has not pressed it they are
//     asked when she books, with the waiting said on screen.
//
//   • THE SAVING STAYS WITH HER. A customer who bears the charge is charged what their own
//     doorstep would have cost sent on its own — the ORIGINAL, un-consolidated price — and
//     never a share of the one-trip fee. Her rule, in her words: "the benefit of consolidated
//     charges, should go to merchant, not the customer. And if the courier charges were
//     reveal to them, it will shown as the original cost." So the difference between what the
//     customers pay and what the trip costs is hers. The fee is apportioned across the orders
//     only when SHE bears it — see splitEven and runChargeAmounts — because then the customer
//     is charged nothing at all and the number is about her books, not about them.
//
// WHY IT IS A PAGE AND NOT A CARD. It holds a day's customers, a vehicle per row, a
// window and a set of charge questions. The app has one pop-up layer, so a card is one
// screen at a time; this needs to be read all at once, against the numbers it changes.
//
// WHAT THIS FILE MUST NOT KNOW: which courier it is talking to. It asks the registry for
// the active one and uses that courier's own words. No courier's name, service keys or
// error codes appear below.

import { button, confirmDialog, el, emptyState, select, toast } from "../ui.js";
import { shortDate } from "../dates.js";
import { groupOrders, save } from "../state.js";
import { maybePublishTracking, maybeSync } from "../supabase.js";
import { runChargeAmounts, splitEven, writeCourierCharge } from "../courier.js";
import { activeCourier, courierByKey } from "../couriers.js";
import { geocodeAddress } from "../couriers/api.js";
import {
  customerPinOffer, customerPlaceOf, dropAddress, dropPlaceOf, fmtPlace, pickupPlace, setDropPlace,
} from "../courier_place.js";
import { openPlacePicker } from "../place_map.js";
import { courierPayQuestions } from "./orders.js";
import {
  fmtDistanceKm, fmtQuote, fmtQuoteLeft, fmtWindow, liveJobProblem, loadOf, quoteExpired,
  runLimitProblem, savingOf, scheduleAtUTC, stampTrip, tripOf, tripProblem, windowAt,
  windowProblem,
} from "../courier_job.js";

// One separate-trip price is one request, and the courier allows two requests a second.
// Firing eight of them together would be refused as a burst — which would read to her as
// "that vehicle cannot be priced" when the truth is that we asked too fast. A gap is
// cheaper than a wrong answer. The same 600ms the function itself leaves between the
// quotations inside one call.
const SEPARATE_GAP_MS = 600;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Money read back off a sum of quotations, so a tenth of a sen from floating point cannot
// turn "exactly what the trip costs you" into "one sen short of it".
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function renderDeliveryRun(root, state, params) {
  const courier = activeCourier();
  if (!courier) {
    root.replaceChildren(emptyState("No courier is set up",
      "This build has nobody to carry a parcel, so there is no run to book."));
    return;
  }

  const days = runDays(state);
  if (!days.length) {
    root.replaceChildren(
      el("div", { class: "card" },
        el("h2", {}, "Delivery run"),
        emptyState("Nothing to run yet",
          "A run carries several orders on one trip. It needs courier orders on a delivery day — open an order, press Edit, and switch its delivery to courier.")));
    return;
  }

  // The day asked for by whoever sent her here — the button on a delivery day card names
  // the day it was pressed on — falling back to the day she most likely wants.
  const asked = String((params && params.get && params.get("date")) || "").trim();
  const wantDay = days.some((d) => d.id === asked) ? asked : String((state.settings && state.settings.runDay) || "");
  let dayId = days.some((d) => d.id === wantDay) ? wantDay : defaultDay(days);

  // Ticked customers, by group key, and what the price on screen was actually asked for.
  // Both belong to the day on screen: a price for yesterday's stops is a price for a
  // journey she is not taking, so changing the day throws it away rather than leaving it
  // under her thumb with a new list beside it.
  let ticked = new Set();
  let priced = null;    // { trip, quotes, failed, codes, stops }
  let compare = {};     // vehicle key -> { state, amounts, reason, done, total }
  let busy = false;
  const clocks = [];

  // ── the controls, built once ───────────────────────────────────────────
  //
  // Built once and never rebuilt, so a window she has half typed, a collection time she
  // has moved and an answer she has given among the charge questions all survive a price,
  // a booking or a repaint. Only the two boxes below them — the customer list and the
  // prices — are ever redrawn.

  const daySel = select(
    days.map((d) => ({
      value: d.id,
      label: `${shortDate(d.date)} — ${d.groups.length} courier order${d.groups.length === 1 ? "" : "s"}`,
    })),
    dayId,
    () => { dayId = daySel.value; refreshDay(); },
  );

  const pickupDay = el("input", { class: "input", type: "date", "aria-label": "The day the driver collects" });
  const pickupTime = el("input", { class: "input", type: "time", value: dispatchTime(state),
    "aria-label": "The time the driver collects" });

  const winFrom = el("input", { class: "input", type: "time", "aria-label": "The delivery window opens" });
  const winTo = el("input", { class: "input", type: "time", "aria-label": "The delivery window closes" });
  const winSaid = el("p", { class: "card-sub", style: "margin:6px 0 0" });

  const listBox = el("div", {});
  const loadLine = el("p", { class: "run-load" });
  const priceBox = el("div", {});
  const statusLine = el("p", { class: "card-sub", style: "margin:10px 0 0" });
  const askBtn = button(`Price this run with ${courier.label}`, () => ask(), "primary");

  // The charge questions, asked of the first ticked customer so the form opens on what
  // that order already says. The AMOUNT is not asked here: on a run it is worked out, not
  // typed — each customer's own doorstep cost when they bear it, the run's fee apportioned
  // when she does (runChargeAmounts). This is the same block the order card and the full
  // Edit form use, so a charge means the same thing wherever it is written — and its own
  // comment forbids a second copy in the app. It is answered ONCE for the whole run, which
  // is why changing it has to redraw the prices: the line under each vehicle says what each
  // customer's box will hold, and that depends on this answer.
  let pay = null;
  const payBox = el("div", {});

  // ── what the day holds ────────────────────────────────────────────────

  function dayRowNow() {
    return days.find((d) => d.id === dayId) || days[0];
  }

  // One entry per GROUP, and that is the correction that matters most on this screen: a
  // customer who ordered three things is one doorstep.
  function tickedGroups() {
    const day = dayRowNow();
    if (!day) return [];
    return day.groups.filter((g) => ticked.has(groupKey(g)));
  }

  function tickedOrders() {
    return tickedGroups().map((g) => g.orders[0]).filter(Boolean);
  }

  function allTicked() {
    const day = dayRowNow();
    return !!day && day.groups.length > 0 && day.groups.every((g) => ticked.has(groupKey(g)));
  }

  // The identity of the SET that was priced, so a price can be tied to the exact list it
  // was asked for rather than to a count that two different lists can share.
  function codesNow() {
    return tickedGroups().map(groupKey).sort().join("|");
  }

  function stale() {
    return !!priced && priced.codes !== codesNow();
  }

  function schedule() {
    return scheduleAtUTC(pickupDay.value, String(pickupTime.value || "").trim());
  }

  function windowNow() {
    return windowAt(winFrom.value, winTo.value);
  }

  // ── the ticked list ───────────────────────────────────────────────────

  // The day's customers all on, on the day's first look: the common case is that the whole
  // day goes out in one van, and making her tick eight boxes to say so would be this screen
  // asking her to repeat what she already decided.
  function pickTicked() {
    const day = dayRowNow();
    ticked = new Set(day ? day.groups.map(groupKey) : []);
    if (day) pickupDay.value = String(day.date || "");
  }

  // A price describes one list and one journey. Anything that changes either throws the
  // price away rather than leaving a stale number standing beside a new question.
  function priceAgain() {
    priced = null;
    compare = {};
  }

  function refreshDay() {
    pickTicked();
    priceAgain();
    paintList();
    paintLoad();
    // The payer is answered before the prices, because the line under each vehicle says
    // what each customer's box will hold and that depends on the payer (chargeLine).
    paintPay();
    paintPrices();
    paintWindow();
  }

  // The head line and the bulk press are built ONCE and kept, because they describe the very
  // same set the ticks do. Ticking one row used to leave the head reading "2 of 2" over a list
  // with one customer on it: the row's own handler repainted the load, the prices and the pay
  // box, and only the bulk press rebuilt the list the head lives in — two controls that look
  // alike behaving differently. Updating the two nodes in place is what lets a single tick
  // correct them WITHOUT rebuilding the rows, which would throw away the row under her finger.
  const headTitle = el("span", { class: "run-head-title" });
  const headBtn = button("Tick them all", () => {
    ticked = allTicked() ? new Set() : new Set((dayRowNow() || {}).groups.map(groupKey));
    compare = {};
    paintList();
    paintLoad();
    paintPay();
    paintPrices();
  }, "ghost small");

  function paintHead() {
    const day = dayRowNow();
    if (!day) return;
    headTitle.textContent = `Who is on the run — ${ticked.size} of ${day.groups.length}`;
    headBtn.textContent = allTicked() ? "Untick them all" : "Tick them all";
  }

  function paintList() {
    const day = dayRowNow();
    if (!day) { listBox.replaceChildren(); return; }
    const rows = day.groups.flatMap((g) => {
      const first = g.orders[0];
      const key = groupKey(g);
      const place = dropPlaceOf(state, first);
      const tick = el("input", { type: "checkbox", class: "run-tick",
        "aria-label": `Send ${nameOf(first)} on this run` });
      tick.checked = ticked.has(key);
      tick.addEventListener("change", () => {
        if (tick.checked) ticked.add(key); else ticked.delete(key);
        // The prices stay on screen — re-asking is a request per vehicle and she has not
        // asked for that — but they are marked as belonging to a list she has moved, and
        // the Book presses go inert below.
        compare = {};
        paintHead();
        paintLoad();
        paintPay();
        paintPrices();
      });
      const what = g.orders.map((o) => `${String(o.productName || "item").trim()} ×${Number(o.qty) || 0}`).join("  ·  ");
      const where = place
        ? fmtPlace(place)
        : dropAddress(first)
          ? `${dropAddress(first)} — doorstep not pinned`
          : "no delivery address on this order yet";
      const row = el("div", { class: "run-row" },
        el("label", { class: "run-who" },
          tick,
          el("span", { class: "run-words" },
            el("span", { class: "run-name" }, nameOf(first)),
            el("span", { class: "run-sub" }, [where, what].filter(Boolean).join(" · ")))),
        place ? null : button("Put it on the map", () => pinDoorstep(first), "ghost small"));
      // The customer's own pin, dropped on the shop page when they ordered (v197),
      // offered under its own row. It is a SUGGESTION and drawn as one — and it is a
      // block of its own rather than a line inside the row because everything in that
      // row sits inside one <label>: a press in there would tick the customer instead
      // of pinning their door. Offered every time it differs from the doorstep she
      // keeps for them, which is what makes accepting it the thing that ends it.
      const offer = customerPinOffer(state, first);
      return offer
        ? [row, el("div", { class: "pin-offer" },
            el("p", { class: "card-sub" },
              offer.replacing
                ? `${nameOf(first)} pinned a different spot this time. The doorstep you keep for them is untouched until you take this one.`
                : `${nameOf(first)} pinned their door on the shop page when they ordered.`),
            el("div", { class: "btn-row" },
              button(offer.replacing ? "Use the customer's pin instead" : "Use the customer's pin",
                () => keepPin(first, offer.place), "ghost small")))]
        : [row];
    });

    listBox.replaceChildren(
      el("div", { class: "run-head" }, headTitle, headBtn),
      ...rows.filter(Boolean),
    );
    paintHead();
  }

  // Keep a doorstep against a customer. THE one path, whether the pin was dragged on
  // the map or taken from what the customer pinned themselves — so a pin she accepted
  // and a pin she placed by hand are the same record, saved and synced the same way.
  function keepPin(order, place) {
    setDropPlace(state, order, place);
    save(state);
    maybeSync(state);
    paintList();
  }

  function pinDoorstep(order) {
    const kept = dropPlaceOf(state, order);
    const suggested = customerPlaceOf(order);
    openPlacePicker({
      state,
      title: `${nameOf(order)}'s doorstep`,
      hint: !kept && suggested
        ? "This is the customer's own pin, dropped on the shop page when they ordered. Drag it if it is not the door — nothing uses it until you keep it."
        : "Look the address up, then drag the pin to the exact door. It is remembered for this customer, so a second order from them costs no lookup at all.",
      address: dropAddress(order),
      start: kept || suggested,
      onPick: (spot) => keepPin(order, spot),
    });
  }

  // ── the load, which is shown and never judged ─────────────────────────

  function paintLoad() {
    const groups = tickedGroups();
    const load = loadOf(state, groups);
    if (!groups.length) {
      loadLine.replaceChildren("Nothing is ticked, so there is no load to count.");
      return;
    }
    // A count and the things counted, in the app's own house style (name then qty), so the
    // words beside a price are the order lines she would recognise.
    loadLine.replaceChildren(...[
      `${load.stops} stop${load.stops === 1 ? "" : "s"}`,
      " · ",
      `${load.items} item${load.items === 1 ? "" : "s"}`,
      load.summary ? " · " : "",
      load.summary,
      // The trip's documented ceiling is SAID and never enforced: the courier has the last
      // word, and a screen that blocks a booking the courier would have taken is the app
      // inventing a rule. Her standing instruction, and the reason this is here at all.
      runLimitProblem(load.stops) ? el("span", { class: "run-warn" }, ` ${runLimitProblem(load.stops)}`) : null,
    ].filter((x) => x !== "" && x !== null && x !== undefined));
  }

  // ── the window ────────────────────────────────────────────────────────

  function paintWindow() {
    const problem = windowProblem(winFrom.value, winTo.value);
    if (problem) { winSaid.textContent = problem; return; }
    const w = windowNow();
    winSaid.textContent = w
      ? `Customers will be told ${fmtWindow(w)}. It lands on their track card and in their message the moment you book.`
      : "Leave both boxes empty and every customer keeps the promise they already have — the day, with no hour on it.";
  }

  // ── the money ─────────────────────────────────────────────────────────

  // What each order's charge box will hold if she books THIS vehicle, in the payer's own
  // terms. A customer's figure is their own doorstep's cost, which is a request per stop and
  // is therefore asked when she books rather than on the way past — so before the booking
  // this line states the RULE, and the confirmation shows the numbers.
  //
  // The payer decides which of the two it is, so this is redrawn when she changes that
  // answer (see paintPay). Leaving it saying "split evenly" while she had chosen the
  // customer, or quoting a split that is nobody's cost, would be this screen telling her
  // one thing and doing another.
  function chargeLine(q) {
    const groups = tickedGroups();
    if (!groups.length) return "";
    const n = groups.length;
    const cur = state.settings.currency;
    const who = pay ? pay.payer() : "";
    if (who === "customer") {
      return `Each customer is charged what their own doorstep costs on its own, never a share of the one-trip fee — so the saving from going together stays with you. Those ${n === 1 ? "cost comes" : `${n} costs come`} from ${courier.label} when you book, and the confirmation shows ${n === 1 ? "it" : "each of them"} before anything is asked for.`;
    }
    if (who === "me") {
      const shares = splitEven(q.amount, n).map((s) => fmtQuote(s, q.currency, cur));
      return `You are bearing it, so the run's own fee is your cost and the customer is charged none of it: ${fmtQuote(q.amount, q.currency, cur)} over ${n} order${n === 1 ? "" : "s"} — ${shares.join(" · ")}.`;
    }
    return "Choose who paid the courier below, and this line will say what each customer's charge box will hold.";
  }

  // What the confirmation says each order's charge box will hold — the numbers, where the
  // line above states the rule. The customer's figure is their own doorstep's cost, so the
  // total it comes to is read against the trip's own fee: when going together has saved her
  // nothing — a small run on a big vehicle, which really happens — that shows here as the
  // shortfall it is rather than as a saving this screen talked her into.
  function chargeSentence(amounts, q, cur, answers) {
    if (!amounts.length || !answers || !answers.who) {
      return " No charge will be written, because no payer was chosen below.";
    }
    const each = amounts.map((a) => fmtQuote(a, q.currency, cur));
    if (answers.who === "customer") {
      const total = round2(amounts.reduce((a, b) => a + b, 0));
      const diff = round2(total - q.amount);
      const against = diff > 0
        ? `${fmtQuote(total, q.currency, cur)} in all, which is ${fmtQuote(diff, q.currency, cur)} more than the ${fmtQuote(q.amount, q.currency, cur)} the trip costs you — that difference stays with you`
        : diff < 0
          ? `${fmtQuote(total, q.currency, cur)} in all, which is ${fmtQuote(-diff, q.currency, cur)} SHORT of the ${fmtQuote(q.amount, q.currency, cur)} the trip costs you, so this run loses you money`
          : `${fmtQuote(total, q.currency, cur)} in all, which is exactly what the trip costs you`;
      return ` Each customer is charged what their own doorstep costs on its own, never a share of the trip: ${each.join(" · ")} — ${against}.`;
    }
    return ` The run's fee goes on your books as one cost of ${fmtQuote(q.amount, q.currency, cur)}, over ${amounts.length} order${amounts.length === 1 ? "" : "s"} — ${each.join(" · ")} — and the customer is charged none of it.`;
  }

  // ── asking for a price ────────────────────────────────────────────────

  async function ask() {
    if (busy || !root.isConnected) return;
    const groups = tickedGroups();
    if (!groups.length) { toast("Tick at least one customer — a run has to carry somebody."); return; }
    const problem = windowProblem(winFrom.value, winTo.value);
    if (problem) { statusLine.textContent = problem; return; }

    busy = true;
    askBtn.disabled = true;
    priceAgain();
    paintPrices();

    // 1. THE BAKERY'S DOOR.
    if (!pickupPlace(state)) {
      busy = false;
      askBtn.disabled = false;
      statusLine.textContent = "The bakery's own pickup spot is not pinned yet — pin it in Settings, and every price from now on is for the right door.";
      return;
    }

    // 2. EVERY CUSTOMER'S DOOR, looked up once and then kept against the person, so a
    //    second run down the same street costs no lookup for anybody on it.
    //
    //    AND A CUSTOMER WHO LEFT A PIN OF THEIR OWN IS NOT LOOKED UP AT ALL (v208) —
    //    their point IS the door, exactly as on the single-order card. Same reason, and
    //    it is the same bug: a lookup moves the dot off their door and onto the street.
    const unplaced = groups.filter((g) => !dropPlaceOf(state, g.orders[0]));
    for (let i = 0; i < unplaced.length; i++) {
      const first = unplaced[i].orders[0];
      const words = dropAddress(first);
      const theirs = customerPlaceOf(first);
      // The POINT is theirs where they gave one, and the WORDS are the address on the
      // order (v207) — the door she keeps is named with the address, and never with the
      // geocoder's row, which is a fragment with no house number in it.
      if (theirs) {
        setDropPlace(state, first, { lat: theirs.lat, lng: theirs.lng, label: words || theirs.label });
        paintList();
        continue;
      }
      if (!words) {
        busy = false;
        askBtn.disabled = false;
        statusLine.textContent = `${nameOf(first)}'s order has no delivery address to look up. Put the pin on the map, or add the address under Edit.`;
        paintList();
        return;
      }
      statusLine.textContent = `Looking up ${words}… (${i + 1} of ${unplaced.length})`;
      const found = await geocodeAddress(state, words);
      if (!root.isConnected) return;
      if (!found.ok) {
        busy = false;
        askBtn.disabled = false;
        statusLine.textContent = `${nameOf(first)}: ${found.reason} Nothing has been priced.`;
        return;
      }
      setDropPlace(state, first, { lat: found.place.lat, lng: found.place.lng, label: words });
      paintList();
    }

    // 3. THE FLEET, from the courier's own list rather than one written down here. No
    //    vehicle is named in this file, which is what lets a second courier be a new file.
    statusLine.textContent = `Asking ${courier.label} for a price on this run — one request per vehicle, so this takes a few seconds.`;
    const fleet = await courier.vehicles(state);
    if (!root.isConnected) return;
    if (!fleet.ok) {
      busy = false;
      askBtn.disabled = false;
      statusLine.textContent = fleet.reason;
      return;
    }

    // ONE ROW PER GROUP, which is the shape the courier's own stop list needs.
    const trip = tripOf(state, groups.map((g) => g.orders[0]), { scheduleAt: schedule() });
    const missing = tripProblem(trip);
    if (missing) {
      busy = false;
      askBtn.disabled = false;
      statusLine.textContent = missing;
      return;
    }

    const out = await courier.quote(state, trip, {
      services: fleet.vehicles.map((v) => v.key),
      scheduleAt: trip.scheduleAt,
    });
    if (!root.isConnected) return;
    busy = false;
    askBtn.disabled = false;
    if (!out.ok) {
      statusLine.textContent = out.reason;
      return;
    }
    priced = {
      trip,
      quotes: out.quotes || [],
      failed: out.failed || [],
      codes: codesNow(),
      stops: groups.length,
    };
    paintPay();
    paintPrices();
    statusLine.textContent = priced.quotes.length
      ? `${priced.quotes.length} price${priced.quotes.length === 1 ? "" : "s"} from ${courier.label} for this run as one trip. Each one dies on its own clock.`
      : "No vehicle could be priced for this run.";
  }

  // ── the vehicles ──────────────────────────────────────────────────────

  function paintPrices() {
    clocks.length = 0;
    const quotes = (priced && priced.quotes) || [];
    const rows = quotes.map(quoteRow);
    const missed = ((priced && priced.failed) || []).map((f) =>
      el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `${String(f.name || f.service || "A vehicle").trim()} could not be priced: ${f.reason}`));
    const blocked = quotes.length ? liveJobProblem(tickedOrders()) : "";
    const moved = quotes.length && stale()
      ? "The list of customers has changed since this price was asked, so it describes a run you are no longer taking. Price the run again for the list above."
      : "";
    // `.filter(Boolean)` and never a bare `?: null`: replaceChildren is a DOM method, so it
    // converts each argument with String(), and a null handed to it becomes a text node
    // reading "null" printed on her screen. v189 learned that the hard way, on this exact
    // panel's predecessor.
    priceBox.replaceChildren(...[
      ...rows,
      ...missed,
      moved ? el("p", { class: "run-warn", style: "margin:10px 0 0" }, moved) : null,
      blocked ? el("p", { class: "card-sub", style: "margin:8px 0 0" }, blocked) : null,
      runLimitProblem(tickedGroups().length)
        ? el("p", { class: "card-sub", style: "margin:8px 0 0" }, runLimitProblem(tickedGroups().length))
        : null,
      quotes.length ? el("p", { class: "card-sub", style: "margin:12px 0 0" },
        `Booking books the whole run as ONE ${courier.label} trip: one vehicle, ${tickedGroups().length} doorstep${tickedGroups().length === 1 ? "" : "s"}, and one share link that goes on every customer's own track card and message. ` +
        "Booking writes each order's charge into its box — their own doorstep's cost when the customer bears it, your apportioned part of the run's fee when you do — with the payer, the method and the COD answer you set below, and saves it there and then. A real vehicle is on a real road the moment the press returns, so there is nothing to discard by walking away.") : null,
    ].filter(Boolean));
  }

  function quoteRow(q) {
    const cur = state.settings.currency;
    const dist = fmtDistanceKm(q.distanceKm);
    const sub = el("span", { class: "quote-sub" });
    const bookBtn = button("Book this run", () => bookRun(q), "soft small");
    const cmpBox = el("div", { class: "run-compare" });
    const cmpBtn = button("Compare with sending them separately", () => compareTrips(q.service), "ghost small");
    // The written-down words of the promise for THIS vehicle, so the number and what each
    // customer will be asked for are read together rather than on two screens.
    const splitLine = el("p", { class: "card-sub", style: "margin:6px 0 0" });
    splitLine.textContent = chargeLine(q);

    const paintCmp = () => {
      const c = compare[q.service];
      if (!c) { cmpBox.replaceChildren(); return; }
      if (c.state === "busy") {
        cmpBox.replaceChildren(el("p", { class: "card-sub" },
          `Asking the courier for a price on each doorstep on its own — ${Number(c.done) || 0} of ${Number(c.total) || 0}, one request at a time…`));
        return;
      }
      if (c.state === "failed") { cmpBox.replaceChildren(el("p", { class: "card-sub" }, c.reason)); return; }
      const s = savingOf(q.amount, c.amounts);
      if (!s) { cmpBox.replaceChildren(); return; }
      // The saving is a number on the screen and not a claim in a sentence. When the run
      // costs MORE — a small run on a big vehicle, which really happens — that is said as
      // plainly as a saving is, because rounding a real loss up to "you saved RM0.00" is
      // this screen talking her into it.
      const line = s.saving > 0
        ? `this one trip saves ${fmtQuote(s.saving, q.currency, cur)} against sending them one at a time`
        : s.saving < 0
          ? `this one trip costs ${fmtQuote(-s.saving, q.currency, cur)} MORE than sending them one at a time`
          : "this one trip costs exactly what sending them one at a time costs";
      cmpBox.replaceChildren(
        el("p", { class: "card-sub" },
          `One trip ${fmtQuote(s.one, q.currency, cur)} · one at a time ${fmtQuote(s.sum, q.currency, cur)} — ${line}.`),
        el("p", { class: "card-sub", style: "margin:4px 0 0" },
          "Each of those was asked now, for the same collection time, so they are this journey split up rather than a guess at it."),
      );
    };

    const row = el("div", { class: "quote-row run-price" },
      el("div", { class: "quote-what" },
        el("span", { class: "quote-name" }, String(q.name || "").trim() || "Vehicle"),
        sub),
      el("span", { class: "quote-price" }, fmtQuote(q.amount, q.currency, cur)),
      el("div", { class: "run-actions" }, bookBtn, cmpBtn),
      cmpBox,
      splitLine);

    const clock = (now) => {
      const left = fmtQuoteLeft(q, now);
      const dead = left === "expired";
      // The short line under the vehicle's name: how far, and how long this price lives.
      sub.textContent = [dist, dead ? "expired — ask again" : `valid for ${left}`].filter(Boolean).join(" · ");
      // A quote that is dead, or one that arrived with no readable expiry or no stop list,
      // cannot be booked. Each of those reads as a plain word rather than as a greyed
      // button with nothing said about why.
      const unusable = dead || !q.id || !Array.isArray(q.stopIds) || q.stopIds.length < 2;
      const why = liveJobProblem(tickedOrders()) || (stale() ? "moved" : "");
      bookBtn.disabled = unusable || !!why || busy;
      bookBtn.textContent = dead ? "Expired" : "Book this run";
      cmpBtn.disabled = unusable || !!why || busy;
    };
    clock(Date.now());
    paintCmp();
    clocks.push(clock);
    return row;
  }

  // One vehicle, priced on every doorstep on its own — the other half of the comparison, AND
  // the origin of what each customer is charged when they bear it (v192).
  //
  // N requests, spaced, never fired together: the courier allows two a second and a burst is
  // refused, which would read to her as "that vehicle cannot be priced" when the truth is
  // that we asked too fast. Asked only because she pressed — the comparison press, or the
  // Book press, which needs the very same numbers and reuses them when they are already here.
  //
  // Every doorstep or nothing: a sum missing one trip is smaller than the truth, so a saving
  // worked out from it — or a customer's charge — would be this screen making a number up.
  async function priceSeparately(service, onProgress) {
    const groups = tickedGroups();
    const scheduleAt = priced.trip.scheduleAt;
    const amounts = [];
    let reason = "";
    if (onProgress) onProgress(0, groups.length);
    for (let i = 0; i < groups.length; i++) {
      if (i) await wait(SEPARATE_GAP_MS);
      if (!root.isConnected) return { ok: false, reason: "" };
      // ONE ROW PER GROUP again — the same correction as the run's own trip, and the same
      // pinned doors it was priced from.
      const one = tripOf(state, [groups[i].orders[0]], { scheduleAt });
      const out = await courier.quote(state, one, { services: [service], scheduleAt });
      if (!root.isConnected) return { ok: false, reason: "" };
      if (!out.ok) { reason = out.reason; break; }
      const hit = (out.quotes || []).find((x) => x.service === service);
      if (!hit) {
        reason = (out.failed || []).map((f) => f.reason).filter(Boolean)[0]
          || "One of these doorsteps could not be priced on its own.";
        break;
      }
      amounts.push(hit.amount);
      if (onProgress) onProgress(amounts.length, groups.length);
    }
    if (reason || amounts.length !== groups.length) {
      return { ok: false, reason: reason || "One of these doorsteps could not be priced on its own." };
    }
    return { ok: true, amounts };
  }

  async function compareTrips(service) {
    if (busy || stale() || !priced || !root.isConnected) return;
    compare[service] = { state: "busy", done: 0, total: tickedGroups().length };
    paintPrices();
    const out = await priceSeparately(service, (done, total) => {
      compare[service] = { state: "busy", done, total };
      paintPrices();
    });
    if (!root.isConnected) return;
    // Not a comparison at all unless EVERY doorstep was priced: a sum missing one trip is
    // smaller than the truth, and a saving worked out from it would be this screen
    // overstating its own case.
    compare[service] = out.ok
      ? { state: "done", amounts: out.amounts }
      : { state: "failed", reason: `${out.reason} The comparison needs every doorstep priced, so it is not shown at all rather than shown short.` };
    paintPrices();
  }

  // The customers' own costs, for the charges. This is the same request the comparison makes
  // and the same answer, so one she has already asked for is REUSED rather than asked again
  // and paid for twice — and that is why the two sharing a function matters, not just tidier.
  async function customerCosts(service) {
    const groups = tickedGroups();
    const c = compare[service];
    if (c && c.state === "done" && (c.amounts || []).length === groups.length) {
      return { ok: true, amounts: c.amounts };
    }
    return priceSeparately(service, (done, total) => {
      statusLine.textContent = `Asking ${courier.label} what each doorstep costs on its own — ${done} of ${total}, one request at a time.`;
    });
  }

  // ── booking the run ───────────────────────────────────────────────────

  async function bookRun(q) {
    if (busy || !root.isConnected || !priced || stale()) return;
    const blocked = liveJobProblem(tickedOrders());
    if (blocked) { toast(blocked); return; }

    // WHO BEARS IT is read before the amounts, because it decides WHICH amounts they are:
    // the customers' own doorstep costs when they bear it, the run's fee apportioned when
    // she does. Asked of the box on its own (payer) rather than through read(), which wants
    // an amount this screen has not worked out yet.
    const who = pay ? pay.payer() : "";

    // Their own costs are one request per doorstep, so the booking press is what pays for
    // them and the waiting is said on screen. Nothing is booked, and nobody is given a
    // charge, until every one of them is here.
    let originals = [];
    if (who === "customer") {
      busy = true;
      askBtn.disabled = true;
      paintPrices();
      const costs = await customerCosts(q.service);
      busy = false;
      askBtn.disabled = false;
      if (!root.isConnected) return;
      paintPrices();
      if (stale()) {
        statusLine.textContent = "The list of customers changed while the courier was being asked, so nothing was booked. Price the run again for the list above.";
        return;
      }
      if (!costs.ok) {
        statusLine.textContent = `${costs.reason} Nothing was booked, and no customer was given a charge.`;
        return;
      }
      originals = costs.amounts;
      statusLine.textContent = "";
    }

    const groups = tickedGroups();
    const load = loadOf(state, groups);
    const cur = state.settings.currency;
    const amounts = runChargeAmounts(who, q.amount, originals, groups.length);
    const answers = pay && amounts.length ? pay.read(amounts[0]) : null;
    const w = windowNow();
    const when = w ? ` Customers will be told ${fmtWindow(w)}.` : "";
    const charge = chargeSentence(amounts, q, cur, answers);
    confirmDialog(
      `Book the ${String(q.name || "vehicle").trim() || "vehicle"} with ${courier.label} for ${fmtQuote(q.amount, q.currency, cur)}? ` +
      `It carries ONE trip with ${load.stops} doorstep${load.stops === 1 ? "" : "s"} and ${load.items} item${load.items === 1 ? "" : "s"}.${when} ` +
      `Every customer on the run gets the same share link, so all of their cards and messages send them to the same trip.${charge} ` +
      `This books a real trip and spends real money, and ${courier.label} only lets it be called off while a driver is still being found.`,
      async () => {
        if (busy || !root.isConnected) return;
        busy = true;
        paintPrices();
        const holder = courierByKey(courier.key) || courier;
        const out = await holder.book(state, priced.trip, q);
        if (!root.isConnected) return;
        if (!out.ok) {
          busy = false;
          statusLine.textContent = out.reason;
          paintPrices();
          return;
        }
        // EVERYTHING IS WRITTEN AND SAVED NOW, not on a Save press, because a real vehicle
        // is on a real road the moment this returns and it must not be discardable by
        // walking away from the screen.
        //
        // The window goes on every LINE of every group, not only the first: the card and
        // the messages read the group's first line today, but a customer's order can be
        // edited and re-split, and a promise living on one row would go with that row.
        for (const g of groups) {
          if (w) for (const o of g.orders) o.deliveryWindow = w;
          stampTrip(g.orders, out.job, holder.label);
        }
        // The charge, per order, through the one writer every door uses. Each order's amount
        // is the one runChargeAmounts chose: the customer's OWN doorstep cost when they bear
        // it, so the saving from going together stays with her, or their apportioned part of
        // the run's fee when she bears it — which sums to exactly what she was charged.
        if (pay) groups.forEach((g, i) => writeCourierCharge(state, g.orders, g, pay.read(amounts[i])));
        busy = false;
        save(state);
        maybeSync(state);
        // Each customer's own card, one at a time, because publishing is per order. The
        // card now carries the window inside its delivery line and the share in its total.
        for (const g of groups) maybePublishTracking(state, g);
        statusLine.textContent = "";
        refreshDay();
        toast(out.job && out.job.link
          ? `Run booked with ${holder.label} — ${groups.length} customer${groups.length === 1 ? "" : "s"} now share one trip and one link.`
          : `Run booked with ${holder.label} — the courier sent back no share link, so nothing was put on the customers' cards but the trip itself.`);
      },
      { danger: true, yesLabel: "Book this run" },
    );
  }

  // ── the charge questions ──────────────────────────────────────────────

  function paintPay() {
    const first = tickedOrders()[0];
    if (!first) {
      pay = null;
      payBox.replaceChildren(el("p", { class: "card-sub", style: "margin:0" },
        "Tick a customer and the charge questions appear here."));
      return;
    }
    pay = courierPayQuestions(state, first, () => paintPrices());
    payBox.replaceChildren(pay.el);
  }

  // ── the page ──────────────────────────────────────────────────────────

  root.replaceChildren(
    el("div", { class: "card" },
      el("h2", {}, "Delivery run"),
      el("p", { class: "card-sub" },
        `One vehicle, ${courier.label}'s own fare, several doorsteps. A multi-stop trip is charged as one base fare plus a fee for each extra stop, so the run below is priced as one trip — and can be compared against the same doorsteps sent one at a time, which is the money this screen is for.`),
      el("div", { class: "field", style: "margin-top:12px" },
        el("label", {}, "The delivery day"), daySel),
      listBox,
      loadLine,
      el("div", { class: "field", style: "margin-top:12px" },
        el("label", {}, "The day the driver collects"), pickupDay),
      el("div", { class: "field" },
        el("label", {}, "The time the driver collects"), pickupTime),
      el("div", { class: "field" },
        el("label", {}, "The delivery window opens"), winFrom),
      el("div", { class: "field" },
        el("label", {}, "The delivery window closes"), winTo),
      winSaid,
      el("div", { class: "btn-row", style: "margin-top:12px" }, askBtn),
      statusLine,
      priceBox,
      el("h3", { style: "margin:18px 0 0" }, "Who pays the courier"),
      el("p", { class: "card-sub" },
        "Asked once for the whole run. If the customer bears it, each of their charge boxes holds what their own doorstep would have cost sent on its own — never a share of the one-trip fee, so the saving from going together stays with you. If you bear it, the run's fee is your own cost on your books and the customer is charged none of it."),
      payBox,
    ),
  );

  winFrom.addEventListener("input", paintWindow);
  winTo.addEventListener("input", paintWindow);
  // Moving the collection day or time is a different journey, so a price taken for the old
  // one is thrown away rather than left standing beside it.
  pickupDay.addEventListener("change", () => { if (priced) { priceAgain(); paintPrices(); } });
  pickupTime.addEventListener("change", () => { if (priced) { priceAgain(); paintPrices(); } });

  refreshDay();

  // A beat rewrites the short lines that changed — the life of a quotation, and whether the
  // Book press is still live — and nothing else. The buttons on these rows are what this
  // screen exists for, and a tap lost to a repaint is a tap she has to make twice. The tick
  // clears itself once the page is gone: an interval left running against a detached node
  // would keep a run's worth of clocks alive for the rest of the session.
  const beat = setInterval(() => {
    if (!root.isConnected) { clearInterval(beat); return; }
    const now = Date.now();
    for (const c of clocks) c(now);
  }, 1000);

  return () => clearInterval(beat);
}

// ── reading the day ─────────────────────────────────────────────────────

// Every saved delivery day that has at least one courier order on it, soonest first.
//
// A day with a single courier order is included on purpose: sending one order by courier is
// an ordinary thing to do, it is priced as an ordinary one-stop trip, and hiding the day
// would leave her no way to book it from here.
function runDays(state) {
  const byDay = new Map();
  for (const g of groupOrders(state.orders || [])) {
    const first = g.orders[0];
    if (!first || first.fulfillment !== "courier") continue;
    const id = String(first.deliveryDateId || "").trim();
    if (!id) continue;
    if (!byDay.has(id)) byDay.set(id, []);
    byDay.get(id).push(g);
  }
  return (state.deliveryDates || [])
    .filter((d) => d && byDay.has(d.id))
    .map((d) => ({ id: d.id, date: String(d.date || ""), groups: byDay.get(d.id) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// The day she most likely wants: the next one that has not gone out yet, else the last day
// there is. Opening on a day already delivered would make the screen look wrong before she
// had done anything at all.
function defaultDay(days) {
  const at = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const iso = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  const ahead = days.find((d) => d.date >= iso);
  return ((ahead || days[days.length - 1] || days[0] || {}).id) || "";
}

// A group's identity for ticking. It is the key `groupOrders` itself groups on — the same
// key, not a second reading of it derived from the order code — so two rows can never be
// ticked as one customer, or one customer counted twice on a run.
function groupKey(g) {
  const first = g && g.orders && g.orders[0];
  if (!first) return "";
  return String(first.groupId || first.id || "");
}

function nameOf(order) {
  return String((order && order.customerName) || "").trim() || "The customer";
}

// The app's own dispatch time, so the collection box opens on the hour she already uses
// rather than on an empty box or on midnight.
function dispatchTime(state) {
  return String((((state || {}).settings || {}).courier || {}).dispatch || "").trim();
}
