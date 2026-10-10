// store-lang.js — the store's (store/) customer-facing strings in English,
// 中文 and Bahasa Malaysia. English values copy the authored copy exactly so a
// visit in English is identical to today. Values may contain a %1 placeholder
// (e.g. the cut-off time) that the caller substitutes at render time.
//
// The order data the baker reads (product names, order lines, the WhatsApp
// message) deliberately stays in the products' English names — only what the
// customer sees on the page is localized.

const en = {
  titleWord: "Order",
  homeLink: "🏠 Our homepage",
  referral: "🎁 You were referred — you have a welcome discount on your first order",

  // Promo codes (v269). The offer is composed in store/app.js out of the engine's
  // PARTS — kind and value — so a percentage, an amount and free delivery each
  // read naturally here rather than being an English sentence handed over whole.
  promoLabel: "Have a code?",
  promoPh: "e.g. FRESH10",
  promoApply: "Use it",
  promoRemove: "Remove the code",
  // ★★ SAID AGAIN AT THE BUTTON, NOT ONLY AT THE CODE BOX (v408). Her words: __"If there is promo
  // coupon attached, say it on top of Place Order, word like: Your promo coupon will be attached
  // together to the order for validation, actual payable will be confirm by Whatsapp."__
  //
  // ⭐ SHE IS RIGHT THAT THE PLACE MATTERS, and the page already half-said it: the line under the
  // code box reads __"We'll take it off when we confirm your order"__, which is true and **up the
  // page**. At the bottom, the customer is looking at ONE figure — the total on the bar — and that
  // figure is the GOODS, before the code (see renderBar). This is the moment they are about to
  // commit, and the moment the promise needs repeating.
  //
  // ⚠️ %1 IS THE CODE ITSELF, named back to them, because "your code" is abstract on a page they
  // may have been reading for ten minutes.
  // ⚠️ IT PROMISES NO FIGURE. The discount she can honour is hers to decide at the confirmation
  // (a code can be one-per-customer, or first-order only — see promoAcceptedUsed/First), so the
  // line says the amount is CONFIRMED, never that it is already correct.
  promoBar: "Code %1 goes with your order. We'll check it and confirm the final amount on WhatsApp.",
  // The standing line at the top of the shop. It NAMES the code, because typing
  // it is what puts it on the order — the shop never takes the money off itself.
  promoToday: "Today: %1 — use code %2",
  promoAccepted: "%1 — code %2 is on. We'll take it off when we confirm your order.",
  // The two the shop can only ever GUESS at, because a public page has no login
  // and knows nobody: "one per customer" and "first orders only" can only be
  // remembered by this phone, and a new phone or a cleared browser remembers
  // nothing. So the code still goes on the order and the bakery settles it by
  // hand — these two say the code is on AND that we will confirm it, rather than
  // refusing a discount on a guess.
  promoAcceptedUsed: "%1 — code %2 is on. It's one per customer, so we'll confirm it when we take your order.",
  promoAcceptedFirst: "%1 — code %2 is on. It's for a first order, so we'll confirm it when we take your order.",
  promoUnknown: "We don't know that code — check the letters and try again.",
  // Every other reason a code can be turned down, each in its own words. %1 is a
  // date for the two that name one, and the amount still needed for the last.
  promoPaused: "That code is on hold — it isn't available at the moment.",
  promoEnded: "That code ended on %1 — it's no longer available.",
  promoNotYet: "That code hasn't started yet — it starts on %1.",
  promoClaimed: "That code has been fully claimed — all of it has been used.",
  promoClash: "That code can't be used with the welcome discount you already have — message us and we'll sort it out.",
  promoSmall: "Not quite enough yet — add %1 more to use it.",
  // Until each reason has its own wording, anything else the rules refuse says
  // this. Deliberately not "we don't know that code", which would be untrue.
  promoNo: "That code can't be used at the moment — message us and we'll sort it out.",
  promoFreeDelivery: "Free delivery",
  promoOffAmount: "%1 off",
  promoOffPercent: "%1% off",
  promoOffPercentCap: "%1, up to %2",
  promoOnMin: "%1 on %2 and above",
  // Appended only when the code has an end date, so the standing line says when
  // the offer runs out instead of the customer finding out at the box.
  promoUntil: "%1, until %2",
  // ★ IT IS THE BAKE DAY, NOT THE DELIVERY DAY (v407). Her words: "from the store i can see the
  // bake day is term as delivery day, that might be what confusing. Change it to bake day".
  // ⚠️ SHE IS RIGHT, AND IT WAS THE SAME FAULT AS THE TWO BARE WORDS BELOW: the page named the
  // day after the thing that HAPPENS to it for some customers, and a customer collecting his own
  // bread read "delivery day" and did not recognise the day he was choosing. **It is the day the
  // bread is baked** — that is true of every order however it leaves, which is exactly why it is
  // the better word. Every string that named that day has moved with it.
  deliveryDays: "Bake days",
  orderBy: "Order by",
  beforeVal: "%1 the day before",
  madeToOrder: "Made to order · closes %1 the day before",

  // ★★ THE ANSWER, AND THE THREE STEPS (v405). ⚠️ ENGLISH ONLY SO FAR, AND THAT IS DELIBERATE: these
  // are behind the `?trial=1` flag while she judges the wording, and `pick()` falls back to English
  // rather than blanking, so a 中文 or BM visitor meets a real sentence rather than a hole. **They must
  // be translated before the flag comes off** — a Chinese customer reading English is a downgrade, and
  // the two below are the first thing anyone reads on the page.
  ansClosed: "Today's bake has closed",
  ansInTime: "You're in time",
  ansNext: "The next day you can have bread is %1.",
  ansBy: "Order before %2 on %1, and it's yours.",
  stepsLede: "You'll do three things — and then we take over.",

  sPickDay: "Pick a bake day",
  sWhat: "What would you like?",
  sYourDetails: "Your details",
  yourName: "Your name",
  namePh: "e.g. Aunty Bee",
  whatsappNo: "WhatsApp number",
  whatsPh: "e.g. 012-345 6789",
  waSub: "We use this to confirm your order and send your payment QR — we'll never spam you.",

  // The small privacy notice under the customer's details (v348). The PDPA wants a
  // customer to be able to make a choice BEFORE sending their details, so the notice
  // sits at the point of collection and not only in a policy page. ⚠️ THE CONTACT
  // NUMBER IS NOT HERE — store/app.js fills it in from the bakery's own setting, so
  // this sentence must end where the number begins.
  // v350 — the notice moved to the ORDER BAR: one line under Place order, and this
  // panel behind it. ⚠️ TWO OF THE FOUR FACTS WERE REWRITTEN AT v353: "we COLLECT your
  // name..." became "we USE your name... only to...", because "collect" reads to an Asian
  // ear as "we take it and keep it" (her words: "we are sensitive to when you said you
  // collect, that mean you keep it"). And "Nobody else sees your details" was simply NOT
  // TRUE - the driver gets the name, number and address, and the alert that pings her
  // phone carries them too. Both now name the CLASS of people who handle an order, which
  // is what s.7 asks for, with no company name in it.
  // privacyLead is GONE: the Act no
  // longer opens the notice (the Commissioner's own template does not open with the
  // law, and neither do the large platforms) — it closes it instead, on privacyDate.
  privacyLine: "By ordering you agree to our",
  privacyLink: "privacy notice.",
  privacyHead: "How we use your details",
  privacyWhat: "We use your data only to make your order, get it to you, and talk to you about it. For a delivery we also need your address and the pin on your door.",
  privacyWho: "To bring your order to you, the driver is given your name, number and address. Your confirmation reaches you on WhatsApp, and an alert carrying your order pings our phone. Nobody else sees your details, and we never sell them.",
  privacyKeep: "Your details stay with your order in our order book, on a secure cloud service and on our own phones behind a PIN. We keep the sales record for seven years, as the tax office asks — but your name, number and address are not part of that record, so ask us any time and we will delete them.",
  privacyContact: "Ask us any time to see, correct or delete what we hold — WhatsApp",
  privacyDate: "Under Malaysia's Personal Data Protection Act 2010 (Act 709). Last reviewed: 7 October 2026.",
  howGet: "How will you get your order?",
  selfCollect: "Self collect",
  // ★★ EACH WAY SAYS WHAT IT IS (v407). Her customer chose a courier when he wanted to
  // collect: the page named both ways and explained neither. ⚠️ BOTH LINES ARE TRUE BEFORE
  // ANYTHING IS TAPPED, so he can compare without tapping.
  // ⚠️ The courier line promises NO amount, because the shop has none — she quotes carriage
  // by hand. What it can say honestly is that the total on this page is the bread's, which is
  // the thing a customer would otherwise assume wrongly.
  // ⚠️ AND IT SAYS WHEN, IN HER OWN TERMS (v407). Her words: __"order can be collected late on the
  // bake day, a message will be send to you when your order is ready if you chose self collect"__.
  // ⭐ A customer collecting had two questions, not one: what does it cost (nothing), and WHEN do
  // I come. ⚠️ The answer is deliberately the MESSAGE rather than a clock — a pickup time is not a
  // promise (v340), and the bread is only ready when it is ready.
  // ⚠️ AND IT STILL NAMES THE PLACE, which is not decoration: **a customer collecting may have NO
  // Point chosen at all** — the collect-from list is empty and hidden while she has none published,
  // and `#point-field` is not shown. So this line is the only place the shop can say where to come,
  // and it says it the only way that is always true: she messages it.
  selfCollectSub: "You come to us — no delivery charge. We message you the exact place, and once your order is ready you can collect any time on your bake day.",
  courier: "Courier delivery",
  courierSub: "A rider brings it to your door. Any delivery charge is told to you on WhatsApp — the total shown is for the bread only.",
  // v299 — where a Self collect order is collected FROM. Written once for the kitchen and
  // once for a Point; the Point's own NAME is her data and is never translated.
  ourKitchen: "Our kitchen",
  kitchenSub: "Sungai Ara, Bayan Lepas — where we bake",
  pointSub: "Self collection Point — we message the exact spot and time once your order is confirmed",
  pointMin: "Needs a basket of RM%1 or more — yours is RM%2 so far",
  addressLabel: "Delivery address",
  addressPh: "Street, area, Penang…",
  // The door pin (v197). Optional in every sense: with no pin the order goes
  // exactly as it always has, and the baker pins the door herself.
  pinHint: "Skip this and the driver goes to the address you typed — that is fine for most houses. Pin it only if the address alone will not find your door: a condo block, a guard house. Either way, put the block and unit number in the address above.",
  pinHere: "Use my location",
  pinOnMap: "Pin on the map",
  pinSet: "Pin set — the courier will drive to the spot you marked.",
  pinVague: "That spot is only accurate to about %1 m. Move the pin on the map so the courier goes to the right place.",
  pinNoGeo: "This browser can't share a location. Pin your door on the map instead.",
  pinDenied: "Location sharing is off for this site. Pin your door on the map instead.",
  pinUnavailable: "Your location couldn't be found just now. Pin your door on the map instead.",
  pinTimeout: "Finding your location took too long. Pin your door on the map instead.",
  pinLoading: "Loading the map…",
  pinTapFirst: "Tap the map where the courier should stop, or drag the pin.",
  pinLocating: "Finding you…",
  pinKeep: "Keep this spot",
  pinCancel: "Cancel",
  pinMapFailed: "The map didn't load. Type your address above and we'll find you.",
  // The address box was edited after a suggestion was taken, so the pin that answered
  // the old wording is gone (store/app.js, dropListPin). It has to say so: a pin that
  // quietly disappears is the dead control this shop has a standing rule against, and
  // the sentence names both ways to put one back.
  pinAddrChanged: "You changed the address, so the pin you picked no longer goes with it. Tap a suggestion above, or set the pin again.",
  // A row from the PREVIOUS wording was tapped, in the moment between the typist and the
  // new list arriving (store/app.js, takeHit). A different sentence from the one above
  // because it is a different fact: there may have been no pin at all, and what is wrong
  // here is the row rather than the pin.
  addrStale: "That suggestion was for the address you had before. Pick one for the new address, or set the pin again.",
  // Looking the typed address up (v202). The two failures are worded to send the
  // customer to the map, because the map is the one thing that still works when the
  // lookup does not — and neither of them is ever a reason an order cannot be placed.
  addrLooking: "Looking up your address…",
  addrPick: "Tap the one that matches your address.",
  addrNone: "We couldn't find that address. Tap the map and put the pin on your door instead.",
  addrFailed: "The address lookup isn't available right now. Tap the map and put the pin on your door instead.",
  // ★ IT IS A NOTE FOR EITHER WAY (v408). Her words: __"change the Delivery Notes(optional) to
  // Notes for Collection/Delivery"__. ⚠️ Same fault as the bake day and the two bare words: the
  // label named ONE of the two things the field is for, so a customer collecting his own bread
  // read "Delivery note" and skipped a box that asks him for the thing that actually gets him
  // his bread — the gate code, the landmark. ⚠️ The PLACEHOLDER moved with it for the same
  // reason: "delivery time" is wrong for the person who is coming to fetch it.
  noteLabel: "Notes for Collection/Delivery (optional)",
  notePh: "Gate code, landmark, what to look for…",
  // The note a customer can add to ONE item (v236). The link is what they tap
  // to open the box; the placeholder is the example that shows them what kind
  // of thing belongs in it.
  addNoteLink: "＋ Add a note",
  lineNotePh: "e.g. no nuts, write “Happy Birthday”",
  sTrack: "Track your order",
  trackHint: "Placed an order? Enter the order number from your confirmation (it starts with <strong>#</strong>, e.g. #A3F9C2).",
  trackPh: "e.g. A3F9C2",
  trackBtn: "Track",
  sPolicies: "Policies",

  items: "%1 items",
  oneItem: "1 item",
  placeOrder: "Place order",
  sending: "Sending…",
  soldOut: "Sold out",
  onlyLeft: "Only %1 left",
  noDates: "No upcoming bake days right now — check back soon.",
  noOpenDates: "All upcoming bake days are full right now — check back soon.",
  calChosen: "Your bake day: %1",
  calPrev: "Earlier weeks",
  calNext: "Later weeks",

  // Why a product reads "Sold out" on a date it can't be ordered for, and the
  // notes above the menu when a refresh changes the basket. The rule comes from
  // pool.js as data, so the sentence is built here in the visitor's language —
  // including the date, which must not arrive as an English weekday. The advice
  // is separate from the clause because the basket notes quote the clause alone.
  closedFrom: "Only available for bake days from %1",
  closedTo: "Only available for bake days up to %1",
  closedClose: "Orders close %1 days before your bake day",
  closedCloseAdvice: " — pick a later date",
  // The baker's marked sell days, when the chosen delivery date is not one of
  // them. %1 is a weekday list the page joins in this language ("Mon, Wed and
  // Fri"), so the names are built by the page, not here.
  closedWeekday: "Only available on %1",
  closedUnmarked: "Not sold on this day",
  // A product the baker keeps on the shop when it cannot be ordered (the switch
  // in its Availability card): the stamp it wears on a day that is not one of its
  // sell days, and the line naming the next date it CAN be ordered — with how
  // many are left that day, when a daily limit publishes a count. %1 is the date
  // (fmtDay), %2 the count.
  unavailable: "Unavailable",
  nextAvailable: "Next available: %1",
  nextAvailableLeft: "Next available: %1 · %2 left",
  sentenceEnd: ".",
  // Shown where the menu would be when every product is marked off today's
  // delivery date — an empty space reads like a broken page.
  noMenuToday: "Nothing is on the menu for this day. Please pick another bake day.",
  // The last heading on the menu, over the products the baker has not filed
  // under any category. Nothing is ever hidden for want of filing, so the
  // heading is plainly a place rather than a warning.
  moreItems: "More items",
  fixSoldOut: "%1 just sold out — removed from your order.",
  fixPoolClamp: "%1: only %2 can fit with the rest of your order now — we changed your %3 to %2.",
  fixClamp: "%1: only %2 left now — we changed your %3 to %2.",
  fixClosed: "%1: %2 — we removed it.",

  // How long a customer may still change or cancel this product's order (the
  // baker's stated window — shown, never enforced) and the same window on the
  // order receipt, where it carries the no-refund rule. One day needs its own
  // key so English never reads "1 days".
  cancelNote: "Change or cancel up to %1 days before your bake day.",
  cancelNoteOne: "Change or cancel up to 1 day before your bake day.",
  orderCancelNote: "Change or cancel up to %1 days before your bake day. Payments are not refundable — your order can be moved to another day.",
  orderCancelNoteOne: "Change or cancel up to 1 day before your bake day. Payments are not refundable — your order can be moved to another day.",

  confirmAddWaTitle: "Please add your WhatsApp number.",
  confirmAddWaBody: "We use it to confirm your order and send your payment QR.",
  confirmClosedTitle: "That day's orders are closed.",
  confirmClosedBody: "Orders for this day close at %1 the day before — please pick a new bake day.",
  confirmChangedTitle: "Your order changed just now.",
  confirmChangedBody: "Something sold out while you were ordering — we've fixed your cart to match what's left.",
  confirmChangedSub: "Please review your order and tap Place order again.",
  sendingToBakery: "Sending your order to the bakery…",
  orderRecvTitle: "🎉 Order received!",
  orderRecvBody: "%1 has your order.",
  orderRecvThanksBody: "Thanks %1! %2 has your order.",
  orderRecvLine: "📅 %1 · %2 · RM%3",
  orderRecvSub: "Your order is in with the bakery — we'll WhatsApp you once we confirm it.",
  failTitle: "We couldn't reach the bakery's app just now.",
  failBody: "Don't worry — send your order on WhatsApp so it isn't lost.",
  failOpened: "WhatsApp has opened with your order — press Send so it isn't lost.",
  failLink: "📲 Send your order via WhatsApp",
  failRetry: "Please try again in a moment.",

  trackEnter: "Enter your order number to track it.",
  trackUnavailable: "Tracking isn't available right now.",
  trackLooking: "Looking up your order…",
  trackNotFound: "We couldn't find order #%1. Check the number in your confirmation message — it's the 6 characters after the #.",
  orderCode: "Order #%1",
  forCustomer: "For %1",
  trkNew: "New",
  trkConfirmed: "Confirmed",
  trkPaid: "Paid",
  trkBaking: "Baked",
  trkReady: "Packed",
  trkFinal: "Collected / Shipped",
  trackingNo: "Tracking number: %1",
  // The same slot when a booked courier trip handed back a share link rather than a
  // number. The value is the link itself and is rendered tappable, so there is no %1.
  trackDelivery: "Track your delivery:",
  // What they ordered, and then how its price adds up (v199, 25 Sep 2026). The subtotal
  // and the total are drawn on EVERY order, not only one carrying a courier charge, so
  // the total never stands on its own with nothing above it. The same three lines, in
  // the same order, are in the customer's WhatsApp message — see moneyLines in
  // admin/js/courier.js, which owns the English wording there.
  trkItems: "Items: %1",
  itemsTotal: "Items total: %1",
  trkTotal: "Total: %1",
  courierCharge: "Courier charge: %1",
  // The same charge when the courier collects it at the door: COD is the word
  // Malaysians know for a parcel the receiver pays for, so it is kept, with what to
  // do about it spelled out beside it (19 Sep 2026).
  courierCod: "Courier charge: %1 - COD, pay the courier on delivery",
  // The promo code on the order and what it took off, %1 the code and %2 the ringgit —
  // the same line the customer's WhatsApp message carries, so the two can be read side
  // by side without disagreeing (v272).
  promoLine: "Promo %1: -%2",
  // The bring-a-friend first-order discount, which carries NO code — so the same money
  // line needs its own words. Matched to the WhatsApp confirmation, which names it the
  // same way (v323).
  promoFriend: "Bring-a-friend you were sent: -%1",
  // The booked trip, as the courier's own reply last said. %1 is one of a handful of
  // NEUTRAL phase words below rather than the courier's own vocabulary — the backoffice
  // publishes the phase, this page owns the words, so no company's status list is
  // written into this file (v190). A phase this page has not been taught draws nothing.
  tripStatus: "Delivery: %1",
  tripFinding: "Finding a driver",
  tripOnTheWay: "The driver is on the way",
  tripCollected: "Collected",
  tripDelivered: "Delivered",
  tripStopped: "Called off",
  tripNoDriver: "No driver took it",
  // Who is bringing it, once the courier has matched one — which it does only shortly
  // before the pickup, so this line is absent for most of the wait. The plate is shown
  // with the name when there is one, and on its own when there is not.
  driverLine: "Driver: %1",
  vehicleLine: "Vehicle: %1",
  callDriver: "Call the driver",
  // A PARCEL she posted herself (v226): a carrier has a name and no driver, so this
  // is drawn where the driver line would be, and never beside one.
  carrierLine: "Carrier: %1",
  nextBlockedBasket: "Your basket is for %1. To order for another day, choose it on the calendar above.",

  devBy: "Website by",
  devWa: "WhatsApp the developer",

  // The question printed IN the box, which the customer types over. Its length is
  // MEASURED, not written (see promptHeight in store/app.js): a phone offers ~323px at
  // 13px and "the User Interface" costs about 150px of it, so this string wraps to a
  // second line on a 375px phone and the box opens to show the whole question rather
  // than clipping its tail. Raise it and re-measure.
  fbPh: "Webmaster: Like the User Interface? Tell me & I will improve it!",
  fbHint: "Press Enter to send",
  fbSending: "Sending…",
  fbThanks: "Your idea is well taken care of. New updates soon!",
  fbFailed: "Couldn't send just now — please try again, or WhatsApp the developer.",
  fbEmpty: "Please write your idea first.",
};

