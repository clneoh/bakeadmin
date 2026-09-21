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
// The clock her day starts at, as minutes from midnight. Every module's start
// is counted from HERE, so "let me start at 8 am" is one field rather than ten
// module starts to retype.
//
// 3 pm is the seed because it is the day her own process describes: mix in the
// afternoon, retard overnight, bake in the morning. The last unload lands at
// about twenty to eleven the next morning.
export const DEFAULT_DAY_START = 15 * 60;

// How wide a minute is drawn. She asked to be able to change the time scale:
// Coarse fits the whole day on a phone, Fine separates a fifteen-minute bake
// from the one before it.
export const PX_PER_MIN_DEFAULT = 1.6;
export const PX_PER_MIN_CHOICES = [1.2, 1.6, 2.4, 3.2];

export const DEFAULT_SCENARIO = {
  name: "What I have now",
  note: "No new fridge — the line as it stands, using the chiller you already own.",
  // The pans she is asking this scenario for. It is the top of the climb: she
  // raises it until something stops her, fixes that, and raises it again.
  target: 36,
  dayStartMin: DEFAULT_DAY_START,
  pxPerMin: PX_PER_MIN_DEFAULT,
  // Which people a person row is standing in for. Her words: combining person 1
  // with person 3 makes "person 1_3" — one pair of hands covering both jobs, and
  // the collisions that appear are the price of it. See cleanMerges.
  merges: {},
  modules: [
    // `person` is who she has put on this brick: 0 means "whoever is free", and
    // a number names a person so two bricks can be given to the same one and the
    // clash shown. See peopleRows().
    { id: "mixer", icon: "🥣", name: "The mixer", job: "mix", on: true, person: 0,
      cycleMin: 20, batch: 28, touchMin: 6, everyMin: 20, repeats: 1, startMin: 0, people: 1 },
    // Her own description of the fold: 28 minutes of rest and then a 2-minute
    // fold. So the brick holds for 28 and restarts 30 minutes after the last
    // time — the rest is the gap, not part of the pass.
    { id: "fold", icon: "🫙", name: "The fold loop", on: true, person: 0,
      cycleMin: 28, batch: 28, touchMin: 2, everyMin: 30, repeats: 4, startMin: 30, people: 1 },
    { id: "wash", icon: "🥘", name: "Wash, oil and fill", job: "wash", on: true, person: 0,
      cycleMin: 18, batch: 6, touchMin: 18, everyMin: 18, repeats: 6, startMin: 150, people: 1 },
    { id: "load", icon: "🧊", name: "Load the chiller", on: true, person: 0,
      cycleMin: 15, batch: 12, touchMin: 15, everyMin: 15, repeats: 1, startMin: 258, people: 1 },
    { id: "retard", icon: "❄️", name: "Retard overnight", job: "retard", on: true, person: 0,
      cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 1, startMin: 273, people: 1 },
    { id: "unload", icon: "🔓", name: "Unload the chiller", on: true, person: 0,
      cycleMin: 15, batch: 12, touchMin: 15, everyMin: 720, repeats: 1, startMin: 993, people: 1 },
    { id: "top", icon: "🫳", name: "Dimple and top", job: "top", on: true, person: 0,
      cycleMin: 8, batch: 6, touchMin: 8, everyMin: 15, repeats: 6, startMin: 1008, people: 1 },
    { id: "oven", icon: "🔥", name: "The oven", job: "oven", on: true, person: 0,
      cycleMin: 15, batch: 6, touchMin: 4, everyMin: 15, repeats: 6, startMin: 1016, people: 1 },
    { id: "pack", icon: "📦", name: "Cool and pack", job: "cool", on: true, person: 0,
      cycleMin: 12, batch: 6, touchMin: 12, everyMin: 15, repeats: 6, startMin: 1095, people: 1 },
    { id: "fridge", icon: "🧺", name: "The fridge (WIP buffer)", on: false, person: 0,
      cycleMin: 1440, batch: 24, touchMin: 0, everyMin: 1440, repeats: 1, startMin: 0, people: 1 },
  ],
};

