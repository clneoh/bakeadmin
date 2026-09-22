// ui.js — safe DOM building and shared render helpers.
// el() uses textContent by default so user data can never be injected as HTML.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    // Skip null/undefined AND false: `selected: false` must not become a
    // setAttribute call — "selected" is a boolean attribute, so ANY presence
    // (even ="false") selects the option. Previously every <option> in a
    // select() ended up selected and browsers showed the last one.
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "value") node.value = v;
    else if (k === "checked") node.checked = v;
    else if (k === "selected") node.selected = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function button(text, onClick, cls = "") {
  return el("button", { class: `btn ${cls}`.trim(), onclick: onClick }, text);
}

// The class a picker wears for the value it now holds — "" when it holds
// nothing, or when the choice carries no tone.
function toneClass(options, value) {
  const chosen = options.find((o) => String(o.value) === String(value));
  return chosen && chosen.tone ? `tone-${chosen.tone}` : "";
}

export function select(options, value, onchange, placeholder = "") {
  const s = el("select", {});
  if (placeholder) s.appendChild(el("option", { value: "", disabled: true, selected: !value }, placeholder));

  // Options may name a section (the product picker splits the menu into on the
  // shop / sold out / taken down), and each run of them becomes an <optgroup>.
  // Every platform draws those as their own headed block — the phone's wheel
  // included, which is the one place a page cannot reach. A menu that comes out
  // as a single section is left ungrouped: a lone heading is just noise.
  const groups = new Set(options.map((o) => o.group || ""));
  const sectioned = groups.size > 1;
  let group = "";
  let parent = s;
  for (const o of options) {
    const name = sectioned ? (o.group || "") : "";
    if (name !== group) {
      group = name;
      if (name) {
        parent = el("optgroup", { label: name, class: o.tone ? `tone-${o.tone}` : "" });
        s.appendChild(parent);
      } else {
        parent = s;
      }
    }
    parent.appendChild(el("option", {
      value: o.value, selected: o.value === value, class: o.tone ? `tone-${o.tone}` : "",
    }, o.label));
  }
  // A toned menu is marked so the stylesheet can adopt it where the browser
  // supports a picker a page may draw (see app.css) — and left alone everywhere
  // else, where the native list takes over.
  const toned = options.some((o) => o.tone);
  // The current value is tracked rather than read back off the node, because the
  // first paint happens before a browser has settled which option is selected.
  let current = value;
  const paint = () => {
    // Rebuilt from the classes already there, so a caller's own class (the status
    // filter sets "input") is never thrown away by a repaint.
    const rest = String(s.className || "").split(/\s+/)
      .filter((c) => c && !c.startsWith("tone-") && c !== "toned");
    s.className = [...rest, toned ? "toned" : "", toneClass(options, current)].filter(Boolean).join(" ");
  };
  s.addEventListener("change", () => { current = s.value; paint(); if (onchange) onchange(); });
  paint();
  return s;
}

export function fmtQty(n, unit) {
  const rounded = Math.round((Number(n) || 0) * 1000) / 1000;
  return `${rounded}${unit}`;
}

export function fillMeter(total, capacity) {
  const ratio = capacity > 0 ? total / capacity : 0;
  const exceeded = total > capacity;
  const pct = Math.min(100, Math.max(4, ratio * 100));
  const fill = el("div", { class: `meter-fill${exceeded ? " over" : ""}`, style: `width:${pct}%` });
  return el("div", { class: `meter${exceeded ? " over" : ""}` },
    fill,
    el("span", { class: "meter-label" }, `${total}/${capacity}`));
}

export function badge(status) {
  const map = {
    open: ["Open", "badge-open"],
    closed: ["Closed", "badge-closed"],
    past: ["Past", "badge-past"],
    full: ["Full", "badge-full"],
    over: ["Over", "badge-over"],
  };
  const [label, cls] = map[status] || [String(status), "badge-past"];
  return el("span", { class: `badge ${cls}` }, label);
}

export function emptyState(title, hint) {
  return el("div", { class: "empty" },
    el("p", { class: "empty-icon" }, "🍞"),
    el("h3", {}, title),
    hint ? el("p", { class: "muted" }, hint) : null);
}

export function confirmDialog(message, onYes, { danger = false, yesLabel = "Confirm" } = {}) {
  const layer = document.getElementById("confirm-layer");
  const card = el("div", { class: "confirm-card" },
    el("p", { class: "confirm-text" }, message),
    el("div", { class: "confirm-actions" },
      button("Cancel", () => close(), "ghost"),
      button(yesLabel, () => { close(); onYes(); }, danger ? "danger" : "primary")));
  layer.replaceChildren(card);
  layer.hidden = false;
  function close() {
    layer.hidden = true;
    layer.replaceChildren();
  }
}

