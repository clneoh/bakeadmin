// scenario.js — a production scenario: modules laid out on a clock.
//
// Pure and DOM-free, so the arithmetic can be trusted and tested with
// node --test (test/scenario.test.js). The screen in views/scenario.js draws
// whatever this returns and decides nothing itself.
//
// This is a DESIGN tool, and it is a different question from js/production.js.
// That model answers "how fast can this line go"; this one lays the day out in
// TIME — when each module starts, how long it holds, and when you have to be
// standing at it. The thing it can say that the capacity model cannot is the one
// she asked for: move a module's start time and the number of people you need
// changes, while the pans do not.
//
// The idea holding it up is a CELL, not a station: a module is a piece of
// equipment AND the pair of hands that tends it, counted as one unit with its own
// cycle time. That is what gives a per-cycle output, and it is why the same
// machine with the same hands can be one person's job or two depending only on
// when it starts.

// A module, and what each field means in her terms:
//
//   cycleMin  how long ONE pass occupies the module — the dough is in the mixer,
//             the pan is in the oven, the dough is sitting between folds
//   batch     how many pans that one pass deals with
//   touchMin  how many minutes of a person that pass costs. 0 = it runs itself,
//             which is the honest reading of the retard and of the oven's bake
//   everyMin  minutes from the start of one pass to the start of the next. This
//             IS the module's pace, so a module with repeats is a loop — her
//             fold, 28 minutes of rest then a fold, is just this with a cycle
//             longer than the touch
//   repeats   how many passes in the scenario
//   startMin  minutes from the start of the day. THE KNOB: this is the
//             "repeating of module start time" she tunes to shrink the people
//   people    how many people that pass needs standing at it
//
// Every number here is a starting figure she is expected to move — the screen
// says so, and she tunes them against her own kitchen.

// Scenario 1 — "What I have now". No fridge: the line as it stands, on the
// chiller she already owns. The fridge is seeded but switched OFF, so the first
// thing the screen shows her is the scenario she asked for, and the buy-something
// option is one tap away rather than hidden.
export const DEFAULT_SCENARIO = {
  name: "What I have now",
  note: "No new fridge — the line as it stands, using the chiller you already own.",
  // The pans she is asking this scenario for. It is the top of the climb: she
  // raises it until something stops her, fixes that, and raises it again.
  target: 36,
  modules: [
    { id: "mixer", icon: "🥣", name: "The mixer", on: true,
      cycleMin: 20, batch: 28, touchMin: 6, everyMin: 20, repeats: 1, startMin: 0, people: 1 },
    { id: "fold", icon: "🫙", name: "The fold loop", on: true,
      cycleMin: 30, batch: 28, touchMin: 2, everyMin: 30, repeats: 4, startMin: 30, people: 1 },
    { id: "wash", icon: "🥘", name: "Wash, oil and fill", on: true,
      cycleMin: 18, batch: 6, touchMin: 18, everyMin: 18, repeats: 6, startMin: 150, people: 1 },
    { id: "load", icon: "🧊", name: "Load the chiller", on: true,
      cycleMin: 15, batch: 12, touchMin: 15, everyMin: 15, repeats: 1, startMin: 258, people: 1 },
    { id: "retard", icon: "❄️", name: "Retard overnight", on: true,
      cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 1, startMin: 273, people: 1 },
    { id: "unload", icon: "🔓", name: "Unload the chiller", on: true,
      cycleMin: 15, batch: 12, touchMin: 15, everyMin: 720, repeats: 1, startMin: 993, people: 1 },
    { id: "top", icon: "🫳", name: "Dimple and top", on: true,
      cycleMin: 8, batch: 6, touchMin: 8, everyMin: 15, repeats: 6, startMin: 1008, people: 1 },
    { id: "oven", icon: "🔥", name: "The oven", on: true,
      cycleMin: 15, batch: 6, touchMin: 4, everyMin: 15, repeats: 6, startMin: 1016, people: 1 },
    { id: "pack", icon: "📦", name: "Cool and pack", on: true,
      cycleMin: 12, batch: 6, touchMin: 12, everyMin: 15, repeats: 6, startMin: 1095, people: 1 },
    { id: "fridge", icon: "🧺", name: "The fridge (WIP buffer)", on: false,
      cycleMin: 1440, batch: 24, touchMin: 0, everyMin: 1440, repeats: 1, startMin: 0, people: 1 },
  ],
};

