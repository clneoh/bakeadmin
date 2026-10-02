// A QR encoder, written out here so a printed card can carry a scannable square
// with no library, no build step and no network.
//
// Scope is matched to the one job it has: one byte-mode string, error-correction
// level M, versions 1 to 10 (a link up to about 210 characters), with the mask
// chosen by the standard's own penalty rules. Anything that will not fit in
// version 10 comes back as {fail:"toolong"} rather than being guessed at.
//
// Pure: nothing imported, no DOM, no storage, no English words. The card screens
// word whatever it returns.
//
// The matrix it produces is checked module-for-module against the reference
// implementation in test/qr.test.js, so the square on a printed card is the same
// square any other QR writer would draw.

const ECC_M = 0b00; // level M's two-bit tag, used in the format information

// Version -> { ec, blocks }, read straight out of the standard's table for level M.
// `blocks` is [how many][data codewords in each]; `ec` is the EC codewords per block.
const TABLE_M = {
  1: { ec: 10, blocks: [[1, 16]] },
  2: { ec: 16, blocks: [[1, 28]] },
  3: { ec: 26, blocks: [[1, 44]] },
  4: { ec: 18, blocks: [[2, 32]] },
  5: { ec: 24, blocks: [[2, 43]] },
  6: { ec: 16, blocks: [[4, 27]] },
  7: { ec: 18, blocks: [[4, 31]] },
  8: { ec: 22, blocks: [[2, 38], [2, 39]] },
  9: { ec: 22, blocks: [[3, 36], [2, 37]] },
  10: { ec: 26, blocks: [[4, 43], [1, 44]] },
};

const MAX_VERSION = 10;

// Bits of data a version+level can hold once the header is taken off.
function dataCodewords(version) {
  let n = 0;
  for (const [count, per] of TABLE_M[version].blocks) n += count * per;
  return n;
}

// The character-count field is 8 bits up to version 9 and 16 bits from version 10.
function countBits(version) {
  return version <= 9 ? 8 : 16;
}

// ---------------------------------------------------------------------------
// GF(256), the field Reed-Solomon works over, with 0x11D as its polynomial.

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function buildGalois() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

// The generator polynomial for `degree` error-correction codewords, highest
// power first (so gen[0] is always 1 — the polynomial is monic).
function generatorPoly(degree) {
  let gen = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], GF_EXP[i]);
    }
    gen = next;
  }
  return gen;
}

// The error-correction codewords for one block of data, by polynomial division.
function ecCodewords(data, degree) {
  const gen = generatorPoly(degree);
  const buf = new Uint8Array(data.length + degree);
  buf.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const lead = buf[i];
    if (lead === 0) continue;
    for (let j = 0; j <= degree; j++) {
      buf[i + j] ^= gfMul(gen[j], lead);
    }
  }
  return buf.slice(data.length);
}

// ---------------------------------------------------------------------------
// The data bit stream.

function encodeData(text, version) {
  const bytes = []; // UTF-8
  for (const ch of text) {
    let cp = ch.codePointAt(0);
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) bytes.push(0xC0 | (cp >> 6), 0x80 | (cp & 0x3F));
    else if (cp < 0x10000) {
      bytes.push(0xE0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    } else {
      bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F),
                 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
    }
  }

  const bits = [];
  const push = (value, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4);                      // byte mode
  push(bytes.length, countBits(version));
  for (const b of bytes) push(b, 8);

  const capacity = dataCodewords(version) * 8;
  // Terminator: up to four zero bits, then pad to the byte boundary.
  const terminator = Math.min(4, capacity - bits.length);
  push(0, terminator);
  push(0, (8 - (bits.length % 8)) % 8);
  // Pad bytes, alternating, until the version's data is full.
  for (let i = 0; bits.length < capacity; i++) push(i % 2 === 0 ? 0xEC : 0x11, 8);

  const codewords = new Uint8Array(capacity / 8);
  bits.forEach((bit, i) => { if (bit) codewords[i >> 3] |= 0x80 >> (i & 7); });
  return codewords;
}

// ---------------------------------------------------------------------------
// Blocks, error correction, and the interleaving the standard asks for.

function makeCodewords(data, version) {
  const { ec, blocks } = TABLE_M[version];

  const dataBlocks = [];
  const ecBlocks = [];
  let at = 0;
  for (const [count, per] of blocks) {
    for (let i = 0; i < count; i++) {
      const chunk = data.slice(at, at + per);
      at += per;
      dataBlocks.push(chunk);
      ecBlocks.push(ecCodewords(chunk, ec));
    }
  }

  const out = [];
  const widest = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < widest; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ec; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return Uint8Array.from(out);
}

