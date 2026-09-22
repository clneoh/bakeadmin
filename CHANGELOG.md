# Jienluv2bake — change history (v54 → v154)

What changed in each version of the backoffice app, newest first. Each version
number is the "Engine" you can see on the app's **More** screen, so you can
always tell which build a phone is running.

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

**What you asked.** Your words: *'why no button for work backward, this is to
reeposition the batches latest start time'*. You were right, and it was about a
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
   row, then open the card on batch 1 of *Cutting and packing*, and the card is
   showing you the day the row just made, with the way back on it.

3. **Pressed on a day already worked back, it says so and writes nothing.** This
   was your own choice and it is the rule the button lives by: a button that comes
   and goes reads as a fault, so it stays in the row on every day. On a tight day
   the press answers *Every module of your line is already as late as it can go —
   there is nothing left to pull back.*

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
   tap batch 1 of *Cutting and packing* and stop there, which was the only door
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
   before and after: *No fridge, 1 person* still reads 24 pans, *My sister
   proposal 21/9/2026* still reads 4, and *One baker day* still reads 24 pans with
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

**What you asked.** Your words: *'how to make the calculate backward works?'* The backward count
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
where there is no room above, it drops below the pointer instead. The chart is a panel of its own
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

**What you asked.** In your own words: *"let us realign our terms use in the production
line"* — a module instead of a brick, batches inside a module, and cycles inside a batch,
with a batch's time moved by buttons instead of a drag. The words and the model under them
were changed together on purpose: renaming first and building the cycles later would have
left the word **cycle** meaning two different things while you were learning it.

**The three words, and what each one is.** A **module** is the equipment plus the hands
tending it — what this app has called a brick until now. A **batch** is one lot: the six
pans of one oven load, one tub of dough. A module can run several batches in a day, and how
many is yours to set. A **cycle** is one step of that module's work, and it is the cycle
that owns the minutes and the labour. Your own sentence settled it: *"batch is not a process
but cycle is."* So a batch carries no minutes of its own — the time it holds is the sum of
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

**What you asked.** In your own words: *"i need you to create one scenario and save it as
One baker day. Set the bricks for me, with latest start time each brick batch."*

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

**What you asked.** In your own words: *"work backwards, from end of process, the previous
process whould have a latest start time, by going this way, we prevent preparing dough too
early and prevent dough from over fermented. But we can fine tune each process to start
earlier to better manage manpower utilisation."* You had corrected your own step order that
morning, after checking it with your sister: *"i think my self confused, i double check with
my sister and now understood the right flow. we cannot mix the dough too early, it will over
fermented."* And you had already worked your ceiling out yourself and asked about it: *"6pan
sit in it for 81min, proofer able to hold 12pans, so effectively the poofer can produde 6
pan/40.5min? So the proofer became the bottle neck?"* Yes — 40.5 minutes exactly. This
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
- **Minutes to take 6 pans out and put 6 in**: was 4, now 2 — *"2min covers out and in"*, as
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

**What you asked.** In your own words: *"fix the hats count and the collision sentence.
And what is the concept of hat, i dont understand, why name them by numbers?"*. Both were
real faults, and the question was fair — "hat" was my word, and it was a poor one. It is
gone from the app and from this book; what it meant is said plainly below.

**What a "hat" was.** It was my shorthand for **the places one person has to be in the
day**. You put it better yourself: *"one person would not need to wear too many hats"* —
one worker asked to stand at six different jobs in one day is being handed six hats. That
is the thing the People row is there to count, so that is what it now says: **in 6 places**.

**The count was wrong.** Each person's row read **at 6 bricks** — the number of different
bricks, not the number of places — so a worker on **line 1 and line 2 of the same fold**
counted as being in **one** place. That is exactly the doubling-up the number is supposed
to show you, and it was the one thing the row said nothing about. A line of a brick is a
place of its own now, so that same worker reads **in 2 places**. On your own line the row
has gone from **at 6 bricks** to **in 7 places**, because your fold is drawn as two lines.
The number only appears when it is more than one, exactly as before.

