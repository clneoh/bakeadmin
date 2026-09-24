---
name: bakester-web-creative
description: Best-practice craft for making anything visual for Jien Luv 2 Bake — the shop and homepage, the photos and fonts and video that go on them, and the posters, Instagram posts and WhatsApp graphics that carry the brand out into the world. Use when designing, laying out or reviewing a page or screen (spacing, type, colour, motion, mobile-first, accessibility, a pre-done checklist); when preparing, sizing, compressing, lazy-loading or budgeting any image, font, icon or video for the site; when checking page weight or Core Web Vitals; and when making or reviewing marketing creative for Instagram, WhatsApp, Facebook or print. Cross-references bakester-brand (the palette, type, voice, prices), bakester-photos (shooting and exporting the bakes), bakester-caption (the copy voice) and bakester-release (the shipping checklist) rather than repeating them.
---

# Making things for Jien Luv 2 Bake — design craft, asset delivery, marketing creative

Three subjects in one place because they are one job: **she is one person, with no build step,
making everything herself.** A design decision, a file format and a poster spec are the same
kind of decision — *what will this look like on a phone, and what will it cost to load.*

**Read [[bakester-brand]] first for any customer-facing work.** The palette, type, prices, voice
and standing facts live there, and the rule that matters: **brand facts come from `index.html` at
the repo root, never from `store/config.js`** (which is a fake placeholder seed). This skill is
the *how*; bakester-brand is the *what*.

**Where things run:** GitHub Pages, static, hand-written HTML/CSS/vanilla JS. **No build step, no
framework, no Tailwind, no CDN beyond GitHub Pages itself.** She deploys by dragging files into
GitHub Desktop. Anything needing a Node toolchain or a pipeline is not available to her — so
every recipe here must be runnable by hand, or by me, on this Mac.

**What this Mac has:** `ffmpeg` and Pillow (Python). **ffmpeg has no `drawtext` filter** — text on
an image is drawn with Pillow, never with ffmpeg. Instagram audio cannot be pulled down.

**The standing rule that outranks a tidy design (her instruction): do it by hand now, automate
when it becomes a chore** — and **never let a website rule block or hide a sale she takes by
hand.** A layout that is correct but refuses an order is worse than a layout that is plain.

---

# Part 1 — Design craft for her pages

Applies to `index.html`, everything under `/store/`, and the admin app under `/admin/`.

## 1.1 The two rules that catch the most

1. **Design at 375×812 first, widen second.** That is her phone. Every judgement — is the button
   reachable, is the text readable, does anything overflow — is made there, and only then checked
   at 1280×900. A design that is pleasant on the desktop and cramped on the phone is a failure.
2. **A control that does nothing reads as a bug.** Two rows that look alike must behave alike; a
   tap that cannot act must say why, in the place it was tapped, or look inert. This is her own
   standing complaint and it applies to pages exactly as it applies to the app.

## 1.2 Layout and responsiveness

Now safe to use in hand-written CSS with **no fallback** (all Baseline "widely available"):
`clamp()`, `aspect-ratio`, `min()`/`max()`, logical properties (`margin-inline`, `padding-block`,
`inset-inline-start`), container queries (size), `:has()`, subgrid, `dvh`/`svh`/`lvh`,
`text-wrap: balance`, CSS nesting (keep the `&`).

- **`100svh`, not `100vh`**, for a full-height hero — mobile browser chrome retracts and `100vh`
  jumps. Use `100dvh` only for a full-screen overlay that should track the toolbar.
- **Container queries, not viewport queries**, for anything that must adapt to the column it sits
  in (a product card in a grid changes its layout when the *grid* is narrow, regardless of
  screen). Declare `container-type: inline-size` on the parent.
- **`text-wrap: balance` on headings only** — it is capped at ~6 lines and misbehaves on long
  body copy. `text-wrap: pretty` on body copy is now broadly available.
- **Never `width: 100vw`** — it counts the scrollbar and creates horizontal scroll. Use `100%`.
- **Nowhere may scroll sideways at 320px.** Test with the longest real string (a full product
  name, a long delivery address), not with lorem.
- **Still not safe without a fallback:** CSS anchor positioning (Firefox trails in 2026) and
  **cross-document** View Transitions (`@view-transition { navigation: auto; }` — Firefox has
  not shipped it). Do not make either load-bearing. Same-document View Transitions are newly
  Baseline as of late 2025 and are fine as progressive enhancement — the page must work with the
  transition removed.

