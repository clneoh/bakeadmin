// The scenario planner's model. The figures asserted here are the ones the whole
// screen rests on, and they are worked out by hand from the seeded day rather
// than read off the code: nine modules on, eleven modules in the list, and the
// smallest thing any of them passes is what the day can deliver.
//
// The one that matters most is the last: the chiller. Twelve trays held for a
// twelve-hour retard is twelve pans a day, and the same arithmetic read the
// other way says how many trays a bigger day would need. If this file ever
// disagrees with that, the screen is lying to her.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_DAY_START, DEFAULT_SCENARIO, PX_PER_MIN_CHOICES, blankModule, chainLine, clockOf,
  climbSteps, combinedScenario, computeScenario, concurrency, copyScenario, hoursAndMinutes,
  linesInForce, minuteAtPx, moduleFacts, moduleOf, moveModule, newModuleId, passesOf,
  peopleRows, placesOn, removeModule, repeatsToPass, scenarioOf, touchWindows,
  LINE_JOBS, jobOf, scenarioPlanPatch, scenarioSummary, SISTER_SCENARIO,
} from "../admin/js/scenario.js";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg} (got ${a})`);
const of = (r, id) => r.modules.find((m) => m.id === id);

// A brick with only the numbers a test cares about spelled out, so the test says
// what it is testing rather than spending ten lines setting up a kitchen.
const brick = (m) => ({
  id: "b", name: "A brick", on: true, cycleMin: 10, batch: 1, touchMin: 0,
  everyMin: 10, repeats: 1, startMin: 0, people: 1, ...m,
});
// A scenario of nothing but the bricks handed in, so a test about the line is
// never accidentally also a test about the seeded day.
const scenario = (s) => ({ ...DEFAULT_SCENARIO, target: 0, modules: [], ...s });

test("the seeded day makes twelve pans, and the chiller is what stops it", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  assert.equal(r.pansPerDay, 12, "one 12-tray pass over the chiller is the smallest output on the line");
  assert.equal(r.wall.id, "load", "ties go to the earliest module in the day's order");
  near(r.cycleMin, 1.25, "15 minutes to load 12 pans is 48 pans an hour, so a pan every 1.25 min");
});

test("the chiller is one limit wearing three hats, and the screen says so", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  // Loading, retarding and unloading all pass the same 12, because they are the
  // same trays counted three times. Relieving only one of them buys nothing.
  const tied = r.on.filter((f) => f.id !== "load" && f.output === 12).map((f) => f.id);
  assert.deepEqual(tied, ["retard", "unload"]);
  assert.equal(of(r, "mixer").output, 28);
  assert.equal(of(r, "fold").output, 112);
});

test("the fridge is a module in the list and out of the scenario", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  assert.equal(r.on.some((f) => f.id === "fridge"), false);
  assert.deepEqual(r.parked.map((m) => m.id), ["fridge"]);
  // A module that is off cannot hold the day back.
  assert.notEqual(r.wall.id, "fridge");
});

test("the seeded day is one pair of hands", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  assert.equal(r.people, 1);
  assert.equal(r.rows.length, 1);
  // The two ways of counting the same thing must agree: a greedy colouring of
  // the touch windows cannot find fewer people than the peak overlap.
  assert.equal(r.demand.peak, r.rows.length);
});

test("the day runs through the night, so the window is a full 24 hours", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  // The last pack finishes at 1095 + 5x15 + 12.
  assert.equal(r.endMin, 1182);
  assert.equal(r.windowMin, 1440, "a day, because the retard is in it");
  assert.equal(r.hours, 24);
});

test("a start time moved is a person added — the whole point of the screen", () => {
  const sc = scenarioOf(DEFAULT_SCENARIO);
  assert.equal(computeScenario(sc).people, 1);

  // Move one packing pass onto a pass of topping and the day needs two people,
  // while everything the line makes stays exactly the same.
  const moved = { ...sc, modules: sc.modules.map((m) => (m.id === "pack" ? { ...m, startMin: 1008 } : m)) };
  const after = computeScenario(moved);
  assert.equal(after.people, 2, "topping 1008-1016 and packing 1008-1020 need two pairs of hands");
  assert.equal(after.pansPerDay, 12, "and not one pan more or less comes off the line");
});

test("a 12-hour retard fits twice in a day, and the model will not pretend otherwise", () => {
  // The one figure that keeps this screen honest. Three 12-hour retards is 36
  // hours of work in a 24-hour day, and the ladder is not allowed to propose it
  // — otherwise it would promise 36 pans and hide the real answer, more trays.
  const retard = moduleFacts({ id: "r", cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 5 });
  assert.equal(retard.fitsInDay, 2);
  assert.equal(retard.repeatsHeld, 2, "five passes asked for, two of them a day can hold");
  assert.equal(retard.capped, true);
  assert.equal(retard.output, 24, "twelve trays twice a day is twenty-four pans, and that is the ceiling");
  assert.equal(repeatsToPass(retard, 36), 2, "and it will not be talked up to three");
});

test("the ladder climbs while the day has room, then names what to buy", () => {
  // Thirty-six pans is not reachable by running anything MORE OFTEN: a 12-hour
  // retard fits twice in a day on one chiller, and the chiller holds twelve bins.
  // So the ladder runs out of free rungs exactly where she asked it to change the
  // subject — and it changes it to the thing that buys the number: a SECOND
  // chiller, which holds twice the bins and so makes a third retard possible at
  // all. Every rung it names is still one the day can really hold.
  const climb = climbSteps(DEFAULT_SCENARIO, 36);
  assert.equal(climb.reached, true);
  assert.equal(climb.end.pansPerDay, 36);
  // The free rungs come first, and they are the same ones they always were.
  assert.deepEqual(climb.steps.slice(0, 3).map((s) => s.id), ["load", "retard", "unload"]);
  assert.deepEqual(climb.steps.slice(0, 3).map((s) => [s.from, s.to]), [[1, 3], [1, 2], [1, 2]]);
  assert.ok(climb.steps.slice(0, 3).every((s) => s.kind === "repeats"), "free rungs come first");
  assert.equal(climb.steps[0].before, 12);
  assert.equal(climb.steps[0].wallThen.id, "retard", "relieving the first tie reveals the next");
  assert.equal(climb.steps[2].after, 24);
  // And then it stops proposing more runs and starts naming what to buy.
  const buys = climb.steps.filter((s) => s.kind === "count");
  assert.ok(buys.length >= 1, "the ladder reaches the buying decision instead of stopping short");
  const retard = climb.end.modules.find((m) => m.id === "retard");
  assert.equal(retard.count, 2, "the buying decision lands on the brick as two of it");
  assert.equal(retard.repeats, 3, "and it carries the cycles that second one makes possible");
  assert.ok(retard.repeatsHeld <= retard.fitsInDay, "and never a cycle the day cannot hold");
  assert.equal(retard.output, 36, "twelve bins, three times, on the chiller she would own two of");
});

test("a number the day can hold is still climbed to, all the way", () => {
  // Twenty-four is reachable, and the ladder gets there inside the day's limit.
  const climb = climbSteps(DEFAULT_SCENARIO, 24);
  assert.equal(climb.reached, true);
  assert.equal(climb.end.pansPerDay, 24);
  assert.deepEqual(climb.steps.map((s) => s.id), ["load", "retard", "unload"]);
});

test("a climb that runs out of rungs says so rather than pretending it arrived", () => {
  // A thousand pans a day is nothing this line is going to do, and the ladder is
  // capped: three rungs in, the chiller chain is relieved and the day itself is
  // the wall — which is where the climb has to stop and change the subject.
  const climb = climbSteps(DEFAULT_SCENARIO, 1000, 3);
  assert.equal(climb.reached, false);
  assert.equal(climb.steps.length, 3);
  assert.equal(climb.end.pansPerDay, 24, "the day's own limit, not her hands");
  assert.equal(climb.end.wall.id, "retard");
});

test("the trays a day needs is the same arithmetic as the pans a day", () => {
  // trays = pans a day x retard hours / 24 — the formula this line has used all
  // along, now holding the ladder to account. Thirty-six pans on a twelve-hour
  // retard wants eighteen trays, and twelve trays cannot stand in for them: a
  // day holds two twelve-hour retards, not three. That difference IS the buying
  // decision, so it is worth a test.
  const r = computeScenario(DEFAULT_SCENARIO);
  const retard = r.modules.find((m) => m.id === "retard");
  near((36 * retard.cycleMin) / 1440, 18, "36 pans over a 720-minute retard needs 18 trays");
  assert.equal(repeatsToPass(retard, 36), 2, "but 12 trays cannot be passed 3 times in a day");
  assert.equal(retard.batch * repeatsToPass(retard, 36), 24, "so twelve trays tops out at 24 pans");
});

test("a module with no gap of its own runs back to back", () => {
  const m = moduleOf({ id: "x", cycleMin: 20, batch: 4, touchMin: 5, repeats: 3, startMin: 10 });
  assert.equal(m.everyMin, 20, "an unset gap is the cycle time, not zero");
  assert.deepEqual(passesOf(m).map((p) => p.at), [10, 30, 50]);
});

test("a touch longer than its pass is clamped to the pass", () => {
  const [p] = passesOf({ cycleMin: 5, batch: 1, touchMin: 30, repeats: 1, startMin: 0 });
  assert.equal(p.touchTo, 5, "you cannot still be at a module the dough has left");
});

test("a module is a whole pass or nothing, and never a fraction of one", () => {
  const m = moduleFacts({ id: "x", cycleMin: 15, batch: 6, touchMin: 0, everyMin: 15, repeats: 6 });
  assert.equal(m.output, 36);
  assert.equal(m.needsYou, false, "no minutes of her is a module that runs itself");
  assert.equal(m.touchTotal, 0);
  near(m.rate, 24, "6 pans every 15 minutes is 24 an hour");
  near(m.perPan, 2.5, "15 minutes over 6 pans");
});

test("a person free at the minute the next job starts is free", () => {
  // peopleRows reads module FACTS — the shape computeScenario hands it, with
  // every pass already worked out. Two jobs that meet at minute 10 are one pair
  // of hands, not two.
  const at = (id, startMin) => moduleFacts({
    id, icon: "•", name: id, on: true, person: 0, cycleMin: 10, batch: 1,
    touchMin: 10, everyMin: 10, repeats: 1, startMin, people: 1,
  });
  const rows = peopleRows([at("a", 0), at("b", 10)]);
  assert.equal(rows.length, 1, "finishing at 10 and starting at 10 is one pair of hands, not two");
  assert.deepEqual(rows[0].items.map((w) => w.module), ["a", "b"]);
  assert.equal(rows[0].clashes.length, 0, "meeting but not overlapping is not a collision");
  assert.equal(concurrency([at("a", 0), at("b", 10)]).peak, 1, "and the total person row agrees");
});

test("a brick she has given to a person goes there, collision and all", () => {
  // Her ask: one person per module, then slide the bricks until the collisions
  // are gone. A named person is her plan, so the plan is SHOWN rather than
  // quietly rearranged onto somebody who happens to be free — otherwise the
  // collision she is trying to see would be hidden from her.
  const at = (id, startMin, person) => moduleFacts({
    id, icon: "•", name: id, on: true, person, cycleMin: 10, batch: 1,
    touchMin: 10, everyMin: 10, repeats: 1, startMin, people: 1,
  });
  const rows = peopleRows([at("a", 0, 1), at("b", 5, 1)]);
  assert.equal(rows.length, 1, "one named person, one row — not a second pair of hands");
  assert.equal(rows[0].items.length, 2);
  assert.equal(rows[0].clashes.length, 1, "b starts before a finishes, and that is the collision");
  assert.equal(rows[0].clashes[0].from, 5);
  assert.equal(rows[0].clashes[0].to, 10);
  assert.equal(rows[0].busy, 15, "the union of the two windows, not the sum (20)");
  // And the day still NEEDS two people at minute 5, whatever the plan says: that
  // gap is exactly the manpower the combination cannot pay for.
  assert.equal(concurrency([at("a", 0, 1), at("b", 5, 1)]).peak, 2);
});

test("the total person row stacks whoever is working, named or not", () => {
  // The row she asked for: person 1, person 2, person 3 added up, so a doubled
  // stretch is a shape rather than a number. A named brick and a shared-out one
  // are the same thing to this count.
  const at = (id, startMin, person) => moduleFacts({
    id, icon: "•", name: id, on: true, person, cycleMin: 10, batch: 1,
    touchMin: 10, everyMin: 10, repeats: 1, startMin, people: 1,
  });
  const d = concurrency([at("a", 0, 1), at("b", 0, 3), at("c", 20, 0)]);
  assert.equal(d.peak, 2, "person 1 and person 3 both working from minute 0");
  assert.deepEqual(d.segments, [
    { from: 0, to: 10, count: 2 },
    { from: 20, to: 30, count: 1 },
  ]);
  assert.equal(d.overlapMin, 10, "ten minutes of the day wants two people at once");
});

test("combining two people is a label, and it stops claiming them when undone", () => {
  // Her own example: person 1 combined with person 3 is "person 1_3". The bricks
  // are what the day is built from, so the combination is stored as a label and
  // the arithmetic is unchanged by it.
  const sc = scenarioOf({ ...DEFAULT_SCENARIO, merges: { 1: [1, 3], 9: [9], bad: "x", 2: [2] } });
  assert.deepEqual(sc.merges, { 1: [3] }, "only real person numbers survive, and a row is never listed as covering itself");
  assert.deepEqual(copyScenario(sc, "copy", "s2").merges, { 1: [3] });
  // The copy's label is its own: editing it cannot rewrite the original's.
  const copy = copyScenario(sc, "copy", "s2");
  copy.merges["1"].push(4);
  assert.deepEqual(sc.merges["1"], [3]);
});

test("the day starts when she says it does, and the scale is one of the four", () => {
  // "i cannot change the time scale, say i want a start at 8am" — so the start is
  // a field, and every time on screen is counted from it.
  const r = computeScenario({ ...DEFAULT_SCENARIO, dayStartMin: 8 * 60 });
  assert.equal(r.dayStartMin, 480);
  assert.equal(clockOf(r.dayStartMin + 0), "8:00 am", "minute zero of the day is 8 am");
  assert.equal(clockOf(r.dayStartMin + of(r, "load").startMin), "12:18 pm");
  // A day wraps rather than rejecting 25:00, and the scale snaps to a choice she
  // can actually read — a hand-typed number must not make a day a hair's width.
  assert.equal(scenarioOf({ ...DEFAULT_SCENARIO, dayStartMin: -60 }).dayStartMin, 1380);
  assert.equal(scenarioOf({ ...DEFAULT_SCENARIO, dayStartMin: 25 * 60 }).dayStartMin, 60);
  assert.equal(scenarioOf({ ...DEFAULT_SCENARIO, pxPerMin: 1.65 }).pxPerMin, 1.6);
  assert.equal(scenarioOf({ ...DEFAULT_SCENARIO, pxPerMin: 999 }).pxPerMin, 3.2);
  assert.ok(PX_PER_MIN_CHOICES.includes(scenarioOf({ ...DEFAULT_SCENARIO, pxPerMin: 0 }).pxPerMin));
  assert.equal(DEFAULT_SCENARIO.dayStartMin, DEFAULT_DAY_START);
});

test("a brick can be made, moved in the order, and deleted", () => {
  const mods = DEFAULT_SCENARIO.modules.map((m) => ({ ...m }));
  const id = newModuleId(mods);
  assert.equal(id, "brick1", "a name no other brick is using");

  // A new brick arrives SWITCHED OFF: a brick with no numbers in it must not
  // become the wall and answer the day with "1 pan".
  const fresh = blankModule(id);
  assert.equal(fresh.on, false);
  assert.equal(computeScenario({ ...DEFAULT_SCENARIO, modules: [...mods, fresh] }).pansPerDay, 12);

  // Switched on with 6 pans a pass it takes its place in the day like any other.
  const on = { ...fresh, on: true, batch: 6, repeats: 6, cycleMin: 15, touchMin: 0, everyMin: 15 };
  const grown = [...mods, on];
  assert.equal(computeScenario({ ...DEFAULT_SCENARIO, modules: grown }).pansPerDay, 12);

  // The order of the list IS the order of the day, so moving one is a real edit.
  const moved = moveModule(grown, "fold", -1);
  assert.deepEqual(moved.slice(0, 2).map((m) => m.id), ["fold", "mixer"]);
  assert.equal(moved.length, grown.length, "moving is a reorder, never a copy");
  assert.deepEqual(moveModule(grown, "mixer", -1).map((m) => m.id), grown.map((m) => m.id), "the first brick cannot move up");
  assert.deepEqual(moveModule(grown, "brick1", 1).map((m) => m.id), grown.map((m) => m.id), "nor the last down");
  assert.equal(moveModule(grown, "nope", -1).length, grown.length);

  assert.equal(removeModule(grown, "brick1").some((m) => m.id === "brick1"), false);
  assert.equal(removeModule(grown, "nope").length, grown.length, "deleting something that is not there is not an error");
  assert.equal(newModuleId(removeModule(grown, "brick1")), "brick1", "and its name comes free again");
});

test("a saved scenario is a copy, not a second name for the same bricks", () => {
  // Two designs side by side — the line without a fridge and the line with one —
  // must not be able to edit each other.
  const sc = scenarioOf(DEFAULT_SCENARIO);
  const saved = copyScenario(sc, "With a fridge", "s1");
  assert.equal(saved.name, "With a fridge");
  assert.equal(saved.id, "s1");
  assert.equal(saved.pansPerDay, undefined, "a stored scenario is the plan, not the answer");
  saved.modules[0].batch = 999;
  assert.equal(sc.modules[0].batch, 28, "editing the copy leaves the one she was working on alone");
  assert.equal(computeScenario(saved).pansPerDay, 12, "and the fridge is still switched off in it");
});

test("every touch window is the minutes of a person, and nothing else is", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  const windows = touchWindows(r.on);
  // Nine bricks, but only the ones that need her: the retard runs itself, and a
  // 6-pass loop is six windows, not one.
  assert.equal(windows.filter((w) => w.module === "retard").length, 0);
  assert.equal(windows.filter((w) => w.module === "fold").length, 4);
  // The fold's 2 minutes are inside its own 28, so each window is 2 minutes wide
  // and they are 30 minutes apart — rest, fold, rest, fold.
  const folds = windows.filter((w) => w.module === "fold");
  assert.deepEqual(folds.map((w) => w.from), [30, 60, 90, 120]);
  assert.deepEqual(folds.map((w) => w.to), [32, 62, 92, 122]);
});

test("a plan half typed in is clamped rather than believed", () => {
  const s = scenarioOf({ name: "", target: -5, modules: [{ id: "z", cycleMin: 0, batch: 0, touchMin: 0, repeats: 0, startMin: -100 }] });
  assert.equal(s.target, 0);
  assert.equal(s.modules[0].repeats, 1, "a scenario has at least one pass of something");
  assert.equal(s.modules[0].startMin, 0);
  assert.equal(s.name, DEFAULT_SCENARIO.name);
});

test("the clock reads the way she would say it", () => {
  assert.equal(clockOf(0), "12:00 am");
  assert.equal(clockOf(450), "7:30 am");
  assert.equal(clockOf(720), "12:00 pm");
  assert.equal(clockOf(1008), "4:48 pm");
  assert.equal(clockOf(1440), "12:00 am", "a full day is back where it started");
  assert.equal(hoursAndMinutes(90), "1 h 30 min");
  assert.equal(hoursAndMinutes(120), "2 h");
  assert.equal(hoursAndMinutes(45), "45 min");
});

// ── Handing a brick to the Production line ─────────────────────────────────
//
// These are the figures that cross from one screen to the other, and the point
// of each is the same: only what she typed into a brick may cross. The seeded
// day is the case that matters, because it is the one she will load first.

test("the seeded bricks carry the line's own numbers across", () => {
  const p = scenarioPlanPatch(DEFAULT_SCENARIO, {});
  // The mixer's 6 minutes a mix, its 28-pan tub; the wash brick's 18 minutes and
  // the top's 8; the oven brick's 4 minutes of hands, its 6 pans and its
  // 15-minute turn. Every one of them is a number she typed.
  //
  // The wash brick fills the one field the wash and the weighing-out share, so it
  // arrives as scaleMin6 under its new single name. The retard brick no longer
  // crosses at all: the chiller is not a station of the line she has, so its
  // trays are named as skipped rather than written to a field that is gone.
  // The hands are the peak at once, not the number of rows she has drawn: the
  // seeded day is laid out so one pair covers every job, brick by brick.
  assert.deepEqual(p.patch, {
    target: 36, people: 1,
    mixMin: 6, mixerPans: 28,
    scaleMin6: 18, topMin6: 8, coolMin6: 12,
    swapMin6: 4, ovenPans: 6, ovenMin: 15,
  });
  // Every step of the line is answered for by one brick or another, so nothing is
  // left over — the wash and the weighing-out are one job and one field now.
  assert.deepEqual(p.left, [], "every step of the line has a brick feeding it");
  // And the bricks that are not a step of the line are named, not silently lost.
  assert.deepEqual(p.unmapped,
    ["The fold loop", "Load the chiller", "Retard overnight", "Unload the chiller"]);
});

test("a brick's minutes are scaled onto six pans, not handed over raw", () => {
  // One wash brick that does 12 pans in 30 minutes is 15 minutes for every 6.
  const s = scenarioOf({
    target: 0,
    modules: [{ id: "wash", name: "Wash, oil and fill", job: "wash", on: true,
      cycleMin: 30, batch: 12, touchMin: 30, everyMin: 30, repeats: 1, startMin: 0, people: 1 }],
  });
  const p = scenarioPlanPatch(s, { scaleMin6: 18 });
  assert.equal(p.patch.scaleMin6, 15);
  const line = p.lines.find((l) => l.key === "scaleMin6");
  assert.equal(line.from, 18);
  assert.equal(line.changes, true, "18 → 15 is a real change and the screen has to say so");
});

test("a brick saved before jobs existed is matched on the name it was seeded with", () => {
  const old = { id: "w", name: "Wash, oil and fill", on: true, cycleMin: 18, batch: 6,
    touchMin: 20, everyMin: 18, repeats: 6, startMin: 0, people: 1 };
  assert.equal(jobOf(old), "wash", "no job field, and the name is the one the app seeded");
  assert.equal(scenarioPlanPatch({ modules: [old] }, {}).patch.scaleMin6, 20);
  // A name of her own with no job is honestly none of the line's steps.
  assert.equal(jobOf({ id: "x", name: "My own thing", on: true, cycleMin: 5, batch: 1, touchMin: 5 }), "");
});

test("a job is kept apart from the name, so renaming a brick cannot break the link", () => {
  const renamed = { id: "w", name: "The oily pan bit", job: "wash", on: true,
    cycleMin: 18, batch: 6, touchMin: 18, everyMin: 18, repeats: 6, startMin: 0, people: 1 };
  assert.equal(jobOf(renamed), "wash");
  assert.equal(jobOf({ ...renamed, job: "" }), "", "and the name it now wears is nobody's step");
});

test("a switched-off brick crosses over as nothing at all", () => {
  const s = scenarioOf({
    target: 20,
    modules: [
      { id: "oven", name: "The oven", job: "oven", on: false, cycleMin: 15, batch: 6,
        touchMin: 4, everyMin: 15, repeats: 6, startMin: 0, people: 1 },
      { id: "wash", name: "Wash, oil and fill", job: "wash", on: true, cycleMin: 18, batch: 6,
        touchMin: 18, everyMin: 18, repeats: 6, startMin: 0, people: 1 },
    ],
  });
  const p = scenarioPlanPatch(s, {});
  assert.equal(p.patch.scaleMin6, 18);
  assert.equal(p.patch.ovenMin, undefined, "the brick is off, so the line answers without it");
  assert.deepEqual(p.unmapped, [], "and it is not even named as skipped work");
});

test("two bricks that admit to the same job are named, and the first one wins", () => {
  const brick = (id, touchMin) => ({ id, name: id, job: "wash", on: true,
    cycleMin: 18, batch: 6, touchMin, everyMin: 18, repeats: 1, startMin: 0, people: 1 });
  const p = scenarioPlanPatch(scenarioOf({ modules: [brick("a", 18), brick("b", 25)] }), {});
  assert.equal(p.patch.scaleMin6, 18, "the first brick in the day's order is the one that crosses");
  assert.deepEqual(p.doubled, ["Wash, oil and fill"]);
});

test("a wash brick and a weighing-out brick are one job, and neither is reported missing", () => {
  // The two were always one job under two names, so a scenario holding both was
  // counting the same work twice. The fuller reading crosses — it never
  // understates her hands — and the single step they share is not then listed as
  // one the scenario said nothing about.
  const both = (id, job, touchMin) => ({ id, name: id, job, on: true, cycleMin: 18, batch: 6,
    touchMin, everyMin: 18, repeats: 1, startMin: 0, people: 1 });
  const p = scenarioPlanPatch(scenarioOf({
    modules: [both("w", "wash", 18), both("s", "scale", 25)],
  }), {});
  assert.equal(p.patch.scaleMin6, 25, "the fuller of the two is taken");
  assert.ok(!p.left.includes("Weighing the dough out into pans"),
    "and the one step they share is not then named as unfed");
  assert.deepEqual(p.unmapped, [], "nor is either brick named as work that feeds nothing");
});

test("the load says what it did and did not change", () => {
  const p = scenarioPlanPatch(DEFAULT_SCENARIO, { scaleMin6: 18, ovenMin: 12 });
  const line = (key) => p.lines.find((l) => l.key === key);
  assert.equal(line("scaleMin6").changes, false, "the same number is not a change");
  assert.equal(line("ovenMin").from, 12);
  assert.equal(line("ovenMin").to, 15);
  // A step she has never timed arrives as blank rather than as a nought.
  assert.equal(line("mixMin").from, 0);
  assert.equal(line("mixMin").changes, true);
});

test("the summary of a scenario reads the same on both screens", () => {
  assert.equal(scenarioSummary(DEFAULT_SCENARIO), "12 pans a day · 9 bricks");
  assert.equal(LINE_JOBS.length, 7, "the steps of the line a brick can be, plus the retard");
  assert.equal(new Set(LINE_JOBS.map((j) => j.key)).size, LINE_JOBS.length);
});

// ── Her sister's line, the second scenario ─────────────────────────────────
//
// The numbers asserted below are the ones she gave on 21 Sep 2026: a tub that
// fills four, a fold every 30 minutes three times, a proofer holding twelve
// with a one-hour hold, a minute a pan for dimple and oil, and 30 minutes of
// rest before the oven. If this file ever disagrees with those, the second
// scenario is no longer the line her sister described.

test("her sister's line is a different kitchen: no mixer and no chiller", () => {
  const r = computeScenario(SISTER_SCENARIO);
  const ids = r.modules.map((m) => m.id);
  assert.equal(r.scenario.name, "My sister proposal 21/9/2026");
  assert.equal(ids.includes("mixer"), false, "the dough is mixed by hand in the tub, so there is no mixer brick");
  assert.equal(ids.includes("retard"), false, "a proofing cabinet takes the chiller's place");
  assert.equal(ids.includes("load"), false, "and with it the loading and unloading of the chiller");
  assert.equal(ids.includes("proofer"), true);
  assert.equal(ids.includes("bench"), true, "the 30 minutes of rest before the oven is its own brick");
});

test("her sister's numbers are the ones on the bricks", () => {
  const r = computeScenario(SISTER_SCENARIO);
  const folds = of(r, "tubfold");
  assert.equal(folds.batch, 4, "the tub fills four doughs");
  assert.equal(folds.repeats, 3, "a stretch and fold every 30 minutes, three times");
  assert.equal(folds.everyMin, 30);
  near(folds.passes[1].at - folds.passes[0].at, 30, "one fold every half hour");

  const proofer = of(r, "proofer");
  assert.equal(proofer.cycleMin, 60, "proofed for an hour");
  assert.equal(proofer.batch, 12, "and the cabinet holds twelve pans at any time");
  assert.equal(proofer.needsYou, false, "the dough waits in the cabinet while she does something else");

  const dimple = of(r, "dimpleoil");
  assert.equal(dimple.batch, 4);
  assert.equal(dimple.touchMin, 4, "a minute a pan, four pans");

  const bench = of(r, "bench");
  assert.equal(bench.cycleMin, 30, "then 30 minutes before the oven");
  assert.equal(bench.needsYou, false, "standing still is not work");
});

test("her sister's day reads as four pans, and the tub is what stops it", () => {
  const r = computeScenario(SISTER_SCENARIO);
  assert.equal(r.pansPerDay, 4, "one tub of four is all the day passes");
  assert.equal(r.wall.id, "tubmix", "ties go to the earliest brick, and mixing is the first thing the day does");
  assert.equal(scenarioSummary(SISTER_SCENARIO), "4 pans a day · 8 bricks");
});

test("the two numbers she never gave are named as hers to set", () => {
  const r = computeScenario(SISTER_SCENARIO);
  // A figure she did not give may not be dressed up as one she did — the same
  // rule the v135 mixer box was fixed under. Both are called out by name so she
  // finds them without reading a changelog.
  assert.match(of(r, "tubmix").name, /set the minutes/,
    "the mixing-by-hand placeholder says so on the brick itself");
  assert.equal(of(r, "panfill").touchMin, 12,
    "tipping into the pans uses her own measured 3 minutes a pan, which is 12 for four");
});

test("every brick of her sister's line is reachable from the brick editor", () => {
  // Nothing is stored that moduleOf would drop, so every number she can see is
  // a number she can change -- which is what she meant by "numbers need to be
  // configurable". A field the model quietly discards would be a setting she
  // cannot reach.
  for (const m of SISTER_SCENARIO.modules) {
    const back = moduleOf(m);
    assert.equal(back.cycleMin, m.cycleMin, `${m.id}: cycle minutes survive`);
    assert.equal(back.batch, m.batch, `${m.id}: the batch survives`);
    assert.equal(back.touchMin, m.touchMin, `${m.id}: the hands minutes survive`);
    assert.equal(back.everyMin, m.everyMin, `${m.id}: the pace survives`);
    assert.equal(back.repeats, m.repeats, `${m.id}: the number of passes survives`);
    assert.equal(back.startMin, m.startMin, `${m.id}: the start time survives`);
    assert.equal(back.person, m.person, `${m.id}: the person survives`);
    assert.equal(back.job, m.job || "", `${m.id}: the line step survives`);
    // The chain and the per-cycle drag added three fields, and reading a brick a
    // second time must not lose any of them — that is what makes a chained
    // placement survive being handed between the model and the screen.
    assert.equal(back.count, 1, `${m.id}: a brick she has one of says so`);
    assert.equal(back.follow, false, `${m.id}: and no brick waits for another until she says so`);
    assert.equal(back.overlap, false, `${m.id}: and none of them lets two lots in at once yet`);
    // A brick she has one of is ONE line, so it carries the one person it always
    // had and no more — the extra lines arrive with the second one of them.
    assert.deepEqual(back.crew, [back.person], `${m.id}: one line, carrying the brick's own person`);
    assert.deepEqual(moduleOf(back).starts, back.starts, `${m.id}: the cycle times read back the same`);
  }
  // Switched on, the switch itself is a value that has to survive the same trip —
  // it is the one field whose default is off and whose being on changes the clock.
  const on = moduleOf({ ...SISTER_SCENARIO.modules[0], count: 2, follow: true, overlap: true });
  assert.deepEqual(
    [on.count, on.follow, on.overlap],
    [2, true, true],
    "two of them, waiting on the brick above, and free to hold two lots at once",
  );
  assert.deepEqual(moduleOf(on), on, "and a second read of it changes nothing at all");
});

