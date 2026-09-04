// views/customers.js — who ordered what, when, and how to reach them.
// Each row is one customer across their whole history: 💬 opens a WhatsApp chat
// with them, tapping the row shows their full order history in a pop-up, and
// "Pick who to message" turns the list into checkboxes so the baker can copy
// their numbers or a note that starts with each person's name. WhatsApp can't
// send one note to many at once, so the copies are there to paste per chat.

import { navigate } from "../app.js";
import { customerList, ordersForCustomer } from "../customers.js";
import { el, button, select, emptyState, showPopup, copyText, toast } from "../ui.js";
import { byId, fmtRM, waNumber } from "../state.js";
import { longDate, todayISO, weekdayName } from "../dates.js";

const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "name", label: "Name A–Z" },
  { value: "orders", label: "Most orders" },
  { value: "units", label: "Most units" },
];
const WHOS = [
  { value: "all", label: "Everyone" },
  { value: "phone", label: "Has a WhatsApp number" },
  { value: "recent30", label: "Ordered in the last 30 days" },
  { value: "gone30", label: "Has WhatsApp, not in 30 days" },
];
const STATUS_LABEL = {
  new: "New", confirmed: "Confirmed", paid: "Paid",
  baking: "Baked", ready: "Packed", delivered: "Delivered",
};

// Picked-for-messaging set and the compose text live for this screen so a
// filter change or a re-render never drops a selection mid-compose.
let picked = new Set();
let messageBody = "";

const short = (iso) => (iso ? `${weekdayName(iso)} ${iso.slice(8)}` : "");
const dateLine = (iso) => (iso ? `${weekdayName(iso)}, ${longDate(iso)}` : "");
const money = (state, n) => fmtRM(n, state.settings?.currency || "RM");
const productName = (state, id) => (byId(state.products || [], id) || {}).name || "(deleted product)";

function openChat(r) {
  const w = waNumber(r.whatsapp);
  if (!w) return;
  const name = r.name && r.name !== "(no name)" ? r.name : "";
  const text = name ? `Hi ${name}!` : "Hi!";
  window.open(`https://wa.me/${w}?text=${encodeURIComponent(text)}`, "_blank");
}

