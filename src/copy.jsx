// copy.jsx — editorial insight copy, in one editable place.
//
// Three exports:
//   INSIGHTS      — registry of short explanatory notes keyed by surface id
//                   ('index.glance.backlog', 'dash.fig01', 'atlas.metric.…').
//                   Each entry is a function (ctx?) => node|string|null.
//                   Figures are computed from window globals at render time —
//                   never hand-typed — so the copy stays true as data updates.
//                   Entries return null when their backing global is missing;
//                   callers render nothing in that case.
//   DATASET_NOTES — plain-English description per dataset code (what it
//                   counts, what it leaves out, cadence quirks). Rendered on
//                   the Datasets page and reused by the search index.
//   InsightNote   — small presentational block for surfaces that don't
//                   already have a takeaway slot. Mirrors .dash-takeaway.
//
// House rules for anything added here:
//   * Neutral, figures-first. No editorial framing, no emotive language.
//   * Reading age ~12–14: short sentences, everyday words.
//   * Interpolate figures from globals; fixed policy dates may be literal.
//   * Label provisional data as provisional.
//
// Range-reactive takeaways that read the dashboard's range-filtered local
// state stay inline in dashboard-view.jsx — this registry only holds copy
// that can be computed from the globals alone.

const _CW = (typeof window !== 'undefined') ? window : {};
const _fmtN = n => n == null ? '—' : Math.round(n).toLocaleString('en-GB');
// Lead-in emphasis used across takeaways — matches the inline dashboard style.
const InsightLead = ({ children }) =>
  <b style={{ fontStyle: 'normal', fontWeight: 500, color: 'var(--ink)' }}>{children}</b>;

// ── Insight registry ─────────────────────────────────────────
const INSIGHTS = {

  // Index — "At a glance" strip. One-line definitions: the figure and its
  // delta sit directly above, so these explain what is being counted.
  'index.glance.applications': () =>
    'People asking for asylum in the UK — main applicants only, so each claim counts once even when it covers a family.',
  'index.glance.grant_rate': () =>
    'Share of first decisions that granted protection. Appeals decided later can raise the final rate.',
  'index.glance.backlog': () =>
    'Cases still waiting for a first decision at the end of the year.',
  'index.glance.boats': () =>
    'People detected crossing the Channel in small boats, counted on the day they arrived.',
  'index.glance.resettled': () =>
    'Refugees brought directly to the UK under official schemes, outside the asylum queue.',

  // Dashboard — hero statistic cards. One line under the mode buttons
  // saying what is being counted.
  'dash.stat.week': () =>
    'People detected arriving by small boat in the latest reported week, from the official weekly series.',
  'dash.stat.ytd': () =>
    'Running total since 1 January, compared with the same date last year.',
  'dash.stat.backlog': () =>
    '“Months of work” divides the queue by the pace of decisions over the last year.',
  'dash.stat.grant': () =>
    'First decisions only — successful appeals later raise the overall share granted.',

  // Dashboard — detail statistic cards. Only the non-obvious ones carry a
  // note; the rest stay bare to keep the grid readable.
  'dash.stat.preventions': () =>
    'Crossing attempts stopped on the French side before a boat reached UK waters, as reported to the Home Office.',
  'dash.stat.appeals': () =>
    'No live data series — the Home Office stopped publishing appeal outcomes in 2023. Successful appeals raise the final grant rate above the initial one.',
  'dash.stat.hotels': () =>
    'A snapshot of who was in a hotel on that date. Hotels are contingency accommodation, used when normal dispersal housing is full.',
  'dash.stat.age_assessments': () =>
    'Raised when officials doubt an applicant’s stated age.',

  // Dashboard — figure takeaways for charts without an inline one.
  // Fig 03a · Channel deaths (IOM). The card body already carries the
  // undercount caveat, so this stays to the figures.
  'dash.fig03a': () => {
    const annual = Array.isArray(_CW.DEATHS_ANNUAL) ? _CW.DEATHS_ANNUAL : [];
    if (!annual.length) return null;
    const latest = annual[annual.length - 1];
    if (latest?.total == null) return null;
    // The current calendar year is a running total, not a full year — label
    // it and keep it out of the worst-year comparison.
    const ytd = latest.y === new Date().getUTCFullYear();
    const complete = ytd ? annual.slice(0, -1) : annual;
    const worst = complete.reduce((a, b) => (b.total || 0) > (a.total || 0) ? b : a, complete[0]);
    return (
      <>
        <InsightLead>{_fmtN(latest.total)} deaths and disappearances recorded on the Channel route in {latest.y}{ytd ? ' so far' : ''}.</InsightLead>{' '}
        {worst && worst.y !== latest.y
          ? `The highest full-year total in the series is ${worst.y}, with ${_fmtN(worst.total)}.`
          : 'The highest annual total in the series so far.'}
      </>
    );
  },

  // Fig 10 · Applicants by region of origin (choropleth).
  'dash.fig10': () => {
    const rows = Array.isArray(_CW.NAT_FULL) ? _CW.NAT_FULL : [];
    if (!rows.length || typeof groupNatByRegion !== 'function') return null;
    const regions = groupNatByRegion(rows);
    if (!regions.length) return null;
    const total = regions.reduce((s, r) => s + (r.v || 0), 0) || 1;
    const top = regions[0];
    const year = _CW.NAT_FULL_META?.year;
    return (
      <>
        <InsightLead>{top.name} accounts for {Math.round(top.v / total * 100)}% of {year ?? 'latest-year'} applicants.</InsightLead>{' '}
        Countries are grouped using the Home Office’s own regional profiling — Afghanistan is counted in Central Asia, and the Caucasus is kept separate.
      </>
    );
  },

  // Fig 11 · Region table next to the choropleth.
  'dash.fig11': () => {
    const rows = Array.isArray(_CW.NAT_FULL) ? _CW.NAT_FULL : [];
    if (!rows.length || typeof groupNatByRegion !== 'function') return null;
    const regions = groupNatByRegion(rows);
    if (regions.length < 2 || !regions[1].v) return null;
    const ratio = regions[0].v / regions[1].v;
    return (
      <>
        <InsightLead>The same grouping as the map, ranked.</InsightLead>{' '}
        {regions[0].name} produced {ratio >= 1.95 ? `${ratio.toFixed(1)}× the applicants of` : 'slightly more applicants than'} second-placed {regions[1].name}.
      </>
    );
  },

  // Fig 13 · Support by type (Section 95 / 98 / 4).
  'dash.fig13': () => {
    const t = _CW.SUPPORT_TIERS_LATEST;
    if (!t || !t.total) return null;
    const s95Share = Math.round((t.s95 || 0) / t.total * 100);
    return (
      <>
        <InsightLead>Section 95 — standard support while a claim is decided — covers {s95Share}% of the {_fmtN(t.total)} people supported.</InsightLead>{' '}
        Section 4 supports people whose claim failed but who cannot leave the UK; Section 98 is the short-term bridge while a Section 95 application is assessed.
      </>
    );
  },
};

