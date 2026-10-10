// test/store-i18n.test.js — the store shares one full key set across EN / 中文 /
// BM, every tagged string on store/index.html exists in all three, and the
// English dictionary copies the authored copy so an English visit is unchanged.

import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

import { STORE } from "../store-lang.js";
import { LANGS } from "../i18n.js";

const html = readFileSync(new URL("../store/index.html", import.meta.url), "utf8");
const tagKeys = (attr) => {
  const re = new RegExp(`${attr}="([^"]+)"`, "g");
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return [...new Set(out)];
};
const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

test("the three languages share exactly the same key set", () => {
  for (const l of LANGS) assert.ok(STORE[l], `dictionary for ${l} exists`);
  const ref = Object.keys(STORE.en).sort();
  for (const l of LANGS.slice(1)) {
    assert.deepEqual(Object.keys(STORE[l]).sort(), ref, `${l} keys match English`);
  }
});

test("every tagged string on the store page exists in all three languages", () => {
  for (const attr of ["data-i18n", "data-i18n-html", "data-i18n-ph"]) {
    const used = tagKeys(attr);
    for (const key of used) {
      for (const l of LANGS) {
        assert.equal(typeof STORE[l][key], "string", `${attr}="${key}" missing from ${l}`);
      }
    }
  }
});

test("English dictionary values match the authored English copy", () => {
  // Only [data-i18n] nodes are single-leaf text (the whatsapp label's * and the
  // track hint's <strong> live under separate nodes / data-i18n-html).
  const re = /<[^>]*data-i18n="([^"]+)"[^>]*>([^<]*)</g;
  let m;
  let checked = 0;
  while ((m = re.exec(html))) {
    const [ , key, raw ] = m;
    const en = STORE.en[key];
    assert.equal(typeof en, "string", `data-i18n="${key}" missing from en`);
    assert.equal(unescape(raw.trim()), en.trim(), `en["${key}"] differs from the authored text`);
    checked += 1;
  }
  assert.ok(checked > 10, "the check actually walked the store page tags");
});

// The reason on a product card that can't be ordered for the chosen day, the
// line naming the next date it can be had (v90), and the notes a refresh writes
// above the menu, are built in JS rather than tagged in the HTML — so nothing
// else would notice them missing or half-translated.
test("the closed-product reason and the basket notes are keyed in all three languages", () => {
  const holders = {
    closedFrom: ["%1"],
    closedTo: ["%1"],
    closedClose: ["%1"],
    closedCloseAdvice: [],
    // The marked-day reasons. They only became reachable in v90: until a product
    // could be kept on the shop they were written for, then dropped before render.
    closedWeekday: ["%1"],
    closedUnmarked: [],
    unavailable: [],
    nextAvailable: ["%1"],
    nextAvailableLeft: ["%1", "%2"],
    sentenceEnd: [],
    fixSoldOut: ["%1"],
    fixPoolClamp: ["%1", "%2", "%3"],
    fixClamp: ["%1", "%2", "%3"],
    fixClosed: ["%1", "%2"],
    cancelNote: ["%1"],
    cancelNoteOne: [],
    orderCancelNote: ["%1"],
    orderCancelNoteOne: [],
    // The journey's last step and the courier's tracking number (v97). The step is
    // not one word — it covers both endings, Collected / Shipped — and the number
    // line is built in JS, so nothing else would catch either going missing.
    trkFinal: [],
    trackingNo: ["%1"],
    // The courier's charge on the card, and the same charge when the courier
    // collects it at the door (v124 / v128). Both are built in JS off the same
    // published row, so nothing else would notice either going missing — and the
    // COD one silently falling back to the plain wording would tell the customer
    // they owe the baker money the courier is about to ask them for.
    courierCharge: ["%1"],
    courierCod: ["%1"],
    // The card's own add-up (v199, 25 Sep 2026): the goods, their subtotal, and the total.
    // All three are built in JS off the published row and each one IS its figure, so a
    // translation that dropped its %1 would draw "Items total:" with no amount beside it —
    // the card would say the sum adds up and then not show what to — and nothing but this
    // would notice.
    trkItems: ["%1"],
    itemsTotal: ["%1"],
    trkTotal: ["%1"],
    // The code, and what it took off (v272, 2 Oct 2026). Built in JS off the published
    // row like the three above, and each language must keep BOTH placeholders: a
    // translation that dropped %1 would print "Promo: -RM 10.00" without naming which
    // code it was, and one that dropped %2 would name the code and never say what came
    // off the total — the two things the customer needs to check the figure against.
    promoLine: ["%1", "%2"],
    // ★ THE BRING-A-FRIEND DISCOUNT (v323), which carries no code and so needs its own words.
    // ⚠️ **`%1` AND NOT TWO PLACEHOLDERS, AND THAT IS THE WHOLE DIFFERENCE BETWEEN THE TWO
    // LINES**: a code has a NAME the customer typed and can check, and the friend's discount
    // has only an amount. A translation that invented a second placeholder would print an
    // empty slot where a code name goes.
    promoFriend: ["%1"],
  };
  for (const [key, phs] of Object.entries(holders)) {
    for (const l of LANGS) {
      const v = STORE[l][key];
      assert.equal(typeof v, "string", `${l}.${key} is missing`);
      for (const ph of phs) assert.ok(v.includes(ph), `${l}.${key} must keep ${ph}`);
    }
  }
});

