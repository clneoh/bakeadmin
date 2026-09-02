// test/sync.test.js — unit tests for the shared-data sync engine.
// Run with: node --test test/

import { test } from "node:test";
import assert from "node:assert/strict";
import * as sync from "../js/sync.js";

const realFetch = globalThis.fetch;
const realLocalStorage = globalThis.localStorage;
const HASH_1234 = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

// ── test helpers ──────────────────────────────────────────────────────────

function baseState() {
  return {
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
  };
}

function cloudOn(state, url = "https://x.supabase.co", anonKey = "anon") {
  state.settings.cloud.enabled = true;
  state.settings.supabase.url = url;
  state.settings.supabase.anonKey = anonKey;
  return state;
}

function installStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  return {
    store,
    restore() {
      if (realLocalStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = realLocalStorage;
    },
  };
}

function installFetch(handler) {
  globalThis.fetch = handler;
  return () => { globalThis.fetch = realFetch; };
}

function seedToken(store, token = "tok_abc") {
  store.set("bakeadmin.supabase", JSON.stringify({
    access_token: token,
    expires_at: Date.now() + 3600000,
  }));
}

function seedJournal(store, { pending = {}, snapshot = {}, meta = {}, lastPullAt = null } = {}) {
  store.set("bakeadmin.sync", JSON.stringify({ version: 1, pending, snapshot, meta, lastPullAt }));
}

// A cloud row as the REST API returns it: `data` is a JSON string.
function cloudRow(kind, id, payload, updated_at, deleted = false) {
  return { kind, id, data: deleted ? null : JSON.stringify(payload), _deleted: deleted, updated_at };
}

// ── computeRecords ────────────────────────────────────────────────────────

test("computeRecords: arrays become rows, settings becomes one default row", () => {
  const st = baseState();
  st.products = [{ id: "p1", name: "Focaccia" }];
  st.orders = [{ id: "o1", productId: "p1", qty: 2 }];
  st.ingredients = [{ id: "i1", name: "Flour" }];
  st.deliveryDates = [{ id: "d1", date: "2026-09-07" }];
  st.purchaseOrders = [{ id: "po1", total: 5 }];
  st.settings.lock = { enabled: true, pinHash: HASH_1234 }; // device-local app password

  const rows = sync.computeRecords(st);
  const kinds = rows.map((r) => r.kind).sort();
  assert.deepEqual(kinds, ["deliveryDates", "ingredients", "orders", "products", "purchaseOrders", "settings"]);

  const settings = rows.find((r) => r.kind === "settings");
  assert.equal(settings.id, "default");
  // Only the business keys sync — connection config AND the app password stay per-device.
  assert.deepEqual(settings.data, { defaultCapacity: 12, deliveryDays: [1, 3, 5], cutoff: "18:00", currency: "RM" });
});

// ── markDirty ─────────────────────────────────────────────────────────────

test("markDirty: fresh journal stamps every record as pending", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.products = [{ id: "p1", name: "Focaccia" }];
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];

    const r1 = sync.markDirty(st, "2026-01-01T00:00:00.000Z");
    assert.equal(r1.changed, true);
    assert.deepEqual(Object.keys(r1.pending).sort(), ["orders:o1", "products:p1", "settings:default"]);
    assert.equal(r1.pending["orders:o1"]._deleted, false);
    assert.equal(r1.pending["orders:o1"].data.qty, 2);
    assert.equal(r1.pending["orders:o1"].updated_at, "2026-01-01T00:00:00.000Z");

    // unchanged re-run adds nothing
    const r2 = sync.markDirty(st, "2026-01-01T00:00:05.000Z");
    assert.equal(r2.changed, false);
    assert.equal(JSON.stringify(r2.pending), JSON.stringify(r1.pending));
  } finally { restore(); }
});

test("markDirty: an edited record re-stamps only itself", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];
    sync.markDirty(st, "2026-01-01T00:00:00.000Z");

    st.orders[0].qty = 5;
    const r = sync.markDirty(st, "2026-01-02T00:00:00.000Z");
    assert.equal(r.changed, true);
    assert.equal(r.pending["orders:o1"].updated_at, "2026-01-02T00:00:00.000Z");
    assert.equal(r.pending["orders:o1"].data.qty, 5);
    assert.equal(r.pending["settings:default"].updated_at, "2026-01-01T00:00:00.000Z");
  } finally { restore(); }
});

