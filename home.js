// home.js — the homepage's site language switch (EN / 中文 / BM) and the small
// "developer" credit line in the footer. Runs alongside reviews.js.
//
// Applying a language rewrites the tagged static text from home-lang.js in
// place; the visitor's choice is remembered on their device. Reviews.js listens
// for the same change so its own dynamic bits (form buttons, carousel labels)
// follow along.

import { applyTo, loadLang, rememberLang, pick } from "./i18n.js";
import { HOME } from "./home-lang.js";
import { CONFIG } from "./store/config.js";
import { bakeDaysText, publishedPrice, withCutoff } from "./home-facts.js";

const BASE = String(CONFIG.supabase.url).replace(/\/+$/, "");
const ANON = CONFIG.supabase.anonKey;

let lang = loadLang();
// What the homepage PRINTS that is hers to set, once the published settings arrive (v581). ⚠️ Both were
// typed into index.html while the shop read them from settings — changing one moved the shop and left the
// homepage saying the old thing.
let siteFacts = { cutoff: "", days: null };
let devConfig = null; // { name, emails, wa } fetched once from the published storefront
let devLoaded = false;
let retryTimer = null;

function byId(id) {
  return document.getElementById(id);
}

function render() {
  applyTo(document, HOME, lang);
  renderSiteFacts();
  const pills = document.querySelectorAll("#lang-switch .lang-pill");
  // ⚠️⚠️ AND THE CHOSEN LANGUAGE IS SAID IN WORDS, NOT ONLY BY ITS BACKGROUND (v588). ⭐ The shop's own
  // point cards and day buttons got `aria-pressed` at v583; the language pills did not.
  pills.forEach((b) => {
    const on = b.dataset.lang === lang;
    b.classList.toggle("is-on", on);
    if (b.setAttribute) b.setAttribute("aria-pressed", String(on));
  });
  renderDevLine();
}

// ⭐ THE TWO FACTS FROM HER SETTINGS, written into the translated lines AFTER they are applied — so every
// language switch keeps them (v581). ⚠️ The line's own shape stays the translator's: only the time TOKEN and
// the day words are replaced.
function renderSiteFacts() {
  if (siteFacts.cutoff) {
    for (const el of document.querySelectorAll('[data-i18n-html="n1Line"]')) {
      el.innerHTML = withCutoff(el.innerHTML, siteFacts.cutoff);
    }
  }
  const days = bakeDaysText(siteFacts.days, lang);
  if (days != null) {
    for (const el of document.querySelectorAll('[data-i18n="s1d"]')) el.textContent = days;
  }
}

function choose(next) {
  if (next === lang) return;
  lang = next;
  rememberLang(next);
  render();
  window.dispatchEvent(new CustomEvent("i18nchange", { detail: { lang } }));
}

function initSwitch() {
  const pills = document.querySelectorAll("#lang-switch .lang-pill");
  pills.forEach((b) => b.addEventListener("click", () => choose(b.dataset.lang)));
}

