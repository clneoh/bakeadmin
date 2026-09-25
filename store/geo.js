// store/geo.js — the shop's own location rules (v197, 25 Sep 2026).
//
// WHY THE SHOP ASKS AT ALL. Until now a courier order reached the bakery as a
// sentence the baker had to turn into a point herself — a lookup, or the map by
// hand — and the lookup is exactly what refused her address on her own phone
// (v196). The customer, though, knows where their own door is better than any
// geocoder does, and if they are standing at it their phone will say the point
// outright. So the shop asks them, twice over: "use my location" for the customer
// who is there, and a map to drag a pin on for the customer who is ordering from
// work for a delivery to home. Her words for that second one: it is easy "if they
// are familiar with grab car".
//
// A SUGGESTION, NEVER A FACT. What is decided here is only what the ORDER carries.
// It prices nothing, and in the bakery it is offered to her with the words
// "the customer pinned this", beside the door she already keeps for that customer.
// Only her own press turns it into the customer's saved doorstep
// (admin/js/courier_place.js, setDropPlace). That was her condition in so many
// words: "as security, app side will reconfirm".
//
// Pure — no DOM, no fetch, no Leaflet — so every answer a real phone can give is
// driven under Node, including the one a desktop hands over: no geolocation object
// at all.

// Degrees kept to six decimals, about 11 cm. Leaflet hands back full float
// precision, and posting "100.32880000000001" would be noise on a record a human
// reads — this is finer than any door is wide.
function tidy(n) {
  return Math.round(n * 1e6) / 1e6;
}

// A number, or null — and the GUARD, not the conversion, is the point.
//
// `Number(null)` is 0. So are `Number("")`, `Number([])`, `Number(false)` and
// `Number("   ")`, and every one of them is finite — which is what makes this the
// most expensive one-line mistake available in this feature. A latitude that arrived
// as null becomes a real point on the Equator, a real drive, and nothing anywhere in
// the stack complains. So a thing that is not already a number, and not a non-empty
// string, is not a number whatever it converts to.
//
// The bakery holds the same guard (`strictNumber` in admin/js/courier_place.js) and
// the two MUST agree: this is the app's one answer to "is this a point", asked once
// at each end of the same order.
function strict(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// A point, or null. The shop's own copy of the rule the bakery applies to the same
// numbers on arrival (validPlace in admin/js/courier_place.js): both numbers, both
// finite, both on the planet. It is checked here so nothing obviously wrong is ever
// posted, and again there because a posted payload is untrusted input.
export function validPin(p) {
  if (!p || typeof p !== "object") return null;
  const lat = strict(p.lat);
  const lng = strict(p.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat: tidy(lat), lng: tidy(lng) };
}

// What the order carries. A pin travels ONLY with a courier order that has one:
// a self-collect order has no door to drive to, and an order with no pin must post
// byte for byte the payload the shop has always posted. Returns null to mean "send
// nothing", which is the caller's cue to leave the field out entirely rather than
// write a null into the order.
export function placeForOrder(pin, fulfillment) {
  if (fulfillment !== "courier") return null;
  return validPin(pin);
}

// Past this the fix is not a door. Phones report their own accuracy in metres, and
// a fix good to 500 m is a street or two — worth keeping, and worth saying out loud,
// because the customer is the one who can still fix it. It is NOT a refusal: she
// confirms every pin anyway, and a gate here would cost an order for no gain.
export const POOR_FIX_M = 150;

// Too vague to be a door, in words the customer can act on, or null when the fix is
// good enough to say nothing about.
export function fixVerdict(accuracyM) {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return null;
  if (accuracyM <= POOR_FIX_M) return null;
  return { accuracyM: Math.round(accuracyM) };
}

// Why a geolocation call failed, in the three answers a browser gives. The code is
// the only thing a phone hands over — the message is a sentence we must not show,
// so it is never read.
function whyOf(err) {
  const code = err && err.code;
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

// Ask the browser where the customer is. The geolocation object is an ARGUMENT
// rather than read off `navigator` inside, for one reason: a browser that has none
// is a real case (any desktop over a plain-HTTP page hands over `undefined`), and a
// test that cannot reach that case is the forgiving shim this project has been
// bitten by four times. It resolves, and never rejects, so every caller has one
// shape to handle.
//
// A position whose numbers are missing or off the planet is "unavailable" rather
// than a pin at 0,0 — the same refusal validPin makes, arriving from the other end.
export function askGeo(geo, { timeoutMs = 10000 } = {}) {
  return new Promise((resolve) => {
    if (!geo || typeof geo.getCurrentPosition !== "function") {
      resolve({ ok: false, why: "unsupported" });
      return;
    }
    let settled = false;
    const finish = (v) => {
      if (!settled) { settled = true; resolve(v); }
    };
    const onOk = (pos) => {
      const pin = validPin({ lat: pos && pos.coords && pos.coords.latitude, lng: pos && pos.coords && pos.coords.longitude });
      if (!pin) { finish({ ok: false, why: "unavailable" }); return; }
      const acc = pos && pos.coords ? Number(pos.coords.accuracy) : NaN;
      finish({ ok: true, lat: pin.lat, lng: pin.lng, accuracyM: Number.isFinite(acc) ? acc : null });
    };
    try {
      geo.getCurrentPosition(onOk, (err) => finish({ ok: false, why: whyOf(err) }),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 });
    } catch {
      finish({ ok: false, why: "unavailable" });
    }
  });
}
