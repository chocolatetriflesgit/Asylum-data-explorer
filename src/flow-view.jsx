// flow-view.jsx — Sankey: nationality → decision outcome.
// Data: NAT_FULL for applicants + grant rates; DECISIONS_LATEST (or
// DECISIONS_2024) for the refused/withdrawn split ratio; HOTELS /
// RETURNS_BY_NATIONALITY / BACKLOG_LATEST for the KPI callout row.

// Finding 28 — palette capped at top-5 + Other. The five-colour set mirrors
// the stable top-five irregular-arrivals nationality pool (Afghan, Eritrean,
// Iranian, Syrian, Sudanese) per Irr_02b; the actual five names are still
// pulled from NAT_FULL at runtime so the chart tracks data, not copy.
const FLOW_NAT_PALETTE = [
  '#1c5c3d', '#c44a2a', '#2a5c8b', '#8b6c1c', '#6b2a8b',
  '#888888',
];
const FLOW_NAT_TOP_N = 5;

// System-flow palette — distinct from nationalities so the two sankeys don't
// read as the same data viewed differently.
const FLOW_SYSTEM_COLORS = {
  application:     '#4a4a4a', // neutral grey
  granted:         'var(--accent-2)',
  humanitarian:    'var(--accent-gold)',
  refused:         'var(--accent-warn)',
  withdrawn:       'var(--muted-2)',
  appealAllowed:   'var(--accent-2)',
  appealDismissed: 'var(--muted-2)',
};

// Col-0 entry routes — sourced from Asy_D01a (asylum-claim date basis, all
// claimants incl. dependants). Shades within each group so the reader can see
// the three top-level groups at a glance.
const ROUTE_OF_ENTRY_NODES = [
  { sub: 'Small Boat',                             group: 'Illegal Entry Routes', color: '#c44a2a' },
  { sub: 'Clandestine',                            group: 'Illegal Entry Routes', color: '#d66a4a' },
  { sub: 'Entered Without Relevant Documentation', group: 'Illegal Entry Routes', color: '#e8a085' },
  { sub: 'Study Visa',                             group: 'Visas and Other Leave', color: '#2a5c8b' },
  { sub: 'Work Visa',                              group: 'Visas and Other Leave', color: '#4a7cab' },
  { sub: 'Visitor Visa',                           group: 'Visas and Other Leave', color: '#6a9ccb' },
  { sub: 'Other Leave',                            group: 'Visas and Other Leave', color: '#8fbce0' },
  { sub: 'Other',                                  group: 'Other',                 color: '#888888' },
];

