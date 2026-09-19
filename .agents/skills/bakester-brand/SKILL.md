---
name: bakester-brand
description: The Jien Luv 2 Bake brand reference — palette, type, voice, products, prices and the standing facts (bake days, cut-off, collection, delivery, contact). Use whenever making anything on-brand for this bakery: posters, social captions, Instagram or WhatsApp graphics, homepage or order-page copy, flyers, menu cards, print pieces, or PDFs. Also use when checking whether existing material is on-brand, or when writing customer-facing copy in English, Chinese or Bahasa Malaysia.
---

# Jien Luv 2 Bake — the brand

Home bakery, **Penang, Malaysia**. Small-batch focaccia, focaccia sandwiches, croissants and
vegetarian pies, sold **pre-order only**. Owner is a non-technical baker; she deploys the site
herself and test-drives every change on her phone.

## The one rule that matters most

**Take brand facts from `index.html` at the repo root — never from `store/config.js`.**

`store/config.js` is a **placeholder seed** that is overwritten at runtime by the settings the
app publishes from her own phone. Its values are fake: `whatsapp: "60123456789"`, `Focaccia
price: 15`, `Sandwich`, tagline "Home-made focaccia & sandwiches, Penang". None of that is real.

`index.html` is the brand of record — the palette, type, voice, creed and the public facts all
come from it. **Read it fresh** every time; it does change.

**One caveat on prices specifically.** The homepage is the *public statement* of the brand, but
the shop a customer actually orders from runs on the settings she publishes from her own phone.
The two can drift apart (the homepage may still show a launch-intent price after she has changed
the real one). So a homepage price is the right basis for a **poster or a caption** — that is
what she wants the world to read — but if a homepage price and the live shop ever disagree, or
you are unsure, **say so and ask** rather than picking one silently. Never invent a price at all.

## Identity