test("markDirty: a removed record produces a tombstone", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.products = [{ id: "p1", name: "Focaccia" }];
    sync.markDirty(st, "2026-01-01T00:00:00.000Z");

    st.products = [];
    const r = sync.markDirty(st, "2026-01-03T00:00:00.000Z");
    assert.equal(r.changed, true);
    assert.deepEqual(r.pending["products:p1"], {
      kind: "products", id: "p1", updated_at: "2026-01-03T00:00:00.000Z", data: null, _deleted: true,
    });
    // snapshot no longer tracks it, so the next run doesn't re-tombstone
    const r2 = sync.markDirty(st, "2026-01-04T00:00:00.000Z");
    assert.equal(r2.changed, false);
  } finally { restore(); }
});

test("markDirty: changing only the app-password lock never dirties the settings row", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    const first = sync.markDirty(st, "2026-01-01T00:00:00.000Z"); // fresh journal stamps everything
    assert.equal(first.changed, true);

    st.settings.lock = { enabled: true, pinHash: HASH_1234 };
    const r = sync.markDirty(st, "2026-01-02T00:00:00.000Z");
    assert.equal(r.changed, false, "the lock is device-local — nothing new to push");
    assert.equal(r.pending["settings:default"].updated_at, "2026-01-01T00:00:00.000Z", "settings row not re-stamped by a lock edit");
  } finally { restore(); }
});

// ── mergeRows ─────────────────────────────────────────────────────────────

test("mergeRows: newer cloud row replaces local; older is ignored", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.orders = [{ id: "o1", productId: "p1", qty: 2, customerName: "local" }];
    seedJournal(store, { meta: { "orders:o1": "2026-01-01T00:00:00.000Z" } });

    // newer cloud row wins
    const r1 = sync.mergeRows(st, [cloudRow("orders", "o1", { id: "o1", productId: "p1", qty: 9 }, "2026-02-01T00:00:00.000Z")]);
    assert.equal(r1.changed, true);
    assert.equal(st.orders[0].qty, 9);

    // older cloud row loses
    const r2 = sync.mergeRows(st, [cloudRow("orders", "o1", { id: "o1", qty: 1 }, "2026-01-01T12:00:00.000Z")]);
    assert.equal(r2.changed, false);
    assert.equal(st.orders[0].qty, 9);
  } finally { restore(); }
});

test("mergeRows: pending local edit newer than cloud keeps the local edit", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.orders = [{ id: "o1", productId: "p1", qty: 7 }];
    seedJournal(store, {
      pending: { "orders:o1": { kind: "orders", id: "o1", updated_at: "2026-03-01T00:00:00.000Z", data: st.orders[0], _deleted: false } },
      meta: { "orders:o1": "2026-02-01T00:00:00.000Z" },
    });

    const r = sync.mergeRows(st, [cloudRow("orders", "o1", { id: "o1", qty: 1 }, "2026-02-01T00:00:00.000Z")]);
    assert.equal(r.changed, false);
    assert.equal(st.orders[0].qty, 7, "local record untouched");
    const b = JSON.parse(store.get("bakeadmin.sync"));
    assert.ok(b.pending["orders:o1"], "pending edit survives to be flushed");
  } finally { restore(); }
});

test("mergeRows: pending local edit older than cloud loses to the cloud row", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.orders = [{ id: "o1", productId: "p1", qty: 7 }];
    seedJournal(store, {
      pending: { "orders:o1": { kind: "orders", id: "o1", updated_at: "2026-01-01T00:00:00.000Z", data: st.orders[0], _deleted: false } },
      meta: { "orders:o1": "2026-01-01T00:00:00.000Z" },
    });

    const r = sync.mergeRows(st, [cloudRow("orders", "o1", { id: "o1", qty: 1 }, "2026-02-01T00:00:00.000Z")]);
    assert.equal(r.changed, true);
    assert.equal(st.orders[0].qty, 1, "cloud's newer edit replaces the stale pending");
    const b = JSON.parse(store.get("bakeadmin.sync"));
    assert.equal(b.pending["orders:o1"], undefined, "stale pending discarded, not pushed");
  } finally { restore(); }
});