// Normalize a WhatsApp number to the digits wa.me needs (local "0" → "60"),
// the same rule the app uses for the bakery's own number.
function waDigits(n) {
  const digits = String(n || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
}

// The developer credit uses the same published storefront data as the store,
// so the baker sets the name (+ email(s) and/or a WhatsApp number) once in the
// app and the homepage footer shows them after the next "publish". Until then
// the line stays hidden.
async function loadDevConfig() {
  if (devLoaded) return;
  // ⚠️⚠️ ONE FAILED REQUEST MUST NOT FREEZE THE SALE FACTS FOR THE WHOLE VISIT (v596). ⚠️ This latched
  // BEFORE the fetch, so a single failure (airplane mode, a 503) left the typed RM16 / Mon-Wed-Fri / 6:00PM on
  // the page while the shop polled and recovered — ⚠️ **the homepage could quote RM16 and the shop RM22 on the
  // same phone.** ⭐ The latch is set only once the read succeeded.
  try {
    const res = await fetch(
      `${BASE}/rest/v1/storefront_config?select=data&id=eq.default`,
      { headers: { apikey: ANON } });
    if (!res.ok) return;
    const rows = await res.json().catch(() => null);
    const raw = Array.isArray(rows) && rows[0] ? rows[0].data : null;
    if (!raw) return;
    const cfg = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!cfg || typeof cfg !== "object") return;
    const name = typeof cfg.developerName === "string" ? cfg.developerName.trim() : "";
    const emails = Array.isArray(cfg.developerEmails)
      ? cfg.developerEmails.map((e) => String(e).trim()).filter(Boolean)
      : [];
    const wa = typeof cfg.developerWhatsapp === "string" ? cfg.developerWhatsapp.trim() : "";
    devConfig = { name, emails, wa };
    // ★★★ AND THE BAKERY'S OWN NUMBER FOLLOWS SETTINGS TOO (v565).
    // ⚠️⚠️ THE FAULT: the footer's WhatsApp link was TYPED INTO index.html, while the shop reads the
    // number from the published settings. ⭐ So changing it once in the app moved the shop and left the
    // homepage sending people to the old number — ⭐ **a customer's first tap on the wrong link is a sale
    // that never happens.** ⚠️ The typed number stays as the fallback: if the fetch fails or nothing is
    // published, the page is exactly as it was.
    const shopWa = typeof cfg.whatsapp === "string" ? cfg.whatsapp.trim() : "";
    if (shopWa) setFooterNumber(shopWa);
    // ★★ AND THE CUT-OFF AND THE BAKE DAYS (v581). ⚠️ A malformed cut-off is ignored rather than printed;
    // an EMPTY day list is an answer — she has none open — and `bakeDaysText` says so with a dash.
    // ⭐ AND THE PRICE ON THE CARD IS THE PRODUCT'S (v588) — the published list, by the word in its name.
    // ⚠️ THE PRODUCT SHE PICKED IN SETTINGS, when one is published (v593); otherwise the old rule.
    const price = publishedPrice(cfg.products, String(cfg.homeProduct || "").trim() || "focaccia");
    if (price) {
      for (const el of document.querySelectorAll('[data-price="focaccia"]')) el.textContent = price;
    }
    const cut = typeof cfg.cutoff === "string" ? cfg.cutoff.trim() : "";
    if (/^\d{1,2}:\d{2}$/.test(cut)) siteFacts.cutoff = cut;
    if (Array.isArray(cfg.deliveryDays)) siteFacts.days = cfg.deliveryDays;
    renderSiteFacts();
    devLoaded = true;   // ⭐ only now: a failed visit retries on the next call
  } catch {
    // ⚠️⚠️ AND IT ACTUALLY TRIES AGAIN (v598). ⚠️ v596 stopped latching the failure, but nothing called this
    // function again — ⚠️ **so a homepage opened in a tunnel kept the typed RM16 for the whole visit while the
    // shop polled and recovered.** ⭐ One retry on a timer, and one the moment the phone is back online.
    if (!retryTimer) retryTimer = setTimeout(() => { retryTimer = null; loadDevConfig(); }, 30000);
  }
}

// The way the footer has always written it: +60 16-960 1268 for a Malaysian mobile, a plain
// +digits for anything else. ⚠️ Only ever called with a number that has already passed the shop's own
// plausibility check, so it cannot print half a phone number.
function footerPhoneText(d) {
  return /^60\d{9,10}$/.test(d) ? `+60 ${d.slice(2, 4)}-${d.slice(4, 7)} ${d.slice(7)}` : `+${d}`;
}

function setFooterNumber(number) {
  const digits = waDigits(number);
  if (digits.length < 9 || digits.length > 15) return;
  const link = byId("footer-wa");
  if (!link) return;
  link.href = `https://wa.me/${digits}`;
  const strong = link.querySelector("strong");
  if (strong) strong.textContent = footerPhoneText(digits);
}

function mailHref(emails) {
  return `mailto:${emails.join(",")}`;
}

function devWaHref(number) {
  const digits = waDigits(number);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent("Hi!")}` : "";
}

// The footer credit: "Website by {name}", with a WhatsApp link (primary, opens
// a chat with a ready "Hi!") when a number is set, and the email address(es) as
// a smaller second line underneath. Needs a name and at least one of the two.
function renderDevLine() {
  const holder = byId("dev-line");
  if (!holder) return;
  holder.replaceChildren();
  if (!devConfig || !devConfig.name || (!devConfig.wa && !devConfig.emails.length)) return;
  const cream = "#f7f0e5";
  const credit = document.createElement("div");
  credit.style.color = cream;
  credit.textContent = `${pick(HOME, lang, "devBy")} ${devConfig.name}`;
  holder.appendChild(credit);
  const linkStyle = (extra = "") => `display:inline-block;margin:2px 8px 0;color:${cream};${extra}`;
  if (devConfig.wa) {
    const wa = document.createElement("a");
    wa.href = devWaHref(devConfig.wa);
    wa.style.cssText = linkStyle();
    wa.textContent = `💬 ${pick(HOME, lang, "devWa")}`;
    holder.appendChild(wa);
  }
  if (devConfig.emails.length) {
    const mail = document.createElement("a");
    mail.href = mailHref(devConfig.emails);
    mail.style.cssText = linkStyle("font-size:12px;opacity:0.85");
    mail.textContent = `✉ ${devConfig.emails.join(", ")}`;
    holder.appendChild(mail);
  }
}

async function init() {
  initSwitch();
  render();
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    // ⚠️ The phone coming back online is the moment to try (v598).
    window.addEventListener("online", () => loadDevConfig());
  }
  await loadDevConfig();
  renderDevLine();
}

if (typeof document !== "undefined") init();