// ── A brick she has two of is two lines, and each line has its own person ───
//
// Her ask: "i want is just better drawing.. Since now one brick having 2 lines,
// each line can have its own person, and few line can have a combine person
// sharing to different lines." So the arithmetic of "two of them" is untouched —
// this is the drawing and who stands at each line, and both have to be able to
// survive the trip through storage without her numbers moving.

test("a brick carries a person for each line it is worked as", () => {
  // Nothing stored: every line gets the brick's own person, and the brick's
  // person is line 1's. One number written once, so they cannot disagree.
  assert.deepEqual(moduleOf(brick({ person: 3 })).crew, [3],
    "one of a brick is one line, and it is the person she named");
  assert.deepEqual(moduleOf(brick({ person: 3, count: 2 })).crew, [3, 3],
    "two of them and nobody said otherwise: the same person on both, as before");
  // The array she typed is adopted only when it is exactly as long as the lines.
  assert.deepEqual(moduleOf(brick({ person: 3, count: 2, crew: [1, 2] })).crew, [1, 2],
    "two lines, two people, read back as she set them");
  // Grown: the stored list is kept and the new lines take the brick's person, so
  // raising how many she has never forgets who was on the lines she already had.
  assert.deepEqual(moduleOf(brick({ person: 3, count: 3, crew: [1, 2] })).crew, [1, 2, 3],
    "a third one of them keeps lines 1 and 2 and gives line 3 the brick's person");
  // Cut back: the extra entries are dropped rather than kept as lines that are
  // not there, because a crew longer than the lines is a line nobody can see. What
  // is KEPT is the person she set on a line that still exists — so lowering how
  // many she has never silently forgets who was standing at line 1, and raising it
  // again brings line 2's person straight back off the stored list.
  assert.deepEqual(moduleOf(brick({ person: 3, count: 1, crew: [1, 2] })).crew, [1],
    "back to one of them keeps the person she had set on line 1");
  // Nonsense in storage is clamped, not carried: a person is 0…8, and 0 means
  // whoever is free — the same reading the editor and the People rows give it.
  assert.deepEqual(moduleOf(brick({ person: 3, count: 2, crew: [-4, 99] })).crew, [0, 8],
    "a person outside 0…8 is clamped rather than drawn");
  // person is ALWAYS crew[0], the way startMin is always starts[0].
  assert.equal(moduleOf(brick({ person: 3, count: 2, crew: [5, 6] })).person, 5,
    "the brick's person is line 1's person, whether or not it was stored that way");
  // And a wrong-length list left behind by a hand-edited backup is replaced, not
  // partly adopted — half a crew is a line pointing at somebody who is not there.
  assert.deepEqual(moduleOf(brick({ person: 2, count: 2, crew: "nonsense" })).crew, [2, 2],
    "a crew that is not a list is not a crew");
});

