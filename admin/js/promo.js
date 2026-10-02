// promo.js — the promo-code engine. Pure (no DOM, no localStorage, and no
// English words) so the shop, the backoffice and the Node tests all judge a code
// by exactly the same rules. The customer's wording lives in store-lang.js and
// the app's in promo-lang.js; this file only ever answers in data.
//
// The whole point of v268 was that five places each worked the same thing out
// and disagreed with each other. So there is ONE judge here — evaluate() — and
// both doors of the shop come through it: the standing today line, and the code
// the customer types.
//
// A code carries six families and nothing else. Every family has a position that
// means "I have no opinion here", which is what lets a seventh be added later
// without changing a single code that already exists or a card already printed.

// Deliberately a LEAF — this module imports nothing at all. It is read by the
// backoffice, by the customer's shop page and by the Node tests, and the shop
// must not have to drag the whole backoffice state module (and its storage) into
// a customer's browser to judge one code. `admin/js/state.js` already exports a
// round2 this could borrow; it is repeated here to keep that promise.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// The code as the customer would type it: no stray spaces, no case to argue
// about. Both the stored code and the typed one come through here.
export function normCode(s) {
  return String(s == null ? "" : s).trim().toUpperCase();
}

export function findCode(list, s) {
  const want = normCode(s);
  if (!want) return null;
  const rows = Array.isArray(list) ? list : [];
  const found = rows.find((c) => c && normCode(c.code) === want);
  return found ? normalizeCode(found) : null;
}

// The name a customer could actually type off a card. ONE definition, because
// three places have to agree on it: the form that refuses a bad name, the list
// the shop is given, and the shop's own filter on that list (the published row is
// world-readable and world-writable by anyone holding the public key, so the shop
// re-checks it rather than trusting it).
export function codeNameOk(s) {
  return /^[A-Z0-9]{3,16}$/.test(normCode(s));
}

// A brand-new code, every family at its no-opinion default. The one exception is
// "when" — a code with no start date starts the day it is made, so the default
// from-date is filled by the caller, not here (this file never reads the clock).
//
// `used` and `given` are not a family she sets: they are the counts derived from
// her real orders, carried on the record so the shop can judge "has this been
// fully claimed". They live here so that a code's stored shape is stated exactly
// once, and normaliseCode can always answer with that whole shape.
//
// `say` is the one place she writes for the customer in her own words. Blank is
// the normal state and means "let the shop say it its own way" — the shop's own
// sentence is composed from the code's parts and exists in all three languages,
// so a code with nothing written here still reads properly in 中文 and BM. The
// three boxes mirror the storefront policy text (see Settings → Storefront):
// English is hers to write, the other two are machine-filled and hers to correct,
// and a blank translation falls back to the English she wrote.
export function blankCode() {
  return {
    code: "",
    state: "live", // live | paused | ended
    vis: "public", // public = may be advertised; personal = never advertised
    frozen: false, // printed: the offer can no longer be re-written
    who: { type: "all" }, // all | first
    when: { from: "", to: "" }, // ISO dates; to "" = no end date
    basket: { type: "none", amount: 0 }, // none | amount
    gives: { type: "rm", value: 0, cap: 0 }, // rm | pct | delivery
    often: { type: "unlimited", n: 0, maxRM: 0 }, // unlimited | once | quota
    beside: { type: "anything" }, // anything | nocredit
    say: "",   // her own sentence for the shop, or "" for the shop's own words
    sayZh: "",
    sayMs: "",
    used: 0, // orders that have carried it — derived, never incremented here
    given: 0, // ringgit those orders gave away — derived the same way
  };
}

// How much of her own sentence the shop will carry. Long enough for two lines on
// a phone, short enough that the strip above the menu cannot grow into a wall of
// text and push the delivery days off the screen.
export const SAY_MAX = 160;

