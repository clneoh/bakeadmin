// store/app.js — customer order page: pick a date, add items, place an order.
// Orders go straight to the backoffice (Supabase incoming_orders) and fall back
// to a WhatsApp message if that fails. The name, menu and WhatsApp number are
// published by the backoffice (Settings → Storefront) and override the static
// config.js fallback at runtime.
import { CONFIG } from "./config.js";
import { waNumber } from "../js/state.js";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "value") node.value = v;
    else if (k === "checked") node.checked = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function upcomingDates(cfg) {
  const out = [];
  const now = new Date();
  for (let i = 1; out.length < cfg.upcomingCount && i < 365; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (cfg.deliveryDays.includes(d.getDay())) out.push(d);
  }
  return out;
}

// Whether a delivery day can still be ordered: orders close at `cutoff`
// (e.g. "18:00") the day BEFORE delivery, so Wednesday is orderable only
// until 6pm Tuesday. No cutoff configured → always open.
export function isOpen(cfg, d, now = new Date()) {
  const parts = String((cfg && cfg.cutoff) || "").split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return true;
  const deadline = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, hh, mm, 0, 0);
  return now.getTime() < deadline.getTime();
}

export function fmtDay(d) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Which dates the pills show. When the backoffice has published real delivery
// dates (rows dated today or later), those win — including dates that don't
// match the configured weekday pattern (e.g. an extra Thursday the baker added
// in the app). Falls back to the generated weekday list only when nothing is
// published yet.
export function resolveDates(generated, dayRows, today = dateKey(new Date())) {
  if (!Array.isArray(dayRows)) return generated;
  const published = dayRows
    .map((r) => r && r.date)
    .filter((d) => d && d >= today)
    .sort();
  if (!published.length) return generated;
  return published.map((d) => new Date(`${d}T00:00:00`));
}

// Map upcoming dates → what each day pill should say, given the live
// day-level availability map ({ 'YYYY-MM-DD': slots_left }). Open days show
// just the date; only a fully-booked day is flagged "Sold out" (greyed + a
// watermark stamp via CSS). Per-product counts live on the product cards.
export function pillSpecs(dates, availMap = {}) {
  return dates.map((d) => {
    const day = fmtDay(d);
    const left = availMap[dateKey(d)];
    const soldOut = left != null && left <= 0;
    return { date: d, day, left, soldOut, avail: soldOut ? "Sold out" : "", label: soldOut ? `${day} Sold out` : day };
  });
}

export function buildMessage(cfg, order) {
  const lines = order.lines
    .map((l) => `• ${l.name} ×${l.qty} — RM${(l.qty * l.price).toFixed(2)}`)
    .join("\n");
  let msg = `New order · ${cfg.name} 🍞\n`;
  msg += `📅 ${order.date}\n`;
  msg += `${lines}\n`;
  msg += `💰 Total: RM${order.total.toFixed(2)}`;
  if (order.fulfillment) {
    const method = order.fulfillment === "courier" ? "Courier delivery" : "Self collect";
    msg += `\n📦 ${method}`;
    if (order.fulfillment === "courier" && order.address) msg += `\n📍 ${order.address}`;
  }
  if (order.customer) msg += `\n👤 ${order.customer}`;
  if (order.note) msg += `\n📝 ${order.note}`;
  return msg;
}

// Merge a config published by the backoffice over the local fallback. Arrays
// are replaced wholesale (not key-merged), the Supabase connection is never
// overridden, and malformed values fall back to the local ones. Returns a new
// object; base is left untouched.
export function mergeStorefront(base, remote) {
  if (!remote || typeof remote !== "object") return { ...base };
  const out = { ...base };
  for (const key of ["whatsapp", "name", "tagline", "instagram", "facebook", "cutoff", "tngQr"]) {
    if (typeof remote[key] === "string" && remote[key].trim()) out[key] = remote[key].trim();
  }
  for (const key of ["capacity", "upcomingCount"]) {
    const n = Number(remote[key]);
    if (Number.isFinite(n) && n > 0) out[key] = n;
  }
  if (Array.isArray(remote.deliveryDays)) {
    const days = remote.deliveryDays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    if (days.length) out.deliveryDays = days;
  }
  if (Array.isArray(remote.products)) {
    const products = remote.products
      .filter((p) => p && typeof p === "object" && String(p.name || "").trim())
      .map((p) => ({
        name: String(p.name).trim(),
        price: Number(p.price) || 0,
        unit: String(p.unit || "").trim() || "piece",
      }));
    if (products.length) out.products = products;
  }
  return out;
}