// Build the four-column system flow. Only col-3 appeal outcomes remain mocked
// (closes when R6 / Asy_D04 pipeline lands).
function buildSystemFlow() {
  const route = typeof ROUTE_OF_ENTRY_QUARTERLY !== 'undefined' ? ROUTE_OF_ENTRY_QUARTERLY : [];
  const routeMeta = typeof ROUTE_OF_ENTRY_META !== 'undefined' ? ROUTE_OF_ENTRY_META : null;
  const decisions = typeof DECISIONS_LATEST !== 'undefined' ? DECISIONS_LATEST
    : typeof DECISIONS_2024 !== 'undefined' ? DECISIONS_2024 : [];

  if (!route.length) return { nodes: [], links: [], year: null };

  const year = routeMeta?.year;
  const yearPrefix = year != null ? String(year) + ' ' : null;
  const yearRows = yearPrefix
    ? route.filter(r => r.q.indexOf(yearPrefix) === 0)
    : route;

  // Sum by sub-route for the reference year.
  const bySub = {};
  for (const r of yearRows) {
    bySub[r.sub] = (bySub[r.sub] || 0) + r.v;
  }

  const col0 = ROUTE_OF_ENTRY_NODES
    .map(n => ({
      id: 'e_' + n.sub.replace(/\s+/g, '_').toLowerCase(),
      label: n.sub,
      col: 0,
      value: bySub[n.sub] || 0,
      color: n.color,
    }))
    .filter(n => n.value > 0);

  const appsTotal = col0.reduce((s, n) => s + n.value, 0);
  if (!appsTotal) return { nodes: [], links: [], year };

  // Col 2 — initial-decision outcomes, shares from DECISIONS_LATEST.
  // DECISIONS_LATEST rows: [granted, humanitarian, refused, withdrawn]
  const decTotal = decisions.reduce((s, r) => s + (r?.v ?? 0), 0) || 1;
  const grantedShare      = (decisions[0]?.v ?? 0) / decTotal;
  const humanitarianShare = (decisions[1]?.v ?? 0) / decTotal;
  const refusedShare      = (decisions[2]?.v ?? 0) / decTotal;

  const granted      = Math.round(appsTotal * grantedShare);
  const humanitarian = Math.round(appsTotal * humanitarianShare);
  const refused      = Math.round(appsTotal * refusedShare);
  const withdrawn    = appsTotal - granted - humanitarian - refused;

  // Col 3 — "Latest outcome" (real, when OUTCOME_COHORT_ANNUAL has data).
  // Aggregate the initial-vs-latest deltas across cohorts that overlap the
  // display year. For each initial bucket we compute what share of that
  // bucket landed in each latest bucket; col-2 → col-3 links are sized
  // accordingly so column totals match initial totals.
  const cohortRows = (typeof OUTCOME_COHORT_ANNUAL !== 'undefined' && Array.isArray(OUTCOME_COHORT_ANNUAL))
    ? OUTCOME_COHORT_ANNUAL : [];
  let latestNodes = [], latestLinks = [];
  if (cohortRows.length) {
    // Aggregate initial + latest buckets across all cohort rows (defensible:
    // the share of initial→latest transitions is approximately stable across
    // cohort years, so pooling them gives a stronger signal than one year).
    const init = { protection:0, otherLeave:0, refusals:0, withdrawals:0, admin:0, notYet:0 };
    const latest = { protection:0, otherLeave:0, refusals:0, withdrawals:0, admin:0, notYet:0 };
    for (const r of cohortRows) {
      for (const k in init) { init[k] += r.initial?.[k] || 0; latest[k] += r.latest?.[k] || 0; }
    }
    const initTotal = Object.values(init).reduce((s,v)=>s+v,0) || 1;
    const scale = appsTotal / initTotal;
    const L = k => Math.round((latest[k] || 0) * scale);
    const lGrant = L('protection') + L('otherLeave');
    const lRef   = L('refusals');
    const lWdr   = L('withdrawals') + L('admin');
    const lPend  = Math.max(0, appsTotal - lGrant - lRef - lWdr);
    // Col-3 nodes carry `mocked: true` so SankeyChart draws them in a paler
    // tint with a dashed outline — this column is a proxy (cohort initial-vs-
    // latest delta), not real appeals data. See C2 in the pre-copy polish plan.
    latestNodes = [
      { id: 'l_grant', label: 'Granted (latest)',   col: 3, value: lGrant, color: FLOW_SYSTEM_COLORS.granted,    mocked: true },
      { id: 'l_ref',   label: 'Refused (latest)',   col: 3, value: lRef,   color: FLOW_SYSTEM_COLORS.refused,    mocked: true },
      { id: 'l_wdr',   label: 'Withdrawn (latest)', col: 3, value: lWdr,   color: FLOW_SYSTEM_COLORS.withdrawn,  mocked: true },
      ...(lPend > 0 ? [{ id: 'l_pend', label: 'Still pending — awaiting a final outcome', col: 3, value: lPend, color: 'var(--bg-3)', mocked: true }] : []),
    ];
    // Naive routing: each initial bucket sends its mass proportionally to
    // the four latest buckets based on global shares. Good enough for an
    // overview — the cohort ribbon (B5) is where per-cohort precision lives.
    const shareTotal = lGrant + lRef + lWdr + lPend || 1;
    const partitionLinks = (fromId, fromV) => {
      if (!fromV) return [];
      return [
        { source: fromId, target: 'l_grant', value: Math.round(fromV * lGrant / shareTotal), dashed: true },
        { source: fromId, target: 'l_ref',   value: Math.round(fromV * lRef   / shareTotal), dashed: true },
        { source: fromId, target: 'l_wdr',   value: Math.round(fromV * lWdr   / shareTotal), dashed: true },
        ...(lPend > 0 ? [{ source: fromId, target: 'l_pend', value: Math.round(fromV * lPend / shareTotal), dashed: true }] : []),
      ].filter(lk => lk.value > 0);
    };
    latestLinks = [
      ...partitionLinks('d_grant', granted),
      ...partitionLinks('d_human', humanitarian),
      ...partitionLinks('d_ref',   refused),
      ...partitionLinks('d_wdr',   withdrawn),
    ];
  }

  const nodes = [
    ...col0,
    { id: 'app',     label: 'Asylum claim', col: 1, value: appsTotal,    color: FLOW_SYSTEM_COLORS.application },
    { id: 'd_grant', label: 'Granted',      col: 2, value: granted,      color: FLOW_SYSTEM_COLORS.granted },
    { id: 'd_human', label: 'Humanitarian', col: 2, value: humanitarian, color: FLOW_SYSTEM_COLORS.humanitarian },
    { id: 'd_ref',   label: 'Refused',      col: 2, value: refused,      color: FLOW_SYSTEM_COLORS.refused },
    { id: 'd_wdr',   label: 'Withdrawn',    col: 2, value: withdrawn,    color: FLOW_SYSTEM_COLORS.withdrawn },
    ...latestNodes,
  ];

  const links = [
    ...col0.map(n => ({ source: n.id, target: 'app', value: n.value })),
    { source: 'app',   target: 'd_grant', value: granted },
    { source: 'app',   target: 'd_human', value: humanitarian },
    { source: 'app',   target: 'd_ref',   value: refused },
    { source: 'app',   target: 'd_wdr',   value: withdrawn },
    ...latestLinks,
  ];

  return { nodes, links, year, hasLatest: latestNodes.length > 0 };
}

