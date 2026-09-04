// views/products.js — products + recipe (BOM) editor. New products go in the
// always-visible card at the top; tapping Edit opens the same form in a pop-up
// over the screen, exactly like editing an order.

import { el, button, select, emptyState, confirmDialog, showPopup, toast } from "../ui.js";
import { byId, countUnitOptions, fmtRM, newId, save } from "../state.js";
import { costOf, validateRecipeNoCycle } from "../bom.js";
import { maybeSyncStorefront } from "../supabase.js";

export function renderProducts(root, state) {
  renderAll(root, state);
}

function renderAll(root, state) {
  const products = state.products.filter((p) => p.active !== false);
  const inactive = state.products.filter((p) => p.active === false);

  const form = newProductCard(state, root);

  const cards = products.map((p) => productCard(state, p, root));
  const inactiveSection = inactive.length ? el("div", {},
    el("h2", { class: "section" }, "Hidden products"),
    ...inactive.map((p) => productCard(state, p, root))) : [];

  root.replaceChildren(
    form,
    el("h2", { class: "section" }, `Products (${products.length})`),
    ...(cards.length ? cards : [emptyState("No products yet",
      "Add a product and its recipe (ingredients per unit).")]),
    ...(Array.isArray(inactiveSection) ? [] : [inactiveSection]));
}

// Builds the fields + recipe lines once and hands back the nodes plus `collect()`
// (reads the current values). `product` is null for a new product, or the real
// object when editing — so the add card and the Edit pop-up share one builder.
function buildEditor(state, product) {
  const recipeDraft = (product && product.recipe ? product.recipe : []).map((l) => ({ ...l }));

  const name = el("input", { class: "input", placeholder: "e.g. Focaccia", value: product?.name || "" });
  const unitChoices = countUnitOptions(state, product);
  const unit = select(unitChoices.options, unitChoices.value, null, "Pick a unit…");
  const price = el("input", { class: "input", type: "number", inputmode: "decimal", step: "0.01",
    placeholder: "sell price (RM, optional)", value: product?.price ?? "" });
  const limit = el("input", { class: "input", type: "number", inputmode: "numeric", min: "1",
    placeholder: "e.g. 12", value: product?.limit ?? "",
    title: "Max units of this product per delivery day. Limits are added together for the day's availability (e.g. 12 focaccia + 12 sandwiches = 24). Leave blank for no limit." });

  // Optional per-product date rules — customers can't order this product for a
  // delivery date it isn't open for. Orders close N days before delivery, and /
  // or a fixed from–to window of delivery dates. Both optional and per product:
  // blank means the product sells on any open date.
  const closeDays = el("input", { class: "input", type: "number", inputmode: "numeric", min: "0",
    placeholder: "e.g. 14", value: product?.closeDays ?? "",
    title: "Customers must pick a delivery date at least this many days away. Blank = any open day. 0 = no early close." });
  const validFrom = el("input", { class: "input", type: "date", value: product?.validFrom || "" });
  const validTo = el("input", { class: "input", type: "date", value: product?.validTo || "" });

  // Cost of one unit from the current draft, expanding any product lines
  // (a set's cost compounds its component's cost into it).
  function perUnitCost() {
    return costOf(state, { id: product && product.id, name: product && product.name, recipe: recipeDraft });
  }

  const costEl = el("p", { class: "card-sub", style: "margin:0 0 10px" });
  const recipeCard = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 4px" }, "Recipe (per unit)"),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "Type the ingredients… or pick another product to make a set (e.g. 4 × Focaccia) — its own recipe is used automatically."),
    costEl,
    el("div", { id: "recipe-lines" }),
    el("div", { class: "btn-row" },
      button("＋ Add ingredient", () => {
        recipeDraft.push({ ingredientId: "", qty: "", unit: "" });
        renderRecipeLines();
      }, "soft"),
      button("＋ Add product", () => {
        recipeDraft.push({ productId: "", qty: "", unit: "" });
        renderRecipeLines();
      }, "soft")));

  function renderRecipeLines() {
    costEl.textContent = `Est. ingredient cost / unit: ${fmtRM(perUnitCost(), state.settings.currency)}`;
    const box = recipeCard.querySelector("#recipe-lines");
    box.replaceChildren(...recipeDraft.map((line, i) =>
      recipeLine(state, line, i, recipeDraft, renderRecipeLines, product && product.id)));
  }

  // Reads the form; returns { error } or { values: {...} } ready to save.
  function collect() {
    const pname = name.value.trim();
    if (!pname) return { error: "Product needs a name" };
    const unitVal = unit.value.trim();
    if (!unitVal) {
      return { error: "Pick the selling unit — customers see it after the price. Add new ones under More → Units first." };
    }
    const chosenUom = byId(state.uoms, unitVal);
    const recipe = [];
    for (const l of recipeDraft) {
      const qty = Number(l.qty) || 0;
      if (!(qty > 0)) continue; // empty rows and 0-qty rows are dropped, like ingredients before
      if (l.productId && !l.ingredientId) {
        recipe.push({ productId: l.productId, qty, unit: (l.unit || "").trim() });
      } else if (l.ingredientId) {
        recipe.push({ ingredientId: l.ingredientId, qty, unit: (l.unit || "g").trim() });
      }
    }
    const cycle = validateRecipeNoCycle(state, { id: product && product.id, name: pname, recipe });
    if (cycle) return { error: cycle };
    const limitVal = limit.value === "" ? undefined : Math.max(1, Number(limit.value));
    let closeVal;
    if (closeDays.value !== "") {
      const raw = Number(closeDays.value);
      if (!Number.isFinite(raw)) return { error: "Closes days must be a number" };
      closeVal = Math.floor(raw);
      if (closeVal < 0) return { error: "Closes days must be 0 or more" };
    }
    const vf = validFrom.value || undefined;
    const vt = validTo.value || undefined;
    if (vf && vt && vf > vt) return { error: "The \"from\" date is after the \"to\" date — swap them" };
    return {
      values: {
        name: pname,
        unit: chosenUom ? chosenUom.name : unitVal,
        uomId: chosenUom ? chosenUom.id : undefined,
        price: price.value === "" ? undefined : Number(price.value),
        limit: limitVal,
        closeDays: closeVal,
        validFrom: vf,
        validTo: vt,
        recipe,
      },
    };
  }

  return { name, unit, price, limit, closeDays, validFrom, validTo, recipeCard, renderRecipeLines, collect };
}

