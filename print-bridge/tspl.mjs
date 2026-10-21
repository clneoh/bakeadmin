// print-bridge/tspl.mjs — one label job as TSPL, the language a Gprinter GP-1326D speaks.
//
// ⚠️ THE PRINTER IS 203 DPI AND 104 mm WIDE; the job's bitmap is already drawn at 203 dpi by the app, at the
// label's own 100 × 150 mm. ⭐ Nothing here scales anything: `BITMAP` receives the bytes as they were drawn.
//
// Pure and exported, so it can be tested without a printer.

export function tsplForBitmap(job, { gapMm = 2, copies = 1 } = {}) {
  if (!job || typeof job !== "object") throw new Error("a print job is required");
  const widthMm = Number(job.widthMm) > 0 ? Number(job.widthMm) : 100;
  const heightMm = Number(job.heightMm) > 0 ? Number(job.heightMm) : 150;
  const widthBytes = Math.floor(Number(job.widthBytes));
  const height = Math.floor(Number(job.height));
  if (!(widthBytes > 0) || !(height > 0)) throw new Error("the job has no bitmap size");
  const data = Buffer.from(String(job.data || ""), "base64");
  if (!data.length) throw new Error("the job has no bitmap data");

  const head = Buffer.from(
    `SIZE ${widthMm} mm,${heightMm} mm\r\n`
    + `GAP ${gapMm} mm,0 mm\r\n`
    + "DIRECTION 1\r\n"
    + "CLS\r\n"
    + `BITMAP 0,0,${widthBytes},${height},0,`,
    "ascii",
  );
  const tail = Buffer.from(`\r\nPRINT ${Math.max(1, copies)}\r\n`, "ascii");
  return Buffer.concat([head, data, tail]);
}
