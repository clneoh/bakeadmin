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
// i want a start at 8am"), "an time scale ruler", bricks she can "create, edit
// and delete" and "move the sequence of", scenarios she can "save and name …
// edit or delete", "one person for each module" with "a Total person showing
// overlapping persons time slot", a brick that can "restart", bricks she can
// "drag to move the start time", and the fold brick showing its 28 minutes with
// its person's 2 minutes.
//
// It is a planner she types into: nothing here reads an order, and nothing here
// blocks a sale.

import { el, button, select, showPopup, toast, confirmDialog } from "../ui.js";
import { save } from "../state.js";
import { trim } from "../production.js";
import {
  computeScenario, climbSteps, DEFAULT_SCENARIO, SISTER_SCENARIO, hoursAndMinutes,
  clockOf, moveModule, removeModule, newModuleId, blankModule, copyScenario,
  PX_PER_MIN_CHOICES, LINE_JOBS, jobOf, scenarioSummary, moduleFacts, chainLine,
  combinedScenario, linesInForce, moduleOf, minuteAtPx,
} from "../scenario.js";

// A colour per brick, so a bar on the timeline and the person carrying it can be
// matched by eye. It cycles, so a brick added later still gets a colour.
const TONES = 8;

// What a dragged brick clicks to, and the shortest bar that still carries its
// minutes inside it.
const SNAP_MIN = 5;
const LAB_MIN_PX = 26;

// When a brick's cycles overlap, they are stacked in lanes rather than painted
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

const DAY_MIN = 24 * 60;

// The scale chips, in the order of PX_PER_MIN_CHOICES: a whole day, the
// standard reading, close, and closest.
const SCALE_NAMES = ["Wide", "Standard", "Close", "Closest"];

export function renderScenario(root, state) {
  const sc = ensureScenario(state);
  const ask = el("div", {});
  const readout = el("div", {});
  let dead = false;

  // Only the answers are repainted when something changes — never the fields —
  // so the box she is typing in keeps its place and its cursor.
  const on = {
    refresh: () => {
      if (!dead) readout.replaceChildren(...blocks(sc, state, on));
    },
    // The one thing that does redraw the fields. Opening a saved scenario, or
    // renaming the one she is in, replaces the name, the start time and the
    // target as well as the bricks — and with only the answers repainted the
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
      "Design the line the way you would build it: bricks on a clock, each with its own cycle time. Every figure here is a starting number you are meant to change — nothing on this screen reads an order or blocks a sale."),
    el("div", { class: "card" },
      el("p", { class: "card-title" }, "This scenario"),
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "A scenario is the sum of its bricks. Scenario 1 is the line you have now with no fridge in it — the fridge is in the list switched off, so you can see what adding one would buy without buying one."),
      el("div", { class: "field" },
        el("label", {}, "My day starts at"),
        start,
        el("div", { class: "hint" },
          "The time you begin. Every other time on this screen is counted from it, and the ruler along the top is drawn from it — so a brick that starts an hour in reads one hour after this.")),
      el("div", { class: "field" },
        el("label", {}, "Pans a day you want from it"),
        target,
        el("div", { class: "hint" },
          "Raise this and the ladder below answers again: it names the brick that stops you at this number, what to change to get past it, and what becomes the wall next.")),
      el("div", { class: "field" },
        el("label", {}, "What this scenario is called"),
        name)));
}

function blocks(sc, state, on) {
  const r = computeScenario(sc);
  const climb = climbSteps(sc, r.target);
  return [
    answerCard(r), climbCard(r, climb, sc, on), dayCard(r, sc, on),
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
      "The three things you are buying down together — the most hands at any one minute, the total minutes of somebody's time, and how long the run takes. Move a brick or a cycle and all three answer again, so a change that helps one and costs another is visible rather than hidden in a single number.")));

  kids.push(factGrid(r));
  kids.push(el("p", { style: "margin:10px 0 0" },
    el("b", {}, `${r.wall.icon} ${r.wall.name} sets your pace.`)));
  kids.push(el("p", { class: "card-sub", style: "margin:4px 0 0" }, wallWhy(r)));

  return el("div", {}, el("h2", { class: "section" }, "What it makes"), el("div", { class: "card" }, ...kids));
}

function factGrid(r) {
  return el("div", { class: "facts" },
    fact("Pans a day", String(r.pansPerDay), "the least any brick passes"),
    fact("Cycle time", `${trim(round1(r.cycleMin))} min`, "for one pan off the line"),
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

// Why this brick and not another — in the brick's own numbers, and naming the
// tie when there is one. A tie matters: several bricks passing the same small
// number is one shared limit wearing several hats, and relieving just one of
// them will not move the day at all.
function wallWhy(r) {
  const w = r.wall;
  if (!w.id) return "Switch a brick on and the line will answer.";
  if (w.batch <= 0 || w.repeatsHeld <= 0) {
    return `${w.name} cannot pass anything at all — it has no batch size or no passes in the day.`;
  }
  const tied = r.on.filter((f) => f.id !== w.id && f.output === w.output);
  const above = r.on
    .filter((f) => f.output > w.output)
    .sort((a, b) => a.output - b.output)[0];

  const lead = `${w.repeatsHeld} ${w.repeatsHeld === 1 ? "pass" : "passes"} of ${w.batch} pans is ${w.output} pans a day`;
  if (w.capped) {
    return `${lead} — but a ${hoursAndMinutes(w.cycleMin)} pass only fits ${w.fitsInDay} times in a day, so running it more often is not something a day can hold. This one has to take more pans at once.`;
  }
  if (tied.length) {
    return `${lead} — and ${tied.length === 1 ? "one other brick passes" : `${tied.length} other bricks pass`} the same ${w.output}, so they are one limit between them. Relieving only one of them will not move the day.`;
  }
  if (above) {
    return `${lead}, and the next tightest is ${above.icon} ${above.name} at ${above.output}. That is what the day can deliver.`;
  }
  return `${lead}, and nothing else is anywhere near it. That is what the day can deliver.`;
}

// ── The climb ──────────────────────────────────────────────────────────────
//
// The method she described, run for her: raise the number until something stops
// her, relieve that one thing, and meet the next wall. Every rung is one brick
// and one change, so the list reads as the order she would do them in.
function climbCard(r, climb, sc, on) {
  const kids = [
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Raise the day until something stops you, fix that one thing, and meet the next wall. This is that ladder, for the number you asked for."),
  ];

  // NOTE the order: `climb.reached` means the LADDER gets there, not that the
  // line already does. Read the wrong way round, a 12-pan line asking for 36
  // reports "already makes your 36" and never shows the ladder at all.
  if (r.target <= 0) {
    kids.push(el("p", { class: "card-sub" },
      "Type how many pans a day you want above, and the ladder appears here."));
  } else if (r.pansPerDay >= r.target) {
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
        `A ${hoursAndMinutes(stuck.cycleMin)} pass fits ${stuck.fitsInDay} ${stuck.fitsInDay === 1 ? "time" : "times"} in a day, and it is already running that often — and a second one of it has been tried too. So this one cannot be run more often either way. It has to take more pans at once, which means ${stuck.batch} in a pass becoming more than ${stuck.batch}.`));
    }
    kids.push(el("div", { class: "popup-actions" },
      button("Use these numbers", () => applyClimb(sc, climb, on), "primary")));
  } else {
    kids.push(el("p", { class: "card-sub" },
      "Nothing on this ladder moves that number. Look at the bricks below — one of them passes nothing at all."));
  }

  return el("div", {}, el("h2", { class: "section" }, "The climb"), el("div", { class: "card" }, ...kids));
}

