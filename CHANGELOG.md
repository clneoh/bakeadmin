# Jienluv2bake — change history (v54 → v73)

What changed in each version of the backoffice app, newest first. Each version
number is the "Engine" you can see on the app's **More** screen, so you can
always tell which build a phone is running.

**12 Sep 2026 — engine v73 (no database setup needed).** Five changes, all about
the shop's promise to the customer and the baker's control over it.

Your rule is that an order is **not cancellable and money is not refunded, but it
can be moved to another day**, and a customer may ask until a set number of days
before delivery. That number now lives **per product**. Open a product in
**Products** and, under its daily limit, a new box **"Changes or cancellations
(days before delivery)"** — type 2, say, and that product's card on the shop
reads **"Change or cancel up to 2 days before delivery."** It only ever *tells*
the customer; it never blocks you, and you still move any order by hand. Leave it
blank (or 0) and no note shows for that product. When one order holds several
products with different numbers, the customer sees the **strictest** one — the
largest, i.e. the earliest cut-off — so a mixed basket always gives one clear
figure. The same sentence appears on the green **"Order received!"** card just
after they place the order.

Second, **you can now move an order to another delivery day in the app.** Open an
order with **Edit** and, in the pop-up, a new **"Delivery day"** box lists every
day still to come, soonest first. Pick the new day and **Save changes**: the
whole order moves as one — items, customer and the price it was sold at all stay
put — and the customer's **"Track your order"** page follows to the new day
straight away. Under the box are quiet notes to help you decide: the order's own
change/cancel window, a reminder when the new day falls **inside** it, a note if
that day's orders have already closed, and a note if that day does not have
enough left for an item. None of them stop you — they only tell you — and the
capacity check now counts the order on the **new** day, so you can see at once if
that day would go over. This is the **only** way to change an order's day: never
delete an order and re-type it, because deleting reads as a cancellation. A day
left empty stays in your list — to remove it, use **Del** on the Deliveries
screen as before.

Third, **a Policies box** for your own cancellation and refund wording. It sits
in **More → Settings → Storefront**. Type it once in English, tap **Translate**,
and the 中文 and Bahasa Malaysia boxes are filled for you (edit either and it
becomes yours). It appears on the shop **under Track your order**, in the
customer's own language and with the line breaks you typed, and it stays hidden
until you write something.

Fourth, and everywhere in the app: **an empty box showing a greyed suggestion can
now be accepted with one tap — the arrow.** A small right-arrow sits at the right
edge of such boxes; press the **right-arrow key** or tap that arrow and the
suggestion drops in as real text you can edit — the same gesture as accepting a
suggestion in an AI chat. It is offered only where the grey text is a genuine
recommendation; the sign-in and cloud boxes never offer it, so a made-up key or
password can never be accepted by accident.

No database setup and no new SQL — the new product box and the Policies wording
travel with your existing shared data.

**9 Sep 2026 — the wish list's automatic email went live (no new engine; the
phones did not change).** Adding a wish on **More → Software wish list** now
emails the **full wish list** — every wish, ticked or not, newest first, with
the app version and the date — to the developer address(es) you set under
Settings → **Website & developer**, all on its own, whenever the phone is signed
in and sharing data. Before today that automatic email needed a behind-the-scenes
service that was not switched on yet, so only the **"Email the full wish list"**
row sent it by hand; that row is still there as a backup any time.

**10 Sep 2026 — the homepage opens faster (no new engine; the phones did not
change).** Two things about the public homepage were quietly costing every
visitor time, and both are fixed.

The homepage's six photographs were stored *inside* the page itself, so the
page was **249 KB before a single picture had even been asked for** — and every
visitor downloaded all of it, on every visit, before they could see anything.
The photos are now six separate files that the browser fetches and **keeps for
next time**, which brings the page itself down to **22.7 KB**. The pictures are
byte-for-byte the same ones, so the homepage looks exactly as it did, and each
one now states its size up front so nothing jumps around as the page loads.

Second, the "What customers say" section used to fetch **every published review
photo up front** — including the reviews a visitor never waited around to see.
A photo is now fetched **as its review comes around**, one step ahead of time so
it is ready before it slides in, and the reviews a visitor never reaches are
never downloaded at all. On a phone that means less data and a quicker page,
and it changes nothing about how the section looks or behaves.

