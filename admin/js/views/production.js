// views/production.js — the production line (19 Sep 2026).
//
// She asked for the flow visualised, the bottleneck highlighted, and something
// to balance the line so her manpower is used well. All the arithmetic is in
// js/production.js — this screen only draws it, so the two can never disagree.
//
// It is a planner she types into: nothing here reads an order, and nothing here
// blocks a sale. Change a number and the whole screen answers again at once.

import { el, button, showPopup, toast } from "../ui.js";
import { save } from "../state.js";
import { computeLine, foldsIn, proofCycleOf, trim } from "../production.js";
import { planBackwards } from "../bakeday.js";
import { clockOf, scenarioPlanPatch, scenarioSummary } from "../scenario.js";

// The numbers she types, in the order she'd say them, and now in the order her
// day runs them. Everything is seeded from the bake day she corrected on 22 Sep
// 2026, so the screen says something true the first time it opens and she only
// has to correct what has changed.
//
// Every label names its own unit, and says what it is measured over: a field
// that says "Minutes" and leaves her to guess whether that means for one pan,
// for six, or for a whole tub is a field she cannot fill in with confidence.
const GROUPS = [
  {
    title: "Your hands",
    sub: "How many of you are baking, and for how long.",
    fields: [
      { key: "people", label: "Pairs of hands on a bake day", step: 1,
        hint: "Count one pair each — you, and anyone helping." },
      { key: "hours", label: "Hours you'll bake for", step: 0.5,
        hint: "How long you're willing to stand at it on a delivery day." },
      { key: "target", label: "Pans you want on a delivery day", step: 1 },
    ],
  },
  {
    title: "What you have",
    sub: "The pans and the proofer — the things you'd buy more of.",
    fields: [
      { key: "pans", label: "Baking pans you own", step: 1 },
      { key: "prooferPans", label: "Pans your proofer holds at once", step: 1,
        hint: "The ceiling on your day, and it is the one you worked out yourself: a batch is in the cabinet for 81 minutes, so 12 pans means one batch every 40.5 minutes and no faster. Count the shelves honestly — if it holds 18, type 18 and everything below changes." },
    ],
  },
  {
    title: "The oven and the mixer",
    sub: "What the machines can take at once.",
    fields: [
      { key: "ovenPans", label: "Pans per bake", step: 1 },
      { key: "ovenMin", label: "Minutes one oven turn takes, bake and swap together", step: 1,
        hint: "One turn of the oven is the baking and the swapping that goes with it. You timed the bake at 13 minutes and the swap at 2, so this is 15." },
      { key: "mixerPans", label: "Pans one tub of dough makes", step: 1,
        hint: "Your cycle is one tub of dough into the pans of one oven load — so six. Your mixer's bowl is bigger than that; this is how much dough you actually mix at once, which is what spreads the mixing and the folding over the batch." },
    ],
  },
  {
    title: "Your bake day, step by step",
    sub: "The minutes you measured, in the order the day runs them. The clock below is worked back from these, so a number you change here moves every start time with it.",
    fields: [
      { key: "mixMin", label: "Minutes to mix one tub of dough", step: 1,
        hint: "For one whole tub — the pans that tub makes at once. It is spread over that whole batch, so a bigger tub costs less work for every pan." },
      { key: "foldRests", label: "How many rests the dough takes", step: 1,
        hint: "How many times the dough sits before it goes into the pans — four, in your day." },
      { key: "foldRestMin", label: "Minutes each rest lasts", step: 1,
        hint: "Thirty minutes a rest for you." },
      { key: "foldMin", label: "Minutes one stretch and fold takes", step: 1,
        hint: "One minute for you. The last rest is a rest and nothing else, so a day with four rests carries three folds." },
      { key: "scaleMin6", label: "Minutes to oil the pans and weigh the dough out, for 6 pans", step: 1,
        hint: "Fifteen for you. Oiling the pans, weighing the dough out into them and filling them is one job under one name — which is why your own count of the hand-work has it once, not twice." },
      { key: "proofMin1", label: "Minutes in the proofer before the dimple", step: 1,
        hint: "Forty-five for you." },
      { key: "topMin6", label: "Minutes to dimple and top 6 pans", step: 1,
        hint: "You dimple a pan a minute, so six for six pans. If you also top them with oil and herbs, time that turn once and type the bigger number." },
      { key: "proofMin2", label: "Minutes in the proofer after the dimple", step: 1,
        hint: "Thirty for you. This is the second half of the 81 the cabinet holds a batch for." },
      { key: "coolWaitMin", label: "Minutes the baked pans cool before they are cut", step: 1,
        hint: "Thirty for you. This is waiting time, not hand-work — it sits after the 254 minutes, not inside them." },
    ],
  },
  {
    title: "The clock you plan from",
    sub: "Worked backwards from the oven, so no dough is ever mixed before it is needed.",
    fields: [
      { key: "readyAtMin", label: "Minutes after midnight the first 6 pans must be at the oven", step: 15,
        clock: true,
        hint: "480 is 8:00 am. Set the clock you want the first batch standing at the oven, and every start time below is worked back from it — which is how the dough is kept from being mixed too early." },
      { key: "rhythmMin", label: "Minutes between batches you would like", step: 1,
        hint: "Fifteen for you — the length of one oven turn, so a fresh batch is ready each time the oven comes free. The screen will tell you honestly whether the line can give you that." },
      { key: "tolMin", label: "Minutes earlier than a start time that are still fine", step: 1,
        hint: "Five for you. This is the soft band around each start — a step may begin this much early without the dough suffering, which is where you can shuffle work to suit your own hands." },
    ],
  },
  {
    // Named from what she has actually typed rather than from being empty: she
    // has timed this one, and a heading still reading "Still to time" over her
    // own twelve minutes reads as the screen not having noticed her number.
    title: (p) => (Number(p.coolMin6) > 0 ? "After the bake" : "Still to time"),
    sub: (p) => (Number(p.coolMin6) > 0
      ? "Your time at the table once the pans are out — counted in the day's hand-work, and it sits after the 254 minutes rather than inside them."
      : "Left blank until you have timed it — a blank step is named below rather than counted as free."),
    fields: [
      { key: "coolMin6", label: "Minutes to cut and pack 6 pans", step: 1, optional: true,
        hint: "Your time at the table after the bake, not the cooling. Left blank, the screen names the step as untimed rather than counting it as free." },
    ],
  },
];

