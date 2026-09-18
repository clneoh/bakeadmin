-- Order alerts — your phone pings the moment an order lands.
-- Run this ONCE in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Safe to re-run: the tables are created only if missing, the function and
-- trigger are replaced, and an existing channel name is left alone.
--
-- Why: a customer can order at any hour. Without this, you only find out the
-- next time you open the app. With it, the database itself sends a push
-- notification to your phone within a few seconds — even while the app is
-- closed and no computer is switched on.
--
-- How it works:
--   * A row lands in `incoming_orders` (the customer tapped "Place order").
--   * A trigger reads the order's JSON and formats a plain-text summary.
--   * It calls `net.http_post` (the pg_net extension) to hand that summary to
--     the free ntfy service, which pushes it to whichever phones have
--     subscribed to your private channel.
--
-- THE FORMATTING RULE (this is what was wrong before). ntfy only renders a
-- title, a body, an emoji tag and a priority when the request is a *structured*
-- publish: POST to the BASE url (https://ntfy.sh, with no channel name in the
-- path), with a JSON body that carries the channel name INSIDE it under the key
-- `topic`, and Content-Type: application/json. Send the JSON any other way and
-- ntfy treats the whole thing as the message text — which is why the alert used
-- to arrive as a wall of raw JSON like
-- {"title": "New order", "message": "...", "priority": 3}.
--
-- WHERE YOUR CHANNEL NAME LIVES. Until now it was typed into the body of the
-- old function, and it is still typed into three leftover test functions. This
-- script moves it into a table (`order_alert_topic`) and reads it from there.
-- Step 3 lifts the old value across automatically, so your phones keep working
-- and nothing needs re-subscribing.
--
-- Two notes about the design, both deliberate:
--   * The channel name is a SECRET — anyone who knows it can read your alerts.
--     It is stored in this database and deliberately NOT written into the app's
--     code or the GitHub repo. This file is public (it sits in the repo), which
--     is why the name is never written into it.
--   * Nothing here is allowed to block a customer's order. Any failure is
--     swallowed and recorded in `order_alert_errors`, so the order is always
--     saved and you can look up what went wrong later.


-- 1. pg_net — the extension that lets the database make an HTTP call.
--    Supabase usually has this already; "if not exists" makes it a no-op then.
create extension if not exists pg_net with schema "extensions";


-- 2. Your private channel name. One row, created once, never overwritten.
--
--    ALREADY SET UP? Then this changes nothing — the name you have is left
--    exactly as it is and your phones keep working. This matters: the channel
--    name is the password your phones are subscribed to, so it must NOT be
--    regenerated.
create table if not exists public.order_alert_topic (
  id     integer primary key default 1 check (id = 1),
  topic  text not null,
  set_at timestamptz not null default now()
);
alter table public.order_alert_topic enable row level security;


-- 3. Carry your existing channel name across.
--
--    3a is a manual slot, only needed if 3b below ever stops and asks you for
--    it. It does nothing unless you edit it, so leave it exactly as it is when
--    running this normally.
do $$
declare
  v text := 'PASTE-YOUR-EXISTING-CHANNEL-NAME-HERE';
begin
  if v like 'PASTE-%' then
    return;                       -- not filled in; 3b will find it instead
  end if;
  insert into public.order_alert_topic (id, topic) values (1, v)
    on conflict (id) do nothing;
  raise notice 'Channel name taken from the manual slot.';
end $$;

--    3b. The automatic route. Your channel name is currently typed into the
--    old function, so this reads it straight out of there. Nothing is shown on
--    screen; it goes from the old function into the new table and nowhere else.
do $$
declare
  src text;
  got text;
begin
  if exists (select 1 from public.order_alert_topic where id = 1) then
    raise notice 'A channel name is already saved. Leaving it exactly as it is.';
    return;
  end if;

  select p.prosrc into src
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'alert_new_order'
     and n.nspname = 'public'
   limit 1;

  -- The old function carries the name at the end of the ntfy address.
  got := (regexp_match(coalesce(src, ''), 'ntfy\.sh/([A-Za-z0-9_-]{4,})'))[1];

  -- Tolerates the name being written as its own quoted word instead.
  if got is null then
    got := (regexp_match(coalesce(src, ''), '''([A-Za-z0-9_-]+-orders-[A-Za-z0-9]+)'''))[1];
  end if;

  if got is null then
    return;                       -- the stop-check below reports this
  end if;

  insert into public.order_alert_topic (id, topic) values (1, got);
  raise notice 'Your existing channel name was carried across. Your phones need no change.';