// ── A second line, to compare against the first ────────────────────────────
//
// Her sister's proposal, in her words (21 Sep 2026): *"using a bigger plastic
// container that is able to fill 4 dough, she mix all ingredient in, by
// spatula, as focaccia dough is highly hydrated and sticky. Using a big mixer
// might not be a good answer."* Then *"in the same container she do a stretch
// and fold every 30min once, repeat for 3 times. After 1.5hrs, she will
// transfer it to 4 pans, transfer into proofer that able to hold 12 pan any
// time, the proofer is temperature control, time control and humidity control.
// For 1hrs. After proof, in each pan will do dimple, oil, and it take 1min per
// pan after that will leave it for another 30min before going into oven."*
//
// It is the same kitchen answering the same question with different equipment:
// no mixer and no chiller at all, a tub instead of a bowl, and a proofing
// cabinet in place of the overnight retard. So the two scenarios sit side by
// side and can be compared brick for brick, which is the whole reason this one
// is a starting point rather than something she has to retype.
//
// Two of its numbers are NOT hers and are marked as such below, because a
// figure she never gave must never be dressed up as one she did — see the v135
// mixer note. Every number on every brick is hers to change; nothing here is a
// setting she cannot reach from the brick editor.
export const SISTER_SCENARIO = {
  id: "s_sister_21_9_2026",
  name: "My sister proposal 21/9/2026",
  note: "No mixer and no chiller: mixed by hand in one tub, folded in the tub, then a proofing cabinet. Every number can be changed on the brick itself.",
  target: 12,
  dayStartMin: DEFAULT_DAY_START,
  pxPerMin: PX_PER_MIN_DEFAULT,
  merges: {},
  modules: [
    // PLACEHOLDER, not her number: she said the dough is mixed by hand with a
    // spatula but never said for how long, so the 20 minutes here is the length
    // of her own mixer pass, standing in until she types the real figure. The
    // brick is named so she can see at once that this is the one to set.
    { id: "tubmix", icon: "🥣", name: "Mixing by hand in the tub (set the minutes)", on: true, person: 0,
      cycleMin: 20, batch: 4, touchMin: 20, everyMin: 20, repeats: 1, startMin: 0, people: 1 },
    // Her own fold, in a tub holding four: 28 minutes of rest and a fold, three
    // times over. Same shape as the fold brick in the scenario above, so the two
    // can be read against each other.
    { id: "tubfold", icon: "🫙", name: "Stretch and fold in the tub", on: true, person: 0,
      cycleMin: 28, batch: 4, touchMin: 2, everyMin: 30, repeats: 3, startMin: 30, people: 1 },
    // DERIVED, not her number: she gave no time for tipping the dough into the
    // pans, so this uses her own measured 3 minutes a pan (the 18 minutes for 6
    // pans she has already confirmed), which is 12 minutes for four.
    { id: "panfill", icon: "🥘", name: "Into the pans", on: true, person: 0,
      cycleMin: 12, batch: 4, touchMin: 12, everyMin: 12, repeats: 1, startMin: 90, people: 1 },
    // The proofer holds twelve pans and proofs for an hour. It has no person on
    // it, which is the point of it: the dough waits in a cabinet while she does
    // something else.
    { id: "proofer", icon: "🌡️", name: "The proofer", on: true, person: 0,
      cycleMin: 60, batch: 12, touchMin: 0, everyMin: 60, repeats: 1, startMin: 102, people: 1 },
    // Her number, exactly: *"it take 1min per pan"* — four pans, four minutes.
    { id: "dimpleoil", icon: "🫳", name: "Dimple and oil in the pan", job: "top", on: true, person: 0,
      cycleMin: 4, batch: 4, touchMin: 4, everyMin: 4, repeats: 1, startMin: 162, people: 1 },
    // Her number again: the 30 minutes the pans rest before the oven. No hands.
    { id: "bench", icon: "⏳", name: "Rest before the oven", on: true, person: 0,
      cycleMin: 30, batch: 4, touchMin: 0, everyMin: 30, repeats: 1, startMin: 166, people: 1 },
    { id: "oven", icon: "🔥", name: "The oven", job: "oven", on: true, person: 0,
      cycleMin: 15, batch: 6, touchMin: 4, everyMin: 15, repeats: 1, startMin: 196, people: 1 },
    { id: "pack", icon: "📦", name: "Cool and pack", job: "cool", on: true, person: 0,
      cycleMin: 12, batch: 6, touchMin: 12, everyMin: 12, repeats: 1, startMin: 211, people: 1 },
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
    // The working copy keeps its own id once it has been saved, so saving again
    // updates that scenario rather than growing a second copy of it.
    id: s.id ? String(s.id) : "",
    name: String(s.name || DEFAULT_SCENARIO.name),
    note: String(s.note || ""),
    target: atLeast(s.target, 0, DEFAULT_SCENARIO.target),
    // Any hour of the clock, wrapped rather than rejected — 25:00 is 1 am.
    dayStartMin: wrapDay(num(s.dayStartMin, DEFAULT_DAY_START)),
    pxPerMin: clampScale(num(s.pxPerMin, PX_PER_MIN_DEFAULT)),
    merges: cleanMerges(s.merges),
    modules: mods.map(moduleOf),
  };
}

