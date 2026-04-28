// data.jsx — shared data for the Home Office Data Explorer
//
// Most of the constants below are *shims* over pipeline-generated globals
// (BOATS_ANNUAL, NAT_FULL, NAT_SERIES_LATEST, DECISIONS_LATEST, BACKLOG_LATEST,
// RESETTLEMENT_SERIES, SUPPORT_REGIONS). The hand-maintained fallbacks below
// only take effect if a global is missing at load time — so edits to pipeline
// output propagate automatically, and the hardcoded numbers stop drifting.

const _W = (typeof window !== 'undefined') ? window : {};

// Shared month-name lookups. Used by every short-date formatter and by chart
// axis labels. Defined here so the bundle exposes them once to every later
// JSX file (data.jsx is concatenated first; see scripts/bundle.py).
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// UK asylum applications 2014–latest (main applicants, annual).
//
// `.v` is hand-maintained for 2014–(latest-1) because no pipeline global
//   carries a per-year UK-wide applications time series (NAT_QUARTERLY only
//   covers recent years; NAT_FULL is a single-year snapshot). When the next
//   complete year lands, append one row here.
// `.v` for the latest year is re-derived from sum(NAT_FULL) at load time so
//   it matches the nationality dataset exactly — no risk of disagreeing totals.
// `.boats` is re-derived from BOATS_ANNUAL at load time for every year
//   present in that global (i.e. 2018+). Pre-2018 rows stay at 0.
const _ASYLUM_V_MANUAL = [
  { y: 2014, v: 24914 }, { y: 2015, v: 32414 }, { y: 2016, v: 30747 },
  { y: 2017, v: 26547 }, { y: 2018, v: 29504 }, { y: 2019, v: 35737 },
  { y: 2020, v: 29815 }, { y: 2021, v: 48540 }, { y: 2022, v: 74751 },
  { y: 2023, v: 84425 }, { y: 2024, v: 80782 },
];

const ASYLUM_ANNUAL = (() => {
  const boatsByYear = {};
  if (Array.isArray(_W.BOATS_ANNUAL)) {
    for (const r of _W.BOATS_ANNUAL) boatsByYear[r.y] = r.m;
  }
  // Latest-year applications total comes from NAT_FULL if available.
  const natYear = _W.NAT_FULL_META?.year ?? null;
  const natTotal = Array.isArray(_W.NAT_FULL)
    ? _W.NAT_FULL.reduce((s, r) => s + (r.v || 0), 0) : null;
  const rows = _ASYLUM_V_MANUAL.map(r => ({
    y: r.y, v: r.v, boats: boatsByYear[r.y] ?? null,
  }));
  if (natYear && natTotal != null && !rows.some(r => r.y === natYear)) {
    rows.push({ y: natYear, v: natTotal, boats: boatsByYear[natYear] ?? null });
  } else if (natYear && natTotal != null) {
    // Overwrite if pipeline now disagrees with the hand-maintained row.
    const idx = rows.findIndex(r => r.y === natYear);
    if (idx >= 0) rows[idx] = { y: natYear, v: natTotal, boats: boatsByYear[natYear] ?? null };
  }
  return rows.sort((a, b) => a.y - b.y);
})();

// Max year reachable from the data globals: max of ASYLUM_ANNUAL and
// BOATS_ANNUAL. Drives the slider upper bound and default range end so
// views don't have to hardcode the latest complete year.
const DATA_MAX_YEAR = (() => {
  const boats = (typeof window !== 'undefined' && Array.isArray(window.BOATS_ANNUAL))
    ? window.BOATS_ANNUAL.map(r => r.y) : [];
  return Math.max(...ASYLUM_ANNUAL.map(r => r.y), ...boats);
})();

// Top nationalities (applications, main applicants, latest year).
// Shims over NAT_FULL when present; hardcoded fallback below is only used
// if the pipeline global is missing at load time.
const TOP_NATIONALITIES = Array.isArray(_W.NAT_FULL) && _W.NAT_FULL.length
  ? _W.NAT_FULL.slice(0, 10).map(r => ({ name: r.name, v: r.v, grant: r.grant }))
  : [
      { name: 'Pakistan',    v: 7850, grant: 0.56 },
      { name: 'Afghanistan', v: 5928, grant: 0.98 },
      { name: 'Iran',        v: 4310, grant: 0.85 },
      { name: 'Eritrea',     v: 3512, grant: 0.92 },
      { name: 'Bangladesh',  v: 3180, grant: 0.11 },
      { name: 'Sudan',       v: 3074, grant: 0.99 },
      { name: 'Syria',       v: 2184, grant: 0.99 },
      { name: 'Vietnam',     v: 2050, grant: 0.18 },
      { name: 'Turkey',      v: 1960, grant: 0.44 },
      { name: 'India',       v: 1820, grant: 0.04 },
    ];