## 1.3 Type

- **Body 1rem / 16px minimum, never smaller.** Captions floor at 0.75rem. Fluidity must keep the
  rem term so browser zoom and user font-size settings still work:
  `font-size: clamp(1.25rem, 1.1rem + 0.8vw, 1.75rem)` — **never** a bare `vw` value.
- **Scale ratio 1.2 on a phone**, easing to 1.25–1.333 on wider screens.
- **Line-height:** body 1.6 on a phone (this is where food copy breathes), headings 1.1–1.25.
- **Line length 45–75 characters, target ~60–66ch.** `max-width: 65ch` on prose. Culinary copy
  is short and centred — do not let a paragraph run the full width of a wide screen.
- **One display face plus a system stack for the body** is the right shape here. The body stack
  costs nothing and cannot shift: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

## 1.4 Colour

- **Author in `oklch()`** (widely available), not HSL. Build the ramp by stepping **perceptual
  lightness evenly** — HSL *lightness* does not produce even steps and the mid-tones go muddy.
  Use `color-mix()` for tints and hover states rather than hand-picking greys.
- **The olive-green and terracotta come from `index.html` — read them fresh**, do not retype them
  from memory. bakester-brand holds the identity; the file holds the values.
- **Contrast: WCAG 2.2 is the standard to meet — 4.5:1 for body text, 3:1 for large text
  (≥24px, or ≥18.66px bold) and for UI edges, icons and focus rings.** APCA / WCAG 3 is a draft
  whose scoring algorithm is *still undecided* as of September 2026 — do not target it instead of
  2.2. Designing in OKLCH is what makes re-grading later cheap.
- **Design for outdoors, because her customers order from a phone in Penang daylight.** Raised
  ambient light crushes low-contrast grey: push body text toward **7:1**, and never pure
  `#fff` on pure `#000` (halation) — use something like `#1a1a1a`.
- **Dark mode:** declare `color-scheme: light dark` and define tokens once with
  `prefers-color-scheme` and/or `light-dark()`.

## 1.5 Motion

- **Honour `prefers-reduced-motion: reduce`** — drop transforms and parallax; at most a ≤200ms
  opacity crossfade, or nothing at all.
- **Durations that read as correct:** tap/hover feedback 100–150ms, dropdown 150–250ms,
  modal/drawer 200–300ms, page 250–400ms. **Never over 500ms** for a UI state.
- **Easings:** `cubic-bezier(0.2, 0, 0, 1)` or `ease-out` for entering, `ease-in` for leaving.
  Linear only for a progress bar. No bounce or elastic on a functional control.
- **Animate `transform` and `opacity` only** — those run on the compositor. Animating width,
  height, top or margin drops frames on her phone.
- **Never auto-advance a screen where she decides.** Her standing rule from the homepage carousel:
  "like the homepage" means the *whole* carousel UX — advance by hand, always.
- **A repaint must never move what she is looking at.** Any repaint, re-render or refresh leaves
  every scrolling box exactly where she left it — panes, lists, tables, both axes, each box by its
  own numbers. This is a stored standing rule; the worked example is the planner windows.

## 1.6 Accessibility — the enforced essentials

WCAG 2.2 (Recommendation, Oct 2023) is the contractual standard. The additions that actually get
missed:

- **2.5.8 Target Size (Minimum): 24×24 CSS px** is the AA floor — but **ship 44–48px** for
  anything a thumb hits. The app's own internal floor of 36px is a floor, not a target.
- **2.4.11 Focus Not Obscured** — a sticky header must never cover the element being focused.
- **2.5.7 Dragging Movements** — every drag needs a non-drag alternative (buttons or steppers).
- **3.2.6 Consistent Help** — help, WhatsApp link and contact sit in the same relative place on
  every page, so a returning customer does not have to hunt.
- **3.3.7 Redundant Entry** and **3.3.8 Accessible Authentication** — never make her type the same
  thing twice; **never put a password in a link or prefill an app-login field.**

And the hand-written-site mistakes that cost the most: placeholder used as a label or a `<label>`
not tied with `for`; status shown by colour alone; icon-only buttons with no `aria-label`;
a clickable `<div>` with no role, tabindex or keyboard handler; zoom disabled in the viewport meta
(`user-scalable=no`, `maximum-scale=1` — a WCAG failure); missing alt; autofocus stealing.

