// views/customers.js — delivery history + WhatsApp marketing list.

import { navigate } from "../app.js";
import { customerList } from "../customers.js";
import { el, button, emptyState, select, toast } from "../ui.js";
import { longDate, todayISO, weekdayName } from "../dates.js";

const short = (iso) => (iso ? `${weekdayName(iso)} ${iso.slice(8)}` : "");
const SORTS = [
  { value: "recent", label: "Most recent" },
  { value: "name", label: "Name A–Z" },
  { value: "orders", label: "Most orders" },
  { value: "units", label: "Most units" },
  { value: "phone", label: "Has WhatsApp first" },
];

export function renderCustomers(root, state, params) {
  const sort = params.get("sort") || "recent";
  const rows = customerList(state, sort);
  const withPhone = rows.filter((r) => r.whatsapp);

  if (!rows.length) {
    root.replaceChildren(emptyState("No customers yet",
      "Orders you add in the Orders tab appear here with their WhatsApp numbers, kept in your delivery history."));
    return;
  }

  const copyNumbers = () => {
    if (!withPhone.length) return toast("No WhatsApp numbers saved yet");
    const digits = withPhone.map((r) => r.whatsapp.replace(/[^\d]/g, ""));
    copyText(digits.join("\n"), `${digits.length} number(s) copied — paste into WhatsApp`);
  };

  const downloadCsv = () => {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Name", "WhatsApp", "Last ordered", "Last delivery", "Orders", "Units"].join(","),
      ...rows.map((r) =>
        [esc(r.name), esc(r.whatsapp), esc(r.lastOrdered), esc(r.last), r.orders, r.units].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: `jienluv2bake-customers-${todayISO()}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const sortEl = select(SORTS, sort, () => navigate(`#/customers?sort=${sortEl.value}`), "");

  const cards = rows.map((r) => el("div", { class: "list-item" },
    el("div", { class: "li-main" },
      el("div", { class: "li-title" }, r.name),
      el("div", { class: "li-sub" },
        [r.whatsapp ? `📱 ${r.whatsapp}` : null,
          `${r.orders} order${r.orders === 1 ? "" : "s"} · ${r.units} unit${r.units === 1 ? "" : "s"}`,
          r.lastOrdered
            ? `ordered ${short(r.lastOrdered)} · delivered ${short(r.last)}`
            : r.last ? `delivered ${short(r.last)}` : null]
          .filter(Boolean).join(" · "))),
    r.whatsapp ? el("span", { class: "qty-chip" }, "WhatsApp") : null));

  root.replaceChildren(
    el("div", { class: "card" },
      el("h2", { style: "margin:0 0 2px" }, "Customer list"),
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        `${rows.length} customer${rows.length === 1 ? "" : "s"} · ${withPhone.length} with a WhatsApp number, kept for marketing follow-ups.`),
      el("div", { class: "field" }, el("label", {}, "Sort by"), sortEl),
      el("div", { class: "btn-row" },
        button("Copy numbers", copyNumbers, "primary"),
        button("Download CSV", downloadCsv, "soft"))),
    el("h2", { class: "section" }, "Delivery history"),
    ...cards);
}

function copyText(text, okMsg) {
  const fallback = () => {
    const ta = el("textarea", { style: "position:fixed;left:-9999px" });
    document.body.appendChild(ta);
    ta.value = text;
    ta.select();
    try {
      document.execCommand("copy");
      toast(okMsg);
    } catch {
      toast("Couldn't copy — showing numbers instead");
      prompt("Customer WhatsApp numbers", text);
    }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast(okMsg)).catch(fallback);
  } else {
    fallback();
  }
}
