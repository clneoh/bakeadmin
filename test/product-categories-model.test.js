// test/product-categories-model.test.js — the category tree as arithmetic, with
// no screen involved. These are the rules the editor, the product picker, the
// publish and the shop all lean on, so each claim here is one a caller depends
// on rather than an internal detail.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  childrenOf, flattenTree, listedCount, moveCategory, moveProductInCategory,
  parentOf, pathTo, primaryCategoryId, productCount, productsInCategory, subtreeIds,
} from "../admin/js/productCategories.js";

const cat = (id, name, parentId = "", sort = 0) => ({ id, name, parentId, sort });

// For Dog › Treats › Pork, plus a second root and a sibling.
const LIST = [
  cat("dog", "For Dog", "", 0),
  cat("cat", "For Cat", "", 1),
  cat("treats", "Treats", "dog", 0),
  cat("pork", "Pork", "treats", 0),
  cat("food", "Food", "dog", 1),
];

test("parentOf reads a parent id, and treats anything else as a root", () => {
  assert.equal(parentOf(cat("a", "A", "p")), "p");
  assert.equal(parentOf({ id: "a" }), "", "no parentId at all");
  assert.equal(parentOf({ id: "a", parentId: null }), "", "a null parent is not a parent");
  assert.equal(parentOf({ id: "a", parentId: 7 }), "", "a number is not an id this app writes");
  assert.equal(parentOf(null), "");
});

test("childrenOf returns one parent's children in her order", () => {
  assert.deepEqual(childrenOf(LIST, "").map((c) => c.id), ["dog", "cat"]);
  assert.deepEqual(childrenOf(LIST, "dog").map((c) => c.id), ["treats", "food"]);
  assert.deepEqual(childrenOf(LIST, "treats").map((c) => c.id), ["pork"]);
  assert.deepEqual(childrenOf(LIST, "nobody").map((c) => c.id), []);
  // No parentId defaults to the roots, which is what an unnamed caller means.
  assert.deepEqual(childrenOf(LIST).map((c) => c.id), ["dog", "cat"]);
});

test("childrenOf orders by sort, and breaks a tie on id so it is the same everywhere", () => {
  const flat = [
    { id: "zebra", name: "Z", parentId: "", sort: 0 },
    { id: "apple", name: "A", parentId: "", sort: 0 },
    { id: "last", name: "L", parentId: "", sort: 1 },
  ];
  assert.deepEqual(childrenOf(flat, "").map((c) => c.id), ["apple", "zebra", "last"]);
});

test("childrenOf ignores records with no id rather than rendering a headless row", () => {
  assert.deepEqual(childrenOf([...LIST, { name: "ghost" }], "dog").map((c) => c.id), ["treats", "food"]);
});

test("flattenTree walks parents before children, depth by depth", () => {
  assert.deepEqual(
    flattenTree(LIST).map((r) => [r.cat.id, r.depth]),
    [["dog", 0], ["treats", 1], ["pork", 2], ["food", 1], ["cat", 0]],
  );
  assert.deepEqual(flattenTree(LIST).find((r) => r.cat.id === "pork").path, ["dog", "treats"]);
});

test("flattenTree survives a cycle instead of hanging the tab", () => {
  // Only reachable by hand-edited storage, which is exactly why the guard is
  // there: a root whose ancestor chain loops must still terminate.
  const loop = [cat("a", "A", "b"), cat("b", "B", "a")];
  assert.deepEqual(flattenTree(loop), [], "nothing in a pure cycle is reachable from a root");
});

test("subtreeIds is the category and everything under it, and cannot loop", () => {
  assert.deepEqual([...subtreeIds(LIST, "dog")].sort(), ["dog", "food", "pork", "treats"]);
  assert.deepEqual([...subtreeIds(LIST, "pork")], ["pork"]);
  assert.deepEqual([...subtreeIds(LIST, "nobody")], ["nobody"]);
  const loop = [cat("a", "A", "b"), cat("b", "B", "a")];
  assert.deepEqual([...subtreeIds(loop, "a")].sort(), ["a", "b"]);
});

test("pathTo is the chain from the top down, the category itself last", () => {
  assert.deepEqual(pathTo(LIST, "pork").map((c) => c.id), ["dog", "treats", "pork"]);
  assert.deepEqual(pathTo(LIST, "dog").map((c) => c.id), ["dog"]);
  assert.deepEqual(pathTo(LIST, "nobody"), []);
});

test("moveCategory renumbers the dropped group 0,1,2 and moves the whole record", () => {
  // For Cat (a root) goes to the front of the roots.
  const out = moveCategory(LIST, "cat", "", 0);
  assert.deepEqual(childrenOf(out, "").map((c) => c.id), ["cat", "dog"]);
  assert.deepEqual(childrenOf(out, "").map((c) => c.sort), [0, 1]);

  // Food (under For Dog) goes above Treats.
  const out2 = moveCategory(LIST, "food", "dog", 0);
  assert.deepEqual(childrenOf(out2, "dog").map((c) => c.id), ["food", "treats"]);
  assert.deepEqual(childrenOf(out2, "dog").map((c) => c.sort), [0, 1]);
  assert.deepEqual(childrenOf(out2, "").map((c) => c.id), ["dog", "cat"], "the other group is untouched");
});

test("moveCategory re-parents when the drop names another parent", () => {
  const out = moveCategory(LIST, "pork", "cat", 0);
  assert.equal(out.find((c) => c.id === "pork").parentId, "cat");
  assert.deepEqual(childrenOf(out, "cat").map((c) => c.id), ["pork"]);
  assert.deepEqual(childrenOf(out, "treats").map((c) => c.id), [], "and leaves nothing behind");
});

