---
name: bakester-photos
description: How to shoot, choose, size and export photos of the bakes for the Jien Luv 2 Bake website and social — light, angles, props, cropping, the exact display sizes the site uses, and the export settings. Use whenever choosing, cropping, resizing, exporting or advising on photos of the bakes, the hero image, product shots, review photos, or social posts; whenever replacing anything in img/; and whenever asked how a bake should be photographed.
---

# Photographing the bakes

Two halves to this: **what the website actually needs** (hard numbers, all verified from
`index.html`), and **how to make the photo good** (craft — principles, not facts about her
kitchen, so adjust to what she actually has).

**The one principle over everything:** a real photo of a real bake beats a stock or generated
image, always. This is a home bakery — the honesty *is* the brand. A slightly imperfect real
photo outperforms a perfect fake one, and behind-the-scenes shots should be imperfect on purpose.

---

## Part 1 — What the site actually needs

`index.html` is the source of truth. The page container is `min(1120px, 92vw)`.

| where | file | displays at | what it means for the source |
|---|---|---|---|
| Hero (desktop) | `img/hero.jpg` | **≈479 × 479 — square**, `object-fit: cover` | **shoot and export square** |
| Hero (mobile ≤800px) | same | **16 : 10**, wide | keep the subject centred so both crops survive |
| Product card | `img/*.jpg` | **≈247 × 300**, cropped by CSS | export **portrait-ish**, 4:5 or square |
| Product card (mobile) | same | full width × **260px fixed height** | crops harder; keep the bake centred |
| Review photo | customer's own | 96×96 thumb, up to 340px tall | the app handles it |
| Customer avatar | customer's own | auto-downscaled to 200×200 by `admin/js/photo.js` | nothing to do — the app does it |

### The problem with the current files

Measured from the actual files:

| file | actual pixels | displays at | verdict |
|---|---|---|---|
| `hero.jpg` | **239 × 355** | ~479 × 479 | **about 2× too small — it is being stretched, and will look soft** |
| `focaccia.jpg` | 280 × 306 | ~247 × 300 | just about right at 1×, soft on a retina screen |
| `italian-pesto-ham.jpg` | 302 × 347 | ~247 × 300 | as above |
| `mushroom-egg.jpg` | 302 × 291 | ~247 × 300 | as above |
| `croissant.jpg` | 281 × 227 | ~247 × 300 | landscape source cropped to portrait — check the crop doesn't cut the bake |
| `vegetarian-pie.jpg` | 280 × 204 | ~247 × 300 | as above |

**The hero is the one worth re-exporting.** It is the first thing anyone sees, and at 239px wide
being shown at 479px it cannot look sharp. A replacement shot, or the same photo re-exported
larger from the original, is the single best value fix on the site.

### The export targets

Aim for roughly **2× the display size** so it stays sharp on a retina screen, then let the file
size be the brake:

| use | export | keep the file under |
|---|---|---|
| Hero | **1000 × 1000** square | ~150 KB |
| Product | **560 × 680** (4:5) | ~80 KB each |
| Instagram feed | 1080 × 1350 (4:5) or 1080 × 1080 | — |
| Instagram story / Reel cover | 1080 × 1920 | — |
| Print (flyer, menu card) | 300 dpi — A5 needs ~1748 × 2480 | — |

> **Keep the full-resolution originals.** The site's copies are ~300px, which is right for the web
> but **far too small to reuse** for Instagram (1080) or for print. Every photo she shoots should
> be kept at full size somewhere outside the repo — the site versions are derivatives, not
> masters.

**Do not let the page get heavy.** The homepage was deliberately cut to ~22 KB of HTML and the
garland/review photos already fetch one slide ahead. Adding a 3 MB hero would undo that. Export
with quality around 75-80, not 100.

---

## Part 2 — How to shoot it

### Light — the whole game

1. **One window, light coming from the side.** Put the bake between you and a window so the light
   falls across it from the left or right. This is the single biggest improvement available for
   free.
2. **Diffuse it if it is harsh.** A sheer curtain, a white bedsheet, or baking paper taped over the
   window turns hard midday sun into soft, even light.
3. **Turn the room lights OFF.** Overhead bulbs mix colour temperatures and turn food grey-yellow.
   The window alone is better.
4. **Never use flash.** It flattens the texture and puts a hard shadow behind the plate.
5. **Cloudy days are the best days.** Overcast light is a giant softbox.
6. **Shoot near the window, not in the middle of the room** — light falls off fast.

