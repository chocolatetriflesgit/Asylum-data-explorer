// flow-view.jsx — Sankey: nationality → decision outcome.
// Data: NAT_FULL for applicants + grant rates; DECISIONS_LATEST (or
// DECISIONS_2024) for the refused/withdrawn split ratio; HOTELS /
// RETURNS_BY_NATIONALITY / BACKLOG_LATEST for the KPI callout row.

const FLOW_NAT_PALETTE = [
  '#1c5c3d', '#c44a2a', '#2a5c8b', '#8b6c1c', '#6b2a8b',
  '#2a8b6c', '#8b2a4a', '#4a6b1c', '#1c3d6b', '#6b4a1c',
  '#888888',
];

function buildSankeyData() {
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const decisions = typeof DECISIONS_LATEST !== 'undefined' ? DECISIONS_LATEST
    : typeof DECISIONS_2024 !== 'undefined' ? DECISIONS_2024 : [];

  if (!natFull.length) return { nodes: [], links: [] };

  const sorted = [...natFull].sort((a, b) => b.v - a.v);
  const top10  = sorted.slice(0, 10);
  const rest   = sorted.slice(10);

  // Fallback grant rate: weighted average across all nationalities
  const totalV       = natFull.reduce((s, r) => s + r.v, 0);
  const totalGranted = natFull.reduce((s, r) => s + r.v * (r.grant ?? 0), 0);
  const globalGrant  = totalV > 0 ? totalGranted / totalV : 0.5;

  // Refused vs withdrawn split from initial decisions breakdown
  const refusedV    = decisions[2]?.v ?? 0;
  const withdrawnV  = decisions[3]?.v ?? 0;
  const splitDenom  = refusedV + withdrawnV;
  const refusedRatio = splitDenom > 0 ? refusedV / splitDenom : 0.77;

  // "Other" aggregate: nationalities outside the top 10
  const otherV       = rest.reduce((s, r) => s + r.v, 0);
  const otherGranted = rest.reduce((s, r) => s + r.v * (r.grant ?? globalGrant), 0);
  const otherGrant   = otherV > 0 ? otherGranted / otherV : globalGrant;

  const sources = [
    ...top10.map((r, i) => ({
      id: `n${i}`, label: r.name, v: r.v,
      grant: r.grant ?? globalGrant, color: FLOW_NAT_PALETTE[i],
    })),
    { id: 'nOther', label: 'Other nationalities', v: otherV, grant: otherGrant, color: FLOW_NAT_PALETTE[10] },
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
    if (typeof BACKLOG !== 'undefined' && BACKLOG.length)
      return BACKLOG[BACKLOG.length - 1]?.v ?? null;
    return null;
  })();

  return (
    <main className="fade-enter" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 80px'}}>
      <div style={{marginBottom:24}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-2)'}}>Flow</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 10px'}}>From application to outcome.</h1>
        <p style={{fontSize:16,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
          How {year} asylum applicants flowed from nationality to decision outcome. Link width is proportional to applicant volume — hover any link or node to see the figures.
        </p>
      </div>

      <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'24px 20px 16px'}}>
        {nodes.length ? (
          <SankeyChart nodes={nodes} links={links} width={820} height={520}/>
        ) : (
          <div style={{padding:'60px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>
            Data not loaded.
          </div>
        )}
      </div>

      <div style={{marginTop:8,fontSize:11.5,color:'var(--muted-2)',lineHeight:1.5,maxWidth:780}}>
        Decision outcomes are estimated by applying each nationality's initial-decision grant rate to its applicant volume. The refused/withdrawn split uses the overall ratio from <em>Initial decisions on asylum applications</em> (ASY_D02). Left and right totals are identical by construction. <strong style={{fontWeight:500,color:'var(--ink-2)'}}>Note:</strong> "Granted (initial)" refers to grants at initial decision only — appeal grants, which overturn a further ~15–20% of refused cases, are not included as cohort-level appeal data is not published.
      </div>

      <div style={{marginTop:32}}>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:12}}>Snapshot indicators · separate datasets</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
          <FlowKPI
            label="People in asylum accommodation"
            value={hotelsLatest}
            note="Asylum seekers in receipt of Home Office support, latest quarterly snapshot"/>
          <FlowKPI
            label="Returns (all nationalities)"
            value={returnsTotal}
            note="Enforced and voluntary returns combined, latest year"/>
          <FlowKPI
            label="Pending initial decision"
            value={backlogLatest}
            note="People awaiting a decision at latest snapshot"/>
        </div>
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

Object.assign(window, { FlowView });