// The window the timeline draws. A day, because the retard runs through the
// night — and a scenario whose modules run past it stretches the window rather
// than being drawn off the edge.
//
// It is also the hard cap on how many times a module can run, and that cap is
// the whole reason this screen can be trusted to talk her out of a purchase as
// well as into one. A 12-hour retard fits TWICE in a day and no more, so twelve
// trays is twenty-four pans a day however much she wants otherwise. Telling her
// to run the retard a third time would be telling her to do 36 hours of work in
// 24 — and it would hide the real answer, which is more trays.
const DAY_MIN = 24 * 60;
const MIN_WINDOW_MIN = DAY_MIN;

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const atLeast = (v, floor, fallback = 0) => Math.max(floor, num(v, fallback));

// Every module filled in and clamped, and every scenario told apart from a
// half-written one. Everything below reads modules through here, and the screen
// reads the same values back out of computeScenario().modules — so a number
// shown on screen is always the number the arithmetic used.
export function scenarioOf(saved) {
  const s = { ...DEFAULT_SCENARIO, ...(saved || {}) };
  const mods = Array.isArray(s.modules) && s.modules.length ? s.modules : DEFAULT_SCENARIO.modules;
  return {
    name: String(s.name || DEFAULT_SCENARIO.name),
    note: String(s.note || ""),
    target: atLeast(s.target, 0, DEFAULT_SCENARIO.target),
    modules: mods.map(moduleOf),
  };
}

export function moduleOf(m) {
  const src = m || {};
  const cycleMin = atLeast(src.cycleMin, 0, 0);
  return {
    id: String(src.id || ""),
    icon: String(src.icon || "•"),
    name: String(src.name || "A module"),
    on: src.on !== false,
    cycleMin,
    batch: atLeast(src.batch, 0, 0),
    touchMin: atLeast(src.touchMin, 0, 0),
    // A module with no gap of its own runs back to back, which is what "every
    // cycle time" means for a simple machine.
    everyMin: atLeast(src.everyMin, 0, 0) || cycleMin,
    repeats: Math.max(1, Math.round(atLeast(src.repeats, 1, 1))),
    startMin: Math.max(0, num(src.startMin, 0)),
    people: Math.max(1, Math.round(atLeast(src.people, 1, 1))),
  };
}

// When each pass of a module happens. Every module — a single mix and a fold
// loop alike — is the same list of passes; the loop is simply one with more of
// them, which is why the fold needs no concept of its own.
export function passesOf(m) {
  const mod = moduleOf(m);
  const out = [];
  for (let k = 0; k < mod.repeats; k += 1) {
    const at = mod.startMin + k * mod.everyMin;
    out.push({
      at,
      end: at + mod.cycleMin,
      // The minutes of a person, taken from the START of the pass. A touch
      // longer than the pass itself is clamped: you cannot be at a module after
      // it has finished with the dough.
      touchFrom: at,
      touchTo: at + Math.min(mod.touchMin, mod.cycleMin),
    });
  }
  return out;
}

// What one module delivers, and what it costs.
export function moduleFacts(m) {
  const mod = moduleOf(m);
  const perPass = mod.cycleMin / (mod.batch || 1);
  // How many times this module can possibly run in a day. A retard that holds
  // the dough for 720 minutes cannot be started a third time inside 1440 of
  // them; a 15-minute wash can be started ninety-six times.
  const fitsInDay = mod.everyMin > 0
    ? Math.max(1, Math.floor(DAY_MIN / mod.everyMin))
    : mod.repeats;
  // What she asked for, and what the day allows. The second is what the line
  // actually passes — see DAY_MIN for why this is not a detail.
  const repeatsHeld = Math.min(mod.repeats, fitsInDay);
  const held = { ...mod, repeats: repeatsHeld };
  return {
    ...mod,
    passes: passesOf(held),
    // Minutes of the module for every pan through it — the same shape as the
    // capacity model's "minutes a pan", so the two screens can be compared.
    perPan: mod.batch > 0 ? perPass : 0,
    // Pans out of this module across the whole scenario. The line can only pass
    // what its stingiest module passes, so this is what the day is measured on.
    output: mod.batch * repeatsHeld,
    // Pans an hour, from this module's own pace.
    rate: mod.everyMin > 0 && mod.batch > 0 ? (mod.batch * 60) / mod.everyMin : 0,
    // Minutes of a person for the whole scenario, and for every pan.
    touchTotal: mod.touchMin * repeatsHeld,
    needsYou: mod.touchMin > 0,
    endMin: mod.startMin + (repeatsHeld - 1) * mod.everyMin + mod.cycleMin,
    fitsInDay,
    repeatsHeld,
    // True when she has asked for more passes than a day can hold. The screen
    // says so out loud rather than quietly counting fewer.
    capped: repeatsHeld < mod.repeats,
  };
}