**The collision sentence was unreadable.** It was one long sentence — *Person 1 is at X and
Y at the same time, …* — and your bricks have long names: *Mixing by hand in the tub (set
the minutes)* is forty characters, twice in one sentence, with the word *and* between them
lost in the middle. It is now three parts on four separate lines. Line one, who and when:
*Person 1 — two jobs at once, 4:00 pm to 4:05 pm*. Lines two and three, each job on a line
of its own with a bullet in front of it: *Mixing by hand in the tub (set the minutes), line
1* and *Mixing by hand in the tub (set the minutes), line 2*. Line four, what to do about
it: *Move one of them along the day, or combine with another person and accept the
collision.* Two lines of one brick still say which line they are, because without that they
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

**What you asked.** In your own words: *"i need a time x axis cursor on the time
chart"*.

**Where it is.** The day chart in **More → Scenario planner**. One change, in one screen.

**How to use it.** Run the pointer across the chart and a fine line follows it, down
through every row — the ruler, every brick, every person, the total. A little brown label
at the top of the line reads the clock at that point: *5:05 pm*. Move the pointer and the
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

**What you asked.** In your own words: *"why the display jump and it is very
confusing"*. It was a real fault, and this is it fixed.

**What was actually happening.** The brick's card is a long card — fifteen boxes, a box
per line, a row for every cycle — and **every single number you typed into it was
rebuilding the whole card underneath your finger**. That is the jump you saw: the box you
were typing in was thrown away and a brand new one put in its place, so the cursor went
with it and the keypad shut. On a phone that reads as one digit per tap, on a card that
had moved somewhere else. It was worst on the three boxes that change how tall the card
is — typing a 6 into *How many of these do you have* grew the card by a line's worth of
boxes on every keystroke.

**What it does now.** Typing a number writes the number and **leaves the card alone**. The
box keeps your cursor, the keypad stays open, and the card stays exactly where you had
scrolled to — checked box by box: the brick's own numbers, the people box, and every line
box under *How many of these do you have*. Three boxes still change the card's shape,
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

**What you asked.** In your own words: *"i want is just better drawing.. Since now one
brick having 2 lines, each line can have its own person, and few line can have a combine
person sharing to different lines. This will make training of worker easier, because one
person would not need to wear to many hats"*. So this is the **drawing**, and **who is on
each line** — nothing about how the day adds up has moved.

**A line, and why a brick you have two of is two of them.** Everything on this screen was
already worked out as if a brick you have two of were two streams taking the lots in turn
— lot one and lot three on one, lot two and lot four on the other. The screen was drawing
those two streams flattened into a single row. Now each one is a row of its own: the
brick's own name, badges and minutes on the first line, and a row per further line
underneath, tied together by an accent down the left and a dotted seam between them.

**Who is on each line is yours to set.** Open the brick and, once *How many of these do you
have* says 2 or more, you get a box per line — **Line 1 — who is on it**, **Line 2 — who is
on it**. 0 means whoever is free. Put the same number on two lines and that is one person
covering both, which is exactly what you asked for; if those two lines really do need them
in the same minute, their row in the People list goes red and names the minute and which
line collided with which. The line boxes and the brick's own *Who is at this brick* are the
same number, so the two can never disagree.