end $$;

--    3c. THE STOP-CHECK. If there is still no channel name, the script stops
--    here — before the old function or trigger is touched, so your alerts go on
--    working exactly as they do today and nothing is lost. Nothing below runs.
do $$
begin
  if not exists (select 1 from public.order_alert_topic where id = 1) then
    raise exception 'Could not read your existing channel name automatically, so NOTHING has been changed and your alerts still work as before. To finish the job by hand: (1) run this on its own:  select prosrc from pg_proc where proname = ''alert_new_order'';  (2) copy the long word from inside the ntfy address in the result; (3) in step 3a above, put that word between the quotes in place of PASTE-YOUR-EXISTING-CHANNEL-NAME-HERE; (4) run this whole script again. Keep that word on your own screen — it is your password, so do not paste it into a chat or an email.';
  end if;
end $$;


-- 4. One row per order already announced, so a re-read never pings twice.
create table if not exists public.order_alert_log (
  id      uuid primary key,
  sent_at timestamptz not null default now()
);
alter table public.order_alert_log enable row level security;


-- 5. Anything that went wrong while announcing an order, for later inspection.
create table if not exists public.order_alert_errors (
  id        bigserial primary key,
  order_id  uuid,
  err       text,
  detail    text,
  context   text,
  at        timestamptz not null default now()
);
alter table public.order_alert_errors enable row level security;


-- 6. The worker. Security definer so it can read the topic table and reach
--    pg_net even though the customer who triggered it is anonymous.
--
--    The field names below are the bakery's own order shape, read from
--    store/app.js: customer, whatsapp, date, lines[{name,qty}], total (a
--    NUMBER), fulfillment ('collect' or 'courier'), address, note.
create or replace function public.alert_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j       jsonb;
  topic   text;
  items   text;
  l       jsonb;
  lname   text;
  lqty    text;
  odate   text;
  day_txt text;
  how     text;
  total   text;
  note    text;
  addr    text;
  who     text;
  wa      text;
  msg     text;
  n       integer;
