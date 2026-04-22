// atlas-view.jsx — interactive world map with per-country detail panel.
// Surfaces applicants + grant rate + returns + age disputes for the selected
// country. Data comes from NAT_FULL / NAT_QUARTERLY / RETURNS_BY_NATIONALITY /
// AGE_DISPUTES_BY_NATIONALITY, all inlined at bundle time.

const { useState: uSA, useMemo: uMA } = React;

// Some globals use slightly different nationality strings than Natural
// Earth's country names. Map the known divergences so clicks resolve.
const ATLAS_NAME_ALIASES = {
  'United States of America': 'United States',
  'Czech Rep.': 'Czechia',
  'Bosnia and Herz.': 'Bosnia and Herzegovina',
  'Dem. Rep. Congo': 'Congo (Democratic Republic)',
  'Congo': 'Congo',
  'Côte d\'Ivoire': "Cote d'Ivoire",
  'Central African Rep.': 'Central African Republic',
  'Dominican Rep.': 'Dominican Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'Myanmar': 'Myanmar (Burma)',
  'Palestine': 'Palestine',
  'Lao PDR': 'Laos',
  'Korea': 'South Korea',
  'Dem. Rep. Korea': 'North Korea',
  'S. Sudan': 'South Sudan',
  'W. Sahara': 'Western Sahara',
  'Bahamas': 'Bahamas, The',
  'Gambia': 'Gambia, The',
  'Solomon Is.': 'Solomon Islands',
  'Fr. S. Antarctic Lands': null,
  'Antarctica': null,
};

function resolveNat(mapCountryName) {
  if (mapCountryName in ATLAS_NAME_ALIASES) return ATLAS_NAME_ALIASES[mapCountryName];
  return mapCountryName;
}

// ATLAS_PALETTE, atlasLerpHex and atlasPaletteColor are defined in charts.jsx
// (loaded before this file in the bundle) so that both the dashboard's
// WorldMapChoropleth and this top-level atlas view share the same 6-stop scale.

function pathCentroid(d) {
  const re = /[ML]\s*([-\d.]+)[,\s]([-\d.]+)/g;
  const pts = []; let m;
  while ((m = re.exec(d))) pts.push([+m[1], +m[2]]);
  if (!pts.length) return null;
  return [pts.reduce((s,p)=>s+p[0],0)/pts.length, pts.reduce((s,p)=>s+p[1],0)/pts.length];
}

// Bounding box of a path's M/L commands. Returns [xMin, yMin, w, h] or null.
// Used by flyToBox so large countries (Russia, Canada) fit fully inside the
// zoomed viewport — a fixed centroid zoom left them clipped.
function pathBBox(d) {
  const re = /[ML]\s*([-\d.]+)[,\s]([-\d.]+)/g;
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity, m, any = false;
  while ((m = re.exec(d))) {
    const x = +m[1], y = +m[2];
    if (x < xMin) xMin = x; if (y < yMin) yMin = y;
    if (x > xMax) xMax = x; if (y > yMax) yMax = y;
    any = true;
  }
  if (!any) return null;
  return [xMin, yMin, Math.max(1e-6, xMax - xMin), Math.max(1e-6, yMax - yMin)];
}

const ATLAS_METRIC_OPTIONS = [
  { id: 'applicants',   label: 'Applicants' },
  { id: 'grant_rate',   label: 'Grant rate' },
  { id: 'bivariate',    label: 'Applicants × grant rate' },
  { id: 'per_capita',   label: 'Per 100k displaced',
    needsData: () => (typeof UNHCR_POC_ANNUAL !== 'undefined' && UNHCR_POC_ANNUAL.length > 0) },
  { id: 'small_boats',  label: 'Small-boat arrivals',
    needsData: () => (typeof IRR_BOATS_BY_NATIONALITY !== 'undefined' && IRR_BOATS_BY_NATIONALITY.length > 0) },
  { id: 'returns',      label: 'Returns' },
  { id: 'age_disputes', label: 'Age disputes' },
];