A review photo is also shrunk a little harder before it is stored — to 1000
pixels across instead of 1600. The card on the homepage shows a picture no more
than 340 pixels high, so the smaller copy looks just as sharp while being about
**a third of the size**, which is kinder to the customer's mobile data and keeps
your stored photos light. This applies to photos left from now on; the reviews
already on your page keep the picture they were stored with.

Your sign-off line — **Jien Luv 2 Bake | Small Batch. Big Love. ♡** — has moved
from the very bottom of the homepage footer, where it sat shoulder to shoulder
with the developer credit, up to the **top of the footer**, above your contact
details and set off by a thin line. It reads a touch larger now, and in
whichever language the visitor has chosen, like the rest of the footer. The
"Website by …" credit stays where it was and now stands on its own.

**10 Sep 2026 — the homepage's language buttons can no longer go dead (no new
engine; the phones did not change).** On some phones the homepage's
**EN / 中文 / BM** buttons could stop responding — the page would sit in English
and tapping 中文 did nothing — often after the page had been left alone for a
while, or refreshed. The culprit was a leftover background worker from when the
backoffice was served from the top of the website instead of from /admin/. (A
background worker is the machinery the app installs so it can open without a
connection.) That old worker had cached the whole website, and whenever
something failed to download it answered with whatever it had — including
handing the browser **a web page where it had asked for a script**. A page that
receives a web page instead of its script never runs it, so the code that wires
up the language buttons never ran; the English words you saw are written into
the page itself, which is why the page still looked perfectly normal.

The old worker is now cleared away wherever it is still installed: a small
cleanup file sits at the same address the old worker used, so the next visit
replaces it, empties everything it had cached, and removes itself. The
backoffice's own offline cache is deliberately left untouched, because the app
needs it to open without a connection. The app's worker has also been taught,
for good, never to answer a script or a picture with a web page — so the same
fault cannot come back on any part of the site.