export function renderCustomers(root, state, params) {
  const sortRaw = params.get("sort");
  const whoRaw = params.get("who");
  const sort = SORTS.some((s) => s.value === sortRaw) ? sortRaw : "recent";
  const who = WHOS.some((w) => w.value === whoRaw) ? whoRaw : "all";
  const pick = params.get("pick") === "1";
  const today = todayISO();

  const shown = customerList(state, sort, who, today);
  const all = who === "all" ? shown : customerList(state, sort, "all", today);
  const phoneShown = shown.filter((r) => r.whatsapp).length;

  // Re-renders via the selects keep every setting (sort, who, pick) in the URL.
  const nav = (p) => navigate(`#/customers?sort=${sortSel.value}&who=${whoSel.value}${p ? "&pick=1" : ""}`);
  const sortSel = select(SORTS, sort, () => nav(pick), "");
  const whoSel = select(WHOS, who, () => nav(pick), "");

  const msgCard = el("div", { class: "card" });
  const listBox = el("div");

  root.replaceChildren(
    el("div", { class: "card" },
      el("h2", { style: "margin:0 0 2px" }, "Customer list"),
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        who === "all"
          ? `${shown.length} customer${shown.length === 1 ? "" : "s"} in your history · ${phoneShown} with a WhatsApp number.`
          : `${shown.length} of ${all.length} customer${all.length === 1 ? "" : "s"} match — tap a name to see their history.`),
      el("div", { class: "two-col" },
        el("div", { class: "field" }, el("label", {}, "Who to look at"), whoSel),
        el("div", { class: "field" }, el("label", {}, "Sort by"), sortSel))),
    msgCard,
    el("h2", { class: "section" },
      who === "gone30" ? "Quiet customers — no order in 30 days"
        : who === "recent30" ? "Recent customers — ordered in 30 days"
        : who === "phone" ? "Customers with a WhatsApp number"
        : "Customers"),
    listBox);

  function drawList() {
    if (!shown.length) {
      listBox.replaceChildren(emptyState(
        who === "all" ? "No customers yet" : "Nobody matches",
        who === "all"
          ? "Orders you add in the Orders tab appear here, keeping their WhatsApp numbers for follow-ups."
          : who === "phone"
          ? "No one here has a WhatsApp number yet — add phone numbers when you take an order (Edit on the order)."
          : "Change the Who filter above to see everyone."));
      return;
    }
    listBox.replaceChildren(...shown.map(rowEl));
  }

  function rowEl(r) {
    const on = picked.has(r._key);
    const mark = el("span", { class: `pick-mark${on ? " on" : ""}` }, on ? "✓" : "");
    const row = el("div", { class: `list-item tappable${on ? " picked" : ""}${pick ? " picking" : ""}` });
    const setVisual = () => {
      const now = picked.has(r._key);
      row.classList.toggle("picked", now);
      mark.classList.toggle("on", now);
      mark.textContent = now ? "✓" : "";
      refreshMsg();
    };
    row.onclick = pick
      ? () => { picked.has(r._key) ? picked.delete(r._key) : picked.add(r._key); setVisual(); }
      : () => openHistory(state, r);

    const subs = [
      r.whatsapp ? `📱 ${r.whatsapp}` : "No number saved",
      `${r.orders} order${r.orders === 1 ? "" : "s"} · ${r.units} unit${r.units === 1 ? "" : "s"} · ${r.totalSpend > 0 ? `about ${money(state, r.totalSpend)}` : "no prices set"}${r.fav ? ` · likes ${r.fav}` : ""}`,
    ];
    if (r.lastOrdered) {
      subs.push(`last ${short(r.lastOrdered)}${r.last && r.last !== r.lastOrdered ? ` · delivered ${short(r.last)}` : ""}`);
    }

    row.append(
      el("div", { class: "li-main" },
        el("div", { class: "li-title" }, r.name),
        ...subs.map((s) => el("div", { class: "li-sub" }, s))),
      el("div", { class: "li-right" },
        r.whatsapp ? button("💬 Chat", (ev) => { ev.stopPropagation(); openChat(r); }, "ghost small") : null,
        mark));
    return row;
  }

  const statusEl = el("p", { class: "card-sub", style: "margin:0 0 8px" });
  const bodyInput = el("input", { class: "input", value: messageBody,
    placeholder: "Your message, e.g. “your order is ready to collect!”",
    oninput: () => { messageBody = bodyInput.value; refreshMsg(); } });
  const previewEl = el("div", { class: "msg-preview" });
  const numBtn = button("", () => copyList(rowsPicked()), "soft");
  const greetBtn = button("", () => copyGreetings(rowsPicked()), "primary");

  function drawMsgCard() {
    if (!pick) {
      msgCard.replaceChildren(
        el("h2", { style: "margin:0 0 2px" }, "Message customers"),
        el("p", { class: "card-sub", style: "margin:0 0 10px" },
          "💬 on a row opens WhatsApp for that person. To reach several people at once, pick who you want, then copy their numbers or a note that starts with their name."),
        el("div", { class: "btn-row" },
          button("☑ Pick who to message", () => nav(true), "primary"),
          button(phoneShown ? `Copy numbers (${phoneShown})` : "Copy numbers", () => copyList(shown), "soft"),
          button("⤓ CSV", () => downloadCsv(shown), "ghost")));
      return;
    }
    msgCard.replaceChildren(
      el("h2", { style: "margin:0 0 2px" }, "Pick who to message"),
      el("p", { class: "card-sub", style: "margin:0 0 8px" },
        "Tap names to select them. WhatsApp can't send one note to many at once, so copy what's below and paste it into each chat."),
      statusEl,
      el("label", {}, "Your message"),
      bodyInput,
      previewEl,
      el("div", { class: "btn-row" }, greetBtn, numBtn),
      el("div", { class: "btn-row" },
        button("Done", () => nav(false), "ghost"),
        button("Pick all shown", () => { shown.forEach((r) => picked.add(r._key)); drawList(); refreshMsg(); }, "ghost"),
        button("Clear picked", () => { picked.clear(); drawList(); refreshMsg(); }, "ghost")));
    refreshMsg();
  }

  function rowsPicked() {
    return shown.filter((r) => picked.has(r._key));
  }

  function refreshMsg() {
    const ph = rowsPicked().filter((r) => r.whatsapp);
    const b = String(messageBody).trim();
    const first = ph[0];
    numBtn.textContent = ph.length ? `Copy numbers (${ph.length})` : "Copy numbers";
    numBtn.disabled = !ph.length;
    greetBtn.textContent = ph.length ? `Copy greeting ×${ph.length}` : "Copy greeting";
    greetBtn.disabled = !(ph.length && b);
    statusEl.textContent = `${rowsPicked().length} of ${shown.length} picked · ${ph.length} with a number`;
    previewEl.replaceChildren(
      !ph.length
        ? el("p", { class: "muted" }, b ? "Pick someone with a WhatsApp number to preview." : "Pick someone first — then the greeting shows here.")
        : !b
          ? el("p", { class: "muted" }, "Type your message above to preview the greeting.")
          : el("p", {}, el("span", { class: "muted" }, `First chat (${first.name}): `),
              el("span", { class: "preview-text" }, `Hi ${first.name}, ${b}`)));
  }

  drawList();
  drawMsgCard();
}

