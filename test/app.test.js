// test/app.test.js — smoke tests for the bootstrap + shared-data gate.
// js/app.js boots into the DOM, so this shims a minimal document (like the
// store tests) and imports it fresh per scenario. Verifies the no-cloud path is
// unchanged and that the cloud gate appears/disappears as expected.

import { test } from "node:test";
import assert from "node:assert/strict";

const realLocalStorage = globalThis.localStorage;

function createEl(tag) {
  return {
    tagName: String(tag || "").toUpperCase(), nodeType: 1, children: [], attrs: {}, dataset: {},
    className: "", style: {}, textContent: "", value: "", checked: false, disabled: false,
    hidden: false, scrollTop: 0, _listeners: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { if (c != null) this.children.push(c); return c; },
    append(...cs) { for (const c of cs) if (c != null) this.children.push(c); },
    replaceChildren(...cs) { this.children = []; for (const c of cs) if (c != null) this.children.push(c); },
    addEventListener(t, f) { (this._listeners[t] ||= []).push(f); },
    removeEventListener() {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
  };
}

// Fresh DOM per scenario so repeated app.js imports don't see stale children.
function freshDOM() {
  const registry = {};
  const documentShim = {
    createElement: createEl,
    createTextNode: (s) => ({ nodeType: 3, text: String(s) }),
    getElementById: (id) => (registry[id] ||= createEl("div")),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    removeEventListener() {},
    body: createEl("body"),
  };
  globalThis.document = documentShim;
  globalThis.window = { addEventListener() {}, location: { hash: "#/dashboard" } };
  globalThis.location = globalThis.window.location;
  globalThis.history = { replaceState() {} };
  // Keep the app's 30s sync / 60s countdown timers from keeping the test alive.
  globalThis.setInterval = () => 0;
  globalThis.clearInterval = () => {};
  return registry;
}

function installStorage(seed) {
  const store = new Map();
  for (const [k, v] of Object.entries(seed || {})) store.set(k, String(v));
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  return store;
}

function stateJSON(overrides = {}) {
  return JSON.stringify({
    version: 1,
    settings: {
      defaultCapacity: 12,
      deliveryDays: [1, 3, 5],
      cutoff: "18:00",
      currency: "RM",
      supabase: { enabled: false, url: "", anonKey: "", email: "", password: "" },
      cloud: { enabled: false },
    },
    ingredients: [],
    products: [],
    deliveryDates: [],
    orders: [],
    purchaseOrders: [],
    ...overrides,
  });
}

function tokenJSON(token = "tok") {
  return JSON.stringify({ access_token: token, expires_at: Date.now() + 3600000 });
}

function restore() {
  if (realLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = realLocalStorage;
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.location;
}

// Keep real fetch (Node's) from hitting the network if a scenario logs in.
globalThis.fetch = async (url) => {
  if (String(url).includes("/auth/v1/token")) {
    return { ok: true, json: async () => ({ access_token: "tok", expires_in: 3600 }) };
  }
  return { ok: true, json: async () => [], text: async () => "" };
};

test("cloud off: app boots straight to the dashboard, no gate, no sync calls", async () => {
  freshDOM();
  installStorage({ "bakeadmin.v1": stateJSON() });
  try {
    await import("../js/app.js?case=off");

    const view = document.getElementById("view");
    assert.ok(view.children.length > 0, "dashboard rendered into #view");
    assert.equal(document.getElementById("view-title-text").textContent, "Jienluv2bake");
    assert.equal(document.getElementById("tabbar").hidden, false, "tab bar visible");
    assert.equal(document.getElementById("view-title-text").textContent === "Sign in", false, "not the sign-in screen");
  } finally { restore(); }
});

test("cloud on without a session: the sign-in gate owns the screen", async () => {
  freshDOM();
  installStorage({
    "bakeadmin.v1": stateJSON({
      settings: {
        supabase: { url: "https://x.supabase.co", anonKey: "anon" },
        cloud: { enabled: true },
      },
    }),
  });
  try {
    await import("../js/app.js?case=gate");

    assert.equal(document.getElementById("tabbar").hidden, true, "tab bar hidden while signing in");
    assert.equal(document.getElementById("view-title-text").textContent, "Sign in");
    const view = document.getElementById("view");
    assert.ok(view.children.length > 0, "login card rendered");
  } finally { restore(); }
});

test("cloud on with a valid session: straight into the app", async () => {
  freshDOM();
  installStorage({
    "bakeadmin.v1": stateJSON({
      settings: {
        supabase: { url: "https://x.supabase.co", anonKey: "anon" },
        cloud: { enabled: true },
      },
    }),
    "bakeadmin.supabase": tokenJSON(),
  });
  try {
    await import("../js/app.js?case=token");
    assert.equal(document.getElementById("tabbar").hidden, false, "no gate — session valid");
    assert.equal(document.getElementById("view-title-text").textContent, "Jienluv2bake");
  } finally { restore(); }
});

test("cloud on with stored credentials: silent auto-login, no gate flash", async () => {
  freshDOM();
  installStorage({
    "bakeadmin.v1": stateJSON({
      settings: {
        supabase: { url: "https://x.supabase.co", anonKey: "anon", email: "owner@x.com", password: "pw" },
        cloud: { enabled: true },
      },
    }),
  });
  try {
    await import("../js/app.js?case=auto");
    // render() runs synchronously in boot, before the async login resolves —
    // so the app must be showing, never the gate.
    assert.equal(document.getElementById("view-title-text").textContent, "Jienluv2bake");
    assert.equal(document.getElementById("tabbar").hidden, false);
    await new Promise((r) => setTimeout(r, 10)); // let the login + pull settle
    assert.equal(document.getElementById("view-title-text").textContent, "Jienluv2bake", "still the app after login");
  } finally { restore(); }
});