// Try to hand the order to the backoffice's incoming_orders table. Returns
// {ok:true} on success; any failure falls back to the WhatsApp message. A
// 10s timeout stops a stalled network from leaving the button stuck on
// "Sending…" forever.
export async function placeOrder(order) {
  const sb = CONFIG.supabase;
  if (!sb || !sb.url || !sb.anonKey) return { ok: false };
  const base = String(sb.url).replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${base}/rest/v1/incoming_orders`, {
      method: "POST",
      headers: {
        apikey: sb.anonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([{ data: JSON.stringify(order) }]),
      signal: controller.signal,
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

// Show the order confirmation. Accepts a string (plain) or an array of nodes
// (a titled card). Scrolls it into view so the customer sees a response right
// away instead of tapping the button again.
function showConfirm(content, kind = "ok") {
  const box = document.getElementById("confirm-msg");
  if (!box) return;
  box.className = `confirm-msg ${kind}`;
  box.replaceChildren(...(Array.isArray(content) ? content : [document.createTextNode(String(content))]));
  box.hidden = false;
  if (typeof box.scrollIntoView === "function") box.scrollIntoView({ block: "center", behavior: "smooth" });
}

function waUrl(order, dayLabel) {
  const msg = buildMessage(CONFIG, { ...order, date: dayLabel });
  return `https://wa.me/${waNumber(CONFIG.whatsapp)}?text=${encodeURIComponent(msg)}`;
}

// window.open after an await can be blocked as a popup on some phones — treat a
// null result as "not opened" so the confirmation falls back to a tappable link.
function tryOpenWa(url) {
  try {
    const w = window.open(url, "_blank");
    return !!w;
  } catch {
    return false;
  }
}

// The static header parts (name, tagline, delivery days, social links). Kept
// separate so a later-published config can re-render just these.
export function renderStatic(cfg) {
  document.title = `Order · ${cfg.name}`;
  document.getElementById("name").textContent = cfg.name;
  document.getElementById("tagline").textContent = cfg.tagline;
  document.getElementById("eyebrow").textContent = `Made to order · closes ${cfg.cutoff} the day before`;

  const days = cfg.deliveryDays.map((n) => DAYS[n]).join(", ");
  document.getElementById("delivery-days").textContent = days;
  document.getElementById("cutoff").textContent = `${cfg.cutoff} the day before`;

  const social = document.getElementById("social");
  const links = [];
  if (cfg.instagram) links.push(el("a", { href: `https://instagram.com/${cfg.instagram}`, target: "_blank", rel: "noopener" }, "📷 Instagram"));
  if (cfg.facebook) links.push(el("a", { href: `https://facebook.com/${cfg.facebook}`, target: "_blank", rel: "noopener" }, "📘 Facebook"));
  social.replaceChildren(...links);
}

