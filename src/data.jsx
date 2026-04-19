/* =========================================================================
   data.jsx — hard-coded shell data that isn't derived from the ODS.

   CLAUDE.md says this file holds "asylum / backlog / regions / stories" —
   the legacy Home Office data-explorer shell. Here we keep it small: just
   enough scaffolding for the story and datasets views to reference. Anything
   numeric about small boats MUST come from window.BOATS_*, not from here.

   Editing rule: when BOATS_ANNUAL changes, update ASYLUM_ANNUAL.boats in
   the same commit (see CLAUDE.md § "Things that look like problems").
   ========================================================================= */

/* Annual asylum figures — shell data. `boats` column duplicates BOATS_ANNUAL
   but lives here so the shell's legacy charts work without a data fetch. */
window.ASYLUM_ANNUAL = window.ASYLUM_ANNUAL || [
  { y: 2018, applications: 29382, decisions: 14583, granted: 4914, boats: 299 },
  { y: 2019, applications: 35738, decisions: 20103, granted: 6236, boats: 1844 },
  { y: 2020, applications: 36041, decisions: 14795, granted: 6896, boats: 8466 },
  { y: 2021, applications: 48540, decisions: 13888, granted: 9973, boats: 28526 },
  { y: 2022, applications: 74751, decisions: 18699, granted: 13703, boats: 45755 },
  { y: 2023, applications: 67337, decisions: 86798, granted: 32557, boats: 29437 },
  { y: 2024, applications: 108138, decisions: 98754, granted: 40565, boats: 36816 },
];

/* A few narrative anchors — used by the /story view. Numbers are illustrative
   placeholders and should be replaced with derivations from BOATS_* once the
   pipeline is live. */
window.STORIES = window.STORIES || [
  {
    id: "beginnings",
    kicker: "2018",
    title: "An almost-zero baseline",
    body:
      "When the weekly series begins in January 2018, English Channel crossings are rare. Whole months pass with single-digit arrivals. The 2018 annual total is lower than a single busy day five years later.",
  },
  {
    id: "inflection",
    kicker: "2020",
    title: "Inflection",
    body:
      "Arrivals rise sharply through 2020, redefining the baseline. By the end of the year the daily average is an order of magnitude above 2019.",
  },
  {
    id: "plateau",
    kicker: "2023–present",
    title: "A rougher plateau",
    body:
      "Annual totals stop their steep climb but remain at a level that would have been unthinkable five years earlier. Preventions, newly reported from 2023, add a second line to the picture.",
  },
];

/* Dataset catalogue — rendered as a table on /datasets. Kept here, not
   generated, because the description is editorial, not mechanical. */
window.DATASET_CATALOGUE = window.DATASET_CATALOGUE || [
  { global: "BOATS_DAILY",    shape: "[{d, m, b}]",                     size: "~3,000 rows", notes: "Daily migrants + boats from 2018-01-01." },
  { global: "BOATS_WEEKLY",   shape: "[{we, m, b, p, e}]",              size: "~400 rows",   notes: "Week-ending Saturdays; p/e null before 2023." },
  { global: "BOATS_MONTHLY",  shape: "[{month, m, b}]",                 size: "~100 rows",   notes: "Aggregated from BOATS_DAILY." },
  { global: "BOATS_ANNUAL",   shape: "[{y, m, b, perBoat}]",            size: "~9 rows",     notes: "Per-boat = migrants / boats." },
  { global: "BOATS_YOY",      shape: "{YYYY: [cum_day_1..366]}",        size: "9 keys",      notes: "Cumulative by day-of-year; null past latest." },
  { global: "BOATS_RECORDS",  shape: "{busiest*, total*, firstDate, latestDate, daysCovered}", size: "1 object",   notes: "Scalar highlights." },
  { global: "BOATS_META",     shape: "{sourceFile, sourceDated, latestDataPoint, generatedAt, provider, licence, sourceUrl, notes[]}", size: "1 object", notes: "Provenance + methodology text." },
];
