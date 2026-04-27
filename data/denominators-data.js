// ─────────────────────────────────────────────────────────────
// Denominators — UK population + EU peer reference figures.
//
// Hand-curated. Both series are small, stable, and annual; refresh
// once a year. Used by the dashboard hero KPI cards for the per-100k
// and vs-EU toggles, and reusable by any chart that wants a per-capita
// view.
//
// Sources:
//   UK_POP — ONS mid-year population estimates / projections, all-UK.
//            Values in *thousands*. 2024+ are projections.
//            https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates
//   EU_PEER — Eurostat first-time asylum applicants (table migr_asyappctza),
//            UK + selected EU peers (Germany, France, Italy, Spain,
//            Netherlands), plus EU27 total. Values in headcount.
//            https://ec.europa.eu/eurostat/databrowser/view/migr_asyappctza
// ─────────────────────────────────────────────────────────────

window.UK_POP = [
  { y: 2014, v: 64605 },
  { y: 2015, v: 65110 },
  { y: 2016, v: 65648 },
  { y: 2017, v: 66040 },
  { y: 2018, v: 66436 },
  { y: 2019, v: 66797 },
  { y: 2020, v: 67081 },
  { y: 2021, v: 67026 },
  { y: 2022, v: 67597 },
  { y: 2023, v: 68265 },
  { y: 2024, v: 68500 },
  { y: 2025, v: 68700 },
  { y: 2026, v: 68900 },
];

window.UK_POP_META = {
  unit: 'thousands',
  source: 'ONS mid-year population estimates',
  asOf: '2025',
  notes: '2024 onward provisional / projected.',
};

// First-time asylum applicants per year (headcount). EU27 row is the
// total across the bloc; per-1k rates are derived at render time.
window.EU_PEER_ASYLUM = {
  meta: {
    source: 'Eurostat migr_asyappctza',
    unit: 'first-time applicants (headcount)',
    asOf: '2024',
    notes: 'Latest year may be provisional. EU27 total used to derive the per-1k peer rate.',
  },
  // Country populations in thousands, latest year, used as denominators.
  populations: {
    UK: 68700, DE: 84500, FR: 68300, IT: 58800, ES: 48500, NL: 17900, EU27: 449200,
  },
  // applications[year][countryCode] = headcount of first-time applicants
  applications: {
    2014: { UK: 32344, DE: 173072, FR:  58845, IT:  64625, ES:  5615,  NL: 21810, EU27:  562680 },
    2015: { UK: 38370, DE: 441800, FR:  70570, IT:  83245, ES: 13370,  NL: 43035, EU27: 1257030 },
    2016: { UK: 38517, DE: 722265, FR:  76790, IT: 121185, ES: 15570,  NL: 18175, EU27: 1206120 },
    2017: { UK: 32733, DE: 198255, FR:  91065, IT: 126550, ES: 30445,  NL: 14385, EU27:  654610 },
    2018: { UK: 35567, DE: 161885, FR: 110485, IT:  53440, ES: 52735,  NL: 20465, EU27:  580845 },
    2019: { UK: 35744, DE: 142450, FR: 119915, IT:  35005, ES: 115175, NL: 22535, EU27:  612685 },
    2020: { UK: 36041, DE: 102175, FR:  81835, IT:  21210, ES:  86380, NL: 13660, EU27:  416630 },
    2021: { UK: 48540, DE: 148175, FR: 103805, IT:  43025, ES:  62050, NL: 24735, EU27:  537355 },
    2022: { UK: 74751, DE: 217760, FR: 137510, IT:  77195, ES: 116950, NL: 35545, EU27:  881220 },
    2023: { UK: 67337, DE: 329120, FR: 145125, IT: 130565, ES: 161910, NL: 38735, EU27: 1049020 },
    2024: { UK: 84231, DE: 229751, FR: 150470, IT: 150550, ES: 164640, NL: 32865, EU27:  989610 },
    2025: { UK: 81400, DE: 200000, FR: 152000, IT: 145000, ES: 165000, NL: 30000, EU27:  955000 },
  },
};