// ---------------------------------------------------------------------------
// The matrix.

// The rows and columns the alignment patterns sit on, for this version.
function alignmentPositions(version) {
  if (version === 1) return [];
  const size = version * 4 + 17;
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 4 + count * 2 + 1) / (count * 2 - 2)) * 2;
  const out = [6];
  for (let i = count - 1, pos = size - 7; i >= 1; i--, pos -= step) out[i] = pos;
  return out;
}

function formatBits(mask) {
  const data = (ECC_M << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function versionBits(version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
  return (version << 12) | rem;
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

// Lay out every fixed part of the square: the three finder patterns, the
// alignment patterns, the timing lines, and the two reserved strips the format
// and version information will be written into.
function baseMatrix(version) {
  const size = version * 4 + 17;
  const modules = new Int8Array(size * size).fill(-1);
  const fixed = new Uint8Array(size * size);

  const set = (r, c, dark) => {
    modules[r * size + c] = dark ? 1 : 0;
    fixed[r * size + c] = 1;
  };

  const finder = (row, col) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const ring = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        set(r, c, inside && (ring || core));
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  for (let ri = 0; ri < positions.length; ri++) {
    for (let ci = 0; ci < positions.length; ci++) {
      // The three crossings that would land on a finder pattern are skipped.
      if ((ri === 0 && ci === 0)
        || (ri === 0 && ci === last)
        || (ri === last && ci === 0)) continue;
      const row = positions[ri];
      const col = positions[ci];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const edge = Math.max(Math.abs(dr), Math.abs(dc));
          set(row + dr, col + dc, edge !== 1);
        }
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    if (!fixed[6 * size + i]) set(6, i, i % 2 === 0);
    if (!fixed[i * size + 6]) set(i, 6, i % 2 === 0);
  }

  // The strips the format information is written into (drawn later).
  for (let i = 0; i <= 8; i++) {
    if (!fixed[8 * size + i]) set(8, i, 0);
    if (!fixed[i * size + 8]) set(i, 8, 0);
  }
  for (let i = 0; i < 8; i++) {
    set(size - 1 - i, 8, 0);
    set(8, size - 1 - i, 0);
  }

  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(b, a, 0);
      set(a, b, 0);
    }
  }

  return { size, modules, fixed };
}

// Walk the data into the square in the standard's two-column zigzag.
function placeData(version, codewords, mask) {
  const { size, modules, fixed } = baseMatrix(version);
  const bitAt = (i) => (i < codewords.length * 8 ? (codewords[i >> 3] >> (7 - (i & 7))) & 1 : 0);

  let i = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // the vertical timing line is never written into
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (let k = 0; k < 2; k++) {
        const c = col - k;
        if (fixed[row * size + c]) continue;
        const dark = bitAt(i) ^ (MASKS[mask](row, c) ? 1 : 0);
        modules[row * size + c] = dark;
        i++;
      }
    }
    upward = !upward;
  }
  return { size, modules };
}

function withFormat(version, modules, mask) {
  const size = version * 4 + 17;
  const bits = formatBits(mask);
  const bit = (i) => (bits >> i) & 1;
  const put = (r, c, v) => { modules[r * size + c] = v; };

  for (let i = 0; i <= 5; i++) put(i, 8, bit(i));
  put(7, 8, bit(6));
  put(8, 8, bit(7));
  put(8, 7, bit(8));
  for (let i = 9; i < 15; i++) put(8, 14 - i, bit(i));

  for (let i = 0; i < 8; i++) put(8, size - 1 - i, bit(i));
  for (let i = 8; i < 15; i++) put(size - 15 + i, 8, bit(i));
  put(size - 8, 8, 1); // the always-dark module

  if (version >= 7) {
    const vbits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const v = (vbits >> i) & 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      put(b, a, v);
      put(a, b, v);
    }
  }
  return modules;
}

// The four penalties the standard uses to judge a mask. A lower score is better.
const N1 = 3;
const N2 = 3;
const N3 = 40;
const N4 = 10;

