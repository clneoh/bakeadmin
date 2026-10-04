// points.js — a Self collection Point: a place a customer can collect from that is NOT
// the bakery (4 Oct 2026).
//
// ★ HER TERM, AND THE TRAP IT AVOIDS. It is a "Self collection Point" and NEVER a "pickup
// point". `settings.pickupPlace` already exists (v188) and is the exact OPPOSITE end of the
// trip — the bakery's OWN door, where a courier collects FROM. A customer's end called
// "pickup" too would be two halves of one journey sharing a name. She called this out
// herself: "we should call that Self collection Point, not pickup point which is confusing."
//
// ★ THE KITCHEN IS NOT A POINT. Collecting from the bakery is already `fulfillment:
// "collect"` with no point on the order, and it stays exactly what it is: free, no minimum,
// always offered, needing no record of any kind. THIS MODULE KNOWS NOTHING ABOUT THE
// KITCHEN, and that is the design — the difference between "collect from us" and "collect
// from a Point" falls out of the model rather than needing a special case. Giving the
// kitchen a Point record would be the mistake: it would inherit a fee it must not have, a
// provider who does not exist, and a life it can never end.
//
// ★ SHE OPENS THEM ONE AT A TIME, AND EXPECTS MOST TO END. Her words: "baker will open
// collection point one by one, with a budget to spend, if after a period of time and the
// justification is not there then baker will decide to de-activate that point, and not
// likely will open all point one go." So each Point is INDEPENDENT — nothing here assumes
// the others exist — and Pause is a normal ending, not a failure.
//
// A Point is deliberately a RECORD and not a setting: a list she grows, like the credits
// ledger and the promo codes, so it travels between her phones the same way (see sync.js).
//
// Pure: no DOM, no storage. Runs under Node for tests.

import { newId, round2, waNumber } from "./state.js";
import { phoneDigits } from "./customers.js";

// What a new Point's fee per order starts at. Only a starting point — she sets it per
// Point, and she may multiply it by hand on a big order.
export const DEFAULT_FEE_RM = 0.5;

// The name is capped like her own titles; an address is longer because an address is.
const NAME_MAX = 60;
const ADDRESS_MAX = 200;
const PHONE_MAX = 30;

export function blankPoint() {
  return {
    id: "",
    name: "",
    address: "",
    receiver: "",   // who hands the bags over when the driver arrives
    phone: "",      // and what number he calls if nobody is there
    feeRM: DEFAULT_FEE_RM,
    paused: false,
    createdAt: "",
  };
}

// One stored row, cleaned. Anything malformed clamps rather than throwing, so a
// half-synced or hand-edited record can never reach a screen or the shop.
export function normalizePoint(src) {
  const b = blankPoint();
  const s = src && typeof src === "object" ? src : {};
  const txt = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
  const fee = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? round2(n) : b.feeRM;
  };
  return {
    id: String(s.id || ""),
    name: txt(s.name, NAME_MAX),
    address: txt(s.address, ADDRESS_MAX),
    receiver: txt(s.receiver, NAME_MAX),
    // Stored the way every other number in this app is stored — the digits — so it can be
    // dialled, linked and compared without a second spelling of the same person. A value
    // that is not number-shaped keeps its plain text rather than being emptied.
    phone: phoneDigits(s.phone) || txt(s.phone, PHONE_MAX),
    feeRM: fee(s.feeRM),
    paused: s.paused === true,
    createdAt: txt(s.createdAt, 40),
  };
}