// ---- shared copy / export helpers (respect the list that's on screen) ----

function copyList(list) {
  const ph = (list || []).filter((r) => r.whatsapp);
  if (!ph.length) return toast("No WhatsApp numbers in this list");
  const nums = ph.map((r) => r.whatsapp.replace(/[^\d]/g, "")).join("\n");
  copyText(nums, `${ph.length} number${ph.length === 1 ? "" : "s"} copied — paste into WhatsApp`);
}

function copyGreetings(list) {
  const ph = (list || []).filter((r) => r.whatsapp);
  if (!ph.length) return toast("No WhatsApp numbers in this list");
  const b = String(messageBody).trim();
  if (!b) return toast("Type your message first");
  const msgs = ph.map((r) => `Hi ${r.name}, ${b}`).join("\n");
  copyText(msgs, `${ph.length} personalised message${ph.length === 1 ? "" : "s"} copied — paste into each WhatsApp chat`);
}

function downloadCsv(list) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Name", "WhatsApp", "Last ordered", "Last delivery", "Orders", "Units", "Approx spend", "Favourite"].join(","),
    ...(list || []).map((r) =>
      [esc(r.name), esc(r.whatsapp), esc(r.lastOrdered), esc(r.last),
        r.orders, r.units, r.totalSpend, esc(r.fav || "")].join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: `jienluv2bake-customers-${todayISO()}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- history pop-up for one customer ----

function openHistory(state, r) {
  const blocks = ordersForCustomer(state, r);
  showPopup(r.name, (refresh, close) =>
    el("div", {},
      r.whatsapp ? el("div", { class: "li-row", style: "margin:0 0 8px" },
        el("p", { class: "card-sub", style: "margin:0" }, `📱 ${r.whatsapp}`),
        button("💬 Chat", () => { close(); openChat(r); }, "primary small")) : null,
      el("div", { class: "chip-row" },
        el("span", { class: "qty-chip" }, `${r.orders} order${r.orders === 1 ? "" : "s"}`),
        el("span", { class: "qty-chip" }, `${r.units} unit${r.units === 1 ? "" : "s"}`),
        r.totalSpend > 0
          ? el("span", { class: "qty-chip", style: "background:var(--brown-soft)" }, `about ${money(state, r.totalSpend)}`)
          : null),
      r.fav ? el("p", { class: "card-sub", style: "margin:8px 0 0" }, `⭐ Favourite: ${r.fav}`) : null,
      !blocks.length
        ? emptyState("No order history", "This customer's orders were removed.")
        : el("div", {},
            el("p", { class: "card-sub", style: "margin:12px 0 2px" }, "Order history — newest first"),
            ...blocks.map((b) => historyBlock(state, b)))),
    { wide: true });
}

function historyBlock(state, b) {
  const placed = dateLine(b.orderDate);
  const del = dateLine(b.deliveryDate);
  const when = !placed && !del ? ""
    : b.deliveryDate ? (placed === del ? `Deliver ${del}` : `Placed ${placed} · deliver ${del}`)
    : `Ordered ${placed}`;
  const courier = b.fulfillment === "courier";
  return el("div", { class: "hist-ord" },
    el("div", { class: "li-row" },
      el("span", { class: "hist-code" }, `#${b.code}`),
      el("span", { class: `fulfill-tag${courier ? " courier" : ""}` }, courier ? "Courier" : "Self collect"),
      el("span", { class: "qty-chip" }, STATUS_LABEL[b.status] || b.status)),
    when ? el("p", { class: "card-sub", style: "margin:2px 0 6px" }, when) : null,
    ...b.lines.map((o) => el("div", { class: "hist-line" }, `${productName(state, o.productId)} ×${o.qty}`)));
}