test("lines are in force only while the brick's own cycles really take turns", () => {
  assert.equal(linesInForce(brick({ count: 1 })), 0, "one of a brick is not drawn as lines");
  assert.equal(linesInForce(brick({ count: 2 })), 2, "two of them take turns, so two lines");
  assert.equal(linesInForce(brick({ count: 3 })), 3, "three of them is three lines");
  // The overlap switch turns the taking-turns off, so there is only ever one lot
  // in the brick — one row, one person, however many of it she has. The crew is
  // kept in storage (the editor says so), but it is not what the day is worked as.
  assert.equal(linesInForce(brick({ count: 2, overlap: true })), 0,
    "free to overlap, the brick is one row again");
  // A switched-off brick is not worked at all, so it is not a line either.
  assert.equal(linesInForce(brick({ count: 2, on: false })), 2,
    "switching a brick off is the day's business, not the drawing's");
});

test("each lot knows which line it came off", () => {
  const m = moduleOf(brick({ count: 2, repeats: 6, cycleMin: 28, everyMin: 30, touchMin: 2 }));
  assert.deepEqual(passesOf(m).map((p) => p.line), [0, 1, 0, 1, 0, 1],
    "two of them take the lots in turn, so the lines alternate all the way down");
  const one = moduleOf(brick({ count: 1, repeats: 3 }));
  assert.deepEqual(passesOf(one).map((p) => p.line), [0, 0, 0],
    "one of a brick puts every lot on its one line, exactly as it always did");
});

