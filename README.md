# Jienluv2bake — bakery backoffice for a home baker

A small, static web app for a solo home baker who runs a pre-order bakery. It turns
"orders for this delivery run" into an automatic ingredient shopping list (purchase
order) — no manual math.

- **Products** have recipes (a bill of materials: ingredient + qty per unit).
- **Delivery dates** are Mon/Wed/Fri with a daily capacity (default 12) and an
  order cut-off at 6pm the day before.
- **Orders** are entered manually per delivery date (from WhatsApp).
- **PO** (under **More → Purchase Order**) = sum(order qty × recipe qty) per
  ingredient, priced in RM. Saved snapshots are kept in PO History and can be
  printed. The bottom tabs are **Home · Orders · Products · Customers · More** —
  Customers is a tab of its own.

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

## Site languages (homepage + storefront)

Both the homepage and the storefront read in **English, 中文 or Bahasa Malaysia**
— default English. An **EN 中文 BM** switch near the top of each page re-renders
the whole page in the chosen language and remembers it (localStorage `siteLang`),
so a Chinese- or Malay-speaking customer only picks it once. The backoffice app
itself stays English.

The switch is **in place**: the page repaints, nothing is re-downloaded, and the
customer's cart, chosen day and typed details survive. Every text lookup reads
the saved language fresh, so nothing needs re-fetching to repaint.

- **Storefront.** `render()` owns the cart/selected-day closures, so the switch
  can't call `render()` again (that would throw the basket away) and must not
  reload (that would re-fetch the menu, the slots-left and the storefront
  settings from Supabase). The shop's menu is text-only — it carries no product
  photos — so a reload never cost images, just those three fetches.
  Instead `render()` assigns a `repaintForLang` hook — tagged static HTML +
  title (`applyTo`), header/info cards/footer (`renderStatic`), date pills and
  menu cards (`rerender`), the order bar (`renderBar`), and the track card from
  its cached lookup (`paintTrack`) — and the exported `setLang(lang)` runs it and
  moves the pill highlight. The track lookup keeps its last result in
  `lastTrack` so a switch repaints it without a network call.
- Shared loader `i18n.js` at the repo root (imported as `./i18n.js` by the
  homepage and `../i18n.js` by the store) holds the language list, persistence,
  the DOM re-apply walker (`applyTo`), and `nameFor(product, lang)`.
- `home-lang.js` and `store-lang.js` (both repo root) are the per-language
  dictionaries — every static string, plus the store's dynamic strings
  (`Sold out`, `Only N left`, cart bar, confirm/track text, and localized
  weekday/month names for its day pills).
- **Per-product shop names.** Each product can carry an optional translated
  name per language, typed in the backoffice: Products → Edit → **Shop names**
  (`nameZh` / `nameMs`). When the storefront is in that language it shows the
  translated name; a blank box falls back to the English `name`, which always
  stays the canonical one — the app, orders and labels use the English name no
  matter which language a customer ordered in. `syncStorefront` publishes the
  two names (only when non-blank) and the store's `mergeStorefront` whitelists
  them, so the published copy survives sync.

## Developer contact & the wish-list email

Backoffice **More → Settings → Website & developer** holds the developer's
**name** and one or more **emails** (`settings.developer = {name, emails[]}`).
Where it shows (only once a name *and* at least one email are set):

- a small **Website by …** credit line in the homepage footer and a matching row
  in the store footer (read from the published `storefront_config`, so no
  redeploy needed to change them). It sits alone at the very bottom of the
  homepage footer; the brand sign-off (`fCreed`, `.footer-cred`) opens the
  footer above the contact columns, set off by a hairline and deliberately not
  `.small` so the two never read as one block of fine print, and
- an **Email the developer** row in the backoffice **More → About** card.

Each listed address is a tappable `mailto:` link. `sync.js` syncs `developer`
with the same absent-guard as the wish list, so a phone that never sets it can't
wipe another phone's value.