function climbRow(s, i) {
  // A rung is either "run it more often" or "have a second one", and the two
  // read nothing alike — one buys cycles out of the same day, the other buys
  // capacity she does not have. Naming which is the difference between a ladder
  // she can act on and a number that moved.
  const how = s.kind === "count"
    ? `${s.from} → ${s.to} of them, run ${s.patch && s.patch.repeats} times over.`
    : `${s.from} → ${s.to} ${s.to === 1 ? "pass" : "passes"} in the day, at ${s.batch} pans a pass.`;
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
      // bricks are one limit wearing several hats: the chiller's three passes
      // only free the day once all three have been raised.
      s.after === s.before
        ? el("div", { class: "li-sub" }, "On its own that buys nothing — the other passes of this same limit are still where they were. Keep going.")
        : null));
}

// The one tap that makes the ladder real. Each rung writes the change the ladder
// itself computed — `repeats`, or `count` with the cycles that go with it — and
// only on the bricks the ladder named. Every other number she has typed is left
// alone.
function applyClimb(sc, climb, on) {
  const to = new Map(climb.steps.map((s) => [s.id, s.patch || { repeats: s.to }]));
  sc.modules = sc.modules.map((m) => (to.has(m.id) ? { ...m, ...to.get(m.id) } : m));
  on.persist();
  toast("The ladder is in the bricks now");
  on.refresh();
}

// ── The day ────────────────────────────────────────────────────────────────
//
// The timing diagram: one row per brick, the whole day across, then one row per
// person and a total row underneath. It is the thing the capacity screen cannot
// draw — not how fast a station is, but WHEN it runs and which of those times
// collide.
function dayCard(r, sc, on) {
  return el("div", {},
    el("h2", { class: "section" }, "The day"),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "Every brick as a bar, from the minute it starts, against the time of day along the top. A solid block is you standing at it; a pale one is it running without you. Drag a bar sideways to move when that brick starts — it clicks along in five-minute steps — or tap its row to type the numbers instead. Run the pointer, or your finger along the clock strip, and a line follows it down the day reading out the time, which is how you line two bricks up against each other. Swipe the empty space to scroll."),
    el("div", { class: "card tl-card" },
      controlsRow(r, sc, on),
      timeline(r, sc, on),
      clashNotes(r)));
}

function controlsRow(r, sc, on) {
  // The jobs that actually need hands, and how many LINES those jobs are. The two
  // numbers differ only when a brick she has two of is drawn as two lines — and
  // that is exactly when the People button below is about to hand out a person
  // per line rather than per brick, so it is also when its label has to change.
  const jobs = r.modules.filter((m) => m.on !== false && Number(m.touchMin) > 0);
  const lineJobs = jobs.reduce((t, m) => t + Math.max(1, m.lines || 0), 0);
  return el("div", { class: "tl-ctl" },
    el("div", { class: "tl-ctl-group" },
      el("span", { class: "tl-ctl-lab" }, "Scale"),
      ...PX_PER_MIN_CHOICES.map((px, i) => el("button", {
        type: "button",
        class: `tl-chip${Math.abs(r.pxPerMin - px) < 0.01 ? " on" : ""}`,
        onclick: () => { sc.pxPerMin = px; on.persist(); on.refresh(); },
      }, SCALE_NAMES[i] || `${px}x`))),
    el("div", { class: "tl-ctl-group" },
      el("span", { class: "tl-ctl-lab" }, "People"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => {
          // Her starting point: one person standing at every job that needs hands.
          // A job is a LINE, so a brick she has two of takes two people here and
          // not one — which is what she wants this for: each worker on one line,
          // learning one job rather than wearing every hat in the day. The clashes
          // that appear are exactly what she then slides the bricks to remove, and
          // it is the honest first answer, because a person per line really does
          // cover the day.
          let n = 0;
          sc.modules = sc.modules.map((m) => {
            const needsHands = m.on !== false && Number(m.touchMin) > 0;
            if (!needsHands) return { ...m, person: 0, crew: undefined };
            const have = Math.max(1, linesInForce(m));
            const crew = [];
            for (let i = 0; i < have; i += 1) { n += 1; crew.push(n); }
            return { ...m, crew, person: crew[0] };
          });
          // Every job has just been given its own person, so any combination
          // label from before is describing a day that no longer exists.
          sc.merges = {};
          on.persist();
          toast(`${n} ${n === 1 ? "person" : "people"}, one to ${lineJobs > jobs.length ? "a line" : "a brick"} — now drag the bricks closer together`);
          on.refresh();
        },
      }, lineJobs > jobs.length ? "One a line" : "One a brick"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => {
          sc.modules = sc.modules.map((m) => ({ ...m, person: 0, crew: undefined }));
          // Nobody is named any more, so nothing is being covered by anybody —
          // a leftover combination label would be a lie about the day.
          sc.merges = {};
          on.persist();
          toast("Sharing them out — as few hands as can cover the day");
          on.refresh();
        },
      }, "Share them"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => combinePopup(r, sc, on),
      }, "Combine two…")),
    el("div", { class: "tl-ctl-group" },
      el("span", { class: "tl-ctl-lab" }, "The line"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => chainPopup(r, sc, on),
      }, chainedCount(r) ? `${chainedCount(r)} waits above` : "Not chained")),
    el("div", { class: "tl-ctl-group" },
      el("button", {
        type: "button", class: "tl-chip add",
        onclick: () => addBrick(sc, on),
      }, "＋ New brick")));
}

// How many bricks are waiting on the one above them. Zero is the honest answer
// for a line whose times she placed herself, and it is worth saying out loud:
// nothing on the screen is being moved behind her back.
function chainedCount(r) {
  return r.on.filter((m) => m.follow).length;
}