test("two lines give their odd lots to one person and their even lots to the other", () => {
  const r = computeScenario(scenario({
    modules: [brick({ id: "fold", count: 2, crew: [1, 2], repeats: 4, cycleMin: 20, everyMin: 30, touchMin: 2 })],
  }));
  const wins = touchWindows(r.on);
  // Four lots, two lines, two people: lots 1 and 3 to person 1, lots 2 and 4 to
  // person 2 — the lines take the lots in turn, so the people do too.
  assert.deepEqual(wins.map((w) => [w.person, w.line]), [[1, 0], [2, 1], [1, 0], [2, 1]],
    "the lines carry their own people, and each lot says which line it came off");
  const rows = peopleRows(r.on);
  assert.equal(rows.length, 2, "two lines with two people is two rows, not one");
  assert.deepEqual(rows.map((row) => row.person), [1, 2]);
  // Each of them is at ONE brick — which is the count she asked this feature for,
  // because one person should not have to wear every hat in the day.
  assert.deepEqual(rows.map((row) => new Set(row.items.map((w) => w.module)).size), [1, 1],
    "each worker is at one line of one brick");
});

test("the same person on both lines is one person, and a real clash says so", () => {
  // Both lines on person 1 with minutes that do not meet: one row, and every lot
  // still on it. One person covering two lines is what she asked for.
  const apart = computeScenario(scenario({
    modules: [brick({ id: "fold", count: 2, crew: [1, 1], repeats: 4, cycleMin: 10, everyMin: 30, touchMin: 4 })],
  }));
  const rows = peopleRows(apart.on);
  assert.equal(rows.length, 1, "the same number on two lines is one person, not two");
  assert.equal(rows[0].items.length, 4, "and every lot is still on their row");
  assert.equal(rows[0].clashes.length, 0, "half an hour apart, so nothing of theirs collides");
  // Both lines on person 1 with minutes that DO meet — 35 minutes of hands inside
  // a 40-minute pass, with the next lot starting at 30. Same one row, now wearing
  // the collision: the honest answer, and what she slides the bricks apart to fix.
  const clash = computeScenario(scenario({
    modules: [brick({ id: "fold", count: 2, crew: [1, 1], repeats: 4, cycleMin: 40, everyMin: 30, touchMin: 35 })],
  }));
  const clashed = peopleRows(clash.on);
  assert.equal(clashed.length, 1, "one person is still one row");
  assert.ok(clashed[0].clashes.length > 0, "two of their own lines in the same minute is a clash");
  assert.equal(clashed[0].clashes[0].after.line, 1, "and the clash names the line that came second");
});