### Angle — pick it per bake

- **Sandwiches and layered things** (`italian-pesto-ham`, `mushroom-egg`): **low, at eye level**,
  and **cut one open** so the layers and fillings show. A whole sandwich photographed from above
  hides everything that makes it good.
- **Focaccia and pies** (flat, surface-led): **straight overhead**, so the whole crust and topping
  is visible at once.
- **The general-purpose shot** (hero): **around 40-45°**, close, filling about two-thirds of the
  frame, with room around it.
- **Get close.** The most common mistake is shooting from too far back. Fill the frame with the
  bread; you can always crop in later, but you cannot crop out.
- **Shoot more than you need.** Twenty frames to pick one is normal, not excessive.

### The details that separate good from amateur

- **Wipe the plate edge.** A drip or a crumb on the rim is the number-one giveaway. Clean the rim
  before every shot.
- **Show texture** — the crumb of torn bread, the flaky layers of pastry, the glossy top. Tear a
  piece off rather than cutting it clean; torn bread looks more appetising than sliced.
- **For anything served warm**, shoot quickly while it still looks fresh; steam reads as fresh.
- **For focaccia**, a few minutes of cooling gives better texture and less shine. Shoot the top
  while it still glistens slightly.
- **Simple background, always.** A wooden board or a plain table. The background should never
  compete with the bake.

### Props and surfaces — and the on-brand ones

**Fewer props is better. The same props every time is the point** — it makes the feed and the site
look like one bakery rather than six.

What is already on brand (`index.html`'s palette: olive `#465d26`, cream `#f7f0e5`, brown
`#4a2818`):

- **A wooden table or board** — the launch notes call this out directly: focaccia on a wooden table
  already looks right.
- **Cream or natural linen** — matches the site's cream ground.
- **A plain white or cream plate.**
- **Something green** — a sprig of rosemary or basil picks up the olive accent.
- **One utensil at most** — a knife, a linen cloth, a small dish.

Avoid: patterned tablecloths, bright plastic, busy kitchens in the background, other branded
products, anything with a visible logo.

### Editing — the rule is "almost none"

- **Allowed:** straightening, cropping, a small lift in brightness, a small lift in contrast.
- **Never:** heavy filters, "food" presets, saturating the colour, HDR, portrait-mode fake blur,
  vignettes, or over-sharpening. Fake-looking food undermines a home bakery more than a plain
  photo ever could.
- Shoot in colour, **not** black and white or a heavy moody preset — the brand is warm and light.
- **Clean the frame, don't fix it in editing.** If something in the background is distracting,
  move it and shoot again.

---

## Part 3 — Putting a photo on the site

1. Export at the target above (hero 1000×1000, product ~560×680), quality ~75-80.
2. Save into `img/` using the existing names — `hero.jpg`, `focaccia.jpg`,
   `italian-pesto-ham.jpg`, `mushroom-egg.jpg`, `croissant.jpg`, `vegetarian-pie.jpg`.
3. **Update the `width` and `height` attributes on the matching `<img>` in `index.html`** to the
   new pixel dimensions. They are currently set to the real file sizes, and they reserve the layout
   space so the page does not jump while loading. A stale value here causes visible layout shift.
4. Product `alt` text is currently the uppercase product name (`alt="FOCACCIA"`) — keep that shape.
5. Nothing else needs changing: `object-fit: cover` handles the crop.

**Do not commit.** She deploys through GitHub Desktop — offer a suggested commit message instead.

---

## Before a photo goes out

- [ ] It is a real photo of her real bake — not stock, not generated
- [ ] Shot in window light, room lights off, no flash
- [ ] The plate rim and background are clean
- [ ] The right angle for the bake (eye-level + cut open for sandwiches, overhead for flat bakes)
- [ ] Exported at the target size, file under the weight limit
- [ ] If it replaces a site image: `width`/`height` in `index.html` updated to match
- [ ] Full-resolution original kept somewhere outside the repo

## Never

- **Never substitute a stock or AI-generated image for one of her products.** Not once.
- **Never overwrite the only copy of a photo** — `img/` holds derivatives; the master must live
  elsewhere first.
- **Never let the hero stay at 239px** if a larger original exists — it is the first thing anyone
  sees.
- **Never add a heavy filter or preset.** Warm and real, not moody and processed.
- **Never commit or push the new images** — she deploys herself.
