# Jienluv2bake — change history (v54 → v202)

What changed in each version of the backoffice app, newest first. Each version
number is the "Engine" you can see on the app's **More** screen, so you can
always tell which build a phone is running.

**26 Sep 2026 — engine v202, THE SHOP NOW COMES TO THE ADDRESS THE CUSTOMER TYPES (no database
step — but ONE deploy command, and the feature does nothing until you run it — see the bottom of
this entry). A customer on the shop page used to type their address into a plain box and then press
"Pin on the map", which opened the map on the whole of Penang. They then had to drag and zoom around
the island looking for their own street. You asked whether the map could bring them to their address
instead, the way a ride app does. It now does.**

**What they see.** As they type their address, a short list appears under the box with the doors
they might mean — the street on one line, the town and postcode with it. They tap the right one, and
the map opens already standing on that door, close enough to pick out the house, **with the pin
already on it**. Then they drag or tap to fine-tune it, exactly as before, and press Keep this spot.
The list holds at most five doors, only in Malaysia, and only doors it has a real point for. Once they
have tapped one, the line above the list steps aside — the screen must not go on telling them to do
something they have just done. The doors themselves stay where they are, so changing their mind is
one more tap rather than typing the street again.

**Nothing is asked until they have actually typed an address, and nothing is asked mid-word.** The
page waits until they pause, and it only bothers with a question worth asking — a word or two, or a
postcode on its own, gets no list. It also never blocks anything: if nothing matches, or if the
service having a bad day, one short sentence appears in their own language, and the map button is
exactly where it was. A customer who ignores the list completely can still pin by hand the way they
always could. That has not changed at all.

**Their typed address now leaves the phone one more time — as your bakery, not as them.** This was
your own decision and it is worth stating. The address goes to your Supabase, which asks the map
service. So the map service sees your bakery's name and your server, not the customer and not their
phone. That is the same posture your own app already takes when it looks an address up, and it is
the reason the shop could not simply ask the map service from the customer's own browser. Nothing is
stored anywhere: the service is asked a question and gives an answer.

**One thing to do before this works, and it is the only step.** The shop page is a plain website, so
the lookup has to live somewhere that can hold your bakery's name — a small function on your
Supabase. Until you put it there, the list says the lookup is unavailable and the customer pins by
hand, which is exactly what they did before this version. Push alone changes the shop's screen; it
does not make the list work. The command is repeated at the bottom of this entry, and it is one line.

**Nothing about the pin's standing has changed.** A pin the customer drops — from the list or by
hand — is still a SUGGESTION and never a fact. Nothing is priced from it, nothing is booked from it,
and no driver is ever told it. It is still offered to you on the order's delivery-price card and on
the delivery run, and it still only becomes their doorstep when you press **Use the customer's pin**.
A suggestion is a suggestion however the customer arrived at it.

**And the door you keep for them still wins.** A lookup the shop did has no say in what you have
saved against a customer. Where you already keep a door for somebody, that is the door the driver is
sent to, and their new suggestion is offered beside it as it always was.

**The one step, written out.** In the Terminal, from the folder that holds the app:

    supabase functions deploy shop-geocode --project-ref hzpyblqygnntixkijeem

The `--project-ref` part matters — without it the tool asks you to pick a project from a list, and
that list also holds an unrelated one. There is nothing to configure and no key to paste: this
function holds no secrets and can reach nothing but the two public map services. Run the line once
and the list works from then on.

**26 Sep 2026 — engine v201, THE COURIER BOX NOW SHOWS THE DOOR (no database step, no redeploy —
one push). Open an order's Note / tracking box and, for an order that goes by courier, the top of it
now tells you which door the driver would be sent to: the customer, the address, and a small map
with the pin on it. You can look at it without pressing anything, and you can move it if it is not
the door. That is the whole of it — and it is the box you asked about, the one that used to send you
to Edit for the address, which meant the one place you book a trip was the one place you could not
check where the van was going.**

**Why this was worth doing, in one line.** A courier is not given an address, it is given a point.
The pin is the stop the van drives to. A pin that landed on the wrong estate is a delivery you pay
for and then chase, and until now the only place you could see it was a map screen that threw away
whatever you had half-typed in this box. So the door moved to the top of the box you were already
in.

**It is a picture until you say otherwise.** The map opens read-only, which is what you asked for:
a drag does nothing, a tap does nothing, and pinching does nothing. Press **Move this pin** and that
same map wakes up — drag the pin, and the moment you let go it is saved against that customer, with
nothing you had typed beside it thrown away. A second press (**Done moving**) puts it back to a map
you cannot nudge by accident while reaching past it. If you do not want to drag a small pin with a
thumb, a tap anywhere on the unlocked map drops it there instead.

**If the customer pinned their own door on the shop page, that is what you see, and the box says
so.** It reads as their own pin, not as the door the driver is sent to — because it is not one
until you make it one. Press Move and it becomes the door you keep for them, exactly as it always
worked, and from then on the line reads as the door you keep for them rather than as their
suggestion. Nothing they dropped reaches a driver unaccepted.

**Moving the pin clears the prices that were on the screen, and tells you why.** A price belongs to
the door it was asked for, so a price quoted for the old one would have been a lie in the box you
book from. The box says, in the line where prices appear, that the door moved and to ask again for
this spot. It does not quietly re-ask on its own — asking is eight requests, and that has always
stayed your tap.

**And it still works when the map does not.** On a phone with one bar of signal, or a day when the
map service itself is having trouble, you get the words instead of the picture: the door named as
before, the pin's own coordinates so you can still check them, and a line saying the map is not
available right now. There is always a way to put a doorstep on the map even then, because the pin
screen can take coordinates as well as an address.

**An order with nothing pinned shows its address and offers to pin one.** No map, because a map
with no pin on it is a picture of nothing, and it would spend a fifth of the box saying so. And an
order that is collected rather than delivered gets no door block at all — there is no door to check.

**One thing to know about the Edit form.** It gains the same block, so the customer end has one
kind of control rather than two. There it sits directly under the address row rather than at the
very top, because the address on that screen is a draft you are part-way through typing and is not
the address the driver is sent to — so the check you can trust sits beside the real one rather than
floating above a box you have not saved yet.

**Nothing here can stop you taking a delivery, and that is deliberate.** An order with no pin, or a
pin you have never looked at, prices and books exactly as it did before. This is a way to look and a
way to fix; it is not a step you have to pass.

**The map stays where you leave it.** If you drag the map across to look at the next street, nothing
on the card will pull it back. And once you move the pin, it lands where you let go of it and stays
there, rather than sliding back to the middle of the box. This was wrong in the first build of this
version and was caught by dragging the map on a real render and watching the box snap back the moment
anything redrew. It is the same rule the planner already follows: a redraw must never move you. The
one thing that __does__ move the map is the address lookup finding a door the map has not shown yet,
because that is a door you would otherwise not be looking at.

**Seven new tests, and ten faults put back to prove they work.** The faults included the block being
built inside the price fold instead of at the top of the box (where it would be invisible until you
asked for a price — the exact fault you reported), a dragged pin never being saved, a dragged pin
leaving the old door's prices on the screen, the map not following the pin the panel looks up on its
way to a price, the block being drawn for collect orders, a missing map being left as a blank space
with no word about why, the map opening already draggable, a locked map swallowing the card's scroll
on a phone, the map never being measured once the card had settled, and every redraw pulling the map
back to the pin. All ten were caught by the tests that name them, and each was injected, seen to
fail, and removed again with the files proved byte-identical. The whole suite is 1711 tests.

**26 Sep 2026 — engine v200, THE SETTINGS THAT STAYED BEHIND NOW TRAVEL (no database step, no
redeploy — one push). Five things you set on one phone never reached the other: the two lists on
Money — what an expense was for, and the ways you get paid — your mailing address, and the
planner's people, meaning the names you give the workers and which of them the day calls. Set them
on your phone, open the app on the other, and the built-in names were back, the address box was
empty, and your workers were numbers again. Nothing you set was ever lost; it saved properly on the
phone that set it and had no way across. All five now travel, so whichever phone you pick up has
them.**

**Here is what was actually wrong, and it is not what it looks like.** Your settings go up to the
cloud as one block, and the app only puts a thing into that block if it knows to look for it. Five
of them were never on that list. So they were saved on the phone, left out of everything sent up,
and the other phone — never told — kept whatever it already had. It was never a failed upload and
never anything you did; the app simply was not carrying them.

**Set any of the five on either phone and the other phone has it the next time it opens.** The two
Money lists travel as the whole list, not blended together — editing them replaces them, exactly the
way the rest of Settings behaves, so the two phones cannot end up with a half-and-half version of
your chart. Your mailing address reaches the other phone as the FROM block on your labels. The
planner's names are the same names on every plan you make, because the app keeps them by the worker,
not by the plan — name somebody once and every plan reads as people.

**Emptying one is an answer and now travels as one.** If you clear your chart back to nothing, that
means "back to the built-in names", and that meaning now reaches the other phone instead of the old
list coming straight back at you. The same goes for an address you clear, and for a worker's name
you delete. Before, a list you had cleared and a list you had never touched looked identical on the
way up, so the phone that still had your old list would have handed it back — the app could not tell
"she cleared this" from "she has no opinion here". It can now.

**And it is safe to open the app on a phone you have not set up.** A phone that has never touched
one of these can never delete it from the other phone: staying quiet about a setting is not an
instruction to remove it. If the phone that has never seen your chart opens first, it receives
yours rather than pushing its own built-in one over you. This is the same rule that stopped a newly
set-up phone from emptying your saved days, and it now covers these five as well.

**Still on the phone it is on, on purpose, and worth knowing.** Your sign-in details and your app
lock never travel — those belong to the phone in your hand. The short list of occasion names Home
remembers stays put too, since it is a convenience for the phone you name them on; if you would
rather it followed you as well, say so and it is a small change.

**Twenty-one new tests, and ten faults put back to prove they work.** The faults included each list
being left out of what goes up, each one being made deletable by a phone that never set it, a
cleared address going out as silence instead of as an empty one, and a name list arriving as
something that would have stopped the planner drawing. All ten were caught by the tests that name
them; a test that stays green while the thing it tests is broken is worth nothing, so each one was
injected, seen to fail, and removed. The whole suite is 1704 tests.

**25 Sep 2026 — engine v199, THE TOTAL NOW SHOWS ITS WORKING (no database step, no redeploy — one
push). On the WhatsApp message at every stage of an order, and on the Track page your customer
opens, the money is set out as a small addition rather than one figure on its own: what they ordered
comes to this, plus the courier's charge if there is one, and it all reaches the total — with the
total set apart by a blank line and shown bold, so the eye lands on the number that matters. Every
message that names money now names it the same way, and every track card says the same figures in
the same order as the message.**

**There were two different things wrong, and only one of them was the emphasis you asked about.**
On a message, the total was simply the next line down from the working, in the same weight as
everything else, so it read as one more line of the paragraph rather than the answer. And on an
order that carried no courier charge at all there was no working to read in the first place: the
"Items:" line is followed by what the customer ordered — two loaves, one sandwich — and not by what
it costs. So a customer with a plain self-collect order had a total arrive from nowhere and nothing
to check it against. That is the one you spotted, and it was the more serious of the two.

**What every message now reads, from the confirmation onwards.** The goods, then what they come to,
then the courier's charge if the customer is bearing one, then the total. The charge keeps the two
wordings it has always had — the plain charge, and the charge the courier collects at the door, which
says so and stays out of the total because the customer hands it over in person. A self-collect
order with no charge skips straight from what the goods come to down to the total, so the two figures
sit one above the other and agree.

**One of the three messages was different from the other two, and it is now the same. The message
you send when a courier order is on its way used to leave the total out completely unless the order
carried a charge** — so the one message a customer gets when their order is in a van was the one
message that never said what they had paid, while the payment reminder for the same order always
quoted it. It now carries the same lines as the rest. Nothing about where the order is, or the
tracking number, has changed.

**The Track page draws the same three lines, in the same order.** Before, it named the courier's
charge and then ran the goods and the total together onto one line joined by a dash, so the charge
appeared with no clue how it related to the figure after it. It now lists what they ordered, what
that comes to, the charge if there is one, and the total underneath — the same reading order as the
message, so the two cannot be read as two different sums. It also used to write the charge as
"RM8.00" with no space, unlike every other figure on the site; it now matches.

**Bold is done the way each place can do it.** WhatsApp has no bold setting in a typed message, so
the total is wrapped in a pair of asterisks, which is the one way to make a line stand out there.
The Track page is a web page, so it simply styles the line instead — you will never see an asterisk
on the shop side, because that would be the WhatsApp message leaking onto the page. Both were worth
saying, because they are the same intention carried out two different ways.

**The figures are worked out from what the app already knows, so no new column was needed.** The
total is the one figure the app publishes to the customer's page; the courier's charge is published
beside it, and it is inside that total unless the courier is collecting it at the door. So the Track
page takes the charge back off to show what the goods came to — which is why a doorstep charge does
not move that figure at all, since it was never added to it. The page also reads the currency off
the published total rather than assuming ringgit, so a price written in another currency cannot end
up with its working-out written in RM.

**Sixteen faults put back, all sixteen caught.** The faults included the total quietly losing its
asterisks, the blank line going missing above it, the working disappearing altogether so the old
"total from nowhere" came back, and — the one most worth having — the Track page taking the courier's
charge off an order the courier is collecting at the door, which would have shown a customer a
subtotal of RM22 on an order they are being asked RM30 for. Also among them: the shipped message
going back to naming a total only when there was a charge, and one of the translations losing the
placeholder that carries its figure, which would print "Items total:" with no amount beside it.
Every file was restored byte-identically and proved by sha256 rather than by counting lines. The
suite is 1670 passing with none failing.

**No database step, and no redeploy.** This one is all in the app itself, so the push is the whole
of it — nothing to run in Supabase, and the courier function is not touched. The v196 and v198
lookup changes still need the redeploy they were waiting for; this one does not add to that. After
pushing, close and reopen the app on your phone.

**25 Sep 2026 — engine v198, THE ADDRESS LOOKUP OFFERS ITS OTHER MATCHES (no database step; the
courier function must be redeployed). When you press "Look it up" on the pin card, the card now
lists the other places the lookup found, underneath the button, so the right door is a press rather
than a drag. The first match still lands on the map by itself and nothing else about the flow
changes — the list is there for one thing only, saying "not that one".**

**Every answer but the first was being thrown away, on every lookup.** The address services answer
with a handful of places, nearest-sounding first, and the app used to keep only the first one and
drop the rest on the floor. So when the top answer was the wrong end of the street, the pin landed
there, and the only way to fix it was to notice and drag it. The other answers were arriving all
along.

**What you do now, and it is one press more than nothing.** Type or paste the address, press "Look
it up", and the pin lands on the best match exactly as it always did. If the lookup found more than
one place, the line under the button says so — "Found: 12 Jalan Bunga — and 3 more below" — and the
other places are listed under it, each showing the street on one line and the town and postcode
underneath. Press the one you want and the pin goes there.

**The row the pin is on wears a tick, and the tick follows the pin rather than your press.** It is
not a note that you tapped a row; it is read back from where the pin actually is. So if you tap a
row and then drag the pin, or paste a pair of coordinates, the tick moves with it and stops claiming
a street the pin is not on. The list stays open after you press a row, so you can try one, watch the
map move, and try another before you settle.

**One match draws no list.** A single answer is not a choice, and the line under the button already
names it, so nothing is drawn under it. This is also what keeps the card behaving exactly as it does
today until the courier function is redeployed.

**A new lookup clears the old rows first, and a lookup that finds nothing takes them away with it.**
The previous answer is never left sitting under a new question.

**Why the same free map service, and not Google.** You asked about Google's address service, and I
read its terms before building anything. It requires the results to be shown on a Google map and it
forbids keeping them — and this app keeps your customers' doors for good, which is exactly what the
pin card is for. The two cannot be made to agree by any amount of code, so the answer was to ask the
service already in use for all five of its answers instead of one. It is built from the same open
map data, it covers Malaysia, and it needs no account, no key and no card.

**The suggestions arrive when you press, and not while you type, and that is deliberate.** This is
not the typing-ahead suggestion box you see on shop websites. A suggestion per keystroke would put
several requests per word onto a free service that asks to be used lightly, and its own terms say
heavy use may be throttled or refused. One press is one request — the same number of requests the
app made before this change.

**A quiet detail, put where a test can see it.** Long addresses are split into the two lines of a
row, and how to split them is decided in the app's own rules file rather than inside the card, so
the split that cannot be got wrong is the one that gets tested. The honest limit: an address from
the second service can read as a bare house number on the top line, with the street underneath. The
coordinates are unaffected, and the list is a correction rather than the thing that places the pin.

**Ten faults put back, all ten caught.** The faults included pressing a row and the pin landing on
the first match anyway, a single match drawing a list of one, and the old rows being left behind
under a new lookup. Every file was restored byte-identically and proved by sha256 rather than by
counting lines, because a one-letter difference has hidden behind a matching length here before. The
suite is 1658 passing with none failing.

**This one needs the courier function redeployed.** The list is assembled on your server, so pushing
the app's files is not enough by itself — the deploy step is what puts it live, and until then the
card behaves exactly as it does today. One redeploy settles this and the v196 lookup fix together.
After that, close and reopen the app on your phone.

**No database step.** Nothing stored is added, changed or moved.

**25 Sep 2026 — engine v197, THE CUSTOMER CAN PIN THEIR OWN DOOR (no database step). Your customer,
on the shop page, can now drop a pin on the door the courier should stop at, and you are offered it
where you already look at a doorstep: on the order's delivery-price section, and on the delivery run
under that customer's row. Their pin is a SUGGESTION and never a fact — nothing is priced, booked or
sent to a driver from a pin you have not taken up yourself. An order from a customer who pins nothing
is posted exactly as it always was, byte for byte.**

**The two ways a customer pins, because one is not enough.** A customer standing at their own door
presses "Use my location" and the phone hands the pin over. A customer ordering from somewhere
else — the office, the bus, their mother's house — presses "Pin on the map" and drags a pin to their
door, which is how everybody already drops a pin in a ride app. Where they order from has nothing to
do with where the focaccia goes, which is the whole reason both exist.

**Your three answers are the feature.** Offered every time, even when you already keep a door for
that customer: the offer is not silenced by your own door, only the words change — "pinned a
different spot this time, the doorstep you keep for them is untouched until you take this one", and
the press says "Use the customer's pin instead". A courier customer who pins nothing sends as it
always has. And it appears in both places, the order card and the delivery run, drawn the same way in
both so the same press means the same thing.

**Taking it up is the only thing that makes it a door.** Pressing "Use the customer's pin" writes it
with the same single writer your own map pin already uses, so a pin you accepted and a pin you placed
by hand are the same record on the same customer. That is also what makes it stop being offered — no
"dismissed" flag is stored anywhere, because accepting is what ends it. And because a delivery run's
row is one big label you tap to tick a customer, the offer sits beside the row rather than inside it:
a press in there would have ticked the customer off the run instead of pinning their door.

**Where to pin, for a block or a condo.** The shop now says it in words, in all three languages:
drop the pin where the courier can stop — the guard house or your block's entrance — and put the
block and unit number in the address box above. A pin is two numbers and cannot hold a unit number,
and a pin dropped inside a tower is exactly where a phone's own position goes vague. Lalamove's own
Malaysian guidance says the same thing: pin the lobby, the main entrance or a landmark a driver can
actually stop at, and sort a wrong pin out by talking to the driver. That is also why the typed
address still travels with every order, with or without a pin.

**A vague position is kept and said, never refused.** If a phone reports a position that is only
accurate to more than about 150 metres, the customer is told the number and pointed at the map to
move it — rather than being blocked from ordering. Your own rule, applied here: the shop never stands
between you and a sale, and you reconfirm every pin anyway.

**Every way the location press can fail has its own sentence** — a browser with no location at all, a
permission refused, a position unavailable, a wait that timed out, and a map that could not load. None
of them blocks the order.

**The map is only fetched when somebody presses for it.** A customer standing at their own front door
never loads it and never pays for it, and the location press works with no map at all.

**The suite is 1649 passing with none failing, and nothing of yours was written.** The new coverage
drives the real customer controls: a stubbed phone position, a press, and the posted order read back.
One finding worth naming was caught by these tests rather than by you — a half-written pin would
otherwise have become a real point on the equator, because a missing latitude reads as zero to the
computer. No database step and no redeploy: the pin rides inside the order the shop already posts.

**One honest limit.** Your phone's own permission sheet is something only a real phone can show, so
"Use my location" is proved by tests rather than by me driving it. Please try it once on your own
phone — stand somewhere you know, press it, and check the words that come back.

**25 Sep 2026 — engine v196, THE ADDRESS LOOKUP ASKS A SECOND SERVICE (no database step; the courier
function must be redeployed). You pressed "Look it up" on the pickup-pin card and read "The address
lookup service did not answer. Put the pin on the map instead." — and then read it again, a second
time. The lookup now asks a second address service first, and that one answers: typing an address
fills the pin in again. Nothing about your day, your chart, your orders or your saved data was
touched, and putting the pin on the map by hand still works exactly as it did — it is still the thing
the pin is really for.**

**What you read, and what it proved.** That sentence is written in one place, and it appears only
when the address service has answered and refused. So the news was not that your phone could not
reach it, and not that the service was down: it was that the service looked at the question and
turned it away. Three other sentences cover the unreachable, the too-slow and the not-found cases,
and you would have read one of those instead of this one.

**The service itself is healthy, and I checked rather than assumed.** Asked for the same kind of
request your app makes, it answered with a correct Penang result — the right street, the right town,
the right postcode, first time. So the address was not the trouble, and neither was the question or
the way the question is written.

**Why it turned the app away.** That service asks every caller to say who it is, and it turns away
callers it cannot account for. The app does say who it is, and says it the way that service asks —
but the request leaves through a shared machine, and whether the name survives the trip is not
something the app can see. What settled it was not the wording but the repetition: an ordinary
address, refused identically twice, while the same service happily answers for a different caller
(me). That is a house rule being applied rather than a fault to retry, so the answer was not to ask
harder but to ask somebody else as well.

**The fix: a second service is asked first.** The new one is built from the same open map data,
covers Malaysia, needs no account and no key, and asks nothing of the caller beyond the question
itself. The original service is kept and is now the second ask rather than the only one. Whichever
answers first wins, so in ordinary use only one service ever sees a customer's address — and an
address still never leaves your own server for the browser, which is how this was built and how it
stays.

**The old service was kept rather than thrown out.** It is the better-resourced index of the two,
and keeping it costs nothing: if whatever turned it away is ever lifted, it is already in the queue.
Losing its first place is the only thing it lost.

**The four ways a lookup can fail are now told apart.** Not found, refused, too slow, and
unreachable each get their own words, so the sentence you read describes the problem you actually
have — a house in a new estate that the map simply does not carry is not the same news as a service
that refused, and neither should wear the other's words.

**A quiet trap in the new service, caught by a test rather than by you.** The new service writes a
point's two numbers in the opposite order to every other point in this app. Read in the order it
writes them, a Penang street becomes a latitude of 100 degrees, which is not a place at all — and a
pin that silently never appears is a fault nobody notices until a driver is sent somewhere wrong. A
test now names that order explicitly.

**Eleven new tests, six faults put back, all six caught.** The faults included the original fault
itself — a refusal from the first service ending the whole lookup — and every one of them failed a
test that named it. Every file was restored byte-identically and proved by sha256 rather than by
counting lines, because a one-letter difference has hidden behind a matching length here before. The
suite is 1618 passing with none failing.

**This one needs the courier function redeployed.** Unlike the app's own screens, this fix lives on
your server, so pushing the files is not enough by itself — the deploy step is what puts it live.
After that, close and reopen the app on your phone before trying the address again.

**No database step.** Nothing stored is added, changed or moved.

**25 Sep 2026 — engine v195, THE PIN CARD DRAWS ITSELF (no database step). The screen that puts
your bakery's door on the map was not drawing a card. It was printing the words "[object
HTMLParagraphElement],[object HTMLDivElement],[object HTMLDivElement]..." — which is what you saw
on your phone, and it is what the card had become. Every field, button and map it was supposed to
hold had been built and then thrown away, so there was nothing on it to press and no way to save
the pin. It draws now. Nothing about your day, your chart, your orders or your saved data was
touched, and this was the same day the courier card above it began reading "Lalamove: sandbox",
which is that connection working.**

**What you saw, and what it was.** You opened Settings, pressed "Put the pickup pin on the map",
and instead of a card you got a line of bracketed text. Those brackets are how JavaScript says
"here is an object" when something asks it to write an object out as words. Each one was one part
of the card that never reached the screen: a line of explanation, the box for your address, the map
itself, the note under the map, the box for coordinates, the line reading where the pin sits, and
the row with the press that keeps it. Seven parts, all of them lost to one line of code.

**Why it happened, in one sentence.** The app builds a pop-up's contents as a list, and then hands
that list to a browser call that only accepts bare items, not a list — so the browser turned the
whole list into a single piece of text instead of drawing the seven things inside it. This is a
subtle trap rather than carelessness: the helper used everywhere else in the app happily takes a
list, so the two look as though they should behave the same, and only one of them does.

**This was the only card of the thirty-eight that did it.** Every other pop-up in the app — the
order edit, the product editor, the money journals, the day's availability — hands over one piece
at a time, which is why none of them has ever shown you this. The pin card is the one that hands
over a list, and it is the one that broke.

**And it got that far because that screen had no test of any kind.** Not a weak test, not an
outdated test — none. It is the newest screen in the app and it was the only one nothing checked.
The file that keeps this class of mistake from ever reaching a screen already existed, and it
already covered three other screens that had printed stray words at you; it simply did not know
about this one. It does now.

**Where the fix sits, and it is deliberately not the pin card.** The pin card could have been
rewritten to hand its parts over one at a time, which would have cured the symptom and left the
trap in place for the next card. Instead the pop-up helper itself was taught to accept a list as
well as a single piece, so the two builders in the app now behave the same way — and a test asserts
both halves: that a card handing over a list gets the list drawn, and that the thirty-seven cards
handing over one piece each still draw exactly as they did.

**Three faults put back, all three caught, every file restored byte-identically.** The original
fault was reinstated, and the test that names it failed; the list-check was removed, and cards
across the app failed, proving that guard is what keeps the other thirty-seven working; and the
map's own failure message was silenced, and the pin card's test failed. Restoration was proved by
sha256 of each file, not by counting lines, because a one-letter difference has hidden behind a
matching length before. The suite is 1607 passing with none failing.

**No database step.** Nothing stored is added or changed, and there is nothing to run in Supabase.
This is a screen-drawing fault, so it is cured by the app itself being updated — push it, then
close and reopen the app on your phone before you try the pin again.

**25 Sep 2026 — engine v194, THE COURIER STOPS BLAMING THE BUILD (no database step; the courier
function was redeployed). The sentence that appears on the Settings card when the courier cannot be
asked was false, and it pointed you at the wrong place. It said the build has no courier called
Lalamove, when the truth was that no Lalamove key had been added to the server yet. Those are two
different problems that until now shared one sentence, and they no longer do. Nothing about your
day, your chart, your orders or your saved data was touched.**

**What you read, and why it was wrong.** Having just deployed the courier function, you opened
More → Settings and read this: "Lalamove could not be asked: This build has no courier called
lalamove." Read plainly, that says the app is missing the courier - so the hunt begins in the
build, in the deploy, in the code. There is no fault in any of them, and there never was. The
server knew the real reason and had already written it to its own log, and then handed you a
sentence that hid it.

**Where the sentence came from.** One small function answers for the courier, and it builds its
configuration through a single door. Two different things could shut that door: a request naming a
courier this build does not carry, which is genuinely a fault in the app - and a Lalamove key that
has not been put on the server, which is one secret's worth of setup. Both produced the same
nothing, and one sentence was written for both. It was the sentence for the fault, so a missing key
was reported to you as a broken build.

**What it says now, and it is the exact line you will read.** "Lalamove could not be asked:
Lalamove's api key and secret have not been added to the server yet." The courier's name is still
there, the thing that is missing is named, and the word build is gone from it, because the build is
not the problem.

**Two problems, two sentences, and a test that keeps them apart.** The sentence about the key comes
from the courier's own file, beside the other two sentences that courier can be refused by, so a
second courier one day brings its own words rather than inheriting Lalamove's. And because the
function that chooses between them cannot be loaded by the test suite at all - it begins with a
line only Deno understands - a test now reads those two branches out of the file and requires each
to keep its own words. Put the old single sentence back into either one and the suite goes red.

**A guard of your own caught this change while it was being made.** The first attempt wrote the
missing key's name into a log line inside the dispatcher, and the app's existing rule - only the
registry and the courier's own file may name the courier in live code - refused it. The guard was
right and the line was changed to suit it, rather than the guard being widened to suit the line.
That guard exists because a courier's name written by hand into a screen is the defect that stops a
second courier ever being added cleanly.

**One more thing corrected in the same file, and it cost real time today.** The setup note at the
top of the courier function told us to run `supabase secrets set LALAMOVE_KEY <key>`. That command
is refused: the tool requires the equals sign, `LALAMOVE_KEY=<key>`, and answers "Invalid secret
pair ... Must be NAME=VALUE." The note also now says to name the project when deploying, because
the tool otherwise offers a list in which a wrong project can be chosen by a stray keystroke, and
it records that the sandbox switch lives in the top right corner of Lalamove's own page.

**No database step.** Nothing stored is added or changed, and there is nothing to run in Supabase.
The courier function itself was redeployed, which is the only thing that had to change for this to
take effect. Suite is 1604 passing with none failing, and five faults were put back in one at a
time - the collapse of the two sentences among them - each watched failing a test that names it and
then restored byte-identically.

**25 Sep 2026 — engine v193, THE WORKERS' LINE BECOMES A TRUE TIMELINE (no database step). The
seven changes you asked for to the person's window on the Production line, and one question you
asked about its countdown. A coach is now as long as the minutes your hand is needed on it, the
three people's lines share one clock so they can be read against each other, the line starts at the
left and the clock sweeps in to the middle before the line itself moves, a coach turns from green to
light red when its moment has passed and eases rather than snapping, and the line is dragged with
the right mouse button or with two fingers on a phone. Not one module, batch, start time, cycle or
saved day of yours was rewritten, and there is no database step.**

**1. What you asked, in your own words.** "1. The should start left hand side, not centred, this
request I did in previous chat, but never implemented. 2. Make the coach width relative to its
duration, and others batch duration, their labour requirement mark by hand needed, not batch
arrival. 3. So the 3 person's train head, should be timed and position relatively to each other,
when time start, 3 train started together. 4. The wait time a person interested is not the batch
arriving, but their hand needed. 5. The coach should have 2 color only. Green and light red, the
coach change to red only when their hand needed time is up, the change of color should be fade in
and out, not sudden so that the user dont feel the screen is jumping here and there." And then:
"and the drag, should be by right mouse button hold down". One more, asked after the first pass:
"can the time show under their names, accurate to 5m 55s?"

**2. A coach is as long as your hand is needed, and nothing else.** Until this release every coach
was the same width, and each person's line had its own private map from minutes to pixels, so a
twelve-minute job and a forty-minute one looked identical. The width is now the minutes your hand is
needed, multiplied by the day's own scale - the same figure the modules' window above it is already
drawn from. Measured live at the Detail scale: a hand-needed stretch of 6 minutes drew 43.2 pixels,
one of 2 minutes drew 14.4 pixels, one of 18 minutes drew 129.6, and every gap between them was an
exact multiple of the same figure. A one-minute fold is therefore a hairline, which is your own
answer for it.

**3. Three people, one clock.** Because every line is now drawn from that one scale, a minute of the
morning is the same point on all three, and the three trains start together. Measured live through
one whole walk: all three people's rulers stood at the identical pixel at every moment - 0 at the
start of the day, then 121 pixels, then 452 - and all three strips had slid by the identical amount.
Before this release each line carried its own map, so the three could not be compared at all, which
is the fault you named.

**4. The line starts at the left, and the clock sweeps to the middle.** This is your point 1, the
one you had asked for in an earlier conversation and which had never been built. At the start of the
day the day's own left edge is glued to the left edge of the window and the clock stands at the
left, so the whole queue ahead of you can be seen without dragging anything. Measured live on a
walk: with the clock 0.7 minutes in, the ruler stood at 5 pixels and the line had not moved at all.
Once the clock reaches the middle it stops there and the line begins to move instead. Measured live
at the same scale: the ruler pinned at 121 pixels - the middle of the 241-pixel window - while the
line slid on to 181 pixels. Your own words for the reason were that at the start a person would
otherwise see only one train head, with the rest hidden until the line was dragged.

**5. Two colours, and they ease rather than snap.** Green means nothing is outstanding: the moment
has not come yet, or you have already taken it. Light red means the moment your hand is needed has
passed and nobody has taken it - the same minute the bell rings on. There are exactly two, read off
the drawn coaches: green as rgb(231, 242, 232) and light red as rgb(251, 233, 228). The coach
carries a 0.45-second fade on its colour, so it eases from one to the other instead of jumping,
which was your worry about the screen moving under you. A tap on a coach takes it and fades it back
to green, and where a coach is wide enough to hold its face it also carries a tick.

**6. The coach is the hand-needed section, labelled.** Your points 2 and 4 are one thing seen twice,
and it was already true in the model underneath: the section a coach is drawn from IS the stretch
your hand is needed, taken from the same hands-window the day's own plan is built on, and never from
the moment a batch arrives. What this release changes is that you can now see it, because the length
of the coach is that stretch.

**7. A coach too small for its words shows no words, not smaller words.** Your answer was that if
there is no room it should simply not be shown, because the same job is already named under the
person's name. Measured live: coaches of 14.4 and 28.8 pixels showed no face at all, while one of
43.2 pixels showed its icon, its name, its clock and its batch. The line under each person's name
still names what is coming, so nothing is lost. And a hairline coach is still a 36-pixel tap target,
so even a very short job can be taken by hand.

**8. The drag is the right mouse button, or two fingers on a phone.** Your correction, taken
literally. On a computer the line is dragged by holding the right mouse button, and a left press no
longer drags at all - which is the point of it, because a left press is also the tap that says "I am
on it". On a phone the gesture is two fingers, as you asked. Measured live on the drawn board: a
left press with a hundred-pixel sideways move left the line exactly where it was, to the pixel; the
same move with the right button carried it a hundred pixels; two fingers carried it forty. A drag
also leaves behind a click, and that click is not read as a tap on the work - measured live, the
press that ended a two-finger drag took nothing, while a still press on the same coach took it.

**9. Scale, on the board's own row.** You asked for it and there it is: the control row is three
groups now, with the Scale step as the third, laid out like the planner's own so that the two
screens behave alike. It moves through the app's six scales and stops at both ends rather than
running past them. Measured live: stepping from the Standard scale to the Close one drew every coach
half again as wide and the line from 2304 pixels to 3456, and pressing on at the top of the range
left the button looking switched off and changed nothing at all.

**10. The countdown reads to the second.** Your question. The line under each person's name now
gives seconds as well as minutes - measured live as "Next 22m 7s", "Next 160m 7s" and "Next 918m
7s" - and because the same instant is also printed on the link beside each coach, both are written
by one shared piece of arithmetic, so the screen cannot state one moment two ways.

**11. Both windows are kept.** You chose to keep the train AND the planner's own people's row
underneath it, and both are on the screen. Measured live, the three windows stand in the order
train, modules, people, with all three present at the phone width and at the desk width.

**12. What is measured live, and at what widths.** Everything above was read off the drawn screen at
375 by 812 and at 1280 by 900, including the whole sweep of a walk: the ruler's own pixel, the
line's own slide, a coach's drawn width against its minutes, the three rulers standing at the same
pixel, the two colours and the fade read off the drawn element, the tap target of a hairline, and
the Scale step's ends. The desk width was reached by widening the window with no reload at all, and
the board re-measured itself within its own second - which is how it will behave on your own desk.

**13. Nothing of yours is rewritten, and one honest note about that claim.** Your stored data was
read before anything was measured, and every write the measurement made was captured and never
allowed to land - seven of them across the whole pass - so your phone's storage holds exactly the
three keys it held before and not one byte of it changed. The note: the first copy I made of your
data to compare against carried a typo that I typed, a single letter in the name of a stored list,
so the file-by-file comparison could not honestly be made from that first copy. The copy was taken
again from the screen itself and verified, and it does match your stored data byte for byte. But
this is stated plainly rather than overclaimed: the strongest form of the claim here rests on the
reading taken before the measurement began and on every write having been intercepted.

**14. Every rule that stands on it was proved load-bearing.** Seven faults were put back into the
real files, one at a time; each was watched failing a test that names it, and every file was put
back byte-identically afterwards. Among them: the moment the ruler is meant to stop at the middle,
the one scale that every line must share, the minute at which a coach is allowed to turn red, and
the left press being allowed to drag again. The suite is 1602 passing with none failing.

**15. No database step.** Not one stored field is added or changed. The train is drawn from the
day's own plan and the day's own scale, both of which the app already saves, so there is nothing to
run in Supabase.

CHANGELOG and the guide both carry all of this, both PDFs rebuilt and read back with PyMuPDF, and
the app's own More screen reads Engine v193.

**25 Sep 2026 — engine v192, THE SAVING STAYS WITH YOU, AND A CUSTOMER IS CHARGED THE ORIGINAL
PRICE (no database step). A correction to v191, in your own words and taken as the rule. When a
customer bears the courier charge, they are charged what their own doorstep costs on its own - never
a share of the one-trip fee - so the money that consolidating saves stays with you rather than
quietly becoming their discount. When you bear it, the run's real fee is your own cost and is
apportioned across the orders as before. Not one module, batch, start time, cycle or saved day of
yours was rewritten, and there is no database step.**

**1. What you asked, in your own words.** "the benefit of consolidated charges, should go to
merchant, not the customer. And if the courier charges were reveal to them, it will shown as the
original cost." Two sentences and one rule. v191 split the run's one fee evenly across the orders,
which was right for your own books and wrong for a customer's: a customer who was quoted RM 16.25 to
their own house was being asked for RM 11.00 - the saving from the shared vehicle had been handed to
them without you deciding to. The rule now: a customer who pays carries their own doorstep's
standalone price; the difference between that and the trip's real fee is yours. Nothing else about
v191 changed.

**2. Where the money lands, and which half of the screen changed.** One function decides the amounts,
and it now has three answers rather than two. If the customer bears the charge, each order carries
its OWN doorstep's standalone cost, exactly as Lalamove quoted it - and if the number of costs does
not match the number of doorsteps, the answer is no charge at all rather than a guess, because a
mismatched list means the list is about a different run. If YOU bear it, the trip's one fee is
apportioned across the orders as v191 did, and the customer is charged none of it - the amount then
lands on your books as a "Delivery & fuel" cost and never reaches a customer's total. If nobody has
answered who paid, the answer is no charge, which is the rule the charge model has carried since
v127.

**3. Where those standalone costs come from, and what they cost you.** They are real quotations
from Lalamove, one per doorstep, asked when you press Book. There is no bulk pricing call, so two
doorsteps is two requests - and Lalamove allows two requests a second, so the app spaces them and
waits for every one before anything is booked. Measured live on the wire: the requests went out 602
milliseconds apart, and the confirmation appeared 633 milliseconds after the press - so the question
genuinely waits rather than showing you numbers it does not have yet. If you have ALREADY pressed
Compare with sending them separately, those costs are reused rather than asked for and paid for a
second time; that is the same set of prices, so it is the same answer, and the screen says where they
came from.

**4. What the screen now says, measured on the drawn page rather than reasoned about.** The line
under the price list no longer talks about an even split. With the customer bearing it, it reads:
"Each customer is charged what their own doorstep costs on its own, never a share of the one-trip
fee - so the saving from going together stays with you. Those 2 costs come from Lalamove when you
book, and the confirmation shows each of them before anything is asked for." The confirmation then
does the arithmetic in front of you: "Each customer is charged what their own doorstep costs on its
own, never a share of the trip: RM 13.50 - RM 16.25 - RM 29.75 in all, which is RM 7.75 more than the
RM 22.00 the trip costs you - that difference stays with you." The RM 7.75 is the consolidation
saving, said as a number and said as whose it is. When the same run LOSES you money - which happens
when the doorsteps are close together and the trip fee is high - the sentence says so in those words
rather than polishing the arithmetic into a saving that is not there: on a run built for the purpose
whose standalone costs came to RM 12.00 against a RM 22.00 trip, it read "RM 12.00 in all ... RM
10.00 SHORT of the RM 22.00 ... loses you money".

**5. Your own half of it, unchanged in the arithmetic and clearer in the words.** With "I paid it"
chosen, the line under the prices reads: "You are bearing it, so the run's own fee is your cost and
the customer is charged none of it: RM 22.00 over 2 orders - RM 11.00 - RM 11.00." The confirmation
says the same thing as a fact about your books: "The run's fee goes on your books as one cost of
RM 22.00, over 2 orders - RM 11.00 - RM 11.00 - and the customer is charged none of it." Measured
live after confirming that run: two "Delivery & fuel" rows of RM 11.00 each, the orders carrying
RM 11.00 each and paid-by-you, and the customers' own track cards carrying no courier charge at all -
their totals read RM 45.00, which is their items and nothing else. That is the half where the even
split is correct, and it is the only half where it is.

**6. The odd cents, and why the last order carries them.** When a fee does not divide evenly, the
apportioning puts the remainder on the LAST order rather than spreading a fraction of a cent. Measured
on a fee of RM 22.00 across three orders: RM 7.33, RM 7.33 and RM 7.34, which add up to the RM 22.00
you actually paid. This matters only on your own books - it is the arithmetic that stops the three
rows summing to RM 21.99 or RM 22.02 - and it is unchanged from how the charge model has always
rounded.

**7. What is measured live, and at what widths.** Every number in sections 4 and 5 was read off the
drawn screen at 375 by 812, with the world built for the purpose and taken back out afterwards. The
Book press measures 110 by 36 pixels, the row 315 wide with no sideways scrolling, and the line under
the price list 90 pixels tall, which fits without clipping at that width. At 1280 by 900 the two
presses measure 110 by 36 and 270 by 36.

**8. Nothing of yours is rewritten.** The only press this release changes is the one that decides
what each order's charge box is to hold, and it writes the same three fields it has written since
v188 - the amount, who paid it, and whether it is collected on delivery. Measured across a whole
pass - a price asked, a run priced separately, a run booked with the customer bearing it, and the
same run booked again with you bearing it - the only fields that moved were the charge on those three
orders and the trip itself. Your saved days and your settings were not touched.

One limit stated plainly rather than glossed: the copy of the app's stored data taken before the
measurement was lost when the browser reloaded partway through, so the usual byte-for-byte comparison
could not be made this time. The bakery the measurement ran in was an empty one built for the
purpose and it is empty again, with nothing of yours in it at any point - but the comparison itself
was not performed, and that is a weaker claim than the one every other release in this history makes.

**9. One thing this release deliberately did NOT change, and you should know it.** If you book a run
with the payer question left unanswered, the orders on it lose any charge you had set on them by
hand. That is not new - it is how v191 behaved, because the charge is written as a set of three keys
and an unanswered payer is an empty answer. It is left exactly as it was rather than quietly changed
under this release's heading, and it is named here so you can decide whether you want it to behave
differently.

**10. Every rule that stands on it was proved load-bearing.** Ten faults were put back in the real
source, each watched failing a test that NAMES it and then restored byte-identically. Among them: a
wrong-length list of costs accepted as a charge; a customer given the even split instead of their own
doorstep; your own share repeated whole on every order instead of apportioned; the first customer's
cost written onto every order; the costs re-asked for even when a comparison was already on screen;
and the losing run's shortfall smoothed into a saving. One of the ten is worth singling out because
only ONE test catches it: taking the spacing between the two standalone requests away fails the
timing assertion and nothing else, so the rate limit is guarded by the only thing that can see it.
Two tests were added to the pure charge function for the answers that had no test - a list of the
wrong length, and the no-payer case. The suite is 1596 passing with none failing.

**11. No database step.** Not one stored field is added or changed. The charge lands in the fields
the order already carried, the trip in the fields v189 already writes, and an order record syncs
whole - so all of it reaches your other phone with no sync change and no migration.

CHANGELOG and the guide both carry all of this, both PDFs rebuilt and read back with PyMuPDF, and
the app's own More screen reads Engine v192.

**25 Sep 2026 — engine v191, ONE TRIP, SEVERAL DOORSTEPS, AND WHAT IT SAVES (no database step).
The fourth and last step of the courier work you asked for, and the one that saves you money. The
app now groups a day's courier orders into ONE trip, prices it against the same doorsteps sent one
at a time, and shows you the difference as two numbers rather than as a claim. Booking it spends one
vehicle on one journey and gives every customer on it the same share link. What your shop promises
those customers becomes a WINDOW that you type, and only when you type one. Not one module, batch,
start time, cycle or saved day of yours was rewritten, and there is no database step.**

**1. What you asked, in your own words.** "i want to do Lalamove, API to manage courier, make it
ready for other courier as well. Focus now for laalamove. And check our backoffice readiness. From my
understanding lalamove support last day deliver consolidation to save on cost." v188 was the price,
v189 was the booking, v190 was the customer watching the trip. This is the fourth and last, and it
is the one your own hunch was about. Your consolidation belief was confirmed in v188: one trip
carries two to sixteen drop-offs, charged as one base fare plus a fee for every stop after the first,
which outside the Klang Valley is RM 1 on a motorcycle, RM 2 on a car, RM 5 on a van or four-by-four
and RM 10 on a lorry. This release is that mechanism with a screen around it.

**2. One trip, and the arithmetic you can read rather than take on trust.** The run screen prices the
whole run twice. Once as the one multi-stop trip it is about to become, and once as the same
doorsteps sent one at a time, and then it writes the difference out as a sentence. Measured live on a
two-customer run on a car: "One trip RM 22.00 - one at a time RM 44.00 - this one trip saves RM 22.00
against sending them one at a time. Each of those was asked now, for the same collection time, so
they are this journey split up rather than a guess at it." That last sentence matters more than it
looks: the comparison prices are REAL quotations asked at the same moment for the same collection
time, not an estimate the app did on its own. The saving is therefore a number you can act on rather
than a claim off a leaflet. It also costs you waiting time rather than money - there is no bulk
pricing call, so a run of eight drops is still eight price requests - and the screen says so rather
than making the second pass look free.

**3. Your four decisions, and where each one landed.** You were asked four things before any of this
was built, because a single trip cannot let each customer choose their own hour, and the answers are
built rather than described. **The window** - "A window I type when I book the run" - so the run
screen has two boxes, opening and closing, that you fill in yourself, and nothing is promised to any
customer until you do. **The fee** - "Split evenly into each order's box" - so the trip's one fee is
divided across the customers on it and each order's own charge box carries its share, which is what
lets the existing charge model, the books and the customer's own total keep running exactly as they
run. **What fits** - "Show me the load and let me judge" - so the screen counts the doorsteps, counts
the items and names them, and leaves the judgement to you rather than refusing the run on your
behalf. **The trip link** - "The same trip link for everyone" - because there is one vehicle on one
journey, so every customer on it gets the one share link and there is nothing to keep apart.

**4. A customer's own doorstep, and the rule that makes consolidation honest.** One customer who
ordered three things is ONE doorstep, not three. The screen counts stops per customer, and so does
the price it asks for: measured live, a two-line order for one customer was priced as one drop, and
a two-customer run was priced as two. Without that rule a customer ordering twice would have been
charged as two deliveries to the same house, which is exactly the overcharge consolidation exists to
remove. The row for each customer says what is being sent and where it is going, and a customer whose
doorstep has never been pinned carries a press to put it on the map instead of a price it could not
honestly be given.

**5. What your shop promises now, and only when you have said it.** A delivery window you type
reaches the customer through the slots that were already there rather than through anything new: it
is folded into the delivery line on their track card, and into the shipped WhatsApp message and the
reminder. Measured live: the card read "Sat, 26 Sep - Courier - 1 Jalan A, 2-5 pm", and both
messages read "Delivery: Sat, 26 Sep, 2-5 pm - Courier delivery" with "Track your delivery:" above
the share link. Leave the two boxes empty and every customer keeps the promise they already had -
the day, and no hour - so a run booked in a hurry is not a run that promises something nobody chose.
And the window is checked before it is priced: a window whose end is before its start is refused in
words on the spot rather than being priced and then written onto customers' cards, which it would
otherwise have been, because the formatter that draws a window renders an end-before-start one
perfectly happily. That is a fault this release's own test sweep found and the test now holds.

**6. Nothing is booked until you press the press that books it.** The run screen prices freely and
books once, and the two are separate presses with a question between them. Measured live: the
question read "Book the Car with Lalamove for RM 22.00? It carries ONE trip with 2 doorsteps and 6
items. Customers will be told 2-5 pm... (RM 11.00 - RM 11.00), marked paid by you." - so the number
being spent, the vehicle being spent on, the load it has to carry, the promise about to be made and
what each customer is about to be charged are all on the screen before anything is sent. Behind it
there is exactly ONE booking call for the whole run, and the toast afterwards read "Run booked with
Lalamove - 2 customers now share one trip and one link."

**7. The money, and why a share and not a fee.** One trip is one fee, so charging each customer the
whole fee would take the cost of one van several times over. The trip's fee is divided across the
customers on the run and the remainder lands on the last order rather than being lost, so the shares
add up to the fee exactly. Measured live on a RM 13.50 motorcycle price for two customers, the split
line read "Split evenly over the 2 orders ticked above, in that order: RM 6.75 - RM 6.75" - and on
the booked car run the two orders were stamped RM 11.00 each against the RM 22.00 fee, with two RM
11.00 "Delivery & fuel" expenses on your books, one per order, paid by you. An odd cent is not
invented and not dropped: on three customers the same RM 22.00 fee lands RM 7.33, RM 7.33 and RM
7.34, and there is a test that fails if the parts ever stop adding up to the whole. Answering the
charge questions is optional and stays optional: a run booked with nothing said about the money
records no charge at all rather than a charge of nothing, which is the difference between a customer
who owes you nothing and a customer whose box says they owe you zero.

**8. Three places where the honest answer is not the convenient one.** A price describes one list of
customers on one journey, so anything that moves either throws it away rather than leaving a stale
number standing beside a new question: untick a customer after pricing and every Book press on the
screen goes inert with the sentence "The list of customers has changed since this price was asked, so
it describes a run you are no longer taking. Price the run again for the list above." Change the
collection day and the prices go entirely. And a live trip on any order in the run stops the whole
run being booked, with one sentence saying which order is already out - the same one-trip-at-a-time
guard the single order card carries, at the level of the run.

**9. Two faults found by reading the drawn screen rather than by reasoning.** The first: a customer's
tick row was drawn as a whole pressable line, but the live area was only the words inside it - the
top and bottom nine pixels of a 49-pixel line landed on the row rather than the tick and ticked
nobody, which is the exact opposite of what that row's own comment promises. Measured with probes
before and after, and fixed by moving the padding from the row onto the label so the whole line is
the tick's. The second: ticking ONE customer left the head line reading "Who is on the run - 2 of 2"
over a list with one customer on it, while the tick-everyone press corrected it. Two controls that
look alike behaving differently, and the count she reads is the one that went stale. The cause was
that the single row's handler repainted the load, the prices and the charge boxes but not the list
the head lives in, and only the bulk press rebuilt it. Fixed so a single tick corrects the count and
the bulk press WITHOUT rebuilding the rows - measured, the row she pressed is still the same node
afterwards and the list does not move under her finger. Both are named rather than glossed because
no assertion had ever watched either one.

**10. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day. Your
stored data was copied before the presses that write, put back afterwards and compared
byte-identically, with no backup key left behind. The one thing this release adds to an order is the
window you typed and the trip and share of the fee you booked - the same fields the single-order
booking already writes - and an order with no run on it is drawn exactly as it was.

**11. Every rule that stands on it was proved load-bearing.** Thirteen faults were put back in the
real source, each watched failing a test that NAMES it, and each restored byte-identically. Among
them: pricing one drop per order LINE rather than per customer, charging each customer the whole fee
instead of a share, writing the window onto only the first line of a customer's group, stamping the
trip on only the first line, a stale price still booking, an end-before-start window slipping past
its refusal, the odd cent dropped so the shares no longer add up, a zero fee recorded as a charge,
and the stale head from section 9. Two of the thirteen are worth singling out because the sweep is
what found the holes rather than what confirmed them: the publishing gate that decides whether a
window reaches a customer was asking "can this be read" rather than "is this a window at all", so an
end-before-start window published happily - the test now compares the customer's card against the
card of an order with no window, which is the only comparison that catches it. And the zero fee was
initially written as a literal zero rather than left absent, and nothing failed, because no test had
ever booked a run with the money questions left unanswered. A test was written for it and the fault
fails by name. The suite is 1587 passing with none failing.

**12. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. A run's window is folded into the delivery line the customer's card already carried, the
trip and the share of the fee land in fields the single-order booking already writes, and an order
record syncs whole - so all of it reaches your other phone with no sync change and no migration.

**13. Still to come, and only if you want it.** The public callback is the one piece left unbuilt
from the courier work. It would let a customer's page update by itself within seconds of a parcel
being picked up, without anybody pressing anything. It is also the one part of this work that would
be reachable by anybody on the internet rather than only by your own signed-in app, so it stays your
decision and nothing about it is promised here.

CHANGELOG and the guide both carry all of this, both PDFs rebuilt and read back with PyMuPDF, and
the app's own More screen reads Engine v191.

**25 Sep 2026 — engine v190, THE DELIVERY'S PROGRESS AND ITS DRIVER REACH THE CUSTOMER, AND AN
ORDER MOVES ITSELF (one database step). The third step of the courier work you asked for. A booked
trip's own progress now shows on the customer's track card in the customer's own language, with the
driver's name, the number plate and a press to ring them. And when the courier says the parcel is on
the vehicle, the order moves itself to Collected / Shipped — a note appears on the row naming who
moved it and when, and one press puts it back. Your order row is the first thing in this app that has
ever changed itself, so it is built to be SEEN and UNDONE rather than to be trusted. There is one
database step, and it must be run BEFORE this build is deployed or every customer's tracking page
stops updating silently. Not one module, batch, start time, cycle or saved day of yours was
rewritten.**

**1. What you asked, in your own words.** "i want to do Lalamove, API to manage courier, make it
ready for other courier as well. Focus now for laalamove. And check our backoffice readiness. From my
understanding lalamove support last day deliver consolidation to save on cost." v188 was the price,
v189 was the booking, and this is the third of the four stages you chose. The seam and your
consolidation belief are unchanged, and the fourth stage - the delivery run that saves you money -
is still to come.

**2. What the customer sees, and it is three lines rather than a tracking number.** A customer who
opens their track page on a courier order now reads where the parcel has got to ("Delivery: The
driver is on the way"), who is bringing it ("Driver: Ah Meng · PMM 1234"), and a press that rings
them ("Call the driver"). Each line draws only when there is something to put on it: an order with no
trip on it is drawn exactly as it was before any of this existed, and a trip booked a moment ago
carries no driver yet because the courier has not matched one - so the card has two lines and not a
line reading "Driver: -". That is deliberate. A card that named an empty driver would be telling your
customer to wait for somebody who does not exist yet.

**3. The customer's page is never taught a courier's vocabulary.** This is the seam, said as a rule a
customer can be caught by. What the backoffice publishes about a trip is one of a handful of NEUTRAL
words - finding, on_the_way, collected, delivered, stopped, nodriver - and the customer's own words
for those live in the shop's own language file, in all three languages. The courier's status string
(ASSIGNING_DRIVER, PICKED_UP) never leaves the backoffice. A phase the shop's page has not been
taught draws NOTHING rather than the raw word, so a second courier arriving with a status list nobody
has heard of cannot make your customers' page read wrongly. Six new words were added to all three
languages, and a test holds every one of them and refuses a label that has lost its placeholder - the
broken-label class this shop has been caught by before.

**4. The driver is a SECOND call, and for most of the day it refuses - which is not an error.** The
trip record itself carries only a driver id, and the driver's own record - the name, the plate, the
number - sits behind its own endpoint. That endpoint answers nothing until about an hour before the
pickup, so a check you make in the morning comes back with the trip and no driver at all. That
refusal says nothing about the trip, which is perfectly healthy, so it is folded in as an absence and
never reaches your screen as a fault. Failing a working check over a name that is not available yet
would be breaking a feature over a detail you had not asked for. The same rule runs in the other
direction: a check that learns nothing this time keeps the driver it already had, because treating an
empty answer as an erasure would take the driver's name and number off the customer's card at the
exact moment they became useful. The card in the backoffice says all of this under the booking
button, in words.

**5. The order moves itself, and the row says so where you will actually see it.** When a check
reads the trip as collected, the order moves to Collected / Shipped and a note appears on the row in
your own list: "Lalamove says it collected at 10:35 am - this row moved itself. Put it back if that
is not right." Written on the row rather than said in a message, because a message is gone in
seconds and this is a change to an order's own money that you may not look at until the evening. The
note names WHO moved it and WHEN, so the row can never read as something you did and cannot
remember doing. The message at the moment it happens carries both facts in one line - what the
courier said and what this app did about it - because two messages would let you read the first and
miss the second, and the second is the one that changed an order.

**6. A check made at the end of the day still moves it.** A parcel cannot have arrived without being
collected first, so a trip that already reads delivered moves the order exactly as a trip reading
collected does. Without that, an order whose collection you were never told about would sit on Baked
for ever and the app would look like it had missed the trip entirely - and the check you actually
make is often the evening one, after the run.

**7. The Undo, and the two things it deliberately does not do.** The row gains an Undo beside its
other presses. It puts the stage back and it puts the money flag back, and it is careful about both.
An order that had no payment flag at all goes back to having none, rather than to a "false" this
Undo invented - because a flag that was never there and a flag saying she has not been paid are two
different things on this app's own rules. And the stock rule is deliberately NOT run on the way back.
That is not an oversight: the stock rule reads a row's current stage, which at that moment is the last
one, so it cannot tell "put this back" from "step this out of Baked" - and stepping OUT of Baked puts
ingredients back on your shelf. Charging one order's ingredients twice because an API spoke is
exactly the kind of thing this release must not do. The move itself changed no stock (only stepping
into or out of Baked does), so there is nothing to undo. This was measured, not reasoned: the whole
shelf count was read before and after.

**8. An Undo has to survive you looking again.** The guard that stops the rule moving a row twice is
the stamp it writes when it moves it - NOT the trip's phase. That difference is the whole thing. If
the guard were the phase, then looking at the trip again would move the row straight back, and an
Undo that a look undoes has not undone anything. So after an Undo the row is once again a row the
rule has not moved, and the trip being collected does not move it a second time. Measured live: after
an Undo, a fresh check left the row exactly where she had put it back.

**9. A row you have already marked Collected / Shipped is left alone.** There is nothing to move, so
nothing moves. A trip booked on an order you had already marked as gone needs no help from anybody,
and the row stays yours.

**10. The callback you chose to leave until after this release, and what that costs.** The plan for
this stage included a public callback - a small function the courier could call the moment a parcel
is picked up, so the customer's card would update by itself within seconds. You chose to leave that
until after this release, and the reason is on the record: Lalamove's webhook specification could not
be read from here, and a public endpoint built against a guessed shape is exactly how a security hole
gets shipped - it is the one part of this work that is reachable by anybody on the internet rather
than only by your own signed-in app. So the honest description of where things stand is this: the
customer's page is as fresh as the last time a phone asked the courier, and pressing Check is what
asks. Her own order row catches up the same way. Nothing is lost, and nothing is claimed that is not
true - the callback needs no database change and can be added whenever you want it.

**11. One database step, and the order it must be run in.** supabase/courier_job.sql adds five
columns to the order_tracking table: the courier's name, the neutral phase, the driver's name, the
plate and the number. It is safe to re-run and each column is added only if missing. RUN IT BEFORE
THIS BUILD IS DEPLOYED. The backoffice publishes the whole tracking row in one call and PostgREST
rejects the entire call if it names a column that is not there - and the publish is deliberately
silent about its own failures, so it would not look like a failure: every customer's tracking page
would simply stop updating, for every order, with nothing on any screen saying why. This is the same
trap the courier charge migration documented, and the SQL file carries the warning in its first
paragraph.

**12. The shop's own page had to learn five new columns, and forgetting one fails silently.** The
customer's card asks PostgREST for a named list of columns, and it returns ONLY what is named there.
A column the backoffice publishes and this list forgets is a line the card can never draw - and it
fails with no error anywhere: the row arrives complete, the card is simply missing a section, and
nothing says why. So the five names were added to the request, and a test now reads the request the
page actually sends rather than trusting that it was edited.

**13. A fault found by measuring the drawn card, which no test in this repository could have seen.**
The two things on the customer's card that matter most at the door - ringing the driver and opening
the courier's own tracking page - were built from padding alone and came out 30 pixels tall, while
every other thing a customer taps on that page (the delivery day, the collect / courier pair, Track,
Place order) is 37 to 48. The two smallest targets on the page were the two the customer most needs
at the door. Found by measuring the drawn card at 375 pixels, not by reading the rule. They now take
the page's own floor and centre their word in it, re-measured at 38 pixels. And the reason no
assertion caught it is worth the sentence: every stand-in screen in this repository answers a box
with the number it was handed, so a link 30 pixels tall and a link 48 pixels tall measure exactly the
same. The guard therefore reads the stylesheet's own declared numbers instead, and it holds both
halves at once - the floor and the box that makes the floor mean anything.

**14. Every rule that stands on this was proved load-bearing.** Sixteen faults were put back in all,
each watched failing a test that NAMES it and then restored byte-identically. Among them: a check
that moves an order every time it looks; an Undo that restores an invented "false" where there was no
flag at all; a stage change that forgets to tell the customer's own card; an order already marked
paid being un-paid by a move past it; a late check that skips the collection it was never told
about; a courier's raw status word published to the customer; a plate labelled as a driver; a number
that cannot be dialled turned into a button anyway; a driver read as a bare string; and the
customer's card dropping one of the five columns from its request. Two of the sixteen are worth
naming because a test could not have caught them before a person read the screen: the dispatcher's
own import list, where a name called but not imported is a 500 that only appears when that action is
used, and the two links on the customer's card being 30 pixels tall, which is section 13. One guard
turned out to be unreachable by pressing anything at all - the transition rule in the courier panel
and a second guard inside the order rule both answer a repeated check, so the inner one can never be
reached from the screen. Rather than leave a guard nothing can prove, the rule was exported and a
test written for the one state that isolates it: the state where YOU have moved the stage back by
hand after the rule moved it, which is a state you really can reach. The suite is 1545 passing with
none failing.

**15. Where the secret lives, and where it does not.** Unchanged and worth restating, because this
release adds a second call that spends nothing but reaches the courier's own records: the signing of
every request happens on Supabase, in a function only your own signed-in app can call. The key and
the secret are Supabase secrets you set yourself; they never enter this repository, this app's
screen, or any message. The driver's number is the one thing this release publishes on purpose, and
it does so because you asked for it and because the person at the door is a stranger your customer
has to meet - but it is published only for a trip that has one, and only as a number that can
actually be dialled.

**16. Nothing of yours is rewritten.** Measured on the running app, on a phone-sized screen, with the
whole state read out of storage before the pass and read out again afterwards and compared field by
field. The pass was the full one: a trip checked, the order moving itself, the Undo pressed, and then
a SECOND check made afterwards. The result, in full. After the Undo, the order's stage and its payment
flag were byte-for-byte what they had been - the Undo really does put the row back and not merely draw
it back. The only fields that changed at all, across the entire pass, were the trip's own: what the
courier last said, when it said it, and the driver it named. Nothing else in the whole stored state
moved - not one ingredient, not one order's items, not one setting. The three saved days still read 24,
4 and 24 pans, exactly as they did before. And the phone's storage holds exactly the same three keys it
held before the pass, with no backup key and no scratch key left behind.

**17. What is still to come.** The delivery run - one trip carrying several drop-offs at once, which
is the stage that saves you the money your own hunch was about. It is v191, and it opens with a
question to you rather than with code.

**25 Sep 2026 — engine v189, BOOKING THE TRIP (no database step). The second step of the courier
work you asked for: the price you chose becomes a real van. One press books the trip with Lalamove, the
share link it sends back goes into the tracking box your orders already have, and one press checks where
the driver has got to or calls the trip off. Two real defects were found by reading the drawn screen
rather than the code — the job card had been printing the courier's own word ASSIGNING_DRIVER instead of
"Finding a driver", and the price panel was printing the word "null" under its last row — and both are
fixed, guarded and proved. The customer-facing half had no test at all and has three now. Not one module,
batch, start time, cycle or saved day of yours was rewritten, and there is no database step.**

**1. What you asked, in your own words.** "i want to do Lalamove, API to manage courier, make it ready
for other courier as well. Focus now for laalamove. And check our backoffice readiness. From my
understanding lalamove support last day deliver consolidation to save on cost." Three separate things.
v188 built the quote, which was the first. This is the second: booking. The seam and your consolidation
belief were both answered in v188 and nothing about them changed here.

**2. What a booking does, and what it deliberately does not.** The trip comes back with its own share
link, and that link is written into the tracking box this app has carried since v97 — the box that is
already printed on the customer's card and in the shipped WhatsApp message. That reuse is why a booking
needs no database step at all: an order row syncs whole, so a trip booked on one phone reaches your other
phone with no migration and no new column. A share link IS the courier's reference for this delivery, so
putting it where a tracking number used to go is honest rather than a shortcut. One copy touch goes with
it: when that box holds a web address the message says "Track your delivery" instead of "Tracking
number", because it is a page the customer opens rather than digits they read out.

**3. The driver's name and number plate cannot be shown at booking — and the plan promised one.** This
is the one place this release does not deliver what was planned, and it is said here rather than glided
over. Lalamove has no tracking number and no driver at the moment a trip is booked; the driver is
assigned afterwards and Lalamove does not release the name and plate until about an hour before pickup.
So booking shows the price, the vehicle and the share link, and the driver arrives later, if you want
that screen. There is nothing to fix; the promise was simply wrong when it was written.

**4. The two defects, both found by reading the drawn screen rather than the code.** The first: the job
card printed "ASSIGNING_DRIVER" where the app has a translation table with a test on it. The table was
correct and tested; what was missing was the wire from the card to it, because the card asks the courier
"what is this status in words" and the courier object did not answer that question. The fallback printed
the courier's own enum instead of complaining, which is what a quiet fallback does. It reads "Finding a
driver" now, and the whole interface has a guard so a second courier cannot ship without the answer. The
second: the price panel printed the word "null" under its last price row, because two optional lines were
handed to a browser function that turns a null into the word. It was invisible to every test the app had,
because the ordinary stand-in screen quietly drops nulls — only the strict one keeps them, and it now
draws this panel too.

**5. Your three decisions, carried forward and unchanged.** "Locate it, let me fix it" for addresses, so
a courier is handed a point and never words on a card. "All four stages", so this is the second of four
and the remaining two follow as v190 and v191. "Build now, keys later" — the app still carries no key and
no secret, and says so in plain words rather than failing in a way that looks like a bug.

**6. Measured live on the drawn screen, at 375 by 812 and at 1280 by 900.** The job card reads
"Lalamove is on this order", then "Car · RM 14.00", then "Booked 1:51 am", then the two presses, then
"Status: Finding a driver — read just now", then the customer's own link. Pressing Check the trip against
a reply of PICKED_UP put up "Trip status: Collected" and the card then read "Status: Collected — read just
now". Pressing Cancel trip opened the app's own confirmation, which names the consequence and the money:
"Call off this Lalamove trip? The driver stops being sent, and the customer's tracking box keeps the link
but nothing will update it. This cannot be undone from here — you would have to book again, at a fresh
price." Confirming it put up "Trip called off" and the card then read "Status: Called off from here
9:28 am". The presses measure 115 by 36, 99 by 36 and 110 by 36, this app's own tap-target floor, and the
confirmation's two presses 87 by 46 and 100 by 46.

**7. Where the honest answer is not the convenient one.** Calling a trip off sends the courier a request
that answers with nothing at all — so the card does NOT claim the courier said "Cancelled". It records
that YOU called it off, with the moment, in the app's own words: "Called off from here". The same reason
runs the other way on a finished trip: the heading changes from "Lalamove is on this order" to "A Lalamove
trip on this order", the Cancel press is withdrawn rather than offered and then refused, and the Book
presses come back to life so you can rebook a trip you cancelled. And a checked status is merged into the
trip's record rather than replacing it, so looking at a trip never forgets the price it was booked at.

**8. The money guard, measured.** A trip that is still running blocks a second one. Measured live with a
live trip on the order: all three Book presses drawn disabled, and the panel's own sentence under them —
"This order is already on a trip." That is the guard that stops you paying for a second van to the same
door.

**9. The customer-facing half had no test, and that gap was found by writing the faults rather than by
reading the code.** v189 puts a trip's share link into the tracking box, which makes the "is this a link
or a number" branch customer-facing on every courier order. The number half was covered; the link half,
which is exactly what a booking newly produces, was not — on either side. Three tests were written: the
storefront now proves a link is drawn tappable and a `javascript:` value is not; and the shipped message
now proves it routes the value through the one label-maker rather than labelling a URL a tracking number.

**10. Nothing of yours is rewritten.** No module, batch, start time, cycle or saved day. Nothing was
written to Supabase, and no real network call left the browser for the whole measurement: the courier was
answered by a stand-in. The pane's own stored data was compared field by field afterwards and put back —
the only fields the measurement had changed were the trip's own state and the app's two customer
edit-stamps, and the fake trip, the fake share link and the fake session token are all removed. The pane
holds exactly the three storage keys it held before, with no backup key left behind.

**11. Every rule that stands on it was proved load-bearing.** Twenty-four faults were put back in all,
each watched failing a test that NAMES it and then restored byte-identically. Among them: the request
envelope the API needs; a reply not being unwrapped; the stop ceiling checked AFTER the doors; a doorstep
matched by position instead of by where it is; a finished trip still counting as live; a phone number
losing its plus; a trip number dropped into a URL unescaped; the vehicle and time being re-sent on a
booking, which would be a second and quieter way to choose a vehicle; a GET carrying an empty body; and
a cancel sending one. Four of them are named rather than counted, because a test could not have caught
them and one was found only by a fault: the printed "null" and the printed enum, both read off the drawn
panel; the storefront's link branch; and the missing "done" flag on a job written before that flag
existed, which every test passed until a fault exposed it. The suite is 1519 passing with none failing.

**12. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. A booked trip is kept on the order row, which syncs whole.

**25 Sep 2026 — engine v188, A DELIVERY PRICE BEFORE YOU PROMISE ONE (no database step). The first
step of the courier work you asked for: on an order you are delivering, one press asks Lalamove what the
trip would cost on every vehicle it runs, shows the prices side by side with the distance and the
quotation's own five-minute life counting down, and the one you choose fills the charge box that was
already there. Nothing is booked, nothing customer-facing changes, and not one module, batch, start time,
cycle or saved day of yours was rewritten. There is no database step.**

**1. What you asked, in your own words.** "i want to do Lalamove, API to manage courier, make it ready
for other courier as well. Focus now for laalamove. And check our backoffice readiness. From my
understanding lalamove support last day deliver consolidation to save on cost." Those are three separate
things, and this release is the first of them. The other two are answered below and built on top of this.

**2. Your consolidation belief is correct, and here is the mechanism.** Lalamove does not consolidate by
holding parcels back for a later trip; it consolidates by letting ONE trip carry several drop-offs, two
to sixteen of them, priced as one base fare plus a fee for each extra stop. Outside the Klang Valley,
which is Penang, that fee is RM 1 on a motorcycle, RM 2 on a car, RM 5 on a four-by-four or van and
RM 10 on a lorry, so eight cakes to eight houses on one motorcycle is one base fare plus RM 7 against
eight base fares. Three things go with it and all three are said rather than hidden. The vehicle has to
physically hold the load, so one motorcycle is not eight focaccia and the run screen will say so. There
is no bulk pricing call, so a run of eight drops is still eight price requests, which costs you waiting
time and not money. And route optimisation is described two different ways in Lalamove's own documents,
so the stop order is yours to arrange and the screen will never claim it found you an optimum. Building
that screen is the last stage of this work and the only one that changes what your shop promises, so you
will be asked before it is built.

**3. The seam, which is what "ready for other courier as well" had to mean - and a hole in it that the
audit found.** A claim in a comment is not readiness, so readiness here is a file that holds the one
interface every courier must answer, a file that is the only place any courier's own name and rules
live, and one channel that both use and that never throws at you. Behind it all is a **fake courier
written for the tests, which quotes without the name Lalamove anywhere near it** - and that fake is the
proof that a second courier is a new file and a line in the registry rather than a rewrite.

And the audit you asked for, walked against the built thing rather than against the code meant to
satisfy it, found the claim was not yet true. It found the same defect twice, once on each side of the
seam. On the app's side, two screens and the one shared file named the courier in their own words: the
Settings card printed "Courier (Lalamove)" and sent the literal word to the server itself, and the
shared channel defaulted the courier to Lalamove when nobody said otherwise. A default is that file
quietly choosing a courier, which is the one thing the seam exists to prevent - the day a second
courier arrives, a default left behind would send its calls to the first one and nothing on screen
would say so. On the server's side, the dispatcher wrote the courier's name into a refusal you would
read: "Lalamove did not name any vehicles for this market". That is the identical fault, and it is the
one that matters more, because a refusal is exactly the sentence a second courier would have to have
found and edited by hand. Both are fixed with no visible change: the card asks the registry for the
name, the channel refuses to name one, and the refusal now comes from the provider's own label. The
words on your screen are character for character what they were. And the rule has a test it never had,
which is the real lesson here and the same one v187 taught. It now covers both halves: inside the app
the word is allowed in two files only, the provider and the registry that imports it, and the walk
refuses any third file that names it; on the server the walk does the same, and the dispatcher gets a
tighter rule of its own because its environment variables ARE named after the courier and it therefore
had to be on the allowed list - it may name the courier only in those variables and in the provider's
own file path, and in nothing that could be shown to you.

**4. Your three decisions, and where each one landed.** You chose "Locate it, let me fix it" for
addresses, so a courier is never handed words on a card: it is handed a point. The address already on
the order is looked up once, the answer is kept against that customer so a second order from the same
number costs no lookup at all, and where the lookup misses a map opens and you tap the exact door. The
bakery's own door is pinned once, from the same place you asked for it. You chose "All four stages", so
this is the first of four and the other three follow as v189, v190 and v191. You chose "Build now, keys
later", and that is exactly where this stands - see paragraph 9.

**5. What the screen does, on your own order, measured live at two widths.** The price panel opens
inside the card that already holds the charge box, folded away until you ask for it, and that is
deliberate: this app has one pop-up layer, so a second card would destroy the charge box, the note you
were part-way through and the Save button, and the fee would land in a box nothing could save. Measured
at 375 by 812 with the test courier answering, the panel drew three price rows - Motorcycle RM 8.50
counting its own life down, Car RM 14.00, Van RM 0.00 - then the line that says which vehicle could not
be priced and why, then "3 prices from Lalamove, just now, for collection 2026-09-30 at 10:00. Each one
dies on its own clock." The four presses at the foot of the rows measure 99 by 36 pixels, which is this
app's own tap-target floor, and the line naming the two ends of the trip reads "From Jienluv2bake,
George Town to 12 Jalan Bunga, George Town". At 1280 by 900 the same card drew all three rows, the
failure line and the live status line with nothing clipped.

**6. Taking a price is one press, and it goes through the money path that already worked.** Pressing
Use this fee on the RM 14.00 car put 14 in the charge box and said so, and the panel folded itself away
so the number it had just written is what you are looking at with the payer question under it. Setting
the payer to "The customer paid it" then read back "The customer owes RM 58.00 - items total RM 44.00 +
courier charge RM 14.00". Nothing new was invented for the money: the fee lands through the same model
that has carried the courier charge since it was built, so the amount, who paid it and COD all keep
running the way they already ran.

**7. Three places where the honest answer is not the convenient one.** First, a quotation DIES -
Lalamove's last five minutes - so every price carries its own clock, a dead price greys itself out and
says "ask again" rather than sitting there looking live. Second, a courier can reply with a total of
zero, and a zero is not a charge: measured live on the RM 0.00 van, the press left the charge box
exactly as it was and said "Lalamove priced this trip at RM 0.00 - that is not a charge, so nothing was
put in the box. Ask again, or type the amount," and the panel stayed open with all three rows still
there. A toast claiming a number had landed in a box the box had refused is the screen lying to you,
and this is the one place in the app where a lie about money is easiest to ship by accident. Third, a
price that arrives after you have closed the card is not written into it: measured live with a
deliberately slow reply, closing the card the moment after asking left the pop-up closed, no charge box
and your stored data unchanged, character for character the same length before and after.

**8. Where the secret lives, and where it does not.** The signing of every request happens on Supabase,
in a function only your own signed-in app can call, and the key and secret are Supabase secrets that you
set yourself and that never enter this repository, this app's screen or this conversation. The browser
half is built to the same shape as the mail function that already works: it never throws, and every
refusal arrives as a sentence you can act on rather than a code. Two you will meet: a missing pin reads
as a pin to be placed rather than a failure, and an address Lalamove cannot find reads as an address to
put on the map. Until you open the partner account and set those secrets the app carries the courier and
no keys, and it says so in plain words instead of failing in a way that looks like a bug.

**9. What is measured and what is not, said plainly.** The panel, the two ends of the trip, the five
minute clock, the money, the refusal and the closed-card case were all measured live, in a real browser,
on the drawn screen, at 375 by 812 and at 1280 by 900 - against a stand-in courier that returns
Lalamove's own documented replies. What is NOT measured is Lalamove itself, because there is no account
yet: the signing and the reading of its real replies are tested against its published sample answers in
the suite, and three details are flagged at the head of the provider file where the first real call will
show them - whether a stop's point is sent under one field name or another, the exact language tag this
market expects, and whether the distance comes back with a unit or as a bare number. Each is one line in
one file, and each will be settled in the first minute of the sandbox, not guessed at now.

**10. Nothing of yours is rewritten, and every rule that stands on this was proved load-bearing.**
Measured live: your stored data was backed up before the single press that writes anything, put back
afterwards and compared, and your phone's own storage holds exactly the two keys it held before, with no
backup key left behind. Eleven faults were put back in all, each watched failing a test that names it
and then restored byte-identically - among them the zero being accepted as a charge, the closed card
being written into anyway, the panel's clock failing to clear itself when the card it belonged to was
gone, and all four seam leaks named in paragraph 3. Two of the eleven are worth naming because a test
could not have caught them, and both are said rather than glossed. The clock one: the panel stops its
own clock when a fee is accepted and folds away, so only the case where the fee is REFUSED and the
panel stays open exercises the rule at all, and the test that catches it is the one written for the
refused zero. And the server's own hand-written refusal: when that fault was put back, the first
version of the new rule did NOT catch it, because the rule read only ordinary quoted text and the
sentence was written as a template literal - so a real leak sat in a blind spot of the very guard
written to catch it. The rule was widened to read those too, and the fault then fails by name. The
suite is 1460 passing with none failing. **No database step** - a price is transient and an accepted
one lands in fields that already exist, so there is nothing to run in Supabase.

**24 Sep 2026 — engine v187, EVERY PERSON'S WINDOW IS THE HEIGHT OF ITS OWN PEOPLE (no database
step). One fault, found by measuring the drawn board against your own eleven points and then fixed: the
workers' windows on the Production page carried a ceiling, so on a phone only the first person stood on
screen and the other three sat inside a box that scrolled. Not one module, batch, start time, cycle or
saved day of yours was rewritten, and there is no database step.**

**1. What you asked.** You told me the Production page deferred from your instruction, and then: "fix it".
So this release is your eleven points read back against the board that was actually drawn, not against the
board that was intended, and it carries the one place they did not agree.

**2. The fault, in one sentence.** Your point 8 says "The person's window be taller" — the __window__, not
the row. v186 made the row taller and left the window's own ceiling exactly where it was.

**3. Why a ceiling was there at all, and why it was wrong here.** The window a person's rows sit in had a
ceiling of min(20vh, 190px) — 190 pixels on your phone. That number was written for the Scenario planner's
own people window, where the rows are 35 pixels tall and five of them is 190. The Production page's rows
are 72 pixels, because a taller row is what you asked for. Four of them need 406. The ceiling did not know
the rows had grown.

**4. What that looked like on your phone, measured.** At 375 by 812 the window was 162 pixels tall while
holding 406 pixels of people: one person on screen, and persons 2, 3 and 4 behind a scrollbar that was not
visible and that you had no reason to look for. Read off the drawn board: 0 of 4 rows fully visible. Your
point 2, "Create windows for each person", was answered with one window and three hidden behind it.

**5. The fix.** One line of the stylesheet. The board's own person window is now as tall as its people and
carries no ceiling of its own; the ceiling stays exactly where it was written, on the planner's window,
which still has the five 35-pixel rows it was written for. Nothing else about either window changed, and
nothing inside either of them was restyled.

**6. Measured after, at the same two widths.** At 375 by 812: the window 407 pixels tall, its inside 406
and its content 406 — equal, so nothing scrolls — all 4 of 4 rows fully visible, the coaches still 37
pixels wide with four filling the line, four red rulers still standing at 107 and the one clock face still
at 215 reading 11:27 pm. At 1280 by 900: the window 401 pixels, no scroll, 4 of 4 visible, the coaches 155
and the line 738. The modules' window above and the planner's borrowed window below are the heights they
were.

**7. Nothing of yours is rewritten.** The whole of this release is one stylesheet line and one test, and
neither of them writes anything: a ceiling is a drawing rule, and no module, batch, start time, cycle or
saved day is read by it, let alone changed. Measured live on a four-person day built for the purpose, the
app's own stored data was put back from a copy taken beforehand and compared byte for byte the same, with
no backup key left behind.

**8. And the rule has a test now, which it never did.** This is the part worth reading, because the reason
the fault shipped is not the fault itself. No test could ever have caught a window that was too short. The
stand-in screen the tests draw on answers every box with the same measurement — nothing high and nothing
of content — so a window with three persons hidden inside it looks exactly like one that fits. A stand-in
that says every box is zero high cannot see a box that is too short, and a guard that measured that screen
would have passed just as happily with the bug in place. So the guard reads the stylesheet's own declared
numbers instead, and it holds both halves of the rule at once: the board's window declares no ceiling, and
the planner's still declares its own. Two faults were put back and each was watched failing that test by
name — the ceiling returned to the board's window, and the ceiling taken away from the planner's — so the
test cannot be passed by deleting the cap everywhere and leaving the screen these windows were borrowed
from unbounded. Each was restored byte-identically. The suite is 1343 passing with none failing.

**9. No database step.** Not one stored field is added or changed, so there is nothing to run in Supabase.
A ceiling lives in the stylesheet and in the test, and your plan, your days and your own settings are
exactly as they were.

**24 Sep 2026 — engine v186, THE MORNING CAN BE WALKED FROM THE WORKERS' OWN WINDOW (no database
step). Eleven things you asked for on the Production page, built as one: the lines drag left and
right and everything on them moves together, Start the day now / Stop / the bell / Back to now sit
where the workers read them, and the walk's own pace is a drop-down of Slow, Mid and Fast. Not one
module, batch, start time, cycle or saved day of yours was rewritten, and there is no database step.**

**1. What you asked, in your own words.** "let me tell your what i want for production page. 1. Keep
the Next Up. 2. Create windows for each person, the detail able to be drag left or right. 3. Put the
person windows parallel, close to each other, the 2nd person and subsequent person have the centered
red ruler, but the 2nd and other don have to show the clock face. 4. Replicated for person 2, 3,
etc. 5. I need walk the day, Button 'START THE DAY NOW', 'STOP' , 'The N Called', these button are
for the person's windows. 6. The scenario dual window dont join to the person's window. 7. Name of
the scenario should be on Top of page. 8. The person's window be taller, so that coach size better
fit wordings. 9. Each of the person line has a clock line at centre of line, when we drag to the
right, the train move to right and the clock and red ruler move relatively. 10. When i click outside
the person window, the clock back to center. 11. For simulation, i want some button to do this, left
buttton make the clock back to current, Right button, when clicked, dropdown a choice list, slow,
Mid, fast. This button is to make the chart move faster for simulation purpose."

**2. The Next Up stays.** Your point 1, and nothing about it moved. The card that says what is next
is still there, still first, still telling you the job and its clock.

**3. The scenario's name, on top of the page.** Your point 7: the heading card now carries the name
of the day you are looking at, so a page of numbers cannot be mistaken for another day's.

**4. A taller person's line, so the words fit.** Your point 8. Each of the workers' lines is now
__72 pixels__ tall, against the 56 it was and the planner's own 35 — measured at both 375 pixels wide
and 1280, and every coach measures 52 of those 72. Nothing on a coach face is clipped at either
width: the face reads its whole derived word — at 375 pixels the words on your own day read __mixer,
fold, Wash, Load, Unload, Dimple, oven, Cool__ — and not one word is cut off.

**5. The two windows stay your borrowed pair, and they do not join the lines.** Your point 6. The
modules window and the planner's people window are drawn below the lines by the very code that draws
them in Scenario planning, and they are **not** tied to the train: the trains do not scroll sideways
at all, so no drag on a worker's line can move the two windows above it. What v185 put back — the two
borrowed windows panning together on both screens — is still true and still theirs; it is the train
that stands apart, and that is your point 6 said as a rule.

**6. A red ruler on every line, but only one clock face.** Your points 3 and 4. Every person's line
carries its own red ruler standing at the middle of that line — at 375 pixels wide the ruler sits at
107 and at 1280 the line's own centre is 694 — and the face is drawn **once**, on the first line,
reading the clock at the line's own centre in the pane. The second person and every person after
carry the ruler and no face, exactly as you asked. Measured at 375 pixels: the face stands at 215 in
the pane and each row's ruler at 107 in its own track, and the two differ by exactly the 108-pixel
name column between them — so they are one line, drawn in two coordinate systems.

**7. The drag, and everything on the line moves together.** Your point 9, in your own words: "when we
drag to the right, the train move to right and the clock and red ruler move relatively." A sideways
drag on a person's line moves the strip, that line's red ruler and the clock face by the same number
of pixels — measured live at 375 pixels wide, an 80-pixel drag took the strip from -437 to -357, the
ruler from 107 to 187 and the face from 215 to 295, __all three by exactly 80__. Nothing about it is
saved, so it dies with the screen.

**8. Letting go of the line, or pressing off it, puts the clock back at the centre.** Your point 10,
and your point 11's left button. A press anywhere off the line re-centres it, and the __Back to now__
press above the lines does the same thing on purpose — both put the ruler, the face and the trains
back where the day puts them. It is never saved, so it cannot move a module, a batch or a start time.

**9. Walking the day, without touching the day.** Your point 5, in your own words: "I need walk the
day, Button 'START THE DAY NOW', 'STOP' , 'The N Called', these button are for the person's windows."
So the presses sit above the lines, inside the workers' own window:

- **Start the day now** begins the walk at today's own clock time and takes the screen to the day's
  first minute.
- **Stop** ends the walk and puts the lines straight back on the real clock.
- **The bell** tells you how many jobs would be called and throws the calling on and off.
- **Back to now** re-centres the line whether or not a walk is running.

Measured live on a 375-pixel screen with the walk started: the line went to the day's first minute
and the row read __Now: mixer__, the link's count was 30m, and __12 coaches stood red__, falling
away as the clock ate into them. Nothing about the walk is written down anywhere, so a day you saved
is exactly the day you saved no matter how long the walk runs.

**10. The walk's own pace, and it is only the walk's.** Your point 11, in your own words: "Right
button, when clicked, dropdown a choice list, slow, Mid, fast. This button is to make the chart move
faster for simulation purpose." The drop-down carries __Slow 1x, Mid 10x and Fast 60x__. Measured
live at Fast: three seconds of walking took the clock face from 10:58 pm to 11:01 pm and brought a
link's countdown down from 30m to 27m with it. Choosing a speed changes nothing in your plan — it is
the walk's speed and it lives nowhere but the walk. **Stop** then put the face and the line straight
back to 10:58 pm, turned the press off and brought Start back, saying "Stopped — the line is back on
the real clock."

**11. The countdown comes down by itself.** Nothing has to be tapped for a worker to watch their
next job get nearer: measured on the board, one minute of the clock brought a row's own count from
__Next 20m to Next 19m__ with nobody touching the screen. And that minute rebuilt nothing — the app's
own rule stands, because a repaint throws away a worker's scroll, so a beat writes the numbers on the
line and never rebuilds the line around them.

**12. One more thing was mended underneath.** A tap on a coach had to be proved to reach your other
phone and the store, not just the screen. Reading the tests showed that the tick's write — and the
Clear press's write — were being read off the screen's own copy of the day rather than off the saved
day, so a tap that moved the picture and skipped its save would have looked exactly like a working
one. Both are read off the saved day now, and both fail by name if the write ever goes missing again.
This is the app's own standing rule: a stand-in must be as unforgiving as the real thing, because a
forgiving one hides a bug instead of catching it.

**13. Where a tick lives, and why there.** A tick is written in a key of its own beside your plan,
never inside it — so **clearing the board can never touch a saved day, and deleting a day can never
wipe the board.** __Clear the board__ asks first, in the app's own words, before it takes a single
green coach back.

**14. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day.
Measured live, across a whole pass of this page — the board drawn, the day started and stopped, the
speed changed three times, the line dragged and put back, a coach ticked and then the board cleared —
the one and only thing that changed in the app's stored data was that new key of the tick's own,
sitting beside the plan: an empty board written as a spoken empty so your other phone cannot read a
clear as ignorance, and the plan itself untouched. The app's own version reads __Engine v186__.

**15. Every rule that stands on it was proved load-bearing.** Eleven faults were put back in all,
each watched failing a test that names it, and each restored byte-identically. One of them escaped on
the first pass and is named rather than glossed: with the beat no longer repainting a row's next-job
line, nothing failed — because no test had ever watched a countdown come down on a beat alone, with
nobody touching the screen, which is the half a worker at a bench actually reads. A test was written
for it, and the fault then fails by name, reading that a minute of the clock moved a row's own
countdown from 20 minutes to "Next 20m". The suite is __1343 passing__ with none failing.

**16. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. The tick is written under a settings key the app already guards, the walk's speed is a
number in the walk and nowhere else, and nothing new is written anywhere.

**24 Sep 2026 — engine v185, THE COACH KEEPS ITS WORD, AND THE BOARD'S PAGE IS PUT IN YOUR ORDER (no
database step). Two things: every coach on the Production line's train now carries a word at every
width, and the board's page reads top to bottom the way you asked — the person's train first, then
the two windows borrowed from the Scenario planner, kept original. Nothing of yours is rewritten,
and there is no database step.**

**1. What you asked, in your own words.** On the coach face: "Phone coach" reads as "Two lines:
icon + name, then time", and on the broken label, "Yes, fix it." Then, on the page itself:
"let me emphasise, the production page start with the person's windows the tarin inside, after the N
person, we have the 2windows that we bring in from scenario planning, we keep it original." Asked
what should sit below the train rows, you chose both planner windows — the module window AND the
people window exactly as Scenario planning draws them.

**2. The coach keeps its word.** v184's refinement — "if the coach box is too smalll to house the
full words, then just show meaningful, hoover mouse on show tooltip, with more details" — had been
built as __drop the name and keep the icon__, and reading the drawn board on a phone showed what
that cost: at 375 pixels every coach was nameless. So a narrow coach now gives up its type size and
its side padding instead — 10 pixels to 9, and 3 to 2 — and never the word. The stylesheet rule that
hid the name outright is gone, and a test now refuses to let it come back.

**3. And the word keeps its punctuation off.** The word on a coach is derived from the module's own
name, and it was keeping whatever punctuation sat against it: "Wash, oil and fill" was showing as
__Wash,__ with the comma welded on. It reads __Wash__ now. That one was found by reading the drawn
board rather than by reasoning — the same way the last one was found — and it is exactly the kind of
broken label your refinement refuses.

**4. The board's page, in your order.** The Production page now reads top to bottom: the person's
train rows first, then the modules window and the people window, drawn by the same code that draws
them in Scenario planning. They are borrowed, not re-drawn — a second renderer of one day is the
thing this app refuses — so the bars, the rows and the counts in both windows are the planner's own.

**5. What that order costs, said plainly rather than hidden.** Two things follow, and neither is
dressed up. The people now appear twice on that one page: once as train rows at the top, and once
inside the planner's own people window below. And because that borrowed people window sits on the
planner's minute axis, it pans together with the modules window again on both screens, while only
the train stays fixed — v184 had taken the pan off it because the train had replaced it, and you
have put it back. The train itself still never scrolls sideways, which is what keeps its centre the
centre.

**6. A seam, so the train is not mistaken for the map.** A hairline rule now runs above the modules
window on the board, so a worker can see where the coaches end and the day's own map begins. It is a
seam on the wrapper only — nothing inside either borrowed window is restyled, which is what "keep it
original" means.

**7. One more thing had to be mended underneath.** The app remembers where you had scrolled in each
window and puts it back after it redraws — your standing rule that a redraw must not move what you
are looking at. It was finding the FIRST window of each kind; with one page now holding two
people-shaped windows, the second one was being left behind. It keeps every one of them now, each by
its own numbers.

**8. Measured, on the drawn board at 375 x 812, signed out of the cloud.** The three windows are in
your order on the page — the train 57 pixels tall at the top, the modules window 493 under it, the
planner's people window 35 at the foot — with 31 coaches 37 pixels wide, all four to the visible
line, the clock standing at the line's own centre, and every coach face reading a whole word:
__mixer, fold, Wash, Load, Unload, Dimple, oven, Cool__. Not one clipped word and not one nameless
coach anywhere on the board.

**9. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day. Your
three saved days still read 24, 4 and 24 pans, and there is nothing to run in Supabase — not one
stored field is added or changed.

**10. Every rule that stands on it was proved load-bearing.** The coach's word, the punctuation it
keeps off, and the seam above the modules window were each put back as a fault, each watched failing
a test that names it, and each restored byte-identically. Two of the three were caught by name; the
seam was caught by the page-order test, which now refuses a board whose train and day's map run
together. The suite is 1341 passing with none failing.

**24 Sep 2026 — engine v184, THE TRAIN ON THE PRODUCTION LINE, AND TWO CLOSER STOPS ON THE DIAL (no
database step). The board's workers' window is no longer a strip of time — it is a train of work.
One coach is one job, joined in the order they happen, with the clock standing at the centre of the
line, a countdown on every link between two coaches, and one tap on a coach turning it green. Your
own words for it: "For the production, the effectiveness need to be improve, for each of person line,
make his series of work join up like a train, coaches represent work, the current time at the center
sharing with all person, showing next work in minutes on top, something like next station coundown
for subway. Person should click on their work to turn it green indicating acknowledgement." Nothing
of yours is rewritten, and there is no database step.**

**1. What you asked, in your own words.** Six points, and then one refinement while it was being
built: (1) "i want to have 2 step more closer scale"; (2) the Production line should join each
person's work up "like a train, coaches represent work, the current time at the center sharing with
all person, showing next work in minutes on top, something like next station coundown for subway",
and "Person should click on their work to turn it green indicating acknowledgement"; (3) "The coach
can pass the current timeline, but stay red, click it turn green"; (4) "Each title of the line show
their name, make each line distinctively seperated"; (5) its purpose — "to tell person, what they
have done, and what is coming dynamiccally, on the work that have not done, every person can see it,
and can land. helping hand if their process can tolerate an interuption"; and (6) "Ask me question
if not sure" — which is what settled the six design answers below. The refinement:
"if the coach box is too smalll to house the full words, then just show meaningful, hoover mouse on
show tooltip, with more details."

**2. Two closer stops on the dial.** The Scenario planner's Scale control went from four stops to
six. The two that were there stay where they were and only one name changed: the old Closest is now
called Closer, and the new top stop is Detail. Three lists have to be the same length or the ruler
loses its step and the chart breaks, so a test now says so out loud rather than trusting it.

**3. The answers you gave, which the build follows.** Asked five rounds of questions, you chose:
the clock is "Pinned to the centre"; one coach is "One job they do"; "Anyone, on any line" may tick;
clearing is "A Clear the board button only"; green means "I'm on it (seen)"; a coach goes red "When
the job is due"; coaches are "All the same width" with numbers "Only on the links"; ticks "Travels to
your other phone"; the two windows are kept with the person's line taller; and the architecture is
"The train is its own strip". And on the clock itself: "lock the clock relative to the train, when
drag, clock line move, when click outside, the clock centred on the line, make the coach not too big,
in a full shown line should be able to visualize 4 coach, we can also show the coming time countdown
on the coach link."

**4. What the person's line is now.** A taller 56-pixel row per person, separated from the next by a
rule and a rail in that person's own colour — your point 4, "make each line distinctively seperated".
The name cell carries who it is and what is next ("Next 26m", "Now: rests"). Alongside it, one coach
for every job that person has, all the same width, in the order the jobs happen. Each coach carries
its icon, a word that means it, and the clock time. That word is DERIVED and never cut: "Into the
proofer" shows as "proofer", "Dimple and top" as "Dimple", "The oven swap and the bake" as "oven" —
because a face showing the word "The" would be showing a word and saying nothing. The full module
name, the two clocks, the length, the batch and the state in words are all on the coach's tooltip,
which is your refinement read at the only moment it applies.

**5. The clock, the countdown, and the colours.** The clock is one line at the centre of the line,
shared by every person, and its label is the clock time — never the word "now", so it can never be
mistaken for the planner's own now-line. Every wait between two jobs carries its countdown in
minutes on the link, "like next station countdown for subway", and it counts down live. A coach turns
red the moment its job is due and STAYS red after the clock has gone past it — your point 3 exactly.
One tap turns it green and names the job back to you; the same tap takes it off again. A green coach
travels to your other phone, and a Clear the board press appears beside the calling switch, asks
first, and clears every coach at once.

**6. Dragging reads the day without moving it.** A sideways drag on the workers' window moves the
clock line only and leaves every train exactly where it was, because a drag is somebody asking "how
long have I got" and not a change to the day. The label then reads the minute the line is standing
on and the line is drawn in the reading colour. Letting go, or pressing anywhere off a row, puts it
back at the centre. It is never saved, so it dies with the screen.

**7. One wording fault found by measuring, and fixed.** Live at 4:30 am on your own day, Person 3's
one job had run 4:00 to 4:12, so their row read "All done" — beside a coach that was standing RED and
untaken. That is the board telling a worker they have finished something nobody has touched, and
talking them out of the very tap your point 3 asks for. A row with work still untaken now counts it
instead ("1 not taken"), and gives the count up the moment the last coach goes green.

**8. One real bug, found only by measuring in the browser.** The widths of a train's coaches were
being assigned to the strip in a way that looks right and writes nothing at all, so every coach fell
through to the stylesheet's own fallback size. Measured at 375 pixels wide: 34-pixel coaches with SIX
of them filling the visible line, where the plan promises four. It is fixed, and the test that
watches it was made stricter FIRST so the fault was caught by a named failing assertion before the
fix landed — the same lesson as every earlier version where a forgiving stand-in let a real fault
through.

**9. Measured on your own day, at 375 x 812 and at 1280 x 900, signed out of the cloud.** At 375:
the line the coaches stand on is 213 pixels, and a coach is 37, a link 18, a side stub 4 — four
coaches and three links and two stubs come to 210, so exactly four coaches fill the line, which is
the figure you gave. The clock stands at 215 pixels, the centre of the line. At 1280 x 900: a
723-pixel line, 151-pixel coaches, 30-pixel links, and again exactly four to the line, with the clock
at the centre at 470. Wei's row read "Now: rests" with her five coaches at 4:00, 4:13, 4:30, 5:01 and
5:32, the first three red and the one at 4:30 ringed as the job running now; the links counted 31m
and 62m, and five minutes later the same links read 26m and 57m with the clock label moving to
4:35 am. One tap on Person 4's coach turned it from red to green, said "Oil the pans and weigh the
dough out at 4:00 am — marked as taken.", wrote the tick, and turned that row's line from
"1 not taken" to "All done". A drag from the centre to 150 pixels read 4:13 am in the reading colour
with every train's position unchanged to the pixel; letting go put the clock back at 215 and the
label back to 4:30 am. The Clear press asked first, wrote the empty map rather than deleting it,
turned every coach back to red, and made itself quiet again.

**10. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day. After
all of the above — the taps, the clear, the drag, the clock moving, the window resized — your stored
data was put back from a copy taken beforehand and compared: byte for byte the same 13,888
characters, your three saved days still reading 24, 4 and 24 pans, and only the app's own two keys
left in the phone's storage.

**11. Every rule that stands on it was proved load-bearing, not assumed.** Sixteen faults were put
back in all, each watched failing a test that names it, then restored byte-identically. Among them:
with a coach sized as a plain quarter of the line instead of out of the budget it fails reading that
four coaches no longer fill the visible line; with a wait between two jobs given no width it fails
the round trip that reads every minute of a row back off its own strip; with the due test given an
upper bound it fails reading that a coach which has passed the clock is no longer red; with the tap
no longer deleting the key it fails reading that the last tick off left something behind; with the
centre fixed instead of measured it fails the placement of every row; with the pan guard removed it
fails the test that says the board's window cannot pan while the planner's still can; and — the two
worth naming, because they escaped the first sweep — with the tap's save or the clear's save skipped,
nothing failed at all until the tests read the STORE and not just the object the app holds in memory.
A tick that moved on screen and never reached the phone's saved file looks perfect until the phone is
opened again, and no test could see it. Both now fail by name. The suite is 1339 passing with none
failing.

**12. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. The ticks live in the settings row your phones already sync, beside the calling switch, and
that row learned one thing in this version: an emptied board is now SPOKEN rather than passed over in
silence, so the other phone takes your clear instead of reading it as ignorance and putting every
tick back.

CHANGELOG and the guide both carry all of this, both PDFs rebuilt and read back with PyMuPDF, and the
app's own More screen reads Engine v184.

**24 Sep 2026 — engine v183, REASSIGNMENT HAPPENS BY ITSELF, AND THE PERSON'S CARD SAYS SO (no
database step). One sentence on one card, and nothing else in the app changed. You went looking for
a reassign button on a person's card and there was not one, so the card now says why there is nothing
to press: the day hands out its own work, so changing that person's hours or their ticks changes
their job list on the spot, and a job that no longer fits them is given to somebody else. Your own
words that settled it: "if you know that reassignment is automatic, then forget about my request for
reassignment button, just need to mention work reassignment is automatic with worker card detail
change." Nothing of yours is rewritten, and there is no database step.**

**1. What you asked, in your own words.** "where is the reassign button?" — and then, having
answered it yourself: "you can put the reassign work button inside person's card", and then the
correction that ended it: "if you know that reassignment is automatic, then forget about my request
for reassignment button, just need to mention work reassignment is automatic with worker card detail
change".

**2. Why there was nothing to find.** Reassignment has been automatic since v177, and it is automatic
on that very card. The day gives out every job nobody has been named for, and the only two things it
reads about a person are the two facts you type on their card: the hours they are here, and the
modules they are ticked for. Change either and the day re-picks hands immediately — which is why the
card never needed a button, and why a button there would have been a second way to say the same
thing.

**3. What the card says now.** One sentence, in place of a control: the day gives out this work by
itself, so changing the hours above or the ticks changes these lines on the spot, and a job that no
longer fits is handed to somebody else. And what you placed by hand stays yours — a person you put on
a module yourself, or a stretch you moved off somebody's row, is not moved by this card. That last
half matters as much as the first: the card only ever moves the work the day was already choosing
between.

**4. The rule itself, written down the way you stated it.** "in a module finding his person, module
will look at person's with the least skill and fit its module. if fit then assign him first." So a
module asks the person who FITS it — trained for that module, and inside the hours they are here —
and between two people who both fit it asks the one trained for the fewest modules first, with the
person who can work anything at all asked last of all, exactly as you confirmed it. Ties go to the
lower person number. It is a preference and never a refusal: a job nobody trained is free for still
goes to somebody, and the row says why.

**5. Measured, on your own day, at 375 x 812, signed out of the cloud.** Your card for Wei opened
reading "11 min of work, in 3 places, and nothing collides", "Here all day", and her five jobs: 4:00
am Dimple and top, 4:13 am The oven swap and the bake, and the three stretch and folds at 4:30, 5:01
and 5:32. The new sentence was on that card, and the card carried no press about the work at all —
the only button on it was its own close. Then one tick, "Mixing the dough in the tub", and four of
Wei's five jobs left her on the spot: her list fell from five lines to one, and Person 3's rose from
one to five. The day still stood at the same four people, so nothing invented a hand and nothing was
lost — the work was handed on, which is the whole claim. Taking the tick off put all five lines back
exactly as they were.

**6. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day, and no
word of your plan. Measured live: after working the card, ticking a module and taking the tick off,
your stored data was put back from a copy taken beforehand and compared — byte for byte the same
13,888 characters, with your three saved days still reading 24, 4 and 24 pans, and only the app's own
two keys left in the phone's storage. One trace is named rather than glossed, because the same shape
was named in v180: taking the last tick off leaves twelve characters — an empty skills entry — where
there was nothing before, exactly as your stored data already carries for merges. It reads as no
training at all, it changes nothing about the day, and a tick you never press never writes it.

**7. The sentence was proved true, not just printed.** A card that said reassignment was automatic
and did not do it would be worse than saying nothing, so the test reads the job list off the card
itself after one tick. Three faults were put back and each was watched failing a test that names it:
with the sentence deleted, the test fails reading that the card says nothing about the reassign
button; with the training made unable to keep a job off anybody, it fails at the day's own end,
reading that the day went on giving the free job to somebody trained for something else; and with the
card no longer re-reading itself on a tick, it fails at the card's end, reading that the card went on
drawing the day it was built from. The claim can break at either end and the two are told apart on
purpose. The suite is 1313 passing with none failing.

**8. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. The card's sentence reads the same two facts v177 already stores in the scenario, and
nothing new is written anywhere.

**24 Sep 2026 — engine v182, THE SHADE IS ONLY WHAT YOU SET, ONE PRESS MOVES ONE BATCH, AND THE
PRODUCTION-LINE NUMBERS ARE PROTECTED (no database step). Three things in one version, all of them
inside the Scenario planner except the last. First: the shaded band the app used to work out for you
is gone for good. Her rule, in her own words: "Wei should not have any shade because there is no
work time set for him, shade should just follow what i set, not other consideration." So the only
shade a person's row ever carries is the two hours you typed on their card, and a person whose hours
nobody has typed carries none — no band, no "Working ..." line, nothing. Second: "delta t on one
batch of the module dont change the module batches, it should not be." It did — one press on the
first batch of a module moved every batch of it — and it does not now. One press moves the batch
under your finger and nothing else, and Back onto the line takes off that one batch's hold and
leaves any other batch's hold standing. Third, carried over from what v181 measured and left
unprotected: the numbers on More -> Production line are now guarded exactly like your saved days, so
a newly set-up phone can no longer push its own defaults over the numbers you typed.**

**1. What you reported, in your own words.** "build v182. And the working time shade is wrong", and
then, while this was being built: "delta t on one batch of the module dont change the module
batches, it should not be." Both were measured before anything was changed, and both were real.

**2. The shade, and why it goes rather than gets quieter.** v179 drew a band on each person's row
worked out from their own day — their first job to their last, the gaps between included — and v180
made that band stand down on a row where you had typed hours. Both were answers to a question you
had already answered yourself, and v180 left the app holding two opinions about one working day. The
measurement that settled it was on your own day: the computed band was drawn 93 minutes wide, 4:00
am to 5:33 am, on a row whose five jobs come to eleven minutes, beside a card that already read "11
min of work". It was measuring the stretch and calling it the work. So it is deleted — from the day,
from the row, from the card, and from the drawing itself — and what is left is the one thing you
actually said: the hours you type. Typed hours draw a band; no typed hours draw nothing. The card
still says "Here all day" for a person with no hours set, because that is the real answer for every
person on every day you have ever built, and a blank where a fact should be reads as a fault.

**3. The delta t, and the batch it belongs to.** A press on a batch is a hold — the batch runs later
than the line puts it, and it comes with the module above it when that module moves. Since v154 the
first batch of a module had been read as the module's own offset, so holding it moved every batch of
that module with it: on a module running four batches you pressed one bar and four moved. Batch
three, pressed the same way, moved only itself — which is the answer you asked for, so every batch
now behaves like batch three. Moving a whole module is still one press away and it is the honest
one: the module's own start time on the module card, from which every other batch is spaced by the
module's own pace. The words changed with the rule, so nothing on the screen claims a move the app
no longer makes: the toast now reads "Batch 3 held back 5 minutes from where the line puts it", the
tip on a held bar "held back 5 min", and the way back "Batch 1 back at 4:00 am — exactly where the
line puts it."

**4. The Production-line numbers, which v181 measured and left open.** v181 closed the same family
of fault for your saved days — silence must never delete — and named this one as not fixed: the
numbers on More -> Production line have no "empty" of their own, so a brand-new phone could still
push its defaults over what the cloud had. It is fixed here, and it needed no new stored field. The
signature of a phone with no opinion about the line is a plan that still reads exactly the stock
numbers; that signature is now asked of both sides, so a phone that has never touched the line takes
the cloud's numbers on its first pull and carries them in its first push, a phone whose numbers are
your own keeps them against a stock cloud and queues one publish to put them back, and a plan you
deliberately set to the stock numbers is the one case that cannot be told apart from silence — by
design, and said plainly rather than hidden.

**5. Measured on your own phone, at 375 x 812, signed out of the cloud.** Your own day first: four
person rows, not one computed band anywhere in the app, not one typed band, and the word "Working"
appearing nowhere on any screen; Wei's card read "17 min of work, in 3 places", "Here all day", and
nothing else about her hours. Then hours typed onto Wei's card, 5:00 am and 9:00 am: stored as 60
and 300 minutes from your 4:00 am start, and drawn as one band 96 pixels along the row and 384 wide
at your own 1.6 pixels a minute — 60 minutes and 240 minutes — with the computed band still absent
and the card reading "Wei is set to be here 5:00 am → 9:00 am, but Dimple and top runs to 4:06 am -
a job that cannot fit inside those hours." Then the delta, measured by giving the oven four batches
for the length of the test: its four bars sat at 0, 139, 278 and 418 pixels. Pressing + 5 min on
batch 1 moved that bar 0 to 8 pixels — five minutes at 1.6 — its card read 4:00 am -> 4:15 am
becoming 4:05 am -> 4:20 am, its tag read B1 delta t=+5, and batches 2, 3 and 4 did not move a
pixel, at 139, 278 and 418 exactly as they were. Pressing + 5 min on batch 3 moved batch 3 alone,
278 to 286. Pressing Back onto the line on batch 1 put it back to 4:00 am with a plain B1 tag and
said "Batch 1 back at 4:00 am — exactly where the line puts it", and batch 3's hold was still
standing.

**6. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day. The
copy of your stored data taken before the first press was put back afterwards and compared: byte for
byte the same 13,888 characters, with the four batches used for the measurement gone and the oven
back to the one batch you had it at, and with the two hours typed onto Wei's card taken back off
again. Your three saved days are exactly the ones you had — 24, 4 and 24 pans. The only keys left
in the phone's storage are the app's own two, and nothing here blocks a sale or reads an order.

**7. Every rule that stands on it was proved load-bearing, not assumed.** Eleven faults were put
back in all, each watched failing by a test that names it, then restored byte-identically. Among
them: with the computed band put back into the day's own model it fails reading that a person's row
carries nothing but the hours she typed; with it put back into the row's drawing it fails that same
test from the other end; with the rule put back into the styling it fails the third time; and with
it put back onto the worker's board it fails reading that the board shows the hours she typed and
nothing the app worked out for her. With the first batch's press carrying the rest of the module
again, three named tests fail — including the one on the last module's own bar. Of the production
guard: dropping the key from the guarded list fails four tests; making every plan count as somebody's
opinion fails five; dropping the cloud-side guard fails two; and reading a plan that has no field at
all as an opinion fails the test that says a cloud with no plan and a phone that has one is put
back. One fault escaped on the first pass and is worth naming: restoring the old "Back onto the line"
spread was NOT caught, because every test pressed the way back on a batch that happened to be the
only one held — the tests had pinned the press and left the undo unpinned. A test was written that
holds two batches of one module and takes one back, and the fault now fails by name. The suite is
1312 passing with none failing.

**8. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. The production guard reads a signature off the numbers your phone already syncs, and the
batch hold has always lived in the delta your plan already carries.

**24 Sep 2026 — engine v181, A NEW PHONE NO LONGER EMPTIES THE OTHER ONE (no database step). You
reported that signing in on a new phone showed none of your saved scenarios. It was real, and it
was the app rather than the phone. The cause is one word: silence. When the new phone pulled from
the cloud it had nothing to say about your saved days, and the app read that silence as a decision
to delete them — so the next thing it wrote back to the cloud left them out, and the cloud lost
them. Three rules now stand on one sentence: silence means this phone has no opinion, and silence
must never delete. A newly set-up phone now receives your saved days and the day you built, and its
first push carries them back up instead of dropping them; and a phone that still holds something
the cloud has lost puts it back by itself, with no press from you. A deletion you actually made is
spoken out loud, so it is honoured and never refilled.**

**1. What you reported, in your own words.** "i try log in with the new phone, the save scenario is
not loaded? why". The "why" is answered below. This version is the answer to it happening again.

**2. Why it happened.** Everything you have set up in this app — your saved scenarios, the day you
built, your to-do list, your wish list, the developer line — travels to your other phone in one
single row called "settings". There is only ever one of those rows, on every phone, from the first
day you install the app. A phone that has just signed in therefore already has a settings row of its
own to publish, even though it has never seen the cloud copy, and the app decided which side to keep
by the clock: whichever phone noticed last won. A new phone wins that comparison simply by being
newer, and when it won, it wrote its own empty settings up to the cloud. The saved days were not
emptied on purpose and were not refused — they were simply not there to write. A push replaces the
whole row, so a key the payload leaves out is a key the cloud loses. That is the fault: silencing a
thing is not the same as deleting it, and the app could not tell the two apart.

**3. The three rules, and they are one sentence between them.** Silence means this phone has no
opinion, and silence must never delete. First: if you empty a shelf on one phone, that deletion is
now spoken out loud — the app says "the saved days are now an empty list" instead of saying nothing
at all, so the other phone cannot mistake your decision for ignorance. Second: when a phone's own
settings win, every one of those five keys it has no opinion about is taken from the cloud instead
of being left out — taken into what it is about to publish, so its push cannot delete them, and
taken into its own app, so a phone that has never had your days receives them on that same pull.
Third: if the cloud has lost one of those keys and this phone still holds it, this phone queues one
publish to put it back — no press from you, and never for a key you emptied on purpose.

**4. What a newly set-up phone does now. Measured.** Against a stand-in cloud holding your own saved
days, the new phone receives all three of them and the day you had built, and the settings it then
sends up still carries those same days — so the push that used to empty the shelf now leaves it
whole. Measured again from the other end: with the cloud's settings row missing your saved days and
your own phone still holding them, one pull from that phone queues exactly one publish carrying
them, and a second pull queues nothing, because there is nothing left missing. And a shelf you
really did empty is not put back — the empty answer is spoken, read as an answer, and left alone.

**5. What this version protects, and what it does not yet. Read this part.** This version protects
your saved scenarios, the day you have built, your to-do list, your wish list and the developer
line. It does not protect the numbers on More -> Production line. Those are a different kind of
value, with no "empty" of their own — a brand-new phone's numbers can still replace what the cloud
has, and that was measured, not guessed: the cloud's production plan was pushed over as a
brand-new phone's defaults. It is the same family of fault one key over, it is not fixed here, and
it is not dressed up as fixed. Until it is, check More -> Production line on both phones and set the
numbers on the phone you trust; and if a number has already been replaced, the daily cloud backups
are the way back, not a re-typing.

**6. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day was
changed by this version, and nothing here blocks a sale or reads an order. Measured live on your own
phone: after unlocking the app, signing out of the cloud and opening the Scenario planner, your
stored data was put back from a copy taken beforehand and compared — byte for byte the same 13,888
characters. Your three saved days read 24, 4 and 24 pans. That last figure is worth one line,
because two earlier notes in this history said "24, 12 and 24": 12 is what the third day is set to
aim at, 4 is what that day as built actually makes, and 4 is what the app has always computed and
still computes. The number in those two notes was the mistake, not the app, and the earlier entries
are left standing rather than quietly tidied.

**7. Every rule that stands on it was proved load-bearing, not assumed.** Eleven faults were put
back in all, and each was watched failing by a test that names it, then restored byte-identically.
Taking the shelf the phone is silent about out of what it publishes, so the push deletes it again,
fails reading that a phone that never had her saved days receives them. Taking the same value out of
her own app instead, so the phone stays empty, fails the same test from the other end. Letting the
phone overwrite its own days with the cloud's, and refusing the cloud's empty answer when she has
deleted a shelf on purpose, each fail the test that says a phone with its own days keeps them and a
shelf she emptied stays emptied. Dropping the repair of a short cloud row fails reading that a phone
that still has her days puts them back. Making that repair fire on every pull fails reading that a
cloud row with nothing missing queues no publish. Dropping the built day from the guarded keys fails
reading that a phone that never built a day receives the one she built. Removing the spoken deletion
fails reading that emptying her shelf is said out loud, and making every phone speak — including one
that never held the key — fails reading that a missing field is not announced as an empty shelf. Two
of the eleven were faults in the first draft of the fix and were found by this sweep rather than by
reasoning: one change was unfalsifiable as written, because the cloud's value was copied into her
own app before the comparison the fault was supposed to break, and one guard turned out to be
protecting a real case — a hand-edited or corrupted file — which had no test until the sweep asked
for one. The suite is 1309 passing with none failing.

**8. No database step.** Not one stored field is added or changed on the server, so there is nothing
to run in Supabase. The three rules are read by the sync code your app already runs, and they act on
the same five keys that already travel between your phones.

**23 Sep 2026 — engine v180, THE HOURS YOU TYPED TAKE THE SHADE OFF, AND THE LAST BAR OF THE
DAY CAN BE HELD (no database step). On a person whose working hours you have filled in on
their card, the shaded band the app worked out for you is no longer drawn. Your two clock
boxes are the answer for that person, and a window you typed with a second, computed window
drawn inside it was two answers to one question — which is what you saw and reported. Nothing
else about the shade changes: on every person whose hours you have NOT filled in, it is drawn
exactly as it was, and on every person it is still named in words — on their row, in the tip
and on their card. The bar at the very end of your last module now carries the same readings
and the same pair of presses as every other bar, so it can be held like any other; the card it
opens is still the day's own card, with the whole day read off it underneath.**

**1. What you reported, in your own words.** "dont shade if the person have indicated work
time", and then, so there was no doubt which screen you meant, "and those person with work
time specify, the shade is wrongly indicated". Both true, and neither was your phone.

**2. What was wrong.** The shade added in v179 is the stretch of the day a person's own jobs
actually occupy, worked out from the day. It was drawn on every person, including the ones you
had already filled the two hour boxes in for. So on those rows two bands lay on top of each
other: the hours you typed, and a second, computed band sitting inside it. Measured on a row
with 5:00 am to 9:00 am typed in, at 1.6 pixels a minute: the typed band ran 96 pixels along
the row and 384 wide, and the computed one was drawn on top of it, starting later and ending
earlier wherever the work did not fill the hours. Two different lengths for one person's
working day, and no way to tell which one the row meant.

**3. What it does now, on your rule.** The moment you have said the hours for somebody, that
person is not shaded at all. Your typed hours are the only band on their row, and they are read
as the answer. Where you have NOT filled the boxes in — which is every person on every day you
have ever built, including all of today's — nothing changes at all: the shade is drawn from
their own first job to their own last exactly as it was in v179, because there is no typed
answer for it to argue with. The rule is one line, held in the model rather than on the screen,
so the row, the worker's board and the person's card cannot come to different conclusions.

**4. And the words stay, deliberately.** Taking the drawing away must not take the fact away.
The working stretch is still named in words everywhere it was: on the person's row ("Working
4:00 am → 5:33 am"), in the tip, and on their card, where it sits beside the hours you typed so
you can still read the two against each other. That is the half of this release you may not
have asked for, and it is deliberate: you said do not SHADE it, not do not SAY it. If you would
rather the words went too on a person whose hours you have typed, that is a one-line change —
say the word.

**5. And the other thing you reported, which I had explained away.** "the last module batch pop
up, still dont mark his delta?" — the very last bar of your day. Tapping it opened the day's own
card and nothing else: it carried no batch number, no delta t, no cycle reading and no way back,
while every other bar on the chart carried all four. In v179 I answered that this was by design,
because since v152 that bar is where the day is worked backwards from, so the card it opens is
the day's own card. You reported it again, so I measured it rather than explaining it again — and
it was real. A bar you can see and tap but cannot hold is missing the one thing every other bar
on your chart has, and the day's own card does not need that to be true.

**6. What that bar does now.** The card underneath is unchanged: it is still the day's own card,
still headed the end of your first batch, still naming the day's first batch, the day's finish
and every module on it. What is new sits on top of it — the four readings every other bar
carries (which batch it is, the delta t, the cycle, the pans), the same pair of presses,
+ 5 minutes and − 5 minutes, and Back onto the line. A hold there is a hold on that whole module,
exactly as a hold on batch 1 of any other module is. Measured on your own day at 4:00 am: five
minutes on the last bar moved that module five minutes later. Its row read "starts 4:05 am", the
tag on its bar read B1 delta t=+5, and its card read Batch 1, delta t = +5 min, 4:05 am to
4:17 am, where it had been 4:00 am to 4:12 am. Not one module above it moved a minute. Nor was
any of them given more room: every one of their latest starts still read 4:00 am, which is where
they already were, and the day card's own line — that every module of your line is already as
late as it can go — was as true after the hold as before it. The day's own finish did not move
either: 6:03 am both times, because the day finishes with whichever module ends last, and on your
day that is The rests and the stretch and folds, which the packing never delays. The pans a day
did not change at all: 6 before and 6 after. Pressing Back onto the line put the batch back to
4:00 am and the tag back to B1 with no delta t, and the round trip left your stored data byte for
byte the same.

**7. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day.
Nothing here is stored at all: the shade is worked out from the day each time the screen is
drawn, and the only thing that decides whether it is drawn is whether you have filled the hour
boxes in. Measured live, after typing hours into a person's card, taking them out again, and
opening and shutting the cards: every field of the day read exactly as it had before, with one
trace left behind, and it is named here rather than glossed over. The first time an hour is
typed, the day grows an empty shifts key, and taking the hours back out leaves the key standing
at nothing. It is twelve characters, it reads as no hours at all — as does an absent key, which
is the one thing it can never mean anything else — and it is the same shape your own stored data
already carries for merges. So the day is not byte-identical to itself after a round trip; it is
identical in every field, plus those twelve characters of nothing. The copy taken beforehand was
then put back and compared: 13,888 characters, byte for byte, and your three saved days read
24, 12 and 24 pans.

**8. Every rule that stands on it was proved load-bearing, not assumed.** Ten faults were put
back in all, and each was watched failing by a test that names it, then restored byte-identically.
With the rule dropped so everybody is shaded again it fails reading that a person whose hours you
typed is still wearing a shade; with the shade dropped everywhere it fails the other way, reading
that a day with no hours typed anywhere lost its shade; with the rule inverted so only a typed
person is shaded it fails both; with the row drawn from the work again, past the rule, it fails
reading that the two bands are back; with the words silenced along with the drawing it fails
reading that the fact left the row; and with the shade made to answer to the whole day rather than
to the person it fails reading that one person's hours took the shade off somebody else's row.
Of the last bar: with its card taken back to the day's card alone it fails reading that the card
no longer says which batch it is; with the day's own reading dropped off it, the other way; and
with the two pairs of presses stopped saying which one moves the whole day it fails reading that
the card no longer names the pair. The suite is 1298 passing with none failing.

**9. No database step.** Not one stored field is added or changed, so there is nothing to run
in Supabase. You do not need to type your hours again on the other phone: the shading is decided
by the hours you already had.

**23 Sep 2026 — engine v179, WORKING HOURS AND THE DELTA T (no database step). Each
person's line is now shaded across the hours they are actually working — drawn from their
own jobs, from their first of the day to their last, with nothing for you to type. And the
delta t is back across the whole chart: a press on batch 1 of a module that keeps its own
time is a hold again, with its own way back. Your widest scale gives up the delta t before
it gives up the batch number, on your own rule.**

**1. What you asked, in your own words.** "can you shade their working hours in their
line?" — and, asked which of two ways you meant it, you chose the one that needs nothing
typed. And then, separately: "i ask for delta time, that function is not worker across the
chart. And the ruturn to original button is missing?" Both were real, and neither was your
phone.

**2. The shade, drawn from the day itself.** Each person's row carries a wash from their
own first job of the day to their own last, the gaps between jobs included — somebody who
is back in an hour has not gone home. It is worked out from the day rather than typed, so
it is drawn on every day you have ever built, including the days with no hours set on
anybody. Where you HAVE typed the two hours on a person's card, those stay exactly as they
were: the typed hours are the outer band and the working shape sits inside them.

**3. Measured live, and one thing to expect on a row.** On your own day at 1.6 pixels a
minute, Wei's shade was drawn at 0 and 149 pixels wide, which is 93 minutes of a 4:00 am
day — 4:00 am to 5:33 am — against her five jobs. A job shorter than four pixels is still
drawn four wide so you can see it and tap it with a thumb, so on a row whose last job is
one minute the last bar reaches a couple of pixels past the shade. Measured live, Wei's
last job is the fold, one minute, drawn at 147 for 4 pixels and ending at 151, where the
shade — which reads the minutes themselves — ends at 149. The shade is the true length of
the work and the bar is the true size of your thumb, and the difference is only ever that.

**4. The delta t, and why it had gone.** A press on a batch used to be a hold measured
from where the line puts that batch — a delta t. Since v154 that had been narrowed to
batches below batch 1, and to batch 1 only of a module set to follow the one above. Every
module of your own day is set to "Its own time", which is the one case the narrowing left
out, so batch 1 of every module wrote an absolute start time instead: no hold was ever
written, no delta t was drawn anywhere on your chart, and the card's own way back — which
exists only while there is a hold to take off — disappeared with it.

**5. It is back, and the way back is called "Back onto the line".** That is its name from
v151, and it can be renamed in one line if you meant the other wording. Measured live on
your own day at 1.6 pixels a minute, pressing + 5 min on batch 1 of Dimple and top: the
card read Batch 1 and delta t = +5 min with 4:05 am to 4:11 am, the bar's own tag read
B1 delta t=+5, the note read "Dimple and top held 5 minutes later than the time you gave
it — every batch of it moved with that.", and the three modules below it did not move a
minute. Pressing Back onto the line put the batch back to 4:00 am and said so: "Every batch
of Dimple and top is back at the time you gave it." Going there and back left your stored
data byte for byte identical at 13,888 characters, because the hold is kept in the delta
itself and none of your stored start times was rewritten.

**6. The badge now knows when to keep quiet.** Your own rule: "if the scale is too wide to
show batch no. and delta t then forgo delta t". So the batch number — the thing that tells
one batch from another — is never given up, and the delta t is printed only above the
widest stop. Measured live at the widest reading, 72 pixels an hour: the tag read exactly
B1 while the bar kept its own tint, which takes no room and still answers which of the
batches is held, and the tip on that tag still named the hold in full.

**7. Why the last module's batch 1 is different — the question you asked while this was
being built.** It behaves differently on purpose, and it has since v152: tapping batch 1 at
your LAST module does not open an ordinary batch card at all. That batch is the moment the
whole day hangs from — it is where the day is worked backwards from — so its card is the
day's own card, headed "the end of your first batch". Measured live, tapping batch 1 of
Cutting and packing read "Cutting and packing — the end of your first batch", named the
day's first batch ending at 4:12 am and the day finishing at 6:03 am, and listed all eight
modules. On the FIRST module it is the other way round: batch 1 there has no module above
it to be held back from, so a press is simply that module's own start time. Everything in
between is the ordinary batch card with the delta t and its way back.

**8. And where "Put my start times back" lives, since you looked for it.** It is on that
day card and it is a one-shot undo: it appears only once you have pressed "Pull them back
to their latest start", because there is nothing to take back until something has been
pressed. Measured live on your own day, every one of the eight modules was already ticked
as late as the line allows, so the card said so — "Every module of your line is already as
late as it can go — there is nothing to pull back." — and offered neither press, which is
why you could not find it there.

**9. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved
day. Measured live, after working through the batch card, both presses and the widest
scale, your stored settings were put back from a copy taken beforehand and compared: byte
for byte the same 13,888 characters, and your three saved days still read 24, 12 and 24
pans.

**10. Every rule that stands on it was proved load-bearing, not assumed.** Thirteen
faults were put back in all, and each was watched failing by a test that names it, then
restored byte-identically. The shade: with it drawn from the whole day instead of from
that person's own jobs it fails reading whose work it covers; with the bars painted before
the shade it fails reading that the bars no longer cover the wash; with the shade given a
stacking order it fails reading that the hours climb over the module titles, which is the
fault this screen already had once. The delta t: with the hold narrowed back to the v154
rule it fails reading that a press on batch 1 wrote a start time instead of a hold; with
the module's other batches left behind it fails reading that the hold did not take them
with it; with the widest scale still printing the delta t it fails reading that the batch
number was given up for it; and one fault in the tests' own stand-in screen was found and
fixed on the way. The suite is 1294 passing with none failing.

**11. No database step.** Not one stored field is added or changed, so there is nothing to
run in Supabase. Both facts live inside the scenario, which already syncs whole, so they
travel to your other phone with the rest of your plan.

**23 Sep 2026 — engine v178, REASSIGNMENT (no database step). "Share them out" now really
hands the whole day back. It used to clear every module and leave the stretches you had
placed by hand exactly where they were — and a hand-placed stretch is read first, ahead of
the module's own person, so the press said one thing and the chart drew another. Both
full-day presses now take those stretches back, and they say how many they took back,
because taking back a decision of yours is a change you are told about.**

**What you asked, in your own words.** "how to rerun job assignment after we set the more
details?" — and then, once that question had been measured and answered, "build v178, Name
it as REASSIGNMENT". The answer to your question is the People box, and measuring it is what
found the fault below.

**1. The fault: the press promised a day it did not draw.** The People box holds three
answers, and two of them redraw the whole day's hands at once. "Share them out" cleared
every module — but a stretch you had placed by hand is kept on the module as its own entry
(that is what makes a hand-over move one stretch and not a whole row), and it is read BEFORE
the module's own person. So the day kept your hand-placed stretch standing while the press
said it had handed everything back. Measured on your own day: after the press the toast said
the day had been shared out, and the box's own closed words still read "Your own" — and your
Dimple and top was still sitting on Wei, where you had put it.

**2. What it does now.** Both full-day presses — "Share them out" and "One a module" — take
every hand-placed stretch back along with everything else. The stretch is not deleted
quietly either: the press names how many it took back, and a day with none adds nothing to
the sentence, because a count of zero is not news.

**3. Measured live on your own day,** starting at 4:00 am at 1.6 pixels a minute, with your
one hand-placed stretch on Wei. Pressing "Share them out": the box went from "Your own" to
"Sharing them out", your hand-placed entry was gone from the record, and the toast read
"Sharing them out — every job reassigned to as few hands as can cover the day. 1 stretch you
had placed by hand goes back on the day's own arrangement." Dimple and top moved off Wei's
row onto the row the day picks for itself, and every other job on the day was untouched.
Pressing "One a module" on the same day: six people, one to the six modules that hold hands,
the box reading "One to a module", and the same sentence naming the one stretch it took back
— and the stretch no longer overrides the person that press had just given that job.

**4. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved
scenario was changed by building this, and nothing here blocks a sale or reads an order. The
only writes are the ones your own press makes. Measured live: after both presses and a full
pass of opens and closes, your stored data was put back from a copy taken beforehand and
compared — byte for byte the same, 13,888 characters — and your three saved days still read
"No fridge, 1 person" 24 pans, "My sister proposal 21/9/2026" 12 pans and "One baker day" 24
pans.

**5. Every rule that stands on it was proved load-bearing, not assumed.** Eight faults were
put back in all, and each was watched failing by a test that names it, then restored byte
identically. With the stretch left standing, the test fails reading that the old arrangement
is still on the chart; with the count left out of the sentence, it fails reading what the
press said; with the count worked out after the day had already been cleared, it fails the
same way; with "One a module" left holding the stretch, it fails reading that one job is
short of the person the press gave it; with the empty entry written back as an empty map
instead of no entry at all, it fails reading that nobody has one spelling; and with the count
written always in the plural it fails on the first hand-back. The suite is 1287 passing with
none failing.

**6. No database step.** Not one stored field is added or changed, so there is nothing to run
in Supabase. Everything here is inside the Scenario planner, under More.

**23 Sep 2026 — engine v177 (no database step). Each person now has two facts of their own,
and both are yours to state once: the hours they are here, drawn as a band along their row and
a real bound on who the day may hand work to, and which modules they are trained for. A job
nobody is named for goes to somebody who can work it, inside their hours, and between two of
those the day asks the most specialised person first. Nothing is refused and nothing is hidden:
a job that lands outside somebody's hours or training is shown and said in words.**

**What you asked, in your own words.** "back to the scenario planning. 1. I need each person to
have the start work time and end work time, 2. which module they. are dedicated for, and only
taking over others job, as priority 1,2, or3." And then, while this was being built, the two
sentences that settled the shape of it: "a person we should be able to specify their skill, by
module, can be more then one, by module", and "module should select the one that specialised".
Of the takeover order you said the thing that made it simple: "the person card supersed the
module person assignment. maybe no priority rank is needed to be sinple". So there is no 1, 2, 3
rank anywhere: the card says what each person can do, and the day picks by itself.

**1. Their hours, counted from your day's start and not from the clock.** You asked for a start
time and an end time, and told me how to read them: "the working hours is relative to the chart,
not exact hours, end also relative to the chart". So the two boxes are clock times you can read
at a glance, and what is stored is the minutes from the start of your own day — which means
moving your day's start slides every person's hours with it and nothing is retyped. Measured
live on your own day, which starts at 4:00 am: typing 05:00 and 09:00 stored 60 and 300, which
is exactly five and nine o'clock less four.

**2. An empty box is a real answer, and it is "here all day".** Leave both empty and that person
is here all day, which is what every person on every day you have ever built already is. The
hint under the boxes says so in one line, and it also says which clock the times are read
against, because two empty boxes with no explanation would read as two boxes you had not filled
in. Typing the whole day by hand — 4:00 am to midnight — is stored as no entry at all, so "here
all day" has one spelling rather than two that mean the same thing and could ever drift apart.

**3. And a pair that comes out back to front is refused and SAID.** An end earlier than the
start is a mistake, and the app now puts both boxes back to the hours the day is actually using
and says which way round they go. A box that took a number and quietly did something else with
it is the kind of thing that reads as a fault for weeks, and this app does not do that.

**4. What the hours are for.** Your own aim, in your own words: "the person that have the most
consistant work is the person handling oven, colling and packing, he only help do others when
he has free slot, by one person not doing too many functions, it is easier to train that person
as will. Probably can employ part-timers." So the hours and the training are what the day reads
when it hands out a job nobody is named for — and they are a PREFERENCE, never a refusal. A job
nobody qualified is free for still goes to a free pair of hands, and the row says why.

**5. Which modules each person can work, and the specialist is asked first.** The person card now
carries a tick for every module that actually holds hands, so there is never a tick against a
module switched off or against the proofer, which would be a tap that does nothing. Only six of
your eight modules hold hands on your own day, and those six are exactly what the card offers.
Tick nothing and that person can work anything, as they do today — the same absence rule this
app already uses for automatic cycles and merged jobs. Tick one or more and the day only ever
gives them those.

**6. And between two people who can both do a job, the more specialised one is asked.** Your own
rule, in your own words: "say one person have all skill, person2 have have the skill, person3
have only 1 skill, module should select the one that specialised". Somebody trained for one
module is asked before somebody trained for five, and somebody who can work anything is asked
last of all — which is what leaves the specialist on their own job and the generalist on what is
left over.

**7. Measured live, on your own day.** With everybody untrained and no hours set, your day packs
to four people and 58 minutes of hand work, and the three stretch-and-fold slots all sit on Wei.
Ticking Person 4 for "The rests and the stretch and folds" and nothing else moved all three folds
off Wei and onto Person 4, even though Wei is the lower number and was free at that minute — the
specialist was asked first, exactly as you asked for. Wei's row fell from five jobs to two and
the other rows were untouched. Unticking put the day back to where it was, to the job.

**8. Their hours, drawn on their own row.** Each person's hours are painted as a wash along their
own row, under everything the day draws on it, so you can see at a glance when somebody is here
without reading a number. It carries no stacking order of its own on purpose: a band given one
would climb over the pinned module names, which is the fault this screen already had once.
Measured live at a phone's width on your own day: a shift of 05:00 to 09:00 was drawn at 96
pixels along the row and 384 wide, which is 60 minutes and 240 minutes at your own 1.6 pixels a
minute. It takes no taps at all, so it can never swallow one meant for a bar over it.

**9. And when a job cannot fit somebody's hours, the card says so in words.** This is the part
that matters most to the way you work, because it is the same rule this app has always kept: a
plan that does not fit is shown, never quietly rearranged. Measured live: with Wei set to be here
4:00 am to 4:05 am while the dimple runs to 4:06 am, the card read "Wei is set to be here 4:00 am
to 4:05 am, but Dimple and top runs to 4:06 am — a job that cannot fit inside those hours." The
same sentence appears on their row's tip and on the Production line board, all three printed from
one funnel so they can never disagree.

**10. And a job outside somebody's training is said in the same place.** Somebody given a job they
are not trained for is told so in the same words and the same place: the job is named, the times
are named, and the note says it is said here rather than the job being quietly moved. The card
also reads back what they are trained for — "Trained for 1 module: The oven swap and the bake" —
so the answer you typed is the answer you can see.

**11. On the Production line, the worker's own hours.** The board a worker reads already says what
they do next and how long they have; it now also says when they are here, and names any job that
cannot fit inside those hours. Withholding that while printing their jobs would be perverse — when
you are here is the first question of a working day. The board is still a READING and writes
nothing: measured live, a tap on a person's row on the board left your stored settings character
for character identical, and the board offers no hour boxes and no ticks.

**12. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day was
changed by this version. Measured live: after a full pass of presses on the planner — the two hour
boxes typed into and cleared, ticks set and taken off, cards opened and shut — your stored data was
put back from a copy taken beforehand and compared, byte for byte the same 13,888 characters, with
the two new keys absent again because writing them is something only a press you make can do.
Merely opening the screen adds nothing. Your shelf itself is untouched: No fridge, 1 person still
reads 24 pans, My sister proposal 21/9/2026 still reads 4, and One baker day still reads 24. And the
two chart windows kept their pan at 300 across two of those presses, so a card write no longer
throws either window back to the start of the day.

**13. Every rule that stands on it was proved load-bearing, not assumed.** Eighteen faults were put
back in all, and each was watched failing by a test that names it, then restored byte-identically.
Two of the eighteen were faults in earlier drafts that the fault sweep found, and both were
unfalsifiable as first written — a test that could not fail — which is the same lesson this file
has carried before about a stand-in being more forgiving than the real thing. Among the rest: with
the band given a stacking order the test fails reading that the hours climb over the module titles;
with the band drawn last it fails reading that the bars no longer cover the wash; with the boxes
storing a clock reading instead of minutes from the day's start it fails reading where the band was
drawn; with an untick leaving an empty list behind it fails reading that unticking is an answer and
not a missing entry; with the copy of a day not carrying the two keys it fails reading that the
hours of the day you left are still on the day you opened.

**14. No database step.** Not one stored field is added or changed on the server, so there is
nothing to run in Supabase. Both new facts live inside the scenario, which already syncs whole, so
they travel to your other phone with the rest of your plan and need no new table and no new SQL.

**23 Sep 2026 — engine v176 (no database step). The Production line is now a board a worker
reads, not a form you fill in: the day chart from your plan, a clock line showing where the real
time falls in it, and a strip saying what each person does next and how long they have. The
screen used to ask you for 21 numbers; it now asks for 12, and 8 of those are folded away.**

**What you asked, in your own words.** "can we simplify the productioon portion, it ask for alot of
key in" — and then the shape of what you wanted: "maybe one function for production line, 1. copy
the chart into Prodcution line, but should not be editable, it become a dashboard for worker, give
the worker good inform of what next for them, how long, and others, you can be creeative". And of
the boxes on the screen you said the thing that made this simple to build: "must of the question are
answered in scenario plan". They are, and that is where the board now reads them from.

**1. The day chart is carried across, not drawn a second time.** The board and the Scenario planner
are the same drawing, produced by the same code, so the two screens can never disagree about a day
— not its modules, not its batches, not its times, and not who is on what. What the board drops is
everything that changes the day: the Scale buttons, the People box, the backwards chip, the undo
chip, the Start the day now button, New module, and Save changes. Measured on your own day: the
planner wears 8 buttons above the chart, and the board wears none of them — with the two cards shut
the whole screen carries two buttons, and those two are the fold heads at the foot. What the board
keeps is everything that only reads: you can pan the day with a right press, the clock follows your
finger along the ruler, and the tips on the module names still open. A board that could not be panned
would be a worse board on a long day.

**2. A clock line, drawn with no press at all.** A board nobody has touched yet still has to say what
time it is, so the line is placed the moment the screen opens and kept in place once a second. It is
drawn exactly where the real clock falls in your day: at 96 pixels an hour on your own day, a press
of nothing at all puts the line at 156 pixels for your 4:00 am start, and the clock it reads out
matches the ruler under it. Measured live on your own day: at 5:00 am the line stands at 252 pixels
and reads 5:00 am — which is 156 plus exactly one hour of 96. At 4:30 am it stands at 204 and reads
4:30 am. Before your day begins it parks at your day's own start and says "day starts 4:00 am"; after
your day has ended it parks where the day ended and says "day ended 6:03 am". It never wraps around
to the other end of the ruler, which is the tempting wrong answer and would have put the line in the
middle of a day that is not the one on the screen.

**3. What is next, in clock times and not countdowns.** Above the chart the board says, for each
person, the job they are on and the one after it, with the clock time each starts and how many
minutes it runs: on your own day at 5:00 am that reads "Wei — the rests and the stretch and folds,
5:01 am, 1 min, then the rests and the stretch and folds at 5:32 am". Clock times and not a countdown
on purpose: a countdown means rewriting a box somebody is reading every single second, and this app
has a rule about that — a redraw must never move what you are looking at. On a day that is not shared
out to people, the strip falls back to one list of what the line does next.

**4. And the strip answers AGAIN as the clock runs, without touching the chart.** This one was found
while measuring, not reported: the strip was drawn once when the screen opened, so a worker opening
the board at 4 am would still be reading "next: mix at 4:01" at eight in the morning. It now looks
again whenever the clock has changed the answer, and only then — inside the working day it redraws at
the exact minute a job starts or ends, and never in between. The chart itself is not redrawn, which is
the planner's own rule and the reason a worker's scroll is never lost. Measured live across a job
boundary: at 9:00 am the strip names Cutting and packing, at 9:10 am it names the oven swap, and the
number of times the strip has been rebuilt does not change between them.

**5. Three things about a day the clock has already gone past.** The first was a real fault, found by
opening the board in the evening. The strip had one fallback sentence for two different empty lists,
so a day that finished at 6:03 am was being described as "Nothing on this day needs hands" — which is
a different thing entirely, and the opposite of true. A day whose jobs have all been and gone now
says so: "The day is finished — every job on it has been and gone." The second is the offer to make a
sound. The board rings people one minute before each job, and it rings by working out from the clock
which jobs are due — but on a day that is already over there is nothing left due, so switching calls
on would ring for nobody. That offer is now withdrawn on a finished day rather than left promising a
sound it cannot make. Measured live at 7:16 pm on your own day: no Start calling button, and the line
under the strip reads "The day is finished". The third is the other half of that, and it matters
more: calls you turned on earlier can ALWAYS still be turned off. Stop calling stays on a finished
day, so a sound started before cannot be left ringing with no way to stop it.

**6. What left the screen, and where the numbers went.** Twenty-one boxes became twelve. Nine of them
are now read off the day you built under More → Scenario planner — how many pairs of hands, the pans
a tub makes, oiling and weighing out, the dimple, the packing, the oven and the bake-and-swap — so
those questions are asked once and answered on both screens. The twelve left are the ones genuinely
yours: four behind the first fold (how long you will bake for, the pans you own, what your proofer
holds, and the pace between batches you would like), and eight behind the second fold (the rests, the
fold, the two proofs, the cooling, the clock you want the first batch at the oven, and the minutes of
soft tolerance around a start). Both folds start shut and open in place, so opening one never redraws
the chart above it. The line card still answers while it is shut, in one line: measured on your own
day, "44 pans today · the proofer is the wall that holds it back", worked out from the day rather than
typed anywhere.

**7. And the timetable card is folded, which is where it belongs.** The backwards timetable — the last
moment each stage may start — was left on this screen on your word ("you decide, that is your baby")
because it is worker information: it is the one thing on the screen that says when the dough has to
be in the tub. But it is a page of advice, not a glance, and it was sitting out on the board in front
of a worker who came to read what is next. It now lives behind its own fold head. Measured at a
phone's width with both cards as they come: the timetable card is 64 pixels tall, its head and nothing
else, where it was 943 while the timetable sat outside it. That one change alone takes the whole
screen from 2005 pixels to 1126.

**8. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved day changed by
this version, and nothing here blocks a sale or reads an order. The board is a READING of your day,
and every number on it is computed rather than stored — the box you type a number into writes the one
number you typed and nothing else. Measured live, going through a full pass of presses on the board: a
bar tap, a module tap, a right press, and both cards opened and shut twice each, with your stored data
compared before and after. Your data reads 13,888 characters, and it is byte for byte the same
characters it read before the first press.

**9. Every rule that stands on it was proved load-bearing, not assumed.** Nine faults were put back in
all, and each was watched failing by name. The strip: with the finished-day sentence taken off, the
test fails reading that a finished day falls back to the sentence for a day with no hands on it; with
the calling offer always drawn, it fails reading that a finished day offers a sound it cannot make;
with the foot dropped whenever the day is over rather than only when calls are off, it fails reading
that a sound already started cannot be turned off; with the strip never rebuilt, it fails reading that
the strip still names a job the clock has passed; and with the live minute taken off the strip's own
signature, it fails reading that the parked sentence no longer names the hour it is standing in. Two
more put a null where the parked sentence goes, and each was caught by the word "null" appearing on
the screen. The fold: with the timetable put back outside its fold, the test fails reading that a shut
card is already showing the clock times its caret says are behind it; and with the test's own reader
taken back to one that walks straight through a hidden box, the same test fails — the reader had been
reading text the browser never paints, which is the same lesson this test file already carried about a
stand-in being more forgiving than the real thing. Every one was restored byte-identically afterwards.
The suite is 1266 passing with none failing.

**10. No database step.** Not one stored field is added or changed, so there is nothing to run in
Supabase. The day the board draws is the one already synced, and the four numbers behind the first
fold were already synced with the rest of your production plan.

CHANGELOG and the guide both carry all of this, the app's own More screen reads Engine v176, and the
Production line names itself as the board it now is.

**23 Sep 2026 — engine v175 (no database step). Two things you reported: the scenario
windows no longer jump back to the start when you press something, and the right-button
drag now works while a card is open on the chart. Both inside More → Scenario planner.**

**What you reported, in your own words.** "Few problem of screen jump here and there. One
obvious one is the scenario windows, when i click, window reset. And right button drug
dont work". Both were real, and neither was your phone.

**1. Why a press threw the windows back to the start.** When you press something that
changes the day — a batch card's + 5 min, the People box, the scale, opening a saved day
— the screen is drawn again from scratch. That has always been how it works, and it is
what keeps the whole panel agreeing with itself. But a box drawn again is a NEW box, and a
new box starts its own scroll at nothing. So every one of those presses put both windows
of the day chart back at the far left and the top, and would have put the list of saved
days back at its first row with them. Measured live at a phone's width with the modules'
window panned 300 pixels: one press of + 5 min left both windows reading 0.

**2. What it does now, and where you were is put back only after the measuring is done.**
Where each of the three sliding boxes was — the two windows and the list of days — is read
before the screen is drawn again, and written back afterwards. The order is the whole of
it: the list of days is measured to work out its height, and a row's foot moves when the
list under it slides, so measuring a list that had already been slid back down would come
out short by exactly the amount it moved and would cut your fourth day in half. Nothing is
slid until the measuring is finished, and the measuring all happens before anything is
drawn on the screen, so you never see the day sitting at its start either. Measured live
on your own day: panned 300, one press of + 5 min, and the window reads 300 on the day
drawn after it — and both windows are put back by their own numbers, never one number
shared, because they pan together and a redraw is not the place to find out they had
drifted.

**3. Why the right-button drag did nothing with a card open.** A card is drawn on a
full-screen sheet that sits over the whole chart, so with a card open your right press
landed on the sheet, not on the day behind it — the day you were actually looking at could
not be moved at all. Measured live at a phone's width with a batch card open: a right press
200 pixels into the chart, dragged 60 to the left, left the window reading 200 exactly
where it started. The sheet carried no gesture of its own, so nothing was being taken from
anything else.

**4. What it does now.** The sheet answers the same right press the two windows do, and
which window moves is worked out from where your hand is — the upper window for a press on
the upper half of the chart, the lower one for the lower. Your own card is left alone: a
right press on the card, or on any of its buttons, moves nothing, so the day cannot slide
about while you are reading the card that describes it. The left button is untouched and
still opens and works cards. Measured live with a batch card open: a right press 60 pixels
to the left moved the modules' window from 200 to 260, the same press on the people's
window moved that one from 260 to 310, the two windows came back into step at 310 on the
next frame, and the same right press on the card itself moved nothing.

**5. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved
scenario changed, and nothing here blocks a sale or reads an order. Every tap still opens
exactly what it opened before. Your stored data was put back from a copy taken before the
measurements and compared: byte for byte the same, and your three saved days still read
24, 4 and 24 pans.

**6. And the rule that stands on it was proved rather than assumed.** Nine faults were put
back in all and each was watched failing by name, then restored byte-identically: with the
putting-back left out entirely the test fails reading that the press threw the windows back
to the start; with only the modules' window put back it fails the same way; with the two
windows collapsed into one number it fails; with the putting-back done before the measuring
it fails reading that the shelf was capped short of where the fourth day ends; with the
class name matched dot and all it fails (this is the fault that was in the first draft of
the fix, and the test caught it); with the sheet never wired it fails reading that a right
press over an open card did not move the day; with the sheet always panning the upper
window it fails on the lower press; with your own card not spared it fails reading that a
right press on the card dragged the day behind it; and with the left button let through it
fails the older drag test, which says the left press is the one that opens cards. One more
thing was found and fixed on the way: the tests' own stand-in screen did not move a box
when a box it sits inside was scrolled, which is the opposite of what a window does, and
that gap had been hiding whether the measuring happened before or after the sliding. The
suite is 1220 passing with none failing.

**7. No database step.** Not one stored field is added or changed, so there is nothing to
run in Supabase.

**23 Sep 2026 — engine v174 (no database step). Two things you asked for: the
modules' window no longer lets the day's writing come up between the module titles
when you pan it right, and the Your scenarios card now shows four days at a time with
the rest reached by sliding the list. Both inside More → Scenario planner.**

**What you asked, in your own words.** "the windows when panning right, some of the
chart writing shown in between module titles" — and "now i had 8 scenario, we have to
make the secenario just shown 4, the rest shown by slider". You were right about both,
and neither was your phone.

**1. The writing between the titles, and why panning right brought it there.** The
module titles on the left of each window are pinned: they stay put while the day
slides under them, which is the whole reason you can read which row is which at any
hour. What was wrong was the ORDER they were stacked in. Every B-number, every band of
your hands and every line down the bars was drawn at or above the title's own level,
and when two things sit at the same level the one drawn later wins — and the day is
always drawn after the titles. So nothing had to go wrong for a number to appear over
a name; the day simply took its turn on top of it. Measured live on your own day at a
phone's width, with the chart panned 25 pixels: nine B-numbers and six bands of your
hands were the topmost thing at their own position inside the 156-pixel title column.

**2. What it does now.** The three things that can be stacked are written down once,
on the chart itself, as three levels: the titles lowest, the clock strip above them,
and the readings you take highest. The clock strip has to outrank the titles because
the titles scroll under it, and a reading has to outrank the clock strip because the
reading's own top line lands on the strip. Everything the DAY draws — its marks on
your bars, the B-numbers and the names on them, and a module's own note — is
deliberately under the titles, so no pan position can bring one of them up over a
name. Measured live on your own day across six pan positions, 1,400 points sampled
inside the title column: not one of them reads as the day, while the same eight
B-numbers and five bands are still drawn exactly where they were, under the titles
where they belong.

**3. And the clock you take is refused where the day is not in front of you.** The
same fault had a second half. Pressing the clock strip over the title column could
still read a minute and draw the hairline and its number across the titles — because
the strip's own ruler scrolls with the day, so once you have panned, the strip's left
edge has travelled behind the titles and the arithmetic no longer knows where the
titles end. It now measures where the day actually starts rather than trusting the
strip's edge. Measured live with the day panned 25 pixels: pressing at 140 pixels
across — inside the titles, which end at 183 — reads nothing and draws nothing, while
the same press 17 pixels further on reads 4:26 am as it always did. On a day that is
not panned nothing about this changes at all.

**4. The shelf now shows four days and slides to the rest.** On your eighth saved day
the card grew a row per day, and a shelf of eight days plus the buttons under it ran
past the bottom of your phone. It is four days at a time now, with the list itself
sliding up and down for the rest, and a line under it that says so: measured live with
eight days, "Showing the first 4 of your 8 days. Slide the list itself up for the
rest." The headings stay put as the list slides, so a row you have scrolled to is
still under the heading that names it. A card with four days or fewer is exactly the
card it was before — no scroller, no height, no note.

The height is the part worth being careful about, and it is measured rather than
assumed. A long day's name wraps to a second line at a phone's width, so the fourth
row is not always as tall as the first three, and a shelf capped by arithmetic would
have cut the bottom off the fourth day. Measured live on the eight days: three rows of
59 pixels, then a fourth of 73 because its name took three lines, and the shelf stops
at exactly 290 pixels — the fourth row's own foot. The fifth row begins at 290, so
nothing of it shows. That is the reading this was built from: capped by arithmetic it
would have been 236 pixels and the fourth day would have been cut in half.

**5. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. Every tap
still opens exactly what it opened before. Your stored data was compared before and
after every measurement: 13,888 characters, byte for byte the same, and your three
saved days still read 24, 12 and 24 pans. The eight-day card used for that measurement
was put on a copy of your data and taken off again, with your own file restored byte
for byte and nothing left behind.

**6. Every rule that stands on it was proved load-bearing, not assumed.** Eight faults
were put back in, one at a time, and each was watched failing by name, then restored
byte-identically. The ladder: with a B-number put back above the titles the test fails
reading that panning right puts the day's writing between the module titles; with the
title cell taken off its own level it fails reading that the levels can no longer be
moved in one place. The reading: with the guard taken out it fails reading that a
reading was taken with the pointer over the module titles. The shelf, four ways: capping
it off the last day instead of the fourth fails reading where the fourth day ends;
writing no height at all fails the same way; measuring it as a multiple of one row
instead of reading the fourth row's foot fails reading 40 pixels where the fourth day
ends at 220; and taking the slide away fails reading that the days past the fourth are
unreachable. The suite is 1217 passing with none failing.

**7. No database step.** Not one stored field is added or changed, so there is nothing
to run in Supabase.

**23 Sep 2026 — engine v173 (no database step). Two faults in the "Minutes from
one batch to the next" box, both on a day that runs more than one batch: on a module
that runs only one, the box did nothing at all and said nothing about why; and on a
module whose batch two had been nudged closer by hand, a smaller pace could send that
batch in front of batch one, and the day then drew both on the same minute. All inside
More → Scenario planner.**

**What you reported, in your own words.** "similar problem happen. 1st module, time
betwenn each batch, set to 21, but no effect, or the chart dont workout" — and then,
when asked which of the two you were seeing, "both batch start the same time". You
were reading a 12-pan day, and the first module of that day is "Mixing by hand in the
tub (set the minutes)": one batch, and the same pace it has always had. Both halves of
your report were real, and neither was your phone.

**1. On a module that runs one batch, the box does nothing — and now says so.** A pace
is the minutes between one batch and the next. A module that runs a single batch in
the day has no second batch for a pace to sit between, so whatever you type there
cannot move anything. That is what your first module is: measured on your 12-pan day,
"Mixing by hand in the tub" runs one batch of four pans at a pace of 20 minutes, so a
21 typed into it had nothing to act on and the chart was already telling the truth.
The fault was that the box said nothing at all about that — it looked exactly like a
box that was broken. It now explains itself in your own words: measured live on that
very module, the line under the box reads "This module runs one batch in the day, so
there is no second batch for a pace to sit between yet. How many batches it runs in
the day is the box above that sets it — make that two and these are the minutes
between them." Make it two and the line goes.

**2. And on a module that does run more than one, a smaller pace could put batch two
in front of batch one.** This is the "both batch start the same time" half, and it is
the more serious of the two.

A saved day remembers the exact minute each batch starts, one module at a time. A
module that carries that list is re-spaced at the pace you type, so a batch you have
nudged by hand keeps the minutes you nudged it by rather than being pulled back onto
the rhythm. That is right for a batch you nudged LATER — and exactly wrong for one you
nudged EARLIER, because its deviation from the rhythm is a negative number, and adding
a negative to the smaller rhythm lands it in front of the batch above it.

Measured on your own first module, in the shape that does it. A nudge of batch two by
hand with the box still reading 87 leaves the module carrying the times 4:00 am and
4:21 am — and that batch is then 66 minutes earlier than the rhythm, so its deviation
is −66. Typing 21 sent it to minute −45: three quarters of an hour before your day
begins. The day cannot draw a batch that starts before it does, so both batches were
drawn on minute 0 — both at the same time, exactly your words. This is also where the
"no effect" reading of the chart comes from on a two-batch module: the box reads 21,
and the two bars sit on top of each other and will not come apart.

**3. What it does now, and it is your own app's rule rather than a new one.** Two
rules, and both were already the app's own. A hold is only ever a HOLD — every other
press on this screen already obeys that, so a batch can be held back off the rhythm
and can never be pulled in front of it. And no batch is left at or behind the batch
above it: where a hold has become impossible in the smaller rhythm, the batch takes
the rhythm rather than a minute that is not its own. Measured live on that same
module, through the same card: typing 21 leaves the two batches at 4:00 am and 4:21 am,
drawn 21 minutes apart with the box reading 21, and the second batch is no longer able
to overtake the first.

**4. And a third fault, found while proving the second: the Auto box did not save.**
This one you had not reported and would have met eventually. "Minutes from one batch
to the next" carries an empty box with the word Auto in it, meaning each batch starts
the moment the one before it ends. Emptying the box moved the flag and nothing else.

The zero that means Auto was being written through the same writer every other box on
this screen uses; that writer refuses any number below the box's own minimum; and this
box's minimum is 1 — so the refusal came back BEFORE the save and before the repaint.
The choice was made in memory, nothing on the screen moved, and the next reload threw
it away. Measured on your own mix with two batches: emptying the box left both batches
30 minutes apart and the screen did not move at all; the card reopened with its empty
Auto box drawn over the very same unchanged chart; and a reload forgot the choice
altogether. The zero and the save are now written directly, so Auto is an answer the
app keeps: measured live, emptying the box redrew the two batches 20 minutes apart —
the module's own cycle, which is what Auto means — and a reload kept it.

**5. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. Every tap
still opens exactly what it opened before. Your stored data was compared before and
after every measurement: 13,888 characters, byte for byte the same, and your three
saved days still reading 24, 12 and 24 pans.

**6. Every rule that stands on it was proved load-bearing, not assumed.** Six faults
were put back in all and each was watched failing by name, then restored
byte-identically. The hold rule: with the clamp taken out the test fails reading that a
batch pulled closer than its line carried a hold it does not have. The forward sweep:
with the sweep removed the test fails reading that a batch was left in front of the
batch above it. The one-batch note: with it gated off the test fails reading that a
pace box with nothing to space does not say so. The Auto half, three ways: with the 0
written through the writer again the test fails reading that Auto did not write the 0
that means Auto; with the save and the repaint left out it fails reading that the Auto
press saved and repainted nothing; and with the list not deleted it fails reading that
Auto left a list of times behind, so the cycles no longer decide. One fault in the
tests' own stand-in screen was found and fixed on the way — it had no firstChild, so the
"did the screen repaint" assertion was comparing nothing with nothing and could never
fail — which is the same lesson that file already carries about a stand-in being more
forgiving than the real browser. The suite is 1215 passing with none failing.

**7. No database step.** Not one stored field is added or changed, so there is nothing
to run in Supabase.

**23 Sep 2026 — engine v172 (no database step). Four things: handing one stretch of
work to somebody else no longer moves the people's rows, their names or their jobs;
the "Minutes from one batch to the next" box reaches your batches again, and says so
when your oven is what is holding them apart; the Your scenarios card is a table you
can run your eye down; and the question a card asks before deleting something is drawn
over the card that asked it instead of behind it, with the row of buttons at the foot
of a card given the shape it never had. All inside More → Scenario planner.**

**What you reported, in your own words.** First, and the largest thing in this
version: "i have 4 persons, 1st Jien, 2nd Wei, 3rd and 4th. I saw Jien is heavy
loaded, so i click one of Jien session, and select to switch that session to Wei,
where he is free. BUt what happen is Jien disapper, and Jien name chage to Wei, and
the originally Wei sessions disappeared". Then: "im now on my 36loaf scenario, pls check
why im lowering the minutes frrom one batch to the next, cannot reflex even i reduce
it to 13, look like something prevent it from loweriing below 25". And, separately:
"can you make the Your Scenario, reorganised it to a better visual clarity, details
in table, action button below?" And then, while that was being built: "please check
the process of delete a module and the process of deleting a scenario, it dont look
right".

**1. Handing one stretch of work to somebody else moved everybody on the chart.**
This was your report, and it was the largest thing in this version.

All three of the things you saw were real, they were one fault, and none of it was
your doing.

A day that is sharing them out has nobody written on it. The rows you see are worked
out fresh every time the chart is drawn: the first job nobody is on goes to person 1,
the next to person 2, and a new row appears only when everybody is busy. That is why a
shared-out day reads as perfectly sensible people — and it is also why its row numbers
mean nothing at all. They are not yours and they are not on the modules.

Your names, though, are kept by number, and every day you have shares them. So the
moment one stretch was given to Wei, a row for Wei existed before the free jobs were
handed out — the packing began at Wei's row instead of at the first row, every
invented number moved up by one, and the row that had been person 1 became person 2.
Jien was person 1, so Jien was gone; the row he had been on now wore Wei's name; and a
fifth row appeared at the top with what was left over. Exactly the three things you
saw.

**2. What that press does now, and what it was measured doing.** Before a stretch
changes hands, the arrangement already on the screen is written down: each job is given
the person the chart is already showing at it — one name for a module whose batches all
sit on one row, one name per line for a module worked as lines, and a note on the single
stretch where a module's batches really are split between two people. A stretch you had
already placed by hand, including one you had handed back to whoever is free, is left
exactly as it is. From that moment the numbers on the rows are facts rather than the
packing's invention, and your names go on meaning what you see.

Measured live on your own day at a phone's width, going through your exact press. The
card read "Move this slot off Jien" and its button read "Move it to Wei". Before the
press the chart drew four rows — Jien with five jobs on him, Wei with one, and two more
below them. After it, the same four rows were in the same order with the same names:
Jien had lost the one stretch you moved and nothing else, Wei had gained that one
stretch and nothing else, and the two rows below were untouched. The People box stopped
saying the day was sharing them out and read "One to a module", which is what the card
had told you it would do before you pressed it. And the chart held there: the page was
read again from scratch and drew the same four rows, the same names and the same jobs —
where before this fix that very re-read was what moved them.

**3. And one sentence on that card was describing a day that was not in front of you.**
Found by measuring the fix on your own day rather than on a made-up one. The card
carried a note explaining that the press settles the whole day, and it said so in the
words "This day is sharing them out" — on a day whose People box plainly read "Your
own", because one stretch on it had been placed by hand. Two claims, about a day that
was making neither. The note may now say only what is true of the day on the screen:
the part that says the press settles the whole day is always said, and the part about
the box stopping saying it is sharing them out is said only when the box is saying it.

**4. The box that would not move, found and fixed.** Two different things were true
at once, and only one of them was a fault.

The fault: a saved day keeps, for each module, a list of the times its batches
start. A list is read as the whole truth about where every batch sits, so a module
that carries one ignores the box entirely — the box could be set to 13, or to 87, or
to anything, and the batches would not move. Measured on the engine, not reasoned
about: a module with the list 0, 25, 50, 75 and the box at 13 still ran 25 minutes
apart; set to 87 it still ran 25 minutes apart; with no list at all, 13 ran 13.

How the list got there: the press that moves one batch's time wrote the module's
whole list back onto it, and so did the day card's "work the day backwards", which
does it for every module in the day at once. So one press of one button used to
freeze the pace box of the entire line — which is why it looked like something was
preventing it, rather than like a box that had quietly stopped working.

**5. What changed.** Three things, all small. A press that moves a single batch no
longer writes a list onto a module that never had one — batch one of a module IS the
module's start time, so writing that one number is the same answer the pace already
gives, and leaving no list behind is what keeps the pace alive. A module that already
carries a list has it re-spaced to the pace you type, with every batch keeping what
you did to it by hand: each batch moves by the minutes the rhythm moved, so a batch
you deliberately held off a collision is still held off by the same minutes after.
(23 Sep 2026, added at v173: this re-spacing was unbounded in v172, and a batch that
had been nudged EARLIER by hand carried a negative deviation that the smaller pace then
added on, putting that batch in front of the one above it — the day drew both on the
same minute. See the v173 entry above: a hold is now only ever a hold, and no batch is
left at or behind the batch above it.)
And the box now carries a live note under it, so a pace the oven cannot reach says so
where you typed it instead of doing nothing.

**6. The other half of it, which is not a fault and now says so.** A module that
takes one batch at a time cannot start two of them closer together than one batch
lasts — that is your oven, not the app. Measured on your own "Mixing the dough in
the tub": its cycle is 20 minutes, so typing 13 still runs the batches 20 minutes
apart, and the note under the box says exactly that, names the 20 minutes, and names
both ways to run closer: give the module a second production line under "How many
production line you have", or switch on "Allow multiple production line" if those
minutes are the dough's time and not the machine's. Measured live on your own frozen
day: typing 13 turned that module's stored list from 1, 88, 175, 262 into 1, 14, 27,
40, and the day then ran 1, 21, 41, 61 — 20 minutes apart, its own cycle. Typing 40
ran the day 1, 41, 81, 121, and the note went back to being a plain explanation.

**7. The Your scenarios card is now a table.** One row for each saved day: the day's
name, the pans a day it turns out, and how many modules it has, with the pencil at
the end of its own row and Save changes and Save a copy below the table rather than
mixed into it. The day the planner is currently plotting is filled in and carries a
line down its left edge, and every name starts at the same place so the days read as
a column.

**8. And one measurement that made the table worth having.** At a phone's width the
card has 315 pixels to spend, and two headings were taking 170 of them — "PANS A DAY"
on one line claimed 91 pixels to sit over a two-digit number and "MODULES" claimed 78
to sit over a one-digit one — which left the name 92 pixels. Every name you have is
wider than 92, so every row wrapped, each to a different number of lines, and the
card read as three ragged paragraphs. The heading is written over two lines now
instead, which hands its slack back to the name: measured at 375 by 812 the name goes
from 92 pixels to 138, all three rows come back to the same 59-pixel height instead of
59, 72 and 59, and every name starts at the same x. The mark that said which day was
open used to be a dot typed in front of its name, which pushed that one name 17 pixels
right of the other two; it is a line down the row's left edge now, which costs the row
nothing.

**9. Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. Every tap
still opens exactly what it opened before — a row opens that day, and the pencil
beside it opens the rename card without opening the day as well. Your stored data was
compared before and after: 13,888 characters, byte for byte the same. The one press in
this version that does write to your day is the hand-over above, and it writes only what
the chart was already showing — the same people, on the same rows, at the same jobs. Its
own round trip was measured on your day, starting from your day as it stood and putting
it back byte for byte afterwards: 13,888 characters before it and the same 13,888 after
it. Your three saved
days are untouched, and each still asks for the pans a day it always asked for — 24,
12 and 24 — and still carries the same 9, 8 and 8 modules. One reading in the table is
worth naming, because it is not the same number: "Pans a day" in the table is what
each day's line turns out, which is exactly the number the app already puts in a
day's own summary line. For two of your days that is the 24 you asked for; for "My
sister proposal 21/9/2026" the one tub passes 4 against the 12 you asked it for, and
the shelf says 4 for the same reason its summary line already does — so the two
screens cannot disagree.

**10. The delete button opened a question you could not see.** This was the fault you
found, and it was not a wording problem or a small one: the question was being drawn
underneath the card that asked it.

Both of these deletes are asked from inside a card — Delete this module from the
module card, Delete this scenario from the card the pencil opens — and the card stays
on the screen behind the question, which is deliberate, so you can see which module
you are about to lose. What was wrong is the order the two are drawn in: the layer the
question goes on sat at 60 and the layer of a card sat at 65, so the card was painted
over the question every time.

Measured on your own day at a phone's width, not reasoned about. With the question
open, the topmost thing at the question's own Delete button was an input belonging to
the module card underneath, and the topmost thing at the question's own centre was a
label from that same card. So the sentence could not be read, neither button could be
pressed, and the only thing you saw was the screen dimming a second time with nothing
appearing on it. Tapping anywhere did what the card underneath does instead, and the
question sat there unanswered until something else happened to close the card, at
which point it surfaced on its own — a delete box appearing when you had stopped
asking for one. Both flows were the same fault, and both are measured fixed: at the
question's Delete button the topmost thing is now the Delete button, at Cancel it is
Cancel, and at the centre of the box it is the box.

The question's layer now sits at 72, above every card and above a toast, and only the
app-password lock outranks it. Nothing about the flow changed otherwise: Cancel leaves
the module and leaves the card open where it was, and Delete takes the module out and
closes the card with it — both driven and watched on a live day, a module going from
eight on the line to seven with the day answering without it, and a saved scenario
going from three to two with the shelf redrawn and no name left standing on the card.
And the question now names the module in quotes, as every other delete in the app
names what it is about. Unquoted, a module called "The proofer again" read as one
sentence with the name lost inside it: "Delete The proofer again?".

**11. And the row of buttons at the foot of a card had no shape at all.** The same
report's other half, and a smaller thing, but the same kind of thing: a class used in
26 places across 12 files that never had a rule of its own.

Without one, its buttons flowed as plain inline blocks — flush against each other and
hard against the left edge of the card. Measured on the module card at 375 by 812:
"Delete this module" and "Done" were 0 pixels apart, so a thumb reaching for Done was
touching the button that deletes the module, with 88 pixels of dead card to their
right. The scenario card was the same shape the other way up — its Delete stacked
directly above its Save at exactly the same left edge — and both read as two buttons
run together rather than as a row of choices.

The row is now one rule, written once: the card's own edge, 8 pixels between the
buttons, and a line's worth of air above them. `wrap` is part of it rather than a
detail, because the module's three buttons need 437 pixels and have 303 — a row too
wide for its card has to go onto a second line, not off the card's edge. It is the
shape the label printer's own sheet already carried in full and the shape three other
cards had each patched in by hand, a little differently every time; those three
patches are gone, because one answer in one place is what stops a fourth being added.
Measured after, on the same card: Duplicate this module on a line of its own ending at
the card's edge, then Delete this module from 94 to 264 and Done from 272 to 345 — 8
pixels apart, Done sitting where a thumb expects it at the card's own right edge.

**12. Every rule that stands on it was proved load-bearing, not assumed.** Nineteen
faults were put back in all, and each was watched failing by its own name before being
restored byte-identically.

For the hand-over: with the arrangement left unwritten the test fails reading that the
day has stopped being able to say what it is, which is the fault put back; with a person
written onto a module without the crew that carries it, the same test fails with your
own three symptoms — five rows where there were four, renumbered 2, 3, 4 and 5; with the
People box allowed to read a crew of zeroes as an arrangement, the hand-back test fails
reading that a day which has not moved no longer says it is sharing them out; and with
the card's note gated off, it fails reading that the card does not say what the press
settles.

For the pace: with the re-spacing taken out the test fails reading "the stored list did
not follow the pace she typed"; with the note about the oven taken out, "a pace the
machine cannot reach is not explained"; with every batch pulled back onto the rhythm
instead of keeping its own offset, "a batch held off by hand was pulled back onto the
rhythm"; and with the press left writing a list again, "Mixing the dough in the tub
came out of the press carrying a list of times, so its pace box is dead".

For the question: with the layer put back under the card it fails reading "under the
card that asked it"; with it put above the app-password lock, "drawn over the
app-password lock"; with the module's name left unquoted, "does not name the module in
quotes"; with the destructive button put first, "answered by the safe button and then
the destructive one"; with Cancel made to run the delete, "Cancel deleted the module";
and with the card left open behind the delete, "the card stayed open after the module
went".

For the foot row: with the rule declared a second time it fails reading "declared 2
times"; with the buttons put back to inline blocks, "flow as inline blocks"; with the
8-pixel gap taken away, "sits flush against"; with the row back at the left edge, "not
laid out against the card's own edge"; with wrap taken away, "cannot wrap"; with one
card patching its own row by hand again, "lays its own foot row out by hand"; and with
the foot's buttons reordered, "does not carry its three buttons". The two faults found
while measuring the note on your own day are put back the same way: with the note always
claiming the day is sharing them out it fails reading that the card claims a box that is
not saying it, and with the note taken off the card altogether it fails reading that the
card does not say what the press settles. The test suite is 1215 passing with none
failing.

**13. No database step.** Not one stored field is added or changed, so there is nothing
to run in Supabase.

**23 Sep 2026 — engine v171 (no database step). Three things you asked for while
looking at the day chart: a right press and hold moves a window's day about without
opening anything, the clock balloon rides two inches clear of your pointer, and the
batch card is brief. All inside More → Scenario planner.**

**What you asked, in your own words.** First: "And can i drag the module window
up/down, left/right by right click and hold? Dont let this action open up the card".
Then, while that was being built: "put the clock balon 2 inches higher than. cursor".
And: "the batch pop up, make it as brief as possible".

**1. A right press and hold now takes hold of a window's day and moves it, both ways
at once.** Press the right button anywhere on either chart window, keep it down and
move: the day comes with your hand, sideways and up and down together, exactly as if
you had taken hold of the paper and pulled it. The window under your hand moves and
the other one comes with it sideways, so the two can never disagree about a minute —
that part was already there and is untouched. Measured live at a phone's width
(375 × 812): a right press on the modules' window and a 60-pixel drag moved its day
from 0 to 60, and the people's window to the same 60. The window marks itself while
your hand is down and unmarks the moment you let go.

**And it opens nothing, which was the other half of your sentence.** The gesture is
the RIGHT button, and a browser fires no ordinary click at all for a right press, so a
press for panning can never be read as a press for opening. The ruler's own press,
which drags the clock reading, now ignores the right button too — one press, one
gesture. Proven live, not assumed: a right press on a bar dragged the day and left the
card shut, and a left click on that very same bar opened it. Your own hand is on the
safe side of it either way — a finger cannot set the right button at all, so nothing
here is reachable from your phone and the way you touch the chart is exactly as it was.
The browser's own menu, which a right press would otherwise put on the screen in the
middle of the gesture, is stopped over the chart.

**2. The clock balloon rides two inches clear of your pointer.** It used to sit 8
pixels above your finger, which on a phone is under it. It is lifted two CSS inches now
— 192 pixels, and named in the unit you used so the number is one this can be held to
rather than a feeling. Above your pointer wherever the window has the room, and where
it does not, the same two inches BELOW it — which is the side that matters, because the
clock strip you press with a finger is at the top of the modules' window, and a balloon
that came to rest at the window's top would be lying on your hand. Measured live at
375 × 812: the full 192 pixels of clearance in both directions, and never nearer than
175 pixels anywhere on the chart. It is still held inside the window you are looking
through rather than to the day, so a tall day cannot carry it off the screen.

**3. The batch card is brief, and its own reading is no longer cut off.** What left the
card: the paragraph under each pair explaining what a move means in that module's own
terms, and the second line that repeated the two times the line above it already reads
out. What is on it now: one line of four readings — which batch, how it sits against
the line, the two times, and what it costs your hands — then the two pairs, five
minutes and one minute, and the way back where there is one. Measured at a phone's
width, the card came down from 338–366 pixels tall to 265–288. The explanations are
still true and are still there, on the press itself as its accessible name, and every
press still answers in words when it lands.

**And one fault found while measuring that card, fixed here.** Four readings on one
line ran off the card's right edge — "Batch 2  on the line  8:51 am → 8:5" — with the
end time, the clock you opened the card for, cut off. A reading is set never to be
squeezed, on purpose, so a time can never be shrunk to nothing; a line one word too
wide therefore overflows rather than shrinks. The card's readings now WRAP to a second
line instead, which only ever happens where the line would otherwise be clipped. The
same fault was possible on every card that shares that line, and it is fixed on all of
them by the one change.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved
scenario changed, and nothing here blocks a sale or reads an order. Every tap still
opens exactly what it opened before. Your stored data was compared before and after:
13,561 characters, byte for byte the same, and your three saved days still read 24, 12
and 24 pans.

**Three rules now stand on it, and every one was proved rather than assumed.** One
says a right press and hold drags a window both ways and that a right press over a bar
opens nothing, while a left press on the same bar still does. One measures the balloon
against the palest bar and pins the two inches of clearance, above or below, with the
reason the window's own top is not good enough written into the test. One pins that a
card's readings wrap and that they still refuse to be squeezed — the two settings
asserted together, so neither can be changed alone. Each was proved by putting the
fault back and watching it fail by name, then restored byte for byte: no downward
fallback for the balloon read "a balloon with no room above her pointer sits -50px
below it, not the two inches she asked for"; no upward preference read "the balloon
sits 232px above her pointer, not the two inches she asked for"; and removing the wrap
read "a card's readings are back on one line, so a row too wide for the card is clipped
at its edge again". The test suite is 1209 passing with none failing.

**No database step.** Not one stored field is added or changed, so there is nothing to
run in Supabase.

CHANGELOG and the guide both carry all of this. Both PDFs rebuilt and read back with
PyMuPDF, the app's own More screen reads Engine v171, and your phone is untouched by
nothing here.

**23 Sep 2026 — engine v170 (no database step). The frame around every bar is drawn
quietly now, so a block of work still reads as a block without every bar being a box
drawn round it. Nothing else moved. All inside More → Scenario planner.**

**What you reported, in your own words.** "the border look like over emphasized".
You were right, and it was my own v169 line being too loud. Nothing about the day, the
bars or your data was wrong — the frame was simply drawn heavier than it needed to be.

**What was too much.** The frame went in at a line one and a half pixels wide, drawn
at full strength in the bar's own solid colour. Round a pale bar that is not an edge,
it is a box drawn on: every bar on the chart was outlined that way, so the day read as
a page of boxes rather than as a day with edges on it.

**What changed, and it is only the frame's own two numbers.** The line is one pixel
wide rather than one and a half, and the whole frame is laid down at 55 parts in 100
rather than at full strength. The colour is untouched and is still the bar's own tone —
the colour your hands already wear inside that bar, and, for a person, the colour of
their card's stripe — so the frame still says at a glance which module a bar belongs
to. Measured live on your own day at a phone's width: the frame reads the bar's own
colour, a 1-pixel line with the layer at 0.55, on a batch bar, on a lane bar that
shares its row, and on a person's time slot alike.

**Your B-numbers and your people's names are untouched**, and no line crosses a label,
exactly as at v169: the frame is still drawn below them.

**One number softens every frame together.** The strength is declared once, on the
chart's own wrapper beside the marker's transparency, so the modules' window and the
people's window and all sixteen tones are all softened by the one edit and cannot be
tuned apart. Lower it towards 0 for a whisper, raise it towards 1 for v169's line back
again — it is one number either way, so say the word if this is still not the weight
you want.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved
scenario changed, and nothing here blocks a sale or reads an order. Every tap still
opens exactly what it opened before, and the frame still takes no taps at all. Your
stored numbers were compared before and after: 13,561 characters, byte for byte the
same, and your three saved days still read 24, 12 and 24 pans.

**And the rule that stands on it was extended rather than left standing on the old
numbers.** The frame test now carries your report in its own name, pins the 1-pixel
line, pins the layer's strength and refuses a strength of 0 or 1 — so a later edit
cannot quietly put the shout back — and refuses a second declaration of it. Each was
proved by putting the fault back and watching it fail by name: the 1.5-pixel line back
made it read "the frame is no longer a 1px line"; full strength back made it read
"--frame is 1: one at 1 is v169's shout back again"; and the strength declared twice
made it read "the frame's strength is declared in more than one place, so the two
windows can disagree". Each was restored exactly as it was afterwards. The tests are
1,201 passing with none failing.

**No database step.** Not one stored field is added or changed, so there is nothing to
run in Supabase.

**23 Sep 2026 — engine v169 (no database step). Every batch bar and every person's
time slot now wears a frame in its own colour, so a block of work reads as a block
and not just as a patch of colour on the paper. And the clock's lines have gone to
the back of the day while every bar became see-through, so the ruler reaches inside
them the way you asked instead of sitting on top of them. All inside More →
Scenario planner.**

**What you asked, in your own words.** First: "Can the batch and person time slot
having a more highligted frame?" Then, while that was being built: "its scale
should be at backgrond, the marker should be ontop, with some degree of
transparency". Those two together are this release, and the second one turns round
the way the ruler was drawn at v165 and v166.

**Every marker now wears a frame, and it is drawn in its own colour.** A batch bar
and a person's time slot are the very same shape in the app — one rule frames both,
so a batch and a slot cannot end up looking like two different things. The frame is
the bar's own solid colour: the same colour the hands inside that bar already wear,
and, for a person, the same colour as the stripe down the side of their card. That
matters more than it sounds — a frame in a colour of its own would be one more thing
to keep in step, and it would drift the first time a tone changed. Nothing about
the bar's shape moved for this: a batch bar is still 16 pixels tall and a person's
slot still 11, measured, and the frame is a line laid inside the bar's edge rather
than a border added round it. A border was tried and thrown away — it would have
squeezed the inside of the bar, which is where your hands and the cycle shades are
placed, and an inner shadow was no better because those same shades are painted over
it.

**The ruler is at the back and the markers are over it, as you asked.** Since v165
the lines were drawn as a layer of their own on top of everything. They are now the
paper's own ruling again — the surface the bars are drawn on — and every bar is a
wash over it rather than a solid block. The bar is 72 parts in 100 opaque, which is
the "some degree of transparency" you asked for: enough that the clock reads through
it, not so much that the day looks faded.

**What that cost, honestly, and what was done about it.** A line seen through a bar
loses about a quarter of its strength, because the same wash covers both the line
and the paper beside it. Left alone, the ruler would have gone faint again — and
faint is the fault you reported twice. So both lines were drawn heavier: the hour
line at 60 parts in 100 of full strength where it was 34, and the finer grid at 45
where it was 20. Measured through one of your batch bars, the hour line now differs
from the bar beside it by 29 parts in 255 and the grid by 22, against the 20 that
your own v166 rule demands. The honest other side of that: on the bare paper between
the bars the ruling now reads about twice as strong as it did at v168. That is the
price of drawing it behind the markers, and it was paid deliberately.

**And no line crosses a label.** Your B-numbers and the name of the person on a
stretch of their day are laid above the frame, so thickening the frame cannot put a
line through a number you have to read.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or saved
scenario changed, and nothing here blocks a sale or reads an order. Every tap still
opens exactly what it opened before — a batch its Batch card, a cycle its own card, a
person's stretch the hand-over card; the frame takes no taps at all. Your stored
numbers were compared before and after: 13,561 characters, byte for byte the same,
and your three saved days still read 24, 12 and 24 pans.

**Three rules now stand on it, and every one was proved rather than assumed.** One
says the ruling is the paper's own background and that no second copy is drawn over
the markers — two grids, one in the gaps and one across a bar, is how a reader ends
up seeing two different grids. It also pins the transparency to one number declared
once, so the modules window and the people's window can never be tuned apart. One
says every batch bar and every person's slot wears a frame in the tone its own hands
or card already wear, and that no bar grew a border or a shadow of its own. One is
the arithmetic above: measured, not trusted, that both lines still differ from a
marker by at least 20 parts in 255. Each was proved by putting the fault back and
watching it fail by name, then restored exactly as it was. Five faults were put back
in all, and one of them is the point of the whole release: with the grid's ink back
at v166's strength, the test fails reading "differs from the marker beside it by only
9.8 parts in 255, which is invisible on a phone — the fault she reported twice at
v165 and v166". The tests are 1,201 passing with none failing.

**No database step.** Not one stored field is added or changed, so there is nothing
to run in Supabase.

__Softened at v170:__ the frame described above went in at a line one and a half
pixels wide and at full strength, and you reported it as "the border look like over
emphasized". It is now a one-pixel line laid down at 55 parts in 100, in the same
colour as before. Read the v170 entry above for the rest.

**23 Sep 2026 — engine v168 (no database step). The extra slider between your two
chart windows is gone, so each window's own sideways bar is the pan. The modules
window is taller. The "People at once" row is out of the people's window, and an
overlap is still shown in red. All inside More → Scenario planner.**

**What you asked, in your own words.** First: "since the both windows have their
own slider, additional slider is redundent. Remove that" — so the slider that sat
between the two windows is removed. What you asked for when the two windows were
built still stands and is untouched: the two windows stay in step, so any minute is
in the same place on both, whichever one you drag. Then: "can you increase the
modulle window further?" — the modules window is taller. And: "im thinking of
remove the people at once?", settled by "you can just show when there is
overlapping highligt in red box, like previously have" — the row is out, and the
overlap is still shown in red.

**The extra slider is gone, and the two windows still move as one.** Measured on
your day at a phone's width, 375 by 812: nothing sits between the two windows any
more but their own two edges — the chart is the modules' window and the people's
window, in that order, with nothing in between. Dragging one window's day sideways
moved the other to the same pixel, and the window under your finger took no write
back at all, so a drag is never fought by the window that is following it. On the
two windows being able to reach the same place: they could not quite, and it was
one pixel. The ruler's last hour sits at the very end of the day, and its line was
being drawn one pixel past it, which made the modules window 2,461 pixels wide
against the people's 2,460. Both windows now read 2,460 and both pan to 2,139. That
last hour's name is also written to the left of its own line now, where a ruler
with an end on it has always put it, and it reads in full inside the day —
measured, all 25 of the ruler's names sit inside the day, the last of them ending 3
pixels short of its end.

**The modules window is taller, and here is exactly what that buys.** It takes the
larger half of the chart's ceiling now: 64 of the 84 parts where it had 50 of the
80, and 590 pixels where it had 470. On your phone at 812 tall this changes nothing
you will see — your day's modules already fitted the window exactly (403 pixels of
modules in a window that was already wide enough for them), so the taller window is
room there rather than a difference on your screen. Where it shows is a shorter
screen: at 667 tall the old window held 333 pixels and made your day scroll, while
the new one holds 427, so your whole day sits in front of you with nothing to
scroll. It is also the room the next two module rows will need as you add them.

**The "People at once" row is out of the people's window.** You were right that the
day already says it without that row. An overlap is still shown in red, in the
places that were already saying it: the red outline on the colliding bar in the
people's window, the colliding stretch of that person's own row, the red line in
their card, and the collisions written out in words under the diagram — "two jobs
at once", or how many. Nothing about an overlap is hidden by the row going, and it
is one line to bring back when there is a second pair of hands to weigh up.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. No bar
changed colour, and every tap still opens exactly what it opened before — a batch
its Batch card, a cycle its own card, a person's stretch the hand-over card. Your
stored data was compared before and after: 13,561 characters, byte for byte the
same, and your three saved days still read 24, 12 and 24 pans.

**Four rules now stand on it, each proved load-bearing rather than assumed.** The
ones from v167 still hold, with the slider's part of them narrowed to what is left:
the two windows are adjacent with nothing between them, and a drag on either moves
the other while the window under the finger takes no write back. Three are new. One
asserts that the "People at once" row leaves nothing on the chart while a collision
is still marked in red. One asserts the ruler's last name is drawn inside the day,
and that the ruler's own track clips, so the two windows cannot disagree by even a
single pixel. One asserts the modules window holds the larger half of the chart's
ceiling, 64 of the 84. Every one was proved by putting the fault back and watching
it fail by name, then restored byte-identically.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

**23 Sep 2026 — engine v167 (no database step). The day chart is now two windows
sharing one horizontal slider — the process above, the people below, one ruler's
lines down both — and the blank space under your people's rows is gone. This
release also carries two smaller faults you reported while it was being built.**

**What you asked for, in your own words.** First: "the window for person stay
over size", which you confirmed means the empty space under the people's rows.
Measured at a phone's width, 375 by 812: the chart was one window, fixed at 650
pixels tall, the day's own content was 473, and your people's rows ended at 457 —
so 177 pixels of empty window sat under them. Then your proposal, which was better
than a tweak: "instead of consider then one window, why not create 2 windows, and
let the ruler sync in the 2 windows. As the business grows, the persons will
grows, processs might not, we need to have a better way to manage, what you say?"
And on how the two should sit: "can the 2 window share the horizontal slider,
place between the 2 windows, make the 2 windows as close as possible", with the
slider going straight into the people's bars underneath it.

**What is on the screen now.** Two windows, one above the other, with a single
slider lying between them and touching both — measured gap of 0 pixels either
side. The upper window holds the clock and every module, batch and cycle; it
scrolls up and down on its own when you add more modules. The lower window holds
your people's rows and nothing else, and it scrolls on its own too, so as your
people grow the second window grows and the first one does not have to. The
ruler's lines reach down both. The slider between them is the only horizontal
control: drag it, and both windows move together; drag either window's own day
sideways, and the other follows and the slider follows with it. Measured on your
day at 375 by 812: the slider reads a travel of 2,139 pixels, a drag on one
window moved the other to the same pixel, and the window under your finger
received no write back at all — the echo is dropped rather than sent, which is
what would make a phone stutter mid-drag. On a day short enough to fit, the
slider dims and cannot be dragged, because a control you can grab that does
nothing reads as a fault.

**The blank space.** It is gone. The chart is no longer forced to a fixed 650
pixels; it is now exactly what its two windows need. Measured on your day: upper
window 403, slider 20, lower window 70, totalling 493, with your people's last row
sitting exactly on the window's floor — 0 pixels of empty window under it, where
there were 177. The height ceiling from v157 survives as a ceiling: the chart is
never taller than it was, it is only allowed to be shorter when your day is
shorter.

**The first of the two smaller faults: a deleted saved day left its name on your
card.** In your words: "why the deleted scenario stil listed?" You were right, and
it was reproduced rather than explained. Deleting "My sister proposal 21/9/2026"
left the card still offering "＋ My sister proposal 21/9/2026 · Mix by hand, no
chiller", dressed exactly like a day still saved, while your storage held only
two. The cause was that the card offered each ready-made day by name whenever that
name was not in your list, so deleting one put the name straight back. Now the
card offers one plain row, "＋ Add a ready-made day", which names nothing; opening
it lists whichever ready-made days you do not already have, and one tap puts that
day on your own list, where it is yours to change like any other. Proven live:
after deleting that day the card named it nowhere, and the chooser handed back
exactly that one day.

**The second: on a computer, a person's name card was cut.** Hovering a person's
name on the chart opens a card of what they do that day. In the new lower window
that card was taller than the window it opened into — measured 180 pixels of card
inside a 69-pixel window, 96 pixels of it below the window's own bottom, with no
scroll position that could show it whole. It is now laid on the screen rather than
inside the window, so it reads in full wherever the name is, and it is pulled back
from the screen's edges rather than running off them. The "People at once" row's
card, which sits in the same window, is placed by the very same function, so the
two rows cannot behave differently. Measured on a computer at 1280 by 900: both
cards fully on the screen, with 8 pixels to spare at the foot.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. No bar
changed colour, and every tap still opens exactly what it opened before — a batch
its Batch card, a cycle its own card, a person's stretch the hand-over card. Your
stored data was compared before and after: 13,561 characters, byte for byte the
same, and your three saved days still read 24, 12 and 24 pans.

**Three rules now stand on it, each proved load-bearing rather than assumed.** One
asserts the two windows are adjacent with the slider between them, and that a drag
on either moves the other and the slider while the window under the finger takes
no write back. One asserts that a ready-made day you have deleted leaves no name
standing on your card, with the offer row itself excluded from the check. One
asserts that both a person's card and the tally row's card are placed beside their
name and pulled back from the screen's edges. Every one was proved by putting the
fault back and watching it fail by name, then restored byte-identically.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

__Added at v168:__ the single slider shared by the two windows, described above, has
since been removed — each window now carries only its own sideways bar, and the two
still move as one. Read the v168 note at the top of this file for what is on the
screen now.

**23 Sep 2026 — engine v166 (no database step). The ruler's lines are now drawn
strongly enough to be seen on a phone — including across your batches, your cycles
and your people's occupied slots.**

**What you reported.** In your words: "At ver165, you still fail to reveal the
ruler at person's time slot". You were right, and this release is that same
fault finished rather than a new idea.

**What v165 got right, and what it got wrong.** v165 did draw the ruler over the
bars — that part worked, and it is untouched. What it got wrong was the strength
of the ink. The grid line was drawn at about one part in six of full strength, and
over one of your slots it came out as a colour that differs from the slot by about
ten parts in 255 — a hairline the eye cannot find on a phone in normal light. So
the ruler was drawn, and it was invisible, which on a screen is the same as not
being there. That is why you came back with the same words a second time.

**What changed, and it is only the ink.** Both lines are drawn in a strength
measured against the bar they cross rather than against the cream paper between
the bars — the hour line at about a third of full strength and the finer grid at
about a fifth. The lines themselves are in the same places as before, at the same
intervals for the scale you are reading at, and the ruler at the top of the chart
still draws none of them over its own ticks. Nothing moved; the day simply reads
as one ruled sheet now, so the edge of a marker has a line beside it wherever you
look.

**And a line never crosses a label.** Your B-numbers on the bars, and the name of
the person on a stretch of their day, are now laid over the ruling rather than
under it. A gridline drawn through a B2 is a number you have to guess at, and the
whole point of the ruling is to make the day easier to read, not harder.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. No bar
changed colour, and every tap is untouched — the ruling takes no taps at all. Your
stored numbers were compared before and after and are byte for byte the same, and
your three saved days still read 24, 12 and 24 pans.

**About the height of the planner window, which you also raised.** That is not in
this release. You are right that it is a real thing, and what you proposed — two
windows, one for the process and one for the people, sharing one ruler — is the
honest fix rather than another tweak. It is written up as its own piece of work,
so it is decided on its own rather than half-done here.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

__Changed at v169:__ the ruler's lines are no longer drawn over the bars, as
described above. The ruling is the paper's own background again and every bar is a
see-through wash over it, so the clock reads through a marker rather than across it.
The goal is the same one named here — the clock must hold inside a slot you are
working — reached the other way round. Read the v169 note at the top of this file.

**23 Sep 2026 — engine v165 (no database step). The ruler's lines are now drawn
over your batches, your cycles and your people's occupied slots. Before this the
lines stopped dead at the edge of every bar, so inside a slot you were working
there was no ruler at all.**

**What you asked.** In your words: "i requested a ruler to draw into person's line
time slot, maybe you cant visual my complaint". Asked how the lines should reach
that slot, you said: "Just like the ruler draw over the batches and cycles". You
were right that I had not pictured it, so I went and measured instead of answering.

**What was actually happening, and it was worse than "the lines are only on some
rows".** Your person's row did carry the ruler's lines — it has since v160. But
every marker, batch and cycle is a solid coloured bar, and a solid bar sits ON TOP
of the lines behind it. So the ruler vanished wherever a bar was. Measured on your
own day: of one module row's ruler lines, 5 fell inside your batches; of the slots
on one person's row, 14 fell inside them. Every one of the 14 was covered. Pointing
at a ruler line inside one of your slots, the topmost thing on that pixel was the
slot itself. That is why the ruler looked present on an empty stretch of the day
and absent wherever you were actually working.

**And it was the same on the module rows.** So the lines were not reaching over
your batches and cycles either — what you were seeing was them showing in the gaps
between bars, with your eye joining them up. This release makes that true for real
rather than only in the gaps.

**What changed, and it is one thing.** The ruler is now a layer of its own, drawn
OVER the bars — over the batches, over the cycles and over your people's occupied
slots alike. The lines themselves are the same lines as before: the same hour line,
the same step for the scale you are on, at the same positions. Nothing about the
ruling moved; it is only no longer hidden. The whole day now reads as one ruled
sheet, and a slot is ruled exactly like the empty day beside it.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. No bar
changed colour, and every tap on a bar is untouched — a batch, a cycle and a
person's own stretch are still tapped and still open the same cards. Your three
saved days were read before and after: One baker day, No fridge 1 person and My
sister proposal 21/9/2026 each still on the target they had, stored numbers
untouched.

**Two rules were proved load-bearing rather than assumed.** One test now stands on
that there is exactly one ruling — if the lines were ever drawn both under the bars
and over them, the translucent grid would read darker in the gaps than across a
bar. Another stands on that the ruling is drawn at a height above the bars, that it
lets every tap through, and that the ruler's own strip at the top turns it off so
it cannot put lines between the ticks you read the clock off. Each was proved by
putting the fault back: removing the ruling's height made the first fail, and
putting a second ruling back on the track made the other fail.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

__Changed at v169:__ the lines described above are no longer drawn over the bars as
a layer of their own. The ruling is the paper's own background again and every bar
is a see-through wash over it, so the clock reads through a marker rather than
across it. What has not changed is why: the lines must reach into a slot you are
working, and the ruler's own strip at the top still draws none of them over its
ticks. Read the v169 note at the top of this file.

**23 Sep 2026 — engine v164 (no database step). A number you type into the
cycles of a module now stays where you put it. Before this, typing into a second
box put the first box back to what it was when the card opened, while the first
box still showed the number you had typed.**

**What you asked.** In your words: "why some parameter that i save can change by
itself", and then, when I had guessed wrong about where: "it was on stretch and
fold module, the cycle1,2 , loading, unloading. It is not like you explain". You
were right and my first answer was not. I stopped explaining and went and did it
on your own fold module until I could see the number move on its own.

**What was really happening, and it is exactly where you said.** Inside a
module's card there is a list of cycles, and each cycle has its own boxes: the
name, Minutes, Load, Unload. The card does not redraw itself while you type, and
that is on purpose — it was your own instruction at v142, because a redraw would
throw the box out from under your finger. But the code was keeping a copy of the
whole cycle list from the moment the card opened, and every box wrote that old
copy back. So the first box you used was still carrying the numbers as they were
when the card opened, and the moment you touched a second box, the first box was
put back to those old numbers. The screen kept showing what you had typed, the
day behind it kept the old value, and the two disagreed. That is what "changing
by itself" was.

**Measured on your own day, so it is not a theory.** Your fold module runs four
cycles. Cycle 1's Minutes was 31; typing 40 into it stuck. Then touching cycle
2's Unload put cycle 1's Minutes straight back to 31, while the box under your
finger still read 40. The same thing happened on one row: Load 5 stuck, then
typing 44 into the Minutes beside it put Load back to 0 while its box still read
5. Renaming a cycle stuck only because nothing else was waiting to be undone.

**The fix, and it is small.** A box now changes only its own value, on the list
as it stands at the moment you touch it, instead of writing back the copy from
when the card opened. Nothing else in the card can be dragged back with it. The
comment beside the code names your words and the exact numbers above, so the next
person to touch it cannot put the copy back.

**Nothing of yours is rewritten.** Not one module, batch, start time, cycle or
saved scenario changed, and nothing here blocks a sale or reads an order. Your
three saved days were read before and after and compared byte for byte: One baker
day, No fridge 1 person and My sister proposal 21/9/2026 each still make what
they made, their stored numbers untouched.

**A test now stands on it.** It opens your fold module's card, types into cycle
1's Minutes and then cycle 2's Unload, and asserts the first number survives the
second box — the exact fault. It also covers two boxes on the same row, and a
cycle renamed after a number was typed. Proved load-bearing: with the fix taken
back out it fails, reading "the second box she touched put cycle 1's Minutes back
to where it was when the card opened".

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

**23 Sep 2026 — engine v163 (no database step). The clock above your people's
rows has been taken back out. The clock is drawn once again, at the top of the
chart where it has always been, and the ruler's lines still run down through your
people's rows exactly as they did.**

**What you asked.** In your words: "i dont want the clock, i just want the ruler
to draw into person row". That was said after v162 had put a second clock above
your people's rows, so this release takes that second clock back out. Nothing
else about the chart moves.

**The ruler's lines were never the thing missing, and they are still there.** The
lines that run down your people's rows came in v160 and they are untouched: every
row of the day carries the faint grid, so a marker's edge still lands on a line
you can follow up the chart to the top. That is the part you asked for, and it is
the part that stays.

**What comes back.** The chart window is about 35 pixels taller again, because the
block pinned at the foot of the chart no longer carries a clock row inside it. On
your own day at a phone's width the foot block goes back from 105 pixels to 70.

**One rule is kept, and it is worth naming.** There is now a test whose whole job
is that the clock is drawn once and that no clock is ever drawn above the people's
rows again. It was written because the second clock came from a shared builder, so
putting it back is one line - and a thing that can come back by accident should
have something standing on it.

**What has not moved.** Not one module, batch, start time, cycle or saved scenario
of yours changed, and nothing here blocks a sale or reads an order. Your three
saved days are the same three days, each on the target it had, their stored
numbers byte for byte the same.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

The operations guide (section 23) carries the same change, and the tests are 1188
passing with none failing.

**23 Sep 2026 — engine v162 (no database step). The times along the clock are
written a second time, standing directly above your people's rows, so a marker at
the foot of the day can be read without tracing it 368 pixels up to the top.**

**What you asked.** In your words: "why cant you draw the ruler into person's
lines?" I went and measured it rather than answering from memory, because the
answer turned out to be "half of it already is". The ruler's __lines__ have
reached your people's rows since v160 - every row of the day carries the faint
grid, so a marker's edge already lands on a line you can follow up the chart. What
had not reached them is the __clock__: the times written along the ruler, which
lived only at the top of the panel. On your own day the top of the chart stood 368
pixels above your people's rows - the whole height of your eight module rows - so
reading the clock and reading a marker meant looking in two places far apart.
Asked which of the two ways to close that gap you wanted, you chose this one: "yes,
draw the clock above the people's rows".

**The clock is now drawn twice.** Once at the top of the panel where it has always
been, and once more standing directly above the people's rows, inside the block
that is already pinned to the foot of the chart - so it rides the same pin as the
rows it was asked for, and the day scrolling can never leave it behind. The foot
one sits on the first person's row with no gap at all between them, measured on
your own day.

**The two clocks cannot disagree, because they are the same clock.** They are
built by one and the same function, from the same minute, with the same step and
the same labels - so the top of the chart and the foot of it can never say two
different things about where a minute is. Measured on your day at your usual
reading: 97 ticks each, every label the same, and the 8:00 am tick at exactly the
same pixel on both, whether the day is scrolled or not.

**And the foot clock is read exactly as the top one is.** Point at it, or drag
your finger along it, and the same hairline follows with the same reading in the
same words and to the same minute, snapped the same way. It wears a crosshair
under a computer's pointer, as the top one does. Two clocks that look alike now
behave alike; there is no second way to work the foot one.

**What it cost, measured rather than promised.** About 35 pixels of the chart
window. On your own day at a phone's width the block at the foot grew from 70
pixels to 105, and your day still fits inside the window with nothing to scroll -
so those 35 pixels came out of empty space under your bars, not out of your day.
At a wide screen the window is 720 tall holding 705 of content, and the day still
fits.

**One fault was found by testing on the real app, not by a test.** The code that
finds a clock's own track asked the wrong kind of list for the answer, and a real
browser's list does not have that question to ask - so the screen failed to open
at all with "This screen couldn't load", while every test stayed green, because
the test's stand-in list is more forgiving than a real one. That is the standing
lesson about stand-ins, and it is written into the code beside the line so the
next person to touch it cannot repeat it. Fixed, and the tests now cover the
wiring that hid it.

**What has not moved.** Not one module, batch, start time, cycle or saved scenario
of yours changed, and nothing here blocks a sale or reads an order. Your three
saved days were compared before and after: One baker day makes 24 pans still, No
fridge, 1 person makes 24 pans still, and My sister proposal 21/9/2026 makes 4
pans still, each on the target it had, their stored numbers byte for byte the
same.

**What is not in it, so you are not left looking for it.** The other way to reach
the markers - moving the clock times around rather than drawing a second one -
stays available if you ever want it instead. And the per-batch person, letting one
batch go to somebody else while its neighbours stay, is still a release of its own
because it needs a stored field and a one-time step in Supabase.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

The operations guide (section 23) carries the same change, and the tests are 1188
passing with none failing.

**23 Sep 2026 — engine v161 (no database step). Your people's rows are the app's
own white now, and a tap on one of their markers moves THAT STRETCH and nothing
else - the batch it belongs to is untouched.**

**What you asked, and it was two things.** In your words: "I want to have white
background for person's line", and "The reassign job to next person is not whole
day, it is that slot only". Asked what one tap should take with it, you told me:
"we dont change the batch. Say a labour slot belongs to person1, clicking that
slot, will offer to swap it to others, this basically to balance work load".

**Your people's rows take the app's own white.** They wore the cream band that
every soft strip in the app wears, which reads as a highlight sitting under the
markers rather than as the plain paper the day is read against. They are now the
same white as the panel behind them and as every module's name cell, so the foot
of the chart is the same paper as the rest of it. What still marks the block as
the foot of the day is untouched: its own line above it, its own shadow, and the
hairline between one person's row and the next.

**A tap now moves one stretch, not the whole job.** Until this release, tapping a
marker handed over the whole module on that line - every batch of it. Your fold
loop folds three times in one batch, so a tap anywhere near it took three of your
markers with it. That is not what you asked for and it is not what balancing a
day needs. What changes hands now is the single stretch your finger is on: the
one batch, and which part of that batch. Its neighbours stay exactly where they
were, and the batch itself is never touched.

**The card says so before you press it, with the number.** If the batch you
tapped has more than one stretch on that person's row, the card counts them and
says only the one you tapped moves. You are told what is about to happen rather
than finding out from the chart afterwards.

**And what you can hand a stretch to.** The list is the other people who have a
row on this day, named as you have named them - plus "whoever is free". That last
one is not a person; it is what the day does when nobody is named, and without it
a stretch on a module nobody was put on could be handed to somebody and could
never be handed back. Pick it and the press under the list changes to say so,
before you press it.

**Your module's own card keeps up.** A hand-over is now one stretch of a module
rather than the whole of it, so "Who is at this module" is the module's default
and no longer the whole answer. The card now carries a note naming what has been
handed on, and to whom, with the count - so a card reading Person 2 while a
marker of that module sits on Person 1's row cannot happen. On a day where you
have handed nothing over, there is no note at all.

**One thing the earlier note got wrong, said plainly.** v160's entry said that
moving the person on one batch of a module would need a new stored field on the
module and a one-time step in Supabase. The stored field was indeed needed - it
is there now - and the Supabase step was not. Your planner travels inside the
app's own settings record, so nothing had to be run.

**Nothing of yours is rewritten.** The only thing that changes is the one stretch
you hand over with your own press. Your day was read before and after: One baker
day still makes 24 pans, and its one person's row still carries the same 32
stretches across the same clock. No module, no batch, no start time and no cycle
moves by being read, and there is nothing to run in Supabase.

**Measured on the real app rather than assumed.** A stretch was tapped on your own
day and handed over: the toast named the module and the clock, the marker left one
person's row and arrived on the other, and the module's other three batches stayed
where they were. Tapping in a gap still opens that person's own card, exactly as
it always did.

**Measured rather than promised.** The suite is 1187 passing with none failing.
The two tests that stood on the module-level move are now three that stand on the
single stretch - that only the one key is written and the module's own person, its
crew and its times are untouched; that a second hand-over keeps the first; that a
stretch handed back to whoever is free survives as its own answer; and that the
chart puts exactly the tapped stretch on the other row. The app's own More screen
reads Engine v161.

**23 Sep 2026 — engine v160 (no database step). In the Scenario planner, the
ruler's lines now carry on down through the people's markers, and a tap on a
stretch of somebody's day hands that job to another of your people.**

**What you asked, and it was two things.** In your words: "can the ruler extend
down to peoples marker area?", and "can the personX marker be click to change it
job to personY, by a drop down person selector". Asked which way you wanted the
ruler to reach the markers, you chose **a faint grid down every row** - the clock
itself stays where it has always been, at the top. Asked what the tap should do,
you told me: "click on the person's occupied time slot, a drop down list, list
the other people available".

**The ruler's lines reach the markers.** Every row of the day has always drawn a
faint line on the hour, so a marker could be traced up to an hour and no closer.
That grid now carries on down through the module rows and through the people's
rows, so the edge of a marker always lands on a line you can follow up the chart
to the clock. On your day the lines are 36 pixels apart at the widest reading, 24
at the standard one, and 12 and 16 at the two close ones - so the grid you read
a marker against is the ruler's own step everywhere the ruler can be read at all.

**Why the grid has a step of its own.** At the closest reading a single minute is
3.2 pixels wide. A line every 3.2 pixels is not a grid, it is a wash of grey. So
the grid takes the smallest step that is both at least the ruler's own - which is
what makes every grid line also a tick on the ruler, so the two can never disagree
about where a minute is - and at least twelve pixels of your day. The clock strip
at the top keeps its own ticks and is untouched; a module you have switched off
keeps the grid rather than losing the only thing its dimmed bars are read against.

**It costs nothing on the screen.** The grid is painted, not drawn one line at a
time, so your day is exactly as fast to open and to scroll as it was - which
matters, because the ruler alone draws one tick for every minute at the closest
reading.

**Tap a stretch of someone's day and hand it over.** Tap a person's marker on the
timeline and a small card opens naming the job it is about - the module, its line
where it has one, and the clock it runs from and to, in the same words the marker
says under your pointer. Under it is a list of the other people on this day, and
one press - "Move it to ...", named with whoever you picked - hands that job over.
The two rows swap it the moment you press, and anything that now collides is drawn
red, exactly as before.

**What the card tells you before you press it.** A module carries one person for
all of its batches, so if the module you tapped runs four batches on that line,
all four move together - and the card says so, with the number, rather than
letting you find out afterwards. The list offers only people who have a row on
this chart, because somebody who is not standing anywhere on your day is not an
answer the day can give. If you have only one person on the whole day, the card
tells you that instead of opening an empty list.

**The card goes with the job.** The moment you press, the job leaves that
person's row and the card closes with it, so what is left on the screen is the day
as it now stands. A tap on the marker again - now on the other person's row -
opens a fresh card naming whoever holds it. A card left standing would have gone
on offering to move a job off somebody who no longer has it, and the press under
it would have done nothing.

**The tap is read by the minute under your finger, not by the marker.** A person's
marker is 11 pixels tall in a 34-pixel row, and at the widest reading one minute of
work is 1.2 pixels wide - so a fingertip lands beside a job far more often than on
it. The tap takes the whole height of the row, and it takes the nearest stretch of
work within about six pixels, which is what makes the narrow end of the scale
usable at all. A tap where that person is not working is not swallowed: it still
opens the person's own card, which is what every tap on a person's row did before.

**Nothing of yours is rewritten.** The only thing that changes is the one job you
hand over with your own press. No module, no batch, no start time, no cycle and no
saved scenario moves by being read, and there is nothing to run in Supabase - the
whole of this release is drawn from the planner you already have on your phone.

**What is not in it, so you are not left looking for it.** Moving the person on
one batch of a module, leaving its other batches where they are, cannot be done
without a new stored field on the module and a one-time step in Supabase. It is a
release of its own whenever you want it. And a clock repeated above the people's
rows was the other way to reach the markers - you chose the grid, and the other
way stays available.

**Measured rather than promised.** The grid's spacing at each of the four readings,
its reach and the card's own list are all covered by tests, as is the card closing
the moment the job moves: the suite is 1186 passing with none failing, six tests
new for this release and one of those standing on the card going with the job. The
app's own More screen reads Engine v160.

**23 Sep 2026 — engine v159 (no database step). Every card that opens over a
screen can now be pushed aside by its own title bar, and the Scenario planner's
chart window is one fixed height that no longer changes as you add people.**

**What you asked.** In your words: "whenni click on batch to adjust the start
time the pop up windows should be allow to drag" - and then, while I was working
on it: "the chart window became shorter and shorter as no. of people grows. the
window height should be fix".

**What you settled, in three answers.** You asked about the batch card and told
me it should be **every** card, not only that one. You told me the position
should **always reset** - a card opens where cards have always opened, and
nothing is remembered. And you asked for **a faint grip line** on the title bar
so it reads as something to hold rather than something to discover.

**The batch card sat over the very bars it moves.** The card that adjusts a
batch's start time opens over the day it is about, and on a phone it covers the
bars you are deciding between. That is what the drag is for: push it down out of
the way, keep working, and it stays where you put it until you close it.

**It is every card, not only the batch one.** All of the cards that open over a
screen share one title bar, so all of them now move the same way: the batch
clock, a module, a person, an order, a customer, a product, a supplier, a unit
and the rest. A card that looked the same but refused to move is a difference you
would only find by trying it twice.

**A card always opens where cards have always opened.** The drag is a way to push
a card aside while you work - it is not a setting and it is not remembered. Open
the next card and it is where every card has always been.

**The grip is what says so.** There is a short faint bar near the top of every
card's title bar, and the pointer over that bar becomes a hand. Measured, the bar
is 34 pixels wide.

**A card is held inside the screen, and that is deliberate.** A card can be
pushed until its own edge comes close to the edge of the screen, and no further.
This matters more than it sounds. A card that could be dragged past the edge
would hand the screen behind it something to scroll that it never had - and you
could then scroll your own close button off the top, where no finger reaches it.
Holding **the whole card** inside the screen means no button on it can ever be
parked out of reach. On the phone a card is already nearly the full width, so
what you get is vertical travel, which is the direction you want.

**Measured rather than promised.** On your One baker day the batch card for the
mixing module is 337 pixels tall. Dragged down by 300, it moved by exactly 300
and its whole box stayed on the screen, and the screen behind it gained nothing
to scroll. Dragged by 900 - far further than a finger can reach - it moved by 8
pixels and stopped, because 8 pixels is all the room it had. A module card,
784 pixels tall, moves 8 pixels; a person card, dragged 2000 pixels across and
down, stopped with its whole box still inside the window; a wide card on a phone,
347 pixels wide in a 375-pixel screen, moves 8 pixels sideways, which is all the
room it has. A drag on the card's close button is a press on that button and
nothing else: measured, the card does not move and the cross still closes it.

**The buttons keep working after a drag.** Pressing the plus-five-minutes button
on a batch card that has been dragged aside moves the batch and leaves the card
where you put it - the card redraws its contents without going back to the top.

**A drag on the day itself still scrolls the day.** The title bar asks to be
handled by hand; nothing else on the screen does. Dragging the chart - or the
page - moves the page exactly as it did before, and the page does not move while
you are dragging a card.

**The chart window is one fixed height now.** This is the second thing you asked
for. The panel showing the day used to be a rubber band: its height was whatever
the day's rows added up to, held between a floor and a cap. Measured at 375
pixels with one person it was 473 pixels tall and with a taller people list it
was 648 - so the window grew as you added people, and once it had grown to its
cap the pinned people list at its foot carried on growing into the days above it.
At the same phone size your eight-module day left eight rows of modules visible
with one person and four with a crowd. The panel is now **one height** - 80
percent of your screen, up to 760 pixels - and it does not change whatever you
add. On your phone it is 649 pixels at 375 by 812 and 720 pixels at 1280 by 900.
Your own eight-module day draws 473 pixels inside it, so **all eight module rows
are visible at once**, and even your tallest people arrangement - seven person
rows, which draws 648 pixels - still fits in the window with nothing to scroll.

**Nothing of yours was rewritten.** Your three saved days were compared byte for
byte before and after this release: One baker day, No fridge 1 person and My
sister proposal 21/9/2026 still stand on the targets they had, and not one
module, batch, start time, cycle or saved scenario changed. Nothing here blocks a
sale and nothing here reads an order.

**No database step.** The whole of this is drawn from the scenario already on
your phone, so there is nothing to run in Supabase.

**22 Sep 2026 — engine v158 (no database step). The Scenario planner's people
rows come down to one line each and hold still, everything about a person moves
into a tip on their own name, the "PEOPLE" heading is gone, and the clock ruler
now reaches a single minute where you are zoomed in the closest.**

**What you asked.** In your words: "can i have all the peoples cards noted in
tool tips as well?", "i dont need the PEOPLE title", and "make the ruler
resolution to 1min". Every one of those is below. Where a thing left the screen
you told me where it should go instead: every person's own notes into the tip on
their own name, and the ruler stepped so a minute is drawn where a minute can be
drawn.

**The people rows are one line each, and their height can no longer move.** A
person's row used to print its own notes as text on the row - how much work they
are carrying, how many places they have to be, and a red line when two of their
jobs collide. That made it the only part of the chart taller than the bars beside
it, and the only part that changed height as you worked: measured at 375 pixels,
a row was 56 pixels on a clean day and 70 pixels when someone had a collision, so
the whole strip measured 91 pixels one moment and 105 the next. **The strip sits
pinned at the foot of the window**, which is what you asked for at v154 - and a
pinned block that grows and shrinks as you scroll is a block that moves the very
thing you are reading it against. The notes have left the row, so a person's row
is **35 pixels** now, **on a clean day and on a day with a collision alike**, and
the strip measures a flat 70 pixels either way. Those 35 pixels are what the row
is: the same name cell the modules wear, and nothing else.

**Everything about a person is in the tip on their own name.** Point at a
person's name on a computer and their own box opens beside it, carrying all of
it: who they are (the whole label, including " (with 2, 3)", which the row
shortens), how much work they are carrying, how many places they have to be, the
red collision line in the words it already used, and **What they do today** -
their jobs, each with its clock, up to six of them and then a count of the rest.
It is the same list their own card carries, from the same builder, so the tip and
the card cannot drift apart and say different things. The tip opens from the
**title** alone, exactly as the module tips do since v156: pointing anywhere else
on the row does nothing, and the tint that used to follow the pointer across the
whole row is gone. That was your own v156 instruction - "only the note should
shot as a too tip" - now applied to the last rows on the chart that had not had
it.

**Told rather than hidden: the tip is bottom-anchored, because the last row sits
on the bottom edge.** A module tip is centred on its row, which is what keeps a
first or a last module's box off the edge of the window. The people strip is
different - its last row **is** the bottom edge - so a centred box would be cut in
half. A person's tip now sits on its row's own bottom line and grows **upward**
into the day. Measured at the window's tightest, on a person with a collision and
six jobs, the tallest possible tip is 196 pixels tall and it clears the clock
strip above it with room to spare.

**The widest-person trap, measured rather than promised.** A person's tip is
taller than a module's, so its lines have to be allowed to fold - and a folding
box inside a 156-pixel name cell collapses to the width of its widest single
word: measured live at 66 pixels wide and 923 pixels tall, one word to a line.
The box is now told to be as wide as its own content, and the rule carries a note
saying why, because the fault looks like a styling detail and is not. Measured
after: 272 by 180 pixels, sitting on its row's bottom line, inside the window.

**The "PEOPLE" heading is gone.** It named what every row under it already names -
each one wears a person glyph - so the strip is now its rows with nothing over
them. The strip keeps its line and its shadow, so it still reads as the foot of
the day.

**The tally row's three facts are in its own tip, and on a phone they are
unreachable.** The **People at once** row is the one you asked for: the most hands
the day needs at once, the busiest stretch by name, and the minutes paid for
twice. Those three facts are printed nowhere else in the app, and that row has no
tap of its own - so once they are in a tip, a phone has no gesture that can open
them. **You chose this, with the consequence in front of you** ("tip only, no
card"), and it is written here rather than left to be found: on your phone those
three facts are now unreadable. On a computer nothing is lost. Giving that row its
own card is one line whenever you want it, and this note is the place that says
so.

**The collision is not lost by the row giving up its red line.** Under the day
there is still a note for every collision, in full: who it is, **two jobs at once**
with the minute it happens, both jobs named on lines of their own, and the
sentence saying what to do about it - move one along the day, or combine with
another person and accept it. The red outline on the bar itself is unchanged. So
the row's red line leaving costs nothing you were reading.

**The ruler now reaches a minute where a minute can be drawn.** The day is drawn
at four scales, from 1.2 to 3.2 pixels to a minute, and a minute hairline is
physically undrawable at the two wide ones - so the tick step follows the scale, which is
what you chose ("a minute where it can be drawn"). **Wide** ticks every 30
minutes, 36 pixels apart, which is the ruler you had. **Standard** ticks every 15
minutes, 24 pixels apart. **Close** ticks every 5 minutes, 12 pixels apart. And
**Closest** ticks every **single minute**, 3.2 pixels apart. The hour is still
solid and labelled at every one of the four, and the half hour
is still the dashed tick it always was - the one you judge a 15-minute pass by.
Everything finer is a new thin hairline at reduced weight, so a ruler at Standard
does not read as a ruler made of dashes. The count is honest: at Closest your
24-hour window draws 1441 ticks, and a full redraw takes 2.8 milliseconds against
2.3 at Wide - half a millisecond for the lot, so the ruler is drawn as elements
rather than as a painted pattern.

**And the cursor reads the exact minute.** The hairline that follows your pointer
down the day used to snap to the five minutes a batch's buttons step by. That was
stricter than the screen it reads: a batch can be nudged by **one** minute, so the
cursor could not name a time the chart was already able to set. It reads to the
minute now - measured, a pointer 101 minutes into the day reads **5:41 am** where
it used to read 5:40 am - and it still refuses to name a time outside your day,
and still hangs its label to the left at the far end of the evening.

**What has not moved, measured rather than promised.** Your three saved days were
compared before and after: **One baker day** still reads 24 pans across 8 modules,
**No fridge, 1 person** still reads 24 pans, and **My sister proposal 21/9/2026**
still reads 4 pans, each with the target it had. Their stored numbers were
compared byte for byte and are untouched - the whole of this release is drawn from
the scenario already on your phone. Nothing here blocks a sale and nothing here
reads an order.

**No database step.** Not one stored field is added or changed, so there is
nothing to run in Supabase.

CHANGELOG and the guide (section 23) both carry all of this, both PDFs rebuilt and
read back, the app's own More screen reads Engine v158, and the tests are 1174
passing with none failing - eight of them new: that no person row prints its own
notes and the tip carries them all, that the tip and the person's own card agree
word for word, that a collision changes nothing about a row's shape, that the tip
is a sibling of the name and not inside it, that the two tip rules both survive as
file text, that the tally's three facts are in its tip and off its row, that the
"PEOPLE" heading is gone, and that the ruler's step follows the scale at all four
stops.

**22 Sep 2026 — engine v157 (no database step). The Scenario planner's list of
controls is much shorter and the modules window is taller: the module tags have
moved into the tip, the scale is two presses around the stop it is on, the people
are one box, and "The line" has left the row for the module's own card.**

**What you asked.** In your words: "i want to make the modules window taller. The
module tag, can you put them in the tip tips? Make the scale with+ -, People:
make it drop down option, The line: this name is very unclear,, we just need the
button, WORK BACKWARD. The idea is to make this list shorter and make room for a
bigger modules windows." Every one of those six is below, and where a thing left
the screen you told me where it should go instead: every tag into the tip, the
line's own settings into the module's card, and the two paragraphs above the
chart removed.

**Two paragraphs left the day.** The two sentences that used to stand between the
"The day" heading and the first bar are gone: the one teaching how to read the
chart, and the one naming the moment your day hangs from. At 375 pixels they
measured 330 pixels between them, 210 and 120, and they were the whole of what
you scrolled past before you reached a bar. With them gone the first bar sits 278
pixels below the heading where it sat 707. Nothing is lost by it: how to read the
chart is section 23 of the operations guide, and the button that moves the day
now says its own name in the row under the chart, so the move is still findable
without a sentence pointing at it.

**The modules window is taller, and now it fits.** The window has a floor of 500
pixels and a cap of 760 where before it had only a cap of 560: the floor is what
makes it a window rather than a box that resizes itself every time you edit a
module, and the raised cap is what lets a long day use the room the rest of this
release gave back. On your seeded day at 375 pixels the window is 616 pixels tall
where it was 536, and the day's own drawing is 616 — so before this release the
window hid 80 pixels of your day and now it hides none of it.

**The tags are off the row and into the tip.** Every tag a row used to wear is
gone from the row: how many of a module you have, how many of its lots are in it
at once, whether it waits above, whether it runs itself, and whether you have
asked for more passes than a day holds. Point at the module's own title and the
tags are the first line of the box, joined with a dot, with the two notes under
them. Measured at 1280 wide on your day, the box is 42.6 pixels for the two notes
alone and 58.9 with the tag line, and all nine boxes measured inside the panel
left and right.

**The tip is now taller than the row it belongs to, and here is why that is all
right.** Three lines of tip is 58.9 pixels against a 45-pixel row, so the box no
longer fits inside its own row the way v156's did. What keeps it inside the panel
is that it is centred on its row: half of it goes up into the clock strip's row
above your first module, and half of it goes down into the rows below your last
one. Every tip was measured inside the panel at both ends of the day, and nothing
on the chart moves while one is open.

**The scale is two presses.** The four stops are kept exactly as they were, with
the same pixels behind them: Wide, Standard, Close, Closest. What changed is that
they are no longer four buttons. There is a round minus and a round plus, and the
stop you are standing on is the word between them, so you can see where the dial
is without opening anything. At either end of the dial the press that would go
past the end is off rather than doing nothing when you tap it.

**The people are one box.** Three chips became one drop-down. What the box says
when it is closed is the arrangement in force right now — Sharing them out, One a
module, One to a line, Your own, or Combined when you have combined two people
yourself — so the box names what it has done rather than hiding it. The four lines
inside it are the arrangement in force and the two things it can do to your day,
One a module (a person for each job, one job each) and Share them out (as few
hands as can cover the day), and Combine two people on the end.

**"The line" left the row, and its name with it.** You said the name was unclear
and that its place is the module's own card, and it is there now. The control row
reads Scale, People, Walk the day and nothing else. On the module's card, under
the words **Waiting on the module above**, is the same sentence the old card
opened with — which of your modules wait on the one above, by name, and which keep
the times you placed — and the same two presses it always offered, Chain every
module and Take the waiting off. One module's own three answers, As the one above
finishes, Never before the one above finishes and Its own time, are untouched and
still on that same card, which is where they have been since v154.

**The button alone.** You said we only need the button, so the label that used to
stand beside it is gone. It read "Your day backwards · first batch out 9:09 am",
which at 375 pixels wrapped to two lines: 54 pixels of a phone screen spent
explaining a button that already says what it does. What is left is the button,
**Work the day backwards**, in the row under the chart.

**What the row came back to.** At 375 pixels your control row is 222 pixels tall
where it was 305, so 83 pixels came back to the chart. Together with the two
paragraphs that left and the taller window, the run from the "The day" heading to
the first bar is 278 pixels where it was 707, and the day itself is not scrolled
to at all: the window is 616 and the drawing is 616.

**Nothing on a phone is left without a way to read it.** A tip opens where there
is a pointer that can hover at things, and a phone has not got one — measured at
375 pixels with a touch phone emulated, no tip opens at all. Everything a tip
carries, the tag line and the two notes, is written out word for word at the top
of the module's own card, in the row's own tag colours, and that card is what a
tap on the row has always opened. There is nothing new to learn and nothing new
to find.

**What has not moved, measured rather than promised.** Your three saved days were
compared before and after this release. One baker day still reads 24 pans across
8 modules, its first batch out at 9:09 am and its day finishing at 1:30 pm. No
fridge, 1 person still reads 24 pans. My sister proposal 21/9/2026 still reads 4
pans. Not one module, batch, start time, cycle or saved scenario of yours changed
in this release. Nothing here blocks a sale and nothing here reads an order.

**No database step.** The whole of this is drawn from the scenario already on
your phone, so there is nothing to run in Supabase.

The app's own More screen reads Engine v157. The tests are 1166 passing with none
failing, eight of them new: that no tag is left on any module row and that every
tag the tip carries is the same tag the module's card carries word for word, that
a module you have two of is carried the same way, that the taller tip is still
held inside the panel it is drawn in, that the scale is exactly two presses
around the name of the stop it is on and that each press is off at its end of the
dial, that the people are one drop-down whose closed text is the arrangement in
force, that the line's own group has left the control row for the module's card,
that the window is taller and wider-capped and the two paragraphs above it are
gone, and that the day-backwards group is the button and nothing else.

**22 Sep 2026 — engine v156 (no database step). The module's notes now open as a
tip over the day when you point at its title, and the row keeps its height while
you read them.**

**What you asked.** In your words: "i prefer not to expend the module with mouse
hoover. Remain the height. When mouse hoover to the module title, only the note
should shot as a too tip." That is a correction to v155, and it is a fair one:
v155 brought the notes back by making the row taller, which moves every row below
it the moment you point at it, so the bar you were reading is no longer where you
left it. Reading a number should never move the thing you were reading it
against.

**The tip, and where it comes from.** Point at a module's own title and its two
notes open in a small box beside the name: the time the module starts and how
many batches it runs, then what a batch costs in minutes and in your own hands.
It is drawn over the day rather than in it, so nothing on the chart moves while
it is open - not the row it belongs to, and not one row under it. Point away and
it is gone.

**Measured rather than promised.** On your One baker day, with the tip open on
the mixing module, the row reads 46 pixels before and 46 pixels after, the row
underneath starts on the same pixel it did, and the day's own total is 527 pixels
either way. The box is 43 pixels tall, which is inside the row it belongs to -
that is deliberate, because it means a tip on the first or the last module of a
long day cannot be cut off by the edge of the panel. The whole box measured
inside the panel on the first module and on the last one.

**Only on a computer, and only on the title.** The tip opens where there is a
pointer that can hover at things, which a phone has not got: on your phone
pointing is a finger and a finger is a tap. There the notes are written out word
for word at the top of the module's own card, which is what a tap on the row
already opens, and that is unchanged from v155. Pointing at the row anywhere
other than the title does nothing, because you asked for the note and not for the
row to react.

**What has not moved.** Everything v155 did to the row is kept: a row is still
exactly as tall as the bars it draws, the name still takes the row's first line
with the badges on the line beneath, the name column is still 156 pixels, and
your whole day still fits the window. Your three saved days were compared byte
for byte before and after: One baker day still reads 24 pans across 8 modules
with its first batch out at 9:09 am and its day finishing at 1:30 pm, No fridge,
1 person still reads 24 pans, and My sister proposal 21/9/2026 still reads 4
pans. Nothing here blocks a sale and nothing here reads an order.

**No database step.** The tip is drawn from the scenario already on your phone,
so there is nothing to run in Supabase.

This change history and the operations guide (section 23) both carry all of
this, both PDFs rebuilt, the app's own More screen reads Engine v156, and the
tests are 1158 passing with none failing - one of them new: the tip is off the
row, laid out absolutely so the row cannot grow, centred on the row it belongs
to, opened by the title alone, and its two lines are held to a height that fits
inside a row.

**22 Sep 2026 — engine v155 (no database step). Every module row is now as tall
as its own bars, so your whole day fits the window with no scrolling; the two
note lines come off the row and come back when you point at it on a computer,
and they are always written out on the module's own card.**

**What you asked, and you were right.** In your words: "The window for scrolling
module became too small, why not reduce the height of each module, the notes can
just shown up upon mouse hoover." You were right that the rows were too tall,
and the cause was not the bars. On your One baker day the eight module rows
measured 912 pixels of drawing inside a window about 536 pixels tall, so only
about four of them could be seen at once and the rest had to be scrolled to. The
bars themselves need only 45 pixels; it was the words beside them that made the
rows tall. The name column is 138 pixels wide, and a name like The rests and the
stretch and folds wraps to seven lines in it, with each of the two note lines
wrapping to two more.

**Every module row is now the height of its bars.** A row measures 46 pixels on
its own day, and the whole of it - the clock strip at the top, your eight
modules and your people at the foot - now measures about 502 pixels inside the
527 the window gives it, so the day is read in one look and nothing is scrolled
to. Every number in it is the number it was.

**The two notes leave the row, and two things bring them back.** On a computer,
pointing at a row brings both notes back and tints the row, and the row grows
taller to hold them rather than covering what is beside it, so a note is never
cut in half. On your phone there is no pointing, so a reveal that needed one
would be a reveal your phone could never reach; the notes are written out
instead at the top of the module's own card, which is what a tap on the row
already opens. Nothing new to learn and nothing new to find. On your mixing
module the card now opens with what the row used to whisper: the time it starts
and how many batches, then what a batch costs in minutes and in your own hands.

**The name takes the row, and the badges drop below it.** This was the real
damage of the old row, and it is worth naming. Your longest module name is 273
pixels wide, and it was sharing its line with a small badge, which left just 35
pixels of the name to read - about two words of it. The name now has the row's
first line to itself and the badges sit on the line beneath, and four of your
eight module names now read whole where one did before. The name column is 18
pixels wider as well, from 138 to 156, which is the difference between one and
three more of your names reading whole. A name still too long for the row is
shortened with three dots, and the whole of it is on the module's card and under
the pointer on a computer.

**A fault found while building it, worth naming.** A module drawn as two
production line and set to wait on the module above it could not be drawn at
all: the drawing asked for the waiting badge's words in a place where they did
not exist, and that is not a blank space, it is an error that stops the screen.
Two taps on your own module card would have found it. None of your saved modules
is drawn as two production line, which is the only reason you never met it. It
is fixed, and a test now stands on it so it cannot come back.

**What has not moved, measured rather than promised.** Your three saved days
were compared byte for byte before and after this release. One baker day still
reads 24 pans across 8 modules, its first batch out at 9:09 am and its day
finishing at 1:30 pm. No fridge, 1 person still reads 24 pans. My sister
proposal 21/9/2026 still reads 4 pans. Not one module, batch, start time, cycle
or saved scenario of yours changed, and the change is in how a row is drawn, not
in what any row says. Nothing here blocks a sale and nothing here reads an
order.

**No database step.** The row is drawn from the scenario already on your phone,
so there is nothing to run in Supabase.

This change history and the operations guide (section 23) both carry all of
this, both PDFs rebuilt, the app's own More screen reads Engine v155, and the
tests are 1157 passing with none failing - three of them new: one on the notes
being carried by the row and printed by the card, one on the name taking its own
line ahead of its badges, and one on the module drawn as two production line
that waits on the module above.

**22 Sep 2026 — the documents, not the app (no engine version, no database
step). The guides and this change history print their own italics now, so the
stray asterisks are gone.**

Every one of these documents is built from a markup in which one asterisk on
each side of a word means "print this in italics". The builder stopped
understanding the single asterisk at some point and reads only the pair, so a
word meant to lean quietly came out wearing its own asterisks instead:
__'why no button for work backward'__, __Cutting and packing__, __status New__.
Not one sentence read wrongly, which is why it went unnoticed for so long.
There were 116 of them in this change history, 44 in the operations guide, and 9
more across the money and profit guide, the alert guide and the safety guide.
All of them now use the pair of underscores the builder does understand, so they
print as the italics they were always meant to be.

The asterisks that were meant to be read stay exactly as they are: the one
marking a required field on the order form, and the fill-in lines on the weekly
note sheet. Those are marks, not markup.

Nothing in the app changed. More still reads Engine v154, every screen is
exactly where it was, and no test moved. All five documents were rebuilt and
read back to check: this change history prints no asterisk at all now, and the
only two left in the operations guide are the two that are meant to be there.

**22 Sep 2026 — engine v154 (no database step). A module now says how it takes
its start — three answers where there was one switch — so the packing begins the
minute the cooling ends; every batch's own card offers the move again; and the
people's rows are held below the modules so you can read a slot against them.**

**What you asked.** Your three reports, in your own words: "the cut and packing
batch din follow the earlier batch end", and then your own correction, "cutting
and packing sit below cooling down, so cutting and packing batch start should
follow cooling down batch end". "The delta t disappeared, before this we have it.
I want each batch start time to be adjustable, like the 1st module. Just need to
show delta on the batch 1st offset only, then following module of that step dont
have to show the delta because it follow the previous module tightly." And "I
want to freeze the persons card, so that by scrolling thru modules i can see
exactly where that slot of that person tie up to and searching for opportunity to
move some batch start time to reduce the number of person needed." You also set
the rule the first of them had to be built by: "the behaviour has to base on
configuration, not a hard wired".

1. **What was actually wrong, and it was words against behaviour.** The old
   switch was called **Waits for the module above**, and its hint promised a
   follow — __2nd module 1st cycle should follow 1st module 1st cycle
   completion__. What the day really did with it was a **floor**: a batch could be
   pushed later than the module above, never pulled back onto it. So a packing
   step sitting 8 minutes after the cooling ended could never come back onto it,
   however the switch was set. Your report was right and it was the most useful
   kind: the sentence on the card and the arithmetic under it disagreed.

2. **A module now says how it takes its start, in one of three answers.** Open
   any module and the card asks **How this module takes its start**, with three
   choices: **As the one above finishes** (batch 1 of this module starts the
   minute the module above finishes its own batch 1, batch 2 on batch 2 — a tight
   follow with no gap); **Never before the one above finishes** (a batch here can
   never start before the module above has finished that same batch, but a later
   time you set yourself stands — this is the old switch, kept exactly as it
   behaved); and **Its own time** (the module above has no say over this one).
   Each one carries a sentence saying what it means before you tap it.

3. **The choice is on the module, not on a module's name.** This was your rule and
   it is the way it is built: nothing in the day knows a module by what it is
   called. Set **As the one above finishes** on your packing and it lands on
   whatever really sits above it — cooling, or anything else you put there, in
   whatever order you keep your modules. There is a test that renames every
   module of a day and confirms the same answer, so this cannot quietly become a
   rule about cooling.

4. **Nothing of yours was re-laid by being read.** A saved module keeps the
   behaviour it already had: a module that was waiting on the one above it opens
   on **Never before the one above finishes**, and a module that stood on its own
   opens on **Its own time**. A **new** module arrives on **Never before the one
   above finishes** too, because **As the one above finishes** on a module you
   have not yet told what feeds it would move your day the moment you added it.
   Your three days were compared before and after: 24 pans on One baker day,
   12 on the seeded line, 4 on your sister's, and not one start time of yours
   changed.

5. **Every batch's card offers the move again — this is your second report.** A
   batch below batch 1 of a module set to wait used to be **refused** the two
   button pairs, with a sentence telling you to go and change the module instead.
   Every batch at every module now offers **Five minutes at a time** and **One
   minute at a time**, and the last paragraph of this note says plainly what a
   move means in each place so the two cannot disagree.

6. **The offset is read out on batch 1, and only on batch 1 — exactly as you asked
   for it.** On batch 1 of a module that is not the first, the card reads how this
   module takes its start, in words: **follows the module above**, **never before
   the module above**, or **on the line**. The batches below batch 1 do not repeat
   that, because they ride the module above at this module's own pace — there is
   no offset of the module's to read on them. A batch you have **held** on purpose
   is the exception, and it is a deliberate one: it reads **delta t = +5 min** on
   its own card, because a batch that is off the line must never look like one
   that is on it.

7. **A move below the first module is a hold, and a hold can only ever put a batch
   later.** That is not a limitation of the buttons: a batch cannot start before
   the dough it is made of exists. What makes it safe rather than a wall is that a
   hold is an **offset measured from where the line puts the batch**, not a time —
   so move the module above it, or change how many batches it runs, and the held
   batch comes with it, keeping its place in the queue. The card of a held batch
   carries **Back onto the line**, which takes the hold off, and taking a hold all
   the way off now says so — __Cutting and packing is back on the line__ — where
   it used to say __held 0 minutes behind__, which is a sentence about nothing
   happening.

8. **A press on batch 1 of a module that follows moves the whole module.** A
   module set to **As the one above finishes** has no start time of its own to
   write: it begins where the module above ends, whatever a stored start says. So
   a press there writes the module's own hold instead, and **every** batch of it
   comes with it — which also keeps a press on batch 1 meaning the same thing on
   every module, rather than being a button that appears to do nothing on one of
   them.

9. **The people are held below the modules — this is your third report.** The
   module rows scroll inside the day's own panel and the **People** rows and the
   **People at once** total are pinned at its foot, so scrolling down through eight
   modules never takes the person you are reading away from the bar you are
   reading it against. This is the move the whole report was for: hold a slot in
   view, look for the batch you can move to empty it, then go and move that batch.
   The red now-line of the walk through still runs over the people's rows, because
   that line is the day happening rather than a reading of it.

10. **One fault found while testing, and it is worth writing down.** The test that
    stands in for the browser kept an attribute a real browser also exposes as
    **dataset** — and the chart reads which batch you tapped off that. So every
    simulated tap had been reading as **batch 1**: a whole class of taps the tests
    could not see, which is exactly why "the delta t disappeared" could be true on
    your phone while a test suite said all was well. The stand-in is unforgiving
    now, the way the browser is. Two tests written against it failed immediately
    and both were real: the wording of a hold taken off, and the day's own card
    opening where a batch's card should.

11. **No database step, and it is on every phone.** Nothing to run in Supabase.
    The planner travels with the app's own settings row, so this new per-module
    answer goes up with everything else the planner holds and comes down onto your
    other devices the same way — the choice you make on your phone is the choice
    your tablet reads.

12. **What has not moved.** One baker day still reads 24 pans across 8 modules
    with its four stored rhythm times untouched; the seeded line still makes 12
    with the chiller as the wall; your sister's line still makes 4. v152's
    backwards press and v153's button on the row are unchanged, and neither this
    release nor those reads a single order or blocks a single sale.

The CHANGELOG and the guide (sections 23 and 26) both carry all of this, both
PDFs are rebuilt, and the app's own More screen reads Engine v154. The tests are
1154 passing with none failing — 14 of them new: 8 on the model (the three
answers and how a saved module is read through them, the packing landing on the
cooling's end, the follow being a choice on the module and not a rule about a
name, a switched-off module stepped over, a module above with fewer batches
answering for the batches it has, a hold riding the module above and never
pulling a batch earlier, and her three days reading the same times) and 6 on the
screen (the three pills on the module card, the packing landing on the oven, the
pairs on every batch, the offset read on batch 1 alone, a press on batch 1 of a
following module moving the whole module with its way back, and the people's rows
held below the modules). No database step — nothing to run in Supabase.

**22 Sep 2026 — engine v153 (no database step). The day's own row works your day
backwards — one press, and it is a button that acts instead of one that only
tells you where to tap.**

**What you asked.** Your words: __'why no button for work backward, this is to
reeposition the batches latest start time'__. You were right, and it was about a
control that only talked: v152 put the move behind a tap on one bar and left the
row carrying a chip that named the moment and then told you which bar to tap. A
thing shaped like a button whose whole effect is to send you somewhere else reads
as a dead control, and that is what it was.

1. **The button does the work now.** The row under the chart reads **Your day
   backwards · first batch out 9:09 am**, and the one pressable thing beside it is
   **Work the day backwards**. One press and the day is worked back on the spot —
   no card in the way, the same seven modules pulled to their latest starts, and
   the same message saying what moved and what it cost your hands.

2. **It is the card's own press, not a second one.** Same writer, same words, same
   snapshot, same way back — so the two doors cannot drift apart. Press from the
   row, then open the card on batch 1 of __Cutting and packing__, and the card is
   showing you the day the row just made, with the way back on it.

3. **Pressed on a day already worked back, it says so and writes nothing.** This
   was your own choice and it is the rule the button lives by: a button that comes
   and goes reads as a fault, so it stays in the row on every day. On a tight day
   the press answers __Every module of your line is already as late as it can go —
   there is nothing left to pull back.__

4. **The way back is beside the button that moved the day.** While there is
   something to put back, the row carries **Put my start times back** next to
   **Work the day backwards** — the pattern Stop beside Start already uses. The
   card keeps its own copy, so the undo is either one tap away or three, and never
   missing. It is still one-shot and still lasts only while the screen is open:
   leave the screen and the day you pressed is the day you have.

5. **A line with no chain says so, rather than drawing a dead button again.** A
   day of a single module is not a chain — its first batch is simply that module's
   own start time — so the button is drawn, carries no moment in its label, and
   says in words that there is no module above the last one to work back through.
   The fault you found is the one thing this release refuses to repeat.

6. **The sentence above the chart now names the button.** It used to tell you to
   tap batch 1 of __Cutting and packing__ and stop there, which was the only door
   v152 had. It now names both: the button in the row does it in one press, and
   tapping batch 1 opens the same move with the whole chain laid out before you
   press it, which is the one to read first.

7. **One fault found while building it, and it was in this release's own new
   code.** The undo works off a snapshot of the day kept in the screen's own
   memory and never stored, and v152's card took it from the right place. The row's
   new press first took it from the app's saved state instead, which put that
   snapshot into your data — and a reload would then have offered you a way back to
   a day you had already left. It was found by measuring the stored data after a
   press rather than by reading the code, it is fixed, and there is now a test that
   fails if the snapshot ever reaches your data again. Nothing of yours was changed
   by it.

8. **What has not moved.** Your three shelf days were compared byte-for-byte
   before and after: __No fridge, 1 person__ still reads 24 pans, __My sister
   proposal 21/9/2026__ still reads 4, and __One baker day__ still reads 24 pans with
   the first batch out at 9:09 am and the day finishing at 1:30 pm. A press
   followed by the way back leaves the stored data byte-for-byte identical to what
   it was — measured, not promised — and the snapshot is gone when the screen is.
   Nothing here blocks a sale and nothing here reads an order.

CHANGELOG and the guide (section 23) both carry this, both PDFs rebuilt, the
app's own More screen reads Engine v153, and the tests are 1140 passing with none
failing — five of them new: the row press moving the day exactly as the card
does, a finished day keeping its button and saying it is done, the way back
sitting beside the button that moved the day with the card offering it too, a
line with no chain saying so instead of drawing a dead button, and the one that
pins the snapshot out of your saved data. No database step — nothing to run in
Supabase.

**22 Sep 2026 — engine v152 (no database step). The planner can work your day
backwards — the day hangs from your first batch, and every module gets its latest
start.**

**What you asked.** Your words: __'how to make the calculate backward works?'__ The backward count
already existed on More → Production line (section 24), where it counts back from the minute the
first pans must be at the oven. The Scenario planner had none: it could only ever push a day
later, never pull it earlier. So the planner has one now, on the planner's own day.

**The moment your day hangs from is your own last module, not the oven.** The anchor is the end of
your first batch at the last switched-on module of your line — whatever that module happens to be.
Add, remove or reorder a module and the anchor moves with your line. On your own One baker day that
module is Cutting and packing, so the day hangs from 9:09 am.

**Where it is, and how you find it.** Tap the B1 over the first bar of that last module — the card
you already get by tapping a batch — and it is now the day's own card. It reads the module, the end
of your first batch and your day's finish, then every module with the time it sits at and the time
it could sit at. On your line it reads: Mixing the dough in the tub 4:01 am to 4:43 am, The rests
and the stretch and folds 4:21 to 5:03 am, Oil the pans and weigh the dough out 6:24 to 7:06 am,
Into the proofer 6:39 to 7:21 am, Dimple and top 7:24 to 8:06 am, The proofer again 7:30 to
8:12 am, The oven swap and the bake 8:00 to 8:42 am, and Cutting and packing 8:57 am with a tick. A
tick means that module is already as late as the line allows. So the control is findable rather
than hunted for, the day card also carries a chip reading First batch out 9:09 am with the sentence
saying which bar to tap.

**The rule is measured off your own day, not subtracted from the anchor.** This is the one place I
departed from what I first planned, because the arithmetic was wrong on your own numbers. Counting
backwards is not the sum of the cycle minutes: on your 24-pan line the eight modules' minutes add
to 853 while the chain you actually run spans 1107 minutes, because your modules do not sit end to
end — the fold loop and the proofer are wider than the few minutes a batch takes in them. Take 853
off your anchor and the mix is handed a LATER start than the one it already has, which is the
opposite of what you asked for. So the calculation measures the room between each pair of modules
as your stored times really stand, and pulls each module back by that room. On your line it gives
the mix 4:43 am, and the 42 minutes it gains are the slack your day really has.

**One press, and a second press does nothing.** Pull them back to their latest start moves the
seven modules that can still come later and leaves every other one exactly where it is. A module
that is switched off is stepped over, exactly as the day already steps over one. A press never
moves a module EARLIER than it already stands, and pressing it again finds nothing left to take.

**It is a real change, and the way back is on the same card.** Said plainly rather than quietly:
this rewrites the start times of your switched-on modules and saves them into your scenario. It is
not a preview. So while you are on that screen the card carries a second button, Put my start times
back, which puts every module the press moved exactly where it was and then goes. It is one-shot,
and it lasts only while the screen is open, because it is never stored — the same reason the walk
through's own clock is not. Leave the screen and the day you pressed is the day you have.

**Below that are the same two pairs of buttons you already know, and here they move the whole day.**
Five minutes at a time and One minute at a time, each with an earlier and a later button. Press one
and every module moves together by that amount, so the day keeps its shape: on your line all eight
modules move five minutes and every gap between them is the number it was. That is the move for
reading what an earlier or a later start does to the whole day without re-drawing it.

**A tighter day can need another pair of hands, and the app says so instead of hiding it.** This is
the honest cost of taking the slack out. Squeeze the day to its shortest span and two of your jobs
can land in the same minute, so a press can raise the people the day needs — on your One baker day
from one person to two. Nothing blocks and nothing is refused: the toast reports it in words, the
People area below shows the collision in red, and the button under it takes it back.

**The clock you point with now follows your finger, and the clock strip stays where you can read
it.** Your four asks of that day chart, all in this release. The reading follows the pointer DOWN
the day as well as across it — it used to sit at the top of the chart, which is the right place
only while the top of the chart is on screen, so pointing at a bar four rows down meant reading a
clock a screen away. It rides 8px clear of your finger rather than under it, because a reading
under your own finger hides the bar you are holding it against — and near the top of the chart,
where there is no room above, it drops below the pointer instead.

__Lifted at v171:__ the 8 pixels above your finger described here are two CSS inches
now, because 8 pixels is under a fingertip rather than clear of it. The rule itself is
unchanged and this entry still describes it: above your pointer where the window has
the room, and below it where it does not. Read the v171 entry above for the rest.

The chart is a panel of its own
now: the clock strip is pinned at the top of that panel and the rows scroll under it, so the hours
stay beside the bars you have scrolled to. The panel is capped, so it never grows past what you can
see at once.

**And one fault found while building it.** The red now-line of the walk through was being drawn in
the chart's name column — 138px, about an hour and a half, to the LEFT of the minute it was naming,
because its position was measured when the chart was built and a chart that is not yet on the page
has no position at all. Measured off the clock strip's own column instead, it now stands on the
minute it names. Nothing about the walk through changed except that the line is where it says.

**What has not moved.** Your three shelf days were compared byte for byte before and after: No
fridge, 1 person still reads 24 pans, My sister proposal 21/9/2026 still 4 pans, and One baker day
still reads 24 pans across 8 modules with the first batch out at 9:09 am, the day finishing at
1:30 pm and the stored rhythm of 4:01, 5:28, 6:55 and 8:22 am untouched. Not one module, batch,
start time, cycle or saved scenario changed, because nothing moves except by your own press.
Nothing here blocks a sale and nothing here reads an order.

CHANGELOG and the guide (section 23, cross-referenced to section 24) both carry all of this, both
PDFs rebuilt, and the tests are 1136 passing with none failing — nine of them new: four on the
calculation (the exact latest start of every module on One baker day, that it is measured off the
day rather than subtracted from the anchor, that a switched-off module is stepped over, and that a
press never moves a module earlier nor does anything a second time) and five on the card and the
drawing (the card opening on batch 1 at the last module and nowhere else, one press leaving the
day's own numbers alone, the way back putting every start time exactly where it was, the step pairs
moving the whole day with its shape kept, and the chip signposting the moment the day hangs from).
No database step — nothing to run in Supabase.

**22 Sep 2026 — engine v151 (no database step). The module card answers to you,
every batch is numbered, and the day calls your people.**

**What you asked for, in your own words.** Eleven things in one message, all of them inside
More → Scenario planner: the scenario's name first; the module card asking only what you alone
can answer; a B number over every batch; moving a batch at any module the same way you move one
at the first; naming Person 1 and Person 2; a marker that reads as a person; and the day calling
you a minute before each job. It all ships together, as you asked. One of the eleven was not a
wish but a fault: a person's card could not be opened at all before this, which is why naming
Person 1 and Person 2 had no way in.

**The scenario's name comes first.** The card at the top of the planner now reads What this
scenario is called, then My day starts at, then Pans a day you want from it. Going to that
screen to rename a scenario used to mean reading past two numbers you did not come for.

**The module card no longer asks you two things you do not think in.** Which job of your line is
this has gone. How you place each batch's start time has gone as well, and you said an
alternative is coming — so the batches' stored times are kept exactly where they are, and nothing
reads differently for it. What taking those two blocks out costs you is written at the end of
this note, honestly.

**A new module now arrives ready to use.** One cycle of 20 minutes with all 20 of them as your
hands at the start, Pans in one batch 1, waits for the module above switched on, allow multiple
production line switched on. Before this a new module arrived at 15 minutes with both switches
off, and you had to type five things before it was a module at all.

**Batches follow the one above, unless you say otherwise.** Minutes from one batch to the next
and How many batches it runs in the day both carry an Auto. Auto is written as an empty box with
the word in it, so you can always tell a number you set from a number the day worked out. The
batch count is a box on the first module — that is where your day's number comes from — and on
any module that has a number of its own. A module on Auto says its number out loud and names
what it is following, and beside it is one button, Give it its own number, which keeps the count
it is running now so taking the wheel never moves your day a minute. Auto spacing is not new
behaviour: the day has always read a module with no pace of its own as one batch following the
one before it end to end. It has a name now.

**How many production line do you have — the number is unchanged, the words are yours.** You
said it yourself: "that 2 refer to 2 production line, if the meaning is for that purpose, a
better remark needed for that. no functional changes needed." So the behaviour is exactly what
it was, and the remark is rewritten around production line instead of the word lines. It also
says plainly what happens when Allow multiple production line is on: then the module is one
production line with one person, and this number is not in force. And Let its batches overlap is
called Allow multiple production line now, everywhere on the card and in the note under the day.

**Duplicate this module.** At the foot of the module card, beside Delete, there is now
Duplicate this module. The copy lands directly under the one you copied and carries its cycles,
its numbers and its person exactly — a copy is a copy and none of the new-module defaults reach
it. You asked for this because you can add modules as you wish now, and two ovens of yours are
two of the same thing.

**Every batch is numbered, on every module and every production line.** A small B1, B2, B3
above each bar, in a band the row grew for it, on every module including one drawn as two
production line. The number carries the batch it names, so tapping B3 opens batch 3's own clock
— a number you use to tell one batch from another is no use if it is not also a way to pick one.

**Move a batch at any module, not only at the first.** Tapping a bar or its number opens that
batch's clock, and the card now says the batch number and its delta t beside each other. On the first
module a move is the batch's own start time, which is what it always was. On every later module
a move is a delta t — a hold measured from where the production line puts that batch — so the batch
rides the chain: move the module above it and this batch comes with it, keeping its offset. A
delta t can only ever hold a batch back, because a batch cannot start before the dough it is made of
exists, and the tag over the bar shows delta t = +5 whenever there is one. When your batch is held back
on purpose the card also offers Back onto the line, which takes the hold off, so a nudge is never
a one-way door.

**Your people have names, and the card that was unreachable opens.** This is the fault you
reported: "in the person card, now person card is not accessible". The person's row had no
handler of any kind, so no gesture anywhere opened their card. Tapping a person's row below the
day now opens it: a box for what you call them, a switch for whether the day calls them, and the
jobs they are on today. The name is kept in the app's settings rather than in the scenario, so
you type it once and every scenario uses it — person numbers start again at 1 in each scenario,
so the name you give person 1 shows wherever person 1 is working, and the card says so. The
card's own heading and its "Call them a minute before their next job" line follow the name as you
type it, so the card never goes on calling them Person 1 while the row behind it already says
their name. The box itself is never rebuilt while you are typing in it, which is what keeps your
cursor where you left it.

**A person's marker is theirs now, not the module's.** The People rows used to be tinted by the
module each stretch of work came from, so one person's row was eight colours and read as
nothing in particular. Each person now has their own colour, with their name on the stretch where
it is wide enough — so a row reads as one worker's day and two rows are two people. A collision
still wears its red outline over the top.

**The day walks, and it calls you.** A Start the day now button in the Walk the day row, with
Stop beside it while it runs, and a red now-line that follows the real clock down the chart. The
call comes one minute before each job a person owns — one minute and not the minute of it,
because your fold is a one-minute job and telling you to fold as you should already be folding
is telling you too late. A call card appears over everything: their name, their own colour, the
job, and the clock time it is for, with one OK. OK takes it away. If you do not tap it, the next
call simply replaces it rather than queuing behind it, which is your own rule. Each person's call
is a different note, so two people called in the same minute are two sounds. The card and the
guide both say the limit plainly: it runs only while this screen is open and awake, and a phone
that locks or a browser that closes stops it. It is a call for the day you are walking through,
not an alarm that survives the app being shut.

**The call names the cycle only when you have named it.** A module's own name can be a mouthful
("The rests and the stretch and folds"), and the thing you can actually go and do is the cycle
inside it, so the call carries the cycle's name as a line of its own when that cycle has one.
An unnamed cycle gives no line at all. That last part is a fault this release nearly shipped: the
line was drawn through the same number-formatting helper the rest of the chart uses, and on a
cycle with no name that helper answers "0", so the card went out printing a bare 0 above the
clock. There is a test on it now, and it is written so it fails if the line ever comes back.

**Your day start is never rewritten by it.** Starting the day sets the run's own minute zero to
the minute you press, and nothing is saved — so a 4:01 am plan started at 9 am calls at 9 am,
and your scenario's own day start is exactly where you left it.

**What this release takes away, said plainly rather than quietly.** Three things are gone with
the two blocks removed from the module card. The job list is gone, so the way to CORRECT a module
whose name the Production line does not recognise is gone with it — a module still crosses over
by what you call it, exactly as before, and every module of yours already crosses. The per-batch
start boxes are gone from the card, so the one control that put every batch back on its own
even spacing, Space them evenly again, is gone too; tapping a bar gives you the same five-minute
and one-minute moves, but not that reset. Say the word and any of the three comes back in one
line.

**What has not moved.** Your two saved lines and the seeded starting line were compared
byte-for-byte before and after this release: No fridge, 1 person still reads 24 pans, My sister
proposal 21/9/2026 still reads 12, and the seeded starting line still reads 12 with the chiller
as the wall. Not one module, batch, start time, cycle or saved scenario of yours changed, because
every new default is for a module you have not filled in yet — a stored number or a stored start
is yours and is never rewritten, which is the same rule the cycles migration used. Nothing here
blocks a sale and nothing here reads an order.

CHANGELOG and the guide (section 26) both carry all of this, both PDFs rebuilt, and the tests are
1127 passing with none failing — fourteen of them new: five on the model (a new module's own
defaults; Auto following the one above while a number of your own is never overruled; a delta t riding
the chain and never pulling a batch in front; reading a line twice still a no-op; all three seeded
lines pinned batch time by batch time; and the call landing one minute before the job) and nine
on the drawing and the card (a batch number on every bar including two production line, a copy
carrying its source's cycles, the person's name on the row, the card's own heading following it,
a named cycle on the call and no line at all for an unnamed one, and the four halves of the live
clock). No database step — nothing to run in Supabase.

**22 Sep 2026 — engine v150 (no database step). The word is cycle — and a batch of
four now reads as four.**

**What you told me, in your own words: "there is not steps term in this project, i want the
cycle shown in batch, and the cycle labour shown visually".** You were right on the first
point, and the app was the thing saying it. I measured the day chart before changing anything:
nothing had disappeared. On your One baker day the fold is one batch of four cycles and its bar
draws four shaded bands with your three folds on them, and the oven is one batch of two cycles
with your two-minute swap on the second — 24 cycle bands and 32 stretches of your hands across
the day. The feature was built and it was drawing. What was wrong was the word on it.

**Why your own two saved lines look plain.** Both the line you call No fridge, 1 person and
My sister proposal 21/9/2026 have exactly one cycle in every module, because both were saved
before cycles existed and were given one cycle each so the bar's shape would not move. One
cycle is drawn as one plain bar. You settled that yourself, and the app agrees with you: each
batch has at least one cycle, and a batch with one cycle is that cycle. So nothing of yours was
rewritten — both lines are correct as they stand, and not one module, batch, start time or
saved scenario was touched.

**The cycles box no longer calls a cycle a step.** It used to say "Each cycle is one step of
this module", which is exactly the sentence that made you doubt the feature was there. It now
says "Each cycle is one piece of this module's work", in the order you work them. The hint over
the day chart says the same thing in the same word: the paler bands inside a bar are the
separate cycles of that batch. Three more places where the app said step while it meant in
sync now say what they mean — batch counts that differ from the module before them, and the
line under the day naming any that no longer match. The batch's own card used to say "the step
the day is read in"; it now says the amount the day is read in, which is what it is.

**The Production line says stage, not step.** That screen walks your bake day in order, and it
called each part of the day a step. It now calls each of them a stage. The word job is left
alone there on purpose: on that screen job already means a hand-job — one of the six jobs you
do — and the proofer is not one of them, which the screen says in its own sentence. Calling the
proofer a job would have put two contradicting sentences on one screen.

**A batch of four now really does read as four.** This is the one fault in the drawing, and it
was a real one. The shades the cycles are drawn in said "a batch of four reads as four steps",
but the ladder only had three shades and started again at the fourth — so on a four-cycle batch
the first cycle and the fourth wore the same palest band, and the palest of the three was so
faint over the pastel bars that it barely showed at all. There are four shades now, spaced
evenly, and the palest has been lifted off the floor so it still reads as a wash. A fifth cycle
and beyond reuse the darkest rather than falling back to the palest, so a long batch never ends
on the faintest band.

**What has not moved.** Not one minute, position or labour band on the day chart. Your own
saved line still reads 24 pans across 9 modules, the seeded starting line still 12 pans with
the chiller as the wall, and your sister's still 4 pans in 8 modules. Nothing here blocks a
sale and nothing here reads an order.

The tests are 1113 passing with none failing — three of them new, and one of them fails if a
four-cycle batch is ever drawn with two cycles sharing a shade. No database step — nothing to
run in Supabase.

**22 Sep 2026 — engine v149 (no database step). The way down — taking batches off,
so a day that makes more than you asked for can come back to your number.**

**What you found, in your own words: "This scenario makes 36 pans, and you want 24. this
does not agrees?"** You were right, and it was two faults in one card, not one. Your One baker
day made 24 pans. You typed 36, pressed **Use these numbers**, and the ladder did what a ladder
does — it raised all eight modules from 4 batches to 6 and the day made 36 pans, which is what
you had just asked it for. Then you put 24 back in the box. The card underneath said "This
scenario already makes your 24 pans" while the line directly above it said the day makes 36.
Both sentences were drawn from the same card, one of them had to be wrong, and the ladder that
could have settled it only ever went one way.

**The climb only adds.** Every rung of it raises something: more batches in the day, or a
second machine. Not one rung has ever taken a batch away, so there was no way on that screen
to bring 36 back to 24 — no amount of pressing would have done it. That half simply did not
exist, and no wording change could have covered for its absence.

**There is now a way down.** When the day makes more than the number you asked for, the card
is headed **The way down** and carries one rung: every module the day is waiting on, and the
batches to take off each of them. On the day you were looking at it reads: all eight modules
holding the day at 36 pans, 6 → 4 batches in the day at 6 pans a batch, the same change in each
of them — that takes the day from 36 to 24. The same **Use these numbers** button applies it,
on the heading and at the foot of the card.

**Why it is one move and not a ladder.** The day is the **least** any module turns out, so
every module sitting on that least is holding the day there. Bring one of them down alone and
the day does not move at all, because one of the others takes its place as the limit. They have
to come down together, and then the day lands on your number in a single move. That is why this
half is a settling move rather than a rung-by-rung climb.

**The batch times you have set by hand are left exactly where you put them.** This is the one
place the way down deliberately differs from the climb. Raising a count makes a new rhythm, so
the climb re-spaces a module's batch times from its start. **Lowering** a count only takes
batches off the **end** of the day — so if you have dragged a batch to a time that suits your
morning, that time stays. Nothing on this move rewrites a minute you chose.

**When a batch is bigger than the number you asked for, it says so.** Six pans a batch and one
batch a day, and you ask for three: no count of batches gets under one batch, so there is no
move to offer and no button to press. The card says it plainly instead — one batch is 6 pans,
so this line can never come below 6 — because a card with nothing on it and no explanation
reads as broken.

**The two numbers can no longer contradict each other.** The branch that reads "already makes
your 24 pans" is now only reached when the day really does make 24. When the day makes more,
you get the way down and the honest reading of the gap: "This scenario makes 36 pans, and you
want 24. That is 12 pans more than you asked for."

**What has not moved.** Not one module, batch time, cycle or saved scenario. Your own saved
line still reads 24 pans across 9 modules, the seeded starting line still 12 pans with the
chiller as the wall, and your sister's still 4 pans in 8 modules. Nothing here reads an order
and nothing here blocks a sale.

Engine 149. Tests are 1110 passing with none failing, eight of them new — four on the move
itself (the 36 → 24 settling move on all eight modules, a day already at your number offering
nothing, a dragged batch time surviving the move untouched, and a batch too big to come down
past) and four on the card (its heading and button, the two numbers never contradicting each
other, the button actually bringing the day down, and the plain answer when a batch is too
big). No database step — nothing to run in Supabase.

**22 Sep 2026 — engine v148 (no database step). A cycle's labour drawn where you
work it, and the ladder's button found.**

**A cycle's labour is now drawn where you work it, and wide enough to see.** This is your
own sentence from 22 September: "cycle should be drawn with its labour shown at the
appropriate timing." It was being drawn at the right minute already — the fold at the end
of its rest, the oven swap after its bake — but it was drawn too small to find. A one-minute
fold is under two pixels at the scale the day is read in, and where it fell it landed exactly
on the seam between two rests, so what you saw was the seam and not your hands. Two changes,
and neither of them moves a minute:

- **The width has a floor.** A stretch of your hands inside a bar is now never drawn thinner
  than 4 pixels, which is the same floor the person row below already gives the same stretch
  of your day. So the bar and the person attending it now agree about what a one-minute job
  looks like — before this, the fold was 1 pixel on the bar and 4 pixels on the person row,
  which is two drawings of one fact disagreeing with each other.
- **Each end of it wears a fine light edge,** so a band that lands on the seam between two
  cycles still reads as a band rather than as the join.

Only the width is floored. **The position is the model's own minute**, so the picture still
says WHEN: the fold sits at the end of its rest and the oven swap sits after the bake. Hover
or long-press a bar and it now names the cycle and the exact minute, so the true length of a
floored band is never lost — it reads, for example, "1 min of you at 4:51 am".

**The button that applies the ladder is now on the ladder's own heading.** You told me you
could not find **Use these numbers**. You were right, and the reason was arithmetic: it sat
at the very foot of The climb card, and a day of nine modules makes a nine-rung ladder, so on
a phone the button was about four screens below the heading it belongs to. It is now on the
heading as well, beside the words The climb, and it is still at the foot of the card. Both
press exactly the same thing.

**When there is nothing to apply, there is no button — and the card says so.** If your
scenario already makes the number you asked for, the card reads "This scenario already makes
your 24 pans" and offers nothing to press, because there is nothing for it to change. That is
the other half of why the button could not be found: on a scenario that already reaches your
number it does not exist at all. Raise the number you want above what the line makes, and the
ladder appears with its button on the heading.

**What has not moved.** Not one module, batch time, cycle or saved scenario. The day still
reads the same numbers it read in v147: One baker day is still 24 pans in 8 modules, one
person, 3 h 52 min of hands, 4:01 am to 1:30 pm. Nothing here reads an order and nothing here
blocks a sale.

Engine 148. Tests are 1102 passing with none failing, five of them new — they pin the fold's
drawn minute, the bar and the person row agreeing about a one-minute job, the oven swap being
drawn after the bake, and the apply button being on the heading. No database step — nothing
to run in Supabase.

**22 Sep 2026 — engine v147 (no database step). Module, batch, cycle — the three
words on the Scenario planner, and the model that moved with them.**

**What you asked.** In your own words: __"let us realign our terms use in the production
line"__ — a module instead of a brick, batches inside a module, and cycles inside a batch,
with a batch's time moved by buttons instead of a drag. The words and the model under them
were changed together on purpose: renaming first and building the cycles later would have
left the word **cycle** meaning two different things while you were learning it.

**The three words, and what each one is.** A **module** is the equipment plus the hands
tending it — what this app has called a brick until now. A **batch** is one lot: the six
pans of one oven load, one tub of dough. A module can run several batches in a day, and how
many is yours to set. A **cycle** is one step of that module's work, and it is the cycle
that owns the minutes and the labour. Your own sentence settled it: __"batch is not a process
but cycle is."__ So a batch carries no minutes of its own — the time it holds is the sum of
the cycles inside it. A batch with a single cycle is drawn on the day as one plain bar,
exactly the way a module has always been drawn.

**Labour now sits at its real end of a cycle: its load, or its unload, or both.** Open a
module and under **Cycles in one batch** every cycle has a name box, **Minutes**, **Load**
and **Unload**. Load is your hands at the start of that cycle, unload is your hands at the
end, and the day draws them where they really happen. A cycle cannot start until the cycle
above it ends, so a cycle is never offered a start time of its own — its position is set by
its minutes.

**Two of your eight steps were in the wrong place, and both are corrected.** Your 1-minute
fold was drawn two rests early; it is now the **unload of each 30-minute rest**, so the
rests run back to back inside the batch — 30 minutes, fold, 30 minutes, fold, 30 minutes,
fold, 30 minutes — and the fold lands at the end of the rest, where your hands really are.
And your **oven swap is a cycle of its own after the 13-minute bake** rather than labour
before it, so the first swap now reads 8:13 am, thirteen minutes after the pans went in.
Nothing else about the eight steps moved: the tub is still 4:01 am and the first six pans
are still at the oven at 8:00 am, the minute the whole day is counted backwards from.

**Moving a batch is buttons now, and the drag is gone.** Tap a batch on the day chart and a
small card opens with that batch's clock and its own two pairs of buttons: **Five minutes
at a time** and **One minute at a time**, each with an earlier and a later button, plus the
batch's own times written out. Five is the step the day is read in and the step the time
line reads out; one is the nudge for lifting a batch off a collision. This replaced
dragging a bar completely, and it was your call: a bar being dragged across the day and the
hairline of the time cursor were fighting over the same finger. Nothing about a press does
arithmetic of its own — a pressed time and a typed time give the same answer — and when the
day's own rule puts the batch somewhere else the card says which rule it was. A cycle drawn
inside a bar is not a separate control: tap it and you get that batch's card, because a
cycle's start is its batch's start plus the cycles above it.

**A batch that waits on the module above offers no buttons, and says why.** Where a module
has **Waits for the module above** switched on, a batch's time is not its own — batch 3 of
that module IS batch 3 of the module above — so there is nothing to step and nothing to
mislead you. The card says exactly that, in as many words, and names the switch that would
free the time. The row itself carries a **waits above** tag and the words **waits on** and
the module it is waiting for, so a chained batch is never silent about why it is where it
is.

**Batch counts follow the one before, and the day says when one does not.** Editing **How
many batches it runs in the day** carries down to the modules after it that were running
the same number, and stops dead where a module has a number of its own — it is never
quietly overwritten. A standing line under the day then names each module whose batch count
differs from the one before it, both numbers written out, with a plain sentence that it is
a note and not a rule: the day runs on the numbers you have put in. On the seeded starting
line, for instance, it reads **Wash, oil and fill — 6 batches, The fold loop — 4**. Nothing
is locked by it and nothing is refused.

**The tile that said Cycle time now says Minutes a pan.** Same quantity it always was — the
minutes one pan takes off the slowest module, with that module named under it — said in the
words this app already uses elsewhere, because cycle now means a step inside a batch. No
arithmetic moved with the name.

**A module can have as many lines as the day needs, and lots go to the free one.** **How
many of these do you have** is that — a mixer, a sink, two ovens. At the even spacing the
app works out, the lots take their turns down the lines exactly as before; where you have
moved a start, a lot leaving one module now goes to whichever line is actually free rather
than the one whose turn it is. No figure on an untouched day changes because of it.

**One baker day was re-derived, and it is an hour later than the last version of it said.**
Correcting where your fold and your swap really happen costs the day a work slot, so the
pace one pair of hands can hold is **87 minutes** between batches, not 81: the tubs now go
in at 4:01, 5:28, 6:55 and 8:22 am, the packing starts at **8:57 am**, the last batch is
packed at 1:18 pm and the day ends at **1:30 pm**, which is 9 h 29 min. The 81 no longer
holds, and the reason is checkable rather than a matter of opinion: at 81 the second rest's
fold lands on minute 82, the very minute the second tub's dough has to be mixed, so the app
puts a second person on it. It still reads 24 pans a day in 8 modules, one person, and
3 h 52 min of hands, and nothing collides. Guide section 25 carries the whole story,
including what the sweep of every other pace found.

**What has not moved.** Your own saved line still reads 24 pans across 9 modules and
exactly the day you asked for; the seeded starting line still reads 12 pans with the
chiller as the wall; your sister's still 4 pans in 8 modules. Not one saved module, batch
time or scenario was altered — the words you read and the way you move a time changed, and
the days themselves did not.

**22 Sep 2026 — engine v146 (no database step). One baker day — your own bake day
set on the bricks, with a latest start on every batch.**

**What you asked.** In your own words: __"i need you to create one scenario and save it as
One baker day. Set the bricks for me, with latest start time each brick batch."__

**Where it is.** More → Scenario planner. Under **Your scenarios** there is one new row,
**＋ One baker day**, reading **One pair of hands, set for you**. One tap puts it on your
shelf and opens it. From then on it is an ordinary saved scenario, exactly like your own
line and your sister's proposal: it stays in your list, it opens when you tap it, and the
row that offered it is gone because you already have it. Delete it the way you delete any
scenario, and it stays deleted — it is never dropped back in on you.

**The eight bricks are your eight steps, in your own order.** Mixing the dough in the tub;
the rests and the stretch and folds; oiling the pans and weighing the dough out; into the
proofer; dimple and top; the proofer again; the oven swap and the bake; cutting and
packing. Nothing invented, nothing left out. The fold and the two proofer bricks carry no
line step against them, because the Production line has no field for them — and the screen
names them rather than writing their minutes onto a field that means something else.

**Every brick's first cycle is a latest start, which is what you asked for.** Open the day
and the eight bricks read:

- Mixing the dough in the tub — **4:01 am** (20 minutes, all of it yours)
- The rests and the stretch and folds — **4:21 am** (123 minutes, 3 of them your hands)
- Oil the pans and weigh the dough out — **6:24 am** (15 minutes of you)
- Into the proofer — **6:39 am** (45 minutes, no hands)
- Dimple and top — **7:24 am** (6 minutes of you)
- The proofer again — **7:30 am** (30 minutes, no hands)
- The oven swap and the bake — **8:00 am**, the anchor: the minute the first 6 pans have to
  be at the oven (2 minutes of you)
- Cutting and packing — **8:27 am** (12 minutes of you)

The four batches sit **81 minutes apart**, so the second tub starts at 5:22 am, the third at
6:43 am and the fourth at 8:04 am. The last batch of the day is packed at 12:30 pm and the
day is done at 12:42 pm.

**One of the eight is not where your chain puts it, and that is the whole finding of the
scenario.** Your own chain would start the cutting and packing at **8:15 am**, fifteen
minutes after the oven. Alone, you are still folding the last tub at 8:27, so **8:27 is the
first minute that job needs nobody else**. It is not a preference: start it a single minute
earlier, at any minute from 8:26 backwards, and the day asks for a **second pair of hands**.
The window you can move it in without buying anybody is **8:27 to 8:33 am**, and the seeded
day sits at the start of it.

**Why the batches are 81 minutes apart and not 40.5.** This is your own proofer figure, from
the same morning: a batch is in the cabinet 81 minutes — 45 in, 6 out to be dimpled, 30 back
in — so the cabinet could take a new batch every **40.5 minutes**, about 8.9 pans an hour.
But 40.5 assumes somebody is free to carry a batch out and the next one in the moment the
cabinet empties, and with one pair of hands there is no such minute: the hand-work of a
single batch is 58 minutes by itself. Rather than guess, every rhythm from 40.5 upwards was
swept through the app's own arithmetic, and **81 minutes is the pace one pair of hands can
hold**: every hand-window in the day then tiles exactly, each one beginning where the last
one ends, and the proofer is never asked to hold two batches at once. It still works at 80.5
minutes; at 80, or at 40.5, the very same day reads **2 people**. So the two figures you have
are both right and they answer different questions: the card's 40.5 is what the cabinet
allows when you are not alone, and this scenario's 81 is what one baker can actually feed it.

**What the day reads.** **24 pans a day in 8 bricks** — four batches of the six pans you
bake. **One person**, **3 h 52 min of hands** across the whole day, and a run from
**4:01 am to 12:42 pm**, which is 8 h 41 min. There are **no red notes** under the day,
because nothing collides: one pair of hands, no job doubled up. The brick setting the pace
is the **mixing**, and seven others pass the same 24 pans — so the card says they are one
limit between them, and relieving only one of them will not move the day.

**It loads onto the Production line as your own numbers.** Under **Start from a scenario** at
More → Production line, tapping **One baker day** shows you everything it would change before
anything moves: minutes to mix one tub 20, oiling the pans and weighing the dough out 15,
dimple and top 6, take 6 pans out and put 6 in 2, minutes the pans are in the oven 13, pans in
one load 6, cutting and packing 12, the target 24 pans, and 1 person. The fold and the two
proofer bricks are listed by name, because that screen has no field for them. Nothing is
written until you press the button.

**Every number is yours to move.** The day is seeded, not frozen: drag a bar, open a brick
and type a number, change how many pans a day you want, or move the time your day starts,
and the whole thing answers again the way every other scenario does.

**What has not moved.** Your own saved line still reads **24 pans across 9 bricks** and
exactly the day you asked for, the seeded starting line still reads **12 pans with the chiller
as the wall**, and your sister's still **4 pans in 8 bricks**. One baker day arrives as a row
you choose: not one brick, start time, merge or saved scenario of yours changed, and nothing
here blocks a sale.

CHANGELOG and the guide (section 25) both carry all of this, both PDFs rebuilt, and the tests
are 1090 passing with none failing. No database step — nothing to run in Supabase.

**22 Sep 2026 — engine v145 (no database step). Your real bake day on the Production
line — and the same day read backwards from the oven, so no dough is ever mixed too
early.**

**What you asked.** In your own words: __"work backwards, from end of process, the previous
process whould have a latest start time, by going this way, we prevent preparing dough too
early and prevent dough from over fermented. But we can fine tune each process to start
earlier to better manage manpower utilisation."__ You had corrected your own step order that
morning, after checking it with your sister: __"i think my self confused, i double check with
my sister and now understood the right flow. we cannot mix the dough too early, it will over
fermented."__ And you had already worked your ceiling out yourself and asked about it: __"6pan
sit in it for 81min, proofer able to hold 12pans, so effectively the poofer can produde 6
pan/40.5min? So the proofer became the bottle neck?"__ Yes — 40.5 minutes exactly. This
release gets that figure onto the screen out of your own numbers rather than out of a guess.

**The flow on the Production line was not your day.** It read mix, then the chiller, then
washing and oiling the pans, then weighing the dough out, then the oven. Against your day
that put the chiller where you have none, transposed the oiling and the weighing out, and —
the worst of it — had no fold in it at all. The map now runs your order, top to bottom: mix
the dough in the tub; the rests and the stretch and folds; oil the pans and weigh the dough
out; into the proofer; dimple and top; proofer again; the oven; then cutting and packing.
The proofer is drawn twice because your day uses it twice, with the dimple in between.

**The wall was a chiller you have not bought.** The screen watched a chiller of 12 trays over
5 hours and made that your ceiling — 12 pans a day — which is a cap on a cabinet that is
still only a what-if on your planner, kept switched off. The station you actually own is the
proofer, and it is the honest ceiling: a batch sits in the cabinet for the whole 81 minutes
(45, then the dimple, then 30), so 12 pans means one batch every 40.5 minutes and no faster.
Change **Pans your proofer holds at once** to 18 and the screen answers 27 minutes instead,
and says which of your limits is the wall now. It never tells you to buy one: at one pair of
hands a bigger cabinet buys you nothing, and the screen says so.

**Your day, read backwards.** A new card beside the flow, **Your day, backwards**, gives
every step the last moment it may start, worked back from the oven — the end of the process,
which is where you asked to start from. For the first six pans to be standing at the oven at
8:00 am, the dough goes into the tub at 4:01 am:

- Mix the dough in the tub — 4:01 am
- The rests and the stretch and folds — 4:21 am
- Oil the pans and weigh the dough out — 6:24 am
- Into the proofer — 6:39 am
- Dimple and top — 7:24 am
- Proofer again — 7:30 am
- The oven, bake and swap — 8:00 am

That is **239 minutes** from the tub to the oven and **254** from the tub to the pans coming
out, which is your own arithmetic and nothing else. One batch is **46 minutes of your hands**:
20 mixing, 3 folding, 15 oiling and weighing, 6 dimpling, 2 swapping.

**The clock is a field, not a rule.** The minute the first batch must be standing at the oven
is yours to set — it arrives at 8:00 am — and every start time below is worked back from it.
Move it and the whole day moves with it.

**Five minutes early is allowed, and nothing is locked.** Every step also carries a five
minute band above it: a step may begin up to five minutes early to suit your hands, which is
the room you asked for to manage the people. It is advice drawn on the screen and it is never
a gate — no time here stops you baking, hides an order, or overrules your own eye. You watch
the dough; the timetable watches the clock.

**Five numbers changed what they were asked, and each one is named here rather than changed
quietly.** Your saved numbers move across by themselves the first time your phone opens this
version, so you will see these the moment you load it — and every one of them can be typed
back in one tap if your own timing says otherwise:

- **Minutes to mix one tub of dough**: was 6, now 20. The old box asked how long it took you
  to load a mix; this one asks how long the whole mix takes, which you gave as twenty minutes
  for one tub.
- **Pans one tub of dough makes**: was 28, now 6. The old box asked what your mixer's bowl
  holds. Your cycle is one tub of dough into the pans of one oven load — six — and the mixing
  and folding are spread over that tub, so this is the number the chain needs.
- **Oil the pans and weigh the dough out, for 6 pans**: was two jobs under two names (your
  washing and oiling read 20, and the weighing out was never timed), now one job at 15. Your
  own count of the hand-work has it once, which is the proof they were one job: with the two
  merged, the app's 46 minutes a batch is your 46 to the minute.
- **Minutes to dimple and top 6 pans**: was 8, now 6 — your one minute a pan. The 8 was
  measured with the topping in it.
- **Minutes to take 6 pans out and put 6 in**: was 4, now 2 — __"2min covers out and in"__, as
  you put it. One turn of the oven is the baking and the swapping together, 15 minutes as
  before.

Everything else of yours is untouched: your two pairs of hands, your 5 hours, your 24-pan
day, your 12 pans, 6 pans a bake, 15 minutes a turn, the 30-minute cooling — and your 12
minutes of cutting and packing, which you had timed and which is still yours.

**A step with no minutes on it is still named, never counted as free.** Cutting and packing is
the one job that arrives with an empty box — every other step of the day comes seeded with your
own figure — so on a fresh phone the flow says **not timed yet** and the backwards card says in
a sentence that it is not counted in the 254 minutes, rather than quietly treating your time at
the table as free. You had already timed yours at 12 minutes for 6 pans, so on your phone that
box holds your 12 and the card's heading reads **After the bake** rather than **Still to time**.
A heading left reading **Still to time** over a figure you had given would read as the screen not
having noticed it. Either way the step is drawn on the backwards card as sitting **after the
bake, outside the 254 minutes**, because those minutes happen while you are waiting on the next
batch. Nothing was reset.

**One thing on the join between the two screens reads differently, and it is a correction.** When
you tap a saved scenario under **Start from a scenario** on the Production line, the list of
numbers it would change is now the corrected list: **oiling the pans and weighing the dough out**
is one row where it used to be two, because it is one job under two names, and a **retard** brick
is named as something the scenario said but the line has no field for rather than quietly writing
a tray count onto a field that no longer exists. The bricks themselves are untouched, and nothing
is written until you press the button. What did **not** ship is a button on the Scenario planner
to push a planned day's own start times onto the bricks: your bricks are timed from a day that
starts at 3 pm, and the bake day here is a morning that has to be ready by 8 am, so writing those
times in would have moved every saved brick. The timetable is drawn, and it is not pushed
anywhere yet.

**What has not moved.** The Scenario planner, brick for brick. Your own line still reads 24
pans across 9 bricks and your sister's still 4 pans in 8 bricks, and both are stored exactly
as they were — not a brick, a start time or a merge has changed. The chiller bricks stay where
they are, switched off, because the fridge is still worth planning for.

CHANGELOG and the guide (section 24) both carry all of this, both PDFs rebuilt, and the tests
are 1084 passing with none failing. No database step — nothing to run in Supabase.

**21 Sep 2026 — engine v144 (no database step). The People row counts the places one
person is in, a line of a brick counting as a place — and a collision is written so it
can be read.**

**What you asked.** In your own words: __"fix the hats count and the collision sentence.
And what is the concept of hat, i dont understand, why name them by numbers?"__. Both were
real faults, and the question was fair — "hat" was my word, and it was a poor one. It is
gone from the app and from this book; what it meant is said plainly below.

**What a "hat" was.** It was my shorthand for **the places one person has to be in the
day**. You put it better yourself: __"one person would not need to wear too many hats"__ —
one worker asked to stand at six different jobs in one day is being handed six hats. That
is the thing the People row is there to count, so that is what it now says: **in 6 places**.

**The count was wrong.** Each person's row read **at 6 bricks** — the number of different
bricks, not the number of places — so a worker on **line 1 and line 2 of the same fold**
counted as being in **one** place. That is exactly the doubling-up the number is supposed
to show you, and it was the one thing the row said nothing about. A line of a brick is a
place of its own now, so that same worker reads **in 2 places**. On your own line the row
has gone from **at 6 bricks** to **in 7 places**, because your fold is drawn as two lines.
The number only appears when it is more than one, exactly as before.

**The collision sentence was unreadable.** It was one long sentence — __Person 1 is at X and
Y at the same time, …__ — and your bricks have long names: __Mixing by hand in the tub (set
the minutes)__ is forty characters, twice in one sentence, with the word __and__ between them
lost in the middle. It is now three parts on four separate lines. Line one, who and when:
__Person 1 — two jobs at once, 4:00 pm to 4:05 pm__. Lines two and three, each job on a line
of its own with a bullet in front of it: __Mixing by hand in the tub (set the minutes), line
1__ and __Mixing by hand in the tub (set the minutes), line 2__. Line four, what to do about
it: __Move one of them along the day, or combine with another person and accept the
collision.__ Two lines of one brick still say which line they are, because without that they
read identically. And if a day has more than three of these, the last block **counts the
rest** instead of quietly stopping — a list that stopped at four read as though the day had
four problems when it had nine.

**Why the people are numbers.** Because a number is what the app stores: who is on a brick
is a number, combining two people is joining two numbers, and the same person on three
bricks is the same number in three places. That is what makes "put person 1 on both lines"
work in one tap. It also has nothing to do with you — **Person 1, 2, 3** are places in the
day, not names of people, and the app never shows them to a customer. Naming them (Mei,
Kak, Adik) is a small change on top and I have not built it — say the word if it would help
you plan.

**What has not moved.** The day itself. Not one minute, one pan or one figure. Your own line
still reads **24 pans across 9 bricks**, the starting line still **12 pans with the chiller
as the wall**, your sister's still **4 pans in 8 bricks**. Only the words on one row and the
shape of one red note changed.

CHANGELOG and the guide (section 23) both carry all of this, both PDFs rebuilt, and the
tests are 1062 passing with none failing. No database step — nothing to run in Supabase.

**21 Sep 2026 — engine v143 (no database step). A time cursor on the day chart: point
at the chart and a line follows your pointer down the whole day, reading out the clock,
so you can line two bricks up against each other.**

**What you asked.** In your own words: __"i need a time x axis cursor on the time
chart"__.

**Where it is.** The day chart in **More → Scenario planner**. One change, in one screen.

**How to use it.** Run the pointer across the chart and a fine line follows it, down
through every row — the ruler, every brick, every person, the total. A little brown label
at the top of the line reads the clock at that point: __5:05 pm__. Move the pointer and the
reading moves with it; move the pointer off the chart and it goes away.

**On a phone.** A finger cannot hover, so on a phone the **clock strip is the handle** —
the one band along the top of the chart where the hours are written. Put your finger on
that strip and slide it left or right and the line follows, reading out the time. Everywhere
else on the chart your finger still scrolls the day the way it always did, so you have not
lost the swipe.

**Why it only counts in fives.** The line reads the clock to the same five minutes a bar
snaps to when you drag it. That is deliberate: the cursor can never name a time the chart
could not also set, so you are never shown a time you cannot ask for.

**At the ends of the day.** Point before the day starts or past the end of it and the line
goes away rather than naming a time that is not in your day. At the far end of the evening
the reading hangs to the left of the line instead of the right, so it is always written out
in full and never half cut off.

**Two bricks lined up.** This is what the line is for. Point at where a brick starts, read
the time off the label, then point at where the next one starts and read that — no counting
squares. It reads the chart and it writes nothing: no brick, no time and no number changes
because you pointed at something.

**Nothing you have has moved.** Not one figure. Your own line still reads 24 pans across 9
bricks, the starting line still 12 pans with the chiller as the wall, and your sister's still
4 pans in 8 bricks.

CHANGELOG and the guide (section 23) both carry all of this, both PDFs rebuilt, and the
tests are 1061 passing with none failing. No database step — nothing to run in Supabase.

**21 Sep 2026 — engine v142 (no database step). Typing a number into a long card no
longer throws the card — the box keeps your cursor and the card stays where you were
reading.**

**What you asked.** In your own words: __"why the display jump and it is very
confusing"__. It was a real fault, and this is it fixed.

**What was actually happening.** The brick's card is a long card — fifteen boxes, a box
per line, a row for every cycle — and **every single number you typed into it was
rebuilding the whole card underneath your finger**. That is the jump you saw: the box you
were typing in was thrown away and a brand new one put in its place, so the cursor went
with it and the keypad shut. On a phone that reads as one digit per tap, on a card that
had moved somewhere else. It was worst on the three boxes that change how tall the card
is — typing a 6 into __How many of these do you have__ grew the card by a line's worth of
boxes on every keystroke.

**What it does now.** Typing a number writes the number and **leaves the card alone**. The
box keeps your cursor, the keypad stays open, and the card stays exactly where you had
scrolled to — checked box by box: the brick's own numbers, the people box, and every line
box under __How many of these do you have__. Three boxes still change the card's shape,
because their answer really does add a row or move a time — **How many times it runs** (one
more row per cycle), **How many of these you have** (one more line box), and **Minutes in,
when its first pass starts** (cycle 1's own time). Those three now redraw **once, when you
leave the box**, instead of once per digit.

**And it is not only the brick's card.** The jumping was in the shared pop-up that every
screen in the app opens, so the same fix covers all of them: any card long enough to scroll
keeps its place while you work down it, and a card you open fresh still starts at the top
where it should.

**Nothing you have is affected.** This changes only when the screen redraws, never what it
redraws: every figure, every scenario and every saved line reads exactly as it did in v141.
Nothing new to run in the database.

**21 Sep 2026 — engine v141 (no database step). A brick you have two of is now drawn
as two lines, and each line carries its own person — so one worker stands at one job
instead of wearing every hat in the day.**

**What you asked.** In your own words: __"i want is just better drawing.. Since now one
brick having 2 lines, each line can have its own person, and few line can have a combine
person sharing to different lines. This will make training of worker easier, because one
person would not need to wear to many hats"__. So this is the **drawing**, and **who is on
each line** — nothing about how the day adds up has moved.

**A line, and why a brick you have two of is two of them.** Everything on this screen was
already worked out as if a brick you have two of were two streams taking the lots in turn
— lot one and lot three on one, lot two and lot four on the other. The screen was drawing
those two streams flattened into a single row. Now each one is a row of its own: the
brick's own name, badges and minutes on the first line, and a row per further line
underneath, tied together by an accent down the left and a dotted seam between them.

**Who is on each line is yours to set.** Open the brick and, once __How many of these do you
have__ says 2 or more, you get a box per line — **Line 1 — who is on it**, **Line 2 — who is
on it**. 0 means whoever is free. Put the same number on two lines and that is one person
covering both, which is exactly what you asked for; if those two lines really do need them
in the same minute, their row in the People list goes red and names the minute and which
line collided with which. The line boxes and the brick's own __Who is at this brick__ are the
same number, so the two can never disagree.

**The People list now counts the places one person has to be.** Each person's row reads how
many different places that one person is in — and every job on it names its line ("Stretch
and fold in the tub, line 2"). That number is the whole point of this release: it is the one
that tells you when one person is being asked to be in too many places at once.

__(This entry was first written as "counts hats", as **at 3 bricks**. Both the word and the
count were wrong, and **v144** fixes them: the row now reads **in 3 places**, and a line of a
brick counts as a place. See the v144 entry at the top.)__

**Your starting point in one tap.** **One a line** (it was __One a brick__) gives every line
its own person, so a brick you have two of takes two people rather than one. It says __One a
line__ only when a brick in the scenario really is drawn as lines; otherwise it reads exactly
as it always did. Its name and the message it leaves say which of the two it just did.

**What has not moved.** With no lines drawn and nobody set — which is every brick you have
— the day is computed exactly as before, and every figure you have already been given reads
identically: your own scenario still 24 pans and exactly the day, the seeded line still 12
pans with the chiller as its wall, your sister's still 4 pans in 8 bricks. Two of a brick
still buys cycles out of the pans you planned; it does not bake pans you did not plan.

**One thing it deliberately does not do.** With **Let its cycles overlap** switched on, a
brick's lots no longer take turns, so there are no lines to draw and the brick goes back to
one row with one person. The people you set per line are **kept**, not thrown away, and the
brick's card says so — switch overlapping back off and your lines come back, each with the
person you gave it.

**Nothing to run in the database.** This is a screen and a drawing; no SQL, no new table.

**21 Sep 2026 — engine v140 (no database step). A brick can now be told that its
cycles may overlap — one switch, with the rule for when to use it written beside
it — and the two lots are drawn as two bars.**

**What you asked.** In your own words: __"i also want to allow each brick cycle to overlap,
this will improve the visualisation"__, and then, as I was building it: __"allow overlap
button and the overlapping criteria"__. So it is a **button** in the brick's card, **Let its
cycles overlap**, and the criteria sit under it in plain words rather than in a rule you
would have to work out.

**What a brick did before, and still does unless you switch this on.** A brick held its own
cycles apart: lot two could not begin until lot one was out of it. That is the right rule
when the dough is physically __in__ the thing, and it is what stops you folding dough that is
still in the mixer. Where you switch it on: when the minutes in a pass are the **dough's**
time and not a machine's — dough resting between folds, a second bin on the go. Then every
cycle sits exactly where you put it.

**How you can tell it is on.** The brick's row wears a **2 at once** tag naming how many lots
are in it together, and the row grows taller so the overlapping lots are drawn as separate
bars in their own lanes instead of painting over each other. A brick that is not overlapping
looks exactly as it did — same bar, same height, same place.

**Three things it deliberately does not do.** It never lets a lot start before the dough
exists: a brick that waits for the brick above still waits, so switching this on is not a way
around the chain. It does not put pans in the day that you did not plan. And it does not
quietly double you up — if two of your own cycles need the same person in the same minute,
that person's row still goes red and names the minute.

**And it is not the same as a second brick.** **How many of these do you have** means one lot
in per brick you have — with 2 of them, lot three may start while lot one is still folding,
but lot four waits for lot two. **Let its cycles overlap** means every lot at once. The
switch is the wider of the two.

**One correction to v139, written down so it never looks like a bug.** v139 said a brick
whose passes come round faster than one pass takes "now has its passes held apart instead of
drawn overlapping — that day could never be worked". That is still what happens **with the
switch off**, which is how every brick arrives. With it on, those passes are drawn
overlapping, in lanes, which is the whole point of the switch.

Nothing else in the app moved, and both of your scenarios read exactly as they did — the
sister's line still 4 pans in 8 bricks. Tests are 1048 passing with none failing, and the
guide (section 23) carries all of it.

**21 Sep 2026 — engine v139 (no database step). The scenario planner now builds a
real line: a brick can be two of them, every pass in a brick has its own start time
you can drag or type, and a brick can be set to wait for the brick above it — lot 10
waits for lot 10.**

**What you asked.** In your own list: __"1. allow me to set the same brick to 2 or more, if
that module became bottle neck."__, __"2. in a brick, let say we might need 8 cycles, each
cycle should be able to have its own start time, drag-able."__, __"3. 2nd brick 1st cycle
should follow 1st brick 1st cycle completion, and so on."__, __"4. Each brick, cycle10 only
starts after one brick earlier cycle 10 ends, etc."__, and __"5. objectives are: less man,
less manhours thru better planning, shorter hours."__ Then, as I was building the screen:
__"from your layout, the stretch and fold should have 2nd , 3rd brick as the person who do
that process and start another cycle without having to wait for thee 1st cycle to finish"__ —
which is what **How many of these do you have** does: a second fold starts the next lot
without waiting for the first to finish.

**What changed. Everything below is inside More → 🧱 Scenario planner. Nothing else in the
app moved, and every figure you have already given reads exactly as it did.**

**Every pass in a brick is drawn on its own, and dragging one moves only that one.** Before
this version a brick's passes were a single rhythm — a gap and a count — and every pass sat
where that rhythm put it. Now each pass is **its own bar on the timeline** and can be dragged
by itself: cycle 3 moves and cycles 1, 2 and 4 stay where they were. The toast when you let go
names the one you moved — __"Cycle 3 → 4:15 pm"__ — so there is no doubt which pass changed.
For a small nudge, a number beats a careful finger: the brick's card now has **a row per
cycle**, each with a box for the exact minute and the clock reading beside it, so a five-minute
correction is typed rather than dragged. And **Space them evenly again** puts every pass back
on the even rhythm from the first one, once you are done experimenting.

**A brick can be two of them — or more.** A new box in the brick's card, **How many of these
do you have**, and the row wears a **2 of them** tag when you raise it. What a second one
really buys you, and what it does not: it lets the brick hold **twice as many passes in a
day**, and it runs at **twice the pans an hour** — but it does **not** change the pans you
planned, because a second mixer standing idle does not bake anything. To use it you raise the
passes. That is the honest reading of buying one: it removes a wait, it does not invent work.
With **2 of them**, that brick's own passes are allowed to overlap, because two machines can
run at once — which is the whole point of having two.

**A brick can wait for the brick above it — and that is the chain you described.** A switch in
the brick's card called **Waits for the brick above**, and it does exactly your points 3 and 4:
lot 1 of this brick cannot start until lot 1 of the brick above has finished, lot 2 waits for
lot 2, and so on down the line. Turn it on for the bricks that really are one line and a slow
pass upstream holds every later lot behind it — which is precisely why a second fold, or a
second mixer, is worth buying. Two things worth knowing. **A chained bar cannot be dragged**,
because where it sits is decided by the brick above: those bars are drawn faded and wear a
**waits above** tag, so nothing on the screen looks like a control that does nothing. To move
a chained lot you move the cycle it is waiting on, and the whole line moves with it — which is
the lesson the screen is for. And **if two bricks have different numbers of passes**, the
screen says so instead of guessing: passes past the end of the brick above follow its __last__
pass, and the row names it. **The chain arrives switched off**, so nothing you have already
measured moves until you turn it on yourself.

**The line, in one tap — and your three objectives as three numbers.** You named the goal as
three things, so the screen now says all three in one line under the day: **2 people · 13 h
40 m of hands · a 16 h 20 m day**. **People** is the most hands needed at once (__less man__),
**of hands** is every person-minute of the day added together (__less manhours__), and **the
day** is first job to last (__shorter hours__). Drag a cycle, move a start, add a second brick,
and all three answer again at once — so a change either improves all three or you can see
which one it cost. Beside the timeline a chip reads **3 waits above**, or **Not chained**:
tap it and it explains the rule, names which bricks are waiting, shows those same three
numbers, and offers the whole thing in one tap — **Chain the whole line** or **Take the
waiting off** — so you never set eight switches by hand.

**The climb can now offer a second one, not only more passes.** The ladder used to relieve
the wall by raising that brick's passes, and stopped where a day could not hold more of them.
That stopping point is exactly where a second brick is the real answer, so a rung can now read
**2 of them** as well as **more passes**, with the same before-and-after pans figures. A rung
that adds a second one says what it costs in as many words — **that is a second one to buy** —
because that rung is money where the others are time. A brick that needs both is offered both,
in order.

**One arithmetic change worth writing down, so it never looks like a bug.** A brick whose
passes come round __faster__ than one pass takes — a 5-minute gap on a 28-minute fold — was
always a drawing of something that cannot happen: the same hands cannot start pass 2 while
pass 1 is still on them. Those passes are now held apart to one at a time, when the brick is
the only one of it and is not chained. None of your own bricks is built that way and every
figure you have given reads exactly as it did, but if you ever type a gap shorter than a pass,
the screen will hold the passes apart rather than draw a day you cannot work.

**21 Sep 2026 — engine v138 (no database step). The scenario planner is yours to
build in: bricks you make, move, give to a person and drag along the day, a ruler
and a start time, scenarios you save and name — and the scenario you choose can now
be loaded onto the Production line.**

**What you asked.** In your own list: __"1st i cannot change the time scale, say i want a
strat at 8am. And i need an time scale ruler"__, __"I need to move the sequence of the lego
brick"__, __"I want to be able to create, edit and delete lego brick"__, __"i want to be able to
same and name a scenario. Edit or delete"__, __"how to have person 2?, I would want one person
for each module, And a Total person showing overlapping persons time slot if any"__, __"The lego
brick should be able to restart? if choosen to, and how, can it be drag tomove the start time
of each brick"__, and __"The fold brick should show 28min, and its person should show 2 minutes,
when i adjust the brick until minumum total person overlap, that will be best scenario for
manpower planning."__ Then, as I was building it: __"can allow to save a scenario? scenario and
production line has some function overlapping, the chooses scenario should be able to be
loaded to production line"__.

**What changed. Everything below is inside More → 🧱 Scenario planner, plus one card on
More → Production line. Nothing else in the app moved.**

**The day starts when you say, and there is a ruler to set it by.** One box at the top sets
**the time your day begins**, and every clock reading on the screen is counted from it — so
__"say i want a strat at 8am"__ is one field rather than ten start times to retype. A ruler now
runs under the timeline: a tick every half hour with the o'clock ones named, so a bar can be
read against the clock instead of guessed at. And the **time scale** is yours: four chips —
**Wide**, **Standard**, **Close**, **Closest** — change how wide a minute is drawn, from the
whole day on one phone screen to close enough to tell a 15-minute bake from the one before it.
The hour lines on the timeline follow whichever you pick, so grid and ruler always agree.

**A brick is now a thing you own, not a row you read.** **＋ New brick** adds one, and it
arrives **switched off** so an empty brick cannot become the wall and answer your day with a
nonsense figure. Open any brick and you can rename it, change its picture, change every number
in it, and — this is new — **delete it** or move it **↑ Earlier / ↓ Later**, because the list
order __is__ the day's order: the timeline is read top to bottom and a tie for the wall goes to
the earlier brick. So __"move the sequence of the lego brick"__ is two buttons, and the day
re-sorts around it.

**One person for each module, and the Total person you described.** Every brick can be given to
a person: **0** means whoever is free, **1, 2, 3…** names someone. Two chips do it in one tap —
**One a brick** gives each job its own person, **Share them** hands them all back to whoever is
free. Under the timeline there is now **one row per person**, each showing the jobs that person
is at and how much work they carry, and where two of their jobs overlap the bar wears a red
outline with a sentence naming **both jobs and the minute they clash**. Nothing blocks a plan
that cannot work — the whole point is that it is __shown__. The **Total person** row stacks
person 1, person 2, person 3 and the rest on top of each other, which is what you asked for:
__"with that i can see, which time period utilise more manpower"__. It reads out the most people
needed at once, the busiest stretch by name, and how many minutes are being worked two at a
time. Bring the bricks closer together and that row flattens — that is the manpower planning.

**Combining two people, which was your own example.** **Combine two…** asks two questions: the
person who keeps the job, then whose bricks move to them. Person 1 then person 3 makes the row
read **Person 1+3** — __"to generate person 1_3"__, in your words — and whatever then collides is
exactly what that combination cannot pay for. Give one brick back in its own editor and the
**1+3** label prunes itself the moment person 3 has a brick again, so a label can never claim
somebody who is not really there.

**A brick restarts, and a brick can be dragged.** Same number, two ways to move it. Type the
gap and the number of runs and the brick restarts itself later in the day — your fold, four
times. Or take the bar on the timeline with your finger and **drag it**: the start moves in
5-minute steps, the row's times update as you drag, and letting go will not open the brick's
card. Drag to move, tap to open. Your pans do not change when you drag; only your people do.

**Your fold brick now reads the way you described it.** It **holds for 28 minutes**, it is
**2 minutes of you**, and it restarts 30 minutes after the last fold, four times. One honest
note: if your phone's fold brick still reads **30** in __minutes one pass holds it__, that is the
copy your phone saved from the first version of this screen. Type **28** into that box and it
is right. I have not overwritten it for you, because your numbers are never changed by an
update — that is a rule of this app, not an oversight.

**Save a scenario, name it, open it, rename it, delete it.** **Save changes** keeps the one you
are in; **Save a copy…** makes a second named one and carries on in it — which is how you keep
the line you have and the line you are thinking of buying side by side. **Your scenarios** lists
everything saved: tap to open (the row you are in wears a filled dot), or tap the **pencil** to
rename or delete it. Deleting a saved scenario never touches the bricks you are working on.

**Your sister's line is in there too, built from her own words.** Next to your saved
scenarios there is one more row — **＋ My sister proposal 21/9/2026** — and one tap puts it on
the shelf and opens it. It is the line she wrote out, and it has **no mixer and no chiller in
it**: everything mixed by hand in one big tub, folded in that same tub for 2 minutes every 30
minutes three times, tipped into four pans, an hour in a proofing cabinet, then dimple and oil
in the pan, half an hour of rest, the oven, and cooling and packing. As she described it that
is **4 pans a day in 8 bricks**, and the thing stopping it is **mixing by hand in the tub** —
not the oven. Bring the bricks closer together and the Total person row will show you where the
three folds collide with filling the pans.

**Two of its numbers are mine, not hers, and both say so on the brick.** She never gave a mixing
time — she mixes by hand, so there is no machine time to give — and I have seeded it with the
length of your own mixer pass so the brick is not blank. The **Into the pans** brick is worked
out from **your** measured 3 minutes a pan, which is 12 minutes for four. Everything else is her
own numbers, and every number on every brick is editable. The tub mixes **4 pans in one go**, so
if her tub is bigger, change the batch on that brick and the whole day re-reads itself.

**One repair under this.** Opening a saved scenario used to leave the box at the top of the
screen still reading the scenario you were in __before__ it — the name, the start time and the
pans you want. It now repaints with the scenario you actually opened, so the top of the screen
and the row you just tapped always agree.

**And the chosen scenario loads onto the Production line.** A new card at the top of
More → **Production line** — **Start from a scenario** — lists everything you have saved.
Tapping one shows you **every number it would change before anything moves**: what it was, what
it would become, and which numbers it would leave exactly as they are. So that the two screens
can agree without retyping, every brick's card now carries one more line — **which step of your
line is this** — where you say whether it is the mixer, the wash, weighing the dough out, the
topping, the oven, the cooling or the retard. A brick's **minutes** and its **batch** are what
cross over; a brick that is not a step of the line (your fold, loading the chiller) is named as
left out rather than silently dropped. **How many pans you own** and **how many hours you will
bake for** stay exactly as they are, because a scenario does not know them and the screen says
so instead of filling them with a nought. Nothing is written until you press the button, and
the button counts the numbers that would really move — so a scenario you have already loaded
says __"nothing here changes"__ rather than promising eleven.

**21 Sep 2026 — engine v137 (no database step). More → Scenario planner: build your line out
of modules, watch the day as a timing diagram, and raise the pans you want until something
stops you.**

**What you asked.** "can i have a apps function that visualise the flow... something for me
to optimise line balancing", and then, once we were talking about it: a screen you could
**configure**, a **timing diagram**, and — this was the important one — __"not optimised for
mobile, for a clearer interface"__, so you could "toase about all possibility to configure the
production flows". You described the parts yourself: a module around the oven, a module around
the mixer, a module around a fermentation, each with its **own cycle time**; the folds as a
**loop**; ingredients going in "from time to time, not one shot"; and the fridge and the bins
as **half-finished goods** sitting between steps. And you set the rule for the whole exercise:
__"alll this are design, and require proofing, and before the proofing, the fugures have to be
right first, at least logically."__

**What changed.** A new screen, **More → 🧱 Scenario planner**. It is the one screen in the app
that is **wider than the rest** — up to 900px instead of 540 — because a day laid out across a
timeline needs the room. Everything else about the app is exactly as it was.

**A module is a Lego brick: a machine __and__ the pair of hands that tends it, counted as one
thing.** Each module has its own cycle time — how long one pass holds it — how many pans that
pass deals with, how many minutes of you it takes, and how often it repeats. Your fold loop is
just a module that repeats more often, so a loop needs no special anything. Ten modules come
seeded: the mixer, the fold loop, wash/oil/fill, load the chiller, retard overnight, unload,
dimple and top, the oven, cool and pack — and the fridge, which arrives **switched off**.

**Scenario 1 is the line without a fridge, and the fridge is a switch, not an absence.** It sits
in the module list switched off and reads __"not in this scenario"__, so the screen answers
without it. Switch it on and it appears. That is deliberate, because you said it plainly:
__"if the output fulfilied my need now, then fridge would not be the 1st thing to buy for me"__ —
so the buying question and the design question had to be the same screen, one tap apart.

**The day is a timing diagram.** One row per module running across the day, with the clock
along the top every two hours. A **solid block is you standing there**; a pale one is the module
running without you — the retard and the bake have no solid block at all because they need
nobody. Below the modules is a row **per person**, carrying the jobs that person is at. There is
one person on your seeded day, doing 4 h 56 min of work. Swipe sideways; the day is wider than
the phone.

**The climb — this is the part you asked for.** You described the method yourself: __"i will
slowly increase the output needed per day until 1st limitation hit, tweaking the 1st limitation
and expecting the output to grows, until the next limitation surface"__. So: type how many pans
a day you want, and a ladder appears. Each rung names the one module that stops you at that
number, exactly what to change about that module, what the day becomes, and which module
becomes the wall next. **One tap puts the whole ladder into the modules.**

**And the ladder has to be honest, which is where it earns its keep.** Your seeded day makes
**12 pans** and it is the chiller that stops it. Raise the target to 36 and the ladder climbs
to **24** — then stops, and says why in plain words: __"A 12 h pass fits 2 times in a day, and it
is already running that often. So this one cannot be run more often — it has to take more pans
at once."__ Twelve trays, twice a day, is twenty-four pans and no amount of wanting makes it
more. **Thirty-six pans needs eighteen trays.** It is the same trays-to-a-day arithmetic from
the Production line, now holding this screen to account — and it means this screen can talk you
**out** of a purchase as well as into one.

**Every figure is yours to move.** Tap any row — or any brick in the "Not in this scenario" list
— and one card opens with that module's numbers, each label naming its own unit: minutes one
pass holds it, pans in one pass, minutes of you, minutes from one pass to the next, passes in
the day, minutes in when the first pass starts, people this pass needs. Nothing here reads an
order and nothing here blocks a sale; it is a planner you type into.

**One more honest note.** A day can only hold so many passes of something: a 12-hour retard fits
twice in 24 hours, and the screen will not count a third however many you type. Your number is
kept exactly as you typed it — the row just wears an __"a day's limit"__ tag and counts the passes
that are really there.

**20 Sep 2026 — engine v136 (no database step). The Production line now opens with a flow
map: your bake day top to bottom, in the order it actually happens.**

**What you asked.** "can you do a flow map so that i can visualise better, make a intuitive
one". The four bars answered __how fast__ each part is, but nothing on the screen showed the
**order** — that the dough is mixed first, rests overnight, and only then goes pan by pan
through the oven and back round again. Numbers side by side don't tell you what happens next.

**What changed.** A new card called **The flow** now sits at the top of the screen, above the
bars. It is the bake day written down the page, one step under the next with a numbered dot and
a line running between them, so your eye follows it like a recipe:

> 🥣 Weighing in and loading the mixer → 🧊 Retard overnight in the chiller → 👋 Wash, oil and
> fill → 👋 Weighing the dough out into pans → 👋 Dimple and top → 🔥 The oven swap and bake →
> 👋 Cooling and packing → ✅ The day.

Each step carries its own cost: the hand steps say **minutes a pan**, the chiller, the oven and
the pans going round say **pans an hour**, and a step you have not timed says **"not timed yet"**
rather than quietly reading as free. The last node states the day the line actually makes.
The four bars you already use are still there, unchanged, directly below the map.

**The step that sets your pace is the red one.** The same red the bars use, so the two agree.
Whichever step is the wall wears a **"the slow one"** tag and the one sentence that explains
why — at your current numbers that is the chiller, holding 12 trays; fill in the three untimed
steps and the mark moves to the wash, and the traffic goes to your hands instead.

**One honest note about the hand steps.** The six hand jobs are one shared pool — you do them
in turn — so no single one of them has a pace of its own. The map therefore shows each as
**minutes a pan of work** and never as a rate, and when the wall is the hands the "slow one"
mark goes on the heaviest job while the sentence beside it says the minutes are shared across
your pairs of hands. Only the chiller, the oven and the pans are given a rate, because those
are the only three that are not you.

**20 Sep 2026 — engine v135 (no database step). The mixer box on the Production line now
explains itself, and its number is right: 25 kg is about 28 pans, not 25.**

**What you asked.** "Most dough in one mix, in pans — What is this?" Fair question, and the
fault was mine. Your form asked for your mixer in **litres or kg** ("Most dough your mixer takes
in one go — look for the bowl size on the mixer or in the manual"), and the Production line asks
for it in **pans**, because every other number on that screen is in pans so it can be compared
to the rest. I converted your answer without telling you, and never checked which unit you had
meant. So the box read 25 and quietly meant "25 pans" — a figure you had never given.

**What changed.** You told me your mixer takes **25 kg** of dough. One pan takes about **900 g**
of dough — that is what bakes down to the 800 g you sell, the rest being water that bakes off
and oil that goes in the pan — so 25 kg is about **28 pans**. That is now the figure the box is
seeded with, and the hint under it says the whole thing in one line, so the conversion is on
screen rather than in my head: __"Your mixer's bowl size, counted in pans: one pan takes about
900 g of dough — that is what bakes down to your 800 g — so a 25 kg bowl is about 28 pans."__

**One caveat, said plainly.** A 25 kg mixer means the bowl holds 25 kg, but a wet focaccia
dough climbs the hook and will overflow a bowl filled to the brim, so what you can actually mix
in one go is probably less. The hint says so too — lower the number if you never fill it. You
know your mixer better than the arithmetic does.

**If your box still reads 25, type 28.** The figure the app remembers for you is the one you
last typed, so your own phone keeps showing 25 until you change it — the new seed only reaches a
fresh phone. This is the one small thing to do by hand.

**What it affects.** Two things, and both are small at your scale: how many mixes a day takes
(the day's pans divided by this), and — once you time "Minutes to weigh in and load one mix" —
the mixing minutes divided across each pan. At 28 pans a day of 36 is two mixes.

**20 Sep 2026 — engine v134 (no database step). Every time box on the Production line now says
what it wants: minutes.**

**What you asked.** "the field input unit is not shown?" You were right, and it was worse than a
missing label - it was six missing labels. Every other box on that screen carries its unit in
its own name ("Minutes per bake", "Pans per bake", "Hours you'll bake for"), so the pattern was
already there and the time boxes did not follow it. You saw "Wash, oil and fill 6 pans" above a
box holding 18 and had to guess whether that meant minutes or seconds.

**What changed.** All six hand-work boxes now lead with the unit, so the box and its number
read as one thing:

- **Minutes to wash, oil and fill 6 pans**
- **Minutes to dimple and top 6 pans**
- **Minutes to take 6 out and put 6 in**
- **Minutes to weigh in and load one mix**
- **Minutes to weigh the dough out into 6 pans**
- **Minutes to cool and pack 6 pans**

The two card headings say it as well - the times you measured are "each for 6 pans, in minutes",
and the rest of the kitchen work is "the hand-work around the bake, in minutes".

**Nothing else moved.** No number changed, no arithmetic changed, no figure on the screen reads
differently. This is the labels only, so if you had already worked out what went in each box,
nothing you typed has been affected.

**Nothing to set up, and no database step.** Open the app and the boxes say minutes.

**20 Sep 2026 — engine v133 (no database step). The Production line now counts the whole bake
day, not three jobs of it: weighing in and loading the mixer, weighing the dough out into pans
and cooling and packing each have their own box to time, and any job you have not timed is
named on the screen rather than quietly counted as free.**

**What you asked.** "no time alocation for handling the mixer? and weighing the dough, no other
process that need manpower, or should still need some resources?" You were right, and it was a
real hole in the screen. It was timing three jobs - wash oil and fill, dimple and top, and the
oven swap - and treating those three as the whole day's work. The mixing, the weighing out and
the packing were not in the arithmetic at all, so the day it promised you was a day nobody
could actually have delivered. Worse, the plan I wrote for this screen had named cooling and
packing; the screen I built dropped it.

**What changed.** "The rest of the kitchen work" is a new card on the Production line with
three more boxes to time, the same shape as the three you already timed: weighing in and
loading the mixer, weighing the dough out into pans, and cooling and packing. The list of jobs
now reads all six, each with its minutes a pan or the words "not timed", and every pair of
hands is placed against all six and not just three.

**A job you have not timed is named, never assumed free.** Leaving a box blank is allowed -
you may already have that time inside your wash, oil and fill figure, and there is a line under
the box saying so. But a blank box does not silently count as nothing: the screen lists the
jobs still untimed and tells you plainly that the day above looks longer than it really is
until you time them. A time with nowhere to go - minutes on the mixer but no batch size for it
to spread over - is treated the same way, rather than being divided by nothing.

**The mixer is timed per mix, not per pan.** Its minutes are spread over the batch it makes,
because that is the honest reading and it means a bigger mixer really does cost you less work
for every pan. Twenty minutes of weighing in is one seventh of a pan's work in a 25-pan mixer
and half that in a 50-pan one.

**And the answer changes when you time them.** This is the part worth knowing before you do.
At your own numbers with the three new boxes filled in - 20 minutes a mix, 3 minutes to weigh
out 6 pans, 12 minutes to cool and pack 6 - the whole day's hand-work is 8.3 minutes a pan, so
one pair of hands does about 7.2 pans an hour instead of the 12 the screen used to claim. Five
hours then makes **36 pans, not 60**. The wall moves too: it stops being the chiller and
becomes your own hands. Every number on the screen is yours to correct, and the day figure
moves the moment you type.

**Nothing to set up, and no database step.** Open the app and the three new boxes are there,
blank and waiting to be timed once.

**19 Sep 2026 — engine v132 (no database step). Your customer's own track page now keeps up
with the order: anything you change about an order reaches their page when you save it, and an
order you have just added has a page behind its link from the moment it exists.**

**What you asked.** "add new order and edit order din sync?" They were, on your own phones -
an order is one record, so an edit made on one phone is on the other within seconds. What was
NOT in step was your customer's track page, and that was a real defect. Their page was only
rewritten when the delivery day moved, the tracking number changed or the courier charge
changed - so if you corrected the items, the price, the address or the customer's name and
saved, their page went on showing the order as it used to be: the old items, and the old total,
in the very message you had already sent them the link in. Adding an order wrote no page at
all, so a link you sent straight away could answer "not found".

**What changed.** Every way of saving an order - adding one, editing one, the Note / tracking
box, and deleting the courier's Delivery & fuel line on Money - now hands your customer's page
the whole new version of the order, and the page itself decides whether anything it shows has
moved. Where the app used to hold a short list of the things it believed that page showed, it
now compares the entire row, so a figure on that page can never be left out of the decision
again.

**An added order has its page at once.** Adding an order publishes your customer's page there
and then, instead of waiting for the first time you happen to change its status, so the track
link in your confirmation message always has something behind it.

**A save that changes nothing writes nothing.** The page compares itself with what you last
published, so saving an order without changing anything they can see writes no page at all -
and if a write is ever refused (a phone with no signal, a SQL script not yet run), the next
save tries again rather than counting it as done.

**Nothing to set up, and no database step.** Open the app and it is already in step.

**19 Sep 2026 — engine v131 (no database step). A Production line screen: your bake day
drawn as a row of bars, the station that is holding you back named and made the only red
thing on the screen, and a ranked list of the changes you could make with what each one
actually buys you.**

**What you told me.** "can i have a apps function that visualise the flow, bottle neck
hightlight and something for me to optimise line balancing, so that i can have an optimise
manpower usage?" Then, when I asked how it should help you decide: "Both - ranked levers and
what-if", and the numbers should come from "A planner I type into". You asked for all four
levers to be yours: **People**, **Pans and trays**, **The task times**, and **Days and hours**.

**The line, drawn.** Open **More → Production line** and your day sits on one screen: one bar
each for **your hands**, **the chiller**, **the oven** and **your pans**, every one measured in
the same unit — **pans an hour** — so they can be compared honestly. The shortest bar is the
one setting your pace. It wears a red wash, is named in a sentence just underneath, and it is
the only red thing on the screen, so your eye lands on the one thing that matters. Each bar
carries a plain line saying what that station is: "1 pair of hands · wash, oil, fill, top, oven
swap", "12 trays of dough over 5 hours", "6 pans every 15 min".

**What your own numbers already say.** The three tasks you timed for every 6 pans — 18 minutes
washing, oiling and filling, 8 dimpling and topping, 4 for the oven swap — are 30 minutes of
work for 6 pans, which is **5 minutes of work for every pan**. One pair of hands therefore
finishes **12 pans an hour**; your oven does **24**. And the chiller, holding your trays of
dough overnight at one tray to one pan, turns 12 trays through a 5-hour day at only **2.4 pans
an hour**. So the screen names **the chiller as the wall, not the oven** — your day comes to
**12 pans**, 48 short of the 60 you want — and it tells you that **one more pair of hands buys
nothing at all** while the trays are already full.

**The third pair of hands buys nothing.** That is the manpower answer, and the screen says it
in words rather than leaving you to work it out: once the chiller is out of the way, the
**second pair doubles the line** (12 pans an hour to 24) and the **third buys nothing**, because
the oven stops at 24. Spending on help before fixing the wall is money standing around.

**Where the hands go.** With two or more pairs the screen splits them by how much work each job
is, so two pairs reads "1 on the wash, oil and fill, and 1 on the dimple and top", with the oven
swap taken by whoever is free. Every job finishing at the same moment is the whole trick to
balancing a line, and it is the same arithmetic at two pairs of hands or at six.

**What to change, ranked.** Six moves are scored by the pans they actually buy on a day like
yours and sorted best first — **one more pair of hands**, **six more trays**, **six more pans**,
**a wash 10% faster**, **one more hour**, **one more pan per bake**. Each row says what the day
becomes and which wall is left standing after it. At your numbers only **six more trays** gains
anything (+6 pans, taking the day to 18) — and the other five keep their place and say so in as
many words ("No help — the chiller still sets the pace"), so nothing on the screen ever looks
like a button that does nothing.

**A planner, not a gate.** Nothing on this screen reads an order, nothing here blocks a sale,
and nothing here asks you to keep anything in step with it — the numbers are yours to correct
right on the screen, and the screen's answers move as you type. It is seeded from the kitchen
form you filled in, so it says something true the first time it opens. The planner shares
between your phones like the rest of your settings, so both of you plan from the same numbers.

**One number worth settling once.** Your form answered **8** trays where you have also told me
**12**. The tray count is your day's hard ceiling, so it decides everything above — the field
says so, and it is yours to set.

**19 Sep 2026 — engine v130 (no database step). The courier charge can now be changed from
Edit as well, and deleting the courier's line on the Money screen takes the charge off the
order with it.**

**What you told me.** "q2, yes make deleting it clear the charge too", and "edit a courier
related now only at one button, we should make edit an order able to alter details for
courier."

**Deleting the courier's line now clears the charge.** A charge you paid has two halves: the
**Delivery & fuel** row in your books, and the charge on the order. The Money screen only
shows you the row, so deleting it used to take that half alone — the order still wore the
charge, and the next Save in the order's own courier box quietly wrote the row straight back.
Now the row and the order go together: the amount, who bore it and the COD mark all come off.
The confirmation says so before you agree, naming the order, and the row is labelled
**Courier (order #A3F9C2)** so you can see which order you are deleting it from. Deleting an
ordinary expense still touches no order at all.

**The courier charge is under Edit too.** The amount, who paid the courier, how they settle it
and how you paid are now asked in the Edit order pop-up as well as in the **Note / tracking**
box — one shared set of controls, so the two forms cannot word it differently or save a
different charge. Edit's own order total moves as you type the amount, so you can check the
figure before you save rather than after.

**Nothing was taken away.** The Note / tracking box keeps all of it and is still the quick way
in; Edit simply gained the same questions, so an order can be corrected end to end without
opening a second box. Nothing changes on its own: a charge is only written when you save, and
saving an unchanged form writes an unchanged charge.

**19 Sep 2026 — engine v129 (no database step). Still to collect now counts the courier
charge the customer pays with the order, so the row promises the same money their own
message asks them for.**

**What you told me.** "q1, it should reflex rm72." RM72 was RM64 of bread plus the RM8 the
courier was charging, and the Money screen was showing RM64 — the items alone.

**What it does now.** When the customer bears the courier charge and pays it with the order,
**Still to collect** counts what they will actually hand over: the items plus that charge. So
the figure on your Money screen is the same RM72 their own message asks them for, and you are
never left counting a charge you are about to be paid.

**A COD charge stays out of it.** When the courier collects the charge at the door, that money
was never yours to collect — so it is not in this row either, exactly as it is not in the total
you ask them for.

**A charge you bore is not in it.** Nothing changes there: the bread is what they owe you, and
the postage is your own cost.

**Your takings do not move.** What has already come in — Cash in, TNG in, the net, every
journal — still counts the items alone, because a charge the customer pays is pass-through: it
arrives and leaves in the same breath, so it was never profit. Only **Still to collect** changed,
because that is the one figure about money still on its way to you.

**19 Sep 2026 — engine v128 (one database step — run supabase/courier_cod.sql BEFORE you
deploy). A courier charge the customer bears can now be a Courier COD charge: the courier
collects it at the door instead of it sitting in the total you ask for.**

**What you told me.** "courier charges can be collect, that means customer pay courier upon
collect." A charge the customer bears was always being added to the total you ask them for. That
is right when they pay it with the order — but when the courier collects it at the door, asking
for it by TNG as well means the same money is asked for twice, once by you and once by the
courier.

**What it does now. The Note / tracking box asks how they settle it.** Under **Who paid the
courier**, answering **The customer paid it** now opens a third box, **How they pay it**, with
two choices:

- **With their order (in the total)** — the charge sits inside the total you ask for, exactly as
  it always has. Nothing you have already recorded changes, because this is where that box
  starts.
- **COD - the courier collects it on delivery** — the charge comes out of the total you ask for,
  and is named everywhere as payable to the courier when the order reaches them.

**Nobody is asked for the same money twice.** The confirmation, the payment reminder and the
shipped message all quote the items alone as the total, and name the charge underneath as COD
with the instruction spelled out — "Courier charge: RM 8.00 - COD, pay the courier when your
order reaches you". The customer's track card says the same. COD is the word the couriers
themselves use for a parcel the receiver pays for; it is also called a reverse charge, but COD
is what your customers will understand.

**What you see.** The box tells you what the customer owes as you type, and it now reads
differently for COD — "the customer owes RM 30.00 - items total RM 30.00, plus RM 8.00 collected
by the courier on delivery" — so what you are asking for and what the courier is asking for are
never confused. The Edit pop-up's order total follows the same rule. And the order's row is
tagged **Courier RM 8.00 · customer · COD**, so you can see at a glance which charges the courier
is collecting rather than looking for that money in your tin.

**Your books are untouched, either way.** A charge the customer bears was already pass-through,
and COD does not change that — it still never reaches your takings. Only a charge you bore
yourself becomes a Delivery & fuel expense, exactly as before. (v129 above changes where that
charge is counted under **Still to collect**.)

**One database step.** Run **supabase/courier_cod.sql** in the Supabase SQL editor BEFORE you
deploy this build. The app publishes the whole tracking row in one call, so if that column does
not exist yet the call is rejected as a whole and the customer's tracking page stops updating for
EVERY order — not only the ones with a COD charge.

**19 Sep 2026 — engine v127 (no database step this time). Deleting a courier charge really
deletes it — the tag comes off the order and the charge leaves the customer's track card.**

**What you told me.** "why i delete courier charges and the tag is not remove?" You were
right, and it was a real fault, not a display quirk.

**What was wrong.** The charge is two things: the amount, and **who paid it**. Putting **Who
paid the courier** back to **Not recorded** felt like deleting the charge — and it is the
obvious way to do it, because that picker is what decides where the charge goes — but it only
deleted the answer to __who__, and left the amount behind. The order's row kept a tag reading
**Courier RM 8.00 · customer** for a charge nobody had assigned, and nothing you could do in
that box would take it off. Worse, it named the customer as the payer when nobody had said so,
so a row could claim they owed money they did not.

**What it does now. A charge is the amount AND the payer.** Put the payer back to **Not
recorded** and both go: the tag comes off the row, the customer's total goes back to the bread
alone, and the expense row goes out of your books. Clearing the amount still does the same, as
before. And a charge with no payer recorded — one restored from an older backup, say — is
tagged with nothing at all rather than being labelled as the customer's.

**Clearing a charge now reaches the customer's track card too.** It did not before: the card was
only republished when a charge was added, so a customer could keep looking at a courier line you
had just deleted. Now the card is republished whenever the charge changes, in either direction.

**Where to see it.** Orders → an order with a courier charge → **Note / tracking**, then set
**Who paid the courier** back to **Not recorded** and Save. The tag goes from the row.

**One thing left as it is, so you know.** Deleting the **Delivery & fuel** expense from your
Money screen does __not__ take the charge off the order — that row is your own record of money
going out, and the order is the record of what happened, so the two are deliberately separate.
If you would rather that deleting the expense cleared the order's charge as well, tell me.

**19 Sep 2026 — engine v126 (no database step this time). The messages that ask your customer
for money now show how the total is reached, and the app shows you the same arithmetic.**

**What you told me.** You pasted the confirmation for order #7E51BC — 4 × Focaccia 9"x12" 800g,
self collect, RM8 courier, Total RM 72.00 — and said: "the message need to show the add up for
rm72. And it should be the same for APP."

**What was wrong.** The RM72 itself was right. What was missing was any sign of where it came
from. The line above it named the bread without a price, so the RM64 of foccacia and the RM8
courier charge were both invisible, and the total read as a figure picked out of the air. That is
the worst place to leave it, because this is the message that asks them for the money.

**What it does now.** When the customer bears a courier charge, the messages no longer state the
answer on its own — they show the sum, in the same order every time, with the total underneath:

- Items: Focaccia 9"x12" 800g x4
- Items total: RM 64.00
- Courier charge: RM 8.00
- Total: RM 72.00

**The app says the same words, in the same order.** One piece of code works out those two figures
and their total, and the confirmation, the payment reminder, the shipped message and your own
screens all quote it. Two surfaces cannot drift apart when there is only one sum.

**On your side of the app.** The **Note / tracking** box's "The customer owes..." line and the
**Edit** box's order total both now read the breakdown as **items total ... + courier charge ...**
— the same two words the customer sees, so the figure in front of you and the figure they were
sent are provably the same arithmetic.

**An order with no courier charge is untouched.** Its messages come out byte for byte as they did
before, and the tests hold that.

**Where to see it.** Orders → an order with a charge the customer pays → **Send confirmation**,
**Remind for payment** or **Send shipped message**. Your side: that same order's **Note /
tracking** and **Edit** boxes.

**One thing left for you to decide — not changed.** The Money screen's "still to collect" counts
the items only: RM64 on this order, not the RM72 the customer will hand over. That is deliberate,
because the line measures what stays in your purse and the RM8 arrives and leaves again in the
same breath. If you would rather it showed the full amount you are about to be handed, tell me
and I will change it.

**19 Sep 2026 — engine v125 (no database step this time). The courier charge now appears in the
two totals YOU read, and in the one customer message that was still missing it: the
confirmation.**

**What you told me.** Straight after deploying v124: "if customer were to paid courier, the total
is not shown to me and to customer." You were right, and it was three places, not one.

**What was wrong.** v124 did put a charge the customer bears into the payment reminder, the
shipped message and the track card, and named it in each. But the **confirmation** — the very
first message, the one carrying the TNG QR that asks them for the money — still quoted the items
alone. And on your side of the app, the **Note / tracking / courier** box never showed what the
customer owed, and the **Edit** box's order total left the charge out. So both totals you read
were lower than the figure the customer had actually been asked for. A customer paying what the
confirmation said would have come up short, and you would have had no way to see why.

**What it does now.** The **confirmation** names the charge on its own line just above the total,
exactly as the payment reminder already did — so the message that asks for the money and every
message after it agree. The **shipped message**, which named the charge but never said what the
order came to, now ends on the total as well. In your app, the **Note / tracking / courier** box
tells you what the customer owes as you type the amount, and it moves the moment you say the
customer paid it — showing the arithmetic, items plus courier, so the figure explains itself. The
**Edit** box's order total counts the charge the same way.

**A charge you bear still appears in none of the customer's totals** and in none of the figures
they are shown — that part has not changed, and it is still deliberate. Your own books are
untouched by a charge the customer pays, exactly as v124 had them.

**Where to see it.** Orders -> open an order -> **Note / tracking** (the total sits under the
question of who paid). **Edit** -> the Order total line. The customer's side: all four messages,
and their track card.

**19 Sep 2026 — engine v124 (one database step: run supabase/courier_fee.sql in Supabase
BEFORE you deploy this build). The Note / tracking box now records the courier charge itself,
and who bore it — and the two answers behave differently on purpose: a charge the customer
pays is added to their total and named where they can see it, and a charge you pay comes off
your profit under Delivery & fuel.**

**What was wrong.** You looked at the box behind an order's **Note / tracking** button and
said the **Paid by** picker there was for courier charges. It was not. It records how the
CUSTOMER paid YOU — Cash or TNG — and it is what puts an order's money into the right book on
your Money screen. It has been there since v101, from your own words about needing to
reconcile cash against the TNG app. Your reading was the more useful one though, because the
thing you were looking for did not exist anywhere in the app: there was no field for what the
courier charged, and none for who paid it.

**What it does now.** That box carries the **Courier charge** — what it cost to send that
order — and, under it, **Who paid the courier**.

**When the customer pays it**, the charge is added to what they owe. It is named on its own
line above the total in their payment reminder and their shipped message, and on their track
card, so a total that runs a little more than the bread explains itself rather than looking
wrong. Your books are not touched at all — and that is deliberate, not an oversight: in your
purse that money arrives and leaves again in the same breath, so counting it as takings would
only make a good day look better than it was.

**When you pay it**, a third box asks **How you paid the courier**, and the charge becomes an
ordinary **Delivery & fuel** expense dated the day you paid it. It then shows up on your Money
screen, in that account's own journal, and as a line on your profit statement — so it comes off
your profit like any other cost, which is exactly what you asked for: off profit only if you
paid it. Recording the same order twice updates that one expense rather than adding a second,
and clearing the amount takes it away again.

**Either way, the order's row is tagged** with the charge and whose money it was — amber when
it was yours, quiet grey when it was theirs, sitting beside the Cash / TNG tag.

**The box you misread is renamed.** The picker that was called **Paid by** now reads **Paid by
the customer**, and it sits below the courier charge rather than above it, so the two questions
cannot be confused again: one is what THEY paid YOU, the other is what YOU paid the courier.

**Where to see it.** Orders → open an order → **Note / tracking**. The customer's side:
the payment reminder, the shipped message, and their track card.

**Before you deploy.** Run **supabase/courier_fee.sql** once in Supabase (Dashboard → SQL →
New query → Run). The app publishes each order's tracking row in a single call, so if that
column is missing the call is refused whole and the customer's track page stops updating for
every order — not only the ones with a charge. Run the SQL first, then deploy.

Nothing else moved — your prices, customers, delivery dates, the shop and the way messages are
written are all exactly as they were.

**18 Sep 2026 — engine v123 (no database setup needed). The product dropdown's middle section now
groups sold-out and not-sold-that-day together, and a product the shop does not sell on a day is
named by the days it IS sold instead of being given a count for a day it was never on.**

**What was wrong.** The dropdown's middle section was called **Sold out** and read its count for the
day you were adding to. But a product the shop does not sell on that day at all — a Saturday-only
loaf on a Wednesday — was sitting in **On the shop**, and worse, could be labelled "sold out" from a
count for a day it was never on the menu. Neither told you anything true.

**What it does now.** The middle section is **Unavailable**, and it holds both kinds together: a
product that has **sold out** for the day you are adding to, and a product the shop **does not sell
on that day**. The second kind is named by the days it IS sold — a Saturday-only loaf on a Wednesday
reads "(only Sat & Sun)". The headings are now **On the shop**, **Unavailable**, **Taken down**.

**Why they are one section, not two.** They are the same thing to you: an active product you can
still choose. You bake to a plan of your own, and as you put it — every day the kitchen may make 12
focaccia, ordering closes the day before at 6pm, and the 12 are not necessarily sold off, so some go
to a walk-in or into the fridge. **The picker is a guide while you sell, never a gate**: nothing is
blocked, and the order-by deadline you set per product is deliberately not counted, because that
deadline stops a stranger ordering — it says nothing about what you may sell by hand.

**Where to see it.** Orders → **+ New order** → Items, and Orders → open an order → **Edit**.

Nothing else moved — your prices, customers, delivery dates, the shop and the way messages are
written are all exactly as they were.

**18 Sep 2026 — engine v122 (no database setup needed). The product dropdown now shows the three
kinds inside the list itself: each kind sits under its own heading, and on a newer phone each section
is tinted in its colour.**

**What changed.** Adding items to an order — in **+ New order** and in **Edit** — the product list
now comes in three labelled sections instead of one long run of names: **On the shop** first, then
**Sold out**, then **Taken down**. The headings appear on every phone, because they are part of the
list itself.

**The colour.** On a phone with the very latest system — a new iPhone or a recent Android — each
section is also tinted inside the open list: **green** for on the shop, **amber** for sold out,
**grey** for taken down. The menu then reads as three blocks you can tell apart without reading a
word.

**On an older phone.** The open list is drawn by your phone itself, and an older phone will not let
a page colour it. You get the same three headings in the same order, and the closed box still wears
the colour of whatever it holds — you lose the section tint and nothing else. Nothing is broken,
and nothing has moved; only the colour is missing.

**This replaces the v121 note below.** v121 put the colour on the closed box alone, because the
open list could not be reached. Newer phones can be reached, so the list carries the colour too.

**Where to see it.** Orders → **+ New order** → Items, and Orders → open an order → **Edit**. The
list is otherwise unchanged: the same products, the same "(hidden)" marker, the same "12 left"
count.

Nothing else moved — your prices, customers, delivery dates, the shop and the way messages are
written are all exactly as they were.

**18 Sep 2026 — engine v121 (no database setup needed). The product dropdown now shows you which
kind of product each choice is, in colour, and lists them in the order you would look for them.**

**What changed.** Adding items to an order — in **+ New order** and in **Edit** — the product list
is now sorted into the three kinds you already know, in the order you would reach for them: what is
**On the shop** first, then anything that has **sold out** for the day you are adding to, then
whatever you have **taken down** (still marked "(hidden)"). A product still in Draft stays out of
these lists entirely, as it always has.

**The colour.** The closed box wears the colour of whatever is picked — **green** for on the shop,
**amber** for sold out, **grey** for taken down. On an order with several lines that means one
glance down the list tells you which lines need a second look, without reading each one.

**Why only the closed box.** The open list is drawn by your phone itself, and iOS does not let a
page colour the rows inside it. So the colour sits on the box you see while the list is shut, which
is where you read it anyway.

**Where to see it.** Orders → **+ New order** → Items, and Orders → open an order → **Edit**. The
list itself is unchanged: the same products, the same "(hidden)" marker, the same "12 left" count.

Nothing else moved — your prices, customers, delivery dates, the shop and the way messages are
written are all exactly as they were.

**18 Sep 2026 — engine v120 (no database setup needed). One customer is one row. The app now
recognises a phone number by its digits, so the same person can no longer appear twice just because
their number was written with a + in front of it — and the duplicate already in your app joins
itself into one the first time you open it after updating.**

**What was wrong.** A customer used to be identified by their number written in exactly the same way
every time. So **+60123456789** and **60123456789** looked like two different people, and the
Customers list showed the same customer twice. Your messages always went to the right person — only
the list disagreed. Numbers are now read by their digits, which means **012-345 6789**,
**+60 12-345 6789** and **60123456789** are one person, the same way "012345" already found
"012-345" in the finder.

**It tidies itself once.** The first time you open the app after updating, it joins any customer who
was split this way, carrying their dog's name and photo, what they like and avoid, and their note
across to the one that remains. There is nothing to do — you will simply find one row where there
were two. If you are the careful sort, take a cloud backup first from **More → Backups**: that is the
way back if anything looks wrong, and it costs one tap.

**New: "Join with another customer".** Open a customer's history and you will find the button under
their number. Tap it, pick the duplicate from the list, and confirm. Reach for it when two rows are
split for some other reason — a misspelt name with no number beside it, say — which the tidy above
cannot guess at. It moves the other person's orders under the name and number of the customer you
were looking at, so open the row you want to KEEP. This one cannot be undone inside the app; your
cloud backup is the way back, and the confirm box says so before it acts.

**Two things worth knowing.** Update both phones — a phone still on v119 can save a number the old
way from its Profile card, and only the updated build does the tidy. And on the Profile card itself,
the number you type is now stored in the one form every label, message and link already uses, so a
"+" or a space can never split a customer again.

Nothing else changed — your prices, your delivery dates, the shop and the way messages are written
are all exactly as they were.

**18 Sep 2026 — engine v119 (no database setup needed). Start typing a customer's name in an
order form and the people you have already served appear underneath — tap one and their name and
WhatsApp number fill themselves in.**

**How it works.** Type two letters — "aun" is plenty — and a short list appears right under the
name box. Each row shows their number, how many orders they have placed, and the item they buy
most, like **012-345 6789 · 5 orders · usually Focaccia**. Tap the right person and the name and the
number both go in; the delivery day, the items and self-collect-or-courier stay yours to set. One
letter on its own is not a search — it would offer you half your address book — and a name you have
never served offers nothing at all. Typing a number without its dashes finds them too, so
"012345" works the way "012-345" does.

**Both order forms do it** — the **＋ New order** card and the **Edit** pop-up, the same way.

**Two things worth knowing.** It draws on the orders already in the app, so on a brand-new setup it
has nothing to offer until your first order is saved. And on the **Edit** form, saving a changed
name has always carried that name to every other order belonging to the person it was — that is the
one-saved-name rule from v68 and it has not changed, but picking a name is now much easier than
typing one, so it is easier to do by accident. If you ever pick the wrong person while editing an
order and save it, tell me and I will add a confirmation that asks first.

Nothing else changed — the Customers screen, its finder, your prices and the shop are all exactly
as they were.

**18 Sep 2026 — engine v118 (one SQL step in Supabase; nothing to re-install). The order alert on
your phone now arrives as a real notification instead of a wall of raw text.** The ping that
reaches you when a customer orders was showing the whole message as unreadable computer text —
curly brackets, quote marks, the word "title" — instead of a notification. The cause was the way the
message was handed to the ntfy service: the channel name has to travel inside the message for
ntfy to lay it out as a title and a body. It was missing, so ntfy did the only thing left and
printed everything as plain text.

**What you see now.** A notification titled **New order - Jien Luv 2 Bake**, with the delivery day
written out in full (Sat 19 Sep 2026, not 2026-09-19), the total as money (RM 10.00), a bread
icon, and a higher priority, so it is more likely to make a sound and pop up rather than wait
quietly. A courier order also carries the address; a self-collect order no longer shows a
delivery address it does not have.

**A tidy-up came with it.** Your channel name used to be typed inside the rule that sends the
pings, and three leftover test rules from setting this up carried copies of it too. It now lives
in one small table, and the three leftovers have been removed — so the name that guards your
alerts exists in exactly two places: your database, and the ntfy app on your phones.

Nothing about ordering changed, and no phone needs re-subscribing.

**17 Sep 2026 — engine v118 (no database setup needed). The Paid step now stays in its place on
every order, wearing an X until the money is in — and turns into a green tick when it is.** This
replaces what v117 did, on your instruction.

**Your reasoning, and you are right.** The customer's track page is the design: they must see the
same steps in the same places every time, and your own app has to read the same way. v117 left the
Paid step **off** an order that skipped it — five dots instead of six — which meant the two lines
did not line up, and a missing step is itself a thing to puzzle over.

**What happens now.** A regular who pays when she collects still never passes through Paid. But that
step keeps its place in the line, and it wears an **X** — amber, deliberate — instead of a tick, and
it never turns green while the money is outstanding:

> New ✓  ·  Confirmed ✓  ·  **Paid ✕**  ·  Baked ✓  ·  Packed ✓  ·  Collected / Shipped ●

Press **Paid · Cash** or **Paid · TNG** when she hands the money over — at whatever stage the order
has reached — and **the X becomes the tick**: the ordinary green ✓, in the same spot, with the
**Cash** or **TNG** tag beside the row. The order itself stays where it was: taking the money never
drags it backwards.

**Both lines change together.** Your row's map and the **customer's own track page** draw the same
six steps, so the X is on their page too, and it turns green there the moment you record the money.
A step that is __deliberately gone past but not paid__ now looks different from a step that has not
been reached (grey) and from a step that is done (green) — which is exactly the distinction that was
missing.

**17 Sep 2026 — engine v117 (no database setup needed). A regular who pays when she collects no
longer has a Paid step on her order — and the Paid · Cash / Paid · TNG buttons stay on until the
money is actually recorded, wherever the order has got to.** From your note about close customers
paying by TNG or cash at pickup.

**What was wrong.** Move an order from Confirmed straight to Baked — no payment — and the row's map
still showed **Paid with a green tick**. It was claiming money you had not taken. The app assumed
"past Paid means paid", which is fine for her old orders but false for a regular who settles up at
the counter.

**What happens now.**
- **A bypassed order has no Paid step.** Her route reads New → Confirmed → Baked → Packed →
  Collected / Shipped: **five dots instead of six**, and no tick for a payment that never happened.
- **The Paid · Cash / Paid · TNG buttons stay on** at every stage from Paid onwards — Paid, Baked,
  Packed, and Collected / Shipped — until the money is recorded. So the moment she hands over the
  cash at the counter, wherever the order has got to, you press the button right there: **the order
  stays where it is** (marking an order paid never drags it backwards) and the money is stamped with
  the day it landed, which is the day the Money screen counts it.
- **And the Paid step comes back once it is paid** — a green tick, in its proper place in the line,
  with the **Cash** or **TNG** tag beside the row. So the map ends up telling the truth about that
  order either way.
- The buttons disappear the moment the payment is recorded, and they never appear before the order
  reaches the Paid stage.
- **The customer's own track page follows the same rule** — the same five dots, no Paid tick for a
  payment that has not happened, and the step appears there too once it is recorded.

One rule behind it, worth knowing: moving an order into Paid **or any later stage** without having
pressed a Paid button is taken as __this order owes money__. That is what your older orders are
protected from — nothing already in the app changes, because only orders you move now are marked.

**17 Sep 2026 — engine v116 (no database setup needed). A Day one form: your opening balance —
the cash in the tin, the money on your phone and what is on your shelf — entered once, in one
place.** From you telling me __"we need to enter opening balance"__.

**What an opening balance is here.** Four answers about the morning your books begin: what is in
the tin, what is on your phone, what is on your shelf, and who still owes you. Until now the app
could take all four, but in three different places and one ingredient at a time, which is a poor
way to start.

**The form.** More → Money → the new **Day one** line (under **Books**) → **Set**. It asks for:

- **Cash in your tin** and **Money on your phone (TNG)** — two boxes, and the day your books begin,
  which takes any date but should be the day you are starting from.
- **What is on your shelf** — your ingredients, one box each, already in the unit you use for that
  ingredient (kg for the flour, g for the salt — no converting). Ingredients you have marked as
  __not something I buy__, like labour, are left out: they have no shelf to count.
- **Who still owes you** needs no box — those orders stay unpaid and show under **Still to collect**.

**Nothing is half-saved.** Every box is checked before anything is written: if one has something
that is not a number, nothing saves at all until you fix it. And **a box you leave empty is left
exactly as it is** — so the form is safe to reopen later just to correct one figure, and safe to
run again without wiping what you already had.

**What it writes.** The tin and the phone become ordinary money-in rows dated that day (so from
then on the Money screen's **Net** is what you should really hold, and the weekly check works from
the first week), and the shelf becomes each ingredient's **On hand** — the figure your shopping
lists subtract, so your first list buys only what you are genuinely short of.

**What it deliberately does not do.** Money you **owe** — a loan for the oven, a supplier you have
not paid — has nowhere to go: the app keeps a loan as a way of paying, not as a debt, so record what
it pays for as it happens. Your own money in shows under **Capital you put in** on Profit, never as
income. And the tin must not be entered as a sale: a sale has a customer behind it.

Section 3 of the **Money and Profit** manual has been rewritten around the form — it is attached.

**17 Sep 2026 — engine v115 (no database setup needed). The month arrows on Profit work both
ways again.** From you telling me __"the profit month can move earlier but cannot move later"__.

**What was wrong.** Open Profit — it starts on this month, where the **›** arrow is correctly
switched off, because there are no numbers after today. Press **‹** to step back to August, and
**›** stayed switched off too, so you could not get back to September. You could walk backwards
through the months but never forwards again: to return you had to leave the screen and open it
again. The arrow's state was worked out once, when you opened the screen, and then reused on every
step — so it kept answering for the month you started on rather than the month you were looking at.

**Fixed.** The arrows are worked out fresh on every step, so **‹** and **›** now move both ways
between the months you have, and **›** switches off again only when you are back on this month.
Verified by stepping back and forward repeatedly. The same fault did not exist on the other
calendars — Orders, Delivery dates and the date pickers all recompute their arrows each time they
draw.

**17 Sep 2026 — engine v114 (no database setup needed). Every spending line in Profit & Loss now
opens — including the ones reading 0.00 — and the lines are twice as tall, so they are easy to tap.**
From you asking __"in profit the expenses is not clickable, is that a bug?"__

**You were right, and it was my mistake.** The lines that open their journal were the ones with
money in them. A line showing **0.00** was deliberately left dead, because there is no journal to
show — but I made it look **exactly** the same as a live one: same colour, same font, no hint. So if
your month has most categories at 0.00, nearly every line you tapped did nothing, and "not clickable"
was the only sensible conclusion. A line that looks alive and does nothing is worse than no line.

**What it does now.** Every spending line opens: __Packaging__, __Utilities__, __Delivery & fuel__, the
categories you have added, and **Total expenses**. A line with money in it shows its journal as
before. An empty one opens and **says so in your own words** — __"Nothing recorded under Rent in
September 2026"__, In / Out / Net at zero, and a line telling you it will fill up on its own as you
record spending under that category. The statement's own totals (**Sales**, **Cost of sales**,
**Gross profit**, **Net profit**) stay figures rather than doors — you did not ask for those, and
they are not spending.

**Two more things found while fixing it.**
- **The lines were only 17 pixels tall** — a small target for a finger, and easy to land in the gap
  between two lines and hit nothing. Tappable rows everywhere (the Profit statement, the Money
  screen's cash rows, the Books list) are now **36 pixels**, comfortably thumb-sized.
- **The Total expenses journal did not say which category a row belonged to.** It read
  __"2 Sep · boxes · Cash"__ with no way to tell what "boxes" was for. It now names it —
  __"2 Sep · Packaging — boxes · Cash"__ — while a single category's journal still reads short, since
  its title already says which category it is.

**17 Sep 2026 — engine v113 (no database setup needed). Every way you pay now has a book you
can always open — including a pocket that has been quiet — behind a new Books line on the Money
screen.** From you asking __"where can i find pocket journals"__.

**What was wrong.** The journal rows live on the money card, and that card only shows a pocket's
row **when that pocket moved money in the stretch you are looking at**. The card opens on
**Today**, so a pocket that paid for something last week had no row today — and no way into its
book at all. Cash and TNG never had the problem: their four rows (Cash in, Cash out, TNG in, TNG
out) are always there. The pockets were the only books that could go missing.

**The Books line.** Under the two money cards there is now a second line beside __Categories & ways
to pay__:

> **Books**
> Every way you pay · 5 books, each opening into its own rows  ［ Open ］

**Open** lists **every** way you pay — Cash, TNG, Loan, Personal Pocket Kean, Personal Pocket Suan,
and anything you add later — each with what moved by it in the stretch on screen, each opening into
its own book **under the line you tapped**, so the list stays in front of you and you can step from
one book to the next. The first method with anything in it opens ready; a quiet pocket says so
plainly — __"Nothing moved this way in this stretch"__ — with its In / Out / Net at zero.

Two things this keeps honest: a method you have since **renamed or deleted** still gets a line,
because its money is still in the books and a figure you cannot open is a figure you have to take
on faith; and every figure in the list comes off the Money screen's own rows, so the list and those
totals cannot drift apart.

__A small thing the screenshot caught while building this: the first version printed the word
"null" under each closed line. Fixed, and there is now a test that fails if it ever comes back.__

**17 Sep 2026 — engine v112 (no database setup needed). You can pay a personal pocket back
out of the till in one go, and the category list on the expense form is no longer cut off.**
From your question — __"can my own withdrawal payback to the cash register like Personal pocket
Kean or Suan?"__ — and your note about the categories.

**Pay back a pocket.** On **More → Money**, beside **＋ Put money in**, there is now
**＋ Pay back a pocket**. It is for the case where a pocket of yours — **Personal Pocket Kean**,
**Personal Pocket Suan**, a loan, or one you add later — paid for something, so the money left
you rather than the till; that pocket's line on the Money screen then reads **−RM 40.00**, which
means __the till owes it 40__. Open the form and it comes up **already on the pocket that is
owed**, with the amount filled in — Kean's RM 40 sitting in the box, and a line saying so. Say
whether the money came out of **Cash** or **TNG**, check the day, and press **Pay back**.

It writes both halves at once, which is the whole point: the **till goes down** by that amount
(it shows in Cash out and in the Net, and in the Cash journal with your note), and the
**pocket's line comes back to zero**. One pocket can be paid back without touching another.
Because it is your own money going back to you, the till's side is recorded as a withdrawal —
so it never counts as a cost and your **profit does not move**. On the pocket's own list it
reads __"Paid back by the till"__, not __"From my pocket"__ — the two are different things and now
say so. Paying it back in part is fine: pay RM 25 of the RM 40 and the pocket reads −15 after.

**The category list was being cut off — fixed.** Thank you for catching this. On the expense
form, the row of categories ran off the side of the screen: it was laid out as one single line,
so at phone width everything past about the sixth category — __Salary (you)__, __EPF / SOCSO__,
__Marketing__, __Equipment & tools__, __Other__, __My own withdrawal__, and the **＋ New category**
chip — was off the screen and impossible to reach. Measured on a 375-pixel phone, the row was
744 pixels wide inside a 343-pixel box. The pills now **wrap onto as many lines as they need**,
the same fix applies to the ways-to-pay row and to the new pay-back form, and the whole list is
visible and tappable. Nothing about the categories themselves changed.

**17 Sep 2026 — engine v111 (no database setup needed). Every figure on the books is now a
door: a journal behind each line of spending in Profit & Loss, and a book for every way you
pay — Cash, TNG, Loan, Personal Pocket Kean, Personal Pocket Suan, and anything you add
later.** From two notes close together: __"the expenses items in Profit & Loss should reveal
its journals"__, then __"each CASH, TNG, LOAN, Personal Pocket Kean, Personal Pocket Suan, and
others that might be added in future need a journal"__.

**Profit & Loss — tap a spending line and see what made it up.** On **More → Profit**, the
running-cost lines (Packaging, Utilities, Delivery & fuel…) are now tappable, and so is
**Total expenses**. Tapping one opens its journal for the month on screen: every expense
behind that figure, oldest first, each reading __"<day> · <what it was for> · <how it was
paid>"__ and ending on the total the statement itself shows. So __"Packaging RM -58.00"__
opens two lines — the boxes paid from a pocket and the bags paid in cash. A line with nothing
in it that month is not tappable; there is nothing behind it. The header now says **Running
costs · tap a line to see the spending behind it**.

**Money — one line and one book per way of paying.** The single __"Paid by loan / other"__ row is
gone. In its place, every way of paying that is not cash or TNG gets **its own line** with what
moved by it, and its own journal behind it: **Paid by Loan**, **Paid by Personal Pocket Kean**,
**Paid by Personal Pocket Suan**, **Paid by Bank OD** — whatever you have called them. Money of
your own you put in that way reads as a plus on that line; what was paid out of it reads as a
minus. Cash in, TNG in, Cash out, TNG out and the Net are exactly as they were, and none of
these other ways is in the net — it never came out of your purse.

**Why they appear by themselves.** The lines are read off your own transactions, not off a
fixed list, so a method you add tomorrow needs nothing from me: record one payment with it and
it has a line and a book. And a method you have since **renamed** keeps a line for the name its
older rows were written with — those rows are still in the books, and a figure you cannot open
is a figure you have to take on faith. Each book ends on **In / Out / Net** for that method.

**One small correction while here:** the note at the foot of the Profit screen about your own
hours now matches v110 — either pay yourself a **Salary (you)** expense (with EPF / SOCSO as
their own category), or mark Labour as a not-bought ingredient and put the hours into the
recipes. Count them one way, never both.

**17 Sep 2026 — engine v110 (no database setup needed). An ingredient you never buy — your
own labour, electricity, gas — can be marked as a cost, and it then never appears on a
shopping list again.** From your note: __"certain ingredient we dont purchase, in ingredient we
can set that as a non purchase item, like labour and electricity"__.

**What it does.** Open **More → Ingredients** and tap **Edit** on the ingredient (or fill in the
New ingredient card at the top). Above the cost there is now a switch: **Not something I buy —
it only ever costs. It still counts in a recipe's cost, but it never appears on a shopping list
or a purchase order.** Turn it on for Labour, Electricity, Gas, your own time.

**Where you see it.**
- The ingredient's **card** stops showing an On hand and a Keep-at-least line, and says instead:
  __Not bought — a cost in your recipes, never on a shopping list__. Nothing else about the card
  changes, and the cost you typed is untouched.
- Every **shopping list** (the preview, the list you save, and an "orders changed" follow-up)
  leaves that ingredient out — and says so at the foot of the list: __Not on this list: Labour,
  Electricity — marked as not something you buy. Their cost still counts in the products that
  use them.__ So it reads as deliberate, not as something the app forgot.
- The **recipe cost** is unchanged: a recipe using Labour at RM 8 an hour for 15 minutes still
  adds RM 2.00 to that product's cost, and that runs on into the Profit screen's cost of sales.

**Switching it OFF restores the ingredient exactly as it was** — the app removes the mark rather
than storing a "No", so nothing that exists today changes unless you turn this on.

**And a word on the books, since this touches Profit:** if you mark Labour as not-for-purchase
because it is your own unpaid time, it is already inside each product's cost of sales through the
recipe — so do **not** also record it as a Salary expense, or the same hours get counted twice.
The **Salary (you)** category is for when you actually pay yourself money out of the till.

**16 Sep 2026 — engine v109 (no database setup needed). A journal for each way the
money moves — the cash book, the TNG book — and a bug that was hiding in the TNG
column.** Two things, both from you asking how to see the journals.

**A bug first, because it matters.** Every order you marked **Paid · TNG** since v106
was landing in "Paid, no method" instead of the TNG column. The app was checking for
the old way of writing it ("tng") while the paid buttons write the list's own label
("TNG") - so the TNG in figure read RM 0.00 with the money in your phone, and the same
money showed as unaccounted for. Fixed, and there is now a test that would have caught
it. If your TNG column has looked wrong since v106, that was it.

**Tap a figure, see its journal.** On the Money screen, **Cash in / TNG in / Cash out /
TNG out** (and the loan line) can be tapped. Each opens that method's book for the
stretch: every order paid that way with its code and customer, everything you spent out
of it with its note, anything of your own you put in - in date order, ending on In /
Out / **Net**, and a line saying what that is meant to be (your purse, your phone, or
money that never went near either).

**16 Sep 2026 — engine v108 (no database setup needed). Where the two lists live, and
how to change one.** One fix and one addition, both about the categories and the ways
to pay.

**Why.** v106 put them in a Settings card and you could not find it, and there was no
way to change an entry once it existed - "dont put the setting separately, it should be
at where it suppose to be."

**They are on the Money screen now**, as a line under the money lists reading
"Categories & ways to pay · 11 categories · Cash, TNG, Loan" with an **Edit** beside
it. Tap Edit and the lists open: every category with its kind (ingredients / running
cost / your own money) and every way to pay, each line saying "edit".

**Tap a line and it turns into the form**: rename it, change what kind it is, or
delete it - in place, with the rest of the list still in front of you. Renaming moves
what you have already recorded with it, so a slip of the thumb does not split your
history into "Packaging" and "Packing".

**And the ＋ chips sit where you are working**: the Add an expense form and Put money
in each end their pills with **＋ New category** / **＋ New way to pay**, which opens
the same small form in place - the amount and the note you had already typed stay put.

**No window inside a window.** These forms expand in place instead of opening a pop-up
of their own, the same rule the date field follows: the app has one pop-up layer, so a
second one would wipe out the form underneath it.

**16 Sep 2026 — engine v107 (no database setup needed). The item line on an order
reads properly again.** One fix, on the two forms where you type an order's items.

**What was wrong.** When the selling price joined the line (v101) it took most of the
row. Measured on a 375px phone: the price box was 183 pixels wide and the product
dropdown was squeezed to **2** — so the name of what you had picked was pushed onto a
line of its own and unreadable, and the whole line looked broken.

**What it does now.** Each item line is two clean lines: **the product across the
top**, full width so its name reads, and its controls under it — how many, the selling
price on the right, and the ✕ to remove. The same shape in the ＋ New order card and
in the Edit pop-up, since both are the same row.

**16 Sep 2026 — engine v106 (no database setup needed). A note on every transaction,
and two lists you shape yourself.** Three small things, all on the money screens.

**A note on each one.** Add an expense now takes a note ("Mydin run, 2 boxes") - the
Put money in form already had one - and both lists on the Money screen show it beside
the amount, so a row reads as what it was, not just a figure.

**The categories are yours.** More → Settings gains a **Categories & ways to pay**
card. Every category shows what it means to the accounts (ingredients / running cost /
your own money), each has a ✕ to delete it, and you can add your own - "Baking class",
"SSM licence" - choosing which of the three it is. Deleting one never touches what you
have already recorded: those rows keep their label and still count, printed at the end
of the statement's cost list rather than dropped.

**And the ways to pay are yours too.** The list is Cash, TNG and **Loan** - the third
choice you asked for - and you can add your own, a **Bank OD** or a cheque, so a
shopping run nobody would pay for out of the till can still be recorded honestly. The
same list appears on the Bought prompt (where the receipt is still in your hand) and
on both money forms.

**One thing that follows from it.** Money that never came out of your purse - a loan,
an overdraft - no longer sits in the net. The Money screen leaves it out of the cash
figures and names it on its own line, "Paid by loan / other", with a sentence saying
why. Net now means exactly what it says: what should be in your purse and on your
phone.

**16 Sep 2026 — engine v105 (no database setup needed). The books: a profit and loss
account, a month at a time.** One new screen, More → Profit.

**Why.** Money told you what was in your purse. It could not tell you whether the
baking made money - a RM250 flour-and-butter run makes one week look like a disaster
while the bread it went into sells the week after.

**What it shows.** More → Profit, month by month (arrows either side), reading down
like a set of accounts: Sales, Cost of sales, Gross profit, the running costs one line
each, Total expenses and Net profit - with the gross margin beside the order count.
Then, kept apart from all of it, your own money: capital you put in, drawings you took
out, and what is left in the business.

**The one rule that makes it accounting rather than a cash total.** Ingredient cost is
what the baking cost to make, taken from your RECIPES as the bread sells - not the
packs you bought. Buying and using sit in different places on purpose: a shopping run
is money out on the Money screen and stock on your shelf, and it becomes a cost of sales
here as the bread made from it goes out. Nothing is counted twice, and a big stock-up
week stops looking like a loss.

**Your own money is neither income nor a cost.** What you put in is capital; what you
take out is drawings (including the "My own withdrawal" category). Both move cash -
Money counts them - and neither changes profit. If you pay yourself a proper salary,
record it as **Salary (you)**, with **EPF / SOCSO** as its own category, and those DO
count as running costs.

**The category list is now a chart of accounts:** Ingredients & shopping (stock),
Packaging, Rent, Utilities, Delivery & fuel, Salary (you), EPF / SOCSO, Marketing,
Equipment & tools, My own withdrawal, Other - the same list the Add an expense form
offers, so every row lands on the right line of the statement.

**Two things it will not pretend to know.** Your own unpaid hours are not a cost - if
your time is worth paying, pay yourself a salary and it becomes one. And a product
whose recipe prices to nothing is counted as costing nothing; the screen says how many
lines that was, so it is visible rather than flattering.

**16 Sep 2026 — engine v104 (no database setup needed). Money you put in yourself,
and taking it back out.** One change, on More → Money.

**Why.** Some spending happens before any order money arrives - a packet of flour paid
from your own purse, a float of change for the day - and there was nowhere to put it.
The Money screen only counted what customers paid.

**Put money in.** More → Money now has a **Put money in** button beside Add an
expense: how much, the day you put it in, cash or TNG, and a short line saying what it
was for. It counts into the Cash in / TNG in rows, because your own money really is in
your purse and those rows are what you check the purse against - and one line
underneath says how much of the money in was yours: "of the money in, RM 100.00 was
your own". The entry is listed in its own **Money in** card, so you can see where it
came from, and take it off again.

**Taking it out again.** Add an expense has a new category, **My own withdrawal** -
money you take back for yourself rather than a cost of baking. It leaves through the
same money-out list as everything else, so the net, the day lines and your backups
count it with no new machinery. Your own money in and out is shared between your
phones, like every other list.

**16 Sep 2026 — engine v103 (no database setup needed). Money out: what you spend,
beside what you take in.** One change, on the shopping side of the app.

**Why.** v101 gave you the money coming in. Spending had nowhere to go: a purchase
order worked out what a shopping run should cost, and tapping Bought put the packs on
your shelf, but nothing recorded what you actually paid.

**A shopping run now asks.** Tap **Bought** on a saved list and, once the packs are on
your stock, a small box opens: **What did you pay?** - pre-filled with the list's own
total, with **Cash** or **TNG** beside it. Accept the guess with one tap, or type what
the receipt really said. **Skip the money** leaves the stock added and records nothing,
exactly as the app behaved before.

**Everything else goes in by hand.** More → Money now carries an **Add an expense**
form for what a purchase order never sees - packaging, delivery and fuel, utilities,
equipment, or a market top-up - each with the day you paid it, so a receipt found in
your bag later still counts on the right day.

**The Money screen adds it up both ways.** Cash in, TNG in, Cash out, TNG out and
**Net** - what should be in your purse and on your phone for Today / This week / This
month - with that stretch's spending listed underneath, each line showing what it was
for and how you paid. What is still to collect stays out of the net: it is money owed,
not money held. Expenses are shared between your phones, and counted in your backups,
like every other list.

**One fix along the way.** A payment taken just after midnight was being counted as
the day before, because the app read the date off the stamp in UTC. It counts on your
own day now.

**16 Sep 2026 — engine v102 (no database setup needed). Swipe across the calendar
to pick a run of delivery dates.** One small change, on More → Delivery dates.

You asked whether the delivery-date calendar could work the way a product's
availability calendar does. It now does: **drag across days and the whole run fills
in under your finger**, then **Add selected** puts them on the calendar. It is the
same gesture as dragging a sell period on a product. A single tap still picks one day
(or puts it back), and a day that is already a delivery date is left alone by a drag
— it comes off by tapping it, the way it went on.

That makes four ways in: tap dates, swipe a run, tap a weekday letter for every one
of that day in the month, or **Generate the next dates** on your Settings pattern.

**What I deliberately did NOT copy: the From / To boxes.** On a product's
availability card those two boxes are how a SEASON is said — a sell period genuinely
has two ends. A delivery date is one day, not a stretch, so a From/To here would only
ever have been a slower way to do what swiping now does.

**16 Sep 2026 — engine v101 (no database setup needed). A price you can change on
an order, and the money recorded as cash or TNG.** Three things, all about money.

**A price you can change on an order.** Every item line on the ＋ New order form and
in the Edit pop-up now carries its selling price. It opens on what the product costs;
type over it and THAT order is sold at your price — the confirmation, the payment and
pickup reminders, the receipt, the customer's own track page and every money number in
the app follow it. Your menu price is untouched, and a menu price you change next week
never rewrites a sale already made. Blank keeps "whatever the product costs", which is
how an unpriced product has always behaved. Both forms also show the items total as
you go.

**Cash or TNG, written down when the money lands.** The Paid button is now **Paid ·
Cash** and **Paid · TNG** - one tap each. The order remembers which, and when, and
shows it beside its status. The Note / tracking box (now **Note / tracking /
payment**) carries a **Paid by** box as well, for an order you marked paid before you
could tell, or one to correct later. None of this reaches the customer: their page
just shows Paid.

**Two places to check it against.** The delivery day's own header on Orders now
carries a short till - "Cash RM 95 · TNG RM 120 · 1 to collect". And More → **Money**
is a screen of its own, with **Today / This week / This month**: cash collected, TNG
collected, paid but no method recorded, and what is still to collect with the number
of orders. Collected money is counted by the day it LANDED, so a transfer that comes
in today counts today even when the order delivers on Friday; what is still to collect
is counted by delivery day, because that is the day you hand it over. An order paid
before any of this existed shows under "Paid, no method" rather than being guessed at.

**16 Sep 2026 — engine v100 (no database setup needed). Making delivery dates for
a weekday is one tap again.** One change, on More → Delivery dates.

**Why.** You found the function missing: adding your delivery dates for, say, every
Monday meant tapping each Monday by hand. Nothing had been removed - the app's only
"do the dates for me" button lived on Home, inside the "No delivery dates yet"
message. That message shows only while you have no upcoming dates, and pressing the
button creates the very dates that hide it: it was a one-shot button that took
itself off the page the moment it worked. So once you had dates, which is every day
since your first week, it was never there again.

**Three ways in now.** On More → Delivery dates: tap dates and **Add selected**, as
before; or **tap a weekday letter** - tap **M** and every Monday in the month shown
is picked for you, tap it again to put them back, and the letter underlines solid
once that whole weekday is picked; or press **Generate the next dates**, which is
always there, follows the delivery days in your Settings, and adds the next six
dates that are not on the calendar yet. Generate moves the calendar to the month the
new dates start in, so you can see what it just did.

**One wrong line fixed with it.** Home's "no dates yet" message used to say "the next
Mon/Wed/Fri dates" whatever your delivery days really were. It names your own days
now (and so does the line under Generate).

**15 Sep 2026 — engine v99 (no database setup needed). The customer can tap the
"Next available" line and be given that day.** One change, on the order page.

**Why.** A product you keep on the shop, on a day it cannot be ordered, tells the
customer when it can be had - "Next available: Sat 19 Sep". Until now they had to
go and find that date on the calendar themselves.

**What it does now.** The line is a control: tapping it takes that delivery day, so
the product in front of them can be ordered straight away, and the page moves up to
the calendar, where the chosen day is written out in words. It keeps its gentle
pulse, and wears a small arrow so it reads as something to tap.

**The one time it does not take the day.** If the customer already has something in
their basket, the line stays a plain label and tapping it answers instead: "Your
basket is for Fri, 18 Sep. To order for another day, choose it on the calendar
above." Taking a day then would silently move their whole order to a new date - and
drop anything that does not fit there - which is not something a tap on a product
line should ever do. Changing the day is what the calendar is for.

**15 Sep 2026 — engine v98 (no database setup needed). The last status reads
Collected / Shipped, and a placed order gains a Note / tracking button.** Two
small changes on the Orders screen.

**One label for the last stage.** v97 named it per order - Collected on one the
customer fetches, Shipped on one you post. You asked for the pair itself instead,
so the stage now reads **Collected / Shipped** everywhere it is named: the row's
status list, the row's own journey map, the day's status filter, and the map on the
customer's track page (in all three languages). Which message the row offers is
still decided by the delivery method - a courier order shows **Send shipped
message**, a self-collect one **Send pickup reminder**.

**A way in for the two fields you reach for most.** Beside Edit, every order now
carries a **Note / tracking** button. It opens a small box with exactly two fields -
the order's **Note** and the courier's **Courier tracking number** - and a Save.
Send, and the note lands on the order, while the tracking number also goes onto the
customer's track card and into the shipped message. Nothing else moved: **Edit**
still opens the full form (the delivery day, the customer, the address, the items,
the quantities) whenever you need it. The tracking box that sat on the row itself
in v97 is gone - the button is the quicker, tidier way to the same field, and it
works on any order rather than only a courier's.

**15 Sep 2026 — engine v97 (one database line to run once). The last status is
named for how the order leaves, and a posted order can carry its courier's
tracking number.** One change, across the order row, the WhatsApp messages and the
customer's track page.

**The last status is Collected or Shipped.** The final step used to say
"Delivered" for everything. It now reads **Collected** on an order the customer
fetches from you and **Shipped** on one you post - the same step in the journey,
named for what actually happened. That is true everywhere the status is named: the
row's status list, the row's own journey map, the day's status filter, and the map
the customer sees on their track page (in all three languages). Nothing about the
step's behaviour changed, and every order already sitting at that step keeps its
place - only the word is different.

**A tracking number, typed where you post the parcel.** A courier order shows a
**Courier tracking number** box under its details from Packed onwards, and a
**Send shipped message** button beside the status. Type the number the courier gave
you, press the button, and WhatsApp opens with the message already drafted: the
order number, what was sent, and the tracking number. The box is in the Edit
pop-up too, for a number you need to fix or read back over the phone.

**The customer sees it.** The number is published with the order, so a posted
order's track page shows it on its own line under the delivery details - they can
read it to the courier without messaging you. Self-collect orders show no such
line. The shipped message is only offered on courier orders: a self-collect order
keeps its **Send pickup reminder**, which is the message that fits that hand-over.

**What you need to run once.** The tracking number needs one column added to the
tracking table - `supabase/track_no.sql` (a single ALTER, safe to re-run). Until
that runs, everything else works; the number just reaches the message and not yet
the customer's page.

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
day carries its booking count, and that count sat __under__ the date number, which
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
and on the Delivery Dates calendar a marked day that is __already__ one of your
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
only two things about __when__: a notice period, and one from-date and to-date for
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