export function renderProduction(root, state) {
  const plan = state.settings.production || (state.settings.production = {});
  const readout = el("div", {});
  let dead = false;

  // Only the answers are repainted as she types — never the inputs — so the
  // field she is in keeps its place and its cursor.
  const refresh = () => {
    if (dead) return;
    readout.replaceChildren(...blocks(state, plan));
  };

  const onEdit = (key, raw, optional) => {
    const n = Number(raw);
    // A cleared field is mid-typing, not a request for zero pans: hold the last
    // good number rather than storing a 0 the whole screen would have to explain.
    // The steps she has yet to time are the exception — for those, blank and 0
    // both mean "not measured", which is a real answer the screen reports on.
    if (optional && (raw === "" || n === 0)) {
      plan[key] = 0;
      save(state);
    } else if (Number.isFinite(n) && n > 0) {
      plan[key] = n;
      save(state);
    }
    refresh();
  };

  // The inputs are drawn once and then left alone while she types, so the field
  // she is in keeps its place and its cursor. A load from a scenario rewrites the
  // numbers themselves, which is the one thing that does need them redrawn.
  const fields = el("div", {});
  const drawFields = () => {
    if (dead) return;
    fields.replaceChildren(
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "These are the numbers you measured. Change any of them and everything below answers again — nothing here is saved anywhere but your own phones."),
      ...GROUPS.map((g) => groupCard(g, plan, onEdit)));
  };

  const board = el("div", {},
    loadCard(state, plan, () => { drawFields(); refresh(); }),
    fields);

  drawFields();
  refresh();
  root.replaceChildren(board, readout);
  return () => { dead = true; };
}

function groupCard(group, plan, onEdit) {
  // A heading may be given as a plain string or worked out from the numbers, so
  // a card can stop calling a step untimed the moment she has timed it. The two
  // nodes are kept and their words rewritten in place — never rebuilt — because
  // the box she is typing in has to stay alive (v142), and because a heading left
  // saying "Still to time" over a number she has just cleared is the same lie
  // the other way round.
  const said = (v) => (typeof v === "function" ? v(plan) : v);
  const title = el("p", { class: "card-title" }, said(group.title));
  const sub = el("p", { class: "card-sub", style: "margin:0 0 10px" }, said(group.sub));
  const again = (key, raw, optional) => {
    onEdit(key, raw, optional);
    title.textContent = said(group.title);
    sub.textContent = said(group.sub);
  };
  return el("div", { class: "card" }, title, sub,
    ...group.fields.map((f) => fieldRow(f, plan, again)));
}

function fieldRow(f, plan, onEdit) {
  const input = el("input", {
    class: "input", type: "number", inputmode: "decimal",
    min: f.optional ? "0" : "1", step: String(f.step || 1),
    // An untimed step stores a real 0, which is the same thing as blank on screen.
    value: plan[f.key] == null || (f.optional && plan[f.key] === 0)
      ? "" : String(plan[f.key]),
  });
  // One field is a time of day, and asking her to work out that 480 means 8:00 am
  // every time she wants to move it would be the screen making its own arithmetic
  // her problem. The clock is written back underneath as she types — the field
  // itself is never rebuilt, so her cursor and her keypad stay where they are.
  let clock = null;
  if (f.clock) {
    clock = el("div", { class: "li-sub" }, clockReadout(input.value));
  }
  input.addEventListener("input", () => {
    if (clock) clock.textContent = clockReadout(input.value);
    onEdit(f.key, input.value, f.optional);
  });
  return el("div", { class: "field" },
    el("label", {}, f.label),
    input,
    clock,
    f.hint ? el("div", { class: "hint" }, f.hint) : null);
}

