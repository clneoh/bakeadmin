// views/products.js — products + inline recipe (BOM) editor.

import { el, button, select, emptyState, confirmDialog, toast } from "../ui.js";
import { byId, fmtRM, newId, round2, save } from "../state.js";
import { maybeSyncStorefront } from "../supabase.js";

let editingProductId = null;
let recipeDraft = [];

export function renderProducts(root, state) {
  editingProductId = null;
  recipeDraft = [];
  renderAll(root, state);
}

function renderAll(root, state) {
  const products = state.products.filter((p) => p.active !== false);
  const inactive = state.products.filter((p) => p.active === false);

  const form = productForm(state, root);

  const cards = products.map((p) => productCard(state, p, root));
  const inactiveCard = inactive.length ? el("div", {},
    el("h2", { class: "section" }, "Hidden products"),
    ...inactive.map((p) => productCard(state, p, root))) : null;

  root.replaceChildren(
    form,
    el("h2", { class: "section" }, `Products (${products.length})`),
    ...(cards.length ? cards : [emptyState("No products yet",
      "Add a product and its recipe (ingredients per unit).")]),
    inactiveCard);
}

function productForm(state, root) {
  const editing = editingProductId ? byId(state.products, editingProductId) : null;

  const name = el("input", { class: "input", placeholder: "e.g. Focaccia", value: editing?.name || "" });
  const unit = el("input", { class: "input", placeholder: "unit, e.g. loaf", value: editing?.unit || "" });
  const price = el("input", { class: "input", type: "number", inputmode: "decimal", step: "0.01",
    placeholder: "sell price (RM, optional)", value: editing?.price ?? "" });
  const limit = el("input", { class: "input", type: "number", inputmode: "numeric", min: "1",
    placeholder: "e.g. 12", value: editing?.limit ?? "",
    title: "Max units of this product per delivery day. Limits are added together for the day's availability (e.g. 12 focaccia + 12 sandwiches = 24). Leave blank for no limit." });

  if (editing && !recipeDraft.length) {
    recipeDraft = (editing.recipe || []).map((l) => ({ ...l }));
  }

  function perUnitCost() {
    return round2(recipeDraft.reduce((s, l) => {
      const ing = byId(state.ingredients, l.ingredientId);
      return s + (Number(l.qty) || 0) * (ing?.costPerUnit || 0);
    }, 0));
  }

  const costEl = el("p", { class: "card-sub", style: "margin:0 0 10px" });
  const recipeCard = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 4px" }, "Recipe (ingredients per unit)"),
    costEl,
    el("div", { id: "recipe-lines" }),
    button("＋ Add ingredient", () => {
      recipeDraft.push({ ingredientId: "", qty: "", unit: "" });
      renderRecipeLines();
    }, "soft block"));

  function renderRecipeLines() {
    costEl.textContent = `Est. ingredient cost / unit: ${fmtRM(perUnitCost(), state.settings.currency)}`;
    const box = recipeCard.querySelector("#recipe-lines");
    box.replaceChildren(...recipeDraft.map((line, i) => recipeLine(state, line, i, renderRecipeLines)));
  }

  function saveProduct() {
    const pname = name.value.trim();
    if (!pname) return toast("Product needs a name");
    const recipe = recipeDraft
      .filter((l) => l.ingredientId && (Number(l.qty) || 0) > 0)
      .map((l) => ({ ingredientId: l.ingredientId, qty: Number(l.qty), unit: l.unit.trim() || "g" }));

    const limitVal = limit.value === "" ? undefined : Math.max(1, Number(limit.value));

    if (editing) {
      Object.assign(editing, {
        name: pname,
        unit: unit.value.trim() || "unit",
        price: price.value === "" ? undefined : Number(price.value),
        limit: limitVal,
        recipe,
      });
      toast("Product updated");
    } else {
      state.products.push({
        id: newId("prd"),
        name: pname,
        unit: unit.value.trim() || "unit",
        price: price.value === "" ? undefined : Number(price.value),
        limit: limitVal,
        active: true,
        recipe,
      });
      toast("Product added");
    }
    save(state);
    maybeSyncStorefront(state); // the storefront menu is the product list — keep it live
    editingProductId = null;
    recipeDraft = [];
    renderAll(root, state);
  }

  const card = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, editing ? "Edit product" : "New product"),
    el("div", { class: "form-grid" },
      el("div", {}, el("label", {}, "Name"), name),
      el("div", {}, el("label", {}, "Unit"), unit)),
    el("div", { class: "field" }, el("label", {}, "Sell price"), price),
    el("div", { class: "field" }, el("label", {}, "Daily limit (optional)"),
      el("p", { class: "card-sub", style: "margin:0 0 5px" },
        "Max units per delivery day. Limits add up for availability — 12 focaccia + 12 sandwiches = 24 left."),
      limit),
    recipeCard,
    button(editing ? "Update product" : "Add product", saveProduct, "block primary"),
    editing ? el("div", { style: "margin-top:8px" },
      button("Cancel", () => { editingProductId = null; recipeDraft = []; renderAll(root, state); }, "ghost block")) : null);

  renderRecipeLines();
  return card;
}

