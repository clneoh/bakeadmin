// state.js — data schema, localStorage load/save, id + format helpers.
// Kept thin and DOM-free (except localStorage) so the data layer can later
// be swapped for a backend without touching views or BOM logic.

export const LS_KEY = "bakeadmin.v1";

export function defaultState() {
  return {
    version: 1,
    settings: {
      defaultCapacity: 12,
      deliveryDays: [1, 3, 5], // JS getDay(): 1=Mon, 3=Wed, 5=Fri
      cutoff: "18:00",
      currency: "RM",
      supabase: { // live "slots left" publishing; empty = feature off
        enabled: false,
        url: "",
        anonKey: "",
        email: "",
        password: "",
      },
      cloud: { // shared data across phones; opt-in, off = today's behavior
        enabled: false,
      },
      lock: { enabled: false, pinHash: "" }, // device-local app password (never synced)
      storefront: { // what the customer page shows; published to Supabase
        whatsapp: "",
        name: "",
        tagline: "",
        instagram: "",
        facebook: "",
        tngQr: "", // hosted image URL shown on the customer's track page for TNG payment
        products: [], // [{ name, price, unit }]
      },
    },
    ingredients: [],
    products: [],
    deliveryDates: [],
    orders: [],
    purchaseOrders: [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const s = raw ? JSON.parse(raw) : null;
    if (s && s.version === 1) return normalize(s);
    if (s) return migrate(s);
  } catch (err) {
    console.warn("Corrupt stored data, resetting to defaults", err);
  }
  return seedFreshState();
}

// First run on a device (no saved state at all) ships preconnected so a fresh
// phone works after ONE sign-in: shared data + live availability on, the 8899
// PIN on, and the live published storefront values prefilled. This template
// lives ONLY here — normalize() keeps neutral defaults above so a partial
// stored state can never inherit any of this (it must never, say, lock a phone
// with a PIN the owner did not set). The app-login PASSWORD is deliberately
// never shipped in code; the owner types it once per phone at the sign-in gate.
function seedFreshState() {
  const s = defaultState();
  s.settings.cloud.enabled = true;
  s.settings.supabase.enabled = true;
  s.settings.supabase.url = "https://hzpyblqygnntixkijeem.supabase.co";
  s.settings.supabase.anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cHlibHF5Z25udGl4a2lqZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODUyNzAsImV4cCI6MjEwMzc2MTI3MH0.jmxtiVCmDrD3xJWVSxhYi5lDpXD6nyZavp1x5hhUh0E";
  s.settings.supabase.email = ""; // owner's app-login email (paste in when known)
  s.settings.lock.enabled = true;
  s.settings.lock.pinHash = "9800a8677d99e5f6968d7357e44006388b09d3b6a8676d0f930fbaa63d02330d"; // default PIN 8899
  s.settings.storefront = cleanStorefront({
    whatsapp: "60123456789",
    name: "Jienluv2bake",
    tagline: "Home-made focaccia & sandwiches, Penang",
    instagram: "",
    facebook: "",
    tngQr: "https://hzpyblqygnntixkijeem.supabase.co/storage/v1/object/public/folder/TNGncl.jpeg",
    products: [],
  });
  return normalize(s);
}

export function save(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save", err);
  }
  saveHook?.(state);
}

// The sync engine (js/sync.js) registers a save hook so every mutation funnels
// through the same point. Kept as a function field so state.js stays a leaf
// module — app.js wires the hook, avoiding an import cycle.
let saveHook = null;
export function setSaveHook(fn) {
  saveHook = fn;
}

// Red dot on the Orders tab = orders still waiting to be handled (status New).
// Storefront orders that arrived as one cart of several items share a groupId,
// so a single customer order counts once. Calls from app.js on every render and
// from orders.js after a status change. No-op when the badge isn't in the DOM.
export function updateOrderBadge(state) {
  if (typeof document === "undefined") return;
  const badge = document.getElementById("orders-badge");
  if (!badge) return;
  const seen = new Set();
  let n = 0;
  for (const o of state.orders || []) {
    if ((o.status || "new") !== "new") continue;
    if (o.groupId && seen.has(o.groupId)) continue;
    if (o.groupId) seen.add(o.groupId);
    n++;
  }
  badge.textContent = n > 99 ? "99+" : String(n);
  badge.hidden = n === 0;
}

// Group orders by their storefront groupId (one customer order with several
// items arrives as several rows so availability math stays correct, but the
// list/inbox show them as one order). Orders without a groupId each form their
// own group. Preserves input order; returns [{ orders: [...] }, ...].
export function groupOrders(orders) {
  const groups = [];
  const byGroup = new Map();
  for (const o of orders || []) {
    if (o.groupId && byGroup.has(o.groupId)) {
      byGroup.get(o.groupId).orders.push(o);
    } else if (o.groupId) {
      const g = { orders: [o] };
      byGroup.set(o.groupId, g);
      groups.push(g);
    } else {
      groups.push({ orders: [o] });
    }
  }
  return groups;
}

