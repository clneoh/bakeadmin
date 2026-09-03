# Jienluv2bake — bakery backoffice for a home baker

A small, static web app for a solo home baker who runs a pre-order bakery. It turns
"orders for this delivery run" into an automatic ingredient shopping list (purchase
order) — no manual math.

- **Products** have recipes (a bill of materials: ingredient + qty per unit).
- **Delivery dates** are Mon/Wed/Fri with a daily capacity (default 12) and an
  order cut-off at 6pm the day before.
- **Orders** are entered manually per delivery date (from WhatsApp).
- **PO** = sum(order qty × recipe qty) per ingredient, priced in RM. Saved
  snapshots are kept in PO History and can be printed.

There's also a customer **storefront** (`store/`) — a public order page her
customers open on their phone. They tap products + quantity and place an order;
it lands **automatically** in the backoffice order list (status *New*) for her to
confirm. If Supabase isn't reachable it falls back to a tidy WhatsApp message.

The live site is one GitHub Pages repo behind the custom domain
`jienluv2bake.com.my`: the **root** is a public homepage, `/store/` is the
customer order page, and `/admin/` is this backoffice.

Deliberately out of scope: stock/inventory tracking and online payment.

## Run locally (development)

ES modules don't load over `file://`, so serve the folder:

```bash
cd bakeadmin
python3 -m http.server 8000
# or: npx serve
```

Then open http://localhost:8000 (homepage), http://localhost:8000/admin/
(backoffice) and http://localhost:8000/store/ (storefront).

## Deploy (free)

**GitHub Pages:**
1. Create a repo (e.g. `bakeadmin`), push this folder to `main`.
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. Live at `https://jienluv2bake.com.my/` — homepage at the root, storefront at
   `/store/`, backoffice at `/admin/`.

**Netlify (even quicker):** drag this folder into https://app.netlify.com/drop.

Relative paths + `#/` hash routing mean the subpath URL just works.

## Storefront (customer order page)

A second page at `store/` that customers open on their phone. Flow: pick a
delivery day → tap products → enter name → **Place order**. The order goes
straight into her backoffice order list (status *New*), and a WhatsApp message
to the bakery also opens on the customer's phone at the same time — pressing
**Send** delivers the copy, which reveals the customer's own number to the baker
(the order is never lost: if the app route fails, the WhatsApp message is the
fallback instead).

Pressing the button gives **immediate feedback** (button flips to "Sending…",
then a confirmation card appears with a summary of the order and whether it
reached the bakery's app — with a tappable WhatsApp link if the auto-open was
blocked). The button is **disabled while an order is being sent**, so tapping
repeatedly can't create duplicate orders.

Preview it locally at http://localhost:8000/store/.

With live Supabase configured, what customers see is edited in the backoffice —
**More → Settings → Storefront** — and published automatically (no redeploy).
That covers the bakery name, tagline, WhatsApp number and social links. The
**menu is the backoffice product list** (More → Products): add, price or hide a
product there and it updates on the customer page after a publish — there's no
separate storefront menu to keep in sync. `store/config.js` is only the starting
point / offline fallback:

## Live availability (Supabase)

The storefront can show how many slots are left per delivery day ("4 left" /
"Sold out"), so customers pick the next open day instead of ordering into a
full one. Since the storefront is static, the backoffice app **publishes** the
counts to a free Supabase table and the storefront **reads** them live.

How it works: every time she adds/edits/removes an order (or changes a day's
capacity), the backoffice computes `slots_left = capacity − booked` for the
next ~10 delivery days and pushes them to Supabase. The storefront fetches the
rows for the days it shows. If the feature is off or the fetch fails, the page
behaves exactly as before.

