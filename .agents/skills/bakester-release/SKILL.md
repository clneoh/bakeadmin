---
name: bakester-release
description: The end-to-end checklist for shipping one engine version of the bakeadmin app — check deploy state, make the change, verify it live with the baker's own data, prove the tests are load-bearing, write the changelog and both PDFs, record the memory note, and hand over a paste-ready commit message. Use whenever the baker reports a bug or asks for a change to the admin app, whenever an engine version is being bumped, or whenever a change is ready to hand over for her to commit in GitHub Desktop.
---

# Shipping one engine version

Every version follows the same dozen steps. They are ordered — a step late is a step that has
to be redone. The baker is non-technical, deploys from GitHub Desktop, and tests on her phone;
she is precise about production numbers and will notice anything that moved.

**The two rules that outrank everything below:**

1. **Nothing of hers is rewritten.** No module, batch, start time, cycle, ingredient, price or
   saved scenario changes as a side effect of a change she asked for. Where a change could
   touch her data, prove it did not (§4).
2. **No database step where one can be avoided.** Say so explicitly in the changelog entry. The
   Scenario planner rides the app's settings row, so planner work needs no SQL.

## 1 · Check the deploy state first

She pushes between messages, and a second session may be live in this same repo.

```bash
git log --oneline -3 && git status --short && cat admin/js/version.js
```

- If she has already pushed, the version I was about to build may already exist as a commit —
  fold the fix into the **next** number rather than amending a published one (§11).
- If `version.js` is not what I last set, **another session has been here.** Re-read the changed
  files before building on them, and never `git add -A` (§10).

## 2 · Make the change

- **Smallest thing that fixes it.** No opportunistic refactors, no speculative abstraction, no
  feature flags.
- **Her words are the spec, and the unit she names is the unit to use.** "2 inches" means 192px
  (a CSS inch is 96px by definition); "minutes per bake" goes in the label. If a field takes a
  number, its label names the unit and what it is measured over.
- **Guide, never a gate.** A website rule (a closed day, a sold-out line, an off-day) must never
  block or hide a sale she would take by hand — show her the state, let her choose.
- **Dead controls read as bugs.** Two rows that look alike must behave alike; a control that
  does nothing must explain itself or look inert; touch targets are 36px.

## 3 · Verify it live

Start the server from `.Codex/launch.json` (`bake-store`, port **8451**) with `preview_start` —
never Bash.

- **Sign in with "Use without cloud sync".** Never type or ship the Supabase app-login
  email/password; she types both per phone. (PIN **8899**.)
- **A viewport set in a previous turn is cleared between turns.** Re-set to **375×812** and
  re-verify `window.innerWidth` in the *same* turn before trusting any measurement.
- **A collapsed pane is a 0×0 viewport** — geometry read from it is garbage. Screenshots need
  mobile emulation to mean anything.
- `/changelog.pdf` is served from the repo root, so **rebuild it before you check the More
  screen's link** (§6).

## 4 · Prove her data is untouched

Before anything that reads or writes her live data, in the browser console:

```js
const before = localStorage.getItem("bakeadmin.v1");
localStorage.setItem("__backup", before);
```

…do the work… then restore **byte-for-byte** and remove the key:

```js
localStorage.setItem("bakeadmin.v1", localStorage.getItem("__backup"));
localStorage.removeItem("__backup");
```

Record the character count and the headline numbers (three saved days read **24 / 12 / 24**
pans) before and after, and put that sentence in the changelog entry. If a count moves, stop —
something rewrote her work.

## 5 · Fix the tests — extend, never duplicate

- **Extend the existing test for that behaviour.** A second test of the same thing is a second
  thing to keep in step.
- **Prove every new assertion is load-bearing**: put the fault back, watch the test fail *by
  its own message*, then restore **byte-identically** and verify with `shasum -c`. An assertion
  nobody has seen fail is an assertion nobody knows works.
- **A test shim must be as unforgiving as the real DOM.** A forgiving stand-in has already hidden
  a printed "null", a dead tracking column, and every simulated bar tap reading as batch 1. When
  the shim cannot express what the view does, **fix the shim** — that is usually the real bug.
- Full suite green before handover: `node --test test/*.test.js`.

## 6 · Write the destination, not just the journey

**Every user-visible change gets a dated `CHANGELOG.md` note in her own words**, newest first,
with the measured figures and the "No database step" line — then rebuild `changelog.pdf`
(to the repo root) and read it back. When a new release changes behaviour an earlier entry
describes, add a dated note inside that earlier entry rather than leaving a stale description
on screen.

Read the full PDF rules (version sync, latin-1, `cell()` vs `multi_cell()`, the read-back
tool) in the **bakester-guide** skill before touching any builder or `CHANGELOG.md`.

- `marketing/build_guide.py` — the SOP. `VERSION` **and** `ENGINE` to the new number, the new
  clause written into the relevant section, rebuild, read back. The guide is the SOP she works
  from; an app change that is not in it is an app change she cannot look up.
- `CHANGELOG.md` H1 → bump the upper number; `changelog.pdf` rebuilt and read back.

## 7 · Record what the version was

Write `memory/project_vNNN.md` (the subjects, the mechanism, the measured figures, the test
count, whether a DB step was needed) and add its one-line entry to the engine-history list in
`MEMORY.md`. This is what a future session reads instead of re-deriving the version from
`git log`.

## 8 · Hand over the commit message

**Always end a finished version with a paste-ready commit summary** in a ```text fenced block —
never make her ask. House style: a `vNNN:` subject, then numbered points in plain English
carrying her own words, the measured before/after, the probes, and the "No database step" line,
ending with:

```
Co-Authored-By: Codex Sonnet 5 <noreply@anthropic.com>
```

**Stage files by name in the message** (never `git add -A`, never `git add .`) so she knows
exactly which to tick in GitHub Desktop. `marketing/` is gitignored, so the guide and its PDF
never appear — say that, or she will think one is missing.

## 9 · Never

- **Never commit and never push.** She deploys through GitHub Desktop herself.
- **Never force-push or amend a published commit** without her explicit go-ahead.
- **Never write to the Supabase project from here**, and never type the app-login credentials.
- **Never blame her phone's cache.** "Still broken" means re-measure — a repeated report is
  real, and twice now it has been a genuine fault described as a phone problem.

## 10 · After she commits

Verify the landed commit — the GitHub Desktop **Summary box can hold a stale message from
another task**, and the mismatch is silent:

```bash
git show --stat HEAD
```

Check the message is *this* version's and the file list is the set you gave her. Then confirm
the tree is clean.