// Every Point she has, cleaned and in the order the card draws them: ACTIVE FIRST, then
// paused ones sunk to the bottom. Within each, oldest first, so a new Point appears where
// she would expect to look for it.
export function pointsOf(state) {
  const list = (state && state.points) || [];
  const rows = (Array.isArray(list) ? list : [])
    .filter((p) => p && typeof p === "object")
    .map(normalizePoint)
    .filter((p) => p.name);
  rows.sort((a, b) => {
    if (a.paused !== b.paused) return a.paused ? 1 : -1;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
  return rows;
}

// The Points the SHOP may offer — the active ones. A paused Point is off the list, and
// that is the whole of what pausing buys her.
export function activePoints(state) {
  return pointsOf(state).filter((p) => !p.paused);
}

export function pointById(state, id) {
  const want = String(id || "");
  if (!want) return null;
  return pointsOf(state).find((p) => p.id === want) || null;
}

// Why a draft cannot be saved, or "" when it is fine. A Point needs a NAME and nothing
// else — the same floor a parcel carrier has. The receiver and their phone are what a
// driver actually needs, so they are asked for loudly, but a Point she has not finished
// filling in is still hers to save: refusing it would be a website rule standing between
// her and her own list.
export function pointProblem(draft, taken = []) {
  const d = draft || {};
  const name = String(d.name || "").trim();
  if (!name) return "A Point needs a name";
  const clash = (taken || []).find((p) => p
    && p.id !== String(d.id || "")
    && String(p.name || "").trim().toLowerCase() === name.toLowerCase());
  if (clash) return `There is already a Point called “${name}”`;
  return "";
}

// A new Point. Returns the created row, or null for a draft that cannot be saved.
export function addPoint(state, draft, now = new Date().toISOString()) {
  if (pointProblem(draft, pointsOf(state))) return null;
  const row = normalizePoint({ ...draft, id: newId("pt"), createdAt: now });
  (state.points ||= []).push(row);
  return row;
}

// Edit a Point in place. The ID and the day it was opened never move — an edit is a
// correction, not a new Point.
export function updatePoint(state, id, draft) {
  const want = String(id || "");
  if (!want) return null;
  const rows = (state.points || []);
  const at = rows.findIndex((p) => p && p.id === want);
  if (at < 0) return null;
  const problem = pointProblem({ ...draft, id: want }, pointsOf(state));
  if (problem) return null;
  const kept = normalizePoint(rows[at]);
  const next = normalizePoint({ ...draft, id: want, createdAt: kept.createdAt });
  rows[at] = next;
  return next;
}

// Pause a Point, or bring it back. Reversible by design: her expectation is that most
// Points she opens will end this way, and a decision she can undo is a decision she can
// make early.
export function setPointPaused(state, id, paused) {
  const want = String(id || "");
  const row = (state.points || []).find((p) => p && p.id === want);
  if (!row) return null;
  row.paused = paused === true;
  return row;
}

// Take a Point off the list for good.
//
// ⚠️ THIS DOES NOT REWRITE WHERE A PAST ORDER WENT, and it must not. An order carries the
// Point's NAME frozen onto it (see orderPointName), so an order that went to Farlim still
// says Farlim after the Point is deleted — exactly as an order keeps the name and price a
// product was sold at, and stays readable after a promo code is deleted (see
// promo-usage.js, which skips a deleted code rather than resurrecting it).
export function deletePoint(state, id) {
  const want = String(id || "");
  if (!want) return false;
  const before = (state.points || []).length;
  state.points = (state.points || []).filter((p) => !p || p.id !== want);
  return state.points.length < before;
}

// The name to PRINT for an order that went to a Point: the name frozen on the order when
// it was placed, falling back to the live Point while it still exists. Never a bare id —
// an order that says "pt_9f2a" tells the person holding the bags nothing at all.
export function orderPointName(state, order) {
  const frozen = String((order && order.pointName) || "").trim();
  if (frozen) return frozen;
  const live = pointById(state, order && order.pointId);
  return live ? live.name : "";
}

// A number as a driver would dial it. The app stores digits with the country code (see
// phoneDigits), so this is only for reading back — and only ever for reading, never for
// keying or comparing.
//
// A Malaysian mobile is 10 digits locally (012-345 6789) or 11 (011-1234 5678), so the
// grouping follows the length rather than cutting at a fixed place. Anything that is
// neither is left as the digits it is, which is still dialable.
export function pointPhoneText(phone) {
  const d = waNumber(phone);
  if (!d) return "";
  const local = d.startsWith("60") ? `0${d.slice(2)}` : d;
  if (local.length === 10) return `${local.slice(0, 3)}-${local.slice(3, 6)} ${local.slice(6)}`;
  if (local.length === 11) return `${local.slice(0, 3)}-${local.slice(3, 7)} ${local.slice(7)}`;
  return local;
}