// Defensive normalization for hand-edited or older imports: guarantees the
// shape the rest of the app relies on, dropping unknown fields.
function normalize(s) {
  const d = defaultState();
  const out = {
    version: 1,
    settings: {
      ...d.settings,
      ...(s.settings || {}),
      supabase: { ...d.settings.supabase, ...((s.settings || {}).supabase || {}) },
      cloud: { ...d.settings.cloud, ...((s.settings || {}).cloud || {}) },
      lock: { ...d.settings.lock, ...(((s.settings || {}).lock) || {}) },
      storefront: cleanStorefront((s.settings || {}).storefront),
    },
    ingredients: Array.isArray(s.ingredients) ? s.ingredients : [],
    products: Array.isArray(s.products) ? s.products : [],
    deliveryDates: Array.isArray(s.deliveryDates) ? s.deliveryDates : [],
    orders: Array.isArray(s.orders)
      ? s.orders.map((o) => (o && typeof o === "object" ? { ...o, status: o.status || "new" } : o))
      : [],
    purchaseOrders: Array.isArray(s.purchaseOrders) ? s.purchaseOrders : [],
  };
  const consolidated = consolidateDeliveryDates(out.deliveryDates, out.orders);
  out.deliveryDates = consolidated.deliveryDates;
  out.orders = consolidated.orders;
  return out;
}

// Two deliveryDates for the same day (e.g. both phones added the same date
// before they synced, then the merge kept both) show up as two tabs and split
// orders between them. Keep the first entry per date and re-point every order
// to it. Nothing is deleted from the business data — orders are preserved.
function consolidateDeliveryDates(deliveryDates, orders) {
  const byDate = new Map();
  const removed = new Map(); // removedId -> survivingId
  const out = [];
  for (const d of deliveryDates) {
    if (!d || typeof d.date !== "string" || !d.date) continue;
    const survivor = byDate.get(d.date);
    if (survivor) {
      if (d.id) removed.set(d.id, survivor.id);
    } else {
      byDate.set(d.date, d);
      out.push(d);
    }
  }
  if (!removed.size) return { deliveryDates, orders };
  const reId = (o) =>
    (o && o.deliveryDateId && removed.has(o.deliveryDateId))
      ? { ...o, deliveryDateId: removed.get(o.deliveryDateId) }
      : o;
  return { deliveryDates: out, orders: orders.map(reId) };
}

// Storefront settings published to the customer page. Fills every field so a
// partially-written stored value can't crash the Settings product editor, and
// keeps only well-formed menu items.
function cleanStorefront(sf) {
  const d = defaultState().settings.storefront;
  const src = (sf && typeof sf === "object") ? sf : {};
  const products = Array.isArray(src.products)
    ? src.products
        .filter((p) => p && typeof p === "object" && String(p.name || "").trim())
        .map((p) => ({
          name: String(p.name).trim(),
          price: Number(p.price) || 0,
          unit: String(p.unit || "").trim() || "piece",
        }))
    : [];
  return {
    whatsapp: String(src.whatsapp ?? d.whatsapp),
    name: String(src.name ?? d.name),
    tagline: String(src.tagline ?? d.tagline),
    instagram: String(src.instagram ?? d.instagram),
    facebook: String(src.facebook ?? d.facebook),
    tngQr: String(src.tngQr ?? d.tngQr),
    products,
  };
}

// Placeholder for future version migrations. v1 is the only format today.
function migrate(s) {
  return normalize(s);
}

// Short, shareable code a customer can quote to track an order: the last 6 hex
// of the order id (or its groupId, so a multi-item order shares one code),
// uppercased. ids are 12 random hex chars from newId, so a collision needs 1
// in ~16M — fine for a home bakery. Display code adds "#" (e.g. "#A3F9C2").
export function orderCode(order) {
  const hex = String((order && (order.groupId || order.id)) || "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(-6)
    .toUpperCase();
  return hex || "??????";
}

export { normalize };

// Normalize a customer's WhatsApp number to the digits-only international form
// wa.me links require. Strips "+", spaces and dashes; a local leading "0" gets
// the Malaysian country code ("012-345 6789" → "60123456789", "+60 12-345 6789"
// → "60123456789"). Blank input → "" (the caller decides what that means).
export function waNumber(n) {
  const digits = String(n || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
}

export function newId(prefix) {
  let rand;
  if (crypto.randomUUID) {
    rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  } else {
    rand = Math.random().toString(36).slice(2, 14);
  }
  return `${prefix}_${rand}`;
}

export function byId(list, id) {
  return list.find((x) => x.id === id);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function fmtRM(n, currency = "RM") {
  return `${currency} ${round2(n).toFixed(2)}`;
}
