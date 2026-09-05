// Malaysia's dates for the "Add Malaysia's occasions" import button, from the
// Delivery-calendar "Mark an occasion" mode. Curated to what Malaysians across
// the Peninsular actually celebrate (public holidays + big cultural/family
// days + the year-end school break). `pub: true` = official public holiday
// (imports red); everything else imports orange, so the baker can tell them
// apart at a glance and delete whichever she doesn't want.
//
// Dates follow the official published calendar where one exists. Moon-sighting
// holidays are labelled "(est.)" — the government has only estimated those so
// far, so they may shift a day; she can Edit any imported mark later.
// Rows with `to` in the past are never offered for import.
export const MALAYSIAN_OCCASIONS = [
  { label: "Malaysia Day", from: "2026-09-16", to: "2026-09-16", cat: "national", pub: true },
  { label: "Mid-Autumn Festival", from: "2026-09-25", to: "2026-09-25", cat: "festive", pub: false },
  { label: "Halloween", from: "2026-10-31", to: "2026-10-31", cat: "festive", pub: false },
  { label: "Deepavali", from: "2026-11-08", to: "2026-11-09", cat: "festive", pub: true },
  { label: "Year-end school holidays", from: "2026-12-04", to: "2027-01-03", cat: "school", pub: false },
  { label: "Christmas", from: "2026-12-25", to: "2026-12-25", cat: "festive", pub: true },

  { label: "New Year's Day", from: "2027-01-01", to: "2027-01-01", cat: "festive", pub: true },
  { label: "Thaipusam", from: "2027-01-22", to: "2027-01-22", cat: "festive", pub: true },
  { label: "Chinese New Year", from: "2027-02-06", to: "2027-02-07", cat: "festive", pub: true },
  { label: "Valentine's Day", from: "2027-02-14", to: "2027-02-14", cat: "family", pub: false },
  { label: "Hari Raya Aidilfitri (est.)", from: "2027-03-10", to: "2027-03-11", cat: "festive", pub: true },
  { label: "Mother's Day", from: "2027-05-09", to: "2027-05-09", cat: "family", pub: false },
  { label: "Teacher's Day", from: "2027-05-16", to: "2027-05-16", cat: "family", pub: false },
  { label: "Hari Raya Haji", from: "2027-05-17", to: "2027-05-17", cat: "festive", pub: true },
  { label: "Wesak Day", from: "2027-05-20", to: "2027-05-20", cat: "festive", pub: true },
  { label: "Awal Muharram (est.)", from: "2027-06-06", to: "2027-06-06", cat: "festive", pub: true },
  { label: "Father's Day", from: "2027-06-20", to: "2027-06-20", cat: "family", pub: false },
  { label: "Prophet Muhammad's birthday (est.)", from: "2027-08-15", to: "2027-08-15", cat: "festive", pub: true },
  { label: "Merdeka Day", from: "2027-08-31", to: "2027-08-31", cat: "national", pub: true },
  { label: "Mid-Autumn Festival", from: "2027-09-15", to: "2027-09-15", cat: "festive", pub: false },
  { label: "Malaysia Day", from: "2027-09-16", to: "2027-09-16", cat: "national", pub: true },
  { label: "Deepavali (est.)", from: "2027-10-28", to: "2027-10-28", cat: "festive", pub: true },
  { label: "Halloween", from: "2027-10-31", to: "2027-10-31", cat: "festive", pub: false },
  { label: "Christmas", from: "2027-12-25", to: "2027-12-25", cat: "festive", pub: true },
];

// The import colour rule the baker chose: public holiday = red, else orange.
// (She can re-colour any imported mark afterwards, like her own marks.)
export function importOccColour(entry) {
  return entry.pub ? "red" : "orange";
}