begin
  -- Only a freshly placed order is announced. The app re-reads and re-writes
  -- rows constantly; those edits must stay silent.
  if new.status is distinct from 'new' then
    return new;
  end if;

  -- The whole job is best-effort. A problem here must never stop a customer's
  -- order being saved, so everything is wrapped and failures are recorded.
  begin
    insert into public.order_alert_log(id) values (new.id)
      on conflict (id) do nothing;
    get diagnostics n = row_count;
    if n = 0 then
      return new;                          -- already announced this order
    end if;

    select t.topic into topic
      from public.order_alert_topic t
     where t.id = 1;
    if topic is null or btrim(topic) = '' then
      return new;                          -- not set up yet: nothing to ping
    end if;

    j := new.data::jsonb;

    -- "Mushroom & Egg x1, Focaccia x2"
    if jsonb_typeof(j -> 'lines') = 'array' then
      for l in select * from jsonb_array_elements(j -> 'lines') loop
        lname := btrim(coalesce(l ->> 'name', ''));
        if lname = '' then
          lname := 'item';
        end if;
        lqty := btrim(coalesce(l ->> 'qty', ''));
        if lqty = '' then
          lqty := '?';
        end if;
        items := coalesce(items || ', ', '') || lname || ' x' || lqty;
      end loop;
    end if;

    -- The storefront sends YYYY-MM-DD; print it the way a person reads it,
    -- "Sat 19 Sep 2026", instead of the raw 2026-09-19.
    odate := nullif(btrim(coalesce(j ->> 'date', '')), '');
    day_txt := odate;
    if odate ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      day_txt := to_char(to_date(odate, 'YYYY-MM-DD'), 'Dy DD Mon YYYY');
    end if;

    -- The shop's own words (store-lang.js), not "Post" — the bakery collects
    -- at SG Ara or sends by Lalamove; it does not post.
    how := case when j ->> 'fulfillment' = 'courier'
                then 'Courier delivery'
                else 'Self collect' end;

    -- `total` arrives as a JSON number (e.g. 10), so print it as money: RM 10.00.
    total := nullif(btrim(coalesce(j ->> 'total', '')), '');
    if total ~ '^[0-9]+(\.[0-9]+)?$' then
      total := 'RM ' || to_char(total::numeric, 'FM999999999990.00');
    end if;

    who  := nullif(btrim(coalesce(j ->> 'customer', '')), '');
    wa   := nullif(btrim(coalesce(j ->> 'whatsapp', '')), '');
    note := nullif(btrim(coalesce(j ->> 'note', '')), '');
    addr := nullif(btrim(coalesce(j ->> 'address', '')), '');

    -- A null line drops out of the array, so the message only carries what
    -- the order actually has. Address is only worth showing for a courier
    -- order — a self-collect order has nothing to deliver to.
    msg := array_to_string(array_remove(array[
      'Name: '     || who,
      'WhatsApp: ' || wa,
      'Items: '    || items,
      'Delivery: ' || day_txt || ' - ' || how,
      'Total: '    || total,
      'Note: '     || note,
      case when j ->> 'fulfillment' = 'courier'
           then 'Address: ' || addr end
    ], null::text), E'\n');
    if btrim(coalesce(msg, '')) = '' then
      msg := 'Open the app to see the order.';   -- an order with no readable detail
    end if;

    perform net.http_post(
      url     := 'https://ntfy.sh',
      body    := jsonb_build_object(
                   'topic',    topic,
                   'title',    'New order - Jien Luv 2 Bake',
                   'message',  msg,
                   'tags',     jsonb_build_array('bread'),
                   'priority', 4
                 ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    -- Recording the failure is itself wrapped: if even this insert cannot run,
    -- it is swallowed rather than allowed to block the customer's order.
    begin
      insert into public.order_alert_errors(order_id, err, detail, context)
      values (new.id, SQLERRM, SQLSTATE, left(coalesce(msg, new.data::text), 2000));
    exception when others then
      null;
    end;
  end;

  return new;
end;
$$;


-- 7. Fire it on every new order. Sits happily beside the "N left" trigger that
--    already listens to the same table.
drop trigger if exists order_alert_trg on public.incoming_orders;
create trigger order_alert_trg
  after insert on public.incoming_orders
  for each row
  execute function public.alert_new_order();


-- ─────────────────────────────────────────────────────────────────────────────
-- YOUR PRIVATE CHANNEL — the one thing to copy out of here.
--
-- This is a secret. It is the password to your own alerts: anyone who knows it
-- can read them. Do not put it in the app, the repo, or any message. Type it
-- into the ntfy app on each phone. (If it ever leaks, uncomment the UPDATE at
-- the bottom, run it, and re-subscribe every phone to the new name.)
--
-- This must print the SAME name your phones are subscribed to. If it prints
-- something different, stop — do not re-subscribe anything, and ask.
-- ─────────────────────────────────────────────────────────────────────────────
select topic as "Your private ntfy topic" from public.order_alert_topic where id = 1;

-- Rotate the channel if it ever leaks (then re-subscribe every phone):
-- update public.order_alert_topic
--    set topic  = 'jl2b-orders-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
--        set_at = now()
--  where id = 1;

-- If a ping ever fails, this is where the reason is written down:
-- select * from public.order_alert_errors order by at desc limit 20;

-- How many orders have been announced (should climb with your orders):
--  select count(*) from public.order_alert_log;


-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL TIDY-UP — three old test functions still have your channel name
-- typed inside them. They are leftovers from setting this up; they are not the
-- live trigger (that is `alert_new_order`, replaced above). Each extra copy is
-- another copy of the password, so removing them is worth doing.
--
-- Run this SEPARATELY, on its own, only if you want to. Plain `drop function`
-- is deliberate and never `cascade`: if one of them is still attached to
-- something, Postgres refuses and tells you, rather than dragging a trigger
-- down with it.
--
--   drop function if exists public.test_post();
--   drop function if exists public.probe_orders();
--   drop function if exists public.notify_new_orders();
--
-- Check first — `prosrc like '%ntfy%'` should list them all, live one included:
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosrc like '%ntfy%';
-- ─────────────────────────────────────────────────────────────────────────────