test("a person's places count the lines they are on, not just the bricks", () => {
  // The fix: one person on BOTH lines of one brick is in two places, and the count
  // of bricks alone read that as one — so the doubling-up she is planning down was
  // the one thing the row said nothing about.
  const both = computeScenario(scenario({
    modules: [brick({ id: "fold", count: 2, crew: [1, 1], repeats: 4, cycleMin: 10, everyMin: 30, touchMin: 4 })],
  }));
  const one = peopleRows(both.on);
  assert.equal(one.length, 1, "the same number on two lines is still one person");
  assert.equal(one[0].items.length, 4, "on all four lots");
  assert.equal(new Set(one[0].items.map((w) => w.module)).size, 1,
    "one brick, which is what the old count saw");
  assert.equal(placesOn(one[0]), 2, "and two places, which is what she is counting");
  // Two lines, two people: each of them is in ONE place, so the count she is
  // driving to is a real answer and not just "the brick again".
  const split = computeScenario(scenario({
    modules: [brick({ id: "fold", count: 2, crew: [1, 2], repeats: 4, cycleMin: 10, everyMin: 30, touchMin: 4 })],
  }));
  assert.deepEqual(peopleRows(split.on).map(placesOn), [1, 1],
    "one person per line is one place each");
  // A brick she has one of has no lines to count, so it counts as one place
  // whether or not anybody is named on it — every scenario built before lines
  // existed reads exactly as it did.
  const plain = computeScenario(scenario({
    modules: [brick({ id: "fold", person: 2, repeats: 3, cycleMin: 10, everyMin: 20, touchMin: 3 })],
  }));
  assert.deepEqual(peopleRows(plain.on).map(placesOn), [1], "one brick is one place");
  // Two bricks really are two places, which the old count did get right.
  const two = computeScenario(scenario({
    modules: [
      brick({ id: "a", person: 1, repeats: 1, cycleMin: 10, everyMin: 60, touchMin: 5 }),
      brick({ id: "b", person: 1, startMin: 100, repeats: 1, cycleMin: 10, everyMin: 60, touchMin: 5 }),
    ],
  }));
  assert.deepEqual(peopleRows(two.on).map(placesOn), [2], "two bricks is two places");
});

