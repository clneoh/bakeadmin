// production.js — the focaccia line as a capacity model.
//
// Pure and DOM-free, so the arithmetic can be trusted and tested with
// node --test (test/production.test.js). The screen in views/production.js
// draws whatever this returns and decides nothing itself.
//
// One idea holds the whole thing up: a line's capacity is its slowest station,
// and a day's capacity is that limit held for the hours she will actually bake.
// Every station is expressed in the same unit — pans per hour — so they can be
// compared directly and the lowest one named.

// Every timed task she measured was timed on 6 pans (see /form/).
export const PANS_PER_TASK = 6;

// The numbers she measured on /form/ (19 Sep 2026) and told me directly. These
// are only a starting point: every one is hers to correct on the screen, and
// nothing else in the app reads them.
export const DEFAULT_PLAN = {
  people: 1,      // pairs of hands on a bake day
  hours: 5,       // hours she is willing to bake for
  target: 60,     // pans she wants on a delivery day
  pans: 12,       // baking pans she owns
  trays: 12,      // trays of dough the chiller holds overnight — the day's ceiling
  mixerPans: 25,  // most dough in one mix, in pans
  ovenPans: 6,    // pans per bake
  ovenMin: 15,    // minutes per bake
  ovenShelves: 2, // shelves used
  washMin6: 18,   // wash, oil and fill 6 pans
  topMin6: 8,     // dimple and top 6 pans
  swapMin6: 4,    // take 6 out and put 6 in
};

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// A rate is Infinity when the station cannot limit anything (nothing measured,
// or nothing to measure) — treated as "never the bottleneck" everywhere below.
function ratePerHour(pansPerCycle, minutesPerCycle) {
  const pans = num(pansPerCycle);
  const mins = num(minutesPerCycle);
  if (pans <= 0 || mins <= 0) return Infinity;
  return (pans * 60) / mins;
}

// The plan, merged over the defaults and clamped to something the line can
// actually be asked. Everything below reads the plan through here, and the
// screen reads the same values back out of computeLine().plan — so a number
// shown on screen is always the number the arithmetic used. (A cleared field
// arrives as 0 or "", and a screen that printed "0 pairs of hands" beside a
// calculation that used 1 would be the worst kind of wrong.)
export function planOf(settingsProduction) {
  const p = { ...DEFAULT_PLAN, ...(settingsProduction || {}) };
  const atLeast = (v, floor, fallback) => Math.max(floor, num(v, fallback));
  return {
    people: atLeast(p.people, 1, 1),
    hours: atLeast(p.hours, 0.25, DEFAULT_PLAN.hours),
    target: atLeast(p.target, 0, 0),
    pans: atLeast(p.pans, 0, 0),
    trays: atLeast(p.trays, 0, 0),
    mixerPans: atLeast(p.mixerPans, 0, 0),
    ovenPans: atLeast(p.ovenPans, 0, 0),
    ovenMin: atLeast(p.ovenMin, 0, 0),
    ovenShelves: atLeast(p.ovenShelves, 0, 0),
    washMin6: atLeast(p.washMin6, 0, 0),
    topMin6: atLeast(p.topMin6, 0, 0),
    swapMin6: atLeast(p.swapMin6, 0, 0),
  };
}

// The four things that can hold the line back, each in pans per hour.
//
// The chiller is a day's worth of trays spread over the day, so it reads as a
// rate like the rest — and, at her numbers, that is what makes it obvious that
// the chiller and not the oven is the wall.
//
// The hands are the one shared pool: three jobs, one set of people. Their rate
// is the whole pool's, which is the balanced truth — see allocation() for who
// stands where.
export function stations(plan) {
  const p = planOf(plan);
  const people = p.people;
  const hours = p.hours;

  const labourPerPan =
    (num(p.washMin6) / PANS_PER_TASK) +
    (num(p.topMin6) / PANS_PER_TASK) +
    (num(p.swapMin6) / PANS_PER_TASK);

  const handsRate = labourPerPan > 0 ? (people * 60) / labourPerPan : Infinity;
  const ovenRate = ratePerHour(p.ovenPans, p.ovenMin);
  const panRate = ratePerHour(p.pans, p.ovenMin);
  const trays = num(p.trays);
  const chillRate = trays > 0 ? trays / hours : Infinity;

  return [
    {
      key: "hands", icon: "👋", name: "Your hands", rate: handsRate, plural: true,
      sub: `${people} ${people === 1 ? "pair of hands" : "pairs of hands"} · wash, oil, fill, top, oven swap`,
    },
    {
      key: "chiller", icon: "🧊", name: "The chiller", rate: chillRate,
      sub: `${trays} ${trays === 1 ? "tray" : "trays"} of dough over ${trim(hours)} ${hours === 1 ? "hour" : "hours"}`,
    },
    {
      key: "oven", icon: "🔥", name: "The oven", rate: ovenRate,
      sub: `${num(p.ovenPans)} pans every ${trim(num(p.ovenMin))} min`,
    },
    {
      key: "pans", icon: "🥘", name: "Your pans", rate: panRate, plural: true,
      sub: `${num(p.pans)} pans turning over, one bake at a time`,
    },
  ];
}