test("moveCategory refuses a drop inside the moved category's own subtree", () => {
  // For Dog under Pork would cut Treats and Pork off the root entirely.
  const out = moveCategory(LIST, "dog", "pork", 0);
  assert.deepEqual(out.map((c) => [c.id, c.parentId, c.sort]), LIST.map((c) => [c.id, c.parentId, c.sort]),
    "the list comes back untouched rather than corrupted");
  assert.deepEqual(moveCategory(LIST, "dog", "dog", 0), LIST, "nor under itself");
});

test("moveCategory refuses a parent that does not exist, and an unknown row", () => {
  assert.deepEqual(moveCategory(LIST, "dog", "ghost", 0), LIST);
  assert.deepEqual(moveCategory(LIST, "ghost", "", 0), LIST);
});

test("moveCategory clamps an out-of-range index instead of dropping the row", () => {
  assert.deepEqual(childrenOf(moveCategory(LIST, "cat", "", 99), "").map((c) => c.id), ["dog", "cat"]);
  assert.deepEqual(childrenOf(moveCategory(LIST, "cat", "", -5), "").map((c) => c.id), ["cat", "dog"]);
});

test("moveProductInCategory writes the whole order, not an index", () => {
  const out = moveProductInCategory(LIST, "dog", "p3", 0, ["p1", "p2", "p3"]);
  assert.deepEqual(out.find((c) => c.id === "dog").productOrder, ["p3", "p1", "p2"]);
  assert.deepEqual(out.find((c) => c.id === "cat").productOrder, undefined, "other categories untouched");
});

const st = (products, cats) => ({ products, productCategories: cats });

test("productsInCategory follows the products she filed, in the product list's own order", () => {
  const products = [
    { id: "p1", name: "One", categories: ["dog"] },
    { id: "p2", name: "Two", categories: ["cat"] },
    { id: "p3", name: "Three", categories: ["dog"] },
  ];
  assert.deepEqual(productsInCategory(st(products, LIST), "dog").map((p) => p.id), ["p1", "p3"]);
  assert.equal(productCount(st(products, LIST), "dog"), 2);
  assert.equal(productCount(st(products, LIST), "food"), 0);
});

test("productsInCategory honours a dragged order and skips a product that no longer exists", () => {
  const products = [
    { id: "p1", name: "One", categories: ["dog"] },
    { id: "p3", name: "Three", categories: ["dog"] },
  ];
  // "gone" is a product that has since been deleted: it must leave no hole, and
  // must not push the two real ones out of the order she dragged.
  const cats = [{ ...cat("dog", "For Dog"), productOrder: ["gone", "p3", "p1"] }];
  assert.deepEqual(productsInCategory(st(products, cats), "dog").map((p) => p.id), ["p3", "p1"]);
  assert.deepEqual(productsInCategory(st(products, cats), "treats").map((p) => p.id), [],
    "a category nobody is filed in shows nothing");
});

test("listedCount is what the heading carries; productCount is what her record holds", () => {
  // Brownies is ticked into Food first and For Dog second, so the shop draws it
  // under Food — For Dog still holds the tick. A row that printed 2 over For Dog
  // would claim a product the customer page does not show there.
  const products = [
    { id: "p1", name: "Focaccia", categories: ["dog"] },
    { id: "p2", name: "Brownies", categories: ["food", "dog"] },
    { id: "p3", name: "Muffin" },
  ];
  assert.equal(listedCount(st(products, LIST), "dog"), 1);
  assert.equal(productCount(st(products, LIST), "dog"), 2);
  assert.equal(listedCount(st(products, LIST), "food"), 1);
  assert.equal(productCount(st(products, LIST), "food"), 1);
  assert.equal(listedCount(st(products, LIST), "treats"), 0, "an empty heading carries nothing");
  assert.equal(listedCount(st(products, LIST), "dog"), 1, "and an unfiled product belongs to no heading");
});

test("listedCount counts a draft: it belongs to its heading, it is just not drawn yet", () => {
  const products = [{ id: "p1", name: "Draft Loaf", categories: ["dog"], draft: true }];
  assert.equal(listedCount(st(products, LIST), "dog"), 1);
});

test("listedCount follows a tick that points at a deleted category", () => {
  // The ghost tick is skipped, so the product is carried by the next one — the
  // same rule the publisher applies, which is what keeps the two in step.
  const products = [{ id: "p1", name: "Ghosted", categories: ["gone", "pork"] }];
  assert.equal(listedCount(st(products, LIST), "pork"), 1);
  assert.equal(listedCount(st(products, LIST), "gone"), 0);
});

test("primaryCategoryId is the first ticked category — the tick order is the ranking", () => {
  assert.equal(primaryCategoryId(LIST, { id: "p", categories: ["food", "treats"] }), "food");
  assert.equal(primaryCategoryId(LIST, { id: "p", categories: ["treats", "food"] }), "treats",
    "ticked the other way round, it lands under the other heading");
  assert.equal(primaryCategoryId(LIST, { id: "q", name: "Q" }), "", "filed nowhere is listed nowhere");
  assert.equal(primaryCategoryId(LIST, { id: "q", categories: [] }), "");
  assert.equal(primaryCategoryId(LIST, { id: "q", categories: "nonsense" }), "");
});

test("primaryCategoryId skips a category that is gone, so nothing lands under a ghost", () => {
  // A category deleted on the other phone must not leave a product listed under
  // a heading that no longer exists — it falls to the next one she ticked.
  const p = { id: "p", categories: ["deleted", "dog"] };
  assert.equal(primaryCategoryId(LIST, p), "dog");
  assert.equal(primaryCategoryId(LIST, { id: "p", categories: ["deleted", "also_gone"] }), "",
    "and with every tick gone it is an unfiled product, which the shop still lists");
});
