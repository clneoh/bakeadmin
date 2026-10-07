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
  // ⚠️ THE PRICE WAS WRONG (v346). Focaccia sat here at RM15 while the homepage
  // and the live shop both say RM16 — corrected to match. This file is the
  // STARTING POINT and the offline fallback, so it is a sample menu rather than a
  // copy of the published one, and the sample keeps two products to show the
  // shape. ⚠️ But a sample that names a real product must carry that product's
  // real price, or a customer who lands on the fallback is quoted a figure she
  // does not charge.
  products: [
    { name: "Focaccia", price: 16, unit: "loaf" },
    { name: "Sandwich", price: 8, unit: "piece" },
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