function buildSankeyData() {
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const decisions = typeof DECISIONS_LATEST !== 'undefined' ? DECISIONS_LATEST
    : typeof DECISIONS_2024 !== 'undefined' ? DECISIONS_2024 : [];

  if (!natFull.length) return { nodes: [], links: [] };

  const sorted = [...natFull].sort((a, b) => b.v - a.v);
  const topN   = sorted.slice(0, FLOW_NAT_TOP_N);
  const rest   = sorted.slice(FLOW_NAT_TOP_N);

  // Fallback grant rate: weighted average across all nationalities
  const totalV       = natFull.reduce((s, r) => s + r.v, 0);
  const totalGranted = natFull.reduce((s, r) => s + r.v * (r.grant ?? 0), 0);
  const globalGrant  = totalV > 0 ? totalGranted / totalV : 0.5;

  // Refused vs withdrawn split from initial decisions breakdown
  const refusedV    = decisions[2]?.v ?? 0;
  const withdrawnV  = decisions[3]?.v ?? 0;
  const splitDenom  = refusedV + withdrawnV;
  const refusedRatio = splitDenom > 0 ? refusedV / splitDenom : 0.77;

  // "Other" aggregate: nationalities outside the top N
  const otherV       = rest.reduce((s, r) => s + r.v, 0);
  const otherGranted = rest.reduce((s, r) => s + r.v * (r.grant ?? globalGrant), 0);
  const otherGrant   = otherV > 0 ? otherGranted / otherV : globalGrant;

  const sources = [
    ...topN.map((r, i) => ({
      id: `n${i}`, label: r.name, v: r.v,
      grant: r.grant ?? globalGrant, color: FLOW_NAT_PALETTE[i],
    })),
    { id: 'nOther', label: 'Other nationalities', v: otherV, grant: otherGrant, color: FLOW_NAT_PALETTE[FLOW_NAT_TOP_N] },
  ];

  const links = [];
  let totG = 0, totR = 0, totW = 0;

  for (const s of sources) {
    if (!s.v) continue;
    const g = Math.round(s.v * s.grant);
    const notG = s.v - g;
    const r = Math.round(notG * refusedRatio);
    const w = notG - r;
    links.push({ source: s.id, target: 'rG', value: g });
    links.push({ source: s.id, target: 'rR', value: r });
    links.push({ source: s.id, target: 'rW', value: w });
    totG += g; totR += r; totW += w;
  }

  const nodes = [
    ...sources.map(s => ({ id: s.id, label: s.label, col: 0, value: s.v, color: s.color })),
    { id: 'rG', label: 'Granted (initial)',   col: 1, value: totG, color: 'var(--accent-2)'    },
    { id: 'rR', label: 'Refused',   col: 1, value: totR, color: 'var(--accent-warn)'  },
    { id: 'rW', label: 'Withdrawn', col: 1, value: totW, color: 'var(--muted-2)'      },
  ];

  return { nodes, links };
}

