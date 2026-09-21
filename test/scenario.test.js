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
  DEFAULT_DAY_START, DEFAULT_SCENARIO, PX_PER_MIN_CHOICES, blankModule, clockOf,
  climbSteps, computeScenario, concurrency, copyScenario, hoursAndMinutes,
  moduleFacts, moduleOf, moveModule, newModuleId, passesOf, peopleRows,
  removeModule, repeatsToPass, scenarioOf, touchWindows,
  LINE_JOBS, jobOf, scenarioPlanPatch, scenarioSummary, SISTER_SCENARIO,
} from "../admin/js/scenario.js";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg} (got ${a})`);
const of = (r, id) => r.modules.find((m) => m.id === id);

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

test("the ladder climbs while the day has room, then stops and names the real answer", () => {
  // Thirty-six pans is not reachable on twelve trays, and the ladder says so
  // rather than inventing a pass the day cannot hold. Three rungs get her from
  // twelve pans to twenty-four; the fourth module it would have to touch is the
  // retard, which is already running as often as a day allows.
  const climb = climbSteps(DEFAULT_SCENARIO, 36);
  assert.equal(climb.reached, false);
  assert.equal(climb.end.pansPerDay, 24, "twelve trays cycled twice a day is the most this line can do");
  assert.deepEqual(climb.steps.map((s) => s.id), ["load", "retard", "unload"]);
  assert.deepEqual(climb.steps.map((s) => [s.from, s.to]), [[1, 3], [1, 2], [1, 2]]);
  assert.equal(climb.steps[0].before, 12);
  assert.equal(climb.steps[0].wallThen.id, "retard", "relieving the first tie reveals the next");
  assert.equal(climb.steps[2].after, 24);
  // And the wall it stops on is the one that needs buying for, not running more.
  assert.equal(climb.end.wall.id, "retard");
  assert.equal(climb.end.wall.repeatsHeld, climb.end.wall.fitsInDay);
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
  // The mixer's 6 minutes a mix, its 28-pan bowl; the wash's 18 minutes and the
  // top's 8; the oven brick's 4 minutes of hands, its 6 pans and its 15-minute
  // bake; the retard's 12 trays. Every one of them is a number she typed.
  // The hands are the peak at once, not the number of rows she has drawn: the
  // seeded day is laid out so one pair covers every job, brick by brick.
  assert.deepEqual(p.patch, {
    target: 36, people: 1,
    mixMin: 6, mixerPans: 28,
    washMin6: 18, topMin6: 8, coolMin6: 12,
    swapMin6: 4, ovenPans: 6, ovenMin: 15,
    trays: 12,
  });
  // Nothing was invented for the steps a seeded brick does not cover.
  assert.equal(p.patch.scaleMin6, undefined, "no brick weighs the dough out, so that step is left alone");
  assert.deepEqual(p.left, ["Weighing the dough out into pans"]);
  // And the bricks that are not a step of the line are named, not silently lost.
  assert.deepEqual(p.unmapped, ["The fold loop", "Load the chiller", "Unload the chiller"]);
});

test("a brick's minutes are scaled onto six pans, not handed over raw", () => {
  // One wash brick that does 12 pans in 30 minutes is 15 minutes for every 6.
  const s = scenarioOf({
    target: 0,
    modules: [{ id: "wash", name: "Wash, oil and fill", job: "wash", on: true,
      cycleMin: 30, batch: 12, touchMin: 30, everyMin: 30, repeats: 1, startMin: 0, people: 1 }],
  });
  const p = scenarioPlanPatch(s, { washMin6: 18 });
  assert.equal(p.patch.washMin6, 15);
  const line = p.lines.find((l) => l.key === "washMin6");
  assert.equal(line.from, 18);
  assert.equal(line.changes, true, "18 → 15 is a real change and the screen has to say so");
});

test("a brick saved before jobs existed is matched on the name it was seeded with", () => {
  const old = { id: "w", name: "Wash, oil and fill", on: true, cycleMin: 18, batch: 6,
    touchMin: 20, everyMin: 18, repeats: 6, startMin: 0, people: 1 };
  assert.equal(jobOf(old), "wash", "no job field, and the name is the one the app seeded");
  assert.equal(scenarioPlanPatch({ modules: [old] }, {}).patch.washMin6, 20);
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
  assert.equal(p.patch.washMin6, 18);
  assert.equal(p.patch.ovenMin, undefined, "the brick is off, so the line answers without it");
  assert.deepEqual(p.unmapped, [], "and it is not even named as skipped work");
});

test("two bricks that admit to the same job are named, and the first one wins", () => {
  const brick = (id, touchMin) => ({ id, name: id, job: "wash", on: true,
    cycleMin: 18, batch: 6, touchMin, everyMin: 18, repeats: 1, startMin: 0, people: 1 });
  const p = scenarioPlanPatch(scenarioOf({ modules: [brick("a", 18), brick("b", 25)] }), {});
  assert.equal(p.patch.washMin6, 18, "the first brick in the day's order is the one that crosses");
  assert.deepEqual(p.doubled, ["Wash, oil and fill"]);
});

test("the load says what it did and did not change", () => {
  const p = scenarioPlanPatch(DEFAULT_SCENARIO, { washMin6: 18, trays: 8, ovenMin: 12 });
  const line = (key) => p.lines.find((l) => l.key === key);
  assert.equal(line("washMin6").changes, false, "the same number is not a change");
  assert.equal(line("trays").from, 8, "8 trays → 12 is a change she is shown before it happens");
  assert.equal(line("trays").to, 12);
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
  }
});