// The common field layout under whichever shell (card or pop-up) hosts it.
function editorFields(state, editor) {
  return el("div", {},
    el("div", { class: "form-grid" },
      el("div", {}, el("label", {}, "Name"), editor.name),
      el("div", {}, el("label", {}, "Unit"), editor.unit)),
    el("div", { class: "field" }, el("label", {}, "Sell price"), editor.price),
    el("div", { class: "field" }, el("label", {}, "Daily limit (optional)"),
      el("p", { class: "card-sub", style: "margin:0 0 5px" },
        "Max units per delivery day. Limits add up for availability — 12 focaccia + 12 sandwiches = 24 left."),
      editor.limit),
    el("div", { class: "field" }, el("label", {}, "Orders close (days before delivery)"),
      el("p", { class: "card-sub", style: "margin:0 0 5px" },
        "Customers must pick a delivery date at least this many days away. Blank or 0 = any open day."),
      editor.closeDays),
    el("div", { class: "field" }, el("label", {}, "Available for delivery dates"),
      el("p", { class: "card-sub", style: "margin:0 0 5px" },
        "Only sell this product on delivery dates inside this range (e.g. a seasonal item). Leave both empty for every open day."),
      el("div", { class: "form-grid" },
        el("div", {}, el("label", {}, "From"), editor.validFrom),
        el("div", {}, el("label", {}, "To"), editor.validTo))),
    editor.recipeCard);
}

// The always-visible "New product" card at the top (the add form stays put even
// while an Edit pop-up is open, like "+ New order" does under the order pop-up).
function newProductCard(state, root) {
  const editor = buildEditor(state, null);
  const card = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 10px" }, "New product"),
    editorFields(state, editor),
    button("Add product", () => {
      const { error, values } = editor.collect();
      if (error) return toast(error);
      state.products.push({ id: newId("prd"), ...values, active: true });
      toast("Product added");
      save(state);
      maybeSyncStorefront(state); // the storefront menu is the product list — keep it live
      renderAll(root, state);
    }, "block primary"));

  editor.renderRecipeLines();
  return card;
}

// Tap "Edit" on a product: the same form opens over the screen, saves in place,
// then closes. Mirrors how Orders edits a row.
function openEditProductPopup(state, product, root) {
  const editor = buildEditor(state, product);
  showPopup(el("div", { class: "popup-title-row" }, "Edit product"), (refresh, close) => {
    const body = el("div", {},
      editorFields(state, editor),
      el("div", { class: "popup-actions" },
        button("Cancel", close, "ghost"),
        button("Update product", () => {
          const { error, values } = editor.collect();
          if (error) return toast(error);
          Object.assign(product, values);
          toast("Product updated");
          save(state);
          maybeSyncStorefront(state); // the storefront menu is the product list — keep it live
          close();
          renderAll(root, state);
        }, "primary")));
    editor.renderRecipeLines();
    return body;
  }, { wide: true });
}

function recipeLine(state, line, i, draft, refresh, selfId) {
  // A line is a component (another product, i.e. a set) when it carries a
  // productId field (even before one is chosen). Ingredient and product rows
  // are different drop-downs.
  const isProductRow = Object.prototype.hasOwnProperty.call(line, "productId") && !line.ingredientId;
  if (isProductRow) {
    return productRecipeLine(state, line, i, draft, refresh, selfId);
  }

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
    button("✕", () => { draft.splice(i, 1); refresh(); }, "ghost small"),
    mismatch ? el("div", { class: "warn", style: "grid-column:1/-1;margin:0" },
      `Unit "${line.unit}" differs from ${ing.name}'s unit (${ing.unit}) — check this line.`) : null);
}

