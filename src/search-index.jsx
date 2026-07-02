// search-index.jsx — natural-language search over stories, charts,
// datasets, glossary terms and views.
//
// Everything runs in the browser: a hand-curated synonym map turns everyday
// words ("hotels", "children", "deported", "waiting") into the canonical
// keywords that index entries carry, and a small token scorer ranks matches.
// No library, no server — an LLM "ask a question" mode is deliberately out
// of scope (see PLANNED_UPDATES): a static single-file app has nowhere safe
// to keep an API key.
//
// Exposed globals: SEARCH_INDEX (built at load), searchAll(q, limit).

// ── Tokeniser ────────────────────────────────────────────────
// Lowercase, split on non-alphanumerics, light stemming (plurals / -ing)
// so "crossings" matches "crossing" and "removals" matches "removal".
const _stemLite = t => t.length > 3
  ? t.replace(/ies$/, 'y').replace(/(e?s)$/, '').replace(/ing$/, '')
  : t;
const _tok = s => String(s || '').toLowerCase().split(/[^a-z0-9]+/)
  .filter(t => t.length > 1).map(_stemLite);

// ── Synonyms ─────────────────────────────────────────────────
// Everyday word (stemmed) → canonical keywords used by index entries.
// Add to this map when a real query misses; it is the whole "natural
// language" layer.
const SEARCH_SYNONYMS = {
  hotel: ['hotels'],
  kid: ['children', 'age'], child: ['children', 'age'], children: ['children', 'age'],
  minor: ['children', 'age'], unaccompanied: ['children', 'age'], young: ['children', 'age'],
  deport: ['returns'], deported: ['returns'], deportation: ['returns'],
  removal: ['returns'], removed: ['returns'], remove: ['returns'], expel: ['returns'],
  wait: ['backlog'], queue: ['backlog'], delay: ['backlog'], pend: ['backlog'],
  slow: ['backlog'], long: ['backlog'],
  dinghy: ['boats'], dinghi: ['boats'], boat: ['boats'], channel: ['boats'],
  cross: ['boats'], arrival: ['boats'],
  drown: ['deaths'], dead: ['deaths'], death: ['deaths'], died: ['deaths'], die: ['deaths'],
  missing: ['deaths'],
  stopped: ['preventions'], stop: ['preventions'], intercept: ['preventions'],
  intercepted: ['preventions'], prevent: ['preventions'], prevented: ['preventions'],
  french: ['france', 'preventions'], calai: ['france', 'preventions'],
  succes: ['grant'], succeed: ['grant'], approved: ['grant'], approve: ['grant'],
  accepted: ['grant'], win: ['grant'], won: ['grant'],
  reject: ['decisions', 'refused'], rejected: ['decisions', 'refused'],
  refusal: ['decisions', 'refused'], fail: ['decisions', 'refused'],
  appeal: ['appeals', 'backlog'], tribunal: ['appeals'], court: ['appeals'],
  money: ['support'], benefit: ['support'], housing: ['support', 'hotels'],
  house: ['support'], housed: ['support'], accommodation: ['support', 'hotels'],
  live: ['support', 'regions'], living: ['support', 'regions'],
  council: ['support', 'regions'], area: ['regions'], where: ['regions', 'atlas'],
  country: ['nationality', 'atlas'], countri: ['nationality', 'atlas'],
  origin: ['nationality', 'atlas'], from: ['nationality'],
  woman: ['age', 'sex'], women: ['age', 'sex'], men: ['age', 'sex'],
  man: ['age', 'sex'], female: ['age', 'sex'], male: ['age', 'sex'],
  family: ['age', 'sex'], famili: ['age', 'sex'],
  map: ['atlas'], world: ['atlas'],
  law: ['policy'], act: ['policy'], rule: ['policy'], change: ['policy'],
  government: ['policy'],
  scheme: ['resettlement'], safe: ['resettlement'], legal: ['resettlement'],
  route: ['resettlement', 'flow'],
  claim: ['applications'], apply: ['applications'], applied: ['applications'],
  application: ['applications'],
  number: ['statistics'], stat: ['statistics'], figure: ['statistics'],
  data: ['datasets'], download: ['datasets'], source: ['datasets'],
  smuggler: ['policy', 'boats'], gang: ['policy', 'boats'],
  ukraine: ['ukraine'], ukrainian: ['ukraine'],
};