**`:focus-visible`** on everything interactive: a ring of at least 2px at 3:1 contrast against the
page. **Never `outline: none`** without a replacement.

## 1.7 The pre-done checklist — run it on every page, every time

1. Primary actions sit in the **bottom two-thirds** of a tall phone (thumb reach); nothing
   destructive in a top corner.
2. Targets 44–48px, hard floor 24px, with real spacing between neighbours.
3. Contrast ≥4.5:1 body, ≥3:1 large and UI — judged as if in daylight.
4. **No horizontal scroll at 320px**, tested with the longest real content.
5. Every input has an associated label; every error is named in words, not colour.
6. `prefers-reduced-motion` honoured; nothing auto-advances.
7. Dark mode declared; the piece still reads in both.
8. `:focus-visible` visible; the whole flow walkable by keyboard alone (Escape closes overlays,
   tab order is logical, there is a skip link).
9. Fonts preloaded with `swap`; every image has `width`/`height` or `aspect-ratio` (Part 2).
10. A print stylesheet where a customer might print it (menu, order confirmation): nav and
    buttons hidden, black on white, page breaks controlled.

**Then look at it on the phone, not the desktop.** If a change is observable in the browser, run
it and look — never report a page as done on the strength of the code alone.

---

# Part 2 — Delivering the creative assets

The budget below is what keeps a photo-led food site fast on a Penang mobile connection.

## 2.1 Page-weight budget

| Asset | Target |
|---|---|
| HTML | ≤50 KB (the homepage is at ~22 KB — keep it) |
| CSS | ≤30 KB |
| JS | ≤60 KB |
| LCP / hero image | ≤150 KB |
| Each gallery or product image | ≤120 KB |
| **Whole page** | **≤700 KB, target <500 KB** |

That budget is what fits an **LCP ≤2.5s on slow 4G**. Core Web Vitals thresholds in 2026 are
**unchanged: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1**, measured at the 75th percentile. FID was retired
in 2024; INP is the interactivity metric. No fourth metric is in the assessment.

## 2.2 Images

**Formats.** AVIF is at ~95% global support, WebP ~97%. AVIF is a further 20–30% smaller than
WebP at equal quality. **Default: one WebP ladder with `srcset` alone** — no wrapper, one set of
files to regenerate. **Add an AVIF `<source>` only for the hero and the heaviest gallery images**,
where the extra 20–30% pays for the extra files. **Keep a progressive q82 JPEG as the terminal
`<img src>` fallback** for the ~5% with neither.

**Widths.** `400 / 800 / 1200 / 1600`, plus `2000` only for a full-bleed hero. The rule: the
widest file is **2× the largest CSS pixel width** it is ever displayed at, and **never upscale
past the original**.

**`sizes="auto"` is not safe yet** — Safari does not support it (a long-standing open bug). Write
`sizes` by hand.

```html
<!-- hero: eager, high priority, preloaded -->
<picture>
  <source type="image/avif" sizes="100vw"
    srcset="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w">
  <img src="/img/hero-800.jpg" width="1600" height="1067" alt="Fresh focaccia, just out of the oven"
    sizes="100vw" fetchpriority="high" decoding="sync"
    srcset="/img/hero-800.jpg 800w, /img/hero-1600.jpg 1600w">
</picture>

<!-- below the fold: lazy -->
<img src="/img/focaccia-400.webp" width="800" height="800" alt="Rosemary focaccia, cut into squares"
  loading="lazy" decoding="async" sizes="(min-width:700px) 33vw, 100vw"
  srcset="/img/focaccia-400.webp 400w, /img/focaccia-800.webp 800w">
```

**Loading strategy — the three mistakes that matter:**
1. The LCP image gets `fetchpriority="high"` and **`loading="eager"`, never lazy**, plus
   `decoding="sync"`. Never combine `fetchpriority="high"` with `loading="lazy"`.
2. **Every** image carries `width`/`height` (or CSS `aspect-ratio`). This is the single biggest
   CLS fix and it costs nothing.
3. **Everything below the fold is `loading="lazy" decoding="async"`** — but do not lazy-load the
   hero, and never lazy-load above the fold generally: it delays the LCP element, breaks
   scroll-restoration on back-navigation, and lazy images without dimensions *cause* CLS.

**Never** use a CSS `background-image` for the hero — it is invisible to the preloader and to the
browser's format negotiation. The hero is an `<img>`.

