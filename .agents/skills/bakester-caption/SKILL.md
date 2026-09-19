---
name: bakester-caption
description: How to write social captions and customer messages in the Jien Luv 2 Bake voice — Instagram, Facebook, WhatsApp broadcast, review replies and launch posts, in English, Chinese and Bahasa Malaysia. Use whenever writing or rewriting anything a customer or follower reads as a caption or a message: Instagram or Facebook posts, stories, Reels captions, festival greetings, order reminders, reply templates, or the launch-post set. Also use to check an existing caption sounds like her before it goes out.
---

# Writing in the Jien Luv 2 Bake voice

**The canonical example set is `marketing/launch/launch-posts.md`** — six real posts in three
languages that she has read and approved. Read it before writing anything. Everything below is a
distillation of it, but that file is the ground truth: if this skill and that file disagree, that
file wins, and this skill should be corrected.

## The voice, in one line

**Warm, plain, unhurried, and small on purpose.** She is one person in a kitchen in SG Ara, and
the copy never pretends otherwise — "our little kitchen" is the signature phrase, and smallness
is the selling point, not something to apologise for.

## The caption shape

Every approved post follows this, and it should be followed:

```
<Line one — a short warm hook ending in ♡>

<One or two short sentences of context.>

<The detail: menu items, steps, or what's happening. Often a list.>

<A closing line, usually ♡, often thanking them.>

<Call to action — the link or the cut-off.>
```

Real openings, all four words or fewer plus the ♡:

- `Hello, Penang ♡`
- `Meet the bakes ♡`
- `Ordering is 5 easy steps ♡`
- `Small batch, big love ♡`
- `We are open ♡`
- `中秋节快乐 ♡`

## The rules that matter most

**1. Line one must stand alone.** Instagram cuts the caption at roughly **125 characters**, so for
most people the first line is the whole post. Every opening above works on its own. **The one
exception is a Chinese festival** — for Mid-Autumn or Chinese New Year, lead with 中文, because
her Chinese-speaking followers are the ones who will share it.

**2. One caption, three languages, in one post.** She has one Facebook Page and one Instagram,
so she cannot post in a single language. The order is **English, then 中文, then Bahasa
Malaysia**, in the same caption, separated by blank lines. Never split them into three posts and
never drop one.

**3. Only ♡.** The heart is her mark, at the end of a line, usually line one and often the last
line. Captions do **not** use 🎁 🎉 📅 or any other emoji — those appear on the shop web page, not
in her writing.

**4. Keep it short.** Five to eight short lines per language. Long captions are not her voice.

**5. No hard sell, no urgency.** The only pressure is the factual cut-off. Never "last chance",
"selling fast", "don't miss out", "limited time only". If quantities are genuinely limited she
says why — *"That is why we only take a limited number each day. Every tray gets the attention it
deserves."* Reason, not pressure.

**6. Sentences are plain.** Short, complete, no corporate words. Banned outright: "elevate",
"artisanal", "deliciousness", "indulge", "treat yourself", "handcrafted with passion".

## Her actual phrasing habits

Copy these; they are hers.

- **Em dash for a price or a description:** `Focaccia 12" × 9" — RM20`
- **Two-part description of a bake:** `Soft inside, golden outside.` · `Lovely on its own, better
  shared.`
- **Triads of flavour words:** `Herby, cheesy, savory.`
- **"baked the day you order it"** — the freshness claim, phrased exactly this way
- **"from our little kitchen in SG Ara"**
- **Direct address, second person:** `your bake day`, `the people you love`
- **A question to invite replies:** `Which one are you trying first?` · `Anda nak cuba yang mana
  dahulu?`
- **Gratitude to close:** `Thank you for supporting our small home bakery ♡`

## The three emoji surfaces — do not mix them up

This has been got wrong before, so be precise:

| surface | emoji | why |
|---|---|---|
| **Captions** (Instagram, Facebook) | **♡ only** | it is her mark; nothing else appears in the launch posts |
| **The shop web page** (`store-lang.js`) | 🎁 🎉 📅 📲 **are used** | the page already does this; leave it alone |
| **WhatsApp order messages** (`admin/js/confirm.js`, `messages.js`) | **NONE — plain ASCII** | deliberate: emoji have arrived as broken empty boxes on some customers' phones |

So: writing a caption → ♡. Writing or editing a WhatsApp order message → **no emoji at all**, and
do not "improve" those messages by adding one.

## Hashtags

Six to eight, at the end of the caption, never a wall:

```
#jienluv2bake #penangbakery #penangfood #focaccia #smallbatchbakery #sgara #penangisland #homesbakery
```

> `#homesbakery` reads like a typo for `#homebakery`. It is in her file, so **do not silently
> change it** — mention it and let her decide.

## The facts you may quote

Use only these, and **re-read `index.html` for prices before writing** — never recall them:

- Bake days **Tue / Thu / Sat**
- **Orders close 6 PM the day before the baking day.** (The one line that appears in almost every
  post.)
- Collection **SG Ara**, free · Delivery **Lalamove, Penang Island**, fee borne by the customer
- **Your order is confirmed once payment is made**
- Order link **https://jienluv2bake.com.my/store/**
- WhatsApp **+6016 960 1268** · Instagram **@jienluv2bake**

Do **not** invent a discount, a delivery promise, a new product, an opening date, or a closing
time. If a caption needs a fact that is not above or in `index.html`, ask her.

## The posting rhythm

Once open, three a week is plenty for one person — and this is her stated ceiling, not a target to
exceed:

- **Monday** — what is baking this week, and what is left
- **Wednesday** — a photo of the day's bakes, no selling, just showing
- **Friday or Saturday** — orders close 6 PM tonight for tomorrow's bake
- **Plus** one post per occasion that matters — the occasions in her app's Occasion catalog are
  the right list to work from

Mechanics she uses: post to the **Page and Instagram at once from Meta Business Suite**
(business.facebook.com), and **schedule in one sitting** rather than posting live.

## Photos

Always **her own photos** from `img/` (`focaccia.jpg`, `italian-pesto-ham.jpg`,
`mushroom-egg.jpg`, `croissant.jpg`, `vegetarian-pie.jpg`, `hero.jpg`). A real photo of a real bake
beats a stock or generated image every time — this is a home bakery, and that is the point. For
behind-the-scenes, **slightly imperfect photos do better than perfect ones**: dough, the tray going
in, her hands working it.

## Before a caption goes out

- [ ] Line one stands alone and ends in ♡ (or is 中文-first for a Chinese festival)
- [ ] English → 中文 → Bahasa Malaysia, all three, one caption
- [ ] Every price and bake day checked against `index.html`, none invented
- [ ] ♡ only — no other emoji
- [ ] Short: five to eight lines per language
- [ ] No urgency words, no corporate words
- [ ] 6-8 hashtags at the end
- [ ] Her own photo
- [ ] For a WhatsApp order message: **plain ASCII, no emoji at all**

## Never

- **Never write a caption in one language only** — she has no way to post that.
- **Never add emoji to the WhatsApp order messages**, and never edit `confirm.js` / `messages.js`
  copy for tone without being asked: those are functional, tested messages.
- **Never promise a date, a price or a discount she has not given.** She is pre-launch and
  deliberate about this.
- **Never write in a bigger voice than one person's kitchen.** No "we are a team", no "our
  bakery chain", no corporate plural.
