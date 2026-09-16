# Jienluv2bake — change history (v54 → v96)

What changed in each version of the backoffice app, newest first. Each version
number is the "Engine" you can see on the app's **More** screen, so you can
always tell which build a phone is running.

**15 Sep 2026 — engine v96 (no database setup needed). "Set day's availability"
now shows how the day adds up.** One change, on the pop-up you already use.

**Why.** v95 made the day's total count only the products you sell that day, but
the pop-up that sets those numbers still showed nothing about where the total came
from - and a product you do not sell that day sat in the list looking as if it were
part of it.

**What it does now.** Under the product rows, the pop-up ends with **How the day
adds up:** one line per product on sale that day with what it contributes, and a
final line with the total - **the same number the order page uses for that day**.
Type a + or a − and the lines and the total move as you type. Underneath, the
pop-up names what it left out ("Not counted: Saturday loaf - not sold on this day,
so no order can go on them here") and says what is already booked, so you can read
how much the order page can still take. A product not sold that day keeps its row
so you can still set its numbers; it simply does not enter the total.

**One number, one place.** That sum and the day's capacity are computed by the same
function the shop's numbers come from, so what you read on screen and what your
customers get cannot drift apart.

**15 Sep 2026 — engine v95 (no database setup needed). A day's total now counts
only the products you actually sell that day.** One change, on your side of the
app, with one knock-on for customers.

**What it was doing.** The "x/y" on a day - the chip beside the date on Orders,
the same number on the day in the month calendar, and the dials on Home - was
adding up the daily limit of every product on your menu, whether or not that
product can be ordered on the day you were looking at. So a day with one product
on it (a limit of 12, say) still read **1/42**: thirty of those units were limits
belonging to products that could never take an order that day.

**What it does now.** Only the products on sale that day count. A Saturday-only
loaf adds nothing to a Wednesday, and a product kept on the shop as **Unavailable**
adds nothing to a day it is not sold on. The same day now reads **1/12** - what
that day can really take. Products with no sell marks are unchanged (they sell
every day, so they always count), and a day where nothing on sale has a daily limit
falls back to the **default capacity** in Settings, exactly as before - it does not
drop to 0, which would make the app call the day Sold out.

**The knock-on worth knowing.** This same number is what the app tells the order
page about a day, so a day now turns FULL at the moment every unit you are actually
selling that day is booked, rather than at some larger number padded out by
products that were never on sale. Past every real slot being taken, the order page
stops offering that day - which was always the intent, and now happens at the right
moment rather than late.

**Nothing else moved.** Your over-capacity warning, the "N ordered · N left" line
on a delivery date, the purchasing plan and each product's own "N left" stamp all
read the same number they always did for products that are on sale.

**15 Sep 2026 — engine v94 (no database setup needed). One sentence on the
customer's greyed card, reworded.** Wording only - nothing behaves differently.

On a product you keep on the shop, the line saying why it cannot be ordered today
now reads **Only available on Mon.** where it read "Only sold on Mon." The old
wording was the seller's voice on a customer's card, and "available" is what the
rest of that same card already says ("Only available for delivery from 19 Sep").
The Chinese and Bahasa Malaysia say the same thing as before, in their own words.

**15 Sep 2026 — engine v93 (no database setup needed). The track link now lands
on the track card, lit.** One change, on the customer's side of the shop.

**Why.** Your confirmation message ends with a Track your order link. Tapping it
opened the order page at the very top, with the tracking card somewhere below -
the customer had to scroll and hunt for the very thing they had just tapped, on a
page they have never seen before.

**What it does now.** The page comes up with the Track your order card already in
view AND gently glowing, so it cannot be missed. The glow does not fade on a
timer: it goes when their pointer or finger reaches the card, so it is still
burning while they are looking around for it. That is the same rule your own app
uses when you tap an order in the New orders box and it flashes the row - the
flash is there until you arrive.

**Nothing else changed.** Typing a code into the box on the page behaves exactly
as before (the card is already in front of them, so nothing moves), and a customer
who simply opens the shop sees no glow at all.

**15 Sep 2026 — engine v92 (no database setup needed). The New product card on
Products folds away.** One change, on one screen.

**Why.** The card that adds a product sat open at the top of the Products screen,
and open it is a long form - it pushed your three lists (On the shop, Draft,
Hidden) right off the bottom, so every look at what you sell began with a scroll
past a form you were not filling in.

**What it does now.** The card arrives folded to a single line reading **＋ New
product**. Tap it and the form opens; tap the title again, or tap anywhere else on
the screen, to fold it away. It stays open after you add a product - the toast
still says it was saved as a draft - so you can type the next one straight away,
and it starts folded again the next time you come to the screen. Nothing about
adding a product changed: the form inside is exactly as it was, and it is still
the same card that stays on the page while an Edit pop-up is open over it.

**15 Sep 2026 — engine v91 (no database setup needed). The Orders calendar now
answers a tap it cannot act on.** One change, on one screen.

**Tapping a day you do not deliver on.** The month calendar at the top of Orders
rings your delivery days in green with how booked each one is, and draws every
other day of the month plain. A plain day never did anything before — tapping it
was silent, which left you guessing at the reason. Now the calendar answers: a
warm line appears under the grid naming the day and saying it is not a delivery
day, and that delivery days are added in More → Delivery dates. A marked day says
its usual name above the day at the same time, so a holiday that is not a delivery
date now tells you both what it is and why no order can go on it. Opening a real day,
or tapping another plain one, replaces the line. Nothing can be ordered on a plain
day, and nothing is created by the tap — the calendar simply says so now instead of
staying quiet. A plain day already gone stays silent: there is nothing left to add
to it.

**Where it appears.** The month calendar at the top of Orders, the day picker
inside the ＋ New order card, and the Delivery day picker in an order's Edit
pop-up — every calendar in the app that offers only your delivery days.

**Nothing else changed.** Delivery dates are still made in exactly one place, More
→ Delivery dates (or **Generate next delivery dates** on Home). Tapping a calendar
elsewhere in the app does not create one, and a tap that could open a day before
still opens it.

**15 Sep 2026 — engine v90 (no database setup needed). A product can stay on
the shop on a day it cannot be ordered, with the date a customer can next have
it.** One new switch, off unless you turn it on.

**Keep it on the shop.** A product's Availability card now opens with a switch at
the very top, above the sell-day calendar. It is for the two or three hot items
customers come back looking for - if it is not listed they wonder whether you
still make it - but leave it on for everything and the menu fills up, so it is a
decision you make one product at a time. The card's own title carries the state
too, so you can read it while the card is still closed.

**What the shop shows with it on.** On a delivery day the product is not sold on,
the card stays instead of vanishing: greyed, stamped **Unavailable** (a day you
never sell it is not the same as a day it ran out), with the reason it already
writes ("Only sold on Mon") and one more line - the next date it can be ordered.
On a day it has sold out the card is exactly what it was, **Sold out** stamp and
all, and gains that same line. The line reads **Next available: Sat 19 Sep**, and
names how many are left that day when a daily limit is set; it pulses gently so
it reads through the dimming, and sits still - simply lit - if your phone asks for
reduced motion. Nothing on a greyed card can be ordered: the + and - do nothing,
it never enters a basket, and a line already in a basket still leaves with a note
when the day changes. The switch never overrides **Draft** or **Hidden** - those
still take a product off the shop entirely.

**With the switch off, nothing at all changes.** Off is the default and no product
you already have carries the setting, so every product behaves exactly as it does
today until you switch one on. One consequence worth knowing: on a day where
every product is unavailable, a shop with kept items shows those greyed cards
instead of the "nothing is on the menu" line.

**14 Sep 2026 — engine v89 (no database setup needed). The Delivery Dates screen
trades its list for the calendar: a ticked day comes off when you tap it again,
and the past dates fold away into one group.** Three small changes, all on one
screen.

**Tapping a ticked day takes it back off.** A delivery date that was already on
the calendar used to come off only from the list underneath it. Now tapping that
green day takes it off on the spot - the same tap that put it there undoes it, so
the calendar is the one place you both add and remove dates. If that day already
has an order on it the app asks first ("2026-09-16 has 2 order(s) on it. Delete
the date? The orders are kept in your delivery history."), because that is the one
removal worth a second look; a day with nothing on it just goes, with a small
"Delivery date removed" note. The date is all that is ever removed - the orders
stay in your history either way.

**The list of dates still to come is gone.** The calendar already draws every
delivery date as a green tick, and now it lets you take any one of them back, so
the list below was repeating what was already in front of you. That is most of
why this screen reads so much lighter. Nothing else moved: the green tick, the
coloured holiday tags and the "N ordered · N left" line are all as they were.

**The past dates are one group, folded away.** Dates already gone keep their
green tick but cannot be tapped, so nothing on a past day can be changed by a
stray touch. They now sit together under a **Past dates (12)** heading that starts
folded - tap the heading to open the list, tap it again to fold it back. Every
past date is in there now: the old list showed only the ten most recent and left
the rest out of reach. Each one still opens its orders or can be deleted exactly
as before, with the same "Del" button and the same question when orders sit on it.

**14 Sep 2026 — engine v88 (no database setup needed). The holiday tint sits on
the day numbers at the Orders screen, and a mouse resting on a marked day names
it.** Two small things, both about the Orders screen and the bubble.

**The tint now sits on the line of dates.** On the Orders calendar each delivery
day carries its booking count, and that count sat *under* the date number, which
pushed the number 5.5px above the middle of its row. The occasion wash is centred
on the row, so on this one screen the tint sat lower than the numbers it was meant
to be washing - and the dates themselves did not line up with each other. The count
now sits at the foot of the day, every date number sits on one line, and the tint
runs through that line. Nothing else about the calendar moved: the green ring, the
chosen day's fill, and the counts all read exactly as before.

**On a computer the name comes up on hover.** v87's bubble needed a tap. With a
mouse, resting the pointer on a marked day now shows its name on its own, exactly
as the customer's page does. This is deliberately only for a pointer that can
hover: a touch screen keeps the tap, so a finger sweeping a run of days across the
Availability or Delivery Dates calendars never drags a bubble along with it.

**14 Sep 2026 — engine v87 (no database setup needed). Tap a marked day and it
tells you its name — on every calendar in the app.** v85 drew your marks on all
five of the app's month calendars, but only as colour: a wash and a band, with
nothing to say which holiday it was. The customer's own shop page has answered
this since its calendar arrived - tap a marked day and a small dark bubble above
it says the name - so the app now does the same thing, with the same look.

**A tap names the day and still does that day's usual job.** The bubble appears
above the day ("Malaysia Day") and goes away as soon as you tap anywhere else.
Nothing else about the tap changed: on the Orders calendar it still opens the
day, on a product's Availability calendar it still marks or unmarks the sell day,
on Delivery Dates it still starts the range you are about to mark. A day that
sits inside two marks takes the name of the shorter one - the same rule the
colours already follow, so the name and the colour always belong to the same
mark. A day already gone is never named, because no mark is drawn on a past day
either.

**Two kinds of day could not be read at all before, and now can.** On the Orders
calendar a marked day you do not deliver was a quiet number with nothing to tap,
and on the Delivery Dates calendar a marked day that is *already* one of your
delivery dates could not be tapped either - its tick is removed from the list
below the calendar, never by tapping its square, so its tap was free. Both now
say their name when tapped, and nothing else about them moved: a Delivery Dates
square still never ticks or unt ticks a date.

**The Order date boxes name their day above the date, not above a day of the
month.** Those two fields fold their calendar the moment a day is picked, so a
bubble drawn on the day would vanish with it. The name sits above the date the
box is showing instead, which also means an order recorded on a public holiday
says so for as long as that date is on the field.

Nothing was added, moved or removed, and the shop is not touched: this is the
same bubble the shop's calendar has been showing, arriving on your own calendars.

**14 Sep 2026 — engine v86 (no database setup needed). On the Orders screen your
marked days now sit on their days, at the same depth as everywhere else.** v85
put your marks on every calendar in the app. On the Orders screen the wash did
not line up with the days underneath it. Two things were behind that, and both
came from the same fact: the days on that one screen are taller than the days
anywhere else, because a delivery day there carries its booking count ("3/12")
under its number.

**A holiday band was stretched to fill its week row.** Where every day is the
app's usual height, a band came out the same 30px sheet a single-day box is, so
the two shapes matched - which is how the rest of the app has always drawn them.
On the Orders screen the rows are taller, so the band there came out deeper than
a single-day box, and deeper in the weeks that held a delivery day than in the
weeks that did not, so one holiday's own band changed depth from row to row
inside the same month. **A band is now a sheet of one depth, centred on its
row** - the same depth a single-day box has, on every calendar, whatever height
the days around it happen to be.

**A plain day kept the app's usual height inside a taller row**, so it sat at
the top of the row rather than on its middle. A single-day mark was therefore
drawn 6px higher on a day you do not deliver than on a day you do: the same
holiday, on a different line, decided by whether you deliver that day. **Every
day of the Orders month is now drawn at one height**, delivering or not, so a
mark sits on the same line as the day it covers, beside the booking counts.

One more thing fell out of that. Today's soft glow is drawn around a whole day on
the app's shorter calendars, and around a taller day it would have become a box
again - the very thing that glow replaced. **Today on the Orders screen now glows
around its number**, the same round glow a delivery day's number carries, so
today reads the same whether or not you deliver that day.

Nothing else changed. The shop's calendar and your Delivery Dates calendar look
exactly as before (their days are all one height, so they never had this), and no
mark was added, moved or removed: this is the drawing only.

**14 Sep 2026 — engine v85 (no database setup needed). Your marked days are now
drawn on every calendar in the app, not just the one you marked them on.** Until
now a holiday only appeared on the customer's calendar and on the Delivery Dates
screen you marked it on. Every other calendar in the app drew a plain month: the
month calendar at the top of the Orders screen, the little **Order date**
calendars in the new-order form and in the Edit-order pop-up, the delivery-day
picker inside that pop-up, and a product's **Availability** calendar where you
mark the days it sells. So a holiday you were planning around was invisible on
every screen you actually plan on.

**Now all of them draw your marks, in the same two shapes and the same colours as
the Delivery Dates calendar** - a see-through band across a run of days, deeper
the shorter the run, and a box for a single day. A mark on a day you do not
deliver is drawn too, on a dimmed day, since that is the only way a holiday on a
quiet day can be seen at all. Nothing about the marks themselves changed: they are
still only ever something to see, and a mark still never adds or removes a
delivery date or changes what a product sells. Two small pieces of the drawing
were tidied while moving it: the green tint on a day a product sells is now a
see-through wash rather than a flat fill, so a holiday band running behind it
still shows through instead of the mark disappearing on exactly the days you
sell (the tint itself looks the same as before); and a marked day that happens to
be today now keeps the soft glow that says "this is today", the way the shop's
calendar has always drawn it.

**14 Sep 2026 — engine v84 (no database setup needed). A day you marked is now
the same gentle wash everywhere, whichever calendar you are looking at.** A
marked day was drawn one of two ways, decided by a single question: is this a day
you deliver for? On a day you deliver for the mark went pale, so the green "you
can order" ring stayed the first thing the eye read. On a day you do not, the
mark was drawn at full colour, as a solid block with the number turned white.
September's Malaysia Day sat on a delivery day and read as a quiet tint; October's
World Animal Day fell past the delivery days published so far and read as a loud
solid block - so the same kind of holiday looked like two different things, and a
mark quietly changed its own appearance as the delivery window moved towards it.

**Now a mark is only ever a see-through wash of its own colour, and its depth
follows how long the mark runs: a one-day holiday the deepest, a long school
break the palest.** The customer's calendar and your own Delivery Dates calendar
read that depth from the same place, so a day wears exactly the same mark on both
sides of the shop and in every month. Nothing is ever a solid block of colour any
more, which also means the date number and the green delivery pill always read on
top of a mark, whether or not you deliver that day. Only the look changed:
marking, removing, renaming and loading standard occasions all work exactly as
before, and a mark still never adds or removes a delivery date.

**14 Sep 2026 — engine v83 (no database setup needed). Marking a holiday now
tells the shop straight away.** A day you mark on the Delivery Dates calendar is
drawn on the customer's own calendar (engine v79 to v81). But saving a mark only
ever sent your delivery dates to the cloud - it never sent the customer's page
anything - so the marks reached the shop only by accident, whenever you next
happened to save a product or a setting. Mark the holiday, open the shop, and
nothing had changed. Found while you were looking for a holiday on the shop and
finding none.

**Now the same save does both.** Marking a day, removing a mark, loading a set
from the standard list, or renaming or recolouring one all republish the
customer's page within a couple of seconds, exactly the way editing a product
does. Nothing else about a mark changed: it is still only ever something to see
while planning, it still never adds or removes a delivery date, and a name you
typed yourself still never leaves your phone.

**One tap to catch up the marks you already have.** The fix sends the marks from
now on; the ones already on your calendar have never been sent at all, so open
More → Settings → Storefront and tap **Publish now** once. After that the shop's
calendar follows your marks by itself. Nothing to run in Supabase.

**14 Sep 2026 — engine v82 (no database setup needed). A product's selling days
are now marked on a little calendar inside the product's own screen — weekend,
certain days, a season, or any mix of them.** Until today a product could say
only two things about *when*: a notice period, and one from-date and to-date for
a season. You asked to set it freely instead, so the two date boxes have become a
card you mark.

**Open a product and tap the Availability card.** It sits under Daily limit and
stays folded until you tap its title, exactly like the product-text card you
already know. Folded, its title tells you what is marked — "Every day", or "Sat
& Sun", or "1-24 Dec 2026" — so the Products screen alone tells you a product's
selling days without opening anything.

**Inside, it is a month calendar and four gestures.** Tap a weekday letter (M, T,
W...) and every one of that weekday **in the month shown** is marked: tap S twice
and the product sells on Saturdays and Sundays. Tap one day to mark just that
day. Slide your finger across several days and the whole run is marked. Tapping
or sliding over a day that is already marked takes it back. Everything you mark
is added together — mark Saturday and Sunday, then a week in the middle, and the
product sells on all of them.

**Nothing carries over into the next month**, which is the point of it: marks
belong to the days you marked and no others, so a December-only set stays
December-only and January starts with nothing marked. Page to another month with
the arrows and mark that one too if you want to sell then. And a product whose
card you have never opened sells on every delivery day exactly as before, so
nothing on your live shop moves until you mark it.

**A period that crosses a month or a year is one mark with two ends you can
stretch.** The card lists your marks under the calendar; tap one and its
**Starts** and **Ends** dates appear above it, and you can push either end as far
as you like — a Sat & Sun run from 1 Dec to 4 Jan is one line, not two marks.
Leave an end empty and the mark simply has no bound on that side ("from here
on", or "up to here"). Type the two dates the wrong way round and they are put
in order for you. A small x on a listed mark removes it whole.

**On the order page, a day a product is not sold for is not a note — the product
is simply not there.** No card, nothing to want and not have. If a customer
already had it in their basket and then switches to a day it is not sold for, it
leaves the basket and a short line says why. The one rule that keeps its note is
the notice period: a product needing 14 days IS sold that day, it only has to be
ordered earlier, so it stays on the menu reading "Orders close 14 days before
delivery - pick a later date" — the two are different questions, and only the
second one hides anything.

**Two things worth saying plainly.** The old From/To season boxes are gone; a
product that had them opens with that period already sitting in the card as one
mark, so nothing you set before is lost. And a product whose selling days have
all gone by keeps them, on purpose: your own rule is "if I have not indicated a
selling date, it is not selling", so a mark you leave on says exactly that, and
the way to put a product back on sale every day is to take its marks off with the
x. No database setup, and delivery dates, capacity, value packs, ingredients,
suppliers and everything else are untouched.

**14 Sep 2026 — engine v81 (no database setup needed). A holiday you marked is
now drawn on the shop's calendar exactly the way your own calendar draws it: a
pale band across a run of days, a solid box for a single day.** The marks were
already reaching the shop; it was only their shape that differed, and a mark
that looks different on the customer's page than on yours is a mark your
customer has to learn twice.

**On the shop, a marked day now wears the mark your own calendar gives it.** The
shop had been drawing each marked day as its own flat pale square, so a holiday
running over a week read as a row of separate blocks where your own calendar
shows one continuous shape. Now a holiday running over **several days** is a
**pale see-through band** across those days - one unbroken rounded band per week
row it crosses, in its own colour, and **deeper the shorter the run**, so a
one-day holiday still stands out inside a long school break. A **single-day**
holiday is a **solid box** in its full colour on its one day, a touch narrower
than the band so a longer band still peeks out at its sides. The eight colours
are your own calendar's eight, and the strength steps are the same three, so a
marked day reads the same to your customer as it does to you.

**The one place it gives way: a day you deliver for.** Green is the colour the
delivery ring uses, and a solid box would swallow that ring - so on a day the
bakery delivers for, the day a customer can actually order, the box goes pale
there and the **green ring stays the first thing the eye reads**. The mark is
still there on that day, and the day is still named on a tap. This is the one
guard on the shop's calendar, and it covers every mark colour rather than green
alone, so no colour can ever hide the days that can be ordered for.

**Nothing else moves.** Tap a marked day - or, on a computer, rest the mouse
pointer on it - and the same small bubble names it, e.g. "Malaysia Day"; tapping
anywhere else puts the bubble away, and still nothing is listed under the grid.
Today still breathes its soft glow. A run still stops at today rather than
colouring days already gone, exactly as your own calendar leaves past days
alone. And your own typed-in days still never reach the shop: only a day that is,
by name and date, one of the built-in standard days can be published, exactly as
before. No SQL, no schema change. The calendar the shop draws with is still a
copy of your app's own, and a test now pins the two copies' mark rules together
as well as their month grids, so a day can never again look like one thing here
and something else there.

**14 Sep 2026 — engine v80 (no database setup needed). Today glows instead of
wearing a box, a holiday you marked is a soft tint you can tap to name, and the
Orders screen's sideways date strip becomes the same month calendar the shop
shows.** Three small things, all pulling the same way: a calendar should read
the same on both sides of the shop, and nothing drawn on it should look like
something it is not.

**On the shop, today no longer wears a little red rectangle.** It always meant
to be a ring around the date, but on a day you do not deliver the app had no
circle to draw that ring on, so it traced the day's number as a box instead —
which is why it looked like a red square on the quiet days and only looked
right on the days you deliver for. Today is now a **gentle glow** that breathes
around the number, with no box at all, and it sits happily on a day you deliver
for too: the **green ring** says you can order for this day, the soft brown
glow says it is today. Under **prefers-reduced-motion** (a phone set to calm
its animations) the glow holds steady instead of pulsing, so it is still there
to find. The same fix reaches the app: the today marker on the Delivery Dates
calendar, and inside every date picker, was a hard outline and is now the same
soft glow.

**A holiday you marked is now a soft wash, and its name comes out on a tap.**
The shop's calendar used to mark a standard day with a small coloured dot and
then list the month's names in a "Holidays" line under the grid — which crowded
the very line that line was there to keep clear, and made a holiday compete
with the days a customer can actually order for. A marked day now wears a
**pale wash** of its own colour over the whole day. The wash is deliberately
neither a ring nor a filled dot, because a ring is what "you can order for this
day" looks like, and the two must never be read for each other. Tap a tinted
day — or, on a computer, rest the mouse pointer on it — and a small dark
**bubble** above it names the day, e.g. "Malaysia Day". Tapping anywhere else
puts the bubble away. The "Holidays" line under the grid is gone. Your own
typed-in days still never reach the shop: only a day that is, by name and date,
one of the built-in standard days can be published, exactly as before.

In the app the same holiday is named **beside the day** instead of in a list:
open a delivery day and, if it carries a mark, its name sits under the date in
the mark's own colour. Nothing at all is drawn on a day you have not marked.

**The Orders screen's date strip is now a month calendar.** The row of date
chips at the top of Orders grew a little longer every week. It is now the same
**month calendar** the customer sees — one month at a time, with left and right
arrow buttons either side of the month's name. The days you deliver for are
ringed in **green**, and under each one is **how booked it is**: the same
"3/12" the Home dials show, or **FULL** when the day has no room left. A day
whose orders have already closed shows its count in **red**; a day already gone
is dimmed but still opens, because you backfill and look back at old days.
Every other day of the month is plain and cannot be tapped. Tap a green day and
the app's view moves to it — that day is filled in on the calendar and its
orders appear below — and tapping a day in the list below moves the calendar
with it, so the two always agree. The arrows reach only the months your
delivery days fall in, so paging never strands you on an empty month.

**The ＋ New order card arrives folded, and leads with the calendar.** It used
to sit open on every delivery day, which is not what that screen is for day to
day. It now starts **shut**, showing just its title, "＋ New order" — tap the
title to open it, and tap the title again (or tap anywhere else on the screen)
to fold it away. Opened, it reads in the order you think in: **the month
calendar first**, the same one the shop shows, already sitting on the day you
are looking at, so tapping another green day moves the whole screen before you
have typed anything; **then the customer's details** — name, WhatsApp number,
self-collect or courier, a note; **then the items**, with "＋ Add another item"
and "＋ Add order" at the end. It stays open after you add an order, so you can
type the next one straight away, and coming back to the screen later starts it
folded again.

**The Edit pop-up now reads the same way.** Its **Delivery day** control was a
button you had to tap to reveal a calendar; the calendar is simply there now,
already open on the order's current day. The pop-up then reads the day, then
the customer's details, then the items — the same order as the card. Every day
still to come is tappable, plus the order's own day even if it has passed, so
an old order always shows where it is, and the soft notes re-read underneath
the moment you pick a different day. Moving an order is unchanged in every way
that matters: still one delivery day per order, and capacity, the confirmation
and the payment reminder, the track page and the WhatsApp messages are all
exactly as they were. The button-style day picker the app used in these two
places has been deleted along with its tests, because nothing calls it any
more.

**14 Sep 2026 — engine v79 (no database setup needed). The customer picks a
delivery day on a calendar, and so do you in the app.** The shop used to show
its delivery days as a row of date chips laid out sideways. Now, under **Pick a
delivery day**, the customer sees a **month calendar** — one month at a time,
with the arrow buttons either side of the month's name to look ahead or back.
The days you are taking orders for are picked out in **green**; every other day
of the month is plain and cannot be tapped. They tap a green day, and the day
they chose is written out in words just underneath — **"Your delivery day: Wed,
16 Sep"**. That is the one line of text below the calendar, exactly as asked:
no dates floating outside the grid, and still **one delivery day per order**.
The first open day is already chosen for them when the page opens, so ordering
can never be blocked by forgetting to tap. Nothing else about taking orders
changed: a day you have cut off is still not shown at all, and a day that is
full still greys out with a red **Sold out** badge and cannot be tapped.

**Only the standard days you have marked reach the customer.** If you have
loaded days from the built-in list onto your own Delivery Dates calendar, those
days now wear a small coloured dot on the customer's calendar, and a short
**Holidays** line under the grid names the month's ones (e.g. "16 Sep ·
Malaysia Day"). They follow the colour you gave them. A day **you typed
yourself** — a birthday, a promo, a school break — never appears: only a day
that is, by name and date, one of the built-in standard days can be published,
so your own notes stay private to your phone. Mark nothing in the app and the
shop's calendar simply carries no dots and no caption.

**In the app, the same little calendar now stands wherever you name a date.**
Three places changed. In the **Edit** pop-up, **Delivery day** is no longer a
drop-down list: it names the order's current day, and tapping it opens a small
month calendar beneath it — every day still to come is tappable, plus the
order's own day even if it has passed, so an old order always shows where it
is. The **Order date** box in that pop-up is a calendar too, with a **Today**
shortcut for an order you are typing in right now. And the **＋ New order**
card has gained a **Delivery day** picker at its top: tap another green day and
the whole screen moves to that day, so the product list you are choosing from
is always the one that is actually sellable for the day you picked. The soft
notes that help you decide — the change/cancel window, a warning, a closed day,
too little left — all still sit under the calendar, and none of them stop you.

The calendar expands in place under the button rather than opening in its own
window, because the app's pop-ups share one layer and a calendar opened inside
one would wipe out the Edit pop-up it was opened from; expanding in place also
reads better on a phone. No database setup needed — nothing about how orders
are stored, counted, bought for or messaged changed.

**13 Sep 2026 — engine v78 (no database setup needed). The two confusing
"Add" buttons on the Delivery Dates calendar now say what they do.** On the
Delivery Dates screen, **Mark an occasion** used to carry a small button
reading **"＋ Add occasion"**. The name did not tell you that it opens a
ready-made list of Malaysia's holidays and fun days, all ticked and waiting —
so you had to open it to find out. It now reads **"＋ Load standard
occasions"**, and the window it opens is titled the same.

Inside that window there were **two buttons both called "Add"** — the big one
at the bottom that files the days you ticked, and a smaller one in the **My
own day** strip just above it, which files a day you name yourself (a
birthday, a one-off promo). Reaching for "Add" and hitting the wrong one gave
you **"Type a name first"**, for a day you never meant to name. The smaller
one is now spelled out as **"Add my own day"**, so the only plain **Add** in
the window is the one that adds the ticked days.

Nothing else moved. Ticking a row and pressing the big **Add** still files
exactly what you ticked and nothing you did not; **Untick all** / **Tick all**
and the heading tick boxes work as before; the **My own day** box still takes
any name and any date. No database setup needed.

**13 Sep 2026 — engine v77 (no database setup needed). The greyed line in the
translated-text card now says what happens if you leave it blank.** Engine v76
turned the product screen's 中文 / Bahasa Malaysia text into one folding card,
and each empty line showed its translation on offer. That greyed line read
"e.g. <the translation> — blank keeps English". It now reads **"e.g. <the
translation>……if blank, it will be filled with English"** — the same words
you asked for, saying plainly what the customer gets rather than asking you to
work it out. The line in the card's own explanation says the same. Deleting
what is in a line brings the greyed line and its arrow straight back, exactly as
before. Nothing else moved: the card still folds away when you tap outside, the
→ still takes the words, the ↻ still translates that line again.

**13 Sep 2026 — engine v76 (no database setup needed). The translated text on a
product is now one quiet card that folds away, filled in for you one line at a
time.** The **Product text for your customers** part of the New/Edit product
screen — the same words in **中文** and **Bahasa Malaysia** — was the busiest
corner of the whole app. It was always open, so a long screen got longer before
you needed any of it; eight lines each carried its own **"Translate this one"**
button; two **"Fill all"** buttons sat above them; and a little **"auto"**
tag marked the machine-made lines, in a word you had to remember the meaning of.

Now the card starts **shut** and stays shut — it is the setup part of the
screen, not the part you touch every day. **Tap its title to open it.** Opened,
each line already has its translation worked out and waiting as the same pale
grey suggestion you know from every other box, with the little **→** at its
right edge: **tap the → and the suggested words drop in** — exactly the gesture
you already use. The moment you take them, the arrow is replaced by a small
**↻** — tap it and that one line is translated again on the spot, which is what
the old "Translate this one" button did. **Type your own words over any line and
the ↻ goes away** for that line: it is yours, and it is never overwritten. **Leave a
line blank** and that language keeps the English, the same as before. And when
you are done, **tap anywhere outside the card and it folds away again.**

The **"Fill all 中文" / "Fill all Bahasa Malaysia"** buttons are gone, the
eight **"Translate this one"** buttons are gone, and there is no **"auto"** tag
to read any more — a line showing the ↻ is machine text, and a line with no button
is yours. Nothing about what your customers see has changed, and nothing needs
setting up: a product is still translated for the shop the first time you save
it and again when you Publish, exactly as before, so a product you never open
this card for still reads in all three languages on the order page.

**12 Sep 2026 — the TNG QR box no longer claims to be on the order page (no new
engine; your phones did not change).** The box in **Settings → Storefront**
holding your Touch 'n Go QR image link said it was **"shown on the customer's
track page"**. It never was — your payment QR reaches the customer in the
**WhatsApp confirmation** and the **payment reminder**, and nowhere else. The
help text now says that, and the order page's own settings no longer carry the
QR at all, so it cannot be drawn there by accident. Nothing about how you take
payment changed, and nothing about how the app works changed.

**12 Sep 2026 — engine v75 (no database setup needed). The glow on an order
you have just jumped to now stays until you reach it.** Tapping a row in the
**New Orders** inbox (or a result in **Find an order**) takes you to that
order's delivery day and marks the order with a green glow —
but the glow used to fade after less than two seconds, which is no time at all
when your eye is still travelling down a long day, and you were left hunting for
a row that was no longer lit. **The glow now keeps pulsing until you get to the
row.** It stops the moment your finger or the mouse arrives on that order, or
when you tap it open — so it is waiting for you however long you take, and it
never lingers as a puzzle later. (If a phone has **Reduce Motion** turned on in
its accessibility settings, the same green outline holds steady instead of
pulsing — it still stays until you reach the row.)

**12 Sep 2026 — engine v74 (no database setup needed). The little arrow in an
empty box now keeps working.** Engine v73 added the small right-arrow that sits
at the right edge of a box showing a greyed example: press the **→ key** on a
keyboard, or tap that arrow, and the example drops in as real text. On a phone
that tap worked the first time and could then go dead — once you had tapped into
a box, tapping the arrow on the next one did nothing.

Two things were behind it, and both are fixed. The tap was measured against the
**page**, and the phone's keyboard shifts the page under your finger as soon as
any box is focused, so the arrow was no longer where it had been. And taking a
suggestion **opened the keyboard itself**, so the page jumped after the very
first tap. The tap is now measured against the **box itself**, taking a
suggestion no longer opens the keyboard at all, and the strip you can tap is
about half as wide again — so a thumb that lands a little wide of the arrow
still counts. A tap on the greyed text stays an ordinary tap that just puts your
cursor there. **The arrow looks exactly as it did**, and nothing else changed.

**12 Sep 2026 — a new order now opens on the order itself (no new engine;
nothing to set up).** Tapping a row in the **New Orders** inbox took you to that
order's delivery day — and stopped there. On a busy day, with a long list of
orders, you then had to read down the list to find the very order you had just
tapped, and it was easy to open the wrong one.

The app now goes the whole way: it opens the delivery day, **scrolls the order
to the middle of the screen and flashes it** for a moment, exactly as the **Find
an order** search box already did. If the list had been narrowed with the status
filter so the order was hidden, that filter is cleared first, so the order is
always there waiting for you. Nothing else on the Orders screen changed.

**12 Sep 2026 — engine v73 (no database setup needed).** Five changes, all about
the shop's promise to the customer and the baker's control over it.

Your rule is that an order is **not cancellable and money is not refunded, but it
can be moved to another day**, and a customer may ask until a set number of days
before delivery. That number now lives **per product**. Open a product in
**Products** and, under its daily limit, a new box **"Changes or cancellations
(days before delivery)"** — type 2, say, and that product's card on the shop
reads **"Change or cancel up to 2 days before delivery."** It only ever __tells__
the customer; it never blocks you, and you still move any order by hand. Leave it
blank (or 0) and no note shows for that product. When one order holds several
products with different numbers, the customer sees the **strictest** one — the
largest, i.e. the earliest cut-off — so a mixed basket always gives one clear
figure. The same sentence appears on the green **"Order received!"** card just
after they place the order.

Second, **you can now move an order to another delivery day in the app.** Open an
order with **Edit** and, in the pop-up, a new **"Delivery day"** box lists every
day still to come, soonest first. Pick the new day and **Save changes**: the
whole order moves as one — items, customer and the price it was sold at all stay
put — and the customer's **"Track your order"** page follows to the new day
straight away. Under the box are quiet notes to help you decide: the order's own
change/cancel window, a reminder when the new day falls **inside** it, a note if
that day's orders have already closed, and a note if that day does not have
enough left for an item. None of them stop you — they only tell you — and the
capacity check now counts the order on the **new** day, so you can see at once if
that day would go over. This is the **only** way to change an order's day: never
delete an order and re-type it, because deleting reads as a cancellation. A day
left empty stays in your list — to remove it, use **Del** on the Deliveries
screen as before.

Third, **a Policies box** for your own cancellation and refund wording. It sits
in **More → Settings → Storefront**. Type it once in English, tap **Translate**,
and the 中文 and Bahasa Malaysia boxes are filled for you (edit either and it
becomes yours). It appears on the shop **under Track your order**, in the
customer's own language and with the line breaks you typed, and it stays hidden
until you write something.

Fourth, and everywhere in the app: **an empty box showing a greyed suggestion can
now be accepted with one tap — the arrow.** A small right-arrow sits at the right
edge of such boxes; press the **right-arrow key** or tap that arrow and the
suggestion drops in as real text you can edit — the same gesture as accepting a
suggestion in an AI chat. It is offered only where the grey text is a genuine
recommendation; the sign-in and cloud boxes never offer it, so a made-up key or
password can never be accepted by accident.

No database setup and no new SQL — the new product box and the Policies wording
travel with your existing shared data.

**9 Sep 2026 — the wish list's automatic email went live (no new engine; the
phones did not change).** Adding a wish on **More → Software wish list** now
emails the **full wish list** — every wish, ticked or not, newest first, with
the app version and the date — to the developer address(es) you set under
Settings → **Website & developer**, all on its own, whenever the phone is signed
in and sharing data. Before today that automatic email needed a behind-the-scenes
service that was not switched on yet, so only the **"Email the full wish list"**
row sent it by hand; that row is still there as a backup any time.

**10 Sep 2026 — the homepage opens faster (no new engine; the phones did not
change).** Two things about the public homepage were quietly costing every
visitor time, and both are fixed.

The homepage's six photographs were stored __inside__ the page itself, so the
page was **249 KB before a single picture had even been asked for** — and every
visitor downloaded all of it, on every visit, before they could see anything.
The photos are now six separate files that the browser fetches and **keeps for
next time**, which brings the page itself down to **22.7 KB**. The pictures are
byte-for-byte the same ones, so the homepage looks exactly as it did, and each
one now states its size up front so nothing jumps around as the page loads.

Second, the "What customers say" section used to fetch **every published review
photo up front** — including the reviews a visitor never waited around to see.
A photo is now fetched **as its review comes around**, one step ahead of time so
it is ready before it slides in, and the reviews a visitor never reaches are
never downloaded at all. On a phone that means less data and a quicker page,
and it changes nothing about how the section looks or behaves.

A review photo is also shrunk a little harder before it is stored — to 1000
pixels across instead of 1600. The card on the homepage shows a picture no more
than 340 pixels high, so the smaller copy looks just as sharp while being about
**a third of the size**, which is kinder to the customer's mobile data and keeps
your stored photos light. This applies to photos left from now on; the reviews
already on your page keep the picture they were stored with.

Your sign-off line — **Jien Luv 2 Bake | Small Batch. Big Love. ♡** — has moved
from the very bottom of the homepage footer, where it sat shoulder to shoulder
with the developer credit, up to the **top of the footer**, above your contact
details and set off by a thin line. It reads a touch larger now, and in
whichever language the visitor has chosen, like the rest of the footer. The
"Website by …" credit stays where it was and now stands on its own.

**10 Sep 2026 — the homepage's language buttons can no longer go dead (no new
engine; the phones did not change).** On some phones the homepage's
**EN / 中文 / BM** buttons could stop responding — the page would sit in English
and tapping 中文 did nothing — often after the page had been left alone for a
while, or refreshed. The culprit was a leftover background worker from when the
backoffice was served from the top of the website instead of from /admin/. (A
background worker is the machinery the app installs so it can open without a
connection.) That old worker had cached the whole website, and whenever
something failed to download it answered with whatever it had — including
handing the browser **a web page where it had asked for a script**. A page that
receives a web page instead of its script never runs it, so the code that wires
up the language buttons never ran; the English words you saw are written into
the page itself, which is why the page still looked perfectly normal.

The old worker is now cleared away wherever it is still installed: a small
cleanup file sits at the same address the old worker used, so the next visit
replaces it, empties everything it had cached, and removes itself. The
backoffice's own offline cache is deliberately left untouched, because the app
needs it to open without a connection. The app's worker has also been taught,
for good, never to answer a script or a picture with a web page — so the same
fault cannot come back on any part of the site.

## v72 — The shop's sold-out notes read in the customer's language (10 Sep 2026)
The shop page switches language in place, but two corners of it had stayed
English no matter which language a visitor chose: the short note on a product
that **cannot be ordered for the chosen day** (that it only opens from a certain
date, only runs up to one, or that orders close so many days ahead — with the
date written in the page's language), and the notes that appear above the menu
when the page **has to change a basket** — an item that just sold out, or a
quantity trimmed to what is actually left.

Both now read in **English, 中文 or Bahasa Malaysia** along with everything else.
The reason a product is closed is now handed to the page as a plain fact — which
kind of rule, and the day or number of days behind it — and the page writes the
sentence itself, so no English can slip into a Chinese or Malay page. An English
visit is word for word what it was.

## v71 — The shop's 中文 / BM buttons answer instantly (10 Sep 2026)
On the shop page, tapping **EN / 中文 / BM** used to reload the whole page. That
re-downloaded the page and fetched the menu, the "left today" numbers and your
saved storefront settings all over again, so each tap sat there for a moment
before anything changed — and the slower the phone's connection, the longer the
wait. A reload could also wipe a basket that was already half filled.

Now the shop switches **in place**, exactly like the homepage already did: the
words change the moment you tap, and nothing is downloaded again. Whatever the
customer has already done is left untouched — the items in their basket, the
delivery day they picked, the name, WhatsApp number and address they typed — and
if they are looking up an order, that card re-reads in the new language too.
Nothing to set up.

## v70 — An order keeps the price it was sold at (10 Sep 2026)
Until now an order only remembered **which product** was bought, not what it cost
or what it was called. Everything — the amount on the customer's confirmation,
the total on their own "Track your order" page, their lifetime spend on the
customer list, the Home estimate — was worked out from **today's** menu. So the
moment you re-priced or renamed a product, every past order silently moved with
it: last month's order suddenly read RM22 instead of the RM15 the customer
actually paid, and a renamed loaf rewrote what people had already bought.

Now an order is a record of a sale. When an order comes in — from the shop or
typed in by hand — it keeps the **name and the price it was sold at**, and those
are what every message, the tracking page and the customer's spend use. Rename or
re-price a product today and yesterday's orders stay exactly as they were. A line
you deliberately swap to a different product when you **Edit** an order does pick
up that product's current price — that is a new sale — but a line you leave alone
keeps its old price.

Existing orders (taken before this version) are stamped once with today's values,
which is exactly what they are showing right now, so they stop drifting from here
on. Nothing to set up; the phones pick it up with the next sync.

## v69 — Either place updates the customer (10 Sep 2026)
Yesterday's fix put a customer's name and number back in one place — but it made
the **customer card** the side that always won, so if the card and an order
disagreed, the card's name was the one shown. That is no longer the rule: now it
is simply **whichever you edited last**. Correct a customer's name with **Edit**
on one of their orders and that is the name the list, the history pop-up and the
"Hi {name}!" greeting use; open their card, type the name and save, and the
card's is the one used. Either place updates the customer — neither is the boss.
They normally read the same anyway, because each save writes through to the
other side; this only decides the rare case where an old copy and a newer one
are both sitting there. Nothing to set up; the phones pick it up with the next
sync.

## v68 — One name and one number per customer (10 Sep 2026)
A customer's name and WhatsApp number used to be held in two places at once — on
their orders, and on their customer card — and the two did not always agree. If
you opened a customer and typed their name on their card, the customer list could
carry on showing the old one, because it read the name off the order. And
renaming someone who has **no WhatsApp number** on file could lose them: the name
is what ties a numberless customer to their history, so the new name slid off
their orders and appeared nowhere at all.

Now the name and number you save on a customer are the ones that count, and
fixing them once fixes them everywhere: saving their card writes the name and
number onto **every order they have**, so the labels, the WhatsApp messages and
the customer list all follow. It works the other way round too — correct a wrong
number with **Edit** on an order and that customer's card updates as well, so the
two can never drift apart again. Correcting a number carries that customer's
bring-a-friend credits across with it, and renaming someone who has no number no
longer loses them.

Leaving a box empty means "leave this as it is" — it never wipes a number your
confirmations depend on. And if you renamed anyone before today and it never
stuck, the app puts their orders right the first time this version opens. Engine
v68, guide v68.

## v67 — Naming a "No name" customer (10 Sep 2026)
A customer who reached you without a name — a storefront order that carried none
— used to stay **"No name"** in your customer book even after you opened them and
typed a name. Now it sticks: open them, tap **Add details**, type the name (and
the dog's name, what they like, and so on) and save, and their row shows that
name straight away — in the list, the finder and the 'Hi {name}!' WhatsApp
greeting. A tidy-up; nothing else about your customers changes. Engine v67,
guide v67.

## v66 — Auto-translate product text, plus Draft / Publish / Hidden states (9 Sep 2026)
Product **description, selling unit word** (the "RM15.00 / loaf" bit), **serving
tip** and now the **name itself** read in English, 中文 or Bahasa Malaysia
automatically — a free translator fills the 中文/BM boxes for you the first time
you save or publish a product. A small "auto" tag marks a machine translation;
if one "sounds weird", open the product's edit screen, type over that box (it
then becomes yours and is never overwritten), or tap a "Fill all 中文" /
"Fill all Bahasa Malaysia" button or the ↻ next to a single line to have it
translated again now. Good translations are simply left alone, and you never
hand-fill a whole product.

Products also gain a **third state**. A new product now starts as a **Draft** —
fully built with its recipe, but **not on the shop and not orderable** until you
**Publish** it. The Products screen shows **three separate lists**: **On the
shop**, **Draft — not on the shop yet** (each with a Publish button) and
**Hidden — taken down** (with an Unhide button). Hiding a product still keeps
its history, recipe and purchase orders.

The **"Copy follow-up"** bring-a-friend message gains a small **EN / 中文 / BM**
choice, so the whole check-in you paste into WhatsApp — including the product's
serving tip — can be in your customer's language. No SQL this version.

## v65 — Reviews preview + "waiting to publish" cue (9 Sep 2026)
More → **Reviews** now shows each review **exactly as customers see it** on the
homepage — the photo, the stars, the message, then the reviewer's name and the
language and date, in the same warm card — and they play **one at a time**, like
the homepage's "What customers say" carousel. The reviews waiting for your
**Publish** come first; once you have worked through them, the ones already on
the homepage follow. It never slides on by itself while you are deciding — a
swipe, the arrow buttons, or a dot under the card moves it on, and Publish /
Take down / Delete moves you straight to the next review. A line at the very
top of the screen says how many are waiting ("3 reviews waiting for you to
publish"). The **Reviews** row on the **More** menu shows how many are waiting
too, and the app's **Home** screen gains a "**N new review(s) to publish**" card
that opens the Reviews screen in one tap — so a new review is never left
waiting unseen. No SQL this version.

## v64 — Review carousel, EN/中文/BM site, developer contact + wish email (9 Sep 2026)
The homepage **"What customers say"** reviews now play as a **carousel** — one
review fills the section at a time, then slides on every few seconds. Visitors
can swipe or use the ‹ › arrows and the dots below to move through them, and it
pauses while someone is reading. One review, or none, still shows simply.

The whole **homepage and storefront now read in English, 中文 or Bahasa
Malaysia** via an **EN 中文 BM** switch near the top of each page (English is
the default, and a visitor's choice is remembered next visit). Every product
can carry its own **translated shop names** — Products → Edit → **Shop names** —
so shoppers in 中文/BM see a proper translated name on the order page; a blank
box keeps the English name, which always stays the real name in the app,
labels and history.

The thank-you after sending a review is warmer and honest: it reassures the
sender that their review and photo reached the baker and will appear once
approved, and a critical review (3 stars or fewer) gets an extra line of
thanks for honest feedback. A reviewer now attaches their photo **two ways**:
**Take photo** (camera) or **Choose photo** (gallery).

Developer contact is now in the app: under More → Settings → **Website &
developer**, type the developer's name and one or more email addresses. A
small **Website by …** credit links from the bottom of the homepage, the
storefront footer and More → About (each address tappable). Add the
developer's optional **WhatsApp number** in the same card and that link opens
WhatsApp (Business) with a ready "Hi!" — message the developer straight from
the page — with the email links staying underneath. And adding a **software
wish** on the More screen emails the developer the **full wish list** — every
wish, ticked or not, newest first, with the app version, the project address
and the date — to every address you listed; an **Email the full wish list**
row on the card can send it from your own mail app too. No SQL this version.

## v63 — Customers tab, wish list, holidays fix (8 Sep 2026)
**Customers** is a real tab of its own, swapped with **Purchase Order** (now
under **More → Purchase Order**). The tab stays your automatic customer list —
who ordered, how much, their favourite — and now every person can carry a
**profile** (the **Edit** button in their history pop-up): their dog's name and a
small photo (auto-shrunk to a thumb), what they like, what to avoid, and a note.
Profiles save into a synced `customers` collection, so both phones know the same
people, and they build up quietly for a future AI chat about your customers. A
**finder** box at the top of the tab filters the list as you type — name,
number, dog's name, likes, notes — and says how many match, just like
"Find an order" on Orders. A saved profile shows as a paw or photo beside the
name and a small line under the row.

On **Home**, the "Upcoming holidays" card is fixed: it used to vanish whenever
nothing was marked on the Delivery calendar. It is now always there — up to
three marks at a glance, a scroll for any more, and a friendly empty state that
still opens the calendar so you can add days.

On **More**, a small green **Engine v63** pill (in the header card) shows which
build this phone runs, a **Software wish list** sits at the bottom and behaves
exactly like your to-do list (add, tick, reword, remove — a tick stays ticked
and never touches the weekly routine), and **Full change history** opens this
history as a PDF kept on your website. No SQL this version.

## v62 — "Not sharing" strip + read-only View (8 Sep 2026)
When a phone is not on the shared cloud — shared data off, never set up, or
signed out — a thin amber strip at the very top of every screen reads **"⚠ Not
sharing right now"** with a one-line reason and a **Fix it** tap straight to
Settings → Shared data. It never locks the app, and it disappears on its own the
moment sharing is back on. (Set up once per phone: no SQL — the shared-data
setup from v53 does everything.)

Also, every backup copy in Settings → **Backup & safety** now has a **View**
button: a purely read-only look inside that copy — its orders grouped by
delivery date (customer, product, quantity, status), the product price list and
ingredient stock at that time. Looking at a June price confirms the detail
without moving today: no rewind, nothing written, ever.

## v61 — Cloud backups (8 Sep 2026)
Every time the app opens while signed in, it quietly saves a full **Daily**
copy (first open each day), a **Weekly** copy (Mondays) and a **Monthly** copy
(the 1st) to your own Supabase cloud, keeping the newest 7 daily / 4 weekly /
3 monthly. A "Back up to cloud now" button, and one "Before restore" copy
saved before every restore, stay until you delete them. Each copy can be
**Restored** (steps the phone — and the shared cloud — back to that copy; a
"Before restore" copy is always saved first, so it is never one-way),
**Downloaded** as `jienluv2bake-backup-YYYY-MM-DD-KIND.json` (which re-imports
like an Export), or **Deleted**. Lives under More → Settings → "Backup &
safety". The copies never contain the per-phone app-login email/password or
the app password. Setup: run `supabase/backups.sql` once.

## v60 — Homepage customer reviews (8 Sep 2026)
Customers can leave a **What customers say** review on the homepage — name,
1–5 stars, a message in English / 中文 / Bahasa Malaysia, and an optional
photo. Every review lands __unpublished__ in More → Reviews, where **Publish**
shows it on the homepage, **Take down** hides it, and **Delete** removes it —
nothing becomes public until you tap Publish. Reviews appear on the homepage
only. Setup: run `supabase/reviews.sql` once.

## v59 — Occasion import tidy-up (8 Sep 2026)
Added **World Animal Day** (4 Oct) to the fun/pet-day import, plus
whole-group ticking — tick a heading box, or use **Untick all / Tick all**.

## v58 — Occasion import (8 Sep 2026)
A one-tap **＋ Add occasion** import of Malaysia's days plus fun days (pet,
baking, kindness), and a **My own day** quick-add.

## v57 — Private notes per product ingredient (8 Sep 2026)
Each ingredient line in a product can carry a short private description __for
that product only__ (e.g. which flour that product uses). Typed and seen on the
Products screens only — never on the shop, a label, or the product cards.

## v56 — "Keep at least" reserve (8 Sep 2026)
Ingredients can set a **Keep at least** level. The order list tops an
ingredient back up to that level in whole packs when your stock drops more
than 10% under it, and low items ride along even when today's bakes don't use
them. The Ingredients screen shows a red low-stock strip. Guide synced to v56.

## v55 — Time & length units (7 Sep 2026)
**min/hr** and **cm/m** are pre-loaded in Units (under More), like g/kg — so
bake times and pan sizes can be measured and converted (1 hr = 60 min,
1 m = 100 cm). Baking stock is guarded so a time or length unit can never
distort a gram count.

## v54 — Ingredients on hand (7 Sep 2026)
Ingredients now have **On hand** stock. The PO buys only what you don't have
(rows you already have drop out), "Bought" on a saved list adds its packs
once, and marking an order **Baked** subtracts its ingredients (undo restores
them).

---

__This history covers the two-phone cloud era (v54+). Earlier versions
(pre-v54) were never recorded version by version, so they are not listed here
rather than invented. Each new version is added here as it ships.__
