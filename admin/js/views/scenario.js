// views/scenario.js — the scenario planner (21 Sep 2026).
//
// She asked to design the line rather than only read it: modules she assembles
// like Lego, each scenario revealing its cycle time, and the module start times
// tuned to shrink the people it needs. All the arithmetic is in js/scenario.js
// — this screen only draws it, so the two can never disagree.
//
// The method it is built around is hers, in her words: ask for more pans than
// the line makes, find the one module that stops you, relieve exactly that, and
// meet the next wall. That ladder is the climb card, and it is computed from the
// modules rather than written down — change one number and it is a different
// climb.
//
// It is a planner she types into: nothing here reads an order, and nothing here
// blocks a sale.

import { el, button, showPopup, toast } from "../ui.js";
import { save } from "../state.js";
import { trim } from "../production.js";
import {
  computeScenario, climbSteps, DEFAULT_SCENARIO, hoursAndMinutes, clockOf,
} from "../scenario.js";

// The timeline is a day wide. At one pixel per minute a 15-minute bake would be
// a single pixel, so the track is drawn at this scale and the card scrolls
// sideways — which is what a timing diagram is, and why this one screen is
// allowed to be wider than the rest of the app.
const PX_PER_MIN = 1.6;
const TICK_MIN = 120; // a clock reading every two hours

// A colour per module, so a bar on the timeline and the person carrying it can
// be matched by eye. It cycles, so a module added later still gets a colour.
const TONES = 8;

export function renderScenario(root, state) {
  const sc = ensureScenario(state);
  const readout = el("div", {});
  let dead = false;

  // Only the answers are repainted when something changes — never the fields —
  // so the box she is typing in keeps its place and its cursor.
  const on = {
    refresh: () => {
      if (!dead) readout.replaceChildren(...blocks(sc, on));
    },
    // Every edit goes through the app's own save, which is what the sync engine
    // and the storefront both hang off — so the other phone's planner catches up
    // the same way the rest of the settings do.
    persist: () => save(state),
  };

  root.classList.add("wide");
  const tabbar = document.getElementById("tabbar");
  if (tabbar) tabbar.classList.add("wide");

  root.replaceChildren(askCard(sc, on), readout);
  on.refresh();

  return () => {
    dead = true;
    root.classList.remove("wide");
    if (tabbar) tabbar.classList.remove("wide");
  };
}

// The stored scenario, seeded on first open so the screen says something true
// before she has typed anything. Once seeded it is hers — a default never
// overwrites a number she has changed.
function ensureScenario(state) {
  const s = state.settings.scenario || (state.settings.scenario = {});
  if (!Array.isArray(s.modules) || !s.modules.length) {
    s.modules = DEFAULT_SCENARIO.modules.map((m) => ({ ...m }));
  }
  if (s.target == null) s.target = DEFAULT_SCENARIO.target;
  if (!s.name) s.name = DEFAULT_SCENARIO.name;
  if (s.note == null) s.note = DEFAULT_SCENARIO.note;
  return s;
}

// ── What she is asking for ─────────────────────────────────────────────────
function askCard(sc, on) {
  const name = el("input", { class: "input", type: "text", value: sc.name || "" });
  name.addEventListener("input", () => { sc.name = name.value; on.persist(); });

  const target = el("input", {
    class: "input", type: "number", inputmode: "numeric", min: "0", step: "1",
    value: sc.target == null ? "" : String(sc.target),
  });
  target.addEventListener("input", () => {
    const n = Number(target.value);
    if (Number.isFinite(n) && n >= 0) { sc.target = n; on.persist(); }
    on.refresh();
  });

  return el("div", {},
    el("p", { class: "card-sub", style: "margin:0 0 12px" },
      "Design the line the way you would build it: modules on a clock, each with its own cycle time. Every figure here is a starting number you are meant to change — nothing on this screen reads an order or blocks a sale."),
    el("div", { class: "card" },
      el("p", { class: "card-title" }, "This scenario"),
      el("p", { class: "card-sub", style: "margin:0 0 10px" },
        "A scenario is the sum of its modules. Scenario 1 is the line you have now with no fridge in it — the fridge is in the list switched off, so you can see what adding one would buy without buying one."),
      el("div", { class: "field" },
        el("label", {}, "Pans a day you want from it"),
        target,
        el("div", { class: "hint" },
          "Raise this and the ladder below answers again: it names the module that stops you at this number, what to change to get past it, and what becomes the wall next.")),
      el("div", { class: "field" },
        el("label", {}, "What this scenario is called"),
        name)));
}