**One-time setup (takes ~10 min):**
1. Create a free project at [supabase.com](https://supabase.com) → New project.
2. Dashboard → **SQL editor** → open `supabase/availability.sql` → **Run**
   (creates the table + row-level security: anyone can read, only a logged-in
   user can write).
3. Dashboard → **Authentication → Users → Add user** — this is the app login
   (an email + password the backoffice will use to publish).
4. Dashboard → **Project Settings → API** — copy the **Project URL** and the
   **anon public key**.

**Then connect the two apps:**
- Backoffice → **More → Settings → Live availability**: paste URL, anon key,
  the app login email/password, and flip *Enable live availability* on. Hit
  **Sync now** to publish immediately.
- Storefront → `store/config.js` → paste the same **URL** and **anon key** into
  `supabase`.

The backoffice stays the source of truth — Supabase only holds the published
snapshot, so a wiped table is fixed by one "Sync now". The app login password
is stored in the app's local backup.

## Storefront menu & orders (Supabase)

Two extras that build on the same Supabase project:

- **Storefront config** — the backoffice publishes the storefront's name,
  WhatsApp number and social links to a `storefront_config` table (editable in
  **Settings → Storefront**), plus the menu built from the **Products** list, so
  a WhatsApp or menu edit goes live without a redeploy. Settings pulls the
  **live published copy** in when opened, so both phones' editors show what
  customers actually see; a phone only publishes when you edit a field, change a
  product, or press **Publish now** (there's no boot-time auto-publish that
  could let a stale phone overwrite a newer publish).
- **Order intake** — customers' orders are posted to an `incoming_orders`
  table. The backoffice polls ~every 30 seconds, turns each one into an order
  (status *New*, tagged "storefront") and you advance it New → Confirmed →
  Paid → Baked → Packed → Delivered. The status shows on both phones via
  shared data.
  A **cart with several items arrives as one order** — the list shows it as one
  row ("Focaccia + Sandwich"), one status, one delete, so it isn't confused for
  two orders.
  **New orders are hard to miss**: the Orders tab shows a red badge counting
  them, and the top of the Orders screen lists every unread order across all
  delivery dates (tap one to jump to its date), so a fresh order isn't buried
  under a specific date. Moving an order out of *New* clears it from both.

**One-time setup:** run `supabase/storefront.sql` in the SQL editor (adds the
two tables + security: anyone can place an order, but only signed-in bakers can
read or clear them).

Two things to know: an item is imported only when its name matches a backoffice
product (add it in Products and it'll import next time), and — since anyone
with the link can place an order — review New orders before confirming them.

## Order tracking & confirmation (Supabase)

Customers now pick **Self collect / Courier delivery** when ordering (a courier
order asks for the delivery address) and leave their **WhatsApp number**, so you
can confirm the order back to them. Orders show the time they were placed
("Placed 1 Sep · 14:32"), the delivery method and the address.

Every order row shows its own **status map** (New → Confirmed → Paid → Baked →
Packed → Delivered): steps behind the order are green with a tick, the step
waiting on the baker is the pulsing amber dot, and a Delivered order is all
green. Each stage has its own action, and each WhatsApp message leads with the
order's number (e.g. `#A3F9C2`) so it can always be matched back to the order:

- Move an order to **Confirmed** → tap **Send confirmation** — WhatsApp opens
  with the order number, delivery details, items + total, a **TNG QR** payment
  request, and a **track link**. The customer opens that link (or the *Track
  your order* card on the storefront) and sees the live status, their delivery
  method/address, and your TNG QR to pay.
- Move it to **Paid** → two buttons: **Send payment reminder** (a WhatsApp
  nudge with the order number + QR) and **Paid** — tap **Paid** only once the
  TNG receipt has really come back; that turns Paid green on the map.
- **Baked** has no message — the map just advances. Move it to **Packed** →
  tap **Send pickup reminder** (or "will be sent for delivery" for a courier
  order). **Delivered** finishes the order; the whole map goes green.

The order number tag (`#A3F9C2`) appears on every inbox row, every order row,
and the Edit pop-up; every item in the same storefront cart shares one number.

- The track page updates automatically whenever you change the order's status.
  (The update is published by the phone that changes the status; the other
  phone re-publishes on its next status change.)
- Set your TNG QR (a hosted image URL) in **Settings → Storefront → TNG QR
  code**. If the order has no WhatsApp number, moving it to **Confirmed** is
  blocked, and its message/Paid buttons stay disabled until you add one in the
  order form (manual orders) or via **Edit**.
- **Edit** opens a small pop-up over the screen (the **＋ New order** card stays
  on the page, so a manual order can always be added). Manual-add and Edit
  pickers list every product, including ones you've hidden from the menu —
  hidden ones are marked "(hidden)".

**One-time setup:** run `supabase/tracking.sql` in the SQL editor (adds the
tracking table + security: anyone can read a published status, only signed-in
bakers can publish).

## Shared data across phones (cloud sync)

The owner takes orders at home; her sister also takes orders (e.g. at a market).
Without extra work, they'd each see only what they typed in. **Shared data**
keeps the same orders, products, ingredients, delivery dates, purchase orders
and settings on every phone that signs in to the same Supabase project.

How it works: the app stays local-first. Each phone keeps its own copy in
localStorage, and every change syncs automatically (~1.5s after you make it —
no "Sync now" needed). The other phone catches up within ~30 seconds, or
immediately when the app regains focus/connection. It works offline: edits made
with no signal are queued and pushed when the connection returns.

The rule for two people editing at once: **newest edit wins per record**. If
you and your sister both edit the *same order* offline, the later edit wins —
the other one is overwritten. Editing *different* orders is always safe. For a
two-person home bakery that's the right trade-off; pick who has the "final word"
on the few records you both touch.

**One-time setup (after Live availability is working):**
1. Dashboard → **SQL editor** → open `supabase/backoffice.sql` → **Run**.
2. Dashboard → **Authentication → Users → Add user** — add *another* user for
   your sister (each of you signs in with her own email/password).
3. Backoffice → **More → Settings → Shared data (cloud)** → flip *Enable shared
   data* on. The app restarts into a sign-in screen: paste the Supabase URL +
   anon key (same ones as Live availability) and your login, then **Sign in**.
   Your existing data uploads automatically on first sign-in.
4. On her phone, open the same URL → **Settings → Shared data → Enable** → she
   signs in with her own account. The shared data appears on her phone.

The connection config (URL, anon key, login) is per-phone and isn't synced, so
each phone signs in with its owner's account. **Sign out** pauses availability
publishing until she signs in again.

## Host it free — Netlify Drop

For both phones to open the same URL:
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the `bakeadmin` folder into the page → Netlify gives you
   `https://<name>.netlify.app`.
3. Open that URL on her phone too (the app loads offline once visited, so a
   weak signal at the market doesn't block order entry).
4. Customers order from the same URL plus `/store/`.

## Handoff to the baker

**Two phones that share data:** follow *Shared data across phones* above — no
backup files needed; the first sign-in on each phone uploads/downloads
everything.

**One phone only (or a fresh phone to preload):**
1. On your machine: add her real ingredients and products → **Settings → Export backup**.
2. Send the `.json` to her (e.g. WhatsApp).
3. She opens the live URL on her phone → **More → Settings → Import backup**.
4. She exports a backup weekly (**Settings → Export**) — that file is her
   data-loss safety net if the shared cloud is ever reset.

There's a **Load sample data** button on a fresh install so she can see how it works
before entering anything real.

## Data & privacy

By default all data is stored in the device's browser (localStorage) — no
account, no cloud. The two opt-in Supabase features publish/echo data to her own
Supabase project: **Live availability** uploads slots-left counts (readable by
anyone, so the storefront can show them), and **Shared data** mirrors the full
backoffice data with **row-level security: only signed-in bakers can read or
write it**. Backup files and the app login password are stored in the app's
local storage on her phone.

## Tests

```bash
node --test test/*.test.js
```

Tests cover the pure modules (`admin/js/bom.js`, `admin/js/dates.js`), the sync
engine (`admin/js/sync.js`), the app bootstrap + sign-in gate
(`admin/js/app.js`), and the storefront (`store/app.js`).

## Files

```
index.html          public homepage (domain root)
store/index.html    customer order page (/store/)
store/app.css       storefront styling
store/app.js        storefront logic + order intake + availability + published config
store/config.js     fallback bakery name, WhatsApp, menu, days, supabase (overridden by backoffice Settings → Storefront)

admin/ — backoffice app (/admin/):
  index.html          entry (bottom nav shell)
  css/app.css         backoffice styling
  css/print.css       prints only the PO card
  js/state.js         schema, localStorage load/save, ids, formatting
  js/dates.js         delivery dates, cut-off, countdown (pure)
  js/bom.js           BOM explosion, costs, capacity (pure)
  js/supabase.js      live availability + storefront config publish, order intake
  js/sync.js          shared-data sync engine (queue, pull-then-flush, conflict)
  js/validate.js      import-file validation
  js/ui.js            DOM builder + shared render helpers
  js/app.js           hash router + bootstrap + shared-data gate
  js/views/*          one module per screen (login.js is the sign-in gate)
  sw.js               service worker — offline app shell (/admin/ scope)
  manifest.webmanifest PWA manifest for the backoffice

supabase/availability.sql   run once in Supabase SQL editor (public slots)
supabase/backoffice.sql     run once in Supabase SQL editor (shared data, RLS)
supabase/storefront.sql     run once in Supabase SQL editor (storefront config + order intake)
supabase/tracking.sql       run once in Supabase SQL editor (order tracking)
test/               node --test suites (import from admin/js and store/)
```
