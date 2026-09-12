// suggest.js — accept a field's greyed suggestion with the right-arrow key.
//
// A field opts in by carrying data-suggest="<the value to insert>" next to the
// placeholder that shows it greyed on screen. Pressing → on an empty field (or
// tapping the small arrow drawn at its right edge, for a phone with no arrow
// key) puts the suggestion in as the value, exactly as if it had been typed:
// bubbling input + change events fire, so the view's own handlers run.
//
// Deliberately opt-in, never guessed from the placeholder text. The same greyed
// slot elsewhere carries instructions ("4 digits", "app login password",
// "https://xxxx.supabase.co") — accepting one of those would drop nonsense into
// the app, so only fields that really have a recommendation are marked.

// The value a field would accept, or "" when it has none to offer. Only an
// empty, enabled field offers it: a field with text is the baker's own.
function suggestionValue(field) {
  if (!field || (field.tagName !== "INPUT" && field.tagName !== "TEXTAREA")) return "";
  if (field.disabled || field.readOnly) return "";
  if (field.value !== "") return "";
  const raw = field.dataset ? field.dataset.suggest : "";
  return typeof raw === "string" ? raw : "";
}

// A number input silently blanks a value it cannot parse, so a suggestion that
// doesn't fit the field's type is refused rather than half-applied.
function fitsType(field, value) {
  if (field.type === "number") {
    return value.trim() !== "" && Number.isFinite(Number(value));
  }
  return true;
}

// Put the field's suggestion in and tell the view about it, as if typed.
// Returns true when something was accepted.
export function acceptSuggestion(field) {
  const value = suggestionValue(field);
  if (!value || !fitsType(field, value)) return false;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// The tap half of the gesture, only on the narrow strip the drawn arrow sits in
// (right edge, ~30px). A tap anywhere else is an ordinary tap — placing the
// caret — so the field still behaves normally.
function inArrowZone(field, ev) {
  if (typeof field.getBoundingClientRect !== "function") return false;
  if (!Number.isFinite(ev.clientX)) return false;
  const rect = field.getBoundingClientRect();
  if (!rect.width) return false;
  const zone = Math.min(34, Math.max(22, rect.width * 0.22));
  return ev.clientX >= rect.right - zone;
}

// Wire the two delegated listeners. Installed once on `document` (not a single
// screen) because the admin's pop-ups and dialogs mount OUTSIDE #view. Returns a
// remover, so a test can take it back off again.
export function installSuggestionAccept(root = (typeof document !== "undefined" ? document : null)) {
  if (!root || typeof root.addEventListener !== "function") return () => {};
  const onKeydown = (ev) => {
    if (ev.key !== "ArrowRight" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const field = ev.target;
    if (!suggestionValue(field)) return;
    ev.preventDefault(); // the caret has nowhere to go anyway — take the value
    acceptSuggestion(field);
  };
  const onPointerdown = (ev) => {
    const field = ev.target;
    if (!suggestionValue(field)) return;
    if (!inArrowZone(field, ev)) return;
    ev.preventDefault();
    if (typeof field.focus === "function") field.focus();
    acceptSuggestion(field);
  };
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("pointerdown", onPointerdown);
  return () => {
    root.removeEventListener("keydown", onKeydown);
    root.removeEventListener("pointerdown", onPointerdown);
  };
}