// Look up an insight by id. Returns null for unknown ids so call sites can
// simply render nothing.
const insight = (id, ctx) => {
  const fn = INSIGHTS[id];
  return fn ? (fn(ctx) ?? null) : null;
};

// ── Dataset descriptions ─────────────────────────────────────
// Keyed by DATASETS[].code. One short paragraph each: what it counts, what
// it leaves out, and any cadence quirk a reader needs. The coverage test in
// tests/test_copy_coverage.py keeps this list in step with DATASETS.
const DATASET_NOTES = {
  Asy_D01:
    'Every asylum application lodged in the UK, broken down by the nationality the applicant declared. Counts main applicants only — spouses and children on the same claim are not included. Updated every three months.',
  Asy_D02:
    'The first decision on each asylum claim: refugee status granted, another kind of leave granted, refused, or withdrawn. Appeals against refusals are decided later and are not counted here.',
  Asy_D03:
    'Asylum applicants broken down by sex and age group, including how many were children when they applied.',
  Asy_D04:
    'Follows each year’s asylum claims through the system — first decision, appeal, return — to show where cases end up years later. One row per nationality per year of claim.',
  Asy_D07:
    'How many people were still waiting for a first decision on their asylum claim at the end of each year — the queue usually called the backlog.',
  Asy_D05:
    'People receiving asylum support (housing, subsistence payments, or both) while their claim is decided, broken down by UK region. A snapshot taken every three months.',
  Asy_D09:
    'How many asylum seekers were housed in hotels on a given date. A quarterly snapshot, not a running total. Hotels are contingency accommodation, used when normal dispersal housing is full.',
  Asy_D11:
    'Asylum seekers receiving support, counted by the local council area where they are housed. Shows how accommodation is spread — and concentrated — across the country.',
  Age_D01:
    'Cases where officials doubted whether an asylum applicant was under 18, and how those age assessments were resolved. Published once a year.',
  SB_01:
    'A daily count of people detected crossing the English Channel in small boats, from January 2018 to the latest week. The canonical small-boats series, updated every Tuesday.',
  SB_02:
    'The last seven days of small-boat crossings, updated daily. Provisional — figures are revised when the weekly official series lands.',
  Irr_02b:
    'Small-boat arrivals broken down by nationality, year by year. The latest year is incomplete until all four quarters have been published.',
  Res_D01:
    'Refugees brought to the UK through official resettlement schemes — the Afghan schemes (ACRS and ARAP), the UK Resettlement Scheme, and others. People resettled this way never enter the asylum queue.',
  Res_D02:
    'Visas issued under the Ukraine schemes. Tracked in a separate Home Office publication and not yet shown in any chart here.',
};

// ── InsightNote ──────────────────────────────────────────────
// For surfaces without a takeaway slot (Atlas, Flow). Renders nothing when
// the registry has no copy for the id — e.g. when a backing global is
// missing — so callers never need a guard.
function InsightNote({ id, ctx, accent = 'var(--accent)', style = {} }) {
  const node = insight(id, ctx);
  if (!node) return null;
  return (
    <div className="insight-note" style={{
      background: 'var(--bg-2)', borderLeft: `3px solid ${accent}`,
      padding: '12px 18px', marginTop: 14,
      fontSize: 14.5, lineHeight: 1.5, color: 'var(--ink-2)',
      fontStyle: 'italic', textWrap: 'pretty', ...style,
    }}>
      {node}
    </div>
  );
}

Object.assign(window, { INSIGHTS, insight, DATASET_NOTES, InsightNote });