test("mergeRows: a tombstone removes a local record, unless a newer pending edit resurrects it", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.products = [{ id: "p1", name: "Focaccia" }];
    seedJournal(store, { meta: { "products:p1": "2026-01-01T00:00:00.000Z" } });

    // tombstone newer than local → record removed
    const r1 = sync.mergeRows(st, [cloudRow("products", "p1", null, "2026-02-01T00:00:00.000Z", true)]);
    assert.equal(r1.changed, true);
    assert.equal(st.products.length, 0);

    // tombstone ignored when a pending local edit is newer
    st.products = [{ id: "p2", name: "Sandwich" }];
    seedJournal(store, {
      pending: { "products:p2": { kind: "products", id: "p2", updated_at: "2026-03-01T00:00:00.000Z", data: st.products[0], _deleted: false } },
      meta: { "products:p2": "2026-02-01T00:00:00.000Z" },
    });
    const r2 = sync.mergeRows(st, [cloudRow("products", "p2", null, "2026-02-01T00:00:00.000Z", true)]);
    assert.equal(r2.changed, false);
    assert.equal(st.products.length, 1, "kept alive by the newer pending edit");
    const b = JSON.parse(store.get("bakeadmin.sync"));
    assert.ok(b.pending["products:p2"], "pending edit still queued to resurrect");
  } finally { restore(); }
});

test("mergeRows: a cloud record that isn't local is added", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    seedJournal(store);
    const r = sync.mergeRows(st, [cloudRow("orders", "o_new", { id: "o_new", productId: "p1", qty: 3 }, "2026-02-01T00:00:00.000Z")]);
    assert.equal(r.changed, true);
    assert.equal(st.orders.length, 1);
    assert.equal(st.orders[0].qty, 3);
  } finally { restore(); }
});

test("mergeRows: settings sync business keys but preserve local supabase/cloud config", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    st.settings.supabase = { enabled: true, url: "https://local.supabase.co", anonKey: "local-anon", email: "me@x", password: "pw" };
    st.settings.cloud = { enabled: true };
    st.settings.lock = { enabled: true, pinHash: HASH_1234 };
    seedJournal(store, { meta: { "settings:default": "2026-01-01T00:00:00.000Z" } });

    const r = sync.mergeRows(st, [cloudRow("settings", "default",
      { defaultCapacity: 24, deliveryDays: [1, 2, 3], cutoff: "20:00", currency: "RM" },
      "2026-02-01T00:00:00.000Z")]);
    assert.equal(r.changed, true);
    assert.equal(st.settings.defaultCapacity, 24);
    assert.deepEqual(st.settings.deliveryDays, [1, 2, 3]);
    assert.equal(st.settings.cutoff, "20:00");
    // per-device config untouched
    assert.deepEqual(st.settings.supabase, { enabled: true, url: "https://local.supabase.co", anonKey: "local-anon", email: "me@x", password: "pw" });
    assert.deepEqual(st.settings.cloud, { enabled: true });
    assert.deepEqual(st.settings.lock, { enabled: true, pinHash: HASH_1234 }, "app password never clobbered by a cloud merge");
  } finally { restore(); }
});

test("mergeRows: unchanged merge reports changed:false", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    seedJournal(store, { meta: { "orders:o1": "2026-02-01T00:00:00.000Z" } });
    const r = sync.mergeRows(st, [cloudRow("orders", "o1", { id: "o1", qty: 3 }, "2026-01-01T00:00:00.000Z")]);
    assert.equal(r.changed, false);
  } finally { restore(); }
});

// ── needsGate ─────────────────────────────────────────────────────────────

test("needsGate: off when cloud disabled, on when enabled without a session", () => {
  const { store, restore } = installStorage();
  try {
    const st = baseState();
    assert.equal(sync.needsGate(st), false, "cloud off → no gate");

    cloudOn(st);
    assert.equal(sync.needsGate(st), true, "cloud on, no token, no creds → gate");

    seedToken(store);
    assert.equal(sync.needsGate(st), false, "valid session → no gate");

    store.delete("bakeadmin.supabase");
    st.settings.supabase.email = "a@b.c";
    st.settings.supabase.password = "pw";
    assert.equal(sync.needsGate(st), false, "stored creds → auto-login, no gate");
  } finally { restore(); }
});

