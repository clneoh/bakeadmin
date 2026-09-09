// views/reviews.js — moderate the reviews customers leave on the homepage.
// New reviews land here "Waiting for you"; Publish shows one on the homepage,
// Take down hides it again, Delete removes it for good.

import { el, button, emptyState, confirmDialog, toast } from "../ui.js";
import { fetchReviews, setReviewPublished, deleteReview } from "../supabase.js";

const LANG_LABEL = { en: "English", zh: "中文", ms: "Bahasa Malaysia" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function starsText(n) {
  const count = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function fmtDate(iso) {
  const d = new Date(String(iso || ""));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function langLabel(code) {
  return LANG_LABEL[code] || LANG_LABEL.en;
}

export function renderReviews(root, state) {
  let dead = false;

  const intro = el("div", { class: "card" },
    el("h3", { style: "margin:0 0 4px" }, "Customer reviews"),
    el("p", { class: "card-sub", style: "margin:0" },
      "Reviews customers leave on the homepage land here first, unpublished. Tap Publish to show one on the homepage, or Delete to remove it. Customers can write in English, Mandarin or Bahasa Malaysia, and may attach a photo."));

  const wrap = el("div", {});
  root.replaceChildren(intro, wrap);

  async function fill() {
    const r = await fetchReviews(state);
    if (dead) return;
    if (!r.ok) {
      wrap.replaceChildren(el("div", { class: "card" },
        el("h3", { style: "margin:0 0 6px" }, "Reviews couldn't load"),
        el("p", { class: "card-sub" }, String(r.reason || "Unknown error")),
        el("p", { class: "card-sub", style: "margin-top:8px" },
          "Reviews use the same Supabase login as shared data. If this keeps happening, open Settings and check the Supabase address and key, sign in again, then come back."),
        el("div", { class: "btn-row", style: "margin-top:10px" },
          button("Try again", fill, "primary"))));
      return;
    }
    const waiting = r.reviews.filter((x) => !x.published);
    const live = r.reviews.filter((x) => x.published);
    // A clear "how many are waiting" line at the top of the screen (hidden when
    // nothing waits — the empty state below already says so).
    const children = waiting.length
      ? [el("div", { class: "rev-pending" },
          `⭐ ${waiting.length} review${waiting.length === 1 ? "" : "s"} waiting for you to publish`)]
      : [];
    if (waiting.length) {
      children.push(el("h2", { class: "section" }, `Waiting for you (${waiting.length})`));
      children.push(...waiting.map((row) => reviewCard(state, row, {
        label: "Publish",
        cls: "primary",
        onAction: () => publish(row, true),
      }, fill)));
    } else {
      children.push(
        el("h2", { class: "section" }, "Waiting for you"),
        emptyState("Nothing waiting", "New homepage reviews will appear here for you to approve."));
    }
    if (live.length) {
      children.push(el("h2", { class: "section" }, `On the homepage (${live.length})`));
      children.push(...live.map((row) => reviewCard(state, row, {
        label: "Take down",
        cls: "soft",
        onAction: () => publish(row, false),
      }, fill)));
    } else {
      children.push(
        el("h2", { class: "section" }, "On the homepage"),
        emptyState("Nothing published", "Publish a review above and it will show on the homepage."));
    }
    wrap.replaceChildren(...children);
  }

  async function publish(row, value) {
    const r = await setReviewPublished(state, row.id, value);
    if (!r.ok) return toast(String(r.reason || "Update failed"));
    toast(value ? "Published — it's on the homepage now." : "Taken down — hidden from the homepage.");
    fill();
  }

  fill();
  return () => { dead = true; };
}

function removeReview(state, row, reload) {
  confirmDialog(`Delete ${row.name ? `"${row.name}'s"` : "this"} review? This can't be undone.`,
    async () => {
      const r = await deleteReview(state, row.id);
      if (!r.ok) return toast(String(r.reason || "Delete failed"));
      toast("Review deleted.");
      reload();
    }, { danger: true, yesLabel: "Delete" });
}

// Each review is shown EXACTLY as the customer sees it on the homepage card:
// photo → stars → message → name → language · date (homepage CSS classes in
// app.css). The moderation buttons ride along at the bottom of the card.
function reviewCard(state, row, action, reload) {
  const bits = [];
  if (row.photo) {
    bits.push(el("img", {
      class: "review-card-photo",
      src: String(row.photo),
      alt: "",
      // A broken link never leaves a hole on the card (same as the homepage).
      onerror: (ev) => ev.currentTarget.remove(),
    }));
  }
  const starsN = Math.max(0, Math.min(5, Math.round(Number(row.stars) || 0)));
  const when = fmtDate(row.created_at);
  const metaBits = [langLabel(row.lang)];
  if (when) metaBits.push(when);
  return el("div", { class: "review-card" },
    ...bits,
    el("div", { class: "review-card-stars", "aria-label": `${starsN} out of 5 stars` }, starsText(row.stars)),
    el("p", { class: "review-card-msg" }, String(row.message || "")),
    el("div", { class: "review-card-name" }, String(row.name || "Anonymous")),
    el("div", { class: "review-card-meta" }, metaBits.join(" · ")),
    el("div", { class: "btn-row", style: "margin-top:16px" },
      button(action.label, action.onAction, action.cls),
      button("Delete", () => removeReview(state, row, reload), "ghost")));
}
