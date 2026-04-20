// data.jsx — shared data for the Home Office Data Explorer

// UK asylum applications 2014–2024 (main applicants, annual)
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
];

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
  { code: 'ASY_D01', name: 'Asylum applications, by nationality',    rows: '1,248,220', updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D02', name: 'Initial decisions on asylum applications', rows: '884,014',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D03', name: 'Age and sex of asylum applicants',         rows: '492,100',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'ASY_D04', name: 'Appeals outcomes',                         rows: '221,400',   updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'IRR_D01', name: 'Irregular migration to the UK',            rows: '618,900',   updated: '05 Apr 2026', freq: 'Monthly'   },
  { code: 'RES_D01', name: 'Refugee resettlement and family schemes',  rows: '94,820',    updated: '12 Apr 2026', freq: 'Quarterly' },
  { code: 'RES_D02', name: 'Ukraine schemes visa statistics',          rows: '318,400',   updated: '12 Apr 2026', freq: 'Monthly'   },
  { code: 'ASY_D05', name: 'Support provided to asylum seekers',       rows: '412,200',   updated: '12 Apr 2026', freq: 'Quarterly' },
];

Object.assign(window, {
  ASYLUM_ANNUAL, TOP_NATIONALITIES, NAT_SERIES, DECISIONS_2024,
  BACKLOG, RESETTLEMENT, REGIONS, STORIES, DATASETS,
});
