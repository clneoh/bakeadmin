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

const BASE = String(CONFIG.supabase.url).replace(/\/+$/, "");
const ANON = CONFIG.supabase.anonKey;

let lang = loadLang();
let devConfig = null; // { name, emails } fetched once from the published storefront
let devLoaded = false;

function byId(id) {
  return document.getElementById(id);
}

function render() {
  applyTo(document, HOME, lang);
  const pills = document.querySelectorAll("#lang-switch .lang-pill");
  pills.forEach((b) => b.classList.toggle("is-on", b.dataset.lang === lang));
  renderDevLine();
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

// The developer credit uses the same published storefront data as the store,
// so the baker sets the name + email(s) once in the app and the homepage
// footer shows them after the next "publish". Until then the line stays hidden.
async function loadDevConfig() {
  if (devLoaded) return;
  devLoaded = true;
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
    devConfig = { name, emails };
  } catch { /* offline — the credit line simply stays hidden */ }
}

function mailHref(emails) {
  return `mailto:${emails.join(",")}`;
}

function renderDevLine() {
  const holder = byId("dev-line");
  if (!holder) return;
  holder.replaceChildren();
  if (!devConfig || !devConfig.name || !devConfig.emails.length) return;
  const link = document.createElement("a");
  link.href = mailHref(devConfig.emails);
  link.style.color = "#f7f0e5";
  link.textContent = `${pick(HOME, lang, "devBy")} ${devConfig.name} · ✉ ${devConfig.emails.join(", ")}`;
  holder.appendChild(link);
}

async function init() {
  initSwitch();
  render();
  await loadDevConfig();
  renderDevLine();
}

if (typeof document !== "undefined") init();