**Software wish list → email.** Adding a wish on the More screen emails the
developer the **full wish list** — every wish, ticked `[✓]` or not, newest
first, with the engine version, the project URL (`https://jienluv2bake.com.my`)
and the date/time. The message is built by the pure `admin/js/devmail.js`
(`buildWishMail`, unit-tested); when the app is signed in to Supabase it POSTs
to the `wish-mail` Edge Function with the session token, which relays it via
Resend to every listed address (capped at 5). Until that service is live the
wish card always shows an **Email the full wish list** row that opens the same
message in the owner's own mail app — so the list always reaches the developer,
nothing ever blocks on setup.

**One-time setup for automatic email (developer side, ~10 min, no code):**
1. Create a free [Resend](https://resend.com) account and verify a sending
   domain — a DNS TXT record for `jienluv2bake.com.my` (a `send.` subdomain
   keeps the main domain's mail untouched).
2. `supabase functions secrets set RESEND_API_KEY <key>`
3. Optional `RESEND_FROM "Name <wishlist@send.jienluv2bake.com.my>"` (defaults
   to `wishlist@send.jienluv2bake.com.my` — the Resend-verified domain).
4. `supabase functions deploy wish-mail`

The function is `supabase/functions/wish-mail/index.ts`; it validates the owner
JWT before sending, so it only ever relays for a signed-in app.

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

## Homepage photos are real files, not inline data

`index.html` used to carry its six photos as **inline base64** — the JPEG bytes
pasted straight into the HTML, which made the page **249 KB before a single
image had even been requested**, all of it re-sent on every visit and unable to
be cached separately. They now live in `img/` as six ordinary files
(`hero.jpg`, `focaccia.jpg`, `italian-pesto-ham.jpg`, `croissant.jpg`,
`mushroom-egg.jpg`, `vegetarian-pie.jpg`) and `index.html` is **22.7 KB**.

The bytes are unchanged — the files were extracted from the inline data, not
re-encoded, so the homepage looks exactly as it did. Every `<img>` carries its
`width`/`height`, so the browser reserves the right space and nothing shifts as
the files arrive; the hero loads eagerly and the five product photos below the
fold are `loading="lazy" decoding="async"`. The inline SVG favicon was left
alone (a data URI there is a feature, not weight).

## Homepage customer reviews (Supabase)

The homepage (repo root `index.html`) carries a **What customers say** section:
the reviews the baker has approved — shown one at a time as a swipeable,
auto-advancing carousel (arrows + dots, pauses on hover) — plus a form any
visitor can fill in: name, a 1–5 star tap rating, a message in
English / 中文 / Bahasa Malaysia, and an optional photo attached two ways —
**Take photo** opens the camera, **Choose photo** opens the gallery. Reviews
live only on the homepage, never the order page. The homepage and storefront
share the trilingual site system described below.

- A review is posted to a `reviews` table with `published = false` (public
  anon insert, like `incoming_orders`). Unpublished rows are invisible to
  anonymous readers — a `published = eq.false` query returns nothing.
- **The baker approves every review first** (nothing public without her tap):
  backoffice → **More → Reviews** lists new ones under *Waiting for you* with
  the name, stars, message, language, date and photo; **Publish** shows it on
  the homepage, **Take down** hides it again, **Delete** removes it for good.
- Photos upload to the public `review-photos` Storage bucket via the anon key.
  Either photo button shrinks the picture first (`shrinkReviewPhoto`): the
  longest side goes to **1000px** as JPEG q0.82, and a photo already ≤500 KB and
  ≤1000px is passed through untouched. The homepage card caps a photo at 340px
  tall, so 1000px still has detail to spare on a 2x screen — a typical phone
  photo lands around 50–65 KB instead of 150–280 KB. (Lowering this from 1600px
  affects only new uploads; photos already in the bucket keep their size.)
- A review photo is fetched **only when its slide is the one being shown** (or
  the next one). `reviewCard` parks the URL in `data-src` rather than `src`, and
  `loadPhoto` promotes it — called for the starting slide and for slide `i` and
  `i + 1` from the carousel's `move()`, plus immediately when there is only one
  review. A naive `loading="lazy"` is not an option here: the slides are laid
  out side by side on a `translateX` track, so a lazy photo would pop in as the
  carousel auto-advances. The one-slide lookahead means the next photo is
  decoded well before it slides in. This is why a visitor who never waits
  through the carousel no longer downloads every published photo up front.

**One-time setup:** run `supabase/reviews.sql` in the SQL editor (adds the
`reviews` table + RLS and the `review-photos` Storage bucket + policies).

## Service workers (and the old root one)

There are two service-worker files, and only one of them is the app's:

- **`admin/sw.js`** — the backoffice's offline app shell, scope `/admin/`. It is
  network-first so a phone gets fresh code when it's online, and falls back to
  its cache when it isn't.
- **`sw.js`** at the repo root — **not the app's worker.** Before the backoffice
  moved to `/admin/`, the app was served from the root and registered a worker
  from this exact URL. That old worker cached the whole site and answered *any*
  failed request with `caches.match(req) || caches.match("./index.html")`, which
  hands the homepage HTML to a request for a `.js` file; the browser then runs a
  web page as JavaScript and the module never executes. On the homepage that
  showed up as a page stuck in English whose **EN 中文 BM** buttons did nothing,
  because `home.js` — the script that binds them — never ran. A worker updates
  by re-fetching its own URL, so putting a *cleanup* script at that URL is what
  evicts it: any phone still carrying the old worker fetches it on the next
  visit, it deletes every cache except `bakeadmin-admin-v1` (the backoffice
  needs its own to open offline) and unregisters itself. It registers **no**
  fetch handler, so it can never serve anything. Keep it in the repo — a phone
  that has been in a drawer for months still needs it. The homepage's head
  script nudges an existing root registration to update (`r.update()`, falling
  back to `r.unregister()`); the homepage itself must **never** register a
  worker of its own, since a root-scoped one covers the store and `/admin/` too.

The admin worker's fallback is guarded to the same end: only a navigation
(`req.mode === "navigate"`) may fall back to `./index.html`. A failed script,
stylesheet or image is left to fail as itself. `test/service-worker.test.js`
runs both real worker scripts in a stand-in worker scope and asserts the
response to a failure, so this cannot silently regress.

## An order is a record of a sale (price + name snapshot)

An order row is not a pointer to a product — it is a record of what was sold and
what it was sold for. Every order carries a **frozen `productName` + `unitPrice`**
written at the moment it is taken: when the storefront cart is imported
(`importIncoming` keeps the shop's own `line.price`, not the backoffice menu
price), when an order is typed in by hand, and when an edit swaps a line to a
different product (an untouched line keeps its old price). Every reader — the
WhatsApp confirmation (`confirm.js`), the payment reminder (`messages.js`), the
customer's **track page** (`trackingSnapshot`), lifetime spend (`customers.js`),
the Home estimate and the weekly numbers (`weekly.js`) — reads through
`orderLineName` / `orderLinePrice` (`state.js`), which prefer the snapshot and
fall back to the live product only for orders saved before this.

So renaming or re-pricing a product changes the shop, never history: last
month's order still reads the price that customer paid, and a deleted product
still shows what it was that someone bought. `orderLinePrice` returns **null**
(not 0) when nothing is known, so "free" and "unknown" stay distinguishable and
`unpriced` flags still work. The one deliberate exception: the **favourite
product** stat and the "what to bake" list stay on today's product name, because
those answer an operational question ("what do I bake for them"), not a
historical one.

Existing orders are stamped once by the `migratedV70` catch-up in `app.js` with
today's values — exactly what they were already displaying — so they stop
drifting. A line whose product is gone, or has no price, is left alone rather
than guessed at. No SQL — the fields live on order rows and sync/export/import
wholesale.

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
  method/address, and your TNG QR to pay. Their track page shows the **same
  journey map as your app**: Confirmed turns green only when you press Send
  confirmation, and Paid only when you press Paid — each press re-publishes the
  order so their map moves with yours.
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

### "Not sharing right now" strip

Whenever a phone is *not* on the shared cloud — shared data turned off, the
phone never set up, or signed out — a thin amber strip sits at the very top of
every screen: **"⚠ Not sharing right now"**, with a one-line reason and a **Fix
it** tap that jumps to More → Settings → Shared data. The strip does not lock
the app (unlike the app password) — she can keep working — and it disappears on
its own the moment the phone is sharing again, without a reload. A phone that is
off the cloud still makes and keeps its own local backups.

## Cloud backups (Supabase)

A real safety net behind the sync mirror. Shared data holds only the *current*
state; cloud backups hold **history** — a dated copy of everything she can step
back to. Every time she opens the app while signed in, it quietly saves a full
snapshot of the backoffice (orders, products, ingredients, POs, credits, the
delivery calendar, storefront copy) to her own Supabase cloud:

| Copy | When it saves | Kept |
| --- | --- | --- |
| Daily | the first time the app opens each day | newest 7 |
| Weekly | the first Monday of each week the app opens | newest 4 |
| Monthly | the first time the app opens on the 1st | newest 3 |
| Manual | the "Back up to cloud now" button, and one "Before restore" copy saved before every restore | until she deletes it |

The retention prune keeps the table small; older automatic copies are dropped,
manual ones stay. Everything lives under **More → Settings → Backup & safety**
(the existing card, renamed). Each listed copy can be:

- **View** — a read-only look inside that one copy: its orders grouped by
  delivery date (customer, product, quantity, status), the product price list,
  and ingredient stock at that time, plus how many suppliers/units/POs/credits
  it held. Nothing is ever written — confirming a June price moves nothing today.
- **Restore** — steps her phone back to that copy, then the sync engine rewinds
  the shared cloud and her other phone to match (records that only exist after
  the copy are seen as removed and stay removed). A **"Before restore" copy is
  saved first**, so a restore is never one-way. Like any sync, it is still
  last-write-wins at the record level: a change another phone makes *after* the
  restore and syncs will win back over that record — a step back, not a
  delete-the-future.
- **Download** — saves a real file named
  `jienluv2bake-backup-2026-09-08-daily.json` (date + kind). Downloads use the
  same envelope as Export, so they **re-import through file Import** too.
- **Delete** — removes that one copy (the owner's choice; nothing is ever
  pruned automatically after a manual keep).

A copy is the same coverage as an Export file **minus the per-device settings**
(`settings.supabase`, `.cloud` and `.lock`) — the app-login email/password and
the app password never leave the phone, so restoring on another phone keeps
that phone's own sign-in, cloud switch and lock. The "Back up to cloud now"
button and the daily guard marker make the automatic cadence silent: an offline
day is skipped, not retried in a loop, and the next open on a new day tries
again.

**One-time setup:** run `supabase/backups.sql` in the SQL editor (adds the
`backup_snapshots` table + row-level security: only signed-in bakers can read or
write copies).

## Customers tab, profiles, finder & the wish list

**Customers** is a tab of its own (swapped with Purchase Order, which now lives
under **More**). It is the automatic customer book — one row per person with
their order count, rough spend, favourite product and last order — and it adds:

- **Finder** — type 2+ characters (name, WhatsApp number, a dog's name, a like,
  a note, a favourite product) and the list narrows live with "N of M match",
  the same way "Find an order" works on Orders.
- **Profiles** — tap a person and their history pop-up leads with a **profile
  card**. Edit (or "Add details") opens a form: name, WhatsApp, the dog's name,
  a **photo** (shrunk to a small ~200px thumb before saving, by `js/photo.js`),
  what they like, what to avoid, and a note. The **name and WhatsApp number are
  held once and kept in step**: saving them on the card writes them onto every
  order that person has, and fixing them with Edit on an order writes them back
  onto the card — either place works, and whichever was edited last is what
  labels, WhatsApp messages and the customer list show. Profiles live in a synced `customers` collection (`js/profiles.js`),
  keyed by the same trimmed/lowercased WhatsApp-or-name rule the customer rows
  use, so they ride shared data to both phones — a foundation for a future AI
  chat. Photos stay thumb-sized on purpose: the whole app state lives in one
  ~5 MB localStorage key.
- **Software wish list** (bottom of More) — behaves like the weekly to-do: add
  a feature you'd like, tick the ones that come true (ticks persist — never
  reset weekly), reword or remove. Stored lazily in `settings.wishList`
  (`js/wishlist.js`) with the same sync absence-guard as the to-do tasks, so a
  phone that never opens it can't wipe another phone's list.

A small green **Engine v##** pill on the More screen shows which build a phone
runs, and **Full change history** links to `changelog.pdf` at the root of the
site — a PDF of every version from v54, built from `CHANGELOG.md` by
`marketing/build_changelog.py`. No SQL was needed for any of this.

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
anyone, so the storefront can show them), **Shared data** mirrors the full
backoffice data with **row-level security: only signed-in bakers can read or
write it**, and **Cloud backups** stores dated snapshot copies under the same
row-level security (signed-in bakers only). Backup files and the app login
password are stored in the app's local storage on her phone.