// ── flush ─────────────────────────────────────────────────────────────────

test("flush: pushes pending rows with auth headers and clears them on success", async () => {
  const { store, restore } = installStorage();
  try {
    const st = cloudOn(baseState());
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];
    seedToken(store);
    sync.markDirty(st, "2026-01-01T00:00:00.000Z");

    let captured = null;
    const restoreFetch = installFetch(async (url, opts) => {
      captured = { url, opts };
      return { ok: true, text: async () => "" };
    });

    try {
      const r = await sync.flush(st);
      assert.equal(r.ok, true);
      assert.equal(r.pushed, 2); // order + settings

      assert.ok(captured.url.includes("/rest/v1/bakery?on_conflict=kind,id"));
      assert.equal(captured.opts.headers.apikey, "anon");
      assert.equal(captured.opts.headers.Authorization, "Bearer tok_abc");
      assert.equal(captured.opts.headers.Prefer, "resolution=merge-duplicates,return=minimal");

      const body = JSON.parse(captured.opts.body);
      const orderRow = body.find((row) => row.id === "o1");
      assert.equal(orderRow.kind, "orders");
      assert.equal(orderRow._deleted, false);
      assert.equal(orderRow.updated_at, "2026-01-01T00:00:00.000Z");
      assert.deepEqual(JSON.parse(orderRow.data), { id: "o1", productId: "p1", qty: 2 });

      const b = JSON.parse(store.get("bakeadmin.sync"));
      assert.deepEqual(b.pending, {}, "successful push clears pending");
    } finally { restoreFetch(); }
  } finally { restore(); }
});

test("flush: a tombstone pushes a string data, not JSON null (bakery.data is NOT NULL)", async () => {
  const { store, restore } = installStorage();
  try {
    const st = cloudOn(baseState());
    seedToken(store);

    // Queue a record, then delete it — markDirty turns the removal into a tombstone.
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];
    sync.markDirty(st, "2026-01-01T00:00:00.000Z");
    st.orders = [];
    sync.markDirty(st, "2026-01-02T00:00:00.000Z");

    let captured = null;
    const restoreFetch = installFetch(async (url, opts) => {
      captured = { url, opts };
      return { ok: true, text: async () => "" };
    });

    try {
      const r = await sync.flush(st);
      assert.equal(r.ok, true);
      const body = JSON.parse(captured.opts.body);
      const tombstone = body.find((row) => row.id === "o1");
      assert.equal(tombstone._deleted, true);
      assert.equal(tombstone.data, "null", "tombstone carries the string 'null', not JSON null");
    } finally { restoreFetch(); }
  } finally { restore(); }
});

test("flush: keeps pending when the push fails, and no-ops when empty", async () => {
  const { store, restore } = installStorage();
  try {
    const st = cloudOn(baseState());
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];
    seedToken(store);
    sync.markDirty(st, "2026-01-01T00:00:00.000Z");

    let restoreFetch = installFetch(async () => ({ ok: false, status: 500, text: async () => "boom" }));
    try {
      const r = await sync.flush(st);
      assert.equal(r.ok, false);
      assert.ok(r.reason.includes("500"));
      const b = JSON.parse(store.get("bakeadmin.sync"));
      assert.ok(b.pending["orders:o1"], "pending kept for retry");
    } finally { restoreFetch(); }

    // clear pending, then a flush with nothing queued is a fast success
    seedJournal(store);
    restoreFetch = installFetch(async () => { throw new Error("should not be called"); });
    try {
      const r = await sync.flush(st);
      assert.deepEqual(r, { ok: true, pushed: 0 });
    } finally { restoreFetch(); }
  } finally { restore(); }
});

// ── pull ──────────────────────────────────────────────────────────────────