// What the chain is, why two of a brick is an alternative to waiting, and one
// tap either way. This is her points three and four said as a control, and the
// three cost numbers make the difference between the two lines readable rather
// than a matter of taste.
function chainPopup(r, sc, on) {
  const waiting = r.on.filter((m) => m.follow);
  const cost = el("p", { class: "card-sub", style: "margin:10px 0 0" },
    `${r.people} ${r.people === 1 ? "person" : "people"} · ${hoursAndMinutes(r.personMin)} of hands · a ${hoursAndMinutes(r.runMin)} day.`);

  const setAll = (yes) => {
    sc.modules = sc.modules.map((m) => (m.on === false ? m : { ...m, follow: yes }));
    on.persist();
    on.refresh();
    toast(yes ? "Every brick now waits for the one above it" : "Nothing waits any more — your own times are in charge");
    on.refresh();
  };

  showPopup("Bricks that wait", (refresh, close) => el("div", {},
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "A brick set to wait cannot start a cycle until the brick above it has finished that same cycle: lot 1 waits for lot 1, lot 10 for lot 10. That is how a real line behaves — a slow fold holds every later lot behind it — and it is the thing to plan away, either by moving the slow brick or by having two of it."),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      chainedCount(r)
        ? `${chainedCount(r)} of your bricks ${chainedCount(r) === 1 ? "waits" : "wait"} on the brick above: ${waiting.map((m) => `${m.icon} ${m.name}`).join(", ")}. The rest keep the times you placed.`
        : "Nothing is waiting right now, so every brick keeps the time you gave it. Switch the chain on and the line answers as one line rather than a set of separate jobs."),
    cost,
    el("div", { class: "popup-actions" },
      chainedCount(r)
        ? button("Take the waiting off", () => { setAll(false); close(); })
        : null,
      button(chainedCount(r) ? "Chain the whole line" : "Chain every brick", () => { setAll(true); close(); }, "primary"),
      button("Close", close))));
}

function addBrick(sc, on) {  const id = newModuleId(sc.modules);
  sc.modules = [...sc.modules, blankModule(id)];
  on.persist();
  on.refresh();
  const added = sc.modules.find((m) => m.id === id);
  toast("New brick added — switch it on once its numbers are in");
  editModule(added, sc, on, true);
}

function timeline(r, sc, on) {
  const trackW = Math.round(r.windowMin * r.pxPerMin);
  const lab = el("span", { class: "tl-cursor-lab" });
  const cursor = el("div", { class: "tl-cursor", hidden: true }, lab);
  const tl = el("div", { class: "tl", style: `--hour-w:${Math.round(60 * r.pxPerMin)}px` },
    el("div", { class: "tl-inner" },
      rulerRow(r, trackW),
      ...r.modules.map((m, i) => moduleRow(r, m, i, trackW, sc, on)),
      // The people are the answer to her question, so they are drawn as what
      // they are: a row each, carrying the bricks that row attends — and under
      // them the whole lot stacked, which is the manpower at each minute.
      el("div", { class: "tl-split" }, "People"),
      ...r.rows.map((row) => personRow(r, row, trackW, sc)),
      totalRow(r, trackW),
      // The day's own reading, drawn last so it runs over every bar rather than
      // under one. See wireTimeCursor for what it does and who it answers to.
      cursor));
  wireTimeCursor(tl, r, cursor, lab);
  return tl;
}

// The time cursor: a hairline down the whole day that reads the clock at
// wherever she points. The ruler along the top says 8:00; this is what answers
// "and what is here?" — which is the question she asks of a chart when she is
// lining two bricks up. It only ever reads: nothing here writes a brick, moves a
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
  let dragging = false;
  const place = (clientX) => {
    const t = minuteAtPx(clientX - ruler.getBoundingClientRect().left, r.pxPerMin, r.windowMin);
    if (t == null) { cursor.hidden = true; return; }
    cursor.hidden = false;
    const x = t * r.pxPerMin;
    cursor.style.left = `${Math.round(ruler.offsetLeft + x)}px`;
    lab.textContent = clockAt(r.dayStartMin, t);
    // The reading hangs off the right of the line, so at the far end of the day
    // there is no room for it and it has to hang to the left instead. Measured
    // in px rather than minutes, so it holds at every scale she can pick.
    cursor.classList.toggle("at-end", x > r.windowMin * r.pxPerMin - 60);
  };

  // The clock strip. Capture means the drag keeps working once the finger
  // wanders off the strip, so a time stays as easy to hit at the far left of the
  // day as in the middle of it.
  ruler.addEventListener("pointerdown", (e) => {
    dragging = true;
    place(e.clientX);
    // A pointer already gone by the time this runs cannot be captured, and it
    // throws rather than saying so — but the reading is placed either way, so
    // losing the capture must not lose the drag or the cursor with it.
    try { ruler.setPointerCapture(e.pointerId); } catch { dragging = false; }
  });
  ruler.addEventListener("pointermove", (e) => { if (dragging) place(e.clientX); });
  const end = () => { dragging = false; };
  ruler.addEventListener("pointerup", end);
  ruler.addEventListener("pointercancel", end);

  // Everywhere else. A pen and a mouse read the chart without touching it, and
  // the line leaves when the pointer does; a touch is skipped because there is
  // no hovering one — its gesture is the strip above.
  tl.addEventListener("pointermove", (e) => {
    if (dragging || e.pointerType === "touch") return;
    place(e.clientX);
  });
  tl.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "touch") cursor.hidden = true;
  });
}

function rulerRow(r, trackW) {
  const ticks = [];
  for (let t = 0; t <= r.windowMin; t += 30) {
    const x = Math.round(t * r.pxPerMin);
    if (t % 60 === 0) {
      ticks.push(el("div", { class: "tl-tick", style: `left:${x}px` },
        el("span", {}, clockAt(r.dayStartMin, t))));
    } else {
      ticks.push(el("div", { class: "tl-tick minor", style: `left:${x}px` }));
    }
  }
  return el("div", { class: "tl-row tl-ruler" },
    el("div", { class: "tl-name" }, el("div", { class: "tl-sub" }, "the clock")),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...ticks));
}