// ── Dashboard figure registry ────────────────────────────────
// One row per DashFrame. `anchor` matches the id DashFrame derives from its
// `number` prop; deep-links land via route {name:'dashboard', anchor}.
const DASH_FIGURES = [
  { anchor: 'fig-01',  title: 'Small-boat arrivals · year-to-date comparison', keywords: ['boats', 'cumulative', 'ytd'] },
  { anchor: 'fig-02',  title: 'Asylum applications by year',                   keywords: ['applications', 'trend', 'annual'] },
  { anchor: 'fig-03',  title: 'Arrivals by month · seasonal pattern',          keywords: ['boats', 'seasonal', 'monthly', 'heatmap'] },
  { anchor: 'fig-03a', title: 'Channel deaths · recorded by IOM',              keywords: ['deaths', 'iom'] },
  { anchor: 'fig-04',  title: 'Top-five nationalities · small-boat arrivals',  keywords: ['boats', 'nationality'] },
  { anchor: 'fig-05',  title: 'All nationalities · applications table',        keywords: ['nationality', 'applications'] },
  { anchor: 'fig-06',  title: 'Interception rate · attempts stopped in France',keywords: ['preventions', 'france', 'attempts'] },
  { anchor: 'fig-07',  title: 'Initial decisions · outcomes split',            keywords: ['decisions', 'grant', 'refused'] },
  { anchor: 'fig-08',  title: 'Pending cases (backlog)',                       keywords: ['backlog', 'pending'] },
  { anchor: 'fig-08a', title: 'Backlog age profile · how long people wait',    keywords: ['backlog', 'duration'] },
  { anchor: 'fig-09',  title: 'Grant rate by nationality · small multiples',   keywords: ['grant', 'nationality', 'rate'] },
  { anchor: 'fig-10',  title: 'Applicants by region of origin · map',          keywords: ['nationality', 'regions', 'atlas'] },
  { anchor: 'fig-11',  title: 'Applicants by region of origin · table',        keywords: ['nationality', 'regions'] },
  { anchor: 'fig-12',  title: 'Supported asylum seekers by UK region',         keywords: ['support', 'regions', 'dispersal'] },
  { anchor: 'fig-13',  title: 'Support by type · Section 95 / 98 / 4',         keywords: ['support', 'section'] },
];

// Hand-curated keywords per story / dataset (canonical vocabulary — the
// synonym map above routes everyday words to these).
const _STORY_KEYWORDS = {
  'long-tail':            ['applications', 'trend', 'surge', 'statistics'],
  'pakistan':             ['nationality', 'eritrea', 'pakistan', 'afghanistan', 'iran', 'grant'],
  'backlog':              ['backlog', 'appeals', 'decisions', 'statistics'],
  'boats':                ['boats', 'seasonal', 'deaths', 'preventions', 'statistics'],
  'grant-rate':           ['grant', 'decisions', 'refused', 'appeals', 'rate'],
  'regions':              ['support', 'hotels', 'regions', 'dispersal'],
  'how-the-system-works': ['explainer', 'applications', 'decisions', 'appeals', 'returns', 'resettlement', 'policy'],
  'policy-2026':          ['explainer', 'policy', 'france', 'hotels', 'boats', 'backlog'],
};
const _DATASET_KEYWORDS = {
  Asy_D01: ['applications', 'nationality'],
  Asy_D02: ['decisions', 'grant', 'refused'],
  Asy_D03: ['age', 'sex', 'children'],
  Asy_D04: ['decisions', 'appeals', 'returns', 'cohort'],
  Asy_D07: ['backlog', 'pending'],
  Asy_D05: ['support', 'regions'],
  Asy_D09: ['hotels', 'support'],
  Asy_D11: ['support', 'regions', 'councils'],
  Age_D01: ['age', 'children', 'assessments'],
  SB_01:   ['boats', 'daily', 'statistics'],
  SB_02:   ['boats', 'provisional', 'week'],
  Irr_02b: ['boats', 'nationality'],
  Res_D01: ['resettlement', 'schemes'],
  Res_D02: ['ukraine', 'resettlement'],
};