test("pull: merges cloud rows, persists lastPullAt, reports changed", async () => {
  const { store, restore } = installStorage();
  try {
    const st = cloudOn(baseState());
    seedToken(store);

    const restoreFetch = installFetch(async (url) => {
      assert.ok(url.includes("/rest/v1/bakery"));
      assert.ok(url.includes("select=kind,id,data,updated_at,_deleted"));
      return { ok: true, json: async () => [cloudRow("orders", "o_new", { id: "o_new", qty: 4 }, "2026-02-01T00:00:00.000Z")] };
    });
    try {
      const r = await sync.pull(st);
      assert.equal(r.ok, true);
      assert.equal(r.changed, true);
      assert.equal(st.orders.length, 1);
      assert.equal(st.orders[0].qty, 4);
      const b = JSON.parse(store.get("bakeadmin.sync"));
      assert.ok(b.lastPullAt, "lastPullAt recorded");
    } finally { restoreFetch(); }
  } finally { restore(); }
});

test("pull: offline, unconfigured, or unauthenticated never throws", async () => {
  const { store, restore } = installStorage();
  try {
    // cloud off
    assert.deepEqual(await sync.pull(baseState()), { ok: false, changed: false, reason: "Shared data is off" });

    // cloud on, no token
    const st = cloudOn(baseState());
    assert.deepEqual(await sync.pull(st), { ok: false, changed: false, reason: "Not signed in" });

    // network failure
    seedToken(store);
    const restoreFetch = installFetch(async () => { throw new Error("no signal"); });
    try {
      const r = await sync.pull(st);
      assert.equal(r.ok, false);
      assert.equal(r.reason, "Offline — will retry");
    } finally { restoreFetch(); }
  } finally { restore(); }
});

// ── signIn (one-time migration) ───────────────────────────────────────────

test("signIn: logs in, pulls the empty cloud, and uploads local data", async () => {
  const { store, restore } = installStorage();
  try {
    const st = cloudOn(baseState());
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];

    const calls = [];
    const restoreFetch = installFetch(async (url, opts) => {
      calls.push({ url, opts });
      if (url.includes("/auth/v1/token")) {
        return { ok: true, json: async () => ({ access_token: "tok_mig", expires_in: 3600 }) };
      }
      if (url.includes("/rest/v1/bakery?on_conflict")) {
        return { ok: true, text: async () => "" }; // the push
      }
      return { ok: true, json: async () => [] }; // the pull — empty cloud on first sign-in
    });
    try {
      await sync.signIn(st, "https://x.supabase.co", "anon", "sister@x.com", "pw");

      assert.equal(st.settings.supabase.url, "https://x.supabase.co");
      assert.equal(st.settings.supabase.anonKey, "anon");
      assert.equal(st.settings.supabase.email, "sister@x.com");

      const push = calls.find((c) => c.url.includes("/rest/v1/bakery?on_conflict=kind,id"));
      assert.ok(push, "a push happened after the pull");
      const body = JSON.parse(push.opts.body);
      assert.ok(body.some((r) => r.id === "o1"), "existing local order uploaded in the migration");

      const b = JSON.parse(store.get("bakeadmin.sync"));
      assert.equal(Object.keys(b.pending).length, 0, "migration push cleared pending");
    } finally { restoreFetch(); }
  } finally { restore(); }
});

// ── refresh (pull-then-flush) ─────────────────────────────────────────────

test("refresh: skips the flush when the pull fails (stale-write protection)", async () => {
  const { store, restore } = installStorage();
  try {
    const st = cloudOn(baseState());
    st.orders = [{ id: "o1", productId: "p1", qty: 2 }];
    seedToken(store);
    sync.markDirty(st, "2026-01-01T00:00:00.000Z");

    let pushCount = 0;
    const restoreFetch = installFetch(async (url, opts) => {
      if (opts && opts.method === "POST") { pushCount++; return { ok: true, text: async () => "" }; }
      throw new Error("no signal"); // the pull fails
    });
    try {
      const r = await sync.refresh(st);
      assert.equal(r.ok, false);
      assert.equal(pushCount, 0, "no push without a successful pull");
      const b = JSON.parse(store.get("bakeadmin.sync"));
      assert.ok(b.pending["orders:o1"], "pending preserved for the next successful pull");
    } finally { restoreFetch(); }
  } finally { restore(); }
});
