// sw.js — one-time cleanup worker at the SITE ROOT. Not the app's worker.
//
// Before the backoffice moved to /admin/, the app was served from the root and
// registered a service worker from this URL. That worker cached the whole site
// and answered any failed request out of its cache — or, when the cache had no
// entry, with ./index.html, the homepage, even for a .js request. A page that
// runs a stale script (or gets a web page where it asked for JavaScript) shows
// up as a dead language switch, because the script that binds those buttons
// never ran. That is what this file exists to undo.
//
// A service worker updates itself by re-fetching its own URL, so putting a
// different script HERE is what replaces the old one: any phone still carrying
// it fetches this file on its next visit, installs it, and it clears the
// leftovers and removes itself. The homepage asks for that re-check explicitly
// (see the head script in index.html); nothing else ever registers this file,
// so it does not come back to life once it has done its job. Keep it in the
// repo — a phone that sat in a drawer for months will still need it.
//
// It deliberately registers NO fetch handler: while it is briefly in control,
// every request goes straight to the network, so it cannot serve anything stale.

const ADMIN_CACHE = "bakeadmin-admin-v1";

// Take over at once rather than waiting for every tab to close — the point is
// to stop the old worker serving anything as soon as possible.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Every cache the old root worker made, and any other stray one. The
      // backoffice's own cache is kept: /admin/ relies on it to open offline,
      // and it is a different, current worker's.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== ADMIN_CACHE)
          .map((name) => caches.delete(name))
      );
      await self.registration.unregister();
    })()
  );
});