// 3×3 bivariate palette: rows = applicants tercile (low→high),
// columns = grant-rate tercile (low→high). Cells combine accent-warn
// (low grants) → accent-gold (mid) → accent (high grants), with the
// mix percentage rising with applicant volume.
const BIVARIATE_PALETTE = [
  ['color-mix(in srgb, var(--accent-warn) 25%, var(--bg-2))',
   'color-mix(in srgb, var(--accent-gold) 25%, var(--bg-2))',
   'color-mix(in srgb, var(--accent) 25%, var(--bg-2))'],
  ['color-mix(in srgb, var(--accent-warn) 55%, var(--bg-2))',
   'color-mix(in srgb, var(--accent-gold) 55%, var(--bg-2))',
   'color-mix(in srgb, var(--accent) 55%, var(--bg-2))'],
  ['color-mix(in srgb, var(--accent-warn) 90%, var(--bg-2))',
   'color-mix(in srgb, var(--accent-gold) 90%, var(--bg-2))',
   'color-mix(in srgb, var(--accent) 90%, var(--bg-2))'],
];

// Terciles for a list of positive numbers. Returns [lowCut, midCut].
function terciles(values) {
  const arr = values.filter(v => v != null && v > 0).slice().sort((a,b)=>a-b);
  if (!arr.length) return [0, 0];
  const q = p => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];
  return [q(1/3), q(2/3)];
}
function tercileBin(v, cuts) {
  if (v == null || !(v > 0)) return null;
  if (v <= cuts[0]) return 0;
  if (v <= cuts[1]) return 1;
  return 2;
}

function AtlasChoropleth({ countryValues, selectedName, compareName, onSelect, metricLabel = 'applicants', bivariate=false, width=820, height=440, zoom }) {
  const worldMap = (typeof WORLD_MAP !== 'undefined') ? WORLD_MAP : null;
  if (!worldMap) {
    return <div style={{padding:40,color:'var(--muted)',fontStyle:'italic'}}>World map not loaded.</div>;
  }

  // Univariate branch: flat numeric values → sqrt-scaled ATLAS_PALETTE.
  // Bivariate branch: values are {v, grant} objects → 3×3 lookup.
  let fillFor;
  let titleFor;
  if (bivariate) {
    const vCuts = terciles(Object.values(countryValues).map(o => o?.v));
    const gCuts = terciles(Object.values(countryValues).map(o => o?.grant));
    fillFor = obj => {
      const vb = tercileBin(obj?.v, vCuts);
      const gb = tercileBin(obj?.grant, gCuts);
      if (vb == null || gb == null) return ATLAS_PALETTE[0];
      return BIVARIATE_PALETTE[vb][gb];
    };
    titleFor = (name, obj) => {
      if (!obj || !(obj.v > 0)) return name;
      const g = obj.grant != null ? `${Math.round(obj.grant * 100)}% grant rate` : 'no grant data';
      return `${name} — ${obj.v.toLocaleString()} applicants · ${g}`;
    };
  } else {
    const vMax = Math.max(...Object.values(countryValues), 1);
    fillFor = v => {
      if (!(v > 0)) return ATLAS_PALETTE[0];
      return atlasPaletteColor(Math.sqrt(v / vMax));
    };
    titleFor = (name, v) => `${name}${v > 0 ? ` — ${v.toLocaleString()} ${metricLabel}` : ''}`;
  }

  return (
    <div style={{position:'relative'}}>
      <svg width="100%" height={height} viewBox={zoom.viewBox} {...zoom.svgProps}
        style={{display:'block',background:'var(--map-bg, var(--bg-2))', ...zoom.svgProps.style}}>
        <g>
          {worldMap.map((c, i) => {
            const nat = resolveNat(c.name);
            const raw = nat ? countryValues[nat] : null;
            const v = bivariate ? raw : (raw ?? 0);
            const isSel = nat && nat === selectedName;
            const isCmp = nat && nat === compareName;
            return (
              <path key={`${c.iso || ''}-${c.name}-${i}`} d={c.d}
                fill={fillFor(v)}
                stroke={isSel ? '#e91e63' : isCmp ? '#f59e0b' : 'var(--rule-2)'} strokeWidth={isSel || isCmp ? 2.5 : 0.4}
                onClick={e => { if (!zoom.didDrag() && nat) onSelect(nat, e.shiftKey); }}
                style={{cursor: nat ? (zoom.zoomed ? 'grab' : 'pointer') : 'default'}}>
                <title>{titleFor(c.name, v)}</title>
              </path>
            );
          })}
        </g>
      </svg>
      <ZoomControls zoom={zoom}/>
    </div>
  );
}