test("a brick that is not drawn as lines gives the windows it always gave", () => {
  // The whole promise of this release: with no lines and no crew — which is every
  // brick she has — the day is computed exactly as it was before the field existed.
  const bare = computeScenario(scenario({
    modules: [brick({ id: "fold", person: 2, repeats: 3, cycleMin: 10, everyMin: 20, touchMin: 3 })],
  }));
  const crewed = computeScenario(scenario({
    modules: [brick({ id: "fold", person: 2, crew: [2], repeats: 3, cycleMin: 10, everyMin: 20, touchMin: 3 })],
  }));
  assert.deepEqual(touchWindows(crewed.on), touchWindows(bare.on),
    "spelling the crew out says nothing the brick did not already say");
  assert.deepEqual(concurrency(crewed.on), concurrency(bare.on), "and the day's hands are untouched");
});

test("copying a scenario copies the line crews, deeply", () => {
  const sc = scenario({
    modules: [brick({ id: "fold", person: 1, count: 2, crew: [1, 2], repeats: 4 })],
  });
  const copy = copyScenario(sc, "A copy", "two");
  assert.deepEqual(copy.modules[0].crew, [1, 2], "the copy has the crew");
  copy.modules[0].crew[1] = 7;
  assert.deepEqual(sc.modules[0].crew, [1, 2],
    "and it is the copy's own array, so dragging in one scenario cannot rewrite the other");
});

test("combining two people moves their lines, and nobody is left pointing at a gone row", () => {
  const sc = scenario({
    modules: [
      brick({ id: "fold", person: 2, count: 2, crew: [2, 5], repeats: 4 }),
      brick({ id: "bake", person: 5, count: 1, repeats: 2 }),
    ],
  });
  const next = combinedScenario(sc, 2, 5);
  const fold = next.modules.find((m) => m.id === "fold");
  assert.deepEqual(fold.crew, [2, 2], "person 5's line becomes person 2's line");
  assert.equal(fold.person, 2, "and the brick's own person follows line 1");
  assert.deepEqual(next.modules.find((m) => m.id === "bake").crew, [2],
    "the other brick 5 was at moves with them");
  // 5 is now covered by 2, so their row is gone and the combination says who took
  // them — which is what makes the People list read as the day being worked.
  assert.deepEqual(next.merges, { 2: [5] }, "5 is combined into 2");
  // A person who was only ever on somebody's line 2 is still being covered — the
  // test for "is this person free now" has to read the crew, not just `person`.
  assert.deepEqual(combinedScenario(sc, 2, 5).merges, { 2: [5] });
  assert.deepEqual(sc.modules[0].crew, [2, 5], "and the scenario she was looking at is not edited in place");
  // Combining a person 2 already covers adds them rather than replacing them.
  assert.deepEqual(combinedScenario({ ...sc, merges: { 2: [4] } }, 2, 5).merges, { 2: [4, 5] },
    "what 2 already covered is kept, and the list stays in order");
});

test("the lines never reach the Production line's plan", () => {
  // The bridge to the Production line reads named facts, not the module objects —
  // so a crew, which is a planner idea, cannot leak into the day it measures. The
  // guard is that the same bricks, with lines and crews, carry the identical plan.
  const bare = scenarioPlanPatch(DEFAULT_SCENARIO, {}).patch;
  const withLines = DEFAULT_SCENARIO.modules.map((m) => (
    m.id === "mixer" ? { ...m, count: 2, crew: [1, 2] } : m
  ));
  const patch = scenarioPlanPatch({ ...DEFAULT_SCENARIO, modules: withLines }, {}).patch;
  assert.deepEqual(patch, bare, "two of them and two people move no number on the other screen");
  assert.equal(Object.keys(patch).some((k) => k === "crew" || k === "lines"), false,
    "the plan carries pans and minutes, not lines and people");
  // And the figure the pinned test above rests on is untouched.
  assert.equal(patch.mixerPans, 28, "two of them still buys cycles out of the same planned pans");
  assert.equal(patch.ovenPans, 6, "and the oven is where it always was");
});

// ── A brick can be doubled, and every cycle has its own time ───────────────
//
// The three things she asked for by number: two of a brick when it is the
// bottleneck, a start time of its own for every cycle, and "cycle 10 of this
// brick cannot start until cycle 10 of the brick before it has finished".
//
// The load-bearing claim under all of it is a NEGATIVE one, and it is the first
// test here: with nothing set to wait and one of every brick, the model must
// answer exactly what it answered before any of this existed. Everything she
// already reasons with -- twelve pans, the chiller in the wall -- hangs on it.

test("a brick she has one of, that waits for nothing, is the brick it always was", () => {
  const r = computeScenario(DEFAULT_SCENARIO);
  for (const f of r.modules) {
    // The list is built from the same sum the day was always placed with, so a
    // brick nobody has dragged sits exactly where `startMin + k x everyMin` put
    // it -- to the last hundredth of a minute.
    const spread = Array.from({ length: f.repeatsHeld }, (_, k) => f.startMin + k * f.everyMin);
    near(f.passes.length, spread.length, `${f.id}: the same number of cycles`);
    f.passes.forEach((p, k) => near(p.at, spread[k], `${f.id} cycle ${k + 1} is where it always was`));
  }
  // And the chained answer for a line with no chain is the line itself.
  const chained = chainLine(scenarioOf(DEFAULT_SCENARIO).modules);
  scenarioOf(DEFAULT_SCENARIO).modules.forEach((m, i) => {
    assert.deepEqual(chained[i].starts, m.starts, `${m.id}: nothing moved`);
  });
});

test("a cycle can be moved on its own, and the brick keeps its shape", () => {
  // Cycle 2 of the fold pushed to 90 minutes: the others stay where they were,
  // which is the whole point of a list rather than a formula.
  const moved = { ...brick({ id: "f", cycleMin: 28, batch: 28, touchMin: 2, everyMin: 30, repeats: 4, startMin: 30 }), starts: [30, 90, 90, 120] };
  const m = moduleFacts(moved);
  assert.deepEqual(m.passes.map((p) => p.at), [30, 90, 90, 120]);
  // And the day is as long as the LATEST cycle makes it, not as long as the
  // formula would have guessed — a cycle dragged later lengthens the day.
  assert.equal(m.endMin, 148, "120 + 28, the last cycle's own end");
});