function recipeLine(state, line, i, refresh) {
  const ing = byId(state.ingredients, line.ingredientId);
  const mismatch = ing && line.unit && ing.unit && line.unit !== ing.unit;

  let ingOpts = state.ingredients.filter((x) => x.active !== false)
    .map((x) => ({ value: x.id, label: x.name }));
  if (line.ingredientId && !ingOpts.some((o) => o.value === line.ingredientId)) {
    const hidden = byId(state.ingredients, line.ingredientId);
    if (hidden) ingOpts = [...ingOpts, { value: hidden.id, label: `${hidden.name} (hidden)` }];
  }
  const ingSel = select(ingOpts, line.ingredientId,
    () => {
      line.ingredientId = ingSel.value;
      const chosen = byId(state.ingredients, line.ingredientId);
      if (chosen && !line.unit) line.unit = chosen.unit;
      refresh();
    }, "Ingredient…");

  const qty = el("input", { class: "input", type: "number", inputmode: "decimal", step: "any",
    value: line.qty, style: "min-height:38px",
    onchange: () => { line.qty = Number(qty.value); refresh(); } });
  const unitInp = el("input", { class: "input", placeholder: "unit", value: line.unit,
    style: "min-height:38px", onchange: () => { line.unit = unitInp.value.trim(); refresh(); } });

  return el("div", { class: "ing-row" },
    ingSel,
    qty,
    el("span", { class: "unit" }, unitInp),
    button("✕", () => { recipeDraft.splice(i, 1); refresh(); }, "ghost small"),
    mismatch ? el("div", { class: "warn", style: "grid-column:1/-1;margin:0" },
      `Unit "${line.unit}" differs from ${ing.name}'s unit (${ing.unit}) — check this line.`) : null);
}

function productCard(state, p, root) {
  const cost = round2((p.recipe || []).reduce((s, l) => {
    const ing = byId(state.ingredients, l.ingredientId);
    return s + (Number(l.qty) || 0) * (ing?.costPerUnit || 0);
  }, 0));
  const usedBy = state.orders.some((o) => o.productId === p.id);

  const subParts = [p.unit, p.limit ? `${p.limit}/day` : null,
    p.price != null ? `${fmtRM(p.price, state.settings.currency)} sell` : null,
    `${fmtRM(cost, state.settings.currency)} / unit`].filter(Boolean);
  const lines = (p.recipe || []).map((l) => {
    const ing = byId(state.ingredients, l.ingredientId);
    return `${l.qty}${l.unit} ${ing ? ing.name : "(deleted)"}`;
  });

  return el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("div", { style: "min-width:0" },
        el("p", { class: "card-title" }, p.name),
        el("p", { class: "card-sub" }, subParts.join(" · "))),
      el("div", { class: "li-right" },
        button("Edit", () => { editingProductId = p.id; recipeDraft = []; renderAll(root, state); }, "ghost small"),
        p.active === false
          ? button("Unhide", () => {
              p.active = true;
              save(state);
              maybeSyncStorefront(state); // the storefront menu is the product list — keep it live
              toast(`"${p.name}" back on the menu`);
              renderAll(root, state);
            }, "ghost small")
          : button(usedBy ? "Hide" : "Delete",
              () => deleteProduct(state, p, usedBy, root), "ghost small"))),
    lines.length ? el("p", { class: "po-breakdown" }, lines.join("  ·  ")) : null);
}

function deleteProduct(state, p, usedBy, root) {
  const msg = usedBy
    ? `"${p.name}" has orders on it, so it can't be deleted. Hide it instead — it will stop appearing in new orders but history is kept.`
    : `Delete "${p.name}"? Its recipe will be removed.`;
  confirmDialog(msg, () => {
    if (usedBy) {
      p.active = false;
    } else {
      state.products = state.products.filter((x) => x.id !== p.id);
      recipeDraft = [];
    }
    save(state);
    maybeSyncStorefront(state); // keep the storefront menu in sync
    editingProductId = null;
    toast(usedBy ? "Product hidden" : "Product deleted");
    renderAll(root, state);
  }, usedBy ? { yesLabel: "Hide it" } : { danger: true, yesLabel: "Delete" });
}
