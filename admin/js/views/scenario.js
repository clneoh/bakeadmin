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
  PX_PER_MIN_CHOICES, LINE_JOBS, jobOf, scenarioSummary, moduleFacts,
} from "../scenario.js";

// A colour per brick, so a bar on the timeline and the person carrying it can be
// matched by eye. It cycles, so a brick added later still gets a colour.
const TONES = 8;

// What a dragged brick clicks to, and the shortest bar that still carries its
// minutes inside it.
const SNAP_MIN = 5;
const LAB_MIN_PX = 26;

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
      "Every brick as a bar, from the minute it starts, against the time of day along the top. A solid block is you standing at it; a pale one is it running without you. Drag a bar sideways to move when that brick starts — it clicks along in five-minute steps — or tap its row to type the numbers instead. Swipe the empty space to scroll."),
    el("div", { class: "card tl-card" },
      controlsRow(r, sc, on),
      timeline(r, sc, on),
      clashNotes(r)));
}

function controlsRow(r, sc, on) {
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
          // Her starting point: one person standing at every brick that needs
          // hands. The clashes that appear are exactly what she then slides the
          // bricks to remove — and it is the honest first answer, because a
          // separate person per brick really does cover the day.
          let n = 0;
          sc.modules = sc.modules.map((m) => {
            const needsHands = m.on !== false && Number(m.touchMin) > 0;
            if (!needsHands) return { ...m, person: 0 };
            n += 1;
            return { ...m, person: n };
          });
          // Every brick has just been given its own person, so any combination
          // label from before is describing a day that no longer exists.
          sc.merges = {};
          on.persist();
          toast(`${n} ${n === 1 ? "person" : "people"}, one to a brick — now drag the bricks closer together`);
          on.refresh();
        },
      }, "One a brick"),
      el("button", {
        type: "button", class: "tl-chip",
        onclick: () => {
          sc.modules = sc.modules.map((m) => ({ ...m, person: 0 }));
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
  return el("div", { class: "tl", style: `--hour-w:${Math.round(60 * r.pxPerMin)}px` },
    el("div", { class: "tl-inner" },
      rulerRow(r, trackW),
      ...r.modules.map((m, i) => moduleRow(r, m, i, trackW, sc, on)),
      // The people are the answer to her question, so they are drawn as what
      // they are: a row each, carrying the bricks that row attends — and under
      // them the whole lot stacked, which is the manpower at each minute.
      el("div", { class: "tl-split" }, "People"),
      ...r.rows.map((row) => personRow(r, row, trackW, sc)),
      totalRow(r, trackW)));
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
function passBars(m, tone, r, shift = 0, onlyK = -1) {
  const bars = [];
  m.passes.forEach((p, k) => {
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
    bars.push(el("div", {
      class: `tl-bar ${tone}${m.follow ? " locked" : ""}`,
      // Which cycle this is, so a drag knows what it is moving. The count, not
      // the whole brick, is what she drags.
      "data-k": String(k),
      style: `left:${left}px;width:${w}px`,
      // What the bar holds, in her terms: how many minutes the dough is in it.
      title: `${m.name}, cycle ${k + 1}: ${trim(m.cycleMin)} min` +
        (touchW ? `, ${trim(m.touchMin)} min of you` : ", no hands"),
    },
      touchW ? el("div", { class: "tl-touch", style: `width:${touchW}px` }) : null,
      // Only the first pass of a row carries the number, so a fold loop does
      // not repeat "28" four times across the day.
      k === 0 && w >= LAB_MIN_PX ? el("span", { class: "tl-lab" }, String(Math.round(m.cycleMin))) : null));
  });
  return bars;
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
  let drag = null;
  let swallow = false;

  const track = el("div", { class: "tl-track", style: `width:${trackW}px` });
  track.replaceChildren(...passBars(m, tone, r));

  // The start-time line is held onto, because a drag rewrites it as the finger
  // moves — the brick should read its new time while it is still being placed.
  const above = chainAbove(r, m);
  const whenLine = el("div", { class: "tl-sub" });
  whenLine.textContent = timeLine(m, r.dayStartMin) + (above ? ` · waits on ${above.name}` : "");

  const row = el("div", { class: "tl-row" },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" },
        `${m.icon} ${m.name}`,
        // How many of this brick she has. Two mixers, two chillers, two people
        // folding: named on the row, because everything downstream of it — the
        // day's room, the hands — follows from this one number.
        m.count > 1 ? el("span", { class: "badge badge-multi" }, `${m.count} of them`) : null,
        above ? el("span", { class: "badge badge-past" }, "waits above") : null,
        m.needsYou ? null : el("span", { class: "badge badge-past" }, "itself"),
        // She has asked for more passes than a day holds. The number is kept as
        // she typed it — the row just counts honestly and says why.
        m.capped ? el("span", { class: "badge badge-over" }, "a day's limit") : null),
      whenLine,
      el("div", { class: "tl-sub" }, costLine(m))),
    track);

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
    track.replaceChildren(...passBars(m, tone, r, delta, drag.k));
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
      toast(`${m.name}, cycle ${d.k + 1} → ${clockAt(r.dayStartMin, starts[d.k])}`);
    }
    on.refresh();
  };
  track.addEventListener("pointerup", drop);
  track.addEventListener("pointercancel", drop);

  return row;
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
    title: `${w.name}: ${clockAt(r.dayStartMin, w.from)} → ${clockAt(r.dayStartMin, w.to)}`,
  }));

  return el("div", { class: "tl-row person" },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" }, `👤 ${personLabel(row, sc)}`),
      el("div", { class: "tl-sub" }, `${hoursAndMinutes(row.busy)} of work`),
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
function mergeMembers(person, sc) {
  const listed = ((sc && sc.merges) || {})[String(person)] || [];
  return listed.filter((who) => !(sc.modules || []).some((m) => Number(m.person) === who));
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
  const merges = { ...(sc.merges || {}) };
  const fromMembers = merges[String(from.person)] || [];
  const members = [...new Set([...(merges[String(into)] || []), from.person, ...fromMembers])]
    .filter((w) => w !== into).sort((a, b) => a - b);

  sc.modules = sc.modules.map((m) => (Number(m.person) === from.person ? { ...m, person: into } : m));
  delete merges[String(from.person)];
  merges[String(into)] = members;
  sc.merges = merges;
  on.persist();
  on.refresh();
  toast(`Person ${into}+${members.join("+")} — the collisions are what they cannot cover`);
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
function clashNotes(r) {
  const notes = [];
  for (const row of r.rows) {
    const who = personLabel(row, r.scenario);
    for (const c of row.clashes) {
      if (notes.length >= 4) break;
      notes.push(`${who} is at ${c.before ? c.before.name : "—"} and ${c.after.name} at the same time, ${clockAt(r.dayStartMin, c.from)} → ${clockAt(r.dayStartMin, c.to)}. Move one of them, or combine with another person and accept the collision.`);
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
      refresh();
    };

    const f = (key, label, hint, opt = {}) => {
      const input = el("input", {
        class: "input", type: "number", inputmode: "decimal",
        min: String(opt.min == null ? 0 : opt.min), step: String(opt.step || 1),
        value: String(live[key] == null ? 0 : live[key]),
      });
      input.addEventListener("input", () => set(key, input.value, opt));
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
      jobField(live, on, refresh),
      f("cycleMin", "Minutes one pass holds it", "How long the dough is in the mixer, the pan is in the oven, or the dough sits between folds. For your fold that is the 28 minutes of rest, not the 30-minute gap.", { min: 1 }),
      f("batch", "Pans in one pass", "How many pans that one pass deals with.", { min: 1 }),
      f("touchMin", "Minutes of you, per pass", "0 means it runs itself — the honest reading of the retard and of the bake.", { min: 0 }),
      f("everyMin", "Minutes from one pass to the next", "The pace it repeats at. For your fold that is the 28 minutes of rest PLUS the 2-minute fold — so the brick restarts 30 minutes after the last time.", { min: 1 }),
      f("repeats", "How many times it runs in the day", "Set this above 1 and the brick restarts later in the day: the fold runs four times. The climb card raises this one for you — and a day can only hold so many, so a pass that takes hours is counted at the few that fit.", { min: 1, int: true }),
      // Her point one: the brick that became the bottleneck, had twice over.
      f("count", "How many of these do you have", "Two mixers, two ovens, two chillers, two people folding. Two of them run two cycles side by side, so a cycle stops waiting for the one before it and the day's room doubles. It does NOT make pans you did not plan — raise how many times it runs to put the second one to work, or let the climb do it for you. And if the job is done by hand, two of them means a second pair of hands while both are running.", { min: 1, int: true }),
      f("startMin", "Minutes in, when its first pass starts", `Counted from your day's start, so 90 is an hour and a half after you begin. Turn this one — or drag the bar on the timeline — to bring the people needed down. Cycle 1's time is this same number, so setting one sets the other.`, { min: 0 }),
      el("div", { class: "field" },
        el("label", { class: "check-row" }, followBox,
          el("span", { class: "check-label" }, "Waits for the brick above")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "Switch this on and its cycle 10 cannot start until the brick above has finished its own cycle 10 — which is how a real line behaves, and how a slow fold holds every later lot behind it. Switch it on for a brick the one before it really feeds, and leave it off for anything you place by hand. A brick that waits is not draggable on the timeline: move the brick above it and this one follows, and if the brick above has fewer cycles, the extra ones wait on its last.")),
      cycleField(live, sc, on, refresh),
      f("people", "People this pass needs", "Nearly always 1 — two people at one mixer is a different job.", { min: 1, int: true }),
      f("person", "Who is at this brick", "0 means whoever is free. Put 1, 2, 3… and that named person is given this brick — so two bricks on person 1 that overlap show up as a collision to move apart.", { min: 0, int: true }),
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
function jobField(live, on, refresh) {
  const now = jobOf(live);
  const box = select([
    { value: "", label: "Not a step on the Production line" },
    ...LINE_JOBS.map((j) => ({ value: j.key, label: j.label })),
  ], now, () => {
    live.job = box.value;
    on.persist();
    on.refresh();
    refresh();
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
