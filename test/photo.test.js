// test/photo.test.js — the crop in readPhoto, which is the one piece of the
// thumbnail the app can get silently wrong: a wrong crop still produces a
// perfectly valid JPEG, so nothing downstream would ever complain. The whole
// thing is therefore asserted on the NUMBERS handed to drawImage — which
// rectangle of the source was taken, and how big the canvas is — rather than on
// "did it return a data URL", which every wrong answer also does.
//
// Two consumers, two shapes, and the reason both are tested here:
//   · a customer's profile photo passes ONE number and stays SQUARE, exactly as
//     it did before a product thumbnail existed;
//   · a product thumbnail passes TWO and comes out TALLER than it is wide,
//     which is what the baker asked for at v220.
//
// Browser-only module (FileReader, Image, canvas), so the shims below stand in
// for all three. They are deliberately unforgiving: the canvas records its
// drawImage arguments and its own dimensions, and a shim that quietly returned
// the right string would let a wrong crop pass.

import { test } from "node:test";
import assert from "node:assert/strict";

const SRC = "data:image/jpeg;base64,AAAA";

// Install fresh globals for one call and hand back what was recorded. Every case
// builds its own so one test's canvas can never be read as another's.
function withShims({ width, height, imageError = false, fileType = "image/jpeg" }, run) {
  const draws = [];
  const canvases = [];
  const readers = [];

  class FileReader {
    constructor() { readers.push(this); this.result = null; this.onload = null; this.onerror = null; }
    readAsDataURL() { this.result = SRC; if (this.onload) setTimeout(() => this.onload(), 0); }
  }
  class Image {
    constructor() { this.width = width; this.height = height; this.onload = null; this.onerror = null; }
    set src(_v) {
      setTimeout(() => {
        if (imageError) { if (this.onerror) this.onerror(); }
        else if (this.onload) this.onload();
      }, 0);
    }
  }

  const document = {
    createElement(tag) {
      assert.equal(tag, "canvas", "readPhoto must only ever make a canvas");
      const canvas = {
        width: 0,
        height: 0,
        getContext(kind) {
          assert.equal(kind, "2d");
          return { drawImage: (...args) => draws.push(args) };
        },
        toDataURL(kind, q) {
          assert.equal(kind, "image/jpeg");
          assert.equal(q, 0.72, "the compression is part of the file size budget");
          return "data:image/jpeg;base64,OUT";
        },
      };
      canvases.push(canvas);
      return canvas;
    },
  };

  globalThis.FileReader = FileReader;
  globalThis.Image = Image;
  globalThis.document = document;
  return run({ draws, canvases, readers });
}

test("a customer's profile photo is still a SQUARE", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 1000, height: 600 }, ({ draws, canvases }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (url) => resolve({ url, draws, canvases }), 200);
    }));
  assert.equal(seen.canvases[0].width, 200);
  assert.equal(seen.canvases[0].height, 200, "one number means a square, as before");
  // side = 600 (the shorter edge), centred horizontally, full height.
  assert.deepEqual(seen.draws[0].slice(1), [200, 0, 600, 600, 0, 0, 200, 200]);
});

test("a product thumbnail is TALLER than wide: 160 x 200", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 1000, height: 600 }, ({ draws, canvases }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (url) => resolve({ url, draws, canvases }), 160, 200);
    }));
  assert.equal(seen.canvases[0].width, 160);
  assert.equal(seen.canvases[0].height, 200, "and taller than it is wide, on both axes");
  assert.equal(seen.canvases[0].height > seen.canvases[0].width, true);
});

test("a WIDE photo is trimmed at the sides, never squashed", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 1000, height: 600 }, ({ draws }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (u) => resolve({ u, draws }), 160, 200);
    }));
  // ratio 0.8; source 1.667 is wider, so the full height is kept and the sides
  // go: 600 * 0.8 = 480 wide, centred at (1000-480)/2 = 260.
  assert.deepEqual(seen.draws[0].slice(1), [260, 0, 480, 600, 0, 0, 160, 200]);
});

test("a TALL photo is trimmed at the top and bottom", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 600, height: 1000 }, ({ draws }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (u) => resolve({ u, draws }), 160, 200);
    }));
  // The other branch: full width, 600 / 0.8 = 750 tall, centred at 125.
  assert.deepEqual(seen.draws[0].slice(1), [0, 125, 600, 750, 0, 0, 160, 200]);
});

test("a photo that already has the box's shape is not trimmed at all", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 800, height: 1000 }, ({ draws }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (u) => resolve({ u, draws }), 160, 200);
    }));
  assert.deepEqual(seen.draws[0].slice(1), [0, 0, 800, 1000, 0, 0, 160, 200]);
});

test("a file that is not an image is refused before any canvas is made", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 100, height: 100 }, ({ canvases, readers }) =>
    new Promise((resolve) => {
      readPhoto({ type: "application/pdf" }, (url) => resolve({ url, canvases, readers }), 160, 200);
    }));
  assert.equal(seen.url, null, "the caller keeps the old photo");
  assert.equal(seen.canvases.length, 0);
  assert.equal(seen.readers.length, 0, "and it never even reads the bytes");
});

test("a photo the browser cannot decode hands back null", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 100, height: 100, imageError: true }, ({ canvases }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (url) => resolve({ url, canvases }), 160, 200);
    }));
  assert.equal(seen.url, null);
  assert.equal(seen.canvases.length, 0);
});

test("an image with no dimensions hands back null instead of a broken crop", async () => {
  const { readPhoto } = await import("../admin/js/photo.js");
  const seen = await withShims({ width: 0, height: 0 }, ({ canvases }) =>
    new Promise((resolve) => {
      readPhoto({ type: "image/jpeg" }, (url) => resolve({ url, canvases }), 160, 200);
    }));
  assert.equal(seen.url, null);
  assert.equal(seen.canvases.length, 0);
});