// The bars of one brick, each pass of it — one bar is one cycle, and a cycle is
// one lot of dough. Drawn as its own node list so a drag can repaint just this
// row's bars and leave the rest of the day alone.
//
// `onlyK` is the cycle being dragged: its bar moves and the others stay where
// they are, which is her point two — each cycle has its own start time. The
// default (-1) moves the whole row, which is what the model does when a brick's
// start time is typed rather than a single cycle dragged.
function passBars(m, tone, r, shift = 0, onlyK = -1, line = null) {
  const bars = [];
  // Which cycles this row draws, and which lane each of them is in. A brick drawn
  // as one row draws all of them and first-fits the lanes, because a brick whose
  // cycles are free to overlap — her own ask — can put two of them in the same
  // minutes, and drawn on one row they would paint over each other and read as one
  // long pass. A brick drawn as several LINES draws one line's cycles here, and
  // its first-fit is then over just those: normally one lane, and two only if
  // something really has put two of one line's lots in the same minutes.
  const { ks, laneOf, lanes } = lineLanes(m, line);
  ks.forEach((k, i) => {
    const p = m.passes[k];
    const moves = onlyK < 0 || onlyK === k;
    const at = p.at + (moves ? shift : 0);
    // A chained brick's times are the brick above's times, not hers to place, so
    // those bars say so and do not offer a drag she cannot have.
    if (at >= r.windowMin) return;
    const left = Math.round(at * r.pxPerMin);
    const right = Math.round(Math.min(p.end + (moves ? shift : 0), r.windowMin) * r.pxPerMin);
    const w = Math.max(4, right - left);
    const touchW = p.touchTo > p.touchFrom
      ? Math.max(2, Math.round((p.touchTo - p.touchFrom) * r.pxPerMin))
      : 0;
    const top = lanes > 1 ? LANE_TOP + laneOf[i] * LANE_PITCH : null;
    const h = lanes > 1 ? LANE_H : null;
    bars.push(el("div", {
      class: `tl-bar ${tone}${m.follow ? " locked" : ""}${lanes > 1 ? " laned" : ""}`,
      // Which cycle this is, so a drag knows what it is moving. The count, not
      // the whole brick, is what she drags.
      "data-k": String(k),
      style: `left:${left}px;width:${w}px` +
        (top == null ? "" : `;top:${top}px;height:${h}px`),
      // What the bar holds, in her terms: how many minutes the dough is in it.
      title: `${m.name}${line == null ? "" : `, line ${line + 1}`}, cycle ${k + 1}: ${trim(m.cycleMin)} min` +
        (touchW ? `, ${trim(m.touchMin)} min of you` : ", no hands"),
    },
      touchW ? el("div", { class: "tl-touch", style: `width:${touchW}px` }) : null,
      // Only the first pass of a row carries the number, so a fold loop does
      // not repeat "28" four times across the day — and a laned bar is too short
      // to hold it, so the number is left to the row's own line instead.
      i === 0 && w >= LAB_MIN_PX && h == null ? el("span", { class: "tl-lab" }, String(Math.round(m.cycleMin))) : null));
  });
  return bars;
}

// The cycles one row draws and the lanes they need: every cycle of the brick for
// a brick drawn as a single row, or one line's worth of them for a brick worked as
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

// Where each cycle of a brick is, as a plain array of minutes — the brick as the
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

// The brick a chained brick is waiting on: the one above it in the list that is
// actually switched on. A machine that is off cannot pass dough down the line,
// which is exactly how chainLine skips it.
function chainAbove(r, m) {
  if (!m.follow) return null;
  const at = r.modules.findIndex((x) => x.id === m.id);
  for (let i = at - 1; i >= 0; i -= 1) if (r.modules[i].on) return r.modules[i];
  return null;
}

function moduleRow(r, m, idx, trackW, sc, on) {
  const tone = `tone-${idx % TONES}`;

  if (!m.on) {
    return el("div", { class: "tl-row off", onclick: () => editModule(m, sc, on) },
      el("div", { class: "tl-name" },
        el("div", { class: "tl-name-top" }, `${m.icon} ${m.name}`),
        el("div", { class: "tl-sub" }, "not in this scenario")),
      el("div", { class: "tl-track", style: `width:${trackW}px` }));
  }

  // The raw brick in the stored scenario, which is what a drag writes to.
  const live = sc.modules.find((x) => x.id === m.id) || m;
  const above = chainAbove(r, m);

  // A brick she has two of is worked as two LINES — the copies take the lots in
  // turn, odd lots on one and even on the other — so it is drawn as two rows, one
  // per line, each naming the person on it. That is her own ask, and it is also
  // the only drawing that can show two lines at all: the two lines' lots need not
  // overlap in time, so flattening them onto one row would draw a single stream
  // where there are really two.
  //
  // A brick that is not worked as lines gets the single row it has always had, to
  // the pixel — which is every brick she has today.
  const lines = m.lines || 0;
  if (!lines) return brickRow(r, m, live, sc, on, tone, trackW, above, null);

  const block = el("div", { class: "tl-block" });
  for (let line = 0; line < lines; line += 1) {
    block.append(brickRow(r, m, live, sc, on, tone, trackW, above, line));
  }
  return block;
}

