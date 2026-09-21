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
  DEFAULT_SCENARIO, clockOf, climbSteps, computeScenario, hoursAndMinutes,
  moduleFacts, moduleOf, passesOf, peopleLanes, repeatsToPass, scenarioOf,
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
  assert.equal(r.lanes.length, 1);
  // The two ways of counting the same thing must agree: a greedy colouring of
  // the touch windows cannot find fewer people than the peak overlap.
  assert.equal(r.trace.peak, r.lanes.length);
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
  // peopleLanes reads module FACTS — the shape computeScenario hands it, with
  // every pass already worked out. Two jobs that meet at minute 10 are one pair
  // of hands, not two.
  const at = (id, startMin) => moduleFacts({
    id, icon: "•", name: id, on: true, cycleMin: 10, batch: 1,
    touchMin: 10, everyMin: 10, repeats: 1, startMin, people: 1,
  });
  const lanes = peopleLanes([at("a", 0), at("b", 10)]);
  assert.equal(lanes.length, 1, "finishing at 10 and starting at 10 is one pair of hands, not two");
  assert.deepEqual(lanes[0].items.map((w) => w.module), ["a", "b"]);
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
