// views/lock.js — the 4-digit app-password gate. Painted into the full-screen
// #lock-layer overlay (not #view) so nothing behind it is reachable until the
// PIN matches. Shown on app load when settings.lock is enabled.

import { el, button } from "../ui.js";
import { hashPin, isPin } from "../pin.js";

// ★ HOW LONG A WRONG TRY COSTS (v553). ⭐ Three are free — a thumb on a phone mistypes — and after that the
// wait doubles: 1s, 2s, 4s… up to half a minute. ⚠️ At module scope so the rule can be pinned without a
// screen; the pause itself is a timer in `doUnlock`.
export function wrongPauseMs(wrongTries) {
  const n = Math.max(0, Math.floor(Number(wrongTries) || 0));
  return n < 3 ? 0 : Math.min(30000, 1000 * 2 ** (n - 3));
}

export function renderLock(layerEl, state, { onUnlocked } = {}) {
  const input = el("input", {
    class: "input lock-input", type: "password", inputmode: "numeric", maxlength: "4",
    autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false",
    placeholder: "4 digits",
  });
  const err = el("p", { class: "lock-error" });
  const go = button("Unlock", doUnlock, "primary block");
  let wrong = 0;   // wrong tries on THIS screen — see the pause in `doUnlock`

  async function doUnlock() {
    if (!isPin(input.value)) {
      err.textContent = "Enter 4 digits";
      input.value = "";
      input.focus();
      return;
    }
    go.disabled = true;
    // ⚠️⚠️ A PASSWORD THAT CANNOT BE CHECKED MUST NOT LOCK HER OUT (v552). ⭐ `hashPin` uses the browser's
    // `crypto.subtle`, which **does not exist on an insecure page** — so on a phone opening the app over
    // `http://` on the local network, typing the CORRECT password rejected, and the press had already been
    // disabled: **a button that never comes back and says nothing.** ⭐ The error is caught now, the press
    // is given back, and the message names the one thing that actually fixes it.
    let h;
    try {
      h = await hashPin(input.value);
    } catch {
      go.disabled = false;
      err.textContent = "This phone cannot check the password on this address. Open the app from the "
        + "https:// address (or localhost on a computer), then try again.";
      input.focus();
      return;
    }
    if (h === state.settings.lock.pinHash) {
      err.textContent = "";
      close();
      if (onUnlocked) onUnlocked();
    } else {
      // ★★★ AND A GUESS COSTS SOMETHING (v553). ⚠️⚠️ There was no pause at all: four digits, tried as fast
      // as a thumb can tap, on an app that **ships with a published default**. ⭐ Three wrong tries now
      // cost a short wait, doubling each time up to half a minute — **enough to make a casual guess
      // pointless, and never long enough to trap her** (her own rule: never a gate between her and her
      // book). ⚠️ It is a pause on the screen, not a lockout: a reload starts again, which is the honest
      // limit of what a page can enforce, and it is not claimed to be more.
      wrong += 1;
      const wait = wrongPauseMs(wrong);
      input.value = "";
      if (wait > 0) {
        err.textContent = `Wrong password — try again in ${Math.round(wait / 1000)}s`;
        go.disabled = true;
        input.disabled = true;
        setTimeout(() => {
          go.disabled = false;
          input.disabled = false;
          err.textContent = "Wrong password — try again";
          input.focus();
        }, wait);
      } else {
        err.textContent = "Wrong password — try again";
        go.disabled = false;
        input.focus();
      }
    }
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doUnlock();
  });

  function close() {
    layerEl.hidden = true;
    layerEl.replaceChildren();
  }

  const card = el("div", { class: "lock-card" },
    el("p", { class: "lock-emoji" }, "🔒"),
    el("p", { class: "lock-title" }, "Enter your 4-digit password"),
    el("p", { class: "lock-sub" }, "This app is locked on this phone."),
    input,
    err,
    el("div", { class: "lock-actions" }, go));

  layerEl.replaceChildren(card);
  layerEl.hidden = false;
  setTimeout(() => input.focus(), 0);

  // Test seam (harmless on the real DOM): lets tests drive the gate without
  // walking child indexes.
  layerEl._pin = input;
  layerEl._btn = go;
  layerEl._err = err;
}