// One row of a brick: the whole brick, or one of its lines. Its own name cell, its
// own track and its own drag are all here, so a brick drawn as two lines is simply
// two of these and nothing else on the screen has to know.
function brickRow(r, m, live, sc, on, tone, trackW, above, line) {
  let drag = null;
  let swallow = false;

  // A row whose bars overlap needs a taller track to draw them in lanes. A row
  // whose bars do not gets the track it has always had, to the pixel.
  const { lanes } = lineLanes(m, line);
  const track = el("div", {
    class: "tl-track",
    style: `width:${trackW}px${lanes > 1 ? `;height:${laneTrackH(lanes)}px` : ""}`,
  });
  track.replaceChildren(...passBars(m, tone, r, 0, -1, line));

  // The line a drag rewrites as the finger moves — the row should read its new
  // time while the cycle is still being placed.
  let whenLine = null;
  let name = null;

  if (line == null) {
    whenLine = el("div", { class: "tl-sub" });
    whenLine.textContent = timeLine(m, r.dayStartMin) + (above ? ` · waits on ${above.name}` : "");
    name = el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" },
        `${m.icon} ${m.name}`,
        // How many of this brick she has. Two mixers, two chillers, two people
        // folding: named on the row, because everything downstream of it — the
        // day's room, the hands — follows from this one number.
        m.count > 1 ? el("span", { class: "badge badge-multi" }, `${m.count} of them`) : null,
        above ? el("span", { class: "badge badge-past" }, "waits above") : null,
        // And how many of its lots are in it at once, which is the one thing the
        // taller row is telling her. Only shown when it is really happening, so a
        // brick that is not overlapping never wears a badge about it.
        lanes > 1 ? el("span", { class: "badge badge-over" }, `${lanes} at once`) : null,
        m.needsYou ? null : el("span", { class: "badge badge-past" }, "itself"),
        // She has asked for more passes than a day holds. The number is kept as
        // she typed it — the row just counts honestly and says why.
        m.capped ? el("span", { class: "badge badge-over" }, "a day's limit") : null),
      whenLine,
      el("div", { class: "tl-sub" }, costLine(m)));
  } else {
    // A line of a brick: who is on it, how many lots it takes and the minutes it
    // really runs, read off the cycles the chain has already placed rather than
    // worked out again here. The brick's own name, badges and cost line stay on
    // the first line, so a brick is still one thing she can read in one place.
    const stats = lineStats(m, line);
    const who = lineWho(m, line) + (stats ? ` · ${stats.lots} ${stats.lots === 1 ? "lot" : "lots"}` : "");
    whenLine = el("div", { class: "tl-sub" }, stats
      ? `${clockAt(r.dayStartMin, stats.from)} → ${clockAt(r.dayStartMin, stats.to)}`
      // A line with nothing on it is the second machine she has bought and not
      // yet used — so it says so, rather than looking like a brick that is simply
      // empty for no reason.
      : "nothing on this line yet — raise how many times it runs");
    name = el("div", { class: "tl-name" },
      line === 0
        ? el("div", { class: "tl-name-top" },
          `${m.icon} ${m.name}`,
          el("span", { class: "badge badge-multi" }, `${m.lines} lines`),
          above ? el("span", { class: "badge badge-past" }, "waits above") : null,
          m.needsYou ? null : el("span", { class: "badge badge-past" }, "itself"),
          m.capped ? el("span", { class: "badge badge-over" }, "a day's limit") : null)
        : null,
      el("div", { class: "tl-sub" }, who),
      whenLine,
      line === 0 ? el("div", { class: "tl-sub" }, costLine(m)) : null,
      line === 0 && above ? el("div", { class: "tl-sub" }, `waits on ${above.name}`) : null);
  }

  // A brick that is not drawn as lines gets the class list it has always had, to
  // the letter — everything CSS says about a plain brick still applies to it.
  const row = el("div", {
    class: `tl-row${line == null ? "" : ` tl-line${line > 0 ? " tl-line-sub" : ""}`}`,
  }, name, track);

  row.addEventListener("click", () => {
    if (swallow) { swallow = false; return; }
    editModule(live, sc, on);
  });

  // Dragging a bar moves THAT cycle, not the brick — her point two. The drag
  // only starts on a BAR, so swiping the empty track still scrolls the day the
  // way it always did, and it snaps to five-minute steps, because a start time
  // is something she decides, not something a fingertip decides for her.
  //
  // A chained brick is left alone here on purpose: its times are the brick
  // above's times, so there is nothing to drag and no drag is offered. The tap
  // still opens its editor, where the switch that made it wait is, and the row
  // says which brick it is waiting on.
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const bar = e.target && e.target.closest ? e.target.closest(".tl-bar") : null;
    if (!bar || m.follow) return;
    swallow = false;
    const k = Math.max(0, Math.round(Number(bar.dataset.k) || 0));
    const starts = cycleStarts(m);
    drag = { id: e.pointerId, x0: e.clientX, k, from: starts[k], delta: 0, moved: false };
    try { track.setPointerCapture(e.pointerId); } catch { /* capture is a nicety */ }
    bar.classList.add("dragging");
    e.preventDefault();
  });

  track.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const delta = Math.round((e.clientX - drag.x0) / r.pxPerMin / SNAP_MIN) * SNAP_MIN;
    if (delta === drag.delta) return;
    drag.delta = delta;
    drag.moved = drag.moved || delta !== 0;
    track.replaceChildren(...passBars(m, tone, r, delta, drag.k, line));
    whenLine.textContent = timeLine(m, r.dayStartMin, drag.from + delta, drag.k);
    e.preventDefault();
  });

  const drop = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    swallow = d.moved;
    if (d.moved) {
      // Stored as the brick's own list of cycle times. Cycle one's time IS the
      // brick's start time and is written alongside it, so the two can never
      // disagree about where the brick begins.
      const starts = cycleStarts(m);
      starts[d.k] = clampStart(d.from + d.delta, m);
      live.starts = starts;
      live.startMin = starts[0];
      on.persist();
      // Where she dropped it is not always where it lands: a brick that takes one
      // lot at a time puts the cycle back after the one before it, and a chained
      // brick puts it back after the brick above. That is the rule doing its job,
      // not the drag failing — so it says which, and names the switch that would
      // let two lots share the minutes when the switch is what is holding it.
      const landed = cycleLanded(sc, m, d.k, starts[d.k]);
      const which = `${m.name}${m.lines ? `, line ${(d.k % m.count) + 1}` : ""}, cycle ${d.k + 1}`;
      toast(landed > starts[d.k]
        ? `${which} → ${clockAt(r.dayStartMin, landed)} — ${m.overlap
          ? "the brick above holds it back, so move that one and this follows"
          : `the brick holds it back: ${m.count > 1 ? "one lot per line you have" : "one lot at a time"}, so switch on Let its cycles overlap for two at once`}`
        : `${which} → ${clockAt(r.dayStartMin, starts[d.k])}`);
    }
    on.refresh();
  };
  track.addEventListener("pointerup", drop);
  track.addEventListener("pointercancel", drop);

  return row;
}

// One line of a brick: the lots on it and the minutes they take, read off the
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
function lineWho(m, line) {
  const p = m.crew ? m.crew[line] : 0;
  return p > 0 ? `👤 Person ${p}` : "👤 whoever is free";
}

// Where a cycle she has just dropped actually ends up, straight from the model —
// so the screen can tell her when her own brick's rule moved it, and where to.
// Asking the model rather than re-deriving the rule here is the point: a second
// copy of the arithmetic in the view is a second answer waiting to disagree.
function cycleLanded(sc, m, k, dropped) {
  const placed = chainLine(sc.modules).find((x) => x.id === m.id);
  const at = placed && placed.starts ? Number(placed.starts[k]) : NaN;
  return Number.isFinite(at) ? Math.max(at, dropped) : dropped;
}

// One cycle's start can move within the day, but a pass still has to finish
// inside one — dough still in the oven at midnight is a typing mistake, not a
// plan. Every cycle is a pass of `cycleMin`, so the same ceiling holds for each.
function clampStart(start, m) {
  const top = Math.max(0, DAY_MIN - (Number(m.cycleMin) || 0));
  return Math.max(0, Math.min(top, Math.round(Number(start) || 0)));
}

function timeLine(m, dayStartMin, startMin, k) {
  // Mid-drag the line names the cycle under the finger, because "starts 3:28"
  // for a brick that runs six times does not say which of the six just moved.
  if (k != null) {
    const t = startMin == null ? (m.starts && m.starts[k]) : startMin;
    return `cycle ${k + 1} of ${m.repeatsHeld} at ${clockAt(dayStartMin, t)}`;
  }
  const at = startMin == null ? m.startMin : startMin;
  const runs = m.repeatsHeld > 1 ? ` · runs ${m.repeatsHeld}×` : "";
  return `starts ${clockAt(dayStartMin, at)}${runs}`;
}

