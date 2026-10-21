// test/print-queue.test.js — the Wi-Fi print queue: bitmap packing, TSPL framing, and the job insert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { packBitmap, bytesToBase64, labelBitmap } from "../admin/js/label_image.js";
import { tsplForBitmap } from "../print-bridge/tspl.mjs";

const rgba = (pixels) => Uint8ClampedArray.from(pixels.flat());

test("★★★ a dark pixel is ink and a light or transparent one is paper (v617)", () => {
  // A 2 x 2: black at (0,0), white at (1,0), transparent at (0,1), white at (1,1).
  const frame = rgba([
    [0, 0, 0, 255], [255, 255, 255, 255],
    [0, 0, 0, 0], [255, 255, 255, 255],
  ]);
  const out = packBitmap(frame, 2, 2);
  assert.equal(out.widthBytes, 1, "two pixels do not pack into one byte");
  assert.equal(out.height, 2);
  assert.equal(out.bytes[0], 0x80, "★ the black pixel is not the top bit of the first byte");
  assert.equal(out.bytes[1], 0x00, "★ a transparent pixel was printed as ink");
});

test("★★ a pixel in the SECOND byte lands on its top bit (v617)", () => {
  const frame = new Uint8ClampedArray(10 * 4);
  for (let i = 0; i < 10; i += 1) { frame[i * 4] = 255; frame[i * 4 + 1] = 255; frame[i * 4 + 2] = 255; frame[i * 4 + 3] = 255; }
  frame[8 * 4] = 0; frame[8 * 4 + 1] = 0; frame[8 * 4 + 2] = 0; // the first pixel of the second byte, x = 8
  const out = packBitmap(frame, 10, 1);
  assert.equal(out.widthBytes, 2, "ten dots must span two bytes");
  assert.equal(out.bytes[0], 0x00);
  assert.equal(out.bytes[1], 0x80, "★ the pixel at x=8 is not bit 7 of the second byte");
});

test("★★★ the job's bytes become a real TSPL print (v617)", () => {
  const data = Buffer.from([0xff, 0x00, 0x81]).toString("base64");
  const out = tsplForBitmap({ widthMm: 100, heightMm: 150, widthBytes: 12, height: 7, data });
  const text = out.toString("latin1");
  assert.match(text, /^SIZE 100 mm,150 mm\r\n/, "★ the stock size is not declared first");
  assert.match(text, /GAP 2 mm,0 mm\r\n/, "★ the label gap is missing — the prints will drift");
  assert.match(text, /BITMAP 0,0,12,7,0,/, "★ the bitmap command does not match the job");
  assert.match(text, /\r\nPRINT 1\r\n$/, "★ the job never asks the printer to print");
  // The binary payload is carried byte-for-byte between the command and the line end.
  const at = out.indexOf(Buffer.from([0xff, 0x00, 0x81]));
  assert.ok(at > 0, "★ the bitmap bytes are missing from the command");
});

test("★★ a job with no bitmap is refused, not sent as a blank label (v617)", () => {
  assert.throws(() => tsplForBitmap({ widthBytes: 0, height: 0, data: "" }), /bitmap/);
  assert.throws(() => tsplForBitmap(null), /job/);
});

test("★★ with no canvas there is no job — never a broken one (v617)", () => {
  assert.equal(labelBitmap([["customer", "Lucy"]]), null);
});

test("★★ the phone sends the job to the queue and reports only a real landing (v617)", async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => store.delete(k),
  };
  store.set("bakeadmin.supabase", JSON.stringify({ access_token: "tok", expires_at: Date.now() + 3600000 }));
  const { sendPrintJob } = await import("../admin/js/supabase.js");
  const state = { settings: { supabase: { enabled: true, url: "https://p.supabase.co", anonKey: "anon",
    email: "a@b.c", password: "p" } }, orders: [] };
  let seen = null;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("/rest/v1/print_jobs")) { seen = { url: String(url), body: JSON.parse(opts.body) }; return { ok: true }; }
    return { ok: false };
  };
  const job = { widthMm: 100, heightMm: 150, widthBytes: 1, height: 1, data: "gA==" };
  assert.equal(await sendPrintJob(state, job), true);
  assert.match(seen.url, /\/rest\/v1\/print_jobs$/, "★ the job did not go to the queue table");
  assert.deepEqual(seen.body.payload, job, "★ the job's payload changed on the way out");
  globalThis.fetch = async () => ({ ok: false });
  assert.equal(await sendPrintJob(state, job), false, "a refused insert was reported as sent");
});
