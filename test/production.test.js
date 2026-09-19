// The production line model. The figures asserted here are the ones the whole
// screen rests on, and the first two were worked out by hand from her measured
// times before any of this was written — 18 + 8 + 4 minutes of work for every 6
// pans is 12 pans an hour with one pair of hands, and the oven beside it does 24.
// If this file ever disagrees with those, the screen is lying to her.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PLAN, allocation, computeLine, usefulPeople,
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
  const seats = (people) => allocation({ ...DEFAULT_PLAN, people }).map((j) => j.seats);
  assert.deepEqual(seats(1), [1, 0, 0], "one pair does the lot, starting at the wash");
  assert.deepEqual(seats(2), [1, 1, 0], "the second goes to the topping, the biggest remaining share");
  assert.deepEqual(seats(3), [2, 1, 0], "the third goes back to the wash, which is the biggest single job");
  assert.equal(seats(3).reduce((s, n) => s + n, 0), 3, "every pair is placed somewhere");
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
