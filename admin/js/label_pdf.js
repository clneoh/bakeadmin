// admin/js/label_pdf.js — a packing label as a PDF FILE, at the sticker's own size.
//
// ⭐ WHY A FILE AT ALL. Her label printer is Wi-Fi and speaks its own app's protocol; Android's print
// services (Default Print Service / Mopria) cannot see it, so Chrome cannot print to it. ⚠️ **A web page
// never sees a printer** — but it CAN hand a file to the app that does. ⭐ So the label is built as a
// 100 × 150 mm PDF and shared; the printer's own app opens it and prints.
//
// The content is `packingLabelData`'s own rows — the same rows the on-screen sheet draws — so the shared
// label cannot say something different from the printed one.

import { canDrawAll, makePdf, textWidth, wrapText } from "./pdf.js";

const MM = 72 / 25.4; // PDF points per millimetre
export const LABEL_W = 100 * MM;   // 283.46 pt
export const LABEL_H = 150 * MM;   // 425.20 pt
const MARGIN = 10 * MM;            // 28.35 pt
const INNER = LABEL_W - MARGIN * 2;

// Class → [size, font]. The classes are the ones `packingLabelData` returns.
const STYLE = {
  brand: [11, "F2"], meta: [8, "F1"], date: [8, "F1"], code: [15, "F2"], customer: [11, "F2"],
  item: [9, "F1"], items: [9, "F1"], note: [8, "F1"], address: [8, "F1"],
  "mail-sec": [8, "F2"], "mail-name": [10, "F2"], "mail-line": [9, "F1"],
};
const [BASE_SIZE, BASE_FONT] = [9, "F1"];

const textOf = (row) => String((row && row[1]) || "");
const classOf = (row) => String((row && row[0]) || "");

// Lay the rows out once at a given scale. Returns the ops and the height they used, so the caller can
// shrink and try again — the same scale-to-fit idea as the printed sheet (v610), in PDF points.
function layout(rows, scale = 1, measure = false) {
  const ops = [];
  let y = LABEL_H - MARGIN;
  const top = y;
  for (const row of rows || []) {
    const cls = classOf(row);
    const text = textOf(row);
    if (!text.trim()) continue;
    const [wantSize, font] = STYLE[cls] || [BASE_SIZE, BASE_FONT];
    const size = Math.max(5, wantSize * scale);
    const lead = size * 1.32;
    const lines = wrapText(text, INNER, { font, size });
    for (const line of lines) {
      y -= lead;
      if (!measure && y < MARGIN) break;
      // Mailing blocks are left-aligned like an address; the bag labels are centred.
      const x = cls.startsWith("mail-")
        ? MARGIN
        : MARGIN + Math.max(0, (INNER - textWidth(line, { font, size })) / 2);
      ops.push({ op: "text", x, y, size, font, text: line });
    }
    y -= 2 * scale; // a small gap between blocks
    if (!measure && y < MARGIN) break;
  }
  return { ops, used: top - y };
}

// The label as PDF bytes. ⚠️ It never clips: if the content is taller than the sticker, every size is
// scaled down until it fits — the whole label is on one sticker, a little smaller.
export function labelPdf(rows) {
  let scale = 1;
  // ⚠️ MEASURE WITHOUT THE BOTTOM BREAK, or `used` can never exceed the room and the fit never triggers.
  const full = layout(rows, scale, true);
  const room = LABEL_H - MARGIN * 2;
  if (full.used > room) scale = Math.max(0.4, room / full.used);
  const plan = layout(rows, scale);
  return makePdf([{ w: LABEL_W, h: LABEL_H, ops: plan.ops }]);
}

// The file's name when it arrives in the printer app, so she can tell two labels apart.
export function labelPdfName(code) {
  const safe = String(code || "label").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  return `Label ${safe || "label"}.pdf`;
}

// Whether the app's PDF can draw every character in these rows (the app's PDF has one Latin face).
export function labelCanPdf(rows) {
  return canDrawAll((rows || []).map(textOf).join("\n"));
}