export function render() {
  renderStatic(CONFIG);
  const dateWrap = document.getElementById("dates");
  const menu = document.getElementById("menu");
  const cart = new Map();
  let selected = null;
  let avail = null;      // { 'YYYY-MM-DD': slots_left } — day-level, for the pills
  let prodAvail = null;  // { 'YYYY-MM-DD': { product: slots_left } } — for the item stamps
  let dayRows = null;    // published delivery-date rows — the real dates win
  let dates = upcomingDates(CONFIG);

  const renderMenu = () => {
    const byProduct = prodAvail && selected ? prodAvail[selected] || {} : {};
    menu.replaceChildren(...CONFIG.products.map((p) => {
      const left = byProduct[p.name];
      const soldOut = left != null && left <= 0;
      const qtyLabel = el("span", { class: "stepper-val" }, String(cart.get(p.name) || 0));
      const dec = el("button", { class: "step-btn", onclick: () => {
        const q = Math.max(0, (cart.get(p.name) || 0) - 1);
        if (q === 0) cart.delete(p.name); else cart.set(p.name, q);
        qtyLabel.textContent = String(q);
        renderBar();
      } }, "−");
      const cap = left != null && left > 0 ? left : 99;
      const inc = el("button", { class: "step-btn", onclick: () => {
        const q = Math.min(cap, (cart.get(p.name) || 0) + 1);
        cart.set(p.name, q);
        qtyLabel.textContent = String(q);
        renderBar();
      } }, "+");
      if (soldOut) { dec.disabled = true; inc.disabled = true; }
      const stamp = left != null
        ? el("span", { class: soldOut ? "prod-stamp soldout" : "prod-stamp" }, soldOut ? "Sold out" : `Only ${left} left`)
        : null;
      return el("div", { class: `card menu-item${soldOut ? " soldout" : ""}` },
        el("div", { class: "card-head" },
          el("div", {},
            el("p", { class: "card-title" }, p.name),
            el("p", { class: "card-sub" }, `RM${p.price.toFixed(2)} / ${p.unit}`)),
          stamp),
        el("div", { class: "stepper" }, dec, qtyLabel, inc));
    }));
  };

  const buildPills = () => {
    const specs = pillSpecs(dates, avail || {});
    if (!specs.length) {
      dateWrap.replaceChildren(el("p", { class: "muted" }, "No upcoming delivery dates right now — check back soon."));
      return;
    }
    const open = specs.filter((s) => !s.soldOut);
    // `selected` is a YYYY-MM-DD key so it survives a rerender that rebuilds
    // the Date objects (availability/config can arrive after the user taps).
    if (selected && !specs.some((s) => dateKey(s.date) === selected && !s.soldOut)) selected = null;
    if (!selected) selected = open.length ? dateKey(open[0].date) : null;

    if (!open.length) {
      dateWrap.replaceChildren(el("p", { class: "muted" }, "All upcoming deliveries are full right now — check back soon."));
      return;
    }
    dateWrap.replaceChildren(...specs.map((s) => {
      const attrs = {
        class: `pill${dateKey(s.date) === selected ? " active" : ""}${s.soldOut ? " soldout" : ""}`,
        onclick: (e) => {
          if (s.soldOut) return;
          selected = dateKey(s.date);
          for (const p of dateWrap.children) p.classList.toggle("active", p === e.currentTarget);
          renderMenu();
        },
      };
      if (s.soldOut) attrs.disabled = "true";
      return el("button", attrs,
        el("span", { class: "pill-date" }, s.day),
        el("span", { class: "pill-sub" }, s.soldOut ? "Sold out" : ""));
    }));
  };

  // Recompute the dates + rebuild pills and menu. Called on first paint and
  // again when the availability data or the published storefront config
  // arrives — arrival order doesn't matter because both funnel through here.
  const rerender = () => {
    dates = resolveDates(upcomingDates(CONFIG), dayRows, dateKey(new Date()))
      .filter((d) => isOpen(CONFIG, d));
    buildPills();
    renderMenu();
  };

  rerender();

  const sb = CONFIG.supabase;
  if (sb && sb.url && sb.anonKey) {
    const base = String(sb.url).replace(/\/+$/, "");
    const headers = { apikey: sb.anonKey };
    Promise.all([
      fetch(`${base}/rest/v1/availability?select=date,slots_left&order=date.asc`, { headers }),
      fetch(`${base}/rest/v1/product_availability?select=date,product,slots_left&order=date.asc`, { headers }),
    ])
      .then(([dayRes, prodRes]) => Promise.all([
        dayRes.ok ? dayRes.json() : null,
        prodRes.ok ? prodRes.json() : null,
      ]))
      .then(([day, prod]) => {
        if (Array.isArray(day)) {
          dayRows = day;
          avail = Object.fromEntries(
            day.filter((r) => r && r.date != null && r.slots_left != null)
              .map((r) => [r.date, Number(r.slots_left)]));
        }
        if (Array.isArray(prod)) {
          prodAvail = {};
          for (const r of prod) {
            if (!r || r.date == null || r.product == null || r.slots_left == null) continue;
            (prodAvail[r.date] ||= {})[r.product] = Number(r.slots_left);
          }
        }
        rerender();
      })
      .catch(() => {});

    // Config published by the backoffice (Settings → Storefront) overrides the
    // static config.js fallback. Missing row / offline / corrupt JSON → keep
    // the local config.
    fetch(`${base}/rest/v1/storefront_config?select=data&id=eq.default&limit=1`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        const row = Array.isArray(rows) && rows[0];
        if (!row || typeof row.data !== "string") return;
        const remote = JSON.parse(row.data);
        Object.assign(CONFIG, mergeStorefront(CONFIG, remote));
        renderStatic(CONFIG);
        rerender();
      })
      .catch(() => {});
  }

  const renderBar = () => {
    let count = 0, total = 0;
    for (const [n, q] of cart) {
      const p = CONFIG.products.find((x) => x.name === n);
      if (!p) continue;
      count += q;
      total += q * p.price;
    }
    document.getElementById("bar-count").textContent = `${count} item${count === 1 ? "" : "s"}`;
    document.getElementById("bar-total").textContent = `RM${total.toFixed(2)}`;
    document.getElementById("order-btn").disabled = count === 0;
    return total;
  };

  const orderBtn = document.getElementById("order-btn");
  orderBtn.onclick = async () => {
    if (orderBtn.disabled) return; // one tap only — no double orders
    const lines = [];
    for (const [n, q] of cart) {
      const p = CONFIG.products.find((x) => x.name === n);
      if (!p) continue;
      lines.push({ name: n, qty: q, price: p.price });
    }
    if (!lines.length || !selected) return;
    // The baker confirms every order (and sends the payment QR) over WhatsApp,
    // so the customer's number is required to place the order at all.
    const waInput = document.getElementById("whatsapp-input");
    const whatsapp = waNumber(waInput && waInput.value);
    if (!whatsapp) {
      if (waInput && waInput.focus) waInput.focus();
      showConfirm([
        el("p", { class: "confirm-title" }, "Please add your WhatsApp number."),
        el("p", { class: "confirm-body" }, "We use it to confirm your order and send your payment QR."),
      ], "warn");
      return;
    }
    // Cutoff guard: a customer may have the page open across the deadline, so
    // re-check the selected day at the moment they tap Place order.
    if (!isOpen(CONFIG, new Date(`${selected}T00:00:00`))) {
      showConfirm([
        el("p", { class: "confirm-title" }, "That day's orders are closed."),
        el("p", { class: "confirm-body" }, `Orders for this day close at ${CONFIG.cutoff} the day before — please pick a new delivery day.`),
      ], "warn");
      return;
    }
    const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const order = {
      customer: document.getElementById("name-input").value.trim(),
      whatsapp,
      date: selected,
      lines,
      total,
      fulfillment: (document.getElementById("fulfillment") || {})._value || "collect",
      address: document.getElementById("address-input").value.trim(),
      note: document.getElementById("note-input").value.trim(),
      createdAt: new Date().toISOString(),
    };
    // `selected` is a YYYY-MM-DD key; fmtDay wants a Date.
    const dayLabel = fmtDay(new Date(`${selected}T00:00:00`));
    const items = lines.map((l) => `${l.name} ×${l.qty}`).join(" + ");

    // Immediate feedback + block the button while sending, so a slow network
    // can't make a customer tap repeatedly and send duplicates.
    orderBtn.disabled = true;
    orderBtn.textContent = "Sending…";
    showConfirm("Sending your order to the bakery…");

    const r = await placeOrder(order);
    // Dual delivery: the order is saved to the bakery's app, and a WhatsApp
    // copy also opens so the customer can send it on — that copy is what reveals
    // the customer's own number to the baker (WhatsApp shows the sender's
    // number). The confirmation tells the customer whether the order reached
    // the app or went by WhatsApp instead.
    const url = CONFIG.whatsapp ? waUrl(order, dayLabel) : null;
    const opened = url ? tryOpenWa(url) : false;

    if (r.ok) {
      cart.clear();
      document.getElementById("name-input").value = "";
      document.getElementById("whatsapp-input").value = "";
      document.getElementById("address-input").value = "";
      document.getElementById("note-input").value = "";
      // Reset the delivery method to self collect for the next customer.
      const fulEl = document.getElementById("fulfillment");
      if (fulEl) {
        fulEl._value = "collect";
        for (const b of (fulEl.querySelectorAll ? fulEl.querySelectorAll(".seg-btn") : [])) {
          b.classList.toggle("active", b.dataset.fulfillment === "collect");
        }
      }
      const addrField = document.getElementById("address-field");
      if (addrField) addrField.hidden = true;
      renderBar();
      orderBtn.textContent = "Place order"; // stays disabled — the cart is empty
      showConfirm([
        el("p", { class: "confirm-title" }, "🎉 Order received!"),
        el("p", { class: "confirm-body" },
          order.customer ? `Thanks ${order.customer}! ${CONFIG.name} has your order.` : `${CONFIG.name} has your order.`),
        el("p", { class: "confirm-body" }, `📅 ${dayLabel} · ${items} · RM${total.toFixed(2)}`),
        el("p", { class: "confirm-sub" },
          "When you pay by TNG, put your phone number in the payment description — then screenshot the receipt and send it to us on WhatsApp."),
        url
          ? (opened
              ? el("p", { class: "confirm-sub" }, "WhatsApp has opened with your order — press Send so we can confirm. We'll message you back!")
              : el("a", { class: "confirm-link", href: url, target: "_blank", rel: "noopener" }, "📲 Send your order via WhatsApp"))
          : el("p", { class: "confirm-sub" }, "We'll WhatsApp you to confirm."),
      ], "ok");
    } else {
      orderBtn.disabled = false;
      orderBtn.textContent = "Place order";
      showConfirm([
        el("p", { class: "confirm-title" }, "We couldn't reach the bakery's app just now."),
        el("p", { class: "confirm-body" }, "Don't worry — your order is still in your cart."),
        url
          ? (opened
              ? el("p", { class: "confirm-sub" }, "WhatsApp has opened with your order — press Send so it isn't lost.")
              : el("a", { class: "confirm-link", href: url, target: "_blank", rel: "noopener" }, "📲 Send your order via WhatsApp instead"))
          : null,
      ], "warn");
    }
  };

  renderBar();
}