// The per-item note's link and its empty box (v236). Both are built in JS rather
// than tagged in the HTML — the link is a <button> and the box a bare <input> —
// so nothing else on this page would notice either going missing. A language that
// never got the placeholder would open a box with no hint in it, which reads as a
// broken field rather than an optional one.
test("the per-item note's link and its hint are translated in all three languages", () => {
  for (const l of LANGS) {
    for (const key of ["addNoteLink", "lineNotePh"]) {
      assert.ok(typeof STORE[l][key] === "string" && STORE[l][key].trim(),
        `${l}.${key} is present`);
    }
  }
  assert.notEqual(STORE.zh.addNoteLink, STORE.en.addNoteLink, "Chinese is translated, not left in English");
  assert.notEqual(STORE.ms.addNoteLink, STORE.en.addNoteLink, "Bahasa Malaysia is translated, not left in English");
});

// The suggestion box under the "Website by" credit (v247). Every word of it is
// built in JS — the box, its button and the reply all come from renderFeedback —
// so nothing tagged in the HTML would ever notice a language missing them. A
// language that never got the placeholder would open an empty box with no hint,
// which reads as a broken field rather than an invitation.
test("the suggestion box is translated in all three languages", () => {
  for (const l of LANGS) {
    for (const key of ["fbPh", "fbHint", "fbSending", "fbThanks", "fbFailed", "fbEmpty"]) {
      assert.ok(typeof STORE[l][key] === "string" && STORE[l][key].trim(), `${l}.${key} is present`);
    }
  }
  assert.notEqual(STORE.zh.fbPh, STORE.en.fbPh, "Chinese is translated, not left in English");
  assert.notEqual(STORE.ms.fbPh, STORE.en.fbPh, "Bahasa Malaysia is translated, not left in English");
});

// The privacy notice, now one line under Place order plus the panel behind it (v350).
// The PDPA asks for the notice in BAHASA MALAYSIA as well as English, and a customer
// who reads the notice in the language they ordered in is the whole point of it — a
// language left in English would sit inside an otherwise translated bar and read as
// boilerplate nobody wrote for them.
//
// ⚠️ privacyLead IS GONE, and its absence is the point of v350: the notice used to
// OPEN with the Act. The Commissioner's own template opens in plain language and so
// do the large platforms, so the Act moved to the CLOSING line (privacyDate). If a
// later change brings the opener back, this list will not notice — the test that
// would is the markup one above, because the sentence would have to be authored into
// store/index.html as well.
test("the privacy notice is written in all three languages", () => {
  const keys = ["privacyLine", "privacyLink", "privacyHead", "privacyWhat", "privacyWho", "privacyKeep", "privacyContact", "privacyDate"];
  for (const l of LANGS) {
    for (const key of keys) {
      assert.ok(typeof STORE[l][key] === "string" && STORE[l][key].trim(), `${l}.${key} is present`);
    }
  }
  for (const l of LANGS.slice(1)) {
    for (const key of keys) {
      assert.notEqual(STORE[l][key], STORE.en[key], `${l}.${key} is translated, not left in English`);
    }
  }
});