// The two numbers she reads off a brick at a glance: how long one pass holds it,
// and how much of a person that pass costs. For her fold that is 28 and 2.
function costLine(m) {
  if (!m.needsYou) return `${trim(m.cycleMin)} min a pass · no hands`;
  return `${trim(m.cycleMin)} min a pass · ${trim(m.touchMin)} min of you`;
}

function personRow(r, row, trackW, sc) {
  const bars = row.items.map((w) => el("div", {
    class: `tl-bar tone-${(toneIndex(r, w.module) || 0) % TONES}${isClash(row, w) ? " clash" : ""}`,
    style: `left:${Math.round(w.from * r.pxPerMin)}px;width:${Math.max(4, Math.round((w.to - w.from) * r.pxPerMin))}px`,
    // Which line of which brick this stretch of the person's day is, so a doubled
    // brick reads as that person being on line 2 rather than on "the fold".
    title: `${w.name}${w.line >= 0 ? `, line ${w.line + 1}` : ""}: ${clockAt(r.dayStartMin, w.from)} → ${clockAt(r.dayStartMin, w.to)}`,
  }));

  // How many different bricks this person is at — the hats they wear. It is the
  // number she is planning down, because one worker covering one line is a worker
  // who can be trained on one job.
  const bricks = new Set(row.items.map((w) => w.module)).size;

  return el("div", { class: "tl-row person" },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" }, `👤 ${personLabel(row, sc)}`),
      el("div", { class: "tl-sub" }, `${hoursAndMinutes(row.busy)} of work` +
        (bricks > 1 ? ` · at ${bricks} bricks` : "")),
      row.clashes.length
        ? el("div", { class: "tl-sub bad" }, row.clashes.length === 1 ? "two jobs at once" : `${row.clashes.length} collisions`)
        : null),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...bars));
}

function personLabel(row, sc) {
  const also = mergeMembers(row.person, sc);
  return `Person ${row.person}${also.length ? `+${also.join("+")}` : ""}`;
}

// Which people this row is standing in for, kept only while it is true: the
// moment she gives a brick back to person 3, person 3 has a row of its own again
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
// rows become one — the bricks move, the label follows, and whatever collides is
// exactly the manpower the combination cannot pay for. Two taps, because that is
// the sentence she said: this person, then that person.
function combinePopup(r, sc, on) {
  const named = r.rows.filter((x) => x.named);
  if (named.length < 2) {
    toast(named.length
      ? "Give a second person a brick — a combination needs two people to join"
      : "Give two bricks to two different people first — then there are two people to combine");
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
        doCombine(sc, into, x, on);
        close();
      },
    }, `${personLabel(x, sc)} · ${x.items.length} ${x.items.length === 1 ? "job" : "jobs"}, ${hoursAndMinutes(x.busy)}`);

    return el("div", {},
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "Putting two people's bricks on one pair of hands. That is how you find out what one person can really cover — and whatever collides is the part they cannot."),
      el("p", { class: "card-sub", style: "margin:0 0 8px" },
        into == null
          ? "Tap the person who keeps the job."
          : `Tap whose bricks should move to ${personLabel({ person: into }, sc)}.`),
      el("div", {}, ...named.map(chipFor)),
      el("p", { class: "card-sub", style: "margin:10px 0 0" },
        "Every brick keeps the job it does; only who is standing at it changes. Giving one brick back is done in that brick's own editor."));
  });
}

function doCombine(sc, into, from, on) {
  // The work itself is the model's, so it is the same answer every time and can
  // be tested without a screen: it hands back the modules and the new label.
  const next = combinedScenario(sc, into.person, from.person);
  sc.modules = next.modules;
  sc.merges = next.merges;
  on.persist();
  on.refresh();
  const members = (next.merges[String(into.person)] || []);
  toast(`Person ${into.person}${members.length ? `+${members.join("+")}` : ""} — the collisions are what they cannot cover`);
}

// The total person she asked for: person 1, person 2, person 3 and the rest
// stacked on top of each other, so a doubled stretch is a shape she can see
// rather than a number she has to trust. It is also where the day is won: bring
// the bricks closer together and the tall part of this row comes down.
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

  return el("div", { class: "tl-row person total-row" },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" }, "👥 People at once"),
      el("div", { class: "tl-sub" },
        r.people === 1 ? "one at a time" : `up to ${r.people} at once`),
      busiest && r.people > 1
        ? el("div", { class: "tl-sub" }, `busiest ${clockAt(r.dayStartMin, busiest.from)}–${clockAt(r.dayStartMin, busiest.to)}`)
        : null,
      r.demand.overlapMin > 0
        ? el("div", { class: "tl-sub bad" }, `${hoursAndMinutes(r.demand.overlapMin)} with two at a time`)
        : null),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...bars));
}

// The collisions in words, under the diagram, because a red outline on a narrow
// bar is not an explanation. Two bricks given to one person that overlap in time
// cannot both be done, and moving one of them is the fix. Her own reading of a
// collision is the point of the whole exercise: it is the manpower she is
// paying for twice, so it is counted as two people on the row above.
// A job named the way it is drawn on the timeline: the brick, and which line of
// it when the brick is worked as lines. Without the line, two lines of one brick
// colliding read as the same brick twice — "Person 2 is at the fold and the fold
// at the same time" — which is exactly the collision she is looking at.
function jobName(w) {
  if (!w) return "—";
  return w.line >= 0 ? `${w.name}, line ${w.line + 1}` : w.name;
}

function clashNotes(r) {
  const notes = [];
  for (const row of r.rows) {
    const who = personLabel(row, r.scenario);
    for (const c of row.clashes) {
      if (notes.length >= 4) break;
      notes.push(`${who} is at ${jobName(c.before)} and ${jobName(c.after)} at the same time, ${clockAt(r.dayStartMin, c.from)} → ${clockAt(r.dayStartMin, c.to)}. Move one of them, or combine with another person and accept the collision.`);
    }
  }
  if (!notes.length) return null;
  return el("div", { class: "tl-notes" },
    ...notes.map((n) => el("div", { class: "tl-note" }, n)));
}

function isClash(row, w) {
  return row.clashes.some((c) => c.after === w);
}

function toneIndex(r, id) {
  const at = r.modules.findIndex((m) => m.id === id);
  return at < 0 ? 0 : at;
}

