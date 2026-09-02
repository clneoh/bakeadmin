// validate.js — import file parsing + validation + migration entry point.

import { normalize } from "./state.js";

export function parseImport(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!o || typeof o !== "object" || o.app !== "bakeadmin") {
    throw new Error("Not a Jienluv2bake backup file.");
  }
  if (typeof o.formatVersion !== "number" || o.formatVersion > 1) {
    throw new Error("Backup is from a newer version of Jienluv2bake.");
  }
  if (!o.data || typeof o.data !== "object") {
    throw new Error("Backup has no data inside.");
  }
  return normalize(o.data);
}