const zh = {
  titleWord: "订购",
  homeLink: "🏠 我们的主页",
  referral: "🎁 朋友介绍的 — 首次下单有优惠！",

  promoLabel: "有优惠码吗？",
  promoPh: "例如 FRESH10",
  promoApply: "使用",
  promoRemove: "移除优惠码",
  promoBar: "优惠码 %1 会一起送到。我们会核对，并在 WhatsApp 上确认最终金额。",
  promoToday: "今日优惠：%1 — 输入优惠码 %2",
  promoAccepted: "%1 — 已套用优惠码 %2，我们确认订单时会为你扣减。",
  promoAcceptedUsed: "%1 — 已套用优惠码 %2。此码每人限用一次，我们确认订单时会为你核实。",
  promoAcceptedFirst: "%1 — 已套用优惠码 %2。此码只限首次下单，我们确认订单时会为你核实。",
  promoUnknown: "我们找不到这个优惠码 — 请检查字母后再试一次。",
  promoPaused: "此优惠码已暂停 — 暂时无法使用。",
  promoEnded: "此优惠码已于 %1 结束 — 不再有效。",
  promoNotYet: "此优惠码还没开始 — 将于 %1 生效。",
  promoClaimed: "此优惠码已全数用完 — 名额已被领完。",
  promoClash: "此优惠码不能与你已享有的迎新优惠同时使用 — 请联络我们，我们帮你处理。",
  promoSmall: "还差一点 — 再加 %1 即可使用。",
  promoNo: "这个优惠码暂时无法使用 — 请联络我们，我们帮你处理。",
  promoFreeDelivery: "免运费",
  promoOffAmount: "减 %1",
  promoOffPercent: "减 %1%",
  promoOffPercentCap: "%1，最多 %2",
  promoOnMin: "满 %2 可享 %1",
  promoUntil: "%1，%2 截止",
  deliveryDays: "烘焙日",
  orderBy: "下单截止",
  beforeVal: "烘焙日前一天 %1 前",
  // ⚠️⚠️ MY OWN TRANSLATION, NOT A NATIVE ONE — the first thing anyone reads on the page, so it wants
  // a Chinese-speaking pair of eyes before the trial flag comes off. (Her internal circle testing the
  // trial link is exactly who should check it.)
  ansClosed: "今天的烘焙已经截单",
  ansInTime: "还来得及",
  ansNext: "下一次可以取面包的日子是 %1。",
  ansBy: "在 %1 %2 之前下单，就是你的了。",
  stepsLede: "你只需做三件事 — 剩下的交给我们。",
  madeToOrder: "按订单新鲜制作 · %1 截单（烘焙日前一天）",
  sPickDay: "选择烘焙日",
  sWhat: "想吃什么？",
  sYourDetails: "你的资料",
  yourName: "你的名字",
  namePh: "例如：Aunty Bee",
  whatsappNo: "WhatsApp 号码",
  whatsPh: "例如：012-345 6789",
  waSub: "我们会用这个号码确认订单和发送付款二维码，不会拿来 spam 你。",

  privacyLine: "下单即表示你同意我们的",
  privacyLink: "个人资料声明。",
  privacyHead: "我们如何使用你的资料",
  privacyWhat: "你的资料，我们只用来制作你的订单、把它送到你手上，以及就订单与你联络。如果选择送货，我们也需要你的地址和门口定位。",
  privacyWho: "为了把订单送到你手上，司机会收到你的姓名、号码和地址。确认讯息通过 WhatsApp 发给你，订单通知则会传到我们的手机。除此之外没有人会看到你的资料，我们也绝不会出售。",
  privacyKeep: "你的资料会随订单保存在我们的订单记录里，存放在安全的云端服务，以及我们自己的手机中（有密码保护）。销售记录我们依税务局的要求保存七年；你的姓名、号码和地址并不属于这份记录，随时可以要求我们删除。",
  privacyContact: "随时可以要求查阅、更正或删除我们持有的资料 —— WhatsApp",
  privacyDate: "依据《2010 年个人资料保护法令》（Act 709）。最后更新：2026 年 10 月 7 日。",
  howGet: "你希望怎样取货？",
  selfCollect: "自取",
  selfCollectSub: "你自己来拿 — 不收送货运费。我们会通知你确切地点，面包做好后，烘焙日当天任何时间都可以来取。",
  courier: "外送",
  courierSub: "我们安排骑手送到你家。运费会在 WhatsApp 上告诉你 — 页面上显示的总额只是面包的钱。",
  ourKitchen: "我们的厨房",
  kitchenSub: "Sungai Ara, Bayan Lepas — 我们烘焙的地方",
  pointSub: "自取点 — 订单确认后，我们会通知你确切地点和时间",
  pointMin: "需消费 RM%1 或以上 — 你目前 RM%2",
  addressLabel: "派送地址",
  addressPh: "街道、区域、槟城…",
  pinHint: "不标记也可以 — 司机会去上面填写的地址，大多数房子这样就可以了。只有当地址本身找不到你家门时才需要标记：公寓楼、保安亭。无论是否标记，都请把座号和门牌号码写在上面。",
  pinHere: "使用我的位置",
  pinOnMap: "在地图上标记",
  pinSet: "已标记位置 — 司机会前往你标记的地点。",
  pinVague: "这个位置只准确到约 %1 米。请在地图上移动标记，让司机去对地方。",
  pinNoGeo: "这个浏览器无法获取位置。请在地图上标记你家门口。",
  pinDenied: "这个网站未获准获取位置。请在地图上标记你家门口。",
  pinUnavailable: "暂时无法找到你的位置。请在地图上标记你家门口。",
  pinTimeout: "定位花的时间太长。请在地图上标记你家门口。",
  pinLoading: "地图载入中…",
  pinTapFirst: "在地图上点一下司机应该停下的地方，或拖动标记。",
  pinLocating: "正在定位…",
  pinKeep: "确定这个位置",
  pinCancel: "取消",
  pinMapFailed: "地图无法载入。请在上面填写地址，我们会找到你。",
  pinAddrChanged: "你更改了地址，所以之前选的标记已经不对应了。请点选上面的建议地址，或重新标记位置。",
  addrStale: "这个建议对应的是你之前的地址。请点选新地址的建议，或重新标记位置。",
  addrLooking: "正在查询你的地址…",
  addrPick: "点选最接近你地址的一项。",
  addrNone: "找不到这个地址。请直接在地图上把标记放到你家门口。",
  addrFailed: "地址查询暂时无法使用。请直接在地图上把标记放到你家门口。",
  noteLabel: "取货／送货备注（可选）",
  notePh: "门禁密码、地标、方便辨认的东西…",
  addNoteLink: "＋ 添加备注",
  lineNotePh: "例如：不要坚果、写上「生日快乐」",
  sTrack: "查询订单",
  trackHint: "已经下单了？请输入确认讯息里的订单编号（以 <strong>#</strong> 开头，例如 #A3F9C2）。",
  trackPh: "例如：A3F9C2",
  trackBtn: "查询",
  sPolicies: "条规",

  items: "%1 件",
  oneItem: "1 件",
  placeOrder: "提交订单",
  sending: "正在发送…",
  soldOut: "已售完",
  onlyLeft: "仅剩 %1 份",
  noDates: "目前没有可预订的烘焙日 — 请稍后再来。",
  noOpenDates: "近期派送均已满 — 请稍后再来。",
  calChosen: "你的烘焙日：%1",
  calPrev: "前一周",
  calNext: "下一周",

  closedFrom: "只接受 %1 起的烘焙日订单",
  closedTo: "只接受 %1 或之前的烘焙日订单",
  closedClose: "需在烘焙日前 %1 天下单",
  closedCloseAdvice: " — 请另选较后的日期",
  closedWeekday: "只限 %1 供应",
  closedUnmarked: "这一天没有出售",
  unavailable: "暂无供应",
  nextAvailable: "下次可预订：%1",
  nextAvailableLeft: "下次可预订：%1 · 剩 %2 份",
  sentenceEnd: "。",
  noMenuToday: "这一天没有商品在菜单上，请另选一个烘焙日。",
  moreItems: "更多商品",
  fixSoldOut: "%1 刚刚售完 — 已从你的订单中移除。",
  fixPoolClamp: "%1：现在配合订单其余部分只装得下 %2 份 — 已把你的 %3 改为 %2。",
  fixClamp: "%1：现在只剩 %2 份 — 已把你的 %3 改为 %2。",
  fixClosed: "%1：%2 — 已移除。",

  cancelNote: "可在烘焙日前 %1 天更改或取消。",
  cancelNoteOne: "可在烘焙日前 1 天更改或取消。",
  orderCancelNote: "烘焙日前 %1 天可以更改或取消。不退款 — 订单可以换到其他烘焙日。",
  orderCancelNoteOne: "烘焙日前 1 天可以更改或取消。不退款 — 订单可以换到其他烘焙日。",

  confirmAddWaTitle: "请填写你的 WhatsApp 号码。",
  confirmAddWaBody: "我们会用它确认订单并发送付款二维码。",
  confirmClosedTitle: "该日的订单已截止。",
  confirmClosedBody: "此日的订单需在烘焙日前一天 %1 前下单 — 请另选一个烘焙日。",
  confirmChangedTitle: "你的订单刚刚有变动。",
  confirmChangedBody: "下单期间有商品售完了 — 我们已根据剩余数量更新你的购物车。",
  confirmChangedSub: "请确认后再按「提交订单」。",
  sendingToBakery: "正在把你的订单发送给烘焙师…",
  orderRecvTitle: "🎉 订单已收到！",
  orderRecvBody: "%1 已收到你的订单。",
  orderRecvThanksBody: "谢谢 %1！%2 已收到你的订单。",
  orderRecvLine: "📅 %1 · %2 · RM%3",
  orderRecvSub: "订单已送达烘焙师 — 确认后我们会通过 WhatsApp 通知你。",
  failTitle: "暂时联系不上烘焙店。",
  failBody: "别担心 — 直接用 WhatsApp 把订单发过来，不要弄丢。",
  failOpened: "WhatsApp 已打开并带上你的订单 — 请按「发送」。",
  failLink: "📲 通过 WhatsApp 发送订单",
  failRetry: "请稍后再试一次。",

  trackEnter: "请输入订单编号查询。",
  trackUnavailable: "现在暂时无法查询。",
  trackLooking: "正在查询你的订单…",
  trackNotFound: "找不到订单 #%1。请检查确认讯息中的编号 — 即 # 号后的 6 个字符。",
  orderCode: "订单 #%1",
  forCustomer: "顾客：%1",
  trkNew: "新订单",
  trkConfirmed: "已确认",
  trkPaid: "已付款",
  trkBaking: "烘焙中",
  trkReady: "已打包",
  trkFinal: "已取货 / 已寄出",
  trackingNo: "快递单号：%1",
  trackDelivery: "查看配送进度：",
  trkItems: "商品：%1",
  itemsTotal: "商品小计：%1",
  trkTotal: "总计：%1",
  courierCharge: "快递费：%1",
  courierCod: "快递费：%1 - 货到付款，收货时付给送货员",
  promoLine: "优惠码 %1：-%2",
  promoFriend: "朋友推荐优惠：-%1",
  tripStatus: "配送：%1",
  tripFinding: "正在寻找司机",
  tripOnTheWay: "司机在路上",
  tripCollected: "已取货",
  tripDelivered: "已送达",
  tripStopped: "已取消",
  tripNoDriver: "无司机接单",
  driverLine: "司机：%1",
  vehicleLine: "车辆：%1",
  callDriver: "致电司机",
  carrierLine: "快递公司：%1",
  nextBlockedBasket: "你的购物篮是 %1 的。想订另一天，请在上面的日历选择。",

  devBy: "网站制作：",
  devWa: "用 WhatsApp 找开发者",

  // The same one-line rule as the English: no more than about 23 characters here.
  fbPh: "网站管理员：喜欢这个界面吗？告诉我，我把它做好",
  fbHint: "按 Enter 发送",
  fbSending: "正在发送…",
  fbThanks: "你的建议我们收到了，会好好处理。新更新很快就来！",
  fbFailed: "刚才发送不成功 — 再试一次，或用 WhatsApp 找开发者。",
  fbEmpty: "先写下你的想法吧。",
};

