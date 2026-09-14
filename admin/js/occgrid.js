// occgrid.js — draws the baker's occasion marks on a month grid.
//
// A mark is just data (state.occasions; the pure helpers that read it live in
// calendar.js). This is the one place that turns it into the two shapes the
// stylesheet knows, so a holiday reads the same on EVERY calendar that shows a
// month: More → Delivery Dates, the Orders screen (and the Edit-order pop-up's
// delivery-day picker), a product's Availability card, and every free date
// field. Before this module only the first of those drew marks at all.
//
// Deliberately calendar-agnostic: occPapers() returns absolutely-placed grid
// children to spread into whatever `.cal-grid` is being built, and boxClass()
// returns the classes a day cell adds for its own single-day mark. What a day
// MEANS is left to the screen — a sold day, a delivery day, a chosen one.

import { el } from "./ui.js";
import { occColour, occDays, occSingleDay, occStrength } from "./calendar.js";

// The multi-day sheet: one rounded band per week row the mark crosses, drawn
// UNDER the day cells (see .occ-paper) so day numbers and any green pill stay on
// top. Longer marks are returned first so the CSS paints them behind the shorter
// ones. Bands start at today — a past day keeps its muted look rather than being
// repainted by history.
export function occPapers(occasions, weeks, today) {
  const papers = [];
  const marks = (occasions || [])
    .filter((occ) => occ && occ.from && occ.to && occDays(occ) >= 2)
    .sort((a, b) => occDays(b) - occDays(a)); // long first → painted behind
  for (const occ of marks) {
    weeks.forEach((row, r) => {
      let first = -1, last = -1;
      row.forEach((d, c) => {
        if (d && d >= today && occ.from <= d && d <= occ.to) {
          if (first === -1) first = c;
          last = c;
        }
      });
      if (first === -1) return;
      // Grid row 1 is the day-of-week header, so week r sits on grid row r + 2.
      // Papers are absolutely placed against that area (see .occ-paper), which
      // lets them overlay the row without disturbing the day cells' layout.
      papers.push(el("div", {
        class: `occ-paper occ-${occColour(occ)} occ-${occStrength(occ)}`,
        style: `--gr:${r + 2};--gc1:${first + 1};--gc2:${last + 2};`,
      }));
    });
  }
  return papers;
}

// The single-day sheet: a mark one day long draws a see-through box of the same
// depth in its own day cell (see .cal-cell.sol). Longer marks are the bands
// above, and a past day never sits above a mark.
export function occBox(occasions, iso, past) {
  if (past) return null;
  return occSingleDay(occasions, iso);
}

// The classes a day cell adds for that box — one call, so every calendar hands
// it the same colour and the same depth a band of that length would get.
export function boxClass(sol) {
  return sol ? ` sol occ-${occColour(sol)} occ-${occStrength(sol)}` : "";
}
