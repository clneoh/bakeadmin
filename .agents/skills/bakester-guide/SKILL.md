---
name: bakester-guide
description: House rules for the Bakester PDFs and the app changelog — version sync, latin-1 safety, the changelog contract, and the build-and-verify workflow. Use whenever editing or rebuilding anything in marketing/ (build_guide.py, build_money_guide.py, build_changelog.py, or any build_*.py), whenever bumping the engine version, whenever editing CHANGELOG.md or changelog.pdf, or whenever handing the baker a PDF. Also use to check an existing PDF is safe before it goes out.
---

# The Bakester PDFs and the changelog

Five documents are hand-built with `fpdf2` and shipped as PDFs. They are the only thing the
baker reads when she wants to check how her own app works, so a broken one is worse than a
missing one — it is confidently wrong. This skill is the set of rules that keep them correct.

Everything lives in `marketing/`, which is **gitignored** — with **one exception**:
`changelog.pdf` is built to the **repo root** and *is* tracked and hosted, because the app's
More screen links to `/changelog.pdf` for a customer-visible "full change history".

## 1. The version rule — the thing most likely to break

**One number rules everything: `ENGINE_VERSION` in `admin/js/version.js`.** As of this writing
it is `"118"`. Three files must agree with it, and two of them have **no constant to grep** —
they are hardcoded strings that silently go stale.

| file | how the version appears | when it must change |
|---|---|---|
| `admin/js/version.js` | `export const ENGINE_VERSION = "118"` | **the master.** Bumped on every engine change |
| `marketing/build_guide.py` | `VERSION = "118"` | must equal the master |
| `marketing/build_money_guide.py` | `VERSION = "118"` | must equal the master |
| `marketing/build_changelog.py` | **hardcoded twice, no constant**: the footer (`~L97`) and the banner (`~L121`), both reading `"v54 to v118"` | **easy to miss — grep for `v54 to`** |
| `CHANGELOG.md` | **hardcoded in the H1**: `# Jienluv2bake — change history (v54 → v118)` | bump the upper number |

`build_courier_api.py` and `build_ntfy_resend.py` carry a `BUILT = "17 September 2026"` date
instead, and refer to the engine in prose ("written at engine v118"). Update those strings by
hand when they are rebuilt.

**The letter rule — do not skip this.** A *manual-only* refresh on an unchanged engine appends a
letter rather than the next number: `118 → 118a → 118b`. The manual must never imply an engine
bump it did not get. So:

- Changed the app → new engine number everywhere.
- Only reworded a PDF → **same number, plus a letter on `build_guide.py`'s `VERSION`**.

**`build_guide.py` also carries an `ENGINE` constant — keep it a plain number.** One line of prose
describes what the More screen's green pill reads (`"reads 'Engine v{ENGINE}'"`, in the v54-section
Q&A). That pill always shows the *engine*, never a manual letter, so it must use `ENGINE`, not
`VERSION`. Without the split, appending the letter on 2026-09-18 would have made the manual claim
the app shows "Engine v118a" — something the pill cannot say, because the app was never rebuilt.

`marketing/bakester-safety-scenarios.pdf` is a deliberate **frozen one-off** pinned at
`VERSION = "61"`. Leave it alone; its content was folded into the main guide. Do not "fix" it to
118 — that would be a lie about when it was written.

## 2. Latin-1 safety — the rule that silently corrupts

The builders use fpdf2's **core Helvetica**, which is latin-1 only. Every builder has its own
`clean()` that maps the app's typography down to safe characters. Know what survives:

**Safe:** `·` (U+00B7) — it is latin-1 and the banner uses it (`BAKESTER · HOME BAKERY · PENANG`).
"Bahasa Malaysia" is plain ASCII. Ordinary punctuation.

**Mapped by `clean()`** (all builders, roughly): `—` → `-`, `–` → `-`, `“ ”` → `"`, `‘ ’` → `'`,
`→` → `->`, `✕` → `x`, `•` → `-`, `＋` → `+`, `…` → `...`, `中文` → `Chinese`, `♡` → removed,
`⚠` → removed.

**Never put in PDF copy:** emoji, Chinese or other CJK glyphs, `✓`, `←`, or any of the arrow and
icon characters from the app's buttons. Write "Chinese" and "Bahasa Malaysia" as words.

