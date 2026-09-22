// views/scenario.js — the scenario planner (21 Sep 2026).
//
// She asked to design the line rather than only read it: modules she assembles
// like Lego, each scenario revealing its cycle time, and the module start times
// tuned to shrink the people it needs. All the arithmetic is in js/scenario.js
// — this screen only draws it, so the two can never disagree.
//
// The method it is built around is hers, in her words: ask for more pans than
// the line makes, find the one module that stops you, relieve exactly that, and
// meet the next wall. That ladder is the climb card, and it is computed from the
// modules rather than written down — change one number and it is a different
// climb.
//
// The second round of asks, in her words again: a start time she can set ("say
// i want a start at 8am"), "an time scale ruler", modules she can "create, edit
// and delete" and "move the sequence of", scenarios she can "save and name …
// edit or delete", "one person for each module" with "a Total person showing
// overlapping persons time slot", a module that can "restart", modules she can
// "drag to move the start time", and the fold module showing its 28 minutes with
// its person's 2 minutes.
//
// It is a planner she types into: nothing here reads an order, and nothing here
// blocks a sale.

import { el, button, select, showPopup, toast, confirmDialog } from "../ui.js";
import { save } from "../state.js";
import { trim } from "../production.js";
import {
  computeScenario, climbSteps, descentSteps, DEFAULT_SCENARIO, SISTER_SCENARIO, ONE_BAKER_SCENARIO,
  hoursAndMinutes,
  clockOf, moveModule, removeModule, newModuleId, blankModule, copyScenario,
  PX_PER_MIN_CHOICES, scenarioSummary, moduleFacts, chainLine, latestStarts,
  combinedScenario, linesInForce, moduleOf, minuteAtPx, placesOn, clampBatchStart,
  alignBatches, batchMismatches, personName, callWindows,
  START_MODES, START_MODE_LABELS, START_MODE_HINTS, START_MODE_READINGS,
  startModeOf, setStartMode,
} from "../scenario.js";

// A colour per PERSON, so a row reads as one worker's day rather than as a
// patchwork of the modules they passed through. The person rows used to be tinted
// by the module each stretch of work came from, which made one person's row eight
// different colours and told her nothing about the person.
const PERSON_TONES = 8;
const personTone = (who) => `ptone-${((Math.max(1, Math.round(Number(who) || 1)) - 1) % PERSON_TONES) + 1}`;

// A colour per module, so a bar on the timeline and the person carrying it can be
// matched by eye. It cycles, so a module added later still gets a colour.
const TONES = 8;

// The shortest bar that still carries its minutes inside it.
const LAB_MIN_PX = 26;

// The narrowest a stretch of her hands is ever drawn inside a bar. A minute of
// the fold is under two pixels at the scale the day is read in, and drawn at
// that width it lands exactly on the seam between two cycles and reads as that
// seam rather than as her working there. It is the same floor the person rows
// give a stretch of her day, so a bar and the person row that attends it agree
// about what a one-minute job looks like.
const MIN_TOUCH_PX = 4;

// When a module's cycles overlap, they are stacked in lanes rather than painted
// over each other. These are the same numbers as the single-lane bar's box, so a
// row that does not overlap is drawn exactly as it always was: one 16px bar at
// top 9. A row that does overlap splits that same 16px into as many lanes as it
// needs — two lanes still fit the 34px track it always had, and a third grows the
// row's own track to fit.
const LANE_TOP = 3;
const LANE_PITCH = 11;
const LANE_H = 9;
const TRACK_MIN_H = 34;
const laneTrackH = (lanes) => Math.max(TRACK_MIN_H, LANE_TOP + lanes * LANE_PITCH + 4);

// How many shades the cycles inside a batch are drawn in. Four is what a batch
// of four needs to be read as four, and the palest of them is lifted off the
// floor so it still shows over the pastel bar tones. A fifth cycle and beyond
// reuse the darkest shade rather than falling back to the palest — a long batch
// must never end on the faintest band — and the bar's own tooltip names each one.
const CYCLE_SHADES = 4;

// The band at the top of a track that carries the batch numbers. A tag cannot be
// drawn inside its bar — `.tl-bar` is 16px tall with overflow hidden, so anything
// written in there is clipped — so each row grows by this much and the tags sit in
// the space above the bars.
const TAG_BAND = 11;

const DAY_MIN = 24 * 60;

// The four stops of the scale, in the order of PX_PER_MIN_CHOICES: a whole day,
// the standard reading, close, and closest. Since v157 the control is a step of
// two buttons and one of these words stands between them as the stop in force.
const SCALE_NAMES = ["Wide", "Standard", "Close", "Closest"];

// How fine the clock ruler is drawn, one entry per stop of PX_PER_MIN_CHOICES.
//
// Her ask of 22 September: "make the ruler resolution to 1min". A minute hairline
// is only a reading if it can be told apart from the one beside it, and at the two
// wide stops a minute is 1.2px and 1.6px — a solid band of them is a grey smear,
// not a ruler. So the step follows the scale, which is her own answer ("a minute
// where it can be drawn"): half hours across a whole day, quarter hours at the
// standard reading, five minutes at Close, and a minute at Closest, where she is
// lining two bars up and the minute is the thing she is looking at.
//
// A table and not a formula, because which step is worth drawing at which scale is
// a reading decision, and it should be possible to read it here.
const TICK_MIN = [30, 15, 5, 1];

export function renderScenario(root, state) {
  const sc = ensureScenario(state);
  const ask = el("div", {});
  const readout = el("div", {});
  let dead = false;

  // What the day is DOING, as opposed to what it says it will do. Never stored:
  // `sc` IS the saved scenario, so anything written here would be saved with it and
  // a clock would start ticking again the next time she opened the screen. Held in
  // this closure for as long as the screen is open, and thrown away with it.
  const run = {
    on: false,          // whether the day is being walked through right now
    startedMs: 0,       // the wall clock when she pressed Start
    nowMin: 0,          // where the now-line is, in minutes from the start of her day
    lastMin: -1,        // the last minute already called, so no call is made twice
    line: null,         // the now-line element, kept across repaints
    rulerLeft: 0,       // the ruler's own offset, measured once per repaint
    pxPerMin: 1,        // this scenario's scale, so the line can be placed
    dayStart: 0,        // the clock minute 0 of THIS run, so its label reads true
    host: root,         // where a call card is drawn — dies with the screen
    timer: null,
    wake: null,
    audio: null,
    pending: null,      // the call waiting for an OK
    // The start times of every module, as they were before her first press on
    // the day's own card — so working the day backwards is never a one-way door.
    // Here for the same reason as everything else above: this is what the screen
    // is DOING, not something she has said about her bake day, so it is never
    // saved and it is gone when the screen is.
    dayBefore: null,
  };

  // Only the answers are repainted when something changes — never the fields —
  // so the box she is typing in keeps its place and its cursor.
  const on = {
    refresh: () => {
      if (!dead) readout.replaceChildren(...blocks(sc, state, on, run));
    },
    // The one thing that does redraw the fields. Opening a saved scenario, or
    // renaming the one she is in, replaces the name, the start time and the
    // target as well as the modules — and with only the answers repainted the
    // top of the screen went on describing the scenario she had just left while
    // the timeline below drew the one she had opened. Only ever called for an
    // action she took deliberately, never while she is typing.
    reload: () => {
      if (dead) return;
      ask.replaceChildren(askCard(sc, on));
      on.refresh();
    },
    // Every edit goes through the app's own save, which is what the sync engine
    // and the storefront both hang off — so the other phone's planner catches up
    // the same way the rest of the settings do.
    persist: () => save(state),
  };

  root.classList.add("wide");
  const tabbar = document.getElementById("tabbar");
  if (tabbar) tabbar.classList.add("wide");

  root.replaceChildren(ask, readout);
  on.reload();

  return () => {
    dead = true;
    // Leaving the screen stops the day. A clock that went on ticking behind another
    // tab would be a call with nothing on screen saying where it came from.
    stopDay(run, on);
    root.classList.remove("wide");
    if (tabbar) tabbar.classList.remove("wide");
  };
}

// The stored scenario, seeded on first open so the screen says something true
// before she has typed anything. Once seeded it is hers — a default never
// overwrites a number she has changed.
function ensureScenario(state) {
  const s = state.settings.scenario || (state.settings.scenario = {});
  if (!Array.isArray(s.modules) || !s.modules.length) {
    s.modules = DEFAULT_SCENARIO.modules.map((m) => ({ ...m }));
  }
  if (s.target == null) s.target = DEFAULT_SCENARIO.target;
  if (!s.name) s.name = DEFAULT_SCENARIO.name;
  if (s.note == null) s.note = DEFAULT_SCENARIO.note;
  if (s.dayStartMin == null) s.dayStartMin = DEFAULT_SCENARIO.dayStartMin;
  if (s.pxPerMin == null) s.pxPerMin = DEFAULT_SCENARIO.pxPerMin;
  return s;
}

// ── The clock ──────────────────────────────────────────────────────────────
//
// Every minute on this screen is counted from the start of HER day, and shown
// as the time of day it really is. So minute 0 with a 3 pm start reads "3:00
// pm", and the overnight retard crosses midnight the way it does in life.
function clockAt(dayStartMin, min) {
  return clockOf(dayStartMin + Math.round(Number(min) || 0));
}

function timeFieldValue(dayStartMin) {
  const m = ((Math.round(Number(dayStartMin) || 0) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function minutesOfTime(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || ""));
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return Number.isFinite(mins) ? mins % DAY_MIN : null;
}

// ── What she is asking for ─────────────────────────────────────────────────
function askCard(sc, on) {
  const name = el("input", { class: "input", type: "text", value: sc.name || "" });
  name.addEventListener("input", () => { sc.name = name.value; on.persist(); });

  const target = el("input", {
    class: "input", type: "number", inputmode: "numeric", min: "0", step: "1",
    value: sc.target == null ? "" : String(sc.target),
  });
  target.addEventListener("input", () => {
    const n = Number(target.value);
    if (Number.isFinite(n) && n >= 0) { sc.target = n; on.persist(); }
    on.refresh();
  });

  const start = el("input", {
    class: "input", type: "time", step: "900", value: timeFieldValue(sc.dayStartMin),
  });
  start.addEventListener("input", () => {
    const m = minutesOfTime(start.value);
    if (m == null) return;
    sc.dayStartMin = m;
    on.persist();
    on.refresh();
  });

  return el("div", {},
    el("p", { class: "card-sub", style: "margin:0 0 12px" },
      "Design the line the way you would build it: modules on a clock, each with its own minutes. Every figure here is a starting number you are meant to change — nothing on this screen reads an order or blocks a sale."),
    el("div", { class: "card" },
      el("p", { class: "card-title" }, "This scenario"),
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "A scenario is the sum of its modules. Scenario 1 is the line you have now with no fridge in it — the fridge is in the list switched off, so you can see what adding one would buy without buying one."),
      el("div", { class: "field" },
        el("label", {}, "What this scenario is called"),
        name),
      el("div", { class: "field" },
        el("label", {}, "My day starts at"),
        start,
        el("div", { class: "hint" },
          "The time you begin. Every other time on this screen is counted from it, and the ruler along the top is drawn from it — so a module that starts an hour in reads one hour after this.")),
      el("div", { class: "field" },
        el("label", {}, "Pans a day you want from it"),
        target,
        el("div", { class: "hint" },
          "Raise this and the ladder below answers again: it names the module that stops you at this number, what to change to get past it, and what becomes the wall next."))));
}

function blocks(sc, state, on, run) {
  const r = computeScenario(sc);
  const climb = climbSteps(sc, r.target);
  return [
    answerCard(r), climbCard(r, climb, sc, on), dayCard(r, sc, on, state, run),
    parkedCard(r, sc, on), scenariosCard(sc, state, on),
  ];
}

// ── What it makes ──────────────────────────────────────────────────────────
function answerCard(r) {
  const kids = [
    el("p", { style: "margin:0 0 6px" },
      "This scenario makes ",
      el("b", {}, `${r.pansPerDay} ${r.pansPerDay === 1 ? "pan" : "pans"}`),
      r.target > 0 ? `, and you want ${r.target}.` : "."),
  ];

  if (r.target > 0 && r.shortfall > 0) {
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 10px" },
      `That is ${r.shortfall} ${r.shortfall === 1 ? "pan" : "pans"} short of the day.`));
  } else if (r.target > 0) {
    const spare = r.pansPerDay - r.target;
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 10px" },
      spare > 0
        ? `That covers the day, with ${spare} ${spare === 1 ? "pan" : "pans"} to spare.`
        : "That is exactly the day — there is no slack in it at all."));
  }

  kids.push(el("div", { class: "plan-cost" },
    el("span", { class: "plan-cost-lab" }, "What this plan costs:"),
    el("b", {}, `${r.people} ${r.people === 1 ? "person" : "people"}`),
    el("span", { class: "plan-cost-dot" }, "·"),
    el("b", {}, `${hoursAndMinutes(r.personMin)} of hands`),
    el("span", { class: "plan-cost-dot" }, "·"),
    el("b", {}, `a ${hoursAndMinutes(r.runMin)} day`),
    el("div", { class: "card-sub", style: "margin:4px 0 0" },
      "The three things you are buying down together — the most hands at any one minute, the total minutes of somebody's time, and how long the run takes. Move a module, or one batch of it, and all three answer again — so a change that helps one and costs another is visible rather than hidden in a single number.")));

  kids.push(factGrid(r));
  kids.push(el("p", { style: "margin:10px 0 0" },
    el("b", {}, `${r.wall.icon} ${r.wall.name} sets your pace.`)));
  kids.push(el("p", { class: "card-sub", style: "margin:4px 0 0" }, wallWhy(r)));

  return el("div", {}, el("h2", { class: "section" }, "What it makes"), el("div", { class: "card" }, ...kids));
}

function factGrid(r) {
  return el("div", { class: "facts" },
    fact("Pans a day", String(r.pansPerDay), "the least any module turns out"),
    // The minutes a pan costs the line, counted off the slowest module. It is
    // labelled "minutes a pan" and NOT "cycle time", because "cycle" is now her own
    // word for one piece of work inside a batch, and one word with two meanings on
    // one screen is how a new vocabulary fails to take.
    fact("Minutes a pan", `${trim(round1(r.cycleMin))} min`, "off the slowest module"),
    fact("People needed", String(r.people), r.people === 1 ? "pair of hands" : "pairs of hands"),
    // "The day" would be a lie the moment the chiller cycles twice: a 12-hour
    // retard makes a run span more than 24 hours of clock, so the number beside
    // "pans a day" must not also claim to be a day. This is how long the run
    // takes, with the two real times of day it runs between.
    fact(
      "The run",
      hoursAndMinutes(r.runMin),
      `${clockAt(r.dayStartMin, r.firstMin)} → ${clockAt(r.dayStartMin, r.endMin)}`));
}

function fact(label, value, sub) {
  return el("div", { class: "fact" },
    el("div", { class: "fact-label" }, label),
    el("div", { class: "fact-value" }, value),
    el("div", { class: "fact-sub" }, sub));
}

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Why this module and not another — in the module's own numbers, and naming the
// tie when there is one. A tie matters: several modules passing the same small
// number is one shared limit wearing several hats, and relieving just one of
// them will not move the day at all.
function wallWhy(r) {
  const w = r.wall;
  if (!w.id) return "Switch a module on and the line will answer.";
  if (w.batch <= 0 || w.repeatsHeld <= 0) {
    return `${w.name} turns out nothing at all — it has no pans in a batch or no batches in the day.`;
  }
  const tied = r.on.filter((f) => f.id !== w.id && f.output === w.output);
  const above = r.on
    .filter((f) => f.output > w.output)
    .sort((a, b) => a.output - b.output)[0];

  const lead = `${w.repeatsHeld} ${w.repeatsHeld === 1 ? "batch" : "batches"} of ${w.batch} pans is ${w.output} pans a day`;
  if (w.capped) {
    return `${lead} — but a ${hoursAndMinutes(w.cycleMin)} batch only fits ${w.fitsInDay} times in a day, so running it more often is not something a day can hold. This one has to take more pans at once.`;
  }
  if (tied.length) {
    return `${lead} — and ${tied.length === 1 ? "one other module turns out" : `${tied.length} other modules turn out`} the same ${w.output}, so they are one limit between them. Relieving only one of them will not move the day.`;
  }
  if (above) {
    return `${lead}, and the next tightest is ${above.icon} ${above.name} at ${above.output}. That is what the day can deliver.`;
  }
  return `${lead}, and nothing else is anywhere near it. That is what the day can deliver.`;
}

