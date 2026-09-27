// photo.js — shrink a phone photo into a small JPEG data URL. Used for a
// customer's profile photo (a square) and for a product thumbnail (taller than
// it is wide, which is what the baker asked for). The app's whole state lives
// under one ~5 MB localStorage key and is embedded in every cloud snapshot and
// export, so any picture it keeps must be tiny: cropped, downscaled and
// JPEG-compressed, it lands around 6–15 KB.
//
// Browser-only (FileReader + Image + canvas) — never imported from Node tests.

// Read a picked file and hand `cb(dataUrl)` a JPEG of exactly `w` x `h` px,
// centre-cropped so the subject fills the box. Hands null when the file isn't an
// image or can't be read — the caller keeps the old photo.
//
// One number means a square, which is what a customer's profile photo wants. A
// product thumbnail passes two, because the baker asked for a picture TALLER
// than it is wide: a square crop of a plate or a tray throws away the top and
// bottom of the food, and the shop's cards are the one place her photos are the
// product.
export function readPhoto(file, cb, w = 200, h = w) {
  if (!file || !/^image\//.test(file.type)) { cb(null); return; }
  const outW = Math.max(1, Math.round(Number(w) || 200));
  const outH = Math.max(1, Math.round(Number(h) || outW));
  const reader = new FileReader();
  reader.onerror = () => cb(null);
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => cb(null);
    img.onload = () => {
      if (!img.width || !img.height) { cb(null); return; }
      // Cover, not contain: crop the source to the box's RATIO first, centred,
      // then scale that strip down. Cropping before scaling is what keeps a tall
      // portrait from squashing into the box.
      const ratio = outW / outH;
      let sw = img.width;
      let sh = img.height;
      if (img.width / img.height > ratio) sw = img.height * ratio;   // source too wide — trim the sides
      else sh = img.width / ratio;                                   // source too tall — trim the top and bottom
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      cb(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}