// Who has to be standing where, and when.
//
// A module's touch is a window, and two windows that overlap need two people.
// That is the whole point of the screen: the pans are set by the modules, but
// the PEOPLE are set by when the modules start — so moving a start can take the
// day from two people to one without costing a single pan.
export function peopleTrace(modules) {
  const events = [];
  for (const f of modules) {
    if (!f.on || f.touchMin <= 0) continue;
    for (const p of f.passes) {
      if (p.touchTo <= p.touchFrom) continue;
      events.push({ at: p.touchFrom, delta: f.people, module: f.name });
      events.push({ at: p.touchTo, delta: -f.people, module: f.name });
    }
  }
  // A window ending exactly when another starts is not an overlap: the sort puts
  // every ending before any starting at the same minute, so her finishing one
  // job and starting the next is one person, as it is in a real kitchen.
  events.sort((a, b) => (a.at - b.at) || (a.delta - b.delta));

  let live = 0;
  let peak = 0;
  let peakAt = 0;
  const busy = [];
  for (const e of events) {
    live += e.delta;
    if (live > peak) {
      peak = live;
      peakAt = e.at;
    }
    if (e.delta > 0) busy.push(e.at);
  }
  return { peak, peakAt, events, windows: busy };
}

// One row per person, and which modules that person attends.
//
// Greedy first-fit over the touch windows, earliest first: each window goes to
// the first person already free at that minute, and a new person is added only
// when nobody is. That is the fewest people who can cover the day, and — which
// matters just as much — it hands back WHICH modules each person covers, so the
// screen can draw one row for a person, exactly as she asked for it.
export function peopleLanes(modules) {
  const windows = [];
  for (const f of modules) {
    if (!f.on || f.touchMin <= 0) continue;
    for (const p of f.passes) {
      if (p.touchTo <= p.touchFrom) continue;
      windows.push({
        module: f.id, icon: f.icon, name: f.name,
        from: p.touchFrom, to: p.touchTo, people: f.people,
      });
    }
  }
  windows.sort((a, b) => (a.from - b.from) || (a.to - b.to));

  const lanes = [];
  for (const w of windows) {
    // A person free at the exact minute this one starts is free: finishing one
    // job and starting the next is one person, as it is in a real kitchen.
    let lane = lanes.find((l) => l.until <= w.from);
    if (!lane) {
      lane = { until: -1, items: [] };
      lanes.push(lane);
    }
    lane.items.push(w);
    lane.until = w.to;
  }
  return lanes;
}

// The whole answer, from one scenario.
export function computeScenario(saved) {
  const s = scenarioOf(saved);
  const facts = s.modules.map((m) => ({ ...moduleFacts(m), on: m.on }));

  // Only the modules switched on can hold anything back. The fridge sits in the
  // list switched off in scenario 1 — a module that isn't in the build cannot
  // be its bottleneck.
  const on = facts.filter((f) => f.on);
  const live = on.filter((f) => f.output > 0);

  // The wall is the module that passes the fewest pans — that is what the day
  // can deliver — and ties go to the earlier module in the list, which is the
  // order the day itself runs in.
  const wall = live.length
    ? live.reduce((best, f) => (f.output < best.output ? f : best))
    : none();

  const pansPerDay = wall.output;
  const pacePansPerHour = wall.rate;
  const trace = peopleTrace(on);
  const lanes = peopleLanes(on);
  const target = Math.max(0, num(s.target));

  // The day as it actually stretches, so the overnight retard is visible as
  // overnight rather than being folded into a number that hides it.
  const endMin = on.reduce((m, f) => Math.max(m, f.endMin), 0);
  const windowMin = Math.max(MIN_WINDOW_MIN, endMin);

  return {
    scenario: s,
    modules: facts,
    on,
    wall,
    pansPerDay,
    pacePansPerHour,
    // "Cycle time" in the words she used, in the words this app already uses for
    // the same quantity: minutes for one pan off the line.
    cycleMin: pacePansPerHour > 0 ? 60 / pacePansPerHour : 0,
    people: trace.peak,
    trace,
    lanes,
    target,
    shortfall: Math.max(0, Math.round(target) - pansPerDay),
    endMin,
    windowMin,
    hours: windowMin / 60,
    // The modules not yet in this build, so the screen can name what she has
    // parked rather than looking like it simply forgot them.
    parked: facts.filter((f) => !f.on),
  };
}