// A card opens over the screen it is about, and on a phone it covers the very
// thing she opened it to decide about: the batch clock sits over the bars it
// moves. So a card's own title bar is a handle — every card's, because the head
// is the same strip on all of them, and a card that looked identical but refused
// to move is a difference she would only find by trying it twice.
//
// The position is not remembered. A card is built fresh by showPopup, so the next
// one opens where cards have always opened: the drag is a way to push a card
// aside while she works, not a setting.
//
// The card moves by a transform, which leaves the layer's own layout untouched.
// What keeps that honest is the clamp. A transformed box still counts toward a
// scroller's scrollable overflow, so a card dragged past the edge would hand
// .popup-layer a scroll surface it has never had — and she could then scroll her
// own close button off the top, where no finger reaches it. Holding the whole card
// inside the layer contributes no overflow at all and means no control can ever be
// parked out of reach. On a phone the card is already nearly the full width, so the
// travel she gets is vertical, which is the axis she wants.
function dragByHead(card, head, layer) {
  let dx = 0;
  let dy = 0;
  let start = null;

  const finish = () => {
    // Implicit release would cover it, but every other drag in this app releases
    // explicitly and there is no reason for this one to be the exception.
    if (start) {
      try { head.releasePointerCapture(start.id); } catch { /* already gone */ }
    }
    start = null;
    head.classList.remove("dragging");
  };

  head.addEventListener("pointerdown", (e) => {
    // The close button lives on this strip. A press on it is a press on the
    // button, not on the handle — and it has to stay that way, because a captured
    // pointer would send the button's own click somewhere else. No card in the app
    // puts anything else in its head today; the guard is what keeps that true if
    // one ever does.
    if (e.target && e.target.closest &&
        e.target.closest("button, input, select, textarea, label, a")) return;
    // On a phone a long press on the title raises the selection callout, which
    // fires pointercancel and kills the drag in her hand.
    e.preventDefault();
    const box = layer.getBoundingClientRect();
    const at = card.getBoundingClientRect();
    // `at` already includes whatever an earlier drag left behind, so the card's
    // own untouched corner is that rect less the offset in force. Reading the rect
    // again mid-drag would count the offset twice and the card would run away.
    start = {
      id: e.pointerId, x: e.clientX, y: e.clientY, dx, dy, box,
      left: at.left - dx, top: at.top - dy, width: at.width, height: at.height,
    };
    head.classList.add("dragging");
    // A pointer already gone by the time this runs cannot be captured, and it
    // throws rather than saying so — but the drag works either way, so losing the
    // capture must not lose the drag with it.
    try { head.setPointerCapture(e.pointerId); } catch { /* older engine, or a pointer already gone */ }
  });

  head.addEventListener("pointermove", (e) => {
    if (!start) return;
    const s = start;
    let nx = s.dx + (e.clientX - s.x);
    let ny = s.dy + (e.clientY - s.y);
    // A little air, so a card parked against the edge does not read as cropped by it.
    const air = 6;
    const loX = s.box.left + air - s.left;
    const hiX = s.box.right - s.width - air - s.left;
    const loY = s.box.top + air - s.top;
    const hiY = s.box.bottom - s.height - air - s.top;
    // A card as wide or as tall as the screen has nowhere to go. An inverted range
    // means exactly that, and it is not a fault to clamp away — the clamp stands
    // down and the card sits where the layer puts it.
    if (loX <= hiX) nx = Math.min(Math.max(nx, loX), hiX);
    if (loY <= hiY) ny = Math.min(Math.max(ny, loY), hiY);
    dx = nx;
    dy = ny;
    card.style.transform = `translate(${dx}px, ${dy}px)`;
  });

  head.addEventListener("pointerup", finish);
  head.addEventListener("pointercancel", finish);
}

// A reusable centered pop-up (used for editing an order). Layers over the whole
// screen with a dimmed scrim; `makeBody(refresh, close)` is called to (re)fill
// the scrollable body, so callers re-invoke `refresh()` after changing anything
// that should re-render the form (e.g. adding an item row). Returns close().
export function showPopup(title, makeBody, { wide = false, onTitle = null } = {}) {
  const layer = document.getElementById("popup-layer");
  if (!layer) return () => {};
  const close = () => {
    layer.hidden = true;
    layer.replaceChildren();
  };
  const body = el("div", { class: "popup-body" });
  // Repainting a pop-up replaces the body wholesale, which is fine for a short
  // card but not for one tall enough to scroll: emptying the body drops its scroll
  // to the top, so a repaint while she is working down a long card throws her back
  // to the top of it. Keep where she was reading.
  const refresh = () => {
    const keepTop = body.scrollTop;
    body.replaceChildren(makeBody(refresh, close));
    body.scrollTop = keepTop;
  };
  const titleEl = el("div", { class: "popup-title" }, title);
  // The card's heading is built once and never repainted, which is right for every
  // card whose heading is a name it was opened with. The one card whose heading
  // follows something she is still typing — the person's name — takes the node and
  // rewrites it itself, because there is no other way to reach a heading that lives
  // outside the body the card is free to rebuild.
  if (onTitle) onTitle(titleEl);
  const head = el("div", { class: "popup-head" },
    titleEl,
    button("✕", close, "ghost small"));
  const card = el("div", { class: `popup-card${wide ? " wide" : ""}` }, head, body);
  layer.replaceChildren(card);
  layer.hidden = false;
  dragByHead(card, head, layer);
  refresh();
  return close;
}

export function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = el("div", { class: "toast" });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

// Copy to the clipboard, sharing the app's pattern for "what if it fails":
// fall back to a pop-up with a selectable textarea (never prompt(), which can't
// hold long text on a phone). Toast shows okMsg on success.
export function copyText(text, okMsg = "Copied") {
  const success = () => toast(okMsg);
  const fallback = () => {
    const box = el("textarea", { class: "input", readonly: true, value: String(text),
      style: "width:100%;min-height:160px" });
    showPopup(el("div", { class: "popup-title-row" }, "Copy this"), (refresh, close) =>
      el("div", {},
        el("p", { class: "card-sub", style: "margin:0 0 8px" },
          "Your phone couldn't copy automatically. Long-press the box, select all, then Copy."),
        box,
        el("div", { class: "popup-actions" }, button("Close", close, "primary"))), { wide: true });
  };
  const via = (p) => p.then(success).catch(fallback);
  if (navigator.clipboard) via(navigator.clipboard.writeText(String(text)));
  else fallback();
}