// ── The climb ──────────────────────────────────────────────────────────────
//
// The method she described, run for her: raise the number until something stops
// her, relieve that one thing, and meet the next wall. Every rung is one module
// and one change, so the list reads as the order she would do them in.
function climbCard(r, climb, sc, on) {
  // The day above the number in the box — the way down. The climb only ever adds
  // a batch, so a day that overshoots had nothing to press at all.
  const down = r.target > 0 && r.pansPerDay > r.target ? descentSteps(sc, r.target) : null;
  const downReady = !!(down && down.steps.length);
  // The heading and the card's own opening line follow the SUBJECT — which way the
  // numbers say the day has to move — and not whether there is a button to press.
  // A day above her number with a batch too big to come down past has no button and
  // is still entirely about coming down; headed "The climb" it would read as the
  // wrong card, and the paragraph under the heading would be telling her to raise a
  // day that is already too high.
  const overshoot = r.target > 0 && r.pansPerDay > r.target;
  const kids = [
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      overshoot
        ? "Your day makes more than the number you asked for, so this is the ladder read the other way: the batches to take off to bring it down. Every rung of the climb adds a batch and none takes one away, which is why this half had to be built separately."
        : "Raise the day until something stops you, fix that one thing, and meet the next wall. This is that ladder, for the number you asked for."),
  ];

  // NOTE the order: `climb.reached` means the LADDER gets there, not that the
  // line already does. Read the wrong way round, a 12-pan line asking for 36
  // reports "already makes your 36" and never shows the ladder at all.
  if (r.target <= 0) {
    kids.push(el("p", { class: "card-sub" },
      "Type how many pans a day you want above, and the ladder appears here."));
  } else if (r.pansPerDay > r.target) {
    // The day, not the ladder, is what stops this one: every module at the day's
    // own number is holding it there, and running fewer batches in all of them is
    // the only way down that does not go through a bigger batch.
    kids.push(el("p", { style: "margin:0 0 6px" },
      el("b", {}, `This scenario makes ${r.pansPerDay} pans, and you want ${r.target}.`)));
    const spare = r.pansPerDay - r.target;
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 10px" },
      `That is ${spare} ${spare === 1 ? "pan" : "pans"} more than you asked for.`));
    if (downReady) {
      kids.push(el("div", { class: "climb-list" }, down.steps.map(descentRow)));
      kids.push(el("p", { class: "card-sub", style: "margin:10px 0 0" },
        down.reached
          ? `That brings it to the ${down.want} pans you asked for.`
          : `That brings it to ${down.end.pansPerDay} pans, which is as low as running fewer batches can take it.`));
      kids.push(el("div", { class: "popup-actions" },
        button("Use these numbers", () => applyDescent(sc, down, on), "primary")));
    } else {
      // The mirror of the climb's "it has to take more pans at once": a batch is
      // already bigger than the day she asked for, so no count of them is small
      // enough. Said plainly, because a card with no button reads as a bug.
      kids.push(el("p", { class: "card-sub", style: "margin:0" },
        `Running fewer batches cannot get there: one batch is ${down.tooBig.batch} pans, so this line can never come below ${down.tooBig.batch}. To go under that, a batch has to take fewer pans at once — ${down.tooBig.batch} in a batch becoming less than ${down.tooBig.batch}, on every module that is holding the day up.`));
    }
  } else if (r.pansPerDay === r.target) {
    kids.push(el("p", { style: "margin:0 0 6px" },
      el("b", {}, `This scenario already makes your ${r.target} pans.`)));
    kids.push(el("p", { class: "card-sub", style: "margin:0" },
      "Raise the number you want and the ladder will find the next thing in the way."));
  } else if (climb.steps.length) {
    kids.push(el("div", { class: "climb-list" }, ...climb.steps.map((s, i) => climbRow(s, i))));
    kids.push(el("p", { class: "card-sub", style: "margin:10px 0 0" },
      climb.reached
        ? `That reaches the ${climb.want} pans you asked for.`
        : `That takes it to ${climb.end.pansPerDay}. ${climb.end.wall.icon} ${climb.end.wall.name} is still the wall at the end, and running that one more often will not move it — it needs a different answer.`));
    // The wall that ends the ladder when the day, not her, is what stopped it.
    // This is the buying decision, said plainly: a pass that is already running
    // as often as a day allows cannot be run more often, so it has to take more
    // at once. For her chiller that is trays, and it is the whole reason this
    // screen can also tell her NOT to buy.
    const stuck = climb.end.wall;
    if (!climb.reached && stuck.id && stuck.repeatsHeld >= stuck.fitsInDay && stuck.batch > 0) {
      kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `A ${hoursAndMinutes(stuck.cycleMin)} batch fits ${stuck.fitsInDay} ${stuck.fitsInDay === 1 ? "time" : "times"} in a day, and it is already running that often — and a second one of it has been tried too. So this one cannot be run more often either way. It has to take more pans at once, which means ${stuck.batch} in a batch becoming more than ${stuck.batch}.`));
    }
    kids.push(el("div", { class: "popup-actions" },
      button("Use these numbers", () => applyClimb(sc, climb, on), "primary")));
  } else {
    kids.push(el("p", { class: "card-sub" },
      "Nothing on this ladder moves that number. Look at the modules below — one of them turns out nothing at all."));
  }

  // The same button sits on the heading as well as at the foot of the card. The
  // ladder can be a dozen rungs long — a day of nine modules gives nine — and a
  // control she has to scroll past the whole thing to reach is a control that has
  // gone missing. Both press the same thing, and the heading carries it only when
  // the card below really has something to apply.
  const canApply = r.target > 0 && ((r.pansPerDay < r.target && climb.steps.length > 0) || downReady);
  const apply = downReady ? () => applyDescent(sc, down, on) : () => applyClimb(sc, climb, on);
  return el("div", {},
    el("div", { class: canApply ? "section-row" : "" },
      el("h2", { class: "section" }, overshoot ? "The way down" : "The climb"),
      canApply ? button("Use these numbers", apply, "primary") : null),
    el("div", { class: "card" }, ...kids));
}

// One rung of the way down. It names every module the move touches, because a
// move that quietly rewrites eight of her modules and says one name would be a
// worse lie than the sentence this half exists to fix. Where they all change the
// same way — which is the usual case, since a day run in step is a day whose
// modules all hold it up together — one line says the change and the names follow
// it, so eight identical lines do not have to be read to learn one fact.
function descentRow(d) {
  const items = d.items;
  const one = items.length === 1;
  const same = items.every((x) => x.from === items[0].from && x.to === items[0].to);
  const change = (x) => `${x.from} → ${x.to} ${x.to === 1 ? "batch" : "batches"} in the day, at ${x.batch} pans a batch.`;
  return el("div", { class: "climb-step" },
    el("div", { class: "climb-num" }, "↓"),
    el("div", { class: "climb-body" },
      el("div", { class: "climb-what" },
        one
          ? `${items[0].icon} ${items[0].name}`
          : `All ${items.length} modules holding the day at ${d.before} pans`),
      ...(same
        ? [el("div", { class: "li-sub" },
          one ? change(items[0]) : `${change(items[0])} The same change in each of them.`)]
        : items.map((x) => el("div", { class: "li-sub" }, `${x.icon} ${x.name} — ${change(x)}`))),
      ...(!one
        ? [el("div", { class: "li-sub" }, items.map((x) => x.name).join(", "))]
        : []),
      el("div", { class: "li-sub" }, `That takes the day from ${d.before} to ${d.after} pans.`),
      // A move that changes nothing has to say why, or it reads as a dud. A module
      // whose batches are already capped by the day's own room holds its output
      // wherever its count is, so taking batches off it cannot move it.
      d.after === d.before
        ? el("div", { class: "li-sub" }, "On its own that buys nothing — the day's own limit is holding this one at the same number.")
        : null));
}

function climbRow(s, i) {
  // A rung is either "run it more often" or "have a second one", and the two
  // read nothing alike — one buys cycles out of the same day, the other buys
  // capacity she does not have. Naming which is the difference between a ladder
  // she can act on and a number that moved.
  const how = s.kind === "count"
    ? `${s.from} → ${s.to} of them, run ${s.patch && s.patch.repeats} times over.`
    : `${s.from} → ${s.to} ${s.to === 1 ? "batch" : "batches"} in the day, at ${s.batch} pans a batch.`;
  return el("div", { class: "climb-step" },
    el("div", { class: "climb-num" }, String(i + 1)),
    el("div", { class: "climb-body" },
      el("div", { class: "climb-what" }, `${s.icon} ${s.module}`),
      el("div", { class: "li-sub" }, how),
      s.kind === "count"
        ? el("div", { class: "li-sub" },
          "A day cannot hold this one any more often, so that is a second one to buy — and while it runs you need a second pair of hands if it is a job you do by hand.")
        : null,
      el("div", { class: "li-sub" },
        `That takes the day from ${s.before} to ${s.after} pans` +
          (s.wallThen && s.wallThen.id ? `, and then ${s.wallThen.icon} ${lower(s.wallThen.name)} is the wall.` : ".")),
      // A rung that moves nothing has to say why, or it reads as a dud. Tied
      // modules are one limit wearing several hats: the chiller's three batches
      // only free the day once all three have been raised.
      s.after === s.before
        ? el("div", { class: "li-sub" }, "On its own that buys nothing — the other batches of this same limit are still where they were. Keep going.")
        : null));
}

// The one tap that makes the ladder real. Each rung writes the change the ladder
// itself computed — `repeats`, or `count` with the cycles that go with it — and
// only on the modules the ladder named. Every other number she has typed is left
// alone.
function applyClimb(sc, climb, on) {
  const to = new Map(climb.steps.map((s) => [s.id, s.patch || { repeats: s.to }]));
  sc.modules = sc.modules.map((m) => (to.has(m.id) ? { ...m, ...to.get(m.id) } : m));
  on.persist();
  toast("The ladder is in the modules now");
  on.refresh();
}

// The way down, applied. Deliberately NOT a call into applyClimb with a reshaped
// ladder: the move names several modules at once, and it writes `repeats` and
// nothing else. `starts` is left exactly as she set it — see descentSteps for why
// the climb re-spaces the times and this does not.
function applyDescent(sc, down, on) {
  const to = new Map(down.steps[0].items.map((it) => [it.id, it.to]));
  sc.modules = sc.modules.map((m) => (to.has(m.id) ? { ...m, repeats: to.get(m.id) } : m));
  on.persist();
  toast("The day is down to the number you asked for");
  on.refresh();
}

// ── The day ────────────────────────────────────────────────────────────────
//
// The timing diagram: one row per module, the whole day across, then one row per
// person and a total row underneath. It is the thing the capacity screen cannot
// draw — not how fast a station is, but WHEN it runs and which of those times
// collide.
// The day's own card. Two paragraphs used to stand above the chart — the one
// explaining how to read it, and the one naming the moment her day hangs from —
// and she asked for both of them gone, which is 330 pixels of a phone screen she
// no longer scrolls past to reach the chart. Nothing is lost by it: the reading of
// the chart is section 23 of the operations guide, and the button that moves the
// day now says its own name in the row under the chart, so the move is findable
// without a sentence pointing at it.
function dayCard(r, sc, on, state, run) {
  return el("div", {},
    el("h2", { class: "section" }, "The day"),
    el("div", { class: "card tl-card" },
      controlsRow(r, sc, on, state, run),
      timeline(r, sc, on, state, run),
      batchNote(r),
      clashNotes(r, state)));
}

// Her rule's other half, said out loud: "say when it does not". A module whose
// batch count is not the module before it is named here, with both numbers, so a
// count that differs is a sentence she reads rather than a difference she has to
// spot. Nothing is locked by it — the day is drawn exactly as the numbers say.
function batchNote(r) {
  const off = batchMismatches(r.modules);
  if (!off.length) return null;
  const shown = off.slice(0, 3);
  const rest = off.length - shown.length;
  return el("div", { class: "tl-notes" },
    el("div", { class: "tl-note" },
      el("div", { class: "tl-note-who" },
        "Batch counts that differ from the module before them"),
      ...shown.map((m) => el("div", { class: "tl-note-job" },
        `${m.name} — ${m.repeats} ${m.repeats === 1 ? "batch" : "batches"}, ` +
        `${m.before.name} — ${m.before.repeats}`)),
      rest
        ? el("div", { class: "tl-note-job" },
            `…and ${rest} more ${rest === 1 ? "module" : "modules"} that differ.`)
        : null,
      el("div", { class: "tl-note-how" },
        "This is only a note, not a rule: the day runs on the numbers you have put in. Changing a module's batch count carries the ones after it with you and stops where a module has a number of its own — set that one to the same, or leave the day as you planned it.")));
}

function controlsRow(r, sc, on, state, run) {
  // The jobs that actually need hands, and how many LINES those jobs are. The two
  // numbers differ only when a module she has two of is drawn as two lines — and
  // that is exactly when the People box below is about to hand out a person per
  // line rather than per module, so it is also when its wording has to change.
  const jobs = r.modules.filter((m) => m.on !== false && Number(m.touchMin) > 0);
  const lineJobs = jobs.reduce((t, m) => t + Math.max(1, m.lines || 0), 0);
  const perLine = lineJobs > jobs.length;

  // The scale as a step rather than as four chips. Four chips were four stops of
  // one dial said as four buttons, and she uses two of them: the step she makes is
  // narrower or closer, so those are the two buttons and the stop she is standing
  // on is the word between them. Nothing about the scale itself changed — the same
  // four stops, the same pixels per minute, and the same stop she left it on.
  const at = PX_PER_MIN_CHOICES.findIndex((px) => Math.abs(r.pxPerMin - px) < 0.01);
  const step = (by) => {
    const to = Math.max(0, Math.min(PX_PER_MIN_CHOICES.length - 1, at + by));
    if (to === at) return; // the end of the dial is not a move
    sc.pxPerMin = PX_PER_MIN_CHOICES[to];
    on.persist();
    on.refresh();
  };

  return el("div", { class: "tl-ctl" },
    el("div", { class: "tl-ctl-group" },
      el("span", { class: "tl-ctl-lab" }, "Scale"),
      el("button", {
        type: "button", class: "tl-step", disabled: at <= 0,
        "aria-label": "A wider view — more of the day on the screen",
        onclick: () => step(-1),
      }, "−"),
      el("span", { class: "tl-step-name" }, at < 0 ? `${r.pxPerMin}x` : SCALE_NAMES[at]),
      el("button", {
        type: "button", class: "tl-step", disabled: at >= PX_PER_MIN_CHOICES.length - 1,
        "aria-label": "A closer view — the minutes, larger",
        onclick: () => step(1),
      }, "+")),
    el("div", { class: "tl-ctl-group" },
      el("span", { class: "tl-ctl-lab" }, "People"),
      peoplePicker(r, sc, on, state, perLine)),
    // The day worked backwards, as a real button in the row rather than only behind
    // a tap on one particular bar — and, since v157, as nothing but the button.
    //
    // v152 first shipped this place as a chip that NAMED the moment and then told
    // her which bar to tap, and she reported it as what it looks like: "why no
    // button for work backward, this is to reeposition the batches latest start
    // time". A control shaped like a button whose whole effect is to send her
    // elsewhere is a control that reads as dead. So this one does the work — the
    // card's own press, one press, no card in the way — and the card keeps the
    // whole chain laid out and the way back.
    //
    // It is drawn on every line, including one already worked back and one too
    // short to work back along, because a button that comes and goes reads as a
    // fault. On a finished day the press says so and writes nothing, which
    // moveDayBack already answers; on a line with no module above its last one the
    // card does not exist at all, so saying so is workDayBack's own job.
    //
    // The label that used to stand above it is gone: it re-stated the button's own
    // name and, at 375 pixels, wrapped to two lines — 54 pixels of a phone screen
    // spent explaining a button that already says what it does.
    el("div", { class: "tl-ctl-group" },
      el("button", {
        type: "button", class: "tl-chip",
        // No popup to repaint from here: on.refresh() already redraws this whole
        // card, and this row is inside it. moveDayBack takes a second repaint for
        // the popup that opened it; from the row there is none to give it.
        onclick: () => workDayBack(r, sc, on, () => {}, run),
      }, "Work the day backwards"),
      // The way back, on the button that moved the day, and only while there is
      // something to put back — Stop beside Start's pattern. Without it a press
      // from here would move her whole day and leave the undo three taps away on
      // one bar, which is the same hunt this button exists to end.
      //
      // `run` and never `state`: the snapshot lives on the screen's own record, so
      // a press here and a press on the card share one snapshot and one way back.
      // Writing it to the saved state instead would put it in her data blob, where
      // a reload would resurrect a day she has since left and offer to put her
      // times back to a shape that is no longer hers.
      run.dayBefore
        ? el("button", {
          type: "button", class: "tl-chip",
          onclick: () => undoDayBack(r, sc, on, () => {}, run),
        }, "Put my start times back")
        : null),
    el("div", { class: "tl-ctl-group" },
      el("span", { class: "tl-ctl-lab" }, "Walk the day"),
      el("button", {
        type: "button", class: `tl-chip${run.on ? " on" : ""}`,
        onclick: () => (run.on ? stopDay(run, on) : startDay(run, sc, state, on)),
      }, run.on ? "Stop" : "Start the day now"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => {
          // Nothing to set here: who gets called is set on the person's own card,
          // where their name is. This only says how many of them it is — a number
          // she can see without opening anybody, and a signpost when it is none.
          const n = callCount(r, state);
          toast(n
            ? `${n} of ${r.rows.length} ${r.rows.length === 1 ? "person" : "people"} will be called — one minute before their next job. Tap a person's row to name them or to stop their calls.`
            : "Nobody will be called. Tap a person's row below the day and switch their calls back on.");
        },
      }, callCount(r, state) ? `🔔 ${callCount(r, state)} called` : "🔔 Calls off")),
    el("div", { class: "tl-ctl-group" },
      el("button", {
        type: "button", class: "tl-chip add",
        onclick: () => addModule(sc, on),
      }, "＋ New module")));
}

// One of the two things the People box does to the day, in the words it has
// always toasted with. The arrangement now in force is the box's closed label —
// "one a module", "one to a line", "sharing them out", "combined" — and a day she
// arranged herself says exactly that, because calling it "one a module" would be a
// promise about a day nobody made that way.
function peopleState(r, sc, perLine) {
  const mods = sc.modules || [];
  if (Object.keys(sc.merges || {}).length) return "Combined";
  if (mods.some((m) => (m.crew || []).length)) return perLine ? "One to a line" : "One to a module";
  if (mods.some((m) => Number(m.person) > 0)) return "Your own";
  return "Sharing them out";
}

// The hands, as a drop-down. Three arrangements, each of which redraws the whole
// day's people at once, behind one box that says which of them is in force now.
// It was three chips and it wrapped to two lines on her phone; the box is the one
// line, and it still names the arrangement rather than hiding it, because a
// control that does not say what it has done is a control she has to open to find
// out.
function peoplePicker(r, sc, on, state, perLine) {
  const sel = select([
    {
      value: "one",
      label: perLine
        ? "One a line — a person for each line, one job each"
        : "One a module — a person for each job, one job each",
    },
    { value: "share", label: "Share them out — as few hands as can cover the day" },
    { value: "combine", label: "Combine two people…" },
  ], "", () => {
    const pick = sel.value;
    // Back to the arrangement the box names, whatever this turns out to be: the
    // menu is three presses, not a fourth setting standing beside them.
    sel.value = "";
    if (pick === "one") {
      // Her starting point: one person standing at every job that needs hands.
      // A job is a LINE, so a module she has two of takes two people here and not
      // one — which is what she wants this for: each worker on one line, learning
      // one job rather than wearing every hat in the day. The clashes that appear
      // are exactly what she then slides the modules to remove, and it is the
      // honest first answer, because a person per line really does cover the day.
      let n = 0;
      sc.modules = sc.modules.map((m) => {
        const needsHands = m.on !== false && Number(m.touchMin) > 0;
        if (!needsHands) return { ...m, person: 0, crew: undefined };
        const have = Math.max(1, linesInForce(m));
        const crew = [];
        for (let i = 0; i < have; i += 1) { n += 1; crew.push(n); }
        return { ...m, crew, person: crew[0] };
      });
      // Every job has just been given its own person, so any combination label
      // from before is describing a day that no longer exists.
      sc.merges = {};
      on.persist();
      toast(`${n} ${n === 1 ? "person" : "people"}, one to ${perLine ? "a line" : "a module"} — now move the modules closer together`);
      on.refresh();
    } else if (pick === "share") {
      sc.modules = sc.modules.map((m) => ({ ...m, person: 0, crew: undefined }));
      // Nobody is named any more, so nothing is being covered by anybody — a
      // leftover combination label would be a lie about the day.
      sc.merges = {};
      on.persist();
      toast("Sharing them out — as few hands as can cover the day");
      on.refresh();
    } else if (pick === "combine") {
      combinePopup(r, sc, on, state);
    }
  }, peopleState(r, sc, perLine));
  sel.className = "tl-select";
  return sel;
}

