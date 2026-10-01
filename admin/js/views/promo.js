// views/promo.js — the promo codes she hands out.
//
// THE PROMO CODE SCREEN (v269). One card makes a code; one row per code after
// that. Every rule the code carries — who, when, how big a basket, how often,
// what it cannot sit beside — lives in the record and is judged by the ONE engine
// in js/promo.js, which the shop imports too. This screen never decides whether a
// code is good; it only writes codes down and words the engine's answers.
//
// Same shape as Parcel couriers / Suppliers / Units: an always-on "New code"
// card, each row with Edit, one pop-up shared by both.
//
// What this screen offers is deliberately narrower than what a code can carry.
// This first slice makes a code that gives an amount off, or a percentage, or
// free delivery, and decides whether the shop may advertise it. The other rule
// families are already in the record at their no-opinion defaults; the screens
// for them arrive in their own slices.

import { el, button, emptyState, confirmDialog, showPopup, toast } from "../ui.js";
import { fmtRM, newId, save } from "../state.js";
import { todayISO } from "../dates.js";
import { maybeSyncStorefront } from "../supabase.js";
import { blankCode, codeProblem, normalizeCode, offerOf } from "../promo.js";

export function renderPromoCodes(root, state) {
  renderAll(root, state);
}

function renderAll(root, state) {
  const list = state.promoCodes || [];
  const rows = list.length
    ? list.map((c) => codeCard(state, c, root))
    : [emptyState("No codes yet",
      "Make one, print it on a card, and a customer types it into the shop. The page will not take the money off — it tells you the code so you can take it off yourself in WhatsApp, the same as the bring-a-friend credit.")];
  root.replaceChildren(
    newCodeCard(state, root),
    el("h2", { class: "section" }, `Promo codes (${list.length})`),
    ...rows);
}

// A code as she typed it, cleaned the one way the engine recognises it: no stray
// spaces, no case to argue about. Shown back to her as the customer will type it.
function tidy(t) {
  return String(t || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

// The offer in words, and the smallest basket it will work on. English, here,
// because this screen is hers — the shop composes the same offer from the same
// parts in the customer's own language (see store-lang.js).
function offerWords(code) {
  const o = offerOf(code);
  if (o.kind === "delivery") return "Free delivery";
  if (o.kind === "pct") return `${o.value}% off${o.cap > 0 ? `, up to ${fmtRM(o.cap)}` : ""}`;
  return `${fmtRM(o.value)} off`;
}

function clauseWords(code) {
  const min = code.basket.type === "amount" ? Number(code.basket.amount) : 0;
  return min > 0 ? `${offerWords(code)} on ${fmtRM(min)} and above` : offerWords(code);
}

function codeProblemWords(p) {
  if (!p) return "";
  switch (p.fail) {
    case "empty": return "Give the code a name the customer can type.";
    case "shape": return `"${p.code}" cannot be a code. Use 3 to 16 letters and numbers, so it reads easily off a card.`;
    case "noAmount": return "Say how much comes off.";
    case "noPercent": return "Say what percentage comes off.";
    case "percentTooBig": return "A percentage has to be under 100.";
    case "datesBackwards": return "The end date is before the start date.";
    case "dupe": return `${p.code} is already a code. Two codes cannot share a name.`;
    default: return "That code cannot be saved as it stands.";
  }
}

function buildCodeEditor(state, code) {
  const name = el("input", {
    class: "input", placeholder: "e.g. FRESH10", autocapitalize: "characters",
    value: code ? code.code : "",
  });
  const kind = el("select", { class: "input" },
    el("option", { value: "rm", selected: !code || code.gives.type === "rm" }, "Ringgit off"),
    el("option", { value: "pct", selected: !!code && code.gives.type === "pct" }, "Percent off"),
    el("option", { value: "delivery", selected: !!code && code.gives.type === "delivery" }, "Free delivery"));
  const value = el("input", {
    class: "input", type: "number", min: "0", step: "0.01", inputmode: "decimal",
    value: code && code.gives.value ? String(code.gives.value) : "",
  });
  const cap = el("input", {
    class: "input", type: "number", min: "0", step: "0.01", inputmode: "decimal",
    value: code && code.gives.cap ? String(code.gives.cap) : "",
  });
  const vis = el("select", { class: "input" },
    el("option", { value: "public", selected: !code || code.vis === "public" }, "Public — shown in the shop"),
    el("option", { value: "personal", selected: !!code && code.vis === "personal" }, "Personal — never shown"));

  // The two boxes that only matter for one kind of offer. Kept in place and
  // simply hidden, so switching kind back and forth never loses what she typed.
  const valueField = el("div", { class: "field" }, el("label", {}, "How much comes off"), value);
  const capField = el("div", { class: "field" },
    el("label", {}, "Most it can ever come to (optional)"), cap,
    el("p", { class: "hint" }, "A percentage with no most-it-can-come-to has no limit at all. Fill this in and the offer can never cost more than this."));

  function paintFields() {
    const k = kind.value;
    valueField.hidden = k === "delivery";
    valueField.querySelector("label").textContent = k === "pct" ? "What percentage comes off" : "How much comes off";
    capField.hidden = k !== "pct";
  }
  kind.addEventListener("change", paintFields);
  paintFields();

  function collect() {
    const rec = code ? { ...code } : { id: newId("promo"), ...blankCode(), when: { from: todayISO(), to: "" } };
    rec.code = tidy(name.value);
    rec.gives = { type: kind.value, value: Number(value.value) || 0, cap: Number(cap.value) || 0 };
    rec.vis = vis.value;
    const problem = codeProblem(state.promoCodes, rec, code ? code.id : "");
    return problem ? { error: codeProblemWords(problem) } : { record: normalizeCode({ ...rec, id: rec.id }) };
  }

  return { name, kind, value, cap, vis, valueField, capField, collect };
}

function editorFields(editor) {
  return [
    el("div", { class: "field" }, el("label", {}, "Code"), editor.name,
      el("p", { class: "hint" }, "What the customer types. Letters and numbers only, so it reads easily off a card — FRESH10, not FRESH 10.")),
    el("div", { class: "field" }, el("label", {}, "What it gives"), editor.kind),
    el("div", { class: "form-grid" }, editor.valueField, editor.capField),
    el("div", { class: "field" }, el("label", {}, "Who can see it"), editor.vis,
      el("p", { class: "hint" }, "Public codes are put on the shop page for everyone. Personal codes are never advertised — you give the code to one person — but they still work when typed, and anyone who reads the page's own data can see them, so the limit is that they are never shown, not that they are secret.")),
  ];
}

function commit(state, root, message) {
  save(state);            // her phones: the code rows
  maybeSyncStorefront(state); // the shop: the published list the page reads
  toast(message);
  renderAll(root, state);
}

function newCodeCard(state, root) {
  const editor = buildCodeEditor(state, null);
  return el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, "New code"),
    ...editorFields(editor),
    button("Add code", () => {
      const { error, record } = editor.collect();
      if (error) return toast(error);
      state.promoCodes.push(record);
      commit(state, root, `${record.code} added`);
    }, "block primary"));
}