// Which people a person row stands in for: { "1": [1, 3] } reads as "person 1,
// who is also covering person 3's jobs". It is a LABEL, not arithmetic — the
// bricks themselves carry the person they were given, so nothing about the day
// depends on this. Scrubbed on the way in so a hand-edited import can put
// nothing but person numbers in it.
function cleanMerges(src) {
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [k, v] of Object.entries(src)) {
    const who = Math.round(num(k));
    if (!(who >= 1 && who <= 8) || !Array.isArray(v)) continue;
    const members = [...new Set(v
      .map((x) => Math.round(num(x)))
      .filter((x) => x >= 1 && x <= 8 && x !== who))].sort((a, b) => a - b);
    if (members.length) out[String(who)] = members;
  }
  return out;
}

// A minute of the day, wrapped into one: 1440 is midnight again, -60 is 11 pm.
function wrapDay(m) {
  const d = 24 * 60;
  const r = Math.round(num(m)) % d;
  return r < 0 ? r + d : r;
}

// The drawing scale, kept to the four she can pick so a hand-typed number cannot
// make a day a hair's width or a hundred screens wide.
function clampScale(px) {
  const choice = PX_PER_MIN_CHOICES.reduce(
    (best, c) => (Math.abs(c - px) < Math.abs(best - px) ? c : best), PX_PER_MIN_DEFAULT);
  return choice;
}