const ms = {
  titleWord: "Tempahan",
  homeLink: "🏠 Laman utama kami",
  referral: "🎁 Anda dirujuk — anda ada diskaun sambutan untuk tempahan pertama",

  promoLabel: "Ada kod?",
  promoPh: "cth. FRESH10",
  promoApply: "Guna",
  promoRemove: "Buang kod",
  promoBar: "Kod %1 disertakan dengan pesanan anda. Kami akan semak dan sahkan jumlah akhir di WhatsApp.",
  promoToday: "Hari ini: %1 — guna kod %2",
  promoAccepted: "%1 — kod %2 telah digunakan. Kami akan tolakkan apabila kami sahkan tempahan anda.",
  promoAcceptedUsed: "%1 — kod %2 telah digunakan. Satu sahaja setiap pelanggan, jadi kami akan sahkan apabila kami ambil tempahan anda.",
  promoAcceptedFirst: "%1 — kod %2 telah digunakan. Kod ini untuk tempahan pertama, jadi kami akan sahkan apabila kami ambil tempahan anda.",
  promoUnknown: "Kami tidak kenal kod itu — semak hurufnya dan cuba lagi.",
  promoPaused: "Kod itu sedang ditahan — ia tidak tersedia buat masa ini.",
  promoEnded: "Kod itu tamat pada %1 — ia tidak lagi tersedia.",
  promoNotYet: "Kod itu belum bermula — ia bermula pada %1.",
  promoClaimed: "Kod itu telah habis diambil — semuanya telah digunakan.",
  promoClash: "Kod itu tidak boleh digunakan bersama diskaun sambutan yang anda sudah ada — hubungi kami dan kami akan uruskannya.",
  promoSmall: "Belum cukup lagi — tambah %1 lagi untuk menggunakannya.",
  promoNo: "Kod itu tidak boleh digunakan buat masa ini — hubungi kami dan kami akan uruskannya.",
  promoFreeDelivery: "Penghantaran percuma",
  promoOffAmount: "Potongan %1",
  promoOffPercent: "Potongan %1%",
  promoOffPercentCap: "%1, sehingga %2",
  promoOnMin: "%1 untuk %2 ke atas",
  promoUntil: "%1, sehingga %2",
  deliveryDays: "Hari membakar",
  orderBy: "Tempahan ditutup",
  beforeVal: "%1 sehari sebelumnya",
  // ⚠️ Same note as the Chinese above: mine, not a native speaker's, and worth checking before launch.
  ansClosed: "Bakaran hari ini sudah tutup",
  ansInTime: "Anda masih sempat",
  ansNext: "Hari seterusnya anda boleh dapat roti ialah %1.",
  ansBy: "Pesan sebelum %2 pada %1, dan ia milik anda.",
  stepsLede: "Anda buat tiga perkara — selebihnya kami uruskan.",
  madeToOrder: "Dibuat mengikut tempahan · tutup %1 sehari sebelum",
  sPickDay: "Pilih hari membakar",
  sWhat: "Apa yang anda mahu?",
  sYourDetails: "Maklumat anda",
  yourName: "Nama anda",
  namePh: "cth. Aunty Bee",
  whatsappNo: "Nombor WhatsApp",
  whatsPh: "cth. 012-345 6789",
  waSub: "Kami guna nombor ini untuk sahkan tempahan dan hantar QR pembayaran — kami tidak akan spam anda.",

  privacyLine: "Dengan menempah, anda bersetuju dengan",
  privacyLink: "notis privasi.",
  privacyHead: "Bagaimana kami menggunakan maklumat anda",
  privacyWhat: "Kami menggunakan data anda hanya untuk membuat tempahan anda, menghantarnya kepada anda, dan menghubungi anda mengenainya. Jika dihantar, kami juga perlukan alamat dan pin pintu anda.",
  privacyWho: "Untuk menghantar tempahan anda, penghantar diberi nama, nombor dan alamat anda. Pengesahan sampai kepada anda melalui WhatsApp, dan notis tempahan masuk ke telefon kami. Tiada sesiapa lain melihat maklumat anda, dan kami tidak pernah menjualnya.",
  privacyKeep: "Maklumat anda disimpan bersama tempahan anda dalam buku tempahan kami, di perkhidmatan awan yang selamat dan dalam telefon kami sendiri di belakang PIN. Rekod jualan disimpan selama tujuh tahun seperti yang dikehendaki pihak cukai — tetapi nama, nombor dan alamat anda bukan sebahagian daripada rekod itu, jadi beritahu kami bila-bila masa dan kami akan padamkannya.",
  privacyContact: "Beritahu kami bila-bila masa untuk melihat, membetulkan atau memadam apa yang kami simpan — WhatsApp",
  privacyDate: "Di bawah Akta Perlindungan Data Peribadi 2010 (Akta 709). Kemas kini terakhir: 7 Oktober 2026.",
  howGet: "Macam mana anda mahu ambil tempahan?",
  selfCollect: "Ambil sendiri",
  selfCollectSub: "Anda datang ambil sendiri — tiada caj penghantaran. Kami maklumkan lokasi yang tepat, dan sebaik sahaja tempahan anda siap, anda boleh ambil pada bila-bila masa pada hari membakar.",
  courier: "Penghantaran kurier",
  courierSub: "Kami hantar penghantar ke pintu anda. Sebarang caj penghantaran dimaklumkan di WhatsApp — jumlah yang dipaparkan ialah untuk roti sahaja.",
  ourKitchen: "Dapur kami",
  kitchenSub: "Sungai Ara, Bayan Lepas — tempat kami membakar",
  pointSub: "Titik ambilan — kami maklumkan lokasi dan masa yang tepat selepas pesanan anda disahkan",
  pointMin: "Perlu bakul RM%1 ke atas — bakul anda RM%2 setakat ini",
  addressLabel: "Alamat penghantaran",
  addressPh: "Jalan, kawasan, Pulau Pinang…",
  pinHint: "Tak tandakan pun boleh — kurier akan pergi ke alamat yang anda taip, dan itu memadai untuk kebanyakan rumah. Tanda hanya jika alamat itu sahaja tidak cukup untuk mencari pintu anda: blok kondominium, pondok pengawal. Sama ada anda tandakan atau tidak, tulis nombor blok dan unit di ruang alamat di atas.",
  pinHere: "Guna lokasi saya",
  pinOnMap: "Tanda pada peta",
  pinSet: "Lokasi ditanda — kurier akan pergi ke tempat yang anda tandakan.",
  pinVague: "Lokasi itu hanya tepat dalam lebih kurang %1 m. Gerakkan tanda pada peta supaya kurier pergi ke tempat yang betul.",
  pinNoGeo: "Pelayar ini tidak boleh berkongsi lokasi. Sila tandakan pintu anda pada peta.",
  pinDenied: "Perkongsian lokasi dimatikan untuk laman ini. Sila tandakan pintu anda pada peta.",
  pinUnavailable: "Lokasi anda tidak dapat dikesan buat masa ini. Sila tandakan pintu anda pada peta.",
  pinTimeout: "Mengambil masa terlalu lama untuk mengesan lokasi. Sila tandakan pintu anda pada peta.",
  pinLoading: "Peta sedang dimuatkan…",
  pinTapFirst: "Ketik peta di tempat kurier patut berhenti, atau gerakkan tanda itu.",
  pinLocating: "Sedang mengesan anda…",
  pinKeep: "Simpan tempat ini",
  pinCancel: "Batal",
  pinMapFailed: "Peta tidak dapat dimuatkan. Taip alamat anda di atas, kami akan cari.",
  pinAddrChanged: "Anda menukar alamat, jadi tanda yang dipilih tadi tidak lagi sepadan. Ketik cadangan di atas, atau tandakan semula.",
  addrStale: "Cadangan itu untuk alamat anda yang sebelum ini. Pilih satu untuk alamat baharu, atau tandakan semula.",
  addrLooking: "Sedang mencari alamat anda…",
  addrPick: "Ketik yang paling hampir dengan alamat anda.",
  addrNone: "Alamat itu tidak ditemui. Ketik peta dan letakkan tanda pada pintu anda.",
  addrFailed: "Pencarian alamat tidak tersedia buat masa ini. Ketik peta dan letakkan tanda pada pintu anda.",
  noteLabel: "Nota untuk ambilan/penghantaran (pilihan)",
  notePh: "Kod pintu, mercu tanda, apa yang perlu dicari…",
  addNoteLink: "＋ Tambah nota",
  lineNotePh: "cth. tanpa kacang, tulis “Selamat Hari Jadi”",
  sTrack: "Semak tempahan anda",
  trackHint: "Sudah menempah? Masukkan nombor tempahan dari mesej pengesahan (bermula dengan <strong>#</strong>, cth. #A3F9C2).",
  trackPh: "cth. A3F9C2",
  trackBtn: "Semak",
  sPolicies: "Polisi",

  items: "%1 item",
  oneItem: "1 item",
  placeOrder: "Hantar tempahan",
  sending: "Sedang dihantar…",
  soldOut: "Habis",
  onlyLeft: "Tinggal %1 sahaja",
  noDates: "Tiada hari membakar buat masa ini — sila datang lagi nanti.",
  noOpenDates: "Semua hari membakar akan datang penuh buat masa ini — sila datang lagi nanti.",
  calChosen: "Hari membakar anda: %1",
  calPrev: "Minggu sebelumnya",
  calNext: "Minggu seterusnya",

  closedFrom: "Hanya tersedia untuk hari membakar dari %1",
  closedTo: "Hanya tersedia untuk hari membakar sehingga %1",
  closedClose: "Tempahan ditutup %1 hari sebelum hari membakar",
  closedCloseAdvice: " — sila pilih tarikh yang lebih lewat",
  closedWeekday: "Hanya tersedia pada %1",
  closedUnmarked: "Tidak dijual pada hari ini",
  unavailable: "Tidak tersedia",
  nextAvailable: "Seterusnya tersedia: %1",
  nextAvailableLeft: "Seterusnya tersedia: %1 · tinggal %2",
  sentenceEnd: ".",
  noMenuToday: "Tiada apa-apa pada menu untuk hari ini. Sila pilih hari membakar yang lain.",
  moreItems: "Lebih banyak item",
  fixSoldOut: "%1 baru habis — kami keluarkan dari tempahan anda.",
  fixPoolClamp: "%1: hanya %2 boleh dimuatkan bersama baki tempahan anda — kami sudah tukar %3 anda kepada %2.",
  fixClamp: "%1: tinggal %2 sahaja sekarang — kami sudah tukar %3 anda kepada %2.",
  fixClosed: "%1: %2 — kami sudah keluarkan.",

  cancelNote: "Tukar atau batal sehingga %1 hari sebelum hari membakar.",
  cancelNoteOne: "Tukar atau batal sehingga 1 hari sebelum hari membakar.",
  orderCancelNote: "Tukar atau batal sehingga %1 hari sebelum hari membakar. Bayaran tidak dikembalikan — tempahan boleh dipindah ke hari lain.",
  orderCancelNoteOne: "Tukar atau batal sehingga 1 hari sebelum hari membakar. Bayaran tidak dikembalikan — tempahan boleh dipindah ke hari lain.",

  confirmAddWaTitle: "Sila masukkan nombor WhatsApp anda.",
  confirmAddWaBody: "Kami guna untuk sahkan tempahan dan hantar QR pembayaran anda.",
  confirmClosedTitle: "Tempahan untuk hari itu sudah ditutup.",
  confirmClosedBody: "Tempahan untuk hari ini ditutup pada %1 sehari sebelum — sila pilih hari membakar yang lain.",
  confirmChangedTitle: "Tempahan anda baru sahaja berubah.",
  confirmChangedBody: "Ada barang yang habis semasa anda menempah — kami sudah kemas kini troli anda ikut apa yang tinggal.",
  confirmChangedSub: "Sila semak tempahan anda dan tekan Hantar tempahan sekali lagi.",
  sendingToBakery: "Sedang menghantar tempahan anda kepada pembuat kek…",
  orderRecvTitle: "🎉 Tempahan diterima!",
  orderRecvBody: "%1 sudah terima tempahan anda.",
  orderRecvThanksBody: "Terima kasih %1! %2 sudah terima tempahan anda.",
  orderRecvLine: "📅 %1 · %2 · RM%3",
  orderRecvSub: "Tempahan anda sudah sampai kepada pembuat kek — kami akan WhatsApp anda sebaik sahaja disahkan.",
  failTitle: "Kami tidak dapat menghubungi aplikasi kedai buat masa ini.",
  failBody: "Jangan risau — hantar tempahan anda melalui WhatsApp supaya ia tidak hilang.",
  failOpened: "WhatsApp sudah dibuka dengan tempahan anda — tekan Hantar supaya ia tidak hilang.",
  failLink: "📲 Hantar tempahan anda melalui WhatsApp",
  failRetry: "Sila cuba sebentar lagi.",

  trackEnter: "Masukkan nombor tempahan anda untuk disemak.",
  trackUnavailable: "Semakan tidak tersedia buat masa ini.",
  trackLooking: "Sedang cari tempahan anda…",
  trackNotFound: "Kami tidak dapat mencari tempahan #%1. Sila semak nombor dalam mesej pengesahan anda — iaitu 6 aksara selepas #.",
  orderCode: "Tempahan #%1",
  forCustomer: "Untuk %1",
  trkNew: "Baharu",
  trkConfirmed: "Disahkan",
  trkPaid: "Dibayar",
  trkBaking: "Dibakar",
  trkReady: "Dibungkus",
  trkFinal: "Sudah diambil / Sudah dihantar",
  trackingNo: "Nombor penjejakan: %1",
  trackDelivery: "Jejak penghantaran anda:",
  trkItems: "Barang: %1",
  itemsTotal: "Jumlah barang: %1",
  trkTotal: "Jumlah keseluruhan: %1",
  courierCharge: "Caj kurier: %1",
  courierCod: "Caj kurier: %1 - COD, bayar kepada kurier semasa penghantaran",
  promoLine: "Kod %1: -%2",
  promoFriend: "Bawa rakan yang menghantar anda: -%1",
  tripStatus: "Penghantaran: %1",
  tripFinding: "Sedang mencari pemandu",
  tripOnTheWay: "Pemandu dalam perjalanan",
  tripCollected: "Telah diambil",
  tripDelivered: "Telah dihantar",
  tripStopped: "Dibatalkan",
  tripNoDriver: "Tiada pemandu yang mengambil",
  driverLine: "Pemandu: %1",
  vehicleLine: "Kenderaan: %1",
  callDriver: "Hubungi pemandu",
  carrierLine: "Kurier: %1",
  nextBlockedBasket: "Bakul anda untuk %1. Untuk hari lain, pilih pada kalendar di atas.",

  devBy: "Laman web oleh",
  devWa: "WhatsApp developer",

  // Her own wording, and it carries NO "Webmaster: " prefix - deliberately, and she wrote
  // it without one. Measured: as written it is 321.8px and holds one line in a phone's
  // 323px; adding the prefix costs 76px and wraps it onto two. Spells "User Interface"
  // out for the same reason the English does: "UI" is not a word a customer uses.
  fbPh: "Suka User Interface ini? Komen & Saya akan perbaiki!",
  fbHint: "Tekan Enter untuk hantar",
  fbSending: "Sedang dihantar…",
  fbThanks: "Idea anda sudah kami terima! Update terbaru akan datang tak lama lagi.",
  fbFailed: "Maaf, tadi tak berjaya dihantar. Cuba lagi, atau WhatsApp developer.",
  fbEmpty: "Tulis idea anda dulu ya.",
};

export const STORE = { en, zh, ms };