// ⚠️ AND THE NOTICE CARRIES NO NUMBER. The sentence ends where the number begins, and
// store/app.js fills that from the SAME setting the order button builds its link from —
// so changing the number in Settings → Storefront moves both together, and a number
// typed into a translated string could never be left behind. A number in here would
// look correct today and be wrong the first time she changes it.
test("the privacy notice leaves the contact number to the app", () => {
  for (const l of LANGS) {
    assert.equal(/\d{6,}/.test(STORE[l].privacyContact), false,
      `${l}.privacyContact carries no number — store/app.js fills it from the settings`);
  }
});

test("the promo line is translated, not left in English", () => {
  // The line is only ever read by a customer, and only on an order that carried a code,
  // so a language left in English would sit inside an otherwise translated card and read
  // as a machine's line rather than the bakery's.
  for (const l of LANGS.slice(1)) {
    for (const key of ["promoLine", "promoFriend"]) {
      assert.ok(STORE[l][key].trim(), `${l}.${key} is present`);
      assert.notEqual(STORE[l][key], STORE.en[key], `${l}.${key} is translated, not left in English`);
    }
  }
});

test("an order with a discount and NO code reads as bring-a-friend, and never as 'Promo :'", () => {
  // ★ v323. The card picks its words on `off > 0 && !code`, and that test only works because
  // **a code always has a name** — the app refuses to label one without it. If that ever
  // stopped being true, a code would start printing the friend's label.
  const app = readFileSync(new URL("../store/app.js", import.meta.url), "utf8");
  assert.match(app, /if \(off > 0\) \{/, "the card no longer draws a discount line at all");
  assert.match(app, /t\("promoFriend"\)/, "and no longer has the friend's words to draw it with");
  assert.match(app, /rows\.push\(code[\s\S]{0,200}t\("promoFriend"\)/,
    "the choice must be made ON the code being present, not on some other flag");
});

test("the COD charge is worded differently from the plain one in every language", () => {
  for (const l of LANGS) {
    assert.notEqual(STORE[l].courierCod, STORE[l].courierCharge,
      `${l}: the same string for both means the card cannot say who is being paid`);
    // COD alone reads as paying for the GOODS at the door; here the goods are already
    // paid and only the charge is collected, so each language has to say so.
    assert.ok(STORE[l].courierCod.length > STORE[l].courierCharge.length,
      `${l}: the COD line carries the instruction on top of naming the charge`);
  }
});

test("placeholders and the html-track hint are keyed too", () => {
  const ph = tagKeys("data-i18n-ph");
  assert.ok(ph.includes("namePh") && ph.includes("whatsPh"));
  for (const k of tagKeys("data-i18n-html")) {
    for (const l of LANGS) assert.ok(STORE[l][k].includes("<strong>"), `${l}.${k} keeps its <strong>`);
  }
});

test("the shop has a way back to the homepage, and it points at a page that exists", () => {
  const m = html.match(/<a\b[^>]*id="home-link"[^>]*>/);
  assert.ok(m, "the shop page carries a home link");
  const tag = m[0];
  assert.match(tag, /href="\/"/, "it points at the site root — the homepage");

  // The root is the homepage only because a page is served there; a link to a
  // path with nothing behind it is a 404 wearing a nav item's clothes.
  const root = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(root, /<html\b/, "index.html is served at the root the link points to");

  // And it is a shop-page string like any other: keyed, and actually translated.
  assert.match(tag, /data-i18n="homeLink"/, "the label is a translated string");
  for (const l of LANGS) assert.ok(STORE[l].homeLink.trim(), `${l}.homeLink is present`);
  assert.notEqual(STORE.zh.homeLink, STORE.en.homeLink, "Chinese is translated, not left in English");
  assert.notEqual(STORE.ms.homeLink, STORE.en.homeLink, "Bahasa Malaysia is translated, not left in English");
});

// The privacy notice moved to the order bar (v350): one line under Place order, and the
// four facts in a panel behind it. Three things can break it silently, and all three are
// invisible to any test that stops at "the string is translated".
//
//   1. THE PRESS AND THE PANEL MUST NAME EACH OTHER. The button carries aria-controls and
//      store/app.js looks the panel up by id. Rename the panel and forget the button and
//      the press becomes a DEAD CONTROL — it looks pressable, does nothing, and a PDF of
//      the copy would still read perfectly.
//   2. THE LINE MUST NOT SHRINK. It is the only place the notice is given now, and the
//      Commissioner's guide warns against a font "so small that it results in the data
//      subject not reading the PDP Notice". 12.5px is the floor — the size the v348 block
//      used — not a starting point to tune down later.
//   3. THE SPACER MUST CLEAR THE TALLEST LANGUAGE. The bar is fixed over the page, so a
//      spacer shorter than the closed bar hides the last row of the shop behind it. The
//      bar is tallest in Bahasa Malaysia, which is why 136px is the number and 118px
//      (English) is not.
test("the privacy line opens the panel it names, and is not set too small to read", () => {
  const btn = html.match(/<button\b[^>]*id="privacy-open"[^>]*>/);
  assert.ok(btn, "the order bar carries the press that opens the notice");
  const controls = btn[0].match(/aria-controls="([^"]+)"/);
  assert.ok(controls, "the press says which panel it opens");
  const sheet = html.match(new RegExp(`<div\\b[^>]*id="${controls[1]}"[^>]*>`));
  assert.ok(sheet, `the panel the press names (${controls[1]}) exists on the page`);
  assert.match(btn[0], /aria-expanded="false"/, "it starts closed, and says so out loud");
  assert.match(sheet[0], /\bhidden\b/, "the panel starts hidden");

  // The four facts and the Act are authored into the page, not only into the dictionary —
  // the panel is the notice, so a key missing here is a fact the customer never reads.
  for (const key of ["privacyWhat", "privacyWho", "privacyKeep", "privacyContact", "privacyDate"]) {
    assert.match(html, new RegExp(`data-i18n="${key}"`), `${key} is authored into the page`);
  }

  const css = readFileSync(new URL("../store/app.css", import.meta.url), "utf8");
  const size = css.match(/\.order-notice\s*\{[^}]*font-size:\s*([\d.]+)px/);
  assert.ok(size, ".order-notice sets its own size");
  assert.ok(Number(size[1]) >= 12.5,
    `the line is at least 12.5px (it is ${size[1]}px) — it is the only place the notice is given`);

  const spacer = css.match(/\.bar-spacer\s*\{\s*height:\s*([\d.]+)px/);
  assert.ok(spacer, ".bar-spacer sets its own height");
  assert.ok(Number(spacer[1]) >= 118,
    `the spacer clears the TALLEST language on the NARROWEST screen (measured 118px: Bahasa Malaysia at 320px, where the line wraps to two — it is ${spacer[1]}px)`);
});

// ⚠️ renderStatic() RUNS AGAIN ON EVERY RENDER AND ON EVERY LANGUAGE SWITCH — its own
// comment says so (store/app.js ~L944, "renderStatic() runs again on every language
// switch"). A listener bound inside it is therefore bound AGAIN each time it runs, and that
// is harmless for a handler that SETS a state — but fatal for one that TOGGLES it: two
// bindings cancel out and the control reads as DEAD.
//
// That is exactly what shipped in v350 and v351. Pressing the words under Place order did
// NOTHING on a freshly loaded shop, and opened the notice after one language switch. It got
// past every check because one press was driven, not two, and because the parity at that
// moment happened to be odd. Driving the press twice in a row is what exposes it.
//
// So this is an invariant, and it is broad on purpose: renderStatic must bind NO event
// listener at all. Anything the shop needs bound belongs at module scope, where the language
// pills are bound, because the bar's markup is static HTML that is never replaced.
test("renderStatic binds no event listeners, because it runs more than once", () => {
  const src = readFileSync(new URL("../store/app.js", import.meta.url), "utf8");
  const at = src.indexOf("export function renderStatic(");
  assert.ok(at > -1, "renderStatic exists in store/app.js");
  const rest = src.slice(at + 1);
  const nextExport = rest.search(/\nexport (function|const|let) /);
  const body = nextExport > -1 ? rest.slice(0, nextExport) : rest;
  const binds = body.match(/addEventListener\(/g) || [];
  assert.equal(binds.length, 0,
    `renderStatic() binds ${binds.length} listener(s). It runs again on every render and every language switch, so a binding there is a binding REPEATED — and a TOGGLE bound twice cancels itself out, so the control looks dead on a fresh page and works after a language switch. Bind once at module scope instead.`);
});

// ── v407: the two ways to get your bread, and what the day is called ────────

test("both ways to get an order say what they are, in every language", () => {
  // ★★ HER CUSTOMER ORDERED A COURIER WHEN HE WANTED TO COLLECT. The page named both ways and
  // explained neither — two bare words in a segmented control, and nothing anywhere saying what
  // either one meant or what it would cost him. Her words: __"imagine that you are totally new,
  // and you want to order from this baker, and you are not so good at online ordering"__.
  //
  // ⚠️ THE RULE IS PINNED RATHER THAN THE LAYOUT, because no test can see a phone: what must be
  // true is that **each way carries its own line of explanation**, and that the line is translated
  // rather than English-only on a page that offers 中文 and BM.
  const rows = [...html.matchAll(/<button\b[^>]*data-fulfillment="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
  assert.equal(rows.length, 2, "the shop offers exactly two ways to get an order");
  for (const [, value, inner] of rows) {
    assert.match(inner, /class="seg-name"/, `${value}: the way is named`);
    assert.match(inner, /class="seg-sub"/, `${value}: and it says what it means`);
  }
  // ⚠️ NEITHER IS EVER DISABLED. This is a description, never a gate — her standing rule.
  for (const [full] of rows) {
    assert.ok(!/\sdisabled\b/.test(full), "neither way can ever be disabled");
  }
  // Both lines exist in all three languages. The key-set test above proves the sets match, so
  // this is the narrower claim: these two KEYS are the ones the page actually uses.
  for (const k of ["selfCollectSub", "courierSub"]) {
    assert.ok(STORE.en[k] && STORE.zh[k] && STORE.ms[k], `${k} reads in EN, 中文 and BM`);
  }
  // ⚠️ AND THE COURIER LINE NAMES NO AMOUNT, because the shop genuinely has none — she quotes
  // carriage by hand (see judgeCtx). A price here would be a number nothing can honour.
  assert.ok(!/RM\s*[\d.]/.test(STORE.en.courierSub),
    "the courier line promises no price — the shop does not have one");
  // ⚠️ What it says instead is the thing a customer would otherwise assume wrongly.
  assert.match(STORE.en.courierSub, /bread only/i,
    "it says the total shown is the bread's, which is the only true thing the page can promise");
  assert.match(STORE.en.selfCollectSub, /no delivery charge/i,
    "and collecting says the one thing that makes it worth walking for");
  // ⚠️ AND WHEN, IN HER OWN TERMS — her words: __"order can be collected late on the bake day, a
  // message will be send to you when your order is ready if you chose self collect"__. A customer
  // collecting had two questions, not one: what it costs, and WHEN to come.
  assert.match(STORE.en.selfCollectSub, /any time on your bake day/i,
    "collecting says the whole bake day is available, which is what she answered");
  assert.match(STORE.en.selfCollectSub, /once your order is ready/i,
    "and that the ready message is what tells them to come");
  // ⚠️⚠️ AND IT MUST STILL NAME THE PLACE. A customer collecting may have NO Point to choose from
  // at all — the collect-from list is empty and hidden while she has none published — so this line
  // is the only place the shop can say where to come. Dropping it would leave the same fault this
  // whole version repairs: a customer told to collect and not told where.
  assert.match(STORE.en.selfCollectSub, /message you the exact place/i,
    "and the place is named, because with no Point published this line is the only place that can");
  // ⚠️ BUT IT NAMES NO CLOCK. A pickup time is not a promise (v340) — the bread is ready when it
  // is ready, and the only thing that can say so is the message.
  assert.ok(!/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i.test(STORE.en.selfCollectSub),
    "no hour is promised on the page — the ready message is the only thing that announces it");
});

test("the shop calls that day a BAKE day, in all three languages", () => {
  // ★★ Her words: __"from the store i can see the bake day is term as delivery day, that might be
  // what confusing. Change it to bake day"__ and then, naming the heading itself: __"it should be
  // 1. pick a bake day"__.
  //
  // ⚠️⚠️ IT WAS THE SAME FAULT AS THE TWO BARE WORDS BESIDE IT. "Delivery day" names the day after
  // the thing that happens to it for SOME customers, and the one person it misled was the one
  // COLLECTING his own bread — he did not recognise the day he was choosing. **It is the day the
  // bread is baked**, which is true of every order however it leaves.
  //
  // ⚠️ This is pinned as a rule over the whole dictionary rather than one string at a time, because
  // the wording was spread across twelve of them and a thirteenth added later would quietly bring
  // the confusion back.
  const offenders = (lang, re) => Object.entries(STORE[lang])
    .filter(([, v]) => typeof v === "string" && re.test(v))
    .map(([k]) => k);
  assert.deepEqual(offenders("en", /delivery day/i), [],
    "no English string calls the chosen day a delivery day");
  assert.deepEqual(offenders("zh", /派送日/), [],
    "nor does the Chinese — it says 烘焙日");
  assert.deepEqual(offenders("ms", /hari penghantaran/i), [],
    "nor the Bahasa Malaysia — it says hari membakar");

  // And the two places a customer meets the day FIRST carry the new word in the markup itself,
  // not only in the dictionary, so the page is right before the script ever runs.
  assert.match(html, /data-i18n="deliveryDays"[^>]*>Bake days</,
    "the info row under the answer reads 'Bake days'");
  assert.match(html, /data-i18n="sPickDay"[^>]*>Pick a bake day</,
    "and step 1 is 'Pick a bake day'");
});

test("the note field names BOTH ways of getting an order (v408)", () => {
  // ★★ Her words: __"change the Delivery Notes(optional) to Notes for Collection/Delivery"__.
  // ⚠️ It is the THIRD time the same fault has been repaired on this page and the second time she
  // has caught it herself: a label named ONE of the two ways to get an order, so the customer it
  // misled was the one COLLECTING — who read "Delivery note" and skipped the box that asks for the
  // gate code or the landmark, which is the thing that actually gets them their bread.
  //
  // ⚠️ THE RULE IS PINNED OVER EVERY LANGUAGE, because the fault is in the WORD and a word can
  // come back one dictionary at a time.
  assert.match(STORE.en.noteLabel, /Collection\/Delivery/,
    "the English label names both ways");
  assert.ok(!/^Delivery note/i.test(STORE.en.noteLabel),
    "and no longer names only one of them");
  for (const l of ["zh", "ms"]) {
    assert.ok(STORE[l].noteLabel && STORE[l].noteLabel !== STORE.en.noteLabel,
      `${l} has its own wording, not the English one`);
  }
  assert.deepEqual(
    Object.entries(STORE.en).filter(([, v]) => typeof v === "string" && /^Delivery note/i.test(v)).map(([k]) => k),
    [], "no English string calls it a delivery note any more");

  // ⚠️ AND THE PLACEHOLDER MOVED WITH IT: "delivery time" is the wrong thing to ask a customer who
  // is coming to fetch it, and a placeholder is read more than a label is.
  assert.ok(!/delivery time/i.test(STORE.en.notePh),
    "the placeholder no longer asks a collecting customer for a delivery time");

  // Authored into the page itself, not only the dictionary — the label is on screen before the
  // script ever runs.
  assert.match(html, /data-i18n="noteLabel"[^>]*>Notes for Collection\/Delivery \(optional\)</,
    "and the markup carries the new label");
});

test("★★ the places are part of the Self collect choice, not a box under it (v410)", () => {
  // Her words: __"there is 2 main selection, select self collect and a drop drown appear, should
  // not be in present interface"__ — the list of places and the choice to collect were TWO steps,
  // and a control that appears once something is chosen reads as a second question rather than as
  // part of the first.
  //
  // ⚠️ NO TEST CAN SEE THIS. It is a shape, and the shop's own test shim carries no static markup —
  // so **the rule is pinned against the page itself**, which is the same approach v392 took when a
  // button row measured 403px on a 360px phone and no assertion could have caught it.
  // ⚠️ THE SLICE ENDS AT THE NOTE FIELD, not at `address-field` any more — since v412 the address
  // is INSIDE this picker, so slicing to it would cut the picker in half and every position read
  // below would be measured against a truncated block.
  const seg = html.slice(html.indexOf('id="fulfillment"'), html.indexOf('id="note-input"'));
  assert.ok(seg.length > 0, "the fulfilment picker is on the page");

  // ⚠️ ONE CARD PER WAY, with the press inside it — that is what lets the edge go round the place
  // list as well as the words.
  const cards = [...seg.matchAll(/<div class="seg-opt[^"]*" data-opt="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(cards, ["collect", "courier"], "the two ways, each its own card");
  // ⚠️ THE COLLECT CARD STARTS ON IN THE MARKUP, before the script runs — it is the default choice,
  // and a first paint with no edge on either card would flash the wrong one. (Which card the SCRIPT
  // lights as the choice is browser-only: this test shim carries no static markup, so `closest` has
  // nothing to walk. That half is verified by looking, and it is why the rule below is pinned at
  // all — see the note about v392 in this file's sibling, store.test.js.)
  assert.match(seg, /<div class="seg-opt active" data-opt="collect">/,
    "the self-collect card is the one wearing the edge on arrival");
  // ⚠️ AND THE PLACES ARE INSIDE IT — bounded by POSITION, because the list must be after the
  // collect card opens AND before the courier card does. A lazy `[\s\S]*?` from the collect card
  // would also match a list sitting inside the COURIER card further down, which is the fault this
  // is here to catch; two `indexOf` bounds cannot be fooled that way.
  const atCollect = seg.indexOf('data-opt="collect"');
  const atList = seg.indexOf('id="point-list"');
  const atCourier = seg.indexOf('data-opt="courier"');
  assert.ok(atList > atCollect && atList < atCourier,
    `⚠️ the place list sits INSIDE the collect card — one piece (collect@${atCollect}, list@${atList}, courier@${atCourier})`);

  // ★★ AND IT ARRIVES FOLDED (v412). Her words: __"i want the self collect card at store to be
  // folded as default"__. ⚠️ The list is hidden IN THE MARKUP, so the very first paint — before a
  // byte of script has run — is the folded card and never flashes the open one. ⚠️ And the caret is
  // the whole of the hint that there is anything behind it, so it is authored in too.
  assert.match(seg, /<div class="point-list" id="point-list" hidden>/,
    "the places are shut in the markup itself, not shut by the script a moment later");
  assert.match(seg, /class="seg-caret" id="collect-caret">▸</,
    "and the caret points at what is behind it from the first paint");
  const css2 = readFileSync(new URL("../store/app.css", import.meta.url), "utf8");
  assert.match(css2, /#point-list\[hidden\]\s*\{\s*display:\s*none/,
    "a folded list takes no room at all");

  // ⚠️ AND THE SEPARATE FIELD IS GONE — no labelled box that appears, and no dead string left in
  // the dictionary for it to fall back on.
  assert.equal(seg.includes('id="point-field"'), false, "the appearing field is not in the page");
  assert.equal(/\bcollectFrom\b/.test(html), false, "and the page no longer names it");
  assert.equal("collectFrom" in STORE.en, false, "nor does the dictionary still carry the word");
  for (const l of ["zh", "ms"]) {
    assert.equal("collectFrom" in STORE[l], false, `${l} does not carry it either`);
  }

  // ⚠️ THE EDGE IS ON THE CARD, TOO — `.seg-opt.active`, never `.seg-btn.active`, or the border
  // would draw a line between the choice and the places it contains.
  const css = readFileSync(new URL("../store/app.css", import.meta.url), "utf8");
  assert.match(css, /\.seg-opt\.active\s*\{/, "the chosen card wears the edge");
  assert.equal(/\.seg-btn\.active\s*\{/.test(css), false,
    "and the press inside it does not — one edge, on the card");
});

test("★★ the address is part of the Courier choice, the same way the places are (v412)", () => {
  // Her words: __"courier delivery and address should be one piece"__ — ⭐ the exact mirror of the
  // places inside the collect card, and the same reasoning: **the thing a choice needs is PART of the
  // choice, not a field that appears under it.** ⚠️ Same approach as the test above: it is a SHAPE,
  // and the shop's own test shim carries no static markup, so the rule is pinned against the page.
  const seg = html.slice(html.indexOf('id="fulfillment"'), html.indexOf('id="note-input"'));

  const atCourier = seg.indexOf('data-opt="courier"');
  const atAddr = seg.indexOf('id="address-field"');
  // ⚠️⚠️ BOUNDED AT BOTH ENDS, and the upper one is the whole point. `atAddr > atCourier` alone
  // says only that it comes after the courier card OPENS — ⭐ **and a box moved out to sit BELOW the
  // picker satisfies that**, which is the very fault being repaired. (Written that way at first, and
  // the bite proved it: moving the address out entirely left the test green.) The bound is the
  // comment that stands where the picker's closing tag is, so anything after it is outside.
  // ⚠️⚠️ THE BOUND IS THE CARD'S OWN CLOSING TAG, not the end of the picker, and that is the whole
  // correction: an address moved to sit AFTER the courier card but still inside the picker satisfied
  // a picker-wide bound — ⭐ **the bite proved it, twice.** The card closes with a `</div>` at ten
  // spaces, which is the first one at that depth after the card opens. This file's indentation is
  // deliberate and stable, and a rule with no engine behind it has to read the shape it can see.
  const cardEnd = seg.indexOf("\n          </div>", atCourier);
  assert.ok(atCourier >= 0 && cardEnd > atCourier, "the courier card's own bounds were found");
  assert.ok(atAddr > atCourier && atAddr < cardEnd,
    `⚠️ the address box is INSIDE the courier card — one piece, not a box below it (courier@${atCourier}, address@${atAddr}, card ends@${cardEnd})`);

  // ★ AND THE COURIER CARD SAYS IT OPENS, exactly as the collect one does — two cards doing the same
  // job must not look like two different kinds of thing.
  assert.match(seg, /class="seg-caret" id="courier-caret">▸</,
    "the courier line carries a caret too");
  assert.match(seg, /<div class="field addr-body" id="address-field" hidden>/,
    "and the address starts shut with it");

  const css = readFileSync(new URL("../store/app.css", import.meta.url), "utf8");
  assert.match(css, /\.addr-body\s*\{\s*padding:/,
    "the address panel is styled like the place list, not as a second kind of panel");

  // ⚠️⚠️ AND THE CARD IS NOT WHITE — PINNED AS A RULE, BECAUSE NO TEST CAN SEE LAYOUT. Her words:
  // __"even after i expend it, there should not be hole"__. ⭐ The hole was the picker sitting INSIDE
  // the white "Your details" form with `--surface` of its own: white on white, so an opened card was
  // **a void with thin outlines floating in it.** ⚠️ The same approach v392 took when a button row
  // measured 403px on a 360px phone — the assertion is on the RULE, and the look is checked by eye.
  assert.match(css, /\.seg-opt\s*\{[^}]*background:\s*var\(--bg\)/,
    "the card takes the page's own surface, so an open one is a panel and not a hole");
  assert.equal(/\.seg-opt\s*\{[^}]*background:\s*var\(--surface\)/.test(css), false,
    "and never the white the form behind it is made of");

  // ⚠️⚠️ AND THE CHOSEN PLACE IS THE ONE THAT STANDS OUT — THE INVERSE OF HOW IT WAS.
  // Her words, with a picture: __"you see the white, that is a hole when the self collect card
  // unfold. It confuse user of actually which is the selected"__. ⭐ **Every row was white and only
  // the chosen one was tinted — and the card is tinted too — so the chosen place dissolved into the
  // card while every place the customer had NOT chosen stood out as a bright white slab.** A
  // customer reads the loudest row as the selected one, and it was pointing at the wrong place.
  // ⚠️ PINNED AS A RULE, because no test in this suite can see a colour.
  assert.match(css, /\.point-opt\.active\s*\{[^}]*background:\s*var\(--surface\)/,
    "the CHOSEN place wears the panel — the loudest row must be the one the customer picked");
  assert.match(css, /\.point-opt\s*\{[^}]*background:\s*transparent/,
    "and every other place sits flat on the card, so none of them can be mistaken for it");
  // ⚠️⚠️ AND AN UNCHOSEN PLACE STILL WEARS A FRAME YOU CAN SEE. Her words: __"can the unselected be
  // frame as well with a very thin frame, so it is clear that custoerr is selecting from only 2
  // available choices"__. ⭐ **The frame was already there — `--line` is a cream picked to sit on
  // WHITE, and on the card's own tint it is invisible**, so an unchosen place read as bare text
  // rather than as the other thing you may pick.
  assert.match(css, /\.point-opt\s*\{[^}]*border:\s*1px solid rgba\(/,
    "an unchosen place is framed too — every row must read as one OF the choices");
  assert.equal(/\.point-opt\s*\{[^}]*border:\s*1px solid var\(--line\)/.test(css), false,
    "and not with a hairline the card's own colour swallows");
});