function blocks(sc, on) {
  const r = computeScenario(sc);
  const climb = climbSteps(sc, r.target);
  return [answerCard(r), climbCard(r, climb, sc, on), dayCard(r, sc, on), parkedCard(r, sc, on)];
}

// ── What it makes ──────────────────────────────────────────────────────────
function answerCard(r) {
  const kids = [
    el("p", { style: "margin:0 0 6px" },
      "This scenario makes ",
      el("b", {}, `${r.pansPerDay} ${r.pansPerDay === 1 ? "pan" : "pans"}`),
      r.target > 0 ? `, and you want ${r.target}.` : "."),
  ];

  if (r.target > 0 && r.shortfall > 0) {
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 10px" },
      `That is ${r.shortfall} ${r.shortfall === 1 ? "pan" : "pans"} short of the day.`));
  } else if (r.target > 0) {
    const spare = r.pansPerDay - r.target;
    kids.push(el("p", { class: "card-sub", style: "margin:0 0 10px" },
      spare > 0
        ? `That covers the day, with ${spare} ${spare === 1 ? "pan" : "pans"} to spare.`
        : "That is exactly the day — there is no slack in it at all."));
  }

  kids.push(factGrid(r));
  kids.push(el("p", { style: "margin:10px 0 0" },
    el("b", {}, `${r.wall.icon} ${r.wall.name} sets your pace.`)));
  kids.push(el("p", { class: "card-sub", style: "margin:4px 0 0" }, wallWhy(r)));

  return el("div", {}, el("h2", { class: "section" }, "What it makes"), el("div", { class: "card" }, ...kids));
}

function factGrid(r) {
  return el("div", { class: "facts" },
    fact("Pans a day", String(r.pansPerDay), "the least any module passes"),
    fact("Cycle time", `${trim(round1(r.cycleMin))} min`, "for one pan off the line"),
    fact("People needed", String(r.people), r.people === 1 ? "pair of hands" : "pairs of hands"),
    // "The day" would be a lie the moment the chiller cycles twice: a 12-hour
    // retard makes a 24-pan run span more than 24 hours of clock, so the number
    // beside "pans a day" must not also claim to be a day. This is how long the
    // run takes from her first mix to her last unload.
    fact("The run", hoursAndMinutes(r.endMin), "first mix to last unload, night included"));
}

function fact(label, value, sub) {
  return el("div", { class: "fact" },
    el("div", { class: "fact-label" }, label),
    el("div", { class: "fact-value" }, value),
    el("div", { class: "fact-sub" }, sub));
}

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Why this module and not another — in the module's own numbers, and naming the
// tie when there is one. A tie matters: several modules passing the same small
// number is one shared limit wearing several hats, and relieving just one of
// them will not move the day at all.
function wallWhy(r) {
  const w = r.wall;
  if (!w.id) return "Switch a module on and the line will answer.";
  if (w.batch <= 0 || w.repeatsHeld <= 0) {
    return `${w.name} cannot pass anything at all — it has no batch size or no passes in the day.`;
  }
  const tied = r.on.filter((f) => f.id !== w.id && f.output === w.output);
  const above = r.on
    .filter((f) => f.output > w.output)
    .sort((a, b) => a.output - b.output)[0];

  const lead = `${w.repeatsHeld} ${w.repeatsHeld === 1 ? "pass" : "passes"} of ${w.batch} pans is ${w.output} pans a day`;
  if (w.capped) {
    return `${lead} — but a ${hoursAndMinutes(w.cycleMin)} pass only fits ${w.fitsInDay} times in a day, so running it more often is not something a day can hold. This one has to take more pans at once.`;
  }
  if (tied.length) {
    return `${lead} — and ${tied.length === 1 ? "one other module passes" : `${tied.length} other modules pass`} the same ${w.output}, so they are one limit between them. Relieving only one of them will not move the day.`;
  }
  if (above) {
    return `${lead}, and the next tightest is ${above.icon} ${above.name} at ${above.output}. That is what the day can deliver.`;
  }
  return `${lead}, and nothing else is anywhere near it. That is what the day can deliver.`;
}

