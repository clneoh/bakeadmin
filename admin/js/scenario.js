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

// ── The day she bakes alone ────────────────────────────────────────────────
//
// Her ask, in her own words (22 Sep 2026): *"i need you to create one scenario
// and save it as One baker day. Set the bricks for me, with latest start time
// each brick batch."*
//
// So this is her own bake day from the Production line, set on the one pair of
// hands she actually has. Every brick carries her chain's own minutes, and every
// brick's FIRST cycle is the latest start v145 works out backwards from the oven
// (the anchor is the first 6 pans at the oven at 8:00 am):
//
//   mixing the dough in the tub          4:01 am   (239 min before the oven)
//   the rests and the stretch and folds  4:21 am
//   oil the pans and weigh the dough out 6:24 am
//   into the proofer                     6:39 am
//   dimple and top                       7:24 am
//   the proofer again                    7:30 am
//   the oven swap and the bake           8:00 am   (the anchor, batch 1)
//   cutting and packing                  8:27 am
//
// ONE number is not simply her chain's own offset, and it is the whole finding
// of this scenario: the packing starts at 8:27 am where her chain says 8:15,
// because alone she is still folding the last tub until 8:27 — that is the first
// minute the packing needs nobody else.
//
// The batch rhythm is 81 minutes, not the 40.5 the proofer allows. 40.5 assumes
// somebody is free to feed the cabinet the moment it empties; with one pair of
// hands there is no such minute, because the six jobs of a batch come to 58
// minutes of hands. At 81 minutes every hand-window in the day tiles exactly —
// each one begins where the last one ends — and the proofer is never asked to
// hold two batches at once. Every figure here was swept against the real model
// rather than reasoned out by eye.
//
// Nothing is a gate. Every number is on a brick she can open and move, the way
// all three scenarios in this file are.
export const ONE_BAKER_SCENARIO = {
  id: "s_one_baker_day",
  name: "One baker day",
  note: "Your own bake day on one pair of hands: the six-pan chain end to end, four batches 81 minutes apart, so the packing starts at 8:27 am and the last one comes out of the proofer at 12:30 pm.",
  target: 24,
  // 4 am, because the dough goes into the tub at 4:01 and the first batch is at
  // the oven at eight. Starting the window at four keeps the whole day on one
  // screen without an empty hour in front of it.
  dayStartMin: 240,
  pxPerMin: PX_PER_MIN_DEFAULT,
  merges: {},
  modules: [
    // Her own 20 minutes, and the tub is what a 24-pan day starts four times.
    { id: "solo_mix", icon: "🥣", name: "Mixing the dough in the tub", job: "mix", on: true, person: 0,
      cycleMin: 20, batch: 6, touchMin: 20, everyMin: 81, repeats: 4, startMin: 1, people: 1 },
    // The four rests with a stretch and fold inside each: 4 x 30 + 3 x 1 = 123
    // minutes, of which three are her hands. Marked as overlapping because the
    // dough is what is holding the time — she is free to be somewhere else, which
    // is exactly the criterion v140 put the switch behind. Nothing here is
    // clamped, so the rest runs as long as the rest runs.
    { id: "solo_fold", icon: "🫙", name: "The rests and the stretch and folds", on: true, person: 0,
      cycleMin: 123, batch: 6, touchMin: 3, everyMin: 81, repeats: 4, startMin: 21, people: 1,
      overlap: true },
    { id: "solo_scale", icon: "🥘", name: "Oil the pans and weigh the dough out", job: "scale", on: true, person: 0,
      cycleMin: 15, batch: 6, touchMin: 15, everyMin: 81, repeats: 4, startMin: 144, people: 1 },
    // No hands at all: the dough waits in the cabinet. It appears twice because
    // her day does — the pans go in, come out to be dimpled one at a time, and go
    // back in.
    { id: "solo_proof1", icon: "🌡️", name: "Into the proofer", on: true, person: 0,
      cycleMin: 45, batch: 6, touchMin: 0, everyMin: 81, repeats: 4, startMin: 159, people: 1 },
    { id: "solo_top", icon: "🫳", name: "Dimple and top", job: "top", on: true, person: 0,
      cycleMin: 6, batch: 6, touchMin: 6, everyMin: 81, repeats: 4, startMin: 204, people: 1 },
    { id: "solo_proof2", icon: "🌡️", name: "The proofer again", on: true, person: 0,
      cycleMin: 30, batch: 6, touchMin: 0, everyMin: 81, repeats: 4, startMin: 210, people: 1 },
    // Her anchor: the first six pans are at the oven at 8:00 am, which is the
    // minute the whole card is counted backwards from.
    { id: "solo_oven", icon: "🔥", name: "The oven swap and the bake", job: "oven", on: true, person: 0,
      cycleMin: 15, batch: 6, touchMin: 2, everyMin: 81, repeats: 4, startMin: 240, people: 1 },
    { id: "solo_pack", icon: "📦", name: "Cutting and packing", job: "cool", on: true, person: 0,
      cycleMin: 12, batch: 6, touchMin: 12, everyMin: 81, repeats: 4, startMin: 267, people: 1 },
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

// A person is a number from 0 to 8, where 0 means "whoever is free". Clamped in
// one place so a brick, a line and a combination cannot disagree about what a
// person is.
const clampPerson = (v) => Math.max(0, Math.min(8, Math.round(num(v, 0))));

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

// The start minute of every cycle, one per repeat — the list that lets each
// cycle of a brick be its own thing she can move.
//
// It is BUILT here rather than merely kept, so a brick's cycle count and its
// cycle times can never disagree: a stored list is adopted, an absent or short
// one is continued at the brick's own pace, and a long one is cut back to what
// she asked for. That last part is what lets the day's limit hold fewer cycles
// than she planned without losing where she put the ones that do run.
//
// A brick she has never dragged comes out as `startMin + k * everyMin`, which is
// exactly the sum this file did before the list existed — so every scenario built
// earlier keeps its day to the minute.
//
// The two knobs must agree about cycle 1, and this is where they are made to:
// the start-time box writes `startMin`, a drag writes `starts`, and when she
// TYPES a new start the list is re-based onto it. So a typed number always moves
// the brick, and the shape she dragged — the cycles that are no longer evenly
// spaced — comes with it instead of being silently overruled by a stale list.
function startsOf(src, rawStart, n, everyMin) {
  const given = Array.isArray(src)
    ? src.map((v) => Number(v)).filter((v) => Number.isFinite(v)).map((v) => Math.max(0, v))
    : [];
  // With no start time of its own, the list's own first cycle IS the start.
  const base = given.length && !Number.isFinite(Number(rawStart))
    ? given[0]
    : Math.max(0, num(rawStart, 0));
  const out = [];
  for (let k = 0; k < n; k += 1) {
    if (k < given.length) out.push(base + (given[k] - given[0]));
    else if (given.length) out.push(out[given.length - 1] + (k - given.length + 1) * everyMin);
    else out.push(base + k * everyMin);
  }
  // Rounded to a hundredth of a minute so a dragged-then-chained time cannot
  // accumulate float dust, and so what she stores is readable.
  return out.map((v) => Math.max(0, Math.round(v * 100) / 100));
}

export function moduleOf(m) {
  const src = m || {};
  const cycleMin = atLeast(src.cycleMin, 0, 0);
  // A module with no gap of its own runs back to back, which is what "every
  // cycle time" means for a simple machine.
  const everyMin = atLeast(src.everyMin, 0, 0) || cycleMin;
  const repeats = Math.max(1, Math.round(atLeast(src.repeats, 1, 1)));
  const starts = startsOf(src.starts, src.startMin, repeats, everyMin);
  const person = clampPerson(src.person);
  const count = Math.max(1, Math.min(8, Math.round(atLeast(src.count, 1, 1))));
  // Who is on each line, built to be exactly `count` long the same way `starts`
  // is built to be exactly `repeats` long: one name per line she has, the ones
  // she set kept, a line she has only just bought filled from the person she gave
  // the brick. Short is continued and long is cut back rather than the whole list
  // being thrown away, so raising how many of a brick she has does not forget
  // which worker was on which line.
  const given = Array.isArray(src.crew) ? src.crew : [];
  const crew = [];
  for (let i = 0; i < count; i += 1) {
    const stored = num(given[i], NaN);
    crew.push(Number.isFinite(stored) ? clampPerson(stored) : person);
  }
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
    everyMin,
    repeats,
    // When each cycle starts. Cycle 1's time IS the brick's start time, and they
    // are kept equal HERE rather than left to agree by hand — otherwise dragging
    // the first cycle and typing a start could drift apart and the brick would
    // have two answers to one question.
    starts,
    startMin: starts[0],
    // How many of this brick she has: two mixers, two ovens, two chillers, two
    // people folding. See moduleFacts for what a second one buys, and for the one
    // thing it does not — it never invents cycles she did not plan. It also
    // relaxes the brick's own lot-at-a-time rule to one lot per brick she has;
    // `overlap` is the switch that takes that rule off altogether. And because
    // the rule takes them in TURNS — cycle 3 waits on cycle 1 — two of them are
    // two LINES, the odd lots on one and the even lots on the other, which is how
    // the screen draws them. See linesInForce.
    count,
    // Whether this brick waits for the brick above it: its cycle 10 cannot start
    // until the brick before it has finished its own cycle 10. See chainLine.
    follow: src.follow === true,
    // Whether this brick may hold two lots at once. Off, one lot at a time (or one
    // per brick, with `count`); on, her own times stand and the chain above is the
    // only thing left that can move them. See chainLine for the criteria.
    overlap: src.overlap === true,
    people: Math.max(1, Math.round(atLeast(src.people, 1, 1))),
    // Who is on each line — one name per line she has, so a brick worked by two
    // people is two people on the screen and a worker can be given one job rather
    // than the whole day. 0 = whoever is free.
    crew,
    // 0 = whoever is free. 1..8 = that person, by name, so two bricks can be
    // given to one person and the collision drawn rather than hidden. Kept EQUAL
    // to the first line's person here, the same way startMin is kept equal to the
    // first cycle's start, so a brick cannot answer "who is on you" two ways.
    person: crew[0],
  };
}

// How many LINES this brick is worked as: its copies, when they really do take
// turns. Two of them means cycles 1, 3, 5 on the first line and 2, 4, 6 on the
// second — which is what `count` already means in chainLine — so each line can be
// given its own person.
//
// Zero means "not drawn as lines", and there are two ways to get there: a brick
// she has one of, and a brick whose overlap switch is on. With overlap on its
// cycles no longer take turns per copy at all (the clamp is off), so a per-line
// person would be a claim the arithmetic does not support — the brick keeps the
// one person she gave it, and its crew is kept in storage untouched for the day
// she switches the lines back on.
export function linesInForce(m) {
  const mod = moduleOf(m);
  return mod.count > 1 && !mod.overlap ? mod.count : 0;
}

// When each pass of a module happens. Every module — a single mix and a fold
// loop alike — is the same list of passes; the loop is simply one with more of
// them, which is why the fold needs no concept of its own.
export function passesOf(m) {
  const mod = moduleOf(m);
  const out = [];
  for (let k = 0; k < mod.repeats; k += 1) {
    const at = mod.starts[k];
    out.push({
      at,
      end: at + mod.cycleMin,
      // Which line this lot is on: the copies take the lots in turn, so cycle 1
      // and cycle 3 are the same pair of hands. This is the single place the pass
      // list is built, so everything downstream — the bars, the people, the
      // collisions — reads the same answer.
      line: k % mod.count,
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
  //
  // Two of a brick is two of that capacity — two chillers hold twice the bins,
  // two mixers fit twice the mixes — so the day's room multiplies by how many
  // she has. At one, which is where every brick starts, this is the old sum
  // exactly.
  const fitsInDay = mod.everyMin > 0
    ? mod.count * Math.max(1, Math.floor(DAY_MIN / mod.everyMin))
    : mod.repeats;
  // What she asked for, and what the day allows. The second is what the line
  // actually passes — see DAY_MIN for why this is not a detail.
  const repeatsHeld = Math.min(mod.repeats, fitsInDay);
  const held = { ...mod, repeats: repeatsHeld };
  const passes = passesOf(held);
  return {
    ...mod,
    passes,
    // Minutes of the module for every pan through it — the same shape as the
    // capacity model's "minutes a pan", so the two screens can be compared.
    perPan: mod.batch > 0 ? perPass : 0,
    // Pans out of this module across the whole scenario. The line can only pass
    // what its stingiest module passes, so this is what the day is measured on.
    // Note what is NOT here: `count`. A second mixer does not make pans she did
    // not plan — it makes the CYCLES she planned achievable. To put a second one
    // to work she raises how many times the brick runs, which is the climb's job.
    output: mod.batch * repeatsHeld,
    // Pans an hour, from this module's own pace — and twice that with two of it.
    rate: mod.everyMin > 0 && mod.batch > 0
      ? (mod.count * mod.batch * 60) / mod.everyMin
      : 0,
    // Minutes of a person for the whole scenario, and for every pan.
    touchTotal: mod.touchMin * repeatsHeld,
    needsYou: mod.touchMin > 0,
    // The end of the last cycle that actually runs, read off the cycles rather
    // than worked out from a formula. So a cycle she has dragged later lengthens
    // the day instead of being contradicted by it, and a brick she has never
    // touched still ends exactly where it always did: the last cycle sits at
    // `startMin + (repeatsHeld-1) * everyMin`, which is this same number.
    endMin: passes.reduce((t, p) => Math.max(t, p.end), mod.startMin + mod.cycleMin),
    fitsInDay,
    repeatsHeld,
    // How many lines this brick is worked as, or 0 when it is not drawn as lines
    // at all. Decided here, once, so the bars, the people rows and the collisions
    // all read the same answer rather than each working it out. See linesInForce.
    lines: mod.count > 1 && !mod.overlap ? mod.count : 0,
    // True when she has asked for more passes than a day can hold. The screen
    // says so out loud rather than quietly counting fewer.
    capped: repeatsHeld < mod.repeats,
  };
}

// ── The chain ──────────────────────────────────────────────────────────────
//
// Her line, said as one rule: cycle 10 of a brick cannot start until the brick
// before it has finished ITS cycle 10. A cycle is one lot of dough and a brick
// is one station, so this is what a real batch line does — a slow fold holds
// every later lot up behind it, and that is the thing she is trying to plan away.
//
// It is one forward pass down the list, and every cycle's real start is the
// latest of three answers:
//
//   * where SHE put it — the time she dragged, or the brick's own pace
//   * what the brick itself allows — one of it cannot begin cycle 3 until cycle 2
//     has finished; two of it (count) cannot begin cycle 3 until cycle 1 has
//   * what the brick above allows, when this brick waits for it
//
// The latest of the three is the honest one, and it makes a dragged time a floor
// she sets rather than a wall she is stopped by: she can always push a cycle
// later, and the chain carries that same cycle down the rest of the line with it.
//
// The middle one is the brick's own machine, and it is the one she asked to be
// able to switch off: "allow each brick cycle to overlap". `cycleMin` can mean
// two different things on two different bricks. On a wash it is minutes the sink
// is busy, so two lots really cannot be in it. On her fold it is dough RESTING,
// and folding a second lot while the first rests is the whole trick of the day.
// Only she can tell those apart, so `overlap` is the brick saying which it is:
// off (where every brick starts) keeps one lot at a time, and on takes the
// self-clamp away so her own times stand. Even then the chain still holds it, so
// overlap never lets a lot start before the dough exists.
//
// A switched-off brick is not in the build, so nothing waits on it — the chain
// steps over it to the last brick that IS running, which is what happens at the
// bench when a machine is not switched on.
export function chainLine(modules) {
  const list = (modules || []).map(moduleOf);
  const placed = new Map();
  const ends = new Map();
  let prev = null;

  for (const m of list) {
    const out = [];
    const ownEnds = [];
    // One lot at a time per machine, so cycle k waits on cycle k-count — and a
    // brick she has said may overlap its own cycles skips this entirely, leaving
    // the chain above as the only thing that can still move one of her times.
    const gap = m.overlap ? 0 : m.count;
    for (let k = 0; k < m.repeats; k += 1) {
      let at = m.starts[k];
      if (gap > 0 && k >= gap) at = Math.max(at, ownEnds[k - gap]);
      if (m.follow && prev) {
        const up = ends.get(prev.id) || [];
        if (up.length) {
          // A brick above with fewer cycles than this one cannot answer for a
          // cycle it does not have, so this waits on the last one it does — and
          // the screen says so rather than inventing a time for it.
          at = Math.max(at, up[Math.min(k, up.length - 1)]);
        }
      }
      out.push(at);
      ownEnds.push(at + m.cycleMin);
    }
    placed.set(m.id, out);
    ends.set(m.id, ownEnds);
    if (m.on) prev = m;
  }

  // startMin is written back with the list, so that reading this result through
  // moduleOf a second time is a no-op. Without it the re-basing in startsOf would
  // pull a chained brick back to where she typed it, and the chain would undo
  // itself the moment anything re-read the brick.
  return list.map((m) => ({ ...m, starts: placed.get(m.id), startMin: placed.get(m.id)[0] }));
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
        module: f.id, icon: f.icon, name: f.name,
        // The person on THIS lot's line — so a brick worked as two lines gives
        // its odd lots to one worker and its even lots to the other. A brick that
        // is not drawn as lines has one person, and `crew` was built from that
        // same number, so both roads lead to the person she named.
        person: f.lines && f.crew ? (f.crew[p.line] || 0) : (f.person || 0),
        // Which line it came off, so a job on a person's row can say so and a
        // clash can name which line of which brick collided with what.
        line: f.lines ? p.line : -1,
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

// How many different PLACES one person has to be in the day. It is the number she
// is planning down — one worker in one place is a worker who can be taught one job
// — so it belongs to the person's own row, not to the drawing.
//
// A LINE of a brick is a place of its own, which is the whole reason this is not a
// count of bricks: two lines of one fold running at once are two places, and a
// count of bricks alone read exactly that doubling-up as one place — the one thing
// the row was there to show. `line` is -1 on a brick that is not drawn as lines, so
// a brick she has one of counts exactly as it always did.
export function placesOn(row) {
  const items = (row && row.items) || [];
  return new Set(items.map((w) => `${w.module}:${w.line}`)).size;
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
  // The chain first, for the whole line in its own order, and only then the
  // facts — so every brick below is read at the time it will ACTUALLY run rather
  // than the time she typed. With nothing set to wait, the times this hands over
  // are the ones the bricks already had, which is what keeps every scenario
  // built before the chain existed reading exactly as it did.
  const facts = chainLine(s.modules).map((m) => ({ ...moduleFacts(m), on: m.on }));

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
  // The run as a length in its own right: from the first thing that happens to
  // the last, which is the "shorter hours" she is trying to buy. Kept here
  // rather than worked out in the view so the number she reads under the fact
  // grid and the number in the plan's cost line cannot drift apart.
  const firstMin = on.length ? on.reduce((m, f) => Math.min(m, f.startMin), endMin) : 0;
  const runMin = Math.max(0, endMin - Math.min(firstMin, endMin));

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
    // And the rest of what the plan costs, in the words she used for the point
    // of all this: "less man, less manhours, shorter hours". These are the other
    // two. Minutes of a person is summed per ROW, so two bricks given to one
    // person are that person's minutes and not two people's.
    personMin: rows.reduce((t, row) => t + (row.busy || 0), 0),
    rows,
    demand,
    target,
    shortfall: Math.max(0, Math.round(target) - pansPerDay),
    endMin,
    firstMin,
    runMin,
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
    // `starts` is copied by hand because it is a LIST: a plain spread would give
    // both scenarios the same array, and dragging one cycle in one of them would
    // silently move the other. A brick that has never had a cycle dragged has no
    // list at all — every brick on her phone today — so it is left without one
    // and the brick's own start and pace generate it, exactly as before.
    modules: s.modules.map((m) => ({
      ...m,
      starts: Array.isArray(m.starts) ? [...m.starts] : undefined,
      // Who is on each line is a list for the same reason, and is copied the same
      // way: two scenarios must never share one line's person.
      crew: Array.isArray(m.crew) ? [...m.crew] : undefined,
    })),
  };
}

// One person's work, moved onto another — the two taps behind "Combine two…".
//
// Pure, and here rather than in the screen, because the LINES have to come with
// the bricks: a brick worked as two lines carries one person per line, so moving
// a person means rewriting every line that named them. Miss that and a line would
// point at a number with no row left under it — the work would still be done, by
// nobody, on a screen that showed nothing wrong.
//
// What moves is only who is standing at the brick. Every brick keeps the job it
// does and the minutes it takes; whatever collides afterwards is exactly the
// manpower the combination cannot pay for, which is the answer she is after.
export function combinedScenario(saved, into, from) {
  const s = scenarioOf(saved);
  const keep = clampPerson(into);
  const gone = clampPerson(from);
  const merges = { ...(s.merges || {}) };
  const fromMembers = merges[String(gone)] || [];
  const members = [...new Set([...(merges[String(keep)] || []), gone, ...fromMembers])]
    .filter((w) => w !== keep).sort((a, b) => a - b);

  const modules = s.modules.map((m) => {
    if (!m.crew.some((p) => p === gone)) return m;
    const crew = m.crew.map((p) => (p === gone ? keep : p));
    return { ...m, crew, person: crew[0] };
  });

  delete merges[String(gone)];
  merges[String(keep)] = members;
  return { ...s, modules, merges };
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
  // Set when either of the two bricks that share the oiling-and-weighing-out
  // field fed it, so that step is not then reported as one the scenario said
  // nothing about.
  let scaleFed = false;

  const take = (key, label, value, unit) => {
    if (!Number.isFinite(value) || value <= 0) return;
    const before = num(now[key]);
    patch[key] = value;
    lines.push({ key, label, unit, from: before, to: value, changes: before !== value });
  };

  const byJob = {};
  for (const f of r.on) {
    const job = jobOf(f);
    // A retard brick is named rather than carried. The chiller is a what-if she
    // has not bought, so it is not a station of the line she has any more, and
    // writing its trays onto a field that no longer exists would be the screen
    // quietly accepting a number it then does nothing with.
    if (!job || job === "retard") { unmapped.push(f.name); continue; }
    if (byJob[job]) { doubled.push(jobLabel(job)); continue; }
    byJob[job] = f;
  }

  // The pan she is asking the scenario for, and the hands the bricks need at
  // once — the two numbers the whole exercise is about.
  take("target", "Pans you want on a delivery day", r.target, "pans");
  take("people", "Pairs of hands on a bake day", r.people, "pairs");

  const mix = byJob.mix;
  if (mix) {
    take("mixMin", "Minutes to mix one tub of dough", mix.touchMin, "min");
    take("mixerPans", "Pans one tub of dough makes", mix.batch, "pans");
  }

  // The wash and the weighing-out are one job under two names now, so a brick of
  // either kind fills the one field. A scenario holding both was counting the
  // same work twice; the fuller of the two is taken, which is the reading that
  // never understates her hands, and it is hers to correct either way.
  const feeding = [byJob.scale, byJob.wash].filter(Boolean);
  if (feeding.length) {
    const f = feeding.reduce((best, x) => (per6(x) > per6(best) ? x : best));
    take("scaleMin6", "Minutes to oil the pans and weigh the dough out, for 6 pans", per6(f), "min");
    // One job, one field: whichever of the two bricks fed it, both of its old
    // names are answered for, so neither is then reported as a step this scenario
    // said nothing about while the screen fills that very step in.
    scaleFed = true;
  }

  for (const [job, key] of Object.entries({ top: "topMin6", cool: "coolMin6" })) {
    const f = byJob[job];
    if (!f) continue;
    take(key, `Minutes for 6 pans — ${jobLabel(job).toLowerCase()}`, per6(f), "min");
  }

  // The oven brick is the swap and the bake in one: her two minutes of hands and
  // the fifteen the pan is in there, and the two together are one oven turn.
  const oven = byJob.oven;
  if (oven) {
    take("swapMin6", "Minutes to take 6 pans out and put 6 in", per6(oven), "min");
    take("ovenPans", "Pans per bake", oven.batch, "pans");
    take("ovenMin", "Minutes one oven turn takes, bake and swap together", oven.cycleMin, "min");
  }

  // Every step of the line this scenario had nothing to say about. The retard is
  // not one of them — it is not a step of this line at all — so it is left out of
  // both lists rather than appearing on one of them twice.
  const fed = new Set(Object.keys(byJob));
  if (scaleFed) { fed.add("wash"); fed.add("scale"); }
  const left = LINE_JOBS.filter((j) => j.key !== "retard" && !fed.has(j.key)).map((j) => j.label);

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
  // Counted with `count`, exactly as moduleFacts counts it, so the rung the
  // ladder proposes is a rung the day can really hold — with two of the brick
  // the day has twice the room.
  const fits = mod.everyMin > 0
    ? mod.count * Math.max(1, Math.floor(DAY_MIN / mod.everyMin))
    : need;
  return Math.min(need, fits);
}

// The whole climb, run to the end: keep relieving whatever is the wall until the
// target is met or the number stops moving. Each step is one module and one
// change, so the list reads as the order she would actually do them in.
//
// There are TWO ways to relieve one brick, and the ladder tries them in the
// order they cost her money:
//
//   more often   raise `repeats` — free, and the first thing to try
//   a second one raise `count` — the buying decision, and the ONLY answer left
//                when the day is already full: a 12-hour retard that fits twice
//                cannot be made to fit a third time by willpower
//
// The second rung has to raise `repeats` as well, or it would buy nothing: a
// second chiller holds twice the bins but it does not run the cycles she did not
// plan, so the rung asks for the cycles the target needs AND the second machine
// that can hold them.
//
// It stops on repetition as well as on success — a module that is still the wall
// after both rungs have been tried cannot be fixed by either, and looping on it
// for ever would be a hung screen rather than an answer. That is why the guard is
// per brick AND per rung.
export function climbSteps(saved, target, limit = 12) {
  const want = Math.max(0, Math.round(num(target, 0)));
  let scenario = scenarioOf(saved);
  const steps = [];
  const seen = new Set();

  for (let i = 0; i < limit; i += 1) {
    const now = computeScenario(scenario);
    if (want <= 0 || now.pansPerDay >= want) {
      return { steps, reached: want > 0 && now.pansPerDay >= want, end: now, want };
    }
    const w = now.wall;
    if (!w.id || w.batch <= 0) return { steps, reached: false, end: now, want };

    const more = repeatsToPass(w, want);
    const kind = more > w.repeats ? "repeats" : "count";
    if (seen.has(`${w.id}:${kind}`)) return { steps, reached: false, end: now, want };
    seen.add(`${w.id}:${kind}`);

    const from = kind === "repeats" ? w.repeats : w.count;
    const to = kind === "repeats" ? more : w.count + 1;
    // What the second one has to be fed to be worth buying. This is the day's
    // room for the brick WITH the extra one, asked of the model itself so the
    // rung and the arithmetic can never disagree.
    const roomier = kind === "count" ? moduleFacts({ ...w, count: to }).fitsInDay : 0;

    // What this rung writes into the brick. A rung that buys a second one has to
    // raise the cycles too, or the second one has nothing to do — the day's room
    // doubles but the pans she asked for do not. The step carries the change it
    // made, so the button that applies the ladder cannot write a different one.
    const change = kind === "count"
      ? { count: to, repeats: Math.max(w.repeats, Math.min(wantCycles(w, want), roomier)) }
      // Re-spaced from `startMin` at the brick's own pace: a new cycle count is a
      // new rhythm, and leaving the old times behind would place the extra
      // cycles wherever the last one happened to be.
      : { repeats: to, starts: undefined };
    scenario = {
      ...scenario,
      modules: scenario.modules.map((x) => (x.id === w.id ? { ...x, ...change } : x)),
    };
    const next = computeScenario(scenario);
    steps.push({
      id: w.id,
      kind,
      module: w.name,
      icon: w.icon,
      from,
      to,
      batch: w.batch,
      before: now.pansPerDay,
      after: next.pansPerDay,
      wallThen: next.wall,
      patch: change,
    });
  }
  return { steps, reached: false, end: computeScenario(scenario), want };
}

// How many cycles this brick would have to run to pass `want` pans.
function wantCycles(module, want) {
  const batch = num(module.batch);
  if (batch <= 0) return 1;
  return Math.max(1, Math.ceil(num(want) / batch));
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

// Where the time cursor points, as minutes from the start of her day, from the
// px offset she is pointing at. It reads off the same five-minute step a dragged
// bar clicks to, so the cursor can never name a time the screen could not also
// set; and it answers null — rather than guessing — when the pointer is past
// either end of the day, which is the caller's cue to take the cursor away. A
// minute is the only thing this returns: it reads the chart, and writes nothing.
export function minuteAtPx(px, pxPerMin, windowMin) {
  const scale = num(pxPerMin);
  const x = Number(px);
  if (!(scale > 0) || !Number.isFinite(x)) return null;
  const mins = x / scale;
  if (mins < 0 || mins > num(windowMin)) return null;
  // Snapped to the five-minute step a dragged bar clicks to — and never past the
  // end of the day, which does not always end on a five.
  return Math.min(Math.round(mins / 5) * 5, num(windowMin));
}