**The People list now counts the places one person has to be.** Each person's row reads how
many different places that one person is in — and every job on it names its line ("Stretch
and fold in the tub, line 2"). That number is the whole point of this release: it is the one
that tells you when one person is being asked to be in too many places at once.

*(This entry was first written as "counts hats", as **at 3 bricks**. Both the word and the
count were wrong, and **v144** fixes them: the row now reads **in 3 places**, and a line of a
brick counts as a place. See the v144 entry at the top.)*

**Your starting point in one tap.** **One a line** (it was *One a brick*) gives every line
its own person, so a brick you have two of takes two people rather than one. It says *One a
line* only when a brick in the scenario really is drawn as lines; otherwise it reads exactly
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

**What you asked.** In your own words: *"i also want to allow each brick cycle to overlap,
this will improve the visualisation"*, and then, as I was building it: *"allow overlap
button and the overlapping criteria"*. So it is a **button** in the brick's card, **Let its
cycles overlap**, and the criteria sit under it in plain words rather than in a rule you
would have to work out.

**What a brick did before, and still does unless you switch this on.** A brick held its own
cycles apart: lot two could not begin until lot one was out of it. That is the right rule
when the dough is physically *in* the thing, and it is what stops you folding dough that is
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

**What you asked.** In your own list: *"1. allow me to set the same brick to 2 or more, if
that module became bottle neck."*, *"2. in a brick, let say we might need 8 cycles, each
cycle should be able to have its own start time, drag-able."*, *"3. 2nd brick 1st cycle
should follow 1st brick 1st cycle completion, and so on."*, *"4. Each brick, cycle10 only
starts after one brick earlier cycle 10 ends, etc."*, and *"5. objectives are: less man,
less manhours thru better planning, shorter hours."* Then, as I was building the screen:
*"from your layout, the stretch and fold should have 2nd , 3rd brick as the person who do
that process and start another cycle without having to wait for thee 1st cycle to finish"* —
which is what **How many of these do you have** does: a second fold starts the next lot
without waiting for the first to finish.

**What changed. Everything below is inside More → 🧱 Scenario planner. Nothing else in the
app moved, and every figure you have already given reads exactly as it did.**

**Every pass in a brick is drawn on its own, and dragging one moves only that one.** Before
this version a brick's passes were a single rhythm — a gap and a count — and every pass sat
where that rhythm put it. Now each pass is **its own bar on the timeline** and can be dragged
by itself: cycle 3 moves and cycles 1, 2 and 4 stay where they were. The toast when you let go
names the one you moved — *"Cycle 3 → 4:15 pm"* — so there is no doubt which pass changed.
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
screen says so instead of guessing: passes past the end of the brick above follow its *last*
pass, and the row names it. **The chain arrives switched off**, so nothing you have already
measured moves until you turn it on yourself.

**The line, in one tap — and your three objectives as three numbers.** You named the goal as
three things, so the screen now says all three in one line under the day: **2 people · 13 h
40 m of hands · a 16 h 20 m day**. **People** is the most hands needed at once (*less man*),
**of hands** is every person-minute of the day added together (*less manhours*), and **the
day** is first job to last (*shorter hours*). Drag a cycle, move a start, add a second brick,
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
passes come round *faster* than one pass takes — a 5-minute gap on a 28-minute fold — was
always a drawing of something that cannot happen: the same hands cannot start pass 2 while
pass 1 is still on them. Those passes are now held apart to one at a time, when the brick is
the only one of it and is not chained. None of your own bricks is built that way and every
figure you have given reads exactly as it did, but if you ever type a gap shorter than a pass,
the screen will hold the passes apart rather than draw a day you cannot work.

**21 Sep 2026 — engine v138 (no database step). The scenario planner is yours to
build in: bricks you make, move, give to a person and drag along the day, a ruler
and a start time, scenarios you save and name — and the scenario you choose can now
be loaded onto the Production line.**

**What you asked.** In your own list: *"1st i cannot change the time scale, say i want a
strat at 8am. And i need an time scale ruler"*, *"I need to move the sequence of the lego
brick"*, *"I want to be able to create, edit and delete lego brick"*, *"i want to be able to
same and name a scenario. Edit or delete"*, *"how to have person 2?, I would want one person
for each module, And a Total person showing overlapping persons time slot if any"*, *"The lego
brick should be able to restart? if choosen to, and how, can it be drag tomove the start time
of each brick"*, and *"The fold brick should show 28min, and its person should show 2 minutes,
when i adjust the brick until minumum total person overlap, that will be best scenario for
manpower planning."* Then, as I was building it: *"can allow to save a scenario? scenario and
production line has some function overlapping, the chooses scenario should be able to be
loaded to production line"*.

**What changed. Everything below is inside More → 🧱 Scenario planner, plus one card on
More → Production line. Nothing else in the app moved.**

**The day starts when you say, and there is a ruler to set it by.** One box at the top sets
**the time your day begins**, and every clock reading on the screen is counted from it — so
*"say i want a strat at 8am"* is one field rather than ten start times to retype. A ruler now
runs under the timeline: a tick every half hour with the o'clock ones named, so a bar can be
read against the clock instead of guessed at. And the **time scale** is yours: four chips —
**Wide**, **Standard**, **Close**, **Closest** — change how wide a minute is drawn, from the
whole day on one phone screen to close enough to tell a 15-minute bake from the one before it.
The hour lines on the timeline follow whichever you pick, so grid and ruler always agree.

**A brick is now a thing you own, not a row you read.** **＋ New brick** adds one, and it
arrives **switched off** so an empty brick cannot become the wall and answer your day with a
nonsense figure. Open any brick and you can rename it, change its picture, change every number
in it, and — this is new — **delete it** or move it **↑ Earlier / ↓ Later**, because the list
order *is* the day's order: the timeline is read top to bottom and a tie for the wall goes to
the earlier brick. So *"move the sequence of the lego brick"* is two buttons, and the day
re-sorts around it.

**One person for each module, and the Total person you described.** Every brick can be given to
a person: **0** means whoever is free, **1, 2, 3…** names someone. Two chips do it in one tap —
**One a brick** gives each job its own person, **Share them** hands them all back to whoever is
free. Under the timeline there is now **one row per person**, each showing the jobs that person
is at and how much work they carry, and where two of their jobs overlap the bar wears a red
outline with a sentence naming **both jobs and the minute they clash**. Nothing blocks a plan
that cannot work — the whole point is that it is *shown*. The **Total person** row stacks
person 1, person 2, person 3 and the rest on top of each other, which is what you asked for:
*"with that i can see, which time period utilise more manpower"*. It reads out the most people
needed at once, the busiest stretch by name, and how many minutes are being worked two at a
time. Bring the bricks closer together and that row flattens — that is the manpower planning.

**Combining two people, which was your own example.** **Combine two…** asks two questions: the
person who keeps the job, then whose bricks move to them. Person 1 then person 3 makes the row
read **Person 1+3** — *"to generate person 1_3"*, in your words — and whatever then collides is
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
note: if your phone's fold brick still reads **30** in *minutes one pass holds it*, that is the
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
screen still reading the scenario you were in *before* it — the name, the start time and the
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
says *"nothing here changes"* rather than promising eleven.

**21 Sep 2026 — engine v137 (no database step). More → Scenario planner: build your line out
of modules, watch the day as a timing diagram, and raise the pans you want until something
stops you.**

**What you asked.** "can i have a apps function that visualise the flow... something for me
to optimise line balancing", and then, once we were talking about it: a screen you could
**configure**, a **timing diagram**, and — this was the important one — *"not optimised for
mobile, for a clearer interface"*, so you could "toase about all possibility to configure the
production flows". You described the parts yourself: a module around the oven, a module around
the mixer, a module around a fermentation, each with its **own cycle time**; the folds as a
**loop**; ingredients going in "from time to time, not one shot"; and the fridge and the bins
as **half-finished goods** sitting between steps. And you set the rule for the whole exercise:
*"alll this are design, and require proofing, and before the proofing, the fugures have to be
right first, at least logically."*

**What changed.** A new screen, **More → 🧱 Scenario planner**. It is the one screen in the app
that is **wider than the rest** — up to 900px instead of 540 — because a day laid out across a
timeline needs the room. Everything else about the app is exactly as it was.

**A module is a Lego brick: a machine *and* the pair of hands that tends it, counted as one
thing.** Each module has its own cycle time — how long one pass holds it — how many pans that
pass deals with, how many minutes of you it takes, and how often it repeats. Your fold loop is
just a module that repeats more often, so a loop needs no special anything. Ten modules come
seeded: the mixer, the fold loop, wash/oil/fill, load the chiller, retard overnight, unload,
dimple and top, the oven, cool and pack — and the fridge, which arrives **switched off**.

**Scenario 1 is the line without a fridge, and the fridge is a switch, not an absence.** It sits
in the module list switched off and reads *"not in this scenario"*, so the screen answers
without it. Switch it on and it appears. That is deliberate, because you said it plainly:
*"if the output fulfilied my need now, then fridge would not be the 1st thing to buy for me"* —
so the buying question and the design question had to be the same screen, one tap apart.

**The day is a timing diagram.** One row per module running across the day, with the clock
along the top every two hours. A **solid block is you standing there**; a pale one is the module
running without you — the retard and the bake have no solid block at all because they need
nobody. Below the modules is a row **per person**, carrying the jobs that person is at. There is
one person on your seeded day, doing 4 h 56 min of work. Swipe sideways; the day is wider than
the phone.

**The climb — this is the part you asked for.** You described the method yourself: *"i will
slowly increase the output needed per day until 1st limitation hit, tweaking the 1st limitation
and expecting the output to grows, until the next limitation surface"*. So: type how many pans
a day you want, and a ladder appears. Each rung names the one module that stops you at that
number, exactly what to change about that module, what the day becomes, and which module
becomes the wall next. **One tap puts the whole ladder into the modules.**

**And the ladder has to be honest, which is where it earns its keep.** Your seeded day makes
**12 pans** and it is the chiller that stops it. Raise the target to 36 and the ladder climbs
to **24** — then stops, and says why in plain words: *"A 12 h pass fits 2 times in a day, and it
is already running that often. So this one cannot be run more often — it has to take more pans
at once."* Twelve trays, twice a day, is twenty-four pans and no amount of wanting makes it
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
kept exactly as you typed it — the row just wears an *"a day's limit"* tag and counts the passes
that are really there.

**20 Sep 2026 — engine v136 (no database step). The Production line now opens with a flow
map: your bake day top to bottom, in the order it actually happens.**

**What you asked.** "can you do a flow map so that i can visualise better, make a intuitive
one". The four bars answered *how fast* each part is, but nothing on the screen showed the
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
screen rather than in my head: *"Your mixer's bowl size, counted in pans: one pan takes about
900 g of dough — that is what bakes down to your 800 g — so a 25 kg bowl is about 28 pans."*

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
deleted the answer to *who*, and left the amount behind. The order's row kept a tag reading
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
Money screen does *not* take the charge off the order — that row is your own record of money
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
A step that is *deliberately gone past but not paid* now looks different from a step that has not
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
pressed a Paid button is taken as *this order owes money*. That is what your older orders are
protected from — nothing already in the app changes, because only orders you move now are marked.

**17 Sep 2026 — engine v116 (no database setup needed). A Day one form: your opening balance —
the cash in the tin, the money on your phone and what is on your shelf — entered once, in one
place.** From you telling me *"we need to enter opening balance"*.

**What an opening balance is here.** Four answers about the morning your books begin: what is in
the tin, what is on your phone, what is on your shelf, and who still owes you. Until now the app
could take all four, but in three different places and one ingredient at a time, which is a poor
way to start.

**The form.** More → Money → the new **Day one** line (under **Books**) → **Set**. It asks for:

- **Cash in your tin** and **Money on your phone (TNG)** — two boxes, and the day your books begin,
  which takes any date but should be the day you are starting from.
- **What is on your shelf** — your ingredients, one box each, already in the unit you use for that
  ingredient (kg for the flour, g for the salt — no converting). Ingredients you have marked as
  *not something I buy*, like labour, are left out: they have no shelf to count.
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
ways again.** From you telling me *"the profit month can move earlier but cannot move later"*.

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
From you asking *"in profit the expenses is not clickable, is that a bug?"*

**You were right, and it was my mistake.** The lines that open their journal were the ones with
money in them. A line showing **0.00** was deliberately left dead, because there is no journal to
show — but I made it look **exactly** the same as a live one: same colour, same font, no hint. So if
your month has most categories at 0.00, nearly every line you tapped did nothing, and "not clickable"
was the only sensible conclusion. A line that looks alive and does nothing is worse than no line.

**What it does now.** Every spending line opens: *Packaging*, *Utilities*, *Delivery & fuel*, the
categories you have added, and **Total expenses**. A line with money in it shows its journal as
before. An empty one opens and **says so in your own words** — *"Nothing recorded under Rent in
September 2026"*, In / Out / Net at zero, and a line telling you it will fill up on its own as you
record spending under that category. The statement's own totals (**Sales**, **Cost of sales**,
**Gross profit**, **Net profit**) stay figures rather than doors — you did not ask for those, and
they are not spending.

