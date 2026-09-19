// views/production.js — the production line (19 Sep 2026).
//
// She asked for the flow visualised, the bottleneck highlighted, and something
// to balance the line so her manpower is used well. All the arithmetic is in
// js/production.js — this screen only draws it, so the two can never disagree.
//
// It is a planner she types into: nothing here reads an order, and nothing here
// blocks a sale. Change a number and the whole screen answers again at once.

import { el } from "../ui.js";
import { save } from "../state.js";
import { computeLine, trim } from "../production.js";

// The numbers she types, in the order she'd say them. Everything is seeded from
// the measurements she already gave on /form/, so the screen says something true
// the first time it opens and she only has to correct what has changed.
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
    sub: "The pans and the trays — the things you'd buy more of.",
    fields: [
      { key: "pans", label: "Baking pans you own", step: 1 },
      { key: "trays", label: "Trays of dough your chiller holds", step: 1,
        hint: "One tray retards one pan overnight, so this is the ceiling on a day. Your form said 8 and you have also said 12 — set the one that is true." },
    ],
  },
  {
    title: "The oven and the mixer",
    sub: "What the machines can take at once.",
    fields: [
      { key: "ovenPans", label: "Pans per bake", step: 1 },
      { key: "ovenMin", label: "Minutes per bake", step: 1 },
      { key: "mixerPans", label: "Most dough in one mix, in pans", step: 1,
        hint: "Only matters if a day's baking needs more than one mix." },
    ],
  },
  {
    title: "The times you measured",
    sub: "These are the figures you timed, each for 6 pans.",
    fields: [
      { key: "washMin6", label: "Wash, oil and fill 6 pans", step: 1 },
      { key: "topMin6", label: "Dimple and top 6 pans", step: 1 },
      { key: "swapMin6", label: "Take 6 out and put 6 in", step: 1 },
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

  const onEdit = (key, raw) => {
    const n = Number(raw);
    // A cleared field is mid-typing, not a request for zero pans: hold the last
    // good number rather than storing a 0 the whole screen would have to explain.
    if (Number.isFinite(n) && n > 0) {
      plan[key] = n;
      save(state);
    }
    refresh();
  };

  const board = el("div", {},
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "These are the numbers you measured. Change any of them and everything below answers again — nothing here is saved anywhere but your own phones."),
    ...GROUPS.map((g) => groupCard(g, plan, onEdit)));

  refresh();
  root.replaceChildren(board, readout);
  return () => { dead = true; };
}

function groupCard(group, plan, onEdit) {
  return el("div", { class: "card" },
    el("p", { class: "card-title" }, group.title),
    el("p", { class: "card-sub", style: "margin:0 0 10px" }, group.sub),
    ...group.fields.map((f) => fieldRow(f, plan, onEdit)));
}

function fieldRow(f, plan, onEdit) {
  const input = el("input", {
    class: "input", type: "number", inputmode: "decimal",
    min: "1", step: String(f.step || 1),
    value: plan[f.key] == null ? "" : String(plan[f.key]),
  });
  input.addEventListener("input", () => onEdit(f.key, input.value));
  return el("div", { class: "field" },
    el("label", {}, f.label),
    input,
    f.hint ? el("div", { class: "hint" }, f.hint) : null);
}

function blocks(state, plan) {
  const r = computeLine(plan);
  return [lineCard(r), dayCard(r, state), handsCard(r), leverCard(r)];
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
  if (r.bottleneck.key === "chiller") {
    return `The chiller holds ${trim(p.trays)} trays of dough, and one tray is one pan. Nothing else you change can push past that.`;
  }
  if (r.bottleneck.key === "hands") {
    return `That is ${trim(r.labourPerPan)} minutes of work for every pan — washing, oiling, filling, topping and swapping — shared between ${trim(p.people)} ${p.people === 1 ? "pair of hands" : "pairs of hands"}.`;
  }
  if (r.bottleneck.key === "oven") {
    return `The oven bakes ${trim(p.ovenPans)} pans every ${trim(p.ovenMin)} minutes, and only one bake fits at a time.`;
  }
  if (r.bottleneck.key === "pans") {
    return `${trim(p.pans)} pans is not many to keep turning over — the wash waits on pans coming back out of the oven.`;
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
    return el("div", {}, el("h2", { class: "section" }, "Your hands"), el("div", { class: "card" }, ...kids));
  }

  if (people <= 1) {
    kids.push(el("p", { style: "margin:0 0 6px" },
      `One pair of hands has nobody to share with, so you do all three jobs in turn — about ${trim(r.labourPerPan)} minutes of work for every pan.`));
    kids.push(el("p", { class: "card-sub", style: "margin:0" },
      "The three jobs, and what each one costs you per pan:"));
    kids.push(jobList(r));
    kids.push(el("p", { class: "card-sub", style: "margin:8px 0 0" },
      `That is what sets your ${trim(r.handsRate)} pans an hour — the work is the pace, not the oven.`));
    return el("div", {}, el("h2", { class: "section" }, "Your hands"), el("div", { class: "card" }, ...kids));
  }

  const posts = r.allocation.filter((j) => j.seats > 0);
  const floaters = r.allocation.filter((j) => j.seats === 0);
  kids.push(el("p", { style: "margin:0 0 6px" },
    `Split ${people} pairs of hands by how much work each job is, and every job finishes at the same moment — that is the whole trick to balancing a line.`));
  kids.push(el("p", { style: "margin:0 0 8px" },
    el("b", {}, posts.map((j) => `${j.seats} on the ${lower(j.name)}`).join(", ")),
    floaters.length
      ? `, and whoever is free takes the ${floaters.map((j) => lower(j.name)).join(" and the ")}.`
      : "."));
  kids.push(jobList(r));
  kids.push(el("p", { class: "card-sub", style: "margin:8px 0 0" },
    `Balanced this way the line runs at ${trim(r.handsRate)} pans an hour.`));
  return el("div", {}, el("h2", { class: "section" }, "Your hands"), el("div", { class: "card" }, ...kids));
}

function jobList(r) {
  return el("div", { class: "job-list" },
    ...r.allocation.map((j) => el("div", { class: "info-row journal-line" },
      el("span", { class: "j-what" }, j.name),
      el("span", { class: "info-val" }, `${trim(j.perPan)} min a pan`))));
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

// Two of the four stations are plural — "Your hands", "Your pans" — so a
// sentence that reads perfectly for the chiller ("the chiller is what sets the
// pace") comes out wrong for them. The model marks which is which and these two
// helpers agree with it.
const be = (st) => (st && st.plural ? "are" : "is");
const setV = (st) => (st && st.plural ? "set" : "sets");