function FlowKPI({ label, value, note }) {
  return (
    <div style={{border:'1px solid var(--rule)',padding:'14px 16px',background:'var(--bg-2)'}}>
      <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:4}}>{label}</div>
      <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:26,fontWeight:500,color:'var(--ink)',letterSpacing:-0.3}}>
        {value != null ? fmtN(value) : '—'}
      </div>
      {note && <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:4,lineHeight:1.4}}>{note}</div>}
    </div>
  );
}

function FlowView({ setRoute }) {
  const { nodes, links } = React.useMemo(() => buildSankeyData(), []);
  const system = React.useMemo(() => buildSystemFlow(), []);
  const [compact, setCompact] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handler = () => setCompact(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const systemYear = system.year ?? (typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META?.year : null);

  const natMeta = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META : null;
  const year    = natMeta?.year ?? '2024';

  const hotelsLatest = (() => {
    const h = typeof HOTELS !== 'undefined' ? HOTELS : [];
    return h.length ? (h[h.length - 1]?.persons_in_hotels ?? null) : null;
  })();

  const returnsTotal = (() => {
    const ret = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
    return ret.length ? ret.reduce((s, r) => s + r.total, 0) : null;
  })();

  const backlogLatest = (() => {
    if (typeof BACKLOG_LATEST !== 'undefined' && BACKLOG_LATEST.length)
      return BACKLOG_LATEST[BACKLOG_LATEST.length - 1]?.v ?? null;
    return null;
  })();

  return (
    <main className="fade-enter page-section" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 80px'}}>
      <div style={{marginBottom:24}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-2)'}}>Flow</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 10px'}}>From application to outcome.</h1>
        <p style={{fontSize:16,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
          How {year} asylum applicants flowed from nationality to decision outcome. Link width is proportional to applicant volume — hover any link or node to see the figures.
        </p>
      </div>

      {/* How to read this — Tranche 6.5 primer for non-expert readers. */}
      <aside style={{marginTop:8,marginBottom:28,padding:'18px 22px',background:'var(--bg-2)',border:'1px solid var(--rule)',borderLeft:'2px solid var(--accent)',maxWidth:940}}>
        <div className="uc" style={{color:'var(--muted)',fontSize:11,marginBottom:8,letterSpacing:0.4}}>How to read this</div>
        <div style={{fontSize:13.5,lineHeight:1.55,color:'var(--ink-2)',fontFamily:'var(--serif)'}}>
          Each diagram reads <em>left to right</em>. Every ribbon is a group of people, and the width of the ribbon is how many — wider means more.
          Splits show where that group divided: granted, refused, withdrawn, or still pending.
          Hover a ribbon or a bar to see the underlying figure.
          The <b style={{color:'var(--ink)',fontWeight:600}}>2022 cohort</b> is highlighted below — a useful starting point because the 2022 surge produced the largest cohort in the series and its initial-vs-latest delta is the most studied.
        </div>
      </aside>

      {/* System flow — three or four column view depending on Asy_D04 availability. */}
      <div style={{marginTop:4,marginBottom:8}}>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:6}}>System flow · {systemYear ?? year}</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,letterSpacing:-0.3,margin:'0 0 6px'}}>
          {system.hasLatest
            ? 'Entry → Application → Initial decision → Latest outcome'
            : 'Entry → Application → Initial decision'}
        </h2>
      </div>
      {system.hasLatest && (
        <div style={{marginBottom:10,padding:'10px 14px',background:'var(--bg-2)',borderLeft:'2px solid var(--accent-warn)',fontSize:12.5,color:'var(--ink-2)',lineHeight:1.55,maxWidth:940}}>
          <strong style={{fontWeight:500}}>The fourth column is an indicative proxy using cohort outcome changes; it is not an appeals dataset.</strong> The Home Office has not republished appeals statistics since their case-working system migration. Paler ribbons and dashed node outlines mark this column as modelled, not measured.
        </div>
      )}
      <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'24px 20px 16px'}}>
        {system.nodes.length ? (
          <SankeyChart nodes={system.nodes} links={system.links} width={compact ? 500 : 1120} height={compact ? 480 : 480} compact={compact}/>
        ) : (
          <div style={{padding:'60px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>
            Data not loaded.
          </div>
        )}
      </div>

      <div style={{marginTop:12,padding:'10px 14px',background:'var(--bg-2)',borderLeft:'2px solid var(--accent)',fontSize:12.5,color:'var(--ink-2)',lineHeight:1.55,maxWidth:900}}>
        {system.hasLatest ? (
          <>
            <strong style={{fontWeight:500}}>About the fourth column.</strong> "Latest outcome" pools the initial-vs-latest delta from Asy_D04 across cohort years. It captures appeal overturns, late withdrawals, and administrative reclassifications in one figure. The beige "Still pending" band holds claims that have not yet reached a final outcome — many are still awaiting an initial decision or an appeal hearing. Dashed outlines remind the reader that this column is modelled from cohort movement, not direct appeals data, which the Home Office has not republished since its case-working system migration (Asy_D04 Cover_sheet, Note 5).
          </>
        ) : (
          <>
            <strong style={{fontWeight:500}}>Appeal outcomes not shown.</strong> The Home Office has not yet republished appeal-specific data since migrating case-working systems (Asy_D04 Cover_sheet, Note 5). The closest defensible proxy is the <em>initial vs latest</em> outcome delta in the cohort file — which will land as a real fourth column here when the cohort-outcome ingest is wired in. Entry routes come from Asy_D01a (date of asylum claim) and the Application → Initial decision split uses shares from Asy_D02.
          </>
        )}
        <div style={{marginTop:10,paddingTop:10,borderTop:'1px dotted var(--rule-2)'}}>
          <strong style={{fontWeight:500}}>About the "Granted → Refused" ribbon.</strong> That transition is <em>modelled, not measured</em>. Each initial outcome is partitioned proportionally across the four latest-outcome buckets, so a small ribbon from "Granted" into "Refused" appears even though real granted-to-refused transitions are rare in absolute terms. In practice they can occur through Home Office <strong>cessation or revocation</strong> under Article 1C of the 1951 Refugee Convention (for example when the country-of-origin risk ends, or where status is revoked for conduct reasons), through <strong>Home Office appeals</strong> to the Upper Tribunal that overturn a grant, through <strong>administrative review</strong> reversals, or — very rarely — through <strong>fraud-led revocation</strong>. The ribbon's width here is a product of the proportional routing described in the caveat above, and will be replaced once Asy_D04 republishes real appeals data.
        </div>
      </div>

      {/* Nationality breakdown — existing chart, now below the system view */}
      <div style={{marginTop:40,marginBottom:8}}>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:6}}>By nationality · {year}</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,letterSpacing:-0.3,margin:'0 0 10px'}}>Nationality → Initial decision outcome</h2>
      </div>
      <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'24px 20px 16px'}}>
        {nodes.length ? (
          <SankeyChart nodes={nodes} links={links} width={compact ? 420 : 820} height={compact ? 520 : 520} compact={compact}/>
        ) : (
          <div style={{padding:'60px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>
            Data not loaded.
          </div>
        )}
      </div>

      <div style={{marginTop:8,fontSize:11.5,color:'var(--muted-2)',lineHeight:1.5,maxWidth:780}}>
        Decision outcomes are estimated by applying each nationality's initial-decision grant rate to its applicant volume. The refused/withdrawn split uses the overall ratio from <em>Initial decisions on asylum applications</em> (Asy_D02). Left and right totals are identical by construction. <strong style={{fontWeight:500,color:'var(--ink-2)'}}>Note:</strong> "Granted (initial)" refers to grants at initial decision only — appeal grants, which overturn a further ~15–20% of refused cases, are not included as cohort-level appeal data is not published.
      </div>

      {/* B5 cohort ribbon — one panel per year-of-claim. */}
      <div style={{marginTop:48,marginBottom:8}}>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:6}}>Cohort ribbon · Asy_D04</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,letterSpacing:-0.3,margin:'0 0 10px'}}>
          Where each year's claimants ended up
        </h2>
        <p style={{fontSize:14,color:'var(--ink-2)',maxWidth:720,margin:'0 0 16px',lineHeight:1.5}}>
          One panel per year of claim. Top ribbon shows the initial decision; lower ribbon shows where the same cohort is now, reflecting appeals, late withdrawals, and returns.
        </p>
      </div>
      <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'20px 20px 16px'}}>
        <CohortRibbon
          data={buildCohortAggregate()}
          width={1120}
          cols={4}
          highlightYear={2022}
          annotations={[
            { year: 2022, phase: 'initial', text: 'most granted on first decision' },
            { year: 2022, phase: 'latest',  text: 'still-pending tail much smaller' },
            { year: 2019, phase: 'latest',  text: 'many refused, some overturned later' },
          ]}/>
      </div>

      {/* B4 annual backlog waterfall */}
      <div style={{marginTop:48,marginBottom:8}}>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:6}}>Backlog waterfall · annual</div>
        <h2 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:400,letterSpacing:-0.3,margin:'0 0 10px'}}>
          Pending cases, year by year
        </h2>
      </div>
      <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'20px 20px 16px'}}>
        <BacklogWaterfall data={buildAnnualWaterfall()} width={1000} height={320}/>
      </div>

      <div style={{marginTop:24,display:'flex',gap:14,fontSize:12}}>
        <button className="ulh" style={{color:'var(--accent)'}}
          onClick={() => setRoute({ name: 'atlas' })}>
          Explore by country in Atlas →
        </button>
        <button className="ulh" style={{color:'var(--accent)'}}
          onClick={() => setRoute({ name: 'build' })}>
          Build a chart →
        </button>
      </div>
    </main>
  );
}

