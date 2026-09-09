# Jienluv2bake — change history (v54 → v65)

What changed in each version of the backoffice app, newest first. Each version
number is the "Engine" you can see on the app's **More** screen, so you can
always tell which build a phone is running.

## v65 — Reviews preview + "waiting to publish" cue (9 Sep 2026)
More → **Reviews** now shows each review **exactly as customers see it** on the
homepage — the photo, the stars, the message, then the reviewer's name and the
language and date, in the same warm card. Reviews waiting for your **Publish**
come first, and a line at the very top of the screen says how many are waiting
("3 reviews waiting for you to publish"). The **Reviews** row on the **More**
menu shows how many are waiting too, and the app's **Home** screen gains a
"**N new review(s) to publish**" card that opens the Reviews screen in one tap —
so a new review is never left waiting unseen. No SQL this version.

## v64 — Review carousel, EN/中文/BM site, developer contact + wish email (9 Sep 2026)
The homepage **"What customers say"** reviews now play as a **carousel** — one
review fills the section at a time, then slides on every few seconds. Visitors
can swipe or use the ‹ › arrows and the dots below to move through them, and it
pauses while someone is reading. One review, or none, still shows simply.

The whole **homepage and storefront now read in English, 中文 or Bahasa
Malaysia** via an **EN 中文 BM** switch near the top of each page (English is
the default, and a visitor's choice is remembered next visit). Every product
can carry its own **translated shop names** — Products → Edit → **Shop names** —
so shoppers in 中文/BM see a proper translated name on the order page; a blank
box keeps the English name, which always stays the real name in the app,
labels and history.

The thank-you after sending a review is warmer and honest: it reassures the
sender that their review and photo reached the baker and will appear once
approved, and a critical review (3 stars or fewer) gets an extra line of
thanks for honest feedback. A reviewer now attaches their photo **two ways**:
**Take photo** (camera) or **Choose photo** (gallery).

Developer contact is now in the app: under More → Settings → **Website &
developer**, type the developer's name and one or more email addresses. A
small **Website by …** credit links from the bottom of the homepage, the
storefront footer and More → About (each address tappable). Add the
developer's optional **WhatsApp number** in the same card and that link opens
WhatsApp (Business) with a ready "Hi!" — message the developer straight from
the page — with the email links staying underneath. And adding a **software
wish** on the More screen emails the developer the **full wish list** — every
wish, ticked or not, newest first, with the app version, the project address
and the date — to every address you listed; an **Email the full wish list**
row on the card can send it from your own mail app too. No SQL this version.

## v63 — Customers tab, wish list, holidays fix (8 Sep 2026)
**Customers** is a real tab of its own, swapped with **Purchase Order** (now
under **More → Purchase Order**). The tab stays your automatic customer list —
who ordered, how much, their favourite — and now every person can carry a
**profile** (the **Edit** button in their history pop-up): their dog's name and a
small photo (auto-shrunk to a thumb), what they like, what to avoid, and a note.
Profiles save into a synced `customers` collection, so both phones know the same
people, and they build up quietly for a future AI chat about your customers. A
**finder** box at the top of the tab filters the list as you type — name,
number, dog's name, likes, notes — and says how many match, just like
"Find an order" on Orders. A saved profile shows as a paw or photo beside the
name and a small line under the row.

On **Home**, the "Upcoming holidays" card is fixed: it used to vanish whenever
nothing was marked on the Delivery calendar. It is now always there — up to
three marks at a glance, a scroll for any more, and a friendly empty state that
still opens the calendar so you can add days.

On **More**, a small green **Engine v63** pill (in the header card) shows which
build this phone runs, a **Software wish list** sits at the bottom and behaves
exactly like your to-do list (add, tick, reword, remove — a tick stays ticked
and never touches the weekly routine), and **Full change history** opens this
history as a PDF kept on your website. No SQL this version.

## v62 — "Not sharing" strip + read-only View (8 Sep 2026)
When a phone is not on the shared cloud — shared data off, never set up, or
signed out — a thin amber strip at the very top of every screen reads **"⚠ Not
sharing right now"** with a one-line reason and a **Fix it** tap straight to
Settings → Shared data. It never locks the app, and it disappears on its own the
moment sharing is back on. (Set up once per phone: no SQL — the shared-data
setup from v53 does everything.)

Also, every backup copy in Settings → **Backup & safety** now has a **View**
button: a purely read-only look inside that copy — its orders grouped by
delivery date (customer, product, quantity, status), the product price list and
ingredient stock at that time. Looking at a June price confirms the detail
without moving today: no rewind, nothing written, ever.

## v61 — Cloud backups (8 Sep 2026)
Every time the app opens while signed in, it quietly saves a full **Daily**
copy (first open each day), a **Weekly** copy (Mondays) and a **Monthly** copy
(the 1st) to your own Supabase cloud, keeping the newest 7 daily / 4 weekly /
3 monthly. A "Back up to cloud now" button, and one "Before restore" copy
saved before every restore, stay until you delete them. Each copy can be
**Restored** (steps the phone — and the shared cloud — back to that copy; a
"Before restore" copy is always saved first, so it is never one-way),
**Downloaded** as `jienluv2bake-backup-YYYY-MM-DD-KIND.json` (which re-imports
like an Export), or **Deleted**. Lives under More → Settings → "Backup &
safety". The copies never contain the per-phone app-login email/password or
the app password. Setup: run `supabase/backups.sql` once.

## v60 — Homepage customer reviews (8 Sep 2026)
Customers can leave a **What customers say** review on the homepage — name,
1–5 stars, a message in English / 中文 / Bahasa Malaysia, and an optional
photo. Every review lands *unpublished* in More → Reviews, where **Publish**
shows it on the homepage, **Take down** hides it, and **Delete** removes it —
nothing becomes public until you tap Publish. Reviews appear on the homepage
only. Setup: run `supabase/reviews.sql` once.

## v59 — Occasion import tidy-up (8 Sep 2026)
Added **World Animal Day** (4 Oct) to the fun/pet-day import, plus
whole-group ticking — tick a heading box, or use **Untick all / Tick all**.

## v58 — Occasion import (8 Sep 2026)
A one-tap **＋ Add occasion** import of Malaysia's days plus fun days (pet,
baking, kindness), and a **My own day** quick-add.

## v57 — Private notes per product ingredient (8 Sep 2026)
Each ingredient line in a product can carry a short private description *for
that product only* (e.g. which flour that product uses). Typed and seen on the
Products screens only — never on the shop, a label, or the product cards.

## v56 — "Keep at least" reserve (8 Sep 2026)
Ingredients can set a **Keep at least** level. The order list tops an
ingredient back up to that level in whole packs when your stock drops more
than 10% under it, and low items ride along even when today's bakes don't use
them. The Ingredients screen shows a red low-stock strip. Guide synced to v56.

## v55 — Time & length units (7 Sep 2026)
**min/hr** and **cm/m** are pre-loaded in Units (under More), like g/kg — so
bake times and pan sizes can be measured and converted (1 hr = 60 min,
1 m = 100 cm). Baking stock is guarded so a time or length unit can never
distort a gram count.

## v54 — Ingredients on hand (7 Sep 2026)
Ingredients now have **On hand** stock. The PO buys only what you don't have
(rows you already have drop out), "Bought" on a saved list adds its packs
once, and marking an order **Baked** subtracts its ingredients (undo restores
them).

---

*This history covers the two-phone cloud era (v54+). Earlier versions
(pre-v54) were never recorded version by version, so they are not listed here
rather than invented. Each new version is added here as it ships.*
