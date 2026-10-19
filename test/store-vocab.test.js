// test/store-vocab.test.js — HER WORDING DECISIONS, PINNED SO THEY CANNOT DRIFT.
//
// ⚠️⚠️ WHY THIS FILE EXISTS. Her ask: __"i want AI to reconfirm the translation rather then just depend on the
// traslator"__ — and she sat through sixteen decisions, one at a time, with the whole sentence in front of her
// (__"you have to give me the context and also the whole sentance before ask"__).
// ⭐⭐ **AND FOR FIVE DAYS THE RECORD SAID "NONE APPLIED", WHILE THE FILE HAD ALREADY HAD THEM APPLIED.** ⚠️
// **Two records disagreed and NOTHING measured which was true.** ⭐ **A decision that lives only in a note is a
// decision the next translation pass can undo in silence** — which is [[feedback-engine-vocabulary-check]]
// arriving on wording rather than on a check.
//
// ⭐ So this pins the DECISIONS, not the whole dictionary: the words she chose, the sentences she wrote, and the
// two places she deliberately left alone.

import { test } from "node:test";
import assert from "node:assert/strict";

import { STORE } from "../store-lang.js";
import { HOME } from "../home-lang.js";

const { en, zh, ms } = STORE;

// ⭐ THE ALL-LANG STRINGS, joined, so a sweep sees every dictionary at once.
const ALL_MS = Object.entries(ms).map(([k, v]) => `${k}: ${v}`).join("\n");
const ALL_ZH = Object.entries(zh).map(([k, v]) => `${k}: ${v}`).join("\n");

// ── 1 · the words she chose, and where she chose them ────────────────────────

test("★★★ her words: a bakery is a BAKERI, never a translated cake maker", () => {
  // Her decision, row 1. ⭐ **She picks the word her customers actually say** — where I had been preserving a
  // word because it was already in the file.
  assert.match(ms.sendingToBakery || "", /bakeri/);
  assert.match(ms.orderRecvSub || "", /bakeri/);
  assert.doesNotMatch(ALL_MS, /pembuat kek/i,
    "★ \"pembuat kek\" (cake maker) is back in the Malay — **she replaced it with `bakeri` because that is the "
    + "word her customers say, not the word the translator reached for**");
});

test("★★★ a driver is a DRIVER — never `pemandu`", () => {
  // Her decision, row 7. ⭐ Borrowed words her customers use, over the dictionary's.
  assert.equal(ms.tripNoDriver, "Belum ada driver");
  assert.equal(ms.driverLine, "Driver: %1");
  assert.match(ms.tripFinding || "", /driver/i);
  assert.match(ms.callDriver || "", /driver/i);
  assert.doesNotMatch(ALL_MS, /pemandu/i,
    "★ `pemandu` is back — **she chose the borrowed word \"driver\", and it must be the same in every string**");
});

test("★★★ it is an ORDER — never `tempahan` or `pesanan`", () => {
  // Her decision, row 9: 31 strings said `tempahan` and 3 said `pesanan`, which is two words for one thing.
  assert.doesNotMatch(ALL_MS, /tempahan/i,
    "★ `tempahan` is back — **her shop calls it an order, in her app AND on the shop**");
  assert.doesNotMatch(ALL_MS, /pesanan/i, "★ `pesanan` is back — a third word for the same thing");
});

test("★★★ a bake day is `hari membakar` — her app's own word", () => {
  // Her decision, row 6.
  assert.match(ms.calChosenFor || "", /hari membakar/);
  assert.match(ms.needDayTitle || "", /hari membakar/);
  assert.doesNotMatch(ALL_MS, /hari bakar/i,
    "★ `hari bakar` is back — **her app says `hari membakar` in 14 places, and the shop must not use a different "
    + "word for the same day**");
});

test("★★★ a closed day is `hari itu`, not `hari ini`", () => {
  // Her decision, row 2 — ×2. ⚠️ `hari ini` is a CORRECT word elsewhere (``ansClosed``, ``noMenuToday`` mean
  // today), so this is pinned on the two strings that were wrong, not banned across the file.
  assert.match(ms.closedUnmarked || "", /hari itu/);
  assert.match(ms.confirmClosedBody || "", /hari itu/);
  assert.doesNotMatch(ms.closedUnmarked || "", /hari ini/,
    "★ a day that is not today is being called \"today\" — **that is the fault, exactly**");
});

test("★★★ a promo is `disertakan` and a paused one is `dihentikan sementara`", () => {
  // Her decisions, rows 8 and 10. ⚠️ `sedang ditahan` meant "being DETAINED".
  for (const k of ["promoAccepted", "promoAcceptedUsed", "promoAcceptedFirst"]) {
    assert.match(ms[k] || "", /telah disertakan/, `${k} does not say the code is included`);
  }
  assert.equal(ms.promoPaused, "Kod itu dihentikan sementara — ia tidak tersedia buat masa ini.");
  assert.doesNotMatch(ALL_MS, /telah digunakan/i, "★ `telah digunakan` (already USED) is back");
  assert.doesNotMatch(ALL_MS, /sedang ditahan/i, "★ `sedang ditahan` (being DETAINED) is back");
});

test("★★★ the bring-a-friend line is exactly hers", () => {
  // Her decision, row 5 — the whole sentence, not a fragment.
  assert.equal(ms.promoFriend, "Diskaun bawa rakan yang dihantar kepada anda: -%1");
});