export function moduleOf(m) {
  const src = m || {};
  const cycleMin = atLeast(src.cycleMin, 0, 0);
  return {
    id: String(src.id || ""),
    icon: String(src.icon || "•"),
    name: String(src.name || "A module"),
    // Which station of the production line this brick is, if any. Kept apart
    // from the name so renaming a brick cannot break the link between the two
    // screens — see LINE_JOBS.
    job: String(src.job || ""),
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
    // 0 = whoever is free. 1..8 = that person, by name, so two bricks can be
    // given to one person and the collision drawn rather than hidden.
    person: Math.max(0, Math.min(8, Math.round(atLeast(src.person, 0, 0)))),
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
//
// Every window in the scenario, earliest first — one per pass. Both readings of
// the day below are built from this same list, so they can never disagree about
// who is needed where.
export function touchWindows(modules) {
  const windows = [];
  for (const f of modules) {
    if (!f.on || f.touchMin <= 0) continue;
    for (const p of f.passes) {
      if (p.touchTo <= p.touchFrom) continue;
      windows.push({
        module: f.id, icon: f.icon, name: f.name, person: f.person || 0,
        from: p.touchFrom, to: p.touchTo, people: f.people,
      });
    }
  }
  windows.sort((a, b) => (a.from - b.from) || (a.to - b.to));
  return windows;
}

// One row per person: who they are, what they are at, and where two of their
// jobs collide.
//
// A window she has given to person 2 goes to person 2 whether or not it fits —
// that is her plan, and a plan that overlaps has to be SHOWN rather than quietly
// rearranged. A window with nobody named (person 0) goes to the first person
// free at that minute, and only adds a new person when nobody is: that is the
// fewest hands that can cover the day, which is the number she is trying to get
// down to. The clashes on a named row are the whole point of the exercise — they
// are what she slides the bricks along the day to remove.
export function peopleRows(modules) {
  const windows = touchWindows(modules);
  const rows = [];
  const rowFor = (p) => {
    let row = rows.find((x) => x.person === p);
    if (!row) {
      row = { person: p, named: p > 0, items: [], busy: 0, clashes: [] };
      rows.push(row);
    }
    return row;
  };

  for (const w of windows) if (w.person > 0) rowFor(w.person).items.push(w);

  const nextPerson = () => rows.reduce((m, x) => Math.max(m, x.person), 0) + 1;
  const freeAt = (row, w) => row.items.every((i) => i.to <= w.from || i.from >= w.to);
  for (const w of windows) {
    if (w.person > 0) continue;
    // A person free at the exact minute this one starts is free: finishing one
    // job and starting the next is one person, as it is in a real kitchen.
    const free = rows.filter((row) => freeAt(row, w)).sort((a, b) => a.person - b.person)[0];
    (free || rowFor(nextPerson())).items.push(w);
  }

  rows.sort((a, b) => a.person - b.person);
  for (const row of rows) {
    row.items.sort((a, b) => (a.from - b.from) || (a.to - b.to));
    let edge = -1;
    let prev = null;
    for (const i of row.items) {
      // The row's minutes are the UNION of its jobs, not the sum: a person in
      // two places at once has not worked twice as long.
      if (i.from >= edge) row.busy += i.to - i.from;
      else {
        if (i.to > edge) row.busy += i.to - edge;
        row.clashes.push({ before: prev, after: i, from: i.from, to: Math.min(edge, i.to) });
      }
      if (i.to > edge) {
        edge = i.to;
        prev = i;
      }
    }
  }
  return rows;
}

// How many people are needed AT ONCE, minute by minute — the "total person"
// she asked for, and the shape she is sliding the bricks to flatten. Returned as
// runs of a constant count so the screen can draw the demand rather than only
// its peak.
export function concurrency(modules) {
  const events = [];
  for (const w of touchWindows(modules)) {
    events.push({ at: w.from, delta: w.people });
    events.push({ at: w.to, delta: -w.people });
  }
  // An ending at the same minute as a start is not an overlap: the sort puts
  // every ending before any starting at the same minute, so her finishing one
  // job and starting the next is one person, exactly as it is in a real kitchen.
  events.sort((a, b) => (a.at - b.at) || (a.delta - b.delta));

  const segments = [];
  let live = 0;
  let peak = 0;
  let peakAt = 0;
  let overlapMin = 0;
  for (let i = 0; i < events.length; i += 1) {
    const e = events[i];
    const next = events[i + 1];
    live += e.delta;
    if (live > peak) {
      peak = live;
      peakAt = e.at;
    }
    // What this event leaves running holds until the next event of any kind.
    if (live > 0 && next && next.at > e.at) {
      segments.push({ from: e.at, to: next.at, count: live });
      if (live >= 2) overlapMin += next.at - e.at;
    }
  }
  return { segments, peak, peakAt, overlapMin };
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
  const rows = peopleRows(on);
  const demand = concurrency(on);
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
    // People is the most she needs at any one minute — the fewest hands that can
    // cover the day, which is the number she is trying to bring down.
    people: demand.peak,
    rows,
    demand,
    target,
    shortfall: Math.max(0, Math.round(target) - pansPerDay),
    endMin,
    windowMin,
    hours: windowMin / 60,
    // The clock minute 0 of this scenario is, so every time on the screen reads
    // as a time she would say out loud. See clockOf.
    dayStartMin: s.dayStartMin,
    pxPerMin: s.pxPerMin,
    // The modules not yet in this build, so the screen can name what she has
    // parked rather than looking like it simply forgot them.
    parked: facts.filter((f) => !f.on),
  };
}

function none() {
  return { id: "", icon: "•", name: "Nothing yet", output: 0, rate: 0, sub: "Switch a module on." };
}

// ── The bricks themselves ──────────────────────────────────────────────────
//
// The order of the list IS the order of the day: the timeline is read top to
// bottom, and a tie for the wall goes to the earlier brick. So moving one is a
// real edit to the day, not a sorting preference.

export function moveModule(mods, id, dir) {
  const list = (mods || []).slice();
  const at = list.findIndex((m) => m.id === id);
  const to = at + (dir < 0 ? -1 : 1);
  if (at < 0 || to < 0 || to >= list.length) return list;
  const [brick] = list.splice(at, 1);
  list.splice(to, 0, brick);
  return list;
}

export function removeModule(mods, id) {
  return (mods || []).filter((m) => m.id !== id);
}

// A name no other brick is using, so two bricks can never be edited as one.
export function newModuleId(mods) {
  const used = new Set((mods || []).map((m) => String((m || {}).id || "")));
  let n = 1;
  while (used.has(`brick${n}`)) n += 1;
  return `brick${n}`;
}

// A fresh brick, arriving SWITCHED OFF. It is off so that a brick with no
// numbers in it yet cannot become the wall and answer the day with "1 pan" —
// she fills it in and then switches it on, which is also the order she would do
// it in at the bench.
export function blankModule(id) {
  return moduleOf({
    id, icon: "🧱", name: "New brick", on: false, person: 0,
    cycleMin: 15, batch: 1, touchMin: 15, everyMin: 15, repeats: 1, startMin: 0, people: 1,
  });
}

// A copy of a scenario, numbers and all, under a name and an id of its own —
// what "save this as…" writes into the list of scenarios.
export function copyScenario(sc, name, id) {
  const s = scenarioOf(sc);
  return {
    id: String(id || ""),
    name: String(name || s.name),
    note: s.note,
    target: s.target,
    dayStartMin: s.dayStartMin,
    pxPerMin: s.pxPerMin,
    // Copied member by member, so editing one scenario's labels can never
    // rewrite the other's.
    merges: Object.fromEntries(Object.entries(s.merges).map(([k, v]) => [k, [...v]])),
    modules: s.modules.map((m) => ({ ...m })),
  };
}

// ── A brick, handed to the capacity screen ─────────────────────────────────
//
// The two screens answer different questions about the same day, and she asked
// for the one to feed the other: build the day out of bricks here, then ask the
// line what that day can actually deliver.
//
// What crosses over is only what a brick really knows. A brick IS a station —
// its minutes are the hand-work and its batch is the batch — so the capacity
// screen's numbers can be read straight off it, and neither screen invents a
// figure the other one has to trust.
//
// `job` is what makes that mapping a fact rather than a guess: it says which
// station of the line a brick is, and it is kept apart from the brick's name so
// renaming "Wash, oil and fill" to something she prefers cannot silently break
// the link. A brick saved before this existed has no job, so the name is read
// instead — which is why every seeded brick's own name is listed here.
//
// Everything the capacity screen holds that a scenario simply does not know —
// how many pans she owns, how many hours she is willing to bake for — is left
// exactly as she typed it, and the screen says so rather than quietly filling it
// with a zero.
export const LINE_JOBS = [
  { key: "mix", label: "Weighing in and loading the mixer", short: "the mixer", unit: "mix",
    names: ["the mixer", "mixer", "weighing in and loading the mixer"] },
  { key: "wash", label: "Wash, oil and fill", short: "wash, oil and fill",
    names: ["wash, oil and fill", "wash oil and fill"] },
  { key: "scale", label: "Weighing the dough out into pans", short: "weighing the dough out",
    names: ["weighing the dough out into pans", "weigh the dough out into pans"] },
  { key: "top", label: "Dimple and top", short: "dimple and top", names: ["dimple and top"] },
  { key: "oven", label: "The oven swap and bake", short: "the oven", names: ["the oven", "oven"] },
  { key: "cool", label: "Cooling and packing", short: "cooling and packing",
    names: ["cool and pack", "cooling and packing"] },
  { key: "retard", label: "Retard overnight in the chiller", short: "the retard",
    names: ["retard overnight", "retard overnight in the chiller"] },
];

const tidy = (s) => String(s || "").trim().toLowerCase();

// Which station of the line this brick is: the job she picked, or — for a brick
// saved before jobs existed — the name it was seeded with.
export function jobOf(m) {
  const mod = moduleOf(m);
  if (LINE_JOBS.some((j) => j.key === mod.job)) return mod.job;
  const byName = LINE_JOBS.find((j) => j.names.includes(tidy(mod.name)));
  return byName ? byName.key : "";
}

export function jobLabel(key) {
  const j = LINE_JOBS.find((x) => x.key === key);
  return j ? j.label : "";
}

// The three steps the capacity screen wants minutes for EVERY 6 PANS. A brick
// may deal with any batch, so its own minutes are scaled onto six pans — the
// only honest way to hand "30 min for 12 pans" to a field that says "6 pans".
function per6(m) {
  const mod = moduleOf(m);
  if (mod.batch <= 0 || mod.touchMin <= 0) return 0;
  return Math.round(((mod.touchMin * 6) / mod.batch) * 100) / 100;
}

// What this scenario would change on the capacity screen, and what it cannot.
//
// Returned rather than applied, because the screen shows it to her first: these
// are HER measured numbers, and a load that silently overwrote them would be the
// same sin as a website rule quietly hiding a sale.
export function scenarioPlanPatch(saved, plan) {
  const r = computeScenario(saved);
  const now = plan || {};
  const patch = {};
  const lines = [];
  const doubled = [];
  const unmapped = [];

  const take = (key, label, value, unit) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const before = num(now[key]);
    patch[key] = value;
    lines.push({ key, label, unit, from: before, to: value, changes: before !== value });
  };

  const byJob = {};
  for (const f of r.on) {
    const job = jobOf(f);
    if (!job) { unmapped.push(f.name); continue; }
    if (byJob[job]) { doubled.push(jobLabel(job)); continue; }
    byJob[job] = f;
  }

  // The pan she is asking the scenario for, and the hands the bricks need at
  // once — the two numbers the whole exercise is about.
  take("target", "Pans you want on a delivery day", r.target, "pans");
  take("people", "Pairs of hands on a bake day", r.people, "pairs");

  const mix = byJob.mix;
  if (mix) {
    take("mixMin", "Minutes to weigh in and load one mix", mix.touchMin, "min");
    take("mixerPans", "Most dough in one mix, in pans", mix.batch, "pans");
  }
  const mins = { wash: "washMin6", top: "topMin6", cool: "coolMin6", scale: "scaleMin6" };
  for (const [job, key] of Object.entries(mins)) {
    const f = byJob[job];
    if (!f) continue;
    take(key, `Minutes for 6 pans — ${jobLabel(job).toLowerCase()}`, per6(f), "min");
  }
  // The oven brick is the swap and the bake in one: her four minutes of hands
  // and the fifteen the pan is in there. Both cross over.
  const oven = byJob.oven;
  if (oven) {
    take("swapMin6", "Minutes to take 6 out and put 6 in", per6(oven), "min");
    take("ovenPans", "Pans per bake", oven.batch, "pans");
    take("ovenMin", "Minutes per bake", oven.cycleMin, "min");
  }
  const retard = byJob.retard;
  if (retard) take("trays", "Trays of dough your chiller holds", retard.batch, "trays");

  // Every step of the line this scenario had nothing to say about.
  const fed = new Set(Object.keys(byJob));
  const left = LINE_JOBS.filter((j) => !fed.has(j.key)).map((j) => j.label);

  return { patch, lines, left, unmapped, doubled: [...new Set(doubled)], pans: r.pansPerDay, people: r.people };
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

// One line about a scenario, in the same words wherever it is listed — on the
// scenario shelf and on the production line that can load it.
export function scenarioSummary(saved) {
  const mods = Array.isArray(saved && saved.modules) ? saved.modules : [];
  const on = mods.filter((m) => m.on !== false);
  const r = computeScenario(saved);
  return `${r.pansPerDay} ${r.pansPerDay === 1 ? "pan" : "pans"} a day · ${on.length} ${on.length === 1 ? "brick" : "bricks"}`;
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
