// data.jsx — shared data for the Home Office Data Explorer

// UK asylum applications 2014–latest (main applicants, annual).
// 2025 total is sum(NAT_FULL.v) for NAT_FULL_META.year=2025; 2025 boats
// is BOATS_ANNUAL where y=2025. Extend by hand when the next complete
// year lands in both globals.
const ASYLUM_ANNUAL = [
  { y: 2014, v: 24914, boats: 0 },
  { y: 2015, v: 32414, boats: 0 },
  { y: 2016, v: 30747, boats: 0 },
  { y: 2017, v: 26547, boats: 0 },
  { y: 2018, v: 29504, boats: 299 },
  { y: 2019, v: 35737, boats: 1843 },
  { y: 2020, v: 29815, boats: 8462 },
  { y: 2021, v: 48540, boats: 28526 },
  { y: 2022, v: 74751, boats: 45755 },
  { y: 2023, v: 84425, boats: 29437 },
  { y: 2024, v: 80782, boats: 36816 },
  { y: 2025, v: 82140, boats: 41472 },
];

// Max year reachable from the data globals: max of ASYLUM_ANNUAL and
// BOATS_ANNUAL. Drives the slider upper bound and default range end so
// views don't have to hardcode the latest complete year.
const DATA_MAX_YEAR = (() => {
  const boats = (typeof window !== 'undefined' && Array.isArray(window.BOATS_ANNUAL))
    ? window.BOATS_ANNUAL.map(r => r.y) : [];
  return Math.max(...ASYLUM_ANNUAL.map(r => r.y), ...boats);
})();