// ── The climb ──────────────────────────────────────────────────────────────
//
// The method she described, run for her: raise the number until something stops
// her, relieve that one thing, and meet the next wall. Every rung is one module
// and one change, so the list reads as the order she would do them in.
function climbCard(r, climb, sc, on) {
  const kids = [
    el("p", { class: "card-sub", style: "margin:0 0 10px" },
      "Raise the day until something stops you, fix that one thing, and meet the next wall. This is that ladder, for the number you asked for."),
  ];

  // NOTE the order: `climb.reached` means the LADDER gets there, not that the
  // line already does. Read the wrong way round, a 12-pan line asking for 36
  // reports "already makes your 36" and never shows the ladder at all.
  if (r.target <= 0) {
    kids.push(el("p", { class: "card-sub" },
      "Type how many pans a day you want above, and the ladder appears here."));
  } else if (r.pansPerDay >= r.target) {
    kids.push(el("p", { style: "margin:0 0 6px" },
      el("b", {}, `This scenario already makes your ${r.target} pans.`)));
    kids.push(el("p", { class: "card-sub", style: "margin:0" },
      "Raise the number you want and the ladder will find the next thing in the way."));
  } else if (climb.steps.length) {
    kids.push(el("div", { class: "climb-list" }, ...climb.steps.map((s, i) => climbRow(s, i))));
    kids.push(el("p", { class: "card-sub", style: "margin:10px 0 0" },
      climb.reached
        ? `That reaches the ${climb.want} pans you asked for.`
        : `That takes it to ${climb.end.pansPerDay}. ${climb.end.wall.icon} ${climb.end.wall.name} is still the wall at the end, and running that one more often will not move it — it needs a different answer.`));
    // The wall that ends the ladder when the day, not her, is what stopped it.
    // This is the buying decision, said plainly: a pass that is already running
    // as often as a day allows cannot be run more often, so it has to take more
    // at once. For her chiller that is trays, and it is the whole reason this
    // screen can also tell her NOT to buy.
    const stuck = climb.end.wall;
    if (!climb.reached && stuck.id && stuck.repeatsHeld >= stuck.fitsInDay && stuck.batch > 0) {
      kids.push(el("p", { class: "card-sub", style: "margin:6px 0 0" },
        `A ${hoursAndMinutes(stuck.cycleMin)} pass fits ${stuck.fitsInDay} ${stuck.fitsInDay === 1 ? "time" : "times"} in a day, and it is already running that often. So this one cannot be run more often — it has to take more pans at once, which means ${stuck.batch} in a pass becoming more than ${stuck.batch}.`));
    }
    kids.push(el("div", { class: "popup-actions" },
      button("Use these numbers", () => applyClimb(sc, climb, on), "primary")));
  } else {
    kids.push(el("p", { class: "card-sub" },
      "Nothing on this ladder moves that number. Look at the modules below — one of them passes nothing at all."));
  }

  return el("div", {}, el("h2", { class: "section" }, "The climb"), el("div", { class: "card" }, ...kids));
}

function climbRow(s, i) {
  return el("div", { class: "climb-step" },
    el("div", { class: "climb-num" }, String(i + 1)),
    el("div", { class: "climb-body" },
      el("div", { class: "climb-what" }, `${s.icon} ${s.module}`),
      el("div", { class: "li-sub" },
        `${s.from} → ${s.to} ${s.to === 1 ? "pass" : "passes"} in the day, at ${s.batch} pans a pass.`),
      el("div", { class: "li-sub" },
        `That takes the day from ${s.before} to ${s.after} pans` +
          (s.wallThen && s.wallThen.id ? `, and then ${s.wallThen.icon} ${lower(s.wallThen.name)} is the wall.` : ".")),
      // A rung that moves nothing has to say why, or it reads as a dud. Tied
      // modules are one limit wearing several hats: the chiller's three passes
      // only free the day once all three have been raised.
      s.after === s.before
        ? el("div", { class: "li-sub" }, "On its own that buys nothing — the other passes of this same limit are still where they were. Keep going.")
        : null));
}

// The one tap that makes the ladder real. It writes only `repeats`, and only on
// the modules the ladder named — every other number she has typed is left alone.
function applyClimb(sc, climb, on) {
  const to = new Map(climb.steps.map((s) => [s.id, s.to]));
  sc.modules = sc.modules.map((m) => (to.has(m.id) ? { ...m, repeats: to.get(m.id) } : m));
  on.persist();
  toast("The ladder is in the modules now");
  on.refresh();
}