// Top 5 nationality series. Shim over NAT_SERIES_LATEST.
const NAT_SERIES = (_W.NAT_SERIES_LATEST && Array.isArray(_W.NAT_SERIES_LATEST.series))
  ? _W.NAT_SERIES_LATEST
  : {
      years: [2020, 2021, 2022, 2023, 2024],
      series: [
        { name: 'Pakistan',    data: [1569, 2337, 4922, 7521, 7850] },
        { name: 'Afghanistan', data: [2772, 8633, 9577, 6625, 5928] },
        { name: 'Iran',        data: [4339, 5974, 8586, 5820, 4310] },
        { name: 'Eritrea',     data: [2183, 2834, 5000, 4462, 3512] },
        { name: 'Syria',       data: [1270, 2219, 3107, 2505, 2184] },
      ],
    };

// Initial decisions snapshot (latest year). Shim over DECISIONS_LATEST.
const DECISIONS_2024 = Array.isArray(_W.DECISIONS_LATEST) && _W.DECISIONS_LATEST.length
  ? _W.DECISIONS_LATEST
  : [
      { label: 'Granted asylum', v: 34200, color: 'var(--accent-2)' },
      { label: 'Granted humanitarian / other', v: 4800, color: 'var(--accent-gold)' },
      { label: 'Refused',        v: 27800, color: 'var(--accent-warn)' },
      { label: 'Withdrawn',      v: 5600, color: 'var(--muted-2)' },
    ];

// Backlog (pending initial decision) annual series. Projection over BACKLOG_LATEST.
const BACKLOG = (Array.isArray(_W.BACKLOG_LATEST) ? _W.BACKLOG_LATEST : [])
  .map(r => ({ y: r.y, v: r.v }));

// Resettlement schemes (latest year). RESETTLEMENT_SERIES is the canonical
// wide-format pipeline output ({name, 2023:…, 2024:…, 2025:…}); collapse it
// to the latest year for the current shell chart. When a new year lands,
// propagates automatically.
const RESETTLEMENT = (() => {
  const src = _W.RESETTLEMENT_SERIES;
  if (Array.isArray(src) && src.length) {
    const years = Object.keys(src[0] || {}).filter(k => /^\d{4}$/.test(k)).sort();
    const latest = years[years.length - 1];
    if (latest) {
      return src
        .map(r => ({ name: r.name, v: r[latest] || 0 }))
        .filter(r => r.v > 0)
        .sort((a, b) => b.v - a.v);
    }
  }
  return [
    { name: 'ACRS (Afghan)',        v: 4820 },
    { name: 'ARAP (Afghan)',        v: 3140 },
    { name: 'Ukraine family',       v: 2260 },
    { name: 'UKRS (UNHCR)',         v: 1680 },
    { name: 'Community sponsorship', v: 510 },
  ];
})();

// UK regions — supported asylum seekers by region (latest snapshot).
// Shim over SUPPORT_REGIONS.
const REGIONS = Array.isArray(_W.SUPPORT_REGIONS) && _W.SUPPORT_REGIONS.length
  ? _W.SUPPORT_REGIONS.map(r => ({ name: r.name, v: r.v }))
  : [
      { name: 'London',             v: 14200 }, { name: 'North West',        v: 11400 },
      { name: 'Yorkshire & Humber', v: 9600 },  { name: 'West Midlands',     v: 9100 },
      { name: 'South East',         v: 8200 },  { name: 'East of England',   v: 6800 },
      { name: 'North East',         v: 6100 },  { name: 'East Midlands',     v: 5700 },
      { name: 'South West',         v: 4400 },  { name: 'Scotland',          v: 3100 },
      { name: 'Wales',              v: 1500 },  { name: 'Northern Ireland',  v: 680  },
    ];

