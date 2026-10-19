// home-facts.js — the two facts the HOMEPAGE prints that are hers to set: the cut-off
// time and the bake days. ⚠️⚠️ Both were typed into index.html while the shop read them
// from her published settings, so changing either one in the app moved the shop and left
// the homepage saying the old thing.
//
// ⭐ ONE copy of the clock formatter, shared with the shop (`store/app.js` re-exports it),
// so "18:00" can never be spoken one way on one page and another way on the next.
// No DOM, no storage — runs under Node for tests.

// ★★ "6PM", NOT "18:00" (v405). ⚠️ A stranger reads a clock the way they speak. 18:00 is the form the
// baker's admin stores and it is right THERE; on the customer's page it is a small puzzle, and the
// whole finding of that version is that small puzzles are where a nervous customer goes wrong.
// ⚠️ ONLY THE DISPLAY CHANGES — `cfg.cutoff` stays "18:00" everywhere it is compared.
export function cutoffText(cutoff) {
  const parts = String(cutoff || "").split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return String(cutoff || "");
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const ampm = hh < 12 ? "am" : "pm";
  // ⚠️ ON THE HOUR LOSES THE ":00" — "6pm" is how a person says it, and "6:00pm" is how a form does.
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2, "0")}${ampm}`;
}

// The time token every language's cut-off sentence carries. ⚠️ `withCutoff` replaces THIS, and a test
// asks all three lines for it by name — ⚠️ **a translator who writes another form of the time would
// otherwise leave the homepage quietly wrong in that language.**
export const CUTOFF_TOKEN = "6:00PM";

// The published cut-off written into the sentence the homepage already translates. The line's own
// shape (where the time sits, whether the day comes first) belongs to the translator and is untouched.
export function withCutoff(lineHtml, cutoff) {
  const clock = cutoffText(cutoff);
  if (!clock || !String(cutoff || "").trim()) return String(lineHtml || "");
  return String(lineHtml || "").replaceAll(CUTOFF_TOKEN, clock);
}

// Short weekday words, in the three languages the homepage speaks. ⚠️ JS getDay order: Sunday 0.
const DAY_WORDS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  zh: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  ms: ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"],
};

// "Mon / Wed / Fri" from her published bake days, in the visitor's language. `null`/absent means the
// payload said nothing about days (an older publish) and the caller keeps its translated line; an
// EMPTY list is an answer — she has no bake days open — and reads as a dash rather than inventing days.
export function bakeDaysText(days, lang = "en") {
  if (!Array.isArray(days)) return null;
  const words = DAY_WORDS[lang] || DAY_WORDS.en;
  const picked = days
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
  if (!picked.length) return "—";
  return picked.map((n) => words[n]).join(" / ");
}

// ⚠️⚠️ THE PRICE ON THE HOMEPAGE IS HER PRODUCT'S, NOT A TYPED NUMBER (v588). ⚠️ The card said **RM16** while
// the shop printed the price she publishes — ⚠️ **change it in the app and the two pages disagreed, with the
// homepage the one nobody re-publishes.** ⭐ The published name may gain a word ("Rosemary Focaccia"), so the
// match is on the word, not the exact string; ⚠️ nothing found means the typed figure stays, exactly as before.
export function priceText(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  return Number.isInteger(v) ? `RM${v}` : `RM${v.toFixed(2)}`;
}

export function publishedPrice(products, word = "focaccia") {
  const list = Array.isArray(products) ? products : [];
  const hit = list.find((p) => p && typeof p.name === "string"
    && p.name.toLowerCase().includes(String(word).toLowerCase()) && Number(p.price) > 0);
  return hit ? priceText(hit.price) : "";
}
