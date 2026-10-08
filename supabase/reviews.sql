-- Customer reviews for the homepage.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: the table is created only if missing, policies are dropped
-- and recreated, and the storage bucket is created once.
--
-- reviews: a review posted from the homepage "What customers say" form. Anyone
--   can insert (the form is public) but every row starts unpublished, and only
--   signed-in bakers can read, publish or delete — so nothing shows on the
--   homepage until the owner taps Publish in the admin app (More → Reviews).
--   Published reviews are readable by anyone (the homepage shows them);
--   unpublished rows are invisible to the public, which keeps spam private.
--
-- ⚠️⚠️ 08 Oct 2026 — THE INSERT POLICY NOW ENFORCES THAT, AND UNTIL THEN IT DID
--   NOT. The paragraph above was true of the COLUMN DEFAULT (`published=false`)
--   and NOT of what an anonymous visitor was ALLOWED TO SEND: the policy was
--   `with check (true)`, and there is no trigger on this table anywhere, so
--   anyone with the public anon key (it is in the homepage's own script) could
--   POST `{"published": true, ...}` straight to the REST API and **publish their
--   own review**, skipping the moderation step entirely — and the "public reads
--   published reviews" policy below would then serve it on the homepage.
--   ⚠️ NOT a data leak — no customer data is exposed by it — but it defeated the
--   approve-first design this table exists for. The fix is one clause:
--   `with check (published = false)`, so a new row cannot arrive already live.
--   ⚠️ Safe for the real form: `reviews.js` `submitReview` sends only name,
--   stars, message, lang and photo (guarded by a test), so the default applies
--   and every genuine review still lands unpublished as it always did.
--
--   name/message are trimmed on insert by the app; the check constraints are a
--   backstop. stars is 1–5. lang is the review language — 'en' (English),
--   'zh' (Chinese/Mandarin) or 'ms' (Bahasa Malaysia).
--   photo holds the public URL of the customer's uploaded picture, stored in
--   the "review-photos" bucket below. Blank when there is no photo.

create table if not exists reviews (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null check (length(btrim(name)) between 1 and 60),
  stars      smallint not null check (stars between 1 and 5),
  message    text not null check (char_length(btrim(message)) between 1 and 400),
  lang       text not null default 'en' check (lang in ('en', 'zh', 'ms')),
  photo      text not null default '',
  published  boolean not null default false
);

alter table reviews enable row level security;

drop policy if exists "customer leaves a review" on reviews;
create policy "customer leaves a review" on reviews
  for insert to anon
  -- ⚠️⚠️ `published = false`, NOT `true`. A visitor may ADD a review; a visitor may
  -- not arrive with one already published. See the note at the top of this file.
  with check (published = false);

drop policy if exists "public reads published reviews" on reviews;
create policy "public reads published reviews" on reviews
  for select to anon
  using (published);

drop policy if exists "baker moderates reviews" on reviews;
create policy "baker moderates reviews" on reviews
  for all to authenticated
  using (true) with check (true);

-- The photo bucket. Public read, and customers may only add (never overwrite,
-- delete or list) — one picture per review upload.
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

drop policy if exists "customer uploads a review photo" on storage.objects;
create policy "customer uploads a review photo" on storage.objects
  for insert to anon
  with check (bucket_id = 'review-photos');

drop policy if exists "anyone reads review photos" on storage.objects;
create policy "anyone reads review photos" on storage.objects
  for select to anon
  using (bucket_id = 'review-photos');