**THE TRAP — `**bold**` only works in some helpers.** `para()`, `bullet()`, `step()` and `tip()`
call `multi_cell(..., markdown=True)`, so `**bold**` renders as bold. The `strip()` helper (in
`build_ntfy_resend.py` and `build_safety_scenarios.py`) uses `cell()`, which **does not parse
markdown** — a `**bold**` marker in there prints as two literal asterisks. This has already
shipped once and had to be rebuilt. There is a comment on `strip()` saying so; believe it.

Inside `strip()`, and anywhere using `cell()`, write plain text. Use the `--text` dump below to
confirm before handing anything over.

**A second trap, in `CHANGELOG.md`: single `*asterisks*` are not italics.** `build_changelog.py`'s
`parse()` understands `**bold**` but not `*italic*`, so one asterisk on each side prints as two
literal asterisks in the PDF — and `pdftext.py`'s `literal '**' left` check does **not** catch it,
because it counts pairs. This shipped once on 2026-09-18 and had to be rebuilt. **Lean on bold in
`CHANGELOG.md`; never on italics.** To check, dump the text and look for a word wrapped in single
asterisks (`grep -o "[a-zA-Z]*\*[a-zA-Z]*"`), ignoring the `*` that begins older entries' bullet
lines.

## 3. The changelog contract

`CHANGELOG.md` at the repo root is **tracked and public**. Two shapes are in use, and `parse()`
in `build_changelog.py` handles both:

- **Recent entries (top of the file):** a bold lead sentence with a date and the engine, then
  free paragraphs.
  ```markdown
  **17 Sep 2026 — engine v118 (no database setup needed). The Paid step now stays in its place ...**
  ```
  The `(no database setup needed)` phrase is a deliberate signal to her — include it whenever a
  change needs no SQL run in Supabase, which is most of them.
- **Older entries (from around v72 down):** `## v72 — The shop's sold-out notes ... (10 Sep 2026)`

**Rules:**

- **Newest first.** Add the new entry directly under the H1.
- **Every user-visible change gets a dated note** — this is a standing instruction of hers, not a
  style preference. If she can see it on her phone, it belongs here.
- **Write it for her, not for a developer.** Say what it does and why it was the right call. She
  reads this to remember what changed and whether she agreed to it.
- **Rebuild `changelog.pdf` after every `CHANGELOG.md` edit.** An edit that is never rebuilt is
  invisible to her, since she reads the PDF from the More screen.

## 4. Build and verify

All builders must be run **from inside `marketing/`** — the output paths are relative.

```bash
cd marketing && python3 build_guide.py
```

```bash
cd marketing && python3 build_money_guide.py
```

```bash
cd marketing && python3 build_changelog.py
```

Then **always** read the finished file back. This is not optional — a stray glyph does not fail
the build, it prints as `?` or as literal asterisks in a document she trusts:

```bash
python3 .Codex/skills/bakester-guide/pdftext.py marketing/bakester-marketing-guide.pdf
```

Add `--text` to dump the whole document when you need to read a passage. It prints the version
strings it found, so it doubles as the check that a rebuild actually picked up the new number.

Expected: `literal '**' left : 0`, `non-latin-1 chars : none`, `'?' inside a word : none`,
`VERDICT : ok`.

> A `v2b` in the version strings is **not** a version — it is the regex finding the "v2b" inside
> "jienluv2bake". Ignore it.

## 5. Git

**Never commit and never push.** She deploys through GitHub Desktop and does it herself. When a
change is ready, give her a **suggested commit message** in the house style — lowercase prefix,
then a plain-English sentence about what changed and why:

```
v118: the Paid step stays in its place on every order and wears an X until the money is
recorded — press Paid · Cash / Paid · TNG and the X becomes the green tick, in the same spot
```

Remember the split: **`changelog.pdf` deploys, everything else in `marketing/` does not.**

## 6. Never

- **Never bump the engine number for a PDF-only change.** Use the letter (`118a`).
- **Never rebuild `bakester-safety-scenarios.pdf` to a current version** — it is a frozen
  record of what she approved in September, at v61.
- **Never put `**bold**` in a `cell()` helper** (`strip()`), and never put non-latin-1
  characters in any PDF.
- **Never hand her a PDF you have not run `pdftext.py` against.**
- **Never edit `CHANGELOG.md` without rebuilding `changelog.pdf`** — she reads the PDF, not the
  markdown.
- **Never change the footer/banner version strings by search-and-replace across the repo** —
  `build_safety_scenarios.py`'s v61 and the `v54` floor in the range are deliberate and must stay.