**Two more things found while fixing it.**
- **The lines were only 17 pixels tall** — a small target for a finger, and easy to land in the gap
  between two lines and hit nothing. Tappable rows everywhere (the Profit statement, the Money
  screen's cash rows, the Books list) are now **36 pixels**, comfortably thumb-sized.
- **The Total expenses journal did not say which category a row belonged to.** It read
  *"2 Sep · boxes · Cash"* with no way to tell what "boxes" was for. It now names it —
  *"2 Sep · Packaging — boxes · Cash"* — while a single category's journal still reads short, since
  its title already says which category it is.

**17 Sep 2026 — engine v113 (no database setup needed). Every way you pay now has a book you
can always open — including a pocket that has been quiet — behind a new Books line on the Money
screen.** From you asking *"where can i find pocket journals"*.

**What was wrong.** The journal rows live on the money card, and that card only shows a pocket's
row **when that pocket moved money in the stretch you are looking at**. The card opens on
**Today**, so a pocket that paid for something last week had no row today — and no way into its
book at all. Cash and TNG never had the problem: their four rows (Cash in, Cash out, TNG in, TNG
out) are always there. The pockets were the only books that could go missing.

**The Books line.** Under the two money cards there is now a second line beside *Categories & ways
to pay*:

> **Books**
> Every way you pay · 5 books, each opening into its own rows  ［ Open ］

**Open** lists **every** way you pay — Cash, TNG, Loan, Personal Pocket Kean, Personal Pocket Suan,
and anything you add later — each with what moved by it in the stretch on screen, each opening into
its own book **under the line you tapped**, so the list stays in front of you and you can step from
one book to the next. The first method with anything in it opens ready; a quiet pocket says so
plainly — *"Nothing moved this way in this stretch"* — with its In / Out / Net at zero.

Two things this keeps honest: a method you have since **renamed or deleted** still gets a line,
because its money is still in the books and a figure you cannot open is a figure you have to take
on faith; and every figure in the list comes off the Money screen's own rows, so the list and those
totals cannot drift apart.

*A small thing the screenshot caught while building this: the first version printed the word
"null" under each closed line. Fixed, and there is now a test that fails if it ever comes back.*

**17 Sep 2026 — engine v112 (no database setup needed). You can pay a personal pocket back
out of the till in one go, and the category list on the expense form is no longer cut off.**
From your question — *"can my own withdrawal payback to the cash register like Personal pocket
Kean or Suan?"* — and your note about the categories.

**Pay back a pocket.** On **More → Money**, beside **＋ Put money in**, there is now
**＋ Pay back a pocket**. It is for the case where a pocket of yours — **Personal Pocket Kean**,
**Personal Pocket Suan**, a loan, or one you add later — paid for something, so the money left
you rather than the till; that pocket's line on the Money screen then reads **−RM 40.00**, which
means *the till owes it 40*. Open the form and it comes up **already on the pocket that is
owed**, with the amount filled in — Kean's RM 40 sitting in the box, and a line saying so. Say
whether the money came out of **Cash** or **TNG**, check the day, and press **Pay back**.

It writes both halves at once, which is the whole point: the **till goes down** by that amount
(it shows in Cash out and in the Net, and in the Cash journal with your note), and the
**pocket's line comes back to zero**. One pocket can be paid back without touching another.
Because it is your own money going back to you, the till's side is recorded as a withdrawal —
so it never counts as a cost and your **profit does not move**. On the pocket's own list it
reads *"Paid back by the till"*, not *"From my pocket"* — the two are different things and now
say so. Paying it back in part is fine: pay RM 25 of the RM 40 and the pocket reads −15 after.

**The category list was being cut off — fixed.** Thank you for catching this. On the expense
form, the row of categories ran off the side of the screen: it was laid out as one single line,
so at phone width everything past about the sixth category — *Salary (you)*, *EPF / SOCSO*,
*Marketing*, *Equipment & tools*, *Other*, *My own withdrawal*, and the **＋ New category**
chip — was off the screen and impossible to reach. Measured on a 375-pixel phone, the row was
744 pixels wide inside a 343-pixel box. The pills now **wrap onto as many lines as they need**,
the same fix applies to the ways-to-pay row and to the new pay-back form, and the whole list is
visible and tappable. Nothing about the categories themselves changed.

**17 Sep 2026 — engine v111 (no database setup needed). Every figure on the books is now a
door: a journal behind each line of spending in Profit & Loss, and a book for every way you
pay — Cash, TNG, Loan, Personal Pocket Kean, Personal Pocket Suan, and anything you add
later.** From two notes close together: *"the expenses items in Profit & Loss should reveal
its journals"*, then *"each CASH, TNG, LOAN, Personal Pocket Kean, Personal Pocket Suan, and
others that might be added in future need a journal"*.

**Profit & Loss — tap a spending line and see what made it up.** On **More → Profit**, the
running-cost lines (Packaging, Utilities, Delivery & fuel…) are now tappable, and so is
**Total expenses**. Tapping one opens its journal for the month on screen: every expense
behind that figure, oldest first, each reading *"<day> · <what it was for> · <how it was
paid>"* and ending on the total the statement itself shows. So *"Packaging RM -58.00"*
opens two lines — the boxes paid from a pocket and the bags paid in cash. A line with nothing
in it that month is not tappable; there is nothing behind it. The header now says **Running
costs · tap a line to see the spending behind it**.

**Money — one line and one book per way of paying.** The single *"Paid by loan / other"* row is
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
shopping list again.** From your note: *"certain ingredient we dont purchase, in ingredient we
can set that as a non purchase item, like labour and electricity"*.

**What it does.** Open **More → Ingredients** and tap **Edit** on the ingredient (or fill in the
New ingredient card at the top). Above the cost there is now a switch: **Not something I buy —
it only ever costs. It still counts in a recipe's cost, but it never appears on a shopping list
or a purchase order.** Turn it on for Labour, Electricity, Gas, your own time.

**Where you see it.**
- The ingredient's **card** stops showing an On hand and a Keep-at-least line, and says instead:
  *Not bought — a cost in your recipes, never on a shopping list*. Nothing else about the card
  changes, and the cost you typed is untouched.
- Every **shopping list** (the preview, the list you save, and an "orders changed" follow-up)
  leaves that ingredient out — and says so at the foot of the list: *Not on this list: Labour,
  Electricity — marked as not something you buy. Their cost still counts in the products that
  use them.* So it reads as deliberate, not as something the app forgot.
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