test("★★★ her Chinese: 已烤好 · 烘焙日 · 应用程式 · the firmer 以免订单丢失 · the NEUTRAL bread line", () => {
  assert.equal(zh.trkBaking, "已烤好");                     // row 3 — was 烘焙中
  assert.match(zh.noOpenDates || "", /烘焙日/);              // row 4 — was 派送
  assert.equal(zh.failTitle, "暂时联系不上烘焙店的应用程式。"); // row 12 — 应用程式, the word a Penang customer says
  assert.equal(zh.failOpened, "WhatsApp 已打开并带上你的订单 — 请按「发送」，以免订单丢失。"); // row 13 — HER phrase
  assert.equal(zh.ansNext, "下一次可以拿到面包的日子是 %1。"); // row 14 — neutral, NOT 取货
  assert.doesNotMatch(ALL_ZH, /烘焙中/,
    "★ `烘焙中` (baking right now) is back on a stage that means BAKED");
});

test("★★★ `spam` is translated in both — her call, not mine", () => {
  // Her decision, row 16. ⚠️ **I recommended leaving `spam` because Malaysian speakers say it; she translated
  // it anyway.** ⭐ **The app's voice is hers.**
  assert.match(zh.waSub || "", /骚扰/);
  assert.match(ms.waSub || "", /mesej sampah/);
});

test("★★★ the one sentence nobody had looked at, because it is not on the shop yet", () => {
  // Her decision, row 15. ⚠️ **It belonged to the step lock, which is unbuilt — which is exactly why it was the
  // last one applied, five days after the other fifteen.**
  assert.equal(zh.confirmAddNameBody, "这样我们在跟你确认订单时，才知道这份订单是谁的。");
  assert.equal(ms.confirmAddNameBody,
    "Kami guna ini untuk tahu order ini untuk siapa semasa kami mengesahkannya dengan anda.");
});

// ── 2 · the two she deliberately LEFT ALONE ─────────────────────────────────

test("★★ two false positives stay FALSE POSITIVES — do not \"fix\" them", () => {
  // ⭐ Both were flagged by the blind checks and both are correct as written. ⚠️ **A sweep that keeps reporting
  // them is a sweep that teaches her to ignore it.**
  //   · `addressLabel` — 派送地址 is the right word for a DELIVERY address; 派送 was only wrong where it
  //     meant "bake days".
  assert.equal(zh.addressLabel, "派送地址");
  //   · `fbThanks` (BM) — the `!` is present, moved to the first clause, which is Malay idiom.
  assert.match(ms.fbThanks || "", /!/, "the exclamation mark was moved, not lost");
});

// ── 3 · and the one stray mark that was a real fault, and is fixed ───────────

test("★★ `devBy` carries no stray colon — the English and Malay have none", () => {
  assert.doesNotMatch(zh.devBy || "", /：/, "★ the colon is back — **it printed before the developer's name**");
  assert.equal(en.devBy, "Website by");
  assert.equal(ms.devBy, "Laman web oleh");
});

// ── v583 · four wordings the audit found — the fixes, pinned ──────────────────

const ALL_HOME_MS = Object.entries(HOME.ms).map(([k, v]) => `${k}: ${v}`).join("\n");

test("★★★ the homepage's Malay says TEMPAHAN, never TEMPOHAN (v583)", () => {
  // ⚠️ "TEMPOHAN" is not a Malay word; the same file's very next line uses "Tempahan".
  assert.doesNotMatch(ALL_HOME_MS, /tempohan/i, "★ a misspelling is back in the homepage's Malay");
  assert.match(HOME.ms.n1Title, /tempahan sahaja/i);
});

test("★★★ a review reaches the BAKERI, never a cake maker (v583)", () => {
  assert.doesNotMatch(ALL_HOME_MS, /pembuat kek/i,
    "★ \"pembuat kek\" (cake maker) is back in the Malay review thanks — her word is `bakeri`");
  // ⚠️ AND THE WORD SHE CHOSE IS THERE (v588): a thanks that says neither "pembuat kek" nor "bakeri" passed the
  // guard above while telling the reviewer their words reached nobody in particular.
  assert.match(HOME.ms.rvThanksMain, /bakeri/,
    "★ the Malay review thanks never says where the review went");
  assert.match(HOME.ms.rvThanksWords, /bakeri/,
    "★ the words-only Malay thanks never says where the review went");
});

test("★★★ a fully claimed code says nothing is left, not that everything was included (v583)", () => {
  // ⚠️ The Malay ended "semuanya telah disertakan" — "everything has been included" — where the English says
  // "all of it has been used": the two sentences contradicted each other about one code.
  // ⚠️ AND HER OWN RECORDED DECISION (row 8) BANS "telah digunakan" in the Malay, so the truth is said the
  // other way round: nothing is left.
  assert.match(ms.promoClaimed, /tiada lagi/i, "★ the Malay promo sentence contradicts its own English");
  assert.doesNotMatch(ms.promoClaimed, /disertakan/i);
  assert.doesNotMatch(ms.promoClaimed, /telah digunakan/i, "★ her pinned wording decision was broken");
});

test("★★★ the collection window is the late AFTERNOON in Chinese, not dusk (v583)", () => {
  // ⚠️ 傍晚 is dusk — late enough that a customer could arrive after the window has closed.
  assert.doesNotMatch(zh.selfCollectSub, /傍晚/,
    "★ the Chinese says dusk where the English says late afternoon");
  assert.match(zh.selfCollectSub, /下午/);
});
