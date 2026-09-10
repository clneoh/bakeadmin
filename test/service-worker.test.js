// test/service-worker.test.js — a failed request must never be answered with
// the app shell.
//
// The backoffice's worker is network-first with a cache fallback. The original
// fallback was `caches.match(req).then((hit) => hit || caches.match("./index.html"))`,
// which hands ./index.html — a web page — to ANY request that failed, including
// a .js request. The browser then runs a page as JavaScript, the module never
// executes, and whatever it was meant to wire up is silently dead. On the
// homepage that meant a visible English page whose EN/中文/BM buttons did
// nothing, because the script that binds them never ran.
//
// These tests run the real worker scripts in a stand-in worker scope and drive
// their fetch handler, so the response to a failure is asserted as a response —
// not as a string in the source.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ORIGIN = "https://jienluv2bake.com.my";
const SHELL = "<!doctype html><title>Backoffice</title>";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// A stand-in service-worker global scope. Returns the listeners the script
// registered, plus records of what it deleted / unregistered.
function loadWorker(path, opts = {}) {
  const listeners = {};
  const deleted = [];
  let unregistered = false;
  const keyList = opts.keys || ["bakeadmin-v1", "bakeadmin-admin-v1"];

  const sandbox = {
    caches: {
      keys: async () => keyList.slice(),
      delete: async (name) => {
        deleted.push(name);
        return true;
      },
      open: async () => ({ add: async () => {}, put: async () => {} }),
      match: async (key) => (opts.match ? opts.match(key) : null),
    },
    fetch: opts.fetch || (async () => new Response("fresh", { status: 200 })),
    Response,
    Promise,
    console,
    self: {
      location: { origin: ORIGIN, href: `${ORIGIN}/${path}` },
      addEventListener: (type, fn) => {
        (listeners[type] ||= []).push(fn);
      },
      skipWaiting: () => {},
      clients: { claim: async () => {} },
      registration: {
        unregister: async () => {
          unregistered = true;
        },
      },
    },
  };

  vm.runInNewContext(read(path), sandbox, { filename: path });
  return { listeners, deleted, didUnregister: () => unregistered };
}

// Plain objects, not Request: `mode: "navigate"` cannot be set through the
// Request constructor, and these are the only three fields the worker reads.
const req = (url, mode = "no-cors") => ({ method: "GET", url, mode });

function respond(handler, request) {
  let out;
  handler({ request, respondWith: (p) => { out = p; } });
  return out;
}

const offline = async () => {
  throw new Error("offline");
};

test("a failed script request is never answered with a web page", async () => {
  const w = loadWorker("admin/sw.js", {
    fetch: offline,
    match: async (key) => (key === "./index.html" ? new Response(SHELL) : null),
  });
  const res = await respond(w.listeners.fetch[0], req(`${ORIGIN}/admin/js/app.js`));

  assert.equal(res.type, "error", "a script must fail as a script, not receive HTML");
  assert.equal(res.status, 0);
  assert.notEqual(await res.text().catch(() => SHELL), SHELL);
});

test("a stylesheet or image failure is not answered with a web page either", async () => {
  for (const url of [`${ORIGIN}/admin/css/app.css`, `${ORIGIN}/admin/icon-192.png`]) {
    const w = loadWorker("admin/sw.js", {
      fetch: offline,
      match: async (key) => (key === "./index.html" ? new Response(SHELL) : null),
    });
    const res = await respond(w.listeners.fetch[0], req(url));
    assert.equal(res.type, "error", `${url} must not receive HTML`);
  }
});

test("a page navigation still falls back to the cached shell offline", async () => {
  const w = loadWorker("admin/sw.js", {
    fetch: offline,
    match: async (key) => (key === "./index.html" ? new Response(SHELL) : null),
  });
  const res = await respond(
    w.listeners.fetch[0],
    req(`${ORIGIN}/admin/index.html`, "navigate")
  );

  assert.equal(res.status, 200);
  assert.equal(await res.text(), SHELL);
});

test("a cached copy is still served when the network is down", async () => {
  const cached = new Response("/* cached */");
  const w = loadWorker("admin/sw.js", {
    fetch: offline,
    match: async (key) => {
      const url = typeof key === "string" ? key : key.url;
      return url.endsWith("app.js") ? cached : null;
    },
  });
  const res = await respond(w.listeners.fetch[0], req(`${ORIGIN}/admin/js/app.js`));

  assert.equal(await res.text(), "/* cached */", "offline support must survive the fix");
});

test("the root cleanup worker clears the old cache but keeps the backoffice's", async () => {
  const w = loadWorker("sw.js", { keys: ["bakeadmin-v1", "bakeadmin-admin-v1", "stray-v9"] });

  let activate;
  w.listeners.activate[0]({ waitUntil: (p) => { activate = p; } });
  await activate;

  assert.deepEqual(w.deleted.sort(), ["bakeadmin-v1", "stray-v9"]);
  assert.ok(!w.deleted.includes("bakeadmin-admin-v1"), "/admin/ needs its cache for offline");
});

test("the root cleanup worker removes itself and never handles a request", async () => {
  const w = loadWorker("sw.js");

  assert.ok(w.listeners.install, "it must install");
  assert.ok(w.listeners.activate, "it must clean up on activate");
  assert.equal(w.listeners.fetch, undefined, "it must not be able to serve anything");

  let activate;
  w.listeners.activate[0]({ waitUntil: (p) => { activate = p; } });
  await activate;
  assert.ok(w.didUnregister(), "it must unregister itself so it cannot come back");

  // Belt: the file sits at the site root, which is what makes the browser's own
  // update check land on it instead of the old worker.
  const src = read("sw.js");
  assert.ok(!/addEventListener\s*\(\s*["']fetch["']/.test(src), "no fetch handler at all");
  assert.ok(/skipWaiting/.test(src), "it must take over at once");
});

test("the homepage asks the browser to re-check an old root worker", () => {
  const html = read("index.html");

  assert.ok(/r\.update\s*\(/.test(html), "it must force the stale root worker to update");
  assert.ok(/r\.unregister\(\)/.test(html), "and drop it if that update fails");
  assert.ok(/bakeadmin-v1/.test(html), "the legacy cache is cleared directly too");

  // The homepage must never REGISTER a worker of its own: a root-scoped worker
  // is exactly what caused this, and it would cover the shop and /admin/ too.
  assert.ok(
    !/serviceWorker\s*\.\s*register\s*\(/.test(html),
    "the homepage must never create a service worker"
  );
});