function clockReadout(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? `That is ${clockOf(n)}.` : "";
}

// ── Starting from a scenario ───────────────────────────────────────────────
// The two screens ask different questions about the same day, and she asked for
// the one to feed the other: lay the day out in modules, then ask the line what
// that day can really deliver.
//
// What crosses over is what she typed into the modules — their minutes and their
// batches — and never a figure either screen invented. Nothing is written until
// she has seen the list, and the numbers it does not touch are named rather than
// quietly left to look as though they had been updated.
function loadCard(state, plan, onLoad) {
  const list = Array.isArray(state.settings.scenarios) ? state.settings.scenarios : [];
  const kids = [
    el("p", { class: "card-title" }, "Start from a scenario"),
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Built a day out of modules under More → Scenario planner? Load it here and this screen answers the same day the other way round — how fast it can go, and which step is holding it back. You will see every number it would change before anything moves."),
  ];

  if (!list.length) {
    kids.push(el("p", { class: "card-sub", style: "margin:0" },
      "You have not saved a scenario yet. Build one there, save it under a name, and it will appear here."));
  } else {
    kids.push(el("div", {}, ...list.map((s) => el("div", {
      class: "info-row tappable",
      onclick: () => previewLoad(s, plan, state, onLoad),
    },
      el("span", { class: "j-what" }, s.name || "Untitled"),
      el("span", { class: "info-val" }, scenarioSummary(s))))));
  }

  return el("div", { class: "card" }, ...kids);
}

// What the load would do, line by line, before it does any of it. These are her
// own measured numbers, so replacing one without showing her first would be the
// same sin as a rule that quietly hides a sale.
function previewLoad(s, plan, state, onLoad) {
  const p = scenarioPlanPatch(s, plan);

  showPopup(`Load “${s.name || "Untitled"}”`, (refresh, close) => {
    const kids = [
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        scenarioSummary(s),
        p.people > 0
          ? ` there — and the modules need ${p.people} ${p.people === 1 ? "pair" : "pairs"} of hands at once.`
          : " there."),
    ];

    if (p.lines.length) {
      kids.push(el("div", {}, ...p.lines.map(loadLine)));
    } else {
      kids.push(el("p", { class: "card-sub", style: "margin:0" },
        "This scenario has no module that is a step on this screen, so there is nothing here to load from it."));
    }

    // The steps of the line this scenario simply does not cover.
    if (p.left.length) {
      kids.push(el("p", { class: "card-sub", style: "margin:10px 0 0" },
        `Nothing in this scenario feeds ${upper(listWords(p.left.map(lower)))} — ${p.left.length === 1 ? "it stays" : "they stay"} exactly as you typed ${p.left.length === 1 ? "it" : "them"}.`));
    }
    // Modules that are real work but not a step of the line.
    if (p.unmapped.length) {
      kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `${listWords(p.unmapped.map(upper))} ${p.unmapped.length === 1 ? "is not a step" : "are not steps"} on this screen, so nothing here comes from ${p.unmapped.length === 1 ? "it" : "them"}.`));
    }
    if (p.doubled.length) {
      kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `Two of your modules are both ${listWords(p.doubled.map(lower))} — the load takes the first one in your list.`));
    }
    if (p.pans > 0) {
      kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `For your own reference: as built, those modules turn out ${p.pans} ${p.pans === 1 ? "pan" : "pans"} a day. This screen counts the day its own way, from your hands, your proofer and your oven.`));
    }
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
      "How many pans you own and how many hours you will bake for are not in a scenario — those two stay as they are."));

    // The count is the numbers that would actually MOVE. Every line above can
    // read "no change" when she has already loaded this scenario, and a button
    // promising eleven changes then would be the screen telling her a small lie.
    const moves = p.lines.filter((l) => l.changes).length;
    kids.push(el("div", { class: "popup-actions" },
      button("Leave my numbers alone", close, "ghost"),
      button(moves === 0
        ? "Load it — nothing here changes"
        : `Load ${moves} ${moves === 1 ? "number" : "numbers"}`,
        () => {
          Object.assign(plan, p.patch);
          save(state);
          close();
          onLoad();
          toast(`Loaded “${s.name || "Untitled"}” — the screen is answering for that day now`);
        }, "primary")));

    return el("div", {}, ...kids);
  });
}