// Top nationalities 2024 (applications, main applicants)
const TOP_NATIONALITIES = [
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

// Top 5 nationality series 2020–2024
const NAT_SERIES = {
  years: [2020, 2021, 2022, 2023, 2024],
  series: [
    { name: 'Pakistan',    data: [1569, 2337, 4922, 7521, 7850] },
    { name: 'Afghanistan', data: [2772, 8633, 9577, 6625, 5928] },
    { name: 'Iran',        data: [4339, 5974, 8586, 5820, 4310] },
    { name: 'Eritrea',     data: [2183, 2834, 5000, 4462, 3512] },
    { name: 'Syria',       data: [1270, 2219, 3107, 2505, 2184] },
  ],
};

// Initial decisions 2024
const DECISIONS_2024 = [
  { label: 'Granted asylum', v: 34200, color: 'var(--accent-2)' },
  { label: 'Granted humanitarian / other', v: 4800, color: 'var(--accent-gold)' },
  { label: 'Refused',        v: 27800, color: 'var(--accent-warn)' },
  { label: 'Withdrawn',      v: 5600, color: 'var(--muted-2)' },
];

// Backlog 2018–2024 (pending initial decision)
const BACKLOG = [
  { y: 2018, v: 27800 },
  { y: 2019, v: 39100 },
  { y: 2020, v: 52700 },
  { y: 2021, v: 76800 },
  { y: 2022, v: 109600 },
  { y: 2023, v: 132200 },
  { y: 2024, v: 91200 },
];

// Resettlement schemes 2024
const RESETTLEMENT = [
  { name: 'ACRS (Afghan)',      v: 4820 },
  { name: 'ARAP (Afghan)',       v: 3140 },
  { name: 'Ukraine family',      v: 2260 },
  { name: 'UKRS (UNHCR)',        v: 1680 },
  { name: 'Community sponsorship', v: 510 },
];

// UK regions — applications 2024
const REGIONS = [
  { name: 'London',              v: 14200 },
  { name: 'North West',          v: 11400 },
  { name: 'Yorkshire & Humber',  v: 9600 },
  { name: 'West Midlands',        v: 9100 },
  { name: 'South East',           v: 8200 },
  { name: 'East of England',      v: 6800 },
  { name: 'North East',           v: 6100 },
  { name: 'East Midlands',        v: 5700 },
  { name: 'South West',           v: 4400 },
  { name: 'Scotland',             v: 3100 },
  { name: 'Wales',                v: 1500 },
  { name: 'Northern Ireland',     v: 680  },
];

// Stories on the index page
const STORIES = [
  {
    id: 'long-tail',
    kicker: 'Applications',
    title: 'The long tail of the 2022 surge',
    dek: 'UK asylum applications peaked at 84,425 in 2023 — the highest since the modern series began — before easing marginally in 2024.',
    author: 'Data Team',
    date: '14 April 2026',
    reading: '8 min',
    tag: 'Featured',
    hero: 'trend',
  },
  {
    id: 'pakistan',
    kicker: 'Nationality',
    title: 'Pakistan overtakes Afghanistan',
    dek: 'For the first time in the post-2020 series, Pakistani nationals filed more applications than any other group in 2024.',
    date: '02 April 2026',
    reading: '5 min',
    hero: 'bars',
  },
  {
    id: 'backlog',
    kicker: 'Decisions',
    title: 'The backlog, unwound',
    dek: 'The queue of undecided cases has fallen from 132,000 to 91,200 in a year — but average wait times remain historically high.',
    date: '28 March 2026',
    reading: '6 min',
    hero: 'backlog',
  },
  {
    id: 'boats',
    kicker: 'Arrivals',
    title: 'Small boats, seven years on',
    dek: 'Channel crossings by small boat have passed 200,000 since 2018. How the composition of arrivals has changed.',
    date: '21 March 2026',
    reading: '7 min',
    hero: 'area',
  },
  {
    id: 'grant-rate',
    kicker: 'Outcomes',
    title: 'Why the grant rate doubled',
    dek: 'The share of claims granted at initial decision rose from 24% in 2019 to 47% in 2024. A closer look at what changed.',
    date: '12 March 2026',
    reading: '4 min',
    hero: 'ring',
  },
  {
    id: 'regions',
    kicker: 'Geography',
    title: 'Where claimants are housed',
    dek: 'Dispersal accommodation is concentrated in just eleven local authorities — together hosting nearly a third of all asylum seekers.',
    date: '04 March 2026',
    reading: '5 min',
    hero: 'map',
  },
];

// Datasets shown on the browse list
const DATASETS = [
  // Asylum claims
  { code: 'ASY_D01', name: 'Asylum applications, by nationality',        rows: '1,248,220', updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D02', name: 'Initial decisions on asylum applications',    rows: '884,014',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D03', name: 'Age and sex of asylum applicants',            rows: '492,100',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D04', name: 'Appeals outcomes',                            rows: '221,400',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D07', name: 'Asylum seekers awaiting a decision (backlog)',rows: '~186,400',  updated: '12 Apr 2026', freq: 'Quarterly' },
  // Support & accommodation
  { code: 'ASY_D05', name: 'Support provided to asylum seekers',          rows: '412,200',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D09', name: 'Asylum seekers in receipt of support (hotels)',rows: '~88,200',  updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D11', name: 'Asylum support by local authority',           rows: '~39,600',   updated: '12 Apr 2026', freq: 'Quarterly' },
  // Age disputes
  { code: 'AGE_D01', name: 'Age disputes by nationality',                 rows: '~4,700',    updated: '12 Apr 2026', freq: 'Annual'    },
  // Small boats crossings
  { code: 'SB_D01',  name: 'Small boats: daily crossings (2018–present)', rows: '~2,920',    updated: '17 Apr 2026', freq: 'Weekly'    },
  { code: 'SB_D02',  name: 'Small boats: last 7 days (provisional)',      rows: '7',          updated: '20 Apr 2026', freq: 'Daily'     },
  // Irregular migration (non-boat)
  { code: 'IRR_D01', name: 'Irregular migration to the UK',               rows: '618,900',   updated: '05 Apr 2026', freq: 'Monthly'   },
  // Resettlement
  { code: 'RES_D01', name: 'Refugee resettlement and family schemes',     rows: '94,820',    updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'RES_D02', name: 'Ukraine schemes visa statistics',             rows: '318,400',   updated: '12 Apr 2026', freq: 'Monthly'   },
];

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
  BACKLOG, RESETTLEMENT, REGIONS, STORIES, DATASETS,
  REGION_MAP, groupNatByRegion,
});