// How many of the people on the screen the day would actually call.
function callCount(r, state) {
  const calls = state.settings.personCalls || {};
  return r.rows.filter((row) => calls[row.person] !== false).length;
}

// How many modules are waiting on the one above them.
function chainedCount(r) {
  return r.on.filter((m) => m.follow).length;
}

// The line's own floor, set on every module at once. This was a chip in the
// control row until v157 — she asked for that row to be shorter, and for what it
// said to sit on the module's own card, which is where the setting has always been
// made one module at a time.
//
// It goes through the model's own writer, so the whole line and one module's card
// cannot end up with two answers to "what is this module set to". The bulk press
// sets the floor, which is the answer this has always given; the tight follow is a
// per-module choice, made on that module's own card.
function chainAll(sc, on, yes) {
  sc.modules = sc.modules.map((m) => {
    if (m.on === false) return m;
    const next = { ...m };
    setStartMode(next, yes ? "wait" : "own");
    return next;
  });
  on.persist();
  on.refresh();
  toast(yes ? "Every module now waits for the one above it" : "Nothing waits any more — your own times are in charge");
}

// Which modules are waiting on the one above them, said by name — the sentence the
// chain card used to open with, now read on the module's own card. Zero is the
// honest answer for a line whose times she placed herself, and it is worth saying
// out loud: nothing on the screen is being moved behind her back.
function chainSentence(r) {
  const waiting = r.on.filter((m) => m.follow);
  return waiting.length
    ? `${waiting.length} of your ${r.on.length} modules ${waiting.length === 1 ? "waits" : "wait"} on the module above: ${waiting.map((m) => `${m.icon} ${m.name}`).join(", ")}. The rest keep the times you placed.`
    : "Nothing is waiting right now, so every module keeps the time you gave it. Switch the chain on and the line answers as one line rather than a set of separate jobs.";
}

function addModule(sc, on) {  const id = newModuleId(sc.modules);
  sc.modules = [...sc.modules, blankModule(id)];
  on.persist();
  on.refresh();
  const added = sc.modules.find((m) => m.id === id);
  toast("New module added — switch it on once its numbers are in");
  editModule(added, sc, on, true);
}

function timeline(r, sc, on, state, run) {
  const trackW = Math.round(r.windowMin * r.pxPerMin);
  // Two elements, one minute: the hairline down the day, and the reading that
  // rides beside it. The reading is not a child of the line because the line is
  // drawn at 75% opacity, which makes a stacking context — a reading inside it
  // could never be lifted over the pinned clock strip. See .tl-cursor-lab.
  const cursor = el("div", { class: "tl-cursor", hidden: true });
  const lab = el("span", { class: "tl-cursor-lab", hidden: true });
  // The clock the day is being walked against. Its own line, its own label, and a
  // different colour from the hairlines she points with — a reading she takes must
  // never be mistaken for the minute the day is actually at.
  const nowLab = el("span", { class: "tl-now-lab" }, "now");
  const now = el("div", { class: "tl-now", hidden: !run.on }, nowLab);
  const tl = el("div", { class: "tl", style: `--hour-w:${Math.round(60 * r.pxPerMin)}px` },
    el("div", { class: "tl-inner" },
      rulerRow(r, trackW),
      ...r.modules.map((m, i) => moduleRow(r, m, i, trackW, sc, on, state, run)),
      // The people are the answer to her question, so they are drawn as what
      // they are: a row each, carrying the modules that row attends — and under
      // them the whole lot stacked, which is the manpower at each minute.
      //
      // The whole block is pinned to the foot of the panel, and that is her own
      // ask of 22 September: "I want to freeze the persons card, so that by
      // scrolling thru modules i can see exactly where that slot of that person
      // tie up to". Reading a person's row is the point of scrolling the modules
      // at all, so the row stays where she can see it while they pass behind it.
      // See .tl-people for why it is opaque and what may draw over it.
      el("div", { class: "tl-people" },
        ...r.rows.map((row) => personRow(r, row, trackW, sc, on, state)),
        totalRow(r, trackW)),
      // The day's own reading, drawn last so it runs over every bar rather than
      // under one. See wireTimeCursor for what it does and who it answers to.
      cursor,
      lab,
      // And the clock, drawn over everything, because it is the one thing on the
      // chart that is happening rather than planned.
      now));
  // The ruler, kept so the now-line can be placed against it.
  run.line = now;
  run.ruler = tl.querySelector(".tl-ruler .tl-track");
  run.pxPerMin = r.pxPerMin;
  if (run.on) placeNow(run);
  wireTimeCursor(tl, r, cursor, lab);
  return tl;
}

// Move the now-line to where the day has got to. Only its own position is
// touched — nothing else on the chart is repainted, because the day's numbers do
// not change as the clock runs and repainting them every second would fight the
// scroll she is reading.
function placeNow(run) {
  const line = run.line;
  if (!line || !run.pxPerMin) return;
  // The ruler's own offset is measured HERE and not when the chart was built,
  // and that is the whole point of the line being right: the chart is assembled
  // before it is on the page, and an element that is not on the page has no
  // offset at all — so the offset read at build time is always zero, and the line
  // was drawn in the name column, 138px and about an hour and a half left of the
  // minute it was naming. It moves the way she scrolls, so it is asked for its
  // offset again each time rather than cached.
  const ruler = run.ruler && run.ruler.isConnected ? run.ruler : null;
  const left = ruler ? ruler.offsetLeft : (run.rulerLeft || 0);
  line.style.left = `${Math.round(left + run.nowMin * run.pxPerMin)}px`;
  const lab = line.children && line.children[0];
  if (lab) lab.textContent = clockOf(run.dayStart + run.nowMin);
}

// Walk the day for real.
//
// She asked for the announcement as a live clock rather than a play-through, so
// this is not a rehearsal of her plan and it never rewrites one. The chart keeps
// the times she planned — the ruler still reads 4:00 am, because that is her day
// — and the now-line reads out the actual clock, because that is what time it is.
// Nothing here is saved, so nothing here can surprise her tomorrow: the run lives
// in a closure and dies with the screen.
//
// The one thing that could not be done quietly is the sound. A phone blocks audio
// until a real finger has touched the page, and the Start press is that finger,
// so the audio context is made here and not later.
const atMinute = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

function startDay(run, sc, state, on) {
  if (run.on) return;
  const now = new Date();
  run.on = true;
  // Minute 0 of the plan is this very minute, so a 4:01 am plan started at 9 am
  // calls at 9 am. Held on the run and never written to the scenario: her day
  // start is a number she set, and a walk-through must not move it.
  run.dayStart = now.getHours() * 60 + now.getMinutes();
  run.startedMs = Date.now();
  run.nowMin = 0;
  run.lastMin = -1;

  // Best effort, all of it. A browser without audio, a phone that refuses a wake
  // lock, a page that is not allowed either — the day still walks and calls are
  // still drawn, so none of these may be allowed to stop the run.
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx && !run.audio) run.audio = new Ctx();
  } catch { run.audio = null; }
  try {
    if (navigator.wakeLock && !run.wake) {
      navigator.wakeLock.request("screen").then((s) => { run.wake = s; }).catch(() => {});
    }
  } catch { /* nothing to do: the run does not depend on it */ }

  if (run.timer) clearInterval(run.timer);
  run.timer = setInterval(() => tickDay(run, sc, state, on), 1000);

  on.refresh();
  toast(`Walking the day from ${clockOf(run.dayStart)}. A call comes one minute before each job, in that person's own colour — tap a person's row below the day to name them or to stop their calls.`);
}

// Stop is the whole undo. The plan was never touched, so there is nothing to put
// back: the line goes, the card goes, and the sound and the wake lock are let go
// of so a phone that is left on the table goes back to sleep.
function stopDay(run, on) {
  if (run.timer) { clearInterval(run.timer); run.timer = null; }
  run.on = false;
  run.nowMin = 0;
  run.lastMin = -1;
  run.line = null;
  if (run.pending) { run.pending.remove(); run.pending = null; }
  try { if (run.audio) run.audio.close(); } catch { /* already gone */ }
  run.audio = null;
  try { if (run.wake) run.wake.release(); } catch { /* already gone */ }
  run.wake = null;
  if (on) on.refresh();
}

// One second of the day. The line is the only thing that moves — the bars are the
// plan and the plan does not change as the clock runs — so this never repaints,
// which is what keeps a chart she is reading still under her finger.
function tickDay(run, sc, state, on) {
  if (!run.on) return;
  const nowMin = (Date.now() - run.startedMs) / 60000;
  const whole = Math.floor(nowMin);
  run.nowMin = nowMin;
  placeNow(run);
  if (whole <= run.lastMin) return;

  // Everything due in the minute just gone. Only the LAST one is shown, which is
  // her own rule: an announcement she has not acknowledged is replaced by the one
  // after it rather than queuing up behind it.
  const calls = state.settings.personCalls || {};
  const due = callWindows(sc)
    .filter((w) => calls[w.who] !== false && w.at > run.lastMin && w.at <= whole);
  run.lastMin = whole;
  if (!due.length) return;
  const w = due[due.length - 1];
  showCall(run, w, sc, state, on);
}

// The call. His name, his own colour, what he is about to do and the real clock
// time he has to be there — and one OK, which is the only thing she has to do.
// Undismissed it does not go away on a timer, because a call that vanishes while
// she is walking to the bench is a call she never got.
function showCall(run, w, sc, state, on) {
  if (run.pending) { run.pending.remove(); run.pending = null; }
  const who = w.who;
  const at = run.dayStart + w.from;
  const host = run.host;
  if (!host) return;

  // Which cycle of that batch the hands are for, when she has named it: the fold
  // inside a rest is the one worth saying, because "the rests and the stretch and
  // folds" is not a thing anybody can go and do.
  const mod = chainLine(sc.modules || []).map(moduleFacts).find((m) => m.id === w.module);
  // String(name).trim(), NOT trim() — the imported trim is production.js's number
  // formatter, and on an unnamed cycle it answers "0", which is what the card used
  // to print above the clock. An unnamed cycle says nothing here.
  const cyc = mod && w.cycle >= 0 && mod.cycles[w.cycle] ? String(mod.cycles[w.cycle].name || "").trim() : "";

  const card = el("div", { class: `tl-call ${personTone(who)}` },
    el("div", { class: "tl-call-who" }, personName(who, namesOf(state))),
    el("div", { class: "tl-call-what" }, jobName(w)),
    cyc ? el("div", { class: "tl-call-cyc" }, cyc) : null,
    el("div", { class: "tl-call-when" }, `${clockOf(at)} — ${atMinute(Math.max(0, Math.round((w.at - run.nowMin) * 60)))} from now`),
    el("button", {
      type: "button", class: "tl-call-ok",
      onclick: () => { if (run.pending === card) { card.remove(); run.pending = null; } },
    }, "OK"));
  run.pending = card;
  host.append(card);
  chirp(run, who);
}

// One short note per person, a different one each, so two people called in the
// same minute are two sounds and not one. Whole tones apart rather than fractions
// of a tone: a phone's own speaker is small and two notes have to be obviously
// two notes. A run with no audio at all simply skips this.
function chirp(run, who) {
  const ctx = run.audio;
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440 * Math.pow(2, ((((who || 1) - 1) % 6) * 2) / 12);
    // A shape rather than a click: up in a few milliseconds, held, and gone
    // inside a fifth of a second so it reads as a call and not as an alarm.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  } catch { /* a phone that will not make a sound still shows the card */ }
}

// The time cursor: a hairline down the whole day that reads the clock at
// wherever she points. The ruler along the top says 8:00; this is what answers
// "and what is here?" — which is the question she asks of a chart when she is
// lining two modules up. It only ever reads: nothing here writes a module, moves a
// bar, or changes a number.
//
// A mouse can hover and a finger cannot, so the two get the gestures they
// actually have. Over the chart the line follows the pointer and leaves with it.
// Along the clock strip the drag belongs to the cursor instead of the scroll —
// that one band is the only part of the chart that does not pan — and because a
// finger never hovers, the cursor it places simply stays where she let go, which
// is what a finger needs to read a time against two bars. Swipe the chart
// afterwards and the line travels with the minute it names.
function wireTimeCursor(tl, r, cursor, lab) {
  const ruler = tl.querySelector(".tl-ruler .tl-track");
  if (!ruler) return;
  const frame = cursor.parentNode;
  let dragging = false;
  const place = (clientX, clientY) => {
    const t = minuteAtPx(clientX - ruler.getBoundingClientRect().left, r.pxPerMin, r.windowMin);
    if (t == null) { cursor.hidden = true; lab.hidden = true; return; }
    cursor.hidden = false;
    lab.hidden = false;
    const x = t * r.pxPerMin;
    const left = Math.round(ruler.offsetLeft + x);
    cursor.style.left = `${left}px`;
    lab.style.left = `${left}px`;
    // The reading follows the pointer down the day as well as across it. It used
    // to sit at the top of the chart, which is the right place only while the top
    // of the chart is on screen: with a mouse the pointer reads a bar four rows
    // down and the clock is a screen away, and only a mouse ever hovers, so the
    // one gesture that could not use it was the one that had it. Kept inside the
    // chart, so a reading can never be parked off the edge of the day.
    if (frame && Number.isFinite(clientY)) {
      const box = frame.getBoundingClientRect();
      const h = lab.offsetHeight || 18;
      const y = clientY - box.top;
      // Clear of the pointer rather than on it: a reading under her own finger is
      // a reading that hides the bar she is holding it against. It sits above the
      // touch, and drops below it only where the top of the chart leaves no room.
      const above = y - h - 8;
      const top = above >= 0 ? above : y + 14;
      lab.style.top = `${Math.round(Math.min(Math.max(0, top), Math.max(0, box.height - h)))}px`;
    }
    lab.textContent = clockAt(r.dayStartMin, t);
    // The reading hangs off the right of the line, so at the far end of the day
    // there is no room for it and it has to hang to the left instead. Measured
    // in px rather than minutes, so it holds at every scale she can pick.
    lab.classList.toggle("at-end", x > r.windowMin * r.pxPerMin - 60);
  };

  // The clock strip. Capture means the drag keeps working once the finger
  // wanders off the strip, so a time stays as easy to hit at the far left of the
  // day as in the middle of it.
  ruler.addEventListener("pointerdown", (e) => {
    dragging = true;
    place(e.clientX, e.clientY);
    // A pointer already gone by the time this runs cannot be captured, and it
    // throws rather than saying so — but the reading is placed either way, so
    // losing the capture must not lose the drag or the cursor with it.
    try { ruler.setPointerCapture(e.pointerId); } catch { dragging = false; }
  });
  ruler.addEventListener("pointermove", (e) => { if (dragging) place(e.clientX, e.clientY); });
  const end = () => { dragging = false; };
  ruler.addEventListener("pointerup", end);
  ruler.addEventListener("pointercancel", end);

  // Everywhere else. A pen and a mouse read the chart without touching it, and
  // the line leaves when the pointer does; a touch is skipped because there is
  // no hovering one — its gesture is the strip above.
  tl.addEventListener("pointermove", (e) => {
    if (dragging || e.pointerType === "touch") return;
    place(e.clientX, e.clientY);
  });
  tl.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "touch") { cursor.hidden = true; lab.hidden = true; }
  });
}

// How many minutes the ruler steps by at the scale the day is drawn at. Nearest
// stop, the same match the scale's own step uses — a hand-typed pixels-per-minute
// is normalised to one of the four, so this only ever has to land on the stop she
// is actually reading at.
function tickStepFor(pxPerMin) {
  const at = PX_PER_MIN_CHOICES.reduce(
    (best, c, i) => (Math.abs(c - pxPerMin) < Math.abs(PX_PER_MIN_CHOICES[best] - pxPerMin) ? i : best), 0);
  return TICK_MIN[at];
}

function rulerRow(r, trackW) {
  const step = tickStepFor(r.pxPerMin || PX_PER_MIN_CHOICES[1]);
  const ticks = [];
  for (let t = 0; t <= r.windowMin; t += step) {
    const x = Math.round(t * r.pxPerMin);
    if (t % 60 === 0) {
      // On the hour: solid, and it says the time.
      ticks.push(el("div", { class: "tl-tick", style: `left:${x}px` },
        el("span", {}, clockAt(r.dayStartMin, t))));
    } else if (t % 30 === 0) {
      // The half hour: the dashed tick that has always been here, and still the
      // landmark a quarter-hour pass is judged against.
      ticks.push(el("div", { class: "tl-tick minor", style: `left:${x}px` }));
    } else {
      // Everything finer than the half hour, and it only ever appears at the two
      // closest stops. A thin solid hairline and not a dash: sixty dashes an hour
      // is noise on a ruler, and a dashed mark beside the half hour's dashes would
      // read as the same kind of landmark when it is not.
      ticks.push(el("div", { class: "tl-tick fine", style: `left:${x}px` }));
    }
  }
  return el("div", { class: "tl-row tl-ruler" },
    el("div", { class: "tl-name" }, el("div", { class: "tl-sub" }, "the clock")),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...ticks));
}

