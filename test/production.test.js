// The production line model. The figures asserted here are the ones the whole
// screen rests on, and the first two were worked out by hand from her measured
// times before any of this was written — 18 + 8 + 4 minutes of work for every 6
// pans is 12 pans an hour with one pair of hands, and the oven beside it does 24.
// If this file ever disagrees with those, the screen is lying to her.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PLAN, allocation, computeLine, labourPerPanOf, usefulPeople,
} from "../admin/js/production.js";

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg} (got ${a})`);
const stationOf = (r, key) => r.stations.find((s) => s.key === key);

test("at her measured numbers the hands run at 12 pans an hour and the oven at 24", () => {
  const r = computeLine(DEFAULT_PLAN);
  near(stationOf(r, "hands").rate, 12, "18 + 8 + 4 min for 6 pans is 5 min a pan, so 12 an hour");
  near(stationOf(r, "oven").rate, 24, "6 pans every 15 min is 24 an hour");
  near(r.labourPerPan, 5, "three jobs add up to 5 minutes of work for every pan");
});

test("a second pair of hands doubles the line, and a third buys nothing while the oven is 24", () => {
  // 300 trays over 10 hours is 30 an hour, deliberately clear of the oven's 24,
  // so the oven and the hands are the only two things left that can bind.
  const one = computeLine({ ...DEFAULT_PLAN, trays: 300, hours: 10 });
  const two = computeLine({ ...DEFAULT_PLAN, trays: 300, hours: 10, people: 2 });
  const three = computeLine({ ...DEFAULT_PLAN, trays: 300, hours: 10, people: 3 });

  near(stationOf(one, "hands").rate, 12, "one pair");
  near(stationOf(two, "hands").rate, 24, "two pairs");
  near(stationOf(three, "hands").rate, 36, "three pairs — but the oven is still 24");

  // The whole point: the third pair is standing about, because the oven now sets
  // the pace, so the day is no longer than it was with two.
  assert.equal(two.dayCapacity, three.dayCapacity,
    "the third pair of hands buys no pans while the oven is the slow one");
  assert.equal(three.bottleneck.key, "oven", "so the oven is named as the one holding it back");
});

test("the chiller, not the oven, is what caps her day at her own numbers", () => {
  const r = computeLine(DEFAULT_PLAN);
  assert.equal(r.bottleneck.key, "chiller",
    "12 trays over a 5-hour day is 2.4 pans an hour — far below the oven's 24");
  assert.equal(r.dayCapacity, 12, "so the day is 12 pans, whatever her hands can do");
  assert.equal(r.shortfall, 48, "against the 60 she wants");
});

test("more trays is the only move that buys pans at her numbers", () => {
  const r = computeLine(DEFAULT_PLAN);
  assert.equal(r.levers[0].key, "trays", "the chiller is the wall, so trays come first");
  assert.equal(r.levers[0].gain, 6, "six more trays is six more pans");

  const flat = r.levers.filter((l) => l.gain <= 0).map((l) => l.key);
  assert.deepEqual(flat.sort(), ["hours", "oven", "pans", "people", "wash"],
    "and every other move buys nothing at all — each one still gets a row saying so");
});

test("once the chiller is big enough the hands become the wall", () => {
  const r = computeLine({ ...DEFAULT_PLAN, trays: 60 });
  assert.equal(r.bottleneck.key, "hands");
  assert.equal(r.dayCapacity, 60, "12 pans an hour for 5 hours is exactly the 60 she wants");
});

test("usefulPeople is where another pair of hands stops buying anything", () => {
  assert.equal(usefulPeople(DEFAULT_PLAN), 1,
    "at her numbers the chiller caps the day, so one pair already covers it");
  assert.equal(usefulPeople({ ...DEFAULT_PLAN, trays: 200, hours: 10 }), 2,
    "with the chiller out of the way, two pairs are what the 24-an-hour oven can use");
});

test("the seats split by largest remainder, so a fraction of a person is never left over", () => {
  // Named rather than positional: with six jobs on the list an array of seats
  // says nothing about who stands where.
  const seats = (people) => Object.fromEntries(
    allocation({ ...DEFAULT_PLAN, people }).map((j) => [j.key, j.seats]));
  assert.deepEqual(seats(1),
    { mix: 0, wash: 1, scale: 0, top: 0, swap: 0, cool: 0 },
    "one pair does the lot, starting at the wash");
  assert.deepEqual(seats(2),
    { mix: 0, wash: 1, scale: 0, top: 1, swap: 0, cool: 0 },
    "the second goes to the topping, the biggest remaining share");
  assert.deepEqual(seats(3),
    { mix: 0, wash: 2, scale: 0, top: 1, swap: 0, cool: 0 },
    "the third goes back to the wash, which is the biggest single job");
  const all = Object.values(seats(3));
  assert.equal(all.reduce((s, n) => s + n, 0), 3, "every pair is placed somewhere");
});

test("an empty field or an unmeasured station is left out rather than breaking the line", () => {
  const r = computeLine({ ...DEFAULT_PLAN, ovenMin: 0, mixerPans: 0 });
  assert.ok(!Number.isFinite(stationOf(r, "oven").rate),
    "an oven with no minutes is not a limit at all");
  assert.equal(r.bottleneck.key, "chiller", "so the next real constraint is named instead");

  const none = computeLine({ people: 0, washMin6: 0, topMin6: 0, swapMin6: 0 });
  assert.equal(none.plan.people, 1, "zero pairs of hands still counts as one person");
});

test("a day bigger than one mix says how many mixes it takes", () => {
  const r = computeLine({ ...DEFAULT_PLAN, trays: 60, mixerPans: 25 });
  assert.equal(r.mixes, 3, "60 pans from a 25-pan mixer is three mixes, at 25, 25 and 10");
  const small = computeLine({ ...DEFAULT_PLAN, trays: 60, mixerPans: 100 });
  assert.equal(small.mixes, 1, "and a mixer that covers the day is never mentioned");
});

// The rest of the kitchen work (20 Sep 2026). She pointed out the line was only
// counting three jobs — nothing for weighing in the mixer, nothing for weighing
// the dough out, nothing for cooling and packing. These tests hold the shape of
// the fix: an untimed step is NAMED, never silently counted as free.

test("a step she has not timed is named, not counted as free", () => {
  const r = computeLine(DEFAULT_PLAN);
  assert.deepEqual(r.unmeasured,
    ["Weighing in and loading the mixer", "Weighing the dough out into pans", "Cooling and packing"],
    "the three steps with no minutes on them are reported, by name");
  near(r.labourPerPan, 5, "and they add nothing to the work until she times them");
});

test("once the missing steps are timed they slow the hands down and shorten the day", () => {
  const timed = { ...DEFAULT_PLAN, trays: 60, mixMin: 20, scaleMin6: 3, coolMin6: 12 };
  const r = computeLine(timed);
  // 20 min a mix over 25 pans is 0.8, plus 0.5 for scaling and 2.0 for packing,
  // on top of the 5 minutes of washing, topping and swapping.
  near(r.labourPerPan, 8.3, "the whole day's hand-work, per pan");
  assert.deepEqual(r.unmeasured, [], "nothing is left untimed");
  near(stationOf(r, "hands").rate, 7.23, "one pair now does about 7.2 pans an hour, not 12");
  assert.equal(r.bottleneck.key, "hands", "so the hands, not the chiller, are the wall");
  // The figure she asked about: the day she hoped to make in five hours.
  assert.equal(r.dayCapacity, 36, "five hours now makes 36 pans, not the 60 she wants");
});

test("the mixer's minutes are spread over the mix, so a bigger mixer is less work a pan", () => {
  const small = { ...DEFAULT_PLAN, mixMin: 20, mixerPans: 25 };
  const big = { ...DEFAULT_PLAN, mixMin: 20, mixerPans: 50 };
  assert.ok(labourPerPanOf(big) < labourPerPanOf(small),
    "the same 20 minutes of weighing in costs half as much labour over twice the dough");
  near(labourPerPanOf(small), 5.8, "20 minutes over a 25-pan mix, on top of the 5 minutes a pan");
  near(labourPerPanOf(big), 5.4, "the same work over a 50-pan mix");
});

test("a mixer with no size set cannot spread its time, and says so rather than dividing by zero", () => {
  const r = computeLine({ ...DEFAULT_PLAN, mixMin: 20, mixerPans: 0 });
  near(r.labourPerPan, 5, "with no batch to spread it over, the mixing time counts for nothing");
  assert.ok(r.unmeasured.includes("Weighing in and loading the mixer"),
    "and the step is reported as untimed, because a time with nowhere to go is not a measurement");
});