function AtlasLegend({ countryValues, metricLabel = 'Applicants', bivariate=false }) {
  if (bivariate) {
    return (
      <div style={{marginTop:10,fontSize:11}}>
        <div className="uc" style={{fontSize:10.5,color:'var(--muted)',marginBottom:8}}>Applicants × grant rate</div>
        <div style={{display:'flex',gap:14,alignItems:'flex-end'}}>
          <div style={{display:'flex',flexDirection:'column-reverse',alignItems:'center',gap:2}}>
            {BIVARIATE_PALETTE.map((row, r) => (
              <div key={r} style={{display:'flex',gap:2}}>
                {row.map((c, i) => (
                  <div key={i} style={{width:22,height:22,background:c,border:'1px solid var(--rule-2)'}}/>
                ))}
              </div>
            ))}
            <div style={{marginTop:4,fontSize:10.5,color:'var(--muted-2)'}}>applicants →</div>
          </div>
          <div style={{fontSize:10.5,color:'var(--muted-2)',writingMode:'vertical-rl',transform:'rotate(180deg)',paddingBottom:4}}>↑ grant rate</div>
          <div style={{flex:1,fontSize:11,color:'var(--muted-2)',lineHeight:1.5,maxWidth:220}}>
            Countries split into low/mid/high terciles on each axis. Cells shade warmer where grants are rare and greener where grants are common; saturation rises with applicant volume.
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,fontSize:10.5,color:'var(--muted-2)'}}>
          <span style={{display:'inline-block',width:16,height:10,border:'2px solid #e91e63',background:'transparent'}}/>
          Selected
          <span style={{display:'inline-block',width:16,height:10,border:'2px solid #f59e0b',background:'transparent',marginLeft:10}}/>
          Compare
        </div>
      </div>
    );
  }
  const vMax = Math.max(...Object.values(countryValues), 1);
  const stops = ATLAS_PALETTE.length;
  // Breakpoint at each transition between adjacent colour stops (sqrt scale).
  const breakpoints = Array.from({length: stops - 1}, (_, i) =>
    Math.round(vMax * Math.pow((i + 1) / (stops - 1), 2))
  );
  const fmtTick = v => v >= 1000 ? `${Math.round(v/1000)}k` : v.toLocaleString();
  return (
    <div style={{marginTop:10,fontSize:11}}>
      <div className="uc" style={{fontSize:10.5,color:'var(--muted)',marginBottom:6}}>{metricLabel}</div>
      <div style={{position:'relative',maxWidth:360}}>
        <div style={{display:'flex',border:'1px solid var(--rule-2)'}}>
          {ATLAS_PALETTE.map((hex, i) => (
            <div key={hex} style={{flex:1,height:10,background:hex}}/>
          ))}
        </div>
        <div style={{position:'relative',height:14,marginTop:2}}>
          <span style={{position:'absolute',left:0,fontSize:10.5,color:'var(--muted-2)',fontVariantNumeric:'tabular-nums'}}>0</span>
          {breakpoints.map((v, i) => (
            <span key={i} style={{
              position:'absolute',
              left:`${((i + 1) / stops) * 100}%`,
              transform:'translateX(-50%)',
              fontSize:10.5,
              color:'var(--muted-2)',
              fontVariantNumeric:'tabular-nums',
            }}>{fmtTick(v)}</span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,fontSize:10.5,color:'var(--muted-2)'}}>
          <span style={{display:'inline-block',width:16,height:10,border:'2px solid #e91e63',background:'transparent'}}/>
          Selected
          <span style={{display:'inline-block',width:16,height:10,border:'2px solid #f59e0b',background:'transparent',marginLeft:10}}/>
          Compare (shift-click)
        </div>
      </div>
    </div>
  );
}