// One number it would take, in the terms the field itself names.
function loadLine(l) {
  const unit = l.unit ? ` ${l.unit}` : "";
  const now = l.changes
    ? (l.from > 0 ? `${trim(l.from)} → ${trim(l.to)}${unit}` : `blank → ${trim(l.to)}${unit}`)
    : `${trim(l.to)}${unit} — no change`;
  return el("div", { class: "info-row" },
    el("span", { class: "j-what" }, l.label),
    el("span", { class: "info-val" }, now));
}

function blocks(state, plan) {
  const r = computeLine(plan);
  return [
    flowCard(r),
    backwardsCard(plan),
    lineCard(r),
    dayCard(r, state),
    handsCard(r),
    leverCard(r),
  ];
}

// ── The flow ───────────────────────────────────────────────────────────────
// The bars answer "how fast is each part"; this answers the question they cannot
// — what happens in what order, and where the day stops. Same numbers, laid out
// in the order her day actually runs: the dough is mixed, it rests and is folded,
// the pans are oiled and filled, then in and out of the proofer with the dimple
// between, then the oven, then the cooling.
//
// The proofer appears twice, and it is the same machine both times. They are two
// steps because the dimple sits between them, and that is the whole reason the
// cabinet holds a batch for 81 minutes rather than 75 — she dimples one pan at a
// time, so the cabinet is never emptied.
//
// Hand-work is shown as minutes a pan and never given a rate of its own, because
// the hand jobs are one shared pool and no single one of them has a pace. Only
// the three things that are not her — the proofer, the oven, the pans going round
// — can honestly be given pans an hour.
//
// Every hand step takes its name from the model's own job list, so a job can
// never be called one thing here and another thing underneath. The proofer steps
// are not hand jobs at all, so they name themselves.
const FLOW = [
  { job: "mix" },
  { job: "fold" },
  { job: "scale" },
  { station: "proofer", phase: 1, name: "Into the proofer", icon: "🌡️" },
  { job: "top" },
  { station: "proofer", phase: 2, name: "Proofer again", icon: "🌡️" },
  { job: "swap", station: "oven", name: "The oven swap and bake", icon: "🔥" },
  { job: "cool" },
  { outcome: true, name: "The day", icon: "✅" },
];

const FLOW_ICON = { mix: "🥣", fold: "🫲", swap: "🔥" };

function flowCard(r) {
  const walls = wallSteps(r);
  const first = walls.length ? walls[0] : -1;
  const why = walls.length ? bottleneckWhy(r) : "";

  return el("div", {},
    el("h2", { class: "section" }, "The flow"),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      walls.length > 1
        ? "Your bake day in the order it happens, top to bottom. The steps that set your pace are the red ones."
        : "Your bake day in the order it happens, top to bottom. The step that sets your pace is the red one."),
    el("div", { class: "card flow" },
      // The explanation is written once, under the first red step. Repeating it
      // under the second proofer step would be the same paragraph twice on one
      // screen, which reads as a fault rather than as emphasis.
      ...FLOW.map((s, i) => flowStep(s, r, i, walls.includes(i), i === first ? why : ""))));
}

function flowStep(s, r, i, isWall, why) {
  const j = s.job ? r.allocation.find((x) => x.key === s.job) : null;
  const icon = s.icon || FLOW_ICON[s.job] || "👋";
  const name = s.name || (j ? j.name : "");
  return el("div", { class: `flow-step${isWall ? " wall" : ""}${s.outcome ? " outcome" : ""}` },
    el("div", { class: "flow-rail" },
      el("span", { class: "flow-num" }, s.outcome ? "✓" : String(i + 1))),
    el("div", { class: "flow-body" },
      el("div", { class: "flow-head" },
        el("span", { class: "flow-icon" }, icon),
        el("span", { class: "flow-name" }, name),
        isWall ? el("span", { class: "badge badge-over" }, "the slow one") : null),
      el("div", { class: "li-sub" }, stepSub(s, r, j)),
      // Why *this* step is the wall, in the one comparison that makes it obvious
      // — the same sentence the day card uses, so the two cannot disagree.
      isWall && why ? el("div", { class: "li-sub flow-why" }, why) : null));
}

