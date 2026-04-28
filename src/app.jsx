// app.jsx — main application: header, router, index/story/build views

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Glossary tooltip — wraps a term with a hover popover.
// Looks the term up in window.GLOSSARY (lower-cased key). If the
// term is missing, renders the children unchanged so the rest of
// the prose still flows.
// ─────────────────────────────────────────────────────────────
function Gloss({ term, children }) {
  const W = (typeof window !== 'undefined') ? window : {};
  const dict = W.GLOSSARY || {};
  const key = (term || (typeof children === 'string' ? children : '')).toLowerCase().trim();
  const entry = dict[key];
  if (!entry) return <>{children}</>;
  return (
    <span className="gloss" tabIndex={0}>
      {children}
      <span className="gloss-pop" role="tooltip">
        {entry.body}
        {entry.source && <span className="src">{entry.source}</span>}
      </span>
    </span>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#1c3d2e"
}/*EDITMODE-END*/;

// ─────────────────────────────────────────────────────────────
// Masthead — thin dated stripe above the main header nav.
// Shows "data through <date>" (latest live data point across all feeds).
// ─────────────────────────────────────────────────────────────
function latestDataThrough() {
  const w = (typeof window !== 'undefined') ? window : {};
  const candidates = [
    w.BOATS_META?.latestDataPoint,
    w.BOATS_PROVISIONAL_META?.latestDate || w.BOATS_PROVISIONAL_META?.updatedAt,
    w.NAT_FULL_META?.generatedAt,
    w.DECISIONS_META?.generatedAt,
    w.BACKLOG_META?.latest_date || w.BACKLOG_META?.generatedAt,
    w.HOTELS_META?.generatedAt,
    w.SUPPORT_REGIONS_META?.date || w.SUPPORT_REGIONS_META?.generatedAt,
  ].filter(Boolean).map(s => ({s, d: new Date(s)})).filter(x => !isNaN(x.d));
  if (!candidates.length) return null;
  return candidates.reduce((a,b) => a.d > b.d ? a : b);
}
function fmtMasthead(d) {
  return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function Masthead() {
  const latest = latestDataThrough();
  if (!latest) return null;
  const d = latest.d;
  return (
    <div style={{borderBottom:'1px solid var(--rule)',background:'var(--bg-2)'}}>
      <div className="masthead-inner" style={{maxWidth:1240,margin:'0 auto',padding:'8px 48px',display:'flex',justifyContent:'flex-end',alignItems:'center',gap:16}}>
        <span className="uc" style={{color:'var(--muted)'}}>Data through {fmtMasthead(d)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Header
//
// Collapsed to four primary tabs — Read / Explore / Build a chart /
// Sources & methods — with a secondary sub-nav that appears under
// Explore (Dashboard · Atlas · Flow) and Sources & methods (Datasets ·
// Updates). Picking a primary tab lands on its default sub-view; the
// sub-nav then lets readers switch within the group without leaving.
// ─────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { id: 'read',    label: 'Read',              routes: ['index', 'story'],              default: 'index' },
  { id: 'explore', label: 'Explore',           routes: ['dashboard', 'atlas', 'flow'],  default: 'dashboard',
    sub: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'atlas',     label: 'Atlas' },
      { id: 'flow',      label: 'Flow' },
    ]
  },
  { id: 'build',   label: 'Build a chart',     routes: ['build'],                       default: 'build' },
  { id: 'docs',    label: 'Sources & methods', routes: ['datasets', 'updates'],         default: 'datasets',
    sub: [
      { id: 'datasets', label: 'Datasets' },
      { id: 'updates',  label: 'Updates' },
    ]
  },
];

function Header({ route, setRoute, onSearch, onMethod }) {
  const activeGroup = NAV_GROUPS.find(g => g.routes.includes(route.name)) || NAV_GROUPS[0];
  return (
    <header style={{background:'var(--bg)',borderBottom:'1px solid var(--rule)',position:'sticky',top:0,zIndex:50,backdropFilter:'blur(6px)'}}>
      <Masthead />
      <div className="header-inner" style={{maxWidth:1240,margin:'0 auto',padding:'14px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:40}}>
        <button onClick={()=>setRoute({name:'index'})} className="pressable" style={{display:'flex',alignItems:'baseline',gap:12,whiteSpace:'nowrap',flexShrink:0}}>
          <span style={{fontFamily:'var(--serif)',fontSize:19,fontWeight:600,color:'var(--accent)',letterSpacing:-0.2}}>Migration</span>
          <span style={{fontFamily:'var(--serif)',fontSize:15,fontStyle:'italic',color:'var(--muted)'}}>data explorer</span>
        </button>
        <nav className="header-nav" style={{display:'flex',alignItems:'center',gap:28}}>
          {NAV_GROUPS.map(g => (
            <button key={g.id} onClick={()=>setRoute({name: g.default})}
              className="ulh"
              style={{fontSize:13.5,color: activeGroup.id===g.id ? 'var(--accent)':'var(--ink-2)',
                     borderBottom: activeGroup.id===g.id ? '1px solid var(--accent)':'1px solid transparent',
                     paddingBottom:3}}>
              {g.label}
            </button>
          ))}
          <button onClick={onSearch} className="pressable" aria-label="Search" style={{fontSize:13.5,color:'var(--muted)',display:'flex',alignItems:'center',gap:6}}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
            <span>Search</span>
          </button>
          <button onClick={onMethod} className="ulh" style={{fontSize:13.5,color:'var(--muted)'}}>Methodology</button>
        </nav>
      </div>
      {activeGroup.sub && (
        <div className="header-subnav" style={{background:'var(--bg-2)',borderTop:'1px solid var(--rule)'}}>
          <div style={{maxWidth:1240,margin:'0 auto',padding:'8px 48px',display:'flex',alignItems:'center',gap:24}}>
            <span className="uc" style={{color:'var(--muted-2)',fontSize:10.5,letterSpacing:0.1,marginRight:4}}>{activeGroup.label}</span>
            {activeGroup.sub.map(s => (
              <button key={s.id} onClick={()=>setRoute({name: s.id})}
                className="ulh"
                style={{fontSize:13,color: route.name===s.id ? 'var(--accent)':'var(--ink-2)',
                       borderBottom: route.name===s.id ? '1px solid var(--accent)':'1px solid transparent',
                       paddingBottom:2,fontStyle: route.name===s.id ? 'normal' : 'italic'}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Search modal (command palette style)
// ─────────────────────────────────────────────────────────────
function SearchModal({ open, onClose, onPick }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(()=>{ if (open) setTimeout(()=>inputRef.current?.focus(), 40); }, [open]);
  useEffect(()=>{
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = useMemo(()=>{
    const stories = STORIES.map(s=>({kind:'Story', id:s.id, label:s.title, sub:s.kicker, go:{name:'story', id:s.id}}));
    const datasets = DATASETS.map(d=>({kind:'Dataset', id:d.code, label:d.name, sub:d.code+' · '+d.rows+' rows', go:{name:'datasets'}}));
    const all = [...stories, ...datasets];
    if (!q) return all.slice(0,8);
    const ql = q.toLowerCase();
    return all.filter(i => i.label.toLowerCase().includes(ql) || i.sub.toLowerCase().includes(ql)).slice(0,10);
  },[q]);

  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(26,26,23,.35)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'12vh'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--bg)',border:'1px solid var(--rule-2)',boxShadow:'0 20px 60px rgba(0,0,0,.15)',width:'min(620px,92vw)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 22px',borderBottom:'1px solid var(--rule)'}}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--muted)" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search stories and datasets (e.g. ‘grant rate’, Asy_D01)…"
            style={{flex:1,border:'none',outline:'none',background:'transparent',fontFamily:'var(--serif)',fontSize:17,color:'var(--ink)'}}/>
          <span className="mono" style={{fontSize:11,color:'var(--muted-2)',border:'1px solid var(--rule-2)',padding:'4px 8px'}}>esc</span>
        </div>
        <div style={{maxHeight:'50vh',overflowY:'auto'}}>
          {items.length === 0 ? (
            <div style={{padding:'32px 22px',color:'var(--muted)',fontStyle:'italic',fontSize:14}}>No matches.</div>
          ) : items.map((it,i)=>(
            <button key={i} onClick={()=>{ onPick(it.go); onClose(); }}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'12px 22px',borderBottom:'1px solid var(--rule)',textAlign:'left'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div>
                <div style={{fontSize:14,color:'var(--ink)'}}>{it.label}</div>
                <div style={{fontSize:11.5,color:'var(--muted)',marginTop:2}} className="uc">{it.kind} · {it.sub}</div>
              </div>
              <span style={{color:'var(--muted-2)'}}>↗</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Methodology drawer
// ─────────────────────────────────────────────────────────────
function MethodologyDrawer({ open, onClose }) {
  return (
    <>
      <div className={`drawer-scrim ${open?'open':''}`} onClick={onClose}/>
      <aside className={`drawer ${open?'open':''}`}>
        <div style={{padding:'32px 40px',borderBottom:'1px solid var(--rule)',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
          <div>
            <div className="uc" style={{color:'var(--accent-warn)',marginBottom:6}}>Notes on methodology</div>
            <h2 style={{fontFamily:'var(--serif)',fontSize:28,margin:0,fontWeight:500,letterSpacing:-0.3}}>How these numbers are made</h2>
          </div>
          <button onClick={onClose} className="pressable" aria-label="Close" style={{fontSize:22,color:'var(--muted)'}}>×</button>
        </div>
        <div style={{padding:'28px 40px',fontSize:15,lineHeight:1.62,color:'var(--ink-2)'}}>
          <p style={{margin:'0 0 16px',textWrap:'pretty'}}>Figures on this page are drawn from the Home Office Immigration Statistics quarterly release, published on the second Thursday of February, May, August and November. The dataset goes back to 1979 for asylum applications and to 2018 for small-boat arrivals.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Main applicants vs. dependants</h3>
          <p style={{margin:'0 0 16px'}}>Unless otherwise stated, our counts refer to <em>main applicants</em> only. An asylum claim may cover dependants (spouse, children under 18) — including them roughly increases total counts by 25–30%.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Grant rate definition</h3>
          <p style={{margin:'0 0 16px'}}>Grant rate is the share of <em>initial decisions</em> that resulted in asylum or humanitarian protection being granted, excluding withdrawn and non-substantive cases.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Small boats</h3>
          <p style={{margin:'0 0 10px'}}>Small-boat arrivals are recorded by Border Force on arrival at Dover or on interception in the Channel. The series begins January 2018. Not every arrival lodges an asylum claim, although the majority do.</p>
          <p style={{margin:'0 0 16px',fontSize:13.5,color:'var(--muted)'}}>In the Build-a-chart view, the granularity toggle (daily / weekly / monthly / quarterly / annual) is available only when small-boat arrivals is the primary dataset — it's the only series we publish with sub-annual data globals. Source: Home Office <em>Migrants detected crossing the English Channel in small boats — time series</em> (weekly ODS). <a href="https://www.gov.uk/government/publications/migrants-detected-crossing-the-english-channel-in-small-boats" style={{color:'var(--accent)',borderBottom:'1px solid var(--accent)'}}>gov.uk publication</a>. Open Government Licence v3.0.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Preventions & interceptions</h3>
          <p style={{margin:'0 0 16px'}}>The same weekly ODS reports two additional counts from ~2023 onwards: <em>migrants prevented</em> (people stopped from departing on the French side) and <em>event prevented</em> (boat events intercepted). Both are null before the Home Office began reporting them, so charts skip those weeks rather than plotting zero. Fields: <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>BOATS_WEEKLY.p</span> and <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>.e</span>.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Nationalities</h3>
          <p style={{margin:'0 0 16px'}}>Two views of the same source: <em>Immigration system statistics — asylum claims dataset</em> (sheets <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>Data_Asy_D01</span> for applications and <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>Data_Asy_D02</span> for decisions). The full nationalities table shows every reported nationality for the latest calendar year with all four quarters published. The quarterly panel shows the top 20 nationalities across the most recent eight quarters. Grant rate is <em>(Grant of Protection + Grant of Other Leave) ÷ total decisions</em> for the same year. <a href="https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables" style={{color:'var(--accent)',borderBottom:'1px solid var(--accent)'}}>gov.uk data tables</a>. Home Office · Open Government Licence v3.0.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Resettlement schemes</h3>
          <p style={{margin:'0 0 10px'}}>Persons resettled under each UK scheme for the most recent three complete calendar years. Source: <em>resettlement scheme datasets</em> xlsx, sheet <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>Data_Res_D02</span>.</p>
          <ul style={{margin:'0 0 10px 18px',padding:0,fontSize:14.5,lineHeight:1.55}}>
            <li><strong>ACRS</strong> — Afghan Citizens Resettlement Scheme (Pathways 1 + 2 + 3 summed).</li>
            <li><strong>ARAP</strong> — Afghan Relocations and Assistance Policy, including ARR legacy cases.</li>
            <li><strong>UKRS</strong> — UK Resettlement Scheme.</li>
            <li><strong>Community Sponsorship</strong> — cross-scheme flag, broken out as its own bucket regardless of the base scheme.</li>
            <li><strong>Mandate Scheme</strong> — small continuing programme for recognised refugees with close UK family.</li>
          </ul>
          <p style={{margin:'0 0 16px',fontSize:13.5,color:'var(--muted)'}}>The <em>Ukraine Family Scheme</em> and <em>Homes for Ukraine</em> are tracked in a separate publication and are <strong>not</strong> included here. <a href="https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables" style={{color:'var(--accent)',borderBottom:'1px solid var(--accent)'}}>gov.uk data tables</a>. Home Office · Open Government Licence v3.0.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Asylum accommodation</h3>
          <p style={{margin:'0 0 16px'}}>&quot;Persons in hotels&quot; counts rows where <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>Accommodation Type = &quot;Contingency Accommodation — Hotel&quot;</span>. This is a <em>snapshot</em>, not a period total: the figure is who was in hotel accommodation on that date, published quarterly (end of March, June, September and December). Source: <em>asylum seekers — receipt of support datasets</em> xlsx, sheet <span style={{fontFamily:'var(--mono)',fontSize:12.5}}>Data_Asy_D09</span>. <a href="https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables" style={{color:'var(--accent)',borderBottom:'1px solid var(--accent)'}}>gov.uk data tables</a>. Home Office · Open Government Licence v3.0.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Pending cases (backlog)</h3>
          <p style={{margin:'0 0 16px'}}>The backlog figure counts asylum applications awaiting an initial decision at the 31 December snapshot for each year. The Home Office set a target of deciding applications within six months of receipt. Applications lodged before 28 June 2022 are often termed the <em>legacy backlog</em> — they were processed under a separate Streamlined Asylum Processing stream introduced in 2022. The published total combines legacy and non-legacy cases and includes applicants awaiting an appeal as well as those not yet seen.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Humanitarian protection</h3>
          <p style={{margin:'0 0 16px'}}>Humanitarian protection (HP) is a form of leave granted when an applicant does not meet the legal definition of a refugee under the 1951 Refugee Convention but faces a real risk of serious harm on return. HP normally carries five years' leave to remain and broadly the same public-fund access as refugee status. On this site, HP grants are counted together with refugee-status grants when calculating the overall grant rate, following Home Office practice. The two outcomes are shown separately in the decisions breakdown chart.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Appeals</h3>
          <p style={{margin:'0 0 16px'}}>When the Home Office refuses an asylum claim at the initial stage, the applicant may appeal to the First-tier Tribunal (Immigration and Asylum Chamber). The Tribunal independently reviews the decision and either allows the appeal (overturning the refusal) or dismisses it. In 2024 approximately 36% of substantive appeals heard were allowed. Allowed appeals are not double-counted with initial grant decisions — they represent a separate downstream outcome for cases that were first refused.</p>

          <h3 style={{fontFamily:'var(--serif)',fontSize:14,textTransform:'uppercase',letterSpacing:0.08,margin:'28px 0 8px',color:'var(--accent)'}}>Updates and revisions</h3>
          <p style={{margin:'0 0 16px'}}>Historic figures are occasionally revised by the Home Office when new returns are received or coding errors are corrected. We reflect the latest published revision and do not freeze snapshots. See the <span style={{borderBottom:'1px solid var(--accent)',color:'var(--accent)'}}>revision log</span> for a full history.</p>

          <div style={{marginTop:32,padding:'16px 20px',background:'var(--bg-2)',borderLeft:'2px solid var(--accent)'}}>
            <div className="uc" style={{color:'var(--accent)',marginBottom:6}}>Contact</div>
            <div style={{fontSize:14}}>Questions, corrections, data requests: <span style={{borderBottom:'1px solid currentColor'}}>data@example.gov.uk</span></div>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared story card hero (tiny visual per story)
// ─────────────────────────────────────────────────────────────
function StoryHero({ kind }) {
  if (kind === 'trend') return <Spark data={ASYLUM_ANNUAL} width={220} height={62}/>;
  if (kind === 'bars') return (
    <svg width="220" height="62" style={{display:'block'}}>
      {[7850,5928,4310,3512,3180].map((v,i)=>(
        <rect key={i} x={i*44} y={62-v/150} width={34} height={v/150} fill="var(--accent)"/>
      ))}
    </svg>
  );
  if (kind === 'backlog') return <Spark data={BACKLOG} width={220} height={62} stroke="var(--accent-warn)"/>;
  if (kind === 'area') return (
    <Spark data={ASYLUM_ANNUAL.filter(d=>d.boats!=null).map(d=>({y:d.y,v:d.boats}))} width={220} height={62} stroke="var(--accent-2)"/>
  );
  if (kind === 'ring') return (
    <svg width="220" height="62" viewBox="0 0 220 62">
      <g transform="translate(30,31)">
        <circle r="22" fill="none" stroke="var(--bg-2)" strokeWidth="5"/>
        <circle r="22" fill="none" stroke="var(--accent)" strokeWidth="5"
          strokeDasharray={`${2*Math.PI*22}`}
          strokeDashoffset={2*Math.PI*22*(1-.47)}
          transform="rotate(-90)"/>
        <text textAnchor="middle" y="5" fontFamily="var(--serif)" fontSize="16" fill="var(--ink)" style={{fontVariantNumeric:'tabular-nums'}}>47%</text>
      </g>
      <text x="68" y="28" fontFamily="var(--serif)" fontSize="11" fill="var(--muted)" className="uc">Grant rate</text>
      <text x="68" y="46" fontFamily="var(--serif)" fontSize="12" fill="var(--ink-2)" style={{fontStyle:'italic'}}>up from 24% (2019)</text>
    </svg>
  );
  if (kind === 'map') return (
    <svg width="220" height="62" style={{display:'block'}}>
      {REGIONS.slice(0,12).map((r,i)=>(
        <rect key={i} x={i*18} y={62 - (r.v/15000)*56} width={14} height={(r.v/15000)*56} fill="var(--accent)" opacity={0.4 + (r.v/15000)*0.6}/>
      ))}
    </svg>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────
// "This week at the border" hero
//
// Auto-generated from BOATS_WEEKLY. Compares the latest week against
// the same week last year and against the five-year average for the
// same week-of-year, then computes a streak of consecutive weeks on
// the same side of that average. All copy is templated from those
// values — no number is hand-typed.
// ─────────────────────────────────────────────────────────────
function ThisWeekHero({ setRoute }) {
  const W = (typeof window !== 'undefined') ? window : {};
  const weekly = Array.isArray(W.BOATS_WEEKLY) ? W.BOATS_WEEKLY : [];
  if (!weekly.length) return null;
  const last = weekly[weekly.length - 1];

  const weDate = new Date(last.we + 'T00:00:00Z');
  const weStr = `${weDate.getUTCDate()} ${MONTHS_SHORT[weDate.getUTCMonth()]}`;
  const monthName = MONTHS_LONG[weDate.getUTCMonth()];

  const doy = (d) => {
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
    return Math.floor((d - start) / 86400000);
  };
  const lastDOY = doy(weDate);

  // For each prior year, find the closest week-ending within ±3 days of the same DOY.
  const sameWeekByYear = {};
  for (const r of weekly) {
    if (r.we === last.we) continue;
    const rd = new Date(r.we + 'T00:00:00Z');
    const yr = String(rd.getUTCFullYear());
    const rdoy = doy(rd);
    if (Math.abs(rdoy - lastDOY) > 3) continue;
    const cur = sameWeekByYear[yr];
    if (!cur || Math.abs(doy(new Date(cur.we + 'T00:00:00Z')) - lastDOY) > Math.abs(rdoy - lastDOY)) {
      sameWeekByYear[yr] = r;
    }
  }

  const lastYear = String(weDate.getUTCFullYear() - 1);
  const yoy = sameWeekByYear[lastYear];
  const yoyPct = (yoy && yoy.m > 0) ? Math.round((last.m - yoy.m) / yoy.m * 100) : null;

  const cutoff = weDate.getUTCFullYear() - 5;
  const priorVals = Object.entries(sameWeekByYear)
    .filter(([y]) => parseInt(y) >= cutoff && parseInt(y) < weDate.getUTCFullYear())
    .map(([_, r]) => r.m);
  const fiveYrAvg = priorVals.length >= 3 ? priorVals.reduce((a,b)=>a+b,0) / priorVals.length : null;
  const fiveYrPct = (fiveYrAvg != null) ? Math.round((last.m - fiveYrAvg) / Math.max(fiveYrAvg, 1) * 100) : null;

  // Streak: consecutive recent weeks on the same side of their own 5-year average.
  const streak = (() => {
    if (fiveYrAvg == null) return null;
    const sign = last.m >= fiveYrAvg ? 1 : -1;
    let n = 1;
    for (let i = weekly.length - 2; i >= 0 && i >= weekly.length - 16; i--) {
      const r = weekly[i];
      const rd = new Date(r.we + 'T00:00:00Z');
      const ryr = rd.getUTCFullYear();
      const rdoy = doy(rd);
      const priors = [];
      for (let yr = ryr - 5; yr < ryr; yr++) {
        const best = weekly.find(p => {
          if (p.we.slice(0, 4) !== String(yr)) return false;
          const pd = new Date(p.we + 'T00:00:00Z');
          return Math.abs(doy(pd) - rdoy) <= 3;
        });
        if (best) priors.push(best.m);
      }
      if (priors.length < 3) break;
      const avg = priors.reduce((a, b) => a + b, 0) / priors.length;
      const rSign = r.m >= avg ? 1 : -1;
      if (rSign !== sign) break;
      n++;
    }
    return { n, sign };
  })();

  const ord = (n) => ['','First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth'][n] || `${n}th`;
  const heroLine = (() => {
    const parts = [];
    if (streak && streak.n >= 2 && fiveYrAvg != null) {
      const dir = streak.sign > 0 ? 'above' : 'below';
      parts.push(`${ord(streak.n)} consecutive week ${dir} the five-year average for ${monthName}.`);
    } else if (fiveYrPct != null) {
      if (Math.abs(fiveYrPct) < 10) {
        parts.push(`Roughly in line with the five-year average for ${monthName}.`);
      } else {
        const dir = fiveYrPct > 0 ? 'above' : 'below';
        parts.push(`${Math.abs(fiveYrPct)}% ${dir} the five-year average for ${monthName}.`);
      }
    }
    if (last.p != null && last.p > 0 && last.m != null) {
      const tot = last.m + last.p;
      const arrivedShare = tot > 0 ? Math.round(last.m / tot * 100) : null;
      if (arrivedShare != null) {
        parts.push(`${last.p.toLocaleString('en-GB')} prevented on the French side — about ${arrivedShare}% of recorded attempts arrived.`);
      }
    }
    return parts.join(' ');
  })();

  // Sparkline: last 16 weeks with the 5-year-average drawn as a horizontal dashed line.
  const recent = weekly.slice(-16);
  const maxV = Math.max(...recent.map(r => r.m), fiveYrAvg || 0) * 1.1 || 1;
  const sparkW = 600, sparkH = 64, sparkPad = 4;
  const xAt = (i) => sparkPad + (i / Math.max(recent.length - 1, 1)) * (sparkW - 2 * sparkPad);
  const yAt = (v) => sparkH - sparkPad - (v / maxV) * (sparkH - 2 * sparkPad);
  const sparkPath = recent.map((r, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(r.m)}`).join(' ');
  const lastIdx = recent.length - 1;

  const arrow = (n) => n == null ? '' : n > 0 ? '▲' : n < 0 ? '▼' : '·';
  const colour = (n) => n == null ? 'var(--muted)' : (n > 0 ? 'var(--accent-warn)' : 'var(--accent-2)');

  return (
    <div style={{
      background:'var(--bg)', border:'1px solid var(--rule)', borderTop:'3px solid var(--accent-warn)',
      padding:'34px 36px 30px', position:'relative'
    }}>
      <div className="uc" style={{
        color:'var(--accent-warn)', display:'inline-block',
        paddingBottom:4, borderBottom:'1.5px solid var(--accent-warn)', marginBottom:18, fontWeight:500
      }}>This week at the border · week ending {weStr}</div>
      <div className="tnum" style={{
        fontSize:60, fontWeight:400, letterSpacing:-1.4, lineHeight:1, margin:'6px 0 8px',
        fontFamily:'var(--serif)', color:'var(--ink)'
      }}>{last.m.toLocaleString('en-GB')}</div>
      <div style={{
        fontFamily:'var(--mono)', fontSize:13, marginBottom:18, display:'flex', gap:14, flexWrap:'wrap', alignItems:'baseline'
      }}>
        {yoyPct != null && (
          <span style={{color:colour(yoyPct)}}>
            {arrow(yoyPct)} <b style={{fontWeight:500}}>{Math.abs(yoyPct)}%</b> vs same week {lastYear}
          </span>
        )}
        {fiveYrPct != null && (
          <span style={{color:colour(fiveYrPct)}}>
            ·  {arrow(fiveYrPct)} {Math.abs(fiveYrPct)}% vs five-year average
          </span>
        )}
      </div>
      {heroLine && (
        <p style={{
          fontSize:17, lineHeight:1.45, color:'var(--ink-2)', margin:'0 0 18px',
          fontStyle:'italic', textWrap:'pretty'
        }}>
          {heroLine}
          <span style={{
            display:'block', fontStyle:'normal', color:'var(--muted)',
            fontSize:11, fontFamily:'var(--mono)', marginTop:6, letterSpacing:'.04em'
          }}>BOATS_WEEKLY · auto-generated</span>
        </p>
      )}
      <svg width={sparkW} height={sparkH} viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none"
        style={{display:'block', width:'100%', height:64, marginBottom:14, borderBottom:'1px solid var(--rule)'}}>
        {fiveYrAvg != null && (
          <line x1={0} y1={yAt(fiveYrAvg)} x2={sparkW} y2={yAt(fiveYrAvg)}
            stroke="var(--rule-2)" strokeWidth="1" strokeDasharray="2 3"/>
        )}
        <path d={sparkPath} fill="none" stroke="var(--accent-warn)" strokeWidth="1.8"/>
        <circle cx={xAt(lastIdx)} cy={yAt(recent[lastIdx].m)} r="4" fill="var(--accent-warn)"/>
      </svg>
      <div style={{display:'flex', gap:18, fontSize:13, flexWrap:'wrap'}}>
        <button onClick={() => setRoute({name:'dashboard'})}
          style={{background:'none', border:'none', color:'var(--accent)', borderBottom:'1px solid var(--rule-2)',
            paddingBottom:1, cursor:'pointer', fontFamily:'var(--serif)', fontSize:13}}>
          See seasonal pattern →
        </button>
        <button onClick={() => setRoute({name:'build'})}
          style={{background:'none', border:'none', color:'var(--accent)', borderBottom:'1px solid var(--rule-2)',
            paddingBottom:1, cursor:'pointer', fontFamily:'var(--serif)', fontSize:13}}>
          Open in Build →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// "Numbers in the news" band
//
// Reads window.NEWS_BAND (hand-curated weekly in
// data/news-band-data.js). Renders 3–4 figures being publicly argued
// about, each with a one-line clarification grounded in our data.
// Returns null if the global is missing or has no items.
// ─────────────────────────────────────────────────────────────
function NewsBand({ setRoute }) {
  const W = (typeof window !== 'undefined') ? window : {};
  const band = W.NEWS_BAND;
  if (!band || !Array.isArray(band.items) || !band.items.length) return null;
  const fmtUpdated = (() => {
    if (!band.updated) return null;
    const d = new Date(band.updated + 'T00:00:00Z');
    if (isNaN(d.getTime())) return band.updated;
    return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  })();
  const headline = band.fallback ? 'Numbers worth knowing' : <>Numbers <em style={{color:'var(--accent-warn)',fontStyle:'italic'}}>in the news</em></>;
  return (
    <section className="page-section" style={{maxWidth:1240,margin:'0 auto',padding:'36px 48px 8px',borderBottom:'1px solid var(--rule)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:18,gap:16,flexWrap:'wrap'}}>
        <h2 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,margin:0,letterSpacing:-0.2}}>{headline}</h2>
        <div className="uc" style={{color:'var(--muted)'}}>
          {band.fallback ? 'Evergreen denominators' : 'Curated · updated weekly'}
          {fmtUpdated && <span style={{marginLeft:10,color:'var(--muted-2)'}}>· {fmtUpdated}</span>}
        </div>
      </div>
      <div className="news-band-row" style={{display:'grid',gridTemplateColumns:`repeat(${band.items.length},1fr)`,gap:1,background:'var(--rule)',border:'1px solid var(--rule)'}}>
        {band.items.map((it, i) => (
          <button key={i}
            onClick={() => it.route && setRoute(it.route)}
            style={{background:'var(--bg)',border:'none',padding:'20px 22px',display:'flex',flexDirection:'column',gap:8,minHeight:170,cursor:it.route?'pointer':'default',textAlign:'left',transition:'background .12s',fontFamily:'inherit',color:'inherit'}}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-2)'}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--bg)'}}>
            <div className="uc" style={{color:'var(--muted)',fontSize:10}}>
              {it.glossTerm
                ? <Gloss term={it.glossTerm}>{it.kicker}</Gloss>
                : it.kicker}
            </div>
            <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:30,letterSpacing:-0.5,fontWeight:400,lineHeight:1,margin:'2px 0 6px',color:'var(--ink)'}}>{it.number}</div>
            <div style={{fontSize:13.5,lineHeight:1.45,color:'var(--ink-2)',textWrap:'pretty',flex:1}}>{it.context}</div>
            {it.source && (
              <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',letterSpacing:'.04em',marginTop:6}}>{it.source}</div>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Index view
// ─────────────────────────────────────────────────────────────
function IndexView({ setRoute }) {
  const featured = STORIES[0];
  const rest = STORIES.slice(1);

  return (
    <main className="fade-enter">
      {/* hero: this-week-at-the-border (left) + featured story aside (right) */}
      <section className="page-section" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 44px',borderBottom:'1px solid var(--rule)'}}>
        <div className="hero-grid" style={{display:'grid',gridTemplateColumns:'1.35fr 1fr',gap:56,alignItems:'start'}}>
          <ThisWeekHero setRoute={setRoute}/>
          <aside style={{paddingTop:8}}>
            <div className="uc" style={{color:'var(--muted)',paddingBottom:4,borderBottom:'1.5px solid var(--accent-2)',display:'inline-block',marginBottom:10}}>
              Featured story · {featured.kicker} · {featured.date}
            </div>
            <h1 style={{fontFamily:'var(--serif)',fontSize:34,lineHeight:1.1,letterSpacing:-0.4,margin:'12px 0 14px',fontWeight:400,color:'var(--ink)',textWrap:'balance'}}>
              <em style={{fontStyle:'italic',color:'var(--accent)'}}>{featured.title}</em>
            </h1>
            <p style={{fontSize:15.5,lineHeight:1.55,color:'var(--ink-2)',margin:'0 0 20px',textWrap:'pretty'}}>
              {featured.dek}
            </p>
            <div style={{display:'flex',gap:18,alignItems:'center',fontSize:13,color:'var(--muted)',flexWrap:'wrap'}}>
              <button onClick={()=>setRoute({name:'story',id:featured.id})}
                style={{background:'var(--accent)',color:'var(--bg)',padding:'9px 16px',fontSize:12.5,letterSpacing:0.04,fontFamily:'var(--serif)',border:'none',cursor:'pointer'}}>
                Read the story →
              </button>
              <span style={{fontFamily:'var(--mono)',fontSize:11,letterSpacing:'.05em'}}>{featured.author} · {featured.reading} read</span>
            </div>
          </aside>
        </div>
      </section>

      {/* Numbers in the news — hand-curated band, weekly */}
      <NewsBand setRoute={setRoute}/>

      {/* Key numbers strip — computed from latest globals */}
      <section className="page-section" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px',borderBottom:'1px solid var(--rule)'}}>
        {(() => {
          const fmt = n => n == null ? '—' : Math.round(n).toLocaleString('en-GB');
          const pct = (a,b) => (!a || !b) ? null : (a - b) / b * 100;
          const pctLabel = p => p == null ? '' : (p >= 0 ? '↑ ' : '↓ ') + Math.abs(p).toFixed(1) + '%';
          const aa = ASYLUM_ANNUAL;
          const last = aa[aa.length - 1] || {};
          const prev = aa[aa.length - 2] || {};
          const yearNow = last.y;
          // Applications
          const apps = last.v, appsPrev = prev.v;
          // Grant rate (point-in-time from DECISIONS_LATEST)
          const W = (typeof window !== 'undefined') ? window : {};
          const dec = W.DECISIONS_LATEST || [];
          const decTotal = dec.reduce((s,r)=>s+(r.v||0),0);
          const granted = dec.filter(r=>/Grant/i.test(r.label)).reduce((s,r)=>s+(r.v||0),0);
          const grantRate = decTotal ? granted / decTotal : null;
          // Backlog
          const bl = W.BACKLOG_LATEST || [];
          const blLast = bl[bl.length - 1] || {};
          const blPrev = bl[bl.length - 2] || {};
          const backlog = blLast.v, backlogDelta = pct(blLast.v, blPrev.v);
          // Boats
          const boats = last.boats, boatsPrev = prev.boats;
          // Resettlement — sum latest-year column across schemes
          const res = W.RESETTLEMENT_SERIES || [];
          const resYear = String(yearNow);
          const resTotal = res.reduce((s,r)=>s+(r[resYear]||0), 0);
          const strip = [
            { l:'Applications', v: fmt(apps), d: apps && appsPrev ? `${pctLabel(pct(apps,appsPrev))} vs ${prev.y}` : ''},
            { l:'Grant rate', v: grantRate == null ? '—' : Math.round(grantRate*100) + '%', d: `initial decisions, ${yearNow}` },
            { l:'Backlog', v: fmt(backlog), d: backlogDelta != null ? `${pctLabel(backlogDelta)} in one year` : ''},
            { l:'Small-boat arrivals', v: fmt(boats), d: boats && boatsPrev ? `${pctLabel(pct(boats,boatsPrev))} vs ${prev.y}` : ''},
            { l:'Resettled', v: fmt(resTotal), d: `across ${res.length} schemes`},
          ];
          return (<>
            <div className="uc" style={{marginBottom:18,color:'var(--muted)'}}>At a glance · {yearNow}</div>
            <div className="stat-strip-5" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:0,borderTop:'1px solid var(--rule)',borderBottom:'1px solid var(--rule)'}}>
              {strip.map((s,i)=>(
                <div key={i} style={{padding:'22px 24px',borderRight: i<4?'1px solid var(--rule)':'none'}}>
                  <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>{s.l}</div>
                  <div style={{fontFamily:'var(--serif)',fontSize:32,fontWeight:400,color:'var(--ink)',letterSpacing:-0.3,lineHeight:1}} className="tnum">{s.v}</div>
                  <div style={{fontSize:12.5,color:'var(--muted)',marginTop:8,fontStyle:'italic'}}>{s.d}</div>
                </div>
              ))}
            </div>
          </>);
        })()}
      </section>

      {/* Story grid — asymmetric: 2 medium on top row, 3 compact below */}
      <section className="page-section" style={{maxWidth:1240,margin:'0 auto',padding:'48px 48px 80px'}}>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:24}}>
          <h2 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,margin:0,letterSpacing:-0.2}}>Recent stories</h2>
          <div className="uc" style={{color:'var(--muted)'}}>Showing {rest.length} {rest.length === 1 ? 'story' : 'stories'}</div>
        </div>
        {(() => {
          const medium = rest.slice(0, 2);
          const compact = rest.slice(2);
          const cardHover = {
            onMouseEnter:(e)=>{e.currentTarget.style.background='var(--bg-2)'},
            onMouseLeave:(e)=>{e.currentTarget.style.background='var(--bg)'},
          };
          return (<div style={{display:'flex',flexDirection:'column',gap:1,background:'var(--rule)',border:'1px solid var(--rule)'}}>
            {/* Medium row — 2 cards, larger type, full story hero */}
            <div className="card-grid-2" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:1,background:'var(--rule)'}}>
              {medium.map(s=>(
                <button key={s.id} onClick={()=>setRoute({name:'story',id:s.id})} {...cardHover}
                  style={{background:'var(--bg)',padding:'32px 36px 28px',textAlign:'left',border:'none',cursor:'pointer',transition:'background .15s',display:'flex',flexDirection:'column',gap:18,minHeight:320}}>
                  <div className="uc" style={{color:'var(--accent-warn)',paddingBottom:4,borderBottom:'1.5px solid var(--accent-warn)',display:'inline-block'}}>{s.kicker}</div>
                  <div style={{fontFamily:'var(--serif)',fontSize:28,lineHeight:1.1,letterSpacing:-0.3,color:'var(--ink)',textWrap:'balance'}}>{s.title}</div>
                  <div style={{fontSize:15,lineHeight:1.55,color:'var(--ink-2)',textWrap:'pretty',flex:1}}>{s.dek}</div>
                  <div style={{borderTop:'1px solid var(--rule)',paddingTop:14,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                    <div className="uc" style={{color:'var(--muted)'}}>{s.date} · {s.reading}</div>
                    <StoryHero kind={s.hero}/>
                  </div>
                </button>
              ))}
            </div>
            {/* Compact row — 3 cards, tighter type, no hero glyph */}
            <div className="card-grid-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:'var(--rule)'}}>
              {compact.map(s=>(
                <button key={s.id} onClick={()=>setRoute({name:'story',id:s.id})} {...cardHover}
                  style={{background:'var(--bg)',padding:'22px 24px 20px',textAlign:'left',border:'none',cursor:'pointer',transition:'background .15s',display:'flex',flexDirection:'column',gap:12,minHeight:180}}>
                  <div className="uc" style={{color:'var(--muted)'}}>{s.kicker}</div>
                  <div style={{fontFamily:'var(--serif)',fontSize:17,lineHeight:1.2,letterSpacing:-0.15,color:'var(--ink)',textWrap:'balance'}}>{s.title}</div>
                  <div style={{fontSize:13,lineHeight:1.45,color:'var(--ink-2)',textWrap:'pretty',flex:1}}>{s.dek}</div>
                  <div className="uc" style={{color:'var(--muted-2)',fontSize:10.5}}>{s.date} · {s.reading}</div>
                </button>
              ))}
            </div>
          </div>);
        })()}
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Back-to-top — fixed bottom-right button, appears after scrolling
// past ~600px. Mounted only on the long pages (Dashboard, Atlas)
// by root.jsx so it doesn't clutter shorter views.
// ─────────────────────────────────────────────────────────────
function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      className="back-to-top-btn"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position:'fixed', right:24, bottom:24, zIndex:80,
        width:44, height:44, borderRadius:'50%',
        border:'1px solid var(--rule)', background:'var(--bg)',
        color:'var(--ink)', cursor:'pointer',
        boxShadow:'0 6px 18px rgba(0,0,0,0.12)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'var(--serif)', fontSize:18, lineHeight:1,
      }}>
      <span aria-hidden="true" style={{display:'inline-block',transform:'translateY(-1px)'}}>↑</span>
    </button>
  );
}

Object.assign(window, { Header, SearchModal, MethodologyDrawer, IndexView, BackToTop, TWEAK_DEFAULTS });