function productRecipeLine(state, line, i, draft, refresh, selfId) {
  // Drop-down of every other product (hidden ones stay selectable so old sets
  // keep working). The product being edited is excluded — a set can't hold
  // itself, and validateRecipeNoCycle is the backstop.
  let prodOpts = state.products
    .filter((p) => p.id !== selfId && p.active !== false)
    .map((p) => ({ value: p.id, label: p.name }));
  if (line.productId && !prodOpts.some((o) => o.value === line.productId)) {
    const hidden = byId(state.products, line.productId);
    if (hidden) prodOpts = [...prodOpts, { value: hidden.id, label: `${hidden.name} (hidden)` }];
  }
  const prodSel = select(prodOpts, line.productId,
    () => {
      line.productId = prodSel.value;
      const chosen = byId(state.products, line.productId);
      line.unit = chosen ? (chosen.unit || "") : "";
      refresh();
    }, "Product…");

  const qty = el("input", { class: "input", type: "number", inputmode: "numeric", step: "any", min: "1",
    value: line.qty, style: "min-height:38px",
    onchange: () => { line.qty = Number(qty.value); refresh(); } });
  // The unit comes from the chosen product and is read-only — a set counts
  // whole copies of the component, and its recipe defines the rest.
  const unitInp = el("input", { class: "input", placeholder: "unit", value: line.unit,
    style: "min-height:38px", readonly: true, title: "Selling unit of the chosen product" });

  return el("div", { class: "ing-row" },
    prodSel,
    qty,
    el("span", { class: "unit" }, unitInp),
    button("✕", () => { draft.splice(i, 1); refresh(); }, "ghost small"));
}

function productCard(state, p, root) {
  const cost = costOf(state, p);
  const usedBy = state.orders.some((o) => o.productId === p.id);
  const usedInSets = state.products
    .filter((q) => q !== p && (q.recipe || []).some((l) => l.productId === p.id))
    .map((q) => q.name);
  const protect = usedBy || usedInSets.length > 0;

  const subParts = [p.unit, p.limit ? `${p.limit}/day` : null,
    p.price != null ? `${fmtRM(p.price, state.settings.currency)} sell` : null,
    `${fmtRM(cost, state.settings.currency)} / unit`].filter(Boolean);
  const lines = (p.recipe || []).map((l) => {
    if (l.productId && !l.ingredientId) {
      const comp = byId(state.products, l.productId);
      return `${l.qty} × ${comp ? comp.name : "(deleted)"}`;
    }
    const ing = byId(state.ingredients, l.ingredientId);
    return `${l.qty}${l.unit} ${ing ? ing.name : "(deleted)"}`;
  });

  return el("div", { class: "card" },
    el("div", { class: "card-row" },
      el("div", { style: "min-width:0" },
        el("p", { class: "card-title" }, p.name),
        el("p", { class: "card-sub" }, subParts.join(" · ")),
        usedInSets.length
          ? el("p", { class: "po-breakdown" }, `Used in: ${usedInSets.map((n) => `"${n}"`).join(", ")}`)
          : null),
      el("div", { class: "li-right" },
        button("Edit", () => openEditProductPopup(state, p, root), "ghost small"),
        p.active === false
          ? button("Unhide", () => {
              p.active = true;
              save(state);
              maybeSyncStorefront(state); // the storefront menu is the product list — keep it live
              toast(`"${p.name}" back on the menu`);
              renderAll(root, state);
            }, "ghost small")
          : button(protect ? "Hide" : "Delete",
              () => deleteProduct(state, p, usedBy, usedInSets, root), "ghost small"))),
    lines.length ? el("p", { class: "po-breakdown" }, lines.join("  ·  ")) : null);
}

function deleteProduct(state, p, usedBy, usedInSets, root) {
  const protect = usedBy || usedInSets.length > 0;
  const msg = usedBy
    ? `"${p.name}" has orders on it, so it can't be deleted. Hide it instead — history is kept and the PO still lists it.`
    : usedInSets.length
      ? `"${p.name}" is used to make ${usedInSets.map((n) => `"${n}"`).join(" and ")}. Hide it instead — the sets and PO will still use it.`
      : `Delete "${p.name}"? Its recipe will be removed.`;
  confirmDialog(msg, () => {
    if (protect) {
      p.active = false;
      toast("Product hidden");
    } else {
      state.products = state.products.filter((x) => x.id !== p.id);
      toast("Product deleted");
    }
    save(state);
    maybeSyncStorefront(state); // keep the storefront menu in sync
    renderAll(root, state);
  }, protect ? { yesLabel: "Hide it" } : { danger: true, yesLabel: "Delete" });
}