// ── Index build (once, at load) ──────────────────────────────
function _buildSearchIndex() {
  const entries = [];
  const add = (group, title, desc, keywords, go, inline) => entries.push({
    group, title, desc: desc || '', keywords: keywords || [], go: go || null, inline: inline || null,
    _title: _tok(title), _desc: _tok(desc), _kw: (keywords || []).map(_stemLite),
  });

  for (const s of (typeof STORIES !== 'undefined' ? STORIES : [])) {
    add('Stories', s.title, s.dek, [...(_STORY_KEYWORDS[s.id] || []), s.kicker.toLowerCase()], { name: 'story', id: s.id });
  }
  for (const f of DASH_FIGURES) {
    add('Charts', f.title, '', f.keywords, { name: 'dashboard', anchor: f.anchor });
  }
  for (const d of (typeof DATASETS !== 'undefined' ? DATASETS : [])) {
    const note = (typeof DATASET_NOTES !== 'undefined' && DATASET_NOTES[d.code]) || '';
    add('Datasets', d.name, `${d.code} · ${note}`, _DATASET_KEYWORDS[d.code] || [], { name: 'datasets', id: d.code });
  }
  const gloss = (typeof window !== 'undefined' && window.GLOSSARY) || {};
  for (const [term, entry] of Object.entries(gloss)) {
    add('Glossary', term.charAt(0).toUpperCase() + term.slice(1), entry.body, [term], null, entry.body);
  }
  add('Views', 'Dashboard', 'Live statistics and charts for the whole system.', ['dashboard', 'statistics', 'charts'], { name: 'dashboard' });
  add('Views', 'Atlas', 'World map — applicants, grant rates, returns and age assessments by country of origin.', ['atlas', 'nationality'], { name: 'atlas' });
  add('Views', 'Flow', 'How people enter the system and where their claims end up.', ['flow', 'decisions', 'outcomes'], { name: 'flow' });
  add('Views', 'Build a chart', 'Pick any dataset and make your own chart.', ['build', 'charts', 'datasets'], { name: 'build' });
  add('Views', 'Datasets', 'Every dataset behind the site, with plain-English descriptions.', ['datasets'], { name: 'datasets' });
  add('Views', 'Updates', 'Data refreshes, editorial changes, and what is coming next.', ['updates', 'changelog'], { name: 'updates' });
  return entries;
}
const SEARCH_INDEX = _buildSearchIndex();

// ── Scorer ───────────────────────────────────────────────────
// Per query token: canonical-keyword hit 4 · title hit 3 · title prefix 2
// (last token only, for search-as-you-type) · description hit 1. Synonym
// expansions score like keyword hits. ×1.5 when every token matched.
function _scoreEntry(entry, qTokens, lastRaw) {
  let score = 0, matched = 0;
  for (const t of qTokens) {
    let hit = 0;
    const syn = SEARCH_SYNONYMS[t] || [];
    if (entry._kw.includes(t)) hit = Math.max(hit, 4);
    if (syn.some(s => entry._kw.includes(_stemLite(s)))) hit = Math.max(hit, 4);
    if (entry._title.includes(t)) hit = Math.max(hit, 3);
    if (t === lastRaw && entry._title.some(w => w.startsWith(t))) hit = Math.max(hit, 2);
    if (entry._desc.includes(t)) hit = Math.max(hit, 1);
    if (syn.some(s => entry._desc.includes(_stemLite(s)))) hit = Math.max(hit, 1);
    if (hit) matched++;
    score += hit;
  }
  if (qTokens.length > 1 && matched === qTokens.length) score *= 1.5;
  return score;
}

// Returns [{group, items: [entry…]}] in a fixed group order, top `limit`
// results overall. Empty query → a starter mix.
function searchAll(q, limit = 12) {
  const GROUP_ORDER = ['Stories', 'Charts', 'Datasets', 'Glossary', 'Views'];
  let picked;
  const qTokens = _tok(q);
  if (!qTokens.length) {
    picked = [
      ...SEARCH_INDEX.filter(e => e.group === 'Stories').slice(0, 4),
      ...SEARCH_INDEX.filter(e => e.group === 'Charts').slice(0, 2),
      ...SEARCH_INDEX.filter(e => e.group === 'Datasets').slice(0, 3),
    ];
  } else {
    const lastRaw = qTokens[qTokens.length - 1];
    picked = SEARCH_INDEX
      .map(e => ({ e, s: _scoreEntry(e, qTokens, lastRaw) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.e);
  }
  return GROUP_ORDER
    .map(group => ({ group, items: picked.filter(e => e.group === group) }))
    .filter(g => g.items.length);
}

Object.assign(window, { SEARCH_INDEX, searchAll, SEARCH_SYNONYMS, DASH_FIGURES });