// ── A brick, opened ────────────────────────────────────────────────────────
//
// Everything about one brick in one place, in the order the day runs through it:
// what it is, how long it holds, how much of her it takes, when it starts, and
// who is standing at it. The start is the knob she named, so it sits beside the
// explanation of what turning it does.
function editModule(saved, sc, on, isNew = false) {
  showPopup(`${saved.icon} ${saved.name}`, (refresh, close) => {
    // The brick list is edited in place, so each field writes only its own value
    // back; the screen behind the pop-up catches up when it closes.
    const live = sc.modules.find((m) => m.id === saved.id) || saved;

    const set = (key, raw, opt) => {
      const n = Number(raw);
      const min = opt && opt.min != null ? opt.min : 0;
      if (!Number.isFinite(n) || n < min) return;
      live[key] = opt && opt.int ? Math.round(n) : n;
      on.persist();
      on.refresh();
    };

    const f = (key, label, hint, opt = {}) => {
      const input = el("input", {
        class: "input", type: "number", inputmode: "decimal",
        min: String(opt.min == null ? 0 : opt.min), step: String(opt.step || 1),
        value: String(live[key] == null ? 0 : live[key]),
      });
      // Typing writes the number and repaints the screen behind the pop-up, but
      // it must NOT rebuild this card: this card is tall, and rebuilding it under
      // her finger threw the scroll and destroyed the box she was typing in.
      // A box whose answer changes the CARD's shape — one more line, one more
      // cycle row — says so, and then it rebuilds once, when she leaves the box.
      input.addEventListener("input", () => set(key, input.value, opt));
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

    // Whether this brick is fed by the one above it. Her points three and four,
    // as one switch: its cycle 10 cannot start until the brick before it has
    // finished ITS cycle 10.
    const followBox = el("input", { type: "checkbox", checked: live.follow === true });
    followBox.addEventListener("change", () => {
      live.follow = followBox.checked;
      on.persist();
      on.refresh();
      refresh();
    });

    // Her ask, as a switch: "allow each brick cycle to overlap". Off, the brick
    // holds its own cycles apart — one lot at a time — which is right when the
    // dough is physically IN the thing. On, each cycle sits where she put it.
    const overlapBox = el("input", { type: "checkbox", checked: live.overlap === true });
    overlapBox.addEventListener("change", () => {
      live.overlap = overlapBox.checked;
      on.persist();
      on.refresh();
      refresh();
    });

    // Her ask: "one brick having 2 lines, each line can have its own person".
    // A brick she has two of is two lines, so this is where she says who is
    // standing at each. Line 1 IS the brick's own person — one number written in
    // two places, exactly as startMin is starts[0] — so a one-of-them brick still
    // has the one box it always had, and the two can never disagree.
    const linesBlock = () => {
      const many = Math.max(1, Math.min(8, Math.round(Number(live.count) || 1)));
      if (many < 2) return null;
      if (live.overlap === true) {
        return el("div", { class: "field" },
          el("div", { class: "tl-ctl-lab" }, "Lines"),
          el("div", { class: "hint", style: "margin-top:4px" },
            "Let its cycles overlap is switched ON, so this brick's cycles no longer take turns and it is drawn as one row with one person. The people you set per line are kept, not thrown away — switch overlapping off and the brick is drawn as its lines again, each with its own."));
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
          el("label", {}, `Line ${i + 1} — who is on it`),
          input,
          i === 0
            ? el("div", { class: "hint" },
              "0 means whoever is free. Line 1 is the brick's own person — while the brick is drawn as these lines, this box is the one that answers Who is at this brick, and the two can never say different numbers.")
            : null));
      }
      return el("div", { class: "field" },
        el("div", { class: "tl-ctl-lab" }, "Lines"),
        ...rows,
        el("div", { class: "hint" },
          "A line each, one under the other on the timeline, so the same number on two lines is one person covering both — and if those two lines really do need them in the same minute, that person's row in the People list goes red and names the minute. Give a line 0 and it is whoever is free."));
    };

    // Who is at this brick, for a brick drawn as one row. It asks the MODEL what
    // the person is rather than reading the stored field, because the two can
    // differ: lower how many of a brick she has and the second line's person goes
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
        el("label", {}, "Who is at this brick"),
        input,
        el("div", { class: "hint" },
          "0 means whoever is free. Put 1, 2, 3… and that named person is given this brick — so two bricks on person 1 that overlap show up as a collision to move apart."));
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

    return el("div", {},
      el("div", { class: "field" },
        el("label", { class: "check-row" }, toggle,
          el("span", { class: "check-label" }, "This brick is in the scenario")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "This is the Lego brick. Switch it off and the line answers without it, so you can see what a machine would buy you before you buy it. A brand new brick arrives switched off until its numbers are in.")),
      t("name", "What this brick is called", "Your words, so the timeline reads the way you would say it."),
      t("icon", "Its picture", "Any single emoji — it is what you will look for on the timeline."),
      jobField(live, on),
      f("cycleMin", "Minutes one pass holds it", "How long the dough is in the mixer, the pan is in the oven, or the dough sits between folds. For your fold that is the 28 minutes of rest, not the 30-minute gap.", { min: 1 }),
      f("batch", "Pans in one pass", "How many pans that one pass deals with.", { min: 1 }),
      f("touchMin", "Minutes of you, per pass", "0 means it runs itself — the honest reading of the retard and of the bake.", { min: 0 }),
      f("everyMin", "Minutes from one pass to the next", "The pace it repeats at. For your fold that is the 28 minutes of rest PLUS the 2-minute fold — so the brick restarts 30 minutes after the last time.", { min: 1 }),
      f("repeats", "How many times it runs in the day", "Set this above 1 and the brick restarts later in the day: the fold runs four times. The climb card raises this one for you — and a day can only hold so many, so a pass that takes hours is counted at the few that fit.", { min: 1, int: true, rebuild: true }),
      // Her point one: the brick that became the bottleneck, had twice over.
      f("count", "How many of these do you have", "Two mixers, two ovens, two chillers, two people folding. Two of them run two cycles side by side, so a cycle stops waiting for the one before it and the day's room doubles. It does NOT make pans you did not plan — raise how many times it runs to put the second one to work, or let the climb do it for you. And a brick you have two of is drawn as that many LINES, one under the other, each with its own person — the boxes for that appear below as soon as this says 2.", { min: 1, int: true, rebuild: true }),
      f("startMin", "Minutes in, when its first pass starts", `Counted from your day's start, so 90 is an hour and a half after you begin. Turn this one — or drag the bar on the timeline — to bring the people needed down. Cycle 1's time is this same number, so setting one sets the other.`, { min: 0, rebuild: true }),
      el("div", { class: "field" },
        el("label", { class: "check-row" }, followBox,
          el("span", { class: "check-label" }, "Waits for the brick above")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "Switch this on and its cycle 10 cannot start until the brick above has finished its own cycle 10 — which is how a real line behaves, and how a slow fold holds every later lot behind it. Switch it on for a brick the one before it really feeds, and leave it off for anything you place by hand. A brick that waits is not draggable on the timeline: move the brick above it and this one follows, and if the brick above has fewer cycles, the extra ones wait on its last.")),
      el("div", { class: "field" },
        el("label", { class: "check-row" }, overlapBox,
          el("span", { class: "check-label" }, "Let its cycles overlap")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "Switch this ON when the minutes in one pass are the DOUGH's time and not a machine's — dough resting between folds, a second bin on the go. The brick then stops holding its own cycles apart, every cycle sits where you put it, and two lots at once are drawn as two bars in their own lanes. Leave it OFF when the dough is physically IN the thing — a sink, an oven, one tub — because two lots cannot be in one of those at once; if you need two of those, that is How many of these do you have, which lets one lot in per brick you have. Either way, overlapping never lets a lot start before the dough exists: a brick that waits for the brick above still waits. And switch it on with one eye on the People rows — if two of your own cycles need the same person in the same minute, that person's row goes red and names the minute.")),
      linesBlock(),
      cycleField(live, sc, on, refresh),
      f("people", "People this pass needs", "Nearly always 1 — two people at one mixer is a different job.", { min: 1, int: true }),
      // A brick drawn as lines is asked who is on each LINE, above — one box per
      // line, line 1 being this same number. Two boxes for one question is the
      // dead-control trap, so the brick-level box steps aside while the lines are
      // in force and comes back when they are not.
      linesInForce(live) ? null : personField(),
      acts.length ? el("div", { class: "tl-ctl", style: "margin-top:4px" }, ...acts) : null,
      el("div", { class: "popup-actions" },
        isNew ? null : button("Delete this brick", () => confirmDialog(
          `Delete ${live.name}? The day will answer without it.`,
          () => {
            sc.modules = removeModule(sc.modules, live.id);
            on.persist();
            on.refresh();
            toast("Brick deleted");
            close();
          },
          { danger: true, yesLabel: "Delete" }), "danger"),
        button("Done", close, "primary")));
  });
}