// ── The day ────────────────────────────────────────────────────────────────
//
// The timing diagram: one row per module, the whole day across, and a row for
// each person underneath. It is the thing the capacity screen cannot draw — not
// how fast a station is, but WHEN it runs and which of those times collide.
function dayCard(r, sc, on) {
  return el("div", {},
    el("h2", { class: "section" }, "The day"),
    el("p", { class: "card-sub", style: "margin:0 0 8px" },
      "Every module as a bar, from the minute it starts. A solid block is you standing at it; a pale one is it running without you. Swipe sideways — the day is wider than the phone. Tap any row to change when it starts."),
    el("div", { class: "card tl-card" }, timeline(r, sc, on)));
}

function timeline(r, sc, on) {
  const trackW = Math.round(r.windowMin * PX_PER_MIN);

  return el("div", { class: "tl" },
    el("div", { class: "tl-inner" },
      rulerRow(trackW),
      ...r.modules.map((m, i) => moduleRow(m, i, trackW, r.windowMin, sc, on)),
      // The people are the answer to her question, so they are drawn as what
      // they are: a row each, carrying the modules that row attends.
      el("div", { class: "tl-split" }, "People"),
      ...personRows(r, trackW)));
}

function rulerRow(trackW) {
  const ticks = [];
  for (let t = 0; t <= trackW / PX_PER_MIN; t += TICK_MIN) {
    ticks.push(el("div", { class: "tl-tick", style: `left:${Math.round(t * PX_PER_MIN)}px` },
      el("span", {}, clockOf(t))));
  }
  return el("div", { class: "tl-row tl-ruler" },
    el("div", { class: "tl-name" }, el("div", { class: "tl-sub" }, "the clock")),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...ticks));
}

function moduleRow(m, idx, trackW, windowMin, sc, on) {
  const tone = `tone-${idx % TONES}`;

  if (!m.on) {
    return el("div", { class: "tl-row off", onclick: () => editModule(m, sc, on) },
      el("div", { class: "tl-name" },
        el("div", { class: "tl-name-top" }, `${m.icon} ${m.name}`),
        el("div", { class: "tl-sub" }, "not in this scenario")),
      el("div", { class: "tl-track", style: `width:${trackW}px` }));
  }

  const bars = m.passes.filter((p) => p.at < windowMin).map((p) => {
    const left = Math.round(p.at * PX_PER_MIN);
    const right = Math.round(Math.min(p.end, windowMin) * PX_PER_MIN);
    const touchW = p.touchTo > p.touchFrom
      ? Math.max(2, Math.round((p.touchTo - p.touchFrom) * PX_PER_MIN))
      : 0;
    return el("div", { class: `tl-bar ${tone}`, style: `left:${left}px;width:${Math.max(4, right - left)}px` },
      touchW ? el("div", { class: "tl-touch", style: `width:${touchW}px` }) : null);
  });

  return el("div", { class: "tl-row", onclick: () => editModule(m, sc, on) },
    el("div", { class: "tl-name" },
      el("div", { class: "tl-name-top" },
        `${m.icon} ${m.name}`,
        m.needsYou ? null : el("span", { class: "badge badge-past" }, "itself"),
        // She has asked for more passes than a day holds. The number is kept as
        // she typed it — the row just counts honestly and says why.
        m.capped ? el("span", { class: "badge badge-over" }, "a day's limit") : null),
      el("div", { class: "tl-sub" },
        m.needsYou
          ? `${clockOf(m.startMin)} · ×${m.repeatsHeld} · ${trim(m.perPan)} min a pan`
          : `${clockOf(m.startMin)} · ×${m.repeatsHeld} · no hands`)),
    el("div", { class: "tl-track", style: `width:${trackW}px` }, ...bars));
}

function personRows(r, trackW) {
  const index = new Map(r.modules.map((m, i) => [m.id, i]));
  if (!r.lanes.length) {
    return [el("div", { class: "tl-row" },
      el("div", { class: "tl-name" }, el("div", { class: "tl-sub" }, "nobody")),
      el("div", { class: "tl-track", style: `width:${trackW}px` }))];
  }
  return r.lanes.map((lane, i) => {
    const busy = lane.items.reduce((sum, w) => sum + (w.to - w.from), 0);
    return el("div", { class: "tl-row person" },
      el("div", { class: "tl-name" },
        el("div", { class: "tl-name-top" }, `👤 Person ${i + 1}`),
        el("div", { class: "tl-sub" }, `${hoursAndMinutes(busy)} of work`)),
      el("div", { class: "tl-track", style: `width:${trackW}px` },
        ...lane.items.map((w) => el("div", {
          class: `tl-bar tone-${(index.get(w.module) || 0) % TONES}`,
          style: `left:${Math.round(w.from * PX_PER_MIN)}px;width:${Math.max(4, Math.round((w.to - w.from) * PX_PER_MIN))}px`,
        }))));
  });
}