test("typing a start time moves the whole brick, dragged cycles and all", () => {
  // A start-time box and a drag are two ways to say one thing, so a typed number
  // must never be silently ignored by a list that is out of date. The brick
  // moves; the shape she dragged comes with it.
  const dragged = brick({ id: "f", cycleMin: 28, batch: 28, touchMin: 2, everyMin: 30, repeats: 4, startMin: 30, starts: [30, 90, 90, 120] });
  const retyped = moduleOf({ ...dragged, startMin: 130 });
  assert.deepEqual(retyped.starts, [130, 190, 190, 220], "every cycle moved by the same hundred minutes");
  // Which also means a brick whose list disagrees with its cycle count is
  // repaired rather than believed.
  assert.deepEqual(moduleOf({ cycleMin: 10, everyMin: 10, repeats: 3, startMin: 0, starts: [0, 10, 20, 30, 40] }).starts, [0, 10, 20]);
  assert.deepEqual(moduleOf({ cycleMin: 10, everyMin: 10, repeats: 3, startMin: 5, starts: [5] }).starts, [5, 15, 25]);
});

test("cycle 10 waits for the brick above to finish its cycle 10", () => {
  // The rule she wrote, on a line of two bricks: mix four lots, then fold four
  // lots. The fold's first lot cannot start until the mix's first lot is out,
  // and the second fold waits on the second mix — not on the fold before it.
  const mix = brick({ id: "mix", cycleMin: 20, batch: 6, touchMin: 5, everyMin: 30, repeats: 4, startMin: 0 });
  const fold = { ...brick({ id: "fold", cycleMin: 28, batch: 6, touchMin: 2, everyMin: 30, repeats: 4, startMin: 0 }), follow: true };
  const r = computeScenario(scenario({ modules: [mix, fold] }));
  const f = of(r, "fold");
  assert.deepEqual(f.passes.map((p) => p.at), [20, 50, 80, 110],
    "each fold lot starts the minute its own lot left the mixer");
  // The mixer keeps its own pace: nothing waits for the mixer.
  assert.deepEqual(of(r, "mix").passes.map((p) => p.at), [0, 30, 60, 90]);
});

test("pushing one lot later carries that lot down the whole line", () => {
  // She drags the mixer's third lot later and the whole line re-forms around it.
  // No cascade code does this: the fold simply asks what the mixer has finished.
  const mix = { ...brick({ id: "mix", cycleMin: 20, batch: 6, touchMin: 5, everyMin: 30, repeats: 4, startMin: 0 }), starts: [0, 30, 120, 150] };
  const fold = { ...brick({ id: "fold", cycleMin: 28, batch: 6, touchMin: 2, everyMin: 30, repeats: 4, startMin: 0 }), follow: true };
  const r = computeScenario(scenario({ modules: [mix, fold] }));
  assert.deepEqual(of(r, "mix").passes.map((p) => p.at), [0, 30, 120, 150]);
  assert.deepEqual(of(r, "fold").passes.map((p) => p.at), [20, 50, 140, 170],
    "the fold's third and fourth lots moved with the mixer's, and the first two did not");
});

test("a brick above with fewer cycles holds the extra ones at its last", () => {
  // Four mixes feeding six folds. Lots five and six have no counterpart above to
  // wait for, so they wait on the last lot that does exist -- the model names the
  // rule rather than inventing a time for a mix the mixer never runs.
  //
  // What the rule buys is both lots starting no earlier than the mixer's last lot
  // ending at 110: on the fold's own 10-minute rhythm they would have gone at 40
  // and 50, i.e. folding dough the mixer had not mixed. The floor is the chain,
  // but this fold's own one-lot-at-a-time rule is stronger than it, so lots four,
  // five and six queue behind the lot before them -- 138 and 166, not 110 three
  // times over. The next test is the switch that takes that own rule off.
  const mix = brick({ id: "mix", cycleMin: 20, batch: 6, touchMin: 5, everyMin: 30, repeats: 4, startMin: 0 });
  const fold = { ...brick({ id: "fold", cycleMin: 28, batch: 6, touchMin: 2, everyMin: 10, repeats: 6, startMin: 0 }), follow: true };

  const r = computeScenario(scenario({ modules: [mix, fold] }));
  const at = of(r, "fold").passes.map((p) => p.at);
  assert.deepEqual(at, [20, 50, 80, 110, 138, 166]);
  assert.ok(at.slice(3).every((t) => t >= 110), "no lot four, five or six before the mixer's last lot ends");
  // The mixer itself keeps its own pace -- nothing waits on the fold.
  assert.deepEqual(of(r, "mix").passes.map((p) => p.at), [0, 30, 60, 90]);
});

test("a brick holds its own lots apart until she says its cycles may overlap", () => {
  // Her words: "allow overlap button and the overlapping criteria". Off -- where
  // every brick starts, and every brick she already has -- one lot at a time: a
  // fold cannot begin lot two until lot one is out. That is the right rule when the
  // dough is physically IN the thing, and the wrong one when the 28 minutes are
  // mostly the dough RESTING between folds. Switched on, her own times stand and
  // the chain above is the only thing left that can move a lot.
  const mix = brick({ id: "mix", cycleMin: 20, batch: 6, touchMin: 5, everyMin: 30, repeats: 4, startMin: 0 });
  const apart = { ...brick({ id: "fold", cycleMin: 5, batch: 6, touchMin: 2, everyMin: 10, repeats: 6, startMin: 0 }), follow: true };
  const free = { ...apart, overlap: true };

  const held = computeScenario(scenario({ modules: [mix, apart] }));
  const loose = computeScenario(scenario({ modules: [mix, free] }));
  assert.deepEqual(of(held, "fold").passes.map((p) => p.at), [20, 50, 80, 110, 115, 120],
    "switched off, each fold waits for the fold before it");
  assert.deepEqual(of(loose, "fold").passes.map((p) => p.at), [20, 50, 80, 110, 110, 110],
    "switched on, the fold's own lots are hers, and the chain is all that is left");
  assert.ok(of(loose, "fold").passes.slice(3).every((p) => p.at >= 110),
    "and never before the dough exists: the mixer's last lot ends at 110");
  // How many of these you have is NOT this switch: two folds means two lots at
  // once, which is one lot per brick, not every lot at once.
  const two = computeScenario(scenario({ modules: [mix, { ...apart, count: 2 }] }));
  assert.deepEqual(of(two, "fold").passes.map((p) => p.at), [20, 50, 80, 110, 110, 115],
    "two bricks: lot three may start while lot one is still folding, lot four may not");
  assert.equal(of(two, "fold").output, of(held, "fold").output, "and a second one never plans pans she did not");
});

test("a brick she has said may overlap sits on her own rhythm, all of it at once", () => {
  // A 28-minute pass on a 10-minute rhythm is a brick in two or three lots at once,
  // and this is the switch's whole point: dough resting between folds, a second bin
  // on the go. Switched on, her rhythm is passed through and the screen draws the
  // lots in lanes so all of them can be seen.
  const solo = brick({ id: "s", cycleMin: 28, batch: 6, touchMin: 2, everyMin: 10, repeats: 4, startMin: 0 });
  const lot = { ...solo, overlap: true };
  const m = of(computeScenario(scenario({ modules: [lot] })), "s");
  assert.deepEqual(m.passes.map((p) => p.at), [0, 10, 20, 30]);
  assert.deepEqual(m.passes.map((p) => p.end), [28, 38, 48, 58]);
  // Three of the four are in the brick at once at minute 20, which is what the
  // lanes on the timeline are for.
  const live = m.passes.filter((p) => p.at <= 20 && p.end > 20).length;
  assert.equal(live, 3);
  // And the day is as long as the last lot makes it, not as long as the rhythm
  // alone would suggest.
  assert.equal(m.endMin, 58);
  // Switched off, the same brick on the same rhythm queues instead, because a lot
  // cannot begin until the one before it is out of the brick.
  const queued = of(computeScenario(scenario({ modules: [solo] })), "s");
  assert.deepEqual(queued.passes.map((p) => p.at), [0, 28, 56, 84]);
  assert.equal(queued.endMin, 112, "and the day is longer for it, which is the trade she is being shown");
});