// The bars of one module: one bar per BATCH, and a batch's cycles are drawn
// inside its own bar as shaded segments in the order she works them. Drawing
// them inside rather than as bars of their own is her own answer for how to
// show them, and it is what keeps a day of four batches of four cycles a
// phone-height chart instead of sixteen rows.
//
// A batch with a single cycle draws as one plain bar with no segments at all,
// which is her point three's last sentence: a single-cycle batch shows up as a
// batch. That is also every module she has today, drawn to the pixel as before.
//
// A module drawn as one row draws all of its batches and first-fits the lanes,
// because a module whose batches are free to overlap — her own ask — can put
// two of them in the same minutes, and drawn on one row they would paint over
// each other and read as one long batch. A module drawn as several LINES draws
// one line's batches here, and its first-fit is then over just those: normally
// one lane, and two only if something really has put two of one line's lots in
// the same minutes.
// Which batch each bar is, said above the bar: her ask of 22 Sep 2026, "I want
// the each batch to be labeled, B=?, small word above it ... at every module,
// every production line". So there is one for every bar of every module, drawn as
// a row-line as well as a single-row module.
//
// The nudge she has put on a batch rides beside the number — dt=+5 — which is the
// other half of the same ask. It is read off the STORED module rather than off the
// computed one, because chainLine consumes the delta into the times it hands back;
// what she typed lives on the module itself. See chainLine.
//
// A tag cannot live inside its bar — the bar is 16px tall and clips — so it is a
// sibling in the track, in the band the row grew for it. It carries the same
// `data-k` the bar does and the track's own click handler accepts either, so the
// number is a handle she can hit rather than a label she has to aim past.
function batchTags(r, m, live, line = null) {
  const { ks } = lineLanes(m, line);
  const trackW = r.windowMin * r.pxPerMin;
  const deltas = Array.isArray(live.startDelta) ? live.startDelta : [];
  const out = [];
  ks.forEach((k) => {
    const p = m.passes[k];
    if (p.at >= r.windowMin) return;
    // Kept on the chart at the very end of the day, so the last batch's number is
    // never half off the edge of the screen.
    const x = Math.max(0, Math.min(Math.round(p.at * r.pxPerMin), Math.max(0, trackW - 26)));
    const d = Math.max(0, Math.round(Number(deltas[k]) || 0));
    out.push(el("div", {
      class: `tl-btag${d ? " nudged" : ""}`,
      "data-k": String(k),
      style: `left:${x}px`,
      title: d
        ? `Batch ${k + 1} of ${m.name}: held back ${d} min from where the line puts it`
        : `Batch ${k + 1} of ${m.name} — tap to move it`,
    }, `B${k + 1}${d ? ` Δt=+${d}` : ""}`));
  });
  return out;
}

function passBars(m, tone, r, line = null) {
  const bars = [];
  const { ks, laneOf, lanes } = lineLanes(m, line);
  ks.forEach((k, i) => {
    const p = m.passes[k];
    if (p.at >= r.windowMin) return;
    const left = Math.round(p.at * r.pxPerMin);
    const right = Math.round(Math.min(p.end, r.windowMin) * r.pxPerMin);
    const w = Math.max(4, right - left);
    // The bar always carries its own top now, because every row has grown by the
    // batch-number band and the bar has to sit BELOW it. The single-lane top is the
    // one CSS gave it, pushed down by the band, so a row that does not overlap is
    // still the 16px bar it always was, in the same place relative to its own track.
    const top = TAG_BAND + (lanes > 1 ? LANE_TOP + laneOf[i] * LANE_PITCH : 9);
    const h = lanes > 1 ? LANE_H : null;
    bars.push(el("div", {
      class: `tl-bar ${tone}${m.follow ? " locked" : ""}${lanes > 1 ? " laned" : ""}`,
      // Which batch this bar is, so the +/- control knows which start it moves.
      "data-k": String(k),
      style: `left:${left}px;width:${w}px;top:${top}px` +
        (h == null ? "" : `;height:${h}px`),
      // What the bar holds, in her terms: how many minutes the dough is in it,
      // and how much of that is her hands.
      title: `${m.name}${line == null ? "" : `, line ${line + 1}`}, batch ${k + 1}: ${trim(m.cycleMin)} min` +
        (m.touchMin ? `, ${trim(m.touchMin)} min of you` : ", no hands"),
    },
      ...cycleMarks(m, p, r, w),
      // Only the first batch of a row carries the number, so a fold loop does
      // not repeat "28" four times across the day — and a laned bar is too short
      // to hold it, so the number is left to the row's own line instead.
      i === 0 && w >= LAB_MIN_PX && h == null ? el("span", { class: "tl-lab" }, String(Math.round(m.cycleMin))) : null));
  });
  return bars;
}

// What is inside one batch's bar: a shaded segment per cycle, and her hands
// drawn where she really works them — at a cycle's load, at its unload, or at
// both ends of it.
//
// Every position here is the model's own doing. The cycle offsets and the labour
// windows both come from the same arithmetic the day itself is built from, so
// the picture cannot drift from the plan by a minute: the fold sits at the end
// of its rest and the oven swap sits after its bake because the model says so,
// not because this function knows anything about folding or baking.
function cycleMarks(m, p, r, w) {
  const list = m.cycles || [];
  const px = (min) => Math.round(min * r.pxPerMin);
  const out = [];

  // One shade per cycle, so a batch of four reads as four cycles. A single-cycle
  // batch draws no segments — that bar IS its cycle.
  if (list.length > 1) {
    let off = 0;
    list.forEach((c, i) => {
      const from = px(off);
      const to = Math.min(w, px(off + c.min));
      if (to > from) {
        out.push(el("div", {
          class: `tl-cycle shade-${Math.min(i, CYCLE_SHADES - 1)}`,
          style: `left:${from}px;width:${to - from}px`,
          title: `${c.name || `Cycle ${i + 1}`}: ${trim(c.min)} min`,
        }));
      }
      off += c.min;
    });
  }

  for (const t of p.touches || []) {
    const from = Math.max(0, px(t.from - p.at));
    const trueW = Math.min(w, px(t.to - p.at)) - from;
    if (trueW <= 0) continue;
    // Drawn from its real minute and no wider than the bar leaves it, so the
    // picture still says WHEN; only the width is floored, and the bar's own
    // tooltip and the cycle's name still carry the true minutes.
    out.push(el("div", {
      class: "tl-touch",
      style: `left:${from}px;width:${Math.min(Math.max(MIN_TOUCH_PX, trueW), w - from)}px`,
      title: `${t.name ? `${t.name}: ` : ""}${trim(t.to - t.from)} min of you at ${clockAt(r.dayStartMin, t.from)}`,
    }));
  }
  return out;
}

// The cycles one row draws and the lanes they need: every cycle of the module for
// a module drawn as a single row, or one line's worth of them for a module worked as
// several lines. The lane assignment is a first-fit over that row's own cycles, in
// TIME order (not cycle order — she can have dragged cycle 4 before cycle 1), and
// two cycles that merely touch are not overlapping, so a pass ending exactly where
// the next one starts stays in the same lane and a row does not grow for a day
// that has not changed.
//
// Both the bars and the row's height come from here, so a row can never be drawn
// taller than the bars it holds — or hold bars nothing has made room for.
function lineLanes(m, line = null) {
  const ks = [];
  for (let k = 0; k < m.passes.length; k += 1) {
    if (line == null || m.passes[k].line === line) ks.push(k);
  }
  const passes = ks.map((k) => m.passes[k]);
  const order = passes.map((_, i) => i).sort((a, b) => (passes[a].at - passes[b].at) || (passes[a].end - passes[b].end));
  const laneOf = passes.map(() => 0);
  const ends = [];
  for (const i of order) {
    let lane = ends.findIndex((t) => t <= passes[i].at);
    if (lane < 0) { lane = ends.length; ends.push(0); }
    ends[lane] = passes[i].end;
    laneOf[i] = lane;
  }
  return { ks, laneOf, lanes: Math.max(1, ends.length) };
}

// Where each cycle of a module is, as a plain array of minutes — the module as the
// model has placed it, ready for one index to be overwritten by a drag. Reading
// it from the computed `starts` (rather than re-deriving it) is what keeps the
// cycles she has already dragged while she drags the next one.
function cycleStarts(m) {
  const out = [];
  for (let k = 0; k < m.repeats; k += 1) {
    const t = Number(m.starts && m.starts[k]);
    out.push(Number.isFinite(t) ? t : 0);
  }
  return out;
}

// The module a chained module is waiting on: the one above it in the list that is
// actually switched on. A machine that is off cannot pass dough down the line,
// which is exactly how chainLine skips it.
function chainAbove(r, m) {
  if (!m.follow) return null;
  const at = r.modules.findIndex((x) => x.id === m.id);
  for (let i = at - 1; i >= 0; i -= 1) if (r.modules[i].on) return r.modules[i];
  return null;
}

// What a module has to say about itself beyond its name: when its first batch
// starts and how many it runs, what it is waiting on, and what one batch costs it
// in minutes and in her hands.
//
// These two sentences used to sit under every module name, and they were what made
// the row tall: eight modules of notes is 400px of a phone screen spent repeating
// what the module's own card says. They are built in one place now, because two
// places print them — the row shows them on hover on a computer, and the card a
// tap opens shows them always — and two printings of one sentence is how a screen
// ends up disagreeing with itself.
function moduleNotes(r, m, live, line = null) {
  const above = chainAbove(r, m);
  const after = above ? startModeOf(live) === "after" : false;
  return {
    above,
    when: timeLine(m, r.dayStartMin) +
      (above ? (after ? ` · starts as ${above.name} finishes` : ` · waits on ${above.name}`) : ""),
    cost: costLine(m),
    tags: moduleTags(m, above, after, line),
  };
}

// The tags a row used to wear, in the order it wore them — every one of them now
// in the module's own tip, and on the module's own card, because a finger has no
// hover to open a tip with.
//
// Built here rather than in the row for the same reason the notes are: two places
// print them now, and two printings of one tag is how a screen ends up telling her
// two stories. The colours are the row's own — a limit being hit and a module
// running itself are both worth noticing, and they are not the same kind of thing.
function moduleTags(m, above, after, line = null) {
  const { lanes } = lineLanes(m, line);
  const tags = [];
  if (line == null && m.count > 1) tags.push({ text: `${m.count} of them`, cls: "badge-multi" });
  if (line != null && m.lines > 1) tags.push({ text: `${m.lines} lines`, cls: "badge-multi" });
  if (above) tags.push({ text: after ? "follows above" : "waits above", cls: "badge-past" });
  if (line == null && lanes > 1) tags.push({ text: `${lanes} at once`, cls: "badge-over" });
  if (!m.needsYou) tags.push({ text: "itself", cls: "badge-past" });
  // She has asked for more passes than a day holds. The number is kept as she
  // typed it — the row just counts honestly and says why.
  if (m.capped) tags.push({ text: "a day's limit", cls: "badge-over" });
  return tags;
}

// The tip a module's title opens on a computer, in the order the module's card
// says them: the tags it wears, when it starts and how many batches it runs, then
// what one batch costs it in minutes and in her hands. One builder, because the
// card prints the same three lines and a second printing is how the two drift.
function tipBody(notes) {
  return el("div", { class: "tl-tip" },
    notes.tags.length
      ? el("div", { class: "tl-sub tl-tag-line" }, notes.tags.map((t) => t.text).join(" · "))
      : null,
    el("div", { class: "tl-sub" }, notes.when),
    el("div", { class: "tl-sub" }, notes.cost));
}

// What one person's row has to say about itself beyond their name: how much of
// the day is theirs and how many places it puts them in, whether anything of
// theirs collides, and the jobs themselves.
//
// Built here, beside the module's own notes, for exactly the same reason: two
// places print them — the tip that opens under the pointer on a computer, and the
// person's card, which is what a tap opens — and a second printing is how the two
// end up telling her two stories. On a phone the tip never opens at all, so the
// card is not a copy of it; it is the only place these words can be read.
//
// The cap on the list is here and not at either printing: two caps for one list is
// the same drift in a different coat.
const PERSON_JOB_CAP = 6;

function personNotes(row, sc, state, dayStartMin) {
  const places = placesOn(row);
  const all = (row.items || []).map((w) => `${clockAt(dayStartMin, w.from)} — ${jobName(w)}`);
  const jobs = all.slice(0, PERSON_JOB_CAP);
  const clashes = row.clashes.length;
  return {
    who: personLabel(row, sc, state),
    busy: row.busy,
    places,
    clashes,
    clash: clashes ? (clashes === 1 ? "two jobs at once" : `${clashes} collisions`) : null,
    jobs,
    more: all.length - jobs.length,
  };
}

// The tip a person's title opens on a computer: everything their row used to
// print, and everything their card prints, in the card's own order. Their row is
// one line and their height cannot move — a strip pinned to the foot of the panel
// that grew a line whenever two of their jobs collided was the last thing on the
// chart that moved while she scrolled it.
function personTip(notes) {
  return el("div", { class: "tl-tip tl-tip-person" },
    el("div", { class: "tl-sub" }, `👤 ${notes.who}`),
    el("div", { class: "tl-sub" },
      `${hoursAndMinutes(notes.busy)} of work` + (notes.places > 1 ? ` · in ${notes.places} places` : "")),
    notes.clash ? el("div", { class: "tl-sub bad" }, notes.clash) : null,
    el("div", { class: "tl-sub" },
      el("div", { class: "tl-note-who" }, "What they do today"),
      ...(notes.jobs.length
        ? notes.jobs.map((j) => el("div", { class: "tl-note-job" }, j))
        : [el("div", { class: "tl-note-job" }, "Nothing on this person yet.")]),
      notes.more > 0 ? el("div", { class: "tl-note-job" }, `…and ${notes.more} more.`) : null));
}

function moduleRow(r, m, idx, trackW, sc, on, state, run) {
  const tone = `tone-${idx % TONES}`;

  if (!m.on) {
    return el("div", { class: "tl-row off", onclick: () => editModule(m, sc, on, false, r) },
      el("div", { class: "tl-name" },
        el("div", { class: "tl-name-top" }, el("span", { class: "tl-name-txt" }, `${m.icon} ${m.name}`)),
        el("div", { class: "tl-sub" }, "not in this scenario")),
      el("div", { class: "tl-track", style: `width:${trackW}px` }));
  }

  // The raw module in the stored scenario, which is what a drag writes to.
  const live = sc.modules.find((x) => x.id === m.id) || m;

  // A module she has two of is worked as two LINES — the copies take the lots in
  // turn, odd lots on one and even on the other — so it is drawn as two rows, one
  // per line, each naming the person on it. That is her own ask, and it is also
  // the only drawing that can show two lines at all: the two lines' lots need not
  // overlap in time, so flattening them onto one row would draw a single stream
  // where there are really two.
  //
  // A module that is not worked as lines gets the single row it has always had, to
  // the pixel — which is every module she has today.
  const lines = m.lines || 0;
  if (!lines) return timelineRow(r, m, live, sc, on, tone, trackW, null, state, run);

  const block = el("div", { class: "tl-block" });
  for (let line = 0; line < lines; line += 1) {
    block.append(timelineRow(r, m, live, sc, on, tone, trackW, line, state, run));
  }
  return block;
}

// One row of a module: the whole module, or one of its lines. Its own name cell
// and its own track are here, so a module drawn as two lines is simply two of
// these and nothing else on the screen has to know.
function timelineRow(r, m, live, sc, on, tone, trackW, line, state, run) {
  // A row whose bars overlap needs a taller track to draw them in lanes. A row
  // whose bars do not gets the track it has always had, plus the band at the top
  // that carries the batch numbers — see BATCH_TAG_BAND.
  const { lanes } = lineLanes(m, line);
  const track = el("div", {
    class: "tl-track",
    style: `width:${trackW}px;height:${laneTrackH(lanes) + TAG_BAND}px`,
  });
  track.replaceChildren(...batchTags(r, m, live, line), ...passBars(m, tone, r, line));

  let whenLine = null;
  let name = null;

  // Built before the branch, because both branches wear the waiting badge — and
  // because the badge on a module drawn as lines used to be read from a name that
  // only existed on the other side of this if. A module with two production line
  // that also waits on the module above threw instead of drawing.
  const notes = moduleNotes(r, m, live, line);

  if (line == null) {
    // The module above is named the way THIS module is set to take its start from
    // it. "waits on" and "starts as … finishes" are two different promises — the
    // first is a floor, the second has no gap at all — so a row that used one
    // phrase for both would be telling her the wrong one on half her modules.
    //
    // The row is the name and its bars and nothing else. Its tags and its two
    // notes are in the tip that opens when she points at the title (.tl-tip), and
    // word for word on the card her tap opens — which is where her phone reads
    // them, because a finger has no hover to open a tip with.
    name = el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" },
        // Its own span, so a long name is shortened with an ellipsis at the column's
        // edge instead of wrapping the row taller than the bars it draws. The whole
        // name is on the card, one tap away.
        el("span", { class: "tl-name-txt" }, `${m.icon} ${m.name}`)),
      tipBody(notes));
  } else {
    // A line of a module: who is on it, how many lots it takes and the minutes it
    // really runs, read off the cycles the chain has already placed rather than
    // worked out again here.
    //
    // A line's own clock and the hands on it are the ONE thing a second line has to
    // say — nothing else on the screen says it — so they stay on the row. Its cost
    // line and its waiting are the module's own words twice over, so they go into
    // .tl-tip with the rest.
    const stats = lineStats(m, line);
    const who = lineWho(m, line, state) + (stats ? ` · ${stats.lots} ${stats.lots === 1 ? "lot" : "lots"}` : "");
    whenLine = el("div", { class: "tl-sub" }, stats
      ? `${clockAt(r.dayStartMin, stats.from)} → ${clockAt(r.dayStartMin, stats.to)}`
      // A line with nothing on it is the second machine she has bought and not
      // yet used — so it says so, rather than looking like a module that is simply
      // empty for no reason.
      : "nothing on this line yet — raise how many times it runs");
    name = el("div", { class: "tl-name" },
      line === 0
        ? el("div", { class: "tl-name-top" },
          el("span", { class: "tl-name-txt" }, `${m.icon} ${m.name}`))
        : null,
      el("div", { class: "tl-sub" }, who),
      whenLine,
      line === 0 ? tipBody(notes) : null);
  }

  // A module that is not drawn as lines gets the class list it has always had, to
  // the letter — everything CSS says about a plain module still applies to it.
  const row = el("div", {
    class: `tl-row${line == null ? "" : ` tl-line${line > 0 ? " tl-line-sub" : ""}`}`,
  }, name, track);

  // Two taps, two jobs, and which one she gets is decided by what is under the
  // finger: a BAR opens that batch's own clock, and anything else on the row —
  // the name, the empty track — opens the module's editor. That is her point
  // four, and it is why the drag is gone: a hairline was being chased across the
  // day by a bar as she dragged, and a fingertip sliding is the wrong tool for
  // deciding a minute anyway.
  // The bar AND its batch number open the same card: they are the same batch, and
  // a number she has just been handed as the way to tell one batch from another is
  // no use if it is not also a way to pick one.
  track.addEventListener("click", (e) => {
    const hit = e.target && e.target.closest ? e.target.closest(".tl-bar, .tl-btag") : null;
    if (!hit) return;
    e.stopPropagation();
    batchPopup(m, live, sc, on, Math.max(0, Math.round(Number(hit.dataset.k) || 0)), run);
  });

  row.addEventListener("click", () => editModule(live, sc, on, false, r));

  return row;
}