// Never trust a hand-edited, half-synced or half-published record: every family
// is clamped back to something the rules can actually run on, so a malformed row
// can never crash a screen or, worse, quietly widen an offer.
export function normalizeCode(rec) {
  const b = blankCode();
  const src = rec && typeof rec === "object" ? rec : {};
  const pick = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
  const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? round2(n) : 0;
  };
  const iso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
  const who = src.who && typeof src.who === "object" ? src.who : {};
  const when = src.when && typeof src.when === "object" ? src.when : {};
  const basket = src.basket && typeof src.basket === "object" ? src.basket : {};
  const gives = src.gives && typeof src.gives === "object" ? src.gives : {};
  const often = src.often && typeof src.often === "object" ? src.often : {};
  const beside = src.beside && typeof src.beside === "object" ? src.beside : {};
  const count = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : 0;
  };
  const words = (v) => String(v == null ? "" : v).trim().slice(0, SAY_MAX);
  return {
    // The row's identity has to survive this or it is LOST: the editor files a
    // new code by the id it generated, and the row is found again to edit or
    // delete by that same id. A normaliser that quietly dropped it would leave
    // rows nothing could ever address.
    id: String(src.id == null ? "" : src.id),
    code: normCode(src.code),
    state: pick(src.state, ["live", "paused", "ended"], b.state),
    vis: pick(src.vis, ["public", "personal"], b.vis),
    frozen: src.frozen === true,
    who: { type: pick(who.type, ["all", "first"], b.who.type) },
    when: { from: iso(when.from), to: iso(when.to) },
    basket: {
      type: pick(basket.type, ["none", "amount"], b.basket.type),
      amount: money(basket.amount),
    },
    gives: {
      type: pick(gives.type, ["rm", "pct", "delivery"], b.gives.type),
      value: money(gives.value),
      cap: money(gives.cap),
    },
    often: {
      type: pick(often.type, ["unlimited", "once", "quota"], b.often.type),
      // A quota of 0 is not "no quota", it is a limit she has not finished
      // setting — and the engine reads 0 as no opinion at all, which would make
      // the code unlimited. It is refused by codeProblem, so this clamp only ever
      // catches a hand-edited or half-synced row.
      n: count(often.n),
      maxRM: money(often.maxRM),
    },
    beside: { type: pick(beside.type, ["anything", "nocredit"], b.beside.type) },
    say: words(src.say),
    sayZh: words(src.sayZh),
    sayMs: words(src.sayMs),
    // Counted, not trusted: a negative or nonsense tally clamps to none, so a
    // bad number can never make a code look exhausted when it is not.
    used: count(src.used),
    given: money(src.given),
  };
}

// Every code in the app's state, normalised. One place, so a screen never has to
// remember to clean a row before reading it.
export function codesOf(state) {
  const list = (state && state.promoCodes) || [];
  return (Array.isArray(list) ? list : []).filter((c) => c && normCode(c.code)).map(normalizeCode);
}

// What the offer IS, as data — never as words.
//   { kind:"rm",       value }        → "RM5 off"
//   { kind:"pct",      value, cap }   → "10% off"   (cap > 0 → "10% off, up to RM15")
//   { kind:"delivery" }               → "Free delivery"
export function offerOf(code) {
  const g = (code && code.gives) || {};
  if (g.type === "delivery") return { kind: "delivery" };
  if (g.type === "pct") return { kind: "pct", value: Number(g.value) || 0, cap: Number(g.cap) || 0 };
  return { kind: "rm", value: Number(g.value) || 0 };
}

// What that offer is worth on a given basket. A delivery code is worth the
// delivery fee, which this file does not know — the caller passes it in, and 0
// means "this order had no delivery fee to waive".
export function worthOf(code, total, deliveryFee = 0) {
  const o = offerOf(code);
  const t = Number(total) || 0;
  if (o.kind === "delivery") return { ...o, money: round2(Number(deliveryFee) || 0) };
  if (o.kind === "pct") {
    let money = t * (o.value / 100);
    if (o.cap > 0) money = Math.min(money, o.cap);
    return { ...o, money: round2(money) };
  }
  return { ...o, money: round2(o.value) };
}

// The minimum this code wants in the basket, or 0 for "no opinion".
export function minimumOf(code) {
  const b = (code && code.basket) || {};
  return b.type === "amount" ? Number(b.amount) || 0 : 0;
}

/* The part of the judgement that depends on nothing but the code and the day:
   is it switched on, is it inside its dates, has it already given away
   everything it was allowed to. Answers with the reason it is stopped, or null.

   Split out, NOT copied, because the shop's standing line has to ask exactly
   this question — "is this a code worth putting in front of a customer?" — and
   has no basket to ask it with. evaluate() below calls this, so the line and the
   code box can never drift apart on what "still running" means.                 */
export function stoppedBy(code, today = "") {
  if (!code) return { fail: "unknown" };
  if (code.state === "paused") return { fail: "paused" };
  if (code.state === "ended") return { fail: "ended", on: code.when.to };
  if (today && code.when.from && today < code.when.from) return { fail: "notYet", on: code.when.from };
  if (today && code.when.to && today > code.when.to) return { fail: "ended", on: code.when.to };
  // Used up — either bound, whichever is reached first. The count and the
  // ringgit are derived from her real orders by usageOf (see js/promo.js callers);
  // nothing here reads a tally the shop could have written.
  const overCount = code.often.type === "quota" && Number(code.often.n) > 0 && code.used >= Number(code.often.n);
  const overMoney = Number(code.often.maxRM) > 0 && Number(code.given) >= Number(code.often.maxRM);
  if (overCount || overMoney) return { fail: "claimed" };
  return null;
}