function AtlasKPI({ label, value, sub }) {
  return (
    <div style={{border:'1px solid var(--rule)',padding:'14px 16px',background:'#fff'}}>
      <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:4}}>{label}</div>
      <div className="tnum" style={{fontFamily:'var(--serif)',fontSize:26,fontWeight:500,color:'var(--ink)',letterSpacing:-0.3}}>{value}</div>
      {sub && <div style={{fontSize:11.5,color:'var(--muted-2)',marginTop:4}}>{sub}</div>}
    </div>
  );
}

// Gather the stat tuple for a single country name so AtlasDetail can
// render one or two countries through the same lookups.
function useCountryFacts(name) {
  return uMA(() => {
    if (!name) return null;
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    const returns = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
    const ageDisputes = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];
    const natQ = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
    const grantData = typeof NAT_GRANT_ANNUAL !== 'undefined' ? NAT_GRANT_ANNUAL : null;
    return {
      apps: natFull.find(r => r.name === name) || null,
      qRow: natQ?.series?.find(s => s.name === name) || null,
      ret: returns.find(r => r.name === name) || null,
      ad: ageDisputes.find(r => r.name === name) || null,
      grantSeries: grantData?.series?.find(s => s.name === name) || null,
    };
  }, [name]);
}

function AtlasDetail({ name, compareName, onClearCompare, setRoute }) {
  const [showLabels, setShowLabels] = uSA(false);
  if (!name) {
    return (
      <div style={{padding:'60px 24px',textAlign:'center',color:'var(--muted)',fontStyle:'italic',border:'1px dashed var(--rule-2)'}}>
        Click a country on the map to see details. Shift-click to compare.
      </div>
    );
  }
  const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
  const natMeta = typeof NAT_FULL_META !== 'undefined' ? NAT_FULL_META : null;
  const natQ = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  const returns = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
  const ageDisputes = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];

  const grantData = typeof NAT_GRANT_ANNUAL !== 'undefined' ? NAT_GRANT_ANNUAL : null;
  const grantSeries = grantData?.series?.find(s => s.name === name);

  const apps = natFull.find(r => r.name === name);
  const qRow = natQ?.series?.find(s => s.name === name);
  const ret = returns.find(r => r.name === name);
  const ad = ageDisputes.find(r => r.name === name);

  const grantPct = apps && apps.grant != null ? `${Math.round(apps.grant * 100)}%` : '—';
  const applicants = apps ? apps.v.toLocaleString() : '—';
  const retTotal = ret ? ret.total.toLocaleString() : '—';
  const adRaised = ad ? ad.raised.toLocaleString() : '—';

  const cmpFacts = useCountryFacts(compareName);
  const cmpApps = cmpFacts?.apps;
  const cmpRet = cmpFacts?.ret;
  const cmpAd = cmpFacts?.ad;

  return (
    <div style={{border:'1px solid var(--rule)',background:'var(--bg-2)',padding:'20px 22px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--rule-2)'}}>
        <h2 style={{fontFamily:'var(--serif)',fontSize:24,fontWeight:500,margin:0,letterSpacing:-0.3,color:'var(--ink)'}}>
          {name}
          {compareName ? <span style={{color:'var(--muted-2)',fontWeight:400}}> vs <span style={{color:'var(--accent-gold)'}}>{compareName}</span></span> : null}
        </h2>
        <div className="uc" style={{color:'var(--muted)',fontSize:10.5}}>Latest complete year</div>
      </div>
      {compareName ? (
        <div style={{marginBottom:14,padding:'10px 12px',border:'1px solid var(--rule-2)',background:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div className="uc" style={{fontSize:10.5,color:'var(--muted)'}}>Compare · {name} vs {compareName}</div>
            <button className="ulh" onClick={onClearCompare} style={{fontSize:10.5,color:'var(--muted)',letterSpacing:0,textTransform:'none'}}>Clear ×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12}}>
            <div style={{paddingRight:10,borderRight:'1px dotted var(--rule-2)'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:15,color:'var(--accent)',marginBottom:4}}>{name}</div>
              <div className="tnum">{apps ? apps.v.toLocaleString() : '—'} applicants · {apps && apps.grant != null ? `${Math.round(apps.grant*100)}% grant` : 'no grant'}</div>
              <div className="tnum" style={{color:'var(--muted-2)'}}>{ret ? ret.total.toLocaleString() : '—'} returns · {ad ? ad.raised.toLocaleString() : '—'} age disputes</div>
            </div>
            <div style={{paddingLeft:10}}>
              <div style={{fontFamily:'var(--serif)',fontSize:15,color:'var(--accent-gold)',marginBottom:4}}>{compareName}</div>
              <div className="tnum">{cmpApps ? cmpApps.v.toLocaleString() : '—'} applicants · {cmpApps && cmpApps.grant != null ? `${Math.round(cmpApps.grant*100)}% grant` : 'no grant'}</div>
              <div className="tnum" style={{color:'var(--muted-2)'}}>{cmpRet ? cmpRet.total.toLocaleString() : '—'} returns · {cmpAd ? cmpAd.raised.toLocaleString() : '—'} age disputes</div>
            </div>
          </div>
        </div>
      ) : null}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:16}}>
        <AtlasKPI label="Applicants" value={applicants} sub={natMeta ? `${natMeta.year} · NAT_FULL` : null}/>
        <AtlasKPI label="Grant rate" value={grantPct} sub="Initial decisions"/>
        <AtlasKPI label="Returns" value={retTotal} sub={ret ? `Enforced ${ret.enforced.toLocaleString()} · Voluntary ${ret.voluntary.toLocaleString()}` : null}/>
        <AtlasKPI label="Age disputes raised" value={adRaised} sub={ad ? `Resolved <18: ${ad.resolved_under_18}` : 'No data'}/>
      </div>
      {qRow ? (
        <div style={{background:'#fff',padding:'14px 16px',border:'1px solid var(--rule-2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div className="uc" style={{color:'var(--muted)',fontSize:10.5}}>Applicants · last 8 quarters</div>
            <button className="ulh" onClick={()=>setShowLabels(v=>!v)} style={{fontSize:10.5,color:'var(--muted)',letterSpacing:0,textTransform:'none'}}>
              {showLabels ? '◉' : '○'} Labels
            </button>
          </div>
          <MultiLineChart
            years={natQ.quarters}
            series={compareName && cmpFacts?.qRow
              ? [{ name, data: qRow.data }, { name: compareName, data: cmpFacts.qRow.data }]
              : [{ name, data: qRow.data }]}
            width={720} height={180}
            showLabels={showLabels}
            yLabel="applicants"
          />
        </div>
      ) : (
        <div style={{padding:'18px 20px',color:'var(--ink-2)',fontSize:13,lineHeight:1.55,background:'#fff',border:'1px dotted var(--rule-2)'}}>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:8,fontStyle:'normal'}}>No quarterly trend</div>
          The Home Office publishes a full quarterly time series only for the 20 nationalities with the largest applicant volumes. For other countries, only the most recent annual and quarterly totals are released, so a full trend can't be drawn here. Asylum applicants are not published at a daily or weekly granularity either, so the series can't be reconstructed from finer-grained data.
          {' '}
          <a href="https://www.gov.uk/government/statistical-data-sets/immigration-system-statistics-data-tables"
             target="_blank" rel="noopener"
             style={{color:'var(--accent)',textDecoration:'underline'}}>
            Immigration system statistics methodology
          </a>.
        </div>
      )}
      {grantSeries && grantData ? (
        <div style={{background:'#fff',padding:'14px 16px',border:'1px solid var(--rule-2)',marginTop:10}}>
          <div className="uc" style={{color:'var(--muted)',fontSize:10.5,marginBottom:8}}>
            Grant rate · {grantData.years[0]}–{grantData.years[grantData.years.length - 1]} · % of initial decisions granted
          </div>
          <MultiLineChart
            years={grantData.years}
            series={compareName && cmpFacts?.grantSeries
              ? [
                  { name, data: grantSeries.data.map(v => v != null ? Math.round(v * 100) : null) },
                  { name: compareName, data: cmpFacts.grantSeries.data.map(v => v != null ? Math.round(v * 100) : null) },
                ]
              : [{ name, data: grantSeries.data.map(v => v != null ? Math.round(v * 100) : null) }]}
            width={720} height={140}
            showLabels={showLabels}
            yLabel="%"
          />
        </div>
      ) : (
        <div style={{padding:'14px 16px',color:'var(--muted-2)',fontStyle:'italic',fontSize:13,background:'#fff',border:'1px dotted var(--rule-2)',marginTop:10}}>
          No grant-rate trend (fewer than 200 total decisions, or fewer than 5 years with data).
        </div>
      )}
      {!apps && !ret && !ad && (
        <div style={{marginTop:12,fontSize:12,color:'var(--muted-2)',fontStyle:'italic'}}>
          No applicants, returns, or age-dispute records for this country in the latest data.
        </div>
      )}
      <div style={{marginTop:14,display:'flex',gap:14,fontSize:12}}>
        <button className="ulh" style={{color:'var(--accent)'}}
          onClick={()=>setRoute({name:'build', preselectNat: name})}>
          Compare in Build a chart →
        </button>
      </div>
    </div>
  );
}