// Which module owns the end of the day's first batch — the one the whole day is
// hung from when she works it backwards.
//
// It is the last module in the build and NOT the first, and both halves of that
// matter. The first module's batch 1 has a meaning of its own (it is the module's
// own start time, and the first thing in the day), so it keeps it. A line of a
// single module is not a chain at all — there is nothing above the last thing to
// work back through — so it is left exactly as it was too. Null means "this tap is
// an ordinary batch tap", and every caller reads it that way.
function dayEndOf(r, sc) {
  const on = r.on || [];
  if (on.length < 2) return null;
  const last = on[on.length - 1];
  const at = (sc.modules || []).findIndex((x) => x.id === last.id);
  return at > 0 ? last : null;
}

// One batch's own clock, and the only place a batch's start time is set from the
// chart. A big pair of buttons at five minutes and a small pair at one, because
// five is the amount the day is read in and one is the nudge that lifts a batch
// off a collision — her own answer for the two amounts.
//
// Nothing here does arithmetic of its own. Every press goes through the same
// clampStart a typed time goes through and is then read back OFF the model, so a
// pressed time and a typed one are the same answer, and when the model's own rule
// puts the batch somewhere else she is told which rule it was — the same sentence
// the drag used to give.
function batchPopup(m, live, sc, on, k, hold) {
  const n = live.repeatsHeld || live.repeats || 1;
  // The last module in the build is not one batch among many: its first batch is
  // the moment the whole day hangs from, and its card is the day's own card. The
  // heading is set before the card is built so it can say which of the two this
  // tap opened — the two cards carry the same two button pairs, and a heading
  // that named only the module would leave her unable to tell them apart.
  const owner = dayEndOf(computeScenario(sc), sc);
  const isDay = !!owner && k === 0 && owner.id === live.id;
  showPopup(`${live.icon || m.icon} ${live.name} · ` + (isDay
    ? "the end of your first batch"
    : `batch ${k + 1} of ${n}`), (refresh, close) => {
    // Read afresh every time this card is built, because a press moves the day:
    // the times below have to be the ones the model has just answered with, not
    // the ones it answered with before the press.
    const r = computeScenario(sc);
    const here = r.modules.find((x) => x.id === live.id) || moduleFacts(live);
    const p = (here.passes || [])[k] || null;
    const at = p ? p.at : Number((cycleStarts(live))[k]) || 0;
    const end = p ? p.end : at + (here.cycleMin || 0);

    if (isDay) return dayBackCard(r, live, sc, on, refresh, hold, end);

    // The first module has nothing above it to hold a batch back FROM, so a move
    // there is its own start time — which is what every move has always been.
    // Every later module writes a delta instead, so the batch rides the chain:
    // move the module above and this batch follows, keeping its offset.
    const first = sc.modules.findIndex((x) => x.id === live.id) === 0;
    const mode = startModeOf(live);
    const deltas = Array.isArray(live.startDelta) ? live.startDelta : [];
    const delta = Math.max(0, Math.round(Number(deltas[k]) || 0));
    // Where this module's own offset from the line is read out: batch 1, and only
    // batch 1 — her own ask of 22 September, "just need to show delta on the batch
    // 1st offset only, then following module of that step dont have to show the
    // delta because it follow the previous module tightly". Below batch 1 the
    // batches run at this module's own pace, so there is nothing of the module's
    // to read there; a batch that is held back on purpose still says so, on its own
    // card and on its own bar, because a batch that is off the line must not look
    // like one that is on it.
    const showsModuleOffset = !first && k === 0;

    const step = (by, label, hint) => {
      const press = (sign) => el("button", {
        type: "button",
        "aria-label": `${by} minute${by === 1 ? "" : "s"} ${sign > 0 ? "later" : "earlier"}`,
        onclick: () => moveBatch(r, live, sc, on, refresh, k, at, sign * by),
      }, sign > 0 ? `+ ${by} min` : `− ${by} min`);

      return el("div", { class: "field" },
        el("label", {}, label),
        el("div", { class: "step-pair" }, press(-1), press(1)),
        hint ? el("div", { class: "hint" }, hint) : null);
    };

    // A nudge can only ever hold a batch BACK, so below the first module the
    // buttons can go one way and no further. That is right — it is a delay and not
    // a schedule — but it would also be a one-way door, and a door with no handle is
    // the fault v149 was built to fix. So the way back is here, named, and only when
    // there is something to undo. On batch 1 of a module that starts as the one
    // above finishes it takes the whole module back, because that is what the press
    // that put it there moved.
    const back = (delta && !first)
      ? el("div", { class: "field" },
        button("Back onto the line", () => {
          const next = deltas.slice();
          if (showsModuleOffset) for (let i = 0; i < next.length; i += 1) next[i] = 0;
          else next[k] = 0;
          live.startDelta = next;
          on.persist();
          on.refresh();
          refresh();
          toast(showsModuleOffset
            ? `Every batch of ${live.name} back where the line puts it.`
            : `Batch ${k + 1} back at ${clockAt(r.dayStartMin, at - delta)} — exactly where the line puts it.`);
        }, "ghost"),
        el("div", { class: "hint" },
          showsModuleOffset
            ? `This module is being held back ${delta} minute${delta === 1 ? "" : "s"} on purpose, so every batch of it sits that much later than the minute the module above finishes. This takes the hold off.`
            : `This batch is being held back ${delta} minute${delta === 1 ? "" : "s"} on purpose. This takes the hold off, so it sits wherever the module above and this module's own minutes put it.`))
      : null;

    // What the two pairs do here, in this module's own terms. It used to be one
    // sentence for everything, and it was the sentence that hid a real difference:
    // above module 1 there is nothing to be held back from, so a move IS a time;
    // below it, a move is a hold on top of whatever the line already says.
    const fiveHint = first
      ? "The amount the day is read in, and the amount the time line reads out."
      : k === 0
        ? `The amount the day is read in. Moving batch 1 moves this whole module with it, at the pace you set below — and because this module is set to ${START_MODE_LABELS[mode].toLowerCase()}, that move is a hold on top of where the line already puts it.`
        : "The amount the day is read in, and the amount the time line reads out. This batch rides the module above it, so this is how far behind where the line puts it you want it held.";

    return el("div", {},
      el("div", { class: "cyc-line", style: "margin:0 0 8px" },
        el("span", { class: "cyc-lab" }, `Batch ${k + 1}`),
        el("span", { class: `cyc-at${delta ? " nudged" : ""}` },
          delta ? `Δt = +${delta} min`
            : first ? "its own start"
              : showsModuleOffset ? START_MODE_READINGS[mode] : "on the line"),
        el("span", { class: "cyc-at" }, clockAt(r.dayStartMin, at))),

      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        `${clockAt(r.dayStartMin, at)} → ${clockAt(r.dayStartMin, end)}` +
        ` · ${trim(here.cycleMin)} min, ${trim(here.touchMin)} of it your hands`),

      // The two pairs, on EVERY batch now. They used to be refused on a module set
      // to wait, with a sentence telling her to go and change the module instead —
      // and "each batch start time adjustable, like the 1st module" is the thing
      // she asked for. What keeps that honest is the model underneath: every press
      // goes through the same clamp a typed time goes through, the answer is read
      // back off the model, and when the module above or the module's own minutes
      // put the batch somewhere else the toast names which rule did it.
      el("div", {},
        step(5, "Five minutes at a time", fiveHint),
        step(1, "One minute at a time",
          "For lifting a batch off a collision with another."),
        back),
    );
  });
}

// The end of the first batch at the last module of the build, and the day that
// hangs from it — the card behind her question, "how to make the calculate
// backward works?".
//
// Every other card on this screen reads the day FORWARDS, and so does the model
// under it: chainLine walks the modules in order and can only ever push one
// later. This is the other direction, in the words she settled it in on 22
// September: "work backwards, from end of process, the previous process should
// have a latest start time, by going this way, we prevent preparing dough too
// early". The Production line's own day-backwards card is the same idea on the
// same day; this is it for her planner.
//
// So the card does three things and nothing else. It says what the backward
// calculation says — every switched-on module, where it starts today and the
// latest it may start — it gives her one button to take that slack out, and the
// two step pairs she already knows from moving a batch, doing the other thing a
// time on this chart can do: moving the whole day by the same amount everywhere,
// so the shape of the day she arranged is kept and only the clock on it moves.
// She sees the answer before she presses anything, which is the whole rule of
// this app: a guide, never a gate.
//
// It is the last module in the build and not the first, deliberately. The first
// module's batch 1 IS its own start time and the first thing in the day, so it
// keeps that meaning; the END of the first batch at the last module is the
// moment her whole day is hung from, whatever that last thing happens to be.
function dayBackCard(r, live, sc, on, refresh, hold, anchor) {
  const latest = latestStarts(r.on);
  const dayEnd = r.on.reduce((t, f) => Math.max(t, f.endMin), 0);
  const rows = [];
  let loose = 0;

  for (const f of r.on) {
    const want = latest.get(f.id);
    if (want == null) continue;
    const at = Number(f.startMin) || 0;
    // A module that waits on the one above it has no start of its own to move:
    // the line places it, and it comes along with the press anyway.
    const held = !!f.follow;
    const canMove = !held && Math.round(want) > Math.round(at);
    if (canMove) loose += 1;
    rows.push(el("div", { class: "cyc-row" },
      el("span", { class: "cyc-lab" }, `${f.icon} ${f.name}`),
      el("span", { class: "cyc-at" }, held
        ? `${clockAt(r.dayStartMin, at)} · the line places it`
        : (canMove
          ? `${clockAt(r.dayStartMin, at)} → ${clockAt(r.dayStartMin, want)}`
          : `${clockAt(r.dayStartMin, at)} ✓`))));
  }

  // The same two pairs she already knows from moving a batch, doing the one other
  // thing a time on this chart can do: moving the whole day. Five first, because
  // five is the amount the day is read in.
  const step = (by) => el("div", { class: "field" },
    el("label", {}, by === 5 ? "Five minutes at a time" : "One minute at a time"),
    el("div", { class: "step-pair" },
      el("button", {
        type: "button",
        "aria-label": `the whole day ${by} minute${by === 1 ? "" : "s"} earlier`,
        onclick: () => shiftDay(r, sc, on, refresh, hold, -by),
      }, `− ${by} min`),
      el("button", {
        type: "button",
        "aria-label": `the whole day ${by} minute${by === 1 ? "" : "s"} later`,
        onclick: () => shiftDay(r, sc, on, refresh, hold, by),
      }, `+ ${by} min`)),
    el("div", { class: "hint" },
      "This moves the WHOLE day, every module of it by the same amount, so the " +
      "shape of your day is kept exactly as it is and only the clock on it moves. " +
      "To move one module instead, tap its own bar."));

  return el("div", {},
    el("div", { class: "cyc-line", style: "margin:0 0 4px" },
      el("span", { class: "cyc-lab" }, `${live.icon || "•"} ${live.name} · batch 1 ends`),
      el("span", { class: "cyc-at" }, clockAt(r.dayStartMin, anchor))),
    el("div", { class: "cyc-line", style: "margin:0 0 10px" },
      el("span", { class: "cyc-lab" }, "Your day finishes"),
      el("span", { class: "cyc-at" }, clockAt(r.dayStartMin, dayEnd))),

    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      `${live.name} is the last thing your line does for your first batch, so this ` +
      "is the moment the whole day hangs from. Working back through the modules " +
      "above it gives each one a latest start — the last minute it may begin and " +
      "still have this batch come out of your last module on time, which is how " +
      "the dough is kept from being mixed earlier than it has to be."),

    el("div", { class: "cyc-list", style: "margin:0 0 8px" }, ...rows),
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "A tick means that module is already as late as the line allows: mix the dough " +
      "any later and your first batch comes out of this module after the moment above."),

    loose
      ? el("div", { class: "field" },
        button("Pull them back to their latest start",
          () => moveDayBack(r, sc, on, refresh, hold), "primary"),
        el("div", { class: "hint" },
          `This moves the ${loose} module${loose === 1 ? "" : "s"} that can still ` +
          "come later, and leaves every other one exactly where it is. It writes " +
          "those start times into your scenario, so it is a real change to the day — " +
          "the button below puts it back. A tighter day can also put two of your " +
          "jobs in the same minute; if it does, the People area below says so."))
      : el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "Every module of your line is already as late as it can go — there is " +
        "nothing to pull back. The buttons below move the whole day instead."),

    step(5),
    step(1),

    // The way back. The day she had before her first press is kept once, in this
    // screen's own memory, so working the day backwards is a calculation she can
    // try rather than a door that closes behind her.
    hold.dayBefore
      ? el("div", { class: "field" },
        button("Put my start times back", () => undoDayBack(r, sc, on, refresh, hold), "ghost"),
        el("div", { class: "hint" },
          "Every module's start time, exactly as it was before your first press " +
          "on this card. It lasts while you are on this screen — nothing about it " +
          "is saved, the same way the running clock is not."))
      : null,
  );
}

// The day she had, kept before the first press of either pair of buttons on this
// card and never overwritten by a later one, so the way back is the day she
// began with rather than the step before the last one. Only modules that are
// switched on are kept, because only those are the ones a press writes.
function takeDayBefore(r, sc, hold) {
  if (hold.dayBefore) return;
  const ids = new Set(r.on.map((f) => f.id));
  hold.dayBefore = sc.modules
    .filter((m) => ids.has(m.id))
    .map((m) => ({ id: m.id, starts: m.starts, startMin: m.startMin }));
}

// One press of the card's own button: every module pulled back to its latest
// start, as the chain measures it from the end of her first batch.
//
// Only a module's FIRST batch is written, and through the same writer a typed
// time and the batch buttons already use. That is what keeps everything else of
// hers intact: startsOf re-bases a stored list onto the new first time and
// continues at the module's own pace, so Auto spacing, her un-even spacing, her
// per-batch deltas and her cycles all come through the press untouched.
//
// The day's own forward pass still has the last word. This can only see the
// chain — her hands are not something a measurement can see — so anything the
// line pushes later than its latest start stays later, and the reading back at
// the end says what actually happened rather than what was asked for.
function moveDayBack(r, sc, on, refresh, hold) {
  const latest = latestStarts(r.on);
  if (!latest.size) return;
  const wasAt = new Map(r.on.map((f) => [f.id, Number(f.startMin) || 0]));
  takeDayBefore(r, sc, hold);

  for (const m of sc.modules) {
    const want = latest.get(m.id);
    if (want == null) continue;
    writeBatchStart(m, 0, want);
  }
  on.persist();
  on.refresh();
  refresh();

  // What the day did with it, read back off the model rather than assumed — the
  // same rule every other press here follows.
  const after = computeScenario(sc);
  const moved = [];
  for (const f of after.on) {
    const was = Number(wasAt.get(f.id));
    if (Number.isFinite(was) && Math.round(was) !== Math.round(f.startMin)) {
      moved.push({ name: f.name, was });
    }
  }
  const owner = dayEndOf(after, sc);
  const anchor = owner && (owner.passes || [])[0] ? owner.passes[0].end : null;
  const end = after.on.reduce((t, f) => Math.max(t, f.endMin), 0);
  const plural = moved.length === 1 ? "" : "s";
  toast(moved.length
    ? `${moved.length} module${plural} worked back to their latest start — your first batch still ends ` +
      `${clockAt(after.dayStartMin, anchor == null ? end : anchor)}` +
      (Math.round(end) === Math.round(anchor == null ? end : anchor)
        ? ", and that is where the day ends too."
        : ` and the day finishes at ${clockAt(after.dayStartMin, end)}.`) +
      peopleNote(r, after)
    : "Every module of your line is already as late as it can go — there is nothing left to pull back.");
}

// The same press, made from the day's own controls row.
//
// It IS the card's press and nothing else — one writer, one wording, one snapshot
// and one way back — so a press from the row and a press from the card are the
// same day, and neither can drift from the other.
//
// The one thing it answers for itself is a line with no module above its last one.
// There the card does not exist and never has, because dayEndOf has nothing to
// give it, so a press that drew nothing would look broken. It says which of the
// two it is instead of inventing a move: a single module's first batch is that
// module's own start time, and there is no chain above it to measure a latest
// start against.
function workDayBack(r, sc, on, refresh, hold) {
  if (!dayEndOf(r, sc)) {
    toast("This line has no module above its last one, so there is no chain to " +
      "work back along: the first batch of your only module is simply that " +
      "module's own start time. Add a module below it and every one above gets " +
      "its latest start.");
    return;
  }
  moveDayBack(r, sc, on, refresh, hold);
}

// What the pressing cost her hands, when it cost her any.
//
// A backwards pass is only ever asked about the CHAIN — the modules' own minutes.
// Squeezing the day to the shortest span the chain allows is exactly what puts two
// of her jobs in the same minute, so the honest thing is to say the price at the
// moment it is paid rather than to leave her to find a red outline further down the
// screen. The People area shows the collision itself; this is the one-line warning.
function peopleNote(before, after) {
  if (!before || !after || after.people <= before.people) return "";
  return ` The day is now as tight as the chain allows, and at that length your jobs ` +
    `overlap: it reads ${after.people} people where it read ${before.people}.`;
}