function stepSub(s, r, j) {
  const p = r.plan;

  if (s.outcome) {
    return `${r.dayCapacity} ${r.dayCapacity === 1 ? "pan" : "pans"} off the line in ${trim(r.hours)} ${r.hours === 1 ? "hour" : "hours"}` +
      (r.target > 0 ? `, and you want ${r.target}.` : ".");
  }

  // The same cabinet, twice on the list. The first half names what it is holding;
  // the second names the pace, because that is the slot the next batch leaves
  // through and the one the oven is waiting on.
  if (s.station === "proofer") {
    const mins = s.phase === 2 ? p.proofMin2 : p.proofMin1;
    if (s.phase === 2) {
      const rate = stationRate(r, "proofer");
      const every = rate > 0 && Number.isFinite(rate) ? `6 pans come out every ${trim(360 / rate)} min` : "";
      return [`${trim(mins)} min in the cabinet`, every].filter(Boolean).join(" · ");
    }
    return `${trim(mins)} min in the cabinet · the cabinet holds ${trim(p.prooferPans)} ${p.prooferPans === 1 ? "pan" : "pans"} at once`;
  }

  if (s.station === "oven") {
    const bits = [];
    if (j && j.perPan > 0) bits.push(`${trim(j.perPan)} min a pan to swap`);
    bits.push(`${trim(p.ovenPans)} pans every ${trim(p.ovenMin)} min, bake and swap together`);
    const rate = stationRate(r, "oven");
    if (Number.isFinite(rate) && rate > 0) bits.push(`${trim(rate)} pans an hour`);
    return `${bits.join(" · ")}.`;
  }

  if (s.job === "mix") {
    return p.mixMin > 0 && p.mixerPans > 0
      ? `${trim(p.mixMin)} min a mix · one mix is ${trim(p.mixerPans)} pans of dough`
      : "not timed yet";
  }

  // The one step whose wait is nothing like its hand-work: the dough rests for
  // half an hour at a time and she is only on it for a minute of that. Showing
  // its "minutes a pan" here would hide the wait that the clock below is built
  // out of, so it shows both.
  if (s.job === "fold") {
    const folds = foldsIn(p);
    const resting = p.foldRests * p.foldRestMin + folds * p.foldMin;
    if (resting <= 0) return "not timed yet";
    return `${trim(resting)} min of resting in ${trim(p.foldRests)} rests` +
      (folds > 0 ? ` · ${trim(folds)} stretch and folds at ${trim(p.foldMin)} min each` : " · no fold, the dough only rests");
  }

  return j && j.perPan > 0 ? `${trim(j.perPan)} min a pan` : "not timed yet";
}

function stationRate(r, key) {
  const s = r.stations.find((x) => x.key === key);
  return s ? s.rate : Infinity;
}

// ── Your day, backwards ────────────────────────────────────────────────────
// The one thing the rest of this screen cannot answer. The flow above settles
// what happens in what order; this settles when each step has to START, and it
// is worked back from the oven because that is the only direction a start time
// can be told the truth from.
//
// Mixed too early and the dough over-ferments — her own sentence, and the whole
// reason this card exists. So every step gets a latest start and a soft band of
// minutes before it that are still fine, which is where she can shuffle work to
// suit her own hands.
//
// It gates nothing and it changes nothing. Every time here is advice; the dough
// is judged by eye, and the card says so on the screen rather than leaving her to
// remember it.
function backwardsCard(plan) {
  const b = planBackwards(plan);
  const worst = b.limits.length ? b.limits[0] : null;

  const kids = [
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      `Every time below is the last moment that step may start, so no dough is ever mixed before it is needed. It is a timetable, not a clock — you watch the dough and judge it by eye, and any step may start up to ${trim(b.plan.tolMin)} ${b.plan.tolMin === 1 ? "minute" : "minutes"} early to suit your hands.`),
  ];

  // The anchor, then the answer that falls out of it. This is the sentence she
  // asked the release for: a time to put the dough in the tub.
  kids.push(el("p", { style: "margin:0 0 10px" },
    `For the first ${trim(b.batchPans)} pans to be standing at the oven at `,
    el("b", {}, b.readyClock),
    `, the dough goes into the tub at `,
    el("b", {}, b.mixClock),
    ` — ${trim(b.readyAtMin - b.mixStartMin)} minutes before.`));

  kids.push(el("div", { class: "job-list" }, ...b.steps.map(backwardsStep)));

  kids.push(el("p", { class: "card-sub", style: "margin:10px 0 0" },
    `One batch is ${trim(b.spanMin)} minutes from the tub to out of the oven, and ${trim(b.handWork)} of those minutes are your hands.`));

  // The three limits, each with its own unit, and the one that decides the day.
  if (worst) {
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
      "Minutes a batch, at their own pace: ",
      `${listWords(b.limits.map((l) => `${lower(l.label)} ${trim(l.perBatch)} min`))}. `,
      `The longest sets the day, and that is ${lower(worst.label)}.`));
  }

  // What she asked the rhythm to be against what the line will actually give —
  // the honest answer, because a timetable that pretended otherwise would have
  // her starting tubs the oven cannot take.
  kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
    b.rhythm.beats
      ? `You wanted a batch every ${trim(b.rhythm.asked)} min, and the line can keep to that.`
      : `You wanted a batch every ${trim(b.rhythm.asked)} min. The line gives you one every ${trim(b.rhythm.allowed)} min, and not faster.`));

  if (b.batches > 1) {
    const last = b.batchPlan[b.batchPlan.length - 1];
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
      `A ${trim(b.plan.target)}-pan day is ${b.batches} batches, so the last tub goes in at ${last.mixClock} and that batch is at the oven at ${last.readyClock}.`));
  }

  if (b.notes.tubs > 0) {
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
      `That holds ${b.notes.tubs} ${b.notes.tubs === 1 ? "tub" : "tubs"} at once — a tub is busy from the mixing until the last fold is done.`));
  }

  // A step with no minutes on it is not part of the 254, and saying so here is
  // the difference between a timetable and a promise.
  if (b.untimed.length) {
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
      `${listWords(b.untimed.map(lower))} ${b.untimed.length === 1 ? "is" : "are"} not timed yet, so ${b.untimed.length === 1 ? "it is" : "they are"} not counted in those ${trim(b.spanMin)} minutes.`));
  }

  return el("div", {},
    el("h2", { class: "section" }, "Your day, backwards"),
    el("div", { class: "card" }, ...kids));
}