function openEditCodePopup(state, code, root) {
  const editor = buildCodeEditor(state, code);
  showPopup(el("div", { class: "popup-title-row" }, `Edit ${code.code}`), (refresh, close) => {
    return el("div", {},
      ...editorFields(editor),
      el("p", { class: "hint" },
        "Changing what a code gives does not change an order that already used it. Every order keeps the code as it was written when the customer typed it."),
      el("div", { class: "popup-actions" },
        button("Cancel", close, "ghost"),
        button("Update code", () => {
          const { error, record } = editor.collect();
          if (error) return toast(error);
          Object.assign(code, record);
          close();
          commit(state, root, `${code.code} updated`);
        }, "primary")));
  }, { wide: true });
}

// How many orders her own app has seen carrying this code. Read straight off the
// orders rather than kept as a tally on the code, so it can never drift: the
// moment an order is imported from the shop, or deleted, the number is right.
function usedCount(state, code) {
  return (state.orders || []).filter((o) => o && tidy(o.promo) === code.code).length;
}

function codeCard(state, code, root) {
  const used = usedCount(state, code);
  const c = normalizeCode(code);
  return el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("div", { style: "min-width:0" },
        el("p", { class: "card-title" }, c.code),
        el("p", { class: "card-sub" },
          [clauseWords(c),
            c.vis === "personal" ? "personal — never shown" : "public — shown in the shop",
            used ? `${used} order${used === 1 ? "" : "s"}` : "not used yet"]
            .filter(Boolean).join(" · "))),
      el("div", { class: "li-right" },
        button("Edit", () => openEditCodePopup(state, code, root), "ghost small"),
        button("Delete", () => deleteCode(state, code, root, used), "ghost small"))));
}

function deleteCode(state, code, root, used) {
  // Deleting is allowed even when orders carry the code, and that is safe rather
  // than careless: the code was written onto each order when the shop sent it, so
  // those orders keep reading correctly and keep showing her what she owes. What
  // deleting really does is stop the shop accepting it.
  confirmDialog(used
    ? `Delete code "${code.code}"? ${used} order${used === 1 ? " carries" : "s carry"} it — those keep it, and you still owe them what you promised. The shop stops accepting the code.`
    : `Delete code "${code.code}"? The shop stops accepting it.`,
  () => {
    state.promoCodes = (state.promoCodes || []).filter((c) => c.id !== code.id);
    commit(state, root, `${code.code} deleted`);
  }, { danger: true, yesLabel: "Delete" });
}