// ── A module, opened ───────────────────────────────────────────────────────
//
// Everything about one module in one place, in the order the day runs through
// it: what it is, how long it holds, how much of her it takes, and when it
// starts. The start is the knob she named, so it sits beside the explanation of
// what turning it does.
function editModule(saved, sc, on) {
  showPopup(`${saved.icon} ${saved.name}`, (refresh, close) => {
    // The module list is edited in place, so each field writes only its own
    // value back; the screen behind the pop-up catches up when it closes.
    const live = sc.modules.find((m) => m.id === saved.id) || saved;

    const set = (key, raw, opt) => {
      const n = Number(raw);
      const min = opt && opt.min != null ? opt.min : 0;
      if (!Number.isFinite(n) || n < min) return;
      live[key] = opt && opt.int ? Math.round(n) : n;
      on.persist();
      refresh();
    };

    const f = (key, label, hint, opt = {}) => {
      const input = el("input", {
        class: "input", type: "number", inputmode: "decimal",
        min: String(opt.min == null ? 0 : opt.min), step: String(opt.step || 1),
        value: String(live[key] == null ? 0 : live[key]),
      });
      input.addEventListener("input", () => set(key, input.value, opt));
      return el("div", { class: "field" }, el("label", {}, label), input,
        hint ? el("div", { class: "hint" }, hint) : null);
    };

    const toggle = el("input", { type: "checkbox", checked: live.on !== false });
    toggle.addEventListener("change", () => {
      live.on = toggle.checked;
      on.persist();
      on.refresh();
    });

    return el("div", {},
      el("div", { class: "field" },
        el("label", { class: "check-row" }, toggle,
          el("span", { class: "check-label" }, "This module is in the scenario")),
        el("div", { class: "hint", style: "margin-top:6px" },
          "This is the Lego brick. Switch it off and the line answers without it, so you can see what a machine would buy you before you buy it.")),
      f("cycleMin", "Minutes one pass holds it", "How long the dough is in the mixer, the pan is in the oven, or the dough sits between folds.", { min: 1 }),
      f("batch", "Pans in one pass", "How many pans that one pass deals with.", { min: 1 }),
      f("touchMin", "Minutes of you, per pass", "0 means it runs itself — the honest reading of the retard and of the bake.", { min: 0 }),
      f("everyMin", "Minutes from one pass to the next", "The pace it repeats at. For your fold that is the rest plus the fold.", { min: 1 }),
      f("repeats", "Passes in the day", "How many times this module runs. The climb card changes this one for you — and a day can only hold so many, so a pass that takes hours will be counted at the few that fit.", { min: 1, int: true }),
      f("startMin", "Minutes in, when the first pass starts", "0 is the start of your day, so 90 is an hour and a half in. Turn this one to bring the people needed down.", { min: 0 }),
      f("people", "People this pass needs", "Nearly always 1 — two people at one mixer is a different job.", { min: 1, int: true }),
      el("div", { class: "popup-actions" }, button("Done", close, "primary")));
  });
}

function lower(s) {
  return String(s || "").charAt(0).toLowerCase() + String(s || "").slice(1);
}

// ── What is parked ─────────────────────────────────────────────────────────
function parkedCard(r, sc, on) {
  if (!r.parked.length) return el("div", {});
  return el("div", {},
    el("h2", { class: "section" }, "Not in this scenario"),
    el("div", { class: "card" },
      el("p", { class: "card-sub", style: "margin:0 0 8px" },
        "A module that is switched off cannot be the bottleneck, and adds nothing to the day. These are the bricks you have set aside — tap one to put it in."),
      ...r.parked.map((m) => el("div", { class: "info-row tappable", onclick: () => editModule(m, sc, on) },
        el("span", { class: "j-what" }, `${m.icon} ${m.name}`),
        el("span", { class: "info-val" }, m.needsYou ? "needs you" : "runs itself")))));
}