Preload it too, before the stylesheet link:
```html
<link rel="preload" as="image" fetchpriority="high" href="/img/hero-800.avif"
  imagesrcset="/img/hero-800.avif 800w, /img/hero-1600.avif 1600w" imagesizes="100vw">
```

## 2.3 Fonts

**`font-display: swap` plus a metric-matched fallback** is the right default: text is visible
immediately and there is no visible reflow.

- **Preload** the one or two above-the-fold faces, and **`crossorigin` is required even
  same-origin** — fonts are CORS resources, and omitting it double-fetches.
- Put the preload **before** the CSS `<link>`.
- **A variable font beats static weights**: one ~48 KB request instead of six ~210 KB ones.
- **Subset it.** Latin subsetting with `pyftsubset` is typically 40–60% smaller.

```bash
pip install fonttools brotli
pyftsubset face.ttf --unicodes="U+0000-00FF,U+0131,U+2000-206F,U+20AC" \
  --flavor=woff2 --layout-features='*' --output-file=display.woff2
```

```html
<link rel="preload" href="/fonts/display.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/styles.css">
```
```css
@font-face { font-family: "Display"; src: url("/fonts/display.woff2") format("woff2-variations");
  font-weight: 400 800; font-display: swap; }
/* metric-matched fallback: makes the swap invisible */
@font-face { font-family: "Display Fallback"; src: local("Arial");
  size-adjust: 105%; ascent-override: 90%; descent-override: 22%; line-gap-override: 0%; }
h1, h2 { font-family: "Display", "Display Fallback", system-ui, sans-serif; }
```
Use `font-display: optional` only if zero CLS matters more than the face appearing at all on a
first visit — for a small brand site with one display face, `swap` is the better trade.

## 2.4 Video and short loops

Keep an ambient loop **5–10 seconds** (20s absolute maximum), never flashing faster than 3 times
per second (WCAG 2.3.1). `muted` and `playsinline` are **required** for iOS autoplay;
`preload="metadata"`, never `auto`. The poster frame **must be the first frame** and match the
video's dimensions — the poster is usually the LCP element, so give it `fetchpriority="high"`.

```html
<video autoplay muted loop playsinline preload="metadata" poster="/v/loop-poster.jpg"
  width="1080" height="1920" aria-hidden="true">
  <source src="/v/loop.mp4" type="video/mp4">
</video>
```

```bash
ffmpeg -i in.mov -an -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -vf scale=-2:720 loop.mp4
ffmpeg -i in.mov -ss 0 -frames:v 1 loop-poster.jpg
```

**Budget: a hero loop ≤2–3 MB; on a phone-first site aim ≤1.5 MB at 720p.** Animated AVIF/WebP
have **no streaming** — every frame downloads up front, so they are only good for a 3–10-frame
micro-animation. For anything longer, video wins on both bytes and memory.

## 2.5 The Mac workflow — from one phone photo to a full set

Run this (or have me run it) whenever a new photo goes on the site. **Keep the original**; write
into an `img/` staging folder; never overwrite a source photo.

```python
# make-images.py — one photo in, the whole ladder out
from PIL import Image
im = Image.open("photo.jpg").convert("RGB")      # .HEIC needs pillow-heif
for w in (400, 800, 1200, 1600):
    r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    r.save(f"out-{w}.webp", quality=80, method=6)
    r.save(f"out-{w}.jpg", quality=82, optimize=True, progressive=True)
    # r.save(f"out-{w}.avif", quality=60, speed=6)   # hero / heaviest images only
```

```bash
python3 make-images.py && ls -lh out-*
```

Check the result two ways: **the file sizes** against the budget in 2.1, and **in the browser** —
DevTools → Network at phone width, confirming the *correct* `srcset` file is the one fetched, then
a mobile Lighthouse run for LCP and CLS. **Measure; do not assume.** Screenshots and geometry in a
collapsed preview pane are garbage — a 0×0 viewport reports nothing real, and screenshots need
mobile emulation.

---

# Part 3 — Marketing and social creative

Specs current as of September 2026. **Part 3 owns the mechanics; [[bakester-photos]] owns the
shot and [[bakester-caption]] owns the words.** Read both before making a post.

## 3.1 Instagram