// The whole day moved, every module of it by the same amount.
//
// This is the other thing a time on this chart can do and it is deliberately the
// simpler of the two: a uniform move keeps the shape of her day exactly as she
// arranged it, so it is the move for "the same day, an hour later" rather than a
// re-lay. The pull-back above is the one that re-lays.
//
// Spacing survives it for the same reason it survives the pull-back — only each
// module's first batch is written, and its own pace carries the rest. A day whose
// first module is already at midnight cannot move earlier at all, and that is said
// rather than pressed into nothing.
function shiftDay(r, sc, on, refresh, hold, by) {
  const list = r.on.map((f) => ({ f, at: Number(f.startMin) || 0 }));
  if (!list.length) return;
  const lowest = list.reduce((t, x) => Math.min(t, x.at), Infinity);
  const step = by < 0 ? -Math.min(Math.abs(by), Math.round(lowest)) : by;
  if (step === 0) {
    toast("Your first module already starts at midnight, so the whole day cannot move any earlier.");
    return;
  }
  takeDayBefore(r, sc, hold);
  for (const { f, at } of list) {
    const live = sc.modules.find((m) => m.id === f.id);
    if (live) writeBatchStart(live, 0, at + step);
  }
  on.persist();
  on.refresh();
  refresh();

  const after = computeScenario(sc);
  const end = after.on.reduce((t, f) => Math.max(t, f.endMin), 0);
  const firstStart = after.on.reduce((t, f) => Math.min(t, Number(f.startMin) || 0), Infinity);
  const amount = `${Math.abs(step)} minute${Math.abs(step) === 1 ? "" : "s"}`;
  const where = after.on.reduce((best, f) => ((Number(f.startMin) || 0) < (Number(best.startMin) || 0) ? f : best), after.on[0]);
  toast(`The whole day moved ${amount} ${step > 0 ? "later" : "earlier"} — it now starts with ` +
    `${where.name} at ${clockAt(after.dayStartMin, firstStart)} and finishes at ` +
    `${clockAt(after.dayStartMin, end)}.${peopleNote(r, after)}`);
}

// The other half of that press: the day she had, put back exactly as it was, and
// the snapshot cleared so the button goes with it. Restoring the stored `starts`
// rather than re-deriving a time is deliberate — a module whose spacing was Auto
// before the press must have no stored list at all afterwards either, or it
// would come back as an even spacing she never asked for.
function undoDayBack(r, sc, on, refresh, hold) {
  for (const keep of hold.dayBefore || []) {
    const live = sc.modules.find((m) => m.id === keep.id);
    if (!live) continue;
    if (keep.starts == null) delete live.starts;
    else live.starts = keep.starts;
    live.startMin = keep.startMin;
  }
  hold.dayBefore = null;
  on.persist();
  on.refresh();
  refresh();
  toast("Your start times are back exactly where they were.");
}

// One press of those buttons. On the first module the move IS the start time, and
// the arithmetic is setBatchStart's. On any module after it the move is a DELTA
// from where the chain puts the batch, so the batch follows the line instead of
// being pinned to a clock — and a delta can only ever hold it back, because a
// batch cannot start before the dough it is made of exists.
//
// What gets said about it is toastBatch's in the first case, so the timeline's tap
// and the editor's old buttons stay one answer in one wording. A delta is a
// different fact and says so in its own words.
function moveBatch(run, live, sc, on, refresh, k, from, by) {
  const first = sc.modules.findIndex((x) => x.id === live.id) === 0;
  const mode = startModeOf(live);
  // A batch is written as a HOLD rather than as a start in two places: below batch
  // 1, where the batch rides the module above and its move is a delay on top of
  // that; and on batch 1 of a module set to start as the one above finishes, where
  // this module has no start time of its own to write at all. That second one
  // matters: where that module begins is the minute the module above ends, decided
  // by the chain and not by a number stored here, so writing a start would be a
  // press that changed nothing on the chart — the dead control this screen is built
  // to keep out. Written as the module's own hold, the whole module comes with it,
  // exactly as moving batch 1 moves a first module.
  const held = !first && (k > 0 || mode === "after");
  if (!held) {
    const landed = setBatchStart(live, sc, on, k, from + by);
    toastBatch(live, k, from + by, landed, run.dayStartMin);
  } else {
    const deltas = (Array.isArray(live.startDelta) ? live.startDelta : []).slice();
    while (deltas.length < Math.max(1, moduleOf(live).repeats)) deltas.push(0);
    const before = Math.max(0, Math.round(Number(deltas[k]) || 0));
    const after = Math.max(0, before + by);
    if (k === 0) {
      // The module's own offset: every batch of it moves by the same amount, so a
      // press on batch 1 means the same thing here as it means on the first module
      // — the module moves, and its shape is kept.
      const step = after - before;
      for (let i = 0; i < deltas.length; i += 1) {
        deltas[i] = Math.max(0, Math.round(Number(deltas[i]) || 0) + step);
      }
    } else {
      deltas[k] = after;
    }
    live.startDelta = deltas;
    on.persist();
    on.refresh();
    if (after === before) {
      toast(k === 0
        ? `${live.name} is already as early as the line allows — there is nothing left to take off.`
        : by < 0
          ? `Batch ${k + 1} is already on the line — there is nothing left to take off.`
          : `Batch ${k + 1} stays where it is.`);
    } else if (after === 0) {
      // The hold taken all the way off is a real change and says so: "held 0
      // minutes behind" is not a sentence about a hold coming off, it is a
      // sentence about nothing happening.
      toast(k === 0
        ? `${live.name} is back on the line — every batch of it starts where the module above finishes.`
        : `Batch ${k + 1} is back on the line, where the module above and this module's own minutes put it.`);
    } else if (k === 0) {
      toast(`${live.name} held ${after} minute${after === 1 ? "" : "s"} behind where the module above finishes — every batch of it moved with that.`);
    } else {
      toast(`Batch ${k + 1} held back ${after} minute${after === 1 ? "" : "s"} from where the line puts it — move the module above it and this batch comes with it.`);
    }
  }
  // And the card itself, so the clock at the top of it reads the time the batch
  // is at now rather than the one it was at when she opened it.
  refresh();
}

// One line of a module: the lots on it and the minutes they take, read off the
// cycles the chain has already placed. Null when the line has nothing on it yet.
function lineStats(m, line) {
  let from = Infinity;
  let to = -Infinity;
  let lots = 0;
  for (const p of m.passes) {
    if (p.line !== line) continue;
    from = Math.min(from, p.at);
    to = Math.max(to, p.end);
    lots += 1;
  }
  return lots ? { from, to, lots } : null;
}

// Who is on a line: the person she named, or whoever is free — the same two
// answers the rest of the screen gives, in the same words.
function lineWho(m, line, state) {
  const p = m.crew ? m.crew[line] : 0;
  return p > 0 ? `👤 ${personName(p, namesOf(state))}` : "👤 whoever is free";
}

// The names she has typed, one table for the whole app so a person keeps their
// name from one scenario to the next. Read through here rather than touched at
// each call site, so there is one answer to "who is person 3" on every screen.
function namesOf(state) {
  return (state && state.settings && state.settings.personNames) || {};
}

// Where a cycle she has just dropped actually ends up, straight from the model —
// so the screen can tell her when her own module's rule moved it, and where to.
// Asking the model rather than re-deriving the rule here is the point: a second
// copy of the arithmetic in the view is a second answer waiting to disagree.
function cycleLanded(sc, m, k, dropped) {
  const placed = chainLine(sc.modules).find((x) => x.id === m.id);
  const at = placed && placed.starts ? Number(placed.starts[k]) : NaN;
  return Number.isFinite(at) ? Math.max(at, dropped) : dropped;
}

// One batch's start can move within the day, but a batch still has to finish
// inside one — dough still in the oven at midnight is a typing mistake, not a
// plan. Every batch is `cycleMin` long, so the same ceiling holds for each. The
// arithmetic itself lives in the model (clampBatchStart) because the typed box and
// the +/- buttons must give the same answer, and the model's test is where that is
// checked.
function clampStart(start, m) {
  return clampBatchStart(start, m);
}

function timeLine(m, dayStartMin) {
  const runs = m.repeatsHeld > 1 ? ` · ${m.repeatsHeld} batches` : "";
  return `starts ${clockAt(dayStartMin, m.startMin)}${runs}`;
}

// The two numbers she reads off a module at a glance: how long one batch holds
// it, and how much of a person that batch costs. For her fold that is 31 and 1,
// because the fold now sits where she really does it: at the end of the rest.
function costLine(m) {
  if (!m.needsYou) return `${trim(m.cycleMin)} min a batch · no hands`;
  return `${trim(m.cycleMin)} min a batch · ${trim(m.touchMin)} min of you`;
}

function personRow(r, row, trackW, sc, on, state) {
  const who = row.person;
  const tone = personTone(who);
  // How wide a stretch has to be before it can hold a name. Measured in minutes at
  // the scale she is reading at, so the name appears at Close and Closest — where
  // she is studying one person — and not on a Wide day where every stretch is a
  // sliver.
  const nameFits = 46 / (r.pxPerMin || 1);
  const bars = row.items.map((w) => el("div", {
    // The PERSON'S own colour, not the module's. Tinted by module, one person's row
    // was a patchwork of eight colours that said nothing about the person standing
    // there; tinted by person, a row is one worker's day and two rows are two
    // people. A collision still wears its red outline over the top.
    class: `tl-bar ${tone}${isClash(row, w) ? " clash" : ""}`,
    style: `left:${Math.round(w.from * r.pxPerMin)}px;width:${Math.max(4, Math.round((w.to - w.from) * r.pxPerMin))}px`,
    // Which line of which module this stretch of the person's day is, so a doubled
    // module reads as that person being on line 2 rather than on "the fold".
    title: `${w.name}${w.line >= 0 ? `, line ${w.line + 1}` : ""}: ${clockAt(r.dayStartMin, w.from)} → ${clockAt(r.dayStartMin, w.to)}`,
  }, w.to - w.from >= nameFits ? el("span", { class: "tl-pname" }, personName(who, namesOf(state))) : null));

  // How many different places this person has to be in — a line of a module counts
  // as a place of its own, which is the rule the model owns (placesOn), so it is
  // tested there rather than here. The whole of what the row used to print is in
  // the notes now, built in one place with the card's.
  const notes = personNotes(row, sc, state, r.dayStartMin);

  // The row is tappable, and that is the fix for what she reported: "in the person
  // card, now person card is not accessible". There was no handler here at all, so
  // the card that names her people could not be opened by any gesture.
  //
  // The name cell is the person and their tip and nothing else — the same two
  // things a module's name cell holds — so a person's row is the height of its own
  // bars and stays that height on a day where two of their jobs collide. The label
  // is in a span of its own for the same reason a module's is: a bare string in a
  // flex row is an anonymous flex item that no rule can reach, so without the span
  // the ellipsis never applies and a long "(with …)" label wraps the row taller
  // than the bars it is read against.
  return el("div", { class: `tl-row person tappable ${tone}`, onclick: () => personPopup(row, sc, on, state) },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" },
        el("span", { class: "tl-name-txt" }, `👤 ${notes.who}`)),
      personTip(notes)),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...bars));
}

function personLabel(row, sc, state) {
  const also = mergeMembers(row.person, sc);
  const base = personName(row.person, namesOf(state));
  return also.length ? `${base} (with ${also.join(", ")})` : base;
}

// The card that could not be reached. Her words, 22 Sep 2026: "when we click on
// the person module, we should be allow to change person1 to a name, person2 to a
// name. Can we set whether to make announcement 1 min before the next cycle start
// he is responsible to?"
//
// Both answers live in the app's settings rather than in the scenario, so a name
// typed once is the name every scenario uses — and the card says so out loud,
// because person numbers restart at 1 in each scenario and that is hers to know.
function personPopup(row, sc, on, state) {
  const who = row.person;
  const settings = state.settings;
  const names = (settings.personNames ||= {});
  const calls = (settings.personCalls ||= {});

  let titleEl = null;
  showPopup(`👤 ${personName(who, names)}`, () => {
    const field = el("input", {
      class: "input", type: "text", value: names[who] || "", placeholder: `Person ${who}`,
    });
    const callLabel = el("label", {}, `Call ${personName(who, names)} a minute before their next job`);
    field.addEventListener("input", () => {
      const typed = field.value.trim();
      if (typed) names[who] = typed;
      else delete names[who];
      on.persist();
      // The chart is repainted, never this card — so the name appears on the row
      // while she is still typing it and the box keeps its cursor.
      on.refresh();
      // The card's own two mentions of the person follow the name here, by hand,
      // rather than through the repaint above — the title lives outside this body
      // and rebuilding it is exactly what would take the cursor out of the box.
      // A text node through replaceChildren, not innerText, so the same code
      // updates the heading and the sentence in a browser and under the test shim.
      const said = `👤 ${personName(who, names)}`;
      if (titleEl) titleEl.replaceChildren(document.createTextNode(said));
      callLabel.replaceChildren(document.createTextNode(
        `Call ${personName(who, names)} a minute before their next job`));
    });

    const call = el("input", { type: "checkbox", checked: calls[who] !== false });
    call.addEventListener("change", () => {
      // Kept as a real false rather than deleted, so "off" is a choice she made
      // and not an absence that a later default could quietly switch back on.
      calls[who] = call.checked;
      on.persist();
    });

    // The list and the numbers come from the same builder the row's tip uses, so
    // the two cannot drift: the cap, the order and the count are decided once.
    const notes = personNotes(row, sc, state, sc.dayStartMin);
    const jobs = notes.jobs.map((j) => el("div", { class: "tl-note-job" }, j));

    return el("div", {},
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        `${hoursAndMinutes(notes.busy)} of work` + (notes.places > 1 ? `, in ${notes.places} places` : "") +
        (notes.clashes ? `, with ${notes.clashes} collision${notes.clashes === 1 ? "" : "s"} to sort out.` : ", and nothing collides.")),

      el("div", { class: "field" },
        el("label", {}, "What you call them"),
        field,
        el("div", { class: "hint" },
          "The name is used in every scenario, not just this one — the person numbers start again at 1 in each scenario, so a name you give to person 1 shows wherever person 1 is working.")),

      el("div", { class: "field" },
        el("label", {}, "No name yet is fine"),
        el("div", { class: "hint", style: "margin:0" },
          `Leave it empty and the day goes on saying Person ${who}.`)),

      el("div", { class: "field" },
        callLabel,
        el("label", { class: "row-check" }, call,
          el("span", {}, "Tick to have the day call them")),
        el("div", { class: "hint" },
          "One minute, not at the minute — a call is a call to go and stand somewhere, and a fold is a one-minute job, so telling them the moment they should already be folding is too late. Off, they still work the day; they are simply not called.")),

      el("div", { class: "tl-notes", style: "margin-top:12px" },
        el("div", { class: "tl-note" },
          el("div", { class: "tl-note-who" }, "What they do today"),
          ...(jobs.length ? jobs : [el("div", { class: "tl-note-job" }, "Nothing on this person yet.")]),
          notes.more > 0
            ? el("div", { class: "tl-note-job" }, `…and ${notes.more} more.`)
            : null)));

  }, { onTitle: (node) => { titleEl = node; } });
}

// Which people this row is standing in for, kept only while it is true: the
// moment she gives a module back to person 3, person 3 has a row of its own again
// and the "1+3" label must stop claiming them.
//
// A person counts as still at work if ANY line they are on is theirs, so being
// the second pair of hands on somebody's line 2 is a job like any other.
function mergeMembers(person, sc) {
  const listed = ((sc && sc.merges) || {})[String(person)] || [];
  return listed.filter((who) => !(sc.modules || []).some((m) => (m.crew || [Number(m.person)])
    .some((p) => Number(p) === who)));
}

// Her own example, as a control: combine person 1 with person 3 and see the two
// rows become one — the modules move, the label follows, and whatever collides is
// exactly the manpower the combination cannot pay for. Two taps, because that is
// the sentence she said: this person, then that person.
function combinePopup(r, sc, on, state) {
  const named = r.rows.filter((x) => x.named);
  if (named.length < 2) {
    toast(named.length
      ? "Give a second person a module — a combination needs two people to join"
      : "Give two modules to two different people first — then there are two people to combine");
    return;
  }

  // Which person keeps the job. Held out here, not inside the body builder: the
  // builder runs again on every refresh, so a variable declared in there would be
  // wiped the moment the first tap repainted the pop-up.
  let into = null;
  showPopup("Combine two people", (refresh, close) => {
    const chipFor = (x) => el("button", {
      type: "button",
      class: `tl-chip${into === x.person ? " on" : ""}`,
      onclick: () => {
        if (into == null) { into = x.person; refresh(); return; }
        if (into === x.person) { into = null; refresh(); return; }
        doCombine(sc, into, x, on, state);
        close();
      },
    }, `${personLabel(x, sc, state)} · ${x.items.length} ${x.items.length === 1 ? "job" : "jobs"}, ${hoursAndMinutes(x.busy)}`);

    return el("div", {},
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "Putting two people's modules on one pair of hands. That is how you find out what one person can really cover — and whatever collides is the part they cannot."),
      el("p", { class: "card-sub", style: "margin:0 0 8px" },
        into == null
          ? "Tap the person who keeps the job."
          : `Tap whose modules should move to ${personLabel({ person: into }, sc, state)}.`),
      el("div", {}, ...named.map(chipFor)),
      el("p", { class: "card-sub", style: "margin:10px 0 0" },
        "Every module keeps the job it does; only who is standing at it changes. Giving one module back is done in that module's own editor."));
  });
}

function doCombine(sc, into, from, on, state) {
  // The work itself is the model's, so it is the same answer every time and can
  // be tested without a screen: it hands back the modules and the new label.
  const next = combinedScenario(sc, into.person, from.person);
  sc.modules = next.modules;
  sc.merges = next.merges;
  on.persist();
  on.refresh();
  const members = (next.merges[String(into.person)] || []);
  toast(`${personName(into.person, namesOf(state))}${members.length ? ` +${members.join("+")}` : ""} — the collisions are what they cannot cover`);
}

