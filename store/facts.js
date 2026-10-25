// store/facts.js — the "Good to know" bullets, which are HER words when she has written them.
//
// ⭐ v641: the block was written into this page by me; now it can be edited in the backoffice (Settings →
// Storefront) and published with everything else. ⚠️ **Blank falls back to the shop's own wording**, so the
// panel can never end up empty, and a customer always reads something true.

export const FACTS_MAX_LINES = 12;
export const FACTS_MAX_CHARS = 600;

/**
 * The bullets to draw.
 * @param {{facts?: string, factsZh?: string, factsMs?: string}|null} published what the backoffice published
 * @param {string} lang "en" | "zh" | "ms"
 * @param {string[]} fallback the shop's own lines, already translated
 * @returns {string[]}
 */
export function factsLines(published, lang, fallback) {
  const pick = (v) => (typeof v === "string" ? v : "");
  const en = pick(published && published.facts).trim();
  // ⚠️ A COUNTRY'S OWN WORDS FIRST, THEN hers in English, THEN the shop's default. ⭐ Her English is better than
  // a default she has replaced — a reader in 中文 gets her sentence rather than a sentence she no longer stands by.
  const own = lang === "zh" ? (pick(published && published.factsZh).trim() || en)
    : lang === "ms" ? (pick(published && published.factsMs).trim() || en)
      : en;
  const lines = own
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, FACTS_MAX_LINES);
  if (lines.length) return lines;
  return (Array.isArray(fallback) ? fallback : []).filter((s) => typeof s === "string" && s.trim());
}

/** The text a box should hold: her saved words, or the shop's own as a starting point. */
export function factsBoxText(published, lang = "en", fallback = []) {
  const key = lang === "zh" ? "factsZh" : lang === "ms" ? "factsMs" : "facts";
  const own = published && typeof published[key] === "string" ? published[key].trim() : "";
  return own || (Array.isArray(fallback) ? fallback.join("\n") : "");
}