// ── Every cycle, in its own right ──────────────────────────────────────────
//
// Her point two: a brick that runs eight times has eight start times, and any
// one of them can move without disturbing the other seven. Each cycle is a lot
// of dough, so this list IS the shape of the day — and typing a minute is the
// exact control a drag on a phone is not. Drag on the timeline for the broad
// move, type here for the nudge.
function cycleField(live, sc, on, refresh) {
  const m = moduleFacts(live);
  const dayStart = Number(sc.dayStartMin) || 0;
  const rows = [];

  for (let k = 0; k < m.repeatsHeld; k += 1) {
    const at = el("span", { class: "cyc-at" }, clockAt(dayStart, m.starts[k]));
    const input = el("input", {
      class: "input cyc-in", type: "number", inputmode: "numeric",
      min: "0", step: String(SNAP_MIN), value: String(Math.round(m.starts[k])),
    });
    input.addEventListener("input", () => {
      const n = Number(input.value);
      if (!Number.isFinite(n) || n < 0) return;
      const starts = cycleStarts(m);
      starts[k] = Math.round(n);
      live.starts = starts;
      // Cycle one's time is the brick's start time — written together here for
      // the same reason the model keeps them equal, so the two cannot drift.
      live.startMin = starts[0];
      on.persist();
      on.refresh();
      at.textContent = clockAt(dayStart, starts[k]);
    });
    rows.push(el("div", { class: "cyc-row" },
      el("span", { class: "cyc-lab" }, `Cycle ${k + 1}`),
      input,
      at));
  }

  const evenly = button("Space them evenly again", () => {
    // Dropping the stored list is what re-spaces them: with no list the brick
    // falls back to its own start and pace, which is exactly what this means.
    live.starts = undefined;
    on.persist();
    on.refresh();
    refresh();
    toast(`${live.name || "The brick"} — cycles back on their own pace`);
  });

  return el("div", { class: "field" },
    el("label", {}, "When each cycle starts, in minutes from your day"),
    m.repeatsHeld > 1
      ? el("div", { class: "cyc-list" }, ...rows)
      : rows[0] || null,
    el("div", { class: "hint" },
      m.repeatsHeld > 1
        ? "Each cycle is one lot of dough, and each has its own time — drag it on the timeline, or type it here. Moving one leaves the others where they are."
        : "This brick runs once, so it has a single start. Raise how many times it runs and a row appears for each cycle."),
    m.repeatsHeld > 1 ? el("div", { class: "popup-actions" }, evenly) : null);
}

// Which station of the line a brick is, so the Production line screen can read
// this brick's minutes and its batch straight off it. The answer is kept as a
// job of its own rather than matched on the brick's name, so she is free to call
// the wash whatever she calls it at the bench.
function jobField(live, on) {
  const now = jobOf(live);
  const box = select([
    { value: "", label: "Not a step on the Production line" },
    ...LINE_JOBS.map((j) => ({ value: j.key, label: j.label })),
  ], now, () => {
    live.job = box.value;
    on.persist();
    on.refresh();
  });
  box.className = "input";
  return el("div", { class: "field" },
    el("label", {}, "Which step of your line is this"),
    box,
    el("div", { class: "hint" },
      "The Production line screen asks the same day a different question — how many pans it can deliver, and which step is holding you back. Tell it which step this brick is and your own numbers cross over: this brick's minutes become that step's minutes, and its batch becomes that step's batch. Bricks that are not a step of the line — the fold, loading the chiller — are simply left out of the load, and the screen says so."));
}

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
        "A brick that is switched off cannot be the bottleneck, and adds nothing to the day. These are the bricks you have set aside — tap one to put it in."),
      ...r.parked.map((m) => el("div", { class: "info-row tappable", onclick: () => editModule(m, sc, on) },
        el("span", { class: "j-what" }, `${m.icon} ${m.name}`),
        el("span", { class: "info-val" }, m.needsYou ? "needs you" : "runs itself")))));
}

// ── Your scenarios ─────────────────────────────────────────────────────────
//
// Saving is what lets her keep two designs side by side — the line without a
// fridge and the line with one — and come back to either. A scenario is stored
// as a named copy of the bricks, so opening one cannot disturb the other.
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
        el("div", { class: "hint" }, "Renaming a saved scenario changes only its name — the bricks inside are left alone.")),
      el("div", { class: "popup-actions" },
        button("Delete this scenario", () => confirmDialog(
          `Delete the saved scenario "${s.name || "Untitled"}"? The bricks you are working on now are not affected.`,
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
