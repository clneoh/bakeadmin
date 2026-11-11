// ─────────────────────────────────────────────────────────────
//  STOREFRONT SETTINGS — fallback values for the customer page.
//  When live Supabase is configured, the backoffice publishes these from
//  Settings → Storefront, which overrides this file at runtime (no redeploy).
//  This file is only the starting point / offline fallback.
// ─────────────────────────────────────────────────────────────
export const CONFIG = {
  // Her WhatsApp number: country code first, DIGITS ONLY, no "+", no spaces.
  // Malaysia: 012-345 6789 → "60123456789"
  //
  // ⚠️ THIS MUST BE HER REAL NUMBER, AND IT WAS NOT (v346). It held the example
  // number from the notes above — 60123456789, which belongs to somebody else.
  // This file is only the fallback, so the published settings normally cover it;
  // but it is the fallback for the WORST moment, because the shop falls back to
  // it exactly when the published settings cannot be reached, which is also when
  // the order cannot be placed. A customer was being handed a stranger's
  // WhatsApp at the one moment she most needed to reach the bakery.
  whatsapp: "60169601268",

  // The name customers see — her bakery name.
  name: "Jienluv2bake",

  // One-line tagline shown under the name.
  tagline: "Home-made focaccia & sandwiches, Penang",

  // Delivery days: 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 0=Sun
  deliveryDays: [1, 3, 5],

  // Order cut-off time on the day before delivery, 24h format.
  cutoff: "18:00",

  // How many upcoming delivery dates to show.
  upcomingCount: 3,

  // Day capacity is set in the backoffice: each product's daily limit is added
  // together (e.g. 12 focaccia + 12 sandwiches = 24). This value is only a
  // fallback hint for the day-level sold-out check.
  capacity: 12,

  // Live availability via Supabase: the backoffice app posts slots left per day
  // (drives the sold-out date pill) and per product (drives the "Only N left"
  // stamps on each product card). Leave url/anonKey empty ("") to hide
  // availability entirely.
  supabase: {
    url: "https://hzpyblqygnntixkijeem.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6cHlibHF5Z25udGl4a2lqZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODUyNzAsImV4cCI6MjEwMzc2MTI3MH0.jmxtiVCmDrD3xJWVSxhYi5lDpXD6nyZavp1x5hhUh0E",
  },

  // What's on sale. price is in RM. unit is a short label (loaf / piece / box).
  //
  // ⚠️ THIS LISTS ONLY WHAT SHE ACTUALLY SELLS (v347, her decision: "trim it to
  // what i sell"). It used to carry a SAMPLE of two products — a Focaccia at RM15
  // and a Sandwich the shop does not sell — on the argument that this file is a
  // starting point. But it is also the OFFLINE FALLBACK: what a customer sees
  // when the published settings cannot be reached, which is also when the order
  // cannot be placed. A fallback that offers a product nobody can order is worse
  // than a shorter one, so this now mirrors the published menu exactly — one
  // focaccia, RM16 a loaf, as Settings → Storefront has it (checked 7 Oct 2026).
  //
  // ⚠️ KEEP THIS IN STEP WITH WHAT IS PUBLISHED. It is the one thing here that
  // can drift silently, because the published settings cover it while the cloud
  // answers.
  products: [
    { name: 'Focaccia 9"x12" abt 850g', price: 16, unit: "loaf" },
  ],

  // Optional social links, shown under the order button. Leave "" to hide.
  instagram: "",
  facebook: "",

  // Policies shown on the shop (cancellation / refunds), under "Track your
  // order". The baker types the English text once in Settings → Storefront and
  // the app translates it; policyZh / policyMs carry the translations. Empty
  // hides the whole section — this is only the offline fallback.
  policy: "",
};