function none() {
  return { id: "", icon: "•", name: "Nothing yet", output: 0, rate: 0, sub: "Switch a module on." };
}

// ── The climb ──────────────────────────────────────────────────────────────
//
// The five steps of a constraint, which is the method she described: ask for
// more than you make, find the one module that stops you, relieve exactly that
// one, watch the number rise, and meet the next wall. Repeat until the number is
// the one you wanted — or until the relief costs more than the pans are worth.
//
// The relief it proposes is always the same knob, and it is the one she named
// herself: repeats — how many times that module runs in the day. It is the only
// knob that raises a module's output without touching the thing she has already
// measured, so the number on the screen stays HER number.

// How many passes of a module it would take to pass `want` pans — never more
// than a day can hold, because a rung the day cannot fit is not a rung she can
// climb. When the cap bites, the climb stops there and names the real answer
// (a bigger pass, not a more frequent one).
export function repeatsToPass(module, want) {
  const batch = num(module.batch);
  if (batch <= 0) return 0;
  const need = Math.max(1, Math.ceil(num(want) / batch));
  const mod = moduleOf(module);
  const fits = mod.everyMin > 0 ? Math.max(1, Math.floor(DAY_MIN / mod.everyMin)) : need;
  return Math.min(need, fits);
}

// The whole climb, run to the end: keep relieving whatever is the wall until the
// target is met or the number stops moving. Each step is one module and one
// change, so the list reads as the order she would actually do them in.
//
// It stops on repetition as well as on success — a module that is still the wall
// after being relieved cannot be fixed by running it more often, and looping on
// it for ever would be a hung screen rather than an answer.
export function climbSteps(saved, target, limit = 12) {
  const want = Math.max(0, Math.round(num(target, 0)));
  let scenario = scenarioOf(saved);
  const steps = [];
  let seen = new Set();

  for (let i = 0; i < limit; i += 1) {
    const now = computeScenario(scenario);
    if (want <= 0 || now.pansPerDay >= want) {
      return { steps, reached: want > 0 && now.pansPerDay >= want, end: now, want };
    }
    const w = now.wall;
    if (!w.id || w.batch <= 0) return { steps, reached: false, end: now, want };
    if (seen.has(w.id)) return { steps, reached: false, end: now, want };
    seen.add(w.id);

    const to = repeatsToPass(w, want);
    if (to <= w.repeats) return { steps, reached: false, end: now, want };
    scenario = { ...scenario, modules: scenario.modules.map((m) => (m.id === w.id ? { ...m, repeats: to } : m)) };
    const next = computeScenario(scenario);
    steps.push({
      id: w.id,
      module: w.name,
      icon: w.icon,
      from: w.repeats,
      to,
      batch: w.batch,
      before: now.pansPerDay,
      after: next.pansPerDay,
      wallThen: next.wall,
    });
  }
  return { steps, reached: false, end: computeScenario(scenario), want };
}

// "2 h 30 m" — for a timeline that runs through the night, where "14.5 hours"
// is a number she has to convert in her head and "14 h 30 m" is one she reads.
export function hoursAndMinutes(mins) {
  const m = Math.max(0, Math.round(num(mins)));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h <= 0) return `${rest} min`;
  if (rest === 0) return `${h} h`;
  return `${h} h ${rest} min`;
}

// A minute of the day as a clock reading she would recognise, so a start time
// reads "7:30 am" rather than "450".
export function clockOf(mins) {
  const m = Math.max(0, Math.round(num(mins))) % (24 * 60);
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h24 < 12 ? "am" : "pm";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, "0")} ${ampm}`;
}