// The total person she asked for: person 1, person 2, person 3 and the rest
// stacked on top of each other, so a doubled stretch is a shape she can see
// rather than a number she has to trust. It is also where the day is won: bring
// the modules closer together and the tall part of this row comes down.
function totalRow(r, trackW) {
  const bars = r.demand.segments.map((s) => {
    const w = Math.max(3, Math.round((s.to - s.from) * r.pxPerMin));
    return el("div", {
      class: `tl-bar total${s.count > 1 ? " many" : ""}`,
      style: `left:${Math.round(s.from * r.pxPerMin)}px;width:${w}px`,
      title: `${clockAt(r.dayStartMin, s.from)} → ${clockAt(r.dayStartMin, s.to)}: ${s.count} ${s.count === 1 ? "person" : "people"}`,
    }, s.count > 1 && w >= 16 ? el("span", { class: "tl-lab" }, String(s.count)) : null);
  });

  // The busiest stretch, named — the "which time period uses more manpower" half
  // of her question. Taken from the peak of the same sweep the bars are drawn
  // from, so the words and the shape can never disagree.
  const busiest = r.demand.segments.find((s) => s.count === r.demand.peak);

  // Three facts that are printed nowhere else in the app — how many people the
  // day's busiest minute asks for, when that minute is, and how much of the day is
  // paid for twice — now in a tip on the row's own title, which is where every
  // other row of the chart keeps what it has to say. The row itself is one line,
  // the same height as every other row, so the foot of the panel holds still.
  //
  // Told rather than hidden: a tip opens where there is a pointer that can hover,
  // and this row has no tap handler, so on a phone these three facts are reachable
  // by no gesture at all. That is her own choice, made with the consequence in
  // front of her; giving the row a card is one line of code when she wants it.
  return el("div", { class: "tl-row person total-row" },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" },
        el("span", { class: "tl-name-txt" }, "👥 People at once")),
      el("div", { class: "tl-tip tl-tip-person" },
        el("div", { class: "tl-sub" },
          r.people === 1 ? "one at a time" : `up to ${r.people} at once`),
        busiest && r.people > 1
          ? el("div", { class: "tl-sub" }, `busiest ${clockAt(r.dayStartMin, busiest.from)}–${clockAt(r.dayStartMin, busiest.to)}`)
          : null,
        r.demand.overlapMin > 0
          ? el("div", { class: "tl-sub bad" }, `${hoursAndMinutes(r.demand.overlapMin)} with two at a time`)
          : null)),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...bars));
}

// The collisions in words, under the diagram, because a red outline on a narrow
// bar is not an explanation. Two modules given to one person that overlap in time
// cannot both be done, and moving one of them is the fix. Her own reading of a
// collision is the point of the whole exercise: it is the manpower she is
// paying for twice, so it is counted as two people on the row above.
// A job named the way it is drawn on the timeline: the module, and which line of
// it when the module is worked as lines. Without the line, two lines of one module
// colliding read as the same module twice — "Person 2 is at the fold and the fold
// at the same time" — which is exactly the collision she is looking at.
function jobName(w) {
  if (!w) return "—";
  return w.line >= 0 ? `${w.name}, line ${w.line + 1}` : w.name;
}

// A collision, written so that it can actually be read. It used to be one
// sentence — "Person 1 is at X and Y at the same time" — and a module's name runs
// to forty characters ("Mixing by hand in the tub (set the minutes)"), so the two
// jobs the sentence is about were the one thing buried in it, and the word "and"
// between them was lost. Each job now gets a line of its own, under a first line
// that says who and when, and the two together are the whole of the fault. The
// line number stays spelled out, because two lines of one module read identically
// without it.
//
// A row with several clashes gives several blocks, and past three the rest are
// counted rather than dropped in silence — a list that quietly stops at four
// reads as though the day has four problems when it has nine.
function clashNotes(r, state) {
  const found = [];
  for (const row of r.rows) {
    for (const c of row.clashes) found.push({ row, c });
  }
  if (!found.length) return null;
  const shown = found.slice(0, 3);
  const rest = found.length - shown.length;
  return el("div", { class: "tl-notes" },
    ...shown.map(({ row, c }) => el("div", { class: "tl-note" },
      el("div", { class: "tl-note-who" },
        `👤 ${personLabel(row, r.scenario, state)} — two jobs at once, ` +
        `${clockAt(r.dayStartMin, c.from)} → ${clockAt(r.dayStartMin, c.to)}`),
      el("div", { class: "tl-note-job" }, jobName(c.before)),
      el("div", { class: "tl-note-job" }, jobName(c.after)),
      el("div", { class: "tl-note-how" },
        "Move one of them along the day, or combine with another person and accept the collision."))),
    rest
      ? el("div", { class: "tl-note" },
          `…and ${rest} more ${rest === 1 ? "pair of jobs" : "pairs of jobs"} on one person at once. ` +
          "Move the modules apart and they go.")
      : null);
}

function isClash(row, w) {
  return row.clashes.some((c) => c.after === w);
}

function toneIndex(r, id) {
  const at = r.modules.findIndex((m) => m.id === id);
  return at < 0 ? 0 : at;
}

// ── A module, opened ────────────────────────────────────────────────────────
//
// Everything about one module in one place, in the order the day runs through it:
// what it is, how long it holds, how much of her it takes, when it starts, and
// who is standing at it. The start is the knob she named, so it sits beside the
// explanation of what turning it does.
function editModule(saved, sc, on, isNew = false, r = null) {
  showPopup(`${saved.icon} ${saved.name}`, (refresh, close) => {
    // The module list is edited in place, so each field writes only its own value
    // back; the screen behind the pop-up catches up when it closes.
    const live = sc.modules.find((m) => m.id === saved.id) || saved;

    const set = (key, raw, opt) => {
      const n = Number(raw);
      const min = opt && opt.min != null ? opt.min : 0;
      if (!Number.isFinite(n) || n < min) return;
      // A batch count carries down the modules that were in step with it — her
      // rule, "follow the one before, and say when it does not". It writes the
      // list in place, so `live` here is still the module she is working on.
      if (opt && opt.carry) {
        alignBatches(sc.modules, live.id, n);
        on.persist();
        on.refresh();
        return;
      }
      live[key] = opt && opt.int ? Math.round(n) : n;
      on.persist();
      on.refresh();
    };

    const f = (key, label, hint, opt = {}) => {
      // Auto is an empty box with the word in it, and it writes a real 0 rather
      // than nothing: the model already reads a 0 spacing as "each batch starts
      // the moment the one before it ends", and a stored 0 is a number that
      // survives a reload. The flag beside it is what remembers that she did not
      // type it — so a module she has not paced keeps following its own cycle
      // length when she changes the cycle, which is the whole point of Auto.
      const auto = opt.auto ? live[opt.auto] === true : false;
      const input = el("input", {
        class: "input", type: "number", inputmode: "decimal",
        min: String(opt.min == null ? 0 : opt.min), step: String(opt.step || 1),
        placeholder: opt.auto ? "Auto" : null,
        value: auto ? "" : String(live[key] == null ? 0 : live[key]),
      });
      // A typed number is hers, so the flag goes off for good the moment she
      // types one — and comes back on only if she empties the box again.
      const write = (raw) => {
        if (opt.auto) {
          const blank = String(raw).trim() === "";
          live[opt.auto] = blank;
          if (blank) { set(key, 0, opt); return; }
        }
        set(key, raw, opt);
      };
      // Typing writes the number and repaints the screen behind the pop-up, but
      // it must NOT rebuild this card: this card is tall, and rebuilding it under
      // her finger threw the scroll and destroyed the box she was typing in.
      // A box whose answer changes the CARD's shape — one more line, one more
      // cycle row — says so, and then it rebuilds once, when she leaves the box.
      input.addEventListener("input", () => write(input.value));
      if (opt.rebuild) input.addEventListener("change", () => refresh());
      return el("div", { class: "field" }, el("label", {}, label), input,
        hint ? el("div", { class: "hint" }, hint) : null);
    };

    const t = (key, label, hint) => {
      const input = el("input", { class: "input", type: "text", value: String(live[key] || "") });
      input.addEventListener("input", () => {
        live[key] = input.value;
        on.persist();
        on.refresh();
      });
      return el("div", { class: "field" }, el("label", {}, label), input,
        hint ? el("div", { class: "hint" }, hint) : null);
    };

    const toggle = el("input", { type: "checkbox", checked: live.on !== false });
    toggle.addEventListener("change", () => {
      live.on = toggle.checked;
      on.persist();
      on.refresh();
    });

    // Whether this module is fed by the one above it. Her points three and four
    // were one switch; it is one CHOICE of three now, because her report of 22
    // September was that the switch could not do what its own label said — the
    // floor it really was cannot pull a packing step back onto the cooling's end,
    // which is the thing she was trying to do. See START_MODES in the model for
    // where the three live and chainLine for where they are obeyed.
    const startField = el("div", { class: "field" },
      el("label", {}, "How this module takes its start"),
      (() => {
        const row = el("div", { class: "pill-row" });
        for (const mode of START_MODES) {
          row.append(button(START_MODE_LABELS[mode], () => {
            setStartMode(live, mode);
            on.persist();
            on.refresh();
            refresh();
          }, `ghost small${startModeOf(live) === mode ? " cal-mode-on" : ""}`));
        }
        return row;
      })(),
      el("div", { class: "hint", style: "margin-top:2px" }, START_MODE_HINTS[startModeOf(live)]));

    // What the control row's "The line" chip used to carry, on the card of the
    // module whose own three answers set it — her ask, and a line off the row she
    // asked to shorten. Everything the chip's own card carried comes with it: the
    // sentence naming which modules wait, the same three cost numbers, and the same
    // two presses. What is gone is the chip that stood in the row saying them.
    //
    // `r` is the computed day, so a brand-new module has nothing here: there is no
    // day yet for a chain to be part of.
    const chainBlock = () => (r ? el("div", { class: "field" },
      el("div", { class: "tl-ctl-lab" }, "Waiting on the module above"),
      el("div", { class: "hint", style: "margin-top:4px" }, chainSentence(r)),
      el("div", { class: "hint", style: "margin-top:4px" },
        `${r.people} ${r.people === 1 ? "person" : "people"} · ` +
        `${hoursAndMinutes(r.personMin)} of hands · a ${hoursAndMinutes(r.runMin)} day.`),
      el("div", { class: "tl-ctl", style: "margin:6px 0 0" },
        el("div", { class: "tl-ctl-group" },
          chainedCount(r)
            ? el("button", {
              type: "button", class: "tl-chip",
              onclick: () => { chainAll(sc, on, false); refresh(); },
            }, "Take the waiting off")
            : null,
          el("button", {
            type: "button", class: "tl-chip",
            onclick: () => { chainAll(sc, on, true); refresh(); },
          }, chainedCount(r) ? "Chain the whole line" : "Chain every module")))) : null);

    // Her ask, as a switch: "allow each module cycle to overlap". Off, the module
    // holds its own cycles apart — one lot at a time — which is right when the
    // dough is physically IN the thing. On, each cycle sits where she put it.
    const overlapBox = el("input", { type: "checkbox", checked: live.overlap === true });
    overlapBox.addEventListener("change", () => {
      live.overlap = overlapBox.checked;
      on.persist();
      on.refresh();
      refresh();
    });

    // Her ask: "one module having 2 lines, each line can have its own person".
    // A module she has two of is two lines, so this is where she says who is
    // standing at each. Line 1 IS the module's own person — one number written in
    // two places, exactly as startMin is starts[0] — so a one-of-them module still
    // has the one box it always had, and the two can never disagree.
    const linesBlock = () => {
      const many = Math.max(1, Math.min(8, Math.round(Number(live.count) || 1)));
      if (many < 2) return null;
      if (live.overlap === true) {
        return el("div", { class: "field" },
          el("div", { class: "tl-ctl-lab" }, "Production line"),
          el("div", { class: "hint", style: "margin-top:4px" },
            "Allow multiple production line is switched ON, so this module's batches no longer take turns and it is drawn as one production line with one person. The people you set per line are kept, not thrown away — switch overlapping off and the module is drawn as its lines again, each with its own."));
      }
      const cur = Array.isArray(live.crew) ? live.crew : [];
      const who = (i) => {
        const stored = Number(cur[i]);
        return Number.isFinite(stored) ? stored : (Number(live.person) || 0);
      };
      const put = (i, raw) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return;
        const p = Math.max(0, Math.min(8, Math.round(n)));
        const next = [];
        for (let k = 0; k < many; k += 1) next.push(k === i ? p : who(k));
        live.crew = next;
        if (i === 0) live.person = p;
        on.persist();
        on.refresh();
      };
      const rows = [];
      for (let i = 0; i < many; i += 1) {
        const input = el("input", {
          class: "input", type: "number", inputmode: "numeric",
          min: "0", max: "8", step: "1", value: String(who(i)),
        });
        input.addEventListener("input", () => put(i, input.value));
        rows.push(el("div", { class: "field" },
          el("label", {}, `Production line ${i + 1} — who is on it`),
          input,
          i === 0
            ? el("div", { class: "hint" },
              "0 means whoever is free. Production line 1 is the module's own person — while the module is drawn as these lines, this box is the one that answers Who is at this module, and the two can never say different numbers.")
            : null));
      }
      return el("div", { class: "field" },
        el("div", { class: "tl-ctl-lab" }, "Production line"),
        ...rows,
        el("div", { class: "hint" },
          "A production line each, one under the other on the timeline, so the same number on two lines is one person covering both — and if those two lines really do need them in the same minute, that person's row in the People list goes red and names the minute. Give a production line 0 and it is whoever is free."));
    };

    // Who is at this module, for a module drawn as one row. It asks the MODEL what
    // the person is rather than reading the stored field, because the two can
    // differ: lower how many of a module she has and the second line's person goes
    // with the line, so line 1 — this box — is not always what was last typed into
    // it. Written back as both `person` and line 1 of the crew, so the box, the
    // lines above and the People rows cannot end up giving three answers.
    const personField = () => {
      const many = Math.max(1, Math.min(8, Math.round(Number(live.count) || 1)));
      const cur = Array.isArray(live.crew) ? live.crew : [];
      const input = el("input", {
        class: "input", type: "number", inputmode: "numeric",
        min: "0", max: "8", step: "1", value: String(moduleOf(live).person),
      });
      input.addEventListener("input", () => {
        const n = Number(input.value);
        if (!Number.isFinite(n) || n < 0) return;
        const p = Math.max(0, Math.min(8, Math.round(n)));
        const crew = [];
        for (let k = 0; k < many; k += 1) {
          const stored = Number(cur[k]);
          crew.push(k === 0 ? p : (Number.isFinite(stored) ? Math.max(0, Math.min(8, Math.round(stored))) : p));
        }
        live.crew = crew;
        live.person = p;
        on.persist();
        on.refresh();
      });
      return el("div", { class: "field" },
        el("label", {}, "Who is at this module"),
        input,
        el("div", { class: "hint" },
          "0 means whoever is free. Put 1, 2, 3… and that named person is given this module — so two modules on person 1 that overlap show up as a collision to move apart."));
    };

    // How many batches it runs in the day. Her ask: "It should be auto as it
    // should follow the earlier module, we just indicate in the 1st module."
    //
    // So the box is on the FIRST module, where the number is hers to set, and on
    // any module that already has a number of its own. Every module she has ever
    // saved keeps its number and keeps its box — an Auto state is only ever
    // arrived at by a module that had none, which is why nothing of hers moves.
    // An automatic module still says its number out loud, and still names what it
    // is following, because a count that is not on the screen is a count she
    // cannot check — and it says the same thing the note under the day says.
    const repeatsField = () => {
      const order = sc.modules.findIndex((m) => m.id === live.id);
      const auto = live.repeatsAuto === true;
      if (!auto || order <= 0) {
        return f("repeats", "How many batches it runs in the day",
          "Set this above 1 and the module runs again later in the day: the fold runs its batch four times. Change it and the modules after this one that were running the same number follow you, and stop where one has a number of its own — the line under the day names any that no longer match. The climb card raises this one for you — and a day can only hold so many, so a batch that takes hours is counted at the few that fit.",
          { min: 1, int: true, rebuild: true, carry: true });
      }

      const above = sc.modules.slice(0, order).reverse()
        .find((m) => m.on !== false && (Number(m.touchMin) > 0 || Number(m.cycleMin) > 0));
      const count = moduleOf(live).repeats;
      const aboveName = above ? above.name : "the module above";
      const aboveCount = above ? moduleOf(above).repeats : count;
      return el("div", { class: "field" },
        el("label", {}, "How many batches it runs in the day"),
        el("div", { class: "cyc-line" },
          el("div", { class: "input cyc-auto" },
            `${count} ${count === 1 ? "batch" : "batches"} — auto`),
          button("Give it its own number", () => {
            // A number of her own, written from what the day is already running so
            // that taking the wheel never moves the day a single minute.
            live.repeats = count;
            live.repeatsAuto = false;
            live.starts = undefined;
            on.persist();
            on.refresh();
            refresh();
          }, "ghost")),
        el("div", { class: "hint" },
          `Auto, so this module runs what the one before it runs — following ${aboveName}, which runs ${aboveCount}. A module follows the one above until one of them has a number of its own, and it is only the first module that has to have one, because that is where your day's number comes from. Take it on yourself and the module keeps the count it is running now: from there it is yours, and the modules after it follow you instead.`));
    };

    const order = sc.modules.findIndex((m) => m.id === live.id);
    const acts = [];

    if (!isNew && order >= 0) {
      acts.push(el("div", { class: "tl-ctl-group" },
        el("span", { class: "tl-ctl-lab" }, "Order"),
        el("button", {
          type: "button", class: "tl-chip", disabled: order === 0,
          onclick: () => { sc.modules = moveModule(sc.modules, live.id, -1); on.persist(); on.refresh(); close(); },
        }, "↑ Earlier"),
        el("button", {
          type: "button", class: "tl-chip", disabled: order === sc.modules.length - 1,
          onclick: () => { sc.modules = moveModule(sc.modules, live.id, 1); on.persist(); on.refresh(); close(); },
        }, "↓ Later")));
    }

    // The two sentences the row no longer carries, word for word and at the top of
    // the card the row's tap opens — which is where her phone reads them, because a
    // finger has no hover to bring them back with. Built by the same helper the row
    // uses, so the card and a computer's hover can never tell her two stories.
    //
    // A module the day could not place (a parked one) has no computed time, and a
    // module she has just added has not been laid out for her yet: neither shows a
    // summary, which is honest rather than a guess.
    const cm = r ? (r.modules || []).find((x) => x.id === live.id) : null;
    const summary = cm ? (() => {
      const n = moduleNotes(r, cm, live);
      return [
        // The tags the row used to wear, in the row's own colours, before the two
        // notes: since v157 the row is the name and its bars and nothing else, and
        // this is where a phone reads what it left behind.
        n.tags.length
          ? el("div", { class: "tl-tag-row" },
            ...n.tags.map((t) => el("span", { class: `badge ${t.cls}` }, t.text)))
          : null,
        el("p", { class: "card-sub", style: "margin:0 0 4px" }, n.when),
        el("p", { class: "card-sub", style: "margin:0 0 10px" }, n.cost),
      ];
    })() : null;

    return el("div", {},
      ...(summary || []),
      el("div", { class: "field" },
        el("label", { class: "check-row" }, toggle,
          el("span", { class: "check-label" }, "This module is in the scenario")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "A module is one piece of your equipment and the hands that tend it, counted as one thing. Switch it off and the line answers without it, so you can see what a machine would buy you before you buy it. A brand new module arrives switched off until its numbers are in.")),
      t("name", "What this module is called", "Your words, so the timeline reads the way you would say it."),
      t("icon", "Its picture", "Any single emoji — it is what you will look for on the timeline."),
      f("batch", "Pans in one batch", "How many pans one batch deals with.", { min: 1 }),
      // The cycles come first among the numbers, because in this model they ARE
      // the numbers: the module's minutes and its minutes-of-you are the sum of
      // its cycles, so there is nothing left for a separate box to say. Her own
      // sentence is the reason: a batch is not a process, a cycle is.
      cyclesField(live, on, refresh),
      f("everyMin", "Minutes from one batch to the next",
        "The pace the batches repeat at. For your fold that is the whole rest with its fold inside it, so one batch restarts a rhythm after the last — not the 30 minutes of the gap alone. Left on Auto it is the length of the cycles you just set, which is one batch following the one before it end to end.",
        { min: 1, auto: "everyAuto" }),
      repeatsField(),
      // Her point one: the module that became the bottleneck, had twice over.
      f("count", "How many production line do you have",
        "Two mixers, two ovens, two chillers, two people folding. Two production line of one module take a batch side by side, so a batch stops waiting for the one before it and the day's room doubles. It does NOT make pans you did not plan — raise how many batches it runs to put the second one to work, or let the climb do it for you. A module you have two production line of is drawn as that many lines, one under the other, each with its own person — the boxes for that appear below as soon as this says 2. Put 1 here and Allow multiple production line ON: then this module is one line with one person, and this number is not in force.",
        { min: 1, int: true, rebuild: true }),
      startField,
      chainBlock(),
      el("div", { class: "field" },
        el("label", { class: "check-row" }, overlapBox,
          el("span", { class: "check-label" }, "Allow multiple production line")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "Switch this ON when the minutes in one batch are the DOUGH's time and not a machine's — dough resting between folds, a second bin on the go. The module then stops holding its own batches apart, every batch sits where you put it, and two at once are drawn as two bars in their own lanes. Leave it OFF when the dough is physically IN the thing — a sink, an oven, one tub — because two batches cannot be in one of those at once; if you need two of those, that is How many production line do you have, which lets one batch in per production line you have. Either way, allowing them to overlap never lets a batch start before the dough exists: a module that waits for the module above still waits. And switch it on with one eye on the People rows — if two of your own batches need the same person in the same minute, that person's row goes red and names the minute. A new module arrives with this already on.")),
      linesBlock(),
      f("people", "People this batch needs", "Nearly always 1 — two people at one mixer is a different job.", { min: 1, int: true }),
      // A module drawn as lines is asked who is on each LINE, above — one box per
      // line, line 1 being this same number. Two boxes for one question is the
      // dead-control trap, so the module-level box steps aside while the lines are
      // in force and comes back when they are not.
      linesInForce(live) ? null : personField(),
      acts.length ? el("div", { class: "tl-ctl", style: "margin-top:4px" }, ...acts) : null,
      el("div", { class: "popup-actions" },
        // Her ask: "we can now add module as we wish, a button at the bottom
        // with, Duplicate this module, will be helpful."
        //
        // A copy is a COPY, not a new module: it carries the cycles, the numbers
        // and the person verbatim, so none of the new-module defaults reach it.
        // That is the whole point — two ovens of hers are two of the same thing,
        // and retyping eight numbers to say so is the chore this removes.
        button("Duplicate this module", () => {
          const copy = {
            ...JSON.parse(JSON.stringify(live)),
            id: newModuleId(sc.modules),
            name: `${live.name} (copy)`,
          };
          const at = sc.modules.findIndex((m) => m.id === live.id);
          const next = sc.modules.slice();
          next.splice(at + 1, 0, copy);
          sc.modules = next;
          on.persist();
          on.refresh();
          toast(`${copy.name} added just below it — change its name and its numbers to say how it is different.`);
          close();
        }, "ghost"),
        isNew ? null : button("Delete this module", () => confirmDialog(
          `Delete ${live.name}? The day will answer without it.`,
          () => {
            sc.modules = removeModule(sc.modules, live.id);
            on.persist();
            on.refresh();
            toast("Module deleted");
            close();
          },
          { danger: true, yesLabel: "Delete" }), "danger"),
        button("Done", close, "primary")));
  });
}