// One step of the clock: its latest start on the right, and underneath the
// minutes it takes, how many of them are her hands, and how early it may begin.
function backwardsStep(s) {
  const bits = [`${trim(s.minutes)} min`];
  if (s.hands > 0) bits.push(`${trim(s.hands)} min of your hands`);
  else if (s.machine) bits.push("no hands — the machine works");
  if (s.beyond) bits.push("after the bake, outside the 254 minutes");
  if (s.window && s.window.early !== s.window.late) bits.push(`earliest ${s.earlyClock}`);

  return el("div", {},
    el("div", { class: "info-row journal-line" },
      el("span", { class: "j-what" }, s.label),
      el("span", { class: "info-val" }, s.clock)),
    el("div", { class: "li-sub", style: "margin:-2px 0 6px" }, bits.join(" · ")));
}

// Which step on the chain is the one holding the day back, as a LIST of indices
// — a list rather than one index because the proofer is drawn twice, and a wall
// that marked only one of its two steps would read as a mistake.
//
// Three of the four walls name themselves. The hands do not, because every hand
// step draws on the same pool, so the mark goes on the heaviest of them rather
// than pretending one step owns a pace the pool actually sets.
function wallSteps(r) {
  const b = r.bottleneck.key;
  const all = (test) => FLOW.map((s, i) => (test(s) ? i : -1)).filter((i) => i >= 0);

  if (b === "proofer") return all((s) => s.station === "proofer");
  if (b === "oven") return all((s) => s.station === "oven");
  if (b === "pans") return all((s) => s.job === "scale");
  if (b === "hands") {
    let best = -1;
    let heaviest = 0;
    FLOW.forEach((s, i) => {
      if (!s.job) return;
      const j = r.allocation.find((x) => x.key === s.job);
      if (j && j.perPan > heaviest) {
        heaviest = j.perPan;
        best = i;
      }
    });
    return best >= 0 ? [best] : [];
  }
  return [];
}

// ── The line ───────────────────────────────────────────────────────────────
// One row per thing that can hold her back, each a bar of its own pace against
// the fastest of them. The shortest bar is the one that sets the day, and it is
// the only red thing on the screen so her eye lands on it.
//
// The bar is drawn with the app's own .meter classes rather than fillMeter(),
// whose label is always "total/capacity" — here the number worth reading is the
// station's own pace, in pans an hour.
function lineCard(r) {
  const rates = r.stations.map((s) => s.rate).filter((x) => Number.isFinite(x) && x > 0);
  const top = rates.length ? Math.max(...rates) : 0;
  return el("div", {},
    el("h2", { class: "section" }, "The line"),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "Each bar is how many pans an hour that part can manage. The shortest one sets your pace."),
    el("div", { class: "card", style: "padding:4px 14px" },
      ...r.stations.map((s) => stationRow(s, top, s.key === r.bottleneck.key))));
}

function stationRow(s, top, isShort) {
  const live = Number.isFinite(s.rate) && s.rate > 0;
  const pct = top > 0 && live ? Math.min(100, Math.max(4, (s.rate / top) * 100)) : 4;
  return el("div", { class: `station${isShort ? " short" : ""}` },
    el("div", { class: "station-head" },
      el("span", { class: "station-name" }, `${s.icon} ${s.name}`),
      isShort ? el("span", { class: "badge badge-over" }, "the slow one") : null),
    el("div", { class: "li-sub" }, s.sub),
    el("div", { class: `meter${isShort ? " short" : ""}` },
      el("div", { class: `meter-fill${isShort ? " short" : ""}`, style: `width:${pct}%` }),
      el("span", { class: "meter-label" },
        live ? `${trim(s.rate)} pans an hour` : "no limit set")));
}