// Find the nationality with the largest quarter-on-quarter absolute delta
// in the latest quarter of NAT_QUARTERLY. Used as a default Atlas focus so
// first-time visitors land on the story most likely to be worth telling.
function topQoQMover() {
  const nq = typeof NAT_QUARTERLY !== 'undefined' ? NAT_QUARTERLY : null;
  if (!nq || !nq.series || !nq.series.length) return null;
  let best = null;
  let bestDelta = -Infinity;
  for (const s of nq.series) {
    const d = s.data;
    if (!d || d.length < 2) continue;
    const last = d[d.length - 1];
    const prev = d[d.length - 2];
    if (last == null || prev == null) continue;
    const delta = Math.abs(last - prev);
    if (delta > bestDelta) { bestDelta = delta; best = s.name; }
  }
  return best;
}

function AtlasView({ setRoute }) {
  const defaultSelection = uMA(() => topQoQMover(), []);
  const [selected, setSelected] = uSA(defaultSelection);
  const [compareWith, setCompareWith] = uSA(null);
  const [metric, setMetric] = uSA('applicants');
  const [countryQuery, setCountryQuery] = uSA('');
  const zoom = useMapZoom(720, 335);

  const flyToCountry = nat => {
    const wm = typeof WORLD_MAP !== 'undefined' ? WORLD_MAP : [];
    const entry = wm.find(c => resolveNat(c.name) === nat);
    if (entry) {
      const bb = pathBBox(entry.d);
      if (bb) zoom.flyToBox(bb[0], bb[1], bb[2], bb[3]);
    }
  };

  const handleSelect = (nat, shift=false) => {
    setCountryQuery('');
    if (shift && selected && nat !== selected) {
      // Shift-click on a different country adds/replaces the comparison.
      setCompareWith(nat);
      flyToCountry(nat);
      return;
    }
    // Plain click: replace primary, clear comparison when the user picks
    // a country that already was the comparison (preventing duplicate).
    if (nat === compareWith) setCompareWith(null);
    setSelected(nat);
    flyToCountry(nat);
  };

  const countryValues = uMA(() => {
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    if (metric === 'applicants') return Object.fromEntries(natFull.map(r => [r.name, r.v]));
    if (metric === 'grant_rate') return Object.fromEntries(natFull.filter(r => r.grant != null).map(r => [r.name, Math.round(r.grant * 100)]));
    if (metric === 'bivariate') return Object.fromEntries(natFull.map(r => [r.name, { v: r.v, grant: r.grant }]));
    if (metric === 'returns') {
      const ret = typeof RETURNS_BY_NATIONALITY !== 'undefined' ? RETURNS_BY_NATIONALITY : [];
      return Object.fromEntries(ret.map(r => [r.name, r.total]));
    }
    if (metric === 'age_disputes') {
      const ad = typeof AGE_DISPUTES_BY_NATIONALITY !== 'undefined' ? AGE_DISPUTES_BY_NATIONALITY : [];
      return Object.fromEntries(ad.map(r => [r.name, r.raised]));
    }
    if (metric === 'small_boats') {
      const rows = typeof IRR_BOATS_BY_NATIONALITY !== 'undefined' ? IRR_BOATS_BY_NATIONALITY : [];
      if (!rows.length) return {};
      const latestYear = Math.max(...rows.map(r => r.year));
      const out = {};
      for (const r of rows) {
        if (r.year !== latestYear) continue;
        if (!(r.count > 0)) continue;
        out[r.nationality] = (out[r.nationality] || 0) + r.count;
      }
      return out;
    }
    if (metric === 'per_capita') {
      // Join NAT_FULL (name) → WORLD_MAP (iso) → UNHCR_POC_ANNUAL (latest
      // year × iso → total displaced). Rate is applicants per 100k of the
      // origin's displaced-persons stock. Countries without POC data fall
      // out of the map cleanly.
      const poc = typeof UNHCR_POC_ANNUAL !== 'undefined' ? UNHCR_POC_ANNUAL : [];
      const world = typeof WORLD_MAP !== 'undefined' ? WORLD_MAP : [];
      if (!poc.length || !world.length) return {};
      const latestYear = Math.max(...poc.map(r => r.year));
      const totalByIso = {};
      for (const r of poc) {
        if (r.year !== latestYear) continue;
        totalByIso[r.originIso] = r.total || 0;
      }
      const isoByName = {};
      for (const c of world) isoByName[c.name] = c.iso;
      const out = {};
      for (const r of natFull) {
        const iso = isoByName[r.name];
        const denom = iso ? totalByIso[iso] : 0;
        if (!denom || !(r.v > 0)) continue;
        out[r.name] = Math.round((r.v / denom) * 100000);
      }
      return out;
    }
    return {};
  }, [metric]);

  const metricLabel = ATLAS_METRIC_OPTIONS.find(m => m.id === metric)?.label ?? 'Applicants';
  const bivariate = metric === 'bivariate';

  const topCountries = uMA(() => {
    const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
    return natFull.slice(0, 10);
  }, []);

  return (
    <main className="fade-enter page-section" style={{maxWidth:1240,margin:'0 auto',padding:'40px 48px 80px'}}>
      <div style={{marginBottom:24}}>
        <div className="uc" style={{color:'var(--muted)',marginBottom:8,display:'inline-block',paddingBottom:4,borderBottom:'2px solid var(--accent-warn)'}}>Atlas</div>
        <h1 style={{fontFamily:'var(--serif)',fontSize:42,letterSpacing:-0.4,fontWeight:400,margin:'0 0 10px'}}>The world, by country.</h1>
        <p style={{fontSize:16,color:'var(--ink-2)',maxWidth:680,margin:0,lineHeight:1.5}}>
          Choropleth of asylum applicants by country of origin. Click any country to see applicants, grant rate, returns, and age disputes in one panel.
        </p>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {ATLAS_METRIC_OPTIONS.map(m => {
          const available = m.needsData ? m.needsData() : true;
          return (
            <button key={m.id}
              onClick={() => available && setMetric(m.id)}
              disabled={!available}
              title={available ? undefined : 'Pending UNHCR ingest — run scripts/fetch_unhcr.py then scripts/build_unhcr.py'}
              style={{
                padding:'4px 16px', fontSize:12, border:'1px solid var(--rule-2)',
                background: metric === m.id ? 'var(--accent)' : 'var(--bg-2)',
                color: metric === m.id ? '#fff' : (available ? 'var(--ink-2)' : 'var(--muted-2)'),
                fontFamily:'var(--serif)', cursor: available ? 'pointer' : 'not-allowed',
                opacity: available ? 1 : 0.55,
              }}>
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="atlas-layout" style={{display:'grid',gridTemplateColumns:'minmax(0,1.4fr) minmax(360px,1fr)',gap:28,alignItems:'start'}}>
        <div style={{border:'1px solid var(--rule)',background:'#fff',padding:'12px'}}>
          <AtlasChoropleth countryValues={countryValues} selectedName={selected} compareName={compareWith} onSelect={handleSelect} metricLabel={metricLabel.toLowerCase()} bivariate={bivariate} zoom={zoom}/>
          <AtlasLegend countryValues={countryValues} metricLabel={metricLabel} bivariate={bivariate}/>
          <div style={{marginTop:12,paddingTop:10,borderTop:'1px dotted var(--rule-2)'}}>
            <div style={{position:'relative',marginBottom:8}}>
              <input type="search" value={countryQuery} onChange={e=>setCountryQuery(e.target.value)}
                placeholder="Search countries…"
                style={{width:'100%',fontSize:12.5,padding:'6px 8px',fontFamily:'var(--serif)',border:'1px solid var(--rule-2)',background:'#fff',boxSizing:'border-box'}}/>
              {countryQuery.trim() && (() => {
                const q = countryQuery.trim().toLowerCase();
                const natFull = typeof NAT_FULL !== 'undefined' ? NAT_FULL : [];
                const matches = natFull.filter(r => r.name.toLowerCase().includes(q)).slice(0, 12);
                if (!matches.length) return null;
                return (
                  <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid var(--rule-2)',borderTop:'none',maxHeight:160,overflowY:'auto',zIndex:10}}>
                    {matches.map(r => (
                      <button key={r.name} onClick={()=>handleSelect(r.name)}
                        style={{display:'block',width:'100%',textAlign:'left',padding:'6px 10px',fontSize:12.5,fontFamily:'var(--serif)',background:'transparent',border:'none',borderBottom:'1px dotted var(--rule-2)',cursor:'pointer',color:'var(--ink-2)'}}>
                        {r.name}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <span className="uc" style={{fontSize:10.5,color:'var(--muted)',marginRight:8,alignSelf:'center'}}>Jump to:</span>
              {topCountries.map(c => (
                <button key={c.name} onClick={e=>handleSelect(c.name, e.shiftKey)}
                  style={{fontSize:11.5,padding:'2px 8px',background: selected===c.name ? 'var(--accent)' : compareWith===c.name ? 'var(--accent-gold)' : 'var(--bg-2)',
                          color: (selected===c.name || compareWith===c.name) ? '#fff' : 'var(--ink-2)',
                          border:'1px solid var(--rule-2)',fontFamily:'var(--serif)'}}>
                  {c.name}
                </button>
              ))}
            </div>
            <div style={{marginTop:8,fontSize:10.5,color:'var(--muted-2)',fontStyle:'italic'}}>
              Shift-click a country to compare it with the current selection.
            </div>
          </div>
        </div>
        <AtlasDetail name={selected} compareName={compareWith} onClearCompare={()=>setCompareWith(null)} setRoute={setRoute}/>
      </div>
    </main>
  );
}

Object.assign(window, { AtlasView });