| Placement | Size |
|---|---|
| Feed portrait (default) | **1080 × 1350 (4:5)** |
| Feed square | 1080 × 1080 (1:1) |
| Feed landscape | 1080 × 566 (1.91:1) |
| Stories | 1080 × 1920 (9:16) |
| Reels | 1080 × 1920 (9:16), cover the same |

- **Carousels: every slide must match the first slide's ratio** — Instagram crops the rest to it.
  Adding any video forces the whole carousel to portrait.
- **The profile grid now crops tall, and it is disputed** — Instagram moved off square in early
  2025; the reported crop is 3:4 (1013 × 1350) with some tools saying 4:5. **Consequence that
  matters either way: keep the text and the hero subject inside the central square**, so no grid
  crop or feed crop can eat them. This is the single most useful layout rule for her grid.
- **Export at 2160px wide, not 1080** — it survives re-compression. Burned-in text should be
  exported at 2× the display size so it stays crisp. Reels: MP4/MOV, H.264, 30fps, 5–8 Mbps.

## 3.2 Safe zones and how much text

- **Stories and Reels:** reserve **~250px at the top** (username, audio pill) and **~250–350px at
  the bottom** (caption, share row, audio credit). The true safe band is roughly the
  **central 1080 × 1320–1620px**.
- **Minimum in-image text on a 1080-wide canvas:** body and small print **≥36–48px**; headlines
  **≥90–120px**. The test that never lies: **shrink the artwork to 20%; if you cannot read it,
  neither can a phone.** Read it back on the actual phone before posting.
- **Reel cover: ≤6–8 words.** It is a thumbnail, not a poster. **A Story: one headline line plus
  one call to action, maximum** — four lines of text sit in the bottom band and are half covered.

## 3.3 WhatsApp — her main order channel

- **Chat photos are compressed hard**: a 4000px photo arrives downscaled to ~1600px on the long
  edge and re-encoded as JPEG. So **keep text large and high-contrast on anything that will be
  sent as a picture** — thin type and subtle gradients are exactly what compression destroys
  first. When a customer needs fine detail, **send as a document** instead.
- **Status: 1080 × 1920 (9:16), max 16 MB, JPG/PNG, 7 seconds per image.** Safe band ~central
  1080 × 1620 (about 100px top, 200px bottom). **A non-9:16 upload gets blurred bars** — never
  letterbox a menu card into Status.
- **Business assets:** profile 500 × 500 (circle-cropped), cover 1640 × 856, catalogue images
  800 × 800 (minimum 300px, so softer below 800). Broadcast lists cap at **256 recipients**.
- **Status is the highest-reach, lowest-friction post in Malaysia** — the Instagram Story art can
  be reused 1:1 there, and that is usually the best use of one piece of artwork.
- **Send any artwork to yourself first and look at it on the phone before broadcasting.**
- **Hard rule: the payment QR goes inside the WhatsApp message only** — never on the shop, the
  tracking page, the homepage, or on a public poster. An order QR that opens a WhatsApp chat is
  fine anywhere; the TNG payment QR is not.

## 3.4 Facebook

Feed 1080 × 1080 / 1080 × 1350 / 1200 × 628; Stories and Reels 1080 × 1920; carousel cards
1080 × 1080; link preview 1200 × 630. Two masters — 1:1 and 1.91:1 — cover most placements.
Images under 30 MB.

**The old 20% text rule was retired in September 2020** and is no longer a disapproval trigger;
it survives only as a soft delivery signal. **Aim for 10–15% text coverage** — creatives past
~30% text reliably deliver worse and cost more. **Post natively rather than uploading a
watermarked cross-post.**

## 3.5 Print — a flyer or menu card

- **A6 (105 × 148mm) is the right default** for a menu card — cheapest to print, fits in a bag.
  Step to A5 (148 × 210mm) only if the menu genuinely needs the room.
- **Bleed 3mm on every side** — the file is **111 × 154mm** for A6, **154 × 216mm** for A5, with
  the background colour extended into the bleed.
- **Keep text and logos 3–5mm inside the trim line** (6mm to be safe). **300 dpi. Export a
  print-ready PDF.**
- **Colour: CMYK, not RGB.** Her olive-green and terracotta **will dull noticeably** when a
  saturated RGB file is converted — ask the printer for a proof, or convert and look at it before
  committing to a run. Keep total ink under ~300% (no rich blacks). 250–300gsm stock reads as
  quality.
- Put a **QR code to the WhatsApp order chat** on it, with a caption like "Scan to order."

