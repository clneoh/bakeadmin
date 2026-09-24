// couriers.js — the couriers this app can talk to (25 Sep 2026).
//
// A courier is whatever implements these four things:
//
//   label                          what it is called on screen
//   vehicles(state)                -> { ok, vehicles: [{ key, name }] }
//   quote(state, trip, opts)       -> { ok, quotes: [...], failed: [...] }
//   forget()                       optional: drop anything it cached
//
// and, when the booking half is built, the same shape of `book`, `job` and
// `cancel`. `trip` is always courier_job.js's own shape — a pickup point, a list of
// stops, a schedule — so a provider never sees an order, a customer or this app's
// stored fields; it sees a journey. That is the whole reason adding a second courier
// is a new file rather than an edit to four screens.
//
// WHY "which courier" IS NOT A SETTING YET. There is one courier. A phone-local
// choice between one option is a control that does nothing, and this app's own rule
// is that a control which does nothing must explain itself or look inert. So
// activeCourier() returns the courier there is, and the choice — the picker, the
// setting, and the per-order override — arrives with the second courier, when there
// is something to choose between.

import { lalamove } from "./couriers/lalamove.js";

const REGISTRY = [lalamove];

// Every courier this build knows, in the order they should be offered.
export function couriers() {
  return REGISTRY.slice();
}

export function courierByKey(key) {
  const want = String(key || "").trim();
  return REGISTRY.find((c) => c.key === want) || null;
}

// The courier an order in hand is going to use, or null when this build somehow has
// none — which the callers treat as "no courier is set up", never as a crash.
export function activeCourier() {
  return REGISTRY[0] || null;
}

// Its name for a screen that has to say who is coming.
export function courierLabel() {
  const c = activeCourier();
  return c ? c.label : "";
}