// Aggregate OUTCOME_COHORT_ANNUAL across nationalities so each cohort
// year has a single {claims, initial, latest, returns} row.
function buildCohortAggregate() {
  const rows = (typeof OUTCOME_COHORT_ANNUAL !== 'undefined' && Array.isArray(OUTCOME_COHORT_ANNUAL))
    ? OUTCOME_COHORT_ANNUAL : [];
  if (!rows.length) return [];
  const byYear = new Map();
  const zero = () => ({ claims:0, initial:{protection:0,otherLeave:0,refusals:0,withdrawals:0,admin:0,notYet:0},
                         latest:{protection:0,otherLeave:0,refusals:0,withdrawals:0,admin:0,notYet:0},
                         returns:{enforced:0,voluntary:0} });
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, zero());
    const acc = byYear.get(r.year);
    acc.claims += r.claims || 0;
    for (const k in acc.initial) acc.initial[k] += r.initial?.[k] || 0;
    for (const k in acc.latest)  acc.latest[k]  += r.latest?.[k]  || 0;
    for (const k in acc.returns) acc.returns[k] += r.returns?.[k] || 0;
  }
  return [...byYear.entries()]
    .sort((a,b) => a[0] - b[0])
    .map(([year, v]) => ({ year, ...v }));
}

// Build annual backlog waterfall: inflow from ASYLUM_ANNUAL (new claims each
// year), pending stock from BACKLOG_LATEST (year-end snapshot), decided =
// derived to close the balance. Returns [] when either source is missing.
// Awaits OUTCOME_COHORT ingest (see BACKLOG.md) to replace the derived
// "decided" term with the cohort-level initial-vs-latest split.
function buildAnnualWaterfall() {
  const asy = (typeof ASYLUM_ANNUAL !== 'undefined' && Array.isArray(ASYLUM_ANNUAL)) ? ASYLUM_ANNUAL : [];
  const bkl = (typeof BACKLOG_LATEST !== 'undefined' && Array.isArray(BACKLOG_LATEST)) ? BACKLOG_LATEST : [];
  if (!asy.length || !bkl.length) return [];
  const inflowByYear = {};
  for (const r of asy) inflowByYear[r.y] = r.v;
  const rows = [];
  let prevPending = 0;
  for (const r of bkl) {
    const inflow = inflowByYear[r.y] || 0;
    const pending = r.v || 0;
    // Decided (+ withdrew / admin) = prior pending + inflow − current pending.
    const decided = Math.max(0, prevPending + inflow - pending);
    rows.push({ year: r.y, inflow, decided, pending });
    prevPending = pending;
  }
  return rows;
}

Object.assign(window, { FlowView });
