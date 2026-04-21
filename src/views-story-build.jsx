// views-story-build.jsx — Story view (deep narrative + charts) and Build-your-own view

const { useState: uS2, useMemo: uM2, useEffect: uE2 } = React;

// ─────────────────────────────────────────────────────────────
// Story view
// ─────────────────────────────────────────────────────────────
function StoryView({ id, setRoute, onMethod }) {
  const story = STORIES.find(s => s.id === id) || STORIES[0];
  const [range, setRange] = uS2([2014, DATA_MAX_YEAR]);
  const [mode, setMode] = uS2('line'); // line | bar
  const [compareOn, setCompareOn] = uS2(true);

  return (
    <main className="fade-enter" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 100px'}}>
      {/* breadcrumb */}
      <div style={{fontSize:12.5,color:'var(--muted)',marginBottom:24}} className="uc">
        <span style={{cursor:'pointer'}} onClick={()=>setRoute({name:'index'})}>Stories</span>
        <span style={{margin:'0 10px'}}>/</span>
        <span>{story.kicker}</span>
      </div>

      {/* story header */}
      <header style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:72,borderBottom:'1px solid var(--rule)',paddingBottom:36,marginBottom:40}}>
        <div>
          <div className="uc" style={{color:'var(--accent-warn)',marginBottom:14,display:'inline-block',paddingBottom:5,borderBottom:'2px solid var(--accent-warn)'}}>{story.kicker} · Story</div>
          <h1 style={{fontFamily:'var(--serif)',fontSize:54,lineHeight:1.02,letterSpacing:-0.6,fontWeight:400,margin:'0 0 22px',textWrap:'balance',color:'var(--ink)'}}>
            The <em style={{fontStyle:'italic',color:'var(--accent)'}}>long tail</em> of the 2022 surge
          </h1>
          <p style={{fontSize:19,lineHeight:1.5,color:'var(--ink-2)',margin:0,textWrap:'pretty',maxWidth:640}}>
            UK asylum applications peaked at 84,425 in 2023 — the highest since the modern series began in 1979 — before easing marginally in 2024. But the composition of who is claiming, and who is being granted protection, has shifted profoundly.
          </p>
        </div>
        <aside style={{fontSize:12.5,color:'var(--muted)',borderLeft:'1px solid var(--rule)',paddingLeft:32,display:'flex',flexDirection:'column',gap:14}}>
          <div><span className="uc" style={{display:'block',marginBottom:4}}>By</span>Data team, Home Office</div>
          <div><span className="uc" style={{display:'block',marginBottom:4}}>Published</span>{story.date}</div>
          <div><span className="uc" style={{display:'block',marginBottom:4}}>Reading time</span>{story.reading}</div>
          <div style={{display:'flex',gap:14,marginTop:8,paddingTop:14,borderTop:'1px dotted var(--rule-2)'}}>
            <button className="ulh" style={{fontSize:12.5,color:'var(--accent)'}}>Share ↗</button>
            <button className="ulh" style={{fontSize:12.5,color:'var(--accent)'}}>Download ↓</button>
            <button className="ulh" onClick={onMethod} style={{fontSize:12.5,color:'var(--accent)'}}>Method</button>
          </div>
        </aside>
      </header>

      {/* body — grid: narrative left, chart right */}
      <article style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:72,alignItems:'start'}}>
        {/* narrative column */}
        <div style={{fontFamily:'var(--serif)',fontSize:16.5,lineHeight:1.65,color:'var(--ink-2)'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:52,lineHeight:0.9,float:'left',marginRight:10,marginTop:6,color:'var(--accent)',fontWeight:400}}>T</div>
          <p style={{margin:'0 0 20px',textWrap:'pretty'}}>he British asylum system receives claims from people who have reached the UK and are asking to be recognised as refugees. For most of the past forty years the number of claims has moved in a narrow band — between 20,000 and 40,000 a year — with two striking departures.</p>
          <p style={{margin:'0 0 20px',textWrap:'pretty'}}>The first came in the early 2000s, peaking above 84,000 in 2002 and triggering a decade of policy change. The second is the one we are in now. Between 2020 and 2023, annual applications nearly tripled, driven by a combination of the post-Covid rebound, the collapse of Afghanistan, and a sharp increase in arrivals by small boat across the Channel.</p>
          <h3 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-0.1,margin:'36px 0 12px',color:'var(--ink)'}}>A tale of two spikes</h3>
          <p style={{margin:'0 0 20px',textWrap:'pretty'}}>The chart on the right compares the two surges of the last twenty-five years. What's different this time isn't the height of the peak — it's the speed of the climb. In 2002 applications plateaued gently; in 2023 they tripled in three years.</p>
          <h3 style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-0.1,margin:'36px 0 12px',color:'var(--ink)'}}>The 2024 dip</h3>
          <p style={{margin:'0 0 20px',textWrap:'pretty'}}>Provisional figures for 2024 show the first annual fall in five years — down 4.3% to 80,782. Officials attribute most of the decline to enhanced processing of <em>inadmissible</em> claims rather than a genuine fall in arrivals. Small-boat arrivals themselves rose 25% year-on-year.</p>
          <blockquote style={{margin:'24px 0',padding:'0 0 0 22px',borderLeft:'2px solid var(--accent)',fontFamily:'var(--serif)',fontSize:18,lineHeight:1.45,fontStyle:'italic',color:'var(--ink)'}}>
            "The 2024 figure looks less like a turning point and more like a pause." — Senior analyst, Migration Observatory
          </blockquote>
        </div>

        {/* chart column — sticky on large screens */}
        <div style={{position:'sticky',top:96}}>
          {/* controls */}
          <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:18,flexWrap:'wrap'}}>
            <div className="seg">
              <button className={mode==='line'?'on':''} onClick={()=>setMode('line')}>Line</button>
              <button className={mode==='bar'?'on':''} onClick={()=>setMode('bar')}>Bar</button>
            </div>
            <div style={{flex:1,minWidth:180}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11}} className="uc">
                <span style={{color:'var(--muted)'}}>From {range[0]}</span>
                <span style={{color:'var(--muted)'}}>to {range[1]}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center',marginTop:6}}>
                <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[0]} onChange={e=>setRange([Math.min(+e.target.value, range[1]-1), range[1]])}/>
                <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[1]} onChange={e=>setRange([range[0], Math.max(+e.target.value, range[0]+1)])}/>
              </div>
            </div>
            <label className="chk" style={{fontSize:12.5,color:'var(--muted)'}}>
              <input type="checkbox" checked={compareOn} onChange={e=>setCompareOn(e.target.checked)}/>
              Compare small-boat arrivals
            </label>
          </div>

          <div style={{background:'var(--bg-2)',padding:'24px 28px',border:'1px solid var(--rule)'}}>
            {mode === 'line' ? (
              <LineChart
                data={ASYLUM_ANNUAL}
                yearRange={range}
                title="Asylum applications, UK"
                subtitle={`Figure 01 · ${range[0]}–${range[1]}`}
                source="Home Office · ASY_D01"
                annotations={[
                  range[0] <= 2023 && range[1] >= 2023 && { y: 2023, label: '84,425', dx: -80, dy: -14 },
                  range[0] <= 2020 && range[1] >= 2020 && { y: 2020, label: 'Covid', dx: -46, dy: 44 },
                ].filter(Boolean)}
                caption="Main applicants only. Provisional for 2024."
                width={720} height={340}
              />
            ) : (
              <BarChart
                data={ASYLUM_ANNUAL.filter(d => d.y >= range[0] && d.y <= range[1]).map(d=>({name:String(d.y), v:d.v}))}
                width={720} height={360}
              />
            )}
          </div>

          {compareOn && (
            <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
              <LineChart
                data={ASYLUM_ANNUAL.map(d=>({y:d.y,v:d.boats}))}
                yearRange={range}
                title="Small-boat arrivals, UK"
                subtitle={`Figure 02 · ${range[0]}–${range[1]}`}
                stroke="var(--accent-warn)"
                source="Home Office · IRR_D01"
                caption="Border Force-recorded arrivals by small boat across the Channel. Series begins 2018; figures for earlier years are zero by definition."
                width={720} height={220}
              />
            </div>
          )}

          {/* related figure — nationalities */}
          <div style={{background:'#fff',padding:'20px 28px',border:'1px solid var(--rule)',marginTop:16}}>
            <div style={{marginBottom:12}}>
              <div className="uc" style={{color:'var(--muted)',marginBottom:3}}>Figure 03 · 2020–2024</div>
              <div style={{fontSize:19,fontWeight:500,color:'var(--ink)',letterSpacing:-0.1}}>Top five nationalities</div>
            </div>
            <MultiLineChart years={NAT_SERIES.years} series={NAT_SERIES.series} width={720} height={280} breakY={[4000, 7000]}/>
            <div className="uc" style={{marginTop:14,color:'var(--muted-2)'}}>Source: Home Office · ASY_D01</div>
          </div>
        </div>
      </article>

      {/* more in this section */}
      <section style={{marginTop:72,paddingTop:36,borderTop:'1px solid var(--rule)'}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:18}}>More in this series</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:32}}>
          {STORIES.filter(s => s.id !== story.id).slice(0,3).map(s=>(
            <button key={s.id} onClick={()=>setRoute({name:'story',id:s.id})} style={{textAlign:'left',display:'flex',flexDirection:'column',gap:8}}>
              <div className="uc" style={{color:'var(--accent-warn)'}}>{s.kicker}</div>
              <div style={{fontFamily:'var(--serif)',fontSize:20,lineHeight:1.2,letterSpacing:-0.2,color:'var(--ink)'}}>{s.title}</div>
              <div style={{fontSize:13.5,color:'var(--ink-2)',lineHeight:1.5,textWrap:'pretty'}}>{s.dek}</div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Datasets browse view
// ─────────────────────────────────────────────────────────────
function DatasetsView({ setRoute }) {
  const [q, setQ] = uS2('');
  const [freq, setFreq] = uS2('All');
  const filtered = DATASETS.filter(d => {
    if (freq !== 'All' && d.freq !== freq) return false;
    if (q && !d.name.toLowerCase().includes(q.toLowerCase()) && !d.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <main className="fade-enter" style={{maxWidth:1240,margin:'0 auto',padding:'48px 48px 80px'}}>
      <div style={{marginBottom:28}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-gold)'}}>Datasets</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 14px'}}>Raw data, curated.</h1>
        <p style={{fontSize:17,color:'var(--ink-2)',maxWidth:640,margin:0,lineHeight:1.5}}>Eight quarterly and monthly datasets covering asylum, irregular migration, and resettlement. Every table is available as CSV, JSON, and Parquet.</p>
      </div>
      <div style={{display:'flex',gap:16,alignItems:'center',padding:'14px 0',borderTop:'1px solid var(--rule)',borderBottom:'1px solid var(--rule)',marginBottom:24}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter datasets…"
          style={{flex:1,border:'none',outline:'none',background:'transparent',fontFamily:'var(--serif)',fontSize:15,padding:'6px 0'}}/>
        <div className="seg">
          {['All','Quarterly','Monthly'].map(f=>(
            <button key={f} className={freq===f?'on':''} onClick={()=>setFreq(f)}>{f}</button>
          ))}
        </div>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
        <thead>
          <tr style={{textAlign:'left'}}>
            {['Code','Name','Rows','Updated','Frequency',''].map(h=>(
              <th key={h} className="uc" style={{fontWeight:500,color:'var(--muted)',padding:'12px 14px',borderBottom:'1px solid var(--rule)',textAlign:h==='Rows'?'right':'left'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(d=>(
            <tr key={d.code} style={{borderBottom:'1px solid var(--rule)',cursor:'pointer'}}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-2)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
              <td className="mono" style={{padding:'14px 14px',color:'var(--accent)',fontSize:12}}>{d.code}</td>
              <td style={{padding:'14px 14px',color:'var(--ink)'}}>{d.name}</td>
              <td className="tnum" style={{padding:'14px 14px',textAlign:'right',color:'var(--ink-2)'}}>{d.rows}</td>
              <td style={{padding:'14px 14px',color:'var(--muted)'}}>{d.updated}</td>
              <td style={{padding:'14px 14px',color:'var(--muted)',fontStyle:'italic'}}>{d.freq}</td>
              <td style={{padding:'14px 14px',textAlign:'right'}}>
                <span className="ulh" style={{color:'var(--accent)',fontSize:12.5}}>Explore →</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div style={{padding:'48px 0',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>No datasets match your filter.</div>}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Build-your-own chart view
// ─────────────────────────────────────────────────────────────
const _boatsW = () => (typeof BOATS_WEEKLY !== 'undefined' ? BOATS_WEEKLY : []);
const _boatsM = () => (typeof BOATS_MONTHLY !== 'undefined' ? BOATS_MONTHLY : []);
const _boatsD = () => (typeof BOATS_DAILY !== 'undefined' ? BOATS_DAILY : []);
const _annualFromWeekly = (key) => {
  const by = {};
  for (const row of _boatsW()) {
    if (row[key] == null) continue;
    const y = +row.we.slice(0,4);
    by[y] = (by[y] || 0) + row[key];
  }
  return Object.entries(by).map(([y,v])=>({y:+y, v})).sort((a,b)=>a.y-b.y);
};

const DATASET_OPTIONS = [
  { id: 'applications', label: 'Applications',         series: ASYLUM_ANNUAL.map(d=>({y:d.y, v:d.v})),     color: 'var(--accent)' },
  { id: 'boats',        label: 'Small-boat arrivals',  series: ASYLUM_ANNUAL.map(d=>({y:d.y, v:d.boats})), color: 'var(--accent-warn)', supportsGranularity: true },
  { id: 'backlog',      label: 'Backlog (pending)',    series: BACKLOG.map(d=>({y:d.y, v:d.v})),           color: 'var(--accent-2)' },
  { id: 'preventions',  label: 'Preventions',          series: _annualFromWeekly('p'),                      color: 'var(--accent-gold)', note: 'Preventions not reported before 2023 — earlier years are absent from this series, not zero.' },
  { id: 'interceptions',label: 'Interceptions',        series: _annualFromWeekly('e'),                      color: 'var(--muted-2)' },
  (() => {
    // Derive an "Other nationalities" series: total applications per year − sum of named top-5.
    const top5 = NAT_SERIES.series;
    const other = {
      name: 'Other nationalities',
      data: NAT_SERIES.years.map((y, idx) => {
        const total = ASYLUM_ANNUAL.find(d => d.y === y)?.v ?? 0;
        const named = top5.reduce((s, row) => s + row.data[idx], 0);
        return Math.max(0, total - named);
      }),
    };
    const seriesWithOther = [...top5, other];
    // Palette: five named nationalities use distinct accents; "Other" is muted so the named rows lead.
    const colors = [
      'var(--accent)', 'var(--accent-warn)', 'var(--accent-2)',
      'var(--accent-gold)', 'var(--ink-2)', 'var(--muted-2)',
    ];
    return {
      id: 'nationalities',
      label: 'Top 5 nationalities + other',
      render: 'multi',
      multi: { years: NAT_SERIES.years, series: seriesWithOther, colors },
      // flat series — year totals (all nationalities) — used when this option is a compare
      series: NAT_SERIES.years.map((y, idx) => ({
        y,
        v: seriesWithOther.reduce((s, row) => s + row.data[idx], 0),
      })),
      color: 'var(--accent-2)',
    };
  })(),
  {
    // Render-time series: the user picks any subset of the 187 nationalities
    // in NAT_FULL, and the chart pulls its data from there (annual snapshot)
    // or NAT_QUARTERLY (last 8 quarters, top-20 only) when available.
    id: 'nationalities_custom',
    label: 'Nationalities (pick any)',
    render: 'custom-multi',
    color: 'var(--accent)',
    supportsGranularity: ['annual', 'quarterly'],
    // Dummy series so the "Compare with" picker has something safe if this
    // option is picked there too (unlikely — it's filtered out below).
    series: [],
  },
  {
    // Grant rate per nationality over time (annual), from NAT_GRANT_ANNUAL.
    // The picker reuses selectedNats / natQuery state.
    id: 'grant_rate',
    label: 'Grant rate by nationality',
    render: 'grant-rate',
    color: 'var(--accent-2)',
    series: [],
  },
  // ── Asylum & immigration datasets ────────────────────────────
  { id: '__divider__', divider: true, label: 'Asylum & immigration' },
  {
    id: 'hotels',
    label: 'People in hotels (asylum accommodation)',
    series: (() => {
      const h = typeof HOTELS !== 'undefined' ? HOTELS : [];
      return h.map((d, i) => ({ y: i, v: d.persons_in_hotels, label: d.date }));
    })(),
    color: 'var(--accent-gold)',
    snapshot: true,
  },
  {
    id: 'resettlement',
    label: 'Resettlement arrivals by scheme',
    render: 'multi',
    color: 'var(--accent-2)',
    multi: (() => {
      const sd   = typeof RESETTLEMENT_SERIES !== 'undefined' ? RESETTLEMENT_SERIES : [];
      const meta = typeof RESETTLEMENT_META   !== 'undefined' ? RESETTLEMENT_META   : {};
      const years = meta.years ?? [];
      const colors = ['var(--accent)','var(--accent-warn)','var(--accent-2)','var(--accent-gold)','var(--ink-2)','var(--muted-2)'];
      return {
        years,
        series: sd.map(s => ({ name: s.name, data: years.map(y => s[String(y)] ?? 0) })),
        colors,
      };
    })(),
    series: [],
  },
  {
    id: 'returns',
    label: 'Returns by nationality (top 20)',
    render: 'returns-detail',
    stackData: (() => {
      const ret = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
      const top = ret.slice(0, 20);
      const year = typeof RETURNS_META !== 'undefined' ? RETURNS_META.year : null;
      return {
        labels: top.map(r => r.name),
        series: [
          { name: 'Enforced',  data: top.map(r => r.enforced),  color: 'var(--accent-warn)' },
          { name: 'Voluntary', data: top.map(r => r.voluntary), color: 'var(--accent-gold)' },
        ],
        year,
      };
    })(),
    series: (() => {
      const ret = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
      return ret.slice(0, 20).map((d, i) => ({ y: i, v: d.total, label: d.name }));
    })(),
    color: 'var(--accent-warn)',
    snapshot: true,
  },
  {
    id: 'age_disputes',
    label: 'Age disputes by nationality',
    series: (() => {
      const ad = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];
      return ad.filter(d => d.raised > 0).slice(0, 20).map((d, i) => ({ y: i, v: d.raised, label: d.name }));
    })(),
    color: 'var(--accent-2)',
    snapshot: true,
  },
];

const GRANULARITIES = ['daily','weekly','monthly','quarterly','annual'];

function getGranularSeries(opt, gran) {
  if (gran === 'annual' || !opt.supportsGranularity) return opt.series;
  if (opt.id !== 'boats') return opt.series;
  if (gran === 'monthly') return _boatsM().map((d,i)=>({y:i, v:d.m, label:d.month}));
  if (gran === 'weekly')  return _boatsW().map((d,i)=>({y:i, v:d.m, label:d.we}));
  if (gran === 'daily')   return _boatsD().map((d,i)=>({y:i, v:d.m, label:d.d}));
  if (gran === 'quarterly') {
    const by = {};
    for (const r of _boatsM()) {
      const [yr, mon] = r.month.split('-').map(Number);
      const q = `${yr}Q${Math.ceil(mon/3)}`;
      by[q] = (by[q] || 0) + r.m;
    }
    return Object.entries(by).map(([q,v],i)=>({y:i, v, label:q}));
  }
  return opt.series;
}

function BuildView({ setRoute }) {
  const [ds, setDs] = uS2('applications');
  const [overlays, setOverlays] = uS2(['boats']);
  const [chartType, setChartType] = uS2('line');
  const [range, setRange] = uS2([2018, DATA_MAX_YEAR]);
  const [overlaySingleChart, setOverlaySingleChart] = uS2(true);
  const [showLabels, setShowLabels] = uS2(false);
  const [granularity, setGranularity] = uS2('annual');
  const [selectedNats, setSelectedNats] = uS2(['Pakistan','Afghanistan','Iran','Eritrea','Syria']);
  const [natQuery, setNatQuery] = uS2('');

  // Prune the primary dataset from the overlay list if the user switches to it.
  uE2(() => { setOverlays(os => os.filter(id => id !== ds)); }, [ds]);

  const prim = DATASET_OPTIONS.find(o => o.id === ds);
  const isMultiPrim = prim.render === 'multi';
  const isCustomNat = prim.render === 'custom-multi';
  const isGrantRate = prim.render === 'grant-rate';
  const isReturnsDetail = prim.render === 'returns-detail';

  const disabledTypes = uM2(() => {
    const s = new Set();
    if (prim.snapshot) { s.add('line'); s.add('area'); s.add('scatter'); }
    if (isReturnsDetail || isMultiPrim) s.add('stacked');
    return s;
  }, [prim, isReturnsDetail, isMultiPrim]);

  uE2(() => { if (disabledTypes.has(chartType)) setChartType('bar'); }, [chartType, disabledTypes]);

  const overlayOpts = (!isMultiPrim && !isCustomNat && !isGrantRate)
    ? overlays.map(id => DATASET_OPTIONS.find(o => o.id === id)).filter(o => o && !o.divider && !o.snapshot && o.render !== 'multi' && o.render !== 'custom-multi' && o.id !== ds)
    : [];
  // sec kept for bar/stacked chart-type code paths that still render a single secondary.
  const sec = overlayOpts[0] ?? null;
  const granList = Array.isArray(prim.supportsGranularity) ? prim.supportsGranularity : (prim.supportsGranularity ? GRANULARITIES : null);
  const supportsGran = !isMultiPrim && !!granList;
  const effGran = supportsGran ? (granList.includes(granularity) ? granularity : granList[0]) : 'annual';
  const isAnnual = effGran === 'annual';

  const primData = (isCustomNat || isGrantRate) ? [] : getGranularSeries(prim, effGran);
  const secData  = sec ? sec.series : null;

  // Custom-nationalities picker data derived from NAT_FULL (any of 187) +
  // NAT_QUARTERLY (the subset that has multi-quarter data).
  const natFullRows = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const natFullYear = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META.year : null;
  const natQ = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  const natQNames = uM2(() => new Set((natQ?.series || []).map(s => s.name)), [natQ]);
  // NAT_GRANT_ANNUAL for the grant-rate picker.
  const natGrant = typeof NAT_GRANT_ANNUAL !== 'undefined' ? NAT_GRANT_ANNUAL : null;
  const natGrantNames = uM2(() => natGrant ? natGrant.series.map(s => s.name) : [], [natGrant]);
  const filteredNatNames = uM2(() => {
    const q = natQuery.trim().toLowerCase();
    const names = isGrantRate ? natGrantNames : natFullRows.map(r => r.name);
    if (!q) return names;
    return names.filter(n => n.toLowerCase().includes(q));
  }, [natFullRows, natGrantNames, natQuery, isGrantRate]);
  const toggleNat = (name) => setSelectedNats(sel =>
    sel.includes(name) ? sel.filter(n => n !== name) : [...sel, name]
  );

  // snapshot datasets use index-based x-values, not years — skip range filter.
  const primView = (isAnnual && !prim.snapshot) ? primData.filter(d=>d.y>=range[0]&&d.y<=range[1]) : primData;
  const secView  = (isAnnual && !prim.snapshot && secData) ? secData.filter(d=>d.y>=range[0]&&d.y<=range[1]) : secData;

  // Year axis + per-overlay series for MultiLineChart — only supported annual + line.
  const canOverlay = isAnnual && !prim.snapshot && overlayOpts.length > 0 && chartType === 'line';
  const overlayOn = overlaySingleChart && canOverlay;
  const overlayViews = overlayOpts.map(o => ({
    opt: o,
    data: isAnnual ? o.series.filter(d=>d.y>=range[0]&&d.y<=range[1]) : o.series,
  }));
  const overlayYears = overlayOn ? primView.map(d=>d.y) : [];

  const dailyWarn = effGran === 'daily' && primData.length > 1000;

  const OVERLAY_CAP = 6;
  const overlayCandidates = DATASET_OPTIONS
    .filter(o => o.id !== ds && !o.divider && !o.snapshot && o.render !== 'multi' && o.render !== 'custom-multi' && !overlays.includes(o.id));

  return (
    <main className="fade-enter" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 80px'}}>
      <div style={{marginBottom:28}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-2)'}}>Build a chart</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 14px'}}>Make your own.</h1>
        <p style={{fontSize:17,color:'var(--ink-2)',maxWidth:640,margin:0,lineHeight:1.5}}>Pick a dataset, a time range, and a chart type. Export as an image or embed it in your own article.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:40,alignItems:'start'}}>
        {/* controls */}
        <aside style={{position:'sticky',top:96,border:'1px solid var(--rule)',padding:'24px 26px',background:'#fff',maxHeight:'calc(100vh - 120px)',overflowY:'auto'}}>
          <div style={{marginBottom:22}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:8}}>1 · Primary dataset</div>
            <div style={{maxHeight:260,overflowY:'auto',marginRight:-6,paddingRight:6}}>
              {DATASET_OPTIONS.map(o => o.divider ? (
                <div key={o.id} style={{fontSize:10,textTransform:'uppercase',letterSpacing:0.08,color:'var(--muted)',fontWeight:500,padding:'8px 0 4px',marginTop:4,borderTop:'1px solid var(--rule-2)'}}>
                  {o.label}
                </div>
              ) : (
                <label key={o.id} className="chk" style={{display:'flex',padding:'6px 0',fontSize:14}}>
                  <input type="radio" name="ds" checked={ds===o.id} onChange={()=>setDs(o.id)} style={{appearance:'auto',width:14,height:14}}/>
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {(isCustomNat || isGrantRate) && (
            <div style={{marginBottom:22,paddingTop:18,borderTop:'1px solid var(--rule)'}}>
              <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span>2 · Nationalities</span>
                <span style={{display:'flex',gap:10,alignItems:'baseline'}}>
                  {selectedNats.length > 0 && <button className="ulh" onClick={()=>setSelectedNats([])} style={{fontSize:11,color:'var(--muted)',textTransform:'none',letterSpacing:0}}>Clear all</button>}
                  <span style={{color:'var(--muted-2)'}} className="tnum">{selectedNats.length} picked</span>
                </span>
              </div>
              {selectedNats.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>
                  {selectedNats.map(n => (
                    <button key={n} onClick={()=>toggleNat(n)}
                      style={{fontSize:11,padding:'3px 8px 3px 10px',background:'var(--bg-2)',border:'1px solid var(--rule-2)',color:'var(--ink-2)',fontFamily:'var(--serif)'}}>
                      {n} <span style={{color:'var(--muted)',marginLeft:4}}>×</span>
                    </button>
                  ))}
                </div>
              )}
              <input type="search" placeholder={isGrantRate ? `Search ${natGrantNames.length} nationalities…` : 'Search 187 nationalities…'} value={natQuery}
                onChange={e=>setNatQuery(e.target.value)}
                style={{width:'100%',fontSize:12.5,padding:'6px 8px',fontFamily:'var(--serif)',border:'1px solid var(--rule-2)',background:'#fff',marginBottom:8}}/>
              <div style={{maxHeight:180,overflowY:'auto',marginRight:-6,paddingRight:6,borderTop:'1px dotted var(--rule-2)'}}>
                {filteredNatNames.length === 0 ? (
                  <div style={{fontSize:12,color:'var(--muted-2)',padding:'8px 0',fontStyle:'italic'}}>No matches.</div>
                ) : filteredNatNames.map(n => (
                  <label key={n} className="chk" style={{display:'flex',alignItems:'center',padding:'4px 0',fontSize:12.5,gap:6}}>
                    <input type="checkbox" checked={selectedNats.includes(n)} onChange={()=>toggleNat(n)} style={{appearance:'auto',width:13,height:13}}/>
                    <span style={{flex:1}}>{n}</span>
                    {natQNames.has(n) && <span title="Quarterly trend available" style={{fontSize:10,color:'var(--accent-2)',fontFamily:'var(--mono)'}}>Q</span>}
                  </label>
                ))}
              </div>
              <div style={{fontSize:11,color:'var(--muted-2)',marginTop:8,fontStyle:'italic',lineHeight:1.45}}>
                {isGrantRate
                  ? `${natGrantNames.length} nationalities with at least 200 decisions and 5 years of data. Grant rate = (refugee + humanitarian protection) / total initial decisions.`
                  : <>Rows marked <span className="mono" style={{color:'var(--accent-2)'}}>Q</span> have 8-quarter trend data (NAT_QUARTERLY, top-20). Others show a single annual point from {natFullYear ?? 'latest'}.</>
                }
              </div>
            </div>
          )}

          {!isMultiPrim && !isCustomNat && (
            <div style={{marginBottom:22,paddingTop:18,borderTop:'1px solid var(--rule)'}}>
              <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'flex',justifyContent:'space-between'}}>
                <span>2 · Overlays</span>
                <span style={{color:'var(--muted-2)'}} className="tnum">{overlays.length}/{OVERLAY_CAP}</span>
              </div>
              {overlays.length === 0 ? (
                <div style={{fontSize:12.5,color:'var(--muted-2)',fontStyle:'italic',padding:'4px 0 10px'}}>No overlays. Add one below to compare series.</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10}}>
                  {overlays.map(id => {
                    const o = DATASET_OPTIONS.find(x => x.id === id);
                    if (!o) return null;
                    return (
                      <div key={id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:13,padding:'5px 8px',background:'var(--bg-2)',border:'1px solid var(--rule-2)'}}>
                        <span style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{width:8,height:8,background:o.color,display:'inline-block'}}/>
                          {o.label}
                        </span>
                        <button onClick={()=>setOverlays(os=>os.filter(x=>x!==id))}
                          title="Remove overlay"
                          style={{color:'var(--muted)',fontSize:14,padding:'0 2px',background:'transparent'}}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {overlays.length < OVERLAY_CAP && overlayCandidates.length > 0 && (
                <select value=""
                  onChange={e=>{ if (e.target.value) setOverlays(os=>[...os, e.target.value]); }}
                  style={{width:'100%',fontSize:12.5,padding:'6px 8px',fontFamily:'var(--serif)',border:'1px solid var(--rule-2)',background:'#fff'}}>
                  <option value="">+ Add overlay…</option>
                  {overlayCandidates.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              )}
              {overlays.length > 0 && (
                <label className="chk" style={{fontSize:12.5,padding:'10px 0 2px',color: canOverlay ? 'var(--ink-2)' : 'var(--muted-2)'}}>
                  <input type="checkbox" checked={overlaySingleChart} disabled={!canOverlay} onChange={e=>setOverlaySingleChart(e.target.checked)}/>
                  Overlay on one chart
                </label>
              )}
              {overlays.length > 0 && !canOverlay && chartType !== 'line' && (
                <div style={{fontSize:11,color:'var(--muted-2)',marginTop:6,fontStyle:'italic'}}>Single-chart overlay needs line chart type.</div>
              )}
              {overlays.length > 0 && !isAnnual && (
                <div style={{fontSize:11,color:'var(--muted-2)',marginTop:6,fontStyle:'italic'}}>Overlays render only in annual granularity.</div>
              )}
            </div>
          )}

          <div style={{marginBottom:22,paddingTop:18,borderTop:'1px solid var(--rule)'}}>
            <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>3 · Chart type</div>
            <div className="seg" style={{display:'flex',flexWrap:'wrap'}}>
              {['line','bar','area','scatter','stacked'].map(t=>(
                <button key={t} className={chartType===t?'on':''} disabled={disabledTypes.has(t)}
                  onClick={()=>setChartType(t)}
                  style={{flex:'1 0 30%',textTransform:'capitalize',opacity:disabledTypes.has(t)?0.35:1,cursor:disabledTypes.has(t)?'not-allowed':'pointer'}}>{t}</button>
              ))}
            </div>
            <label className="chk" style={{fontSize:13,padding:'10px 0 2px'}}>
              <input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/>
              Show data labels
            </label>
          </div>

          {supportsGran && (
            <div style={{marginBottom:22,paddingTop:18,borderTop:'1px solid var(--rule)'}}>
              <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>4 · Granularity</div>
              <div className="seg" style={{display:'flex',flexWrap:'wrap'}}>
                {granList.map(g=>(
                  <button key={g} className={effGran===g?'on':''} onClick={()=>setGranularity(g)} style={{flex:'1 0 30%',textTransform:'capitalize',fontSize:11}}>{g}</button>
                ))}
              </div>
              {dailyWarn && <div style={{fontSize:11.5,color:'var(--accent-warn)',marginTop:8,fontStyle:'italic'}}>Daily view renders {primData.length.toLocaleString()} points.</div>}
              {isCustomNat && effGran === 'quarterly' && (
                <div style={{fontSize:11,color:'var(--muted-2)',marginTop:8,fontStyle:'italic',lineHeight:1.45}}>
                  Quarterly series is limited to the top-20 nationalities (NAT_QUARTERLY).
                </div>
              )}
            </div>
          )}

          {isAnnual && !prim.snapshot && (
            <div style={{marginBottom:22,paddingTop:18,borderTop:'1px solid var(--rule)'}}>
              <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>{supportsGran ? '5' : '4'} · Time range</div>
              <div style={{fontSize:12,color:'var(--muted)',display:'flex',justifyContent:'space-between'}} className="tnum">
                <span>{range[0]}</span><span>{range[1]}</span>
              </div>
              <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[0]} onChange={e=>setRange([Math.min(+e.target.value, range[1]-1), range[1]])}/>
              <input type="range" min={2014} max={DATA_MAX_YEAR} value={range[1]} onChange={e=>setRange([range[0], Math.max(+e.target.value, range[0]+1)])}/>
            </div>
          )}

          <div style={{paddingTop:18,borderTop:'1px solid var(--rule)',display:'flex',flexDirection:'column',gap:8}}>
            <button style={{background:'var(--accent)',color:'var(--bg)',padding:'10px 14px',fontSize:13,fontFamily:'var(--serif)'}}>↓ Download PNG</button>
            <button style={{background:'#fff',color:'var(--accent)',padding:'10px 14px',fontSize:13,fontFamily:'var(--serif)',border:'1px solid var(--accent)'}}>↓ Download CSV</button>
            <button style={{color:'var(--muted)',padding:'8px 14px',fontSize:13,fontFamily:'var(--serif)'}}>⎘ Copy embed code</button>
          </div>
        </aside>

        {/* preview */}
        <section>
          <div style={{background:'var(--bg-2)',padding:'32px 36px',border:'1px solid var(--rule)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:18,paddingBottom:14,borderBottom:'1px solid var(--rule-2)'}}>
              <div>
                <div className="uc" style={{color:'var(--muted)'}}>Preview · Figure A</div>
                <div style={{fontSize:22,fontFamily:'var(--serif)',fontWeight:500,letterSpacing:-0.2,color:'var(--ink)',marginTop:4}}>
                  {prim.label}
                  {overlayOpts.length > 0 && (
                    <span style={{color:'var(--muted)',fontWeight:400}}> {overlayOn?'+':'&'} {overlayOpts.map(o=>o.label).join(', ')}</span>
                  )}
                  <span style={{color:'var(--muted)',fontWeight:400,fontSize:16}} className="tnum"> · {isAnnual ? `${range[0]}–${range[1]}` : `${effGran}`}</span>
                </div>
              </div>
              <div className="uc" style={{color:'var(--muted)'}}>UK · {effGran.charAt(0).toUpperCase()+effGran.slice(1)}</div>
            </div>

            {/* Custom-nationalities picker: bar chart of latest-year applicants
                from NAT_FULL when chartType is bar; otherwise multi-line of
                last 8 quarters for selected countries that exist in NAT_QUARTERLY. */}
            {isGrantRate ? (
              selectedNats.length === 0 ? (
                <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:14}}>
                  Pick one or more nationalities from the list to see their grant-rate trend.
                </div>
              ) : !natGrant ? (
                <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:14}}>
                  Grant-rate data not loaded. Re-run scripts/build_nat_grant_annual.py and bundle.
                </div>
              ) : (() => {
                const usable = selectedNats.filter(n => natGrantNames.includes(n));
                const missing = selectedNats.filter(n => !natGrantNames.includes(n));
                const series = usable.map(n => {
                  const src = natGrant.series.find(s => s.name === n);
                  return { name: n, data: src?.data ?? [] };
                });
                const filteredYears = natGrant.years.filter(y => y >= range[0] && y <= range[1]);
                const yStart = natGrant.years.indexOf(filteredYears[0]);
                const yEnd = natGrant.years.indexOf(filteredYears[filteredYears.length - 1]);
                const filteredSeries = series.map(s => ({
                  ...s,
                  data: yEnd >= 0 ? s.data.slice(yStart, yEnd + 1) : s.data,
                }));
                const fmtPct = v => v != null ? `${Math.round(v * 100)}%` : '—';
                return (
                  <>
                    <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>Grant rate · {filteredYears[0]}–{filteredYears[filteredYears.length-1]}</div>
                    {missing.length > 0 && (
                      <div style={{fontSize:12,color:'var(--muted-2)',marginBottom:10,fontStyle:'italic'}}>
                        Not in grant-rate series (fewer than 200 decisions or 5 years): {missing.join(', ')}.
                      </div>
                    )}
                    {usable.length === 0 ? (
                      <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:14}}>
                        None of the selected nationalities have enough data for a grant-rate series.
                      </div>
                    ) : (
                      <MultiLineChart
                        years={filteredYears}
                        series={filteredSeries.map(s => ({
                          ...s,
                          data: s.data.map(v => v != null ? Math.round(v * 100) : null),
                        }))}
                        width={800} height={360}
                        showLabels={showLabels}
                        legend={usable.length > 1}
                      />
                    )}
                    <div style={{fontSize:12,color:'var(--muted-2)',marginTop:8,fontStyle:'italic'}}>
                      Y-axis: % of initial decisions resulting in refugee status or humanitarian protection. Source: Home Office · ASY_D02.
                    </div>
                  </>
                );
              })()
            ) : isCustomNat ? (
              selectedNats.length === 0 ? (
                <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:14}}>
                  Pick one or more nationalities from the list to render a chart.
                </div>
              ) : (effGran === 'annual' || !natQ) ? (
                (() => {
                  const rows = selectedNats
                    .map(n => ({ name: n, v: natFullRows.find(r => r.name === n)?.v ?? 0 }))
                    .sort((a,b) => b.v - a.v);
                  const note = (chartType !== 'bar') && (
                    <div style={{fontSize:12,color:'var(--muted-2)',marginBottom:10,fontStyle:'italic',lineHeight:1.45}}>
                      Annual nationalities data is a single latest-year snapshot, so <em>{chartType}</em> doesn't apply. Showing a bar chart. Switch to <em>quarterly</em> granularity for time-series chart types.
                    </div>
                  );
                  return (
                    <>
                      {note}
                      <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>Applicants · {natFullYear ?? 'latest year'}</div>
                      <BarChart data={rows} width={800} height={Math.max(220, rows.length*30+16)} color="var(--accent)"/>
                    </>
                  );
                })()
              ) : (
                (() => {
                  const usable = selectedNats.filter(n => natQNames.has(n));
                  const missing = selectedNats.filter(n => !natQNames.has(n));
                  const series = usable.map(n => {
                    const src = natQ.series.find(s => s.name === n);
                    return { name: n, data: src?.data ?? [] };
                  });
                  if (usable.length === 0) {
                    return (
                      <>
                        {missing.length > 0 && (
                          <div style={{fontSize:12,color:'var(--muted-2)',marginBottom:10,fontStyle:'italic'}}>
                            Not in quarterly series: {missing.join(', ')}. Switch to <em>annual</em> granularity for a snapshot of all selections.
                          </div>
                        )}
                        <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',fontSize:14}}>
                          None of the selected nationalities have quarterly data. Switch to <em>annual</em> granularity.
                        </div>
                      </>
                    );
                  }
                  let chart;
                  if (chartType === 'stacked') {
                    chart = (
                      <StackedColumnsMulti
                        years={natQ.quarters}
                        series={series}
                        width={800} height={380}
                        showLabels={showLabels}
                      />
                    );
                  } else if (chartType === 'bar') {
                    const latestIdx = natQ.quarters.length - 1;
                    const latestQ = natQ.quarters[latestIdx];
                    const rows = series
                      .map(s => ({ name: s.name, v: s.data[latestIdx] || 0 }))
                      .sort((a,b) => b.v - a.v);
                    chart = (
                      <>
                        <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>Latest quarter · {latestQ}</div>
                        <BarChart data={rows} width={800} height={Math.max(220, rows.length*30+16)} color="var(--accent)"/>
                      </>
                    );
                  } else {
                    // line / area / scatter — MultiLineChart is line-only; note the downgrade.
                    chart = (
                      <>
                        {(chartType === 'area' || chartType === 'scatter') && (
                          <div style={{fontSize:12,color:'var(--muted-2)',marginBottom:10,fontStyle:'italic'}}>
                            Multi-series <em>{chartType}</em> isn't yet available for nationalities — showing lines instead.
                          </div>
                        )}
                        <MultiLineChart
                          years={natQ.quarters}
                          series={series}
                          width={800} height={360}
                          showLabels={showLabels}
                          legend={usable.length > 1}
                        />
                      </>
                    );
                  }
                  return (
                    <>
                      {missing.length > 0 && (
                        <div style={{fontSize:12,color:'var(--muted-2)',marginBottom:10,fontStyle:'italic'}}>
                          Not in quarterly series: {missing.join(', ')}. Switch to <em>annual</em> granularity for a snapshot of all selections.
                        </div>
                      )}
                      {chart}
                    </>
                  );
                })()
              )
            ) : isReturnsDetail ? (
              (() => {
                const sd = prim.stackData;
                if (!sd || !sd.labels.length) return (
                  <div style={{padding:'40px 20px',textAlign:'center',color:'var(--muted)',fontStyle:'italic'}}>Returns data not loaded.</div>
                );
                return (
                  <>
                    <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>
                      Returns{sd.year ? ` · ${sd.year}` : ''} · enforced + voluntary · top 20 nationalities
                    </div>
                    <StackedColumnsMulti
                      years={sd.labels}
                      series={sd.series.map(s => ({name: s.name, data: s.data}))}
                      colors={sd.series.map(s => s.color)}
                      width={800} height={380}
                      showLabels={showLabels}
                    />
                    <div style={{fontSize:12,color:'var(--muted-2)',marginTop:8,fontStyle:'italic'}}>
                      {sd.year ? `${sd.year} data only` : 'Single-year snapshot'} — multi-year returns series not available.
                    </div>
                  </>
                );
              })()
            ) : isMultiPrim ? (
              chartType === 'stacked' ? (
                <StackedColumnsMulti
                  years={prim.multi.years}
                  series={prim.multi.series}
                  colors={prim.multi.colors}
                  width={800} height={380}
                  showLabels={showLabels}
                />
              ) : chartType === 'bar' ? (
                (() => {
                  const latestIdx = prim.multi.years.length - 1;
                  const latestYear = prim.multi.years[latestIdx];
                  const rows = prim.multi.series
                    .map(s => ({ name: s.name, v: s.data[latestIdx] || 0 }))
                    .sort((a,b) => b.v - a.v);
                  return (
                    <>
                      <div className="uc" style={{color:'var(--muted)',marginBottom:10}}>Latest year · {latestYear}</div>
                      <BarChart data={rows} width={800} height={Math.max(220, rows.length*30+16)} color="var(--accent-2)"/>
                    </>
                  );
                })()
              ) : (
                <MultiLineChart
                  years={prim.multi.years}
                  series={prim.multi.series}
                  width={800} height={360}
                  showLabels={showLabels}
                  legend={true}
                />
              )
            ) : overlayOn ? (
              <MultiLineChart
                years={overlayYears}
                series={[
                  { name: prim.label, data: primView.map(d=>d.v) },
                  ...overlayViews.map(({opt, data}) => {
                    const byYear = new Map(data.map(d=>[d.y, d.v]));
                    return { name: opt.label, data: overlayYears.map(y => byYear.has(y) ? byYear.get(y) : null) };
                  }),
                ]}
                width={800} height={340}
                showLabels={showLabels}
                legend={true}
              />
            ) : (chartType === 'line' || chartType === 'area' || chartType === 'scatter') ? (
              <>
                <LineChart
                  data={primView}
                  stroke={prim.color}
                  area={chartType==='area'}
                  showLine={chartType !== 'scatter'}
                  showLabels={showLabels}
                  width={800} height={340}
                  source="Home Office Immigration Statistics"
                />
                {overlayViews.map(({opt, data}) => (
                  <div key={opt.id} style={{marginTop:24,paddingTop:20,borderTop:'1px dotted var(--rule-2)'}}>
                    <LineChart
                      data={data}
                      stroke={opt.color}
                      area={chartType==='area'}
                      showLine={chartType !== 'scatter'}
                      showLabels={showLabels}
                      width={800} height={220}
                      title={opt.label} subtitle="Comparison series"
                    />
                  </div>
                ))}
              </>
            ) : chartType === 'bar' ? (
              <BarChart
                data={primView.map(d=>({name: String(d.label ?? d.y), v: d.v}))}
                width={800} height={Math.max(220, primView.length*30+16)}
                color={prim.color}
              />
            ) : chartType === 'stacked' ? (
              <StackedColumns
                data={primView.map((d,i)=>({
                  y: d.y, label: d.label ?? d.y,
                  a: d.v,
                  b: (secView && secView[i]) ? secView[i].v : 0,
                }))}
                series={[prim.label, sec ? sec.label : '']}
                colors={[prim.color, sec ? sec.color : 'var(--muted-2)']}
                width={800} height={360}
                showLabels={showLabels}
              />
            ) : null}
          </div>
          {prim.note && <div style={{fontSize:12,color:'var(--muted-2)',marginTop:10,fontStyle:'italic',maxWidth:680}}>{prim.note}</div>}
          <div className="uc" style={{color:'var(--muted-2)',marginTop:12}}>Charts update live as you change controls. Annotations and custom titles coming in the next release.</div>
        </section>
      </div>
    </main>
  );
}

Object.assign(window, { StoryView, DatasetsView, BuildView });