From a Mac without design software: build in Pages or Canva, export PDF, and **tell the printer it
is RGB so they convert knowingly** rather than discovering it in the proof.

## 3.6 The craft — what actually works for a one-person bakery

1. **One message per image.** One dish, one price, one action. Two competing dishes halve both.
2. **Lead with the hero shot, cropped tight, shot in daylight on the phone** — crumb, torn edge,
   a hand in frame. Real beats stock every single time, and a stock food photo is the fastest way
   to read as "not a real bakery." See [[bakester-photos]].
3. **Price below the dish or bottom-right; the action as one line** ("Order by Friday",
   "WhatsApp to order"). Put a price on the image only when it belongs to the single dish shown.
   **Never invent a price** — take it from `index.html`, and if it disagrees with the live shop,
   say so and ask.
4. **A stranger must know where and how without scrolling: "Penang" and "Pre-order"** on the
   image or the first caption line, always.
5. **Common mistakes:** many dishes in one frame; text over a busy area; a low-contrast overlay;
   no location; no price; no deadline; and asking for a *follow* instead of an *order*.

## 3.7 Accessibility by default

- **Alt text is a separate field, not the caption.** Describe the actual frame: *"Close-up of a
  rosemary focaccia slice, glossy olive oil, on a wooden board."* Skip "image of". **Include any
  baked-in text verbatim** — the price, the order deadline — because that text is often the only
  place it exists for a screen-reader user.
- **Alt-text every carousel slide, not just the first.** Auto-generated alt beats blank, but
  **never let a price or a date be auto-generated.** Verify on the live post — some schedulers
  silently drop the alt field.
- **On the image:** dish name, price, the key cue (Penang / pre-order / date). **In the caption:**
  the story, the order details, the WhatsApp link, the hashtags. Do not duplicate the alt text
  into the caption.

---

## Sources (surveyed 2026-09-23)

- Baseline availability and CSS features: [Baseline monthly digest — web.dev](https://web.dev/blog/baseline-digest-may-2026) · [CSS anchor positioning — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) · [View Transition API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using) · [`text-wrap` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) · [`:has()` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- Accessibility and colour: [WCAG 3.0 status 2026](https://web-accessibility-checker.com/en/blog/wcag-3-0-preparation-guide) · [OKLCH + APCA colour systems](https://accessibility.build/guides/oklch-apca-color-systems)
- Assets and performance: [Core Web Vitals — web.dev](https://web.dev/articles/vitals) · [AVIF vs WebP 2026](https://modpagespeed.com/blog/avif-vs-webp-2026/) · [caniuse — AVIF](https://caniuse.com/avif) · [`sizes="auto"` support](https://web-platform-dx.github.io/web-features-explorer/features/sizes-auto/) · [the `picture` element — web.dev](https://web.dev/learn/design/picture-element) · [responsive ambient video, AV1/HEVC](https://nathan-long.com/blog/responsive-ambient-videos-av1-hevc/) · [web fonts, CLS and LCP](https://sitegrade.io/en/blog/web-fonts-2026-cls-lcp-performance/)
- Social and print: [Instagram image sizes 2026 — Buffer](https://buffer.com/resources/instagram-image-size/) · [Instagram vertical grid — Planoly](https://www.planoly.com/blog/guide-to-instagrams-new-vertical-grid) · [IG aspect ratios 2026 — SocialBee](https://socialbee.com/blog/instagram-aspect-ratio-and-image-size/) · [Reels size guide 2026](https://www.screensnap.pro/blog/instagram-reels-size-guide) · [WhatsApp image sizes 2026](https://imresizer.com/blog/whatsapp-image-sizes-2026-complete-guide) · [Facebook post sizes 2026](https://adbid.me/blog/facebook-post-size-guide-2026) · [Meta 20% text rule](https://www.adamigo.ai/blog/meta-20-text-rule-what-you-need-to-know) · [flyer artwork guide](https://www.printstudioscotland.com/blogs/news/flyer-artwork-design-guide) · [alt text 2026](https://autoposting.ai/blog/social-media-alt-text)

## See also

- [[bakester-brand]] — palette, type, voice, prices, standing facts (the *what*; read first)
- [[bakester-photos]] — shooting, choosing, cropping and exporting the bakes
- [[bakester-caption]] — the caption and message voice, in three languages
- [[bakester-release]] — the shipping checklist to run before anything goes live
