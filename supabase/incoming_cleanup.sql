-- Empty the incoming-order queue.
-- Run this ONCE, right after redeploying the fixed backoffice app.
--
-- Why: the old app imported storefront orders every 30 seconds and the
-- "mark as imported" step could silently fail, so the same order came back as
-- a "new" duplicate again and again. Rows that were never cleared are still
-- sitting in this queue. The fixed app imports each row exactly once — but any
-- leftover rows would still show up one more time. This clears them.
--
-- ⚠️⚠️ IT ONLY CLEARS ROWS OLDER THAN AN HOUR (v557). ⭐ The header used to say "Safe to re-run",
-- and it was not: the delete took EVERY row, so an order a customer had just placed — one the shop had
-- already told them it received — was deleted the next time this file was run. ⭐ An hour is longer than
-- any import poll (every 30 seconds), so a leftover row from the old app is well past it, and a fresh
-- order is never touched.
-- ⚠️ Run it after the redeploy, then let new orders flow in.

delete from incoming_orders where created_at < now() - interval '1 hour';