/* The check order. The FIRST failure is the one the customer reads, so every
   reason with no way forward is asked BEFORE the only one that has a way
   forward. A customer is never sent to fetch another loaf for a discount they
   could never have got.                                                        */
export function evaluate(list, typed, ctx = {}) {
  const code = findCode(list, typed); // 1 · do we know it
  if (!code) return { ok: false, fail: "unknown" };

  const stopped = stoppedBy(code, ctx.today); // 2-4 · switched on, dates, used up
  if (stopped) return { ok: false, ...stopped };

  // 5 · is THIS person allowed (best-effort in a shop that has no login)
  const used = Array.isArray(ctx.usedCodes) ? ctx.usedCodes.map(normCode) : [];
  if (code.often.type === "once" && used.includes(code.code)) return { ok: false, fail: "used" };
  if (code.who.type === "first" && ctx.firstOrderExempt !== true && ctx.isNew === false) {
    return { ok: false, fail: "firstOnly" };
  }

  if (code.beside.type === "nocredit" && ctx.creditApplied === true) return { ok: false, fail: "clash" }; // 6

  const min = minimumOf(code); // 7 · big enough — the ONLY fixable reason, so it is last
  const total = Number(ctx.total) || 0;
  if (min > 0 && total < min) return { ok: false, fail: "small", short: round2(min - total) };

  const w = worthOf(code, total, ctx.deliveryFee); // 8 · state the offer, with its working
  return { ok: true, code, offer: w, money: w.money, delivery: w.kind === "delivery" };
}

/* Which of her codes the shop may ADVERTISE. A personal code must still be
   judged when it is typed — that is the only way its owner can use it — so it is
   published, but it never appears in the standing line and never goes on a card.
   The published list is public by nature (it is read with the shop's own public
   key), so "personal" means never-advertised, never secret.                     */
export function publishCodes(state) {
  // Only names the shop could ever honour. A code whose name cannot be typed
  // (too short, too long, a stray character) would be advertised by a page that
  // then refused it — so it is left out of the list entirely rather than sent
  // and dropped again downstream. It still shows on her own screen, where she
  // can see and fix it; nothing she made is hidden from her.
  return codesOf(state).filter((c) => codeNameOk(c.code)).map((c) => ({
    code: c.code,
    state: c.state,
    vis: c.vis,
    frozen: c.frozen,
    used: c.used,
    given: c.given,
    who: c.who,
    when: c.when,
    basket: c.basket,
    gives: c.gives,
    often: c.often,
    beside: c.beside,
    // Her own sentence, when she wrote one. Published because the shop is where
    // it is read; blank is the normal state and means the shop composes it.
    say: c.say,
    sayZh: c.sayZh,
    sayMs: c.sayMs,
  }));
}

// Why a code cannot be saved as it stands — null when it is fine. Answers in a
// machine reason, never a sentence, so the screen that asked can word it and a
// second business can word it differently. Asking here rather than in the form
// means anything that ever writes a code gets the same answer.
export function codeProblem(list, rec, selfId = "") {
  const c = normalizeCode(rec);
  if (!c.code) return { fail: "empty" };
  if (!codeNameOk(c.code)) return { fail: "shape", code: c.code };
  // The name is checked for being taken BEFORE the boxes are checked for being
  // filled, because the name is the one thing she has already decided. Told the
  // name is spoken for, she retypes it and keeps her amount — one correction.
  // Told the amount is missing, she fills it in, presses again, and only then
  // learns the name was taken all along — two round trips for one message.
  const rows = Array.isArray(list) ? list : [];
  if (rows.some((r) => r && r.id !== selfId && normCode(r.code) === c.code)) {
    return { fail: "dupe", code: c.code };
  }
  if (c.gives.type === "rm" && c.gives.value <= 0) return { fail: "noAmount" };
  if (c.gives.type === "pct" && c.gives.value <= 0) return { fail: "noPercent" };
  if (c.gives.type === "pct" && c.gives.value >= 100) return { fail: "percentTooBig" };
  // A limit of "somewhere between none and one" is not a limit: a quota of 0
  // would be read by the engine as no opinion at all and quietly become
  // unlimited, which is the opposite of what she asked for.
  if (c.often.type === "quota" && c.often.n <= 0) return { fail: "noQuota" };
  if (c.when.from && c.when.to && c.when.to < c.when.from) return { fail: "datesBackwards" };
  return null;
}