// The whole answer, from one plan.
export function computeLine(settingsProduction) {
  const p = planOf(settingsProduction);
  const hours = Math.max(0.25, num(p.hours, DEFAULT_PLAN.hours));
  const rows = stations(p);

  const live = rows.filter((r) => Number.isFinite(r.rate) && r.rate > 0);
  // Ties go to the earlier row, so the hands are named before the oven when both
  // read the same — the hands are the one she can actually move today.
  const bottleneck = live.length
    ? live.reduce((best, r) => (r.rate < best.rate ? r : best))
    : { key: "none", icon: "•", name: "Nothing yet", rate: 0, sub: "Fill in your numbers above." };

  const lineRate = live.length ? bottleneck.rate : 0;
  const dayCapacity = Math.floor(hours * lineRate);

  // The best the line could do with unlimited hands — the ceiling the hands are
  // measured against. When the hands already clear it, more people buy nothing.
  const withoutHands = rows
    .filter((r) => r.key !== "hands" && Number.isFinite(r.rate) && r.rate > 0)
    .map((r) => r.rate);
  const otherRate = withoutHands.length ? Math.min(...withoutHands) : Infinity;

  const labourPerPan =
    (num(p.washMin6) + num(p.topMin6) + num(p.swapMin6)) / PANS_PER_TASK;

  return {
    plan: p,
    hours,
    labourPerPan,
    stations: rows,
    bottleneck,
    lineRate,
    dayCapacity,
    target: Math.max(0, num(p.target)),
    shortfall: Math.max(0, Math.round(num(p.target)) - dayCapacity),
    // How many pairs of hands this line can actually use. Past this, a new
    // person stands around — which is the honest answer to "optimise manpower".
    usefulPeople: usefulPeople(p, otherRate),
    handsRate: rows[0].rate,
    otherRate,
    allocation: allocation(p),
    mixes: mixesFor(p, dayCapacity),
    levers: leversFor(p, dayCapacity),
  };
}

// The fewest pairs of hands that already keep up with everything except the
// hands themselves. One more than this buys no pans.
export function usefulPeople(plan, otherRate = null) {
  const p = planOf(plan);
  const perPan =
    (num(p.washMin6) + num(p.topMin6) + num(p.swapMin6)) / PANS_PER_TASK;
  if (perPan <= 0) return 1;
  let ceil = otherRate;
  if (ceil == null) {
    const hours = Math.max(0.25, num(p.hours, DEFAULT_PLAN.hours));
    const trays = num(p.trays);
    const rates = [
      ratePerHour(p.ovenPans, p.ovenMin),
      ratePerHour(p.pans, p.ovenMin),
      trays > 0 ? trays / hours : Infinity,
    ].filter((r) => Number.isFinite(r) && r > 0);
    ceil = rates.length ? Math.min(...rates) : Infinity;
  }
  if (!Number.isFinite(ceil)) return Math.max(1, num(p.people, 1));
  return Math.max(1, Math.ceil((ceil * perPan) / 60));
}