## Tests

```bash
node --test test/*.test.js
```

Tests cover the pure modules (`admin/js/bom.js`, `admin/js/dates.js`), the sync
engine (`admin/js/sync.js`), the app bootstrap + sign-in gate
(`admin/js/app.js`), and the storefront (`store/app.js`).

## Files

```
changelog.pdf       full change history (every version from v54, PDF) — root of the site
index.html          public homepage (domain root)
img/                the homepage's own photos (hero + the five product shots)
i18n.js             shared EN/中文/BM loader + nameFor + applyTo (homepage + store)
home-lang.js        homepage UI strings, one dictionary per language
store-lang.js       storefront UI strings, one dictionary per language
home.js             homepage logic (reads the published storefront config for the footer credit)
reviews.js          homepage review form + photo (Take/Choose) + carousel + thank-you
sw.js               one-time cleanup worker at the SITE ROOT — evicts the old
                    root-scoped worker and its caches, then removes itself
                    (NOT the app's worker — that is admin/sw.js)
store/index.html    customer order page (/store/)
store/app.css       storefront styling
store/app.js        storefront logic + order intake + availability + published config
store/config.js     fallback bakery name, WhatsApp, menu, days, supabase (overridden by backoffice Settings → Storefront)

admin/ — backoffice app (/admin/):
  index.html          entry (bottom nav shell)
  css/app.css         backoffice styling
  css/print.css       prints only the PO card
  js/state.js         schema, localStorage load/save, ids, formatting, order-line snapshot
  js/dates.js         delivery dates, cut-off, countdown (pure)
  js/bom.js           BOM explosion, costs, capacity (pure)
  js/supabase.js      live availability + storefront config publish, order intake
  js/sync.js          shared-data sync engine (queue, pull-then-flush, conflict)
  js/backups.js       cloud backups (auto daily/weekly/monthly snapshots, restore)
  js/sharewarn.js     "Not sharing right now" amber strip (top of every screen)
  js/validate.js      import-file validation
  js/ui.js            DOM builder + shared render helpers
  js/wishlist.js      software wish list on More (lazy settings.wishList CRUD)
  js/profiles.js      customer profiles (join to the customer rows, pure)
  js/photo.js         shrinks a picked photo to a small thumb (browser only)
  js/devmail.js       wish-list email builder + developer contact readers (mailto / Edge-Function send)
  js/app.js           hash router + bootstrap + shared-data gate
  js/views/*          one module per screen (login.js is the sign-in gate)
  sw.js               service worker — offline app shell (/admin/ scope);
                      only a navigation falls back to the cached index.html
  manifest.webmanifest PWA manifest for the backoffice

supabase/availability.sql   run once in Supabase SQL editor (public slots)
supabase/backoffice.sql     run once in Supabase SQL editor (shared data, RLS)
supabase/backups.sql        run once in Supabase SQL editor (cloud backup snapshots, RLS)
supabase/storefront.sql     run once in Supabase SQL editor (storefront config + order intake)
supabase/reviews.sql        run once in Supabase SQL editor (homepage reviews + photo bucket)
supabase/tracking.sql       run once in Supabase SQL editor (order tracking)
supabase/functions/wish-mail/index.ts   Edge Function (Deno) — emails the full wish list via Resend
test/               node --test suites (import from admin/js, store/ and the homepage)
```