// ── The day ────────────────────────────────────────────────────────────────
function dayCard(r, state) {
  const days = Array.isArray(state.settings.deliveryDays) ? state.settings.deliveryDays.length : 0;
  const kids = [
    el("p", { style: "margin:0 0 6px" },
      `In ${trim(r.hours)} ${r.hours === 1 ? "hour" : "hours"} this line makes `,
      el("b", {}, `${r.dayCapacity} ${r.dayCapacity === 1 ? "pan" : "pans"}`),
      r.target > 0 ? `, and you want ${r.target}.` : "."),
  ];

  if (r.target > 0 && r.shortfall > 0) {
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 6px" },
      `That is ${r.shortfall} ${r.shortfall === 1 ? "pan" : "pans"} short of the day.`));
  } else if (r.target > 0) {
    const spare = r.dayCapacity - r.target;
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 6px" },
      spare > 0
        ? `That covers the day, with ${spare} ${spare === 1 ? "pan" : "pans"} to spare.`
        : "That is exactly the day — there is no slack in it at all."));
  }

  kids.push(el("p", { style: "margin:0" },
    el("b", {}, `${r.bottleneck.name} ${setV(r.bottleneck)} your pace.`)));
  const why = bottleneckWhy(r);
  if (why) kids.push(el("p", { class: "card-sub", style: "margin:4px 0 0" }, why));

  if (days > 0 && r.target > 0) {
    const weekPans = days * r.target;
    const weekHours = days * r.hours;
    kids.push(el("p", { class: "card-sub", style: "margin:8px 0 0" },
      `Your week is ${days} delivery days, so ${weekPans} pans — about ${trim(weekHours)} hours at the stove if the line keeps up.`));
  }

  if (r.mixes > 1) {
    kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
      `A day that size is ${r.mixes} mixes, since one mix is ${trim(r.plan.mixerPans)} pans. Each mix wants its own rest, so plan them apart.`));
  }

  return el("div", {}, el("h2", { class: "section" }, "Your day"), el("div", { class: "card" }, ...kids));
}

// Why *that* is the slow one, in the one comparison that makes it obvious.
function bottleneckWhy(r) {
  const p = r.plan;
  if (r.bottleneck.key === "proofer") {
    return `A batch is in the cabinet for the whole ${trim(proofCycleOf(p))} minutes — both proofs with the dimple between them — and the cabinet holds ${trim(p.prooferPans)} pans. Nothing else you change can push past that.`;
  }
  if (r.bottleneck.key === "hands") {
    return `That is ${trim(r.labourPerPan)} minutes of hand-work for every pan, shared between ${trim(p.people)} ${p.people === 1 ? "pair of hands" : "pairs of hands"}.`;
  }
  if (r.bottleneck.key === "oven") {
    return `The oven bakes ${trim(p.ovenPans)} pans every ${trim(p.ovenMin)} minutes, and only one bake fits at a time.`;
  }
  if (r.bottleneck.key === "pans") {
    return `${trim(p.pans)} pans is not many to keep turning over — oiling the pans and weighing the dough out waits on pans coming back out of the oven.`;
  }
  return "";
}

// ── Where the hands go ─────────────────────────────────────────────────────
function handsCard(r) {
  const people = Math.round(r.plan.people);
  const kids = [el("p", { class: "card-title" }, "Where the hands go")];

  if (people > r.usefulPeople) {
    const can = r.usefulPeople;
    kids.push(el("p", { style: "margin:0 0 6px" },
      el("b", {}, `${people} pairs of hands is more than this line can use.`)));
    kids.push(el("p", { class: "card-sub", style: "margin:0" },
      `Past ${can} ${can === 1 ? "pair" : "pairs"}, a new person has nothing to do but wait, because ${lower(r.bottleneck.name)} ${be(r.bottleneck)} what's holding you back. Fix that first — then the extra hands are worth having.`));
  } else if (people <= 1) {
    kids.push(el("p", { style: "margin:0 0 6px" },
      `One pair of hands has nobody to share with, so you do every job in turn — about ${trim(r.labourPerPan)} minutes of work for every pan.`));
    kids.push(el("p", { class: "card-sub", style: "margin:0" },
      "The jobs, and what each one costs you per pan:"));
    kids.push(jobList(r));
    kids.push(el("p", { class: "card-sub", style: "margin:8px 0 0" },
      `That is what sets your ${trim(r.handsRate)} pans an hour — the work is the pace, not the oven.`));
  } else {
    const posts = r.allocation.filter((j) => j.seats > 0);
    const floaters = r.allocation.filter((j) => j.seats === 0);
    kids.push(el("p", { style: "margin:0 0 6px" },
      `Split ${people} pairs of hands by how much work each job is, and every job finishes at the same moment — that is the whole trick to balancing a line.`));
    kids.push(el("p", { style: "margin:0 0 8px" },
      el("b", {}, posts.map((j) => `${j.seats} on the ${j.short}`).join(", ")),
      floaters.length
        ? `, and the other ${floaters.length === 1 ? "job" : `${floaters.length} jobs`} between you — ${listWords(floaters.map((j) => j.short))}.`
        : "."));
    kids.push(jobList(r));
    kids.push(el("p", { class: "card-sub", style: "margin:8px 0 0" },
      `Balanced this way the line runs at ${trim(r.handsRate)} pans an hour.`));
  }

  // The honest caveat, whichever of the three cards above was drawn: a step she
  // has not timed is costing her something real, and the day would be longer for
  // it. Saying nothing would leave a figure on screen the line cannot deliver.
  if (r.unmeasured.length) {
    const n = r.unmeasured.length;
    // The first name opens the sentence, so it keeps its capital and the rest
    // follow as a list — "Weighing in…, weighing the dough out… and cooling…".
    const names = r.unmeasured.map(lower);
    names[0] = upper(names[0]);
    kids.push(el("p", { class: "card-sub", style: "margin:10px 0 0" },
      el("b", {}, `${listWords(names)} ${n === 1 ? "is" : "are"} not timed yet,`),
      ` so ${n === 1 ? "it counts" : "they count"} as nothing and the day above looks longer than it really is. Time ${n === 1 ? "it" : "them"} once and type the minutes in.`));
  }

  return el("div", {}, el("h2", { class: "section" }, "Your hands"), el("div", { class: "card" }, ...kids));
}