| | |
|---|---|
| **Name** | Jien Luv 2 Bake (also written `jienluv2bake` — lowercase, no spaces, for handles and domains) |
| **Creed** | Jien Luv 2 Bake \| Small Batch. Big Love. ♡ |
| **Kicker** | SMALL BATCH BAKERY |
| **Tagline** | Freshly baked. Made with love. ♡ |
| **What it does** | Freshly baked small-batch focaccia, sandwiches, croissants and vegetarian pies in Penang |
| **Website** | jienluv2bake.com.my |
| **Order** | jienluv2bake.com.my/store/ |
| **WhatsApp** | +6016 960 1268 (`wa.me/60169601268`) |
| **Instagram** | [@jienluv2bake](https://instagram.com/jienluv2bake) |

The creed is the closest thing to a slogan and it appears verbatim in the site footer. Reuse it
rather than inventing a new one.

## Voice

Warm, plain, unhurried. Short sentences. Never salesy, never corporate — this is one person's
kitchen, and the copy sounds like it. Two habits are load-bearing:

- **The ♡ appears often**, usually ending a line: "Order confirmed upon payment ♡", "You bake our
  day! ♡". It is the brand's signature, not decoration. Use it — but once or twice per piece, at
  line ends, never mid-sentence.
- **Lowercase warmth in body copy, CAPS for labels.** Section titles, product names and buttons
  are uppercase with wide letter-spacing ("OUR BAKES", "PRE-ORDER ONLY"). Prose underneath is
  ordinary sentence case.

Avoid: exclamation stacking, "deliciousness", "elevate", "artisanal", urgency tactics ("last
chance!"), and anything that implies a big operation. It says "our little kitchen" and means it.

## Colour — there are TWO systems, and mixing them is the usual mistake

**The brand (website, social, posters, print): olive green.**
This is what `index.html` uses, and it is the public face. Use this for anything a customer or a
stranger sees.

| token | hex | use |
|---|---|---|
| `--green` | `#465d26` | primary — headings, buttons, the hero badge |
| `--green2` | `#5f713b` | lighter olive for secondary marks |
| `--brown` | `#4a2818` | body text |
| `--cream` | `#f7f0e5` | page background |
| `--paper` | `#fbf7ef` | cards on cream |
| `--line` | `#d7c6ad` | hairlines and borders |
| `--muted` | `#725d4d` | secondary text |
| `--red` | `#c7352d` | the one accent — the 6PM cut-off notice |
| footer | `#3d2a1d` | dark brown footer block |
| headline ink | `#3c1f12` | the h1, darker than body brown |

**The app (order page and back office): terracotta.**
The store and the admin app use a warmer brown-orange family — `#c4552f` primary, `#a84322`
dark, `#fbf4ea` background, `#fffdf9` surface. Use this **only** inside the app's own screens,
where it matches the surrounding interface. It is not the brand colour.

Rule of thumb: **a poster for Instagram is olive. A card inside the app is terracotta.**

## Type

A deliberate two-part pairing, worth preserving because it carries most of the personality:

- **Serif for prose and headlines** — `Georgia, "Times New Roman", serif`. This is what makes it
  read like a bakery rather than a startup. The hero's script line is the same serif in italic.
- **Sans for labels, prices and UI** — `Arial, sans-serif`, usually **bold** with wide
  letter-spacing (`0.08em`–`0.2em`) and uppercase.

Never set body prose in sans, and never set a price in serif. Prices sit in bold sans at a large
size — `28px` on the homepage — in `--green`.

## Products and prices

Read these from the `#bakes` section of `index.html`; the list below is a snapshot of
**18 September 2026** and must be re-checked before anything goes out:

| | size | price | state |
|---|---|---|---|
| FOCACCIA | 12" × 9" | RM20 | available |
| ITALIAN PESTO HAM | — | RM30 | available |
| MUSHROOM & EGG | — | RM16 | available |
| CROISSANT | — | RM8 | **COMING SOON** |
| VEGETARIAN PIE | — | RM12 | **COMING SOON** |

Sandwiches list their fillings as a short stack of lines separated by `•` — ham • pesto •
mozzarella, then a blank line, then one sentence of description. Follow that shape.

"COMING SOON" renders as a small separate tag beside the product name, not as part of it.

## The standing facts

- **Bake days: Tuesday, Thursday, Saturday.** (Homepage step 1.)
- **Cut-off: 6:00PM the day before baking day.** This is the single most quoted fact — it appears
  in the notice card and is given the brand's only red accent.
- **Collection: SG Ara** — "We will notify you when your order is ready for pick up."
- **Delivery: Lalamove, Penang Island only.** The fee is **borne by the customer**. Packed with
  care for a safe delivery.
- **Payment: order is confirmed upon payment.** Bank QR (TNG) goes in the WhatsApp message.
- **Trilingual**: English, Chinese (中文) and Bahasa Malaysia. Reviews are welcomed in all three.

> ⚠️ The app's own settings may disagree with the homepage on bake days — the homepage is what
> customers read, so treat it as the public truth, and if you see a real conflict, **say so**
> rather than silently picking one.

## Languages

The site ships all three. The real strings, for reuse:

| | English | 中文 | Bahasa Malaysia |
|---|---|---|---|
| Kicker | SMALL BATCH BAKERY | 小批量烘焙坊 | BAKERI SKALA KECIL |
| Tagline | Freshly baked. Made with love. ♡ | 新鲜出炉。用心手作。♡ | Baru dibakar. Dibuat dengan penuh kasih. ♡ |
| Creed | Small Batch. Big Love. ♡ | 小批量制作 · 满满的爱 ♡ | Bakar Kecil-Kecilan · Kasih Sayang Yang Besar ♡ |
| Pre-order | PRE-ORDER ONLY | 仅限预订 | TEMPOHAN SAHAJA |

Chinese uses the full-width middle dot `·` in the creed where English uses a full stop. Keep
that. **Reply to the owner in English** even when the copy is Chinese — that is a standing rule
of hers, not a brand matter.

## Assets

`img/` — `hero.jpg`, `focaccia.jpg`, `italian-pesto-ham.jpg`, `mushroom-egg.jpg`,
`croissant.jpg`, `vegetarian-pie.jpg`. Real photos of her own bakes; use these in preference to
stock, and never substitute an AI-generated image for one of her products.

Homepage product photos are square-ish crops with `object-fit: cover`; the hero image gets
`border-radius: 30px 30px 30px 4px` — three rounded corners and one square, which is a small
brand tell worth keeping.

## Making a poster

The recipe that already works, in order:

1. **Read `index.html` first** for the current palette and prices. Don't recall them.
2. Build it as a **self-contained HTML file** with the palette above and the Georgia/Arial
   pairing — one file, no external assets except `img/` photos. She views it in a browser and
   screenshots it, or prints to PDF. For a **reusable template** she'll keep editing herself,
   Canva is the better home, and the brand kit there should carry these exact hexes.
3. Size it for its destination: **1080×1350** for an Instagram feed post, **1080×1920** for a
   story or Reel cover. Set the cream background, never pure white.
4. Lead with the serif, label with the bold letterspaced sans. One red accent at most.
5. End on the creed or the tagline with the ♡.

## Checklist before anything ships

- [ ] Every price and product **read from `index.html`**, not remembered — and none invented.
      If a price looks off against what she says she charges, ask instead of printing it.
- [ ] Olive `#465d26`, not the app's terracotta `#c4552f` — unless it is literally inside the app.
- [ ] Serif prose, bold letterspaced sans labels.
- [ ] The ♡ appears at most twice, always at a line end.
- [ ] Bake days Tue/Thu/Sat and the 6PM cut-off stated correctly, or not at all.
- [ ] Contact is `+6016 960 1268` and `@jienluv2bake` — never the placeholder in `store/config.js`.
- [ ] Nothing that reads as a bigger operation than one person's kitchen.

## Never

- **Never invent a price, a product, a bake day or a shipping claim.** If it isn't in
  `index.html`, ask.
- **Never put the TNG payment QR on the homepage, the shop page or the track page.** It belongs
  in the WhatsApp message only — a standing decision of hers.
- **Never put the ntfy order-alert topic in anything public.** It is a password; it lives only in
  her guide and the local reference PDF.
- **Never paste the Supabase login password or the Resend API key anywhere**, including into
  chat. She types credentials herself.
- **Never write 中文 or emoji into a PDF built by `marketing/build_*.py`** — those use core
  Helvetica and must stay latin-1 safe. Write "Chinese" and "Bahasa Malaysia" as words.
- **Never auto-advance or auto-play anything in a customer-facing carousel.** She wants screens
  she decides, not a slideshow that moves under her.