// ── The cycles inside one batch ────────────────────────────────────────────
//
// Her point three, as a list: a batch is not a process, a cycle is. Each cycle
// owns its own minutes and its own hands, and the one below cannot start until
// the one above it ends — which is not a rule this screen has to enforce,
// because it is what the list IS. A cycle's start is the batch's start plus the
// minutes of every cycle above it, so there is no way to type a cycle into a gap
// it cannot occupy.
//
// Load and Unload are where her hands are: at the front of the cycle, at its
// end, or at both. That is the correction this release makes. Her fold is at the
// END of each rest, and her oven swap is AFTER the bake, and both were being
// drawn at the start of their block before.
//
// The module's own Minutes and Minutes of you are not boxes here. They are the
// sums of these rows — so a second box saying the same thing twice could only
// ever disagree with them.
function cyclesField(live, on, refresh) {
  const list = cyclesIn(live);
  const rows = list.map((c, i) => {
    const name = el("input", {
      class: "input cyc-name", type: "text",
      value: String(c.name || ""), placeholder: `Cycle ${i + 1}`,
    });
    name.addEventListener("input", () => {
      putCycles(live, on, list.map((x, j) => (j === i ? { ...x, name: name.value } : { ...x })));
    });

    const num = (key, label, min) => {
      const input = el("input", {
        class: "input cyc-in", type: "number", inputmode: "numeric",
        min: String(min), step: "1", value: String(round(c[key])),
        "aria-label": `${label} in cycle ${i + 1}`,
      });
      input.addEventListener("input", () => {
        const n = Number(input.value);
        if (!Number.isFinite(n) || n < min) return;
        const next = list.map((x, j) => (j === i ? { ...x, [key]: n } : { ...x }));
        // Written without rebuilding the card — a number here moves a bar on the
        // timeline behind the pop-up, and the box under her finger stays put.
        putCycles(live, on, next);
      });
      return el("label", { class: "cyc-num" }, el("span", {}, label), input);
    };

    return el("div", { class: "cyc-row cyc-cycle" },
      el("div", { class: "cyc-line" },
        name,
        list.length > 1
          ? el("button", {
            type: "button", class: "cyc-del", "aria-label": `Remove cycle ${i + 1}`,
            onclick: () => { putCycles(live, on, list.filter((_, j) => j !== i)); refresh(); },
          }, "✕")
          : null),
      el("div", { class: "cyc-nums" },
        num("min", "Minutes", 0),
        num("load", "Load", 0),
        num("unload", "Unload", 0)));
  });

  const add = button("＋ Add a cycle", () => {
    putCycles(live, on, [...list, { name: "", min: 15, load: 0, unload: 0 }]);
    refresh();
  });

  return el("div", { class: "field" },
    el("label", {}, "Cycles in one batch"),
    el("div", { class: "cyc-list" }, ...rows),
    el("div", { class: "hint" },
      "Each cycle is one piece of this module's work, in the order you work them, and a cycle cannot start until the one above it ends — together they are the minutes one batch holds it. Load is your hands at the start of a cycle and Unload is your hands at the end: your weighing out is a load, and the fold at the end of a rest is an unload. A batch with a single cycle is drawn on the timeline as one plain bar."),
    el("div", { class: "popup-actions" }, add));
}

// The cycles as the model has them, copied — a module that has never had cycles
// of her own reads as the one cycle its Minutes and Minutes-of-you always said
// it was, so this list is never empty and never invents a second answer.
function cyclesIn(live) {
  const m = moduleFacts(live);
  return (m.cycles || []).map((c) => ({ ...c }));
}

// Writing them back. A number is written without rebuilding the card, because a
// rebuild would throw the box out from under her finger (v142); the caller
// refreshes the card itself for a change that alters its shape — a row added or
// removed.
function putCycles(live, on, next) {
  live.cycles = next.map((c) => ({
    name: String(c.name || ""),
    min: round(Math.max(0, Number(c.min) || 0)),
    load: round(Math.max(0, Number(c.load) || 0)),
    unload: round(Math.max(0, Number(c.unload) || 0)),
  }));
  on.persist();
  on.refresh();
}

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

// One batch's start time, written the way a typed time is written: into this
// batch's own slot, with the module's start time following batch one so the two
// can never disagree about where the module begins. Hands back where the batch
// really landed, because a module that takes one batch at a time puts it back
// after the one before it — and the model is what knows that, not this screen.
function setBatchStart(live, sc, on, k, want) {
  const landed = writeBatchStart(live, k, want);
  on.persist();
  on.refresh();
  return cycleLanded(sc, live, k, landed);
}

// The writing half on its own, with no save and no repaint, for the one press
// that moves several modules at once. That press has to have every module written
// BEFORE the day is asked where the batches really landed — the answer depends on
// all of them together — and it wants one save for the lot rather than one per
// module. There is still only one piece of arithmetic: clampStart, the same one a
// typed time goes through.
function writeBatchStart(live, k, want) {
  // The module as the model reads it, so the list written back is the module's
  // REAL one. Reading the stored list directly is what the day does not do: a
  // module that has never had a list of its own — which is every module of hers —
  // stores only its start time, and its other batches come from its own pace. Built
  // from the stored number instead, the list comes back as the one batch she moved
  // and a row of zeroes after it, and every one of those zeroes lands on the line
  // as a batch starting the moment the one before it ends. That is not a move, it
  // is the module's whole rhythm collapsing, and it is why a press here has to
  // read the model first.
  const m = moduleOf(live);
  const at = clampStart(want, m);
  const from = (m.starts || []).slice();
  // Batch one IS the module's start time, so moving it moves the module: every
  // batch after it comes along at the spacing she already set. Any later batch is
  // a nudge on that batch alone, which is what lets one batch be held off a
  // collision without sliding the rest of the day with it.
  const starts = from.map((t, i) => (k === 0 ? t + (at - from[0]) : (i === k ? at : t)));
  starts[k] = at;
  live.starts = starts.map((t) => Math.max(0, Math.round(t * 100) / 100));
  live.startMin = live.starts[0];
  return live.starts[k];
}

// What a moved batch is told: the clock it asked for, and — when the module's own
// rule put it somewhere else — which rule it was, in the same words the timeline's
// tap uses. Only ever spoken when the two differ, because a note that always
// appears is a note she stops reading.
function toastBatch(live, k, asked, landed, dayStartMin) {
  const which = `${live.name}, batch ${k + 1}`;
  if (landed <= asked) { toast(`${which} → ${clockAt(dayStartMin, landed)}`); return; }
  toast(`${which} → ${clockAt(dayStartMin, landed)} — ` + (live.overlap
    ? "the module above holds it back, so move that one and this follows"
    : `the module holds it back: ${live.count > 1
      ? "one batch per line you have"
      : "one batch at a time"}, so switch on Let its batches overlap for two at once`));
}

// Which job of the line a module is, so the Production line screen can read
// this module's minutes and its batch straight off it. The answer is kept as a
// job of its own rather than matched on the module's name, so she is free to call
// the wash whatever she calls it at the bench.
function lower(s) {
  return String(s || "").charAt(0).toLowerCase() + String(s || "").slice(1);
}

// ── What is parked ─────────────────────────────────────────────────────────
function parkedCard(r, sc, on) {
  if (!r.parked.length) return el("div", {});
  return el("div", {},
    el("h2", { class: "section" }, "Not in this scenario"),
    el("div", { class: "card" },
      el("p", { class: "card-sub", style: "margin:0 0 8px" },
        "A module that is switched off cannot be the bottleneck, and adds nothing to the day. These are the modules you have set aside — tap one to put it in."),
      ...r.parked.map((m) => el("div", { class: "info-row tappable", onclick: () => editModule(m, sc, on, false, r) },
        el("span", { class: "j-what" }, `${m.icon} ${m.name}`),
        el("span", { class: "info-val" }, m.needsYou ? "needs you" : "runs itself")))));
}

// ── Your scenarios ─────────────────────────────────────────────────────────
//
// Saving is what lets her keep two designs side by side — the line without a
// fridge and the line with one — and come back to either. A scenario is stored
// as a named copy of the modules, so opening one cannot disturb the other.
function savedScenarios(state) {
  if (!Array.isArray(state.settings.scenarios)) state.settings.scenarios = [];
  return state.settings.scenarios;
}

function scenariosCard(sc, state, on) {
  const list = savedScenarios(state);
  const here = sc.id && list.some((s) => s.id === sc.id);

  const kids = [
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Save the scenario you have built under its own name, and open it again another day. Two saved side by side is how you compare the line you have with the line you are thinking of buying."),
    el("div", { class: "tl-ctl" },
      el("button", {
        type: "button", class: "tl-chip on",
        onclick: () => {
          const entry = copyScenario(sc, sc.name, sc.id || `s${Date.now().toString(36)}`);
          sc.id = entry.id;
          const at = list.findIndex((x) => x.id === entry.id);
          if (at >= 0) list[at] = entry; else list.push(entry);
          on.persist();
          on.refresh();
          toast(`Saved as "${entry.name}"`);
        },
      }, here ? "Save changes" : "Save this scenario"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => saveAsPopup(sc, state, on, list),
      }, "Save a copy…")),
  ];

  if (!list.length) {
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" }, "Nothing saved yet."));
  } else {
    kids.push(el("div", { style: "margin-top:8px" },
      ...list.map((s) => el("div", {
        class: `info-row tappable${s.id === sc.id ? " now" : ""}`,
        onclick: () => openScenario(s, state, on),
      },
        el("span", { class: "j-what" }, `${s.id === sc.id ? "● " : ""}${s.name || "Untitled"}`),
        el("span", { class: "info-val" }, scenarioSummary(s)),
        el("button", {
          type: "button", class: "tl-chip",
          onclick: (e) => { e.stopPropagation(); editSavedPopup(s, sc, state, on, list); },
        }, "✏️")))));
  }

  // Her own day on one pair of hands, set for her — the eight modules of the
  // Production line's chain, each carrying the latest start the card works out
  // from the oven. Offered on the same terms as the line below it: never dropped
  // in, and it stops being offered the moment she has it.
  if (!list.some((s) => s.id === ONE_BAKER_SCENARIO.id)) {
    kids.push(el("div", {
      class: "info-row tappable", style: "margin-top:10px",
      onclick: () => {
        const entry = copyScenario(ONE_BAKER_SCENARIO, ONE_BAKER_SCENARIO.name, ONE_BAKER_SCENARIO.id);
        list.push(entry);
        openScenario(entry, state, on);
      },
    },
      el("span", { class: "j-what" }, `＋ ${ONE_BAKER_SCENARIO.name}`),
      el("span", { class: "info-val" }, "One pair of hands, set for you")));
  }

  // A second line, ready to open. Offered rather than dropped in on her: a
  // scenario she deletes must never come back on its own, and a line she has to
  // choose to add is one she knows she has. It disappears from here once it is
  // on her shelf, because it is then just another of her saved scenarios.
  if (!list.some((s) => s.id === SISTER_SCENARIO.id)) {
    kids.push(el("div", {
      class: "info-row tappable", style: "margin-top:10px",
      onclick: () => {
        const entry = copyScenario(SISTER_SCENARIO, SISTER_SCENARIO.name, SISTER_SCENARIO.id);
        list.push(entry);
        openScenario(entry, state, on);
      },
    },
      el("span", { class: "j-what" }, `＋ ${SISTER_SCENARIO.name}`),
      el("span", { class: "info-val" }, "Mix by hand, no chiller")));
  }

  return el("div", {}, el("h2", { class: "section" }, "Your scenarios"), el("div", { class: "card" }, ...kids));
}

function saveAsPopup(sc, state, on, list) {
  showPopup("Save this as…", (refresh, close) => {
    const input = el("input", { class: "input", type: "text", value: String(sc.name || "A new scenario") });
    const save = () => {
      const entry = copyScenario(sc, input.value, `s${Date.now().toString(36)}`);
      list.push(entry);
      // The copy becomes the one she is working on, so "save as" behaves the way
      // it does everywhere else: a new named thing, and you are now in it.
      Object.assign(sc, { id: entry.id, name: entry.name });
      on.persist();
      on.reload();
      toast(`Saved as "${entry.name}" — you are editing that one now`);
      close();
    };
    input.addEventListener("input", () => { sc.name = input.value; });
    return el("div", {},
      el("div", { class: "field" },
        el("label", {}, "What should this copy be called"),
        input,
        el("div", { class: "hint" }, "The scenario you were editing stays saved exactly as it is. This copy is a new one, and you carry on in it.")),
      el("div", { class: "popup-actions" },
        button("Save the copy", save, "primary")));
  });
}

function openScenario(s, state, on) {
  const entry = copyScenario(s, s.name, s.id);
  Object.assign(state.settings.scenario, entry);
  on.persist();
  // The whole screen, not just the answers: the name, the start time and the
  // target are the opened scenario's now, and must not still read as the last
  // one's.
  on.reload();
  toast(`Opened "${entry.name}"`);
}

function editSavedPopup(s, sc, state, on, list) {
  showPopup(s.name || "Untitled", (refresh, close) => {
    const input = el("input", { class: "input", type: "text", value: String(s.name || "") });
    return el("div", {},
      el("div", { class: "field" },
        el("label", {}, "What it is called"),
        input,
        el("div", { class: "hint" }, "Renaming a saved scenario changes only its name — the modules inside are left alone.")),
      el("div", { class: "popup-actions" },
        button("Delete this scenario", () => confirmDialog(
          `Delete the saved scenario "${s.name || "Untitled"}"? The modules you are working on now are not affected.`,
          () => {
            const at = list.findIndex((x) => x.id === s.id);
            if (at >= 0) list.splice(at, 1);
            if (sc.id === s.id) sc.id = "";
            on.persist();
            on.refresh();
            toast("Scenario deleted");
            close();
          },
          { danger: true, yesLabel: "Delete" }), "danger"),
        button("Save the name", () => {
          const at = list.findIndex((x) => x.id === s.id);
          if (at >= 0) list[at] = { ...list[at], name: input.value };
          if (sc.id === s.id) sc.name = input.value;
          on.persist();
          // Renaming the scenario she is in has to reach the name box at the
          // top of the screen, which the answers-only repaint never touched.
          on.reload();
          toast("Renamed");
          close();
        }, "primary")));
  });
}