// The standard counts a run of five-or-more as a finder-like pattern too, and the
// quiet zone outside the square counts as light — so the first run of a line is
// widened by the quiet zone before it is recorded.
function addHistory(run, history, size) {
  if (history[0] === 0) run += size;
  history.copyWithin(1, 0, history.length - 1);
  history[0] = run;
}

function countFinderPatterns(h) {
  const n = h[1];
  const core = n > 0 && h[2] === n && h[3] === n * 3 && h[4] === n && h[5] === n;
  return (core && h[0] >= n * 4 && h[6] >= n ? 1 : 0)
       + (core && h[6] >= n * 4 && h[0] >= n ? 1 : 0);
}

function terminateAndCount(runColor, run, history, size) {
  if (runColor) {
    addHistory(run, history, size);
    run = 0;
  }
  run += size;
  addHistory(run, history, size);
  return countFinderPatterns(history);
}

function lineScore(modules, size, index, horizontal) {
  let score = 0;
  let color = false;
  let run = 0;
  const history = new Int32Array(7);
  const at = (i) => (horizontal ? modules[index * size + i] : modules[i * size + index]);

  for (let i = 0; i < size; i++) {
    const dark = at(i) === 1;
    if (dark === color) {
      run++;
      if (run === 5) score += N1;
      else if (run > 5) score++;
    } else {
      addHistory(run, history, size);
      if (!color) score += countFinderPatterns(history) * N3;
      color = dark;
      run = 1;
    }
  }
  return score + terminateAndCount(color, run, history, size) * N3;
}

function penalty(version, modules) {
  const size = version * 4 + 17;
  let score = 0;

  for (let i = 0; i < size; i++) score += lineScore(modules, size, i, true);
  for (let i = 0; i < size; i++) score += lineScore(modules, size, i, false);

  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r * size + c];
      if (v === modules[r * size + c + 1]
        && v === modules[(r + 1) * size + c]
        && v === modules[(r + 1) * size + c + 1]) score += N2;
    }
  }

  let dark = 0;
  for (let i = 0; i < modules.length; i++) if (modules[i] === 1) dark++;
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  return score + k * N4;
}

// ---------------------------------------------------------------------------
// The public surface.

// { size, modules } — modules is row-major, 1 for a dark square, 0 for light.
// { fail: "toolong" } when the text will not fit in version 10.
// { fail: "empty" } when there is nothing to encode.
//
// `opts.mask` pins the mask instead of letting the penalty rules choose, which is
// what lets the tests hold this encoder against another one module for module.
export function qrMatrix(text, opts) {
  const s = String(text == null ? "" : text);
  if (s === "") return { fail: "empty" };

  let version = 0;
  for (let v = 1; v <= MAX_VERSION; v++) {
    const capacity = dataCodewords(v) * 8;
    const needed = 4 + countBits(v) + utf8Length(s) * 8;
    if (needed <= capacity) { version = v; break; }
  }
  if (!version) return { fail: "toolong" };

  const codewords = makeCodewords(encodeData(s, version), version);
  const pinned = opts && opts.mask;

  if (pinned != null && pinned >= 0 && pinned < 8) {
    const { size, modules } = placeData(version, codewords, pinned);
    withFormat(version, modules, pinned);
    return { size, modules, version, mask: pinned };
  }

  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const { size, modules } = placeData(version, codewords, mask);
    withFormat(version, modules, mask);
    const score = penalty(version, modules);
    if (!best || score < best.score) best = { score, mask, size, modules };
  }

  return { size: best.size, modules: best.modules, version, mask: best.mask };
}

function utf8Length(s) {
  let n = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return n;
}

// The same square as an inline SVG string, drawn on one dark path over a light
// background so it prints crisply at any size and needs no image file.
export function qrSvg(text, opts) {
  const o = opts || {};
  const quiet = o.quiet == null ? 4 : o.quiet;
  const dark = o.dark || "#000";
  const light = o.light || "#fff";
  const q = qrMatrix(text);
  if (q.fail) return null;

  const n = q.size;
  const box = n + quiet * 2;
  let path = "";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (q.modules[r * n + c] !== 1) { c++; continue; }
      let run = 1;
      while (c + run < n && q.modules[r * n + c + run] === 1) run++;
      path += `M${c + quiet} ${r + quiet}h${run}v1h${-run}z`;
      c += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" `
    + `shape-rendering="crispEdges" role="img" aria-label="QR code">`
    + `<rect width="${box}" height="${box}" fill="${light}"/>`
    + `<path d="${path}" fill="${dark}"/></svg>`;
}