## v72 — The shop's sold-out notes read in the customer's language (10 Sep 2026)
The shop page switches language in place, but two corners of it had stayed
English no matter which language a visitor chose: the short note on a product
that **cannot be ordered for the chosen day** (that it only opens from a certain
date, only runs up to one, or that orders close so many days ahead — with the
date written in the page's language), and the notes that appear above the menu
when the page **has to change a basket** — an item that just sold out, or a
quantity trimmed to what is actually left.

Both now read in **English, 中文 or Bahasa Malaysia** along with everything else.
The reason a product is closed is now handed to the page as a plain fact — which
kind of rule, and the day or number of days behind it — and the page writes the
sentence itself, so no English can slip into a Chinese or Malay page. An English
visit is word for word what it was.

## v71 — The shop's 中文 / BM buttons answer instantly (10 Sep 2026)
On the shop page, tapping **EN / 中文 / BM** used to reload the whole page. That
re-downloaded the page and fetched the menu, the "left today" numbers and your
saved storefront settings all over again, so each tap sat there for a moment
before anything changed — and the slower the phone's connection, the longer the
wait. A reload could also wipe a basket that was already half filled.

Now the shop switches **in place**, exactly like the homepage already did: the
words change the moment you tap, and nothing is downloaded again. Whatever the
customer has already done is left untouched — the items in their basket, the
delivery day they picked, the name, WhatsApp number and address they typed — and
if they are looking up an order, that card re-reads in the new language too.
Nothing to set up.

## v70 — An order keeps the price it was sold at (10 Sep 2026)
Until now an order only remembered **which product** was bought, not what it cost
or what it was called. Everything — the amount on the customer's confirmation,
the total on their own "Track your order" page, their lifetime spend on the
customer list, the Home estimate — was worked out from **today's** menu. So the
moment you re-priced or renamed a product, every past order silently moved with
it: last month's order suddenly read RM22 instead of the RM15 the customer
actually paid, and a renamed loaf rewrote what people had already bought.

Now an order is a record of a sale. When an order comes in — from the shop or
typed in by hand — it keeps the **name and the price it was sold at**, and those
are what every message, the tracking page and the customer's spend use. Rename or
re-price a product today and yesterday's orders stay exactly as they were. A line
you deliberately swap to a different product when you **Edit** an order does pick
up that product's current price — that is a new sale — but a line you leave alone
keeps its old price.

Existing orders (taken before this version) are stamped once with today's values,
which is exactly what they are showing right now, so they stop drifting from here
on. Nothing to set up; the phones pick it up with the next sync.

## v69 — Either place updates the customer (10 Sep 2026)
Yesterday's fix put a customer's name and number back in one place — but it made
the **customer card** the side that always won, so if the card and an order
disagreed, the card's name was the one shown. That is no longer the rule: now it
is simply **whichever you edited last**. Correct a customer's name with **Edit**
on one of their orders and that is the name the list, the history pop-up and the
"Hi {name}!" greeting use; open their card, type the name and save, and the
card's is the one used. Either place updates the customer — neither is the boss.
They normally read the same anyway, because each save writes through to the
other side; this only decides the rare case where an old copy and a newer one
are both sitting there. Nothing to set up; the phones pick it up with the next
sync.

## v68 — One name and one number per customer (10 Sep 2026)
A customer's name and WhatsApp number used to be held in two places at once — on
their orders, and on their customer card — and the two did not always agree. If
you opened a customer and typed their name on their card, the customer list could
carry on showing the old one, because it read the name off the order. And
renaming someone who has **no WhatsApp number** on file could lose them: the name
is what ties a numberless customer to their history, so the new name slid off
their orders and appeared nowhere at all.

Now the name and number you save on a customer are the ones that count, and
fixing them once fixes them everywhere: saving their card writes the name and
number onto **every order they have**, so the labels, the WhatsApp messages and
the customer list all follow. It works the other way round too — correct a wrong
number with **Edit** on an order and that customer's card updates as well, so the
two can never drift apart again. Correcting a number carries that customer's
bring-a-friend credits across with it, and renaming someone who has no number no
longer loses them.

Leaving a box empty means "leave this as it is" — it never wipes a number your
confirmations depend on. And if you renamed anyone before today and it never
stuck, the app puts their orders right the first time this version opens. Engine
v68, guide v68.

## v67 — Naming a "No name" customer (10 Sep 2026)
A customer who reached you without a name — a storefront order that carried none
— used to stay **"No name"** in your customer book even after you opened them and
typed a name. Now it sticks: open them, tap **Add details**, type the name (and
the dog's name, what they like, and so on) and save, and their row shows that
name straight away — in the list, the finder and the 'Hi {name}!' WhatsApp
greeting. A tidy-up; nothing else about your customers changes. Engine v67,
guide v67.

## v66 — Auto-translate product text, plus Draft / Publish / Hidden states (9 Sep 2026)
Product **description, selling unit word** (the "RM15.00 / loaf" bit), **serving
tip** and now the **name itself** read in English, 中文 or Bahasa Malaysia
automatically — a free translator fills the 中文/BM boxes for you the first time
you save or publish a product. A small "auto" tag marks a machine translation;
if one "sounds weird", open the product's edit screen, type over that box (it
then becomes yours and is never overwritten), or tap a "Fill all 中文" /
"Fill all Bahasa Malaysia" button or the ↻ next to a single line to have it
translated again now. Good translations are simply left alone, and you never
hand-fill a whole product.

Products also gain a **third state**. A new product now starts as a **Draft** —
fully built with its recipe, but **not on the shop and not orderable** until you
**Publish** it. The Products screen shows **three separate lists**: **On the
shop**, **Draft — not on the shop yet** (each with a Publish button) and
**Hidden — taken down** (with an Unhide button). Hiding a product still keeps
its history, recipe and purchase orders.

The **"Copy follow-up"** bring-a-friend message gains a small **EN / 中文 / BM**
choice, so the whole check-in you paste into WhatsApp — including the product's
serving tip — can be in your customer's language. No SQL this version.

## v65 — Reviews preview + "waiting to publish" cue (9 Sep 2026)
More → **Reviews** now shows each review **exactly as customers see it** on the
homepage — the photo, the stars, the message, then the reviewer's name and the
language and date, in the same warm card — and they play **one at a time**, like
the homepage's "What customers say" carousel. The reviews waiting for your
**Publish** come first; once you have worked through them, the ones already on
the homepage follow. It never slides on by itself while you are deciding — a
swipe, the arrow buttons, or a dot under the card moves it on, and Publish /
Take down / Delete moves you straight to the next review. A line at the very
top of the screen says how many are waiting ("3 reviews waiting for you to
publish"). The **Reviews** row on the **More** menu shows how many are waiting
too, and the app's **Home** screen gains a "**N new review(s) to publish**" card
that opens the Reviews screen in one tap — so a new review is never left
waiting unseen. No SQL this version.

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