// ── Track your order ───────────────────────────────────────────────────────
// Look up one order on the public tracking table and show its latest status
// (new / confirmed / baking / ready / delivered) with the order details only.
// Payment instructions and the receipt flow live in the WhatsApp confirmation,
// not here. Friendly fallbacks keep the card usable when the code is wrong or
// tracking is unreachable.
export async function trackOrder(code) {
  const box = document.getElementById("track-result");
  if (!box) return;
  const clean = String(code || "").trim().replace(/^#/, "").toUpperCase();
  box.hidden = false;
  const sb = CONFIG.supabase;
  if (!clean) {
    box.replaceChildren(el("p", { class: "track-note" }, "Enter your order number to track it."));
    return;
  }
  if (!sb || !sb.url || !sb.anonKey) {
    box.replaceChildren(el("p", { class: "track-note" }, "Tracking isn't available right now."));
    return;
  }
  box.replaceChildren(el("p", { class: "track-note" }, "Looking up your order…"));
  const base = String(sb.url).replace(/\/+$/, "");
  try {
    // cache: no-store so a repeated lookup (e.g. re-checking the same order
    // after the baker updates it) always gets the current status, never a
    // cached one from the phone's HTTP cache.
    const res = await fetch(
      `${base}/rest/v1/order_tracking?select=status,delivery,items,total,updated_at&code=eq.${clean}&limit=1`,
      { headers: { apikey: sb.anonKey }, cache: "no-store" });
    const rows = res.ok ? await res.json() : null;
    const row = Array.isArray(rows) && rows[0];
    if (!row) {
      box.replaceChildren(el("p", { class: "track-note" },
        `We couldn't find order #${clean}. Check the number in your confirmation message — it's the 6 characters after the #.`));
      return;
    }
    // The status leads as a big colour-coded pill, then the order code and the
    // delivery / items details. Colours map to the stage: grey = new, brown =
    // confirmed, amber = baking, green = ready or delivered.
    const key = String(row.status || "").toLowerCase().trim() || "new";
    const status = key.replace(/^./, (c) => c.toUpperCase());
    const kids = [
      el("span", { class: `status-pill st-${key}` }, status),
      el("p", { class: "track-code" }, `Order #${clean}`),
      el("p", {}, row.delivery),
      el("p", {}, `${row.items} — ${row.total}`),
      row.customer ? el("p", { class: "track-note" }, `For ${row.customer}`) : null,
    ];
    box.replaceChildren(...kids.filter(Boolean));
  } catch {
    box.replaceChildren(el("p", { class: "track-note" }, "Tracking isn't available right now — try again in a moment."));
  }
}

// Wire the Self collect / Courier picker. The choice is stored on the wrapper
// node so the order handler reads it back; courier reveals the address field.
function wireFulfillment() {
  const wrap = document.getElementById("fulfillment");
  if (!wrap) return;
  const buttons = (wrap.querySelectorAll && wrap.querySelectorAll(".seg-btn")) || [];
  const apply = (value) => {
    wrap._value = value;
    for (const b of buttons) b.classList.toggle("active", b.dataset.fulfillment === value);
    const addr = document.getElementById("address-field");
    if (addr) addr.hidden = value !== "courier";
  };
  for (const b of buttons) b.addEventListener("click", () => apply(b.dataset.fulfillment));
  apply("collect"); // reflect the static HTML's default active button
}

function wireTrack() {
  const input = document.getElementById("track-input");
  const btn = document.getElementById("track-btn");
  if (!input || !btn) return;
  const go = () => trackOrder(input.value);
  btn.addEventListener("click", go);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  // The confirmation link opens this page as /store/?track=CODE — prefill and
  // look the order up right away so the customer sees their status instantly.
  if (typeof location !== "undefined" && location.search) {
    const code = new URLSearchParams(location.search).get("track");
    if (code) {
      input.value = code.replace(/^#/, "").toUpperCase();
      trackOrder(code);
    }
  }
}

render();
wireFulfillment();
wireTrack();