test("a switched-off brick is not in the build, so nothing waits on it", () => {
  // The fridge parked, and the oven waiting on the fold rather than on a machine
  // that is not switched on -- which is what happens at the bench.
  const mix = brick({ id: "mix", cycleMin: 20, batch: 6, touchMin: 5, everyMin: 30, repeats: 2, startMin: 0 });
  const off = { ...brick({ id: "mid", cycleMin: 20, batch: 6, touchMin: 5, everyMin: 30, repeats: 2, startMin: 0 }), on: false };
  const oven = { ...brick({ id: "oven", cycleMin: 15, batch: 6, touchMin: 0, everyMin: 30, repeats: 2, startMin: 0 }), follow: true };
  const r = computeScenario(scenario({ modules: [mix, off, oven] }));
  assert.deepEqual(of(r, "oven").passes.map((p) => p.at), [20, 50], "it waits on the mixer, not on the parked brick");
});

test("a second brick is more room in the day, and never pans she did not plan", () => {
  const one = moduleFacts({ id: "r", cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 5, count: 1 });
  const two = moduleFacts({ id: "r", cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 5, count: 2 });
  assert.equal(one.fitsInDay, 2);
  assert.equal(two.fitsInDay, 4, "two chillers hold two days' worth of twelve-hour retards");
  assert.equal(two.rate, one.rate * 2, "and pass them twice as fast");
  // What a second one does NOT do: invent cycles. She planned five and the day
  // now holds four, so four is what it passes -- the fifth is still hers to ask
  // for by raising how many times the brick runs.
  assert.equal(two.repeatsHeld, 4);
  assert.equal(two.output, 48);
  assert.equal(two.perPan, one.perPan, "and a pan still costs the same minutes of it");
  // At one of it, every number is the number it was before `count` existed.
  const plain = moduleFacts({ id: "r", cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 5 });
  assert.equal(plain.fitsInDay, one.fitsInDay);
  assert.equal(plain.rate, one.rate);
  assert.equal(plain.output, one.output);
});

test("overlapping lots are only flagged when her own hands are really in two places", () => {
  // The honest half of the overlap switch. A brick's pass
  // window is the whole cycle, but the minutes that need a PERSON are the touch —
  // so two lots resting at once cost nobody anything, and only a brick she is
  // hands-on for the whole pass doubles her up. Same person, same overlap, two
  // different answers, and the difference is the touch minutes she typed.
  const resting = scenario({ modules: [{ ...brick({ id: "fold", cycleMin: 28, batch: 6, touchMin: 2, everyMin: 10, repeats: 3, person: 1, overlap: true }), follow: false }] });
  const handsOn = scenario({ modules: [{ ...brick({ id: "wash", cycleMin: 18, batch: 6, touchMin: 18, everyMin: 9, repeats: 3, person: 1, overlap: true }), follow: false }] });

  const rest = computeScenario(resting).rows.find((r) => r.person === 1);
  assert.equal(rest.clashes.length, 0, "three lots resting at once are not three of her at once");
  assert.equal(rest.busy, 6, "three passes, two minutes of her each");

  const worked = computeScenario(handsOn).rows.find((r) => r.person === 1);
  assert.equal(worked.clashes.length, 2, "nine minutes apart on an eighteen-minute job is a real collision");
  assert.equal(worked.busy, 36, "and the row counts the union, not 18+18+18");
});

test("a saved scenario keeps its own cycles, not a shared copy of them", () => {
  // `starts` is a list, so a shallow copy would give both scenarios the same one
  // and dragging a cycle in one would silently move the other.
  const sc = scenarioOf({ ...DEFAULT_SCENARIO, modules: [brick({ id: "b", cycleMin: 28, batch: 28, touchMin: 2, everyMin: 30, repeats: 3, startMin: 30 })] });
  const copy = copyScenario(sc, "A copy", "two");
  assert.deepEqual(copy.modules[0].starts, sc.modules[0].starts);
  copy.modules[0].starts[1] = 999;
  assert.notEqual(sc.modules[0].starts[1], 999, "editing the copy cannot move the original");
});

test("a scenario saved before cycles existed can still be copied", () => {
  // Every brick on her phone today has no `starts` list at all -- the field did
  // not exist when it was saved. Copying a scenario must not assume it is there,
  // and the copy must read the same day it did: the brick's own start and pace
  // generate the cycles, which is exactly what it did before.
  const old = { ...DEFAULT_SCENARIO, modules: [{
    id: "b", icon: "🧱", name: "An old brick", on: true, job: "", person: 0,
    cycleMin: 28, batch: 28, touchMin: 2, everyMin: 30, repeats: 3, startMin: 30, people: 1,
  }] };
  const copy = copyScenario(scenarioOf(old), "A copy", "two");
  assert.deepEqual(copy.modules[0].starts, [30, 60, 90], "the brick's own start and pace, as they always were");
  const before = computeScenario(old);
  const after = computeScenario(scenarioOf({ ...copy, id: "" }));
  assert.equal(after.pansPerDay, before.pansPerDay);
  assert.deepEqual(
    after.on.map((m) => [m.id, m.startMin, m.endMin]),
    before.on.map((m) => [m.id, m.startMin, m.endMin]));
});

test("the ladder will buy a second brick rather than promise a cycle a day cannot hold", () => {
  // The buying rung exists for exactly one case: the day is full. It must raise
  // the cycle count too -- a second chiller holds twice the bins but it does not
  // run cycles she never planned -- and it must still respect the day.
  const retard = { id: "r", cycleMin: 720, batch: 12, touchMin: 0, everyMin: 720, repeats: 2, count: 1 };
  const climb = climbSteps(scenario({ target: 36, modules: [retard] }), 36);
  assert.equal(climb.reached, true);
  assert.equal(climb.steps[0].kind, "count", "there is no room left for another cycle, so it buys");
  const after = climb.end.modules.find((m) => m.id === "r");
  assert.equal(after.count, 2);
  assert.equal(after.repeats, 3, "and the cycles that second one makes room for");
  assert.ok(after.repeatsHeld <= after.fitsInDay, "and still nothing a day cannot hold");
  assert.equal(climb.end.pansPerDay, 36);
});

// ── The time cursor (v143) ──────────────────────────────────────────────────
// The hairline she runs down the day to read the clock at a point. It is a
// READING, so the only thing it may ever get wrong is the number it shows — and
// this is that number, worked out from the scale she picked rather than read off
// the screen. Two things matter: it rounds to the same five minutes a dragged
// bar clicks to (so it never names a time the screen could not also set), and it
// gives up rather than guessing past either end of the day.
test("the time cursor reads the clock to the same five minutes a bar snaps to (v143)", () => {
  // 1.6 px a minute is the scale the screen opens at, so 160px along the day is
  // 100 minutes in — and it must say 100, not the 160 px it was handed.
  assert.equal(minuteAtPx(160, 1.6, 720), 100);
  // Rounded to fives, exactly as a drag clicks: 101 and 104 minutes both read
  // 100, and 105 is the first px that reads 105.
  assert.equal(minuteAtPx(162, 1.6, 720), 100, "101 minutes in is read as 100");
  assert.equal(minuteAtPx(166, 1.6, 720), 105, "104 minutes in is read as 105");
  // And it is counted from the start of HER day, so the two together are the
  // reading she sees: her day's start plus the minute the cursor is standing on.
  const t = minuteAtPx(200, 1.6, 720);
  assert.equal(t, 125);
  assert.equal(clockOf(DEFAULT_DAY_START + t), clockOf(DEFAULT_DAY_START + 125));
});

test("the time cursor gives up rather than naming a time off the day (v143)", () => {
  // Past either end there is no time to read, and the caller is told so with a
  // null rather than with a number clamped to the edge — that is what lets the
  // cursor be taken away instead of lying against the last minute of the day.
  assert.equal(minuteAtPx(-4, 1.6, 720), null, "left of the day's first minute");
  assert.equal(minuteAtPx(720 * 1.6 + 20, 1.6, 720), null, "past the end of the day");
  assert.equal(minuteAtPx(720 * 1.6, 1.6, 720), 720, "the last minute itself is still a time");
  // A day that does not end on a five still stops at its own last minute.
  assert.equal(minuteAtPx(722 * 2, 2, 722), 720);
  // A chart with no scale on it has no times on it at all.
  assert.equal(minuteAtPx(100, 0, 720), null);
});