// Stories on the index page
// Story anatomy (Tranche 6.2): every story carries a compressed ~80-word digest
// plus a standard "measures / doesn't" pair so the StoryView renders a consistent
// digest block at the top. Each story also carries `reading_links` for the
// "Further reading" footer (Tranche 6.4) — two or three outbound links each.
const STORIES = [
  {
    id: 'long-tail',
    kicker: 'Applications',
    title: 'After the 2022 surge',
    dek: 'Applications peaked at 84,425 in 2023, eased in 2024, ticked back up in 2025. The new plateau is roughly three times 2018.',
    digest: 'UK asylum applications tripled between 2020 and 2023, peaking at 84,425 main applicants. The climb was sharper than the early-2000s spike — the plateau that followed sits at roughly three times the 2018 level. 2024 dipped 4%, mostly on faster handling of inadmissible claims; 2025 edged back up. The composition of who is applying has shifted faster than the total.',
    measures: 'Main applicants lodging an asylum claim in the UK, counted once per year.',
    excludes: 'Dependants, appeals reopened in a later year, and inadmissibility declarations that never become full claims.',
    reading_links: [
      { label: 'Migration Observatory — Asylum and refugees',
        url: 'https://migrationobservatory.ox.ac.uk/resources/briefings/migration-to-the-uk-asylum/' },
      { label: 'Refugee Council — asylum statistics',
        url: 'https://www.refugeecouncil.org.uk/information/refugee-asylum-facts/' },
      { label: 'ONS — International migration',
        url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/internationalmigration' },
    ],
    author: 'Data Team',
    date: '14 April 2026',
    reading: '8 min',
    tag: 'Featured',
    hero: 'trend',
  },
  {
    id: 'pakistan',
    kicker: 'Nationality',
    title: 'Pakistan leads, Afghanistan follows',
    dek: 'Pakistani nationals filed more claims than any other group in 2024 and held the lead in 2025 — the first two-year run in the modern series.',
    digest: 'Pakistani nationals filed more UK asylum claims than any other group in 2024 and again in 2025 — the first two-year run at the top in the modern series. Afghan claims remain second, Iranian third. Grant rates for the three groups diverge sharply: Afghan claims are overwhelmingly granted, Pakistani claims much less so. The headline ranking by volume is not the same story as the ranking by outcome.',
    measures: 'Main-applicant count by claimed nationality at the point of application.',
    excludes: 'Dual nationality is resolved to a single recorded nationality; stateless applicants sit in their own row.',
    reading_links: [
      { label: 'Migration Observatory — Who claims asylum in the UK?',
        url: 'https://migrationobservatory.ox.ac.uk/resources/briefings/people-seeking-asylum-understanding-asylum-statistics/' },
      { label: 'UNHCR — asylum applications by origin (UK)',
        url: 'https://www.unhcr.org/refugee-statistics/' },
    ],
    date: '02 April 2026',
    reading: '5 min',
    hero: 'bars',
  },
  {
    id: 'backlog',
    kicker: 'Decisions',
    title: 'The backlog, halved',
    dek: 'The queue of undecided cases fell from 132,000 at the end of 2022 to 48,700 at the end of 2025 — below the 2020 level.',
    digest: 'The queue of asylum cases awaiting an initial decision fell from 132,000 at the end of 2022 to 48,700 at the end of 2025 — below where it sat before the 2021–23 surge. Clearing the tail pushed overall grant rates up and then down, as the remaining cases concentrated in harder-to-decide nationalities. The queue’s shape, not just its size, now drives the headline rate.',
    measures: 'Cases awaiting an initial decision at 31 December each year (main applicants).',
    excludes: 'Appeals pending, administrative-review cases, inadmissibility reviews, and cases at a later stage of the system.',
    reading_links: [
      { label: 'Home Office — Asylum claims awaiting decision',
        url: 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables' },
      { label: 'Migration Observatory — asylum backlog explainer',
        url: 'https://migrationobservatory.ox.ac.uk/resources/commentaries/the-asylum-backlog-what-is-it-and-why-does-it-matter/' },
    ],
    date: '28 March 2026',
    reading: '6 min',
    hero: 'backlog',
  },
  {
    id: 'boats',
    kicker: 'Arrivals',
    title: 'Eight seasons on the Channel',
    dek: 'Small-boat crossings passed 200,000 in early 2026. Weekly cadence, yearly totals, and the widening gap between arrivals and prevented events.',
    digest: 'Small-boat arrivals have passed 200,000 since records began in 2018. Weekly cadence is strongly seasonal — low January to March, rising through spring, peaking late summer — and that seasonality is stable across eight years. Annual totals swing on weather and interception, not on the shape of the season. Preventions, reported since 2023, close some of the gap but not all of it.',
    measures: 'Migrants detected arriving in small boats across the English Channel, by date of arrival.',
    excludes: 'Clandestine entries by other routes, inadequately-documented air arrivals, and migrants turned back at the French coast.',
    reading_links: [
      { label: 'Home Office — small-boats publication',
        url: 'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats' },
      { label: 'Migration Observatory — small-boat crossings explainer',
        url: 'https://migrationobservatory.ox.ac.uk/resources/briefings/people-crossing-the-english-channel-in-small-boats/' },
    ],
    date: '21 March 2026',
    reading: '7 min',
    hero: 'area',
  },
  {
    id: 'grant-rate',
    kicker: 'Outcomes',
    title: 'Grant rate, doubled and drifting',
    dek: 'Initial grants rose from 24% in 2019 to near 50% by 2024, then eased as the backlog unwound. What changed — and what is changing again.',
    digest: 'The UK initial grant rate climbed from 24% in 2019 to near 50% by 2024, then eased as backlog-clearance shifted the case mix. Afghan and Syrian claims consistently grant above 95%; Albanian and Indian claims very rarely. The "UK grant rate" is a weighted mix of those extremes, not a meaningful property of the system on its own. Appeal overturns — unpublished since 2023 — would reshape the top line further.',
    measures: 'Share of substantive initial decisions that granted protection or other leave.',
    excludes: 'Appeal outcomes, withdrawals, and administrative decisions. Appeal overturns typically raise the final grant rate by 15–20 percentage points.',
    reading_links: [
      { label: 'Migration Observatory — asylum decisions',
        url: 'https://migrationobservatory.ox.ac.uk/resources/briefings/people-seeking-asylum-understanding-asylum-statistics/' },
      { label: 'UNHCR — asylum decisions by country',
        url: 'https://www.unhcr.org/refugee-statistics/' },
    ],
    date: '12 March 2026',
    reading: '4 min',
    hero: 'ring',
  },
  {
    id: 'regions',
    kicker: 'Geography',
    title: 'Where the wait happens',
    dek: 'Dispersal accommodation sits in eleven local authorities. They host roughly a third of all supported asylum seekers.',
    digest: 'Home Office dispersal accommodation concentrates in a small number of local authorities. Eleven councils host roughly a third of all supported asylum seekers; hotels account for a declining but significant share. The geography of the wait is quite different from the geography of claim-making — claims are heard nationally, but people live wherever the accommodation contract routes them.',
    measures: 'Asylum seekers in receipt of Section 95 and Section 4 support, by the local authority where they are housed.',
    excludes: 'Self-supporting asylum seekers, those in detention, and resettled refugees outside the asylum process.',
    reading_links: [
      { label: 'Home Office — asylum support statistics',
        url: 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables' },
      { label: 'Refugee Council — asylum accommodation',
        url: 'https://www.refugeecouncil.org.uk/' },
    ],
    date: '04 March 2026',
    reading: '5 min',
    hero: 'map',
  },
];

// Datasets shown on the browse list.
// `landingUrl` mirrors the `landing_url` field in scripts/_sources.py — keep in sync.
const URL_ISS_TABLES = 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables';
const URL_SMALL_BOATS = 'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats';
const URL_SMALL_BOATS_7 = 'https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats/migrants-detected-crossing-the-english-channel-in-small-boats-last-7-days';
const URL_IRR_MIGRATION = 'https://www.gov.uk/government/statistical-data-sets/irregular-migration-detailed-dataset-and-summary-tables';
const URL_UKRAINE = 'https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables';

// Pick a freshness date from a data-global's *_META. Prefers the upstream-
// publication date the source actually advertises (`latest_date`,
// `latestDataPoint`, `updatedAt`), falling back to the pipeline's own run
// timestamp (`generatedAt`). Rows whose builder does not yet exist pass
// null and show an em-dash.
function metaDate(meta) {
  if (!meta) return '—';
  const raw = meta.latest_date || meta.latestDataPoint || meta.asOf || meta.updatedAt || meta.generatedAt;
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d)) return String(raw);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${dd} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
const W = (typeof window !== 'undefined') ? window : {};

// Next scheduled release for each publication. Quarterly ISS tables land on
// the second Thursday of Feb/May/Aug/Nov; small-boats ODS is weekly (each
// Tuesday); last-7-days is updated daily. Irregular migration follows the
// same quarterly cadence as ISS. Monthly / unknown cadences fall back to '—'.
function secondThursday(year, monthIdx /* 0-based */) {
  const d = new Date(Date.UTC(year, monthIdx, 1));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const firstThu = 1 + ((4 - day + 7) % 7);
  return new Date(Date.UTC(year, monthIdx, firstThu + 7));
}
function nextQuarterlyISS() {
  const now = new Date();
  const months = [1, 4, 7, 10]; // Feb, May, Aug, Nov
  for (let add = 0; add < 12; add++) {
    const y = now.getUTCFullYear() + Math.floor((now.getUTCMonth() + add) / 12);
    const m = (now.getUTCMonth() + add) % 12;
    if (!months.includes(m)) continue;
    const t = secondThursday(y, m);
    if (t > now) return t;
  }
  return null;
}
function nextTuesday() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const off = (2 - d.getUTCDay() + 7) % 7 || 7;
  return new Date(d.getTime() + off * 86400000);
}
function fmtUTC(d) {
  if (!d) return '—';
  return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
const NEXT_RELEASE = {
  quarterlyISS: () => fmtUTC(nextQuarterlyISS()),
  weeklyBoats:  () => fmtUTC(nextTuesday()),
  daily:        () => 'Daily',
  unknown:      () => '—',
};

// Backlog of pipeline + editorial work that hasn't shipped yet. Surfaced on
// the Updates page as a "Coming soon" block. Keep entries short — one line
// of plain English the reader can understand without the code context.
const PLANNED_UPDATES = [
  { area: 'Pipeline', text: 'Ukraine and BN(O) resettlement schemes — separate fetchers for the two publications outside the main ISS set.' },
  { area: 'Pipeline', text: 'Appeal outcomes — will replace the cohort-delta proxy in the Flow Sankey once the Home Office republishes the data.' },
  { area: 'Atlas',    text: 'Child applicants by nationality — new Atlas layer once the Home Office publishes Under-18 applicants by origin country.' },
  { area: 'Atlas',    text: 'Resettlement by origin country — new Atlas layer once Res_D02 gains a nationality breakdown.' },
];

const DATASETS = [
  // Asylum claims
  { code: 'Asy_D01', name: 'Asylum applications, by nationality',        rows: '1,248,220', updated: metaDate(W.NAT_FULL_META),         nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Asy_D02', name: 'Initial decisions on asylum applications',    rows: '884,014',   updated: metaDate(W.DECISIONS_META),        nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Asy_D03', name: 'Age and sex of asylum applicants',            rows: '492,100',   updated: metaDate(W.SEX_AGE_META),          nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Asy_D04', name: 'Outcome analysis of asylum claims (cohort)',  rows: '~18,700',   updated: metaDate(W.OUTCOME_COHORT_META),   nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Asy_D07', name: 'Asylum seekers awaiting a decision (backlog)',rows: '~186,400',  updated: metaDate(W.BACKLOG_META),          nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  // Support & accommodation
  { code: 'Asy_D05', name: 'Support provided to asylum seekers',          rows: '412,200',   updated: metaDate(W.SUPPORT_REGIONS_META),  nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Asy_D09', name: 'Asylum seekers in receipt of support (hotels)',rows: '~88,200',  updated: metaDate(W.HOTELS_META),           nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Asy_D11', name: 'Asylum support by local authority',           rows: '~39,600',   updated: metaDate(W.SUPPORT_REGIONS_META),  nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  // Age disputes
  { code: 'Age_D01', name: 'Age disputes by nationality',                 rows: '~4,700',    updated: metaDate(W.AGE_DISPUTES_META),     nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Annual',    landingUrl: URL_ISS_TABLES },
  // Small boats crossings
  { code: 'SB_01',  name: 'Small boats: daily crossings (2018–present)', rows: '~2,920',    updated: metaDate(W.BOATS_META),            nextRelease: NEXT_RELEASE.weeklyBoats(),  freq: 'Weekly',    landingUrl: URL_SMALL_BOATS },
  { code: 'SB_02',  name: 'Small boats: last 7 days (provisional)',      rows: '7',          updated: metaDate(W.BOATS_PROVISIONAL_META),nextRelease: NEXT_RELEASE.daily(),        freq: 'Daily',     landingUrl: URL_SMALL_BOATS_7 },
  // Irregular migration — small-boat arrivals by nationality (Irr_02b).
  { code: 'Irr_02b', name: 'Irregular migration — small-boat arrivals by nationality', rows: '~200',      updated: metaDate(W.IRR_BOATS_META),        nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_IRR_MIGRATION },
  // Resettlement
  { code: 'Res_D01', name: 'Refugee resettlement and family schemes',     rows: '94,820',    updated: metaDate(W.RESETTLEMENT_META),     nextRelease: NEXT_RELEASE.quarterlyISS(), freq: 'Quarterly', landingUrl: URL_ISS_TABLES },
  { code: 'Res_D02', name: 'Ukraine schemes visa statistics',             rows: '318,400',   updated: metaDate(null),                    nextRelease: NEXT_RELEASE.unknown(),      freq: 'Monthly',   landingUrl: URL_UKRAINE },
];

// Inverted provenance index — which charts in the product consume each
// dataset. Maintained manually because the `source="Home Office · CODE"`
// prop on each chart is free text; keeping the list here keeps it
// authoritative and lets the Datasets page answer "if this source
// breaks, what breaks with it?" at a glance. When a new chart is added,
// append its (view, chart) row under the matching code.
const DATASET_CONSUMERS = {
  Asy_D01: [
    { view: 'Dashboard', chart: 'Fig. 01 · Asylum applications' },
    { view: 'Dashboard', chart: 'Fig. 03 · Top five nationalities' },
    { view: 'Dashboard', chart: 'Fig. 03a · All nationalities' },
    { view: 'Atlas',     chart: 'Choropleth · Applicants' },
    { view: 'Atlas',     chart: 'Country panel · Applicants + quarterly trend' },
    { view: 'Flow',      chart: 'Nationality → Initial decision (sankey)' },
    { view: 'Stories',   chart: 'Hero line · applications vs small-boat arrivals' },
    { view: 'Build',     chart: 'Applications · Top-5 nationalities · Nationalities (pick any)' },
  ],
  Asy_D02: [
    { view: 'Dashboard', chart: 'Fig. 04 · Initial decisions + Grant-rate ring' },
    { view: 'Dashboard', chart: 'Fig. 05a · Grant rate by nationality · small multiples' },
    { view: 'Atlas',     chart: 'Country panel · Grant-rate trend' },
    { view: 'Flow',      chart: 'Initial decision split (sankey col 2)' },
    { view: 'Build',     chart: 'Grant rate by nationality' },
  ],
  Asy_D03: [
    { view: 'Dashboard', chart: 'Age / sex statistics block' },
    { view: 'Build',     chart: 'Sex and age of applicants (multi-line / stacked)' },
  ],
  Asy_D04: [
    { view: 'Flow', chart: 'Cohort outcome ribbon' },
    { view: 'Flow', chart: 'Backlog waterfall (annual)' },
    { view: 'Flow', chart: 'Three-column sankey (cohort split)' },
    // Charts render a pending-data fallback until OUTCOME_COHORT_ANNUAL is populated (see BACKLOG.md).
  ],
  Asy_D07: [
    { view: 'Dashboard', chart: 'Fig. 05 · Pending cases (backlog)' },
    { view: 'Dashboard', chart: 'Hero statistic · Backlog' },
    { view: 'Build',     chart: 'Backlog (pending)' },
  ],
  Asy_D05: [
    { view: 'Dashboard', chart: 'Support regions statistics' },
  ],
  Asy_D09: [
    { view: 'Dashboard', chart: 'Hotels statistics' },
    { view: 'Build',     chart: 'People in hotels (asylum accommodation)' },
  ],
  Asy_D11: [
    { view: 'Dashboard', chart: 'Support regions map' },
  ],
  Age_D01: [
    { view: 'Atlas', chart: 'Country panel · Age disputes raised' },
    { view: 'Atlas', chart: 'Choropleth · Age disputes' },
  ],
  SB_01: [
    { view: 'Dashboard', chart: 'Fig. 02 · YoY cumulative arrivals' },
    { view: 'Dashboard', chart: 'Fig. 02b · Seasonal heat-map' },
    { view: 'Dashboard', chart: 'Hero statistic · This week arrivals, YTD arrivals' },
    { view: 'Stories',   chart: 'This-week dateline strip' },
    { view: 'Build',     chart: 'Small-boat arrivals (daily / weekly / monthly / annual)' },
  ],
  SB_02: [
    { view: 'Dashboard', chart: 'Provisional last-7-days strip' },
    { view: 'Dashboard', chart: 'Fig. 04/04a · Monthly interceptions / preventions' },
    { view: 'Build',     chart: 'Interceptions · Preventions' },
  ],
  Irr_02b: [
    { view: 'Flow', chart: 'Boats by nationality palette (top-5 + Other)' },
  ],
  Res_D01: [
    { view: 'Build', chart: 'Resettlement arrivals by scheme' },
  ],
  Res_D02: [
    // Ukraine schemes not yet surfaced in any chart.
  ],
};

// Region-of-origin lookup for NAT_FULL. Egypt counted as Middle East per editorial call;
// Afghanistan counted as Central Asia to match the Home Office's own regional
// profiling (it groups Afghanistan with the post-Soviet 'stans, not with South
// Asia). Unlisted names fall through to "Other / Unclassified".
const REGION_MAP = {
  // Middle East
  'Iran':'Middle East','Iraq':'Middle East','Syria':'Middle East','Yemen':'Middle East',
  'Turkey':'Middle East','Egypt':'Middle East','Saudi Arabia':'Middle East','Kuwait':'Middle East',
  'Palestine':'Middle East','Lebanon':'Middle East','Jordan':'Middle East','Israel':'Middle East',
  'Bahrain':'Middle East','Oman':'Middle East','Qatar':'Middle East','United Arab Emirates':'Middle East',
  // North Africa
  'Libya':'North Africa','Morocco':'North Africa','Algeria':'North Africa','Tunisia':'North Africa',
  'Western Sahara':'North Africa','Mauritania':'North Africa',
  // East Africa / Horn of Africa
  'Eritrea':'East Africa','Somalia':'East Africa','Ethiopia':'East Africa','Sudan':'East Africa',
  'South Sudan':'East Africa','Djibouti':'East Africa','Kenya':'East Africa','Uganda':'East Africa',
  'Tanzania':'East Africa','Rwanda':'East Africa','Burundi':'East Africa','Comoros':'East Africa',
  // West Africa
  'Nigeria':'West Africa','Ghana':'West Africa','Senegal':'West Africa','Mali':'West Africa',
  'Ivory Coast':'West Africa','Cameroon':'West Africa','Sierra Leone':'West Africa',
  'Gambia, The':'West Africa','Guinea':'West Africa','Guinea-Bissau':'West Africa',
  'Niger':'West Africa','Burkina Faso':'West Africa','Togo':'West Africa','Benin':'West Africa',
  'Liberia':'West Africa','Cape Verde':'West Africa',
  // Central / Southern Africa
  'Congo (Democratic Republic)':'Central & Southern Africa','Congo':'Central & Southern Africa',
  'Chad':'Central & Southern Africa','Zimbabwe':'Central & Southern Africa',
  'Mozambique':'Central & Southern Africa','Malawi':'Central & Southern Africa',
  'Zambia':'Central & Southern Africa','Angola':'Central & Southern Africa',
  'Botswana':'Central & Southern Africa','Namibia':'Central & Southern Africa',
  'Mauritius':'Central & Southern Africa','Eswatini':'Central & Southern Africa',
  'Gabon':'Central & Southern Africa','Central African Republic':'Central & Southern Africa',
  'Lesotho':'Central & Southern Africa','Equatorial Guinea':'Central & Southern Africa',
  'South Africa':'Central & Southern Africa','Seychelles':'Central & Southern Africa',
  'Madagascar':'Central & Southern Africa',
  // South Asia
  'Pakistan':'South Asia','India':'South Asia','Bangladesh':'South Asia',
  'Sri Lanka':'South Asia','Nepal':'South Asia','Bhutan':'South Asia','Maldives':'South Asia',
  // South East Asia
  'Vietnam':'South East Asia','Myanmar (Burma)':'South East Asia','Indonesia':'South East Asia',
  'Philippines':'South East Asia','Thailand':'South East Asia','Malaysia':'South East Asia',
  'East Timor':'South East Asia','Cambodia':'South East Asia','Laos':'South East Asia',
  'Singapore':'South East Asia','Brunei':'South East Asia','Papua New Guinea':'South East Asia',
  // East Asia & Pacific
  'China':'East Asia & Pacific','Hong Kong':'East Asia & Pacific','Taiwan':'East Asia & Pacific',
  'Japan':'East Asia & Pacific','South Korea':'East Asia & Pacific','North Korea':'East Asia & Pacific',
  'Mongolia':'East Asia & Pacific','Fiji':'East Asia & Pacific','Australia':'East Asia & Pacific',
  'New Zealand':'East Asia & Pacific','Tonga':'East Asia & Pacific','Vanuatu':'East Asia & Pacific',
  // Central Asia — matches Home Office grouping (includes Afghanistan).
  'Afghanistan':'Central Asia','Kazakhstan':'Central Asia','Uzbekistan':'Central Asia',
  'Tajikistan':'Central Asia','Kyrgyzstan':'Central Asia','Turkmenistan':'Central Asia',
  // Caucasus — kept separate from Central Asia.
  'Azerbaijan':'Caucasus','Armenia':'Caucasus','Georgia':'Caucasus',
  // Europe
  'Albania':'Europe','Ukraine':'Europe','Russia':'Europe','Kosovo':'Europe','Moldova':'Europe',
  'Belarus':'Europe','Romania':'Europe','Poland':'Europe','Bulgaria':'Europe','Hungary':'Europe',
  'Czechia':'Europe','Slovakia':'Europe','Lithuania':'Europe','Latvia':'Europe','Portugal':'Europe',
  'Spain':'Europe','Italy':'Europe','France':'Europe','Greece':'Europe','Cyprus':'Europe',
  'Germany':'Europe','Netherlands':'Europe','Sweden':'Europe','Norway':'Europe','Finland':'Europe',
  'Denmark':'Europe','Ireland':'Europe','Austria':'Europe','Belgium':'Europe','Croatia':'Europe',
  'North Macedonia':'Europe','Former Yugoslavia':'Europe','Cyprus (Northern part of)':'Europe',
  // Americas
  'Colombia':'Americas','Brazil':'Americas','Honduras':'Americas','Venezuela':'Americas',
  'Peru':'Americas','Bolivia':'Americas','Ecuador':'Americas','Mexico':'Americas',
  'Nicaragua':'Americas','El Salvador':'Americas','Guatemala':'Americas','Cuba':'Americas',
  'Panama':'Americas','Argentina':'Americas','Chile':'Americas','Paraguay':'Americas',
  'Costa Rica':'Americas','Belize':'Americas','Dominican Republic':'Americas','Haiti':'Americas',
  'Jamaica':'Americas','Trinidad and Tobago':'Americas','Barbados':'Americas','Dominica':'Americas',
  'St Lucia':'Americas','St Kitts and Nevis':'Americas','St Vincent and the Grenadines':'Americas',
  'Grenada':'Americas','Antigua and Barbuda':'Americas','Bahamas, The':'Americas','Guyana':'Americas',
  'United States':'Americas','Canada':'Americas',
};

function groupNatByRegion(rows) {
  const totals = {};
  for (const r of rows) {
    const region = REGION_MAP[r.name] ?? 'Other / Unclassified';
    totals[region] = (totals[region] || 0) + r.v;
  }
  return Object.entries(totals)
    .map(([name, v]) => ({ name, v }))
    .sort((a, b) => b.v - a.v);
}

Object.assign(window, {
  ASYLUM_ANNUAL, DATA_MAX_YEAR, TOP_NATIONALITIES, NAT_SERIES, DECISIONS_2024,
  BACKLOG, RESETTLEMENT, REGIONS, STORIES, DATASETS, DATASET_CONSUMERS,
  PLANNED_UPDATES, REGION_MAP, groupNatByRegion,
});