// Who stands where. With people able to move between the three jobs, the line
// runs fastest when every job finishes at the same moment — so each job's claim
// on the people is its share of the work, and the seats are split by largest
// remainder (so 3 people over shares of 60/27/13% become 2 on the wash and 1
// on the top, not 1 and nobody).
export function allocation(plan) {
  const p = planOf(plan);
  const people = Math.max(1, Math.round(num(p.people, 1)));
  const jobs = [
    { key: "wash", name: "Wash, oil and fill", mins: num(p.washMin6) },
    { key: "top", name: "Dimple and top", mins: num(p.topMin6) },
    { key: "swap", name: "The oven swap", mins: num(p.swapMin6) },
  ];
  const total = jobs.reduce((s, j) => s + j.mins, 0);
  const seats = apportion(jobs.map((j) => j.mins), people);
  return jobs.map((j, i) => ({
    ...j,
    share: total > 0 ? j.mins / total : 0,
    perPan: j.mins / PANS_PER_TASK,
    seats: seats[i],
  }));
}

// Largest-remainder apportionment (Hamilton): hand out the whole seats first,
// then give what is left to the biggest fractional claims.
function apportion(weights, seats) {
  const out = weights.map(() => 0);
  const total = weights.reduce((s, w) => s + (w > 0 ? w : 0), 0);
  if (total <= 0 || seats <= 0) return out;
  const exact = weights.map((w) => ((w > 0 ? w : 0) / total) * seats);
  exact.forEach((v, i) => { out[i] = Math.floor(v); });
  let left = seats - out.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => (b.rem - a.rem) || (a.i - b.i));
  for (let k = 0; k < order.length && left > 0; k += 1, left -= 1) out[order[k].i] += 1;
  return out;
}

// How many mixes a day takes. The mixer is not a station — it only ever splits
// the day into batches, and it only matters when it splits it into more than one.
export function mixesFor(plan, dayCapacity) {
  const p = planOf(plan);
  const per = num(p.mixerPans);
  if (per <= 0 || dayCapacity <= 0) return 1;
  return Math.max(1, Math.ceil(dayCapacity / per));
}

// The moves she could make, each scored by how many pans it actually buys.
// Anything that buys nothing keeps its row and says why, rather than sitting
// there looking like a button that does nothing.
const MOVES = [
  {
    key: "people", label: "One more pair of hands",
    apply: (p) => ({ ...p, people: num(p.people, 1) + 1 }),
    cost: "the help",
  },
  {
    key: "trays", label: "Six more trays",
    apply: (p) => ({ ...p, trays: num(p.trays) + 6 }),
    cost: "the trays",
  },
  {
    key: "pans", label: "Six more pans",
    apply: (p) => ({ ...p, pans: num(p.pans) + 6 }),
    cost: "the pans",
  },
  {
    key: "wash", label: "Wash, oil and fill 10% faster",
    apply: (p) => ({ ...p, washMin6: num(p.washMin6) * 0.9 }),
    cost: "a better routine",
  },
  {
    key: "hours", label: "One more hour in the day",
    apply: (p) => ({ ...p, hours: num(p.hours, DEFAULT_PLAN.hours) + 1 }),
    cost: "your time",
  },
  {
    key: "oven", label: "One more pan per bake",
    apply: (p) => ({ ...p, ovenPans: num(p.ovenPans) + 1 }),
    cost: "a bigger oven",
  },
];

export function leversFor(plan, baseCapacity) {
  const p = planOf(plan);
  return MOVES.map((m) => {
    const next = computeDay(m.apply(p));
    return {
      key: m.key,
      label: m.label,
      cost: m.cost,
      capacity: next.dayCapacity,
      bottleneck: next.bottleneck,
      gain: next.dayCapacity - baseCapacity,
    };
  }).sort((a, b) => (b.gain - a.gain) || a.label.localeCompare(b.label));
}

// The slice of computeLine a lever needs — not the whole answer, so scoring six
// moves never costs six allocations.
function computeDay(plan) {
  const hours = Math.max(0.25, num(plan.hours, DEFAULT_PLAN.hours));
  const live = stations(plan).filter((r) => Number.isFinite(r.rate) && r.rate > 0);
  if (!live.length) return { dayCapacity: 0, bottleneck: { key: "none", name: "Nothing yet" } };
  const bottleneck = live.reduce((best, r) => (r.rate < best.rate ? r : best));
  return { dayCapacity: Math.floor(hours * bottleneck.rate), bottleneck };
}

// 5 not 5.0, 2.5 not 2.50 — for the numbers she reads.
export function trim(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return String(v);
}