function jobList(r) {
  return el("div", { class: "job-list" },
    ...r.allocation.map((j) => el("div", { class: "info-row journal-line" },
      el("span", { class: "j-what" }, j.name),
      // A step she has not timed is not a free step, and must not read as one.
      el("span", { class: "info-val" }, j.perPan > 0 ? `${trim(j.perPan)} min a pan` : "not timed"))));
}

// "a, b and c" — so a sentence naming three steps still reads as a sentence.
function listWords(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// ── What to change ─────────────────────────────────────────────────────────
// Every move she could make, ranked by the pans it actually buys. A move that
// buys nothing keeps its place and says why — a row that looks like it should
// do something and then does nothing reads as a broken screen.
function leverCard(r) {
  const best = r.levers.filter((l) => l.gain > 0);
  const flat = r.levers.filter((l) => l.gain <= 0);
  const kids = [
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Each of these is one change you could make, and what it buys you on a day like this."),
  ];

  if (best.length) {
    kids.push(el("div", { class: "lever-list" },
      ...best.map((l) => leverRow(l, r, true))));
  } else {
    kids.push(el("p", { class: "card-sub" },
      "Nothing on this list buys you more pans — the line is already doing all it can at these numbers."));
  }

  if (flat.length) {
    // Only worth a heading when something above it did help — otherwise the
    // sentence just written already said this.
    if (best.length) {
      kids.push(el("p", { class: "card-sub", style: "margin:12px 0 6px" }, "And these change nothing:"));
    }
    kids.push(el("div", { class: "lever-list flat" },
      ...flat.map((l) => leverRow(l, r, false))));
  }

  return el("div", {}, el("h2", { class: "section" }, "What to change"), el("div", { class: "card" }, ...kids));
}

function leverRow(l, r, helps) {
  if (!helps) {
    // Each one names the wall it leaves standing, rather than the wall she is
    // already looking at — "one more pair of hands" buys nothing precisely when
    // the hands are NOT what her day is waiting on, and saying otherwise would
    // contradict the sentence right above it.
    return el("div", { class: "lever-row" },
      el("div", { class: "lever-top" },
        el("span", { class: "lever-what" }, l.label),
        el("span", { class: "lever-gain" }, "no change")),
      el("div", { class: "li-sub" },
        `No help — ${lower(l.bottleneck.name)} still ${setV(l.bottleneck)} the pace.`));
  }
  // A move can buy pans without shifting the wall itself — six more trays help
  // even while the chiller is still the short one. Saying "now the chiller is
  // the slow one" when it already was would read as nonsense.
  const still = l.bottleneck.key === r.bottleneck.key;
  const reason = still
    ? `Takes the day to ${l.capacity} pans — ${lower(r.bottleneck.name)} ${be(r.bottleneck)} still the next wall after that.`
    : `Takes the day to ${l.capacity} pans. Now ${lower(l.bottleneck.name)} ${be(l.bottleneck)} the slow one.`;
  return el("div", { class: "lever-row helps" },
    el("div", { class: "lever-top" },
      el("span", { class: "lever-what" }, l.label),
      el("span", { class: "lever-gain up" }, `+${l.gain} ${l.gain === 1 ? "pan" : "pans"}`)),
    el("div", { class: "li-sub" }, reason));
}

function lower(s) {
  return String(s || "").charAt(0).toLowerCase() + String(s || "").slice(1);
}

function upper(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}

// Two of the four stations are plural — "Your hands", "Your pans" — so a
// sentence that reads perfectly for the chiller ("the chiller is what sets the
// pace") comes out wrong for them. The model marks which is which and these two
// helpers agree with it.
const be = (st) => (st && st.plural ? "are" : "is");
const setV = (st) => (st && st.plural ? "set" : "sets");
