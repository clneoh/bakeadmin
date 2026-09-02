// views/ingredients.js — ingredient master: unit + cost per unit.

import { el, button, emptyState, confirmDialog, toast } from "../ui.js";
import { byId, fmtRM, newId, save } from "../state.js";

let editingIngredientId = null;

export function renderIngredients(root, state) {
  editingIngredientId = null;
  renderAll(root, state);
}

function renderAll(root, state) {
  const items = state.ingredients.filter((x) => x.active !== false);
  const hidden = state.ingredients.filter((x) => x.active === false);

  const form = ingredientForm(state, root);

  const cards = items.map((ing) => ingredientCard(state, ing, root));
  const hiddenCard = hidden.length ? el("div", {},
    el("h2", { class: "section" }, "Hidden ingredients"),
    ...hidden.map((ing) => ingredientCard(state, ing, root))) : null;

  root.replaceChildren(
    form,
    el("h2", { class: "section" }, `Ingredients (${items.length})`),
    ...(cards.length ? cards : [emptyState("No ingredients yet",
      "Add every ingredient with its unit and cost per unit.")]),
    hiddenCard);
}

function ingredientForm(state, root) {
  const editing = editingIngredientId ? byId(state.ingredients, editingIngredientId) : null;

  const name = el("input", { class: "input", placeholder: "e.g. Strong flour", value: editing?.name || "" });
  const unit = el("input", { class: "input", placeholder: "unit, e.g. g", value: editing?.unit || "" });
  const cost = el("input", { class: "input", type: "number", inputmode: "decimal", step: "0.001",
    placeholder: "cost per unit (RM)", value: editing?.costPerUnit ?? "" });
  const note = el("input", { class: "input", placeholder: "e.g. RM25 / 4kg bag, Mydin (optional)",
    value: editing?.purchaseNote || "" });

  function saveIng() {
    const n = name.value.trim();
    if (!n) return toast("Ingredient needs a name");
    if (editing) {
      Object.assign(editing, {
        name: n,
        unit: unit.value.trim() || "g",
        costPerUnit: Number(cost.value) || 0,
        purchaseNote: note.value.trim() || undefined,
      });
      toast("Ingredient updated");
    } else {
      state.ingredients.push({
        id: newId("ing"),
        name: n,
        unit: unit.value.trim() || "g",
        costPerUnit: Number(cost.value) || 0,
        purchaseNote: note.value.trim() || undefined,
        active: true,
      });
      toast("Ingredient added");
    }
    save(state);
    editingIngredientId = null;
    renderAll(root, state);
  }

  return el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, editing ? "Edit ingredient" : "New ingredient"),
    el("div", { class: "form-grid" },
      el("div", {}, el("label", {}, "Name"), name),
      el("div", {}, el("label", {}, "Unit"), unit)),
    el("div", { class: "field" },
      el("label", {}, "Cost per unit (RM)"),
      cost,
      el("p", { class: "hint" }, "e.g. 0.006 RM per gram — the app uses this to cost the PO.")),
    el("div", { class: "field" }, el("label", {}, "Purchase note"), note),
    button(editing ? "Update ingredient" : "Add ingredient", saveIng, "block primary"),
    editing ? el("div", { style: "margin-top:8px" },
      button("Cancel", () => { editingIngredientId = null; renderAll(root, state); }, "ghost block")) : null);
}

function ingredientCard(state, ing, root) {
  const usedBy = state.products
    .filter((p) => (p.recipe || []).some((l) => l.ingredientId === ing.id))
    .map((p) => p.name);

  const perDisplay = ing.unit
    ? `${fmtRM(ing.costPerUnit, state.settings.currency)} / ${ing.unit}`
    : fmtRM(ing.costPerUnit, state.settings.currency);

  return el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("div", { style: "min-width:0" },
        el("p", { class: "card-title" }, ing.name),
        el("p", { class: "card-sub" },
          [perDisplay, ing.purchaseNote].filter(Boolean).join(" · ")),
        usedBy.length ? el("p", { class: "po-breakdown" }, `Used in: ${usedBy.join(", ")}`) : null),
      el("div", { class: "li-right" },
        button("Edit", () => { editingIngredientId = ing.id; renderAll(root, state); }, "ghost small"),
        button(usedBy.length ? "Hide" : "Delete", () => deleteIngredient(state, ing, usedBy.length > 0, root), "ghost small"))));
}

function deleteIngredient(state, ing, referenced, root) {
  const msg = referenced
    ? `"${ing.name}" is used in a recipe, so it can't be deleted. Hide it instead — the PO will still list it.`
    : `Delete "${ing.name}"?`;
  confirmDialog(msg, () => {
    if (referenced) {
      ing.active = false;
      toast("Ingredient hidden");
    } else {
      state.ingredients = state.ingredients.filter((x) => x.id !== ing.id);
      toast("Ingredient deleted");
    }
    save(state);
    editingIngredientId = null;
    renderAll(root, state);
  }, referenced ? { yesLabel: "Hide it" } : { danger: true, yesLabel: "Delete" });
}
